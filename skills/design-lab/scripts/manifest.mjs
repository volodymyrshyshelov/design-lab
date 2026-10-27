import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function readManifest(project) {
  const manifest = JSON.parse(await readFile(path.join(project, 'lab.manifest.json'), 'utf8'));
  if (manifest.schemaVersion !== 1 || typeof manifest.title !== 'string') throw new Error('lab.manifest.json needs schemaVersion: 1 and title.');
  for (const field of ['concepts', 'screens', 'roles']) {
    if (!Array.isArray(manifest[field]) || !manifest[field].length) throw new Error(`The manifest needs a nonempty ${field} list.`);
    const ids = new Set();
    for (const item of manifest[field]) {
      if (!item || !/^[a-z][a-z0-9-]*$/.test(item.id) || typeof item.label !== 'string' || ids.has(item.id)) throw new Error(`Invalid or duplicate ${field} identifier.`);
      ids.add(item.id);
    }
  }
  if (!Array.isArray(manifest.widths) || !manifest.widths.length || manifest.widths.some(value => !Number.isInteger(value) || value < 320 || value > 3840)) throw new Error('Manifest widths must be integers from 320 to 3840.');
  return manifest;
}
