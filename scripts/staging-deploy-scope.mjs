import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const packageDirectories = {
  backend: 'BE',
  user: 'FE/user',
};

const deployControlFiles = new Set([
  '.github/workflows/deploy.yml',
  'scripts/staging-deploy-scope.mjs',
]);

const rootPackageManagerFiles = new Set([
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
]);

function hasSourceFiles(directory, trackedFiles) {
  return trackedFiles.some((file) =>
    file.startsWith(`${directory}/`) && file.split('/').at(-1) !== '.gitkeep'
  );
}

function hasChangedSource(directory, changedFiles) {
  return changedFiles.some((file) =>
    file.startsWith(`${directory}/`) && file.split('/').at(-1) !== '.gitkeep'
  );
}

export function computeStagingDeployScope(changedFiles, trackedFiles, { forceFull = false } = {}) {
  let backend = hasChangedSource(packageDirectories.backend, changedFiles);
  let user = hasChangedSource(packageDirectories.user, changedFiles);

  if (forceFull) {
    backend ||= hasSourceFiles(packageDirectories.backend, trackedFiles);
    user ||= hasSourceFiles(packageDirectories.user, trackedFiles);
  }

  if (changedFiles.some((file) => rootPackageManagerFiles.has(file))) {
    backend ||= hasSourceFiles(packageDirectories.backend, trackedFiles);
    user ||= hasSourceFiles(packageDirectories.user, trackedFiles);
  }

  if (changedFiles.includes('firebase.json')) {
    user ||= trackedFiles.includes('FE/user/package.json');
  }

  if (changedFiles.some((file) => deployControlFiles.has(file))) {
    backend ||= hasSourceFiles(packageDirectories.backend, trackedFiles);
    user ||= hasSourceFiles(packageDirectories.user, trackedFiles);
  }

  return { backend, user, anyDeployable: backend || user };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const changedFiles = (await new Promise((resolve, reject) => {
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { input += chunk; });
    process.stdin.on('end', () => resolve(input));
    process.stdin.on('error', reject);
  })).split(/\r?\n/).filter(Boolean);
  const trackedFiles = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean);
  const forceFull = process.env.STAGING_FORCE_FULL === 'true';
  process.stdout.write(`${JSON.stringify(computeStagingDeployScope(changedFiles, trackedFiles, { forceFull }))}\n`);
}
