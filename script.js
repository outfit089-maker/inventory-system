// API Configuration
const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbyD0OQ80NhjINTiptMYrw-8AYMZqLjYHO85HjmIHtWan7Qs-gthx_5PKu6zYhiqTqQgPg/exec';

// Global State
let currentData = {
    dashboard: null,
    inventory: null,
    orders: null,
    shipping: null,
    customers: null
};

// DOM Elements
const elements = {
    // KPI Elements
    totalSales: document.getElementById('total-sales'),
    totalOrders: document.getElementById('total-orders'),
    pendingOrders: document.getElementById('pending-orders'),
    lowStockItems: document.getElementById('low-stock-items'),
    
    // Table Bodies
    dashboardOrdersTbody: document.getElementById('dashboard-orders-tbody'),
    ordersTbody: document.getElementById('orders-tbody'),
    shippingTbody: document.getElementById('shipping-tbody'),
    customersTbody: document.getElementById('customers-tbody'),
    
    // Content Areas
    inventoryContent: document.getElementById('inventory-content'),
    
    // Filters
    categoryFilter: document.getElementById('category-filter'),
    stockFilter: document.getElementById('stock-filter'),
    orderStatusFilter: document.getElementById('order-status-filter'),
    shippingStatusFilter: document.getElementById('shipping-status-filter'),
    courierFilter: document.getElementById('courier-filter'),
    
    // Modals
    addProductModal: document.getElementById('add-product-modal'),
    addProductForm: document.getElementById('add-product-form')
};

