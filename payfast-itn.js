// PayFast ITN (Instant Transaction Notification) Handler
// This is a Node.js server-side implementation

const express = require('express');
const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');

// Firebase Admin SDK for server-side database operations
const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to add your service account key)
const serviceAccount = require('./firebase-admin-key.json'); // Download from Firebase Console
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://teien-tamashii-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

// PayFast Configuration
const PAYFAST_CONFIG = {
    // SANDBOX CREDENTIALS (change to production when ready)
    merchant_id: "10000100",
    merchant_key: "46f0cd694581a",
    
    // PRODUCTION CREDENTIALS (uncomment for live)
    // merchant_id: "YOUR_PRODUCTION_MERCHANT_ID",
    // merchant_key: "YOUR_PRODUCTION_MERCHANT_KEY",
    
    // PayFast hosts for validation
    sandbox_host: "sandbox.payfast.co.za",
    production_host: "www.payfast.co.za",
    
    // Use sandbox for testing
    use_sandbox: true
};

const app = express();

// Middleware to parse raw POST data from PayFast
app.use('/payfast-itn', express.raw({type: 'application/x-www-form-urlencoded'}));
app.use(express.json());

// Utility function to verify PayFast signature
function verifyPayFastSignature(pfData, pfParamString) {
    // Create signature string
    const pfPassPhrase = ""; // Add your passphrase if you set one in PayFast
    let pfSignature = pfData.signature;
    delete pfData.signature;
    
    // Sort parameters and create signature string
    let signatureString = '';
    Object.keys(pfData).sort().forEach(key => {
        if (pfData[key] !== '' && pfData[key] !== null) {
            signatureString += `${key}=${encodeURIComponent(pfData[key]).replace(/%20/g, '+')}&`;
        }
    });
    
    // Remove last '&'
    signatureString = signatureString.slice(0, -1);
    
    // Add passphrase if set
    if (pfPassPhrase) {
        signatureString += `&passphrase=${encodeURIComponent(pfPassPhrase)}`;
    }
    
    // Generate MD5 hash
    const expectedSignature = crypto.createHash('md5').update(signatureString).digest('hex');
    
    return expectedSignature === pfSignature;
}

// Utility function to validate with PayFast servers
function validateWithPayFast(pfParamString) {
    return new Promise((resolve, reject) => {
        const host = PAYFAST_CONFIG.use_sandbox ? 
                     PAYFAST_CONFIG.sandbox_host : 
                     PAYFAST_CONFIG.production_host;
        
        const options = {
            hostname: host,
            port: 443,
            path: '/eng/query/validate',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': pfParamString.length
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve(data.trim() === 'VALID');
            });
        });
        
        req.on('error', (err) => {
            console.error('PayFast validation error:', err);
            reject(err);
        });
        
        req.write(pfParamString);
        req.end();
    });
}

// Main ITN Handler
app.post('/payfast-itn', async (req, res) => {
    console.log('PayFast ITN received');
    
    try {
        // Parse the POST data
        const pfParamString = req.body.toString();
        const pfData = querystring.parse(pfParamString);
        
        console.log('PayFast ITN Data:', pfData);
        
        // Step 1: Verify the signature
        const signatureValid = verifyPayFastSignature({...pfData}, pfParamString);
        if (!signatureValid) {
            console.error('Invalid PayFast signature');
            return res.status(400).send('Invalid signature');
        }
        console.log('✓ Signature valid');
        
        // Step 2: Validate with PayFast servers
        let serverValid = false;
        try {
            serverValid = await validateWithPayFast(pfParamString);
        } catch (err) {
            console.error('PayFast server validation failed:', err);
            serverValid = false;
        }
        
        if (!serverValid) {
            console.error('PayFast server validation failed');
            return res.status(400).send('Server validation failed');
        }
        console.log('✓ Server validation passed');
        
        // Step 3: Verify merchant details
        if (pfData.merchant_id !== PAYFAST_CONFIG.merchant_id) {
            console.error('Invalid merchant ID');
            return res.status(400).send('Invalid merchant ID');
        }
        console.log('✓ Merchant ID valid');
        
        // Step 4: Process the payment based on status
        const paymentStatus = pfData.payment_status;
        const orderId = pfData.m_payment_id || pfData.custom_str1; // Use custom field for order ID
        const amount = parseFloat(pfData.amount_gross);
        
        console.log(`Processing payment: ${paymentStatus} for order ${orderId}`);
        
        switch (paymentStatus) {
            case 'COMPLETE':
                await handleSuccessfulPayment(orderId, pfData);
                break;
                
            case 'FAILED':
                await handleFailedPayment(orderId, pfData);
                break;
                
            case 'PENDING':
                await handlePendingPayment(orderId, pfData);
                break;
                
            default:
                console.log(`Unhandled payment status: ${paymentStatus}`);
        }
        
        // Step 5: Respond to PayFast
        res.status(200).send('OK');
        console.log('ITN processed successfully');
        
    } catch (error) {
        console.error('ITN processing error:', error);
        res.status(500).send('Internal server error');
    }
});

