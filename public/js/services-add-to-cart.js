// Handles the "Add to Cart" button on each service card in /services. These cards are
// themselves links to the service detail page, so the button click must be stopped from
// bubbling into that navigation — it should only add a cart item and show a toast, never
// leave this page.
(function () {
  // Sensible defaults for a one-click add.
  const DEFAULTS = {
    quantity: 1,
    pageCount: null,
    paperSize: 'A4',
    printColor: 'bw',
    bindingType: null,
    paperQuality: '70gsm',
    specialInstructions: null,
    uploadedFileUrl: null,
  };

  function handleClick(e) {
    const btn = e.target.closest('.add-to-cart-btn');
    if (!btn) return;

    // Stop the click from bubbling up to the surrounding <a class="service-card">,
    // which would otherwise navigate to the service detail page.
    e.preventDefault();
    e.stopPropagation();

    const item = Object.assign({}, DEFAULTS, {
      serviceId: btn.getAttribute('data-service-id'),
      serviceName: btn.getAttribute('data-service-name'),
      basePrice: Number(btn.getAttribute('data-base-price')),
      priceNote: btn.getAttribute('data-price-note') || null,
    });

    window.BBCart.addItem(item);
    window.BBCart.showToast(`Added "${item.serviceName}" to cart! 🛒`);
  }

  document.addEventListener('click', handleClick);
})();
