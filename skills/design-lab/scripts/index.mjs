import { installProject, createProject } from './install.mjs';
import { buildSite } from './package.mjs';
import { createSiteServer } from './serve.mjs';
import { doctor } from './doctor.mjs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

function option(args, name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Missing value for ${name}`);
  return args[index + 1];
}
export async function run(argv = process.argv.slice(2)) {
  const [command, ...args] = argv;
  if (!command || ['help', '--help', '-h'].includes(command)) {
    console.log('Design Lab\n\ncreate <project> --name "Project title"\ninstall <project>\ndoctor [project]\ntools list [--project <project>]\ntools call <tool> --input <json-file> [--project <project>]\npackage <project>\nserve <project> [--bind 127.0.0.1] [--port 4174]\ncheck <project> --url http://127.0.0.1:4174\n\nCreate/install never changes a personal Codex profile. Internal component tools install their pinned runtime automatically. Server exposes site/ only.');
    return;
  }
  const project = args[0] && !args[0].startsWith('--') ? args[0] : process.cwd();
  let result;
  if (command === 'tools') { const { runTool } = await import('./tool.mjs'); result = await runTool(args); }
  else if (command === 'create') result = await createProject(project, option(args, '--name', 'Design Lab Project'));
  else if (command === 'install') result = await installProject(project);
  else if (command === 'doctor') result = await doctor(project);
  else if (command === 'package') result = await buildSite(project);
  else if (command === 'serve') {
    const server = await createSiteServer(project, { bind: option(args, '--bind', '127.0.0.1'), port: Number(option(args, '--port', '4174')) });
    const address = server.address();
    console.log(JSON.stringify({ serving: 'site/', bind: address.address, port: address.port, localUrl: `http://127.0.0.1:${address.port}`, sharedUrl: address.address === '0.0.0.0' ? `http://<server-IP>:${address.port}` : null }));
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close());
    return;
  } else if (command === 'check') {
    const { verifyBrowser } = await import('./verify-browser.mjs');
    result = await verifyBrowser(project, option(args, '--url'));
    if (!result.passed) process.exitCode = 1;
  } else throw new Error(`Unknown command: ${command}. Run help for usage.`);
  console.log(JSON.stringify(result, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { await run(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
