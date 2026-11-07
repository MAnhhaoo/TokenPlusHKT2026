import { before, after, test } from 'node:test';
import { start, fixture, nav, visible, absent, assert, delay } from './system-harness.mjs';
let app;
before(async () => { app = await start(5274); });
after(async () => { await app?.close(); });
const report = (id = 'RP-TEST') => ({ id, location: `Synthetic ${id}`, district: 'Bình Thạnh', reportedAt: '18:00', minutesAgo: 5, description: 'Synthetic flood', reportedDepth: 25, aiDepth: 26, aiConfidence: 90, severity: 'high', status: 'pending', priority: 'Bình thường', coordinates: '10.79,106.71', historyCount: 2, visual: 'street' });
const user = { id: 'U-TEST', name: 'Synthetic Citizen', initials: 'SC', phone: '0900000000', email: 'citizen@example.test', district: 'Bình Thạnh', joinedAt: '01/11/2026', lastActive: '5 phút trước', reports: 2, verifiedReports: 1, rejectedReports: 0, trustScore: 90, status: 'active', identityVerified: true, warnings: 0 };
const weather = { provider: 'Fixture', locationName: 'TP.HCM', temperatureC: 28, humidityPercent: 80, windSpeedKmh: 5, currentRainMm: 0, weatherCondition: 'Fixture weather', floodRiskLevel: 'Thấp' };
function api(overrides = {}) {
  return async ({ req, url }) => {
    const key = `${req.method()} ${url.pathname}`;
    if (overrides[key]) return overrides[key]({ req, url });
    const data = { '/api/reports': [report(), report('RP-REJECT')], '/api/users': [user], '/api/alerts': [], '/api/map/points': [], '/api/weather/current': weather, '/api/analytics/trends': Object.fromEntries(['24h', '7d', '30d'].map(k => [k, { labels: ['00h', '01h'], reports: [1, 2], rain: [0, 1], insight: 'Synthetic trend' }])) };
    if (req.method() === 'GET' && url.pathname in data) return { body: data[url.pathname] };
    return { status: 501, body: { message: `Unmocked ${key}` } };
  };
}
async function run(handler, body) {
  const f = await fixture(app, handler);
  try { await f.open(); await visible(f.page.getByText('Fixture weather', { exact: false }).first()); await body(f); f.assertHealthy(); } finally { await f.close(); }
}
test('FE-A01 approve and reject use PATCH payloads and server results', async () => run(api({
  'PATCH /api/reports/RP-TEST/approve': () => ({ body: { report: { ...report(), status: 'verified' } } }),
  'PATCH /api/reports/RP-REJECT/reject': () => ({ body: { report: { ...report('RP-REJECT'), status: 'rejected' } } }),
}), async ({ page, requests }) => {
  await page.locator('.report-item').filter({ hasText: 'RP-TEST' }).click();
  await page.getByRole('button', { name: 'Xác nhận báo cáo', exact: true }).click();
  await absent(page.getByRole('dialog'));
  assert.equal(await page.locator('.queue-count').innerText(), '1');
  await page.locator('.report-item').filter({ hasText: 'RP-REJECT' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Từ chối', exact: true }).click();
  await page.getByLabel('Lý do từ chối').selectOption({ label: 'Không đủ căn cứ xác minh' });
  await page.getByRole('button', { name: 'Xác nhận từ chối', exact: true }).click();
  await absent(page.getByRole('dialog'));
  assert.equal(await page.locator('.queue-count').innerText(), '0');
  assert.equal(requests.find(r => r.path.endsWith('/reject')).body.reason, 'Không đủ căn cứ xác minh');
}));
test('FE-A02 alert validation, create, edit and end lifecycle', async () => {
  let saved;
  await run(api({
    'POST /api/alerts': ({ req }) => ({ body: saved = { ...req.postDataJSON(), id: 'AL-TEST', startedAt: '18:00', status: 'active', createdBy: 'Fixture' } }),
    'PATCH /api/alerts/AL-TEST': ({ req }) => ({ body: saved = { ...saved, ...req.postDataJSON() } }),
    'PATCH /api/alerts/AL-TEST/end': () => ({ body: { alert: { ...saved, status: 'ended' } } }),
  }), async ({ page, requests }) => {
    await nav(page, 'Cảnh báo khu vực');
    await page.getByRole('button', { name: 'Tạo cảnh báo', exact: true }).click();
    await page.getByRole('button', { name: 'Phát cảnh báo', exact: true }).click();
    assert.equal(requests.filter(r => r.method === 'POST').length, 0);
    await page.getByLabel(/^Khu vực/).selectOption({ label: 'Nguyễn Văn Quá, Quận 12' });
    await page.getByLabel(/^Tiêu đề cảnh báo/).fill('Synthetic alert');
    await page.getByLabel(/^Thông điệp cho người dân/).fill('Synthetic safety message');
    await page.getByRole('button', { name: 'Phát cảnh báo', exact: true }).click();
    await absent(page.getByRole('dialog'));
    const card = page.locator('.alert-card').filter({ hasText: 'Synthetic alert' });
    await card.getByRole('button', { name: 'Cập nhật', exact: true }).click();
    await page.getByLabel(/^Tiêu đề cảnh báo/).fill('Synthetic revised');
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await absent(page.getByRole('dialog'));
    await page.locator('.alert-card').filter({ hasText: 'Synthetic revised' }).getByRole('button', { name: 'Kết thúc', exact: true }).click();
    await page.getByRole('button', { name: 'Kết thúc cảnh báo', exact: true }).click();
    await absent(page.getByRole('dialog'));
    await page.getByRole('button', { name: /Đã kết thúc \(/ }).click();
    await visible(page.getByText('Synthetic revised', { exact: true }));
  });
});
test('FE-A03 users search, status and backend CSV download bytes', async () => run(api({
  'PATCH /api/users/U-TEST/status': ({ req }) => ({ body: { user: { ...user, status: req.postDataJSON().status } } }),
  'GET /api/users/export-csv': () => ({ contentType: 'text/csv', body: 'id,name\r\nU-TEST,Synthetic Citizen\r\n' }),
}), async ({ page, requests }) => {
  await nav(page, 'Người dùng');
  const search = page.getByLabel('Tìm người dùng theo tên, số điện thoại, email hoặc mã');
  await search.fill('missing'); await visible(page.locator('.users-empty')); await search.fill('');
  await page.getByRole('button', { name: 'Xem hồ sơ Synthetic Citizen', exact: true }).click();
  await page.getByRole('button', { name: 'Khóa tài khoản', exact: true }).click();
  await absent(page.getByRole('dialog')); await visible(page.locator('tbody').getByText('Đã khóa', { exact: true }));
  assert.deepEqual(requests.find(r => r.path.endsWith('/status')).body, { status: 'blocked' });
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Xuất dữ liệu', exact: true }).click();
  const file = await download; assert.match(file.suggestedFilename(), /\.csv$/);
  let data = ''; for await (const b of await file.createReadStream()) data += b; assert.equal(data, 'id,name\r\nU-TEST,Synthetic Citizen\r\n');
}));
test('FE-A04 SSE report deduplication and user updates', async () => run(api(), async f => {
  const r = report('RP-SSE'); await f.emit('report.created', { report: r }); await f.emit('report.created', { report: r });
  await visible(f.page.locator('.report-item').filter({ hasText: 'RP-SSE' }));
  assert.equal(await f.page.locator('.report-item').filter({ hasText: 'RP-SSE' }).count(), 1);
  await f.emit('user.updated', { action: 'registered', user: { ...user, id: 'U-SSE', name: 'Realtime Citizen' } });
  await nav(f.page, 'Người dùng'); await visible(f.page.getByRole('button', { name: 'Xem hồ sơ Realtime Citizen', exact: true }));
}));
test('FE-A05 report filters, responsive pages and modal keyboard', async () => run(api(), async ({ page }) => {
  await nav(page, 'Báo cáo cộng đồng');
  await page.getByLabel('Tìm báo cáo theo mã, đường hoặc quận').fill('not-present'); await visible(page.locator('.empty-state'));
  await page.getByLabel('Tìm báo cáo theo mã, đường hoặc quận').fill('RP-TEST'); assert.equal(await page.locator('tbody tr').count(), 1);
  await page.getByLabel('Lọc mức độ').selectOption('critical'); await visible(page.locator('.empty-state'));
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of ['Tổng quan', 'Bản đồ vận hành', 'Báo cáo cộng đồng', 'Cảnh báo khu vực', 'Người dùng', 'Phân tích dữ liệu']) {
      await nav(page, name); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} overflow at ${width}`);
    }
  }
  await nav(page, 'Tổng quan'); await page.getByRole('button', { name: 'Tạo cảnh báo', exact: true }).click();
  for (let i = 0; i < 20; i++) { await page.keyboard.press('Tab'); assert.ok(await page.getByRole('dialog').evaluate(e => e.contains(document.activeElement))); }
  await page.keyboard.press('Escape'); await absent(page.getByRole('dialog'));
}));
// These are intentional, ordinary failing regressions, never test.fail/skip.
for (const [id, action] of [['FE-A06', 'approve'], ['FE-A07', 'reject']]) {
  test(`${id} failed ${action} must retain pending report and announce failure`, async () => run(api({ [`PATCH /api/reports/RP-TEST/${action}`]: () => ({ status: 503, body: { message: 'Synthetic outage' } }) }), async ({ page }) => {
    await page.locator('.report-item').filter({ hasText: 'RP-TEST' }).click();
    if (action === 'reject') { await page.getByRole('dialog').getByRole('button', { name: 'Từ chối', exact: true }).click(); await page.getByLabel('Lý do từ chối').selectOption({ label: 'Không đủ căn cứ xác minh' }); await page.getByRole('button', { name: 'Xác nhận từ chối', exact: true }).click(); }
    else await page.getByRole('button', { name: 'Xác nhận báo cáo', exact: true }).click();
    await delay(200); assert.equal(await page.locator('.queue-count').innerText(), '2', '503 must not remove report from pending queue');
    await visible(page.getByRole('alert'));
  }));
}
test('FE-A08 failed user status change must retain server state', async () => run(api({ 'PATCH /api/users/U-TEST/status': () => ({ status: 503 }) }), async ({ page }) => {
  await nav(page, 'Người dùng'); await page.getByRole('button', { name: 'Xem hồ sơ Synthetic Citizen', exact: true }).click();
  await page.getByRole('button', { name: 'Khóa tài khoản', exact: true }).click(); await delay(200);
  assert.equal(await page.locator('tbody').getByText('Đã khóa', { exact: true }).count(), 0, '503 must not lock user locally');
}));
test('FE-A09 successful empty API results show empty report and user views', async () => run(api({ 'GET /api/reports': () => ({ body: [] }), 'GET /api/users': () => ({ body: [] }) }), async ({ page }) => {
  await visible(page.getByText('Đã xử lý toàn bộ', { exact: true }));
  await nav(page, 'Báo cáo cộng đồng'); await visible(page.locator('.empty-state'));
  await nav(page, 'Người dùng'); await visible(page.getByText('Không tìm thấy người dùng', { exact: true }));
}));
test('FE-A10 initial API failure must expose a recoverable error instead of empty success', async () => {
  const f = await fixture(app, async () => ({ status: 503, body: { message: 'Synthetic unavailable' } }));
  try { await f.open(); await delay(500); assert.ok(await f.page.getByRole('alert').count() > 0, 'Initial API outage needs a visible alert'); } finally { await f.close(); }
});
test('FE-A11 pending initial load must be distinguishable from an empty queue', async () => {
  let release;
  const gate = new Promise(resolve => release = resolve);
  const f = await fixture(app, async () => { await gate; return { body: [] }; });
  try { await f.open(); assert.ok(await f.page.locator('[aria-busy="true"], [role="progressbar"]').count() > 0, 'Initial loading state needs an accessible busy indicator'); } finally { release(); await f.close(); }
});
for (const action of ['create', 'update', 'end']) test(`FE-A12-${action} failed alert mutation must preserve server state`, async () => {
  const original = { id: 'AL-FAIL', area: 'Thảo Điền, TP. Thủ Đức', level: 'Cảnh báo', hazardType: 'Ngập đường', title: 'Original alert', message: 'Synthetic message', startedAt: '18:00', expiresAt: '21:00', status: 'active', channels: ['Web'], createdBy: 'Fixture' };
  await run(api({
    'GET /api/alerts': () => ({ body: action === 'create' ? [] : [original] }),
    'POST /api/alerts': () => ({ status: 503 }),
    'PATCH /api/alerts/AL-FAIL': () => ({ status: 503 }),
    'PATCH /api/alerts/AL-FAIL/end': () => ({ status: 503 }),
  }), async ({ page }) => {
    await nav(page, 'Cảnh báo khu vực');
    if (action === 'end') {
      await page.locator('.alert-card').filter({ hasText: 'Original alert' }).getByRole('button', { name: 'Kết thúc', exact: true }).click();
      await page.getByRole('button', { name: 'Kết thúc cảnh báo', exact: true }).click(); await absent(page.getByRole('dialog'));
      assert.equal(await page.locator('.alert-card').filter({ hasText: 'Original alert' }).count(), 1, 'Failed end must keep alert active');
    } else {
      if (action === 'create') {
        await page.getByRole('button', { name: 'Tạo cảnh báo', exact: true }).click();
        await page.getByLabel(/^Khu vực/).selectOption({ label: 'Nguyễn Văn Quá, Quận 12' });
        await page.getByLabel(/^Thông điệp cho người dân/).fill('Synthetic message');
      } else await page.locator('.alert-card').filter({ hasText: 'Original alert' }).getByRole('button', { name: 'Cập nhật', exact: true }).click();
      await page.getByLabel(/^Tiêu đề cảnh báo/).fill('Unsaved alert');
      await page.getByRole('button', { name: action === 'create' ? 'Phát cảnh báo' : 'Lưu thay đổi', exact: true }).click(); await delay(200);
      assert.equal(await page.locator('.alert-card').filter({ hasText: 'Unsaved alert' }).count(), 0, '503 must not publish unsaved alert state');
    }
  });
});
