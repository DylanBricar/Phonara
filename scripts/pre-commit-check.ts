import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const run = (command: string, args: string[]) => {
  const result = spawnSync(command, args, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const capture = (command: string, args: string[]) => {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: true,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
};

const stagedFiles = capture("git", [
  "diff",
  "--cached",
  "--name-only",
  "--diff-filter=ACMR",
]).filter((file) => existsSync(file));

if (stagedFiles.length === 0) {
  process.exit(0);
}

const prettierFiles = stagedFiles.filter((file) =>
  /\.(css|html|json|md|ts|tsx|yml|yaml)$/.test(file),
);
const sourceFiles = stagedFiles.filter((file) =>
  /^src\/.*\.(ts|tsx)$/.test(file.replaceAll("\\", "/")),
);
const rustFiles = stagedFiles.filter((file) => file.endsWith(".rs"));
const translationFiles = stagedFiles.filter((file) =>
  /^src\/i18n\/locales\/.*\/translation\.json$/.test(
    file.replaceAll("\\", "/"),
  ),
);

if (prettierFiles.length > 0) {
  run("bunx", ["prettier", "--check", "--", ...prettierFiles]);
}

if (sourceFiles.length > 0) {
  run("bun", ["run", "lint"]);
  run("bun", ["run", "test:unit"]);
}

if (translationFiles.length > 0) {
  run("bun", ["run", "check:translations"]);
}

if (rustFiles.length > 0) {
  run("cargo", [
    "fmt",
    "--manifest-path",
    "src-tauri/Cargo.toml",
    "--",
    "--check",
  ]);
}
