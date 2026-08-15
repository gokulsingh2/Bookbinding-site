(function () {
  const overlay = document.getElementById('pageTransition');
  if (!overlay) return;

  const ANIMATION_MS = 900;

  function isInternalNavigableLink(link) {
    if (!link || !link.href) return false;
    if (link.target && link.target !== '' && link.target !== '_self') return false;
    if (link.hasAttribute('download')) return false;
    if (link.dataset && link.dataset.noTransition !== undefined) return false;

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    if (url.protocol === 'mailto:' || url.protocol === 'tel:' || url.protocol === 'javascript:') return false;

    // Same-page hash link — let the browser handle it natively, no transition needed.
    if (url.pathname === window.location.pathname && url.hash) return false;

    return true;
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // let "open in new tab" etc. work normally

    // A button (or anything explicitly opted out) nested inside a link — e.g. the
    // "Add to Cart" button inside a service card — has its own click behaviour and
    // must never also trigger the wrapping card's navigation, no matter which
    // script's listener happens to run first.
    if (e.target.closest('button, [data-no-transition]')) return;

    const link = e.target.closest('a[href]');
    if (!isInternalNavigableLink(link)) return;

    e.preventDefault();
    overlay.classList.add('is-active');

    window.setTimeout(function () {
      window.location.href = link.href;
    }, ANIMATION_MS);
  });

  // If the page is restored from bfcache (e.g. back button), make sure the
  // overlay isn't left stuck on-screen from a previous transition.
  window.addEventListener('pageshow', function () {
    overlay.classList.remove('is-active');
  });
})();
