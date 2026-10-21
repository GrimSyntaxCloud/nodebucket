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
  const moved = await request(tasksUrl, 'PUT', { version: loaded.body.__v, todo: loaded.body.todo.slice(0, -1), done: [task] });
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
  assert.equal((await request(tasksUrl, 'PUT', { version: old.__v, todo: old.todo, done: [] })).status, 409);
  const current = (await request(tasksUrl)).body;
  assert.equal((await request(tasksUrl, 'PUT', { version: current.__v, todo: [current.todo[0], current.todo[0]], done: [] })).status, 409);
  current.todo[0].text = 'Changed text';
  assert.equal((await request(tasksUrl, 'PUT', { version: current.__v, todo: current.todo, done: [] })).status, 409);
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

test('Azure Functions adapter persists tasks and verifies a real database ping', async () => {
  const { HttpRequest } = require('@azure/functions');
  const { createFunctionHandler } = require('../function-handler');
  const handler = createFunctionHandler();
  const call = (path, method = 'GET', body) => handler(new HttpRequest({
    url: `https://example.test/api/${path}`, method, params: { path },
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: { string: JSON.stringify(body) } }),
  }));
  assert.equal((await call('health')).jsonBody.status, 'ok');
  const result = await call('employees/1007/tasks', 'POST', { text: 'Function test task' });
  assert.equal(result.status, 201);
  const task = result.jsonBody.todo.at(-1);
  assert.equal((await call('employees/1007/tasks')).jsonBody.todo.length, 2);
  assert.equal((await call('employees/1007/tasks', 'PUT', {
    version: result.jsonBody.__v, todo: result.jsonBody.todo.slice(0, -1), done: [task],
  })).status, 200);
  assert.equal((await call(`employees/1007/tasks/${task._id}`, 'DELETE')).status, 200);
  assert.equal((await call('employees/1012')).status, 404);
  assert.equal((await call('employees/1007/tasks', 'POST', { text: 'x'.repeat(20000) })).status, 413);
  const invalid = await handler(new HttpRequest({
    url: 'https://example.test/api/employees/1007/tasks', method: 'POST',
    params: { path: 'employees/1007/tasks' }, headers: { 'Content-Type': 'application/json' }, body: { string: '{' },
  }));
  assert.equal(invalid.status, 400);
});

test('Azure Functions throttles requests and hides connection error details', async () => {
  const { HttpRequest } = require('@azure/functions');
  const { createFunctionHandler } = require('../function-handler');
  const request = () => new HttpRequest({
    url: 'https://example.test/api/health', method: 'GET', params: { path: 'health' },
  });
  let time = 0;
  const limited = createFunctionHandler({ limit: 1, now: () => time });
  assert.equal((await limited(request())).status, 200);
  assert.equal((await limited(request())).status, 429);
  time = 60001;
  assert.equal((await limited(request())).status, 200);
  const unavailable = createFunctionHandler({ prepare: async () => { throw new Error('private connection details'); } });
  const result = await unavailable(request());
  assert.equal(result.status, 503);
  assert.ok(!JSON.stringify(result).includes('private connection'));
});

// Two tabs can contain exactly the same tasks but different board positions.
test('an older tab cannot undo another visitor’s move or reorder', async () => {
  await request(tasksUrl, 'POST', { text: 'Second task' });
  const original = (await request(tasksUrl)).body;
  const moved = await request(tasksUrl, 'PUT', { version: original.__v, todo: original.todo.slice(1), done: [original.todo[0]] });
  assert.equal(moved.status, 200);
  const stale = await request(tasksUrl, 'PUT', { version: original.__v, todo: original.todo.slice().reverse(), done: [] });
  assert.equal(stale.status, 409);
  assert.equal((await request(tasksUrl)).body.done[0]._id, original.todo[0]._id);
  assert.equal((await request(tasksUrl, 'PUT', { todo: moved.body.todo, done: moved.body.done })).status, 400);
  const fresh = await request(tasksUrl, 'PUT', { version: moved.body.__v, todo: [...moved.body.todo, ...moved.body.done], done: [] });
  assert.equal(fresh.status, 200);
});

test('both adapters reject non-JSON writes; unreadable function bodies return a controlled error', async () => {
  const result = await fetch(base + tasksUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{"text":"Cross-site task"}' });
  assert.equal(result.status, 415);
  const { HttpRequest } = require('@azure/functions');
  const { createFunctionHandler } = require('../function-handler');
  const handler = createFunctionHandler();
  assert.equal((await handler(new HttpRequest({ url: 'https://example.test/api/employees/1007/tasks', method: 'POST', params: { path: 'employees/1007/tasks' }, headers: { 'Content-Type': 'text/plain' }, body: { string: '{"text":"Cross-site task"}' } }))).status, 415);
  const broken = { method: 'POST', params: { path: 'employees/1007/tasks' }, headers: new Headers({ 'Content-Type': 'application/json' }), text: async () => { throw new Error('private body details'); } };
  const response = await handler(broken);
  assert.equal(response.status, 503);
  assert(!JSON.stringify(response).includes('private body details'));
});

test('96-hour expiry survives task moves, protects seed data, and invalidates stale boards', async () => {
  const { handleTasks } = require('../tasks');
  const { RETENTION_MS, SEED_TASK_ID, cleanup } = require('../retention');
  const time = Date.now();
  const created = await handleTasks('POST', '/employees/1007/tasks', { text: 'Expires on schedule', isDemo: true }, time);
  const task = created.jsonBody.todo.at(-1);
  assert.equal(task.isDemo, false);
  assert.equal(+task.expiresAt, time + RETENTION_MS);
  const moved = await handleTasks('PUT', '/employees/1007/tasks', JSON.parse(JSON.stringify({ version: created.jsonBody.__v, todo: created.jsonBody.todo.slice(0,-1), done: [{ ...task, expiresAt: '2099-01-01', isDemo: true }] })), time + 1000);
  assert.equal(moved.status, 200);
  assert.equal(+moved.jsonBody.done[0].expiresAt, time + RETENTION_MS);
  assert.equal(moved.jsonBody.done[0].isDemo, false);
  assert.equal((await handleTasks('DELETE', `/employees/1007/tasks/${SEED_TASK_ID}`, null, time)).status, 403);
  assert.equal((await handleTasks('GET', '/employees/1007/tasks', null, time + RETENTION_MS - 1)).jsonBody.done.length, 1);
  const expired = await handleTasks('GET', '/employees/1007/tasks', null, time + RETENTION_MS);
  assert.equal(expired.jsonBody.done.length, 0);
  assert.equal(expired.jsonBody.todo[0].isDemo, true);
  assert.equal((await handleTasks('PUT', '/employees/1007/tasks', { version: moved.jsonBody.__v, todo: moved.jsonBody.todo, done: moved.jsonBody.done }, time + RETENTION_MS)).status, 409);
  assert.deepEqual(await cleanup(Employee.collection, time + RETENTION_MS), { boardsCleaned: 0 });
});
