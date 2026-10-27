import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createWorkflowTools } from '../../skills/design-lab/scripts/workflow.mjs';
import { createWorkflowStore } from '../../skills/design-lab/scripts/workflow-store.mjs';

async function setup(t, delegationAvailable = true) {
  const project = await mkdtemp(path.join(tmpdir(), 'design-lab-workflow-'));
  t.after(() => rm(project, { recursive: true, force: true }));
  await mkdir(path.join(project, 'src'));
  await mkdir(path.join(project, 'reports'));
  await writeFile(path.join(project, 'src/app.ts'), 'export const count = 1;\n');
  await writeFile(path.join(project, 'reports/check.txt'), 'Command completed with exit code 0.\n');
  const tools = createWorkflowTools(project);
  const call = async (name, args = {}) => tools.find(tool => tool.name === 'design_lab_' + name).handler(args);
  const started = await call('start_run', { title: 'A prototype', brief: 'Implement and independently review the requested prototype.', coordinatorId: 'native/root', delegationAvailable });
  const tasks = [
    { id: 'build', title: 'Implement the interaction', role: 'implementation', scope: ['src'], dependsOn: [], acceptance: ['The interaction updates one record.'] },
    { id: 'check', title: 'Run the browser checks', role: 'interaction-qa', scope: ['reports'], dependsOn: ['build'], acceptance: ['Checks have actual reports.'] },
    { id: 'review', title: 'Review the delivered interaction', role: 'independent-review', scope: ['src'], dependsOn: ['build', 'check'], acceptance: ['No open material findings.'] },
  ];
  const plan = async (value = tasks) => call('plan', { runId: started.runId, expectedVersion: (await call('status')).version, tasks: value });
  const mutation = async (name, args) => call(name, { runId: started.runId, expectedVersion: (await call('status')).version, ...args });
  const evidence = { summary: 'Actual work completed.', evidence: ['reports/check.txt'], checks: [{ command: 'node --test', passed: true, report: 'reports/check.txt' }] };
  const finishTask = async (id, agentId) => {
    await mutation('dispatch', { taskId: id, agentId });
    return mutation('complete_task', { taskId: id, agentId, ...evidence });
  };
  return { project, tools, call, started, tasks, plan, mutation, evidence, finishTask };
}

