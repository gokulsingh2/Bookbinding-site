(function () {
  const loadingState = document.getElementById('loadingState');
  const loginNotice = document.getElementById('loginNotice');
  const emptyState = document.getElementById('emptyState');
  const ordersList = document.getElementById('ordersList');

  const statusLabels = {
    received: 'Received',
    in_progress: 'In Progress',
    ready: 'Ready',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };

  function formatPrice(amount) {
    return '₹' + Number(amount).toFixed(2);
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  async function loadOrders() {
    try {
      const res = await fetch('/api/orders/my', { credentials: 'include' });

      if (!res.ok) {
        loadingState.style.display = 'none';
        loginNotice.style.display = 'block';
        return;
      }

      const data = await res.json();
      const orders = data.orders || [];

      loadingState.style.display = 'none';

      if (orders.length === 0) {
        emptyState.style.display = 'block';
        return;
      }

      ordersList.innerHTML = orders
        .map(
          (order) => `
        <a href="/my-orders/${order.id}" class="order-card">
          <div class="order-card__top">
            <strong>${order.order_number}</strong>
            <span class="status-badge status-badge--${order.order_status}">${statusLabels[order.order_status] || order.order_status}</span>
          </div>
          <p class="order-card__service">${order.service_name} &times; ${order.quantity}</p>
          <div class="order-card__bottom">
            <span>${formatDate(order.created_at)}</span>
            <strong>${formatPrice(order.price_estimate)}</strong>
          </div>
        </a>
      `
        )
        .join('');
      ordersList.style.display = 'flex';
    } catch (err) {
      loadingState.textContent = 'Something went wrong loading your orders.';
    }
  }

  loadOrders();
})();
