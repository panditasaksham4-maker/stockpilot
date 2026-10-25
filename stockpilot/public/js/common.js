/**
 * StockPilot - Common Client-Side Utilities
 * Handles session validation, RBAC UI adaptation, toasts, and modals.
 */

const StockPilot = {
  currentUser: null,
  userPermissions: [],

  /**
   * Initialize and authenticate page session
   */
  async initPage({ requiresAuth = true, requiredPermission = null } = {}) {
    try {
      const response = await fetch('/api/auth/me');
      
      if (!response.ok) {
        if (requiresAuth) {
          window.location.href = '/login.html';
          return null;
        }
        return null;
      }

      const data = await response.json();
      StockPilot.currentUser = data.user;
      StockPilot.userPermissions = data.permissions || [];

      // If page requires a specific permission and user doesn't have it
      if (requiredPermission && !StockPilot.hasPermission(requiredPermission)) {
        StockPilot.showToast('Access Restricted', `You do not have permission (${requiredPermission}) to view this section.`, 'warning');
        setTimeout(() => {
          window.location.href = '/dashboard.html';
        }, 1500);
        return null;
      }

      // Populate user interface elements
      StockPilot.updateUserInterface();
      StockPilot.setupNavigation();
      StockPilot.enforceUIPermissions();

      return data;
    } catch (err) {
      console.error('Session check failed:', err);
      if (requiresAuth) {
        window.location.href = '/login.html';
      }
      return null;
    }
  },

  /**
   * Check if current user has a specific permission
   */
  hasPermission(permissionId) {
    if (!StockPilot.currentUser) return false;
    if (StockPilot.currentUser.role === 'super_admin') return true;
    return StockPilot.userPermissions.includes(permissionId);
  },

  /**
   * Populate UI with logged-in user profile
   */
  updateUserInterface() {
    if (!StockPilot.currentUser) return;

    const nameElements = document.querySelectorAll('.js-user-name');
    nameElements.forEach(el => el.textContent = StockPilot.currentUser.fullName || StockPilot.currentUser.username);

    const emailElements = document.querySelectorAll('.js-user-email');
    emailElements.forEach(el => el.textContent = StockPilot.currentUser.email);

    const avatarElements = document.querySelectorAll('.js-user-avatar');
    avatarElements.forEach(el => {
      const initial = (StockPilot.currentUser.fullName || StockPilot.currentUser.username).charAt(0).toUpperCase();
      el.textContent = initial;
    });

    const roleBadgeElements = document.querySelectorAll('.js-user-role-badge');
    roleBadgeElements.forEach(el => {
      const role = StockPilot.currentUser.role;
      el.textContent = StockPilot.formatRoleName(role);
      el.className = 'user-role-badge ' + StockPilot.getRoleBadgeClass(role);
    });
  },

  /**
   * Hide or disable elements that require permissions the user doesn't possess
   */
  enforceUIPermissions() {
    // Elements with data-perm attribute
    const permElements = document.querySelectorAll('[data-perm]');
    permElements.forEach(el => {
      const requiredPerm = el.getAttribute('data-perm');
      const actionType = el.getAttribute('data-perm-action') || 'hide'; // 'hide' or 'disable'

      if (!StockPilot.hasPermission(requiredPerm)) {
        if (actionType === 'disable') {
          el.setAttribute('disabled', 'true');
          el.classList.add('disabled');
          el.title = `Requires permission: ${requiredPerm}`;
        } else {
          el.style.display = 'none';
        }
      } else {
        if (actionType === 'disable') {
          el.removeAttribute('disabled');
          el.classList.remove('disabled');
        } else {
          el.style.display = '';
        }
      }
    });
  },

  /**
   * Setup active link highlight and mobile sidebar toggle
   */
  setupNavigation() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && (currentPath.endsWith(href) || (href === '/dashboard.html' && (currentPath === '/' || currentPath === '/index.html')))) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Mobile sidebar toggle button
    const toggleBtn = document.querySelector('.nav-toggle-btn');
    const sidebar = document.querySelector('.sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }

    // User snippet click to open Profile & Password modal
    const userSnippets = document.querySelectorAll('.user-snippet');
    userSnippets.forEach(snippet => {
      snippet.style.cursor = 'pointer';
      snippet.title = 'Click to edit your username, email, or password';
      snippet.addEventListener('click', (e) => {
        if (e.target.closest('.js-logout-btn')) return;
        StockPilot.openProfileModal();
      });
    });

    StockPilot.setupProfileModal();

    // Logout button handler
    const logoutBtns = document.querySelectorAll('.js-logout-btn');
    logoutBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
          StockPilot.showToast('Logged Out', 'You have been securely signed out.', 'success');
          setTimeout(() => {
            window.location.href = '/login.html';
          }, 600);
        } catch {
          window.location.href = '/login.html';
        }
      });
    });
  },

  /**
   * Inject Profile & Password management modal into DOM
   */
  setupProfileModal() {
    if (document.getElementById('profileSettingsModal')) return;

    const modal = document.createElement('div');
    modal.id = 'profileSettingsModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h3 class="modal-title">My Profile & Security Settings</h3>
          <button class="modal-close" data-modal-close>&times;</button>
        </div>
        <form id="profileSettingsForm">
          <div class="modal-body">
            <div style="background:var(--gray-50); border:1px solid var(--gray-200); padding:14px; border-radius:var(--radius-md); margin-bottom:18px; display:flex; align-items:center; justify-content:space-between;">
              <div>
                <div style="font-size:0.75rem; text-transform:uppercase; color:var(--gray-500); font-weight:700;">Active Account Role</div>
                <div style="font-size:0.95rem; font-weight:700; color:var(--gray-900);" id="profileRoleDisplay">User</div>
              </div>
              <span class="user-role-badge" id="profileRoleBadge">...</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="profileUsernameInput">Username <span class="required">*</span></label>
              <input type="text" id="profileUsernameInput" class="form-control" required minlength="3">
              <div class="form-hint">Your unique login username.</div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="profileFullNameInput">Full Name <span class="required">*</span></label>
                <input type="text" id="profileFullNameInput" class="form-control" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="profileEmailInput">Email Address <span class="required">*</span></label>
                <input type="email" id="profileEmailInput" class="form-control" required>
              </div>
            </div>

            <div style="margin-top:20px; padding-top:16px; border-top:1px dashed var(--gray-300);">
              <h4 style="font-size:0.9rem; font-weight:700; color:var(--gray-900); margin-bottom:10px;">
                Change Password (Optional)
              </h4>
              <div class="form-group">
                <label class="form-label" for="profileCurrentPasswordInput">Current Password</label>
                <input type="password" id="profileCurrentPasswordInput" class="form-control" placeholder="Required only if changing password">
              </div>
              <div class="form-group">
                <label class="form-label" for="profileNewPasswordInput">New Password</label>
                <input type="password" id="profileNewPasswordInput" class="form-control" placeholder="Minimum 6 characters" minlength="6">
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>
            <button type="submit" class="btn btn-primary" id="saveProfileBtn">Save Profile & Password</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    StockPilot.bindModalCloseEvents();

    const form = document.getElementById('profileSettingsForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('saveProfileBtn');
      const username = document.getElementById('profileUsernameInput').value.trim();
      const fullName = document.getElementById('profileFullNameInput').value.trim();
      const email = document.getElementById('profileEmailInput').value.trim();
      const currentPassword = document.getElementById('profileCurrentPasswordInput').value;
      const newPassword = document.getElementById('profileNewPasswordInput').value;

      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      try {
        const payload = { username, fullName, email };
        if (newPassword && newPassword.trim()) {
          payload.currentPassword = currentPassword;
          payload.newPassword = newPassword;
        }

        const res = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          StockPilot.showToast('Profile Update Error', data.error || 'Failed to update profile.', 'error');
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Profile & Password';
          return;
        }

        StockPilot.currentUser = { ...StockPilot.currentUser, ...data.user };
        StockPilot.updateUserInterface();
        StockPilot.closeModal('profileSettingsModal');
        StockPilot.showToast('Profile Updated', 'Your username, credentials, and details have been saved!', 'success');

        // Clear password fields
        document.getElementById('profileCurrentPasswordInput').value = '';
        document.getElementById('profileNewPasswordInput').value = '';
      } catch (err) {
        StockPilot.showToast('Network Error', err.message, 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Profile & Password';
      }
    });
  },

  /**
   * Open and populate Profile Modal
   */
  openProfileModal() {
    if (!StockPilot.currentUser) return;
    StockPilot.setupProfileModal();

    document.getElementById('profileUsernameInput').value = StockPilot.currentUser.username || '';
    document.getElementById('profileFullNameInput').value = StockPilot.currentUser.fullName || '';
    document.getElementById('profileEmailInput').value = StockPilot.currentUser.email || '';
    document.getElementById('profileRoleDisplay').textContent = StockPilot.formatRoleName(StockPilot.currentUser.role);
    
    const roleBadge = document.getElementById('profileRoleBadge');
    roleBadge.textContent = StockPilot.formatRoleName(StockPilot.currentUser.role);
    roleBadge.className = 'user-role-badge ' + StockPilot.getRoleBadgeClass(StockPilot.currentUser.role);

    document.getElementById('profileCurrentPasswordInput').value = '';
    document.getElementById('profileNewPasswordInput').value = '';

    StockPilot.openModal('profileSettingsModal');
  },


  /**
   * Format role name for display
   */
  formatRoleName(role) {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'inventory_manager': return 'Inventory Mgr';
      case 'viewer': return 'Viewer';
      case 'custom': return 'Custom';
      default: return role || 'User';
    }
  },

  /**
   * Role badge styling
   */
  getRoleBadgeClass(role) {
    switch (role) {
      case 'super_admin': return 'badge-purple';
      case 'inventory_manager': return 'badge-blue';
      case 'viewer': return 'badge-gray';
      case 'custom': return 'badge-warning';
      default: return 'badge-gray';
    }
  },

  /**
   * Display toast notifications
   */
  showToast(title, message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 300ms ease, transform 300ms ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  },

  /**
   * Generic Modal Open
   */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  /**
   * Generic Modal Close
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  /**
   * Setup modal close triggers
   */
  bindModalCloseEvents() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });

    document.querySelectorAll('.modal-close, [data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay');
        if (modal) {
          modal.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });
  },

  /**
   * Reusable Confirmation Dialog
   */
  showConfirm({ title, message, confirmText = 'Confirm', confirmClass = 'btn-danger', onConfirm }) {
    let modal = document.getElementById('confirmModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'confirmModal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content" style="max-width: 440px;">
          <div class="modal-header">
            <h3 class="modal-title" id="confirmModalTitle">Confirm Action</h3>
            <button class="modal-close" data-modal-close>&times;</button>
          </div>
          <div class="modal-body">
            <p id="confirmModalMessage" style="color: var(--gray-700); font-size: 0.95rem;"></p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-modal-close>Cancel</button>
            <button class="btn ${confirmClass}" id="confirmModalBtn">${confirmText}</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      StockPilot.bindModalCloseEvents();
    }

    document.getElementById('confirmModalTitle').textContent = title;
    document.getElementById('confirmModalMessage').textContent = message;
    
    const confirmBtn = document.getElementById('confirmModalBtn');
    confirmBtn.className = `btn ${confirmClass}`;
    confirmBtn.textContent = confirmText;

    // Replace onclick listener
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', () => {
      StockPilot.closeModal('confirmModal');
      if (typeof onConfirm === 'function') {
        onConfirm();
      }
    });

    StockPilot.openModal('confirmModal');
  }
};

window.StockPilot = StockPilot;
