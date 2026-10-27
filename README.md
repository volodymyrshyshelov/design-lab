# Design Lab

A complete project-local design workflow inside Codex. Give `$design-lab` a brief; it plans scoped work, coordinates specialists, builds responsive alternatives, runs checks, and requests an independent review before accepting the result. Design methods, component tooling, workflow state, and evidence checks are bundled behind one skill and one project agent.

## Quick start

Requires Codex, your own model access, Node.js 24.22.1 or later in the Node 24 series, and npm.

```sh
git clone https://github.com/volodymyrshyshelov/design-lab.git
cd design-lab
node scripts/design-lab.mjs create ../my-prototype --name "My prototype"
```

Open `my-prototype` in Codex and start a new session:

```text
$design-lab Use the attached specification to create three distinct
directions for a customer portal and its admin interface.
Cover mobile and desktop, connect the main actions, and identify
decisions the specification leaves open.
```

The starter is a foundation; your specification determines the screens, roles, and behavior. Design Lab prepares its pinned internal tool runtime automatically when needed. Application dependencies and browser checks are prepared as part of the work, using the project's own files.

Requirements, visual design, implementation, interaction QA, independent review, and documentation are internal specializations. They use Codex's native child agents and the current session's model access. Worker activity may appear in Codex; you do not install or choose six additional agents. If native delegation is unavailable, the run remains `needs-review` instead of approving its own work.

The plan, assignments, review findings, and evidence live with the project. Failed checks or material findings lead to a repair and another check/review cycle. Completion requires current source and evidence, not a success message alone.

- [Install, update, and verify](docs/installation.md)
- [Create, refine, and share a prototype](docs/working-with-design-lab.md)
- [Third-party sources and licenses](docs/third-party.md)
- [Verified scope and platform limits](docs/verification.md)

The project installer configures one Design Lab gateway. Its bundled CLI provides the same tools if the client cannot load or refresh MCP; no separate process-framework or component-server setup is required. Optional plugin manifests are included. Native plugin discovery and Windows execution remain unverified.

Creating designs requires a model in your Codex session. Packaged prototypes open without Codex. Data and local persistence are synthetic; production integrations require separate implementation. Image generation is optional and depends on the host session.

Maintained by [volodymyrshyshelov](https://github.com/volodymyrshyshelov). First-party materials remain all rights reserved; public repository visibility is not a permissive license. See [LICENSE](LICENSE). Third-party materials retain their own licenses.
