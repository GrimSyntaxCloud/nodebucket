const express = require('express');
const Employee = require('../models/employee');
const { DEMO_ID } = require('../database');
const router = express.Router();
const MAX_TASKS = 50;
const objectIdPattern = /^[a-f0-9]{24}$/;
const validText = text => typeof text === 'string' && text.trim().length >= 3 && text.trim().length <= 35;

router.param('empId', (req, res, next, empId) => {
  if (empId !== '1007') return res.status(404).json({ err: 'Use demo employee ID 1007.' });
  next();
});
async function getDemo(res) {
  const employee = await Employee.findById(DEMO_ID);
  if (!employee) res.status(503).json({ err: 'The demo is being prepared. Please try again.' });
  return employee;
}
router.get(['/:empId', '/:empId/tasks'], async (req, res) => {
  const employee = await getDemo(res);
  if (employee) res.json(employee);
});
router.post('/:empId/tasks', async (req, res) => {
  if (!validText(req.body?.text)) return res.status(400).json({ err: 'Task names must contain 3–35 characters.' });
  const employee = await getDemo(res);
  if (!employee) return;
  if (employee.todo.length + employee.done.length >= MAX_TASKS) {
    return res.status(409).json({ err: 'This shared demo holds 50 tasks. Delete a task before adding another.' });
  }
  employee.todo.push({ text: req.body.text.trim() });
  // Optimistic concurrency prevents simultaneous additions exceeding the cap.
  await employee.save();
  res.status(201).json(employee);
});
router.put('/:empId/tasks', async (req, res) => {
  const { todo, done } = req.body || {};
  if (!Array.isArray(todo) || !Array.isArray(done) || todo.length + done.length > MAX_TASKS) {
    return res.status(400).json({ err: 'Provide valid task lists with at most 50 tasks.' });
  }
  const tasks = [...todo, ...done];
  if (tasks.some(task => !task || !objectIdPattern.test(task._id) || !validText(task.text))) {
    return res.status(400).json({ err: 'Invalid task.' });
  }
  const employee = await getDemo(res);
  if (!employee) return;
  const existing = new Map([...employee.todo, ...employee.done].map(task => [String(task._id), task.text]));
  const ids = new Set(tasks.map(task => task._id));
  if (ids.size !== tasks.length || ids.size !== existing.size || tasks.some(task => existing.get(task._id) !== task.text)) {
    return res.status(409).json({ err: 'The shared board changed. Reloaded the latest tasks; please try again.' });
  }
  // Reorder/move only; cannot inject records or erase new tasks.
  employee.todo = todo.map(({ _id, text }) => ({ _id, text }));
  employee.done = done.map(({ _id, text }) => ({ _id, text }));
  await employee.save();
  res.json(employee);
});
router.delete('/:empId/tasks/:taskId', async (req, res) => {
  if (!objectIdPattern.test(req.params.taskId)) return res.status(400).json({ err: 'Invalid task ID.' });
  const employee = await getDemo(res);
  if (!employee) return;
  const task = employee.todo.id(req.params.taskId) || employee.done.id(req.params.taskId);
  if (!task) return res.status(404).json({ err: 'That task was already removed.' });
  task.deleteOne();
  await employee.save();
  res.json(employee);
});
module.exports = router;
