#!/usr/bin/env node

/**
 * Web build script wrapper for RISC-V architecture
 * Uses --max-opt=2 to avoid TurboFan crashes on RISC-V
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import os from 'os';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Detect RISC-V architecture
const isRiscV = 
  process.env.TARGET_ARCH === 'riscv64' ||
  process.env.RUNNER_ARCH === 'riscv64' ||
  process.arch === 'riscv64' ||
  os.arch() === 'riscv64';

// Get vite binary path - use node to execute it for cross-platform compatibility
const viteBin = resolve(projectRoot, 'node_modules', '.bin', 'vite');
const viteJs = resolve(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');

// Use vite.js directly if it exists, otherwise use the .bin wrapper
const viteEntry = fs.existsSync(viteJs) ? viteJs : viteBin;

// Build command
const args = ['build'];

console.log(`[web-build.mjs] Architecture: ${process.arch || os.arch()}`);
console.log(`[web-build.mjs] TARGET_ARCH: ${process.env.TARGET_ARCH || 'not set'}`);
console.log(`[web-build.mjs] RUNNER_ARCH: ${process.env.RUNNER_ARCH || 'not set'}`);
console.log(`[web-build.mjs] Using ${isRiscV ? '--max-opt=2 (RISC-V mode)' : 'normal mode'}`);

// Spawn vite with appropriate node options
// For RISC-V, we need to run node with --max-opt=2 directly
// For others, just run vite normally
const viteProcess = spawn(
  process.execPath,
  isRiscV ? ['--max-opt=2', viteEntry, ...args] : [viteEntry, ...args],
  {
    stdio: 'inherit',
    cwd: projectRoot,
    env: process.env,
  }
);

viteProcess.on('error', (error) => {
  console.error(`[web-build.mjs] Failed to start vite:`, error);
  process.exit(1);
});

viteProcess.on('exit', (code) => {
  process.exit(code || 0);
});

