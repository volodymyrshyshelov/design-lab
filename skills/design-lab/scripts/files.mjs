import { readdir, readFile, lstat, realpath } from 'node:fs/promises';
import path from 'node:path';

export async function exists(filename) {
  try { await lstat(filename); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}
export function inside(root, filename) {
  const relative = path.relative(root, filename);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}
export async function filesIn(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['node_modules', '.git', '__pycache__', 'dist', 'site', 'reports', '.checks', '.cache', '.impeccable', '.taste-skill', '.DS_Store'].includes(entry.name)) continue;
    const filename = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symbolic links are not portable package inputs: ${filename}`);
    if (entry.isDirectory()) files.push(...(await filesIn(filename)).map(name => path.join(entry.name, name)));
    else if (entry.isFile()) files.push(entry.name);
  }
  return files.sort();
}
export async function sameTree(source, destination) {
  const sourceFiles = await filesIn(source);
  const targetFiles = await filesIn(destination);
  if (JSON.stringify(sourceFiles) !== JSON.stringify(targetFiles)) return false;
  for (const filename of sourceFiles) if (!(await readFile(path.join(source, filename))).equals(await readFile(path.join(destination, filename)))) return false;
  return true;
}
export async function safeChild(root, filename) {
  let current = filename;
  while (!(await exists(current))) current = path.dirname(current);
  if (!inside(await realpath(root), await realpath(current))) throw new Error(`Destination escapes the project through a symbolic link: ${filename}`);
}
export function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
