document.addEventListener('DOMContentLoaded', () => {
    console.log('scripts-firebase.js loaded with CART MAINTENANCE MODE - Shopping works, purchasing temporarily disabled');

    // ===== CART MAINTENANCE MODE FLAG =====
    const CART_MAINTENANCE_MODE = true; // Set to false to re-enable purchasing

    // Safe localStorage wrapper to handle security restrictions
    const safeStorage = {
        getItem: function(key) {
            try {
                return localStorage.getItem(key);
            } catch (error) {
                console.warn('localStorage not available for reading:', error.message);
                return null;
            }
        },
        setItem: function(key, value) {
            try {
                localStorage.setItem(key, value);
                return true;
            } catch (error) {
                console.warn('localStorage not available for writing:', error.message);
                return false;
            }
        },
        removeItem: function(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.warn('localStorage not available for removal:', error.message);
                return false;
            }
        }
    };

    // Check Firebase availability
    let firebaseAvailable = false;
    let dbAvailable = false;
    
    try {
        if (typeof firebase !== 'undefined' && typeof db !== 'undefined') {
            firebaseAvailable = true;
            dbAvailable = true;
            console.log('Firebase and Firestore are available');
        } else {
            console.warn('Firebase or Firestore not available');
        }
    } catch (error) {
        console.warn('Firebase check failed:', error);
    }

    // Initialize AOS
    try {
        if (typeof AOS !== 'undefined') {
            AOS.init({ duration: 1000, once: true });
            console.log('AOS initialized');
        }
    } catch (error) {
        console.error('AOS initialization failed:', error);
    }

    // Navbar Scroll Effect
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        }
    });

    // Mobile Menu Toggle
    const burger = document.querySelector('.burger');
    const navLinks = document.querySelector('.nav-links');
    if (burger && navLinks) {
        burger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            console.log('Burger clicked, nav-links toggled');
        });

        document.addEventListener('click', (e) => {
            if (!burger.contains(e.target) && !navLinks.contains(e.target)) {
                navLinks.classList.remove('active');
            }
        });
    }

    // Authentication System (keeping existing auth code as is)
    const authModal = document.querySelector('#auth-modal');
    const authForm = document.querySelector('#auth-form');
    const authTitle = document.querySelector('#auth-title');
    const authSubmit = document.querySelector('#auth-submit');
    const toggleLink = document.querySelector('#toggle-link');
    const authClose = document.querySelector('#auth-close');
    const loginLink = document.querySelector('#login-link');
    const usernameInput = document.querySelector('#username');
    const emailInput = document.querySelector('#email');
    const passwordInput = document.querySelector('#password');
    let isLoginMode = true;

    function showAuthMessage(message, type) {
        const existingMessage = document.querySelector('.auth-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `auth-message ${type}`;
        messageDiv.textContent = message;
        
        const form = document.querySelector('#auth-form');
        if (form) {
            form.insertBefore(messageDiv, form.firstChild);
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 5000);
        }
    }

    if (loginLink && authModal) {
        loginLink.addEventListener('click', e => {
            e.preventDefault();
            console.log('Login link clicked');
            authModal.classList.add('active');
            isLoginMode = true;
            if (authTitle) authTitle.textContent = 'Login';
            if (authSubmit) authSubmit.textContent = 'Login';
            if (usernameInput) usernameInput.style.display = 'none';
            const authToggle = document.querySelector('#auth-toggle');
            if (authToggle) {
                authToggle.innerHTML = 'Don\'t have an account? <a href="#" id="toggle-link">Register</a>';
            }
            if (authForm) authForm.reset();
            attachToggleEvent();
        });
    }

    function attachToggleEvent() {
        const newToggleLink = document.querySelector('#toggle-link');
        if (newToggleLink) {
            newToggleLink.addEventListener('click', e => {
                e.preventDefault();
                console.log('Toggle link clicked');
                isLoginMode = !isLoginMode;
                if (authTitle) authTitle.textContent = isLoginMode ? 'Login' : 'Register';
                if (authSubmit) authSubmit.textContent = isLoginMode ? 'Login' : 'Register';
                if (usernameInput) usernameInput.style.display = isLoginMode ? 'none' : 'block';
                const authToggle = document.querySelector('#auth-toggle');
                if (authToggle) {
                    authToggle.innerHTML = isLoginMode ? 
                        'Don\'t have an account? <a href="#" id="toggle-link">Register</a>' :
                        'Already have an account? <a href="#" id="toggle-link">Login</a>';
                }
                if (authForm) authForm.reset();
                const existingMessage = document.querySelector('.auth-message');
                if (existingMessage) {
                    existingMessage.remove();
                }
                attachToggleEvent();
            });
        }
    }

    attachToggleEvent();

    if (authClose) {
        authClose.addEventListener('click', () => {
            console.log('Close modal clicked');
            authModal.classList.remove('active');
            if (authForm) authForm.reset();
            const existingMessage = document.querySelector('.auth-message');
            if (existingMessage) {
                existingMessage.remove();
            }
        });
    }

    if (authForm) {
        authForm.addEventListener('submit', e => {
            e.preventDefault();
            console.log('Auth form submitted');
            
            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';
            const username = usernameInput ? usernameInput.value.trim() : '';

            if (!email || !password) {
                showAuthMessage('Please fill in all required fields.', 'error');
                return;
            }

            if (!email.includes('@')) {
                showAuthMessage('Please enter a valid email address.', 'error');
                return;
            }

            if (password.length < 6) {
                showAuthMessage('Password must be at least 6 characters long.', 'error');
                return;
            }

            if (!isLoginMode && !username) {
                showAuthMessage('Please enter a username.', 'error');
                return;
            }

            if (authSubmit) {
                authSubmit.disabled = true;
                authSubmit.textContent = isLoginMode ? 'Logging in...' : 'Registering...';
            }

            if (isLoginMode) {
                login(email, password);
            } else {
                register(email, password, username);
            }
        });
    }

    function login(email, password) {
        console.log('Attempting login with Firebase:', email);
        
        if (!firebaseAvailable || !dbAvailable) {
            showAuthMessage('Authentication service unavailable. Please try again later.', 'error');
            resetAuthButton();
            return;
        }
        
        db.collection('users').where('email', '==', email).get()
            .then((querySnapshot) => {
                if (querySnapshot.empty) {
                    showAuthMessage('Invalid email or password', 'error');
                    resetAuthButton();
                    return;
                }

                let userFound = false;
                querySnapshot.forEach((doc) => {
                    const userData = doc.data();
                    
                    if (userData.password === password) {
                        userFound = true;
                        
                        const userSession = {
                            id: doc.id,
                            email: userData.email,
                            username: userData.username,
                            role: userData.role || 'user'
                        };
                        
                        safeStorage.setItem('currentUser', JSON.stringify(userSession));
                        
                        db.collection('users').doc(doc.id).update({
                            lastLogin: new Date().toISOString()
                        }).catch(error => {
                            console.error('Error updating last login:', error);
                        });
                        
                        updateAuthUI(userSession);
                        authModal.classList.remove('active');
                        showAuthMessage('Login successful!', 'success');
                        
                        if (userSession.role === 'admin') {
                            setTimeout(() => {
                                window.location.href = 'admin.html';
                            }, 1000);
                        }
                        
                        resetAuthButton();
                    }
                });

                if (!userFound) {
                    showAuthMessage('Invalid email or password', 'error');
                    resetAuthButton();
                }
            })
            .catch(error => {
                console.error('Login error:', error);
                showAuthMessage('Login failed. Please try again.', 'error');
                resetAuthButton();
            });
    }

    function register(email, password, username) {
        console.log('Attempting register with Firebase:', email, username);
        
        if (!firebaseAvailable || !dbAvailable) {
            showAuthMessage('Registration service unavailable. Please try again later.', 'error');
            resetAuthButton();
            return;
        }
        
        db.collection('users').where('email', '==', email).get()
            .then((querySnapshot) => {
                if (!querySnapshot.empty) {
                    showAuthMessage('Email already registered', 'error');
                    resetAuthButton();
                    return;
                }
                
                const role = email === 'admin@teientamashii.com' ? 'admin' : 'user';
                const newUser = {
                    email: email,
                    password: password,
                    username: username,
                    role: role,
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString()
                };
                
                return db.collection('users').add(newUser);
            })
            .then((docRef) => {
                if (docRef) {
                    console.log('User created with ID:', docRef.id);
                    
                    const userSession = {
                        id: docRef.id,
                        email: email,
                        username: username,
                        role: newUser.role
                    };
                    
                    safeStorage.setItem('currentUser', JSON.stringify(userSession));
                    updateAuthUI(userSession);
                    authModal.classList.remove('active');
                    showAuthMessage('Registration successful!', 'success');
                    
                    if (userSession.role === 'admin') {
                        setTimeout(() => {
                            window.location.href = 'admin.html';
                        }, 1000);
                    }
                    
                    resetAuthButton();
                }
            })
            .catch(error => {
                console.error('Registration error:', error);
                showAuthMessage('Registration failed. Please try again.', 'error');
                resetAuthButton();
            });
    }

    function resetAuthButton() {
        if (authSubmit) {
            authSubmit.disabled = false;
            authSubmit.textContent = isLoginMode ? 'Login' : 'Register';
        }
    }

    function updateAuthUI(user) {
        console.log('Updating auth UI for user:', user.username);
        const authLink = document.querySelector('#auth-link');
        const adminLink = document.querySelector('#admin-link');
        
        if (!authLink) {
            console.error('Auth link not found');
            return;
        }
        
        if (user) {
            authLink.innerHTML = `<a href="#" id="logout-link">Logout (${user.username})</a>`;
            
            if (user.role === 'admin' && adminLink) {
                adminLink.style.display = 'block';
                console.log('Admin link shown');
            }
            
            const logoutLink = document.querySelector('#logout-link');
            if (logoutLink) {
                logoutLink.addEventListener('click', e => {
                    e.preventDefault();
                    console.log('Logout clicked');
                    
                    if (user.id && firebaseAvailable && dbAvailable) {
                        db.collection('users').doc(user.id).update({
                            lastLogout: new Date().toISOString()
                        }).catch(error => {
                            console.error('Error updating logout time:', error);
                        });
                    }
                    
                    safeStorage.removeItem('currentUser');
                    authLink.innerHTML = `<a href="#login" id="login-link">Login</a>`;
                    if (adminLink) {
                        adminLink.style.display = 'none';
                    }
                    
                    const newLoginLink = document.querySelector('#login-link');
                    if (newLoginLink) {
                        newLoginLink.addEventListener('click', e => {
                            e.preventDefault();
                            authModal.classList.add('active');
                            isLoginMode = true;
                            if (authTitle) authTitle.textContent = 'Login';
                            if (authSubmit) authSubmit.textContent = 'Login';
                            if (usernameInput) usernameInput.style.display = 'none';
                            const authToggle = document.querySelector('#auth-toggle');
                            if (authToggle) {
                                authToggle.innerHTML = 'Don\'t have an account? <a href="#" id="toggle-link">Register</a>';
                            }
                            if (authForm) authForm.reset();
                            attachToggleEvent();
                        });
                    }
                    
                    location.reload();
                });
            }
        }
    }

    // ===== PERSISTENT CART FUNCTIONALITY (Working, but purchase disabled) =====
    
    // Cart state
    let cartItems = [];
    let cartItemCount = 0;
    
    // DOM elements
    const cartIcon = document.querySelector('#cart-icon');
    const cart = document.querySelector('.cart');
    const cartClose = document.querySelector('#cart-close');
    const cartContent = document.querySelector('.cart-content');
    const totalPriceElement = document.querySelector('.total-price');
    const cartItemCountBadge = document.querySelector('.cart-item-count');

    // Initialize cart on page load
    loadCartFromStorage();

    if (cartIcon && cart && cartClose) {
        cartIcon.addEventListener('click', () => {
            console.log('Cart icon clicked');
            cart.classList.add('active');
        });

        cartClose.addEventListener('click', () => {
            console.log('Cart close clicked');
            cart.classList.remove('active');
        });
    }

    // Load cart data from localStorage
    function loadCartFromStorage() {
        try {
            const savedCart = safeStorage.getItem('cartItems');
            if (savedCart) {
                cartItems = JSON.parse(savedCart);
                cartItemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
                updateCartDisplay();
                console.log('Cart loaded from storage:', cartItems.length, 'unique items');
            }
        } catch (error) {
            console.error('Error loading cart from storage:', error);
            cartItems = [];
            cartItemCount = 0;
        }
    }

    // Save cart data to localStorage
    function saveCartToStorage() {
        try {
            safeStorage.setItem('cartItems', JSON.stringify(cartItems));
            console.log('Cart saved to storage');
        } catch (error) {
            console.error('Error saving cart to storage:', error);
        }
    }

    // Update cart display with maintenance mode warning
    function updateCartDisplay() {
        if (!cartContent) return;
        
        // Clear current content
        cartContent.innerHTML = '';
        
        if (cartItems.length === 0) {
            cartContent.innerHTML = `
                <div class="cart-empty">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Your cart is empty</p>
                    ${CART_MAINTENANCE_MODE ? `
                        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 1rem; margin-top: 1rem; color: #856404;">
                            <i class="fas fa-tools"></i>
                            <strong>Cart is Working!</strong><br>
                            <small>Add items to test the cart functionality. Purchasing is temporarily disabled for maintenance.</small>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            // Show maintenance warning at top if in maintenance mode
            if (CART_MAINTENANCE_MODE) {
                const maintenanceWarning = document.createElement('div');
                maintenanceWarning.style.cssText = `
                    background: linear-gradient(135deg, #fff3cd, #ffeaa7);
                    border: 2px solid #ff9800;
                    border-radius: 10px;
                    padding: 1rem;
                    margin-bottom: 1rem;
                    text-align: center;
                    color: #856404;
                    font-weight: 600;
                    animation: pulse 2s infinite;
                `;
                maintenanceWarning.innerHTML = `
                    <i class="fas fa-tools" style="font-size: 1.2rem; margin-bottom: 0.5rem; display: block;"></i>
                    <strong>🛠️ CART FUNCTIONALITY TEST MODE 🛠️</strong><br>
                    <small style="font-weight: normal; margin-top: 0.5rem; display: block;">
                        Cart is working perfectly! You can add, remove, and modify items.<br>
                        Purchasing is temporarily disabled for maintenance.
                    </small>
                `;
                cartContent.appendChild(maintenanceWarning);
            }
            
            cartItems.forEach((item, index) => {
                const cartBox = document.createElement('div');
                cartBox.classList.add('cart-box');
                cartBox.innerHTML = `
                    <img src="${item.image}" alt="${item.name}" class="cart-img">
                    <div class="cart-detail">
                        <h2 class="cart-product-title" data-variant-id="${item.variantId || item.name}">${item.name}</h2>
                        <div class="cart-variant-info">
                            ${item.age ? `<span class="cart-age-badge">${item.age}</span>` : ''}
                            ${item.weight ? `<span class="cart-weight-badge">${item.weight}</span>` : ''}
                        </div>
                        <span class="cart-price">R${item.price.toFixed(2)}</span>
                        <div class="cart-quantity">
                            <button class="decrement" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                            <span class="number">${item.quantity}</span>
                            <button class="increment">+</button>
                        </div>
                    </div>
                    <i class="fas fa-trash-can cart-remove" data-index="${index}"></i>
                `;
                
                cartContent.appendChild(cartBox);
                
                // Add event listeners for quantity controls
                const decrementBtn = cartBox.querySelector('.decrement');
                const incrementBtn = cartBox.querySelector('.increment');
                const removeBtn = cartBox.querySelector('.cart-remove');
                const quantitySpan = cartBox.querySelector('.number');
                
                decrementBtn.addEventListener('click', () => {
                    if (item.quantity > 1) {
                        item.quantity--;
                        quantitySpan.textContent = item.quantity;
                        decrementBtn.disabled = item.quantity <= 1;
                        updateCartTotals();
                        saveCartToStorage();
                    }
                });
                
                incrementBtn.addEventListener('click', () => {
                    item.quantity++;
                    quantitySpan.textContent = item.quantity;
                    decrementBtn.disabled = false;
                    updateCartTotals();
                    saveCartToStorage();
                });
                
                removeBtn.addEventListener('click', () => {
                    removeFromCart(index);
                });
            });
        }
        
        updateCartTotals();
    }

    // Update cart totals and badge
    function updateCartTotals() {
        const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        if (totalPriceElement) {
            totalPriceElement.textContent = `R${subtotal.toFixed(2)}`;
        }
        
        // Update item count
        cartItemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
        if (cartItemCountBadge) {
            cartItemCountBadge.style.visibility = cartItemCount > 0 ? 'visible' : 'hidden';
            cartItemCountBadge.textContent = cartItemCount > 0 ? cartItemCount : '';
        }
    }

    // Add item to cart (working normally)
    function addToCart(productData) {
        console.log('Adding to cart:', productData);
        
        // Check if item already exists in cart
        const existingItemIndex = cartItems.findIndex(item => 
            item.variantId === productData.variantId || 
            (item.name === productData.name && item.age === productData.age && item.weight === productData.weight)
        );
        
        if (existingItemIndex !== -1) {
            // Item exists, increase quantity
            cartItems[existingItemIndex].quantity++;
            alert('✅ Item quantity increased in cart!\n\n🛠️ Cart is working perfectly! Purchasing temporarily disabled for maintenance.');
        } else {
            // New item
            cartItems.push({
                name: productData.name,
                price: productData.price,
                image: productData.image,
                quantity: 1,
                variantId: productData.variantId,
                age: productData.age,
                weight: productData.weight
            });
            alert('✅ Item added to cart!\n\n🛠️ Cart is working perfectly! Purchasing temporarily disabled for maintenance.');
        }
        
        updateCartDisplay();
        saveCartToStorage();
    }

    // Remove item from cart (working normally)
    function removeFromCart(index) {
        cartItems.splice(index, 1);
        updateCartDisplay();
        saveCartToStorage();
    }

    // Clear entire cart (working normally)
    function clearCart() {
        cartItems = [];
        cartItemCount = 0;
        updateCartDisplay();
        saveCartToStorage();
    }

    // Make functions globally available
    window.addToCart = addToCart;
    window.clearCart = clearCart;

    // ===== MAINTENANCE MODE PURCHASE BLOCKING =====
    
    function initializeMaintenanceMode() {
        console.log('Initializing Cart Maintenance Mode...');
        
        const checkButton = setInterval(() => {
            const buyButton = document.querySelector('.btn-buy');
            if (buyButton) {
                console.log('Buy button found, setting up maintenance mode...');
                clearInterval(checkButton);
                
                // Replace the buy button functionality
                buyButton.replaceWith(buyButton.cloneNode(true));
                const newBuyButton = document.querySelector('.btn-buy');
                
                // Update button appearance for maintenance mode
                newBuyButton.innerHTML = '<i class="fas fa-tools"></i> Purchase Temporarily Disabled';
                newBuyButton.style.background = 'linear-gradient(135deg, #6c757d, #495057)';
                newBuyButton.style.cursor = 'not-allowed';
                
                newBuyButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Maintenance mode purchase attempt blocked');
                    
                    // Show maintenance mode modal
                    showMaintenanceModal();
                });
                
                console.log('Maintenance mode activated for purchase button');
            }
        }, 100);
        
        setTimeout(() => clearInterval(checkButton), 10000);
    }

    function showMaintenanceModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            padding: 20px;
        `;
        
        modal.innerHTML = `
            <div style="
                background: white;
                padding: 3rem 2rem;
                border-radius: 20px;
                max-width: 500px;
                width: 100%;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                animation: modalSlideIn 0.3s ease-out;
            ">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🛠️</div>
                <h2 style="color: #2e7d32; margin-bottom: 1rem; font-family: 'Lora', serif;">Cart Functionality Test</h2>
                
                <div style="background: #e8f5e9; padding: 1.5rem; border-radius: 10px; margin: 1.5rem 0; border-left: 4px solid #4caf50;">
                    <h4 style="color: #2e7d32; margin-bottom: 10px;">✅ Cart is Working Perfectly!</h4>
                    <p style="color: #1976d2; margin: 0; font-size: 0.95rem;">
                        You can browse products, add items to cart, modify quantities, and remove items. 
                        All cart functionality is operational and being tested.
                    </p>
                </div>
                
                <div style="background: #fff3cd; padding: 1.5rem; border-radius: 10px; margin: 1.5rem 0; border-left: 4px solid #ff9800;">
                    <h4 style="color: #856404; margin-bottom: 10px;">🚧 Purchasing Temporarily Disabled</h4>
                    <p style="color: #856404; margin: 0; font-size: 0.95rem;">
                        Payment processing is temporarily disabled while we perform maintenance and testing. 
                        Normal purchasing will resume soon!
                    </p>
                </div>
                
                <div style="margin: 2rem 0;">
                    <strong>Current Cart Status:</strong>
                    <div style="font-family: monospace; background: #f5f5f5; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                        Items in Cart: <span style="color: #2e7d32; font-weight: bold;">${cartItems.length} types</span><br>
                        Total Quantity: <span style="color: #2e7d32; font-weight: bold;">${cartItemCount} items</span><br>
                        Cart Value: <span style="color: #2e7d32; font-weight: bold;">R${cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}</span>
                    </div>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <button onclick="this.closest('div').parentElement.remove()" style="
                        padding: 1rem 2rem; 
                        background: #4caf50; 
                        color: white; 
                        border: none; 
                        border-radius: 25px; 
                        cursor: pointer; 
                        font-weight: 600;
                        font-size: 16px;
                    ">
                        <i class="fas fa-check"></i> Continue Testing Cart
                    </button>
                    <a href="shop.html" style="
                        padding: 1rem 2rem; 
                        background: #2196f3; 
                        color: white; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        font-weight: 600;
                        font-size: 16px;
                        display: inline-block;
                    ">
                        <i class="fas fa-shopping-bag"></i> Browse More Items
                    </a>
                </div>
                
                <p style="margin-top: 2rem; color: #666; font-size: 0.9rem;">
                    <i class="fas fa-info-circle"></i> 
                    Thank you for testing our cart functionality!
                </p>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add animation keyframes if not already present
        if (!document.querySelector('#modal-keyframes')) {
            const style = document.createElement('style');
            style.id = 'modal-keyframes';
            style.textContent = `
                @keyframes modalSlideIn {
                    from { opacity: 0; transform: translateY(-30px) scale(0.9); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // ===== EXISTING PRODUCT LOADING FUNCTIONS =====
    
    function isShopPage() {
        return window.location.pathname.includes('shop.html');
    }

    function loadProducts(filterCategory = 'all') {
        console.log('Loading products with filter:', filterCategory);
        const productContent = document.querySelector('#product-content');
        if (!productContent) {
            console.error('Product content element not found');
            return;
        }

        if (!firebaseAvailable || !dbAvailable) {
            productContent.innerHTML = '<p>Product catalog temporarily unavailable. Please try again later.</p>';
            return;
        }

        productContent.innerHTML = '<p>Loading products...</p>';

        db.collection('products').get().then((snapshot) => {
            if (snapshot.empty) {
                productContent.innerHTML = '<p>No products available. Admin can add products from the admin panel.</p>';
                return;
            }
            
            const groupedProducts = {};
            snapshot.forEach(doc => {
                const p = doc.data();
                
                let shouldInclude = false;
                
                if (filterCategory === 'all') {
                    shouldInclude = true;
                } else if (p.category) {
                    const categories = p.category.includes(',') 
                        ? p.category.split(',').map(cat => cat.trim().toLowerCase())
                        : [p.category.toLowerCase()];
                    
                    shouldInclude = categories.includes(filterCategory.toLowerCase());
                }
                
                if (shouldInclude && p.quantity > 0) {
                    const key = p.title;
                    if (!groupedProducts[key]) {
                        groupedProducts[key] = [];
                    }
                    groupedProducts[key].push({ id: doc.id, ...p });
                }
            });
            
            let productsHTML = '';
            let productCount = 0;
            
            Object.keys(groupedProducts).forEach(productTitle => {
                const variants = groupedProducts[productTitle];
                const mainProduct = variants[0];
                productCount++;
                
                const prices = variants.map(v => v.price);
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const priceDisplay = minPrice === maxPrice ? `R${minPrice}` : `R${minPrice} - R${maxPrice}`;
                
                const variantText = variants.length === 1 ? 
                    '1 variant' : 
                    `${variants.length} variants`;
                
                productsHTML += `
                    <div class="product-box" data-product-title="${productTitle}">
                        <div class="img-box">
                            <img src="${mainProduct.image}" alt="${mainProduct.title}">
                        </div>
                        <h2 class="product-title">${mainProduct.title}</h2>
                        <div class="rating">
                            ${Array(5).fill('<i class="fa fa-star"></i>').join('')}
                        </div>
                        <p>${getCategoryText(mainProduct.category)}</p>
                        <p class="variant-count">${variantText} (age + weight)</p>
                        <div class="price-and-cart">
                            <span class="price">${priceDisplay}</span>
                            <button class="select-variant-btn" onclick="openVariantModal('${productTitle}')">
                                <i class="fas fa-cog"></i> Select Variant
                            </button>
                        </div>
                        ${CART_MAINTENANCE_MODE ? `
                            <div style="background: #e8f5e9; border: 1px solid #4caf50; border-radius: 6px; padding: 0.5rem; margin-top: 0.5rem; text-align: center; font-size: 0.8rem; color: #2e7d32;">
                                <i class="fas fa-check-circle"></i> Cart Testing Active
                            </div>
                        ` : ''}
                    </div>
                `;
            });
            
            if (productCount === 0) {
                const categoryDisplayName = filterCategory === 'all' ? 'this selection' : getCategoryText(filterCategory);
                productContent.innerHTML = `<p>No products available for ${categoryDisplayName}.</p>`;
            } else {
                productContent.innerHTML = productsHTML;
            }
            
            console.log(`Loaded ${productCount} product types for category: ${filterCategory}`);
            
        }).catch(error => {
            console.error('Error getting products:', error);
            productContent.innerHTML = '<p>Error loading products. Please try again later.</p>';
        });
    }

    function getCategoryText(category) {
        if (!category) return 'General Product';
        
        const categoryMap = {
            'prebonsai': 'Pre-Bonsai',
            'seedlings': 'Seedlings',
            'silver-bonsai': 'Silver Bonsai',
            'gold-bonsai': 'Gold Bonsai',
            'platinum-bonsai': 'Platinum Bonsai',
            'imported-bonsai': 'Imported Bonsai',
            'bonsai-pots': 'Bonsai Pots',
            'bonsai-tools': 'Bonsai Tools',
            'bonsai-wire': 'Bonsai Wire',
            'bonsai-accessories': 'Bonsai Accessories',
            'orchids': 'Orchids',
            'airplants': 'Air Plants',
            'terrariums': 'Terrariums',
            'aquariums': 'Aquariums',
            'aqua-scapes': 'Aqua Scapes',
            'rocks': 'Rocks',
            'driftwood': 'Driftwood',
            'pebbles': 'Pebbles',
            'mosses': 'Mosses',
            'pot-dressings': 'Pot Dressings'
        };
        
        if (category.includes(',')) {
            const categories = category.split(',').map(cat => cat.trim());
            return categories.map(cat => categoryMap[cat] || cat.charAt(0).toUpperCase() + cat.slice(1)).join(', ');
        }
        
        return categoryMap[category] || category.charAt(0).toUpperCase() + category.slice(1);
    }

    // Shop page filters
    if (isShopPage()) {
        const filterButtons = document.querySelectorAll('.filter-btn');
        
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const filterValue = button.dataset.filter;
                console.log('Filter button clicked:', filterValue);
                loadProducts(filterValue);
            });
        });
        
        loadProducts('all');
    }

    function loadFeaturedProducts() {
        const featuredContent = document.querySelector('#featured-content');
        if (!featuredContent) return;

        if (!firebaseAvailable || !dbAvailable) {
            featuredContent.innerHTML = '<p>Featured products temporarily unavailable.</p>';
            return;
        }

        featuredContent.innerHTML = '<p>Loading featured products...</p>';

        db.collection('products').limit(3).get()
            .then((snapshot) => {
                if (snapshot.empty) {
                    featuredContent.innerHTML = '<p>No featured products available. Admin can add products from the admin panel.</p>';
                    return;
                }
                
                let featuredHTML = '';
                snapshot.forEach(doc => {
                    const p = doc.data();
                    const ageText = p.age ? (p.age === 1 ? '1 year' : `${p.age} years`) : 'Age N/A';
                    const weightText = p.weight ? `${p.weight}${p.weightUnit || 'kg'}` : 'Weight N/A';
                    
                    featuredHTML += `
                        <div class="product-box ${p.inStock === false ? 'out-of-stock' : ''}">
                            <div class="img-box">
                                <img src="${p.image}" alt="${p.title}">
                            </div>
                            <h2 class="product-title">${p.title}</h2>
                            <div class="rating">
                                ${Array(5).fill('<i class="fa fa-star"></i>').join('')}
                            </div>
                            <p>${getCategoryText(p.category)}</p>
                            <div class="variant-info-display">
                                <div class="age-weight-display">
                                    <span class="age-badge">${ageText}</span>
                                    <span class="weight-badge">${weightText}</span>
                                </div>
                            </div>
                            <p class="stock-status ${p.quantity <= 0 ? 'out-of-stock' : 'in-stock'}">
                                ${p.quantity <= 0 ? 'Out of Stock' : 'In Stock'}
                            </p>
                            <div class="price-and-cart">
                                <span class="price">R${p.price}</span>
                                ${p.quantity > 0 
                                    ? `<button class="select-variant-btn" onclick="addSingleVariantToCart('${doc.id}', '${p.title}', ${p.price}, '${p.image}', '${ageText}', '${weightText}')">
                                        <i class="fas fa-shopping-bag"></i> Add to Cart
                                       </button>`
                                    : `<span class="out-of-stock-label">Unavailable</span>`
                                }
                            </div>
                            ${CART_MAINTENANCE_MODE && p.quantity > 0 ? `
                                <div style="background: #e8f5e9; border: 1px solid #4caf50; border-radius: 6px; padding: 0.5rem; margin-top: 0.5rem; text-align: center; font-size: 0.8rem; color: #2e7d32;">
                                    <i class="fas fa-tools"></i> Cart Test Mode
                                </div>
                            ` : ''}
                        </div>
                    `;
                });
                
                featuredContent.innerHTML = featuredHTML;
            })
            .catch(error => {
                console.error('Error loading featured products:', error);
                featuredContent.innerHTML = '<p>Error loading featured products. Please try again later.</p>';
            });
    }

    // Function to add single variant to cart (for featured products)
    window.addSingleVariantToCart = function(variantId, title, price, image, age, weight) {
        const productData = {
            name: `${title} (${age}, ${weight})`,
            price: price,
            image: image,
            variantId: variantId,
            age: age,
            weight: weight
        };
        addToCart(productData);
    };

    function loadFeaturedCourses() {
        const featuredCoursesContent = document.querySelector('#featured-courses-content');
        if (!featuredCoursesContent) return;

        if (!firebaseAvailable || !dbAvailable) {
            featuredCoursesContent.innerHTML = '<p>Featured courses temporarily unavailable.</p>';
            return;
        }

        featuredCoursesContent.innerHTML = '<p>Loading featured courses...</p>';

        db.collection('courses').limit(3).get()
            .then((snapshot) => {
                if (snapshot.empty) {
                    featuredCoursesContent.innerHTML = '<p>No featured courses available. Admin can add courses from the admin panel.</p>';
                    return;
                }
                
                let featuredHTML = '';
                snapshot.forEach(doc => {
                    const course = doc.data();
                    const shortDescription = course.description.length > 120 
                        ? course.description.substring(0, 120) + '...' 
                        : course.description;
                    
                    featuredHTML += `
                        <div class="product-box course-box">
                            <div class="img-box">
                                <img src="${course.image}" alt="${course.title}">
                            </div>
                            <h2 class="product-title">${course.title}</h2>
                            <div class="course-info">
                                <span class="course-level">${course.level.charAt(0).toUpperCase() + course.level.slice(1)} Level</span>
                                <span class="course-duration">${course.duration}h</span>
                            </div>
                            <p class="course-description">${shortDescription}</p>
                            <div class="price-and-cart">
                                <span class="price">R${course.price}</span>
                                <a href="courses.html" class="cta-btn course-btn">Learn More</a>
                            </div>
                        </div>
                    `;
                });
                
                featuredCoursesContent.innerHTML = featuredHTML;
            })
            .catch(error => {
                console.error('Error loading featured courses:', error);
                featuredCoursesContent.innerHTML = '<p>Error loading featured courses. Please try again later.</p>';
            });
    }

    function loadCareTipsPage() {
        console.log('Loading static care tips page');
        const tipsContent = document.querySelector('#tips-content');
        if (!tipsContent) return;

        const staticTipsHTML = `
            <div class="tips-category">
                <h2 class="category-title">Watering</h2>
                <div class="tips-grid">
                    <div class="tip-card">
                        <div class="tip-img">
                            <img src="Fotos/Bonsai-watering.webp" alt="Proper Watering Technique">
                        </div>
                        <div class="tip-content">
                            <h3>Proper Watering Technique</h3>
                            <p>Water your bonsai when the soil feels slightly dry to the touch. Always water thoroughly until water drains from the drainage holes. For most bonsai, it's better to underwater than overwater. In hot weather, you may need to water daily, while in winter, reduce watering frequency.</p>
                        </div>
                    </div>
                    <div class="tip-card">
                        <div class="tip-img">
                            <img src="Fotos/Bonsai-watering.webp" alt="Watering Schedule">
                        </div>
                        <div class="tip-content">
                            <h3>Watering Schedule</h3>
                            <p>Check your bonsai's soil moisture daily by inserting your finger about an inch into the soil. If it feels dry, it's time to water. Different species and seasons require different watering frequencies, so adapt your schedule accordingly.</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="tips-category">
                <h2 class="category-title">Pruning</h2>
                <div class="tips-grid">
                    <div class="tip-card">
                        <div class="tip-img">
                            <img src="Fotos/Bonsai-Pruning.webp" alt="Pruning for Shape">
                        </div>
                        <div class="tip-content">
                            <h3>Pruning for Shape</h3>
                            <p>Regular pruning is essential for maintaining the shape of your bonsai. Use sharp, clean bonsai shears to make precise cuts. Remove any dead branches, crossed branches, or growth that disrupts the desired shape. For deciduous trees, heavy pruning is best done in late winter or early spring.</p>
                        </div>
                    </div>
                    <div class="tip-card">
                        <div class="tip-img">
                            <img src="Fotos/Bonsai-Pruning.webp" alt="Maintenance Pruning">
                        </div>
                        <div class="tip-content">
                            <h3>Maintenance Pruning</h3>
                            <p>Pinch or cut new growth regularly to maintain your bonsai's shape. Remove any shoots growing straight up or down, and thin out areas that become too dense. This encourages back-budding and keeps your tree healthy and well-proportioned.</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="tips-category">
                <h2 class="category-title">Soil</h2>
                <div class="tips-grid">
                    <div class="tip-card">
                        <div class="tip-img">
                            <img src="Fotos/Bonsai-Soil.avif" alt="Choosing the Right Soil">
                        </div>
                        <div class="tip-content">
                            <h3>Choosing the Right Soil</h3>
                            <p>Bonsai soil needs to drain well while still retaining some moisture. A good mix typically contains akadama (clay), pumice, and lava rock. Different species may require slightly different soil compositions. Never use regular potting soil as it retains too much water and can lead to root rot.</p>
                        </div>
                    </div>
                    <div class="tip-card">
                        <div class="tip-img">
                            <img src="Fotos/Bonsai-Soil.avif" alt="Repotting">
                        </div>
                        <div class="tip-content">
                            <h3>Repotting</h3>
                            <p>Repot your bonsai every 1-3 years depending on the species and age. Young trees need repotting more frequently than mature ones. Look for roots circling the pot or growing out of drainage holes as signs it's time to repot. Spring is typically the best time for repotting.</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="tips-category">
                <h2 class="category-title">General Care</h2>
                <div class="tips-grid">
                    <div class="tip-card">
                        <div class="tip-img">
                            <img src="Fotos/Bonsai-wall.jpg" alt="Light Requirements">
                        </div>
                        <div class="tip-content">
                            <h3>Light Requirements</h3>
                            <p>Most bonsai trees need plenty of bright, indirect light. Outdoor species should be kept outside year-round in most climates, while indoor species can thrive near a bright window. Rotate your bonsai regularly to ensure even light exposure on all sides.</p>
                        </div>
                    </div>
                    <div class="tip-card">
                        <div class="tip-img">
                            <img src="Fotos/Bonsai-wall.jpg" alt="Fertilizing">
                        </div>
                        <div class="tip-content">
                            <h3>Fertilizing</h3>
                            <p>Feed your bonsai regularly during the growing season with a balanced, diluted fertilizer. Use organic fertilizers like fish emulsion or specialized bonsai fertilizers. Reduce or stop feeding during winter when growth slows. Over-fertilizing can lead to excessive growth and weak branches.</p>
                        </div>
                    </div>
                    <div class="tip-card">
                        <div class="tip-img">
                            <img src="Fotos/Bonsai-wall.jpg" alt="Wiring">
                        </div>
                        <div class="tip-content">
                            <h3>Wiring Techniques</h3>
                            <p>Use aluminum or copper wire to shape branches and trunk. Wrap the wire at a 45-degree angle, not too tight to allow for growth. Remove wire before it cuts into the bark, typically after 3-6 months. Wire during the dormant season for best results.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        tipsContent.innerHTML = staticTipsHTML;
    }

    function loadCoursesPage() {
        console.log('Loading courses page');
        const coursesContent = document.querySelector('#courses-content');
        if (!coursesContent) return;

        if (!firebaseAvailable || !dbAvailable) {
            coursesContent.innerHTML = '<p>Courses temporarily unavailable. Please try again later.</p>';
            return;
        }

        coursesContent.innerHTML = '<p>Loading courses...</p>';

        db.collection('courses').get()
            .then((snapshot) => {
                if (snapshot.empty) {
                    coursesContent.innerHTML = '<p>No courses available yet. Admin can add courses from the admin panel.</p>';
                    return;
                }
                
                const coursesByCategory = {};
                const allCourses = [];
                
                snapshot.forEach(doc => {
                    const course = { id: doc.id, ...doc.data() };
                    
                    if (!course.title || !course.description || !course.image) {
                        console.warn('Skipping invalid course:', doc.id);
                        return;
                    }
                    
                    if (!course.image.startsWith('data:image') && 
                        !course.image.startsWith('http') && 
                        !course.image.startsWith('Fotos/')) {
                        console.warn('Skipping course with invalid image:', doc.id);
                        return;
                    }

                    allCourses.push(course);
                    
                    const category = course.category || 'general';
                    if (!coursesByCategory[category]) {
                        coursesByCategory[category] = [];
                    }
                    coursesByCategory[category].push(course);
                });

                if (Object.keys(coursesByCategory).length === 0) {
                    coursesContent.innerHTML = '<p>No courses available yet. Admin can add courses from the admin panel.</p>';
                    return;
                }

                let coursesHTML = '';
                
                Object.keys(coursesByCategory).sort().forEach(category => {
                    const categoryName = category.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ');
                    
                    coursesHTML += `
                        <div class="tips-category">
                            <h2 class="category-title">${categoryName}</h2>
                            <div class="tips-grid">
                    `;
                    
                    coursesByCategory[category].forEach(course => {
                        const shortDescription = course.description.length > 150 
                            ? course.description.substring(0, 150) + '...' 
                            : course.description;
                            
                        coursesHTML += `
                            <div class="tip-card course-card-clickable" onclick="openCourseModal('${course.id}')" style="cursor: pointer; transition: all 0.3s ease;">
                                <div class="tip-img">
                                    <img src="${course.image}" alt="${course.title}" onerror="this.src='Fotos/Bonsai-wall.jpg'">
                                </div>
                                <div class="tip-content">
                                    <h3>${course.title}</h3>
                                    <p>${shortDescription}</p>
                                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee;">
                                        <strong>Price: R${course.price}</strong><br>
                                        <strong>Duration: ${course.duration} hours</strong><br>
                                        <span style="color: var(--primary-color); font-weight: 600;">${course.level.charAt(0).toUpperCase() + course.level.slice(1)} Level</span>
                                    </div>
                                    <div style="margin-top: 1rem; text-align: center;">
                                        <span style="
                                            background: var(--primary-color);
                                            color: white;
                                            padding: 0.5rem 1rem;
                                            border-radius: 20px;
                                            font-size: 0.9rem;
                                            font-weight: 600;
                                        ">
                                            <i class="fas fa-info-circle"></i> Click for Details
                                        </span>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                    
                    coursesHTML += `
                            </div>
                        </div>
                    `;
                });
                
                coursesContent.innerHTML = coursesHTML;
                
                window.coursesData = allCourses;
                addCourseCardHoverEffects();
            })
            .catch(error => {
                console.error('Error getting courses:', error);
                coursesContent.innerHTML = '<p>Error loading courses. Please try again later.</p>';
            });
    }

    function addCourseCardHoverEffects() {
        const courseCards = document.querySelectorAll('.course-card-clickable');
        courseCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-8px) scale(1.02)';
                card.style.boxShadow = '0 15px 35px rgba(46, 125, 50, 0.2)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(-5px) scale(1)';
                card.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
            });
        });
    }

    window.openCourseModal = function(courseId) {
        console.log('Opening course modal for:', courseId);
        
        if (!window.coursesData) {
            alert('Course data not available. Please try again.');
            return;
        }
        
        const course = window.coursesData.find(c => c.id === courseId);
        if (!course) {
            alert('Course not found.');
            return;
        }
        
        createCourseModal(course);
    };

    function createCourseModal(course) {
        const existingModal = document.getElementById('course-detail-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = 'course-detail-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            padding: 1rem;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        const categoryDisplay = course.category ? course.category.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ') : 'General';
        
        modal.innerHTML = `
            <div style="
                background: white;
                border-radius: 20px;
                max-width: 700px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 25px 50px rgba(0,0,0,0.3);
                transform: translateY(30px) scale(0.9);
                transition: all 0.3s ease;
            " id="modal-content">
                <div style="
                    position: relative;
                    height: 250px;
                    background: linear-gradient(135deg, rgba(46, 125, 50, 0.9), rgba(27, 94, 32, 0.9)), url('${course.image}') center/cover;
                    border-radius: 20px 20px 0 0;
                    display: flex;
                    align-items: end;
                    padding: 2rem;
                    color: white;
                ">
                    <button onclick="closeCourseModal()" style="
                        position: absolute;
                        top: 1rem;
                        right: 1rem;
                        background: rgba(255, 255, 255, 0.2);
                        border: none;
                        color: white;
                        font-size: 1.5rem;
                        cursor: pointer;
                        padding: 0.5rem;
                        border-radius: 50%;
                        width: 40px;
                        height: 40px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.3s;
                        backdrop-filter: blur(10px);
                    " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                        <i class="fas fa-times"></i>
                    </button>
                    <div>
                        <div style="
                            background: rgba(255, 255, 255, 0.2);
                            padding: 0.3rem 0.8rem;
                            border-radius: 15px;
                            font-size: 0.9rem;
                            margin-bottom: 0.5rem;
                            backdrop-filter: blur(10px);
                            display: inline-block;
                        ">
                            ${categoryDisplay}
                        </div>
                        <h2 style="margin: 0; font-size: 2rem; font-family: 'Lora', serif; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                            ${course.title}
                        </h2>
                    </div>
                </div>
                
                <div style="padding: 2rem;">
                    <div style="
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                        gap: 1rem;
                        margin-bottom: 2rem;
                    ">
                        <div style="text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 10px;">
                            <div style="color: var(--primary-color); font-size: 1.5rem; margin-bottom: 0.5rem;">
                                <i class="fas fa-money-bill-wave"></i>
                            </div>
                            <div style="font-weight: 700; font-size: 1.2rem; color: var(--primary-color);">R${course.price}</div>
                            <div style="font-size: 0.9rem; color: #666;">Price</div>
                        </div>
                        <div style="text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 10px;">
                            <div style="color: var(--primary-color); font-size: 1.5rem; margin-bottom: 0.5rem;">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div style="font-weight: 700; font-size: 1.2rem; color: var(--primary-color);">${course.duration}h</div>
                            <div style="font-size: 0.9rem; color: #666;">Duration</div>
                        </div>
                        <div style="text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 10px;">
                            <div style="color: var(--primary-color); font-size: 1.5rem; margin-bottom: 0.5rem;">
                                <i class="fas fa-graduation-cap"></i>
                            </div>
                            <div style="font-weight: 700; font-size: 1.2rem; color: var(--primary-color);">${course.level.charAt(0).toUpperCase() + course.level.slice(1)}</div>
                            <div style="font-size: 0.9rem; color: #666;">Level</div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 2rem;">
                        <h3 style="color: var(--primary-color); margin-bottom: 1rem; font-size: 1.3rem;">
                            <i class="fas fa-info-circle"></i> About This Course
                        </h3>
                        <p style="
                            color: #555;
                            line-height: 1.8;
                            font-size: 1rem;
                            text-align: justify;
                            background: #f8f9fa;
                            padding: 1.5rem;
                            border-radius: 10px;
                            border-left: 4px solid var(--primary-color);
                        ">
                            ${course.description}
                        </p>
                    </div>
                    
                    <div style="margin-bottom: 2rem;">
                        <h3 style="color: var(--primary-color); margin-bottom: 1rem; font-size: 1.3rem;">
                            <i class="fas fa-seedling"></i> What You'll Learn
                        </h3>
                        <div style="
                            background: linear-gradient(135deg, #e8f5e9, #f1f8e9);
                            padding: 1.5rem;
                            border-radius: 10px;
                            border: 1px solid rgba(46, 125, 50, 0.2);
                        ">
                            ${generateLearningOutcomes(course.level, course.category)}
                        </div>
                    </div>
                    
                    <div style="
                        background: linear-gradient(135deg, var(--primary-color), var(--green-dark));
                        color: white;
                        padding: 2rem;
                        border-radius: 15px;
                        text-align: center;
                        margin-bottom: 1rem;
                    ">
                        <h3 style="margin: 0 0 1rem 0; font-size: 1.4rem;">
                            <i class="fas fa-comments"></i> Ready to Start Learning?
                        </h3>
                        <p style="margin: 0 0 1.5rem 0; opacity: 0.9; font-size: 1rem;">
                            Chat with us on WhatsApp to book this course or ask any questions!
                        </p>
                        <a href="https://wa.me/27824659960?text=Hi%20Teien%20Tamashii,%20I'm%20interested%20in%20the%20${encodeURIComponent(course.title)}%20course.%20Can%20you%20provide%20more%20information%20about%20booking%20and%20schedule?" 
                           target="_blank"
                           style="
                               display: inline-flex;
                               align-items: center;
                               gap: 0.8rem;
                               background: #25D366;
                               color: white;
                               padding: 1rem 2rem;
                               border-radius: 30px;
                               text-decoration: none;
                               font-weight: 700;
                               font-size: 1.1rem;
                               transition: all 0.3s ease;
                               box-shadow: 0 4px 15px rgba(37, 211, 102, 0.3);
                           "
                           onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(37, 211, 102, 0.4)'"
                           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(37, 211, 102, 0.3)'"
                        >
                            <i class="fab fa-whatsapp" style="font-size: 1.3rem;"></i>
                            Chat on WhatsApp
                        </a>
                        <div style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.8;">
                            Available Monday - Friday, 9AM - 5PM
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        setTimeout(() => {
            modal.style.opacity = '1';
            const content = modal.querySelector('#modal-content');
            content.style.transform = 'translateY(0) scale(1)';
        }, 10);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeCourseModal();
            }
        });
    }

    function generateLearningOutcomes(level, category) {
        const baseOutcomes = [
            '<i class="fas fa-check-circle" style="color: var(--primary-color); margin-right: 0.5rem;"></i>Hands-on practical experience with bonsai care',
            '<i class="fas fa-check-circle" style="color: var(--primary-color); margin-right: 0.5rem;"></i>Personalized guidance from expert instructors',
            '<i class="fas fa-check-circle" style="color: var(--primary-color); margin-right: 0.5rem;"></i>Take home your own bonsai creation',
            '<i class="fas fa-check-circle" style="color: var(--primary-color); margin-right: 0.5rem;"></i>Comprehensive care instructions and ongoing support'
        ];
        
        const levelSpecific = {
            'beginner': [
                '<i class="fas fa-check-circle" style="color: var(--primary-color); margin-right: 0.5rem;"></i>Foundation knowledge of bonsai principles',
                '<i class="fas fa-check-circle" style="color: var(--primary-color); margin-right: 0.5rem;"></i>Basic watering and care techniques'
            ],
            'intermediate': [
                '<i class="fas fa-check-circle" style="color: var(--primary-color); margin-right: 0.5rem;"></i>Advanced styling and shaping techniques',
                '<i class="fas fa-check-circle" style="color: var(--primary-color); margin-right: 0.5rem;"></i>Pruning and wiring methods'
            ],
            'advanced': [
                '<i class="fas fa-check-circle" style="color: var(--primary-color); margin-right: 0.5rem;"></i>Master-level techniques and artistic vision',
                '<i class="fas fa-check-circle" style="color: var(--primary-color); margin-right: 0.5rem;"></i>Species-specific advanced care methods'
            ]
        };
        
        const allOutcomes = [...baseOutcomes, ...(levelSpecific[level] || [])];
        
        return `
            <div style="display: grid; gap: 0.8rem;">
                ${allOutcomes.map(outcome => `
                    <div style="display: flex; align-items: center; font-size: 1rem; color: #333;">
                        ${outcome}
                    </div>
                `).join('')}
            </div>
        `;
    }

    window.closeCourseModal = function() {
        const modal = document.getElementById('course-detail-modal');
        if (modal) {
            modal.style.opacity = '0';
            const content = modal.querySelector('#modal-content');
            content.style.transform = 'translateY(30px) scale(0.9)';
            
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    };

    // ===== VARIANT SELECTION MODAL FUNCTIONS =====
    window.openVariantModal = function(productTitle) {
        console.log('Opening variant modal for:', productTitle);
        
        if (!firebaseAvailable || !dbAvailable) {
            alert('Product options temporarily unavailable. Please try again later.');
            return;
        }
        
        const modal = document.getElementById('variant-modal');
        const modalTitle = document.getElementById('variant-modal-title');
        const variantOptions = document.getElementById('variant-options');
        
        if (!modal || !modalTitle || !variantOptions) {
            console.error('Variant modal elements not found');
            return;
        }
        
        modalTitle.textContent = `${productTitle} - Select Variant`;
        variantOptions.innerHTML = '<p>Loading variants...</p>';
        
        db.collection('products').where('title', '==', productTitle).get()
            .then((snapshot) => {
                if (snapshot.empty) {
                    variantOptions.innerHTML = '<p>No variants available.</p>';
                    return;
                }
                
                let optionsHTML = '';
                const variants = [];
                
                snapshot.forEach(doc => {
                    const variant = { id: doc.id, ...doc.data() };
                    if (variant.quantity > 0) {
                        variants.push(variant);
                    }
                });
                
                variants.sort((a, b) => {
                    if (a.age !== b.age) return a.age - b.age;
                    return (a.weight || 0) - (b.weight || 0);
                });
                
                variants.forEach(variant => {
                    const ageText = variant.age === 1 ? '1 year' : `${variant.age} years`;
                    const weightText = variant.weight ? `${variant.weight}${variant.weightUnit || 'kg'}` : 'Weight N/A';
                    
                    optionsHTML += `
                        <div class="age-option" onclick="selectVariant('${variant.id}', '${variant.title}', ${variant.age}, '${weightText}', ${variant.price}, '${variant.image}')">
                            <div class="age-option-info">
                                <div class="variant-info-display">
                                    <div class="age-weight-display">
                                        <span class="age-badge">${ageText}</span>
                                        <span class="weight-badge">${weightText}</span>
                                    </div>
                                    <div class="age-price">R${variant.price}</div>
                                    <div class="age-stock">${variant.quantity} available</div>
                                </div>
                            </div>
                            <div class="age-add-to-cart">
                                <i class="fas fa-shopping-bag"></i>
                                Add to Cart
                            </div>
                        </div>
                    `;
                });
                
                if (variants.length === 0) {
                    optionsHTML = '<p>All variants are currently out of stock.</p>';
                } else if (CART_MAINTENANCE_MODE) {
                    optionsHTML = `
                        <div style="background: #e8f5e9; border: 2px solid #4caf50; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; text-align: center;">
                            <h3 style="color: #2e7d32; margin: 0 0 1rem 0;">
                                <i class="fas fa-tools"></i> Cart Test Mode Active
                            </h3>
                            <p style="color: #1b5e20; margin: 0; font-size: 0.95rem;">
                                Add items to test cart functionality. Purchasing is temporarily disabled for maintenance.
                            </p>
                        </div>
                    ` + optionsHTML;
                }
                
                variantOptions.innerHTML = optionsHTML;
                modal.classList.add('active');
            })
            .catch(error => {
                console.error('Error loading variants:', error);
                variantOptions.innerHTML = '<p>Error loading variant options.</p>';
            });
    };

    window.closeVariantModal = function() {
        const modal = document.getElementById('variant-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    };

    window.selectVariant = function(variantId, title, age, weight, price, image) {
        console.log('Selected variant:', { variantId, title, age, weight, price });
        
        const ageText = age === 1 ? '1 year' : `${age} years`;
        const productData = {
            name: `${title} (${ageText}, ${weight})`,
            price: price,
            image: image,
            variantId: variantId,
            age: ageText,
            weight: weight
        };
        
        addToCart(productData);
        closeVariantModal();
    };

    document.addEventListener('click', (e) => {
        const modal = document.getElementById('variant-modal');
        if (e.target === modal) {
            closeVariantModal();
        }
    });

    // ===== INITIALIZATION =====
    
    console.log('Initializing Cart Maintenance Mode...');
    
    initializeMaintenanceMode();
    
    if (window.location.pathname.includes('care-tips.html')) {
        loadCareTipsPage();
    } else if (window.location.pathname.includes('courses.html')) {
        loadCoursesPage();
    } else if (isShopPage()) {
        loadProducts();
    } else {
        loadFeaturedProducts();
        loadFeaturedCourses();
    }

    try {
        const userData = safeStorage.getItem('currentUser');
        const currentUser = userData ? JSON.parse(userData) : null;
        if (currentUser) {
            updateAuthUI(currentUser);
        }
    } catch (error) {
        console.warn('Failed to load current user:', error);
    }

    console.log('🛠️ CART MAINTENANCE MODE ACTIVE - Cart working, purchasing disabled');
    console.log('Complete scripts-firebase.js loaded successfully with Cart Test Mode');
});
