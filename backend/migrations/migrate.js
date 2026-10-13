const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { getPool, testConnection } = require('../src/config/db');

dotenv.config();

async function runMigration() {
  console.log('--- Starting Database Migration ---');
  const connCheck = await testConnection();
  if (!connCheck.ok) {
    console.error('Database connection failed:', connCheck.error);
    console.error('Please verify your .env settings for Aiven / MySQL credentials.');
    process.exit(1);
  }

  console.log(`Connected to database [${connCheck.database}] on [${connCheck.host}]. SSL: ${connCheck.sslEnabled}`);

  const schemaPath = path.join(__dirname, '001_create_schema.sql');
  const sqlContent = fs.readFileSync(schemaPath, 'utf8');

  // Split into statements respecting comments
  const statements = sqlContent
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    console.log(`Executing ${statements.length} migration statements...`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt.trim()) {
        await conn.query(stmt);
      }
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Database migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
