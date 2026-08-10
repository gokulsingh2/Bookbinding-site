(function () {
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.btn');
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);

    const circle = document.createElement('span');
    circle.className = 'ripple';
    circle.style.width = size + 'px';
    circle.style.height = size + 'px';
    circle.style.left = (e.clientX - rect.left - size / 2) + 'px';
    circle.style.top = (e.clientY - rect.top - size / 2) + 'px';

    btn.appendChild(circle);
    circle.addEventListener('animationend', function () {
      circle.remove();
    });
  });
})();
