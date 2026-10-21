const mongoose = require('mongoose');
const Employee = require('./models/employee');
const { DEMO_ID, SEED_TASK_ID } = require('./retention');

async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) throw new Error('MONGODB_URI is required.');
  return mongoose.connect(uri, {
    dbName: process.env.MONGODB_DATABASE || 'nodebucket',
    retryWrites: false, autoCreate: false, autoIndex: false,
    maxPoolSize: 5, serverSelectionTimeoutMS: 15000,
  });
}

async function seedDemo() {
  // One fixed document; restarts do not overwrite visitors' tasks.
  await Employee.updateOne({ _id: DEMO_ID }, {
    $setOnInsert: {
      empId: 1007, firstName: 'Demo', lastName: 'Visitor', __v: 0,
      todo: [{ _id: SEED_TASK_ID, text: 'Try moving this task to Done', isDemo: true }], done: [],
    },
  }, { upsert: true });
}
module.exports = { connectDatabase, seedDemo, DEMO_ID };
