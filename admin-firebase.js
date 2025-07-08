document.addEventListener('DOMContentLoaded', () => {
    console.log('admin-firebase.js loaded with Firebase Auth and AGE + WEIGHT SYSTEM + GALLERY MANAGEMENT');

    // Check for admin access using Firebase
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser.id) {
        alert('Access denied. Please log in first.');
        window.location.href = 'index.html';
        return;
    }

    // Verify user exists in Firebase and has admin role
    db.collection('users').doc(currentUser.id).get()
        .then((doc) => {
            if (!doc.exists) {
                alert('User not found. Please log in again.');
                localStorage.removeItem('currentUser');
                window.location.href = 'index.html';
                return;
            }

            const userData = doc.data();
            if (userData.role !== 'admin') {
                alert('Access denied. Admin only.');
                window.location.href = 'index.html';
                return;
            }

            // Update last access time
            db.collection('users').doc(currentUser.id).update({
                lastAdminAccess: new Date().toISOString()
            }).catch(error => {
                console.error('Error updating admin access time:', error);
            });

            console.log('Admin access granted for:', userData.username);
        })
        .catch(error => {
            console.error('Error verifying admin access:', error);
            alert('Error verifying access. Please try again.');
            window.location.href = 'index.html';
            return;
        });

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
        console.log('Admin logout clicked');
        
        // Update logout time in Firebase
        if (currentUser && currentUser.id) {
            db.collection('users').doc(currentUser.id).update({
                lastLogout: new Date().toISOString()
            }).catch(error => {
                console.error('Error updating logout time:', error);
            });
        }

        // Clear session and redirect
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });

    // Tab navigation
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all tabs and content
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
            
            // Load data based on tab
            if (tabId === 'orders') {
                loadOrdersData();
            } else if (tabId === 'gallery') {
                loadGalleryItems();
            }
        });
    });

    // PRODUCT MANAGEMENT WITH AGE + WEIGHT SYSTEM
    const productForm = document.querySelector('#product-form');
    const productList = document.querySelector('#product-list');
    const editProductModal = document.querySelector('#edit-product-modal');
    const editProductForm = document.querySelector('#edit-product-form');
    const productImage = document.querySelector('#product-image');

    // Image preview for main product form
    if (productImage) {
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
    }

    function loadProducts() {
        console.log('Loading admin products from Firestore with AGE + WEIGHT SYSTEM');
        
        if (!productList) return;
        
        // Clear the product list first
        productList.innerHTML = '<p>Loading products...</p>';
        
        // Get products from Firestore
        db.collection('products').get()
            .then((snapshot) => {
                if (snapshot.empty) {
                    productList.innerHTML = '<p>No products added yet. Add your first product using the form above.</p>';
                    return;
                }
                
                // Group products by title
                const groupedProducts = {};
                snapshot.forEach(doc => {
                    const p = doc.data();
                    const key = p.title;
                    if (!groupedProducts[key]) {
                        groupedProducts[key] = [];
                    }
                    groupedProducts[key].push({ id: doc.id, ...p });
                });
                
                let productsHTML = '';
                Object.keys(groupedProducts).forEach(productTitle => {
                    const variants = groupedProducts[productTitle];
                    const mainProduct = variants[0]; // Use first variant for display
                    
                    // Sort variants by age first, then by weight
                    variants.sort((a, b) => {
                        if (a.age !== b.age) return a.age - b.age;
                        return (a.weight || 0) - (b.weight || 0);
                    });
                    
                    productsHTML += `
                        <div class="product-group">
                            <div class="product-group-header">
                                <img src="${mainProduct.image}" alt="${mainProduct.title}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;">
                                <div class="product-info">
                                    <h3>${mainProduct.title}</h3>
                                    <p class="product-category">${getCategoryText(mainProduct.category)}</p>
                                    <p class="variant-count">${variants.length} variant(s) (age + weight)</p>
                                </div>
                                <div class="group-actions">
                                    <button class="manage-ages-btn" onclick="openVariantManagementModal('${productTitle}')">
                                        <i class="fas fa-cog"></i> Manage Variants
                                    </button>
                                    <button class="delete-group-btn" onclick="deleteProductGroup('${productTitle}')">
                                        <i class="fas fa-trash-alt"></i> Delete Product
                                    </button>
                                </div>
                            </div>
                            <div class="product-variants">
                                ${variants.map(variant => {
                                    const ageText = variant.age === 1 ? '1 year' : `${variant.age} years`;
                                    const weightText = variant.weight ? `${variant.weight}${variant.weightUnit || 'kg'}` : 'N/A';
                                    return `
                                        <div class="variant-item">
                                            <span class="variant-age">${ageText}</span>
                                            <span class="variant-weight">${weightText}</span>
                                            <span class="variant-price">R${variant.price}</span>
                                            <span class="variant-stock ${variant.quantity > 0 ? 'in-stock' : 'out-of-stock'}">
                                                ${variant.quantity > 0 ? `${variant.quantity} in stock` : 'Out of stock'}
                                            </span>
                                            <div class="variant-actions">
                                                <button class="variant-edit-btn" onclick="editVariant('${variant.id}')">
                                                    <i class="fas fa-edit"></i> Edit
                                                </button>
                                                <button class="variant-delete-btn" onclick="deleteVariant('${variant.id}', '${productTitle}')">
                                                    <i class="fas fa-trash"></i> Delete
                                                </button>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
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
        if (!category) return 'General Product';
        
        // Category mapping for display names
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
            'rare-succulents-cacti': 'Rare Succulents & Cacti',
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
        
        // Handle multiple categories (if still using comma-separated values)
        if (category.includes(',')) {
            const categories = category.split(',').map(cat => cat.trim());
            return categories.map(cat => categoryMap[cat] || cat.charAt(0).toUpperCase() + cat.slice(1)).join(', ');
        }
        
        // Single category
        return categoryMap[category] || category.charAt(0).toUpperCase() + category.slice(1);
    }

    // Updated validation for new categories in product form submission
    function validateProductCategory(category) {
        const validCategories = [
            'prebonsai', 'seedlings', 'silver-bonsai', 'gold-bonsai', 'platinum-bonsai',
            'imported-bonsai', 'bonsai-pots', 'bonsai-tools', 'bonsai-wire', 'bonsai-accessories',
            'rare-succulents-cacti', 'orchids', 'airplants', 'terrariums', 'aquariums', 
            'aqua-scapes', 'rocks', 'driftwood', 'pebbles', 'mosses', 'pot-dressings'
        ];
        
        if (category.includes(',')) {
            const categories = category.split(',').map(cat => cat.trim());
            return categories.every(cat => validCategories.includes(cat));
        }
        
        return validCategories.includes(category);
    }

    // VARIANT MANAGEMENT MODAL FUNCTIONS (Updated from Age to include Weight)
    window.openVariantManagementModal = function(productTitle) {
        const modal = document.createElement('div');
        modal.className = 'age-management-modal';
        modal.id = 'variant-management-modal';
        
        modal.innerHTML = `
            <div class="age-management-content">
                <div class="age-management-header">
                    <h3>Manage Variants - ${productTitle}</h3>
                    <button class="age-management-close" onclick="closeVariantManagementModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="age-management-body">
                    <div class="age-management-actions">
                        <button class="age-action-btn add-age" onclick="addNewVariant('${productTitle}')">
                            <i class="fas fa-plus"></i> Add New Variant
                        </button>
                    </div>
                    <div class="age-variants-list" id="variants-list">
                        <p>Loading variants...</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.classList.add('active');
        
        // Load variants for this product
        loadProductVariants(productTitle);
    };

    window.closeVariantManagementModal = function() {
        const modal = document.getElementById('variant-management-modal');
        if (modal) {
            modal.remove();
        }
    };

    function loadProductVariants(productTitle) {
        const variantsList = document.getElementById('variants-list');
        
        db.collection('products').where('title', '==', productTitle).get()
            .then((snapshot) => {
                if (snapshot.empty) {
                    variantsList.innerHTML = '<p>No variants found.</p>';
                    return;
                }
                
                let variantsHTML = '';
                const variants = [];
                
                snapshot.forEach(doc => {
                    variants.push({ id: doc.id, ...doc.data() });
                });
                
                // Sort by age first, then by weight
                variants.sort((a, b) => {
                    if (a.age !== b.age) return a.age - b.age;
                    return (a.weight || 0) - (b.weight || 0);
                });
                
                variants.forEach(variant => {
                    const ageText = variant.age === 1 ? '1 year' : `${variant.age} years`;
                    const weightText = variant.weight ? `${variant.weight}${variant.weightUnit || 'kg'}` : 'No weight recorded';
                    variantsHTML += `
                        <div class="age-variant-item">
                            <div class="variant-info">
                                <span class="variant-age-display">${ageText}</span>
                                <span class="variant-weight-display" style="background: #ff9800; color: white; padding: 0.5rem 1rem; border-radius: 20px; font-weight: 700; min-width: 80px; text-align: center;">${weightText}</span>
                                <span class="variant-price-display">R${variant.price}</span>
                                <span class="variant-stock-display ${variant.quantity > 0 ? 'in-stock' : 'out-of-stock'}">
                                    ${variant.quantity > 0 ? `${variant.quantity} in stock` : 'Out of stock'}
                                </span>
                            </div>
                            <div class="variant-actions">
                                <button class="variant-edit-btn" onclick="editVariant('${variant.id}')">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="variant-delete-btn" onclick="deleteVariant('${variant.id}', '${productTitle}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    `;
                });
                
                variantsList.innerHTML = variantsHTML;
            })
            .catch(error => {
                console.error('Error loading variants:', error);
                variantsList.innerHTML = '<p>Error loading variants.</p>';
            });
    }

    window.addNewVariant = function(productTitle) {
        // Pre-fill the form with the product title
        document.querySelector('#product-title').value = productTitle;
        
        // Get existing variant to copy category and image
        db.collection('products').where('title', '==', productTitle).limit(1).get()
            .then((snapshot) => {
                if (!snapshot.empty) {
                    const existingProduct = snapshot.docs[0].data();
                    document.querySelector('#product-category').value = existingProduct.category;
                    
                    // Close the modal and scroll to the form
                    closeVariantManagementModal();
                    document.querySelector('#product-form').scrollIntoView({ behavior: 'smooth' });
                    document.querySelector('#product-age').focus();
                    
                    // Highlight the form
                    const form = document.querySelector('#product-form');
                    form.classList.add('highlight');
                    setTimeout(() => form.classList.remove('highlight'), 3000);
                    
                    // Show a helpful message
                    showAdminMessage(`Adding new variant for "${productTitle}". The category has been pre-selected.`, 'success');
                } else {
                    showAdminMessage('Product not found.', 'error');
                }
            })
            .catch(error => {
                console.error('Error fetching product for variant:', error);
                showAdminMessage('Error loading product details. Please try again.', 'error');
            });
    };

    window.editVariant = function(variantId) {
        db.collection('products').doc(variantId).get()
            .then((doc) => {
                if (!doc.exists) {
                    showAdminMessage('Product variant not found.', 'error');
                    return;
                }

                const product = doc.data();
                console.log('Opening edit modal for variant:', product.title);

                // Close variant management modal first
                closeVariantManagementModal();

                // Show edit modal
                editProductModal.classList.add('active');
                
                // Fill form with current values
                document.querySelector('#edit-product-index').value = variantId;
                document.querySelector('#edit-product-title').value = product.title;
                document.querySelector('#edit-product-age').value = product.age || '';
                document.querySelector('#edit-product-weight').value = product.weight || '';
                document.querySelector('#edit-weight-unit').value = product.weightUnit || 'kg';
                document.querySelector('#edit-product-price').value = product.price;
                document.querySelector('#edit-product-category').value = product.category || '';
                document.querySelector('#edit-product-quantity').value = product.quantity || 0;
                document.querySelector('#edit-product-image-preview').src = product.image;
            })
            .catch(error => {
                console.error('Error fetching product:', error);
                showAdminMessage('Error loading product details. Please try again.', 'error');
            });
    };

    window.deleteVariant = function(variantId, productTitle) {
        if (confirm('Are you sure you want to delete this variant?')) {
            console.log('Delete variant clicked:', variantId);
            
            // Log admin action
            logAdminAction('delete_variant', { variantId, productTitle });
            
            db.collection('products').doc(variantId).delete()
                .then(() => {
                    showAdminMessage('Variant deleted successfully!', 'success');
                    // Reload the variants in the modal
                    loadProductVariants(productTitle);
                    // Reload the main products list
                    loadProducts();
                })
                .catch(error => {
                    console.error('Error deleting variant:', error);
                    showAdminMessage('Error deleting variant. Please try again.', 'error');
                });
        }
    };

    window.closeEditProductModal = function() {
        editProductModal.classList.remove('active');
    }

    // Add function to delete entire product group
    window.deleteProductGroup = function(productTitle) {
        if (confirm(`Are you sure you want to delete ALL variants of "${productTitle}"? This cannot be undone.`)) {
            console.log('Delete product group clicked:', productTitle);
            
            // Log admin action
            logAdminAction('delete_product_group', { productTitle });
            
            // Get all variants of this product
            db.collection('products').where('title', '==', productTitle).get()
                .then((snapshot) => {
                    if (snapshot.empty) {
                        showAdminMessage('No variants found to delete.', 'error');
                        return;
                    }
                    
                    // Delete all variants
                    const batch = db.batch();
                    snapshot.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    
                    return batch.commit();
                })
                .then(() => {
                    showAdminMessage(`All variants of "${productTitle}" deleted successfully!`, 'success');
                    loadProducts(); // Reload products list
                })
                .catch(error => {
                    console.error('Error deleting product group:', error);
                    showAdminMessage('Error deleting product group. Please try again.', 'error');
                });
        }
    }

    // Helper function to show admin messages
    function showAdminMessage(message, type) {
        // Remove existing messages
        const existingMessage = document.querySelector('.admin-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `admin-message ${type}`;
        messageDiv.textContent = message;
        
        // Insert after the admin panel heading
        const adminPanel = document.querySelector('.admin-panel h2');
        adminPanel.parentNode.insertBefore(messageDiv, adminPanel.nextSibling);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }

    // Function to log admin actions to Firebase
    function logAdminAction(action, details = {}) {
        if (!currentUser || !currentUser.id) return;

        const logEntry = {
            adminId: currentUser.id,
            adminUsername: currentUser.username,
            action: action,
            details: details,
            timestamp: new Date().toISOString(),
            ipAddress: 'N/A' // Would need server-side implementation for real IP
        };

        db.collection('admin_logs').add(logEntry)
            .catch(error => {
                console.error('Error logging admin action:', error);
            });
    }

    // Handle edit product form submission with AGE + WEIGHT
    if (editProductForm) {
        editProductForm.addEventListener('submit', e => {
            e.preventDefault();
            
            const docId = document.querySelector('#edit-product-index').value;
            
            // Create updated product object
            const updatedProduct = {
                title: document.querySelector('#edit-product-title').value,
                age: parseFloat(document.querySelector('#edit-product-age').value),
                weight: parseFloat(document.querySelector('#edit-product-weight').value),
                weightUnit: document.querySelector('#edit-weight-unit').value,
                price: parseFloat(document.querySelector('#edit-product-price').value),
                category: document.querySelector('#edit-product-category').value,
                quantity: parseInt(document.querySelector('#edit-product-quantity').value),
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser.id
            };
            
            // Log admin action
            logAdminAction('edit_product', { productId: docId, updatedFields: Object.keys(updatedProduct) });
            
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
                            closeEditProductModal();
                            showAdminMessage('Product variant updated successfully!', 'success');
                            loadProducts(); // Reload products list
                        })
                        .catch(error => {
                            console.error('Error updating product:', error);
                            showAdminMessage('Error updating product. Please try again.', 'error');
                        });
                };
                
                reader.readAsDataURL(file);
            } else {
                // Don't update the image field if no new image was uploaded
                db.collection('products').doc(docId).update(updatedProduct)
                    .then(() => {
                        closeEditProductModal();
                        showAdminMessage('Product variant updated successfully!', 'success');
                        loadProducts(); // Reload products list
                    })
                    .catch(error => {
                        console.error('Error updating product:', error);
                        showAdminMessage('Error updating product. Please try again.', 'error');
                    });
            }
        });
    }

    // Image preview for edit product form
    const editProductImageInput = document.querySelector('#edit-product-image');
    if (editProductImageInput) {
        editProductImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.querySelector('#edit-product-image-preview').src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Product form submission with AGE + WEIGHT SYSTEM
    if (productForm) {
        productForm.addEventListener('submit', e => {
            e.preventDefault();
            console.log('Product form submitted with AGE + WEIGHT SYSTEM');
            const title = document.querySelector('#product-title').value;
            const age = parseFloat(document.querySelector('#product-age').value);
            const weight = parseFloat(document.querySelector('#product-weight').value);
            const weightUnit = document.querySelector('#weight-unit').value;
            const price = parseFloat(document.querySelector('#product-price').value);
            const category = document.querySelector('#product-category').value;
            const quantity = parseInt(document.querySelector('#product-quantity').value);
            const imageInput = document.querySelector('#product-image');

            if (!title || isNaN(age) || isNaN(weight) || isNaN(price) || isNaN(quantity) || !imageInput.files.length) {
                showAdminMessage('Please fill in all fields correctly and select an image.', 'error');
                return;
            }

            if (age < 0.5 || age > 100) {
                showAdminMessage('Age must be between 0.5 and 100 years.', 'error');
                return;
            }

            if (weight < 0.1 || weight > 50) {
                showAdminMessage('Weight must be between 0.1 and 50 (in the selected unit).', 'error');
                return;
            }

            const file = imageInput.files[0];
            if (!file.type.startsWith('image/')) {
                showAdminMessage('Please upload an image file.', 'error');
                return;
            }

            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                showAdminMessage('Image size must be less than 5MB.', 'error');
                return;
            }

            // Check if variant with same title, age, and weight exists
            db.collection('products')
                .where('title', '==', title.trim())
                .where('age', '==', age)
                .where('weight', '==', weight)
                .where('weightUnit', '==', weightUnit)
                .get()
                .then((snapshot) => {
                    if (!snapshot.empty) {
                        const ageText = age === 1 ? '1 year' : `${age} years`;
                        const weightText = `${weight}${weightUnit}`;
                        showAdminMessage(`A variant with age ${ageText} and weight ${weightText} already exists for "${title}".`, 'error');
                        return Promise.reject('Duplicate variant');
                    }
                    
                    // Create new product variant
                    const reader = new FileReader();
                    return new Promise((resolve, reject) => {
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = () => reject('Error reading file');
                        reader.readAsDataURL(file);
                    });
                })
                .then((imageBase64) => {
                    const newProduct = { 
                        title: title.trim(), 
                        age: age,
                        weight: weight,
                        weightUnit: weightUnit,
                        price: price, 
                        image: imageBase64, 
                        category: category, 
                        quantity: quantity,
                        createdAt: new Date().toISOString(),
                        createdBy: currentUser.id
                    };
                    
                    // Log admin action
                    logAdminAction('add_product', { productTitle: title, age: age, weight: weight, weightUnit: weightUnit });
                    
                    return db.collection('products').add(newProduct);
                })
                .then(() => {
                    productForm.reset();
                    showAdminMessage('Product variant added successfully!', 'success');
                    loadProducts(); // Reload products list
                })
                .catch(error => {
                    if (error === 'Duplicate variant') return; // Already handled
                    if (error === 'Error reading file') {
                        showAdminMessage('Error reading the image file.', 'error');
                        return;
                    }
                    console.error('Error adding product:', error);
                    showAdminMessage('Error adding product. Please try again.', 'error');
                });
        });
    }

    // COURSE MANAGEMENT (updated with Firebase auth tracking)
    const courseForm = document.querySelector('#course-form');
    const coursesList = document.querySelector('#courses-list');
    const editCourseModal = document.querySelector('#edit-course-modal');
    const editCourseForm = document.querySelector('#edit-course-form');
    const courseImage = document.querySelector('#course-image');

    // Image preview for main course form
    if (courseImage) {
        courseImage.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    console.log('Image selected:', file.name);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    function loadCourses() {
        console.log('Loading admin courses from Firestore');
        
        if (!coursesList) return;
        
        // Clear the courses list first
        coursesList.innerHTML = '<p>Loading courses...</p>';
        
        // Get courses from Firestore
        db.collection('courses').get()
            .then((snapshot) => {
                if (snapshot.empty) {
                    coursesList.innerHTML = '<p>No courses added yet. Add your first course using the form above.</p>';
                    return;
                }
                
                let coursesHTML = '';
                snapshot.forEach(doc => {
                    const course = doc.data();
                    
                    coursesHTML += `
                        <div class="tip-box">
                            <!-- Course Header Section -->
                            <div class="course-header">
                                <img src="${course.image}" alt="${course.title}">
                                <div class="course-info">
                                    <h3>${course.title}</h3>
                                    <div class="course-tags">
                                        <span class="tip-category">${getCourseCategoryText(course.category)}</span>
                                        <span class="course-level">${course.level.charAt(0).toUpperCase() + course.level.slice(1)} Level</span>
                                    </div>
                                    <div class="course-details">
                                        <span class="course-price">R${course.price}</span>
                                        <span class="course-duration">${course.duration}h duration</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Course Description Section -->
                            <div class="tip-description">
                                <strong>Course Description:</strong><br>
                                ${course.description}
                            </div>
                            
                            <!-- Course Actions Section -->
                            <div class="course-actions">
                                <button class="edit-tip" onclick="openEditCourseModal('${doc.id}')">
                                    <i class="fas fa-edit"></i> Edit Course
                                </button>
                                <button class="delete-tip" onclick="deleteCourse('${doc.id}')">
                                    <i class="fas fa-trash"></i> Delete Course
                                </button>
                            </div>
                        </div>
                    `;
                });
                
                coursesList.innerHTML = coursesHTML;
            })
            .catch(error => {
                console.error('Error getting courses:', error);
                coursesList.innerHTML = '<p>Error loading courses. Please try again.</p>';
            });
    }

    function getCourseCategoryText(category) {
        if (!category) return 'General Course';
        
        // Convert kebab-case to Title Case
        return category.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    // Make functions global for onclick handlers
    window.openEditCourseModal = function(docId) {
        db.collection('courses').doc(docId).get()
            .then((doc) => {
                if (!doc.exists) {
                    showAdminMessage('Course not found.', 'error');
                    return;
                }

                const course = doc.data();
                console.log('Opening edit modal for course:', course.title);

                // Show modal
                editCourseModal.classList.add('active');
                
                // Fill form with current values
                document.querySelector('#edit-course-index').value = docId;
                document.querySelector('#edit-course-title').value = course.title;
                document.querySelector('#edit-course-description').value = course.description;
                document.querySelector('#edit-course-price').value = course.price;
                document.querySelector('#edit-course-duration').value = course.duration;
                document.querySelector('#edit-course-level').value = course.level || '';
                document.querySelector('#edit-course-category').value = course.category || '';
                document.querySelector('#edit-course-image-preview').src = course.image;
            })
            .catch(error => {
                console.error('Error fetching course:', error);
                showAdminMessage('Error loading course details. Please try again.', 'error');
            });
    }

    window.closeEditCourseModal = function() {
        editCourseModal.classList.remove('active');
    }

    window.deleteCourse = function(docId) {
        if (confirm('Are you sure you want to delete this course?')) {
            console.log('Delete course clicked:', docId);
            
            // Log admin action
            logAdminAction('delete_course', { courseId: docId });
            
            db.collection('courses').doc(docId).delete()
                .then(() => {
                    showAdminMessage('Course deleted successfully!', 'success');
                    loadCourses(); // Reload courses list
                })
                .catch(error => {
                    console.error('Error deleting course:', error);
                    showAdminMessage('Error deleting course. Please try again.', 'error');
                });
        }
    }

    // Handle edit course form submission
    if (editCourseForm) {
        editCourseForm.addEventListener('submit', e => {
            e.preventDefault();
            
            const docId = document.querySelector('#edit-course-index').value;
            
            // Create updated course object
            const updatedCourse = {
                title: document.querySelector('#edit-course-title').value,
                description: document.querySelector('#edit-course-description').value,
                price: parseFloat(document.querySelector('#edit-course-price').value),
                duration: parseFloat(document.querySelector('#edit-course-duration').value),
                level: document.querySelector('#edit-course-level').value,
                category: document.querySelector('#edit-course-category').value,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser.id
            };
            
            // Log admin action
            logAdminAction('edit_course', { courseId: docId, updatedFields: Object.keys(updatedCourse) });
            
            // Check if new image was uploaded
            const imageInput = document.querySelector('#edit-course-image');
            if (imageInput.files.length > 0) {
                const file = imageInput.files[0];
                const reader = new FileReader();
                
                reader.onload = () => {
                    updatedCourse.image = reader.result;
                    
                    // Update course in Firestore
                    db.collection('courses').doc(docId).update(updatedCourse)
                        .then(() => {
                            closeEditCourseModal();
                            showAdminMessage('Course updated successfully!', 'success');
                            loadCourses(); // Reload courses list
                        })
                        .catch(error => {
                            console.error('Error updating course:', error);
                            showAdminMessage('Error updating course. Please try again.', 'error');
                        });
                };
                
                reader.readAsDataURL(file);
            } else {
                // Don't update the image field if no new image was uploaded
                db.collection('courses').doc(docId).update(updatedCourse)
                    .then(() => {
                        closeEditCourseModal();
                        showAdminMessage('Course updated successfully!', 'success');
                        loadCourses(); // Reload courses list
                    })
                    .catch(error => {
                        console.error('Error updating course:', error);
                        showAdminMessage('Error updating course. Please try again.', 'error');
                    });
            }
        });
    }

    // Image preview for edit course form
    const editCourseImageInput = document.querySelector('#edit-course-image');
    if (editCourseImageInput) {
        editCourseImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.querySelector('#edit-course-image-preview').src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (courseForm) {
        courseForm.addEventListener('submit', e => {
            e.preventDefault();
            console.log('Course form submitted');
            const title = document.querySelector('#course-title').value;
            const description = document.querySelector('#course-description').value;
            const price = parseFloat(document.querySelector('#course-price').value);
            const duration = parseFloat(document.querySelector('#course-duration').value);
            const level = document.querySelector('#course-level').value;
            const category = document.querySelector('#course-category').value;
            const imageInput = document.querySelector('#course-image');

            // Enhanced validation
            if (!title || !description || !category || !level || isNaN(price) || isNaN(duration) || !imageInput.files.length) {
                showAdminMessage('Please fill in all fields correctly and select an image.', 'error');
                return;
            }

            if (title.length < 3) {
                showAdminMessage('Title must be at least 3 characters long.', 'error');
                return;
            }

            if (description.length < 20) {
                showAdminMessage('Description should be more detailed (at least 20 characters).', 'error');
                return;
            }

            const file = imageInput.files[0];
            if (!file.type.startsWith('image/')) {
                showAdminMessage('Please upload an image file.', 'error');
                return;
            }

            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                showAdminMessage('Image size must be less than 5MB.', 'error');
                return;
            }

            // Check if course with same title exists
            db.collection('courses').where('title', '==', title).get()
                .then((snapshot) => {
                    if (!snapshot.empty) {
                        showAdminMessage('Course with this title already exists.', 'error');
                        return Promise.reject('Duplicate title');
                    }
                    
                    // Continue with adding the course
                    const reader = new FileReader();
                    return new Promise((resolve, reject) => {
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = () => reject('Error reading file');
                        reader.readAsDataURL(file);
                    });
                })
                .then((imageBase64) => {
                    // Create new course in Firestore with proper formatting
                    const newCourse = { 
                        title: title.trim(), 
                        description: description.trim(), 
                        image: imageBase64, 
                        price: price,
                        duration: duration,
                        level: level.trim(),
                        category: category.trim(),
                        createdAt: new Date().toISOString(),
                        createdBy: currentUser.id
                    };
                    
                    // Log admin action
                    logAdminAction('add_course', { courseTitle: title, category: category });
                    
                    return db.collection('courses').add(newCourse);
                })
                .then(() => {
                    courseForm.reset();
                    showAdminMessage('Course added successfully!', 'success');
                    loadCourses(); // Reload courses list
                })
                .catch(error => {
                    if (error === 'Duplicate title') return; // Already handled
                    if (error === 'Error reading file') {
                        showAdminMessage('Error reading the image file.', 'error');
                        return;
                    }
                    console.error('Error adding course:', error);
                    showAdminMessage('Error adding course. Please try again.', 'error');
                });
        });
    }

    // GALLERY MANAGEMENT - Add this section to admin-firebase.js
    const galleryForm = document.querySelector('#gallery-form');
    const galleryList = document.querySelector('#gallery-list');
    const editGalleryModal = document.querySelector('#edit-gallery-modal');
    const editGalleryForm = document.querySelector('#edit-gallery-form');
    const galleryImage = document.querySelector('#gallery-image');

    // Gallery image preview for main form
    if (galleryImage) {
        galleryImage.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    console.log('Gallery image selected:', file.name);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Load gallery items for admin
    function loadGalleryItems() {
        console.log('Loading admin gallery items from Firestore');
        
        if (!galleryList) return;
        
        // Clear the gallery list first
        galleryList.innerHTML = '<p>Loading gallery items...</p>';
        
        // Get gallery items from Firestore
        db.collection('gallery').orderBy('createdAt', 'desc').get()
            .then((snapshot) => {
                if (snapshot.empty) {
                    galleryList.innerHTML = '<p>No gallery items added yet. Add your first photo using the form above.</p>';
                    return;
                }
                
                let galleryHTML = '';
                snapshot.forEach(doc => {
                    const item = doc.data();
                    const date = new Date(item.createdAt).toLocaleDateString();
                    
                    galleryHTML += `
                        <div class="gallery-admin-item">
                            <div class="gallery-admin-header">
                                <img src="${item.image}" alt="${item.title}">
                                <div class="gallery-admin-info">
                                    <h3>${item.title}</h3>
                                    <span class="gallery-admin-category">${getGalleryCategoryText(item.category)}</span>
                                    <div class="gallery-admin-date">Added: ${date}</div>
                                </div>
                                <div class="gallery-admin-actions">
                                    <button class="edit-gallery-btn" onclick="openEditGalleryModal('${doc.id}')">
                                        <i class="fas fa-edit"></i> Edit Photo
                                    </button>
                                    <button class="delete-gallery-btn" onclick="deleteGalleryItem('${doc.id}')">
                                        <i class="fas fa-trash"></i> Delete Photo
                                    </button>
                                </div>
                            </div>
                            <div class="gallery-admin-description">
                                <strong>Description:</strong><br>
                                ${item.description}
                            </div>
                        </div>
                    `;
                });
                
                galleryList.innerHTML = galleryHTML;
            })
            .catch(error => {
                console.error('Error getting gallery items:', error);
                galleryList.innerHTML = '<p>Error loading gallery items. Please try again.</p>';
            });
    }

    // Get gallery category display text
    function getGalleryCategoryText(category) {
        if (!category) return 'General';
        
        const categoryMap = {
            'team': 'Our Team',
            'workspace': 'Workspace',
            'environment': 'Environment',
            'events': 'Events',
            'process': 'Process',
            'customers': 'Happy Customers'
        };
        
        return categoryMap[category] || category.charAt(0).toUpperCase() + category.slice(1);
    }

    // Gallery form submission
    if (galleryForm) {
        galleryForm.addEventListener('submit', e => {
            e.preventDefault();
            console.log('Gallery form submitted');
            
            const title = document.querySelector('#gallery-title').value;
            const description = document.querySelector('#gallery-description').value;
            const category = document.querySelector('#gallery-category').value;
            const imageInput = document.querySelector('#gallery-image');

            // Enhanced validation
            if (!title || !description || !category || !imageInput.files.length) {
                showAdminMessage('Please fill in all fields and select an image.', 'error');
                return;
            }

            if (title.length < 3) {
                showAdminMessage('Title must be at least 3 characters long.', 'error');
                return;
            }

            if (description.length < 10) {
                showAdminMessage('Description should be more detailed (at least 10 characters).', 'error');
                return;
            }

            const file = imageInput.files[0];
            if (!file.type.startsWith('image/')) {
                showAdminMessage('Please upload an image file.', 'error');
                return;
            }

            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                showAdminMessage('Image size must be less than 5MB.', 'error');
                return;
            }

            // Check if gallery item with same title exists
            db.collection('gallery').where('title', '==', title).get()
                .then((snapshot) => {
                    if (!snapshot.empty) {
                        showAdminMessage('Gallery item with this title already exists.', 'error');
                        return Promise.reject('Duplicate title');
                    }
                    
                    // Continue with adding the gallery item
                    const reader = new FileReader();
                    return new Promise((resolve, reject) => {
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = () => reject('Error reading file');
                        reader.readAsDataURL(file);
                    });
                })
                .then((imageBase64) => {
                    // Create new gallery item in Firestore
                    const newGalleryItem = { 
                        title: title.trim(), 
                        description: description.trim(), 
                        image: imageBase64, 
                        category: category.trim(),
                        createdAt: new Date().toISOString(),
                        createdBy: currentUser.id
                    };
                    
                    // Log admin action
                    logAdminAction('add_gallery_item', { galleryTitle: title, category: category });
                    
                    return db.collection('gallery').add(newGalleryItem);
                })
                .then(() => {
                    galleryForm.reset();
                    showAdminMessage('Gallery photo added successfully!', 'success');
                    loadGalleryItems(); // Reload gallery list
                })
                .catch(error => {
                    if (error === 'Duplicate title') return; // Already handled
                    if (error === 'Error reading file') {
                        showAdminMessage('Error reading the image file.', 'error');
                        return;
                    }
                    console.error('Error adding gallery item:', error);
                    showAdminMessage('Error adding gallery photo. Please try again.', 'error');
                });
        });
    }

    // Make functions global for onclick handlers
    window.openEditGalleryModal = function(docId) {
        db.collection('gallery').doc(docId).get()
            .then((doc) => {
                if (!doc.exists) {
                    showAdminMessage('Gallery item not found.', 'error');
                    return;
                }

                const item = doc.data();
                console.log('Opening edit modal for gallery item:', item.title);

                // Show modal
                editGalleryModal.classList.add('active');
                
                // Fill form with current values
                document.querySelector('#edit-gallery-index').value = docId;
                document.querySelector('#edit-gallery-title').value = item.title;
                document.querySelector('#edit-gallery-description').value = item.description;
                document.querySelector('#edit-gallery-category').value = item.category || '';
                document.querySelector('#edit-gallery-image-preview').src = item.image;
            })
            .catch(error => {
                console.error('Error fetching gallery item:', error);
                showAdminMessage('Error loading gallery item details. Please try again.', 'error');
            });
    }

    window.closeEditGalleryModal = function() {
        editGalleryModal.classList.remove('active');
    }

    window.deleteGalleryItem = function(docId) {
        if (confirm('Are you sure you want to delete this gallery photo?')) {
            console.log('Delete gallery item clicked:', docId);
            
            // Log admin action
            logAdminAction('delete_gallery_item', { galleryId: docId });
            
            db.collection('gallery').doc(docId).delete()
                .then(() => {
                    showAdminMessage('Gallery photo deleted successfully!', 'success');
                    loadGalleryItems(); // Reload gallery list
                })
                .catch(error => {
                    console.error('Error deleting gallery item:', error);
                    showAdminMessage('Error deleting gallery photo. Please try again.', 'error');
                });
        }
    }

    // Handle edit gallery form submission
    if (editGalleryForm) {
        editGalleryForm.addEventListener('submit', e => {
            e.preventDefault();
            
            const docId = document.querySelector('#edit-gallery-index').value;
            
            // Create updated gallery item object
            const updatedGalleryItem = {
                title: document.querySelector('#edit-gallery-title').value,
                description: document.querySelector('#edit-gallery-description').value,
                category: document.querySelector('#edit-gallery-category').value,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser.id
            };
            
            // Log admin action
            logAdminAction('edit_gallery_item', { galleryId: docId, updatedFields: Object.keys(updatedGalleryItem) });
            
            // Check if new image was uploaded
            const imageInput = document.querySelector('#edit-gallery-image');
            if (imageInput.files.length > 0) {
                const file = imageInput.files[0];
                const reader = new FileReader();
                
                reader.onload = () => {
                    updatedGalleryItem.image = reader.result;
                    
                    // Update gallery item in Firestore
                    db.collection('gallery').doc(docId).update(updatedGalleryItem)
                        .then(() => {
                            closeEditGalleryModal();
                            showAdminMessage('Gallery photo updated successfully!', 'success');
                            loadGalleryItems(); // Reload gallery list
                        })
                        .catch(error => {
                            console.error('Error updating gallery item:', error);
                            showAdminMessage('Error updating gallery photo. Please try again.', 'error');
                        });
                };
                
                reader.readAsDataURL(file);
            } else {
                // Don't update the image field if no new image was uploaded
                db.collection('gallery').doc(docId).update(updatedGalleryItem)
                    .then(() => {
                        closeEditGalleryModal();
                        showAdminMessage('Gallery photo updated successfully!', 'success');
                        loadGalleryItems(); // Reload gallery list
                    })
                    .catch(error => {
                        console.error('Error updating gallery item:', error);
                        showAdminMessage('Error updating gallery photo. Please try again.', 'error');
                    });
            }
        });
    }

    // Image preview for edit gallery form
    const editGalleryImage = document.querySelector('#edit-gallery-image');
    if (editGalleryImage) {
        editGalleryImage.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.querySelector('#edit-gallery-image-preview').src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // ORDERS MANAGEMENT - ORDER FUNCTIONALITY
    let allOrders = [];
    let filteredOrders = [];

    function loadOrdersData() {
        console.log('Loading orders data from Firestore');
        
        const loadingOverlay = document.getElementById('orders-loading');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }

        // Get all orders from Firestore
        db.collection('orders').orderBy('timestamp', 'desc').get()
            .then((snapshot) => {
                allOrders = [];
                
                if (snapshot.empty) {
                    console.log('No orders found');
                    displayOrders([]);
                    updateOrdersStats([]);
                    return;
                }

                snapshot.forEach(doc => {
                    allOrders.push({ id: doc.id, ...doc.data() });
                });

                console.log(`Loaded ${allOrders.length} orders`);
                filteredOrders = [...allOrders];
                displayOrders(filteredOrders);
                updateOrdersStats(allOrders);
            })
            .catch(error => {
                console.error('Error loading orders:', error);
                showAdminMessage('Error loading orders. Please try again.', 'error');
            })
            .finally(() => {
                if (loadingOverlay) {
                    loadingOverlay.style.display = 'none';
                }
            });
    }

    function updateOrdersStats(orders) {
        const totalRevenue = orders
            .filter(order => order.status === 'completed')
            .reduce((sum, order) => sum + (order.amount || 0), 0);
        
        const totalOrders = orders.length;
        const pendingOrders = orders.filter(order => order.status === 'pending').length;
        const completedOrders = orders.filter(order => order.status === 'completed').length;

        const totalRevenueEl = document.getElementById('total-revenue');
        const totalOrdersEl = document.getElementById('total-orders');
        const pendingOrdersEl = document.getElementById('pending-orders');
        const completedOrdersEl = document.getElementById('completed-orders');

        if (totalRevenueEl) totalRevenueEl.textContent = `R${totalRevenue.toFixed(2)}`;
        if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
        if (pendingOrdersEl) pendingOrdersEl.textContent = pendingOrders;
        if (completedOrdersEl) completedOrdersEl.textContent = completedOrders;
    }

    function displayOrders(orders) {
        const tableBody = document.getElementById('orders-table-body');
        
        if (!orders.length) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 3rem; color: #666;">
                        <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                        No orders found
                    </td>
                </tr>
            `;
            return;
        }

        let tableHTML = '';
        orders.forEach(order => {
            const date = new Date(order.timestamp).toLocaleDateString();
            const time = new Date(order.timestamp).toLocaleTimeString();
            
            // Format items summary
            let itemsSummary = 'N/A';
            if (order.items && order.items.length > 0) {
                if (order.items.length === 1) {
                    itemsSummary = order.items[0].name;
                } else {
                    itemsSummary = `${order.items[0].name} +${order.items.length - 1} more`;
                }
            }

            // Format delivery info
            const deliveryInfo = order.deliveryAddress ? 
                `${order.deliveryAddress.city}, ${order.deliveryAddress.province}` : 
                'No delivery';
            
            const shippingCost = order.shippingCost || order.shippingDetails?.shippingCost || 0;

            tableHTML += `
                <tr>
                    <td><span class="order-id">${order.orderId || 'N/A'}</span></td>
                    <td>
                        <div>${date}</div>
                        <small style="color: #666;">${time}</small>
                    </td>
                    <td><span class="order-status status-${order.status || 'pending'}">${(order.status || 'pending').toUpperCase()}</span></td>
                    <td>
                        <div>${order.customerName || 'Guest'}</div>
                        <small style="color: #666;">${order.customerEmail || 'N/A'}</small>
                    </td>
                    <td>
                        <div class="order-items">${itemsSummary}</div>
                        <small style="color: #666;">${order.items ? order.items.length : 0} item(s)</small>
                    </td>
                    <td>
                        <div class="delivery-location">
                            <strong>${deliveryInfo}</strong>
                        </div>
                        <small style="color: #666;">Shipping: R${shippingCost.toFixed(2)}</small>
                    </td>
                    <td><span class="order-amount">R${(order.amount || 0).toFixed(2)}</span></td>
                    <td>
                        <span class="order-id">${order.paymentId || 'N/A'}</span>
                    </td>
                    <td>
                        <div class="order-actions">
                            <button class="action-btn view-btn" onclick="viewOrderDetails('${order.id}')">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="action-btn update-btn" onclick="updateOrderStatus('${order.id}')">
                                <i class="fas fa-edit"></i> Update
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tableBody.innerHTML = tableHTML;
    }

    // Global functions for order management
    window.viewOrderDetails = function(orderId) {
        const order = allOrders.find(o => o.id === orderId);
        if (!order) {
            showAdminMessage('Order not found.', 'error');
            return;
        }

        console.log('Viewing order details:', orderId);
        
        const modal = document.getElementById('order-detail-modal');
        const modalTitle = document.getElementById('order-detail-title');
        const modalBody = document.getElementById('order-detail-body');
        
        modalTitle.textContent = `Order #${order.orderId || orderId}`;
        
        // Enhanced order details with delivery information
        let orderDetailsHTML = `
            <div class="detail-section">
                <h4><i class="fas fa-info-circle"></i> Order Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Order ID</span>
                        <span class="detail-value order-id">${order.orderId || orderId}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Date & Time</span>
                        <span class="detail-value">${new Date(order.timestamp).toLocaleString()}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Status</span>
                        <span class="detail-value">
                            <span class="order-status status-${order.status || 'pending'}">
                                ${(order.status || 'pending').toUpperCase()}
                            </span>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Payment Method</span>
                        <span class="detail-value">${order.paymentMethod || 'PayFast'}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-user"></i> Customer Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Name</span>
                        <span class="detail-value">${order.customerName || 'Guest Customer'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Email</span>
                        <span class="detail-value">${order.customerEmail || 'Not provided'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Customer Type</span>
                        <span class="detail-value">${order.customerType || 'guest'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Payment ID</span>
                        <span class="detail-value order-id">${order.paymentId || 'N/A'}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-truck"></i> Delivery Information</h4>
                ${order.deliveryAddress ? `
                    <div class="delivery-address-card">
                        <div class="address-details">
                            <p><strong>Address:</strong> ${order.deliveryAddress.fullAddress || 'Address not available'}</p>
                            <div class="delivery-stats">
                                <div class="stat-item">
                                    <span class="stat-label">Zone:</span>
                                    <span class="stat-value">${order.deliveryAddress.deliveryZone || 'Unknown'}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Estimated Time:</span>
                                    <span class="stat-value">${order.deliveryAddress.estimatedDeliveryTime || 'N/A'}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Total Weight:</span>
                                    <span class="stat-value">${order.totalWeight || 0}kg</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ` : `
                    <div class="no-delivery-info">
                        <p><i class="fas fa-info-circle"></i> No delivery information provided for this order.</p>
                    </div>
                `}
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-shopping-bag"></i> Order Items</h4>
        `;

        if (order.items && order.items.length > 0) {
            orderDetailsHTML += '<div class="order-items-list">';
            order.items.forEach(item => {
                const itemTotal = (item.price * item.quantity).toFixed(2);
                orderDetailsHTML += `
                    <div class="order-item-card">
                        <div class="item-details">
                            <div class="item-name"><strong>${item.name}</strong></div>
                            <div class="item-meta">
                                <span>Qty: ${item.quantity}</span>
                                <span>Unit Price: R${item.price.toFixed(2)}</span>
                                ${item.variantId ? `<span>ID: ${item.variantId}</span>` : ''}
                            </div>
                        </div>
                        <div class="item-total">R${itemTotal}</div>
                    </div>
                `;
            });
            orderDetailsHTML += '</div>';
        } else {
            orderDetailsHTML += '<p style="color: #666; font-style: italic;">No items recorded for this order.</p>';
        }

        orderDetailsHTML += `
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-calculator"></i> Financial Breakdown</h4>
                <div class="financial-breakdown">
                    <div class="breakdown-row">
                        <span class="breakdown-label">Subtotal:</span>
                        <span class="breakdown-value">R${(order.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div class="breakdown-row shipping-row">
                        <span class="breakdown-label">Shipping Cost:</span>
                        <span class="breakdown-value">R${(order.shippingCost || order.shippingDetails?.shippingCost || 0).toFixed(2)}</span>
                    </div>
                    <div class="breakdown-row total-row">
                        <span class="breakdown-label">Total Paid:</span>
                        <span class="breakdown-value">R${(order.amount || 0).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-edit"></i> Update Order Status</h4>
                <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 10px;">
                    <select id="update-status-select" style="width: 100%; margin-bottom: 1rem; padding: 0.8rem; border: 2px solid var(--border-color); border-radius: 5px;">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                        <option value="failed" ${order.status === 'failed' ? 'selected' : ''}>Failed</option>
                        <option value="refunded" ${order.status === 'refunded' ? 'selected' : ''}>Refunded</option>
                    </select>
                    <button onclick="saveOrderStatus('${order.id}')" style="width: 100%; padding: 0.8rem; background: var(--primary-color); color: white; border: none; border-radius: 5px; cursor: pointer;">
                        <i class="fas fa-save"></i> Update Status
                    </button>
                </div>
            </div>
        `;

        modalBody.innerHTML = orderDetailsHTML;
        modal.style.display = 'flex';
    };

    window.updateOrderStatus = function(orderId) {
        // This function can be used for quick status updates
        viewOrderDetails(orderId);
    };

    window.saveOrderStatus = function(orderId) {
        const newStatus = document.getElementById('update-status-select').value;
        const order = allOrders.find(o => o.id === orderId);
        
        if (!order) {
            showAdminMessage('Order not found.', 'error');
            return;
        }

        // Update status in Firestore
        db.collection('orders').doc(orderId).update({
            status: newStatus,
            lastUpdated: new Date().toISOString(),
            updatedBy: currentUser.id
        })
        .then(() => {
            // Update local array
            order.status = newStatus;
            
            // Log admin action
            logAdminAction('update_order_status', { orderId: orderId, newStatus: newStatus });
            
            showAdminMessage(`Order status updated to ${newStatus.toUpperCase()}!`, 'success');
            
            // Refresh the display
            displayOrders(filteredOrders);
            updateOrdersStats(allOrders);
            
            // Close the modal
            document.getElementById('order-detail-modal').style.display = 'none';
        })
        .catch(error => {
            console.error('Error updating order status:', error);
            showAdminMessage('Error updating order status. Please try again.', 'error');
        });
    };

    // Close modal function
    window.closeOrderDetailModal = function() {
        document.getElementById('order-detail-modal').style.display = 'none';
    };

    // Load initial data when DOM is ready
    loadProducts();
    loadCourses();

    console.log('Admin Firebase script with Gallery Management loaded successfully!');
});