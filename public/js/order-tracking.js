(function () {
  const loadingState = document.getElementById('loadingState');
  const errorState = document.getElementById('errorState');
  const errorMessage = document.getElementById('errorMessage');
  const orderDetail = document.getElementById('orderDetail');
  const timelineEl = document.getElementById('timeline');

  const fulfillmentLabels = {
    pickup: 'Pickup',
    local_delivery: 'Local Delivery',
    shipping: 'Shipping',
  };

  const statusLabels = {
    received: 'Order Received',
    in_progress: 'In Progress',
    ready: 'Ready',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };

  // The expected order a normal (non-cancelled) order moves through.
  // Used to show upcoming steps as "pending" even before they've happened.
  const STANDARD_SEQUENCE = ['received', 'in_progress', 'ready', 'delivered'];

  function formatPrice(amount) {
    return '₹' + Number(amount).toFixed(2);
  }

  function formatDateTime(dateStr) {
    return new Date(dateStr).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        if (res.status === 401) showError('Please log in to view this order.');
        else if (res.status === 403) showError("This order doesn't belong to your account.");
        else showError(data.error || 'We could not load this order.');
        return;
      }

      render(data.order, data.history || []);
    } catch (err) {
      showError('Something went wrong loading this order.');
    }
  }

  function showError(message) {
    loadingState.style.display = 'none';
    errorMessage.textContent = message;
    errorState.style.display = 'block';
  }

  function render(order, history) {
    document.getElementById('orderNumber').textContent = order.order_number;
    document.getElementById('serviceName').textContent = order.service_name;
    document.getElementById('quantity').textContent = order.quantity;
    document.getElementById('fulfillment').textContent = fulfillmentLabels[order.fulfillment_type] || order.fulfillment_type;
    document.getElementById('priceEstimate').textContent = formatPrice(order.price_estimate);

    renderTimeline(order, history);

    loadingState.style.display = 'none';
    orderDetail.style.display = 'block';
  }

  function renderTimeline(order, history) {
    // Build a lookup of when each status was actually reached, from the real history log.
    const reachedAt = {};
    history.forEach((entry) => {
      reachedAt[entry.status] = entry;
    });

    if (order.order_status === 'cancelled') {
      const cancelEntry = history.find((h) => h.status === 'cancelled');
      timelineEl.innerHTML = `
        <li class="timeline__item timeline__item--cancelled">
          <span class="timeline__dot"></span>
          <div>
            <strong>Order Cancelled</strong>
            ${cancelEntry ? `<div class="timeline__date">${formatDateTime(cancelEntry.changed_at)}</div>` : ''}
            ${cancelEntry && cancelEntry.note ? `<div class="timeline__note">${cancelEntry.note}</div>` : ''}
          </div>
        </li>
      `;
      return;
    }

    const currentIndex = STANDARD_SEQUENCE.indexOf(order.order_status);

    timelineEl.innerHTML = STANDARD_SEQUENCE.map((status, index) => {
      const entry = reachedAt[status];
      const isDone = index <= currentIndex;
      const isCurrent = index === currentIndex;

      let stateClass = 'timeline__item--pending';
      if (isDone && !isCurrent) stateClass = 'timeline__item--done';
      if (isCurrent) stateClass = 'timeline__item--current';

      return `
        <li class="timeline__item ${stateClass}">
          <span class="timeline__dot"></span>
          <div>
            <strong>${statusLabels[status]}</strong>
            ${entry ? `<div class="timeline__date">${formatDateTime(entry.changed_at)}</div>` : '<div class="timeline__date">Pending</div>'}
            ${entry && entry.note ? `<div class="timeline__note">${entry.note}</div>` : ''}
          </div>
        </li>
      `;
    }).join('');
  }

  loadOrder();
})();
