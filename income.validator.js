const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const env = require('./config/env');
const buildApiRouter = require('./routes/index');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');

function createApp() {
  const app = express();

  // Security & parsing middleware
  app.use(helmet());
  app.use(cors({ origin: env.cors.origin }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  if (!env.isTest) {
    app.use(morgan(env.isProduction ? 'combined' : 'dev'));
  }

  // Health check — useful for Docker/CI/uptime monitors
  app.get('/health', (req, res) => {
    res.status(200).json({ success: true, message: 'OK' });
  });

  // All business routes live under /api
  app.use('/api', buildApiRouter());

  // 404 + centralized error handler (must be registered last, in this order)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
