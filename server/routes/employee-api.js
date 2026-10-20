const express = require('express');
const { handleTasks } = require('../tasks');
const router = express.Router();
router.use(async (req, res) => {
  const result = await handleTasks(req.method, '/employees' + req.path, req.body);
  res.status(result.status).json(result.jsonBody);
});
module.exports = router;
