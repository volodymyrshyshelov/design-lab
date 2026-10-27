import { randomUUID } from 'node:crypto';

export const roles = ['requirements', 'visual-design', 'implementation', 'interaction-qa', 'independent-review', 'documentation'];
export const editRoles = ['visual-design', 'implementation'];
const nonempty = (value, maximum = 5000) => typeof value === 'string' && value.trim().length > 0 && value.length <= maximum;
const id = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value);
export function agentId(value) { if (!nonempty(value, 256)) throw new Error('A native host agent identifier is required.'); return value; }
export function assertVersion(state, input) {
  if (!state || input.runId !== state.runId) throw new Error('The workflow run does not exist; read status.');
  if (!Number.isInteger(input.expectedVersion) || input.expectedVersion !== state.version) throw new Error('Workflow version conflict; read status before retrying.');
  if (state.status === 'complete') throw new Error('This run is complete; start a new run for further changes.');
}
export function startRun(current, input) {
  if (current && current.status !== 'complete') throw new Error('An unfinished workflow already exists; continue it before starting another.');
  if (!nonempty(input.title, 300) || !nonempty(input.brief, 20000) || typeof input.delegationAvailable !== 'boolean') throw new Error('A title, brief and observed delegation availability are required.');
  return { schemaVersion: 1, runId: randomUUID(), version: 1, title: input.title.trim(), brief: input.brief.trim(), coordinatorId: agentId(input.coordinatorId), delegationAvailable: input.delegationAvailable, status: 'planning', tasks: [], contributorIds: [], events: [{ type: 'run-started', at: new Date().toISOString() }] };
}
export function planRun(state, input) {
  assertVersion(state, input);
  if (state.tasks.some(task => task.status === 'running')) throw new Error('Finish running assignments before replacing the plan.');
  if (!Array.isArray(input.tasks) || !input.tasks.length || input.tasks.length > 100) throw new Error('The plan needs 1 to 100 scoped tasks.');
  const seen = new Set();
  const tasks = input.tasks.map(task => {
    if (!id(task.id) || seen.has(task.id) || !roles.includes(task.role) || !nonempty(task.title, 500) || !Array.isArray(task.scope) || !task.scope.length || task.scope.length > 100 || !Array.isArray(task.dependsOn) || !Array.isArray(task.acceptance) || !task.acceptance.length || !task.acceptance.every(item => nonempty(item, 1000))) throw new Error('Each task needs a unique ID, role, scope, dependencies and acceptance criteria.');
    seen.add(task.id);
    return { id: task.id, title: task.title, role: task.role, scope: [...task.scope], dependsOn: [...new Set(task.dependsOn)], acceptance: [...task.acceptance], status: 'pending' };
  });
  for (const task of tasks) if (!task.dependsOn.every(dependency => seen.has(dependency))) throw new Error('A task dependency does not exist.');
  const ancestry = new Map();
  function ancestors(task, visiting = new Set()) {
    if (visiting.has(task.id)) throw new Error('The plan has a dependency cycle.');
    if (ancestry.has(task.id)) return ancestry.get(task.id);
    const next = new Set(visiting); next.add(task.id);
    const result = new Set();
    for (const dependency of task.dependsOn) {
      result.add(dependency);
      for (const parent of ancestors(tasks.find(item => item.id === dependency), next)) result.add(parent);
    }
    ancestry.set(task.id, result); return result;
  }
  const edits = tasks.filter(task => editRoles.includes(task.role));
  const reviews = tasks.filter(task => task.role === 'independent-review');
  if (edits.length && !reviews.length) throw new Error('Implementation requires an independent review task.');
  for (const task of tasks) {
    const parents = ancestors(task);
    if (task.role === 'independent-review' && !edits.every(edit => parents.has(edit.id))) throw new Error('Independent review must depend on every implementation and visual-design task.');
    if (task.role === 'independent-review' && !edits.every(edit => edit.scope.every(scope => task.scope.some(reviewScope => scope === reviewScope || scope.startsWith(reviewScope + '/'))))) throw new Error('Independent review scope must cover every declared implementation scope.');
  }
  return { ...state, tasks, status: state.delegationAvailable ? 'ready' : 'needs-review' };
}
function overlaps(first, second) { return first === second || first.startsWith(second + '/') || second.startsWith(first + '/'); }
export function dispatchable(state, taskId, workerId) {
  const task = state.tasks.find(item => item.id === taskId);
  if (!task) throw new Error('Unknown task.');
  if (task.status === 'running') throw new Error('The task already has an active assignment.');
  if (!task.dependsOn.every(dependency => state.tasks.find(item => item.id === dependency)?.status === 'complete')) throw new Error('Task dependencies are not complete.');
  if (task.role === 'independent-review') {
    if (!state.delegationAvailable) throw new Error('Native delegation is unavailable; independent review remains required.');
    if (workerId && (workerId === state.coordinatorId || state.contributorIds.includes(workerId))) throw new Error('Independent review requires a fresh agent distinct from the coordinator and contributors.');
  } else if (state.tasks.some(item => item.status === 'running' && item.role !== 'independent-review' && task.scope.some(a => item.scope.some(b => overlaps(a, b))))) throw new Error('Concurrent task ownership overlaps another running assignment.');
  return task;
}
function descendantsOf(state, task) {
  const descendants = new Set([task.id]);
  let changed = true;
  while (changed) { changed = false; for (const item of state.tasks) if (!descendants.has(item.id) && item.dependsOn.some(dependency => descendants.has(dependency))) { descendants.add(item.id); changed = true; } }
  if (state.tasks.some(item => item.id !== task.id && descendants.has(item.id) && item.status === 'running')) throw new Error('A dependent assignment is running; finish or cancel it before reopening its prerequisite.');
  return descendants;
}
function pendingTask(task) {
  const { agentId, sourceDigest, evidence, checks, review, summary, ...planned } = task;
  return { ...planned, status: 'pending' };
}
export function dispatchTask(state, task, workerId, sourceDigest) {
  agentId(workerId);
  if (task.role !== 'independent-review' && state.tasks.some(item => item.role === 'independent-review' && item.agentId === workerId)) throw new Error('An independent reviewer cannot become a contributor in the same run.');
  const descendants = descendantsOf(state, task);
  const tasks = state.tasks.map(item => item.id === task.id ? { ...pendingTask(item), status: 'running', agentId: workerId, sourceDigest } : descendants.has(item.id) ? pendingTask(item) : item);
  return { ...state, tasks, contributorIds: task.role === 'independent-review' ? state.contributorIds : [...new Set([...state.contributorIds, workerId])], status: state.delegationAvailable ? 'working' : 'needs-review' };
}
export function cancelTask(state, input) {
  const task = state.tasks.find(item => item.id === input.taskId);
  if (!task || task.status !== 'running') throw new Error('Only a running native assignment can be cancelled.');
  if (!nonempty(input.reason, 5000)) throw new Error('Cancellation requires a reason after stopping the native worker.');
  const descendants = descendantsOf(state, task);
  return { ...state, tasks: state.tasks.map(item => descendants.has(item.id) ? pendingTask(item) : item), status: state.delegationAvailable ? 'ready' : 'needs-review' };
}
export function assignedTask(state, input) {
  const task = state.tasks.find(item => item.id === input.taskId);
  if (!task || task.status !== 'running' || task.agentId !== input.agentId) throw new Error('Completion requires the task’s currently assigned native agent.');
  if (!nonempty(input.summary, 5000) || !Array.isArray(input.evidence) || !input.evidence.length || input.evidence.length > 100 || !Array.isArray(input.checks) || input.checks.length > 100) throw new Error('Completion needs a summary, existing evidence files and check records.');
  if (['interaction-qa', 'independent-review'].includes(task.role) && !input.checks.length) throw new Error('Verification and review require recorded checks.');
  for (const check of input.checks) if (!nonempty(check.command, 2000) || typeof check.passed !== 'boolean' || !nonempty(check.report, 512)) throw new Error('Each check needs its command, observed result and existing report file.');
  return task;
}
export function recordCompletion(state, task, input, evidence, sourceDigest, review) {
  const failed = input.checks.some(check => !check.passed);
  const result = { ...task, summary: input.summary, evidence, checks: input.checks, sourceDigest, ...(review ? { review } : {}), status: failed ? 'failed' : 'complete' };
  return { ...state, tasks: state.tasks.map(item => item.id === task.id ? result : item), status: failed || review?.verdict === 'changes-requested' ? 'needs-changes' : state.delegationAvailable ? 'working' : 'needs-review' };
}
export function reviewRecord(input) {
  if (!['pass', 'changes-requested'].includes(input.verdict) || !Array.isArray(input.findings) || input.findings.length > 100) throw new Error('Review needs a verdict and structured findings.');
  for (const finding of input.findings) if (!['P0', 'P1', 'P2', 'P3'].includes(finding.priority) || !['open', 'resolved'].includes(finding.status) || !nonempty(finding.message, 3000)) throw new Error('Review findings need priority, status and a concrete explanation.');
  if (input.verdict === 'pass' && input.findings.some(finding => finding.status === 'open' && finding.priority !== 'P3')) throw new Error('Passing review cannot contain open material findings.');
  return { verdict: input.verdict, findings: input.findings, provenance: 'Native agent IDs are supplied by the coordinator; this is not cryptographic identity attestation.' };
}
export function finishable(state) {
  if (!state.tasks.length) throw new Error('A planned and executed workflow is required before completion.');
  if (state.tasks.some(task => task.status !== 'complete')) throw new Error('Unfinished tasks or review prevent completion.');
  const reviews = state.tasks.filter(task => task.role === 'independent-review');
  if (state.tasks.some(task => editRoles.includes(task.role)) && (!state.delegationAvailable || !reviews.length || reviews.some(task => task.review?.verdict !== 'pass'))) throw new Error('A passing independent review is required.');
  if (reviews.some(task => task.review?.findings.some(finding => finding.status === 'open' && finding.priority !== 'P3'))) throw new Error('Open material findings prevent completion.');
  if (state.tasks.some(task => task.checks?.some(check => !check.passed))) throw new Error('Failed checks prevent completion.');
}
