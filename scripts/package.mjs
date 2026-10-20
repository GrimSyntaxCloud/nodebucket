import { mkdir, rm, cp, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

// Explicit allowlist: no .git, .env, legacy config, test DB, or source maps.
await rm('release', { recursive: true, force: true });
await mkdir('release/server', { recursive: true });
for (const file of ['index.js', 'app.js', 'database.js', 'package.json', 'package-lock.json']) {
  await cp(`server/${file}`, `release/server/${file}`);
}
await cp('server/models', 'release/server/models', { recursive: true });
await cp('server/routes', 'release/server/routes', { recursive: true });
await cp('dist/nodebucket', 'release/dist/nodebucket', { recursive: true });
execFileSync('npm', ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], {
  cwd: 'release/server', stdio: 'inherit',
});
await writeFile('release/package.json', JSON.stringify({
  name: 'nodebucket-demo', version: '1.0.0', private: true,
  engines: { node: '22.x' }, scripts: { start: 'node server/index.js' },
}, null, 2) + '\n');
await rm('nodebucket.zip', { force: true });
execFileSync('zip', ['-qr', '../nodebucket.zip', '.'], { cwd: 'release', stdio: 'inherit' });
console.log('Created nodebucket.zip with the frontend and production backend.');
