import { createWorkflowStore } from './workflow-store.mjs';
import { roles, editRoles, assertVersion, startRun, planRun, dispatchable, dispatchTask, cancelTask, assignedTask, recordCompletion, reviewRecord, finishable } from './workflow-model.mjs';
import { assignmentPrompt } from './workflow-prompts.mjs';

const string = { type: 'string', minLength: 1, maxLength: 5000 };
const strings = { type: 'array', items: string, maxItems: 100 };
const identity = { runId: string, expectedVersion: { type: 'integer', minimum: 1 } };
const checkSchema = { type: 'object', additionalProperties: false, required: ['command', 'passed', 'report'], properties: { command: string, passed: { type: 'boolean' }, report: string } };
const completed = { ...identity, taskId: string, agentId: string, summary: string, evidence: { ...strings, minItems: 1 }, checks: { type: 'array', items: checkSchema, maxItems: 100 } };
const completionRequired = [...Object.keys(completed)];
const schema = (properties, required = Object.keys(properties)) => ({ type: 'object', additionalProperties: false, required, properties });
const sourceScope = state => [...new Set(state.tasks.filter(task => editRoles.includes(task.role) || task.role === 'independent-review').flatMap(task => task.scope))];

export function createWorkflowTools(project) {
  const store = createWorkflowStore(project);
  const tool = (name, description, inputSchema, handler) => ({ name: 'design_lab_' + name, description, inputSchema, handler });
  async function mutate(input, type, apply) {
    return store.change(async current => {
      assertVersion(current, input);
      const next = await apply(structuredClone(current));
      next.version = current.version + 1;
      const cancellation = type === 'task-cancelled' ? { reason: input.reason, agentId: current.tasks.find(task => task.id === input.taskId)?.agentId } : {};
      next.events.push({ type, taskId: input.taskId, agentId: input.agentId, ...cancellation, at: new Date().toISOString() });
      if (next.events.length > 1000) throw new Error('Workflow history limit reached; finish or archive the current run.');
      return next;
    });
  }
  async function prepared(state, input) {
    assertVersion(state, input);
    const task = dispatchable(state, input.taskId, input.agentId);
    return { ...state, task, prompt: await assignmentPrompt(store.root, state, task), project: store.root, prepared: true };
  }
  async function taskEvidence(input) {
    return store.evidence([...input.evidence, ...input.checks.map(check => check.report)]);
  }
  return [
    tool('start_run', 'Start a project-local Design Lab run; record observed native delegation availability and the actual coordinator ID.', schema({ title: string, brief: { ...string, maxLength: 20000 }, coordinatorId: string, delegationAvailable: { type: 'boolean' } }), async input => store.change(current => startRun(current, input))),
    tool('plan', 'Persist scoped tasks, dependencies and acceptance criteria. Implementation requires an independent review covering every edit task.', schema({ ...identity, tasks: { type: 'array', minItems: 1, maxItems: 100, items: schema({ id: string, title: string, role: { type: 'string', enum: roles }, scope: { ...strings, minItems: 1 }, dependsOn: strings, acceptance: { ...strings, minItems: 1 } }) } }), async input => mutate(input, 'plan-recorded', async state => {
      const next = planRun(state, input);
      for (const task of next.tasks) await store.validateScope(task.scope);
      return next;
    })),
    tool('dispatch', 'Prepare an internal assignment without agentId, spawn it with native host delegation, then bind its actual returned agentId using the same workflow version.', schema({ ...identity, taskId: string, agentId: string }, ['runId', 'expectedVersion', 'taskId']), async input => {
      if (input.agentId === undefined) return prepared(await store.read(), input);
      const next = await mutate(input, 'task-dispatched', async state => {
        const task = dispatchable(state, input.taskId, input.agentId);
        return dispatchTask(state, task, input.agentId, await store.fingerprint(sourceScope(state)));
      });
      const task = next.tasks.find(item => item.id === input.taskId);
      return { ...next, task, prompt: await assignmentPrompt(store.root, next, task), project: store.root, prepared: false };
    }),
    tool('cancel_task', 'After the coordinator stops the native worker, cancel its running assignment and invalidate dependent results. This tool does not stop models; cancel running dependents first.', schema({ ...identity, taskId: string, reason: string }), async input => mutate(input, 'task-cancelled', async state => cancelTask(state, input))),
    tool('complete_task', 'Record a bound worker’s actual outcome, reports and evidence. Independent review must use submit_review.', schema(completed), async input => mutate(input, 'task-completed', async state => {
      const task = assignedTask(state, input);
      if (task.role === 'independent-review') throw new Error('Independent review requires submit_review.');
      return recordCompletion(state, task, input, await taskEvidence(input), await store.fingerprint(sourceScope(state)));
    })),
    tool('submit_review', 'Record a fresh reviewer’s findings against the unchanged source snapshot. A contributor or coordinator cannot self-approve.', schema({ ...completed, verdict: { type: 'string', enum: ['pass', 'changes-requested'] }, findings: { type: 'array', maxItems: 100, items: schema({ priority: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] }, status: { type: 'string', enum: ['open', 'resolved'] }, message: string, file: string }, ['priority', 'status', 'message']) } }, [...completionRequired, 'verdict', 'findings']), async input => mutate(input, 'review-submitted', async state => {
      const task = assignedTask(state, input);
      if (task.role !== 'independent-review') throw new Error('Only an independent-review assignment can submit review.');
      if (!state.delegationAvailable || task.agentId === state.coordinatorId || state.contributorIds.includes(task.agentId)) throw new Error('Independent review requires an actual separate native delegation.');
      const sourceDigest = await store.fingerprint(sourceScope(state));
      if (sourceDigest !== task.sourceDigest) throw new Error('Review source changed; stop the native worker, cancel its task, then prepare and dispatch a fresh review snapshot.');
      const review = reviewRecord(input);
      for (const finding of review.findings) if (finding.file) await store.validateScope([finding.file]);
      return recordCompletion(state, task, input, await taskEvidence(input), sourceDigest, review);
    })),
    tool('finish_run', 'Accept only completed tasks, current evidence, current passing checks and a passing review from a separate native worker.', schema(identity), async input => mutate(input, 'run-completed', async state => {
      finishable(state);
      const current = await store.fingerprint(sourceScope(state));
      for (const task of state.tasks) {
        if (['independent-review', 'interaction-qa'].includes(task.role) && task.sourceDigest !== current) throw new Error('Verification or review source changed; rerun the affected checks and review.');
        await store.verifyEvidence(task.evidence ?? []);
      }
      return { ...state, status: 'complete', acceptedSourceDigest: current, completedAt: new Date().toISOString() };
    })),
    tool('status', 'Read the current project workflow, identities, evidence and optimistic version without modifying it.', schema({ runId: string }, []), async input => {
      const state = await store.read();
      if (input.runId && state?.runId !== input.runId) throw new Error('Unknown workflow run.');
      if (state?.status === 'complete') {
        try {
          if (await store.fingerprint(sourceScope(state)) !== state.acceptedSourceDigest) return { ...state, acceptanceCurrent: false, acceptanceReason: 'Source changed after acceptance; start a new run.' };
          for (const task of state.tasks) await store.verifyEvidence(task.evidence ?? []);
          return { ...state, acceptanceCurrent: true };
        } catch (error) { return { ...state, acceptanceCurrent: false, acceptanceReason: error.message }; }
      }
      return state ?? { status: 'not-started', version: 0, tasks: [] };
    }),
  ];
}
