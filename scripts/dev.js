#!/usr/bin/env node
import { spawn } from 'child_process';

// Prevent `vercel dev` from recursively invoking itself by propagating
// an env marker. If this script is run while the marker is present,
// exit without spawning another `vercel dev`.

const MARKER = 'SECOND_BRAIN_VERCEL_ROOT';

if (process.env[MARKER]) {
  console.log('Detected parent vercel invocation; skipping nested `vercel dev`.');
  process.exit(0);
}

// Spawn `vercel dev` with the marker set so child package scripts inherit it.
const env = Object.assign({}, process.env, { [MARKER]: '1' });

const cmd = process.platform === 'win32' ? 'vercel.cmd' : 'vercel';
const child = spawn(cmd, ['dev'], { stdio: 'inherit', env });

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code);
  }
});
