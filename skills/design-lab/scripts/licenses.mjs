import { readFile, readdir, cp, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { exists, filesIn } from './files.mjs';

const noticeName = /^(?:licen[cs]es?|notices?|copying|copyright|OFL)(?:[._-].*)?$/i;
async function resolveInstalledDependency(from, name) {
  if (!/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/i.test(name)) throw new Error(`Invalid dependency package name: ${name}`);
  const require = createRequire(path.join(from, 'package.json'));
  for (const directory of require.resolve.paths(name) ?? []) {
    const candidate = path.join(directory, name);
    if (await exists(path.join(candidate, 'package.json'))) return realpath(candidate);
  }
  return undefined;
}
async function runtimePackages(project) {
  const rootFile = path.join(project, 'package.json');
  if (!(await exists(rootFile))) return [];
  const queue = [{ directory: project, root: true }];
  const seen = new Set();
  const found = [];
  while (queue.length) {
    const { directory, root } = queue.shift();
    const canonical = await realpath(directory);
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    const pkg = JSON.parse(await readFile(path.join(canonical, 'package.json'), 'utf8'));
    if (!root) found.push({ directory: canonical, pkg });
    const optional = new Set(Object.keys(pkg.optionalDependencies ?? {}));
    const peers = new Set(Object.keys(pkg.peerDependencies ?? {}));
    const names = new Set([...Object.keys(pkg.dependencies ?? {}), ...optional, ...peers]);
    for (const name of names) {
      const installed = await resolveInstalledDependency(canonical, name);
      if (installed) queue.push({ directory: installed, root: false });
      else if (!optional.has(name) && !peers.has(name)) throw new Error(`Runtime dependency ${name} is not installed; install dependencies before collecting publication licenses.`);
    }
  }
  return found;
}
export async function copyLicenses(project, destination) {
  const found = new Set();
  for (const folder of ['assets', 'public', 'src/components']) if (await exists(path.join(project, folder))) {
    for (const filename of await filesIn(path.join(project, folder))) if (/(?:^|\/)(?:LICENSE|NOTICE|OFL)[^/]*$/i.test(filename.split(path.sep).join('/'))) {
      const relative = path.join(folder, filename);
      const target = relative.split(path.sep).join('__');
      await cp(path.join(project, relative), path.join(destination, target)); found.add(target);
    }
  }
  for (const { directory, pkg } of await runtimePackages(project)) {
    for (const entry of await readdir(directory, { withFileTypes: true })) if (noticeName.test(entry.name)) {
      const names = entry.isDirectory() ? (await filesIn(path.join(directory, entry.name))).map(file => path.join(entry.name, file)) : entry.isFile() ? [entry.name] : [];
      for (const filename of names) {
        const source = path.join(directory, filename);
        const digest = createHash('sha256').update(await readFile(source)).digest('hex').slice(0, 12);
        const target = `${pkg.name.replaceAll('/', '__').replaceAll('@', '')}@${pkg.version}__${filename.split(path.sep).join('__')}__${digest}`;
        if (!found.has(target)) await cp(source, path.join(destination, target));
        found.add(target);
      }
    }
  }
  return [...found].sort();
}
