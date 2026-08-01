const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { requireAuth } = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

// Public
router.get('/', serviceController.listActive);
router.get('/:slug', serviceController.getBySlug);

// Admin — mounted separately below to avoid clashing with the public GET routes above
router.get('/admin/all', requireAuth, isAdmin, serviceController.listForAdmin);
router.post('/', requireAuth, isAdmin, serviceController.create);
router.put('/:id', requireAuth, isAdmin, serviceController.update);
router.delete('/:id', requireAuth, isAdmin, serviceController.remove);

module.exports = router;
