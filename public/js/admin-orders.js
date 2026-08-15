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

  function formatPrice(amount) {
    return '₹' + Number(amount).toFixed(2);
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
      </tr>
    `
      )
      .join('');
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
      allOrders = data.orders || [];

      render();
      loadingState.style.display = 'none';
      ordersContent.style.display = 'block';
    } catch (err) {
      loadingState.textContent = 'Something went wrong loading orders.';
    }
  }

  statusFilter.addEventListener('change', render);
  urgentOnly.addEventListener('change', render);
  init();
})();
