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

## Remaining maintenance warnings

`zbus_names` 4.3.4, `zvariant` 5.15.0 and `zvariant_derive` 5.15.0 are transitive
Linux dependencies of the stable Tauri opener and single-instance plugins. They
were merged into zbus 6 and are no longer maintained separately:
[RUSTSEC-2026-0371](https://rustsec.org/advisories/RUSTSEC-2026-0371.html),
[RUSTSEC-2026-0370](https://rustsec.org/advisories/RUSTSEC-2026-0370.html),
[RUSTSEC-2026-0372](https://rustsec.org/advisories/RUSTSEC-2026-0372.html).

These are maintenance warnings, rather than demonstrated vulnerabilities in
Phonara. They remain visible to `cargo audit --deny warnings`; no new advisory
ignore was added. Accordingly, that strict audit exits with a failure despite
the zero-vulnerability result. Existing documented advisory exceptions in
`.cargo/audit.toml` remain separate. The parent plugins must adopt zbus 6 before
this new maintenance debt can be removed through a supported dependency update.

Reproduce from the repository root:

```sh
bun audit
cargo audit --deny warnings --file src-tauri/Cargo.lock
cargo tree --manifest-path src-tauri/Cargo.toml --target all -i zbus@5.19.0
```

Building and using the Windows package does not exercise the Linux D-Bus stack.
