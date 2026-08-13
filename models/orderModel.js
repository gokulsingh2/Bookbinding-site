const { pool } = require('../config/db');

function generateOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // e.g. 20260801
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase(); // e.g. 4F2K
  return `BB-${datePart}-${randomPart}`;
}

async function createOrder(data) {
  const {
    customerId,
    serviceId,
    quantity,
    pageCount,
    paperSize,
    printColor,
    bindingType,
    paperQuality,
    specialInstructions,
    uploadedFileUrl,
    fulfillmentType,
    deliveryAddress,
    isUrgent,
    priceEstimate,
  } = data;

  // Order numbers are randomized but still enforced UNIQUE at the DB level —
  // retry once on the astronomically rare chance of a collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    const orderNumber = generateOrderNumber();
    try {
      const [result] = await pool.query(
        `INSERT INTO orders
          (order_number, customer_id, service_id, quantity, page_count, paper_size, print_color,
           binding_type, paper_quality, special_instructions, uploaded_file_url, fulfillment_type,
           delivery_address, is_urgent, price_estimate, payment_status, order_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cod', 'received')`,
        [
          orderNumber,
          customerId,
          serviceId,
          quantity,
          pageCount || null,
          paperSize || null,
          printColor || null,
          bindingType || null,
          paperQuality || null,
          specialInstructions || null,
          uploadedFileUrl || null,
          fulfillmentType,
          deliveryAddress || null,
          !!isUrgent,
          priceEstimate,
        ]
      );

      await pool.query(
        `INSERT INTO order_status_history (order_id, status, note) VALUES (?, 'received', 'Order placed')`,
        [result.insertId]
      );

      return findById(result.insertId);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' && attempt < 2) continue; // retry with a fresh order number
      throw err;
    }
  }
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT o.*, s.name AS service_name, s.slug AS service_slug
     FROM orders o
     JOIN services s ON s.id = o.service_id
     WHERE o.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findByCustomer(customerId) {
  const [rows] = await pool.query(
    `SELECT o.*, s.name AS service_name, s.slug AS service_slug
     FROM orders o
     JOIN services s ON s.id = o.service_id
     WHERE o.customer_id = ?
     ORDER BY o.created_at DESC`,
    [customerId]
  );
  return rows;
}

async function findAllForAdmin() {
  const [rows] = await pool.query(
    `SELECT o.*, s.name AS service_name, u.name AS customer_name, u.email AS customer_email
     FROM orders o
     JOIN services s ON s.id = o.service_id
     JOIN users u ON u.id = o.customer_id
     ORDER BY o.created_at DESC`
  );
  return rows;
}

async function findStatusHistory(orderId) {
  const [rows] = await pool.query(
    'SELECT * FROM order_status_history WHERE order_id = ? ORDER BY changed_at ASC',
    [orderId]
  );
  return rows;
}

async function updateStatus(orderId, { status, note, finalPrice }) {
  const setClauses = ['order_status = ?'];
  const values = [status];

  if (finalPrice !== undefined) {
    setClauses.push('final_price = ?');
    values.push(finalPrice);
  }

  values.push(orderId);
  await pool.query(`UPDATE orders SET ${setClauses.join(', ')} WHERE id = ?`, values);

  await pool.query(
    'INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)',
    [orderId, status, note || null]
  );
}

module.exports = { createOrder, findById, findByCustomer, findAllForAdmin, findStatusHistory, updateStatus };
