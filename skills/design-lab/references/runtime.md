# Bundled runtime and workflow tools

Use the installed skill's own scripts and references. The project CLI is `node .agents/skills/design-lab/scripts/index.mjs`; the toolkit-repository wrapper is `node scripts/design-lab.mjs`. The gateway and command-line fallback execute the same handlers against an explicit project.

## Prepare one project

`create <empty-directory> --name "Project title"` copies the starter, one skill, one project agent, and one `design_lab` gateway definition. `install <existing-project>` adds those resources while preserving unrelated application files and settings. Pristine managed v0.1 installations can migrate; changed files and custom matching server settings require explicit reconciliation. `doctor <project>` inspects the environment without installing dependencies or authenticating a model.

The baseline is Node.js 24.22.1 or newer within Node 24, npm, and the current Codex model session. Gateway startup prepares `runtime/package.json` and its lockfile automatically, within the installed skill. The pinned MCP SDK and component providers do not need separate registration. Application dependencies remain governed by the product's own lockfile; prepare them during implementation. Prepare Playwright Chromium and any required OS libraries for authorized browser QA. Native Windows and plugin GUI loading are separately unverified paths.

## Managed tools

The workflow exposes `design_lab_start_run`, `design_lab_plan`, `design_lab_dispatch`, `design_lab_cancel_task`, `design_lab_complete_task`, `design_lab_submit_review`, `design_lab_finish_run`, and `design_lab_status`. The gateway also provides local diagnostics, packaging, and namespaced component tools.

Start a run with the brief, the actual coordinator identifier, and observed native delegation availability. Plan project-relative task ownership, dependencies, and acceptance criteria. Read the returned run ID and version for each mutation. A version conflict requires reading current status and reconciling changes, rather than overwriting another record.

Prepare dispatch without an `agentId` to obtain the scoped assignment. Spawn it with the host's native child-agent tool, then bind the actual returned ID using `design_lab_dispatch`. Only the coordinator updates the workflow record. Workers perform their assignments and return actual changed files, reports, commands, and outcomes; they do not create nested runs or more configured agents.

The six internal specializations are requirements, visual design, implementation, interaction QA, independent review, and documentation. Their prompts live in `internal/roles/`. Use only the assignments justified by the task. Parallel assignments must respect dependencies and file ownership.

Collect completed work with existing evidence and recorded check reports. Save a report for each assignment before recording completion. Evidence hashes are frozen in the record; overwriting a shared report invalidates that recorded evidence. The current state lives in `docs/design-lab/workflow.json`, with prior completed runs archived under `docs/design-lab/runs/` when a new run starts.

Independent review uses a fresh native worker ID distinct from the coordinator and contributors. Submit its structured findings through `design_lab_submit_review`; implementation cannot be accepted with open P0/P1/P2 findings or failed checks. Review and interaction-QA evidence must match the current declared source snapshot, including review-only scopes. Repair the issue, repeat affected checks, and redispatch a current review. `finish_run` verifies completion and evidence rather than trusting a summary sentence.

If a running assignment is interrupted or its review snapshot becomes stale, stop the native worker before calling `design_lab_cancel_task` with the current version and a reason. Stop and cancel running dependent tasks first. Cancellation preserves contributor history and reopens dependent results; it does not terminate models. Prepare and bind a new worker afterward, rather than submitting an old worker's result.

Native Codex provides the model workers; the package supplies planning, prompts, state, component tooling, and gates. IDs come from host results supplied by the coordinator, not cryptographic attestation. Without native delegation, record the limit and leave the run `needs-review` rather than self-approving.

## CLI fallback

If MCP cannot load or refresh, use the same gateway through `tool.mjs` with the real product directory. No user-side server reconfiguration is needed:

```sh
node .agents/skills/design-lab/scripts/tool.mjs list --project .
node .agents/skills/design-lab/scripts/tool.mjs call design_lab_status --project .
node .agents/skills/design-lab/scripts/tool.mjs call design_lab_plan --input reports/plan-input.json --project .
```

The JSON file must exist inside the selected project and match the tool's schema, including the current run ID and expected version where required. Use the tool schemas returned by `list`; do not invent IDs or completion records. For plugin installations, use the actual skill path loaded by the host instead of the example project path above.

The plugin passes its package root through `${PLUGIN_ROOT}`. It does not assume the plugin root is a product directory. If a host starts the plugin there without a project working directory, project-local workflow and packaging calls are rejected and the coordinator uses this CLI with the actual project path.

## Build, inspect, and publish

`lab.manifest.json` declares product directions, screens, roles, and verification widths. Update it with the real product; template entries are not evidence of completed scope. The starter uses `#concept=...&screen=...&role=...`, `data-active-concept`, and `data-screen-id` for inspection.

Build the application, then run `npm run package` or `node <skill-directory>/scripts/build-site.mjs --project .`. Packaging creates `site/` with local assets, direction shortcuts, licenses, and an output hash manifest. It rejects unresolved runtime dependencies. Preserve asset and component notices with their source.

Preview through `node <skill-directory>/scripts/index.mjs serve . --port 4174`. Authorized network sharing may add `--bind 0.0.0.0`; use a free port and return the reachable IP. Serve only `site/`, preserve existing listeners, and follow the task's authorization for publication. Viewing a packaged result does not require the model runtime.

## Optional catalog helpers

Use bundled resources, not upstream profile paths or a separate skill installation:

```sh
python3 .agents/skills/design-lab/references/vendor/ui-ux-pro-max/scripts/search.py "keyboard focus touch targets" --domain ux --max-results 3 --json
node .agents/skills/design-lab/references/vendor/taste-skill/scripts/draw.mjs --app --list kinds
```

Use an available Python 3 launcher for the optional catalog search. Run helpers from the product directory. In the toolkit repository replace `.agents/skills/design-lab` with `skills/design-lab`; elsewhere use the actual skill path. These remain internal helpers of the same process.
