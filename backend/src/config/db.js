const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

let pool = null;
let isMockMode = process.env.DB_MOCK === 'true';

// Helper to configure SSL for Aiven Cloud or other managed MySQL
function getSslConfig() {
  const isAiven = (process.env.DB_HOST || '').includes('aivencloud.com');
  const requireSsl = process.env.DB_SSL === 'true' || isAiven;

  if (!requireSsl) {
    return false;
  }

  const sslOptions = {
    // In production, reject unauthorized certificates
    rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : (process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false')
  };

  if (process.env.DB_SSL_CA_PATH) {
    const certPath = path.resolve(process.cwd(), process.env.DB_SSL_CA_PATH);
    if (fs.existsSync(certPath)) {
      sslOptions.ca = fs.readFileSync(certPath, 'utf8');
    }
  } else if (process.env.DB_SSL_CA) {
    sslOptions.ca = process.env.DB_SSL_CA;
  }

  return sslOptions;
}

function getPool() {
  if (pool) return pool;

  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'attendance_db',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
    queueLimit: 0,
    timezone: '+00:00',
    dateStrings: true
  };

  const ssl = getSslConfig();
  if (ssl) {
    config.ssl = ssl;
  }

  pool = mysql.createPool(config);
  return pool;
}

const { mockDb } = require('./mockDb');

/**
 * Execute parameterized query with connection pool
 * @param {string} sql - SQL query with ? placeholders
 * @param {Array} params - Parameter array
 */
async function query(sql, params = []) {
  if (isMockMode && !pool) {
    return await mockDb.execute(sql, params);
  }
  try {
    const dbPool = getPool();
    const [results] = await dbPool.execute(sql, params);
    return results;
  } catch (err) {
    if (['ECONNREFUSED', 'ER_ACCESS_DENIED_ERROR', 'ENOTFOUND'].includes(err.code) && process.env.NODE_ENV !== 'production') {
      if (!isMockMode) {
        console.warn(`[Database Notice]: MySQL server not reachable (${err.code}). Engaging in-memory demo database.`);
        isMockMode = true;
      }
      return await mockDb.execute(sql, params);
    }
    throw err;
  }
}

/**
 * Acquire a dedicated connection for multi-step transactions
 */
async function getConnection() {
  if (isMockMode) {
    return {
      query: (s, p) => mockDb.execute(s, p),
      release: () => {}
    };
  }
  const dbPool = getPool();
  return await dbPool.getConnection();
}

/**
 * Test connectivity and report database metadata
 */
async function testConnection() {
  if (isMockMode) {
    return { ok: true, version: 'In-Memory Simulation (Offline Ready)', database: 'attendance_demo_db', host: 'Local Memory', sslEnabled: false };
  }
  try {
    const dbPool = getPool();
    const [rows] = await dbPool.query('SELECT 1 as connected, VERSION() as version, DATABASE() as db');
    return {
      ok: true,
      version: rows[0].version,
      database: rows[0].db,
      host: process.env.DB_HOST || 'localhost',
      sslEnabled: Boolean(getSslConfig())
    };
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      isMockMode = true;
      return { ok: true, version: 'In-Memory Simulation (Offline Ready)', database: 'attendance_demo_db', host: 'Local Memory', sslEnabled: false };
    }
    return {
      ok: false,
      error: err.message,
      code: err.code
    };
  }
}

function setMockMode(enabled) {
  isMockMode = enabled;
}

module.exports = {
  getPool,
  query,
  getConnection,
  testConnection,
  setMockMode
};
