import { SeedController } from './controllers/seed.controller';

describe('Database viewer HTML contracts', () => {
  it('BE-SD01 escapes table, column, scalar, object and timestamp values', async () => {
    const controller = new SeedController({ inspectAllTables: async () => ({
      inspectedAt: '<script>stamp</script>',
      tables: { '<img onerror="alert(1)">': [{ '<script>key</script>': '<script>cell</script>', object: { payload: '<svg onload="alert(1)">' }, empty: null }] },
    }) } as any);
    const html = await controller.renderDbViewer();
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img onerror=');
    expect(html).not.toContain('<svg onload=');
    expect(html).toContain('&lt;script&gt;cell&lt;/script&gt;');
    expect(html).toContain('&lt;svg onload=');
    expect(html).toContain('<em>null</em>');
  });

  it('BE-SD02 handles empty tables without attempting first-row columns', async () => {
    const controller = new SeedController({ inspectAllTables: async () => ({ inspectedAt: 'fixture', tables: { reports: [] } }) } as any);
    expect(await controller.renderDbViewer()).toContain('Bảng hiện đang trống.');
  });
});
