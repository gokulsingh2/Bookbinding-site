const mysql = require('mysql2/promise');
const fs = require('fs');

const useSSL = String(process.env.DB_SSL).toLowerCase() === 'true';

let sslConfig;
if (useSSL) {
  sslConfig = { minVersion: 'TLSv1.2' };
  // Only attach a custom CA if one was actually provided; otherwise
  // rely on Node's built-in trusted root store (works for TiDB Cloud
  // in the vast majority of setups).
  if (process.env.DB_SSL_CA && process.env.DB_SSL_CA.trim() !== '') {
    sslConfig.ca = fs.readFileSync(process.env.DB_SSL_CA);
  }
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 4000,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: useSSL ? sslConfig : undefined,
});

// Quick sanity check at boot so a bad .env fails loudly instead of
// silently breaking the first request that hits the DB.
async function verifyConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('✅ Connected to database');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('   Check DB_HOST / DB_USER / DB_PASSWORD / DB_NAME / DB_SSL in your .env');
  }
}

module.exports = { pool, verifyConnection };
