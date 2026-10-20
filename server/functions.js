const { app } = require('@azure/functions');
const { createFunctionHandler } = require('./function-handler');
app.http('nodebucket', {
  route: '{*path}',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  authLevel: 'anonymous',
  handler: createFunctionHandler(),
});
