import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

test('locked reports have no marker or popup in any map filter, unlock restores marker', () => {
  let filter = 'all', index = 0;
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  const react = { useMemo: fn => fn(), useState(initial) { return [index++ === 3 ? filter : initial, () => {}]; } };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/components/reports/CommunityReportsMap.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === '@/lib/severity') return { severityLabel: value => value };
    return new Proxy({}, { get: (_target, key) => key });
  } });
  function nodes(tree) { return !tree || typeof tree !== 'object' ? [] : [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)]; }
  const report = { id: 'RP-LOCK', status: 'rejected', location: 'Test street', district: 'Test', coordinates: '10.776,106.695', severity: 'medium' };
  for (filter of ['all', 'active', 'locked']) {
    index = 0;
    const tree = exports.default({ reports: [report], selectedReportId: report.id });
    assert.equal(nodes(tree).filter(n => n.props?.className?.includes('map-marker')).length, 0, filter);
    assert.equal(nodes(tree).filter(n => n.props?.className === 'community-report-popup').length, 0, filter);
  }
  filter = 'all'; index = 0;
  const tree = exports.default({ reports: [{ ...report, status: 'verified' }], selectedReportId: null });
  assert.equal(nodes(tree).filter(n => n.props?.className?.includes('map-marker')).length, 1);
});
