import { spawn } from 'node:child_process';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });
const children = [
  spawn(process.execPath, ['api/index.js'], { stdio: 'inherit' }),
  spawn(
    process.execPath,
    [
      'node_modules/vite/bin/vite.js',
      '--port',
      process.env.FRONTEND_PORT || '5173',
      '--strictPort',
    ],
    { stdio: 'inherit', env: { ...process.env, API_PORT: process.env.PORT || '5000' } },
  ),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (!child.killed) child.kill();
  setTimeout(() => process.exit(code), 500);
}
for (const child of children) {
  child.on('error', () => stop(1));
  child.on('exit', (code) => stop(code || 0));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
