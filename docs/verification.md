# Verification

The current toolkit was checked on Linux with Node.js 24 and Chromium. The package suite passed 21 filesystem, publication and resource-integrity checks. Skill metadata, agent TOML and the seven bundled reference modules were validated.

A new project created through the normal CLI passed strict TypeScript, seven service tests, a production build and portable packaging. Browser checks passed 150 direction/screen/role/viewport combinations, six offline file views and seven interactive scenarios. These scenarios cover record creation, reviewer handoff, confirmation, reload persistence, private-note projection, mobile dialog focus and offline input retention. No browser errors, console errors, external requests or overflow were observed in that scope.

The source package exposes one skill and one active project agent. Vendored files retain their recorded hashes and license notices. The public repository starts from a clean source history.

Native Windows/macOS execution and installation through the Codex plugin directory were not tested. The project installer is the validated setup route. These checks cover synthetic frontend behavior, not production authentication or external integrations. Dependency advisory notes are recorded in [third-party.md](third-party.md).
