const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { getPool, testConnection } = require('../src/config/db');

dotenv.config();

async function runSeed() {
  console.log('--- Starting Database Seeding ---');
  const connCheck = await testConnection();
  if (!connCheck.ok) {
    console.error('Database connection failed:', connCheck.error);
    process.exit(1);
  }

  const seedPath = path.join(__dirname, 'seed_data.sql');
  const sqlContent = fs.readFileSync(seedPath, 'utf8');

  const statements = sqlContent
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    console.log(`Executing ${statements.length} seed statements...`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt.trim()) {
        await conn.query(stmt);
      }
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Database seeding completed successfully!');
    console.log('--- Seed Accounts Ready ---');
    console.log('Admin:   admin@college.edu       / Password@123');
    console.log('Faculty: prof.sharma@college.edu / Password@123');
    console.log('Faculty: dr.aditi@college.edu    / Password@123');
    console.log('Student: rahul.verma@college.edu / Password@123');
    console.log('Student: amit.patel@college.edu  / Password@123 (Low attendance demonstration)');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

if (require.main === module) {
  runSeed();
}

module.exports = { runSeed };
