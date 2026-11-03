# Reconnexion des microphones - 3 novembre 2026

## Diagnostic observé

Dans Phonara 0.9.8 ouverte sur le PC, le Shure MV7+ classé en première position
apparaissait déconnecté, avec une proposition « Relier le microphone détecté ».
La prochaine dictée utilisait le Corsair classé après lui. Windows énumérait
pourtant un Shure MV7+ actif, par défaut et non muet. L'utilisateur a confirmé
utiliser le Shure. Le diagnostic headless du recorder de production a livré
24 171 échantillons mono à 16 kHz en 1,5 s, avec un pic non nul et sans erreur.
Le probe CPAL brut a signalé une discontinuité ; ce résultat est distinct de la
capture de production et ne prouve pas une panne du microphone.

L'action explicite de reconnexion dans l'application a rétabli le Shure comme
microphone de la prochaine dictée. Le redémarrage seul ne pouvait pas réparer
une préférence persistée avec un ancien identifiant Windows.

Après la reconnexion, l'utilisateur a confirmé que la voix et le texte
fonctionnent à nouveau avec Ctrl+Espace.

## Correction 0.9.9

L'identifiant de l'endpoint reste prioritaire. S'il a disparu de l'inventaire
actif, Phonara lit les identités matérielles des endpoints Windows, y compris
les entrées inactives conservées par le système. La préférence est réparée
uniquement si :

- l'ancien endpoint possède un `PKEY_Device_ContainerId` non nul, distinct du conteneur système partagé ;
- un seul endpoint d'entrée actif appartient à ce même conteneur ;
- son nom complet correspond exactement au nom enregistré.

L'ordre est préservé et un doublon résultant de la reconnexion est dédupliqué.
La mise à jour du store vérifie que la liste n'a pas été modifiée depuis sa
lecture. Le flux en cours reste sur son microphone jusqu'à la fin de la dictée.
La lecture des identités est mutualisée avec la détection Corsair et n'ouvre
aucun flux ni ne modifie Windows. Les identités figurent également dans
`--audio-diagnostics`, sous forme de chaînes hexadécimales sans perte numérique.

Sans métadonnées pour l'ancien endpoint, si le conteneur a changé, si plusieurs
entrées appartiennent au même matériel, ou si le nom a changé, Phonara conserve
la reconnexion explicite. Un nom seul ne permet jamais de remplacer un ID.
Linux et macOS conservent leur sélection actuelle.

Références Microsoft : [propriétés des périphériques audio](https://learn.microsoft.com/en-us/windows/win32/coreaudio/device-properties),
[énumération des endpoints](https://learn.microsoft.com/en-us/windows/win32/api/mmdeviceapi/nf-mmdeviceapi-immdeviceenumerator-enumaudioendpoints).

## Projets de base revus

La comparaison des heads et des patchs a été effectuée via l'API GitHub :

| Dépôt                                       | Révision revue le 21 octobre               | Révision revue le 3 novembre               | Delta                      |
| ------------------------------------------- | ------------------------------------------ | ------------------------------------------ | -------------------------- |
| [Parler](https://github.com/Melvynx/Parler) | `1aaa38b68bc4f8b4cb03d562345c0d726beb5ee1` | identique                                  | 0 commit                   |
| [Handy](https://github.com/cjpais/Handy)    | `5a9451e70aedc90648ce2befd9d7e0304746f9c1` | `82dfab9fda18c4bc24e1f6e56d36474d38eca0bc` | 34 commits, version 0.10.0 |

Correctifs adaptés en conservant les fonctions Phonara :

- [8020c873 / #2327](https://github.com/cjpais/Handy/commit/8020c873d86e96c25bf60aaeedd261d6b2e56735) : l'échec de création de chacun des deux gestionnaires de raccourcis remonte au constructeur et permet le repli Tauri.
- [26d20030 / #2247](https://github.com/cjpais/Handy/commit/26d200306ccb6e58c08fa48013760b255cd59c93) : initialisation de la position du curseur avant un déplacement souris ou tactile.
- [77ad9550 / #2254](https://github.com/cjpais/Handy/commit/77ad9550a26a9d7964757e035c044fc4fc387d8e) : nom accessible traduit du curseur de lecture.
- [090b370b / #2248](https://github.com/cjpais/Handy/commit/090b370be3aa5fc3ce617a2db0084782b33fbeb8) : protection de la validation pendant une composition IME, y compris le code 229.

Les versions capture/inférence sont identiques à Handy au head revu :
handy-recorder 0.1.0, handy-cpal 0.18.2, handy-keys 0.3.4 et transcribe-cpp 0.4.0.
La [PR Handy #2388](https://github.com/cjpais/Handy/pull/2388) reste ouverte ;
elle attend la fin d'un silence numérique de démarrage pour un cas Bluetooth
Linux et ne corrige pas la préférence Windows périmée observée ici. Elle n'est
pas intégrée. Les nouvelles fonctions d'onboarding et de notifications ne sont
pas nécessaires à ce correctif.

## Vérification

Les tests de reconnexion couvrent l'ordre des priorités, l'idempotence, le refus
des correspondances par nom seul, les conteneurs inconnus/nuls/différents,
plusieurs entrées du même conteneur, le nom modifié, les IDs présents et les
autres plateformes, ainsi que la déduplication. Les corrections upstream ont
leurs tests de démarrage des raccourcis, de lecture et de composition IME.

Les résultats de compilation, installation et utilisation réelle doivent être
rapportés séparément ; un diagnostic headless n'utilise pas nécessairement le
même profil Windows que l'application lancée depuis Explorer.

Contrôles locaux effectués avant livraison :

- `cargo test --release --locked --all-targets --all-features` : 398 tests réussis, 17 tests ignorés par la suite existante, aucun échec ;
- `cargo clippy --release --locked --all-targets --all-features -- -D warnings` : réussi ;
- format Rust/Prettier, traductions, couverture des langues, TypeScript et ESLint : réussis ;
- 46 scénarios Playwright existants et de lecteur audio : réussis ;
- 4 scénarios Playwright sur les composants IME réels : réussis (composition active, code 229, puis validation normale) ;
- audit Rust strict selon la politique existante et audit Bun : réussis.

L'audit Bun a nécessité ESLint 10.14.0 et minimatch 11.0.4 pour corriger
[GHSA-g3hv-75wg-m249](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249).
L'ancien override brace-expansion 1.x incompatible avec cette API est retiré.
Les URL, intégrités et le hash du verrou Nix sont synchronisés avec Bun ; le
build Nix lui-même relève de la CI Linux.

Le build Windows réutilise le préfixe natif existant transcribe-cpp 0.4.0 par son
interface `TRANSCRIBE_DIR`, après comparaison de l'ABI et des DLL avec le moteur
déjà installé. Le frontend, le backend Phonara et l'installateur sont reconstruits.
Cette réutilisation évite la résolution incorrecte du projet CMake temporaire
constatée avec MSBuild puis Ninja dans l'environnement Windows courant.
