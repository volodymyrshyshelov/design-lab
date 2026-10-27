import { createServer } from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { inside } from './files.mjs';

const contentTypes = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
export async function createSiteServer(project, { bind = '127.0.0.1', port = 4174 } = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Port must be an integer between 0 and 65535.');
  const root = await realpath(path.join(path.resolve(project), 'site'));
  const server = createServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (pathname === '/favicon.ico') { response.writeHead(204); response.end(); return; }
      if (pathname.split('/').some(segment => segment.startsWith('.'))) throw new Error('Private path');
      const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!inside(root, filename) || !inside(root, await realpath(filename)) || !(await stat(filename)).isFile()) throw new Error('Missing path');
      response.writeHead(200, { 'Content-Type': contentTypes[path.extname(filename)] ?? 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : await readFile(filename));
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, bind, resolve); });
  return server;
}
