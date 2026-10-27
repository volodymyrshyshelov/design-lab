import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { installProject, createProject } from '../../skills/design-lab/scripts/install.mjs';
import { buildSite } from '../../skills/design-lab/scripts/package.mjs';
import { createSiteServer } from '../../skills/design-lab/scripts/serve.mjs';
import { verifyBrowser } from '../../skills/design-lab/scripts/verify-browser.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'design-lab-runtime-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'source');
  await mkdir(path.join(source, 'assets/starter'), { recursive: true });
  await writeFile(path.join(source, 'SKILL.md'), '---\nname: design-lab\ndescription: Test fixture\n---\n');
  await writeFile(path.join(source, 'assets/design_lab.toml'), 'name="design_lab"\ndescription="Fixture"\ndeveloper_instructions="Use the skill"\n');
  await writeFile(path.join(source, 'assets/starter/package.json'), '{"name":"starter","private":true}\n');
  await writeFile(path.join(source, 'assets/starter/lab.manifest.json'), JSON.stringify({ schemaVersion: 1, projectId: 'design-lab-starter', title: 'Starter', concepts: [{ id: 'studio', label: 'Studio' }], screens: [{ id: 'overview', label: 'Overview' }], roles: [{ id: 'member', label: 'Member' }], widths: [390] }));
  return { root, source, target: path.join(root, 'project') };
}

