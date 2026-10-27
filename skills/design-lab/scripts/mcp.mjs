import { ensureRuntime, loadRuntimeModule } from './bootstrap.mjs';
import { createGateway } from './tools-gateway.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function runMcp(project = process.cwd()) {
  const runtime = await ensureRuntime();
  const { Server } = await loadRuntimeModule(runtime.directory, '@modelcontextprotocol/sdk/dist/esm/server/index.js');
  const { StdioServerTransport } = await loadRuntimeModule(runtime.directory, '@modelcontextprotocol/sdk/dist/esm/server/stdio.js');
  const { ListToolsRequestSchema, CallToolRequestSchema } = await loadRuntimeModule(runtime.directory, '@modelcontextprotocol/sdk/dist/esm/types.js');
  const gateway = await createGateway(project);
  const server = new Server({ name: 'design-lab', version: '0.2.0' }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: await gateway.listTools() }));
  server.setRequestHandler(CallToolRequestSchema, async request => {
    try { return await gateway.callTool(request.params.name, request.params.arguments ?? {}); }
    catch (error) { return { isError: true, content: [{ type: 'text', text: error.message }] }; }
  });
  let closing;
  const close = () => closing ??= gateway.close().then(() => server.close());
  server.onclose = () => { void gateway.close(); };
  server.onerror = error => { console.error(error.message); void close(); };
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void close(); });
  process.stdin.once('end', () => { void close(); });
  process.stdin.once('error', () => { void close(); });
  const transport = new StdioServerTransport(process.stdin, process.stdout, { maxBufferSize: 2 * 1024 * 1024 });
  transport.onclose = () => { void close(); };
  try { await server.connect(transport); } catch (error) { await gateway.close(); throw error; }
  return { close };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const position = process.argv.indexOf('--project');
    await runMcp(position < 0 ? process.cwd() : process.argv[position + 1]);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
