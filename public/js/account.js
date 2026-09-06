// Gates the header's cart / profile UI behind login, and exposes a single shared
// auth-check promise (window.__BBAuthCheck) other scripts can reuse — e.g.
// services-add-to-cart.js checks it before allowing an "Add to Cart" click, without
// firing its own separate /api/auth/me request.
(function () {
  window.__BBAuthCheck = fetch('/api/auth/me', { credentials: 'include' })
    .then(function (res) {
      if (!res.ok) return { loggedIn: false, user: null };
      return res.json().then(function (data) { return { loggedIn: true, user: data.user }; });
    })
    .catch(function () { return { loggedIn: false, user: null }; });

  const loggedInAuth = document.getElementById('loggedInAuth');
  if (!loggedInAuth) return; // header markup not present on this page

  const trigger = document.getElementById('accountTrigger');
  const dropdown = document.getElementById('accountDropdown');
  const avatarEl = document.getElementById('accountAvatar');
  const dropdownNameEl = document.getElementById('accountDropdownName');
  const dropdownEmailEl = document.getElementById('accountDropdownEmail');
  const adminLink = document.getElementById('adminDashboardLink');
  const adminWelcomeNote = document.getElementById('adminWelcomeNote');
  const logoutBtn = document.getElementById('logoutBtn');

  function showLoggedOut() {
    loggedInAuth.style.display = 'none';
  }

  function showLoggedIn(user) {
    loggedInAuth.style.display = 'flex';

    const label = (user.name || user.email || '?').trim();
    avatarEl.textContent = label.charAt(0).toUpperCase();
    dropdownNameEl.textContent = user.name || '';
    dropdownEmailEl.textContent = user.email || '';

    if (adminLink) {
      adminLink.style.display = user.role === 'admin' ? 'flex' : 'none';
    }

    if (adminWelcomeNote) {
      const firstName = (user.name || '').trim().split(/\s+/)[0];
      adminWelcomeNote.textContent = 'Welcome back, ' + (firstName || 'Admin') + ' \uD83D\uDC4B';
    }

    // The cart badge reflects localStorage, which persists across login state —
    // just make sure it's in sync now that the cart icon is actually visible.
    if (window.BBCart) window.BBCart.updateCartBadge();
  }

  function closeDropdown() {
    dropdown.classList.remove('account-menu__dropdown--open');
    trigger.setAttribute('aria-expanded', 'false');
  }

  function toggleDropdown() {
    const isOpen = dropdown.classList.toggle('account-menu__dropdown--open');
    trigger.setAttribute('aria-expanded', String(isOpen));
  }

  async function init() {
    const authState = await window.__BBAuthCheck;
    if (authState.loggedIn) {
      showLoggedIn(authState.user);
    } else {
      showLoggedOut();
    }
  }

  if (trigger) {
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleDropdown();
    });
  }

  document.addEventListener('click', function (e) {
    if (loggedInAuth && !loggedInAuth.contains(e.target)) closeDropdown();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDropdown();
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function () {
      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      } catch (err) {
        // Log out client-side regardless of whether the request itself succeeded.
      }
      window.location.href = '/';
    });
  }

  init();
})();