// API Functions
async function callAPI(endpoint, action = 'read', params = {}) {
    try {
        const urlParams = new URLSearchParams({
            endpoint,
            action,
            ...params
        });
        
        const response = await fetch(`${API_BASE_URL}?${urlParams}`, {
            method: 'GET',
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Unknown API error');
        }
        
        return data.data;
    } catch (error) {
        console.error(`API Error (${endpoint}/${action}):`, error);
        showError(`Failed to load ${endpoint}: ${error.message}`);
        return null;
    }
}

// Data Loading Functions
async function loadDashboardData() {
    const data = await callAPI('dashboard');
    if (data) {
        currentData.dashboard = data;
        updateDashboardUI(data);
    }
}

async function loadInventoryData() {
    const data = await callAPI('inventory');
    if (data) {
        currentData.inventory = data;
        updateInventoryUI(data);
    }
}

async function loadOrdersData() {
    const data = await callAPI('orders');
    if (data) {
        currentData.orders = data;
        updateOrdersUI(data);
    }
}

async function loadShippingData() {
    const data = await callAPI('shipping');
    if (data) {
        currentData.shipping = data;
        updateShippingUI(data);
    }
}

async function loadCustomersData() {
    const data = await callAPI('customers');
    if (data) {
        currentData.customers = data;
        updateCustomersUI(data);
    }
}

// UI Update Functions
function updateDashboardUI(data) {
    // Update KPI Cards
    if (elements.totalSales) {
        elements.totalSales.textContent = `$${data.kpis.totalSales.toLocaleString()}`;
    }
    if (elements.totalOrders) {
        elements.totalOrders.textContent = data.kpis.totalOrders.toLocaleString();
    }
    if (elements.pendingOrders) {
        elements.pendingOrders.textContent = data.kpis.pendingOrders.toLocaleString();
    }
    if (elements.lowStockItems) {
        elements.lowStockItems.textContent = data.kpis.lowStockItems.toLocaleString();
    }
    
    // Update Recent Orders Table
    if (elements.dashboardOrdersTbody && data.recentOrders) {
        elements.dashboardOrdersTbody.innerHTML = '';
        
        data.recentOrders.forEach(order => {
            const statusClass = getStatusClass(order.Status);
            const row = document.createElement('tr');
            row.setAttribute('data-order-id', order['Order ID']);
            row.innerHTML = `
                <td><strong>${order['Order ID']}</strong></td>
                <td>${order['Customer Name']}</td>
                <td>${formatDate(order['Order Date'])}</td>
                <td><strong>$${parseFloat(order['Total After Discount'] || order.Subtotal || 0).toFixed(2)}</strong></td>
                <td><span class="status-badge ${statusClass}">${order.Status}</span></td>
                <td><button class="btn btn-secondary btn-small">View</button></td>
            `;
            elements.dashboardOrdersTbody.appendChild(row);
        });
        
        // Add event listeners for view buttons
        addOrderViewListeners();
    }
}

function updateInventoryUI(data) {
    if (!elements.inventoryContent) return;
    
    // Update category filter
    updateCategoryFilter(data);
    
    // Get current filters
    const categoryFilter = elements.categoryFilter?.value || '';
    const stockFilter = elements.stockFilter?.value || '';
    
    // Filter data
    let filteredData = data;
    if (categoryFilter) {
        filteredData = filteredData.filter(item => item.Category === categoryFilter);
    }
    if (stockFilter) {
        filteredData = filteredData.filter(item => {
            const stock = item['Quantity in Stock'];
            if (stockFilter === 'in-stock') return stock > 10;
            if (stockFilter === 'low-stock') return stock > 0 && stock <= 10;
            if (stockFilter === 'out-of-stock') return stock === 0;
            return true;
        });
    }
    
    // Check current view
    const isGridView = document.querySelector('.view-btn[data-view="grid"]')?.classList.contains('active');
    
    if (isGridView) {
        renderInventoryGrid(filteredData);
    } else {
        renderInventoryTable(filteredData);
    }
}

function renderInventoryGrid(products) {
    if (!elements.inventoryContent) return;
    
    if (products.length === 0) {
        elements.inventoryContent.innerHTML = '<div class="loading">No products found</div>';
        return;
    }
    
    let html = '<div class="product-grid">';
    
    products.forEach(product => {
        const stockStatus = getStockStatus(product['Quantity in Stock']);
        const statusClass = `status-${stockStatus}`;
        
        html += `
            <div class="product-card" data-product-id="${product['Product ID']}">
                <div class="product-image">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="#6B7280">
                        <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2H0c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2h-4zM4 5h16v11H4V5zm8 14c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                    </svg>
                </div>
                <div class="product-info">
                    <div class="product-name">${product['Product Name']}</div>
                    <div class="product-category">${product.Category} • ${product.Subcategory}</div>
                </div>
                <div class="product-meta">
                    <div class="product-price">$${parseFloat(product['Unit Price']).toFixed(2)}</div>
                    <div class="product-stock ${statusClass}">
                        ${product['Quantity in Stock']} in stock
                    </div>
                </div>
                <div class="product-actions">
                    <button class="btn btn-secondary btn-small" onclick="editProduct('${product['Product ID']}')">Edit</button>
                    <button class="btn btn-primary btn-small" onclick="updateStock('${product['Product ID']}', ${product['Quantity in Stock']})">Add Stock</button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    elements.inventoryContent.innerHTML = html;
}

function renderInventoryTable(products) {
    if (!elements.inventoryContent) return;
    
    if (products.length === 0) {
        elements.inventoryContent.innerHTML = '<div class="loading">No products found</div>';
        return;
    }
    
    let html = `
        <div class="table-card">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Product ID</th>
                        <th>Product Name</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Total Value</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    products.forEach(product => {
        const stockStatus = getStockStatus(product['Quantity in Stock']);
        const statusClass = `status-${stockStatus}`;
        
        html += `
            <tr data-product-id="${product['Product ID']}">
                <td><strong>${product['Product ID']}</strong></td>
                <td>${product['Product Name']}</td>
                <td>${product.Category}</td>
                <td>$${parseFloat(product['Unit Price']).toFixed(2)}</td>
                <td><span class="status-badge ${statusClass}">${product['Quantity in Stock']}</span></td>
                <td>$${parseFloat(product['Total Value']).toFixed(2)}</td>
                <td>
                    <button class="btn btn-secondary btn-small" onclick="editProduct('${product['Product ID']}')">Edit</button>
                    <button class="btn btn-primary btn-small" onclick="updateStock('${product['Product ID']}', ${product['Quantity in Stock']})">Stock</button>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    elements.inventoryContent.innerHTML = html;
}

function updateOrdersUI(data) {
    if (!elements.ordersTbody) return;
    
    // Get current filter
    const statusFilter = elements.orderStatusFilter?.value || '';
    
    // Filter data
    let filteredData = data;
    if (statusFilter) {
        filteredData = filteredData.filter(order => order.Status === statusFilter);
    }
    
    if (filteredData.length === 0) {
        elements.ordersTbody.innerHTML = '<tr><td colspan="6" class="loading">No orders found</td></tr>';
        return;
    }
    
    elements.ordersTbody.innerHTML = '';
    
    filteredData.forEach(order => {
        const statusClass = getStatusClass(order.Status);
        const row = document.createElement('tr');
        row.setAttribute('data-order-id', order['Order ID']);
        row.innerHTML = `
            <td><strong>${order['Order ID']}</strong></td>
            <td>${order['Customer Name']}</td>
            <td>${formatDate(order['Order Date'])}</td>
            <td><strong>$${parseFloat(order['Total After Discount'] || order.Subtotal || 0).toFixed(2)}</strong></td>
            <td><span class="status-badge ${statusClass}">${order.Status}</span></td>
            <td><button class="btn btn-secondary btn-small">View Details</button></td>
        `;
        elements.ordersTbody.appendChild(row);
    });
    
    // Add event listeners for view buttons
    addOrderViewListeners();
}

function updateShippingUI(data) {
    if (!elements.shippingTbody) return;
    
    // Get current filters
    const statusFilter = elements.shippingStatusFilter?.value || '';
    const courierFilter = elements.courierFilter?.value || '';
    
    // Filter data
    let filteredData = data;
    if (statusFilter) {
        filteredData = filteredData.filter(shipment => shipment['Shipping Status'] === statusFilter);
    }
    if (courierFilter) {
        filteredData = filteredData.filter(shipment => shipment.Courier === courierFilter);
    }
    
    if (filteredData.length === 0) {
        elements.shippingTbody.innerHTML = '<tr><td colspan="6" class="loading">No shipments found</td></tr>';
        return;
    }
    
    elements.shippingTbody.innerHTML = '';
    
    filteredData.forEach(shipment => {
        const statusClass = getStatusClass(shipment['Shipping Status']);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${shipment['Tracking Number'] || 'N/A'}</strong></td>
            <td>${shipment['Order ID']}</td>
            <td>${shipment['Customer Name']}</td>
            <td>${shipment.Courier || 'N/A'}</td>
            <td><span class="status-badge ${statusClass}">${shipment['Shipping Status']}</span></td>
            <td>${formatDate(shipment['Shipping Date'])}</td>
        `;
        elements.shippingTbody.appendChild(row);
    });
}

function updateCustomersUI(data) {
    if (!elements.customersTbody) return;
    
    if (data.length === 0) {
        elements.customersTbody.innerHTML = '<tr><td colspan="6" class="loading">No customers found</td></tr>';
        return;
    }
    
    elements.customersTbody.innerHTML = '';
    
    // Calculate customer stats (هذا مثال مبسط، يمكن تحسينه)
    data.forEach(customer => {
        const customerOrders = currentData.orders ? 
            currentData.orders.filter(order => order['Customer ID'] === customer['Customer ID']) : [];
        
        const totalOrders = customerOrders.length;
        const totalSpent = customerOrders.reduce((sum, order) => 
            sum + parseFloat(order['Total After Discount'] || order.Subtotal || 0), 0);
        
        const lastOrder = customerOrders.length > 0 ? 
            customerOrders.sort((a, b) => new Date(b['Order Date']) - new Date(a['Order Date']))[0] : null;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${customer['Customer Name']}</strong></td>
            <td>${customer.Phone}</td>
            <td>${customer.Address}</td>
            <td>${totalOrders}</td>
            <td><strong>$${totalSpent.toFixed(2)}</strong></td>
            <td>${lastOrder ? formatDate(lastOrder['Order Date']) : 'No orders'}</td>
        `;
        elements.customersTbody.appendChild(row);
    });
}

// Utility Functions
function getStatusClass(status) {
    if (!status) return 'status-pending';
    
    const statusMap = {
        'Delivered': 'status-delivered',
        'Shipping': 'status-shipping',
        'In Transit': 'status-shipping',
        'Pending': 'status-pending',
        'In Stock': 'status-in-stock',
        'Low Stock': 'status-low-stock',
        'Out of Stock': 'status-out-of-stock'
    };
    
    return statusMap[status] || 'status-pending';
}

function getStockStatus(quantity) {
    if (quantity === 0) return 'out-of-stock';
    if (quantity <= 10) return 'low-stock';
    return 'in-stock';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

function updateCategoryFilter(inventoryData) {
    if (!elements.categoryFilter) return;
    
    const categories = [...new Set(inventoryData.map(item => item.Category))].filter(Boolean);
    
    // Clear existing options except the first one
    elements.categoryFilter.innerHTML = '<option value="">All Categories</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        elements.categoryFilter.appendChild(option);
    });
}

function showError(message) {
    // يمكن تحسين هذه الدالة لعرض الأخطاء في واجهة المستخدم
    console.error('Error:', message);
    alert(`Error: ${message}`);
}

function showSuccess(message) {
    // يمكن تحسين هذه الدالة لعرض رسائل النجاح في واجهة المستخدم
    console.log('Success:', message);
    alert(`Success: ${message}`);
}

// Modal Functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function openAddProductModal() {
    openModal('add-product-modal');
}

// Event Listeners
function addOrderViewListeners() {
    // Add event listeners for order view buttons
    document.querySelectorAll('#dashboard-orders-tbody .btn, #orders-tbody .btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const row = this.closest('tr');
            if (row) {
                const orderId = row.getAttribute('data-order-id');
                openOrderPanel(orderId);
            }
        });
    });
}

function addFilterListeners() {
    // Inventory filters
    if (elements.categoryFilter) {
        elements.categoryFilter.addEventListener('change', () => loadInventoryData());
    }
    if (elements.stockFilter) {
        elements.stockFilter.addEventListener('change', () => loadInventoryData());
    }
    
    // Orders filter
    if (elements.orderStatusFilter) {
        elements.orderStatusFilter.addEventListener('change', () => loadOrdersData());
    }
    
    // Shipping filters
    if (elements.shippingStatusFilter) {
        elements.shippingStatusFilter.addEventListener('change', () => loadShippingData());
    }
    if (elements.courierFilter) {
        elements.courierFilter.addEventListener('change', () => loadShippingData());
    }
    
    // View toggle
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            if (this.dataset.view === 'grid') {
                renderInventoryGrid(currentData.inventory || []);
            } else {
                renderInventoryTable(currentData.inventory || []);
            }
        });
    });
}

// Form Handlers
if (elements.addProductForm) {
    elements.addProductForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const productData = {
            productName: formData.get('productName'),
            category: formData.get('category'),
            subcategory: formData.get('subcategory'),
            unitPrice: formData.get('unitPrice'),
            quantity: formData.get('quantity'),
            sku: formData.get('sku')
        };
        
        try {
            const result = await callAPI('inventory', 'create', productData);
            if (result && result.success) {
                showSuccess('Product added successfully!');
                closeModal('add-product-modal');
                this.reset();
                loadInventoryData(); // Refresh inventory
            }
        } catch (error) {
            showError('Failed to add product: ' + error.message);
        }
    });
}

// Navigation Functions
function loadDashboardPage() {
    loadDashboardData();
}

function loadInventoryPage() {
    loadInventoryData();
}

function loadOrdersPage() {
    loadOrdersData();
}

function loadShippingPage() {
    loadShippingData();
}

function loadCustomersPage() {
    loadCustomersData();
}

// Order Panel Functions (من الكود الأصلي)
function openOrderPanel(orderId) {
    const order = currentData.orders ? 
        currentData.orders.find(o => o['Order ID'] === orderId) : null;
    
    if (!order) {
        showError('Order not found');
        return;
    }

    let statusClass = getStatusClass(order.Status);
    const panelContent = document.getElementById('panel-content');
    const orderPanel = document.getElementById('order-panel');

    panelContent.innerHTML = `
        <div class="detail-section">
            <div class="detail-label">Order ID</div>
            <div class="detail-value">${order['Order ID']}</div>
        </div>
        <div class="detail-section">
            <div class="detail-label">Status</div>
            <span class="status-badge ${statusClass}">${order.Status}</span>
        </div>
        <div class="detail-section">
            <div class="detail-label">Customer</div>
            <div class="detail-value">${order['Customer Name']}</div>
            <div style="font-size: 13px; color: #666; margin-top: 4px;">${order.Phone || 'No phone'}</div>
        </div>
        <div class="detail-section">
            <div class="detail-label">Order Date</div>
            <div class="detail-value">${formatDate(order['Order Date'])}</div>
        </div>
        <div class="detail-section">
            <div class="detail-label">Order Items</div>
            <div class="order-items">
                <div class="order-item">
                    <div class="item-info">
                        <div class="item-name">${order['Items (Product × Qty)'] || 'No items specified'}</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="detail-section">
            <div class="detail-label">Shipping Address</div>
            <div class="detail-value">${order.Address || 'No address'}</div>
        </div>
        <div class="detail-section">
            <div class="detail-label">Total</div>
            <div class="detail-value" style="font-size: 24px; font-weight: 700;">$${parseFloat(order['Total After Discount'] || order.Subtotal || 0).toFixed(2)}</div>
        </div>
    `;

    orderPanel.classList.add('open');
}

// Placeholder functions for future implementation
function editProduct(productId) {
    showError('Edit product functionality not implemented yet');
}

function updateStock(productId, currentStock) {
    const newStock = prompt(`Current stock: ${currentStock}. Enter new stock quantity:`, currentStock);
    if (newStock !== null && !isNaN(newStock)) {
        // Implement stock update via API
        showError('Stock update functionality not implemented yet');
    }
}

function openAddOrderModal() {
    showError('Add order functionality not implemented yet');
}

function openAddCustomerModal() {
    showError('Add customer functionality not implemented yet');
}

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    // Load initial data
    loadDashboardData();
    
    // Set up filter listeners
    addFilterListeners();
    
    // Set up navigation
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const pageName = item.dataset.page;
            
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            pages.forEach(page => page.classList.remove('active'));
            document.getElementById(`${pageName}-page`).classList.add('active');

            // Load data for the selected page
            switch(pageName) {
                case 'dashboard':
                    loadDashboardData();
                    break;
                case 'inventory':
                    loadInventoryData();
                    break;
                case 'orders':
                    loadOrdersData();
                    break;
                case 'shipping':
                    loadShippingData();
                    break;
                case 'customers':
                    loadCustomersData();
                    break;
            }

            // Close sidebar on mobile after navigation
            if (window.innerWidth < 1024) {
                closeSidebar();
            }
        });
    });
    
    // Sidebar toggle (من الكود الأصلي)
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    function toggleSidebar() {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('active');
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
    }

    menuToggle.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);
    
    // Close panel (من الكود الأصلي)
    const closePanel = document.getElementById('close-panel');
    if (closePanel) {
        closePanel.addEventListener('click', () => {
            document.getElementById('order-panel').classList.remove('open');
        });
    }
});
