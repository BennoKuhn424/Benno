// Firebase configuration - Move to separate file and add environment checks
// This should ideally be moved to environment variables in production

const getFirebaseConfig = () => {
    // In production, these should come from environment variables
    // For development, keep them here but add domain restrictions in Firebase Console
    
    return {
        apiKey: "AIzaSyCjA2u__EfEtTbWCISNFq-YtdH4iAmpZ6w",
        authDomain: "teien-tamashii.firebaseapp.com",
        projectId: "teien-tamashii",
        storageBucket: "teien-tamashii.firebasestorage.app",
        messagingSenderId: "754182439532",
        appId: "1:754182439532:web:e478ed437e224a91be4e49",
        measurementId: "G-0SXMM7NMLD"
    };
};

// Initialize Firebase with error handling
const initializeFirebaseSecurely = () => {
    try {
        if (!firebase.apps.length) {
            const config = getFirebaseConfig();
            firebase.initializeApp(config);
            console.log('Firebase initialized successfully');
        }
        return firebase.firestore();
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        throw new Error('Database connection failed. Please try again later.');
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getFirebaseConfig, initializeFirebaseSecurely };
}