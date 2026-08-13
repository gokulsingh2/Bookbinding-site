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
      return res.status(404).send('Service not found');
    }
    res.render('service-detail', { service });
  } catch (err) {
    next(err);
  }
});

app.get('/contact', (req, res) => {
  res.render('contact');
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
  res.render('admin-dashboard');
});

app.get('/admin/orders', (req, res) => {
  res.render('admin-orders');
});

app.get('/admin/orders/:id', (req, res) => {
  res.render('admin-order-detail', { orderId: req.params.id });
});

app.get('/admin/services', (req, res) => {
  res.render('admin-services');
});

app.get('/admin/analytics', (req, res) => {
  res.render('admin-analytics');
});

app.get('/admin/gallery', (req, res) => {
  res.render('admin-gallery');
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

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
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
