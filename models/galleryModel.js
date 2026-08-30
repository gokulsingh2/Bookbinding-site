const { pool } = require('../config/db');

async function findAll() {
  const [rows] = await pool.query(
    `SELECT g.*, s.name AS service_name, s.slug AS service_slug
     FROM gallery_images g
     LEFT JOIN services s ON s.id = g.service_id
     ORDER BY g.display_order ASC, g.id ASC`
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM gallery_images WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function create({ imageUrl, caption, serviceId, displayOrder }) {
  const [result] = await pool.query(
    'INSERT INTO gallery_images (image_url, caption, service_id, display_order) VALUES (?, ?, ?, ?)',
    [imageUrl, caption || null, serviceId || null, displayOrder || 0]
  );
  return findById(result.insertId);
}

async function update(id, fields) {
  const allowed = {
    imageUrl: 'image_url',
    caption: 'caption',
    serviceId: 'service_id',
    displayOrder: 'display_order',
  };

  const setClauses = [];
  const values = [];

  for (const [key, column] of Object.entries(allowed)) {
    if (fields[key] !== undefined) {
      setClauses.push(`${column} = ?`);
      values.push(fields[key]);
    }
  }

  if (setClauses.length === 0) {
    return findById(id);
  }

  values.push(id);
  await pool.query(`UPDATE gallery_images SET ${setClauses.join(', ')} WHERE id = ?`, values);
  return findById(id);
}

async function remove(id) {
  await pool.query('DELETE FROM gallery_images WHERE id = ?', [id]);
}

module.exports = { findAll, findById, create, update, remove };
