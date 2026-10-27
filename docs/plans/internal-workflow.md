# Embedded workflow implementation plan

Goal: invoking Design Lab provides planning, specialized execution, independent review and component tools from the installed package. Keep one public skill and one configured project agent.

Architecture: a bundled Node runtime exposes one Design Lab tool gateway. Its local child processes provide the pinned component registries. A persistent project workflow coordinates native Codex worker sessions using internal role prompts; model execution stays with the user's Codex session. The same tool handlers are available through a bundled CLI when a new MCP connection cannot be loaded in the current session.

The process source pack preserves the relevant Superpowers methods and license inside this package. It is not a dependency on a separately installed skill or plugin.

## Tasks

- [x] Add filesystem-backed planning and task dispatch with declared ownership, native worker identities, real evidence and versioned mutations.
- [x] Gate completion on a fresh review by a different worker, matching source revision and resolved blocking findings. Preserve an honest needs-review state when delegation is unavailable.
- [x] Bundle and bootstrap pinned runtime dependencies; route component registry tools and workflow tools through one gateway and one CLI surface.
- [x] Register one project MCP connection automatically. Migrate only pristine owned legacy files/settings; preserve unrelated or edited configuration.
- [x] Embed process methods and internal specialist prompts without extra discoverable skills or configured agents.
- [x] Update the entry skill, agent, public English documentation and metadata to use the actual internal tools automatically.
- [x] Verify filesystem races, ownership, review invalidation, migration, bootstrap, real MCP protocol and component calls from a clean installed project.
- [x] Execute a real task with native implementation and fresh review workers, inspect actual artifacts, and prepare the verified update for publication.

## Constraints

- No additional model provider, copied login, global profile modifications or independently installed Superpowers/Magic UI setup.
- Source and workspaces remain bounded by the current project's permissions. Publishing is authorized for the personal public repository.
- Native Codex delegation is the execution facility for internal roles; the Node package does not contain a model. Declared worker IDs are audit metadata, not cryptographic identity.
- One visible skill/agent configuration. Worker prompts are internal assets; temporary native worker sessions do not add project agent registrations.
- Internal components and process resources retain their licenses. Public exports contain no private project data or corporate context.
- Only relevant new behavior receives tests. Existing prototype behavior is checked through the normal starter suite and a targeted integration smoke after the tooling changes.
