(function () {
  const loadingState = document.getElementById('loadingState');
  const accessDenied = document.getElementById('accessDenied');
  const galleryContent = document.getElementById('galleryContent');
  const galleryGrid = document.getElementById('galleryGrid');
  const addForm = document.getElementById('addImageForm');
  const addResult = document.getElementById('addResult');
  const serviceSelect = document.getElementById('serviceId');

  async function checkAdminAccess() {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return false;
    const data = await res.json();
    return data.user && data.user.role === 'admin';
  }

  async function loadServiceOptions() {
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      (data.services || []).forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        serviceSelect.appendChild(opt);
      });
    } catch (err) {
      // Non-critical — the form still works without service tagging options.
    }
  }

  async function loadGallery() {
    try {
      const res = await fetch('/api/gallery');
      const data = await res.json();
      renderGrid(data.images || []);
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
          <button data-id="${img.id}" class="btn btn--small btn--danger">Delete</button>
        </figcaption>
      </figure>
    `
      )
      .join('');
  }

  async function handleAdd(e) {
    e.preventDefault();

    const payload = {
      imageUrl: document.getElementById('imageUrl').value,
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
      loadGallery();
    } catch (err) {
      addResult.textContent = 'Something went wrong. Please try again.';
      addResult.className = 'err';
    }
  }

  async function handleGridClick(e) {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    if (!confirm('Delete this photo?')) return;

    await fetch(`/api/gallery/${btn.dataset.id}`, { method: 'DELETE', credentials: 'include' });
    loadGallery();
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
  init();
})();
