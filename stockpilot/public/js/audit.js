/**
 * StockPilot - Security & Activity Audit Controller
 * View and filter immutable audit trails.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const session = await StockPilot.initPage({ requiresAuth: true, requiredPermission: 'audit.view' });
  if (!session) return;

  let currentPage = 1;
  const itemsPerPage = 15;
  let currentSearch = '';
  let currentAction = '';
  let currentOutcome = '';

  const tableBody = document.getElementById('auditTableBody');
  const paginationControls = document.getElementById('auditPaginationControls');
  const searchInput = document.getElementById('auditSearchInput');
  const actionFilter = document.getElementById('auditActionFilter');
  const outcomeFilter = document.getElementById('auditOutcomeFilter');

  loadAuditLogs();

  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentSearch = e.target.value.trim();
        currentPage = 1;
        loadAuditLogs();
      }, 300);
    });
  }

  if (actionFilter) {
    actionFilter.addEventListener('change', (e) => {
      currentAction = e.target.value;
      currentPage = 1;
      loadAuditLogs();
    });
  }

  if (outcomeFilter) {
    outcomeFilter.addEventListener('change', (e) => {
      currentOutcome = e.target.value;
      currentPage = 1;
      loadAuditLogs();
    });
  }

  async function loadAuditLogs() {
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        search: currentSearch,
        action: currentAction,
        outcome: currentOutcome
      });

      const res = await fetch(`/api/audit?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403) {
          StockPilot.showToast('Access Restricted', 'You do not have permission to view audit logs.', 'error');
          return;
        }
        throw new Error('Failed to load audit records');
      }

      const data = await res.json();
      renderLogsTable(data.logs);
      renderPagination(data.pagination);
    } catch (err) {
      console.error('Audit load error:', err);
      if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="8" class="empty-state">Unable to load audit logs.</td></tr>`;
      }
    }
  }

  function renderLogsTable(logs) {
    if (!tableBody) return;

    if (!logs || logs.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <h3>No audit records found</h3>
            <p>Modify search filters to view recorded security activities.</p>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = logs.map(l => {
      let outcomeClass = 'badge-success';
      if (l.outcome === 'DENIED') outcomeClass = 'badge-warning';
      if (l.outcome === 'FAILURE') outcomeClass = 'badge-danger';

      let detailsFormatted = '';
      if (l.details) {
        try {
          const parsed = JSON.parse(l.details);
          detailsFormatted = `<code style="font-size:0.75rem; background:var(--gray-100); padding:2px 6px; border-radius:4px;">${escapeHtml(JSON.stringify(parsed))}</code>`;
        } catch {
          detailsFormatted = `<span style="font-size:0.8rem; color:var(--gray-600);">${escapeHtml(l.details)}</span>`;
        }
      }

      return `
        <tr>
          <td style="white-space:nowrap; font-size:0.82rem; color:var(--gray-500); font-family:var(--font-mono);">
            ${formatTimestamp(l.timestamp)}
          </td>
          <td>
            <strong>${escapeHtml(l.username || 'Anonymous')}</strong>
            ${l.user_id ? `<span style="font-size:0.75rem; color:var(--gray-400);"> (UID: ${l.user_id})</span>` : ''}
          </td>
          <td>
            <span class="badge badge-gray" style="font-family:var(--font-mono); font-weight:700;">
              ${escapeHtml(l.action)}
            </span>
          </td>
          <td>
            ${l.target_type ? `<span style="font-size:0.8rem; text-transform:uppercase; color:var(--gray-500);">${escapeHtml(l.target_type)}</span>` : ''}
            ${l.target_id ? ` <strong style="font-family:var(--font-mono); color:var(--primary-700);">#${escapeHtml(l.target_id)}</strong>` : ''}
          </td>
          <td>
            <span class="badge ${outcomeClass}">
              <span class="badge-dot"></span> ${l.outcome}
            </span>
          </td>
          <td style="max-width:320px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            ${detailsFormatted}
          </td>
          <td style="font-family:var(--font-mono); font-size:0.78rem; color:var(--gray-400);">
            ${escapeHtml(l.ip_address || '127.0.0.1')}
          </td>
          <td>
            <button class="btn btn-outline-danger btn-sm js-delete-audit-row" data-id="${l.id}" title="Delete log record">
              Delete
            </button>
          </td>
        </tr>
      `;
    }).join('');

    bindAuditActions();
  }

  function bindAuditActions() {
    document.querySelectorAll('.js-delete-audit-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        StockPilot.showConfirm({
          title: 'Delete Audit Record',
          message: `Are you sure you want to delete audit log entry #${id}?`,
          confirmText: 'Delete Record',
          confirmClass: 'btn-danger',
          onConfirm: async () => {
            try {
              const res = await fetch(`/api/audit/${id}`, { method: 'DELETE' });
              const data = await res.json();
              if (!res.ok) {
                StockPilot.showToast('Error', data.error || 'Failed to delete record.', 'error');
                return;
              }
              StockPilot.showToast('Deleted', `Audit record #${id} removed.`, 'success');
              loadAuditLogs();
            } catch (err) {
              StockPilot.showToast('Network Error', err.message, 'error');
            }
          }
        });
      });
    });
  }

  // Handle Clear Entire Audit History
  const clearBtn = document.getElementById('clearAuditHistoryBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      StockPilot.showConfirm({
        title: 'Clear Entire Audit History',
        message: 'Are you sure you want to permanently purge all audit logs? This will delete all recorded activity events.',
        confirmText: 'Clear All History',
        confirmClass: 'btn-danger',
        onConfirm: async () => {
          try {
            const res = await fetch('/api/audit', { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) {
              StockPilot.showToast('Error', data.error || 'Failed to clear audit history.', 'error');
              return;
            }
            StockPilot.showToast('Cleared', 'Audit history has been successfully purged.', 'success');
            loadAuditLogs();
          } catch (err) {
            StockPilot.showToast('Network Error', err.message, 'error');
          }
        }
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
        Showing <strong>${(page - 1) * itemsPerPage + 1}</strong> to <strong>${Math.min(page * itemsPerPage, totalRecords)}</strong> of <strong>${totalRecords}</strong> events
      </div>
      <div style="display:flex; gap:6px;">
        <button class="btn btn-secondary btn-sm" id="auditPrevBtn" ${page <= 1 ? 'disabled' : ''}>Previous</button>
        <span style="display:inline-flex; align-items:center; padding:0 10px; font-size:0.85rem; font-weight:600; color:var(--gray-700);">Page ${page} of ${totalPages}</span>
        <button class="btn btn-secondary btn-sm" id="auditNextBtn" ${page >= totalPages ? 'disabled' : ''}>Next</button>
      </div>
    `;

    const prevBtn = document.getElementById('auditPrevBtn');
    const nextBtn = document.getElementById('auditNextBtn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          loadAuditLogs();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
          currentPage++;
          loadAuditLogs();
        }
      });
    }
  }

  function formatTimestamp(isoStr) {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' }) + ' ' +
        d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
