(function () {
  const loginNotice = document.getElementById('loginNotice');
  const cartWrapper = document.getElementById('cartWrapper');
  const emptyState = document.getElementById('emptyState');
  const cartContent = document.getElementById('cartContent');
  const cartItemsEl = document.getElementById('cartItems');
  const grandTotalEl = document.getElementById('grandTotal');
  const grandTotalBottomEl = document.getElementById('grandTotalBottom');
  const itemCountEl = document.getElementById('itemCount');
  const itemCountPluralEl = document.getElementById('itemCountPlural');
  const checkoutForm = document.getElementById('checkoutForm');
  const fulfillmentSelect = document.getElementById('fulfillmentType');
  const addressField = document.getElementById('addressField');
  const deliveryAddressInput = document.getElementById('deliveryAddress');
  const resultEl = document.getElementById('result');

  const SPEC_LABELS = {
    paperSize: 'Paper',
    printColor: 'Color',
    bindingType: 'Binding',
    paperQuality: 'Quality',
    pageCount: 'Pages',
  };

  function specSummary(item) {
    const parts = [`Qty × ${item.quantity}`];
    if (item.pageCount) parts.push(`${SPEC_LABELS.pageCount}: ${item.pageCount}`);
    if (item.paperSize) parts.push(`${SPEC_LABELS.paperSize}: ${item.paperSize}`);
    if (item.printColor) parts.push(`${SPEC_LABELS.printColor}: ${item.printColor === 'bw' ? 'B&W' : 'Color'}`);
    if (item.bindingType) parts.push(`${SPEC_LABELS.bindingType}: ${item.bindingType.replace(/_/g, ' ')}`);
    if (item.paperQuality) parts.push(`${SPEC_LABELS.paperQuality}: ${item.paperQuality}`);
    if (item.uploadedFileUrl) parts.push('File attached ✓');
    return parts.join(' · ');
  }

  // The live calculator: re-reads the cart and re-renders totals any time something changes
  // (quantity edit, remove, or a change made on another tab via the storage event).
  function render() {
    const items = window.BBCart.getCart();

    if (items.length === 0) {
      emptyState.style.display = 'block';
      cartContent.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    cartContent.style.display = 'block';

    cartItemsEl.innerHTML = items.map((item) => `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item__details">
          <h3>${escapeHtml(item.serviceName)}</h3>
          <p class="cart-item__specs">${escapeHtml(specSummary(item))}</p>
          ${item.specialInstructions ? `<p class="cart-item__specs"><em>${escapeHtml(item.specialInstructions)}</em></p>` : ''}
        </div>
        <div class="cart-item__side">
          <span class="cart-item__price">${item.basePrice > 0 ? window.BBCart.formatPrice(window.BBCart.lineTotal(item)) : (item.priceNote || 'Price on request')}</span>
          <div class="cart-item__qty">
            <label style="margin:0; font-weight:400;">Qty</label>
            <input type="number" min="1" value="${item.quantity}" data-qty-for="${item.id}" />
          </div>
          <button type="button" class="cart-item__remove" data-remove-id="${item.id}">Remove</button>
        </div>
      </div>
    `).join('');

    const grandTotal = window.BBCart.getGrandTotal(items);
    const count = window.BBCart.getItemCount(items);
    grandTotalEl.textContent = window.BBCart.formatPrice(grandTotal);
    grandTotalBottomEl.textContent = window.BBCart.formatPrice(grandTotal);
    itemCountEl.textContent = String(count);
    itemCountPluralEl.textContent = count === 1 ? '' : 's';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function onCartItemsClick(e) {
    const removeId = e.target.getAttribute('data-remove-id');
    if (removeId) {
      window.BBCart.removeItem(removeId);
      render();
    }
  }

  function onCartItemsInput(e) {
    const qtyId = e.target.getAttribute('data-qty-for');
    if (qtyId) {
      window.BBCart.updateItemQuantity(qtyId, e.target.value);
      render(); // live recalculation as the customer types a new quantity
    }
  }

  function onFulfillmentChange() {
    addressField.style.display = fulfillmentSelect.value === 'pickup' ? 'none' : 'block';
  }

  async function handleCheckout(e) {
    e.preventDefault();
    const items = window.BBCart.getCart();
    if (items.length === 0) return;

    const fulfillmentType = fulfillmentSelect.value;
    const deliveryAddress = deliveryAddressInput.value || null;
    if (fulfillmentType !== 'pickup' && (!deliveryAddress || !deliveryAddress.trim())) {
      resultEl.textContent = 'A delivery address is required for delivery/shipping orders.';
      resultEl.className = 'err';
      return;
    }

    const submitBtn = checkoutForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Placing order…';
    resultEl.textContent = '';

    const payload = {
      items: items.map((item) => ({
        serviceId: item.serviceId,
        quantity: item.quantity,
        pageCount: item.pageCount || null,
        paperSize: item.paperSize,
        printColor: item.printColor,
        bindingType: item.bindingType || null,
        paperQuality: item.paperQuality,
        specialInstructions: item.specialInstructions || null,
        uploadedFileUrl: item.uploadedFileUrl || null,
      })),
      fulfillmentType,
      deliveryAddress,
      isUrgent: document.getElementById('isUrgent').checked,
    };

    try {
      const res = await fetch('/api/orders/checkout-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        resultEl.textContent = data.error || 'Something went wrong placing your order.';
        resultEl.className = 'err';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Place Order';
        return;
      }

      resultEl.innerHTML = '<strong>Order placed! 🎉 Redirecting to your confirmation…</strong>';
      resultEl.className = 'ok';
      if (window.celebrate) window.celebrate();

      const orderIds = (data.orders || []).map((o) => o.id).join(',');
      window.BBCart.clearCart();

      setTimeout(function () {
        window.location.href = `/cart/confirmation?ids=${orderIds}`;
      }, 550);
    } catch (err) {
      resultEl.textContent = 'Something went wrong. Please try again.';
      resultEl.className = 'err';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Place Order';
    }
  }

  async function checkAuthAndInit() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) throw new Error('Not authenticated');

      loginNotice.style.display = 'none';
      cartWrapper.style.display = 'block';
      render();
    } catch (err) {
      loginNotice.style.display = 'block';
      cartWrapper.style.display = 'none';
    }
  }

  cartItemsEl.addEventListener('click', onCartItemsClick);
  cartItemsEl.addEventListener('input', onCartItemsInput);
  fulfillmentSelect.addEventListener('change', onFulfillmentChange);
  checkoutForm.addEventListener('submit', handleCheckout);
  window.addEventListener('bb-cart-updated', render);

  checkAuthAndInit();
})();
