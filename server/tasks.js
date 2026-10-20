const Employee = require('./models/employee');
const { DEMO_ID } = require('./database');
const MAX_TASKS = 50;
const objectIdPattern = /^[a-f0-9]{24}$/;
const validText = text => typeof text === 'string' && text.trim().length >= 3 && text.trim().length <= 35;
const reply = (status, jsonBody) => ({ status, jsonBody });
const fail = (status, err) => reply(status, { err });

async function handleTasks(method, path, body) {
  const route = /^\/employees\/([^/]+)(?:\/(tasks)(?:\/([^/]+))?)?\/?$/.exec(path);
  if (!route) return fail(404, 'API route not found.');
  const [, empId, resource, taskId] = route;
  if (empId !== '1007') return fail(404, 'Use demo employee ID 1007.');
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method) ||
      (method !== 'GET' && !resource) || (taskId && method !== 'DELETE') ||
      (method === 'DELETE' && !taskId)) return fail(404, 'API route not found.');

  if (method === 'POST' && !validText(body?.text)) return fail(400, 'Task names must contain 3–35 characters.');
  if (method === 'DELETE' && !objectIdPattern.test(taskId)) return fail(400, 'Invalid task ID.');
  if (method === 'PUT') {
    if (!Array.isArray(body?.todo) || !Array.isArray(body?.done) || body.todo.length + body.done.length > MAX_TASKS) {
      return fail(400, 'Provide valid task lists with at most 50 tasks.');
    }
    if ([...body.todo, ...body.done].some(task => !task || !objectIdPattern.test(task._id) || !validText(task.text))) {
      return fail(400, 'Invalid task.');
    }
  }
  const employee = await Employee.findById(DEMO_ID);
  if (!employee) return fail(503, 'The demo is being prepared. Please try again.');
  if (method === 'GET') return reply(200, employee.toJSON());
  if (method === 'POST') {
    if (employee.todo.length + employee.done.length >= MAX_TASKS) return fail(409, 'This shared demo holds 50 tasks. Delete a task before adding another.');
    employee.todo.push({ text: body.text.trim() });
  }
  if (method === 'PUT') {
    const tasks = [...body.todo, ...body.done];
    const existing = new Map([...employee.todo, ...employee.done].map(task => [String(task._id), task.text]));
    const ids = new Set(tasks.map(task => task._id));
    if (ids.size !== tasks.length || ids.size !== existing.size || tasks.some(task => existing.get(task._id) !== task.text)) {
      return fail(409, 'The shared board changed. Reloaded the latest tasks; please try again.');
    }
    employee.todo = body.todo.map(({ _id, text }) => ({ _id, text }));
    employee.done = body.done.map(({ _id, text }) => ({ _id, text }));
  }
  if (method === 'DELETE') {
    const task = employee.todo.id(taskId) || employee.done.id(taskId);
    if (!task) return fail(404, 'That task was already removed.');
    task.deleteOne();
  }
  await employee.save();
  return reply(method === 'POST' ? 201 : 200, employee.toJSON());
}

function errorResponse(error) {
  if (error.name === 'VersionError') return fail(409, 'Another visitor changed the board. Please try again.');
  if (error.name === 'ValidationError') return fail(400, 'Invalid task.');
  return fail(503, 'The demo is temporarily unavailable. Please try again.');
}
module.exports = { handleTasks, errorResponse };
