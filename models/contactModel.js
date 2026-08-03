const { pool } = require('../config/db');

async function create({ name, email, message }) {
  const [result] = await pool.query(
    'INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)',
    [name, email, message]
  );
  const [rows] = await pool.query('SELECT * FROM contact_messages WHERE id = ?', [result.insertId]);
  return rows[0];
}

async function findAll() {
  const [rows] = await pool.query('SELECT * FROM contact_messages ORDER BY created_at DESC');
  return rows;
}

module.exports = { create, findAll };
