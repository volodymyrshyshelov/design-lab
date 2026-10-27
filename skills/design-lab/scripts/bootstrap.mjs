import { readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

export const defaultSkillRoot = fileURLToPath(new URL('../', import.meta.url));

async function runtimeIdentity(directory) {
  const packageBytes = await readFile(path.join(directory, 'package.json'));
  const lockBytes = await readFile(path.join(directory, 'package-lock.json'));
  const manifest = JSON.parse(packageBytes);
  const lock = JSON.parse(lockBytes);
  if (lock.lockfileVersion !== 3 || JSON.stringify(Object.entries(manifest.dependencies ?? {}).sort()) !== JSON.stringify(Object.entries(lock.packages?.['']?.dependencies ?? {}).sort())) throw new Error('Internal runtime package and lock dependencies must match.');
  return { manifest, sourceDigest: createHash('sha256').update(packageBytes).update(lockBytes).digest('hex') };
}

async function ready(directory, identity) {
  try {
    const receipt = JSON.parse(await readFile(path.join(directory, 'node_modules/.design-lab-runtime.json'), 'utf8'));
    if (receipt.sourceDigest !== identity.sourceDigest) return false;
    for (const [name, version] of Object.entries(identity.manifest.dependencies ?? {})) {
      const installed = JSON.parse(await readFile(path.join(directory, 'node_modules', name, 'package.json'), 'utf8'));
      if (installed.version !== version) return false;
    }
    return true;
  } catch (error) { if (error.code === 'ENOENT' || error instanceof SyntaxError) return false; throw error; }
}

async function acquireLock(directory) {
  const lock = path.join(directory, '.bootstrap-lock');
  const deadline = Date.now() + 125_000;
  while (Date.now() < deadline) {
    try { await mkdir(lock); await writeFile(path.join(lock, 'owner.json'), JSON.stringify({ pid: process.pid })); return lock; }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try {
        const owner = JSON.parse(await readFile(path.join(lock, 'owner.json'), 'utf8'));
        try { process.kill(owner.pid, 0); }
        catch (probe) { if (probe.code === 'ESRCH') { await rm(lock, { recursive: true, force: true }); continue; } }
      } catch (probe) {
        if (probe.code === 'ENOENT' || probe instanceof SyntaxError) {
          try { if (Date.now() - (await stat(lock)).mtimeMs > 5_000) { await rm(lock, { recursive: true, force: true }); continue; } }
          catch (race) { if (race.code === 'ENOENT') continue; throw race; }
        }
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  throw new Error('Timed out waiting for another Design Lab runtime installation.');
}

async function installLocked(directory) {
  const windows = process.platform === 'win32';
  const command = windows ? 'cmd.exe' : 'npm';
  const args = windows ? ['/d', '/s', '/c', 'npm ci --ignore-scripts --no-audit --no-fund'] : ['ci', '--ignore-scripts', '--no-audit', '--no-fund'];
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    child.stdout.pipe(process.stderr); child.stderr.pipe(process.stderr);
    let failure; let force;
    const terminate = message => {
      failure ??= new Error(message); child.kill();
      force ??= setTimeout(() => child.kill('SIGKILL'), 2_000).unref();
    };
    const interrupted = () => terminate('Internal dependency installation was interrupted.');
    const exiting = () => child.kill();
    const timeout = setTimeout(() => terminate('Internal dependency installation exceeded 120 seconds.'), 120_000);
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, interrupted);
    process.once('exit', exiting);
    const cleanup = () => {
      clearTimeout(timeout); clearTimeout(force);
      for (const signal of ['SIGINT', 'SIGTERM']) process.off(signal, interrupted);
      process.off('exit', exiting);
    };
    child.once('error', error => { cleanup(); reject(error); });
    child.once('exit', code => { cleanup(); if (failure) reject(failure); else if (code === 0) resolve(); else reject(new Error(`Internal dependency installation failed with exit code ${code}.`)); });
  });
}

export async function ensureRuntime(skillRoot = defaultSkillRoot) {
  const directory = path.resolve(skillRoot, 'runtime');
  const identity = await runtimeIdentity(directory);
  if (await ready(directory, identity)) return { directory, installed: false };
  const lock = await acquireLock(directory);
  try {
    if (await ready(directory, identity)) return { directory, installed: false };
    await installLocked(directory);
    await mkdir(path.join(directory, 'node_modules'), { recursive: true });
    await writeFile(path.join(directory, 'node_modules/.design-lab-runtime.json'), JSON.stringify({ schemaVersion: 1, sourceDigest: identity.sourceDigest }) + '\n');
    if (!(await ready(directory, identity))) throw new Error('Installed internal dependencies do not match their pinned manifest.');
    return { directory, installed: true };
  } finally { await rm(lock, { recursive: true, force: true }); }
}

export async function inspectRuntime(skillRoot = defaultSkillRoot) {
  const directory = path.resolve(skillRoot, 'runtime');
  const identity = await runtimeIdentity(directory);
  return { directory, ready: await ready(directory, identity), dependencies: identity.manifest.dependencies, automaticInstall: 'Pinned npm ci --ignore-scripts on first internal tool use.' };
}

export async function loadRuntimeModule(directory, relative) {
  const target = path.resolve(directory, 'node_modules', relative);
  if (!target.startsWith(path.resolve(directory, 'node_modules') + path.sep)) throw new Error('Runtime module path escapes node_modules.');
  return import(pathToFileURL(target).href);
}
