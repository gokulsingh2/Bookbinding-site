(function () {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginResult = document.getElementById('loginResult');
  const registerResult = document.getElementById('registerResult');

  window.showTab = function (tab) {
    loginForm.style.display = tab === 'login' ? 'block' : 'none';
    registerForm.style.display = tab === 'register' ? 'block' : 'none';
    document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
    document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
  };

  function showMessage(el, text, isError) {
    el.textContent = text;
    el.className = isError ? 'err' : 'ok';
  }

  // Already signed in? Send them straight where they were headed instead of
  // showing the login form again.
  async function redirectIfAlreadyLoggedIn() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        window.location.href = window.__REDIRECT_TO__ || '/';
      }
    } catch (err) {
      // Not logged in — stay on the page, nothing to do.
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in…';
    loginResult.textContent = '';
    loginResult.className = '';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        showMessage(loginResult, data.error || 'Something went wrong. Please try again.', true);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Log in';
        return;
      }

      showMessage(loginResult, 'Logged in! Redirecting…', false);
      setTimeout(function () {
        window.location.href = window.__REDIRECT_TO__ || '/';
      }, 400);
    } catch (err) {
      showMessage(loginResult, 'Something went wrong. Please try again.', true);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log in';
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPassword').value;
    const submitBtn = registerForm.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account…';
    registerResult.textContent = '';
    registerResult.className = '';

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, phone, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        showMessage(registerResult, data.error || 'Something went wrong. Please try again.', true);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create account';
        return;
      }

      showMessage(registerResult, 'Account created! Redirecting…', false);
      setTimeout(function () {
        window.location.href = window.__REDIRECT_TO__ || '/';
      }, 400);
    } catch (err) {
      showMessage(registerResult, 'Something went wrong. Please try again.', true);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create account';
    }
  }

  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);

  redirectIfAlreadyLoggedIn();
})();
