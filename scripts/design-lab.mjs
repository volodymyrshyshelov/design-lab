import { run } from '../skills/design-lab/scripts/index.mjs';
try { await run(); } catch (error) { console.error(error.message); process.exitCode = 1; }
