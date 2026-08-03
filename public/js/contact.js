(function () {
  const form = document.getElementById('contactForm');
  const resultEl = document.getElementById('result');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      name: document.getElementById('name').value,
      email: document.getElementById('email').value,
      message: document.getElementById('message').value,
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      resultEl.textContent = data.message || data.error;
      resultEl.className = res.ok ? 'ok' : 'err';

      if (res.ok) form.reset();
    } catch (err) {
      resultEl.textContent = 'Something went wrong. Please try again.';
      resultEl.className = 'err';
    }
  });
})();