// Handle successful payment
async function handleSuccessfulPayment(orderId, pfData) {
    try {
        console.log(`Processing successful payment for order: ${orderId}`);
        
        // Update order status in Firebase
        if (orderId) {
            const orderRef = db.collection('orders').doc(orderId);
            await orderRef.update({
                status: 'completed',
                paymentStatus: 'paid',
                paymentDate: admin.firestore.FieldValue.serverTimestamp(),
                payfastPaymentId: pfData.pf_payment_id,
                paymentDetails: {
                    amount: parseFloat(pfData.amount_gross),
                    fee: parseFloat(pfData.amount_fee),
                    net: parseFloat(pfData.amount_net),
                    paymentMethod: pfData.payment_method || 'unknown'
                },
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`✓ Order ${orderId} marked as completed`);
            
            // Send confirmation email (implement this function)
            await sendOrderConfirmationEmail(orderId, pfData);
            
            // Update inventory if needed (implement this function)
            await updateInventory(orderId);
        }
        
    } catch (error) {
        console.error('Error handling successful payment:', error);
        throw error;
    }
}

// Handle failed payment
async function handleFailedPayment(orderId, pfData) {
    try {
        console.log(`Processing failed payment for order: ${orderId}`);
        
        if (orderId) {
            const orderRef = db.collection('orders').doc(orderId);
            await orderRef.update({
                status: 'failed',
                paymentStatus: 'failed',
                failureReason: pfData.failure_reason || 'Payment failed',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`✓ Order ${orderId} marked as failed`);
            
            // Send failure notification email (implement this function)
            await sendPaymentFailedEmail(orderId, pfData);
        }
        
    } catch (error) {
        console.error('Error handling failed payment:', error);
        throw error;
    }
}

// Handle pending payment
async function handlePendingPayment(orderId, pfData) {
    try {
        console.log(`Processing pending payment for order: ${orderId}`);
        
        if (orderId) {
            const orderRef = db.collection('orders').doc(orderId);
            await orderRef.update({
                status: 'pending',
                paymentStatus: 'pending',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`✓ Order ${orderId} marked as pending`);
        }
        
    } catch (error) {
        console.error('Error handling pending payment:', error);
        throw error;
    }
}

// Email notification functions (implement based on your email service)
async function sendOrderConfirmationEmail(orderId, paymentData) {
    // TODO: Implement email sending
    // You can use services like SendGrid, Nodemailer, etc.
    console.log(`TODO: Send confirmation email for order ${orderId}`);
}

async function sendPaymentFailedEmail(orderId, paymentData) {
    // TODO: Implement email sending
    console.log(`TODO: Send failure email for order ${orderId}`);
}

async function updateInventory(orderId) {
    // TODO: Implement inventory updates
    console.log(`TODO: Update inventory for order ${orderId}`);
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: PAYFAST_CONFIG.use_sandbox ? 'sandbox' : 'production'
    });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`PayFast ITN server running on port ${PORT}`);
    console.log(`Environment: ${PAYFAST_CONFIG.use_sandbox ? 'SANDBOX' : 'PRODUCTION'}`);
    console.log(`ITN endpoint: http://localhost:${PORT}/payfast-itn`);
});

module.exports = app;