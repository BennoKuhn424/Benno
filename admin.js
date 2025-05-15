document.addEventListener('DOMContentLoaded', () => {
    console.log('admin.js loaded');

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Access denied. Admin only.');
        window.location.href = 'index.html';
        return;
    }

    // Mobile menu toggle
    const burger = document.querySelector('.burger');
    const navLinks = document.querySelector('.nav-links');
    if (burger && navLinks) {
        burger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    document.querySelector('#logout-link').addEventListener('click', e => {
        e.preventDefault();
        console.log('Logout clicked');
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });

    const productForm = document.querySelector('#product-form');
    const productList = document.querySelector('#product-list');
    const editModal = document.querySelector('#edit-modal');
    const editForm = document.querySelector('#edit-form');
    const productImage = document.querySelector('#product-image');

    // Image preview for main form
    productImage.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                // You can add a preview element here if desired
                console.log('Image selected:', file.name);
            };
            reader.readAsDataURL(file);
        }
    });

    function loadProducts() {
        console.log('Loading admin products');
        const products = JSON.parse(localStorage.getItem('products') || '[]');
        productList.innerHTML = products.length ? products.map((p, index) => `
            <div class="product-box ${p.inStock === false ? 'out-of-stock' : ''}">
                <img src="${p.image}" alt="${p.title}">
                <h3>${p.title}</h3>
                <p class="product-price">R${p.price}</p>
                <p class="product-category">${getCategoryText(p.category)}</p>
                <p class="stock-status ${p.inStock === false ? 'out-of-stock' : 'in-stock'}">
                    ${p.inStock === false ? 'Out of Stock' : 'In Stock'}
                </p>
                <div class="admin-actions">
                    <button class="edit-product" onclick="openEditModal(${index})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="delete-product" onclick="deleteProduct('${p.title}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('') : '<p>No products added yet.</p>';
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

    // Make functions global for onclick handlers
    window.openEditModal = function(index) {
        const products = JSON.parse(localStorage.getItem('products') || '[]');
        const product = products[index];
        
        if (!product) return;

        console.log('Opening edit modal for product:', product.title);

        // Show modal
        editModal.classList.add('active');
        
        // Fill form with current values
        document.querySelector('#edit-product-index').value = index;
        document.querySelector('#edit-product-title').value = product.title;
        document.querySelector('#edit-product-price').value = product.price;
        document.querySelector('#edit-product-category').value = product.category || '';
        document.querySelector('#edit-product-stock').value = product.inStock !== false ? 'true' : 'false';
        document.querySelector('#edit-image-preview').src = product.image;
    }

    window.closeEditModal = function() {
        editModal.classList.remove('active');
    }

    window.deleteProduct = function(title) {
        if (confirm('Are you sure you want to delete this product?')) {
            console.log('Delete product clicked:', title);
            const products = JSON.parse(localStorage.getItem('products') || '[]');
            const updatedProducts = products.filter(p => p.title !== title);
            localStorage.setItem('products', JSON.stringify(updatedProducts));
            loadProducts();
            alert('Product deleted successfully!');
        }
    }

    // Close modal button
    const closeModalBtn = document.querySelector('#close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeEditModal);
    }

    // Handle edit form submission
    editForm.addEventListener('submit', e => {
        e.preventDefault();
        
        const index = parseInt(document.querySelector('#edit-product-index').value);
        const products = JSON.parse(localStorage.getItem('products') || '[]');
        
        if (!products[index]) return;

        // Update product data
        products[index].title = document.querySelector('#edit-product-title').value;
        products[index].price = parseFloat(document.querySelector('#edit-product-price').value);
        products[index].category = document.querySelector('#edit-product-category').value;
        products[index].inStock = document.querySelector('#edit-product-stock').value === 'true';
        
        // Check if new image was uploaded
        const imageInput = document.querySelector('#edit-product-image');
        if (imageInput.files.length > 0) {
            const file = imageInput.files[0];
            const reader = new FileReader();
            
            reader.onload = () => {
                products[index].image = reader.result;
                localStorage.setItem('products', JSON.stringify(products));
                closeEditModal();
                loadProducts();
                alert('Product updated successfully!');
            };
            
            reader.readAsDataURL(file);
        } else {
            // Save without changing image
            localStorage.setItem('products', JSON.stringify(products));
            closeEditModal();
            loadProducts();
            alert('Product updated successfully!');
        }
    });

    // Image preview for edit form
    document.querySelector('#edit-product-image').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.querySelector('#edit-image-preview').src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    productForm.addEventListener('submit', e => {
        e.preventDefault();
        console.log('Product form submitted');
        const title = document.querySelector('#product-title').value;
        const price = parseFloat(document.querySelector('#product-price').value);
        const category = document.querySelector('#product-category').value;
        const inStock = document.querySelector('#product-stock').value === 'true';
        const imageInput = document.querySelector('#product-image');

        if (!title || isNaN(price) || !imageInput.files.length) {
            alert('Please fill in all fields correctly and select an image.');
            return;
        }

        const file = imageInput.files[0];
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert('Image size must be less than 5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const imageBase64 = reader.result;
            const products = JSON.parse(localStorage.getItem('products') || '[]');
            if (products.some(p => p.title === title)) {
                alert('Product with this title already exists.');
                return;
            }

            const newProduct = { title, price, image: imageBase64, category, inStock };
            products.push(newProduct);
            localStorage.setItem('products', JSON.stringify(products));
            productForm.reset();
            loadProducts();
            alert('Product added successfully!');
        };
        reader.onerror = () => {
            alert('Error reading the image file.');
        };
        reader.readAsDataURL(file);
    });

    loadProducts();
});
