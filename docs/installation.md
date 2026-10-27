# Installation

Design Lab installs its process, design references, specialist prompts, and tool gateway into one project. You use `$design-lab`; internal workflow tools and component providers are prepared by the package.

## Start a project

The starting requirements are Codex with your own model access, Node.js 24.22.1 or later within Node 24, and npm. Clone [Design Lab](https://github.com/volodymyrshyshelov/design-lab) and run:

```sh
git clone https://github.com/volodymyrshyshelov/design-lab.git
cd design-lab
node scripts/design-lab.mjs create ../my-prototype --name "My prototype"
```

The destination must be empty or not yet exist. Open the generated directory in Codex and start a new session. Give `$design-lab` your specification and expected outcome. Creating the directory supplies a starter; the subsequent design task adapts it to your product.

The installer adds `.agents/skills/design-lab/`, `.codex/agents/design_lab.toml`, and one `design_lab` MCP definition in `.codex/config.toml`. It preserves unrelated settings. The agent inherits the calling session's model and permissions; personal profiles and credentials are not copied or reconfigured.

The first gateway startup prepares its internal dependencies from the skill's `runtime/package-lock.json`, within the installed skill. These include the MCP runtime, shadcn, Magic UI, and Impeccable. This can require npm network access. Repeated startup reuses a matching installation. There is no separate Superpowers installation or manual component-server registration.

Design Lab prepares the generated application's dependencies from its own lockfile when working on it. Browser verification uses matching Playwright Chromium and the available operating-system libraries. Python 3 enables an optional reference-catalog search; it is not required to start Design Lab.

Project settings remain subject to Codex trust and enforced execution policies. Native Windows and native plugin-directory loading remain unverified; Linux command behavior does not prove those client paths.

## Existing projects and updates

From the toolkit repository:

```sh
node scripts/design-lab.mjs install /path/to/existing-project
```

This installs the toolkit without replacing application code. The coordinator still needs to adapt the application's routes, behavior, manifest, build, and checks. Generic packaging expects `lab.manifest.json` and one static build at `dist/index.html` with local assets.

Save changes before updating an installation. An identical installation can be repeated. The installer recognizes its pristine previous v0.1 snapshot and can migrate it to the integrated runtime, replacing the two original managed MCP definitions with one gateway. Modified installed files, agents, or custom server settings produce a conflict rather than a silent overwrite. Reconcile those changes before retrying.

## If MCP is not available yet

No extra server setup is needed. The agent can invoke the same handlers through the bundled CLI with the actual project directory:

```sh
node .agents/skills/design-lab/scripts/tool.mjs call design_lab_status --project .
```

The CLI works without changing the client's global configuration or reloading MCP. It does not replace native Codex delegation: model workers still come from the host session. If the host cannot create a separate reviewer, the workflow records `needs-review` rather than self-approving.

For runtime and tool diagnostics, see the [runtime reference](../skills/design-lab/references/runtime.md).

## Build and preview commands

The coordinator runs checks and packaging during delivery. For direct use in a starter-based project:

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run build
npm run package
node .agents/skills/design-lab/scripts/index.mjs serve . --port 4174
```

The server exposes only `site/` and listens locally by default. Packaging uses the completed build and writes an output manifest. For browser QA, Design Lab prepares Playwright Chromium as needed; Linux system libraries may require administrator access. Browser execution follows the task's authorization and host policy. Interaction tests and visual inspection supplement the render matrix.

## Optional plugin distribution

`plugin.json` and `mcp.json` package the same gateway and skill. The plugin root is supplied by the host; the package does not ask you to register separate component servers. If a plugin starts without the product's working directory, its workflow mutations are blocked and the coordinator uses the bundled CLI with the real project path.

Installing a plugin alone does not create the project agent or an application. Use one skill-discovery route in a project to avoid duplicate `$design-lab` entries. Native plugin installation remains a separately unverified client path.
