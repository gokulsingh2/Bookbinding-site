(function () {
  const loadingState = document.getElementById('loadingState');
  const accessDenied = document.getElementById('accessDenied');
  const servicesContent = document.getElementById('servicesContent');
  const servicesBody = document.getElementById('servicesBody');
  const addForm = document.getElementById('addServiceForm');
  const addResult = document.getElementById('addResult');

  function formatPrice(amount) {
    return '₹' + Number(amount).toFixed(2);
  }

  async function loadServices() {
    try {
      const res = await fetch('/api/services/admin/all', { credentials: 'include' });

      if (!res.ok) {
        loadingState.style.display = 'none';
        accessDenied.style.display = 'block';
        return;
      }

      const data = await res.json();
      renderTable(data.services || []);

      loadingState.style.display = 'none';
      servicesContent.style.display = 'block';
    } catch (err) {
      loadingState.textContent = 'Something went wrong loading services.';
    }
  }

  function renderTable(services) {
    if (services.length === 0) {
      servicesBody.innerHTML = '<tr><td colspan="5">No services yet.</td></tr>';
      return;
    }

    servicesBody.innerHTML = services
      .map(
        (s) => `
      <tr>
        <td>${s.name}</td>
        <td>${formatPrice(s.base_price)} ${s.price_note ? `<span style="color:#999;">(${s.price_note})</span>` : ''}</td>
        <td>${s.turnaround_days} day${s.turnaround_days === 1 ? '' : 's'}</td>
        <td>${s.is_active ? '<span class="status-badge status-badge--ready">Active</span>' : '<span class="status-badge status-badge--delivered">Inactive</span>'}</td>
        <td class="admin-table__actions">
          <button data-action="toggle" data-id="${s.id}" data-active="${s.is_active ? 1 : 0}" class="btn btn--small btn--outline">${s.is_active ? 'Deactivate' : 'Activate'}</button>
          <button data-action="delete" data-id="${s.id}" class="btn btn--small btn--danger">Delete</button>
        </td>
      </tr>
    `
      )
      .join('');
  }

  async function handleAdd(e) {
    e.preventDefault();

    const payload = {
      name: document.getElementById('name').value,
      description: document.getElementById('description').value,
      basePrice: document.getElementById('basePrice').value,
      priceNote: document.getElementById('priceNote').value,
      turnaroundDays: document.getElementById('turnaroundDays').value,
    };

    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        addResult.textContent = data.error || 'Something went wrong.';
        addResult.className = 'err';
        return;
      }

      addResult.textContent = `"${data.service.name}" added.`;
      addResult.className = 'ok';
      addForm.reset();
      document.getElementById('turnaroundDays').value = 3;
      loadServices();
    } catch (err) {
      addResult.textContent = 'Something went wrong. Please try again.';
      addResult.className = 'err';
    }
  }

  async function handleTableClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const id = btn.dataset.id;

    if (btn.dataset.action === 'toggle') {
      const isActive = btn.dataset.active === '1';
      await fetch(`/api/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !isActive }),
      });
      loadServices();
    }

    if (btn.dataset.action === 'delete') {
      if (!confirm('Delete this service? This cannot be undone.')) return;
      const res = await fetch(`/api/services/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Could not delete this service.');
        return;
      }
      loadServices();
    }
  }

  addForm.addEventListener('submit', handleAdd);
  servicesBody.addEventListener('click', handleTableClick);
  loadServices();
})();
