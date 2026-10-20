const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { createApp } = require('../app');
const { connectDatabase, seedDemo, DEMO_ID } = require('../database');
const Employee = require('../models/employee');

let mongo;
let server;
let base;
before(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
  // Azure creates this explicitly through Bicep. Tests use a local MongoDB.
  await mongoose.connection.db.createCollection('employees');
  server = createApp({ rateLimitMax: 1000 }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(async () => {
  await Employee.deleteMany({});
  await seedDemo();
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
async function request(path, method = 'GET', body) {
  const response = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}
const tasksUrl = '/api/employees/1007/tasks';

test('create, persist, move and delete a task; seed does not erase changes', async () => {
  assert.equal((await request('/health')).status, 200);
  const created = await request(tasksUrl, 'POST', { text: 'Test Azure persistence' });
  assert.equal(created.status, 201);
  const task = created.body.todo.at(-1);
  await seedDemo();
  const loaded = await request(tasksUrl);
  assert.equal(loaded.body.todo.at(-1)._id, task._id);
  const moved = await request(tasksUrl, 'PUT', { todo: loaded.body.todo.slice(0, -1), done: [task] });
  assert.equal(moved.status, 200);
  assert.equal(moved.body.done[0]._id, task._id);
  const deleted = await request(`${tasksUrl}/${task._id}`, 'DELETE');
  assert.equal(deleted.status, 200);
  assert.equal(deleted.body.done.length, 0);
  assert.equal((await request(`${tasksUrl}/${task._id}`, 'DELETE')).status, 404);
});

test('only the public demo document is accessible; reject malformed input', async () => {
  assert.equal((await request('/api/employees/1012')).status, 404);
  assert.equal((await request('/api/employees/%7B%22%24ne%22%3Anull%7D')).status, 404);
  for (const text of ['', '  ', 'a', 'x'.repeat(36), { $gt: '' }]) {
    assert.equal((await request(tasksUrl, 'POST', { text })).status, 400);
  }
  assert.equal((await request(tasksUrl, 'PUT', { todo: {}, done: [] })).status, 400);
  assert.equal((await request(`${tasksUrl}/invalid`, 'DELETE')).status, 400);
  assert.equal((await request('/api/missing')).status, 404);
  assert.equal((await request(tasksUrl, 'POST', { text: 'x'.repeat(20000) })).status, 413);
  const malformed = await fetch(base + tasksUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  });
  assert.equal(malformed.status, 400);
});

test('stale reorder cannot erase a new task, change text, or duplicate IDs', async () => {
  const old = (await request(tasksUrl)).body;
  await request(tasksUrl, 'POST', { text: 'Added by another visitor' });
  assert.equal((await request(tasksUrl, 'PUT', { todo: old.todo, done: [] })).status, 409);
  const current = (await request(tasksUrl)).body;
  assert.equal((await request(tasksUrl, 'PUT', { todo: [current.todo[0], current.todo[0]], done: [] })).status, 409);
  current.todo[0].text = 'Changed text';
  assert.equal((await request(tasksUrl, 'PUT', { todo: current.todo, done: [] })).status, 409);
  assert.equal((await request(tasksUrl)).body.todo.length, 2);
});

test('concurrent additions cannot exceed the 50-task storage bound', async () => {
  await Employee.updateOne({ _id: DEMO_ID }, {
    $set: { todo: Array.from({ length: 49 }, (_, i) => ({ text: `Task ${i}` })), done: [] },
  });
  const responses = await Promise.all(Array.from({ length: 8 }, () =>
    request(tasksUrl, 'POST', { text: 'Concurrent task' })));
  assert.equal(responses.filter(response => response.status === 201).length, 1);
  assert.ok(responses.every(response => [201, 409].includes(response.status)));
  assert.equal((await request(tasksUrl)).body.todo.length, 50);
});

test('global rate limiting cannot be bypassed by spoofed proxy headers', async () => {
  const limited = createApp({ rateLimitMax: 2 }).listen(0, '127.0.0.1');
  await new Promise(resolve => limited.once('listening', resolve));
  try {
    const url = `http://127.0.0.1:${limited.address().port}${tasksUrl}`;
    assert.equal((await fetch(url)).status, 200);
    assert.equal((await fetch(url)).status, 200);
    assert.equal((await fetch(url, { headers: { 'X-Forwarded-For': '203.0.113.10' } })).status, 429);
  } finally {
    await new Promise(resolve => limited.close(resolve));
  }
});
