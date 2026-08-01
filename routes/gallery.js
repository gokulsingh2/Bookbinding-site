const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/galleryController');
const { requireAuth } = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

router.get('/', galleryController.list);
router.post('/', requireAuth, isAdmin, galleryController.create);
router.delete('/:id', requireAuth, isAdmin, galleryController.remove);

module.exports = router;
