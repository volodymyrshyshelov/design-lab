---
name: design-lab
description: Use when a user requests product interface prototypes, visual directions, responsive screens, or changes to an existing Design Lab project from a specification or brief.
---

# Design Lab

Provide one coherent design and prototyping workflow from a product brief to a verified interactive preview. Internal methods are references inside this skill, not extra skills or agents the user must select. Use the `design_lab` project agent for substantial work when supported; otherwise perform the same workflow in the current session. Inherit the user's model, account and permissions.

## Start from the project

Read the supplied brief, canonical specification and existing implementation. For a missing attachment, request its file or path while progressing with independent work. Preserve the requested scope, stack and delivery order. An existing project receives targeted changes; initialize a starter only for a new project. For design-only or review-only requests, keep that scope.

Keep the project brief, accepted decisions, screen coverage and actual verification in project files so another session can continue. Distinguish sourced behavior from design proposals and unresolved questions. Read [workflow.md](references/workflow.md) for the project contract and connected scenarios.

## Choose and build directions

Use [visual-directions.md](references/visual-directions.md) to select the relevant internal methods. Read only the modules needed now; their upstream installation flows, model choices and approval rituals are not additional product requirements. Project rules and the user's existing authorization govern execution.

Requested variants share the same functional scope and connected synthetic state. Vary composition, navigation, type, geometry and density. Preserve existing directions when asked to extend them. Honor a request for an early single-direction preview, then complete the remaining agreed scope.

Reuse the licensed starter components when helpful. Keep user-facing messages centralized, domain rules separate from views and persistence injected. A working form changes the same record shown in lists and details; verify role transitions, important alternatives and reload behavior. Do not infer a new product's domain from the starter or from an automatic style search.

## Run and deliver

[runtime.md](references/runtime.md) describes portable create/install, local dependencies, component MCP servers and site packaging. The skill includes the needed scripts and starter assets. Image generation and Product Design are optional host capabilities; absence of either does not block code-native UI work.

Run the checks relevant to the change using [verification.md](references/verification.md). Inspect native browser captures and fix observed layout or interaction defects. Browser permissions remain those of the current session; reuse an existing authorization instead of asking again.

Deliver a working preview, source/artifact location and the actual verification scope. Reports from another project are examples, not results for this one. Local synthetic behavior does not establish backend integration. For authorized sharing, serve only the packaged `site/` directory, preserve existing listeners and provide a reachable IP or domain rather than a bind address. Push or deploy within the user's authorized scope. Asana remains read-only unless a specific mutation is separately requested and approved.
