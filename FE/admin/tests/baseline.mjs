import { start } from './system-harness.mjs';
const app = await start(5274);
process.env.ADMIN_URL = app.base;
try { await import('./smoke.mjs'); } finally { await app.close(); }
