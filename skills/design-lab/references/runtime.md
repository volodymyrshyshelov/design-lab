# Portable runtime

Commands below use the CLI beside this skill: `node <skill-directory>/scripts/index.mjs`. In a configured project that path is `.agents/skills/design-lab/scripts/index.mjs`; in the toolkit repository the wrapper is `node scripts/design-lab.mjs`.

Create a new project in an empty destination:

```sh
node scripts/design-lab.mjs create ../new-prototype --name "New prototype"
```

This copies the starter, one skill, one project agent and two pinned project MCP definitions. `install <existing-project>` adds the toolkit to an existing project; it preserves unrelated settings and stops before conflicting replacements. A repeated identical install is safe. Use `doctor <project>` to inspect available runtime dependencies; it does not install them or authenticate a model.

After creation, work in the new project. Install project dependencies from its lockfile with `npm ci --ignore-scripts`. Browser verification uses Playwright's matching Chromium; prepare it with `npx playwright install chromium` when needed. Operating-system browser libraries may require the environment administrator. Node 24.22.1 or newer in major 24 and Python 3 are the supported baseline. Native Windows testing is reported separately from Linux/SSH testing.

The project `lab.manifest.json` describes directions, screens, roles and widths for generic packaging and rendering checks. Update it with the product; do not leave template routes as claims of completion. The starter uses `#concept=...&screen=...&role=...` and exposes `data-active-concept` plus `data-screen-id` for inspection.

Build the project and run `npm run package`, or `node <skill-directory>/scripts/build-site.mjs --project .`. Packaging embeds local assets and produces `site/index.html`, direction shortcuts, licenses and a hash manifest. It rejects unresolved or external runtime dependencies. Keep retained asset licenses next to their code or local asset directory.

Preview with `node <skill-directory>/scripts/index.mjs serve . --port 4174`. For authorized team sharing, add `--bind 0.0.0.0`, use a free port and return the actual reachable server IP. The server exposes only `site/`. Do not replace an existing listener or automatically alter network rules. Viewing a saved artifact works without Codex; creating and editing requires the user's available model session.

The plugin manifest is an alternative distribution wrapper. Installing a plugin alone does not install the project agent or project runtime. Use one installation route in a project to avoid duplicate entry skills. MCP tools are pinned registry helpers, not application backend services. Keep account credentials and global configuration outside this package.

## Bundled method commands

Upstream GUIDE examples retain their original host paths for attribution. In Design Lab replace those paths with the actual bundled module path. Do not rely on `CLAUDE_PLUGIN_ROOT`, a separate `~/.codex/skills` installation or upstream `.claude/skills` directories. In an installed project these commands use the bundled scripts and data directly:

```sh
python3 .agents/skills/design-lab/references/vendor/ui-ux-pro-max/scripts/search.py "keyboard focus touch targets" --domain ux --max-results 3 --json
node .agents/skills/design-lab/references/vendor/taste-skill/scripts/draw.mjs --app --list kinds
```

In the toolkit repository replace `.agents/skills/design-lab` with `skills/design-lab`; for any other installation use the skill directory actually read. On Windows use the available Python 3 launcher (`python` or `py -3`). Run commands from the current product directory so generated method outputs remain with that project. These are internal helpers of the same skill, not additional user-facing entry points.
