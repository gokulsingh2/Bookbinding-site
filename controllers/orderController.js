const orderModel = require('../models/orderModel');
const serviceModel = require('../models/serviceModel');
const userModel = require('../models/userModel');
const { sendOrderConfirmationEmail, sendCartOrderConfirmationEmail } = require('../utils/mailer');

const VALID_FULFILLMENT_TYPES = ['pickup', 'local_delivery', 'shipping'];
const VALID_PAPER_SIZES = ['A1', 'A2', 'A3', 'A4'];
const VALID_PRINT_COLORS = ['bw', 'color'];
const VALID_BINDING_TYPES = ['spiral', 'soft_bind', 'perfect_binding', 'digital_embossing', 'handmade_embossing'];
const VALID_PAPER_QUALITIES = ['70gsm', '85gsm', '100gsm', '150gsm', '200gsm', '250gsm', '300gsm', 'glossy'];
const MAX_CART_ITEMS = 20;

// Shared by both single-item checkout (create) and multi-item cart checkout (checkoutCart).
// Looks up + validates one line item against a service and the shared fulfillment info,
// and returns the exact object orderModel.createOrder() expects. Throws a plain Error with
// a customer-facing message on any validation failure — callers turn that into a 400.
async function validateAndBuildItem(itemInput, { fulfillmentType, deliveryAddress, isUrgent, orderNote }) {
  const {
    serviceId,
    quantity,
    pageCount,
    paperSize,
    printColor,
    bindingType,
    paperQuality,
    specialInstructions,
    uploadedFileUrl,
  } = itemInput || {};

  if (!serviceId) {
    throw new Error('A service must be selected for every item');
  }

  const service = await serviceModel.findById(serviceId);
  if (!service || !service.is_active) {
    throw new Error('One of the selected services is not available');
  }

  const qty = Number(quantity) || 1;
  if (qty < 1 || !Number.isInteger(qty)) {
    throw new Error('Quantity must be a whole number of at least 1');
  }

  if (!paperSize || !VALID_PAPER_SIZES.includes(paperSize)) {
    throw new Error('A valid paper size is required for every item');
  }

  if (!printColor || !VALID_PRINT_COLORS.includes(printColor)) {
    throw new Error('A valid print color is required for every item');
  }

  // Binding type is optional — posters don't get bound.
  if (bindingType && !VALID_BINDING_TYPES.includes(bindingType)) {
    throw new Error('Invalid binding type');
  }

  if (!paperQuality || !VALID_PAPER_QUALITIES.includes(paperQuality)) {
    throw new Error('A valid paper quality is required for every item');
  }

  // Price is always recomputed server-side from the current service price — the client's
  // number is never trusted, so a tampered request can't discount an order.
  const priceEstimate = Number(service.base_price) * qty;

  // The order-level note (from the checkout form, applies to the whole cart) gets folded
  // into every resulting order's special_instructions, labeled separately from any
  // per-item note — since admin views orders individually, this guarantees the note is
  // visible no matter which item's order they open first.
  const combinedInstructions = [
    orderNote ? `Order note: ${orderNote}` : null,
    specialInstructions || null,
  ].filter(Boolean).join('\n') || null;

  return {
    serviceId: service.id,
    serviceName: service.name,
    quantity: qty,
    pageCount: pageCount ? Number(pageCount) : null,
    paperSize,
    printColor,
    bindingType: bindingType || null,
    paperQuality,
    specialInstructions: combinedInstructions,
    uploadedFileUrl: uploadedFileUrl || null,
    fulfillmentType,
    deliveryAddress,
    isUrgent: !!isUrgent,
    priceEstimate,
  };
}

async function create(req, res) {
  try {
    const { fulfillmentType, deliveryAddress, isUrgent } = req.body;

    if (!fulfillmentType || !VALID_FULFILLMENT_TYPES.includes(fulfillmentType)) {
      return res.status(400).json({ error: 'A valid fulfillment type is required' });
    }
    if (fulfillmentType !== 'pickup' && (!deliveryAddress || !deliveryAddress.trim())) {
      return res.status(400).json({ error: 'A delivery address is required for delivery/shipping orders' });
    }

    let itemData;
    try {
      itemData = await validateAndBuildItem(req.body, { fulfillmentType, deliveryAddress, isUrgent });
    } catch (validationErr) {
      return res.status(400).json({ error: validationErr.message });
    }

    const order = await orderModel.createOrder({ customerId: req.user.id, ...itemData });

    // Fire-and-forget: don't await the email, so a slow or failed send never
    // delays the response the customer is waiting on. Errors are still logged.
    userModel.findById(req.user.id)
      .then((customer) => sendOrderConfirmationEmail({
        to: customer.email,
        name: customer.name,
        order,
        serviceName: itemData.serviceName,
      }))
      .catch((mailErr) => console.error('Failed to send order confirmation email:', mailErr.message));

    return res.status(201).json({ order });
  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({ error: 'Something went wrong while placing your order' });
  }
}

