const createApp = require('./app');
const env = require('./config/env');
const { checkConnection } = require('./config/db');

async function start() {
  try {
    await checkConnection();
    console.log('MySQL connection established.');
  } catch (err) {
    console.error('Failed to connect to MySQL on startup:', err.message);
    process.exit(1);
  }

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Student Budget Planner API listening on port ${env.port} [${env.nodeEnv}]`);
  });
}

start();
