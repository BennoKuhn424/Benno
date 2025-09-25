// PayFast ITN (Instant Transaction Notification) Handler
// This handles the callback from PayFast after payment completion

const http = require('http');
const url = require('url');
const querystring = require('querystring');

// PayFast sandbox configuration
const PAYFAST_CONFIG = {
    merchant_id: '10000100',
    merchant_key: '46f0cd694581a',
    passphrase: '', // Leave empty for sandbox, add your passphrase for production
    sandbox: true // Set to false for production
};

// Create HTTP server to handle PayFast notifications
const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/payfast-notify') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const paymentData = querystring.parse(body);
                console.log('PayFast notification received:', paymentData);
                
                // Validate the payment
                if (validatePayFastPayment(paymentData)) {
                    // Payment is valid, process the order
                    processValidPayment(paymentData);
                    
                    // Respond with HTTP 200 OK to acknowledge receipt
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.end('OK');
                } else {
                    console.error('Invalid PayFast payment notification');
                    res.writeHead(400, {'Content-Type': 'text/plain'});
                    res.end('Invalid payment');
                }
            } catch (error) {
                console.error('Error processing PayFast notification:', error);
                res.writeHead(500, {'Content-Type': 'text/plain'});
                res.end('Server error');
            }
        });
    } else {
        // Handle other requests
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('Not found');
    }
});

function validatePayFastPayment(data) {
    // Basic validation - in production, you should implement proper signature validation
    // For sandbox, we'll do basic checks
    
    if (!data.payment_status || !data.m_payment_id) {
        return false;
    }
    
    // Check if payment was successful
    if (data.payment_status !== 'COMPLETE') {
        console.log('Payment not complete:', data.payment_status);
        return false;
    }
    
    // Verify merchant details
    if (data.merchant_id !== PAYFAST_CONFIG.merchant_id) {
        console.log('Invalid merchant ID');
        return false;
    }
    
    // In production, you should also:
    // 1. Verify the signature using your passphrase
    // 2. Check that the amount matches your expected amount
    // 3. Ensure the transaction hasn't been processed before
    
    return true;
}

function processValidPayment(paymentData) {
    console.log('Processing valid payment for order:', paymentData.m_payment_id);
    
    // Here you would:
    // 1. Update your database to mark the order as paid
    // 2. Send confirmation emails
    // 3. Trigger fulfillment processes
    // 4. Update inventory
    
    // For this example, we'll just log the successful payment
    const orderSummary = {
        orderId: paymentData.m_payment_id,
        paymentId: paymentData.pf_payment_id,
        amount: paymentData.amount_gross,
        status: paymentData.payment_status,
        timestamp: new Date().toISOString()
    };
    
    console.log('Payment processed successfully:', orderSummary);
    
    // You could save this to a database or file
    // saveOrderUpdate(orderSummary);
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`PayFast notification server running on port ${PORT}`);
    console.log(`Notification URL: http://your-domain.com:${PORT}/payfast-notify`);
});

// Export for use in other files if needed
module.exports = {
    validatePayFastPayment,
    processValidPayment
};