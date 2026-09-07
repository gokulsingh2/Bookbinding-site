require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const { verifyConnection } = require('./config/db');
const { verifyMailer } = require('./utils/mailer');
const authRoutes = require('./routes/auth');
const serviceRoutes = require('./routes/services');
const orderRoutes = require('./routes/orders');
const galleryRoutes = require('./routes/gallery');
const contactRoutes = require('./routes/contact');
const uploadRoutes = require('./routes/uploads');
const serviceModel = require('./models/serviceModel');
const galleryModel = require('./models/galleryModel');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Core middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/uploads', uploadRoutes);

// Public pages (server-rendered)
app.get('/', async (req, res, next) => {
  try {
    const services = await serviceModel.findAllActive();
    res.render('index', { services });
  } catch (err) {
    next(err);
  }
});

app.get('/services', async (req, res, next) => {
  try {
    const services = await serviceModel.findAllActive();
    res.render('services', { services });
  } catch (err) {
    next(err);
  }
});

app.get('/services/:slug', async (req, res, next) => {
  try {
    const service = await serviceModel.findBySlug(req.params.slug);
    if (!service) {
      return res.status(404).render('404');
    }
    res.render('service-detail', { service });
  } catch (err) {
    next(err);
  }
});

app.get('/contact', (req, res) => {
  res.render('contact');
});

app.get('/terms', (req, res) => {
  res.render('terms');
});

app.get('/privacy', (req, res) => {
  res.render('privacy');
});

app.get('/gallery', async (req, res, next) => {
  try {
    const images = await galleryModel.findAll();
    res.render('gallery', { images });
  } catch (err) {
    next(err);
  }
});

app.get('/admin', (req, res) => {
  res.render('admin-dashboard', { isAdminPage: true });
});

app.get('/admin/orders', (req, res) => {
  res.render('admin-orders', { isAdminPage: true });
});

app.get('/admin/orders/:id', (req, res) => {
  res.render('admin-order-detail', { orderId: req.params.id, isAdminPage: true });
});

app.get('/admin/services', (req, res) => {
  res.render('admin-services', { isAdminPage: true });
});

app.get('/admin/analytics', (req, res) => {
  res.render('admin-analytics', { isAdminPage: true });
});

app.get('/admin/gallery', (req, res) => {
  res.render('admin-gallery', { isAdminPage: true });
});

app.get('/admin/messages', (req, res) => {
  res.render('admin-messages', { isAdminPage: true });
});

app.get('/profile', (req, res) => {
  res.render('profile');
});

app.get('/my-orders', (req, res) => {
  res.render('my-orders');
});

app.get('/my-orders/:id', (req, res) => {
  res.render('order-tracking', { orderId: req.params.id });
});

app.get('/order/:id/confirmation', (req, res) => {
  res.render('order-confirmation', { orderId: req.params.id });
});

app.get('/cart', (req, res) => {
  res.render('cart');
});

app.get('/cart/confirmation', (req, res) => {
  res.render('cart-confirmation');
});

app.get('/login', (req, res) => {
  // Only allow a same-site relative path in `redirect` (e.g. /cart) — never a full
  // URL — so this can't be used as an open redirect to another site.
  const requested = typeof req.query.redirect === 'string' ? req.query.redirect : '';
  const redirectTo = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/';
  res.render('login', { redirectTo });
});

app.get('/forgot-password', (req, res) => {
  res.render('forgot-password');
});

app.get('/reset-password/:token', (req, res) => {
  res.render('reset-password', { token: req.params.token });
});

// A quick way to check the server + DB are alive without needing Postman
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  res.type('text/plain').send(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      'Disallow: /api',
      'Disallow: /cart',
      'Disallow: /my-orders',
      'Disallow: /profile',
      'Disallow: /order',
      'Disallow: /login',
      'Disallow: /register',
      'Disallow: /forgot-password',
      'Disallow: /reset-password',
      '',
      `Sitemap: ${baseUrl}/sitemap.xml`,
    ].join('\n')
  );
});

app.get('/sitemap.xml', async (req, res, next) => {
  try {
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const services = await serviceModel.findAllActive();

    const staticUrls = [
      { loc: '/', priority: '1.0' },
      { loc: '/services', priority: '0.9' },
      { loc: '/gallery', priority: '0.6' },
      { loc: '/contact', priority: '0.5' },
      { loc: '/terms', priority: '0.3' },
      { loc: '/privacy', priority: '0.3' },
    ];
    const serviceUrls = services.map((s) => ({ loc: `/services/${s.slug}`, priority: '0.8' }));

    const urls = [...staticUrls, ...serviceUrls]
      .map((u) => `  <url><loc>${baseUrl}${u.loc}</loc><priority>${u.priority}</priority></url>`)
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
    res.type('application/xml').send(xml);
  } catch (err) {
    next(err);
  }
});

// 404 fallback — API requests still get JSON (the JS across the site expects
// that shape), everything else gets a proper page instead of a raw JSON blob.
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.status(404).render('404');
});

// Centralized error handler (catches anything thrown/next(err)'d)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  await verifyConnection();
  await verifyMailer();
});
