(function () {
  // Bright party-confetti palette instead of muted brand tones — reads as "real" confetti
  const COLORS = ['#FFC93C', '#FF6F91', '#4EA8DE', '#2EC4B6', '#9B5DE5', '#FF8C42', '#F72585'];

  function randomOrigins(count) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const origins = [];
    for (let i = 0; i < count; i++) {
      origins.push({
        x: w * (0.08 + Math.random() * 0.84),
        y: h * (0.85 + Math.random() * 0.12),
        baseAngle: -60 - Math.random() * 60, // random upward-ish direction, between -60deg and -120deg
      });
    }
    return origins;
  }

  function launchConfettiBurst(totalCount) {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    const h = window.innerHeight;
    const originCount = 4 + Math.floor(Math.random() * 3); // 4-6 poppers going off at once, at random spots
    const origins = randomOrigins(originCount);
    const perOrigin = Math.ceil(totalCount / origins.length);

    origins.forEach(function (origin) {
      for (let i = 0; i < perOrigin; i++) {
        const piece = document.createElement('span');
        piece.className = 'confetti-piece';

        const color = COLORS[Math.floor(Math.random() * COLORS.length)];

        // Mix of shapes: sequin dots, flecks, and ribbon strips — like real confetti mix
        const shapeRoll = Math.random();
        let width, height, radius;
        if (shapeRoll < 0.34) {
          width = height = 6 + Math.random() * 5;
          radius = '50%';
        } else if (shapeRoll < 0.67) {
          width = height = 7 + Math.random() * 5;
          radius = '1px';
        } else {
          width = 4 + Math.random() * 3;
          height = 12 + Math.random() * 8;
          radius = '1px';
        }

        const angle = origin.baseAngle + (Math.random() - 0.5) * 70;
        const rad = angle * Math.PI / 180;
        const burstDist = 110 + Math.random() * 180;
        const burstX = Math.cos(rad) * burstDist;
        const burstY = Math.sin(rad) * burstDist;

        const fallX = burstX + (Math.random() - 0.5) * 140;
        const fallY = (h - origin.y) + 60;

        const rotate = Math.round((Math.random() - 0.5) * 900);
        const duration = 1.3 + Math.random() * 0.9; // fast — feels like an instant pop, not a slow drift
        const delay = Math.random() * 0.1; // minimal stagger so it reads as one instant blast

        piece.style.left = origin.x + 'px';
        piece.style.top = origin.y + 'px';
        piece.style.width = width + 'px';
        piece.style.height = height + 'px';
        piece.style.background = 'linear-gradient(135deg, ' + color + ', #ffffffaa)';
        piece.style.borderRadius = radius;
        piece.style.animationDuration = duration + 's';
        piece.style.animationDelay = delay + 's';
        piece.style.setProperty('--burst-x', burstX.toFixed(0) + 'px');
        piece.style.setProperty('--burst-y', burstY.toFixed(0) + 'px');
        piece.style.setProperty('--fall-x', fallX.toFixed(0) + 'px');
        piece.style.setProperty('--fall-y', fallY.toFixed(0) + 'px');
        piece.style.setProperty('--rotate', rotate + 'deg');

        container.appendChild(piece);
      }
    });

    setTimeout(function () {
      container.remove();
    }, 2600);
  }

  window.celebrate = function (options) {
    const opts = options || {};
    launchConfettiBurst(opts.count || 90);
  };
})();
