/**
 * StockPilot - Inventory Management Controller
 * Handles full CRUD, stock adjustments, pagination, filtering, and RBAC actions.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const session = await StockPilot.initPage({ requiresAuth: true, requiredPermission: 'inventory.view' });
  if (!session) return;

  StockPilot.bindModalCloseEvents();

  let currentPage = 1;
  const itemsPerPage = 10;
  let currentSearch = '';
  let currentCategory = '';
  let currentStockStatus = '';
  let currentSortBy = 'product_id';
  let currentSortOrder = 'ASC';

  const inventoryTableBody = document.getElementById('inventoryTableBody');
  const paginationControls = document.getElementById('paginationControls');
  const searchInput = document.getElementById('inventorySearchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const stockFilter = document.getElementById('stockStatusFilter');
  const sortSelect = document.getElementById('inventorySortSelect');

  // Modals & Forms
  const addProductModal = 'addProductModal';
  const editProductModal = 'editProductModal';
  const adjustStockModal = 'adjustStockModal';
  const thresholdModal = 'thresholdModal';

  const addProductForm = document.getElementById('addProductForm');
  const editProductForm = document.getElementById('editProductForm');
  const adjustStockForm = document.getElementById('adjustStockForm');
  const thresholdForm = document.getElementById('thresholdForm');

  // Load Initial Inventory Data
  loadInventory();

  // Search input with debounce
  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentSearch = e.target.value.trim();
        currentPage = 1;
        loadInventory();
      }, 300);
    });
  }

  // Filter change handlers
  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      currentCategory = e.target.value;
      currentPage = 1;
      loadInventory();
    });
  }

  if (stockFilter) {
    stockFilter.addEventListener('change', (e) => {
      currentStockStatus = e.target.value;
      currentPage = 1;
      loadInventory();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      const parts = e.target.value.split(':');
      currentSortBy = parts[0];
      currentSortOrder = parts[1] || 'ASC';
      loadInventory();
    });
  }

  // Open Add Product Modal
  const openAddBtn = document.getElementById('openAddProductBtn');
  if (openAddBtn) {
    openAddBtn.addEventListener('click', () => {
      if (!StockPilot.hasPermission('inventory.create')) {
        StockPilot.showToast('Permission Denied', 'You do not have permission to add new products.', 'error');
        return;
      }
      if (addProductForm) addProductForm.reset();
      StockPilot.openModal(addProductModal);
    });
  }

  // Open Threshold Config Modal
  const openThresholdBtn = document.getElementById('openThresholdBtn');
  if (openThresholdBtn) {
    openThresholdBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/inventory/settings/threshold');
        if (res.ok) {
          const data = await res.json();
          document.getElementById('thresholdValueInput').value = data.lowStockThreshold;
          StockPilot.openModal(thresholdModal);
        }
      } catch (err) {
        StockPilot.showToast('Error', 'Unable to fetch current threshold.', 'error');
      }
    });
  }

  // Handle Add Product Submit
  if (addProductForm) {
    addProductForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const productId = parseInt(document.getElementById('addProductId').value, 10);
      const name = document.getElementById('addProductName').value.trim();
      const category = document.getElementById('addProductCategory').value.trim();
      const quantity = parseInt(document.getElementById('addProductQuantity').value, 10);
      const price = parseFloat(document.getElementById('addProductPrice').value);
      const description = document.getElementById('addProductDescription').value.trim();

      if (!productId || isNaN(productId) || productId <= 0) {
        StockPilot.showToast('Validation Error', 'Product ID must be a positive integer.', 'warning');
        return;
      }

      if (!name) {
        StockPilot.showToast('Validation Error', 'Product Name cannot be empty.', 'warning');
        return;
      }

      if (isNaN(quantity) || quantity < 0) {
        StockPilot.showToast('Validation Error', 'Quantity cannot be negative.', 'warning');
        return;
      }

      if (isNaN(price) || price < 0) {
        StockPilot.showToast('Validation Error', 'Price cannot be negative.', 'warning');
        return;
      }

      try {
        const response = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, name, category, quantity, price, description })
        });

        const resData = await response.json();
        if (!response.ok) {
          StockPilot.showToast('Failed to Add Product', resData.error || 'Server rejected product creation.', 'error');
          return;
        }

        StockPilot.closeModal(addProductModal);
        StockPilot.showToast('Product Created', `Product #${productId} added to inventory successfully!`, 'success');
        addProductForm.reset();
        loadInventory();
      } catch (err) {
        StockPilot.showToast('Network Error', err.message, 'error');
      }
    });
  }

  // Handle Edit Product Submit
  if (editProductForm) {
    editProductForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const productId = parseInt(document.getElementById('editProductId').value, 10);
      const name = document.getElementById('editProductName').value.trim();
      const category = document.getElementById('editProductCategory').value.trim();
      const quantity = parseInt(document.getElementById('editProductQuantity').value, 10);
      const price = parseFloat(document.getElementById('editProductPrice').value);
      const description = document.getElementById('editProductDescription').value.trim();

      try {
        const response = await fetch(`/api/inventory/${productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, category, quantity, price, description })
        });

        const resData = await response.json();
        if (!response.ok) {
          StockPilot.showToast('Update Failed', resData.error || 'Failed to update product.', 'error');
          return;
        }

        StockPilot.closeModal(editProductModal);
        StockPilot.showToast('Product Updated', `Product #${productId} updated successfully.`, 'success');
        loadInventory();
      } catch (err) {
        StockPilot.showToast('Network Error', err.message, 'error');
      }
    });
  }

  // Handle Adjust Stock Submit
  if (adjustStockForm) {
    adjustStockForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const productId = parseInt(document.getElementById('adjustProductId').value, 10);
      const adjustmentType = document.getElementById('adjustTypeSelect').value;
      const amount = parseInt(document.getElementById('adjustAmountInput').value, 10);
      const reason = document.getElementById('adjustReasonInput').value.trim();

      try {
        const response = await fetch(`/api/inventory/${productId}/stock`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adjustmentType, amount, reason })
        });

        const resData = await response.json();
        if (!response.ok) {
          StockPilot.showToast('Adjustment Failed', resData.error || 'Failed to adjust stock.', 'error');
          return;
        }

        StockPilot.closeModal(adjustStockModal);
        StockPilot.showToast('Stock Adjusted', `Stock quantity updated to ${resData.product.quantity} units.`, 'success');
        loadInventory();
      } catch (err) {
        StockPilot.showToast('Network Error', err.message, 'error');
      }
    });
  }

  // Handle Threshold Setting Submit
  if (thresholdForm) {
    thresholdForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const threshold = parseInt(document.getElementById('thresholdValueInput').value, 10);
      if (isNaN(threshold) || threshold < 1) {
        StockPilot.showToast('Validation Error', 'Threshold must be a positive number.', 'warning');
        return;
      }

      try {
        const response = await fetch('/api/inventory/settings/threshold', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ threshold })
        });

        const resData = await response.json();
        if (!response.ok) {
          StockPilot.showToast('Error', resData.error || 'Failed to update threshold.', 'error');
          return;
        }

        StockPilot.closeModal(thresholdModal);
        StockPilot.showToast('Settings Updated', `Low stock warning threshold set to ${threshold} units.`, 'success');
        loadInventory();
      } catch (err) {
        StockPilot.showToast('Network Error', err.message, 'error');
      }
    });
  }

  /**
   * Fetch and render products table
   */
  async function loadInventory() {
    try {
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        search: currentSearch,
        category: currentCategory,
        stockStatus: currentStockStatus,
        sortBy: currentSortBy,
        sortOrder: currentSortOrder
      });

      const response = await fetch(`/api/inventory?${queryParams.toString()}`);
      if (!response.ok) {
        if (response.status === 403) {
          StockPilot.showToast('Access Denied', 'You do not have permission to view inventory records.', 'error');
          return;
        }
        throw new Error('Failed to load inventory data');
      }

      const data = await response.json();
      renderTable(data.items, data.lowStockThreshold);
      renderPagination(data.pagination);
      updateCategoryFilterOptions(data.categories);
      StockPilot.enforceUIPermissions();
    } catch (err) {
      console.error('Inventory load error:', err);
      if (inventoryTableBody) {
        inventoryTableBody.innerHTML = `<tr><td colspan="8" class="empty-state">Failed to load inventory records.</td></tr>`;
      }
    }
  }

  function renderTable(products, threshold) {
    if (!inventoryTableBody) return;

    if (!products || products.length === 0) {
      inventoryTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
            <h3>No products found</h3>
            <p>Try modifying your search or filter options.</p>
          </td>
        </tr>
      `;
      return;
    }

    const canUpdate = StockPilot.hasPermission('inventory.update');
    const canAdjust = StockPilot.hasPermission('inventory.adjust_stock');
    const canDelete = StockPilot.hasPermission('inventory.delete');

    inventoryTableBody.innerHTML = products.map(p => `
      <tr data-product-id="${p.productId}">
        <td><strong style="font-family:var(--font-mono); color:var(--primary-700);">#${p.productId}</strong></td>
        <td>
          <div style="font-weight:600; color:var(--gray-900);">${escapeHtml(p.name)}</div>
          ${p.description ? `<div style="font-size:0.75rem; color:var(--gray-500); max-width:260px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(p.description)}</div>` : ''}
        </td>
        <td><span class="badge badge-gray">${escapeHtml(p.category)}</span></td>
        <td>
          <span style="font-weight:700; ${p.quantity === 0 ? 'color:var(--danger-600);' : (p.quantity <= threshold ? 'color:var(--warning-700);' : '')}">
            ${p.quantity} units
          </span>
        </td>
        <td>$${Number(p.price).toFixed(2)}</td>
        <td><strong>$${Number(p.totalValue).toFixed(2)}</strong></td>
        <td>
          <span class="badge ${p.stockBadgeClass}">
            <span class="badge-dot"></span> ${p.stockStatus}
          </span>
        </td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-secondary btn-sm js-edit-product-btn" 
              data-id="${p.productId}" 
              ${!canUpdate ? 'disabled title="Requires inventory.update permission"' : ''}>
              Edit
            </button>
            <button class="btn btn-secondary btn-sm js-adjust-stock-btn" 
              data-id="${p.productId}" 
              data-qty="${p.quantity}" 
              data-name="${escapeHtml(p.name)}" 
              ${!canAdjust ? 'disabled title="Requires inventory.adjust_stock permission"' : ''}>
              Stock
            </button>
            <button class="btn btn-outline-danger btn-sm js-delete-product-btn" 
              data-id="${p.productId}" 
              data-name="${escapeHtml(p.name)}" 
              ${!canDelete ? 'disabled title="Requires inventory.delete permission"' : ''}>
              Delete
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    bindTableActionEvents();
  }

  function bindTableActionEvents() {
    // Edit Product Click
    document.querySelectorAll('.js-edit-product-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        try {
          const res = await fetch(`/api/inventory/${id}`);
          if (!res.ok) throw new Error('Product not found');
          const p = await res.json();

          document.getElementById('editProductId').value = p.productId;
          document.getElementById('editProductIdDisplay').textContent = '#' + p.productId;
          document.getElementById('editProductName').value = p.name;
          document.getElementById('editProductCategory').value = p.category;
          document.getElementById('editProductQuantity').value = p.quantity;
          document.getElementById('editProductPrice').value = p.price;
          document.getElementById('editProductDescription').value = p.description || '';

          StockPilot.openModal(editProductModal);
        } catch (err) {
          StockPilot.showToast('Error', err.message, 'error');
        }
      });
    });

    // Adjust Stock Click
    document.querySelectorAll('.js-adjust-stock-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        const qty = btn.getAttribute('data-qty');

        document.getElementById('adjustProductId').value = id;
        document.getElementById('adjustProductNameDisplay').textContent = `#${id} - ${name}`;
        document.getElementById('adjustCurrentStockDisplay').textContent = `${qty} units`;
        document.getElementById('adjustAmountInput').value = '5';
        document.getElementById('adjustReasonInput').value = '';

        StockPilot.openModal(adjustStockModal);
      });
    });

    // Delete Product Click
    document.querySelectorAll('.js-delete-product-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');

        StockPilot.showConfirm({
          title: 'Delete Inventory Product',
          message: `Are you sure you want to permanently delete Product #${id} ("${name}")? This action will be logged in the audit history.`,
          confirmText: 'Delete Product',
          confirmClass: 'btn-danger',
          onConfirm: async () => {
            try {
              const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
              const resData = await res.json();
              if (!res.ok) {
                StockPilot.showToast('Delete Denied', resData.error || 'Server rejected product deletion.', 'error');
                return;
              }
              StockPilot.showToast('Product Deleted', `Product #${id} removed from inventory.`, 'success');
              loadInventory();
            } catch (err) {
              StockPilot.showToast('Network Error', err.message, 'error');
            }
          }
        });
      });
    });
  }

  function renderPagination(pagination) {
    if (!paginationControls) return;
    const { page, totalPages, totalRecords } = pagination;

    if (totalRecords === 0) {
      paginationControls.innerHTML = '';
      return;
    }

    paginationControls.innerHTML = `
      <div style="font-size:0.85rem; color:var(--gray-500);">
        Showing <strong>${(page - 1) * itemsPerPage + 1}</strong> to <strong>${Math.min(page * itemsPerPage, totalRecords)}</strong> of <strong>${totalRecords}</strong> products
      </div>
      <div style="display:flex; gap:6px;">
        <button class="btn btn-secondary btn-sm" id="prevPageBtn" ${page <= 1 ? 'disabled' : ''}>Previous</button>
        <span style="display:inline-flex; align-items:center; padding:0 10px; font-size:0.85rem; font-weight:600; color:var(--gray-700);">Page ${page} of ${totalPages}</span>
        <button class="btn btn-secondary btn-sm" id="nextPageBtn" ${page >= totalPages ? 'disabled' : ''}>Next</button>
      </div>
    `;

    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          loadInventory();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
          currentPage++;
          loadInventory();
        }
      });
    }
  }

  function updateCategoryFilterOptions(categories) {
    if (!categoryFilter || !categories) return;
    const selectedVal = categoryFilter.value;
    categoryFilter.innerHTML = '<option value="">All Categories</option>' + 
      categories.map(cat => `<option value="${escapeHtml(cat)}" ${cat === selectedVal ? 'selected' : ''}>${escapeHtml(cat)}</option>`).join('');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
});
