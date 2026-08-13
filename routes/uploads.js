const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, uploadController.uploadFile);

module.exports = router;
