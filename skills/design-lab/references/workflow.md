# Project contract

Contributors use the same design workflow. Their involvement in design review does not define application roles. Application roles, access and business rules come from the project's source material.

For a new substantial project, keep four small, maintained artifacts in `docs/design-lab/`:

- `brief.md`: audience, source documents, requested deliverables, target devices and consequential assumptions.
- `coverage.json`: screens and meaningful actions linked to source sections or explicitly labeled proposals; track what is implemented and verified separately.
- `decisions.md`: accepted direction and later changes, with their reason and effect on variants.
- `verification.md`: commands and observed outcomes, artifact identity and remaining limits.

Use an existing equivalent instead of duplicating it. A small correction needs only the affected entry and verification.

Extract the user's actual journeys before drawing a screen list. For a service booking, connect create → list → detail → confirmation/cancellation with one record; the generic starter's request lifecycle is only an example. Include fields, ownership, transitions, validation, duplicate actions, relevant empty/error/offline states and reload behavior that matter to that product. Resolve unknown rules with a labeled proposal or a concise question, depending on their consequence.

Keep variants comparable. Functional changes apply to the shared model; direction-specific changes apply to presentation. If a user selects one direction for further work, preserve the others unless removal is requested. A request to complete missing screens does not authorize redesigning approved screens.

Anyone with access can inspect a published laboratory in a browser. To request changes, each person opens the project in their own Codex session. Shared context comes from versioned project files; parallel edits use distinct worktrees or project copies, preserving existing work. Do not create a separate user database or chat synchronization system as part of a prototype request.

Finish the authorized scope. Describe uncertain product decisions where they affect the result; do not turn routine implementation decisions into repeated approval requests.
