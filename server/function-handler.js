const mongoose = require('mongoose');
const { connectDatabase, seedDemo } = require('./database');
const { handleTasks, errorResponse } = require('./tasks');
let ready;

async function ensureDatabase() {
  if (!ready) {
    ready = (async () => {
      if (mongoose.connection.readyState !== 1) await connectDatabase();
      await seedDemo();
    })().catch(error => { ready = undefined; throw error; });
  }
  return ready;
}

function createFunctionHandler({ prepare = ensureDatabase, limit = 120, now = Date.now } = {}) {
  let windowStart = now();
  let requests = 0;
  return async function handler(request) {
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    const response = result => ({ ...result, headers });
    if (now() - windowStart >= 60000) { windowStart = now(); requests = 0; }
    // Per warm function instance. Cosmos's account throughput cap is independent.
    if (++requests > limit) return response({ status: 429, jsonBody: { err: 'The demo is busy. Please try again in a minute.' } });
    const path = '/' + (request.params.path || '');
    let body;
    try {
      if (request.method === 'POST' || request.method === 'PUT') {
        if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return response({ status: 415, jsonBody: { err: 'Use JSON.' } });
        if (Number(request.headers.get('content-length')) > 16384) return response({ status: 413, jsonBody: { err: 'Request is too large.' } });
        const raw = await request.text();
        if (Buffer.byteLength(raw) > 16384) return response({ status: 413, jsonBody: { err: 'Request is too large.' } });
        try { body = JSON.parse(raw); }
        catch { return response({ status: 400, jsonBody: { err: 'Invalid JSON.' } }); }
      }
      await prepare();
      if (path === '/health' && request.method === 'GET') {
        // A real ping checks Cosmos, rather than trusting a cached connection state.
        await mongoose.connection.db.command({ ping: 1 });
        return response({ status: 200, jsonBody: { status: 'ok' } });
      }
      return response(await handleTasks(request.method, path, body));
    } catch (error) {
      return response(errorResponse(error));
    }
  };
}
module.exports = { createFunctionHandler };
