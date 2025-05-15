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
        console.log('Loading admin products from Firestore');
        
        // Clear the product list first
        productList.innerHTML = '<p>Loading products...</p>';
        
        // Get products from Firestore
        db.collection('products').get()
            .then((snapshot) => {
                if (snapshot.empty) {
                    productList.innerHTML = '<p>No products added yet.</p>';
                    return;
                }
                
                let productsHTML = '';
                snapshot.forEach(doc => {
                    const p = doc.data();
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
                                <button class="edit-product" onclick="openEditModal('${doc.id}')">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="delete-product" onclick="deleteProduct('${doc.id}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    `;
                });
                
                productList.innerHTML = productsHTML;
            })
            .catch(error => {
                console.error('Error getting products:', error);
                productList.innerHTML = '<p>Error loading products. Please try again.</p>';
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
    window.openEditModal = function(docId) {
        db.collection('products').doc(docId).get()
            .then((doc) => {
                if (!doc.exists) {
                    alert('Product not found.');
                    return;
                }

                const product = doc.data();
                console.log('Opening edit modal for product:', product.title);

                // Show modal
                editModal.classList.add('active');
                
                // Fill form with current values
                document.querySelector('#edit-product-index').value = docId;
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

    window.deleteProduct = function(docId) {
        if (confirm('Are you sure you want to delete this product?')) {
            console.log('Delete product clicked:', docId);
            
            db.collection('products').doc(docId).delete()
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
        
        const docId = document.querySelector('#edit-product-index').value;
        
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
                
                // Update product in Firestore
                db.collection('products').doc(docId).update(updatedProduct)
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
            // Don't update the image field if no new image was uploaded
            db.collection('products').doc(docId).update(updatedProduct)
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
        db.collection('products').where('title', '==', title).get()
            .then((snapshot) => {
                if (!snapshot.empty) {
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
                // Create new product in Firestore
                const newProduct = { 
                    title, 
                    price, 
                    image: imageBase64, 
                    category, 
                    inStock 
                };
                
                return db.collection('products').add(newProduct);
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

    // Add sample products if none exist (only run once)
    function addSampleProductsIfNeeded() {
        db.collection('products').get().then((snapshot) => {
            if (snapshot.empty) {
                console.log('Adding sample products');
                
                const sampleProducts = [
                    { title: 'Juniper Bonsai', price: 250, image: 'Fotos/Juniper-Bonsai.jpg', category: 'beginner,outdoor', inStock: true },
                    { title: 'Maple Bonsai', price: 450, image: 'Fotos/Maple-Bonsai.jpg', category: 'intermediate,outdoor', inStock: true },
                    { title: 'Ficus Bonsai', price: 350, image: 'Fotos/Ficus-Bonsai.jpg', category: 'beginner,indoor', inStock: true },
                    { title: 'Pine Bonsai', price: 550, image: 'Fotos/Pine-Bonsai.jpg', category: 'advanced,outdoor', inStock: false },
                    { title: 'Jade Bonsai', price: 300, image: 'Fotos/Jade-Bonsai.webp', category: 'beginner,indoor', inStock: true },
                    { title: 'Cedar Bonsai', price: 500, image: 'Fotos/Cedar-Bonsai.webp', category: 'intermediate,outdoor', inStock: true }
                ];
                
                // Use a batch to add all sample products at once
                const batch = db.batch();
                
                sampleProducts.forEach((product) => {
                    const docRef = db.collection('products').doc();
                    batch.set(docRef, product);
                });
                
                return batch.commit();
            }
        }).catch(error => {
            console.error('Error checking for sample products:', error);
        });
    }

    // Load products when the page loads
    loadProducts();
    
    // Check for sample products
    addSampleProductsIfNeeded();
});
