import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createGateway } from './tools-gateway.mjs';
import { readFile, realpath, stat } from 'node:fs/promises';
import { inside } from './files.mjs';

export async function runTool(argv = process.argv.slice(2)) {
  const projectIndex = argv.indexOf('--project');
  const project = projectIndex < 0 ? process.cwd() : argv[projectIndex + 1];
  if (!project) throw new Error('--project requires a directory.');
  const args = projectIndex < 0 ? argv : argv.filter((_, index) => index !== projectIndex && index !== projectIndex + 1);
  const gateway = await createGateway(project);
  try {
    if (args[0] === 'list') return { tools: await gateway.listTools() };
    if (args[0] !== 'call' || !args[1]) throw new Error('Usage: tool.mjs list | call <tool-name> [<json-object> | --input <json-file>] [--project <directory>]');
    let input = {};
    if (args[2] === '--input') {
      if (!args[3] || args.length !== 4) throw new Error('--input requires one JSON file.');
      const filename = await realpath(path.resolve(project, args[3]));
      if (!inside(await realpath(project), filename)) throw new Error('Tool input file must remain inside the selected project.');
      const metadata = await stat(filename);
      if (!metadata.isFile() || metadata.size > 65_536) throw new Error('Tool input file must be a JSON file of at most 65536 bytes.');
      input = JSON.parse(await readFile(filename, 'utf8'));
    } else {
      if (args.length > 3) throw new Error('Unexpected tool arguments. Use --input for a JSON payload file.');
      if (args[2]) input = JSON.parse(args[2]);
    }
    return await gateway.callTool(args[1], input);
  } finally { await gateway.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await runTool(), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
