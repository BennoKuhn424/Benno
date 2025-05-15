document.addEventListener('DOMContentLoaded', () => {
    console.log('scripts.js loaded');

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

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!burger.contains(e.target) && !navLinks.contains(e.target)) {
                navLinks.classList.remove('active');
            }
        });
    }

    // Authentication
    const authModal = document.querySelector('#auth-modal');
    const authForm = document.querySelector('#auth-form');
    const authTitle = document.querySelector('#auth-title');
    const authSubmit = document.querySelector('#auth-submit');
    const toggleLink = document.querySelector('#toggle-link');
    const authClose = document.querySelector('#auth-close');
    const loginLink = document.querySelector('#login-link');
    const usernameInput = document.querySelector('#username');
    let isLoginMode = true;

    if (loginLink && authModal) {
        loginLink.addEventListener('click', e => {
            e.preventDefault();
            console.log('Login link clicked');
            authModal.classList.add('active');
            isLoginMode = true;
            authTitle.textContent = 'Login';
            authSubmit.textContent = 'Login';
            usernameInput.style.display = 'none';
            toggleLink.textContent = 'Register';
            authForm.reset();
        });
    }

    if (toggleLink) {
        toggleLink.addEventListener('click', e => {
            e.preventDefault();
            console.log('Toggle link clicked');
            isLoginMode = !isLoginMode;
            authTitle.textContent = isLoginMode ? 'Login' : 'Register';
            authSubmit.textContent = isLoginMode ? 'Login' : 'Register';
            usernameInput.style.display = isLoginMode ? 'none' : 'block';
            toggleLink.textContent = isLoginMode ? 'Register' : 'Login';
            authForm.reset();
        });
    }

    if (authClose) {
        authClose.addEventListener('click', () => {
            console.log('Close modal clicked');
            authModal.classList.remove('active');
            authForm.reset();
        });
    }

    if (authForm) {
        authForm.addEventListener('submit', e => {
            e.preventDefault();
            console.log('Auth form submitted');
            const email = document.querySelector('#email').value;
            const password = document.querySelector('#password').value;
            const username = usernameInput ? usernameInput.value : '';

            if (isLoginMode) {
                login(email, password);
            } else {
                register(email, password, username);
            }
        });
    }

    function login(email, password) {
        console.log('Attempting login:', email);
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) {
            alert('Invalid email or password');
            return;
        }
        localStorage.setItem('currentUser', JSON.stringify(user));
        updateAuthUI(user);
        authModal.classList.remove('active');
        alert('Login successful!');
        
        // Redirect to admin page if admin
        if (user.role === 'admin') {
            window.location.href = 'admin.html';
        }
    }

    function register(email, password, username) {
        console.log('Attempting register:', email, username);
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.some(u => u.email === email)) {
            alert('Email already registered');
            return;
        }
        // Make admin@teientamashii.com an admin
        const role = email === 'admin@teientamashii.com' ? 'admin' : 'user';
        const user = { email, password, username, role };
        users.push(user);
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('currentUser', JSON.stringify(user));
        updateAuthUI(user);
        authModal.classList.remove('active');
        alert('Registration successful!');
        
        if (role === 'admin') {
            window.location.href = 'admin.html';
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
            
            // Show admin link if user is admin
            if (user.role === 'admin' && adminLink) {
                adminLink.style.display = 'block';
                console.log('Admin link shown');
            }
            
            const logoutLink = document.querySelector('#logout-link');
            if (logoutLink) {
                logoutLink.addEventListener('click', e => {
                    e.preventDefault();
                    console.log('Logout clicked');
                    localStorage.removeItem('currentUser');
                    authLink.innerHTML = `<a href="#login" id="login-link">Login</a>`;
                    if (adminLink) {
                        adminLink.style.display = 'none';
                    }
                    location.reload();
                });
            }
        }
    }

    // Cart Functionality
    const cartIcon = document.querySelector('#cart-icon');
    const cart = document.querySelector('.cart');
    const cartClose = document.querySelector('#cart-close');
    const cartContent = document.querySelector('.cart-content');
    const totalPriceElement = document.querySelector('.total-price');
    const cartItemCountBadge = document.querySelector('.cart-item-count');
    let cartItemCount = 0;

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

        const products = JSON.parse(localStorage.getItem('products') || '[]');
        
        // Add sample products if none exist
        if (products.length === 0) {
            const sampleProducts = [
                { title: 'Juniper Bonsai', price: 250, image: 'Fotos/Juniper-Bonsai.jpg', category: 'beginner,outdoor', inStock: true },
                { title: 'Maple Bonsai', price: 450, image: 'Fotos/Maple-Bonsai.jpg', category: 'intermediate,outdoor', inStock: true },
                { title: 'Ficus Bonsai', price: 350, image: 'Fotos/Ficus-Bonsai.jpg', category: 'beginner,indoor', inStock: true },
                { title: 'Pine Bonsai', price: 550, image: 'Fotos/Pine-Bonsai.jpg', category: 'advanced,outdoor', inStock: false },
                { title: 'Jade Bonsai', price: 300, image: 'Fotos/Jade-Bonsai.webp', category: 'beginner,indoor', inStock: true },
                { title: 'Cedar Bonsai', price: 500, image: 'Fotos/Cedar-Bonsai.webp', category: 'intermediate,outdoor', inStock: true }
            ];
            localStorage.setItem('products', JSON.stringify(sampleProducts));
            products.push(...sampleProducts);
        }

        // Filter products based on category
        const filteredProducts = filterCategory === 'all' 
            ? products 
            : products.filter(p => p.category && p.category.split(',').includes(filterCategory));

        productContent.innerHTML = filteredProducts.length ? filteredProducts.map(p => `
            <div class="product-box ${p.inStock === false ? 'out-of-stock' : ''}">
                <div class="img-box">
                    <img src="${p.image}" alt="${p.title}">
                </div>
                <h2 class="product-title">${p.title}</h2>
                <div class="rating">
                    ${Array(5).fill('<i class="fa fa-star"></i>').join('')}
                </div>
                <p>${getCategoryText(p.category)}</p>
                <p class="stock-status ${p.inStock === false ? 'out-of-stock' : 'in-stock'}">
                    ${p.inStock === false ? 'Out of Stock' : 'In Stock'}
                </p>
                <div class="price-and-cart">
                    <span class="price">R${p.price}</span>
                    ${p.inStock !== false 
                        ? `<i class="fas fa-shopping-bag add-cart" data-title="${p.title}"></i>`
                        : `<span class="out-of-stock-label">Unavailable</span>`
                    }
                </div>
            </div>
        `).join('') : '<p>No products available in this category.</p>';

        document.querySelectorAll('.add-cart').forEach(button => {
            button.removeEventListener('click', handleAddToCart);
            button.addEventListener('click', handleAddToCart);
        });
    }

    function getCategoryText(category) {
        if (!category) return 'General bonsai';
        const categories = category.split(',');
        const levels = ['beginner', 'intermediate', 'advanced'];
        const locations = ['indoor', 'outdoor'];
        
        const level = categories.find(c => levels.includes(c));
        const location = categories.find(c => locations.includes(c));
        
        let text = '';
        if (level) text += level.charAt(0).toUpperCase() + level.slice(1) + ' level';
        if (level && location) text += ', ';
        if (location) text += location.charAt(0).toUpperCase() + location.slice(1);
        
        return text || 'General bonsai';
    }

    function handleAddToCart(event) {
        console.log('Add to cart clicked');
        const productBox = event.target.closest('.product-box');
        if (!productBox) {
            console.error('Product box not found');
            return;
        }
        addToCart(productBox);
    }

    function addToCart(productBox) {
        const productImgSrc = productBox.querySelector('img').src;
        const productTitle = productBox.querySelector('.product-title').textContent;
        const productPrice = parseFloat(productBox.querySelector('.price').textContent.replace('R', ''));

        if (!productImgSrc || !productTitle || isNaN(productPrice)) {
            console.error('Invalid product data:', { productImgSrc, productTitle, productPrice });
            alert('Error adding product to cart. Please try again.');
            return;
        }

        if (cartContent && cartContent.querySelector(`.cart-product-title[data-title="${productTitle}"]`)) {
            alert('This item is already in your cart.');
            return;
        }

        const cartBox = document.createElement('div');
        cartBox.classList.add('cart-box');
        cartBox.innerHTML = `
            <img src="${productImgSrc}" alt="${productTitle}" class="cart-img">
            <div class="cart-detail">
                <h2 class="cart-product-title" data-title="${productTitle}">${productTitle}</h2>
                <span class="cart-price">R${productPrice}</span>
                <div class="cart-quantity">
                    <button class="decrement">-</button>
                    <span class="number">1</span>
                    <button class="increment">+</button>
                </div>
            </div>
            <i class="fas fa-trash-can cart-remove"></i>
        `;
        
        if (cartContent) {
            cartContent.appendChild(cartBox);
            updateCartCount(1);
            updateTotalPrice();

            cartBox.querySelector('.cart-remove').addEventListener('click', () => {
                cartBox.remove();
                updateCartCount(-1);
                updateTotalPrice();
            });

            const quantityElement = cartBox.querySelector('.number');
            const decrementButton = cartBox.querySelector('.decrement');
            cartBox.querySelector('.cart-quantity').addEventListener('click', event => {
                let quantity = parseInt(quantityElement.textContent);
                if (event.target.classList.contains('decrement') && quantity > 1) {
                    quantity--;
                    decrementButton.disabled = quantity === 1;
                } else if (event.target.classList.contains('increment')) {
                    quantity++;
                    decrementButton.disabled = false;
                }
                quantityElement.textContent = quantity;
                updateTotalPrice();
            });
        }
    }

    function updateTotalPrice() {
        let total = 0;
        if (cartContent) {
            cartContent.querySelectorAll('.cart-box').forEach(cartBox => {
                const price = parseFloat(cartBox.querySelector('.cart-price').textContent.replace('R', ''));
                const quantity = parseInt(cartBox.querySelector('.number').textContent);
                total += price * quantity;
            });
        }
        if (totalPriceElement) {
            totalPriceElement.textContent = `R${total.toFixed(2)}`;
        }
    }

    function updateCartCount(change) {
        cartItemCount += change;
        if (cartItemCountBadge) {
            cartItemCountBadge.style.visibility = cartItemCount > 0 ? 'visible' : 'hidden';
            cartItemCountBadge.textContent = cartItemCount > 0 ? cartItemCount : '';
        }
    }

    const buyButton = document.querySelector('.btn-buy');
    if (buyButton) {
        buyButton.addEventListener('click', () => {
            if (!cartContent || !cartContent.querySelectorAll('.cart-box').length) {
                alert('Your cart is empty. Please select items to add to your cart.');
                return;
            }
            cartContent.innerHTML = '';
            cartItemCount = 0;
            updateCartCount(0);
            updateTotalPrice();
            alert('Thank you for your purchase!');
            cart.classList.remove('active');
        });
    }

    // Shop page filters
    if (isShopPage()) {
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                loadProducts(button.dataset.filter);
            });
        });
    }

    // Load featured products on home page
    function loadFeaturedProducts() {
        const featuredContent = document.querySelector('#featured-content');
        if (!featuredContent) return;

        const products = JSON.parse(localStorage.getItem('products') || '[]');
        const featuredProducts = products.slice(0, 3); // Show first 3 products

        featuredContent.innerHTML = featuredProducts.length ? featuredProducts.map(p => `
            <div class="product-box ${p.inStock === false ? 'out-of-stock' : ''}">
                <div class="img-box">
                    <img src="${p.image}" alt="${p.title}">
                </div>
                <h2 class="product-title">${p.title}</h2>
                <div class="rating">
                    ${Array(5).fill('<i class="fa fa-star"></i>').join('')}
                </div>
                <p>${getCategoryText(p.category)}</p>
                <p class="stock-status ${p.inStock === false ? 'out-of-stock' : 'in-stock'}">
                    ${p.inStock === false ? 'Out of Stock' : 'In Stock'}
                </p>
                <div class="price-and-cart">
                    <span class="price">R${p.price}</span>
                    ${p.inStock !== false 
                        ? `<i class="fas fa-shopping-bag add-cart" data-title="${p.title}"></i>`
                        : `<span class="out-of-stock-label">Unavailable</span>`
                    }
                </div>
            </div>
        `).join('') : '<p>No products available.</p>';

        document.querySelectorAll('.add-cart').forEach(button => {
            button.removeEventListener('click', handleAddToCart);
            button.addEventListener('click', handleAddToCart);
        });
    }

    // Initialize page
    if (isShopPage()) {
        loadProducts();
    } else {
        loadFeaturedProducts();
    }

    // Check for logged-in user
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        updateAuthUI(currentUser);
    }
});
