(function () {
  const loadingState = document.getElementById('loadingState');
  const errorState = document.getElementById('errorState');
  const errorMessage = document.getElementById('errorMessage');
  const confirmationState = document.getElementById('confirmationState');

  const fulfillmentLabels = {
    pickup: 'Pickup',
    local_delivery: 'Local Delivery',
    shipping: 'Shipping',
  };

  function formatPrice(amount) {
    const n = Number(amount);
    if (!n || isNaN(n)) return 'Price on request';
    return '₹' + n.toFixed(2);
  }

  async function loadOrder() {
    if (!window.__ORDER_ID__) {
      showError('No order specified.');
      return;
    }

    try {
      const res = await fetch(`/api/orders/${window.__ORDER_ID__}`, { credentials: 'include' });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          showError('Please log in to view this order.');
        } else if (res.status === 403) {
          showError("This order doesn't belong to your account.");
        } else {
          showError(data.error || 'We could not load this order.');
        }
        return;
      }

      renderOrder(data.order);
    } catch (err) {
      showError('Something went wrong loading your order.');
    }
  }

  function showError(message) {
    loadingState.style.display = 'none';
    errorMessage.textContent = message;
    errorState.style.display = 'block';
  }

  function renderOrder(order) {
    document.getElementById('orderNumber').textContent = order.order_number;
    document.getElementById('serviceName').textContent = order.service_name;
    document.getElementById('quantity').textContent = order.quantity;
    document.getElementById('fulfillment').textContent = fulfillmentLabels[order.fulfillment_type] || order.fulfillment_type;

    const priceEl = document.getElementById('priceEstimate');
    priceEl.textContent = formatPrice(order.final_price || order.price_estimate);

    document.getElementById('orderStatus').textContent = order.order_status;

    if (order.special_instructions) {
      document.getElementById('specialInstructions').textContent = order.special_instructions;
      document.getElementById('notesSection').style.display = 'block';
    }

    if (order.uploaded_file_url) {
      const fileSection = document.getElementById('fileSection');
      const fileLink = document.getElementById('uploadedFileLink');
      if (fileSection && fileLink) {
        fileLink.href = order.uploaded_file_url;
        fileLink.textContent = 'View uploaded file';
        fileSection.style.display = 'block';
      }
    }

    loadingState.style.display = 'none';
    confirmationState.style.display = 'block';

    // Only celebrate right after actually placing this order — not on every future
    // visit to this confirmation page (e.g. reopening an old email link weeks later).
    const justPlacedId = sessionStorage.getItem('justPlacedOrderId');
    if (justPlacedId === String(order.id)) {
      sessionStorage.removeItem('justPlacedOrderId');
      if (window.celebrate) window.celebrate();
    }
  }

  loadOrder();
})();
