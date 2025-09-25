// Security utilities for input sanitization and validation
class SecurityUtils {
    
    // Sanitize HTML to prevent XSS attacks
    static sanitizeHTML(str) {
        if (typeof str !== 'string') return '';
        
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }
    
    // Validate email format
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Validate phone number (South African format)
    static isValidPhone(phone) {
        const phoneRegex = /^(\+27|0)[6-8][0-9]{8}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }
    
    // Validate price (positive number with max 2 decimals)
    static isValidPrice(price) {
        const priceRegex = /^\d+(\.\d{1,2})?$/;
        return priceRegex.test(price) && parseFloat(price) > 0;
    }
    
    // Validate quantity (positive integer)
    static isValidQuantity(qty) {
        return Number.isInteger(Number(qty)) && Number(qty) > 0;
    }
    
    // Secure localStorage wrapper with encryption-like encoding
    static secureStorage = {
        set: (key, value) => {
            try {
                const encoded = btoa(JSON.stringify(value));
                localStorage.setItem(`sec_${key}`, encoded);
            } catch (error) {
                console.warn('Secure storage set failed:', error);
            }
        },
        
        get: (key) => {
            try {
                const encoded = localStorage.getItem(`sec_${key}`);
                return encoded ? JSON.parse(atob(encoded)) : null;
            } catch (error) {
                console.warn('Secure storage get failed:', error);
                return null;
            }
        },
        
        remove: (key) => {
            try {
                localStorage.removeItem(`sec_${key}`);
            } catch (error) {
                console.warn('Secure storage remove failed:', error);
            }
        }
    };
    
    // Generate secure order ID
    static generateOrderId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return `ORD_${timestamp}_${random}`.toUpperCase();
    }
    
    // Validate order data before saving
    static validateOrderData(orderData) {
        const required = ['orderId', 'amount', 'items'];
        const missing = required.filter(field => !orderData[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
        
        if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
            throw new Error('Order must contain at least one item');
        }
        
        if (!this.isValidPrice(orderData.amount)) {
            throw new Error('Invalid order amount');
        }
        
        return true;
    }
    
    // Rate limiting for form submissions
    static rateLimiter = {
        attempts: new Map(),
        
        canAttempt: function(key, maxAttempts = 5, windowMs = 300000) { // 5 attempts per 5 minutes
            const now = Date.now();
            const attempts = this.attempts.get(key) || [];
            
            // Remove old attempts
            const validAttempts = attempts.filter(time => now - time < windowMs);
            
            if (validAttempts.length >= maxAttempts) {
                return false;
            }
            
            validAttempts.push(now);
            this.attempts.set(key, validAttempts);
            return true;
        }
    };
    
    // Content Security Policy helper
    static setCSPHeaders() {
        const meta = document.createElement('meta');
        meta.httpEquiv = "Content-Security-Policy";
        meta.content = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://www.gstatic.com https://cdnjs.cloudflare.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https: blob:",
            "connect-src 'self' https://*.firebaseapp.com https://*.googleapis.com https://sandbox.payfast.co.za",
            "form-action 'self' https://sandbox.payfast.co.za https://www.payfast.co.za",
            "frame-ancestors 'none'"
        ].join('; ');
        
        document.head.appendChild(meta);
    }
}

// Initialize security headers when script loads
if (typeof document !== 'undefined') {
    SecurityUtils.setCSPHeaders();
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecurityUtils;
}