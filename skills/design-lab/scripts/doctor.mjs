import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { exists } from './files.mjs';

function version(commands) {
  for (const command of commands) {
    const result = spawnSync(command, ['--version'], { encoding: 'utf8', windowsHide: true, shell: process.platform === 'win32' });
    if (!result.error && result.status === 0) return { available: true, command, version: result.stdout.trim().split('\n')[0] };
    if (result.error && result.error.code !== 'ENOENT') return { available: null, command, probeError: result.error.code };
  }
  return { available: false };
}
export async function doctor(project = process.cwd()) {
  project = path.resolve(project);
  const node = { available: true, command: process.execPath, version: process.version };
  const npm = version(['npm']);
  const python = version(['python3', 'python']);
  let browser = { available: false, instruction: 'Install Chromium with npx playwright install chromium in the prepared project.' };
  try {
    const { chromium } = await import('@playwright/test');
    const executable = chromium.executablePath();
    browser = { available: await exists(executable), executable, launched: false };
  } catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  const supported = nodeMajor === 24 && process.versions.node.localeCompare('24.22.1', undefined, { numeric: true }) >= 0;
  return { project, node: { ...node, supported }, npm, python, browser, projectSkillInstalled: await exists(path.join(project, '.agents/skills/design-lab/SKILL.md')), projectAgentInstalled: await exists(path.join(project, '.codex/agents/design_lab.toml')), configurationScope: 'Project only; Codex login and permissions remain with the invoking user.', readyForDependencyInstall: supported && npm.available === true, noInstallationPerformed: true };
}