test('workflow persists a plan and dispatches a bundled specialization without another installed agent', async t => {
  const f = await setup(t); await f.plan();
  const dispatch = await f.mutation('dispatch', { taskId: 'build', agentId: 'native/builder' });
  assert.equal(dispatch.task.id, 'build'); assert.match(dispatch.prompt, /implementation/i);
  assert.ok(dispatch.prompt.includes(f.project));
  const state = await f.call('status'); assert.equal(state.tasks[0].agentId, 'native/builder');
  const persisted = JSON.parse(await readFile(path.join(f.project, 'docs/design-lab/workflow.json'), 'utf8'));
  assert.equal(persisted.version, state.version);
});
test('preparing an assignment is nonmutating so the actual native worker can be spawned before binding', async t => {
  const f = await setup(t); await f.plan();
  const before = await f.call('status');
  const prepared = await f.mutation('dispatch', { taskId: 'build' });
  assert.equal(prepared.prepared, true); assert.match(prepared.prompt, /Do not start another workflow/);
  assert.equal(prepared.version, before.version); assert.deepEqual(await f.call('status'), before);
  await assert.rejects(f.mutation('dispatch', { taskId: 'check' }), /dependenc/i);
  const bound = await f.call('dispatch', { runId: before.runId, expectedVersion: before.version, taskId: 'build', agentId: 'native/returned-id' });
  assert.equal(bound.task.agentId, 'native/returned-id'); assert.equal(bound.version, before.version + 1);
});
test('plan rejects missing independent review and cyclic dependencies before mutation', async t => {
  const f = await setup(t);
  await assert.rejects(f.plan(f.tasks.slice(0, 2)), /independent/i);
  const cyclic = structuredClone(f.tasks); cyclic[0].dependsOn = ['review'];
  await assert.rejects(f.plan(cyclic), /cycl/i);
  assert.equal((await f.call('status')).tasks.length, 0);
});
test('independent review scope covers every declared implementation scope', async t => {
  const f = await setup(t); const tasks = structuredClone(f.tasks);
  tasks[0].scope.push('package.json');
  await assert.rejects(f.plan(tasks), /review scope/i);
  tasks.find(task => task.id === 'review').scope.push('package.json');
  await f.plan(tasks); assert.equal((await f.call('status')).tasks.length, 3);
});
test('dispatch waits for dependencies and prevents overlapping concurrent ownership', async t => {
  const f = await setup(t);
  const parallel = [...f.tasks, { id: 'visual', title: 'Style the view', role: 'visual-design', scope: ['src/app.ts'], dependsOn: [], acceptance: ['Readable layout'] }];
  parallel.find(task => task.id === 'review').dependsOn.push('visual');
  await f.plan(parallel);
  await assert.rejects(f.mutation('dispatch', { taskId: 'check', agentId: 'native/qa' }), /dependenc/i);
  await f.mutation('dispatch', { taskId: 'build', agentId: 'native/builder' });
  await assert.rejects(f.mutation('dispatch', { taskId: 'visual', agentId: 'native/designer' }), /ownership|overlap/i);
});
test('independent review rejects the coordinator and every contributing worker', async t => {
  const f = await setup(t); await f.plan(); await f.finishTask('build', 'native/builder'); await f.finishTask('check', 'native/qa');
  for (const agentId of ['native/root', 'native/builder', 'native/qa']) await assert.rejects(f.mutation('dispatch', { taskId: 'review', agentId }), /independent|contribut|coordinator/i);
  const dispatch = await f.mutation('dispatch', { taskId: 'review', agentId: 'native/fresh-reviewer' });
  assert.equal(dispatch.task.agentId, 'native/fresh-reviewer');
});
test('unavailable delegation remains needs-review and cannot claim independent completion', async t => {
  const f = await setup(t, false); await f.plan(); await f.finishTask('build', 'native/root'); await f.finishTask('check', 'native/root');
  await assert.rejects(f.mutation('dispatch', { taskId: 'review', agentId: 'native/fabricated-reviewer' }), /delegation/i);
  const state = await f.call('status'); assert.equal(state.status, 'needs-review');
  await assert.rejects(f.mutation('finish_run', {}), /review|unfinished/i);
});
test('review fails on a stale source snapshot and cannot be completed through the ordinary worker route', async t => {
  const f = await setup(t); await f.plan(); await f.finishTask('build', 'native/builder'); await f.finishTask('check', 'native/qa');
  await f.mutation('dispatch', { taskId: 'review', agentId: 'native/reviewer' });
  await assert.rejects(f.mutation('complete_task', { taskId: 'review', agentId: 'native/reviewer', ...f.evidence }), /review/i);
  await writeFile(path.join(f.project, 'src/app.ts'), 'export const count = 2;\n');
  await assert.rejects(f.mutation('submit_review', { taskId: 'review', agentId: 'native/reviewer', verdict: 'pass', findings: [], ...f.evidence }), /changed|stale/i);
});
test('review-only runs fingerprint their declared source before submission, finish and later status', async t => {
  for (const phase of ['submission', 'finish', 'status']) {
    const f = await setup(t);
    await f.plan([{ ...f.tasks[2], dependsOn: [] }]);
    await f.mutation('dispatch', { taskId: 'review', agentId: 'native/reviewer' });
    const review = () => f.mutation('submit_review', { taskId: 'review', agentId: 'native/reviewer', verdict: 'pass', findings: [], ...f.evidence });
    if (phase !== 'submission') await review();
    if (phase === 'status') await f.mutation('finish_run', {});
    await writeFile(path.join(f.project, 'src/app.ts'), 'export const count = 20;\n');
    if (phase === 'submission') await assert.rejects(review(), /changed|stale/i);
    if (phase === 'finish') await assert.rejects(f.mutation('finish_run', {}), /changed|stale/i);
    if (phase === 'status') assert.equal((await f.call('status')).acceptanceCurrent, false);
  }
});
test('mixed runs fingerprint reviewed sources beyond the implementation ownership scope', async t => {
  const f = await setup(t); const tasks = structuredClone(f.tasks);
  tasks[0].scope = ['src/app.ts'];
  await writeFile(path.join(f.project, 'src/existing.ts'), 'export const existing = true;\n');
  await f.plan(tasks); await f.finishTask('build', 'native/builder'); await f.finishTask('check', 'native/qa');
  await f.mutation('dispatch', { taskId: 'review', agentId: 'native/reviewer' });
  await writeFile(path.join(f.project, 'src/existing.ts'), 'export const existing = false;\n');
  await assert.rejects(f.mutation('submit_review', { taskId: 'review', agentId: 'native/reviewer', verdict: 'pass', findings: [], ...f.evidence }), /changed|stale/i);
});
test('a stopped stale reviewer can be cancelled, rejects its old result and permits a fresh passing review', async t => {
  const f = await setup(t); await f.plan([{ ...f.tasks[2], dependsOn: [] }]);
  await f.mutation('dispatch', { taskId: 'review', agentId: 'native/old-reviewer' });
  await writeFile(path.join(f.project, 'src/app.ts'), 'export const count = 2;\n');
  const oldResult = () => f.mutation('submit_review', { taskId: 'review', agentId: 'native/old-reviewer', verdict: 'pass', findings: [], ...f.evidence });
  await assert.rejects(oldResult(), /changed|stale/i);
  const before = await f.call('status');
  await assert.rejects(f.mutation('cancel_task', { taskId: 'review', reason: '' }), /reason/i);
  const cancelled = await f.mutation('cancel_task', { taskId: 'review', reason: 'Native worker stopped after the source snapshot changed.' });
  assert.equal(cancelled.version, before.version + 1);
  assert.equal(cancelled.tasks[0].status, 'pending'); assert.equal(cancelled.tasks[0].agentId, undefined);
  assert.match(cancelled.events.at(-1).reason, /worker stopped/); assert.equal(cancelled.events.at(-1).agentId, 'native/old-reviewer');
  await f.mutation('dispatch', { taskId: 'review', agentId: 'native/fresh-reviewer' });
  await assert.rejects(oldResult(), /assigned native agent/i);
  await f.mutation('submit_review', { taskId: 'review', agentId: 'native/fresh-reviewer', verdict: 'pass', findings: [], ...f.evidence });
  assert.equal((await f.mutation('finish_run', {})).status, 'complete');
});
test('cancelling a stopped dependent reviewer permits implementation recovery without losing contributor history', async t => {
  const f = await setup(t); await f.plan(); await f.finishTask('build', 'native/builder'); await f.finishTask('check', 'native/qa');
  await f.mutation('dispatch', { taskId: 'review', agentId: 'native/reviewer' });
  await assert.rejects(f.mutation('dispatch', { taskId: 'build', agentId: 'native/replacement-builder' }), /dependent assignment/i);
  await f.mutation('cancel_task', { taskId: 'review', reason: 'Native reviewer stopped before correcting the implementation.' });
  await f.mutation('dispatch', { taskId: 'build', agentId: 'native/replacement-builder' });
  const cancelled = await f.mutation('cancel_task', { taskId: 'build', reason: 'Native builder stopped after its session failed.' });
  assert.ok(cancelled.tasks.every(task => task.status === 'pending'));
  assert.deepEqual(cancelled.contributorIds, ['native/builder', 'native/qa', 'native/replacement-builder']);
  await assert.rejects(f.mutation('complete_task', { taskId: 'build', agentId: 'native/replacement-builder', ...f.evidence }), /assigned native agent/i);
  await assert.rejects(f.mutation('cancel_task', { taskId: 'build', reason: 'Already stopped.' }), /running|active/i);
  await f.finishTask('build', 'native/new-builder'); await f.finishTask('check', 'native/new-qa');
  await assert.rejects(f.mutation('dispatch', { taskId: 'review', agentId: 'native/replacement-builder' }), /independent|contribut/i);
  await f.mutation('dispatch', { taskId: 'review', agentId: 'native/fresh-reviewer' });
  await f.mutation('submit_review', { taskId: 'review', agentId: 'native/fresh-reviewer', verdict: 'pass', findings: [], ...f.evidence });
  assert.equal((await f.mutation('finish_run', {})).status, 'complete');
});
test('material findings and failed checks prevent final acceptance', async t => {
  const f = await setup(t); await f.plan(); await f.finishTask('build', 'native/builder'); await f.finishTask('check', 'native/qa');
  await f.mutation('dispatch', { taskId: 'review', agentId: 'native/reviewer' });
  await f.mutation('submit_review', { taskId: 'review', agentId: 'native/reviewer', verdict: 'changes-requested', findings: [{ priority: 'P1', status: 'open', message: 'The action loses its record.', file: 'src/app.ts' }], ...f.evidence });
  await assert.rejects(f.mutation('finish_run', {}), /finding|review/i);
});
test('a failed verification can be retried and a requested correction invalidates dependent results', async t => {
  const f = await setup(t); await f.plan(); await f.finishTask('build', 'native/builder');
  await f.mutation('dispatch', { taskId: 'check', agentId: 'native/qa' });
  await f.mutation('complete_task', { taskId: 'check', agentId: 'native/qa', ...f.evidence, checks: [{ command: 'node --test', passed: false, report: 'reports/check.txt' }] });
  await assert.rejects(f.mutation('dispatch', { taskId: 'review', agentId: 'native/reviewer' }), /dependenc/i);
  await f.finishTask('check', 'native/qa');
  await f.mutation('dispatch', { taskId: 'review', agentId: 'native/reviewer' });
  await f.mutation('submit_review', { taskId: 'review', agentId: 'native/reviewer', verdict: 'changes-requested', findings: [{ priority: 'P2', status: 'open', message: 'The supplied value does not update.' }], ...f.evidence });
  await f.mutation('dispatch', { taskId: 'build', agentId: 'native/builder' });
  const state = await f.call('status'); assert.equal(state.tasks.find(task => task.id === 'check').status, 'pending'); assert.equal(state.tasks.find(task => task.id === 'review').status, 'pending');
  await assert.rejects(f.mutation('dispatch', { taskId: 'review', agentId: 'native/reviewer' }), /dependenc/i);
});
test('a passed current independent review finishes, while a later source change invalidates it', async t => {
  const f = await setup(t); await f.plan(); await f.finishTask('build', 'native/builder'); await f.finishTask('check', 'native/qa');
  await f.mutation('dispatch', { taskId: 'review', agentId: 'native/reviewer' });
  await f.mutation('submit_review', { taskId: 'review', agentId: 'native/reviewer', verdict: 'pass', findings: [], ...f.evidence });
  await writeFile(path.join(f.project, 'src/app.ts'), 'export const count = 3;\n');
  await assert.rejects(f.mutation('finish_run', {}), /changed|stale/i);
});
test('successful fresh run records actual evidence and independent reviewer identity', async t => {
  const f = await setup(t); await f.plan(); await f.finishTask('build', 'native/builder'); await f.finishTask('check', 'native/qa');
  await f.mutation('dispatch', { taskId: 'review', agentId: 'native/reviewer' });
  await f.mutation('submit_review', { taskId: 'review', agentId: 'native/reviewer', verdict: 'pass', findings: [], ...f.evidence });
  const state = await f.mutation('finish_run', {});
  assert.equal(state.status, 'complete'); assert.equal(state.tasks.find(task => task.id === 'review').agentId, 'native/reviewer');
  assert.match(state.tasks[0].evidence[0].sha256, /^[a-f0-9]{64}$/);
});
test('changed report evidence prevents acceptance and completed-run status identifies a later stale source', async t => {
  const f = await setup(t); await f.plan(); await f.finishTask('build', 'native/builder'); await f.finishTask('check', 'native/qa');
  await f.mutation('dispatch', { taskId: 'review', agentId: 'native/reviewer' });
  await f.mutation('submit_review', { taskId: 'review', agentId: 'native/reviewer', verdict: 'pass', findings: [], ...f.evidence });
  await writeFile(path.join(f.project, 'reports/check.txt'), 'A different result replaced the log.\n');
  await assert.rejects(f.mutation('finish_run', {}), /evidence changed/i);
  await writeFile(path.join(f.project, 'reports/check.txt'), 'Command completed with exit code 0.\n');
  await f.mutation('finish_run', {});
  assert.equal((await f.call('status')).acceptanceCurrent, true);
  await writeFile(path.join(f.project, 'src/app.ts'), 'export const count = 4;\n');
  const stale = await f.call('status'); assert.equal(stale.status, 'complete'); assert.equal(stale.acceptanceCurrent, false);
});
test('optimistic version and filesystem lock admit only one concurrent mutation', async t => {
  const f = await setup(t); await f.plan();
  const state = await f.call('status');
  const input = { runId: state.runId, expectedVersion: state.version, taskId: 'build', agentId: 'native/builder' };
  const results = await Promise.allSettled([f.call('dispatch', input), f.call('dispatch', input)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal((await f.call('status')).version, state.version + 1);
});
test('storage size validation preserves the previous readable workflow instead of writing an unreadable record', async t => {
  const f = await setup(t); const before = await f.call('status');
  const store = createWorkflowStore(f.project);
  await assert.rejects(store.change(state => ({ ...state, oversized: 'x'.repeat(2_000_000) })), /size limit|too large/i);
  assert.deepEqual(await f.call('status'), before);
});
test('source directories named like generated root outputs remain fingerprinted, including explicit output scopes', async t => {
  const f = await setup(t); const store = createWorkflowStore(f.project);
  for (const relative of ['src/reports', 'src/site', 'src/dist', 'reports']) {
    await mkdir(path.join(f.project, relative), { recursive: true });
    const filename = path.join(f.project, relative, 'page.tsx');
    await writeFile(filename, 'export default 1;\n');
    const scope = relative.startsWith('src/') ? ['src'] : [relative];
    const before = await store.fingerprint(scope);
    await writeFile(filename, 'export default 2;\n');
    assert.notEqual(await store.fingerprint(scope), before, relative);
  }
});
test('task scopes and evidence reject traversal, profiles and escaping symbolic links', async t => {
  const f = await setup(t); const outside = await mkdtemp(path.join(tmpdir(), 'design-lab-outside-'));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await writeFile(path.join(outside, 'secret.txt'), 'Must not read');
  await symlink(outside, path.join(f.project, 'escape'));
  for (const scope of ['../outside', '.env', '.codex/config.toml', 'escape', 'src/**', 'src/*.ts']) {
    const tasks = structuredClone(f.tasks); tasks[0].scope = [scope];
    await assert.rejects(f.plan(tasks), /scope|path|profile|symbolic/i);
  }
  await f.plan(); await f.mutation('dispatch', { taskId: 'build', agentId: 'native/builder' });
  await assert.rejects(f.mutation('complete_task', { taskId: 'build', agentId: 'native/builder', ...f.evidence, evidence: ['escape/secret.txt'] }), /path|symbolic/i);
});
