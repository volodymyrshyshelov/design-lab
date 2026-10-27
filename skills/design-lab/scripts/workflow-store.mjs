import { readFile, writeFile, mkdir, rename, rm, readdir, lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { hostname } from 'node:os';
import { inside, exists, safeChild } from './files.mjs';

const excluded = new Set(['.git', '.agents', '.codex', 'node_modules', '.cache', '.impeccable', '.taste-skill', '__pycache__']);
const rootOutputs = new Set(['dist', 'site', 'reports', '.checks']);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function fileDigest(filename) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest('hex');
}
export function validateRelative(value) {
  if (typeof value !== 'string' || !value || value.length > 512 || path.isAbsolute(value) || value.includes('\\') || /[*?{}]/.test(value) || value.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Use literal project-relative scope or evidence paths without traversal or glob patterns.');
  if (value.split('/').some(part => ['.git', '.agents', '.codex'].includes(part) || /^\.env(?:\.|$)/.test(part) || /\.(?:pem|key)$/i.test(part))) throw new Error('Profile or credential paths are not workflow scope or evidence.');
  if (/^docs\/design-lab\/(?:workflow\.json|runs(?:\/|$)|\.workflow)/.test(value)) throw new Error('Workflow storage cannot be owned as task scope or evidence.');
  return value;
}
export function createWorkflowStore(project) {
  const root = path.resolve(project);
  const folder = path.join(root, 'docs/design-lab');
  const filename = path.join(folder, 'workflow.json');
  const lock = path.join(folder, '.workflow.lock');
  async function safe(relative) {
    validateRelative(relative);
    const target = path.join(root, relative);
    await safeChild(root, target);
    let current = root;
    for (const segment of relative.split('/')) {
      current = path.join(current, segment);
      if (await exists(current) && (await lstat(current)).isSymbolicLink()) throw new Error('Symbolic links are not workflow scope or evidence.');
    }
    return target;
  }
  async function ensureFolder() {
    await safeChild(root, filename);
    await mkdir(folder, { recursive: true });
    if (!inside(await realpath(root), await realpath(folder))) throw new Error('Workflow storage path escapes the project.');
  }
  async function read() {
    await safeChild(root, filename);
    if (!(await exists(filename))) return null;
    const raw = await readFile(filename);
    if (raw.length > 2_000_000) throw new Error('Workflow record is too large.');
    const state = JSON.parse(raw.toString());
    if (state.schemaVersion !== 1 || !/^[a-f0-9-]{36}$/.test(state.runId) || !Number.isInteger(state.version) || state.version < 1 || !Array.isArray(state.tasks) || state.tasks.length > 100 || !Array.isArray(state.contributorIds)) throw new Error('Workflow record is invalid.');
    return state;
  }
  async function change(operation) {
    await ensureFolder();
    try { await mkdir(lock); } catch (error) { if (error.code === 'EEXIST') throw new Error('Workflow is busy; inspect docs/design-lab/.workflow.lock/owner.json before recovering a dead-process lock.'); throw error; }
    try {
      await writeFile(path.join(lock, 'owner.json'), JSON.stringify({ pid: process.pid, host: hostname(), createdAt: new Date().toISOString() }) + '\n', { flag: 'wx' });
      const current = await read();
      const next = await operation(current);
      const payload = JSON.stringify(next, null, 2) + '\n';
      if (Buffer.byteLength(payload) > 2_000_000) throw new Error('Workflow record size limit reached; reduce summaries or evidence lists before retrying.');
      if (current && next.runId !== current.runId) {
        const archive = path.join(folder, 'runs'); await safeChild(root, archive); await mkdir(archive, { recursive: true });
        await writeFile(path.join(archive, current.runId + '.json'), JSON.stringify(current, null, 2) + '\n', { flag: 'wx' });
      }
      const temporary = path.join(folder, '.workflow-' + randomUUID() + '.tmp');
      try { await writeFile(temporary, payload, { flag: 'wx' }); await rename(temporary, filename); }
      finally { await rm(temporary, { force: true }); }
      return next;
    } finally { await rm(lock, { recursive: true }); }
  }
  async function validateScope(scopes) {
    for (const scope of scopes) await safe(scope);
  }
  async function fingerprint(scopes) {
    const entries = [];
    async function walk(relative, includeOutput) {
      const filename = await safe(relative);
      if (relative.split('/').some(part => excluded.has(part)) || (!includeOutput && rootOutputs.has(relative.split('/')[0])) || /^docs\/design-lab\/(?:workflow\.json|runs(?:\/|$)|\.workflow)/.test(relative)) return;
      if (!(await exists(filename))) { entries.push([relative, 'missing']); return; }
      const info = await lstat(filename);
      if (info.isDirectory()) {
        for (const entry of (await readdir(filename)).sort()) {
          if (excluded.has(entry) || entry.startsWith('.env') || entry.endsWith('.pem') || entry.endsWith('.key') || (relative === 'docs/design-lab' && (entry === 'workflow.json' || entry === 'runs' || entry.startsWith('.workflow')))) continue;
          await walk(relative + '/' + entry, includeOutput);
        }
      } else if (info.isFile()) entries.push([relative, await fileDigest(filename)]);
    }
    for (const scope of [...new Set(scopes)].sort()) await walk(scope, rootOutputs.has(scope.split('/')[0]));
    return digest(JSON.stringify(entries));
  }
  async function evidence(paths) {
    const results = [];
    for (const relative of [...new Set(paths)]) {
      const filename = await safe(relative);
      const info = await lstat(filename);
      if (!info.isFile() || !info.size || info.size > 20_000_000) throw new Error('Evidence must be an existing nonempty file of at most 20 MB.');
      results.push({ path: relative, sha256: digest(await readFile(filename)), bytes: info.size });
    }
    return results;
  }
  async function verifyEvidence(records) {
    for (const item of records) {
      const [actual] = await evidence([item.path]);
      if (actual.sha256 !== item.sha256) throw new Error('Recorded evidence changed; repeat the affected check or review.');
    }
  }
  return { root, read, change, validateScope, fingerprint, evidence, verifyEvidence };
}
