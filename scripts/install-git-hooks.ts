import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const hookPath = join(".git", "hooks", "pre-commit");
const hookBody = `#!/bin/sh
exec bun run precommit
`;

mkdirSync(dirname(hookPath), { recursive: true });
writeFileSync(hookPath, hookBody, { mode: 0o755 });
console.log(`Installed ${hookPath}`);