// Cart checkout: takes several line items (each its own service + specs, built client-side
// in the cart) plus ONE shared fulfillment choice, and creates one order row per item —
// same schema, same validation per item, just looped. Every item is validated up front
// before anything is written, so a bad item blocks the whole checkout rather than
// silently placing a partial cart.
async function checkoutCart(req, res) {
  try {
    const { items, fulfillmentType, deliveryAddress, isUrgent, orderNote } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty' });
    }
    if (items.length > MAX_CART_ITEMS) {
      return res.status(400).json({ error: `A single checkout is limited to ${MAX_CART_ITEMS} items` });
    }
    if (!fulfillmentType || !VALID_FULFILLMENT_TYPES.includes(fulfillmentType)) {
      return res.status(400).json({ error: 'A valid fulfillment type is required' });
    }
    if (fulfillmentType !== 'pickup' && (!deliveryAddress || !deliveryAddress.trim())) {
      return res.status(400).json({ error: 'A delivery address is required for delivery/shipping orders' });
    }

    const shared = { fulfillmentType, deliveryAddress, isUrgent, orderNote: orderNote || null };

    let itemsData;
    try {
      itemsData = await Promise.all(items.map((item) => validateAndBuildItem(item, shared)));
    } catch (validationErr) {
      return res.status(400).json({ error: validationErr.message });
    }

    // Each item's order_number is independently randomized (see orderModel), so
    // these inserts don't depend on each other — running them in parallel instead
    // of one-by-one is what actually matters for checkout speed on a multi-item cart.
    const orders = (await Promise.all(
      itemsData.map(async (itemData) => {
        const order = await orderModel.createOrder({ customerId: req.user.id, ...itemData });
        return { order, serviceName: itemData.serviceName };
      })
    ));

    // Fire-and-forget: don't await the consolidated email, so a slow or failed
    // send never delays the response the customer is waiting on.
    userModel.findById(req.user.id)
      .then((customer) => sendCartOrderConfirmationEmail({
        to: customer.email,
        name: customer.name,
        orders,
      }))
      .catch((mailErr) => console.error('Failed to send cart confirmation email:', mailErr.message));

    return res.status(201).json({ orders: orders.map((o) => o.order) });
  } catch (err) {
    console.error('Checkout cart error:', err);
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

    const history = await orderModel.findStatusHistory(order.id);
    return res.json({ order, history });
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

const VALID_ORDER_STATUSES = ['received', 'in_progress', 'ready', 'delivered', 'cancelled'];
const CUSTOMER_CANCEL_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

async function updateStatus(req, res) {
  try {
    const { status, note, finalPrice } = req.body;

    if (!status || !VALID_ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'A valid status is required' });
    }

    const existing = await orderModel.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (finalPrice !== undefined && finalPrice !== null && finalPrice !== '') {
      const parsedPrice = Number(finalPrice);
      if (isNaN(parsedPrice) || parsedPrice < 0 || parsedPrice > 10000) {
        return res.status(400).json({ error: 'Final price must be a number between ₹0 and ₹10,000' });
      }
    }

    await orderModel.updateStatus(req.params.id, {
      status,
      note,
      finalPrice: finalPrice !== undefined && finalPrice !== '' ? Number(finalPrice) : undefined,
    });

    const order = await orderModel.findById(req.params.id);
    const history = await orderModel.findStatusHistory(req.params.id);
    return res.json({ order, history });
  } catch (err) {
    console.error('Update order status error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

async function remove(req, res) {
  try {
    const existing = await orderModel.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await orderModel.remove(req.params.id);
    return res.json({ message: 'Order deleted' });
  } catch (err) {
    console.error('Delete order error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

// Customer-facing self-service cancellation — deliberately separate from the admin
// updateStatus endpoint above, which lets an admin set ANY status. This one only
// ever sets 'cancelled', only for the order's own owner, and only within the
// 48-hour window, all enforced server-side so it can't be bypassed from the client.
async function cancel(req, res) {
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

    if (order.order_status === 'cancelled') {
      return res.status(400).json({ error: 'This order is already cancelled' });
    }
    if (order.order_status === 'delivered') {
      return res.status(400).json({ error: 'A delivered order cannot be cancelled' });
    }

    // Admins can still cancel past the window from the admin order page (via
    // updateStatus) if a real-world exception is needed — this 48-hour check only
    // applies to the customer's own self-service cancel button.
    if (!isAdminUser) {
      const ageMs = Date.now() - new Date(order.created_at).getTime();
      if (ageMs > CUSTOMER_CANCEL_WINDOW_MS) {
        return res.status(400).json({
          error: 'This order was placed more than 48 hours ago and can no longer be cancelled online. Please contact us directly.',
        });
      }
    }

    await orderModel.updateStatus(req.params.id, {
      status: 'cancelled',
      note: isAdminUser ? 'Cancelled by admin' : 'Cancelled by customer',
    });

    const updated = await orderModel.findById(req.params.id);
    const history = await orderModel.findStatusHistory(req.params.id);
    return res.json({ order: updated, history });
  } catch (err) {
    console.error('Cancel order error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

module.exports = { create, checkoutCart, getMyOrders, getById, getAllForAdmin, updateStatus, remove, cancel };
