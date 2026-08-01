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
    const qty = Math.max(1, parseInt(quantityInput.value, 10) || 1);
    const estimate = Number(selectedService.base_price) * qty;
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

  async function handleSubmit(e) {
    e.preventDefault();

    if (!selectedService) {
      resultEl.textContent = 'Please select a service.';
      resultEl.className = 'err';
      return;
    }

    const payload = {
      serviceId: selectedService.id,
      quantity: parseInt(quantityInput.value, 10) || 1,
      pageCount: document.getElementById('pageCount').value || null,
      coverType: document.getElementById('coverType').value || null,
      coverColor: document.getElementById('coverColor').value || null,
      specialInstructions: document.getElementById('specialInstructions').value || null,
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
        return;
      }

      const order = data.order;
      resultEl.innerHTML = `
        <strong>Order placed! 🎉</strong><br>
        Order number: <strong>${order.order_number}</strong><br>
        Estimated price: <strong>${formatPrice(order.price_estimate)}</strong><br>
        Status: ${order.order_status}
      `;
      resultEl.className = 'ok';
      orderForm.reset();
      onFulfillmentChange();
      onServiceChange();
    } catch (err) {
      resultEl.textContent = 'Something went wrong. Please try again.';
      resultEl.className = 'err';
    }
  }

  serviceSelect.addEventListener('change', onServiceChange);
  quantityInput.addEventListener('input', updatePriceEstimate);
  fulfillmentSelect.addEventListener('change', onFulfillmentChange);
  orderForm.addEventListener('submit', handleSubmit);

  checkAuthAndInit();
})();
