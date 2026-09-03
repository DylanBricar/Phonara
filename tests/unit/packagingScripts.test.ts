import { afterEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../..");
const temporaryDirectories: string[] = [];
const bash =
  process.platform === "win32" &&
  existsSync("C:/Program Files/Git/bin/bash.exe")
    ? "C:/Program Files/Git/bin/bash.exe"
    : "bash";

function temporaryDirectory(name: string): string {
  const directory = mkdtempSync(join(tmpdir(), `phonara-${name}-`));
  temporaryDirectories.push(directory);
  return directory;
}

function run(command: string[]): ReturnType<typeof Bun.spawnSync> {
  return Bun.spawnSync(command, {
    cwd: repositoryRoot,
    env: process.env,
    stderr: "pipe",
    stdout: "pipe",
  });
}

function output(result: ReturnType<typeof Bun.spawnSync>): string {
  return `${result.stdout.toString()}${result.stderr.toString()}`;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("packaging audit scripts", () => {
  test("verifies the version reported by an extracted AppImage", () => {
    const directory = temporaryDirectory("appimage-version");
    const appImage = join(directory, "Phonara.AppImage");
    writeFileSync(
      appImage,
      `#!/usr/bin/env bash
set -euo pipefail
mkdir -p squashfs-root
cat > squashfs-root/AppRun <<'EOF'
#!/usr/bin/env bash
echo "phonara 1.2.3"
EOF
chmod +x squashfs-root/AppRun
`,
    );
    chmodSync(appImage, 0o755);

    const success = run([
      bash,
      "scripts/ci/verify-appimage-version.sh",
      appImage,
      "1.2.3",
    ]);
    expect(output(success)).toContain("expected version: 1.2.3");
    expect(success.exitCode).toBe(0);

    const mismatch = run([
      bash,
      "scripts/ci/verify-appimage-version.sh",
      appImage,
      "9.9.9",
    ]);
    expect(output(mismatch)).toContain("expected 'phonara 9.9.9'");
    expect(mismatch.exitCode).not.toBe(0);
  }, 20_000);

  test("validates Linux package listings and AppImage trees", () => {
    const directory = temporaryDirectory("linux-package");
    const listing = join(directory, "package.list");
    writeFileSync(
      listing,
      [
        "./usr/bin/phonara",
        "./usr/lib/Phonara/libtranscribe.so.0",
        "./usr/lib/Phonara/libggml-cpu-x64.so",
        "./usr/lib/Phonara/libonnxruntime.so.1",
      ].join("\n"),
    );

    const listingResult = run([
      bash,
      "scripts/ci/audit-linux-package.sh",
      "listing",
      listing,
      "true",
      "true",
    ]);
    expect(listingResult.exitCode).toBe(0);

    const root = join(directory, "squashfs-root");
    mkdirSync(join(root, "usr", "bin"), { recursive: true });
    mkdirSync(join(root, "usr", "lib"), { recursive: true });
    writeFileSync(join(root, "usr", "bin", "phonara"), "fixture");
    writeFileSync(join(root, "usr", "lib", "libtranscribe.so"), "fixture");
    writeFileSync(join(root, "usr", "lib", "libggml-cpu-x64.so"), "fixture");

    const treeResult = run([
      bash,
      "scripts/ci/audit-linux-package.sh",
      "appimage-root",
      root,
      "true",
    ]);
    expect(treeResult.exitCode).toBe(0);

    rmSync(join(root, "usr", "lib", "libggml-cpu-x64.so"));
    const missingBackend = run([
      bash,
      "scripts/ci/audit-linux-package.sh",
      "appimage-root",
      root,
      "true",
    ]);
    expect(output(missingBackend)).toContain(
      "missing AppImage ggml CPU backend module",
    );
    expect(missingBackend.exitCode).not.toBe(0);

    const emptyBundles = join(directory, "empty-bundles");
    mkdirSync(emptyBundles);
    const missingPackage = run([
      bash,
      "scripts/ci/audit-linux-package.sh",
      "bundles",
      emptyBundles,
      "ubuntu-24.04",
      "x86_64-unknown-linux-gnu",
      "false",
    ]);
    expect(output(missingPackage)).toContain("no supported Linux packages");
    expect(missingPackage.exitCode).not.toBe(0);
  }, 20_000);

  test("validates staged DLLs against an extracted Windows package", () => {
    const directory = temporaryDirectory("windows-package");
    const staging = join(directory, "staging");
    const packageRoot = join(directory, "package");
    mkdirSync(staging, { recursive: true });
    mkdirSync(packageRoot, { recursive: true });

    const files = [
      "phonara.exe",
      "msvcp140.dll",
      "vcruntime140.dll",
      "vcomp140.dll",
      "ggml-vulkan.dll",
      "transcribe.dll",
      "ggml-cpu-x64.dll",
    ];
    for (const file of files) {
      writeFileSync(join(packageRoot, file), "fixture");
      if (file.endsWith(".dll")) writeFileSync(join(staging, file), "fixture");
    }

    const success = run([
      "pwsh",
      "-NoProfile",
      "-File",
      "scripts/ci/audit-windows-package.ps1",
      "-PackageRoot",
      packageRoot,
      "-StagingDir",
      staging,
      "-Target",
      "x86_64-pc-windows-msvc",
      "-SkipLaunch",
    ]);
    expect(output(success)).toContain("package content audit passed");
    expect(success.exitCode).toBe(0);

    rmSync(join(packageRoot, "vcomp140.dll"));
    const missingRuntime = run([
      "pwsh",
      "-NoProfile",
      "-File",
      "scripts/ci/audit-windows-package.ps1",
      "-PackageRoot",
      packageRoot,
      "-StagingDir",
      staging,
      "-Target",
      "x86_64-pc-windows-msvc",
      "-SkipLaunch",
    ]);
    expect(output(missingRuntime)).toContain(
      "missing staged runtime DLL vcomp140.dll",
    );
    expect(missingRuntime.exitCode).not.toBe(0);
  }, 20_000);

  test("keeps releases cacheless while PR test builds use the Rust cache", () => {
    const pullRequestWorkflow = readFileSync(
      join(repositoryRoot, ".github/workflows/pr-test-build.yml"),
      "utf8",
    );
    const releaseWorkflow = readFileSync(
      join(repositoryRoot, ".github/workflows/release.yml"),
      "utf8",
    );

    expect(pullRequestWorkflow).toContain("no-cache: false");
    expect(releaseWorkflow).toContain("no-cache: true");

    const sharedBuildWorkflow = readFileSync(
      join(repositoryRoot, ".github/workflows/build.yml"),
      "utf8",
    );
    expect(sharedBuildWorkflow).toContain(
      "scripts/ci/verify-appimage-version.sh",
    );
    expect(sharedBuildWorkflow).toContain("scripts/ci/audit-linux-package.sh");
    expect(sharedBuildWorkflow).toContain(
      "scripts/ci/audit-windows-package.ps1",
    );
  });
});
