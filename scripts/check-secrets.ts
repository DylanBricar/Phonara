import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const trackedFiles = spawnSync("git", ["ls-files"], {
  encoding: "utf8",
  shell: true,
});

if (trackedFiles.status !== 0) {
  console.error(trackedFiles.stderr);
  process.exit(trackedFiles.status ?? 1);
}

const ignoredPathPatterns = [
  /^bun\.lock$/,
  /^src\/bindings\.ts$/,
  /^src-tauri\/Cargo\.lock$/,
  /^src-tauri\/src\/catalog\/catalog\.json$/,
  /^src\/i18n\/locales\//,
];

const textFilePattern =
  /\.(css|html|json|md|nsi|rs|sh|toml|ts|tsx|txt|yml|yaml)$/;

const secretPatterns = [
  {
    name: "private key material",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  },
  {
    name: "long assigned credential",
    pattern:
      /\b(?:api[_-]?key|secret|token|password)\b\s*[:=]\s*["'][A-Za-z0-9_./+=-]{24,}["']/i,
  },
];

const violations: string[] = [];

for (const rawPath of trackedFiles.stdout.split(/\r?\n/).filter(Boolean)) {
  const file = rawPath.replaceAll("\\", "/");
  if (!textFilePattern.test(file)) continue;
  if (ignoredPathPatterns.some((pattern) => pattern.test(file))) continue;

  const content = readFileSync(rawPath, "utf8");
  for (const { name, pattern } of secretPatterns) {
    const match = pattern.exec(content);
    if (match) {
      violations.push(`${file}: possible ${name}`);
    }
  }
}

if (violations.length > 0) {
  console.error("Potential secrets found:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("No obvious committed secrets found.");
