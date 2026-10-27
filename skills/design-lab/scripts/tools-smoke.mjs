import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ensureRuntime, loadRuntimeModule, defaultSkillRoot } from './bootstrap.mjs';
import { installProject } from './install.mjs';

const root = path.resolve(defaultSkillRoot, '../..');
await mkdir(path.join(root, '.checks'), { recursive: true });
const project = await mkdtemp(path.join(root, '.checks/tool-protocol-'));
await installProject(project);
const installedSkill = path.join(project, '.agents/skills/design-lab');
const runtime = await ensureRuntime();
const { Client } = await loadRuntimeModule(runtime.directory, '@modelcontextprotocol/sdk/dist/esm/client/index.js');
const { StdioClientTransport } = await loadRuntimeModule(runtime.directory, '@modelcontextprotocol/sdk/dist/esm/client/stdio.js');
const client = new Client({ name: 'design-lab-protocol-verification', version: '0.2.0' }, { capabilities: {} });
const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(installedSkill, 'scripts/mcp.mjs')], cwd: project, stderr: 'pipe' });
transport.stderr?.on('data', data => process.stderr.write(data));
const result = { scope: 'Fresh project installation, automatic pinned bootstrap, actual stdio gateway and internal providers; no global MCP connections used', project, checkedAt: new Date().toISOString(), tools: [], checks: [], passed: false };
try {
  await client.connect(transport, { timeout: 150_000 });
  const { tools } = await client.listTools(undefined, { timeout: 90_000 });
  result.tools = tools.map(tool => tool.name);
  for (const name of ['design_lab_start_run', 'design_lab_dispatch', 'design_lab_cancel_task', 'design_lab_submit_review', 'design_lab_shadcn_view_items_in_registries', 'design_lab_magicui_listRegistryItems']) if (!result.tools.includes(name)) throw new Error(`Missing internal tool: ${name}`);
  for (const [name, args] of [
    ['design_lab_doctor', {}],
    ['design_lab_shadcn_view_items_in_registries', { items: ['@shadcn/button'] }],
    ['design_lab_magicui_listRegistryItems', { limit: 1 }],
  ]) {
    const response = await client.callTool({ name, arguments: args }, undefined, { timeout: 60_000 });
    if (response.isError || !response.content?.length) throw new Error(`Internal tool call failed: ${name}`);
    result.checks.push({ name, passed: true });
  }
  const blocked = await client.callTool({ name: 'design_lab_magicui_listRegistryItems', arguments: { values: Array.from({ length: 257 }, () => 1) } });
  if (!blocked.isError) throw new Error('Oversized input was not rejected at the gateway.');
  result.checks.push({ name: 'bounded-input-before-provider-validation', passed: true });
  result.passed = true;
} finally {
  await client.close();
  await writeFile(path.join(root, '.checks/tool-protocol.json'), JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify({ passed: result.passed, tools: result.tools.length, checks: result.checks }, null, 2));
