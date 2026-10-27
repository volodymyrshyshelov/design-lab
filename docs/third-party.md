# Third-party materials

Design Lab includes seven design and frontend reference modules behind one skill. They remain attributed upstream materials rather than separately installed skills or active agents.

## Sources and licenses

- **Frontend Design** comes from [Anthropic Skills](https://github.com/anthropics/skills/tree/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/frontend-design), under Apache-2.0. Its `LICENSE.txt` is preserved.
- **Impeccable** comes from [pbakaus/impeccable](https://github.com/pbakaus/impeccable/tree/d34c87e1a00989ae8dbdd7f6b30b70f23319e860/.agents/skills/impeccable), under Apache-2.0. Its `LICENSE` and `NOTICE.md` are preserved, together with the associated MIT notices for referenced platform guidance and modern-screenshot.
- **Taste** comes from [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill/tree/12af471f627f866411b4bd785b19646d3672784c/skills/taste-skill), under MIT. Reference data and related scripts remain together so their relative paths work.
- **UI UX Pro Max** comes from [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/tree/28b3b8dee8c976df4fa3e94aed4e092ad43fcb03/.claude/skills/ui-ux-pro-max), under MIT. Its local search uses the accompanying `scripts/` and `data/` directories.
- **React Best Practices, Composition Patterns, and Web Design Guidelines** come from [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills/tree/6ec269328bc400712ee225a173a14b6b29128df7). The pinned upstream README and module metadata state MIT, but that revision has no separate root `LICENSE` file. The original README is retained as `UPSTREAM-LICENSE-STATEMENT.md`; no new upstream copyright notice has been invented.

[third-party-lock.json](../third-party-lock.json) records pinned revisions, upstream paths, source and local hashes, Git blob identities, and adaptations. Notices remain adjacent to their modules, with copies collected in [LICENSES/](../LICENSES/).

## Relocation

Internal materials live under `skills/design-lab/references/vendor/`. Upstream `SKILL.md` files are renamed to `GUIDE.md`, instruction files to `REFERENCE.md`, and agent configuration references to `*.reference.txt`. Markdown links are adjusted for those relocations. This preserves useful guidance without registering additional entry points or executing upstream configuration.

The lock records changes made during relocation, including the LF representation restored for `impeccable.cmd`. It distinguishes original source hashes from adapted local hashes. Model credentials, personal settings, binary caches, and prior runtime output are not part of the vendored reference snapshot.

Some upstream references describe their own installers, agents, or workflows. They supply design guidance within the active task; their inclusion does not activate those installers or grant permission for additional actions.

## Tool dependencies and generated output

The shadcn package is pinned to 4.23.0. Its shipped MIT notice is preserved in `LICENSES/shadcn/`.

For `@magicuidesign/mcp` 2.0.0, package metadata reports ISC while the shipped `LICENSE.md` contains MIT with Magic UI attribution. The shipped notice is retained in `LICENSES/@magicuidesign-mcp/`, and the lock records the discrepancy rather than silently changing either source.

The pinned optional local stdio tool `@magicuidesign/mcp` 2.0.0 resolves `zod` 3.25.76; a fresh `npm audit` flags [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) for Zod versions below 4.6.6. npm reports no automatic fix for this dependency path. This is a tooling dependency, not a starter application dependency; no unverified major-version override is applied.

Tool dependencies are installed through npm and its lockfile; `node_modules` is not the vendored reference snapshot. Component and font notices remain with the corresponding source and assets. Image catalog links are references, not a blanket license for every linked photograph; establish the rights for any selected image included in an output.

Built-in image generation and other host tools remain capabilities of the invoking session. They are not redistributed as local services by this package.

## Updating a module

Choose an upstream revision, inspect its license and notices, then update the related resources, links, and lock entries together. Review changed guidance and run the commands used by Design Lab. Replacing only `GUIDE.md` can break search or scripts that depend on adjacent files.

The first-party license is separate: [LICENSE](../LICENSE) reserves those rights. Public visibility of this repository does not replace the licenses attached to upstream material or grant a new permissive license for first-party code.
