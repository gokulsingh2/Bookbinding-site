// Client-side cart store. The cart lives in localStorage as an array of "cart items" —
// each one is basically a fully-specced order line (service + qty + print specs) waiting
// to be checked out. No server round-trip needed just to add/remove/edit items.
(function (window) {
  const CART_KEY = 'bb_cart_items_v1';

  function formatPrice(amount) {
    return '₹' + Number(amount || 0).toFixed(2);
  }

  function getCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const items = raw ? JSON.parse(raw) : [];
      return Array.isArray(items) ? items : [];
    } catch (err) {
      return [];
    }
  }

  function saveCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    updateCartBadge();
    // Let any open tab/page know the cart changed (e.g. header badge on another page).
    window.dispatchEvent(new CustomEvent('bb-cart-updated', { detail: { items } }));
  }

  function addItem(item) {
    const items = getCart();
    items.push(Object.assign({ id: makeId() }, item));
    saveCart(items);
    pulseCartIcon();
    return items;
  }

  function updateItemQuantity(id, quantity) {
    const items = getCart();
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const item = items.find((i) => i.id === id);
    if (item) item.quantity = qty;
    saveCart(items);
    return items;
  }

  // Merges `patch` into the existing item (used by the item-spec editor to save
  // paper size/color/binding/quality/notes/file in one go). Unlike updateItemQuantity,
  // this doesn't special-case any single field.
  function updateItem(id, patch) {
    const items = getCart();
    const item = items.find((i) => i.id === id);
    if (item) Object.assign(item, patch);
    saveCart(items);
    return items;
  }

  function removeItem(id) {
    const items = getCart().filter((i) => i.id !== id);
    saveCart(items);
    return items;
  }

  function clearCart() {
    saveCart([]);
  }

  function lineTotal(item) {
    return Number(item.basePrice || 0) * Number(item.quantity || 1);
  }

  function getGrandTotal(items) {
    return (items || getCart()).reduce((sum, item) => sum + lineTotal(item), 0);
  }

  function getItemCount(items) {
    return (items || getCart()).reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  }

  function makeId() {
    return (window.crypto && window.crypto.randomUUID)
      ? window.crypto.randomUUID()
      : 'item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  // Updates the little count badge on the header "Cart" link, if present on this page.
  function updateCartBadge() {
    const badge = document.getElementById('cartCount');
    if (!badge) return;
    const count = getItemCount();
    badge.textContent = String(count);
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  }

  // A short bounce on the header cart icon + a pop on its badge — fired only when an
  // item is actually added, not on every quantity edit or badge refresh.
  function pulseCartIcon() {
    const icon = document.getElementById('cartIcon');
    const badge = document.getElementById('cartCount');
    if (icon) {
      icon.classList.remove('cart-icon--bump');
      // Force reflow so the animation restarts even if it's already mid-bump.
      void icon.offsetWidth;
      icon.classList.add('cart-icon--bump');
      setTimeout(() => icon.classList.remove('cart-icon--bump'), 600);
    }
    if (badge) {
      badge.classList.remove('cart-badge--pop');
      void badge.offsetWidth;
      badge.classList.add('cart-badge--pop');
      setTimeout(() => badge.classList.remove('cart-badge--pop'), 450);
    }
  }

  // Small floating confirmation message (e.g. "Added to cart!") — auto-dismisses itself.
  function showToast(message) {
    let toast = document.getElementById('bbToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'bbToast';
      toast.className = 'bb-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    // Force reflow so re-triggering the toast restarts its transition.
    void toast.offsetWidth;
    toast.classList.add('bb-toast--visible');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
      toast.classList.remove('bb-toast--visible');
    }, 1800);
  }

  window.BBCart = {
    getCart,
    saveCart,
    addItem,
    updateItemQuantity,
    updateItem,
    removeItem,
    clearCart,
    lineTotal,
    getGrandTotal,
    getItemCount,
    updateCartBadge,
    pulseCartIcon,
    showToast,
    formatPrice,
  };

  document.addEventListener('DOMContentLoaded', updateCartBadge);
})(window);
