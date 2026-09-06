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
      // Same text element, same styling/animation as before — just populated with one
      // tspan per order number (stacked below the first) instead of a single line.
      // Capped so a large multi-item cart doesn't overflow the circular stamp.
      const MAX_STAMP_LINES = 3;
      const LINE_HEIGHT = 20;

      while (stampNumberEl.firstChild) stampNumberEl.removeChild(stampNumberEl.firstChild);

      const numbers = orders.map((o) => `#${o.order_number}`);
      const shown = numbers.slice(0, MAX_STAMP_LINES);
      const extra = numbers.length - shown.length;

      shown.forEach((num, i) => {
        const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        tspan.setAttribute('x', '110');
        if (i > 0) tspan.setAttribute('dy', String(LINE_HEIGHT));
        tspan.textContent = num;
        stampNumberEl.appendChild(tspan);
      });

      if (extra > 0) {
        const moreTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        moreTspan.setAttribute('x', '110');
        moreTspan.setAttribute('dy', String(LINE_HEIGHT));
        moreTspan.textContent = `+${extra} more`;
        stampNumberEl.appendChild(moreTspan);
      }
    }

    loadingState.style.display = 'none';
    confirmationState.style.display = 'block';

    if (window.celebrate) window.celebrate();
  }

  init();
})();
