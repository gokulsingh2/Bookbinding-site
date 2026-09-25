(function () {
  const loadingState = document.getElementById('loadingState');
  const accessDenied = document.getElementById('accessDenied');
  const ordersContent = document.getElementById('ordersContent');
  const statusFilter = document.getElementById('statusFilter');
  const urgentOnly = document.getElementById('urgentOnly');
  const ordersBody = document.getElementById('ordersBody');

  const statusLabels = {
    received: 'Received',
    in_progress: 'In Progress',
    ready: 'Ready',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  const fulfillmentLabels = {
    pickup: 'Pickup',
    local_delivery: 'Local Delivery',
    shipping: 'Shipping',
  };

  let allOrders = [];
  let isDeleting = false;
  let lastKnownOrderCount = null;
  let isFirstLoad = true;
  const REFRESH_INTERVAL_MS = 25000;

  function formatPrice(amount) {
    const n = Number(amount);
    return n > 0 ? '₹' + n.toFixed(2) : 'Price on request';
  }
  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function render() {
    const filter = statusFilter.value;
    let filtered = filter ? allOrders.filter((o) => o.order_status === filter) : allOrders;
    if (urgentOnly.checked) filtered = filtered.filter((o) => o.is_urgent);

    if (filtered.length === 0) {
      ordersBody.innerHTML = '<tr><td colspan="8">No orders match this filter.</td></tr>';
      return;
    }

    ordersBody.innerHTML = filtered
      .map(
        (o) => `
      <tr onclick="window.location.href='/admin/orders/${o.id}'" style="cursor:pointer;" class="${o.is_urgent ? 'order-row--urgent' : ''}">
        <td>${o.order_number}</td>
        <td>${o.customer_name}<br><span style="color:#999;font-size:0.8rem;">${o.customer_email}</span></td>
        <td>${o.service_name}</td>
        <td>${fulfillmentLabels[o.fulfillment_type] || o.fulfillment_type}</td>
        <td>
          ${o.is_urgent ? '<span class="flag-badge flag-badge--urgent">Urgent</span>' : ''}
          ${o.uploaded_file_url ? `<a href="${o.uploaded_file_url}" target="_blank" rel="noopener" class="flag-badge flag-badge--file" onclick="event.stopPropagation();">📎 File</a>` : ''}
        </td>
        <td><span class="status-badge status-badge--${o.order_status}">${statusLabels[o.order_status] || o.order_status}</span></td>
        <td>${formatPrice(o.final_price || o.price_estimate)}</td>
        <td>${formatDate(o.created_at)}</td>
        <td><button type="button" class="btn btn--small btn--danger" data-delete-id="${o.id}" data-order-number="${o.order_number}" onclick="event.stopPropagation();">Delete</button></td>
      </tr>
    `
      )
      .join('');
  }

  async function handleDelete(e) {
    const btn = e.target.closest('button[data-delete-id]');
    if (!btn) return;

    const confirmed = confirm(
      `Delete order ${btn.dataset.orderNumber}? This permanently removes it from order ` +
      `history, analytics, and revenue totals. This cannot be undone.`
    );
    if (!confirmed) return;

    isDeleting = true;
    btn.disabled = true;
    btn.textContent = 'Deleting…';

    try {
      const res = await fetch(`/api/orders/${btn.dataset.deleteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Something went wrong deleting this order.');
        btn.disabled = false;
        btn.textContent = 'Delete';
        isDeleting = false;
        return;
      }

      allOrders = allOrders.filter((o) => String(o.id) !== String(btn.dataset.deleteId));
      lastKnownOrderCount = allOrders.length;
      render();
      isDeleting = false;
    } catch (err) {
      alert('Something went wrong. Please try again.');
      btn.disabled = false;
      btn.textContent = 'Delete';
      isDeleting = false;
    }
  }

  // Small floating confirmation message — same .bb-toast styling used
  // elsewhere on the site, so this matches the Dashboard's new-order alert.
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

  async function init() {
    // Skip a background refresh mid-delete so we don't yank the "Deleting…"
    // button out from under the admin while that request is still in flight.
    if (isDeleting) return;

    try {
      const res = await fetch('/api/orders/admin/all', { credentials: 'include' });

      if (!res.ok) {
        loadingState.style.display = 'none';
        accessDenied.style.display = 'block';
        return;
      }

      const data = await res.json();
      allOrders = data.orders || [];

      if (!isFirstLoad && lastKnownOrderCount !== null && allOrders.length > lastKnownOrderCount) {
        const newCount = allOrders.length - lastKnownOrderCount;
        showToast(newCount === 1 ? '1 new order just came in' : `${newCount} new orders just came in`);
      }
      lastKnownOrderCount = allOrders.length;
      isFirstLoad = false;

      render();
      loadingState.style.display = 'none';
      ordersContent.style.display = 'block';
    } catch (err) {
      if (isFirstLoad) {
        loadingState.textContent = 'Something went wrong loading orders.';
      }
    }
  }

  statusFilter.addEventListener('change', render);
  urgentOnly.addEventListener('change', render);
  ordersBody.addEventListener('click', handleDelete);
  init();
  setInterval(() => {
    if (document.visibilityState === 'visible') init();
  }, REFRESH_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') init();
  });
})();
