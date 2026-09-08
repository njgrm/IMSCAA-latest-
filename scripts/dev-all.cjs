const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const tunnelMode = process.argv.includes('--tunnel');
const children = [];
let stopping = false;

function assertPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', error => {
      if (error.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use. Stop the existing IMSCCA process before starting another one.`));
      } else {
        reject(error);
      }
    });
    probe.once('listening', () => probe.close(resolve));
    probe.listen(port, '0.0.0.0');
  });
}

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exitCode = exitCode;
}

async function main() {
  await Promise.all([assertPortAvailable(5173), assertPortAvailable(3001)]);

  const viteCli = path.resolve('node_modules/vite/bin/vite.js');
  const viteArgs = [viteCli, '--strictPort'];
  if (tunnelMode) viteArgs.push('--mode', 'tunnel', '--host', '0.0.0.0');

  children.push(
    spawn(process.execPath, ['src/server.cjs'], { stdio: 'inherit' }),
    spawn(process.execPath, viteArgs, { stdio: 'inherit' }),
  );

  for (const child of children) {
    child.once('error', error => {
      console.error(error.message);
      stop(1);
    });
    child.once('exit', code => {
      if (!stopping && code !== 0) stop(code || 1);
    });
  }
}

process.once('SIGINT', () => stop(0));
process.once('SIGTERM', () => stop(0));

main().catch(error => {
  console.error(error.message);
  stop(1);
});
