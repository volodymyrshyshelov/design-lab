import { buildSite } from './package.mjs';
const index = process.argv.indexOf('--project');
try { console.log(JSON.stringify(await buildSite(index < 0 ? process.cwd() : process.argv[index + 1]), null, 2)); }
catch (error) { console.error(error.message); process.exitCode = 1; }
