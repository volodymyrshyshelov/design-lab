# Embedded process methods

This is the selected Superpowers 7.0.1 source snapshot used by Design Lab's internal process. These resources supply attributed methods and templates; they are not separately installed skills, active agents, hooks, or permission to run upstream setup flows.

Use the Design Lab coordinator and its bundled workflow tools as the operational interface. The [process adapter](../../process-methods.md) connects these methods to native specialist workers, evidence capture, and an independent review gate.

- [Requirements and design reasoning](brainstorming/GUIDE.md)
- [Implementation planning](writing-plans/GUIDE.md)
- [Parallel work](dispatching-parallel-agents/GUIDE.md)
- [Specialist implementation and review loops](subagent-driven-development/GUIDE.md)
- [Behavioral tests](test-driven-development/GUIDE.md)
- [Root-cause debugging](systematic-debugging/GUIDE.md)
- [Requesting independent review](requesting-code-review/GUIDE.md)
- [Handling review findings](receiving-code-review/GUIDE.md)
- [Verification before completion](verification-before-completion/GUIDE.md)

The selected method folders include their reviewer prompts, supporting references, and helper source files. Read them only when relevant. The helper source is preserved for attribution and reference; Design Lab's managed workflow, project tool runtime, and normal preview tools remain the execution path.

The upstream installation commands, standalone skill invocations, default models and approval menus do not replace the user's scope, existing authorization, or current host permissions. Native subagent support and the signed-in model remain capabilities of the current Codex session.

Source: [obra/superpowers v7.0.1](https://github.com/obra/superpowers/tree/2ce8aa15d05bd57213e6f746f953aafb7ded7a8b). The adjacent [MIT license](LICENSE) retains Jesse Vincent's copyright and permission notice. Exact source/local hashes and adaptations are recorded in the package provenance.
