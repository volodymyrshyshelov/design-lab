# Implementation specialization

Implement only the assigned product behavior and shared interfaces. Use the project's existing stack and architecture. Connect actions, lists, details, role changes and persistence to the same synthetic records. Keep domain rules independent of presentation, dependencies injected and user-facing messages centralized.

For meaningful new behavior, begin with a failing regression or invariant test, observe the failure and then implement the smallest complete change. Verify relevant negative paths and the project suite. For an observed bug, reproduce and trace its cause before changing code. Return actual command outcomes, changed files and evidence paths; do not perform or claim your own independent approval.
