import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { readManifest } from './manifest.mjs';
import { exists } from './files.mjs';

async function playwright(project) {
  try {
    const local = createRequire(path.join(project, 'package.json'));
    const loaded = await import(pathToFileURL(local.resolve('@playwright/test')).href);
    return loaded.chromium ? loaded : loaded.default;
  } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }
  return import('@playwright/test');
}
function roleMatches(screen, role) {
  return !screen.role || screen.role === 'all' || screen.role === role || (Array.isArray(screen.role) && screen.role.includes(role));
}
export async function verifyBrowser(project, target) {
  if (process.env.ALLOW_BROWSER_QA !== '1') throw new Error('Set ALLOW_BROWSER_QA=1 only when local browser QA is authorized.');
  if (!target) throw new Error('A running local site URL is required through --url.');
  const base = new URL(target);
  if (base.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) throw new Error('Browser QA accepts a loopback HTTP target only.');
  project = path.resolve(project);
  const descriptor = await readManifest(project);
  const report = { checkedAt: new Date().toISOString(), target: base.href, checks: [], offlineChecks: [], errors: [], consoleErrors: [], externalRequests: [], passed: false };
  await mkdir(path.join(project, 'reports'), { recursive: true });
  try {
    const manifest = JSON.parse(await readFile(path.join(project, 'site/manifest.json'), 'utf8'));
    const local = await readFile(path.join(project, 'site/index.html'));
    if (createHash('sha256').update(local).digest('hex') !== manifest.sha256 || local.length !== manifest.bytes) throw new Error('Local packaged file does not match its manifest hash and bytes.');
    const response = await fetch(base, { redirect: 'error', signal: AbortSignal.timeout(10_000) });
    const served = Buffer.from(await response.arrayBuffer());
    if (!response.ok || createHash('sha256').update(served).digest('hex') !== manifest.sha256 || served.length !== manifest.bytes) throw new Error('HTTP served package does not match the local manifest hash and bytes; the target may be stale.');
    report.sha256 = manifest.sha256; report.bytes = manifest.bytes;
  } catch (error) {
    report.stage = 'publication-preflight'; report.errors.push(error.message);
    await writeFile(path.join(project, 'reports/browser.json'), JSON.stringify(report, null, 2) + '\n');
    throw error;
  }
  const { chromium } = await playwright(project);
  const screenshotDirectory = path.join(project, 'reports/screenshots');
  await mkdir(screenshotDirectory, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  function observe(page) {
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
    page.on('request', request => { const url = request.url(); if (/^https?:/.test(url) && new URL(url).origin !== base.origin) report.externalRequests.push(url); });
  }
  async function inspect(page, concept, screen, role, width, mode) {
    const record = { concept: concept.id, screen: screen.id, role: role.id, width, passed: false };
    try {
      await page.setViewportSize({ width, height: 1024 });
      const url = new URL(mode === 'offline' ? pathToFileURL(path.join(project, 'site/index.html')).href : base.href);
      url.hash = new URLSearchParams({ concept: concept.id, screen: screen.id, role: role.id }).toString();
      await page.goto(url.href);
      await page.locator(`[data-screen-id="${screen.id}"]`).waitFor();
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(() => ({ concept: document.documentElement.dataset.activeConcept, overflow: document.documentElement.scrollWidth > innerWidth + 1, brokenImages: [...document.images].filter(image => !image.complete || image.naturalWidth === 0).length, fonts: document.fonts.status }));
      if (result.concept !== concept.id || result.overflow || result.brokenImages || result.fonts !== 'loaded') throw new Error(JSON.stringify(result));
      record.passed = true;
      if (mode === 'http' && screen.id === descriptor.screens[0].id && [390, 1440].includes(width)) await page.screenshot({ path: path.join(screenshotDirectory, `${concept.id}--${role.id}--${width}.png`), fullPage: true });
    } catch (error) { record.error = String(error); }
    (mode === 'offline' ? report.offlineChecks : report.checks).push(record);
  }
  try {
    for (const concept of descriptor.concepts) for (const role of descriptor.roles) {
      const context = await browser.newContext({ reducedMotion: 'reduce', locale: 'ru-RU' });
      const page = await context.newPage(); observe(page);
      for (const screen of descriptor.screens.filter(screen => roleMatches(screen, role.id))) for (const width of descriptor.widths) await inspect(page, concept, screen, role, width, 'http');
      await context.close();
    }
    if (await exists(path.join(project, 'site/manifest.json'))) {
      const manifest = JSON.parse(await readFile(path.join(project, 'site/manifest.json'), 'utf8'));
      const html = await readFile(path.join(project, 'site/index.html'));
      if (createHash('sha256').update(html).digest('hex') !== manifest.sha256 || html.length !== manifest.bytes) report.errors.push('Packaged file does not match its manifest.');
      const context = await browser.newContext({ offline: true, reducedMotion: 'reduce', locale: 'ru-RU' });
      const page = await context.newPage(); observe(page);
      for (const concept of descriptor.concepts) for (const width of [390, 1440]) await inspect(page, concept, descriptor.screens[0], descriptor.roles[0], width, 'offline');
      await context.close();
    }
    report.passed = report.checks.every(check => check.passed) && report.offlineChecks.every(check => check.passed) && !report.errors.length && !report.consoleErrors.length && !report.externalRequests.length;
  } finally {
    await browser.close();
    report.summary = { renders: report.checks.length, renderFailures: report.checks.filter(check => !check.passed).length, offlineRenders: report.offlineChecks.length, offlineFailures: report.offlineChecks.filter(check => !check.passed).length, browserErrors: report.errors.length, consoleErrors: report.consoleErrors.length, externalRequests: report.externalRequests.length };
    await writeFile(path.join(project, 'reports/browser.json'), JSON.stringify(report, null, 2) + '\n');
  }
  return { passed: report.passed, ...report.summary, report: 'reports/browser.json' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const value = name => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; };
  try { const result = await verifyBrowser(value('--project') ?? process.cwd(), value('--url')); console.log(JSON.stringify(result, null, 2)); if (!result.passed) process.exitCode = 1; }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
