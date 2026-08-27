(function () {
  const loadingState = document.getElementById('loadingState');
  const loginNotice = document.getElementById('loginNotice');
  const profileCard = document.getElementById('profileCard');
  const avatarEl = document.getElementById('profileAvatar');
  const nameInput = document.getElementById('profileName');
  const emailInput = document.getElementById('profileEmail');
  const form = document.getElementById('profileForm');
  const saveBtn = document.getElementById('profileSaveBtn');
  const resultEl = document.getElementById('profileResult');

  function showResult(message, isError) {
    resultEl.textContent = message;
    resultEl.style.color = isError ? '#c0392b' : '#2e7d32';
  }

  async function init() {
    const authState = await window.__BBAuthCheck;
    loadingState.style.display = 'none';

    if (!authState.loggedIn) {
      loginNotice.style.display = 'block';
      return;
    }

    const user = authState.user;
    avatarEl.textContent = (user.name || user.email || '?').trim().charAt(0).toUpperCase();
    nameInput.value = user.name || '';
    emailInput.value = user.email || '';
    profileCard.style.display = 'block';
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) {
      showResult('Name cannot be empty.', true);
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    showResult('', false);

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      });
      const data = await res.json();

      if (!res.ok) {
        showResult(data.error || 'Something went wrong.', true);
        return;
      }

      avatarEl.textContent = (data.user.name || '?').trim().charAt(0).toUpperCase();
      const dropdownNameEl = document.getElementById('accountDropdownName');
      if (dropdownNameEl) dropdownNameEl.textContent = data.user.name || '';

      showResult('Saved!', false);
    } catch (err) {
      showResult('Network error — please try again.', true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save changes';
    }
  });

  init();
})();
