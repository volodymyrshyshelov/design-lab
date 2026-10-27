# Installation

Design Lab installs into a selected project. It adds one `$design-lab` skill, one `design_lab` agent, and project MCP configuration. Codex authentication, model selection, and execution permissions remain with the invoking session.

## Requirements

Use Node.js 24.22.1 or later within the Node 24 series, npm, and an installed Codex client with your own model access. Python 3 enables the full local reference search. Browser verification uses the Chromium version installed by Playwright. Linux browser dependencies may require administrator access.

The documented commands include Windows-compatible setup paths, but native Windows execution has not been verified. Plugin discovery and installation through the native Codex interface are also unverified. Project configuration remains subject to the client's trust settings and enforced policies.

## Create a project

Clone [Design Lab](https://github.com/volodymyrshyshelov/design-lab), enter its directory, and run:

```sh
npm ci --ignore-scripts
node scripts/design-lab.mjs create ../my-prototype --name "My prototype"
```

The destination must be empty or not yet exist. `create` copies the starter and installs the skill, agent, and project configuration. It does not generate a finished product from your brief; that is the next task for Codex.

Prepare the generated project:

```sh
cd ../my-prototype
npm ci --ignore-scripts
npx playwright install chromium
node .agents/skills/design-lab/scripts/index.mjs doctor .
```

`doctor` reports versions, installed project files, and the browser executable. It performs no installation. A detected executable does not prove that Chromium can launch; the browser checks establish that separately.

Open the generated directory in Codex and start a new session. Confirm that `$design-lab` is available. The project agent `design_lab` inherits the calling session's model and permissions. No personal Codex profile is copied or edited by the project installer.

## Install into an existing project

From the Design Lab repository:

```sh
node scripts/design-lab.mjs install /path/to/existing-project
```

This adds `.agents/skills/design-lab/`, `.codex/agents/design_lab.toml`, and the `design_lab_shadcn` and `design_lab_magicui` MCP entries in `.codex/config.toml`. It preserves the existing application. It stops if installed files or matching configuration differ, so local changes can be reconciled explicitly.

Installation alone does not adapt an existing application's routes or build system. For packaging and browser checks, prepare `lab.manifest.json` with its concepts, screens, roles, and viewport widths, plus a single static build at `dist/index.html` with local assets. Keep the existing application's own build and test commands.

## Build and verify a starter project

In a project created from the starter:

```sh
npm run check
npm test
npm run build
npm run package
```

Packaging produces `site/`, including a manifest describing the output. It requires a completed build; it does not run the build itself.

Start the packaged site in one terminal:

```sh
node .agents/skills/design-lab/scripts/index.mjs serve . --port 4174
```

The default listener is local to the current machine. Once local browser execution is authorized, run the matrix in another terminal. On Linux:

```sh
ALLOW_BROWSER_QA=1 node .agents/skills/design-lab/scripts/index.mjs check . --url http://127.0.0.1:4174
```

In PowerShell:

```powershell
$env:ALLOW_BROWSER_QA = "1"
node .agents/skills/design-lab/scripts/index.mjs check . --url http://127.0.0.1:4174
```

The checker accepts a loopback HTTP URL and writes `reports/browser.json`. It checks the configured render matrix and available packaged offline views. It does not establish that every product action works; add and run the relevant interaction tests. The starter also provides `npm run test:browser` for its browser scenarios.

If the port is occupied, choose another free port and use the same port in the check URL. Stop only the server process you started.

## Update an installation

Save local changes before obtaining a newer Design Lab revision. Compare it with the installed project copy before rerunning `install`. An identical installation can be repeated; differing files produce a conflict instead of a silent overwrite. Reconcile the changed skill, agent, and configuration before replacing them. The installer has no force-update command that discards edits.

## Optional plugin package

The repository includes `plugin.json` and `mcp.json`. The plugin is a separate discovery mechanism: installing it alone does not create the project agent, install application dependencies, or prepare Chromium. Use the project installer as the main setup route until native plugin loading is verified in your client.

Avoid enabling both the plugin and the installed project copy of the same skill. Use one discovery route so `$design-lab` does not appear twice.
