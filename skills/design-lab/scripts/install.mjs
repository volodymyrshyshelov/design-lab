import { mkdir, cp, writeFile, readFile, readdir, rename, rm, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { exists, filesIn, sameTree, inside, safeChild } from './files.mjs';

export const defaultSkillRoot = fileURLToPath(new URL('../', import.meta.url));
const servers = [
  ['design_lab_shadcn', ['-y', 'shadcn@4.23.0', 'mcp']],
  ['design_lab_magicui', ['-y', '@magicuidesign/mcp@2.0.0']],
];
function updateConfig(original) {
  let result = original;
  for (const [name, args] of servers) {
    const command = process.platform === 'win32' ? 'cmd.exe' : 'npx';
    const commandArgs = process.platform === 'win32' ? ['/d', '/c', 'npx', ...args] : args;
    const desired = `command = ${JSON.stringify(command)}\nargs = ${JSON.stringify(commandArgs)}\n`;
    const section = new RegExp(`^\\s*\\[mcp_servers\\.(?:${name}|"${name}"|'${name}')\\]\\s*(?:#.*)?$`, 'm');
    const match = section.exec(original);
    if (match) {
      const body = original.slice(match.index + match[0].length).split(/^\s*\[/m)[0];
      const normalize = value => value.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#')).join('\n').replaceAll(/\s+/g, '');
      if (normalize(body) !== normalize(desired)) throw new Error(`MCP configuration conflict for ${name}; preserve or reconcile the existing server explicitly.`);
    } else {
      if (new RegExp(`(?:mcp_servers\\.(?:"|')?${name}|${name}\\s*=)`).test(original)) throw new Error(`MCP configuration conflict for ${name}; unsupported existing TOML form.`);
      result += `${result && !result.endsWith('\n') ? '\n' : ''}\n[mcp_servers.${name}]\n${desired}`;
    }
  }
  return result;
}
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
  const nextConfig = updateConfig(original);
  const skillPresent = await exists(skill);
  if (skillPresent && !(await sameTree(source, skill))) throw new Error('Skill installation conflict: existing Design Lab files differ. Preserve local changes before updating.');
  if (await exists(agent) && !(await readFile(agent)).equals(agentContent)) throw new Error('Agent installation conflict: existing design_lab definition differs.');
  if (!skillPresent) await copyTree(source, skill);
  await mkdir(path.dirname(agent), { recursive: true });
  if (!(await exists(agent))) await writeFile(agent, agentContent);
  await mkdir(path.dirname(config), { recursive: true });
  if (nextConfig !== original) await writeFile(config, nextConfig);
  return { project: target, skill: '.agents/skills/design-lab', agent: '.codex/agents/design_lab.toml', mcpServers: servers.map(([name]) => name) };
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
