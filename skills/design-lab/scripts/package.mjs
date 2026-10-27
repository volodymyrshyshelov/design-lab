import { readFile, writeFile, mkdir, readdir, cp, rename, rm, mkdtemp, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readManifest } from './manifest.mjs';
import { exists, inside, filesIn, escapeHtml } from './files.mjs';
import { copyLicenses } from './licenses.mjs';

const mimeTypes = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.ico': 'image/x-icon' };
const remote = value => /^(?:https?:|\/\/)/i.test(value);
async function assetPath(dist, from, reference) {
  const cleaned = reference.split(/[?#]/)[0];
  const filename = path.resolve(cleaned.startsWith('/') ? dist : path.dirname(from), cleaned.replace(/^\//, ''));
  if (!inside(dist, filename) || !inside(await realpath(dist), await realpath(filename))) throw new Error('Asset path escapes dist.');
  return filename;
}
async function dataUrl(dist, from, reference) {
  if (remote(reference)) throw new Error(`External runtime asset is not portable: ${reference}`);
  if (/^(?:data:|#)/i.test(reference)) return reference;
  const filename = await assetPath(dist, from, reference);
  const mime = mimeTypes[path.extname(filename).toLowerCase()] ?? 'application/octet-stream';
  return `data:${mime};base64,${(await readFile(filename)).toString('base64')}`;
}
async function inlineCss(dist, filename) {
  let css = await readFile(filename, 'utf8');
  if (/@import\s/i.test(css)) throw new Error('Unresolved CSS import; bundle styles before packaging.');
  for (const match of [...css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)]) css = css.replace(match[0], `url("${await dataUrl(dist, filename, match[2])}")`);
  return css.replace(/<\/style/gi, '<\\/style');
}
async function inlineScript(dist, filename) {
  let script = await readFile(filename, 'utf8');
  if (/\bimport\s*\(|(?:^|[;\n])\s*import\s*(?:[{'"*]|[a-z_$])/i.test(script)) throw new Error('Unresolved JavaScript import or split chunk; configure a single bundled entry before packaging.');
  for (const template of script.matchAll(/`(?:\\.|[^`])*`/g)) if (template[0].includes('${') && /(?:assets\/|\.(?:svg|png|jpe?g|webp|gif|avif|woff2?|ttf)\b)/i.test(template[0])) throw new Error('Dynamic asset templates are not supported by the standalone packager.');
  for (const asset of await filesIn(dist)) {
    if (['.js', '.css', '.html', '.map'].includes(path.extname(asset))) continue;
    const href = '/' + asset.split(path.sep).join('/');
    const replacement = await dataUrl(dist, filename, href);
    for (const reference of [href, href.slice(1), './' + href.slice(1)]) for (const quote of ['"', "'", '`']) script = script.replaceAll(quote + reference + quote, quote + replacement + quote);
  }
  for (const prefix of ['/assets/', './assets/', 'assets/']) for (const quote of ['"', "'", '`']) if (script.includes(quote + prefix)) throw new Error('Unresolved JavaScript asset literal; use bundled local imports before packaging.');
  return script.replace(/<\/script/gi, '<\\/script');
}
export async function buildSite(project) {
  project = path.resolve(project);
  const descriptor = await readManifest(project);
  const dist = path.join(project, 'dist');
  const entry = path.join(dist, 'index.html');
  let html = await readFile(entry, 'utf8');
  for (const match of [...html.matchAll(/<script\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi)]) {
    if (remote(match[2])) throw new Error(`External script is not portable: ${match[2]}`);
    const source = await assetPath(dist, entry, match[2]);
    const script = await inlineScript(dist, source);
    html = html.replace(match[0], () => `<script type="module">${script}</script>`);
  }
  for (const match of [...html.matchAll(/<link\b[^>]*>/gi)]) {
    const href = match[0].match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const relation = match[0].match(/\brel=["']([^"']+)["']/i)?.[1] ?? '';
    if (remote(href)) throw new Error(`External link asset is not portable: ${href}`);
    if (relation === 'stylesheet') {
      const css = await inlineCss(dist, await assetPath(dist, entry, href));
      html = html.replace(match[0], () => `<style>${css}</style>`);
    }
    else if (relation === 'modulepreload') throw new Error('Split module preload is not supported by the standalone packager.');
    else html = html.replace(match[0], match[0].replace(href, await dataUrl(dist, entry, href)));
  }
  for (const match of [...html.matchAll(/<(?:img|source|video|audio)\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)]) html = html.replace(match[0], match[0].replace(match[1], await dataUrl(dist, entry, match[1])));
  for (const tag of html.matchAll(/<(?:script|link|img|source|video|audio|iframe)\b[^>]*>/gi)) {
    if (/\b(?:src|href|poster|srcset)=["'](?!data:|#)[^"']+/i.test(tag[0])) throw new Error('Unresolved external runtime reference remains in the packaged HTML.');
  }
  const temporary = await mkdtemp(path.join(project, '.design-lab-site-'));
  try {
    await writeFile(path.join(temporary, 'index.html'), html);
    const concepts = [];
    for (const [index, concept] of descriptor.concepts.entries()) {
      const filename = `${String(index + 1).padStart(2, '0')}-${concept.id}.html`;
      const screen = descriptor.screens[0].id; const role = descriptor.roles[0].id;
      const target = `index.html#concept=${concept.id}&screen=${screen}&role=${role}`;
      await writeFile(path.join(temporary, filename), `<!doctype html><html lang="ru"><meta charset="UTF-8"><title>${escapeHtml(concept.label)}</title><meta http-equiv="refresh" content="0;url=${escapeHtml(target)}"><a href="${escapeHtml(target)}">${escapeHtml(concept.label)}</a></html>`);
      concepts.push({ ...concept, entry: filename });
    }
    await mkdir(path.join(temporary, 'licenses'));
    const licenses = await copyLicenses(project, path.join(temporary, 'licenses'));
    const manifest = { entry: 'index.html', sha256: createHash('sha256').update(html).digest('hex'), bytes: Buffer.byteLength(html), externalRuntimeDependencies: false, concepts: descriptor.concepts.length, screens: descriptor.screens.length, conceptEntries: concepts, licenseFiles: licenses };
    await writeFile(path.join(temporary, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    const site = path.join(project, 'site');
    if (await exists(site)) {
      const previous = JSON.parse(await readFile(path.join(site, 'manifest.json'), 'utf8'));
      if (previous.entry !== 'index.html' || typeof previous.sha256 !== 'string') throw new Error('Existing site is not a generated Design Lab output; preserve it explicitly.');
      await rm(site, { recursive: true });
    }
    await rename(temporary, site);
    return manifest;
  } catch (error) { await rm(temporary, { recursive: true, force: true }); throw error; }
}
