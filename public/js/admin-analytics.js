(function () {
  const loadingState = document.getElementById('loadingState');
  const accessDenied = document.getElementById('accessDenied');
  const analyticsContent = document.getElementById('analyticsContent');

  const CHART_COLORS = ['#6b3f2a', '#b5843f', '#916b0a', '#2454a0', '#1e6b2f', '#a32a1f'];

  function monthKey(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function monthLabel(key) {
    const [year, month] = key.split('-');
    return new Date(Number(year), Number(month) - 1).toLocaleDateString(undefined, {
      month: 'short',
      year: '2-digit',
    });
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
      const orders = (data.orders || []).filter((o) => o.order_status !== 'cancelled');

      renderOrdersPerMonth(orders);
      renderRevenueTrend(orders);
      renderTopServices(orders);

      loadingState.style.display = 'none';
      analyticsContent.style.display = 'block';
    } catch (err) {
      loadingState.textContent = 'Something went wrong loading analytics.';
    }
  }

  function groupByMonth(orders) {
    const groups = {};
    orders.forEach((o) => {
      const key = monthKey(o.created_at);
      if (!groups[key]) groups[key] = [];
      groups[key].push(o);
    });
    return Object.keys(groups)
      .sort()
      .reduce((acc, key) => {
        acc[key] = groups[key];
        return acc;
      }, {});
  }

  function renderOrdersPerMonth(orders) {
    const groups = groupByMonth(orders);
    const labels = Object.keys(groups).map(monthLabel);
    const counts = Object.values(groups).map((arr) => arr.length);

    new Chart(document.getElementById('ordersChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Orders', data: counts, backgroundColor: '#6b3f2a' }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
  }

  function renderRevenueTrend(orders) {
    const groups = groupByMonth(orders);
    const labels = Object.keys(groups).map(monthLabel);
    const revenue = Object.values(groups).map((arr) =>
      arr.reduce((sum, o) => sum + Number(o.final_price || o.price_estimate || 0), 0)
    );

    new Chart(document.getElementById('revenueChart'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Revenue (₹)',
            data: revenue,
            borderColor: '#b5843f',
            backgroundColor: 'rgba(181, 132, 63, 0.15)',
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
  }

  function renderTopServices(orders) {
    const counts = {};
    orders.forEach((o) => {
      counts[o.service_name] = (counts[o.service_name] || 0) + 1;
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(([name]) => name);
    const values = sorted.map(([, count]) => count);

    new Chart(document.getElementById('servicesChart'), {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: CHART_COLORS }],
      },
      options: { responsive: true },
    });
  }

  init();
})();
