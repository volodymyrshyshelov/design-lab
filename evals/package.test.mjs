import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

async function discover(directory, basename) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['node_modules', '.git', '.cache', '.checks', 'dist'].includes(entry.name)) continue;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await discover(filename, basename));
    else if (entry.name === basename) files.push(filename);
  }
  return files;
}
test('package exposes one entry skill with resolvable local references', async () => {
  const files = await discover('skills', 'SKILL.md');
  assert.deepEqual(files, ['skills/design-lab/SKILL.md']);
  const source = await readFile(files[0], 'utf8');
  assert.match(source, /^---\nname: design-lab\n/);
  for (const [, link] of source.matchAll(/\]\(([^)]+)\)/g)) {
    if (/^https?:/.test(link)) continue;
    await readFile(path.resolve(path.dirname(files[0]), link.split('#')[0]));
  }
});
test('vendored modules match their recorded file and license hashes', async () => {
  const lock = JSON.parse(await readFile('third-party-lock.json', 'utf8'));
  assert.equal(lock.modules.length, 7);
  let count = 0;
  for (const module of lock.modules) {
    for (const file of [...module.files, ...module.licenseFiles]) {
      const data = await readFile(file.path);
      assert.equal(createHash('sha256').update(data).digest('hex'), file.sha256, file.path);
      count++;
    }
  }
  for (const item of lock.packages) {
    assert.equal(createHash('sha256').update(await readFile(item.licenseFile)).digest('hex'), item.licenseFileSha256, item.id);
  }
  assert.ok(count >= 260);
});
