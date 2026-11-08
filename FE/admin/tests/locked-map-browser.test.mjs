import { test } from 'node:test';
import { start, fixture, nav, visible, absent, assert } from './system-harness.mjs';

test('admin lock hides marker and popup, unlock restores it, polling catches remote locks without SSE', async () => {
  const app = await start(5274);
  let report = { id: 'RP-GPS', location: 'Synthetic street', district: 'Bình Thạnh', reportedAt: '18:00', minutesAgo: 1, description: 'Fixture', reportedDepth: 25, aiDepth: 25, aiConfidence: 95, severity: 'high', status: 'verified', priority: 'Bình thường', coordinates: '10.776,106.695', visual: 'street' };
  let reads = 0;
  let holdNextRead = false, releaseSnapshot;
  let snapshotStarted;
  const f = await fixture(app, async ({ req, url }) => {
    if (url.pathname.endsWith('/toggle-lock')) {
      report = { ...report, status: report.status === 'rejected' ? 'verified' : 'rejected' };
      return { body: { report } };
    }
    if (url.pathname === '/api/reports') {
      reads++;
      if (holdNextRead) {
        holdNextRead = false;
        const snapshot = { ...report };
        snapshotStarted();
        return new Promise(resolve => { releaseSnapshot = () => resolve({ body: [snapshot] }); });
      }
      return { body: [report] };
    }
    if (url.pathname === '/api/weather/current') return { body: { temperatureC: 28, weatherCondition: 'Fixture weather', currentRainMm: 0 } };
    return { body: [] };
  });
  try {
    await f.page.clock.install();
    await f.open();
    await nav(f.page, 'Báo cáo cộng đồng');
    await visible(f.page.locator('.map-marker'));
    if (!await f.page.locator('.community-report-popup').isVisible()) await f.page.locator('.map-marker').click();
    await f.page.getByRole('button', { name: 'Khóa điểm ngập', exact: true }).click();
    await absent(f.page.locator('.map-marker'));
    await absent(f.page.locator('.community-report-popup'));
    await visible(f.page.locator('tbody tr'));
    await f.page.locator('tbody').getByRole('button', { name: 'Mở khóa', exact: true }).click();
    await visible(f.page.locator('.map-marker'));
    // A snapshot already in flight must not undo a newer local lock action.
    holdNextRead = true;
    const pendingSnapshot = new Promise(resolve => { snapshotStarted = resolve; });
    await f.page.clock.fastForward(16000);
    await pendingSnapshot;
    if (!await f.page.locator('.community-report-popup').isVisible()) await f.page.locator('.map-marker').click();
    await f.page.getByRole('button', { name: 'Khóa điểm ngập', exact: true }).click();
    await absent(f.page.locator('.map-marker'));
    const staleResponse = f.page.waitForResponse(r => new URL(r.url()).pathname === '/api/reports');
    releaseSnapshot();
    await staleResponse;
    await f.page.waitForTimeout(100);
    await absent(f.page.locator('.map-marker'));
    await f.page.locator('tbody').getByRole('button', { name: 'Mở khóa', exact: true }).click();
    await visible(f.page.locator('.map-marker'));
    const previousReads = reads;
    report = { ...report, status: 'rejected' };
    await f.page.clock.fastForward(16000);
    await absent(f.page.locator('.map-marker'));
    assert.ok(reads > previousReads, 'poll must fetch fresh reports without SSE');
    await f.page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    f.assertHealthy();
  } finally { await f.close(); await app.close(); }
});
