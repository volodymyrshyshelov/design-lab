---
name: design-lab
description: Use when a user requests product interface prototypes, visual directions, responsive screens, or changes to an existing Design Lab project from a specification or brief.
---

# Design Lab

Run the complete bundled design and delivery process through one entry point. The `design_lab` project agent coordinates internal specialist workers and a fresh independent review. Keep the user's model, account, permissions and requested scope. The internal roles and process methods need no separate skill, agent or component-server installation.

## Activate the internal tools

Use the Design Lab gateway tools when the host exposes them. Otherwise call the same bundled handlers through `node <actual-skill-directory>/scripts/tool.mjs` with the current product directory passed as `--project`. Runtime dependencies bootstrap automatically from the included lockfile. Do not tell the user to install or invoke Superpowers, Magic UI MCP or separate specialist agents.

For CLI tool inputs, write structured JSON to a project file and use `call TOOL --input FILE --project PROJECT`; do not interpolate a raw brief into shell code. If a plugin MCP process is bound to its package directory instead of the product, use this automatic CLI route. [runtime.md](references/runtime.md) explains the internal tools and first-run behavior.

## Plan and delegate

Read the actual brief, canonical specification and existing implementation. Ask about consequential missing information while continuing independent work. Keep existing project conventions and delivery order; initialize the starter only for a new project. Design-only and review-only requests retain that scope.

Read [process-methods.md](references/process-methods.md), then start and plan the run with the internal workflow tools. The plan contains literal relative file/directory scopes, dependencies and acceptance criteria. Use a concise brief with source-file references; specialists read the full source material where necessary. Reuse decisions and authorization already supplied by the user.

Select the internal requirements, visual-design, implementation, interaction-QA, independent-review and documentation specializations that the task needs. Prepare each assignment with `design_lab_dispatch`, use native host delegation with the returned scoped prompt, then bind the actual returned worker ID. Run independent scopes in parallel. Worker assignments execute their own scope without starting nested workflows. Keep small changes narrow rather than creating artificial work for every role.

Collect actual artifacts and immutable check reports through `design_lab_complete_task`. Use the current returned workflow version for each mutation; reconcile conflicts instead of overwriting another worker. [workflow.md](references/workflow.md) covers connected product scenarios and shared context.

For an interrupted assignment or a stale running review, stop its native worker first, then use `design_lab_cancel_task` and prepare a fresh assignment. Cancel running dependent workers before their prerequisite. The tool records cancellation and invalidates dependent results; it does not stop models.

## Build, review and deliver

Use the bundled component tools and the relevant [visual methods](references/visual-directions.md). Requested directions share functional scope and synthetic state while varying composition, navigation, typography and density. Preserve approved directions when extending them. Keep messages centralized, behavior separate from views and persistence injected. Image generation remains an optional host capability.

Run appropriate [checks](references/verification.md), inspect native browser captures and fix observed defects. Dispatch independent review into a fresh native context containing the brief, source and evidence, without the author's reasoning. Submit its actual findings through `design_lab_submit_review`. The reviewer must differ from the coordinator and contributors. Fix blocking findings, repeat affected checks and obtain a current review; changed source invalidates prior acceptance.

If native delegation is unavailable, preserve `needs-review` and report that limit. Never label the author's self-check independent. Worker IDs and check outcomes are recorded from host execution, not cryptographically attested by this package.

Complete through `design_lab_finish_run`, then deliver the working preview and actual verification scope. An early preview may precede the completed run. Serve only packaged `site/` for authorized sharing and preserve existing listeners. Push/deploy within existing authorization. Asana remains read-only unless a specific mutation is separately requested and approved.