async function builtProject(t, script = 'document.body.dataset.ready="yes";') {
  const f = await fixture(t);
  await mkdir(path.join(f.target, 'dist/assets'), { recursive: true });
  await writeFile(path.join(f.target, 'lab.manifest.json'), await readFile(path.join(f.source, 'assets/starter/lab.manifest.json')));
  await writeFile(path.join(f.target, 'dist/index.html'), '<!doctype html><html><head><title>Fixture</title><link rel="stylesheet" href="/assets/main.css"></head><body><div id="root"></div><script type="module" src="/assets/main.js"></script></body></html>');
  await writeFile(path.join(f.target, 'dist/assets/main.js'), script);
  await writeFile(path.join(f.target, 'dist/assets/main.css'), 'body{background-image:url(./mark.svg)}');
  await writeFile(path.join(f.target, 'dist/assets/mark.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  return f;
}

test('install adds one skill and agent while preserving unrelated config and is repeatable', async t => {
  const f = await fixture(t);
  await mkdir(path.join(f.target, '.codex'), { recursive: true });
  const original = '[mcp_servers.existing]\ncommand = "keep-me"\n';
  await writeFile(path.join(f.target, '.codex/config.toml'), original);
  await installProject(f.target, f.source);
  assert.deepEqual(await readdir(path.join(f.target, '.agents/skills')), ['design-lab']);
  assert.match(await readFile(path.join(f.target, '.codex/agents/design_lab.toml'), 'utf8'), /name="design_lab"/);
  const config = await readFile(path.join(f.target, '.codex/config.toml'), 'utf8');
  assert.ok(config.startsWith(original));
  assert.match(config, /shadcn@4\.23\.0/);
  assert.match(config, /@magicuidesign\/mcp@2\.0\.0/);
  await installProject(f.target, f.source);
  assert.equal(await readFile(path.join(f.target, '.codex/config.toml'), 'utf8'), config);
});

test('create excludes generated caches and dependencies from starter and installed skill', async t => {
  const f = await fixture(t);
  for (const directory of ['.cache', '.impeccable', '.taste-skill', 'node_modules']) {
    await mkdir(path.join(f.source, 'assets/starter', directory), { recursive: true });
    await writeFile(path.join(f.source, 'assets/starter', directory, 'local-state.txt'), 'Profile working state');
  }
  await createProject(f.target, 'Clean Portal', f.source);
  for (const directory of ['.cache', '.impeccable', '.taste-skill', 'node_modules']) {
    await assert.rejects(readdir(path.join(f.target, directory)), { code: 'ENOENT' });
    await assert.rejects(readdir(path.join(f.target, '.agents/skills/design-lab/assets/starter', directory)), { code: 'ENOENT' });
  }
});

test('MCP conflict is detected before any skill or agent is written', async t => {
  const f = await fixture(t);
  await mkdir(path.join(f.target, '.codex'), { recursive: true });
  const original = '[mcp_servers.design_lab_shadcn]\ncommand = "different"\n';
  await writeFile(path.join(f.target, '.codex/config.toml'), original);
  await assert.rejects(installProject(f.target, f.source), /conflict/i);
  assert.equal(await readFile(path.join(f.target, '.codex/config.toml'), 'utf8'), original);
  await assert.rejects(readdir(path.join(f.target, '.agents/skills')), { code: 'ENOENT' });
});

test('existing modified skill blocks install without overwriting its content', async t => {
  const f = await fixture(t);
  await mkdir(path.join(f.target, '.agents/skills/design-lab'), { recursive: true });
  await writeFile(path.join(f.target, '.agents/skills/design-lab/SKILL.md'), 'Keep this local work');
  await assert.rejects(installProject(f.target, f.source), /conflict/i);
  assert.equal(await readFile(path.join(f.target, '.agents/skills/design-lab/SKILL.md'), 'utf8'), 'Keep this local work');
  await assert.rejects(readdir(path.join(f.target, '.codex/agents')), { code: 'ENOENT' });
});

test('install rejects a project symlink that resolves inside its source', async t => {
  const f = await fixture(t);
  const alias = path.join(f.root, 'source-alias');
  await symlink(f.source, alias);
  await assert.rejects(installProject(alias, f.source), /inside|source/i);
  await assert.rejects(readdir(path.join(f.source, '.agents')), { code: 'ENOENT' });
});

test('create copies starter and sets user requested name without changing its source', async t => {
  const f = await fixture(t);
  await createProject(f.target, 'Client Portal', f.source);
  assert.equal(JSON.parse(await readFile(path.join(f.target, 'package.json'), 'utf8')).name, 'client-portal');
  assert.equal(JSON.parse(await readFile(path.join(f.target, 'lab.manifest.json'), 'utf8')).title, 'Client Portal');
  assert.equal(JSON.parse(await readFile(path.join(f.source, 'assets/starter/lab.manifest.json'), 'utf8')).title, 'Starter');
  assert.equal((await readdir(path.join(f.target, '.agents/skills'))).length, 1);
});

test('equal-title projects receive distinct persistent identities preserved by reinstall', async t => {
  const f = await fixture(t);
  const second = path.join(f.root, 'second-project');
  await createProject(f.target, 'Client Portal', f.source);
  await createProject(second, 'Client Portal', f.source);
  const firstManifest = JSON.parse(await readFile(path.join(f.target, 'lab.manifest.json'), 'utf8'));
  const secondManifest = JSON.parse(await readFile(path.join(second, 'lab.manifest.json'), 'utf8'));
  assert.match(firstManifest.projectId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(firstManifest.projectId, secondManifest.projectId);
  await installProject(f.target, f.source);
  assert.equal(JSON.parse(await readFile(path.join(f.target, 'lab.manifest.json'), 'utf8')).projectId, firstManifest.projectId);
  assert.equal(JSON.parse(await readFile(path.join(f.source, 'assets/starter/lab.manifest.json'), 'utf8')).projectId, 'design-lab-starter');
});

test('create preserves a nonempty destination and rejects nesting inside its source', async t => {
  const f = await fixture(t);
  await mkdir(f.target); await writeFile(path.join(f.target, 'keep.txt'), 'Keep');
  await assert.rejects(createProject(f.target, 'Portal', f.source), /empty|exists/i);
  assert.equal(await readFile(path.join(f.target, 'keep.txt'), 'utf8'), 'Keep');
  await assert.rejects(createProject(path.join(f.source, 'nested'), 'Portal', f.source), /inside|source/i);
});

test('package embeds local style image and script and writes matching hash and shortcuts', async t => {
  const f = await builtProject(t);
  const manifest = await buildSite(f.target);
  const html = await readFile(path.join(f.target, 'site/index.html'));
  assert.equal(manifest.sha256, createHash('sha256').update(html).digest('hex'));
  assert.equal(manifest.bytes, html.length);
  assert.equal(manifest.externalRuntimeDependencies, false);
  assert.match(html.toString(), /data:image\/svg\+xml;base64,/);
  assert.match(html.toString(), /dataset.ready/);
  assert.doesNotMatch(html.toString(), /src="\/assets\//);
  assert.match(await readFile(path.join(f.target, 'site/01-studio.html'), 'utf8'), /concept=studio/);
});

test('package preserves dollar replacement tokens in bundled JavaScript', async t => {
  const f = await builtProject(t, 'const value="$&";document.body.dataset.value=value;');
  await buildSite(f.target);
  const html = await readFile(path.join(f.target, 'site/index.html'), 'utf8');
  assert.match(html, /const value="\$&"/);
  assert.doesNotMatch(html, /src="\/assets\/main.js"/);
});

test('package preserves external navigation links while embedding runtime assets', async t => {
  const f = await builtProject(t);
  const entry = path.join(f.target, 'dist/index.html');
  await writeFile(entry, (await readFile(entry, 'utf8')).replace('<div id="root"></div>', '<a href="https://example.invalid/docs">Docs</a><div id="root"></div>'));
  await buildSite(f.target);
  assert.match(await readFile(path.join(f.target, 'site/index.html'), 'utf8'), /href="https:\/\/example.invalid\/docs"/);
});

test('package embeds bundled JavaScript image URLs', async t => {
  const f = await builtProject(t, 'const image="/assets/mark.svg";document.body.dataset.image=image;');
  await buildSite(f.target);
  assert.match(await readFile(path.join(f.target, 'site/index.html'), 'utf8'), /const image="data:image\/svg\+xml;base64,/);
});

test('package rejects an asset escaping the dist directory', async t => {
  const f = await builtProject(t);
  await writeFile(path.join(f.target, 'outside.svg'), '<svg/>');
  await writeFile(path.join(f.target, 'dist/assets/main.css'), 'body{background:url(../../outside.svg)}');
  await assert.rejects(buildSite(f.target), /escapes/);
});

test('package preserves nested runtime dependency and installed peer notices without dev-only licenses', async t => {
  const f = await builtProject(t);
  await writeFile(path.join(f.target, 'package.json'), JSON.stringify({ dependencies: { 'direct-ui': '1.0.0' }, devDependencies: { 'dev-only': '1.0.0' } }));
  const records = [
    ['node_modules/direct-ui', { name: 'direct-ui', version: '1.0.0', dependencies: { 'nested-child': '1.0.0' }, peerDependencies: { 'installed-peer': '1.0.0' }, optionalDependencies: { 'missing-optional': '1.0.0', 'present-optional': '1.0.0' } }, 'LICENSE', 'Direct UI MIT notice'],
    ['node_modules/direct-ui/node_modules/nested-child', { name: 'nested-child', version: '1.0.0', dependencies: { 'direct-ui': '1.0.0' } }, 'LICENSE-MIT', 'Nested runtime copyright with exact bytes\r\n'],
    ['node_modules/installed-peer', { name: 'installed-peer', version: '1.0.0' }, 'NOTICE', 'Installed peer attribution'],
    ['node_modules/present-optional', { name: 'present-optional', version: '1.0.0' }, 'NOTICE.txt', 'Optional runtime attribution'],
    ['node_modules/dev-only', { name: 'dev-only', version: '1.0.0' }, 'LICENSE', 'Do not ship development-only notice'],
    ['node_modules/unrelated-cache', { name: 'unrelated-cache', version: '1.0.0' }, 'LICENSE', 'Do not scan the whole cache'],
  ];
  for (const [relative, pkg, filename, content] of records) {
    const directory = path.join(f.target, relative);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'package.json'), JSON.stringify(pkg));
    await writeFile(path.join(directory, filename), content);
  }
  const manifest = await buildSite(f.target);
  const notices = await Promise.all(manifest.licenseFiles.map(file => readFile(path.join(f.target, 'site/licenses', file), 'utf8')));
  assert.ok(notices.includes('Nested runtime copyright with exact bytes\r\n'));
  assert.ok(notices.includes('Installed peer attribution'));
  assert.ok(notices.includes('Optional runtime attribution'));
  assert.equal(notices.filter(value => value === 'Direct UI MIT notice').length, 1);
  assert.ok(!notices.includes('Do not ship development-only notice'));
  assert.ok(!notices.includes('Do not scan the whole cache'));
});

test('package embeds static backtick image literals and rejects dynamic asset templates', async t => {
  const f = await builtProject(t, 'const image=`/assets/mark.svg`;document.body.dataset.image=image;');
  await buildSite(f.target);
  assert.match(await readFile(path.join(f.target, 'site/index.html'), 'utf8'), /const image=`data:image\/svg\+xml;base64,/);
  await writeFile(path.join(f.target, 'dist/assets/main.js'), 'const image=`/assets/${name}.svg`;document.body.dataset.image=image;');
  await assert.rejects(buildSite(f.target), /dynamic|template|asset/i);
});

test('package refuses remote runtime assets instead of declaring an offline result', async t => {
  const f = await builtProject(t);
  await writeFile(path.join(f.target, 'dist/assets/main.css'), '@font-face{src:url(https://example.invalid/font.woff2)}');
  await assert.rejects(buildSite(f.target), /external|remote/i);
  await assert.rejects(readFile(path.join(f.target, 'site/manifest.json')), { code: 'ENOENT' });
});

test('package refuses unresolved dynamic imports', async t => {
  const f = await builtProject(t, 'import("./later.js");');
  await assert.rejects(buildSite(f.target), /import|split/i);
});

test('site server serves packaged content and blocks private paths and escaping symlinks', async t => {
  const f = await builtProject(t); await buildSite(f.target);
  await writeFile(path.join(f.target, 'package.json'), '{"private":"not-for-http"}');
  await symlink(path.join(f.target, 'package.json'), path.join(f.target, 'site/leak.json'));
  const server = await createSiteServer(f.target, { bind: '127.0.0.1', port: 0 });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base)).status, 200);
  for (const route of ['/package.json', '/.git/config', '/../package.json', '/..%2fpackage.json', '/leak.json']) assert.equal((await fetch(base + route)).status, 404, route);
});

test('browser verifier rejects a stale HTTP package before launching a browser', async t => {
  const current = await builtProject(t, 'document.body.dataset.version="current";');
  const stale = await builtProject(t, 'document.body.dataset.version="stale";');
  await buildSite(current.target); await buildSite(stale.target);
  const server = await createSiteServer(stale.target, { bind: '127.0.0.1', port: 0 });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const previous = process.env.ALLOW_BROWSER_QA;
  process.env.ALLOW_BROWSER_QA = '1';
  try {
    await assert.rejects(verifyBrowser(current.target, `http://127.0.0.1:${server.address().port}`), /served.*(?:hash|package)|HTTP.*(?:hash|package)|stale/i);
    const report = JSON.parse(await readFile(path.join(current.target, 'reports/browser.json'), 'utf8'));
    assert.equal(report.passed, false);
    assert.equal(report.stage, 'publication-preflight');
  } finally {
    if (previous === undefined) delete process.env.ALLOW_BROWSER_QA;
    else process.env.ALLOW_BROWSER_QA = previous;
  }
});
