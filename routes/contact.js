const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { requireAuth } = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

router.post('/', contactController.create);
router.get('/admin/all', requireAuth, isAdmin, contactController.listForAdmin);

module.exports = router;
