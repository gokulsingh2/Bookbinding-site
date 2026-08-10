(function () {
  let services = [];
  let selectedService = null;

  const loginNotice = document.getElementById('loginNotice');
  const formWrapper = document.getElementById('orderFormWrapper');
  const serviceSelect = document.getElementById('serviceSelect');
  const quantityInput = document.getElementById('quantity');
  const fulfillmentSelect = document.getElementById('fulfillmentType');
  const addressField = document.getElementById('addressField');
  const deliveryAddressInput = document.getElementById('deliveryAddress');
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

  function onFulfillmentChange() {
    addressField.style.display = fulfillmentSelect.value === 'pickup' ? 'none' : 'block';
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
    submitBtn.textContent = 'Placing order…';

    let uploadedFileUrl = null;
    try {
      uploadedFileUrl = await uploadFileIfPresent();
    } catch (err) {
      resultEl.textContent = err.message || 'File upload failed. Please try again.';
      resultEl.className = 'err';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Place Order';
      return;
    }

    const payload = {
      serviceId: selectedService.id,
      quantity: parseInt(quantityInput.value, 10) || 1,
      pageCount: document.getElementById('pageCount').value || null,
      paperSize: document.getElementById('paperSize').value,
      printColor: document.getElementById('printColor').value,
      bindingType: document.getElementById('bindingType').value || null,
      paperQuality: document.getElementById('paperQuality').value,
      specialInstructions: document.getElementById('specialInstructions').value || null,
      uploadedFileUrl,
      fulfillmentType: fulfillmentSelect.value,
      deliveryAddress: deliveryAddressInput.value || null,
      isUrgent: document.getElementById('isUrgent').checked,
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        resultEl.textContent = data.error || 'Something went wrong placing your order.';
        resultEl.className = 'err';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Place Order';
        return;
      }

      const order = data.order;
      resultEl.innerHTML = `<strong>Order placed! 🎉 Redirecting to your confirmation…</strong>`;
      resultEl.className = 'ok';

      if (window.celebrate) window.celebrate();
      sessionStorage.setItem('justPlacedOrderId', String(order.id));

      setTimeout(function () {
        window.location.href = `/order/${order.id}/confirmation`;
      }, 550);
    } catch (err) {
      resultEl.textContent = 'Something went wrong. Please try again.';
      resultEl.className = 'err';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Place Order';
    }
  }

  serviceSelect.addEventListener('change', onServiceChange);
  quantityInput.addEventListener('input', updatePriceEstimate);
  fulfillmentSelect.addEventListener('change', onFulfillmentChange);
  orderForm.addEventListener('submit', handleSubmit);

  checkAuthAndInit();
})();
