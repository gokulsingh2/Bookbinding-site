(function () {
  const loadingState = document.getElementById('loadingState');
  const accessDenied = document.getElementById('accessDenied');
  const messagesContent = document.getElementById('messagesContent');
  const emptyState = document.getElementById('emptyState');
  const messagesList = document.getElementById('messagesList');

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function formatDateTime(dateStr) {
    return new Date(dateStr).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function render(messages) {
    if (messages.length === 0) {
      emptyState.style.display = 'block';
      messagesList.style.display = 'none';
      return;
    }

    messagesList.innerHTML = messages
      .map(
        (m) => `
      <div class="message-card">
        <div class="message-card__top">
          <div>
            <strong>${escapeHtml(m.name)}</strong>
            <a href="mailto:${escapeHtml(m.email)}" class="message-card__email">${escapeHtml(m.email)}</a>
          </div>
          <span class="message-card__date">${formatDateTime(m.created_at)}</span>
        </div>
        <p class="message-card__body">${escapeHtml(m.message)}</p>
      </div>
    `
      )
      .join('');
  }

  async function init() {
    try {
      const res = await fetch('/api/contact/admin/all', { credentials: 'include' });

      if (!res.ok) {
        loadingState.style.display = 'none';
        accessDenied.style.display = 'block';
        return;
      }

      const data = await res.json();
      render(data.messages || []);

      loadingState.style.display = 'none';
      messagesContent.style.display = 'block';
    } catch (err) {
      loadingState.textContent = 'Something went wrong loading messages.';
    }
  }

  init();
})();
