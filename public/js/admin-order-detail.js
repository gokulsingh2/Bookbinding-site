(function () {
  const loadingState = document.getElementById('loadingState');
  const errorState = document.getElementById('errorState');
  const errorMessage = document.getElementById('errorMessage');
  const orderContent = document.getElementById('orderContent');
  const statusForm = document.getElementById('statusForm');
  const resultEl = document.getElementById('result');
  const timelineEl = document.getElementById('timeline');

  const fulfillmentLabels = { pickup: 'Pickup', local_delivery: 'Local Delivery', shipping: 'Shipping' };
  const printColorLabels = { bw: 'Black & White', color: 'Color' };
  const bindingTypeLabels = {
    spiral: 'Spiral Binding',
    soft_bind: 'Soft Bind',
    perfect_binding: 'Perfect Binding',
    digital_embossing: 'Digital Embossing',
    handmade_embossing: 'Hand-made Embossing',
  };
  const paperQualityLabels = {
    '70gsm': '70 GSM', '85gsm': '85 GSM', '100gsm': '100 GSM',
    '150gsm': '150 GSM', '200gsm': '200 GSM', '250gsm': '250 GSM', '300gsm': '300 GSM',
    glossy: 'Glossy',
  };
  const statusLabels = {
    received: 'Order Received',
    in_progress: 'In Progress',
    ready: 'Ready',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };

  function formatPrice(amount) {
    return '₹' + Number(amount).toFixed(2);
  }
  function formatDateTime(dateStr) {
    return new Date(dateStr).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  async function loadOrder() {
    try {
      const res = await fetch(`/api/orders/${window.__ORDER_ID__}`, { credentials: 'include' });
      const data = await res.json();

      if (!res.ok) {
        loadingState.style.display = 'none';
        errorMessage.textContent = data.error || 'Could not load this order.';
        errorState.style.display = 'block';
        return;
      }

      render(data.order, data.history || []);
    } catch (err) {
      loadingState.style.display = 'none';
      errorMessage.textContent = 'Something went wrong.';
      errorState.style.display = 'block';
    }
  }

  function render(order, history) {
    document.getElementById('orderNumber').textContent = order.order_number;
    document.getElementById('customerInfo').textContent = `${order.customer_name || ''} (${order.customer_email || ''})`;
    document.getElementById('serviceName').textContent = order.service_name;
    document.getElementById('quantity').textContent = order.quantity;
    document.getElementById('pageCount').textContent = order.page_count || '—';
    document.getElementById('paperSize').textContent = order.paper_size || '—';
    document.getElementById('printColor').textContent = printColorLabels[order.print_color] || order.print_color || '—';
    document.getElementById('bindingType').textContent = bindingTypeLabels[order.binding_type] || order.binding_type || '—';
    document.getElementById('paperQuality').textContent = paperQualityLabels[order.paper_quality] || order.paper_quality || '—';
    document.getElementById('fulfillment').textContent = fulfillmentLabels[order.fulfillment_type] || order.fulfillment_type;
    document.getElementById('deliveryAddress').textContent = order.delivery_address || '—';
    document.getElementById('urgent').innerHTML = order.is_urgent
      ? '<span class="flag-badge flag-badge--urgent">Urgent</span>'
      : 'No';
    document.getElementById('uploadedFile').innerHTML = order.uploaded_file_url
      ? `<a href="${order.uploaded_file_url}" target="_blank" rel="noopener" class="flag-badge flag-badge--file">📎 View / Download File</a>`
      : '<span style="color:var(--ink-soft);">No file uploaded</span>';
    document.getElementById('priceEstimate').textContent = formatPrice(order.final_price || order.price_estimate);

    if (order.special_instructions) {
      document.getElementById('specialInstructions').textContent = order.special_instructions;
      document.getElementById('notesSection').style.display = 'block';
    }

    document.getElementById('statusSelect').value = order.order_status;
    if (order.final_price) {
      document.getElementById('finalPrice').value = order.final_price;
    }

    renderTimeline(history);

    loadingState.style.display = 'none';
    orderContent.style.display = 'block';
  }

  function renderTimeline(history) {
    if (history.length === 0) {
      timelineEl.innerHTML = '<li>No history yet.</li>';
      return;
    }
    timelineEl.innerHTML = history
      .map(
        (entry) => `
      <li class="timeline__item timeline__item--done">
        <span class="timeline__dot"></span>
        <div>
          <strong>${statusLabels[entry.status] || entry.status}</strong>
          <div class="timeline__date">${formatDateTime(entry.changed_at)}</div>
          ${entry.note ? `<div class="timeline__note">${entry.note}</div>` : ''}
        </div>
      </li>
    `
      )
      .join('');
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      status: document.getElementById('statusSelect').value,
      note: document.getElementById('note').value || null,
    };
    const finalPriceValue = document.getElementById('finalPrice').value;
    if (finalPriceValue !== '') payload.finalPrice = finalPriceValue;

    try {
      const res = await fetch(`/api/orders/${window.__ORDER_ID__}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        resultEl.textContent = data.error || 'Something went wrong.';
        resultEl.className = 'err';
        return;
      }

      resultEl.textContent = 'Order updated successfully.';
      resultEl.className = 'ok';
      document.getElementById('note').value = '';
      render(data.order, data.history || []);
    } catch (err) {
      resultEl.textContent = 'Something went wrong. Please try again.';
      resultEl.className = 'err';
    }
  }

  statusForm.addEventListener('submit', handleSubmit);
  loadOrder();
})();
