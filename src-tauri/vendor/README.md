# Correctifs locaux des plugins Tauri

Ces deux crates conservent les versions publiées utilisées par Phonara et leur
API Tauri 2. Seul leur chemin D-Bus Linux/BSD est adapté à zbus 6. Aucun code
Windows, macOS, Android ou iOS n'est modifié.

| Crate                        | Version conservée | SHA256 du paquet crates.io                                         |
| ---------------------------- | ----------------- | ------------------------------------------------------------------ |
| tauri-plugin-opener          | 2.5.5             | `60d60366174b745b4ef5824b8bbc1c457fd08f0ce101ff643c0a49181a9f4e91` |
| tauri-plugin-single-instance | 2.4.4             | `5cd0cb5c412a5071b69bab6a6df1583cbb89460d4a83b6a24769b08d15b6b1e1` |

Les sources proviennent des paquets crates.io déjà présents dans le registre
Cargo local. Leurs métadonnées de publication indiquent la même révision
[Tauri `6aa2854f314481a459be1189b02c65a2450789ab`](https://github.com/tauri-apps/plugins-workspace/tree/6aa2854f314481a459be1189b02c65a2450789ab),
respectivement sous `plugins/opener` et `plugins/single-instance`. Les licences
duales Apache-2.0/MIT sont conservées dans chaque dossier : `LICENSE_APACHE-2.0`,
`LICENSE_MIT` et `LICENSE.spdx`.

Les manifestes normalisés publiés sont utilisés pour éviter un héritage du
workspace upstream. `Cargo.toml.orig` reste la copie de provenance originale,
sans être le manifeste utilisé par Cargo. Les ressources, permissions et scripts
de build publiés restent présents. `.cargo-ok`, `.cargo_vcs_info.json`, les
métadonnées de cache et les deux `Cargo.lock` internes sont exclus. Le lock de
l'application reste la référence de résolution.

## Diff maintenu

- `tauri-plugin-opener/Cargo.toml` : la dépendance zbus propre à Linux/BSD passe
  de `5.9` à `6.0.0`; toutes les autres dépendances restent identiques.
- `tauri-plugin-single-instance/Cargo.toml` : même changement pour Linux.
- `tauri-plugin-opener/src/reveal_item_in_dir.rs` : la connexion et les proxies
  D-Bus emploient l'API async avec un point d'entrée synchrone `zbus::block_on`.
  La tentative FileManager1 puis le repli OpenURI sur le premier fichier restent
  dans le même ordre. Le repli corrige aussi le contrat du portail : service
  `org.freedesktop.portal.Desktop`, interface `org.freedesktop.portal.OpenURI`,
  descripteur Unix du fichier, options `a{sv}` et handle objet en réponse, selon
  [la spécification OpenDirectory](https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.OpenURI.html#opendirectory).
  Trois tests D-Bus locaux sont ajoutés; le mock du portail lit le vrai
  descripteur transmis et renvoie un chemin objet.
- `tauri-plugin-single-instance/src/platform_impl/linux.rs` : l'acquisition du
  nom, le transfert des arguments/répertoire courant et la libération du nom
  passent à l'API async. Les builders zbus 6 reportent leurs erreurs à `build()`.
  Un test couvre concurrence d'instances, transfert Unicode, libération et
  nouvelle acquisition, sans créer d'AppHandle ni d'interface graphique.

Référence de migration :
[guide officiel zbus 6.0](https://github.com/z-galaxy/zbus/blob/zbus-6.0.0/book/src/upgrading-to-6.md),
tag `zbus-6.0.0`, objet Git `7c1168b1e5348d0a57a2b30ba06da4f25320634e`.
L'API bloquante et les proxies `*ProxyBlocking` ont disparu. Le runtime
`default-rt` de zbus 6, actif par défaut, garde les connexions en fonctionnement
via son thread auxiliaire entre deux appels à `block_on`. Aucun backend Tokio
supplémentaire n'est imposé aux plugins. zbus 6 nécessite Rust 1.89 minimum.

Le simple bump de la
[PR Tauri #3722](https://github.com/tauri-apps/plugins-workspace/pull/3722),
head `4ca9b07411df5f33bc24d43e940d8003804acab6`, ne suffit pas : ses jobs Linux
échouent sur les anciennes API bloquantes. Les versions stables plus récentes
des plugins et le head v2 `11211c30e71796cd737280303244552bb7f70797` dépendaient
encore de zbus 5 lors de la revue du 21 octobre 2026.

Cette migration retire les crates fusionnées dans zbus 6, signalées par
[RUSTSEC-2026-0370](https://rustsec.org/advisories/RUSTSEC-2026-0370.html),
[RUSTSEC-2026-0371](https://rustsec.org/advisories/RUSTSEC-2026-0371.html) et
[RUSTSEC-2026-0372](https://rustsec.org/advisories/RUSTSEC-2026-0372.html).
Elle ne modifie aucune politique d'audit.

Les dépendances de l'application sont épinglées aux deux versions copiées pour
éviter qu'une résolution future remplace le correctif par une version publiée
encore liée à zbus 5. Retirer ces patches et ces dossiers dès que les plugins
stables Tauri 2 intègrent une migration zbus 6 fonctionnelle, puis refaire les
quatre tests D-Bus et l'audit strict avec les versions publiées.

## Validation Linux sans interface graphique

Les tests sont ignorés par défaut car ils réclament un bus D-Bus privé. Après
résolution du lock avec les patches locaux, les lancer depuis `src-tauri` sur
Linux, avec les dépendances système Tauri installées :

```sh
dbus-run-session -- cargo test --locked -p tauri-plugin-opener --lib dbus_reveal_ -- --ignored --test-threads=1
dbus-run-session -- cargo test --locked -p tauri-plugin-single-instance --lib dbus_instance_ -- --ignored --test-threads=1
```

Ils utilisent les nouveaux chemins de production et des services D-Bus de test
en mémoire. Ils n'ouvrent aucun gestionnaire de fichiers, ne lancent pas
l'application et n'appellent pas les services de la session de l'utilisateur.
Le test opener vérifie toutes les URI et le repli après une erreur D-Bus; le test
single-instance vérifie le refus de la deuxième acquisition, le callback puis la
réutilisation du nom. Ces tests ne prouvent pas le comportement d'un gestionnaire
de fichiers réel ni le routage final vers l'AppHandle.

La validation de la copie compare les hashes de tous les fichiers avec les
paquets du registre : seuls les quatre fichiers listés dans « Diff maintenu »
doivent différer. Les licences et tous les fichiers spécifiques aux autres
plateformes doivent rester identiques.
