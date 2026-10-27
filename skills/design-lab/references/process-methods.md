# Embedded delivery process

Design Lab includes the process methods and the tools that manage their execution. The user invokes the same `$design-lab` entry point; do not ask them to install or invoke another process framework, component server, or specialist agent. The [attributed source snapshot](vendor/superpowers-process/GUIDE.md) contains the selected Superpowers methods and supporting templates. The active execution path is Design Lab's bundled workflow engine and tool runtime.

## From brief to a plan

Read the actual specification and existing project before creating work. Separate requirements, design proposals and unresolved decisions. Keep the agreed brief and acceptance criteria in project files. Clarify a consequential missing decision; reuse the authorization and implementation choices already given by the user. Upstream approval menus and installation commands are source material, not additional gates in this workflow.

Start the managed run with `design_lab_start_run`, recording the brief, coordinator identifier and whether native delegation is available. Use `design_lab_plan` to record tasks, scope, dependencies and acceptance criteria. Each task should produce a result that can be checked independently. Declare relative project paths for ownership and evidence; do not hand several workers the same editable scope concurrently.

Use the returned run identifier and current version for the next state-changing operation. A stale version requires reading current status and reconciling the work, not overwriting another task's record. The managed state lives in `docs/design-lab/workflow.json`; it supports continuation without relying on one chat's memory.

## Internal specializations

Choose the specializations needed for the approved work:

- **Requirements** traces the brief into screens, actions, states and meaningful exceptions. It records unknowns instead of inventing product rules.
- **Visual design** develops composition, navigation, typography, density and motion. Requested directions retain comparable functional scope.
- **Implementation** connects typed domain behavior, persistence and views. It runs meaningful tests for behavior changes and reports what it actually changed.
- **Interaction QA** exercises the real interface, keyboard behavior, responsive layouts, important alternatives and reload persistence. Packaged output receives its own identity and checks.
- **Independent review** checks the source requirements, implementation and observed interface from a fresh context. It reports actionable findings and verification limits.
- **Documentation** explains the resulting behavior, decisions and demonstrated checks so another session can continue the project.

These roles are bundled prompt resources. They are not additional installed skills or active agent configurations. Keep small changes narrow; do not create work merely to occupy every specialization.

## Dispatch and collect work

Prepare a task through `design_lab_dispatch` without an agent identifier to obtain its prompt, scope and project context. Dispatch that prompt using the current host's native subagent tool. Then bind the actual returned child-agent identifier through `design_lab_dispatch` using the same current run version. Workers receive the task and raw artifacts needed for it; they do not inherit unrelated implementation history or start nested runs.

The coordinator owns the workflow record. Collect the worker's result and record it with `design_lab_complete_task`, including existing evidence files and the commands/check reports actually produced. Do not convert a worker's unsupported success sentence into a passing check. Dependency and ownership constraints determine what can run in parallel.

Completion freezes the evidence hashes. Retain an immutable report for each assignment instead of overwriting one shared log after recording it. If a normal check rewrites a common report, save that result under the assignment's own report path before completing the task.

The bundled runtime supplies planning, prompts, record keeping and checks. Native Codex supplies model execution and separate worker contexts using the current session's available model and permissions. No additional model account or external agent service is configured by this package.

## Independent review and repair

Use a fresh native worker for independent review. Give it the brief, relevant source/diff, actual evidence and review scope. Keep the author's conclusions out of that initial review context. Record the actual child identifier; the reviewer must differ from the coordinator and contributors to the reviewed work.

Submit the result through `design_lab_submit_review` with its verdict, structured findings and actual checks. Open serious findings prevent successful completion. Investigate the underlying problem, make the scoped repair, run the checks affected by that repair, and request another review of the changed result. Preserve unresolved findings and limitations instead of silently approving them.

Review evidence is tied to a source revision. A later source change requires a current review; a passing result for an earlier revision does not approve the new one. The engine validates declared identity separation and evidence/source hashes. Native-agent identifiers are supplied by the coordinator from host results; this is a recorded workflow contract, not cryptographic proof of model identity.

Re-dispatch the completed implementation task when a repair is needed. Its dependent checks and review reopen, so record the new evidence before requesting the current review.

When an assignment is still running, stop its native worker before using `design_lab_cancel_task` with the current version and a reason. Stop and cancel running dependents first. This recovers an interrupted task or stale review while preserving contributor history and invalidating dependent results. The engine records cancellation; native host tools stop the model. Prepare and bind a fresh assignment before collecting new results.

If the current host cannot create an independent worker, keep the run in `needs-review`. Do not relabel the author's self-check as independent review, install an unrelated agent framework, or claim that the review passed.

## Complete the authorized result

Use `design_lab_status` to inspect remaining tasks and findings. Use `design_lab_finish_run` only after the required work, current evidence and independent review are complete. An early preview can be delivered while the full agreed run remains in progress.

Deliver the working preview, source/artifact location and the actual verification scope. Repeat or broaden checks when changes or unresolved concerns justify it. Publishing and deployment follow the user's existing authorization; the embedded process does not add permission for unrelated external writes.
