const RETENTION_MS = 96 * 60 * 60 * 1000;
const DEMO_ID = '000000000000000000001007';
const SEED_TASK_ID = '000000000000000000001008';
const expired = (task, now) => task.isDemo === false && task.expiresAt && +new Date(task.expiresAt) <= now;
async function cleanup(collection, now = Date.now()) {
  const match = { isDemo: false, expiresAt: { $lte: new Date(now) } };
  // Bump the board version atomically so stale drag-and-drop cannot restore removed tasks.
  const result = await collection.updateMany({ $or: [{ todo: { $elemMatch: match } }, { done: { $elemMatch: match } }] }, {
    $pull: { todo: match, done: match }, $inc: { __v: 1 }
  });
  return { boardsCleaned: result.modifiedCount };
}
module.exports = { RETENTION_MS, DEMO_ID, SEED_TASK_ID, expired, cleanup };
