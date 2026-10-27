# Working with Design Lab

Design Lab connects a product brief, visual alternatives, working prototype actions, and a reviewable browser result. Use one natural-language conversation with `$design-lab`; you do not need to choose its internal design methods or libraries.

## Describe the outcome

After [installation](installation.md), open the project in Codex. Attach the specification or identify an existing project document:

```text
$design-lab Use this specification to create three different
directions for a customer workspace and an admin interface.
Include mobile and desktop, connected forms, and the important
error and access states. List unresolved product decisions.
```

Specify the audience, required tasks, brand constraints, and expected deliverable. The number of alternatives follows your request. The starter's sample screens and roles are a foundation, not requirements for every project.

The specification remains the source of confirmed behavior. Design proposals and open questions should be distinguishable from documented rules. The brief, coverage map, decisions, and reports preserve the working context in project files so a later session can continue from the same evidence.

## Compare alternatives

Open the prepared gallery and compare the same task across directions. Try creating a request or changing a setting, rather than judging only the landing screen. Alternatives should share the intended behavior while differing in composition, navigation, typography, and density.

Refine a selected direction with an ordinary request:

```text
$design-lab Continue with the second direction. Keep its navigation,
make the list denser, and add the approval screen described in the
specification. Identify the affected flows and verify them again.
```

Changing one direction does not imply replacing the others. A review should identify what changed, why it changed, and which checks confirm the result. Use the project's saved decisions to keep accepted behavior stable.

## Read verification evidence

A menu entry does not prove that its screen or action works. Reports should identify the files and build checked, the actions performed, the viewports used, failures found, and remaining gaps. Render checks, interaction tests, and visual inspection answer different questions.

Local persistence supports connected synthetic records and reload behavior. It does not establish production authentication, database isolation, real payments, or server security. The same preview URL also does not synchronize local browser data between viewers.

Creating and revising prototypes requires a model in your Codex session. Optional image generation uses capabilities available in that session; this repository does not install a local image-generation service. Once packaged, a static prototype can be viewed without Codex or a model.

## Share a browser result

Build and package the project first. The output is `site/`, with a manifest recording its contents. For an authorized network preview, run from the project directory:

```sh
node .agents/skills/design-lab/scripts/index.mjs serve . --bind 0.0.0.0 --port 4174
```

Only `site/` is served. Give viewers the server's actual IP address or hostname, such as `http://<server-IP>:4174/`. `0.0.0.0` is a listening address, not a viewer URL. Verify reachability from another device and choose a free port without stopping an existing service.

Deliver the usable URL or packaged files, the source revision, and the verification report. A prototype request does not itself authorize a Git push or deployment; use the scope already authorized for the task.

## Continue across sessions

Another Codex session can continue from the repository's specification, brief, decisions, coverage, and current source files. Personal chat history and browser storage are separate from those shared files.

When editing in parallel, use distinct branches or worktrees and reconcile changes through the project's normal review process. Several people can view one build, but independent tasks should not overwrite the same working directory.

Keep model credentials, personal profiles, caches, and runtime data outside version control. Update the installed Design Lab copy deliberately when adopting a newer version, preserving project changes as described in the [installation guide](installation.md).
