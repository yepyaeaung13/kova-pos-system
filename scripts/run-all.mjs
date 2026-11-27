import { spawnSync } from 'node:child_process';

const script = process.argv[2];
if (!script) {
  console.error('Usage: node scripts/run-all.mjs <script>');
  process.exit(1);
}

const services = [
  'kova-contracts',
  'kova-auth',
  'kova-sync',
  'kova-sale',
  'kova-inventory',
  'kova-accounting',
];

for (const service of services) {
  console.log(`=== ${service} ${script} ===`);
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(`${npm} run ${script}`, {
    cwd: new URL(`../${service}/`, import.meta.url),
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
