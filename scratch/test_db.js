const { Client } = require('../BE/node_modules/pg');
const c = new Client({
  host: 'localhost',
  port: 5433,
  user: 'postgres',
  password: '123',
  database: 'saigondrain',
});
c.connect().then(async () => {
  const now = new Date();
  const clearDate = new Date(now.getTime() + 42 * 60000);
  const clearHourStr = String(clearDate.getHours()).padStart(2, '0');
  const clearMinStr = String(clearDate.getMinutes()).padStart(2, '0');
  const clearTimeStr = `${clearHourStr}:${clearMinStr}, 08/11/2026`;
  await c.query(`UPDATE flood_reports SET "createdAt" = $1, "reportedDepth" = 30, "aiDepth" = 30, estimateddurationmin = 42, estimatedclearat = $2 WHERE id = $3`, [now, clearTimeStr, 'RP-2422']);
  console.log('Updated RP-2422 to fresh time:', clearTimeStr);
  await c.end();
}).catch(console.error);
