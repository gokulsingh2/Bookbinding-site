(function () {
  const loadingState = document.getElementById('loadingState');
  const accessDenied = document.getElementById('accessDenied');
  const galleryContent = document.getElementById('galleryContent');
  const galleryGrid = document.getElementById('galleryGrid');
  const addForm = document.getElementById('addImageForm');
  const addResult = document.getElementById('addResult');
  const serviceSelect = document.getElementById('serviceId');
  const galleryImageFile = document.getElementById('galleryImageFile');
  const galleryImageStatus = document.getElementById('galleryImageStatus');
  const imageUrlInput = document.getElementById('imageUrl');

  const editOverlay = document.getElementById('editImageOverlay');
  const editForm = document.getElementById('editImageForm');
  const editClose = document.getElementById('editImageClose');
  const editCancel = document.getElementById('editImageCancel');
  const editCurrentImage = document.getElementById('editCurrentImage');
  const editImageFile = document.getElementById('editImageFile');
  const editImageStatus = document.getElementById('editImageStatus');
  const editServiceSelect = document.getElementById('editServiceId');

  let addPendingImageUrl;   // set once a file finishes uploading in the Add form
  let editPendingImageUrl;  // undefined = keep existing photo; a value = swap to it
  let galleryCache = [];

  async function checkAdminAccess() {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return false;
    const data = await res.json();
    return data.user && data.user.role === 'admin';
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

  galleryImageFile.addEventListener('change', async () => {
    const file = galleryImageFile.files[0];
    if (!file) return;
    addPendingImageUrl = await uploadImage(file, galleryImageStatus);
    if (addPendingImageUrl) imageUrlInput.value = '';
  });

  editImageFile.addEventListener('change', async () => {
    const file = editImageFile.files[0];
    if (!file) return;
    editPendingImageUrl = await uploadImage(file, editImageStatus);
  });

  function populateServiceOptions(selectEl, services) {
    selectEl.innerHTML = '<option value="">— None —</option>';
    services.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      selectEl.appendChild(opt);
    });
  }

  async function loadServiceOptions() {
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      const services = data.services || [];
      populateServiceOptions(serviceSelect, services);
      populateServiceOptions(editServiceSelect, services);
    } catch (err) {
      // Non-critical — the forms still work without service tagging options.
    }
  }

  async function loadGallery() {
    try {
      const res = await fetch('/api/gallery');
      const data = await res.json();
      galleryCache = data.images || [];
      renderGrid(galleryCache);
    } catch (err) {
      galleryGrid.innerHTML = '<p>Could not load gallery images.</p>';
    }
  }

  function renderGrid(images) {
    if (images.length === 0) {
      galleryGrid.innerHTML = '<p>No photos yet.</p>';
      return;
    }
    galleryGrid.innerHTML = images
      .map(
        (img) => `
      <figure class="gallery-item">
        <img src="${img.image_url}" alt="${img.caption || ''}" loading="lazy" />
        <figcaption>
          <span>${img.caption || '(no caption)'}</span>
          <span class="admin-table__actions">
            <button data-action="edit" data-id="${img.id}" class="btn btn--small btn--outline">Edit</button>
            <button data-action="delete" data-id="${img.id}" class="btn btn--small btn--danger">Delete</button>
          </span>
        </figcaption>
      </figure>
    `
      )
      .join('');
  }

  async function handleAdd(e) {
    e.preventDefault();

    const imageUrl = addPendingImageUrl || imageUrlInput.value.trim();
    if (!imageUrl) {
      addResult.textContent = 'Upload a photo or paste an image URL first.';
      addResult.className = 'err';
      return;
    }

    const payload = {
      imageUrl,
      caption: document.getElementById('caption').value,
      serviceId: serviceSelect.value || null,
    };

    try {
      const res = await fetch('/api/gallery', {
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

      addResult.textContent = 'Photo added.';
      addResult.className = 'ok';
      addForm.reset();
      addPendingImageUrl = undefined;
      galleryImageStatus.textContent = '';
      loadGallery();
    } catch (err) {
      addResult.textContent = 'Something went wrong. Please try again.';
      addResult.className = 'err';
    }
  }

  function openEdit(image) {
    editPendingImageUrl = undefined;
    document.getElementById('editImageId').value = image.id;
    document.getElementById('editCaption').value = image.caption || '';
    editServiceSelect.value = image.service_id || '';
    editImageFile.value = '';
    editImageStatus.textContent = '';
    editImageStatus.className = 'item-editor__file-status';
    editCurrentImage.src = image.image_url;
    editCurrentImage.style.display = 'block';

    editOverlay.classList.add('is-active');
    document.body.style.overflow = 'hidden';
  }

  function closeEdit() {
    editOverlay.classList.remove('is-active');
    document.body.style.overflow = '';
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('editImageId').value;

    const payload = {
      caption: document.getElementById('editCaption').value,
      serviceId: editServiceSelect.value || null,
    };
    // Only send imageUrl if a new photo was actually uploaded this session —
    // leaving the key out entirely keeps the existing photo.
    if (editPendingImageUrl !== undefined) {
      payload.imageUrl = editPendingImageUrl;
    }

    try {
      const res = await fetch(`/api/gallery/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        editImageStatus.textContent = data.error || 'Something went wrong saving changes.';
        editImageStatus.className = 'item-editor__file-status item-editor__file-status--err';
        return;
      }
      closeEdit();
      loadGallery();
    } catch (err) {
      editImageStatus.textContent = 'Something went wrong. Please try again.';
      editImageStatus.className = 'item-editor__file-status item-editor__file-status--err';
    }
  }

  async function handleGridClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;

    if (btn.dataset.action === 'edit') {
      const image = galleryCache.find((img) => String(img.id) === String(id));
      if (image) openEdit(image);
    }

    if (btn.dataset.action === 'delete') {
      if (!confirm('Delete this photo?')) return;
      await fetch(`/api/gallery/${id}`, { method: 'DELETE', credentials: 'include' });
      loadGallery();
    }
  }

  async function init() {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      loadingState.style.display = 'none';
      accessDenied.style.display = 'block';
      return;
    }

    await loadServiceOptions();
    await loadGallery();

    loadingState.style.display = 'none';
    galleryContent.style.display = 'block';
  }

  addForm.addEventListener('submit', handleAdd);
  galleryGrid.addEventListener('click', handleGridClick);
  editForm.addEventListener('submit', handleEditSubmit);
  editClose.addEventListener('click', closeEdit);
  editCancel.addEventListener('click', closeEdit);
  editOverlay.addEventListener('click', (e) => { if (e.target === editOverlay) closeEdit(); });
  init();
})();
