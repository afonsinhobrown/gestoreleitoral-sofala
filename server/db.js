const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000, // 10 segundos
  idleTimeoutMillis: 30000,
  max: 20
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
