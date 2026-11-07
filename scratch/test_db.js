const { Client } = require('../BE/node_modules/pg');
const c = new Client({
  host: 'localhost',
  port: 5433,
  user: 'postgres',
  password: '123',
  database: 'saigondrain',
});
c.connect().then(async () => {
  await c.query(`UPDATE flood_reports SET estimateddurationmin = 45, estimatedclearat = '01:10, 08/11/2026', drainageratecmpermin = 0.65 WHERE estimateddurationmin IS NULL`);
  console.log('Updated estimates for null reports successfully');
  await c.end();
}).catch(console.error);
