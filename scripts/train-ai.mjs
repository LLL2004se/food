import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const aiDir = path.join(rootDir, 'Ai');
const pythonCandidates = [
  path.join(rootDir, '.venv', 'Scripts', 'python.exe'),
  path.join(rootDir, '.venv', 'bin', 'python'),
  'python',
];

function getPythonCommand() {
  return pythonCandidates.find((candidate) => existsSync(candidate)) || 'python';
}

function runPythonScript(pythonCommand, scriptName) {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonCommand, [scriptName], {
      cwd: aiDir,
      stdio: 'inherit',
      shell: false,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${scriptName} exited with code ${code}`));
    });
  });
}

export async function trainAiModels() {
  const pythonCommand = getPythonCommand();
  const scripts = [
    'get_data.py',
    'train_model.py',
    'train_heatmap_model.py',
    'train_spoilage_model.py',
  ];

  for (const scriptName of scripts) {
    console.log(`\nRunning ${scriptName}...`);
    await runPythonScript(pythonCommand, scriptName);
  }

  console.log('\nAI training complete.');
}

const currentScriptPath = fileURLToPath(import.meta.url);
if (path.resolve(process.argv[1] || '') === path.resolve(currentScriptPath)) {
  trainAiModels().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}