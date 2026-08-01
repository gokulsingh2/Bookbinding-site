const { pool } = require('../config/db');

async function findAllActive() {
  const [rows] = await pool.query(
    'SELECT * FROM services WHERE is_active = TRUE ORDER BY display_order ASC, id ASC'
  );
  return rows;
}

async function findAllForAdmin() {
  const [rows] = await pool.query('SELECT * FROM services ORDER BY display_order ASC, id ASC');
  return rows;
}

async function findBySlug(slug) {
  const [rows] = await pool.query(
    'SELECT * FROM services WHERE slug = ? AND is_active = TRUE LIMIT 1',
    [slug]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM services WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function create({ name, description, basePrice, priceNote, turnaroundDays, imageUrl, displayOrder }) {
  const slug = slugify(name);
  const [result] = await pool.query(
    `INSERT INTO services (name, slug, description, base_price, price_note, turnaround_days, image_url, display_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      slug,
      description || null,
      basePrice,
      priceNote || null,
      turnaroundDays || 3,
      imageUrl || null,
      displayOrder || 0,
    ]
  );
  return findById(result.insertId);
}

async function update(id, fields) {
  const allowed = {
    name: 'name',
    description: 'description',
    basePrice: 'base_price',
    priceNote: 'price_note',
    turnaroundDays: 'turnaround_days',
    imageUrl: 'image_url',
    displayOrder: 'display_order',
    isActive: 'is_active',
  };

  const setClauses = [];
  const values = [];

  for (const [key, column] of Object.entries(allowed)) {
    if (fields[key] !== undefined) {
      setClauses.push(`${column} = ?`);
      values.push(fields[key]);
    }
  }

  // If the name changed, regenerate the slug to match.
  if (fields.name !== undefined) {
    setClauses.push('slug = ?');
    values.push(slugify(fields.name));
  }

  if (setClauses.length === 0) {
    return findById(id);
  }

  values.push(id);
  await pool.query(`UPDATE services SET ${setClauses.join(', ')} WHERE id = ?`, values);
  return findById(id);
}

async function remove(id) {
  await pool.query('DELETE FROM services WHERE id = ?', [id]);
}

module.exports = {
  findAllActive,
  findAllForAdmin,
  findBySlug,
  findById,
  create,
  update,
  remove,
  slugify,
};
