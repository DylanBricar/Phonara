# Dependency review - 21 October 2026

The initial RustSec audit reported ten vulnerability advisories and three new
maintenance warnings. The targeted dependency changes remove all ten known
vulnerability findings without moving the application onto Tauri 3 alpha.

- `rustls` 0.23.46 resolves RUSTSEC-2026-0346 through RUSTSEC-2026-0349.
- `rustls-webpki` 0.103.16 resolves RUSTSEC-2026-0382.
- `webpki-roots` and `webpki-root-certs` 1.0.10 resolve RUSTSEC-2026-0381 and
  RUSTSEC-2026-0383.
- The unused legacy ZIP updater feature is disabled, removing `zip` 4.6.1 and
  RUSTSEC-2026-0367 through RUSTSEC-2026-0369. The release workflow publishes
  signed raw NSIS executables and raw Linux AppImages. macOS tar extraction is
  unconditional in the updater and remains available. TLS and system proxy
  support are explicitly retained.

The archive advisory is described by
[RustSec RUSTSEC-2026-0368](https://rustsec.org/advisories/RUSTSEC-2026-0368.html).
This change does not remove Phonara's model archive support.

The frontend update pins Vite 8.2.4, brace-expansion 1.1.21 and source-map-js 1.2.2.
The Bun audit reported no vulnerabilities in the 369 resolved packages.

## Linux D-Bus maintenance warnings resolved

`zbus_names` 4.3.4, `zvariant` 5.15.0 and `zvariant_derive` 5.15.0 are transitive
Linux dependencies of the stable Tauri opener and single-instance plugins. They
were merged into zbus 6 and are no longer maintained separately:
[RUSTSEC-2026-0371](https://rustsec.org/advisories/RUSTSEC-2026-0371.html),
[RUSTSEC-2026-0370](https://rustsec.org/advisories/RUSTSEC-2026-0370.html),
[RUSTSEC-2026-0372](https://rustsec.org/advisories/RUSTSEC-2026-0372.html).

These were maintenance warnings, rather than demonstrated vulnerabilities in
Phonara. Published stable Tauri 2 plugins still depend on zbus 5, and the upstream
version-only migration fails to compile with zbus 6's removed blocking API.

The exact existing opener 2.5.5 and single-instance 2.4.4 sources are therefore
included under `src-tauri/vendor`, with their licenses and immutable package
checksums. Their two Linux/BSD modules use the maintained zbus 6 async API behind
synchronous entry points. Windows and macOS source code is unchanged. The
opener's portal fallback also uses the specified Unix FD, variant dictionary and
object-path response. Four private-bus tests exercise argument forwarding,
single-instance ownership, FileManager1 and the portal fallback in Linux CI.
See [provenance and removal criteria](../src-tauri/vendor/README.md).

The resulting strict local audit passes: zero known vulnerabilities and zero
new maintenance warnings. No new advisory ignore was added. Existing documented
advisory exceptions in `.cargo/audit.toml` remain separate. Linux CI passed
compilation, Clippy, the application tests and all four private-bus tests on
`25ff4d406083bb9563e46c4ab220bfa46fab139a`. Subsequent results are attached to the
exact published revision in [PR #15](https://github.com/DylanBricar/Phonara/pull/15).

Reproduce from the repository root:

```sh
bun audit
cargo audit --deny warnings --file src-tauri/Cargo.lock
cargo tree --manifest-path src-tauri/Cargo.toml --target all -i zbus@6.0.0
```

Building and using the Windows package does not exercise the Linux D-Bus stack.

## Remaining dependency constraints

Passing the repository audit policy does not mean that every existing advisory
exception has disappeared. The existing exceptions in `.cargo/audit.toml` are
unchanged. In particular, the post-merge Dependabot jobs for `glib` and `rand`
failed with `security_update_not_possible`; they are not successful updates.

- `glib` 0.18.5 is constrained by the GTK3/WebKitGTK Linux dependency graph.
  Dependabot requires at least 0.20.0. The Windows package does not load this
  Linux dependency. The existing migration is tracked in
  [issue #1](https://github.com/DylanBricar/Phonara/issues/1).
- `rand` 0.7.3 is constrained by `phf_generator` 0.8, `phf_codegen` 0.8 and
  `selectors` through `kuchikiki`/`tauri-utils`. This instance generates parser
  tables during the build; it is not Phonara's microphone or inference engine.
  Dependabot requires at least 0.8.6. The existing parent-dependency work is
  tracked in [issue #2](https://github.com/DylanBricar/Phonara/issues/2).

Replacing those crates with incompatible versions does not resolve their parent
API requirements. No check was disabled and no additional exception was added
to conceal these two failures.
