(function () {
  const loadingState = document.getElementById('loadingState');
  const accessDenied = document.getElementById('accessDenied');
  const servicesContent = document.getElementById('servicesContent');
  const servicesBody = document.getElementById('servicesBody');
  const addForm = document.getElementById('addServiceForm');
  const addResult = document.getElementById('addResult');
  const serviceImageInput = document.getElementById('serviceImage');
  const serviceImageStatus = document.getElementById('serviceImageStatus');

  const editOverlay = document.getElementById('editServiceOverlay');
  const editForm = document.getElementById('editServiceForm');
  const editClose = document.getElementById('editServiceClose');
  const editCancel = document.getElementById('editServiceCancel');
  const editCurrentImage = document.getElementById('editCurrentImage');
  const editServiceImageInput = document.getElementById('editServiceImage');
  const editServiceImageStatus = document.getElementById('editServiceImageStatus');

  let addPendingImageUrl;   // undefined until a photo is actually uploaded this session
  let editPendingImageUrl;  // undefined = no new photo chosen; existing image_url is kept
  let servicesCache = [];   // last loaded list, so Edit can pre-fill without a refetch

  function formatPrice(amount) {
    return '₹' + Number(amount).toFixed(2);
  }

  async function uploadImage(file, statusEl) {
    statusEl.textContent = 'Uploading…';
    statusEl.className = 'item-editor__file-status';

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/uploads', { method: 'POST', credentials: 'include', body: formData });
      const data = await res.json();

      if (!res.ok) {
        statusEl.textContent = data.error || 'Upload failed. Please try again.';
        statusEl.className = 'item-editor__file-status item-editor__file-status--err';
        return undefined;
      }

      statusEl.textContent = `✓ ${file.name} uploaded`;
      statusEl.className = 'item-editor__file-status item-editor__file-status--ok';
      return data.url;
    } catch (err) {
      statusEl.textContent = 'Upload failed. Please check your connection and try again.';
      statusEl.className = 'item-editor__file-status item-editor__file-status--err';
      return undefined;
    }
  }

  serviceImageInput.addEventListener('change', async () => {
    const file = serviceImageInput.files[0];
    if (!file) return;
    addPendingImageUrl = await uploadImage(file, serviceImageStatus);
  });

  editServiceImageInput.addEventListener('change', async () => {
    const file = editServiceImageInput.files[0];
    if (!file) return;
    editPendingImageUrl = await uploadImage(file, editServiceImageStatus);
  });

  async function loadServices() {
    try {
      const res = await fetch('/api/services/admin/all', { credentials: 'include' });

      if (!res.ok) {
        loadingState.style.display = 'none';
        accessDenied.style.display = 'block';
        return;
      }

      const data = await res.json();
      servicesCache = data.services || [];
      renderTable(servicesCache);

      loadingState.style.display = 'none';
      servicesContent.style.display = 'block';
    } catch (err) {
      loadingState.textContent = 'Something went wrong loading services.';
    }
  }

  function renderTable(services) {
    if (services.length === 0) {
      servicesBody.innerHTML = '<tr><td colspan="6">No services yet.</td></tr>';
      return;
    }

    servicesBody.innerHTML = services
      .map(
        (s) => `
      <tr>
        <td>${s.image_url ? `<img src="${s.image_url}" alt="" style="width:56px;height:40px;object-fit:cover;border-radius:4px;" />` : '<span style="color:#999;">No photo</span>'}</td>
        <td>${s.name}</td>
        <td>${formatPrice(s.base_price)} ${s.price_note ? `<span style="color:#999;">(${s.price_note})</span>` : ''}</td>
        <td>${s.turnaround_days} day${s.turnaround_days === 1 ? '' : 's'}</td>
        <td>${s.is_active ? '<span class="status-badge status-badge--ready">Active</span>' : '<span class="status-badge status-badge--delivered">Inactive</span>'}</td>
        <td class="admin-table__actions">
          <button data-action="edit" data-id="${s.id}" class="btn btn--small btn--outline">Edit</button>
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
      imageUrl: addPendingImageUrl || null,
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
      addPendingImageUrl = undefined;
      serviceImageStatus.textContent = '';
      loadServices();
    } catch (err) {
      addResult.textContent = 'Something went wrong. Please try again.';
      addResult.className = 'err';
    }
  }

  function openEdit(service) {
    editPendingImageUrl = undefined;
    document.getElementById('editServiceId').value = service.id;
    document.getElementById('editName').value = service.name;
    document.getElementById('editDescription').value = service.description || '';
    document.getElementById('editBasePrice').value = service.base_price;
    document.getElementById('editPriceNote').value = service.price_note || '';
    document.getElementById('editTurnaroundDays').value = service.turnaround_days;
    editServiceImageInput.value = '';
    editServiceImageStatus.textContent = '';
    editServiceImageStatus.className = 'item-editor__file-status';

    if (service.image_url) {
      editCurrentImage.src = service.image_url;
      editCurrentImage.style.display = 'block';
    } else {
      editCurrentImage.style.display = 'none';
    }

    editOverlay.classList.add('is-active');
    document.body.style.overflow = 'hidden';
  }

  function closeEdit() {
    editOverlay.classList.remove('is-active');
    document.body.style.overflow = '';
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('editServiceId').value;

    const payload = {
      name: document.getElementById('editName').value,
      description: document.getElementById('editDescription').value,
      basePrice: document.getElementById('editBasePrice').value,
      priceNote: document.getElementById('editPriceNote').value,
      turnaroundDays: document.getElementById('editTurnaroundDays').value,
    };
    // Only send imageUrl if a new photo was actually uploaded this session —
    // leaving the key out entirely keeps whatever photo the service already had.
    if (editPendingImageUrl !== undefined) {
      payload.imageUrl = editPendingImageUrl;
    }

    try {
      const res = await fetch(`/api/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        editServiceImageStatus.textContent = data.error || 'Something went wrong saving changes.';
        editServiceImageStatus.className = 'item-editor__file-status item-editor__file-status--err';
        return;
      }
      closeEdit();
      loadServices();
    } catch (err) {
      editServiceImageStatus.textContent = 'Something went wrong. Please try again.';
      editServiceImageStatus.className = 'item-editor__file-status item-editor__file-status--err';
    }
  }

  async function handleTableClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const id = btn.dataset.id;

    if (btn.dataset.action === 'edit') {
      const service = servicesCache.find((s) => String(s.id) === String(id));
      if (service) openEdit(service);
    }

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
  editForm.addEventListener('submit', handleEditSubmit);
  editClose.addEventListener('click', closeEdit);
  editCancel.addEventListener('click', closeEdit);
  editOverlay.addEventListener('click', (e) => { if (e.target === editOverlay) closeEdit(); });
  loadServices();
})();
