// Explicit local-only preview: creates an isolated temporary MongoDB, never Azure.
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { createApp } = require('../app');
const { connectDatabase, seedDemo } = require('../database');

(async () => {
  const mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
  await mongoose.connection.db.createCollection('employees');
  await seedDemo();
  const server = createApp().listen(3107, '127.0.0.1', () => console.log('Local demo: http://127.0.0.1:3107'));
  const shutdown = () => server.close(async () => {
    await mongoose.disconnect();
    await mongo.stop();
    process.exit(0);
  });
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})().catch(() => { console.error('Local preview failed.'); process.exitCode = 1; });
