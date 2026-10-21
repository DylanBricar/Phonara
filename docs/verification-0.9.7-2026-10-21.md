# Complément de validation Phonara 0.9.7 - 21 octobre 2026

Cette passe complète la [validation 0.9.6](verification-2026-10-21.md), après une
nouvelle lecture des heads Handy et Parler. Toutes les anciennes PR fusionnées
de Phonara sont ancêtres de la base `f94d3c0`. Aucun changement antérieur n'est
réinitialisé.

## Périmètre revu

- Handy : 62 commits depuis la référence historique, jusqu'à `5a9451e7`, et
  inventaire actualisé des 105 PR ouvertes. Parler reste inchangé.
- La PR fusionnée #2302 est adaptée au collage asynchrone Phonara. Les délais
  et accès bloquants au presse-papiers quittent l'UI ; les appels Enigo restent
  sur le fil principal sur macOS. La sérialisation et l'annulation couvrent la
  vraie restauration du collage expérimental.
- Les patchs ouverts #2307, #2308 et #2309 sont comparés : le rollback par clé
  était déjà présent ; les réponses de modèles périmées et les sources audio
  tardives sont corrigées. Les modèles personnalisés restent préservés.
- La priorité multimédia Windows est activée uniquement pour le fil de capture.
  Les avertissements WASAPI observés restent distincts des pertes du tampon
  applicatif et ne sont pas masqués.

La [revue upstream](upstream-review-2026-10-21.md) distingue les changements
intégrés, déjà présents, différés et incompatibles avec les modèles conservés.
Les patchs des 105 PR ouvertes n'ont pas tous fait l'objet d'une analyse en
profondeur ; un inventaire complet n'est pas une intégration de chaque fonction.

## Vérifications locales de la source

| Contrôle                            | Résultat                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Rust Windows, tous targets/features | 385 tests réussis, aucun échec ; 17 tests matériels ignorés par cette commande                                     |
| Clippy                              | Tous targets/features, avertissements interdits : réussi                                                           |
| Frontend                            | 172 tests Bun ; couverture 99,26 % lignes, 99,27 % fonctions ; seuils et exclusions inchangés                      |
| Navigateur                          | 44 scénarios Playwright réussis, dont 21 sur le vrai lecteur audio avec des WAV synthétiques                       |
| Qualité                             | TypeScript, ESLint, traductions, langues des modèles, secrets, build Vite et formatage réussis                     |
| Dépendances                         | Bun : aucune vulnérabilité sur 369 paquets ; RustSec : réussi selon la politique existante, sans ajout d'exception |
| Revue indépendante                  | Annulation après injection et avant lecture corrigée ; aucun autre défaut actionnable confirmé dans le diff final  |

Les nouveaux tests exercent notamment l'annulation pendant l'attente du verrou,
le travail bloquant hors event loop, la libération du verrou sur erreur,
l'annulation après le raccourci de collage mais avant sa lecture, la période de
calme après plusieurs lectures et le refus d'une injection tardive. Ils couvrent
aussi les réponses réseau désordonnées du vrai store via IPC simulé, les
changements de connexion pendant sauvegarde, le rollback concurrent par clé et
le cycle du lecteur sous StrictMode, changement de fichier et `canplay` tardif.

## Preuves distinctes et limites

Le build Release, le paquet NSIS installé, la priorité MMCSS effective et les
dictées du vrai profil Windows sont vérifiés séparément de ces tests de source.
Les résultats de livraison et de CI sont associés au commit publié, dans sa PR
de livraison et ses runs GitHub. Un build antérieur ne prouve pas le nouveau
binaire. Les sauvegardes, empreintes et journaux locaux restent privés.

Les tests navigateur utilisent des réponses IPC simulées et ne consomment pas
de fournisseur cloud réel. Le matériel macOS/AppKit et chaque combinaison de
modèle/GPU ne sont pas exécutés sur ce PC. Les 17 scénarios matériels du
superviseur ont été exercés séparément pendant la passe 0.9.6 ; ce complément
ne modifie pas le moteur d'inférence.

Les deux anciens jobs Dependabot `glib` et `rand` restent bloqués par leurs
contraintes parentes. La [revue sécurité](security-review-2026-10-21.md) précise
ces limites, les plateformes concernées et les exceptions existantes. Réussir
la CI ne constitue pas une garantie d'absence de tout bug ou de toute alerte.
