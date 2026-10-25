/**
 * StockPilot - Dashboard Controller
 * Loads real-time inventory statistics and audit activity.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const session = await StockPilot.initPage({ requiresAuth: true, requiredPermission: 'inventory.view' });
  if (!session) return;

  StockPilot.bindModalCloseEvents();
  loadDashboardData();

  async function loadDashboardData() {
    try {
      const response = await fetch('/api/inventory/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard metrics');
      }

      const stats = await response.json();
      renderStats(stats);
      renderRecentlyAdded(stats.recentlyAdded || []);
      renderRecentlyUpdated(stats.recentlyUpdated || []);
      renderRecentActivity(stats.recentActivity || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
      StockPilot.showToast('Error', 'Unable to load dashboard inventory statistics.', 'error');
    }
  }

  function renderStats(stats) {
    const totalProductsEl = document.getElementById('statTotalProducts');
    const totalUnitsEl = document.getElementById('statTotalUnits');
    const totalValueEl = document.getElementById('statTotalValue');
    const lowStockEl = document.getElementById('statLowStock');
    const outOfStockEl = document.getElementById('statOutOfStock');
    const inStockEl = document.getElementById('statInStock');

    if (totalProductsEl) totalProductsEl.textContent = Number(stats.totalProducts).toLocaleString();
    if (totalUnitsEl) totalUnitsEl.textContent = Number(stats.totalUnits).toLocaleString();
    if (totalValueEl) totalValueEl.textContent = '$' + Number(stats.totalValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (lowStockEl) lowStockEl.textContent = Number(stats.lowStockCount).toLocaleString();
    if (outOfStockEl) outOfStockEl.textContent = Number(stats.outOfStockCount).toLocaleString();
    if (inStockEl) inStockEl.textContent = Number(stats.inStockCount).toLocaleString();

    const thresholdNoticeEl = document.getElementById('lowStockThresholdNotice');
    if (thresholdNoticeEl) {
      thresholdNoticeEl.textContent = `(Threshold: ≤ ${stats.lowStockThreshold} units)`;
    }
  }

  function renderRecentlyAdded(products) {
    const tbody = document.getElementById('recentlyAddedTableBody');
    if (!tbody) return;

    if (products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No products added recently.</td></tr>`;
      return;
    }

    tbody.innerHTML = products.map(p => `
      <tr>
        <td><strong>#${p.productId}</strong></td>
        <td>${escapeHtml(p.name)}</td>
        <td><span class="badge badge-gray">${escapeHtml(p.category)}</span></td>
        <td><strong>${p.quantity}</strong> units</td>
        <td>$${Number(p.price).toFixed(2)}</td>
      </tr>
    `).join('');
  }

  function renderRecentlyUpdated(products) {
    const tbody = document.getElementById('recentlyUpdatedTableBody');
    if (!tbody) return;

    if (products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No recent modifications recorded.</td></tr>`;
      return;
    }

    tbody.innerHTML = products.map(p => `
      <tr>
        <td><strong>#${p.productId}</strong></td>
        <td>${escapeHtml(p.name)}</td>
        <td><span class="badge badge-gray">${escapeHtml(p.category)}</span></td>
        <td><strong>${p.quantity}</strong> units</td>
        <td>${formatDate(p.updatedAt)}</td>
      </tr>
    `).join('');
  }

  function renderRecentActivity(activities) {
    const container = document.getElementById('recentActivityList');
    if (!container) return;

    if (activities.length === 0) {
      container.innerHTML = `<div class="empty-state">No recent activities logged.</div>`;
      return;
    }

    container.innerHTML = activities.map(act => {
      let outcomeBadge = 'badge-success';
      if (act.outcome === 'DENIED') outcomeBadge = 'badge-warning';
      if (act.outcome === 'FAILURE') outcomeBadge = 'badge-danger';

      return `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 0; border-bottom:1px solid var(--gray-100);">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:34px; height:34px; border-radius:50%; background:var(--gray-100); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.8rem; color:var(--primary-700);">
              ${(act.username || 'S').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="font-weight:600; font-size:0.88rem; color:var(--gray-900);">
                <strong>${escapeHtml(act.username || 'System')}</strong>: ${formatActionName(act.action)}
                ${act.target_id ? `<span style="font-family:var(--font-mono); font-size:0.8rem; color:var(--primary-600);">(#${act.target_id})</span>` : ''}
              </div>
              <div style="font-size:0.75rem; color:var(--gray-500);">${formatDate(act.timestamp)}</div>
            </div>
          </div>
          <span class="badge ${outcomeBadge}">${act.outcome}</span>
        </div>
      `;
    }).join('');
  }

  function formatActionName(action) {
    return action.replace(/_/g, ' ');
  }

  function formatDate(isoStr) {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
});
