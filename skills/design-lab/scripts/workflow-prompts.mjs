import { readFile } from 'node:fs/promises';

export async function assignmentPrompt(project, state, task) {
  const role = await readFile(new URL(`../internal/roles/${task.role}.md`, import.meta.url), 'utf8');
  return [
    role,
    '## Current assignment',
    `Project directory: ${project}`,
    `Workflow run: ${state.runId}`,
    `Task: ${task.id} — ${task.title}`,
    `Owned scope: ${task.scope.join(', ')}`,
    'Acceptance criteria:', ...task.acceptance.map(item => '- ' + item),
    '## Product brief', state.brief,
    'Execute only this assignment. Do not start another workflow, claim tasks, create additional agent configurations or delegate more workers. Return a concise result with actual changed files, commands, observed outcomes and existing evidence/report paths. The coordinator records your native host agent ID and completion.',
    task.role === 'independent-review' ? 'Inspect the current artifacts directly in a fresh context. Do not edit application files or accept an author’s explanation as evidence. Report concrete findings with priority, status and file locations. If no material findings remain, identify the exact reviewed scope and observed checks; do not claim unexecuted verification.' : 'Preserve other assignments and unrelated project changes. Shared project files remain the source of truth. Do not invent passing tests or independent review.',
  ].join('\n\n');
}
