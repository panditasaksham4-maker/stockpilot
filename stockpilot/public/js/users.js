/**
 * StockPilot - User Management & Fine-Grained Permissions Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const session = await StockPilot.initPage({ requiresAuth: true, requiredPermission: 'users.view' });
  if (!session) return;

  StockPilot.bindModalCloseEvents();

  const usersTableBody = document.getElementById('usersTableBody');
  const createUserModal = 'createUserModal';
  const editUserModal = 'editUserModal';
  const permissionsModal = 'permissionsModal';

  const createUserForm = document.getElementById('createUserForm');
  const editUserForm = document.getElementById('editUserForm');
  const permissionsForm = document.getElementById('permissionsForm');

  let allAvailableRoles = [];
  let allAvailablePermissions = [];
  let currentTargetUserId = null;

  // Load initial roles and users
  loadRoles();
  loadPermissionsMeta();
  loadUsers();

  // Create User Button
  const openCreateUserBtn = document.getElementById('openCreateUserBtn');
  if (openCreateUserBtn) {
    openCreateUserBtn.addEventListener('click', () => {
      if (!StockPilot.hasPermission('users.create')) {
        StockPilot.showToast('Permission Denied', 'You do not have permission to create user accounts.', 'error');
        return;
      }
      if (createUserForm) createUserForm.reset();
      StockPilot.openModal(createUserModal);
    });
  }

  // Handle Create User Submit
  if (createUserForm) {
    createUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('newUsername').value.trim();
      const fullName = document.getElementById('newFullName').value.trim();
      const email = document.getElementById('newEmail').value.trim();
      const password = document.getElementById('newPassword').value;
      const role = document.getElementById('newRole').value;

      try {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, fullName, email, password, role })
        });

        const resData = await response.json();
        if (!response.ok) {
          StockPilot.showToast('Create User Failed', resData.error || 'Failed to create user.', 'error');
          return;
        }

        StockPilot.closeModal(createUserModal);
        StockPilot.showToast('User Created', `User "${username}" created with role "${role}".`, 'success');
        createUserForm.reset();
        loadUsers();
      } catch (err) {
        StockPilot.showToast('Network Error', err.message, 'error');
      }
    });
  }

  // Handle Edit User Submit
  if (editUserForm) {
    editUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editUserId').value;
      const fullName = document.getElementById('editFullName').value.trim();
      const email = document.getElementById('editEmail').value.trim();
      const role = document.getElementById('editRole').value;
      const password = document.getElementById('editPassword').value;

      const payload = { fullName, email, role };
      if (password && password.trim()) {
        payload.password = password;
      }

      try {
        const response = await fetch(`/api/users/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const resData = await response.json();
        if (!response.ok) {
          StockPilot.showToast('Update Failed', resData.error || 'Failed to update user.', 'error');
          return;
        }

        StockPilot.closeModal(editUserModal);
        StockPilot.showToast('User Updated', 'Account details updated successfully.', 'success');
        loadUsers();
      } catch (err) {
        StockPilot.showToast('Network Error', err.message, 'error');
      }
    });
  }

  // Handle Permissions Form Submit
  if (permissionsForm) {
    permissionsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentTargetUserId) return;

      const selectedCheckboxes = document.querySelectorAll('.js-permission-checkbox:checked');
      const selectedPerms = Array.from(selectedCheckboxes).map(cb => cb.value);

      try {
        const response = await fetch(`/api/users/${currentTargetUserId}/permissions`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permissions: selectedPerms })
        });

        const resData = await response.json();
        if (!response.ok) {
          StockPilot.showToast('Permission Update Denied', resData.error || 'Failed to save permissions.', 'error');
          return;
        }

        StockPilot.closeModal(permissionsModal);
        StockPilot.showToast('Permissions Saved', `User now holds ${resData.permissions.length} active permissions.`, 'success');
        loadUsers();
      } catch (err) {
        StockPilot.showToast('Network Error', err.message, 'error');
      }
    });
  }

  async function loadRoles() {
    try {
      const res = await fetch('/api/users/meta/roles');
      if (res.ok) {
        allAvailableRoles = await res.json();
        populateRoleDropdowns();
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  }

  async function loadPermissionsMeta() {
    try {
      const res = await fetch('/api/users/meta/permissions');
      if (res.ok) {
        allAvailablePermissions = await res.json();
      }
    } catch (err) {
      console.error('Failed to load permissions meta:', err);
    }
  }

  function populateRoleDropdowns() {
    const newRoleSelect = document.getElementById('newRole');
    const editRoleSelect = document.getElementById('editRole');

    const optionsHtml = allAvailableRoles.map(r => `
      <option value="${r.id}">${StockPilot.formatRoleName(r.id)} - ${escapeHtml(r.description || '')}</option>
    `).join('');

    if (newRoleSelect) newRoleSelect.innerHTML = optionsHtml;
    if (editRoleSelect) editRoleSelect.innerHTML = optionsHtml;
  }

  async function loadUsers() {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to load users');

      const users = await res.json();
      renderUsersTable(users);
      StockPilot.enforceUIPermissions();
    } catch (err) {
      console.error('Load users error:', err);
      if (usersTableBody) {
        usersTableBody.innerHTML = `<tr><td colspan="7" class="empty-state">Unable to load users.</td></tr>`;
      }
    }
  }

  function renderUsersTable(users) {
    if (!usersTableBody) return;

    if (users.length === 0) {
      usersTableBody.innerHTML = `<tr><td colspan="7" class="empty-state">No users registered.</td></tr>`;
      return;
    }

    const canUpdate = StockPilot.hasPermission('users.update');
    const canDeactivate = StockPilot.hasPermission('users.deactivate');
    const canManagePerms = StockPilot.hasPermission('permissions.manage');

    usersTableBody.innerHTML = users.map(u => {
      const isSelf = StockPilot.currentUser && StockPilot.currentUser.id === u.id;
      const roleBadgeClass = StockPilot.getRoleBadgeClass(u.role);

      return `
        <tr>
          <td><strong style="font-family:var(--font-mono);">#${u.id}</strong></td>
          <td>
            <div style="font-weight:700; color:var(--gray-900); display:flex; align-items:center; gap:6px;">
              ${escapeHtml(u.username)}
              ${isSelf ? '<span class="badge badge-blue" style="font-size:0.65rem;">YOU</span>' : ''}
            </div>
            <div style="font-size:0.78rem; color:var(--gray-500);">${escapeHtml(u.email)}</div>
          </td>
          <td>${escapeHtml(u.fullName)}</td>
          <td>
            <span class="user-role-badge ${roleBadgeClass}">
              ${StockPilot.formatRoleName(u.role)}
            </span>
          </td>
          <td>
            <span class="badge ${u.isActive ? 'badge-success' : 'badge-danger'}">
              <span class="badge-dot"></span> ${u.isActive ? 'Active' : 'Deactivated'}
            </span>
          </td>
          <td>
            <button class="btn btn-secondary btn-sm js-manage-perms-btn" 
              data-id="${u.id}" 
              data-username="${escapeHtml(u.username)}" 
              data-role="${u.role}"
              ${!canManagePerms || isSelf ? 'disabled title="Cannot modify own permissions or requires permissions.manage"' : ''}>
              ${u.permissions.length} perms
            </button>
          </td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-secondary btn-sm js-edit-user-btn" 
                data-id="${u.id}" 
                data-username="${escapeHtml(u.username)}" 
                data-fullname="${escapeHtml(u.fullName)}" 
                data-email="${escapeHtml(u.email)}" 
                data-role="${u.role}"
                ${!canUpdate ? 'disabled title="Requires users.update permission"' : ''}>
                Edit
              </button>
              <button class="btn ${u.isActive ? 'btn-outline-danger' : 'btn-secondary'} btn-sm js-toggle-status-btn" 
                data-id="${u.id}" 
                data-username="${escapeHtml(u.username)}" 
                data-active="${u.isActive}"
                ${!canDeactivate || isSelf ? 'disabled title="Cannot deactivate self or requires users.deactivate"' : ''}>
                ${u.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    bindUserActionEvents();
  }

  function bindUserActionEvents() {
    // Edit User Click
    document.querySelectorAll('.js-edit-user-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const fullName = btn.getAttribute('data-fullname');
        const email = btn.getAttribute('data-email');
        const role = btn.getAttribute('data-role');
        const username = btn.getAttribute('data-username');

        document.getElementById('editUserId').value = id;
        document.getElementById('editUsernameDisplay').textContent = username;
        document.getElementById('editFullName').value = fullName;
        document.getElementById('editEmail').value = email;
        document.getElementById('editRole').value = role;
        document.getElementById('editPassword').value = '';

        StockPilot.openModal(editUserModal);
      });
    });

    // Toggle Status Click
    document.querySelectorAll('.js-toggle-status-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const username = btn.getAttribute('data-username');
        const currentlyActive = btn.getAttribute('data-active') === 'true';
        const targetActiveState = !currentlyActive;

        StockPilot.showConfirm({
          title: targetActiveState ? 'Activate User Account' : 'Deactivate User Account',
          message: targetActiveState 
            ? `Are you sure you want to reactivate the account for "${username}"? They will regain access based on their assigned permissions.`
            : `Are you sure you want to deactivate the account for "${username}"? They will immediately be barred from logging in or making API requests.`,
          confirmText: targetActiveState ? 'Activate Account' : 'Deactivate Account',
          confirmClass: targetActiveState ? 'btn-primary' : 'btn-danger',
          onConfirm: async () => {
            try {
              const res = await fetch(`/api/users/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: targetActiveState })
              });

              const resData = await res.json();
              if (!res.ok) {
                StockPilot.showToast('Action Rejected', resData.error || 'Server rejected status modification.', 'error');
                return;
              }

              StockPilot.showToast('Status Updated', resData.message, 'success');
              loadUsers();
            } catch (err) {
              StockPilot.showToast('Network Error', err.message, 'error');
            }
          }
        });
      });
    });

    // Manage Permissions Click
    document.querySelectorAll('.js-manage-perms-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const username = btn.getAttribute('data-username');
        const role = btn.getAttribute('data-role');

        currentTargetUserId = id;
        document.getElementById('permModalUsername').textContent = `${username} (${StockPilot.formatRoleName(role)})`;

        try {
          const res = await fetch(`/api/users/${id}`);
          if (!res.ok) throw new Error('Failed to load user permissions');
          const userData = await res.json();

          renderPermissionMatrix(userData.permissions, role === 'super_admin');
          StockPilot.openModal(permissionsModal);
        } catch (err) {
          StockPilot.showToast('Error', err.message, 'error');
        }
      });
    });
  }

  function renderPermissionMatrix(permissionsList, isSuperAdmin) {
    const container = document.getElementById('permissionMatrixContainer');
    if (!container) return;

    if (isSuperAdmin) {
      container.innerHTML = `
        <div style="padding:16px; background:#EEF2FF; border:1px solid #C7D2FE; border-radius:var(--radius-md); color:#3730A3;">
          <strong>Super Administrator Notice:</strong> This user holds the Super Administrator role and possesses inherent, unrestricted access to all 13 system permissions.
        </div>
      `;
      return;
    }

    // Group by category
    const grouped = {};
    for (const p of permissionsList) {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push(p);
    }

    let html = '<div class="permissions-grid">';
    for (const [category, perms] of Object.entries(grouped)) {
      html += `
        <div class="permission-category-block">
          <div class="permission-category-title">${category.toUpperCase()} MODULE</div>
          ${perms.map(p => `
            <div class="permission-item">
              <input type="checkbox" class="permission-checkbox js-permission-checkbox" 
                id="perm_${p.id}" 
                value="${p.id}" 
                ${p.granted ? 'checked' : ''} />
              <label for="perm_${p.id}" style="cursor:pointer; flex:1;">
                <div class="permission-label">
                  ${escapeHtml(p.name)} 
                  <span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--gray-400);">(${p.id})</span>
                  ${p.source === 'role' ? '<span class="badge badge-gray" style="font-size:0.65rem; margin-left:4px;">From Role</span>' : ''}
                  ${p.source === 'custom' ? '<span class="badge badge-purple" style="font-size:0.65rem; margin-left:4px;">Custom Grant</span>' : ''}
                </div>
                <div class="permission-desc">${escapeHtml(p.description)}</div>
              </label>
            </div>
          `).join('')}
        </div>
      `;
    }
    html += '</div>';
    container.innerHTML = html;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
});
