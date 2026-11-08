import test from 'node:test';
import assert from 'node:assert/strict';
import { computeStagingDeployScope } from './staging-deploy-scope.mjs';

const trackedFiles = [
  'BE/src/main.ts',
  'FE/user/package.json',
  'FE/user/src/main.tsx',
];

test('admin-only edits redeploy the combined user and admin hosting bundle', () => {
  assert.deepEqual(
    computeStagingDeployScope(['FE/admin/src/App.tsx'], trackedFiles),
    { backend: false, user: true, anyDeployable: true },
  );
});

test('workflow-only changes redeploy the available BE and FE/user packages', () => {
  assert.deepEqual(
    computeStagingDeployScope(['.github/workflows/deploy.yml'], trackedFiles),
    { backend: true, user: true, anyDeployable: true },
  );
});

test('deploy-scope logic changes redeploy the available BE and FE/user packages', () => {
  assert.deepEqual(
    computeStagingDeployScope(['scripts/staging-deploy-scope.mjs'], trackedFiles),
    { backend: true, user: true, anyDeployable: true },
  );
});

test('unrelated documentation changes do not trigger an application deployment', () => {
  assert.deepEqual(
    computeStagingDeployScope(['docs/operations.md'], trackedFiles),
    { backend: false, user: false, anyDeployable: false },
  );
});

test('package source changes deploy only the changed package', () => {
  assert.deepEqual(
    computeStagingDeployScope(['BE/src/main.ts'], trackedFiles),
    { backend: true, user: false, anyDeployable: true },
  );
});

test('a full deployment attempt includes each package that currently exists', () => {
  assert.deepEqual(
    computeStagingDeployScope([], trackedFiles, { forceFull: true }),
    { backend: true, user: true, anyDeployable: true },
  );
});

test('root package manager files redeploy both available packages', () => {
  assert.deepEqual(
    computeStagingDeployScope(['pnpm-lock.yaml'], trackedFiles),
    { backend: true, user: true, anyDeployable: true },
  );
});

test('Firebase hosting configuration redeploys the user frontend only', () => {
  assert.deepEqual(
    computeStagingDeployScope(['firebase.json'], trackedFiles),
    { backend: false, user: true, anyDeployable: true },
  );
});
