// Shared item-spec editor modal. Opened from the cart page to let the customer
// set paper size, print color, binding, quality, page count, special instructions,
// and attach a file for a single cart line item. Injects its own markup into the
// DOM on first use so any page can call window.BBItemEditor.open(...) without
// needing modal HTML baked into that page's EJS template.
(function (window) {
  const PAPER_SIZES = ['A1', 'A2', 'A3', 'A4'];
  const BINDING_TYPES = [
    { value: '', label: '— None — (leave as None for posters)' },
    { value: 'spiral', label: 'Spiral Binding' },
    { value: 'soft_bind', label: 'Soft Bind' },
    { value: 'perfect_binding', label: 'Perfect Binding' },
    { value: 'digital_embossing', label: 'Digital Embossing' },
    { value: 'handmade_embossing', label: 'Hand-made Embossing' },
  ];
  const PAPER_QUALITIES = ['70gsm', '85gsm', '100gsm', '150gsm', '200gsm', '250gsm', '300gsm', 'glossy'];
  const PAPER_QUALITY_LABELS = {
    '70gsm': '70 GSM', '85gsm': '85 GSM', '100gsm': '100 GSM', '150gsm': '150 GSM',
    '200gsm': '200 GSM', '250gsm': '250 GSM', '300gsm': '300 GSM', glossy: 'Glossy',
  };

  let overlay, form, fileInput, fileStatus, currentItem, currentOnSave, pendingFileUrl;

  function buildModal() {
    if (document.getElementById('itemEditorOverlay')) return;

    overlay = document.createElement('div');
    overlay.id = 'itemEditorOverlay';
    overlay.className = 'item-editor-overlay';
    overlay.innerHTML = `
      <div class="item-editor" role="dialog" aria-modal="true" aria-labelledby="itemEditorTitle">
        <div class="item-editor__head">
          <h2 id="itemEditorTitle">Customize Order</h2>
          <button type="button" class="item-editor__close" aria-label="Close">&times;</button>
        </div>
        <form id="itemEditorForm" class="order-form">
          <div class="order-form__row">
            <div>
              <label for="ieQuantity">Quantity</label>
              <input type="number" id="ieQuantity" min="1" required />
            </div>
            <div>
              <label for="iePageCount">Page count (optional)</label>
              <input type="number" id="iePageCount" min="1" />
            </div>
          </div>

          <div class="order-form__row">
            <div>
              <label for="iePaperSize">Paper size</label>
              <select id="iePaperSize">${PAPER_SIZES.map((s) => `<option value="${s}">${s}</option>`).join('')}</select>
            </div>
            <div>
              <label for="iePrintColor">Print color</label>
              <select id="iePrintColor">
                <option value="bw">Black &amp; White</option>
                <option value="color">Color</option>
              </select>
            </div>
          </div>

          <div class="order-form__row">
            <div>
              <label for="ieBindingType">Binding type</label>
              <select id="ieBindingType">${BINDING_TYPES.map((b) => `<option value="${b.value}">${b.label}</option>`).join('')}</select>
            </div>
            <div>
              <label for="iePaperQuality">Paper quality</label>
              <select id="iePaperQuality">${PAPER_QUALITIES.map((q) => `<option value="${q}">${PAPER_QUALITY_LABELS[q]}</option>`).join('')}</select>
            </div>
          </div>

          <label for="ieInstructions">Special instructions (optional)</label>
          <textarea id="ieInstructions" rows="2" placeholder="Anything we should know about this item?"></textarea>

          <label for="ieFile">Attach a file (optional)</label>
          <input type="file" id="ieFile" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif" />
          <p id="ieFileStatus" class="item-editor__file-status"></p>

          <div class="item-editor__actions">
            <button type="button" class="btn btn--outline" id="ieCancel">Cancel</button>
            <button type="submit" class="btn btn--primary">Save Changes</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);

    form = document.getElementById('itemEditorForm');
    fileInput = document.getElementById('ieFile');
    fileStatus = document.getElementById('ieFileStatus');

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('.item-editor__close').addEventListener('click', close);
    document.getElementById('ieCancel').addEventListener('click', close);
    fileInput.addEventListener('change', handleFileSelect);
    form.addEventListener('submit', handleSubmit);
  }

  async function handleFileSelect() {
    const file = fileInput.files[0];
    if (!file) return;

    fileStatus.textContent = 'Uploading…';
    fileStatus.className = 'item-editor__file-status';

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/uploads', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        fileStatus.textContent = data.error || 'Upload failed. Please try again.';
        fileStatus.className = 'item-editor__file-status item-editor__file-status--err';
        pendingFileUrl = undefined;
        fileInput.value = '';
        return;
      }

      pendingFileUrl = data.url;
      fileStatus.textContent = `✓ ${file.name} attached`;
      fileStatus.className = 'item-editor__file-status item-editor__file-status--ok';
    } catch (err) {
      fileStatus.textContent = 'Upload failed. Please check your connection and try again.';
      fileStatus.className = 'item-editor__file-status item-editor__file-status--err';
      pendingFileUrl = undefined;
      fileInput.value = '';
    }
  }

  function handleSubmit(e) {
    e.preventDefault();

    const patch = {
      quantity: Math.max(1, parseInt(document.getElementById('ieQuantity').value, 10) || 1),
      pageCount: document.getElementById('iePageCount').value || null,
      paperSize: document.getElementById('iePaperSize').value,
      printColor: document.getElementById('iePrintColor').value,
      bindingType: document.getElementById('ieBindingType').value || null,
      paperQuality: document.getElementById('iePaperQuality').value,
      specialInstructions: document.getElementById('ieInstructions').value.trim() || null,
      // pendingFileUrl is undefined if nothing new was uploaded this session — keep
      // whatever the item already had. It's null only if upload failed outright.
      uploadedFileUrl: pendingFileUrl !== undefined ? pendingFileUrl : (currentItem && currentItem.uploadedFileUrl) || null,
    };

    if (currentOnSave) currentOnSave(patch);
    close();
  }

  function open(item, onSave) {
    buildModal();
    currentItem = item;
    currentOnSave = onSave;
    pendingFileUrl = undefined;

    document.getElementById('ieQuantity').value = item.quantity || 1;
    document.getElementById('iePageCount').value = item.pageCount || '';
    document.getElementById('iePaperSize').value = item.paperSize || 'A4';
    document.getElementById('iePrintColor').value = item.printColor || 'bw';
    document.getElementById('ieBindingType').value = item.bindingType || '';
    document.getElementById('iePaperQuality').value = item.paperQuality || '70gsm';
    document.getElementById('ieInstructions').value = item.specialInstructions || '';
    fileInput.value = '';
    fileStatus.textContent = item.uploadedFileUrl ? '✓ A file is already attached — choose a new one to replace it' : '';
    fileStatus.className = 'item-editor__file-status';

    overlay.classList.add('is-active');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove('is-active');
    document.body.style.overflow = '';
  }

  window.BBItemEditor = { open, close };
})(window);
