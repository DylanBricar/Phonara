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
bundle. L'exécutable installé a pour SHA256
`c7f5e360cc673972a500bab21edb3c75bbd17b8540fa6db4b2872fbb26773e69`.
Il correspond exactement au build après remplacement du seul marqueur Tauri de
bundle `UNK` par `NSS` (trois octets documentés dans tauri-utils).

L'identifiant de la première priorité Corsair a été corrigé. Une comparaison
sémantique JSON confirme que tous les autres réglages sont conservés. Les
entrées de l'historique et sa version de schéma 5 sont préservées. Le contrôle
Windows ayant été arrêté par Échap, aucune nouvelle action UI n'est envoyée ;
l'essai visuel et la dictée depuis le raccourci habituel sont demandés à
l'utilisateur et restent en attente de son retour.

Les parcours Playwright utilisent un backend Tauri simulé. Les tests de framing
VAD ne démontrent pas l'exécution de chacun des modèles natifs. Les quatre
nouveaux modèles du catalogue et toutes les combinaisons quantification/GPU ne
sont pas téléchargés ni exécutés sur ce PC. La compilation Linux/macOS et les
fournisseurs cloud restent distincts de la validation Windows décrite ici.
