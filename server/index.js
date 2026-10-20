const mongoose = require('mongoose');
const { createApp } = require('./app');
const { connectDatabase, seedDemo } = require('./database');

async function start() {
  await connectDatabase();
  await seedDemo();
  const server = createApp().listen(process.env.PORT || 3000, '0.0.0.0', () => {
    console.log('Nodebucket is ready.');
  });
  const shutdown = () => server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch(() => {
  // Driver errors can contain credentials or host details.
  console.error('Startup failed. Check the database connection and provisioned employees collection.');
  process.exitCode = 1;
});
