document.addEventListener('DOMContentLoaded', () => {
    console.log('admin-firebase.js loaded');

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
                console.log('Image selected:', file.name);
            };
            reader.readAsDataURL(file);
        }
    });

    function loadProducts() {
        console.log('Loading admin products from Firebase');
        
        // Clear the product list first
        productList.innerHTML = '<p>Loading products...</p>';
        
        // Get products from Firebase
        database.ref('products').on('value', (snapshot) => {
            const productsObj = snapshot.val() || {};
            
            if (!productsObj || Object.keys(productsObj).length === 0) {
                productList.innerHTML = '<p>No products added yet.</p>';
                return;
            }
            
            // Convert object to array with keys
            let productsHTML = '';
            Object.entries(productsObj).forEach(([key, p]) => {
                productsHTML += `
                    <div class="product-box ${p.inStock === false ? 'out-of-stock' : ''}">
                        <img src="${p.image}" alt="${p.title}">
                        <h3>${p.title}</h3>
                        <p class="product-price">R${p.price}</p>
                        <p class="product-category">${getCategoryText(p.category)}</p>
                        <p class="stock-status ${p.inStock === false ? 'out-of-stock' : 'in-stock'}">
                            ${p.inStock === false ? 'Out of Stock' : 'In Stock'}
                        </p>
                        <div class="admin-actions">
                            <button class="edit-product" onclick="openEditModal('${key}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="delete-product" onclick="deleteProduct('${key}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                `;
            });
            
            productList.innerHTML = productsHTML;
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

    // Make functions global for onclick handlers
    window.openEditModal = function(key) {
        database.ref('products/' + key).once('value')
            .then((snapshot) => {
                const product = snapshot.val();
                
                if (!product) {
                    alert('Product not found.');
                    return;
                }

                console.log('Opening edit modal for product:', product.title);

                // Show modal
                editModal.classList.add('active');
                
                // Fill form with current values
                document.querySelector('#edit-product-index').value = key;
                document.querySelector('#edit-product-title').value = product.title;
                document.querySelector('#edit-product-price').value = product.price;
                document.querySelector('#edit-product-category').value = product.category || '';
                document.querySelector('#edit-product-stock').value = product.inStock !== false ? 'true' : 'false';
                document.querySelector('#edit-image-preview').src = product.image;
            })
            .catch(error => {
                console.error('Error fetching product:', error);
                alert('Error loading product details. Please try again.');
            });
    }

    window.closeEditModal = function() {
        editModal.classList.remove('active');
    }

    window.deleteProduct = function(key) {
        if (confirm('Are you sure you want to delete this product?')) {
            console.log('Delete product clicked:', key);
            
            database.ref('products/' + key).remove()
                .then(() => {
                    alert('Product deleted successfully!');
                })
                .catch(error => {
                    console.error('Error deleting product:', error);
                    alert('Error deleting product. Please try again.');
                });
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
        
        const key = document.querySelector('#edit-product-index').value;
        
        // Create updated product object
        const updatedProduct = {
            title: document.querySelector('#edit-product-title').value,
            price: parseFloat(document.querySelector('#edit-product-price').value),
            category: document.querySelector('#edit-product-category').value,
            inStock: document.querySelector('#edit-product-stock').value === 'true'
        };
        
        // Check if new image was uploaded
        const imageInput = document.querySelector('#edit-product-image');
        if (imageInput.files.length > 0) {
            const file = imageInput.files[0];
            const reader = new FileReader();
            
            reader.onload = () => {
                updatedProduct.image = reader.result;
                
                // Update product in Firebase
                database.ref('products/' + key).update(updatedProduct)
                    .then(() => {
                        closeEditModal();
                        alert('Product updated successfully!');
                    })
                    .catch(error => {
                        console.error('Error updating product:', error);
                        alert('Error updating product. Please try again.');
                    });
            };
            
            reader.readAsDataURL(file);
        } else {
            // Save without changing image (preserve existing image)
            database.ref('products/' + key).once('value')
                .then((snapshot) => {
                    const existingProduct = snapshot.val();
                    updatedProduct.image = existingProduct.image;
                    
                    // Update product in Firebase
                    return database.ref('products/' + key).update(updatedProduct);
                })
                .then(() => {
                    closeEditModal();
                    alert('Product updated successfully!');
                })
                .catch(error => {
                    console.error('Error updating product:', error);
                    alert('Error updating product. Please try again.');
                });
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

        // Check if product with same title exists
        database.ref('products').orderByChild('title').equalTo(title).once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    alert('Product with this title already exists.');
                    return Promise.reject('Duplicate title');
                }
                
                // Continue with adding the product
                const reader = new FileReader();
                return new Promise((resolve, reject) => {
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => reject('Error reading file');
                    reader.readAsDataURL(file);
                });
            })
            .then((imageBase64) => {
                // Create new product in Firebase
                const newProduct = { 
                    title, 
                    price, 
                    image: imageBase64, 
                    category, 
                    inStock 
                };
                
                // Push to generate a unique key
                return database.ref('products').push(newProduct);
            })
            .then(() => {
                productForm.reset();
                alert('Product added successfully!');
            })
            .catch(error => {
                if (error === 'Duplicate title') return; // Already handled
                if (error === 'Error reading file') {
                    alert('Error reading the image file.');
                    return;
                }
                console.error('Error adding product:', error);
                alert('Error adding product. Please try again.');
            });
    });

    // Load products when the page loads
    loadProducts();
});
