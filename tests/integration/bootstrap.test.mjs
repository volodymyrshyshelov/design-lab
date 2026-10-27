import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { ensureRuntime } from '../../skills/design-lab/scripts/bootstrap.mjs';

test('runtime installs only its locked dependencies and reuses a matching installation', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'design-lab-bootstrap-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const runtime = path.join(root, 'runtime');
  await mkdir(runtime);
  await writeFile(path.join(runtime, 'package.json'), JSON.stringify({ name: 'local-runtime-fixture', private: true, dependencies: {} }));
  await writeFile(path.join(runtime, 'package-lock.json'), JSON.stringify({ name: 'local-runtime-fixture', lockfileVersion: 3, packages: { '': { name: 'local-runtime-fixture' } } }));
  const concurrent = await Promise.all([ensureRuntime(root), ensureRuntime(root)]);
  assert.deepEqual(concurrent.map(result => result.installed).sort(), [false, true]);
  const second = await ensureRuntime(root);
  assert.equal(second.installed, false);
  assert.equal(second.directory, runtime);
  const receipt = JSON.parse(await readFile(path.join(runtime, 'node_modules/.design-lab-runtime.json'), 'utf8'));
  assert.equal(receipt.schemaVersion, 1);
  assert.equal(receipt.sourceDigest.length, 64);
  assert.equal(await readFile(path.join(runtime, 'package.json'), 'utf8'), JSON.stringify({ name: 'local-runtime-fixture', private: true, dependencies: {} }));
});

test('runtime rejects a package manifest that differs from its lock before npm runs', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'design-lab-bootstrap-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'runtime'));
  await writeFile(path.join(root, 'runtime/package.json'), JSON.stringify({ name: 'fixture', private: true, dependencies: { changed: '1.0.0' } }));
  await writeFile(path.join(root, 'runtime/package-lock.json'), JSON.stringify({ lockfileVersion: 3, packages: { '': { name: 'fixture', dependencies: {} } } }));
  await assert.rejects(ensureRuntime(root), /lock.*match|match.*lock/i);
});
