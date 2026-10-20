const express = require('express');
const { rateLimit } = require('express-rate-limit');
const mongoose = require('mongoose');
const path = require('node:path');
const employeeRouter = require('./routes/employee-api');

function createApp({ rateLimitMax = 120 } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });
  app.get('/health', (req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'unavailable' });
  });
  // A global limit avoids trusting visitor-supplied proxy headers.
  // Intended for one F1 instance, not per-user production quotas.
  app.use('/api', rateLimit({
    windowMs: 60000, limit: rateLimitMax, keyGenerator: () => 'shared-demo',
    standardHeaders: 'draft-8', legacyHeaders: false,
    message: { err: 'The demo is busy. Please try again in a minute.' },
  }));
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: '16kb' }));
  app.use('/api/employees', employeeRouter);
  app.use('/api', (req, res) => res.status(404).json({ err: 'API route not found.' }));
  app.use(express.static(path.join(__dirname, '../dist/nodebucket')));
  app.get('/{*route}', (req, res, next) => {
    res.sendFile(path.join(__dirname, '../dist/nodebucket/index.html'), error => {
      if (error) next(error);
    });
  });
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === 'entity.too.large') return res.status(413).json({ err: 'Request is too large.' });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ err: 'Invalid JSON.' });
    if (error.name === 'VersionError') return res.status(409).json({ err: 'Another visitor changed the board. Please try again.' });
    if (error.name === 'ValidationError') return res.status(400).json({ err: 'Invalid task.' });
    res.status(503).json({ err: 'The demo is temporarily unavailable. Please try again.' });
  });
  return app;
}
module.exports = { createApp };
