import { mkdir, cp, writeFile, readFile, readdir, rename, rm, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import { updateToolConfig } from './tools-config.mjs';
import { exists, filesIn, sameTree, inside, safeChild } from './files.mjs';

export const defaultSkillRoot = fileURLToPath(new URL('../', import.meta.url));
async function copyTree(source, destination) {
  await mkdir(destination, { recursive: true });
  for (const filename of await filesIn(source)) {
    await mkdir(path.dirname(path.join(destination, filename)), { recursive: true });
    await cp(path.join(source, filename), path.join(destination, filename));
  }
}
export async function installProject(target, source = defaultSkillRoot) {
  target = path.resolve(target); source = path.resolve(source);
  if (inside(source, target)) throw new Error('Install destination must not be inside the source skill.');
  if (!(await exists(target))) throw new Error('The project directory does not exist. Use create for a new project.');
  target = await realpath(target); source = await realpath(source);
  if (inside(source, target)) throw new Error('Install destination must not be inside the source skill.');
  const skill = path.join(target, '.agents/skills/design-lab');
  const agent = path.join(target, '.codex/agents/design_lab.toml');
  const config = path.join(target, '.codex/config.toml');
  for (const destination of [skill, agent, config]) await safeChild(target, destination);
  const agentContent = await readFile(path.join(source, 'assets/design_lab.toml'));
  const original = await exists(config) ? await readFile(config, 'utf8') : '';
  const nextConfig = updateToolConfig(original);
  const skillPresent = await exists(skill);
  const upgrading = skillPresent && !(await sameTree(source, skill));
  let legacy;
  if (upgrading) {
    try { legacy = JSON.parse(await readFile(path.join(source, 'assets/legacy-v0.1.json'), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const installedFiles = await filesIn(skill);
    const expected = Object.keys(legacy?.files ?? {}).sort();
    if (JSON.stringify(installedFiles) !== JSON.stringify(expected)) throw new Error('Skill installation conflict: existing Design Lab files differ. Preserve local changes before updating.');
    for (const filename of installedFiles) if (createHash('sha256').update(await readFile(path.join(skill, filename))).digest('hex') !== legacy.files[filename]) throw new Error('Skill installation conflict: existing Design Lab files differ. Preserve local changes before updating.');
  }
  const oldAgent = await exists(agent) ? await readFile(agent) : undefined;
  if (oldAgent && !oldAgent.equals(agentContent) && !(upgrading && createHash('sha256').update(oldAgent).digest('hex') === legacy.agentSha256)) throw new Error('Agent installation conflict: existing design_lab definition differs.');
  const previous = new Map();
  if (upgrading) for (const filename of await filesIn(skill)) previous.set(filename, await readFile(path.join(skill, filename)));
  const incoming = await filesIn(source);
  try {
    if (!skillPresent || upgrading) await copyTree(source, skill);
    if (upgrading) for (const filename of previous.keys()) if (!incoming.includes(filename)) await rm(path.join(skill, filename));
    await mkdir(path.dirname(agent), { recursive: true });
    if (!oldAgent || upgrading) await writeFile(agent, agentContent);
    await mkdir(path.dirname(config), { recursive: true });
    if (nextConfig !== original) await writeFile(config, nextConfig);
  } catch (error) {
    if (!skillPresent) await rm(skill, { recursive: true, force: true });
    else if (upgrading) {
      for (const filename of incoming) if (!previous.has(filename)) await rm(path.join(skill, filename), { force: true });
      for (const [filename, content] of previous) { await mkdir(path.dirname(path.join(skill, filename)), { recursive: true }); await writeFile(path.join(skill, filename), content); }
    }
    if (oldAgent) await writeFile(agent, oldAgent); else await rm(agent, { force: true });
    if (await exists(config)) await writeFile(config, original);
    throw error;
  }
  return { project: target, skill: '.agents/skills/design-lab', agent: '.codex/agents/design_lab.toml', mcpServers: ['design_lab'], upgraded: upgrading };
}
export async function createProject(target, name, source = defaultSkillRoot) {
  target = path.resolve(target); source = path.resolve(source);
  if (inside(source, target)) throw new Error('Create destination must not be inside the source skill.');
  if (typeof name !== 'string' || !name.trim()) throw new Error('A nonempty project name is required.');
  if (await exists(target) && (await readdir(target)).length) throw new Error('Create destination must be empty; existing files are preserved.');
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = await import('node:fs/promises').then(fs => fs.mkdtemp(path.join(path.dirname(target), '.design-lab-create-')));
  try {
    await copyTree(path.join(source, 'assets/starter'), temporary);
    const packageFile = path.join(temporary, 'package.json');
    const packageData = JSON.parse(await readFile(packageFile, 'utf8'));
    packageData.name = name.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design-lab-project';
    await writeFile(packageFile, JSON.stringify(packageData, null, 2) + '\n');
    const lockfile = path.join(temporary, 'package-lock.json');
    if (await exists(lockfile)) {
      const lock = JSON.parse(await readFile(lockfile, 'utf8')); lock.name = packageData.name;
      if (lock.packages?.['']) lock.packages[''].name = packageData.name;
      await writeFile(lockfile, JSON.stringify(lock, null, 2) + '\n');
    }
    const manifestFile = path.join(temporary, 'lab.manifest.json');
    const manifest = JSON.parse(await readFile(manifestFile, 'utf8')); manifest.title = name.trim(); manifest.projectId = randomUUID();
    await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
    await installProject(temporary, source);
    if (await exists(target)) await rm(target, { recursive: true });
    await rename(temporary, target);
    return { project: target, title: manifest.title };
  } catch (error) { await rm(temporary, { recursive: true, force: true }); throw error; }
}
