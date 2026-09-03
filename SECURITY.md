# Security Policy

## Supported versions

Security fixes target the latest commit on `main` and the latest published
release. Older releases should be upgraded before reporting a reproducibility
problem.

## Reporting a vulnerability

Use GitHub's private **Report a vulnerability** form in the repository's
Security tab. Please do not disclose exploitable details in a public issue or
discussion. Include the affected version, platform, impact, reproduction steps,
and any proposed mitigation. Maintainers will acknowledge the report privately
and coordinate disclosure after a fix is available.

## Dependency policy

- Bun, Cargo, and GitHub Actions are monitored weekly by Dependabot.
- JavaScript and Rust lockfiles are committed and CI installs from them.
- `bun audit` rejects known JavaScript vulnerabilities.
- `cargo audit --deny warnings` rejects vulnerabilities, yanked crates, and any
  new informational warning.

The 23 existing RustSec informational warnings are explicitly allowlisted in
`.cargo/audit.toml`; they are not silently accepted. No lockfile-only compatible
update currently removes them. Their dependency roots and removal work are
tracked in four public issues:

1. [GTK3, gtk-layer-shell, glib, and proc-macro-error](https://github.com/DylanBricar/Phonara/issues/1)
2. [Tauri parser and code-generation transitives](https://github.com/DylanBricar/Phonara/issues/2)
3. [Specta's paste procedural macro](https://github.com/DylanBricar/Phonara/issues/3)
4. [ferrous-opencc's bincode dependency](https://github.com/DylanBricar/Phonara/issues/4)

An allowlist entry must be removed as soon as its dependency root can be
upgraded or replaced. Adding a new entry requires an explicit risk assessment,
an owner, and a public removal issue.
