const orderModel = require('../models/orderModel');
const serviceModel = require('../models/serviceModel');
const userModel = require('../models/userModel');
const { sendOrderConfirmationEmail } = require('../utils/mailer');

const VALID_FULFILLMENT_TYPES = ['pickup', 'local_delivery', 'shipping'];

async function create(req, res) {
  try {
    const {
      serviceId,
      quantity,
      pageCount,
      coverType,
      coverColor,
      specialInstructions,
      fulfillmentType,
      deliveryAddress,
      isUrgent,
    } = req.body;

    // --- Validation ---
    if (!serviceId) {
      return res.status(400).json({ error: 'A service must be selected' });
    }

    const service = await serviceModel.findById(serviceId);
    if (!service || !service.is_active) {
      return res.status(400).json({ error: 'Selected service is not available' });
    }

    const qty = Number(quantity) || 1;
    if (qty < 1 || !Number.isInteger(qty)) {
      return res.status(400).json({ error: 'Quantity must be a whole number of at least 1' });
    }

    if (!fulfillmentType || !VALID_FULFILLMENT_TYPES.includes(fulfillmentType)) {
      return res.status(400).json({ error: 'A valid fulfillment type is required' });
    }

    if (fulfillmentType !== 'pickup' && (!deliveryAddress || !deliveryAddress.trim())) {
      return res.status(400).json({ error: 'A delivery address is required for delivery/shipping orders' });
    }

    // --- Price estimate: base_price × quantity ---
    // Admins can adjust the final price later once they've reviewed the order (e.g. for
    // urgent jobs, unusual page counts, or custom covers) — this is just the customer-facing estimate.
    const priceEstimate = Number(service.base_price) * qty;

    const order = await orderModel.createOrder({
      customerId: req.user.id,
      serviceId: service.id,
      quantity: qty,
      pageCount: pageCount ? Number(pageCount) : null,
      coverType,
      coverColor,
      specialInstructions,
      fulfillmentType,
      deliveryAddress,
      isUrgent: !!isUrgent,
      priceEstimate,
    });

    // Send the confirmation email in the background — a slow or failed email
    // should never block the order response, since the order itself already succeeded.
    try {
      const customer = await userModel.findById(req.user.id);
      await sendOrderConfirmationEmail({
        to: customer.email,
        name: customer.name,
        order,
        serviceName: service.name,
      });
    } catch (mailErr) {
      console.error('Failed to send order confirmation email:', mailErr.message);
    }

    return res.status(201).json({ order });
  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({ error: 'Something went wrong while placing your order' });
  }
}

async function getMyOrders(req, res) {
  try {
    const orders = await orderModel.findByCustomer(req.user.id);
    return res.json({ orders });
  } catch (err) {
    console.error('Get my orders error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

async function getById(req, res) {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const isOwner = order.customer_id === req.user.id;
    const isAdminUser = req.user.role === 'admin';
    if (!isOwner && !isAdminUser) {
      return res.status(403).json({ error: 'You do not have access to this order' });
    }

    return res.json({ order });
  } catch (err) {
    console.error('Get order error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

async function getAllForAdmin(req, res) {
  try {
    const orders = await orderModel.findAllForAdmin();
    return res.json({ orders });
  } catch (err) {
    console.error('Get all orders error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

module.exports = { create, getMyOrders, getById, getAllForAdmin };
