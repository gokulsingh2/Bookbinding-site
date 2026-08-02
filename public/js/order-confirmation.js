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
    return '₹' + Number(amount).toFixed(2);
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
    document.getElementById('priceEstimate').textContent = formatPrice(order.price_estimate);
    document.getElementById('orderStatus').textContent = order.order_status;

    if (order.special_instructions) {
      document.getElementById('specialInstructions').textContent = order.special_instructions;
      document.getElementById('notesSection').style.display = 'block';
    }

    loadingState.style.display = 'none';
    confirmationState.style.display = 'block';
  }

  loadOrder();
})();
