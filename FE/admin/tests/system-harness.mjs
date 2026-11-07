import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

// Only this Vite process is allowed through the browser firewall. All APIs are
// fulfilled in-process; no backend, geocoder, tiles, Google key or SSE server.
async function stopServer(server) {
  if (server.exitCode !== null || server.signalCode !== null) return;
  const closed = once(server, 'close');
  if (process.platform === 'win32' && server.pid) spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { timeout: 10000, windowsHide: true, stdio: 'ignore' });
  else server.kill('SIGTERM');
  await closed;
}

export async function start(port) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, VITE_GOOGLE_MAPS_API_KEY: 'offline-fixture-no-api-key', VITE_API_BASE_URL: '/api' },
  });
  let log = '';
  server.stdout.on('data', b => log += b); server.stderr.on('data', b => log += b);
  try {
    for (let i = 0; i < 100; i++) {
      if (server.exitCode !== null) throw new Error(`Vite exited: ${log}`);
      try { if (log.includes("Local:") && (await fetch(base)).ok) break; } catch {}
      if (i === 99) throw new Error(`Vite startup timed out: ${log}`);
      await delay(100);
    }
    const browser = await chromium.launch({ headless: true });
    return { base, browser, async close() { await browser.close(); await stopServer(server); } };
  } catch (e) { await stopServer(server); throw e; }
}

export async function fixture(app, handler, options = {}) {
  const context = await app.browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block', ...options });
  const requests = [], blocked = [], errors = [];
  await context.addInitScript(() => {
    window.__streams = [];
    window.EventSource = class extends EventTarget {
      constructor(url) { super(); this.url = url; this.readyState = 1; window.__streams.push(this); }
      close() { this.readyState = 2; }
    };
    window.__emit = (name, data) => window.__streams.filter(s => s.readyState === 1).forEach(s => s.dispatchEvent(new MessageEvent(name, { data: JSON.stringify({ data }) })));
  });
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin !== app.base) { blocked.push(req.url()); return route.abort(); }
    if (url.pathname.startsWith('/api/')) {
      requests.push({ method: req.method(), path: url.pathname, query: url.search, body: req.postDataJSON() });
      const result = await handler({ req, url, requests });
      if (result?.abort) return route.abort();
      return route.fulfill({ status: result?.status ?? 200, contentType: result?.contentType ?? 'application/json', body: typeof result?.body === 'string' ? result.body : JSON.stringify(result?.body ?? []) });
    }
    return route.continue();
  });
  const page = await context.newPage(); page.setDefaultTimeout(4000);
  page.on('pageerror', e => errors.push(e.message));
  return { page, requests, blocked, errors, async open() { await page.goto(app.base); }, async emit(name, data) { await page.evaluate(([n, d]) => window.__emit(n, d), [name, data]); }, async close() { await context.close(); }, assertHealthy() { assert.deepEqual(errors, []); } };
}

export async function nav(page, name) {
  const menu = page.getByRole('button', { name: 'Mở menu', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('navigation').getByRole('button', { name, exact: false }).click();
}

export async function visible(locator) { await locator.waitFor({ state: 'visible' }); }
export async function absent(locator) { await locator.waitFor({ state: 'hidden' }); }
export { assert, delay };
