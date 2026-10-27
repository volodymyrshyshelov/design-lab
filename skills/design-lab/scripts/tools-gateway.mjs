import path from 'node:path';
import { realpath } from 'node:fs/promises';
import { ensureRuntime, loadRuntimeModule, defaultSkillRoot } from './bootstrap.mjs';
import { buildSite } from './package.mjs';
import { doctor } from './doctor.mjs';

export function validateToolArguments(value) {
  const encoded = JSON.stringify(value);
  if (!encoded || Buffer.byteLength(encoded) > 65_536) throw new Error('Tool arguments exceed the maximum JSON size.');
  function visit(item, depth) {
    if (depth > 12) throw new Error('Tool arguments exceed the maximum nesting depth.');
    if (typeof item === 'string' && item.length > 32_768) throw new Error('Tool argument string length is too large.');
    if (Array.isArray(item)) {
      if (item.length > 256) throw new Error('Tool argument array exceeds 256 collection items.');
      for (const nested of item) visit(nested, depth + 1);
    } else if (item && typeof item === 'object') {
      if (Object.keys(item).length > 128) throw new Error('Tool argument object is too large.');
      for (const nested of Object.values(item)) visit(nested, depth + 1);
    }
  }
  visit(value, 0);
  if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('Tool arguments must be a JSON object.');
  return value;
}

const providers = {
  shadcn: { entry: 'shadcn/dist/index.js', args: ['mcp'] },
  magicui: { entry: '@magicuidesign/mcp/dist/server.js', args: [] },
};

export async function createGateway(project, options = {}) {
  project = await realpath(path.resolve(project));
  const skillRoot = options.skillRoot ?? defaultSkillRoot;
  const connected = new Map();
  let runtime;
  const builtins = [
    { name: 'design_lab_doctor', description: 'Inspect this project and its local runtime without changing accounts or settings.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, handler: () => doctor(project) },
    { name: 'design_lab_package', description: 'Package this project’s built local frontend into its portable site directory.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false }, handler: () => buildSite(project) },
  ];
  const { createWorkflowTools } = await import('./workflow.mjs');
  const workflows = await createWorkflowTools(project);
  const local = new Map([...workflows, ...builtins].map(tool => [tool.name, tool]));
  const pluginRoot = options.pluginRoot ?? process.env.DESIGN_LAB_PLUGIN_ROOT;
  const unboundPlugin = pluginRoot && await realpath(pluginRoot) === project;

  async function connect(provider) {
    if (options.components === false) throw new Error('Component providers are unavailable in this gateway instance.');
    if (!connected.has(provider)) connected.set(provider, (async () => {
      runtime ??= await ensureRuntime(skillRoot);
      const { Client } = await loadRuntimeModule(runtime.directory, '@modelcontextprotocol/sdk/dist/esm/client/index.js');
      const { StdioClientTransport } = await loadRuntimeModule(runtime.directory, '@modelcontextprotocol/sdk/dist/esm/client/stdio.js');
      const descriptor = providers[provider];
      const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(runtime.directory, 'node_modules', descriptor.entry), ...descriptor.args], cwd: project, stderr: 'pipe', maxBufferSize: 2 * 1024 * 1024 });
      transport.stderr?.on('data', data => process.stderr.write(data));
      const client = new Client({ name: 'design-lab-components', version: '0.2.0' }, { capabilities: {} });
      try {
        await client.connect(transport, { timeout: 30_000 });
        const { tools } = await client.listTools(undefined, { timeout: 30_000 });
        return { client, tools };
      } catch (error) { await client.close(); connected.delete(provider); throw new Error(`Internal ${provider} startup failed: ${error.message}`); }
    })());
    return connected.get(provider);
  }

  async function listTools() {
    const tools = [...local.values()].map(({ handler, ...tool }) => tool);
    if (options.components !== false) for (const provider of Object.keys(providers)) {
      const connection = await connect(provider);
      tools.push(...connection.tools.map(tool => ({ ...tool, name: `design_lab_${provider}_${tool.name}` })));
    }
    return tools;
  }

  async function callTool(name, args = {}) {
    validateToolArguments(args);
    const tool = local.get(name);
    if (tool) {
      if (unboundPlugin && name !== 'design_lab_doctor') throw new Error('The plugin process has no project working directory. Invoke the bundled tool.mjs CLI with --project and the actual project directory; no external server setup is needed.');
      if (builtins.includes(tool) && Object.keys(args).length) throw new Error('This local tool does not accept arguments.');
      const result = await tool.handler(args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    for (const provider of Object.keys(providers)) {
      const prefix = `design_lab_${provider}_`;
      if (!name.startsWith(prefix)) continue;
      const connection = await connect(provider);
      const original = name.slice(prefix.length);
      if (!connection.tools.some(item => item.name === original)) throw new Error(`Unknown internal ${provider} tool: ${original}`);
      return connection.client.callTool({ name: original, arguments: args }, undefined, { timeout: 60_000 });
    }
    throw new Error(`Unknown Design Lab tool: ${name}`);
  }

  async function close() {
    await Promise.allSettled([...connected.values()].map(async pending => (await pending).client.close()));
    connected.clear();
  }
  return { listTools, callTool, close };
}
