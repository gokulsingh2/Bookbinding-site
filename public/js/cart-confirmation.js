(function () {
  const loadingState = document.getElementById('loadingState');
  const errorState = document.getElementById('errorState');
  const confirmationState = document.getElementById('confirmationState');
  const ordersList = document.getElementById('ordersList');
  const grandTotalEl = document.getElementById('grandTotal');

  function formatPrice(amount) {
    return '₹' + Number(amount || 0).toFixed(2);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function getOrderIds() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('ids') || '';
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }

  async function fetchOrder(id) {
    const res = await fetch(`/api/orders/${id}`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.order;
  }

  async function init() {
    const ids = getOrderIds();
    if (ids.length === 0) {
      loadingState.style.display = 'none';
      errorState.style.display = 'block';
      return;
    }

    const orders = (await Promise.all(ids.map(fetchOrder))).filter(Boolean);

    if (orders.length === 0) {
      loadingState.style.display = 'none';
      errorState.style.display = 'block';
      return;
    }

    ordersList.innerHTML = orders.map((order) => `
      <div class="cart-item">
        <div class="cart-item__details">
          <h3>${escapeHtml(order.service_name)}</h3>
          <p class="cart-item__specs">Order ${escapeHtml(order.order_number)} · Qty × ${order.quantity} · <span class="status-pill">${escapeHtml(order.order_status)}</span></p>
        </div>
        <div class="cart-item__side">
          <span class="cart-item__price">${formatPrice(order.price_estimate)}</span>
        </div>
      </div>
    `).join('');

    const grandTotal = orders.reduce((sum, o) => sum + Number(o.price_estimate || 0), 0);
    grandTotalEl.textContent = formatPrice(grandTotal);

    const stampNumberEl = document.getElementById('stampOrderNumber');
    if (stampNumberEl) {
      stampNumberEl.textContent = orders.length > 1
        ? `#${orders[0].order_number} +${orders.length - 1}`
        : `#${orders[0].order_number}`;
    }

    loadingState.style.display = 'none';
    confirmationState.style.display = 'block';

    if (window.celebrate) window.celebrate();
  }

  init();
})();
