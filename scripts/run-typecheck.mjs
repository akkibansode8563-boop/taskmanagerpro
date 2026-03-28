import { spawnSync } from 'node:child_process';

function run(command, args) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

const typegen = run('next', ['typegen']);
if (typegen.status !== 0) {
  process.exit(typegen.status ?? 1);
}

const firstTsc = run('tsc', ['-p', 'tsconfig.typecheck.json', '--noEmit']);
if (firstTsc.status === 0) {
  process.exit(0);
}

const retryTsc = run('tsc', ['-p', 'tsconfig.typecheck.json', '--noEmit']);
process.exit(retryTsc.status ?? 1);
