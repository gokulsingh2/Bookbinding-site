(function () {
  let services = [];
  let selectedService = null;

  const loginNotice = document.getElementById('loginNotice');
  const formWrapper = document.getElementById('orderFormWrapper');
  const serviceSelect = document.getElementById('serviceSelect');
  const quantityInput = document.getElementById('quantity');
  const priceEstimateEl = document.getElementById('priceEstimate');
  const orderForm = document.getElementById('orderForm');
  const resultEl = document.getElementById('result');

  function formatPrice(amount) {
    return '₹' + Number(amount).toFixed(2);
  }

  function updatePriceEstimate() {
    if (!selectedService) {
      priceEstimateEl.textContent = formatPrice(0);
      return;
    }
    const basePrice = Number(selectedService.base_price);
    if (basePrice === 0) {
      priceEstimateEl.textContent = selectedService.price_note || 'Price on request';
      return;
    }
    const qty = Math.max(1, parseInt(quantityInput.value, 10) || 1);
    const estimate = basePrice * qty;
    priceEstimateEl.textContent = formatPrice(estimate);
  }

  function onServiceChange() {
    const serviceId = serviceSelect.value;
    selectedService = services.find((s) => String(s.id) === String(serviceId)) || null;
    updatePriceEstimate();
  }

  async function loadServices() {
    const res = await fetch('/api/services');
    const data = await res.json();
    services = data.services || [];

    serviceSelect.innerHTML = services
      .map((s) => `<option value="${s.id}">${s.name} — ${formatPrice(s.base_price)} ${s.price_note ? '(' + s.price_note + ')' : ''}</option>`)
      .join('');

    // Preselect based on ?service=slug from the URL, if it matches a loaded service
    if (window.__PRESELECTED_SLUG__) {
      const match = services.find((s) => s.slug === window.__PRESELECTED_SLUG__);
      if (match) {
        serviceSelect.value = match.id;
      }
    }

    onServiceChange();
  }

  async function checkAuthAndInit() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) throw new Error('Not authenticated');

      loginNotice.style.display = 'none';
      formWrapper.style.display = 'block';
      await loadServices();
    } catch (err) {
      loginNotice.style.display = 'block';
      formWrapper.style.display = 'none';
    }
  }

  async function uploadFileIfPresent() {
    const fileInput = document.getElementById('uploadedFile');
    if (!fileInput) return null; // Field not present on this page — nothing to upload.

    const file = fileInput.files[0];
    if (!file) return null;

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/uploads', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'File upload failed');
    }
    return data.url;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!selectedService) {
      resultEl.textContent = 'Please select a service.';
      resultEl.className = 'err';
      return;
    }

    const submitBtn = orderForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding…';

    let uploadedFileUrl = null;
    try {
      uploadedFileUrl = await uploadFileIfPresent();
    } catch (err) {
      resultEl.textContent = err.message || 'File upload failed. Please try again.';
      resultEl.className = 'err';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add to Cart';
      return;
    }

    const quantity = parseInt(quantityInput.value, 10) || 1;

    // This is a cart line item, not a placed order yet — it's saved locally and only
    // becomes a real order (and hits the database) once the customer checks out from /cart.
    const item = {
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      basePrice: Number(selectedService.base_price),
      priceNote: selectedService.price_note || null,
      quantity,
      pageCount: document.getElementById('pageCount').value || null,
      paperSize: document.getElementById('paperSize').value,
      printColor: document.getElementById('printColor').value,
      bindingType: document.getElementById('bindingType').value || null,
      paperQuality: document.getElementById('paperQuality').value,
      specialInstructions: document.getElementById('specialInstructions').value || null,
      uploadedFileUrl,
    };

    window.BBCart.addItem(item);

    resultEl.innerHTML = `<strong>Added to cart! 🛒</strong>`;
    resultEl.className = 'ok';
    document.getElementById('addedActions').style.display = 'flex';
    orderForm.style.display = 'none';

    if (window.celebrate) window.celebrate();
  }

  serviceSelect.addEventListener('change', onServiceChange);
  quantityInput.addEventListener('input', updatePriceEstimate);
  orderForm.addEventListener('submit', handleSubmit);

  checkAuthAndInit();
})();
