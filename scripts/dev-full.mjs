import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { trainAiModels } from './train-ai.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');

function startProcess(command, args, cwd, label) {
  const child = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`${label} exited with code ${code}`);
      process.exitCode = code || 1;
    }
  });

  return child;
}

function getPythonCommand() {
  const candidates = [
    path.join(rootDir, '.venv', 'Scripts', 'python.exe'),
    path.join(rootDir, '.venv', 'bin', 'python'),
    'python',
  ];

  return candidates.find((candidate) => existsSync(candidate)) || 'python';
}

async function main() {
  await trainAiModels();

  const frontend = startProcess('npm', ['run', 'dev'], rootDir, 'Frontend');
  const backend = startProcess('npm', ['run', 'dev'], path.join(rootDir, 'backend'), 'Backend');
  const aiServer = startProcess(getPythonCommand(), ['app.py'], path.join(rootDir, 'Ai'), 'AI server');

  const shutdown = () => {
    frontend.kill();
    backend.kill();
    aiServer.kill();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});