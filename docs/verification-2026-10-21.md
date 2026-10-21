# Validation Phonara 0.9.6 - 21 octobre 2026

## Diagnostic et portée

Le favori Corsair conservait un ancien identifiant WASAPI. Le périphérique actuel
était bien présent et capturable, mais son nouvel identifiant ne correspondait
plus à la priorité enregistrée. Les logs fournis confirmaient l'utilisation de
l'OBSBOT. Un délai HID isolé ne démontrait pas que le casque était absent.

La mise à jour reprend le recorder Handy et le moteur C++ supervisé 0.4.0, en
conservant les sept familles ONNX et les 69 anciennes entrées du catalogue.
Quatre modèles ASR sont ajoutés ; leurs 24 artefacts ont été vérifiés par révision,
taille et SHA256. Les anciens chemins multitalker restent inchangés.

## Contrôles exécutés

| Contrôle                  | Résultat et limite                                                                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Qualité frontend complète | 70 tests Bun, 23 parcours Playwright ; TypeScript, ESLint, traductions, langues des modèles, secrets, build et formatage réussis. Couverture : 99,18 % des lignes et 100 % des fonctions.                                            |
| Tests Rust ordinaires     | 370 réussis, aucun échec ; les 17 tests matériels du superviseur sont ignorés par cette commande.                                                                                                                                    |
| Capture et VAD            | 40 tests ciblés réussis : pause/reprise, fin de trame, déconnexion, canal, rééchantillonnage, saturation bornée, vrai panic et isolation des notifications anciennes.                                                                |
| Clippy                    | Tous les targets/features, avertissements interdits : réussi.                                                                                                                                                                        |
| Bibliothèque native       | C++ 0.4.0 compilé en Release, Vulkan et modules CPU ; aucun lien avec l'ancien préfixe ABI 0.2.3.                                                                                                                                    |
| Capture Corsair réelle    | Exécutable final Release : 142 callbacks natifs, 68 160 échantillons à 48 kHz ; recorder de production : 47 callbacks, 22 411 échantillons mono à 16 kHz, aucune erreur. Aucune sauvegarde audio.                                    |
| Bouton muet physique      | Windows passe à `muted=true` pour le Corsair ; l'OBSBOT reste actif.                                                                                                                                                                 |
| Extinction physique       | Le récepteur indique zéro emplacement connecté ; le Corsair est écarté après trois observations concordantes.                                                                                                                        |
| Retour physique           | Après rallumage : casque joignable et micro non muet.                                                                                                                                                                                |
| Transcription native C++  | Exécutable final Release, Whisper Medium Q8, Vulkan : phrase française synthétique de 9,955 s correctement transcrite ; deux passages, 1 922 ms puis 183 ms, chargement 1 969 ms. Mesure ponctuelle, pas un benchmark généralisable. |
| Stabilité du superviseur  | 17 scénarios réels exécutés : 13 avec Whisper Medium, 4 de streaming avec Moonshine streaming tiny Q8. Crash GPU, repli CPU, annulation, blocage, fin du parent et durée de vie unique du worker vérifiés.                           |
| Audit Bun                 | Aucune vulnérabilité, 369 paquets.                                                                                                                                                                                                   |
| Audit RustSec             | Mode strict réussi : aucune vulnérabilité connue ni nouvel avertissement de maintenance, sans ajout d'exception. Voir le [rapport sécurité](security-review-2026-10-21.md).                                                          |

Après la migration des dépendances D-Bus, les 370 tests Windows et Clippy ont
été réexécutés avec succès. En CI Linux, 369 tests applicatifs et les quatre
tests D-Bus privés passent : instance unique, transfert Unicode, libération et
réacquisition du nom, URI FileManager1 et repli portail par descripteur de fichier.

Les quatre essais streaming lancés initialement avec Whisper échouaient sur
`stream begin: not implemented` : ce modèle batch ne satisfait pas leur
prérequis. Ils ont été réexécutés avec le modèle streaming épinglé et son SHA256
vérifié. L'annulation d'un worker bloqué est observée en environ 26-32 ms ; un
finalize volontairement bloqué est tué à son échéance, puis le batch aboutit.

## Installation locale

Les réglages réels, la base d'historique et l'installation précédente sont
sauvegardés hors du dépôt. La copie SQLite passe `PRAGMA quick_check`.
Les données et rapports de diagnostic privés ne sont pas publiés.

L'installateur NSIS 0.9.6 est compilé en local et installé avec succès. Les 22
bibliothèques déployées sont identiques par SHA256 aux fichiers préparés pour le
bundle. L'empreinte SHA256 de l'exécutable installé est rapprochée du build
local : il correspond exactement après remplacement du seul marqueur Tauri de
bundle `UNK` par `NSS` (trois octets documentés dans tauri-utils).

L'identifiant de la première priorité Corsair a été corrigé. Une comparaison
sémantique JSON confirme que tous les autres réglages sont conservés. Les
entrées de l'historique et sa version de schéma 5 sont préservées. Le lancement
manuel a ensuite été confirmé dans le vrai profil Windows. Les journaux réels
de la séquence observée de 14 h 21 à 14 h 23 (Europe/Brussels) confirment le
Corsair, Silero et Whisper Medium sur Vulkan, puis plusieurs dictées avec
sauvegarde dans l'historique et collage terminé, sans avertissement ni erreur
sur cette séquence. Deux sessions ultérieures signalent des discontinuités
WASAPI ; elles finissent normalement mais cela ne prouve pas l'absence de son
perdu. Le [diagnostic audio](audio-diagnostics.md#windows-capture-discontinuities)
précise leur sens et la priorité multimédia ajoutée en 0.9.7. L'utilisateur confirme également
la dictée en arrière-plan. Le raccourci temporaire de diagnostic a été retiré ;
les raccourcis Bureau et menu Démarrer n'ont aucun argument de diagnostic.

Les parcours Playwright utilisent un backend Tauri simulé. Les tests de framing
VAD ne démontrent pas l'exécution de chacun des modèles natifs. Les quatre
nouveaux modèles du catalogue et toutes les combinaisons quantification/GPU ne
sont pas téléchargés ni exécutés sur ce PC. La compilation macOS et les
fournisseurs cloud restent distincts de la validation Windows décrite ici.

Les résultats des cinq contrôles GitHub, dont la compilation Nix complète, sont
rattachés à la révision publiée dans la [PR #15](https://github.com/DylanBricar/Phonara/pull/15).
Les cinq contrôles requis ont réussi, puis les contrôles post-fusion sur
`f94d3c0e3d52c3ad0bc7b442a4c3c99c04e1d1fb` ont également réussi : qualité,
Playwright, tests/audit Rust, Nix et builds Windows/macOS. Un résultat local ou
un ancien run ne remplace pas le contrôle de la révision effectivement intégrée.

Ce rapport décrit la base 0.9.6. Les compléments de revue des PR #2302, #2307,
#2308 et #2309 sont suivis séparément pour la version 0.9.7.
