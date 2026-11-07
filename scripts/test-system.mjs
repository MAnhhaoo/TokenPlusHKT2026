import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const npmCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
const npmTask = (id, prefix, script) => ({ id, prefix, script })
const stages = [
  npmTask('be:typecheck', 'BE', 'typecheck'),
  npmTask('be:build', 'BE', 'build'),
  npmTask('admin:typecheck', 'FE/admin', 'typecheck'),
  npmTask('admin:build', 'FE/admin', 'build'),
  npmTask('user:typecheck', 'FE/user', 'typecheck'),
  npmTask('user:build', 'FE/user', 'build'),
  npmTask('be:unit', 'BE', 'test:unit'),
  npmTask('be:http', 'BE', 'test:http'),
  npmTask('be:db', 'BE', 'test:db'),
  npmTask('admin:browser', 'FE/admin', 'test:system'),
  npmTask('user:browser', 'FE/user', 'test:system'),
  { id: 'ml:pytest', cwd: 'ml', python: true },
]
const options = process.argv.slice(2)
const only = options.find(arg => arg.startsWith('--only='))?.slice(7).split(',')
const selected = only ? stages.filter(stage => only.some(id => stage.id === id || stage.id.startsWith(`${id}:`))) : stages
if (options.includes('--list')) {
  console.log(stages.map(stage => stage.id).join('\n'))
  process.exit(0)
}
if (options.some(arg => arg !== '--list' && !arg.startsWith('--only=')) || !selected.length || only?.some(id => !stages.some(stage => stage.id === id || stage.id.startsWith(`${id}:`)))) {
  console.error('Usage: npm run test:system -- [--list | --only=be:unit,be:http,admin,user,ml]')
  process.exit(2)
}
const runId = new Date().toISOString().replace(/[:.]/g, '-')
const output = join(root, '.cache', 'system-tests', runId)
mkdirSync(output, { recursive: true })
const results = []
async function run(command, args, cwd = root, timeoutMs = 900_000) {
  let log = ''
  const result = await new Promise(resolveResult => {
    const child = spawn(command, args, { cwd, env: { ...process.env, CI: '1', PYTHONUNBUFFERED: '1' }, windowsHide: true })
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      // Kill only the owned child tree; npm/Jest/browser grandchildren must not leak ports.
      if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { timeout: 10000, windowsHide: true })
      child.kill('SIGKILL')
    }, timeoutMs)
    for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { log += chunk; process.stdout.write(chunk) })
    child.on('error', error => { clearTimeout(timer); resolveResult({ status: 'BLOCKED', reason: error.message }) })
    child.on('close', code => { clearTimeout(timer); resolveResult(timedOut
      ? { status: 'BLOCKED', reason: 'Process timeout; owned process tree terminated', exitCode: code }
      : { status: code === 0 ? 'PASS' : 'FAIL', exitCode: code }) })
  })
  return { ...result, log }
}
for (const stage of selected) {
  let reason
  if (stage.prefix) {
    const pkg = JSON.parse(readFileSync(join(root, stage.prefix, 'package.json'), 'utf8'))
    if (!pkg.scripts?.[stage.script]) reason = `Missing script ${stage.script}`
    else if (!existsSync(join(root, stage.prefix, 'node_modules'))) reason = `Install dependencies in ${stage.prefix} first`
  }
  if (!reason && stage.id === 'be:db') {
    const docker = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], { encoding: 'utf8', timeout: 15000, windowsHide: true })
    if (docker.error || docker.status !== 0) reason = 'Docker daemon unavailable; PostgreSQL integration NOT RUN'
  }
  const python = process.env.SYSTEM_TEST_PYTHON || join(root, 'ml', '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
  if (stage.python && !existsSync(python)) reason = 'ML virtual environment missing; see docs/testing/README.md'
  if (stage.python && !reason) {
    const probe = spawnSync(python, ['-c', 'import pytest, numpy, pandas, geopandas, rasterio, sklearn, torch'], { cwd: join(root, 'ml'), encoding: 'utf8', timeout: 30000, windowsHide: true })
    if (probe.error || probe.status !== 0) {
      reason = 'ML dependency environment incomplete; pytest assertions NOT RUN'
      writeFileSync(join(output, 'ml-preflight.log'), probe.error?.message || probe.stderr || probe.stdout)
    }
  }
  if (reason) {
    results.push({ id: stage.id, status: 'BLOCKED', reason })
    console.log(`[BLOCKED] ${stage.id}: ${reason}`)
    continue
  }
  const args = stage.python ? ['-m', 'pytest', 'tests', '-q'] : [npmCli, '--prefix', stage.prefix, 'run', stage.script]
  const command = stage.python ? python : process.execPath
  if (!stage.python && !existsSync(npmCli)) {
    results.push({ id: stage.id, status: 'BLOCKED', reason: 'npm CLI missing beside Node; run package commands manually' })
    continue
  }
  console.log(`\n[RUN] ${stage.id}`)
  const started = Date.now()
  let execution
  if (stage.id === 'be:db') {
    // Unique project owns only this run's tmpfs database, never an existing app stack.
    const compose = ['compose', '-p', `saigondrain-tests-${Date.now()}`, '-f', join(root, 'BE/test/docker-compose.test.yml')]
    let setup, cleanup
    try {
      setup = await run('docker', [...compose, 'up', '-d', '--wait', '--wait-timeout', '60'], root, 180_000)
      execution = setup.status === 'PASS'
        ? await run(command, args)
        : { status: 'BLOCKED', reason: 'Isolated PostgreSQL setup failed; assertions NOT RUN', log: '' }
    } finally {
      cleanup = await run('docker', [...compose, 'down', '--volumes', '--remove-orphans', '--timeout', '5'], root, 60_000)
    }
    execution.log = `${setup?.log || ''}\n${execution.log}\n${cleanup.log}`
    if (cleanup.status !== 'PASS') execution = { ...execution, status: execution.status === 'FAIL' ? 'FAIL' : 'BLOCKED', reason: 'Database cleanup failed; inspect test compose project in log' }
  } else execution = await run(command, args, join(root, stage.cwd || ''))
  const { log, ...result } = execution
  const logFile = `${stage.id.replace(/:/g, '-')}.log`
  writeFileSync(join(output, logFile), log)
  results.push({ id: stage.id, ...result, durationMs: Date.now() - started, log: logFile })
}
const summary = { runId, results }
writeFileSync(join(output, 'summary.json'), JSON.stringify(summary, null, 2))
console.table(results.map(({ id, status, reason }) => ({ id, status, reason: reason || '' })))
console.log(`Evidence: ${output}`)
process.exitCode = results.some(result => result.status === 'FAIL') ? 1 : results.some(result => result.status === 'BLOCKED') ? 2 : 0
