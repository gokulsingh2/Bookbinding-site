const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { requireAuth } = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

router.post('/', requireAuth, orderController.create);
router.post('/checkout-cart', requireAuth, orderController.checkoutCart);
router.get('/my', requireAuth, orderController.getMyOrders);
router.get('/admin/all', requireAuth, isAdmin, orderController.getAllForAdmin);
router.put('/:id/status', requireAuth, isAdmin, orderController.updateStatus);
router.get('/:id', requireAuth, orderController.getById);

module.exports = router;
