/**
 * StockPilot - Authentication Client Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const submitBtn = document.getElementById('submitBtn');
  const alertBox = document.getElementById('alertBox');

  // Check if user is already logged in
  fetch('/api/auth/me')
    .then(res => {
      if (res.ok) {
        window.location.href = '/dashboard.html';
      }
    })
    .catch(() => {});

  // Handle Demo Account Quick Fill Chips
  const demoChips = document.querySelectorAll('.demo-chip');
  demoChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const u = chip.getAttribute('data-username');
      const p = chip.getAttribute('data-password');
      if (usernameInput && passwordInput) {
        usernameInput.value = u;
        passwordInput.value = p;
        hideAlert();
        submitBtn.focus();
      }
    });
  });

  // Handle Login Submit
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const username = usernameInput.value.trim();
      const password = passwordInput.value;

      if (!username || !password) {
        showAlert('Please enter both username and password.', 'error');
        return;
      }

      setLoading(true);

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
          showAlert(data.error || 'Authentication failed. Please check credentials.', 'error');
          setLoading(false);
          return;
        }

        showAlert('Authentication successful. Redirecting to workspace...', 'success');
        setTimeout(() => {
          window.location.href = '/dashboard.html';
        }, 600);
      } catch (err) {
        console.error('Login request failed:', err);
        showAlert('Network or server connection error. Please try again.', 'error');
        setLoading(false);
      }
    });
  }

  function showAlert(msg, type = 'error') {
    if (!alertBox) return;
    alertBox.textContent = msg;
    alertBox.style.display = 'block';
    if (type === 'success') {
      alertBox.style.backgroundColor = 'rgba(5, 150, 105, 0.2)';
      alertBox.style.borderColor = '#10B981';
      alertBox.style.color = '#A7F3D0';
    } else {
      alertBox.style.backgroundColor = 'rgba(220, 38, 38, 0.2)';
      alertBox.style.borderColor = '#EF4444';
      alertBox.style.color = '#FECACA';
    }
  }

  function hideAlert() {
    if (alertBox) {
      alertBox.style.display = 'none';
    }
  }

  function setLoading(isLoading) {
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    if (isLoading) {
      submitBtn.innerHTML = `
        <svg class="spinner" style="width:16px;height:16px;animation:spin 1s linear infinite;" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.3"></circle>
          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg> Authenticating...
      `;
    } else {
      submitBtn.innerHTML = `Sign In <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
    }
  }
});
