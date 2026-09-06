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

  // Client-side mirror of the server's 48-hour rule — purely for showing/hiding
  // the button promptly. The real enforcement happens server-side.
  const CANCEL_WINDOW_MS = 48 * 60 * 60 * 1000;

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
        .map((order) => {
          const isCancellable = order.order_status !== 'cancelled' && order.order_status !== 'delivered';
          const withinWindow = (Date.now() - new Date(order.created_at).getTime()) <= CANCEL_WINDOW_MS;
          const showCancel = isCancellable && withinWindow;

          return `
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
          ${showCancel ? `<button type="button" class="btn btn--small btn--danger" data-cancel-id="${order.id}" style="margin-top:10px;" onclick="event.preventDefault(); event.stopPropagation();">Cancel Order</button>` : ''}
        </a>
      `;
        })
        .join('');
      ordersList.style.display = 'flex';
    } catch (err) {
      loadingState.textContent = 'Something went wrong loading your orders.';
    }
  }

  async function handleCancel(e) {
    const btn = e.target.closest('button[data-cancel-id]');
    if (!btn) return;

    const confirmed = confirm('Cancel this order? This cannot be undone.');
    if (!confirmed) return;

    btn.disabled = true;
    btn.textContent = 'Cancelling…';

    try {
      const res = await fetch(`/api/orders/${btn.dataset.cancelId}/cancel`, {
        method: 'PUT',
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Something went wrong.');
        btn.disabled = false;
        btn.textContent = 'Cancel Order';
        return;
      }

      loadOrders();
    } catch (err) {
      alert('Something went wrong. Please try again.');
      btn.disabled = false;
      btn.textContent = 'Cancel Order';
    }
  }

  ordersList.addEventListener('click', handleCancel);
  loadOrders();
})();
