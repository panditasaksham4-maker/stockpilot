/**
 * StockPilot - Algorithmic Search Controller
 * Manual Linear Search & Binary Search demonstrations with real comparison counts and execution trace.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const session = await StockPilot.initPage({ requiresAuth: true, requiredPermission: 'inventory.search' });
  if (!session) return;

  let selectedAlgorithm = 'both'; // 'linear', 'binary', or 'both'

  const searchInput = document.getElementById('searchProductIdInput');
  const searchBtn = document.getElementById('executeSearchBtn');
  const resultContainer = document.getElementById('searchResultContainer');

  // Algorithm selector pills
  const algoPills = document.querySelectorAll('.algo-pill');
  algoPills.forEach(pill => {
    pill.addEventListener('click', () => {
      algoPills.forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      selectedAlgorithm = pill.getAttribute('data-algo');
    });
  });

  // Demo ID quick-fill buttons
  document.querySelectorAll('.js-quick-id-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (searchInput) {
        searchInput.value = id;
        executeSearch();
      }
    });
  });

  // Search Button click
  if (searchBtn) {
    searchBtn.addEventListener('click', executeSearch);
  }

  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        executeSearch();
      }
    });
  }

  async function executeSearch() {
    const rawId = searchInput.value.trim();
    if (!rawId) {
      StockPilot.showToast('Input Required', 'Please enter a numerical Product ID to search.', 'warning');
      searchInput.focus();
      return;
    }

    const productId = parseInt(rawId, 10);
    if (isNaN(productId) || productId <= 0) {
      StockPilot.showToast('Invalid Input', 'Product ID must be a positive integer.', 'warning');
      return;
    }

    if (!StockPilot.hasPermission('inventory.search')) {
      StockPilot.showToast('Permission Denied', 'You do not have permission to execute inventory searches.', 'error');
      return;
    }

    if (searchBtn) {
      searchBtn.disabled = true;
      searchBtn.innerHTML = 'Searching Array...';
    }

    try {
      const response = await fetch(`/api/inventory/search?algorithm=${selectedAlgorithm}&productId=${productId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search request failed.');
      }

      renderSearchResults(data, selectedAlgorithm, productId);
    } catch (err) {
      console.error('Search error:', err);
      StockPilot.showToast('Search Error', err.message, 'error');
      if (resultContainer) {
        resultContainer.innerHTML = `
          <div class="empty-state">
            <h3>Search Failed</h3>
            <p>${err.message}</p>
          </div>
        `;
      }
    } finally {
      if (searchBtn) {
        searchBtn.disabled = false;
        searchBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;">
            <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg> Execute Search
        `;
      }
    }
  }

  function renderSearchResults(data, algorithm, targetId) {
    if (!resultContainer) return;

    if (algorithm === 'both') {
      renderComparativeResults(data, targetId);
    } else {
      renderSingleAlgorithmResult(data, algorithm, targetId);
    }
  }

  function renderComparativeResults(data, targetId) {
    const { linear, binary, comparisonAnalysis, item, found, totalItemsInArray } = data;

    let productDetailsHtml = '';
    if (found && item) {
      productDetailsHtml = `
        <div class="card" style="border: 2px solid #3B82F6; margin-bottom: 24px;">
          <div class="card-header" style="background: #EFF6FF;">
            <div class="card-title" style="color: #1E40AF;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              Product Found in Inventory Array
            </div>
            <span class="badge ${item.stockBadgeClass}">${item.stockStatus}</span>
          </div>
          <div class="card-body">
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
              <div>
                <span class="form-label">Product ID</span>
                <strong style="font-family:var(--font-mono); font-size:1.1rem; color:var(--primary-700);">#${item.productId}</strong>
              </div>
              <div>
                <span class="form-label">Product Name</span>
                <strong>${escapeHtml(item.name)}</strong>
              </div>
              <div>
                <span class="form-label">Category</span>
                <span class="badge badge-gray">${escapeHtml(item.category)}</span>
              </div>
              <div>
                <span class="form-label">Current Stock</span>
                <strong>${item.quantity} units</strong>
              </div>
              <div>
                <span class="form-label">Unit Price</span>
                <strong>$${Number(item.price).toFixed(2)}</strong>
              </div>
              <div>
                <span class="form-label">Total Asset Value</span>
                <strong>$${(item.quantity * item.price).toFixed(2)}</strong>
              </div>
            </div>
            ${item.description ? `<p style="margin-top:14px; font-size:0.85rem; color:var(--gray-600);">${escapeHtml(item.description)}</p>` : ''}
          </div>
        </div>
      `;
    } else {
      productDetailsHtml = `
        <div class="card" style="border-left: 4px solid var(--danger-600); margin-bottom: 24px;">
          <div class="card-body" style="text-align: center; padding: 28px;">
            <svg style="width:40px;height:40px;color:var(--danger-600);margin:0 auto 10px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
            <h3 style="font-size:1.15rem; color:var(--gray-900); font-weight:700;">No product found with the provided Product ID.</h3>
            <p style="color:var(--gray-500); font-size:0.88rem; margin-top:4px;">Product ID ${targetId} does not exist in the active ${totalItemsInArray}-item array.</p>
          </div>
        </div>
      `;
    }

    resultContainer.innerHTML = `
      ${productDetailsHtml}

      <!-- Comparative Performance Metrics -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
        <!-- Linear Search Box -->
        <div class="card" style="border-top: 4px solid #6366F1;">
          <div class="card-header">
            <div>
              <h3 style="font-size:1.05rem; font-weight:700;">Linear Search</h3>
              <p style="font-size:0.75rem; color:var(--gray-500);">Sequential array traversal O(n)</p>
            </div>
            <span class="badge badge-purple">${linear.comparisons} comparisons</span>
          </div>
          <div class="card-body">
            <div class="comparison-counter-box" style="background:#1E1B4B; margin-bottom:16px;">
              <div style="font-size:0.78rem; text-transform:uppercase; color:#A5B4FC;">Comparisons Performed</div>
              <div class="comparison-count-number" style="color:#818CF8;">${linear.comparisons}</div>
              <div style="font-size:0.75rem; color:#C7D2FE;">of ${totalItemsInArray} total elements</div>
            </div>
            <div class="complexity-item">
              <span>Time Complexity:</span>
              <span class="complexity-badge">O(n)</span>
            </div>
            <div class="complexity-item">
              <span>Best Case (First item):</span>
              <span class="complexity-badge">O(1)</span>
            </div>
            <div class="complexity-item">
              <span>Worst Case:</span>
              <span class="complexity-badge">O(n)</span>
            </div>
            
            <h4 style="font-size:0.82rem; font-weight:700; margin:16px 0 8px; text-transform:uppercase; color:var(--gray-600);">Search Execution Path:</h4>
            <div class="search-trace-list">
              ${linear.steps.map(s => `
                <div class="trace-step ${s.isMatch ? 'match' : ''}">
                  <span>Step ${s.step}: Check index [${s.index}] (ID: ${s.checkedId})</span>
                  <span>${s.isMatch ? 'MATCH' : '≠ target'}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Binary Search Box -->
        <div class="card" style="border-top: 4px solid #2563EB;">
          <div class="card-header">
            <div>
              <h3 style="font-size:1.05rem; font-weight:700;">Binary Search</h3>
              <p style="font-size:0.75rem; color:var(--gray-500);">Divide-and-Conquer O(log n)</p>
            </div>
            <span class="badge badge-blue">${binary.comparisons} comparisons</span>
          </div>
          <div class="card-body">
            <div class="comparison-counter-box" style="background:#0F172A; margin-bottom:16px;">
              <div style="font-size:0.78rem; text-transform:uppercase; color:#93C5FD;">Comparisons Performed</div>
              <div class="comparison-count-number" style="color:#60A5FA;">${binary.comparisons}</div>
              <div style="font-size:0.75rem; color:#BFDBFE;">Requires sorted dataset</div>
            </div>
            <div class="complexity-item">
              <span>Time Complexity:</span>
              <span class="complexity-badge">O(log n)</span>
            </div>
            <div class="complexity-item">
              <span>Best Case (Exact middle):</span>
              <span class="complexity-badge">O(1)</span>
            </div>
            <div class="complexity-item">
              <span>Worst Case:</span>
              <span class="complexity-badge">O(log n)</span>
            </div>

            <h4 style="font-size:0.82rem; font-weight:700; margin:16px 0 8px; text-transform:uppercase; color:var(--gray-600);">Binary Search Intervals:</h4>
            <div class="search-trace-list">
              ${binary.steps.map(s => `
                <div class="trace-step ${s.comparison === 'MATCH' ? 'match' : ''}">
                  <span>Step ${s.step}: [${s.low}..${s.high}], Mid=[${s.mid}] (ID: ${s.checkedId})</span>
                  <span>${s.comparison === 'MATCH' ? 'MATCH' : (s.comparison === 'LESS_THAN' ? 'Target < Mid (Go Left)' : 'Target > Mid (Go Right)')}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Analysis Banner -->
      <div class="card" style="background: linear-gradient(135deg, #1E293B, #0F172A); color:#fff;">
        <div class="card-body" style="padding:22px 28px;">
          <h4 style="font-size:1.05rem; font-weight:700; color:#93C5FD; margin-bottom:6px;">
            Comparative Efficiency Analysis
          </h4>
          <p style="font-size:0.9rem; color:#E2E8F0; line-height:1.6;">
            Searching for <strong>Product ID ${targetId}</strong> in the current array of <strong>${totalItemsInArray} items</strong>:
            <br>
            • <strong>Linear Search</strong> took <strong>${linear.comparisons}</strong> comparison(s).
            <br>
            • <strong>Binary Search</strong> took <strong>${binary.comparisons}</strong> comparison(s).
            <br>
            ${comparisonAnalysis.differenceInComparisons > 0 
              ? `<span style="color:#34D399; font-weight:600;">Binary Search saved ${comparisonAnalysis.differenceInComparisons} comparison(s) (${Math.round((1 - binary.comparisons / linear.comparisons) * 100)}% reduction in operations)!</span>`
              : `<span style="color:#93C5FD;">Both algorithms checked in minimal iterations for this position.</span>`}
          </p>
          <div style="margin-top:10px; font-size:0.8rem; color:#94A3B8;">
            * Theoretical Note: Binary search achieves logarithmic scaling \(O(\log_2 n)\) compared to linear \(O(n)\). For an inventory of 1,000,000 items, Linear Search takes on average 500,000 comparisons while Binary Search takes at most 20 comparisons.
          </div>
        </div>
      </div>
    `;
  }

  function renderSingleAlgorithmResult(data, algorithm, targetId) {
    const isLinear = algorithm === 'linear';
    const { comparisons, item, found, totalElements, steps, complexity } = data;

    resultContainer.innerHTML = `
      ${found && item ? `
        <div class="card" style="border: 2px solid #3B82F6; margin-bottom: 24px;">
          <div class="card-header" style="background: #EFF6FF;">
            <div class="card-title" style="color: #1E40AF;">Product Found: #${item.productId} - ${escapeHtml(item.name)}</div>
            <span class="badge ${item.stockBadgeClass}">${item.stockStatus}</span>
          </div>
          <div class="card-body">
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px;">
              <div><span class="form-label">Category</span><strong>${escapeHtml(item.category)}</strong></div>
              <div><span class="form-label">Quantity</span><strong>${item.quantity} units</strong></div>
              <div><span class="form-label">Unit Price</span><strong>$${Number(item.price).toFixed(2)}</strong></div>
              <div><span class="form-label">Total Value</span><strong>$${(item.quantity * item.price).toFixed(2)}</strong></div>
            </div>
          </div>
        </div>
      ` : `
        <div class="card" style="border-left: 4px solid var(--danger-600); margin-bottom: 24px;">
          <div class="card-body" style="text-align: center; padding: 24px;">
            <h3 style="font-size:1.1rem; color:var(--gray-900); font-weight:700;">No product found with the provided Product ID.</h3>
            <p style="color:var(--gray-500); font-size:0.85rem;">Examined ${comparisons} elements without finding ID ${targetId}.</p>
          </div>
        </div>
      `}

      <div class="card">
        <div class="card-header">
          <div class="card-title">${isLinear ? 'Linear Search Algorithm Metrics' : 'Binary Search Algorithm Metrics'}</div>
          <span class="badge badge-blue">${comparisons} Comparisons</span>
        </div>
        <div class="card-body">
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; margin-bottom:20px;">
            <div class="comparison-counter-box">
              <div style="font-size:0.75rem; text-transform:uppercase; color:#93C5FD;">Comparisons</div>
              <div class="comparison-count-number">${comparisons}</div>
              <div style="font-size:0.75rem; color:#BFDBFE;">Total array elements: ${totalElements}</div>
            </div>
            <div class="complexity-card">
              <h4>Complexity (${isLinear ? 'Sequential' : 'Logarithmic'})</h4>
              <div class="complexity-item"><span>Best Case:</span><span class="complexity-badge">${complexity.bestCase}</span></div>
              <div class="complexity-item"><span>Average Case:</span><span class="complexity-badge">${complexity.averageCase}</span></div>
              <div class="complexity-item"><span>Worst Case:</span><span class="complexity-badge">${complexity.worstCase}</span></div>
            </div>
          </div>

          <h4 style="font-size:0.85rem; font-weight:700; text-transform:uppercase; color:var(--gray-600); margin-bottom:8px;">Execution Trace:</h4>
          <div class="search-trace-list">
            ${steps.map(s => `
              <div class="trace-step ${s.isMatch || s.comparison === 'MATCH' ? 'match' : ''}">
                <span>Step ${s.step}: Checked ID ${s.checkedId}</span>
                <span>${s.isMatch || s.comparison === 'MATCH' ? 'MATCH FOUND' : (s.comparison ? s.comparison : 'No match')}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
});
