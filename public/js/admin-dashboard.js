(function () {
  const loadingState = document.getElementById('loadingState');
  const accessDenied = document.getElementById('accessDenied');
  const dashboardContent = document.getElementById('dashboardContent');

  const REFRESH_INTERVAL_MS = 25000;
  let lastKnownOrderCount = null;
  let isFirstLoad = true;

  const statusLabels = {
    received: 'Received',
    in_progress: 'In Progress',
    ready: 'Ready',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };

  function formatPrice(amount) {
    const n = Number(amount);
    return n > 0 ? '₹' + n.toFixed(2) : 'Price on request';
  }

  // Revenue is a real aggregate total, not a single order's price — ₹0.00 there
  // means "no revenue yet", not "price on request", so it never uses formatPrice.
  function formatRevenue(amount) {
    return '₹' + Number(amount).toFixed(2);
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // Small floating confirmation message — reuses the same .bb-toast styling
  // used elsewhere on the site (e.g. "Added to cart!"), so new-order alerts
  // look consistent with the rest of the app.
  function showToast(message) {
    let toast = document.getElementById('bbToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'bbToast';
      toast.className = 'bb-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    void toast.offsetWidth;
    toast.classList.add('bb-toast--visible');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
      toast.classList.remove('bb-toast--visible');
    }, 3200);
  }

  // Briefly flashes the Total Orders card so a new order is noticeable even
  // if the person isn't looking directly at the number when it updates.
  function pulseTotalCard() {
    const card = document.getElementById('statTotal');
    const wrapper = card && card.closest('.stat-card');
    if (!wrapper) return;
    wrapper.classList.remove('stat-card--pulse');
    void wrapper.offsetWidth;
    wrapper.classList.add('stat-card--pulse');
    setTimeout(() => wrapper.classList.remove('stat-card--pulse'), 1500);
  }

  async function init() {
    try {
      const res = await fetch('/api/orders/admin/all', { credentials: 'include' });

      if (!res.ok) {
        loadingState.style.display = 'none';
        accessDenied.style.display = 'block';
        return;
      }

      const data = await res.json();
      const orders = data.orders || [];

      // On every load after the first, compare against what we last saw so we
      // can surface a "N new orders" toast rather than a silent number change.
      if (!isFirstLoad && lastKnownOrderCount !== null && orders.length > lastKnownOrderCount) {
        const newCount = orders.length - lastKnownOrderCount;
        showToast(newCount === 1 ? '1 new order just came in' : `${newCount} new orders just came in`);
        pulseTotalCard();
      }
      lastKnownOrderCount = orders.length;
      isFirstLoad = false;

      renderStats(orders);
      renderRecent(orders.slice(0, 10));

      // Messages count is a nice-to-have on this dashboard — if it fails to load,
      // the rest of the dashboard (which already loaded successfully) still shows.
      try {
        const msgRes = await fetch('/api/contact/admin/all', { credentials: 'include' });
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          document.getElementById('statMessages').textContent = (msgData.messages || []).length;
        }
      } catch (msgErr) {
        // leave the messages stat at its default 0 rather than failing the whole dashboard
      }

      loadingState.style.display = 'none';
      dashboardContent.style.display = 'block';
    } catch (err) {
      // A background refresh failing shouldn't wipe out an already-visible dashboard —
      // only show the loading-failed message if this was the very first load.
      if (isFirstLoad) {
        loadingState.textContent = 'Something went wrong loading the dashboard.';
      }
    }
  }

  function renderStats(orders) {
    const counts = { received: 0, in_progress: 0, ready: 0, delivered: 0 };
    let revenue = 0;
    let urgentCount = 0;

    orders.forEach((o) => {
      if (counts[o.order_status] !== undefined) counts[o.order_status]++;
      if (o.order_status !== 'cancelled') {
        revenue += Number(o.final_price || o.price_estimate || 0);
      }
      if (o.is_urgent && o.order_status !== 'cancelled') urgentCount++;
    });

    document.getElementById('statTotal').textContent = orders.length;
    document.getElementById('statReceived').textContent = counts.received;
    document.getElementById('statInProgress').textContent = counts.in_progress;
    document.getElementById('statReady').textContent = counts.ready;
    document.getElementById('statDelivered').textContent = counts.delivered;
    document.getElementById('statUrgent').textContent = urgentCount;
    document.getElementById('statRevenue').textContent = formatRevenue(revenue);
  }

  function renderRecent(orders) {
    const tbody = document.getElementById('recentOrdersBody');
    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">No orders yet.</td></tr>';
      return;
    }

    tbody.innerHTML = orders
      .map(
        (o) => `
      <tr onclick="window.location.href='/admin/orders/${o.id}'" style="cursor:pointer;" class="${o.is_urgent ? 'order-row--urgent' : ''}">
        <td>${o.order_number}${o.is_urgent ? ' <span class="flag-badge flag-badge--urgent">Urgent</span>' : ''}</td>
        <td>${o.customer_name}</td>
        <td>${o.service_name}</td>
        <td><span class="status-badge status-badge--${o.order_status}">${statusLabels[o.order_status] || o.order_status}</span></td>
        <td>${formatPrice(o.final_price || o.price_estimate)}</td>
        <td>${formatDate(o.created_at)}</td>
      </tr>
    `
      )
      .join('');
  }

  init();
  setInterval(() => {
    if (document.visibilityState === 'visible') init();
  }, REFRESH_INTERVAL_MS);
  // Catch up immediately if the admin switches back to this tab after being
  // away longer than the poll interval, rather than waiting for the next tick.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') init();
  });
})();
