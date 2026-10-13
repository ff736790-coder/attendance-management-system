const http = require('http');
const dotenv = require('dotenv');
const app = require('./app');
const { testConnection } = require('./config/db');

dotenv.config();

const PORT = parseInt(process.env.PORT || '5000', 10);

const server = http.createServer(app);

async function startServer() {
  server.listen(PORT, async () => {
    console.log('====================================================');
    console.log('🚀 AI-POWERED ATTENDANCE MANAGEMENT SYSTEM STARTED');
    console.log(`📡 Server listening on: http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('====================================================');

    // Run startup database diagnostics
    try {
      const dbStatus = await testConnection();
      if (dbStatus.ok) {
        console.log(`✅ Database Connected: [${dbStatus.database}] on [${dbStatus.host}]`);
        console.log(`🔒 SSL/TLS Enabled: ${dbStatus.sslEnabled}`);
        console.log(`📦 Engine Version: ${dbStatus.version}`);
      } else {
        console.warn(`⚠️  Database Not Yet Connected: ${dbStatus.error}`);
        console.warn('💡 Tip: Run `npm run migrate` and `npm run seed` once your Aiven or MySQL credentials in .env are configured.');
      }
    } catch (err) {
      console.warn('⚠️  Database connectivity check failed on boot:', err.message);
    }

    const aiStatus = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '');
    console.log(`🤖 AI Provider: ${aiStatus ? 'OpenAI API Connected (' + (process.env.OPENAI_MODEL || 'gpt-4o-mini') + ')' : 'Deterministic Rule-Based Analytics Fallback Engine Active'}`);
    console.log('====================================================');
  });
}

// Graceful shutdown handling
function handleGracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Gracefully shutting down HTTP server...`);
  server.close(() => {
    console.log('HTTP server closed. Exiting process.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

if (require.main === module) {
  startServer();
}

module.exports = server;
