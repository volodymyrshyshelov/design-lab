# Working with Design Lab

Design Lab manages the path from a brief to a checked prototype inside the current Codex session. Its process and tools are bundled; you describe the result and review the output rather than selecting separate design methods, servers, or specialist agents.

## Give it a product task

After [installation](installation.md), open the project in Codex. Attach a specification or identify its existing source document:

```text
$design-lab Use this specification to create three distinct directions
for a customer workspace and an admin interface. Include mobile
and desktop, connected forms, and the important error and access
states. Identify unresolved decisions and review the finished result.
```

State the audience, required tasks, brand constraints, and expected deliverable. The number of alternatives follows your request. Template roles and screens do not become requirements for every product.

The coordinator reads the specification and project before planning. Confirmed behavior, proposed design choices, and unresolved questions stay distinguishable. It carries forward choices and authorization already provided instead of restarting the discussion for each internal stage.

## What happens inside the run

The coordinator records the brief and a plan with owned file scopes, dependencies, and acceptance criteria. The managed record is `docs/design-lab/workflow.json`, so continuation does not depend on one chat's memory.

It uses the specializations needed for the task:

- Requirements connects source requirements to screens, actions, states, and important exceptions.
- Visual design develops comparable alternatives with distinct composition, navigation, typography, and density.
- Implementation connects the behavior, persistence, and views, with meaningful checks for changed behavior.
- Interaction QA exercises actual actions, alternative states, responsive layouts, keyboard focus, and reload behavior where relevant.
- Independent review examines the brief, current artifacts, and evidence in a fresh worker context.
- Documentation records the outcome, decisions, verification limits, and continuation context.

These are internal prompt resources, not six additional installed agent configurations. Codex's native child agents execute their assignments using the current session's available model and permissions. Codex may display their activity. Small changes use only the work that is needed; every task does not require six separate assignments.

The gateway stores task results, checks, evidence paths, and actual native worker IDs reported by the coordinator. Reports belong to individual assignments, and their recorded hashes prevent a rewritten log from silently standing in for the earlier result.

## Review, repair, and acceptance

A review of implementation uses a fresh native worker distinct from the coordinator and contributors. Its initial context contains the brief, artifacts, and relevant checks, rather than the author's conclusions. The reviewer reports actionable findings and what it could actually verify.

Failed checks or open material findings prevent acceptance. The coordinator investigates, assigns a scoped correction, repeats affected checks, and requests a current review. Source and evidence hashes tie acceptance to the declared reviewed result; a changed result needs current verification. These records enforce declared separation and traceability, not cryptographic proof of a worker's identity.

If native delegation is unavailable, the package cannot manufacture an independent model context. Work can be recorded, but the run remains `needs-review`; the author does not turn into their own independent reviewer. The outcome should make that limit visible.

## Compare and refine alternatives

Open the gallery and try the same task across directions. A menu entry does not establish that an action works. Compare the real form, state changes, errors, and navigation as well as visual character.

```text
$design-lab Continue with the second direction. Keep its navigation,
make the list denser, and add the approval screen in the specification.
Check the affected flows and obtain a fresh review of the changes.
```

Changing one direction does not imply replacing the others. The coordinator preserves accepted decisions, updates coverage, and starts or continues the appropriate managed run. A completed run is a record of that accepted revision; new changes require a new run.

## Share and continue

Delivery includes the usable preview or packaged `site/`, the source revision, the actual checks, and remaining limitations. For authorized network sharing, the bundled server can listen on `0.0.0.0`; viewers receive the server's reachable IP or hostname and port. Only the packaged site is served. Existing listeners and unrelated worktrees are preserved.

Another session can continue from the repository's specification, brief, decisions, coverage, workflow record, and evidence. Use separate worktrees for parallel editing. Personal chat history and local browser data are separate from shared source files; opening one URL does not synchronize viewers' synthetic records.

Creating designs requires the signed-in Codex model. Packaged static results open without Codex. Local prototype behavior does not establish production authentication, database isolation, real payments, or external integrations. Optional image generation remains a host capability. Pushes and deployments follow the authorization already given for the task.
