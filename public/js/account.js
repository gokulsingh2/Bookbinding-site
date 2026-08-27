// Gates the header's cart / profile UI behind login. On every page load this checks
// /api/auth/me once and shows exactly one of the two header states — nothing cart- or
// account-related is visible until that check resolves, so there's no flash of the
// wrong state for a logged-out visitor.
(function () {
  const loggedOutAuth = document.getElementById('loggedOutAuth');
  const loggedInAuth = document.getElementById('loggedInAuth');
  if (!loggedOutAuth || !loggedInAuth) return; // header markup not present on this page

  const trigger = document.getElementById('accountTrigger');
  const dropdown = document.getElementById('accountDropdown');
  const avatarEl = document.getElementById('accountAvatar');
  const dropdownNameEl = document.getElementById('accountDropdownName');
  const dropdownEmailEl = document.getElementById('accountDropdownEmail');
  const adminLink = document.getElementById('adminDashboardLink');
  const logoutBtn = document.getElementById('logoutBtn');

  function showLoggedOut() {
    loggedOutAuth.style.display = 'inline-block';
    loggedInAuth.style.display = 'none';
  }

  function showLoggedIn(user) {
    loggedOutAuth.style.display = 'none';
    loggedInAuth.style.display = 'flex';

    const label = (user.name || user.email || '?').trim();
    avatarEl.textContent = label.charAt(0).toUpperCase();
    dropdownNameEl.textContent = user.name || '';
    dropdownEmailEl.textContent = user.email || '';

    if (adminLink) {
      adminLink.style.display = user.role === 'admin' ? 'flex' : 'none';
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
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) throw new Error('not authenticated');
      const data = await res.json();
      showLoggedIn(data.user);
    } catch (err) {
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
