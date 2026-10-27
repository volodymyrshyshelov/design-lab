# Verify the current project

Use project-native checks first. In the starter: `npm run check`, `npm test`, `npm run build`, then `npm run package`. Domain checks should prove meaningful transitions and authorization; a view rendering does not prove its business action.

For the generic render matrix, start the packaged site on a free loopback port and run:

```sh
ALLOW_BROWSER_QA=1 node .agents/skills/design-lab/scripts/verify-browser.mjs --project . --url http://127.0.0.1:4174
```

On PowerShell set `$env:ALLOW_BROWSER_QA = '1'` before the Node command. Use the browser/runtime permissions already available in the session. Reports contain actual combinations from the project's manifest; no fixed count is a universal success criterion.

This verifier checks rendering, assets, overflow, browser errors and external requests, plus portable-file checks when available. Inspect its report for the exact scope. Add project-specific interactive checks for create/change/confirm/cancel, role changes, validation, retries or reload persistence as required by the brief. The starter's request example is not a test for a different domain.

Capture and inspect real browser screenshots at representative desktop and narrow sizes for every visual direction. A matrix alone cannot judge hierarchy, truncation or whether different directions have become palette variants. Check keyboard navigation, dialog focus/return, touch targets and reduced motion where applicable. Preserve native screenshots; do not edit them to hide defects.

Test packaged output separately from the development server: artifact hash/bytes match the manifest, shortcuts open the expected directions, local file viewing does not need network assets and HTTP exposes only the public site. An offline artifact may allow local actions if the project's contract does; do not impose another project's offline policy on every product.

State actual commands, results, exceptions and limitations in `docs/design-lab/verification.md`. Keep new evidence separate from examples and prior builds. Backend, database, external payments or security guarantees require their own real integration checks and are not established by local synthetic data.
