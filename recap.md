# Récapitulatif temporaire - Phonara

Mise à jour : 27 octobre 2026. Ce fichier permet de reprendre le projet dans un nouveau chat.
Il est temporaire et peut être supprimé après transmission.

## Portée de cette discussion

La demande actuelle porte sur la transmission, le nettoyage justifié, les commits/pushes
et la consolidation des branches vers main. Les informations de produit ci-dessous
sont tirées des sources, de la documentation et de l'historique du dépôt ; elles ne
prétendent pas reconstituer toutes les conversations antérieures.

Révision de départ : `7734e2ffd6f6a313c31013845b3d91a9ea646fbd`. Inventaire initial : 493 fichiers suivis.

## Produit et fonctionnement

Application desktop de transcription locale : raccourci global, capture microphone, détection de parole, inférence puis insertion du texte dans l'application active.

Tauri 2/Rust avec interface React/TypeScript et Zustand. Les managers audio/modèles/transcription/historique sont dans src-tauri/src/managers/. Pipeline audio -> VAD -> Whisper/Parakeet -> presse-papiers/collage. Les commandes Tauri et événements relient interface et backend ; paramètres persistés via le store Tauri. Les modèles, bibliothèques natives et historique utilisateur sont indispensables et restent locaux.

## Choix de design à préserver

Interface de réglages et onboarding localisés, overlay d'enregistrement compact, couleurs d'état distinctes et priorité à la lisibilité. Le signal prêt exige de vrais échantillons microphone ; ne pas afficher une réussite seulement parce qu'une commande a été envoyée.

## Déjà réalisé avant ce nettoyage

- Gestion des priorités microphones, reprise après déconnexion et isolation de l'inférence native.
- Corrections de fiabilité du collage et de réponses périmées dans la version 0.9.7 (22c45b2).
- Version 0.9.8 : horodatage monotone à l'entrée du callback puis transport dans QueuedInput, pour préserver l'appui bref durant le démarrage WASAPI (7734e2f/5dc2531).
- La limite hold-or-toggle de 300 ms est conservée ; Tokio verrouillé en 1.54.1.

## Nettoyage et préservation

Conserver les patches vendor et leurs licences, guides de compilation, notes de version affichées par le produit, tests de raccourcis/audio et preuves de sécurité. Les anciens rapports Playwright locaux sont régénérables et ont été déplacés hors dépôt.

L'inventaire distingue fichiers suivis, non suivis, ignorés et worktrees. Les candidats
à suppression sont vérifiés par rôle et consommateurs ; aucune suppression massive
de tests, documentation, médias, dépendances, secrets ou données personnelles.
Les sauvegardes des fichiers retirés et les diffs initiaux sont hors des dépôts, dans
le dossier local `Documents/Codex/cleanup-2026-10-27/apps/Phonara`.
Une liste de fichiers ne constitue pas une revue comportementale de chaque ligne.

## Vérification et livraison

Commandes de référence : bun run lint ; bun run format:check ; bun run build. Pour un changement natif : cargo fmt/clippy/tests avec le lockfile et les prérequis BUILD.md. Les changements de traduction imposent bun run check:translations.

Vérifié le 27 octobre : bun run lint et bun run format:check réussis (Prettier et cargo fmt). Le changement est documentaire ; aucune nouvelle transcription ni manipulation de microphone. Les vérifications historiques restent datées et ne valent pas une nouvelle preuve de production, d'installation ou d'utilisation réelle.

## Corrections nécessaires à la livraison du récapitulatif

- La protection de main impose une PR et cinq contrôles. Les filtres de chemins des PR code-quality et nix-build empêchaient leur exécution sur une documentation seule ; ils sont retirés côté PR, sans changer les filtres push ni la protection.
- L'audit strict a détecté clipboard-win 5.4.1 retiré du registre. Cargo.lock passe uniquement cette crate à 5.4.3. L'audit depuis la racine réussit : zéro vulnérabilité et zéro avertissement non couvert par la politique existante ; aucune exception ajoutée.
- Le contrôle frontend a ensuite signalé Zod 4.5.4 vulnérable. La dépendance et les verrous Bun/Nix passent à 4.6.7 ; le fetchurl Nix reprend exactement l'intégrité du lock Bun. Aucun contrôle d'audit n'est réduit.
- La PR 18 porte la livraison et ses cinq checks restent à vérifier sur le dernier SHA avant fusion.

## Restant à traiter ou à confirmer

- La preuve GUI réelle de trois dictées, appui bref Ctrl+Espace, indicateur prêt et collage doit encore être confirmée par l'opérateur ; les tests de dispatcher ne remplacent pas cette preuve.
- Ne pas redémarrer le microphone, Phonara ou un service pour ce nettoyage.
- Les builds CI ordinaires de main produisent des artefacts ; la release signée/updater reste manuelle et n'est pas déclenchée.

## Reprendre sans perdre le contexte

Lire ce fichier puis les consignes AGENTS.md/CLAUDE.md, README et les documents de domaine
encore présents. Contrôler `git status`, `git branch -avv`, `git worktree list` et les
refs distantes actuelles avant de reprendre. Garder les sources, la CI, le déploiement,
le runtime chargé et la validation utilisateur comme preuves distinctes.
Aucun redémarrage/rechargement de service, activation de release ou changement de base
n'est autorisé par le seul nettoyage Git.
