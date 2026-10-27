# Design Lab starter

The starter connects five screens and two working contexts. A member creates a request, a reviewer starts the work and submits its result, and the member confirms completion. The same record persists across contexts and reloads. Internal notes are shown only to the reviewer.

Three directions—`studio`, `blueprint`, and `garden`—provide different compositions with the same behavior. Adapt their content, roles, entities, and flows to your project's specification. These sample records do not define the domain of your next product.

## Local development

Use Node.js 24.22.1 or later within the Node 24 series. From the project directory:

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run build
npm run dev
```

Vite listens on a local address by default. In a project prepared by the Design Lab installer, `npm run package` invokes the installed packager and creates `site/` from the completed build. Serve only that output directory when sharing a preview, keeping source files, dependencies, and internal files outside the web root.

With Playwright Chromium installed, `npm run test:browser` checks the record lifecycle, offline behavior, and mobile menu keyboard interaction. It starts a local Vite server on port 5186 and stops it afterward. To use an already running local project, supply its URL through `DESIGN_LAB_TEST_URL`.

`lab.manifest.json` holds the stable `projectId`, title, directions, screens, working contexts, and verification widths. The installer assigns each new project a distinct identifier, separating browser data even when projects share the same origin. Preserve `projectId` when renaming a project. Interface messages live in `src/messages/ru.ts` and are accessed through `src/presentation/views.ts`. Component and font provenance is recorded in `docs/component-provenance.json`, with licenses alongside the relevant materials.

## Demonstration scope

Data is synthetic and persists in this browser's storage. Switching contexts demonstrates available actions and record projections; production authentication and server-side isolation require separate implementation. Error and offline states preserve entered text and block actions until availability returns. Notification preferences are local, and no external messages are sent.
