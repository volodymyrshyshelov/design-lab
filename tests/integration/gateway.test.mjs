import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { validateToolArguments, createGateway } from '../../skills/design-lab/scripts/tools-gateway.mjs';
import { runTool } from '../../skills/design-lab/scripts/tool.mjs';

test('gateway rejects oversized collections and deep input before a child can validate it', () => {
  assert.throws(() => validateToolArguments({ values: Array.from({ length: 257 }, () => 0) }), /collection|array|256/);
  assert.throws(() => validateToolArguments({ value: 'x'.repeat(70_000) }), /large|size|length/);
  let value = {}; for (let i = 0; i < 20; i++) value = { nested: value };
  assert.throws(() => validateToolArguments(value), /depth|deep/);
  assert.deepEqual(validateToolArguments({ query: 'button', options: ['basic'] }), { query: 'button', options: ['basic'] });
});

test('CLI reads quoted user text from a JSON file without treating it as shell code', async t => {
  const project = await mkdtemp(path.join(tmpdir(), 'design-lab-gateway-'));
  t.after(() => rm(project, { recursive: true, force: true }));
  const title = 'A reviewer\'s "proposal" with $(literal) and `text`';
  await writeFile(path.join(project, 'payload.json'), JSON.stringify({ title, brief: 'A small prototype for testing payload handling.', coordinatorId: 'native-root', delegationAvailable: true }));
  const output = await runTool(['call', 'design_lab_start_run', '--input', 'payload.json', '--project', project]);
  const result = JSON.parse(output.content[0].text);
  assert.equal(result.title, title);
  await writeFile(path.join(project, 'oversized.json'), JSON.stringify({ value: 'x'.repeat(70_000) }));
  await assert.rejects(runTool(['call', 'design_lab_status', '--input', 'oversized.json', '--project', project]), /65536|maximum|size/i);
  await assert.rejects(runTool(['call', 'design_lab_status', '--input', '../outside.json', '--project', project]), /ENOENT|inside|project/i);
});

test('gateway rejects unknown component names rather than forwarding arbitrary child commands', async t => {
  const project = await mkdtemp(path.join(tmpdir(), 'design-lab-gateway-'));
  t.after(() => rm(project, { recursive: true, force: true }));
  const gateway = await createGateway(project, { components: false });
  t.after(() => gateway.close());
  await assert.rejects(gateway.callTool('design_lab_magicui_execute_shell', { command: 'false' }), /unknown|unavailable/i);
  const tools = await gateway.listTools();
  assert.ok(tools.some(item => item.name === 'design_lab_doctor'));
  assert.ok(tools.some(item => item.name === 'design_lab_package'));
});

test('plugin cache context cannot start a workflow or package itself', async t => {
  const project = await mkdtemp(path.join(tmpdir(), 'design-lab-plugin-'));
  t.after(() => rm(project, { recursive: true, force: true }));
  const gateway = await createGateway(project, { components: false, pluginRoot: project });
  t.after(() => gateway.close());
  await assert.rejects(gateway.callTool('design_lab_start_run', { title: 'Fixture', brief: 'Fixture', coordinatorId: 'native-root', delegationAvailable: true }), /project working directory|--project/);
  await assert.rejects(gateway.callTool('design_lab_package', {}), /project working directory|--project/);
});
