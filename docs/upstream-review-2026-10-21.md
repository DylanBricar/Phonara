# Revue upstream Phonara - 21 octobre 2026

## Références et méthode

La comparaison part des références précédemment publiées dans le README :

| Dépôt                                               | Base précédente                            | Main revu                                  | Delta                            |
| --------------------------------------------------- | ------------------------------------------ | ------------------------------------------ | -------------------------------- |
| [cjpais/Handy](https://github.com/cjpais/Handy)     | `fbd4e15fa14a721c66c57006ae110428b9e255b3` | `93c9ee05efe294cf2a56bd534b77ea1079f21b77` | 61 commits, base ancêtre du head |
| [Melvynx/Parler](https://github.com/Melvynx/Parler) | `1aaa38b68bc4f8b4cb03d562345c0d726beb5ee1` | `1aaa38b68bc4f8b4cb03d562345c0d726beb5ee1` | 0 commit, comparaison identique  |

Les heads et PR ont été lus via l'API GitHub authentifiée et `gh`. Les deux
historiques ont été téléchargés avec `git fetch --no-tags` dans les références
locales `review-handy/main` et `review-parler/main`. Aucun script upstream n'a été
exécuté. La liste des commits ci-dessous est produite par
`git log --reverse fbd4e15f..review-handy/main`. L'inventaire des PR ouvertes est
exhaustif au moment de la revue : 103 pour Handy, 0 pour Parler.

Sources reproductibles : [comparaison Handy](https://github.com/cjpais/Handy/compare/fbd4e15fa14a721c66c57006ae110428b9e255b3...93c9ee05efe294cf2a56bd534b77ea1079f21b77),
[révision Parler inchangée](https://github.com/Melvynx/Parler/commit/1aaa38b68bc4f8b4cb03d562345c0d726beb5ee1),
[PR Handy ouvertes](https://github.com/cjpais/Handy/pulls?q=is%3Apr+is%3Aopen),
[PR Parler ouvertes](https://github.com/Melvynx/Parler/pulls?q=is%3Apr+is%3Aopen).

## Corrections retenues

- [#1918](https://github.com/cjpais/Handy/pull/1918) : un modèle supprimé hors de l'application perd son état téléchargé, les entrées découvertes disparaissent, les modèles du catalogue restent récupérables, et un chargement échoué émet son événement terminal. La suppression de fichiers déjà absents devient idempotente. Les modèles API et protections de téléchargements Phonara sont conservés.
- [#2082](https://github.com/cjpais/Handy/pull/2082) : la navigation entre sections remet le défilement en haut avant affichage.
- [#2156](https://github.com/cjpais/Handy/pull/2156) et [#2157](https://github.com/cjpais/Handy/pull/2157) : les noms Ha Long/Ha Noi sont préservés et la majuscule initiale reste correcte après suppression d'une hésitation en début de phrase, y compris avec des caractères accentués. Les listes personnalisées et le verrouillage par langue restent actifs.
- [#2158](https://github.com/cjpais/Handy/pull/2158) : la validation d'un raccourci utilise le vrai parseur Tauri pour rejeter les noms que le backend ne pourrait pas enregistrer.
- [#2190](https://github.com/cjpais/Handy/pull/2190) : les tâches d'enregistrement/désenregistrement du raccourci d'annulation appliquent le dernier état demandé, quel que soit leur ordre d'exécution. L'adaptation Phonara garde l'identité du backend et de la combinaison réellement enregistrés pour les retirer correctement après une modification de préférences.
- [#2238](https://github.com/cjpais/Handy/pull/2238) : cases et curseurs de réglages exposent leur nom aux lecteurs d'écran.
- [#2256](https://github.com/cjpais/Handy/pull/2256) : l'historique déduplique les pages chevauchantes et les événements live répétés par identifiant.
- PR encore ouvertes [#2255](https://github.com/cjpais/Handy/pull/2255) et [#2246](https://github.com/cjpais/Handy/pull/2246) : une suppression échouée de l'historique restaure la ligne et affiche l'erreur; Échap referme un menu et rend le focus à son bouton.
- Correction locale complémentaire : le store de réglages interprète un résultat Specta `status: error` comme un échec et annule la valeur optimiste sans écraser les autres réglages.

Les corrections coordonnées dans `actions.rs`, le presse-papiers et le gestionnaire
de microphones sont décrites par leur diff et leurs tests. Cette revue ne donne
pas à elle seule une preuve de capture sur un casque physique.

## Architecture adoptée et compatibilité

Le superviseur et son protocole sont repris de Handy au head
`93c9ee05efe294cf2a56bd534b77ea1079f21b77`, après leur introduction par
[#2208](https://github.com/cjpais/Handy/pull/2208). Le moteur C++ passe à
`transcribe-cpp = 0.4.0` ([#2265](https://github.com/cjpais/Handy/pull/2265)).
Le worker du même exécutable est lancé avant l'initialisation Tauri et du contrôle
d'instance unique. Le processus principal ne crée plus de Session C++ et
n'initialise plus les pilotes C++ pour lister les GPU.

L'adaptation hybride conserve les sept familles ONNX : Parakeet, Moonshine,
MoonshineStreaming, SenseVoice, GigaAM, Canary et Cohere, avec leurs réglages ORT
Auto/CPU/CUDA/DirectML/ROCm et leurs paramètres propres. MoonshineStreaming garde
son chemin batch existant. Le live C++ garde les événements, mesures et textes
Phonara; le batch garde les langues, la traduction, les mots personnalisés via
initial_prompt Whisper et les corrections de texte. Les délais sont gérés par le
superviseur selon le travail; l'ancienne attente globale de 30 secondes en fin de
stream est retirée. Une annulation conserve sa génération à travers les attentes
de chargement et remonte comme une erreur explicite, pour empêcher une reprise
batch qui ferait revivre une dictée annulée.

Le superviseur isole les crashs natifs, tue les travaux bloqués à leur échéance,
récolte le processus enfant et peut retenter le GPU sur CPU en sélection
automatique. Les marqueurs de faute debug permettent de tester crash, blocage et
récupération. Les appels natifs StreamBegin/StreamReset restent bornés à 30
secondes, sans interruption immédiate; le chargement n'est pas annulé à mi-appel.
Un `wait()` OS après demande de destruction du processus reste soumis au noyau.

Le catalogue externe de [#2299](https://github.com/cjpais/Handy/pull/2299) est
adapté au schéma Phonara : 73 modèles ASR au lieu de 69, sans suppression de dépôt
ni modification des 69 entrées précédentes. Parakeet Ultra, Orukeet et les deux
variantes Granite Speech 5.0 470M TurboCTC sont ajoutés. L'architecture
`granite5_ctc` est présente dans la bibliothèque native 0.4.0 et reconnue par la
sonde locale. Les 24 fichiers ajoutés ont une révision immuable, une taille et un
SHA256; les 24 fichiers ont été recoupés avec l'API Hugging Face au pin exact,
sans téléchargement des poids. Les scores reprennent les mesures
et les formules upstream, sans nouvelle mesure locale. Les six anciens chemins
`bundle/` multitalker et les six chemins racine gardent leur pin et leurs hashes.
Les trois packages non ASR (VAD/langid/diarisation) ne deviennent pas des modèles
de dictée. La licence non commerciale de la variante Granite NC est conservée.

| Package ajouté                                                                                                                                      | Révision HF vérifiée                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| [Parakeet Ultra](https://huggingface.co/handy-computer/parakeet-ultra-gguf/tree/39eeb55181f0d354fd934f06e92fd8d5037fed8e)                           | `39eeb55181f0d354fd934f06e92fd8d5037fed8e` |
| [Granite TurboCTC](https://huggingface.co/handy-computer/granite-speech-5.0-470m-turboctc-gguf/tree/2b0b44d0d6c8b94a2e4f04a2cf3ec6a5c054463b)       | `2b0b44d0d6c8b94a2e4f04a2cf3ec6a5c054463b` |
| [Granite TurboCTC NC](https://huggingface.co/handy-computer/granite-speech-5.0-470m-turboctc-nc-gguf/tree/fb8091e2c1e50ef67d3e795ee9f84d703343d7c5) | `fb8091e2c1e50ef67d3e795ee9f84d703343d7c5` |
| [Orukeet](https://huggingface.co/handy-computer/orukeet-gguf/tree/ab8536716c3aa03d49c4c36c0dae6a3da71210b8)                                         | `ab8536716c3aa03d49c4c36c0dae6a3da71210b8` |

## Autres changements structurants

- [#2188](https://github.com/cjpais/Handy/pull/2188) et [#1954](https://github.com/cjpais/Handy/pull/1954) : la capture et le callback sont traités dans le lot recorder coordonné, avec conservation des identités, des priorités, des canaux et du repli Phonara. Leur preuve d'exécution relève de la validation globale.
- [#2277](https://github.com/cjpais/Handy/pull/2277) et [#2279](https://github.com/cjpais/Handy/pull/2279) : la suppression des moteurs ONNX et la migration forcée GGUF ne sont pas reprises. L'adaptateur hybride permet de garder les modèles et caches existants avec le nouveau superviseur.
- [#2267](https://github.com/cjpais/Handy/pull/2267), [#2284](https://github.com/cjpais/Handy/pull/2284) et [#2282](https://github.com/cjpais/Handy/pull/2282) : le VAD C++ GGUF, l'API vocabulary et le découpage long audio restent différés. Les chemins Phonara de VAD, de correction de mots et de sélection de modèle long audio restent actifs.
- [#2116](https://github.com/cjpais/Handy/pull/2116) : récupération du cache HF historique d'anciens Handy portables. Phonara a sa propre identité et ses répertoires portables; aucune suppression de cache partagé n'est reprise sans tests des installations réelles concernées.
- [#2257](https://github.com/cjpais/Handy/pull/2257) : format Anthropic du fournisseur personnalisé. C'est une extension de protocole de post-traitement avec paramètres et UI propres, distincte du problème de microphone.

## PR ouvertes examinées en priorité

| PR                                                                                                                                                                                                                                                                 | Intérêt et décision                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#2255](https://github.com/cjpais/Handy/pull/2255)                                                                                                                                                                                                                 | Repris : rendre visibles les échecs de suppression d'historique.                                                                                                       |
| [#2246](https://github.com/cjpais/Handy/pull/2246)                                                                                                                                                                                                                 | Repris : fermer les menus avec Échap et restaurer le focus.                                                                                                            |
| [#2108](https://github.com/cjpais/Handy/pull/2108)                                                                                                                                                                                                                 | Déjà couvert par `initInFlight` dans settingsStore.ts; aucune seconde réécriture.                                                                                      |
| [#2290](https://github.com/cjpais/Handy/pull/2290)                                                                                                                                                                                                                 | Repris dans le lot coordonné actions.rs : conserver la dictée lorsque le post-traitement renvoie du vide.                                                              |
| [#2155](https://github.com/cjpais/Handy/pull/2155)                                                                                                                                                                                                                 | Repris : timeout connexion/requête dans la couche HTTP Phonara, sans copier le Cargo.toml externe.                                                                     |
| [#2302](https://github.com/cjpais/Handy/pull/2302)                                                                                                                                                                                                                 | À planifier : déplacer les attentes de collage hors du thread principal; nécessite séparation des appels OS et validation du focus.                                    |
| [#2110](https://github.com/cjpais/Handy/pull/2110)                                                                                                                                                                                                                 | Déjà couvert : un échec du micro always-on au démarrage est journalisé sans empêcher la création du gestionnaire.                                                      |
| [#1875](https://github.com/cjpais/Handy/pull/1875)                                                                                                                                                                                                                 | Déjà partiellement couvert par le moniteur Phonara et les priorités; ne pas remplacer cette logique par un ancien patch de noms.                                       |
| [#1713](https://github.com/cjpais/Handy/pull/1713), [#2148](https://github.com/cjpais/Handy/pull/2148)                                                                                                                                                             | Revue des attentes WASAPI/feedback pertinentes; les protections Phonara existantes et les modifications recorder ultérieures rendent un cherry-pick intégral inadapté. |
| [#1976](https://github.com/cjpais/Handy/pull/1976)                                                                                                                                                                                                                 | Pertinent : refléter en frontend la purge de rétention. Concerne le lot history.rs coordonné.                                                                          |
| [#2254](https://github.com/cjpais/Handy/pull/2254), [#2253](https://github.com/cjpais/Handy/pull/2253), [#2251](https://github.com/cjpais/Handy/pull/2251), [#2247](https://github.com/cjpais/Handy/pull/2247), [#2248](https://github.com/cjpais/Handy/pull/2248) | Petites améliorations d'accessibilité, seeking et IME utiles pour une passe UI complémentaire; inventoriées sans déclaration d'intégration.                            |
| [#2211](https://github.com/cjpais/Handy/pull/2211), [#2298](https://github.com/cjpais/Handy/pull/2298)                                                                                                                                                             | GPU recovery et nouveau live decode : dépendent du superviseur et du nouveau pipeline; PR #2211 encore draft.                                                          |
| [#2300](https://github.com/cjpais/Handy/pull/2300)                                                                                                                                                                                                                 | Routage OpenRouter des sorties structurées; à tester séparément avec un fournisseur réel, sans consommer de quota pendant cet audit.                                   |

## Vérification

Vérifications locales avant la migration native : TypeScript, build Vite et
Prettier ciblé réussis; dix tests Bun du helper de persistance réussis, avec
97,44 % des lignes et 100 % des fonctions du helper couverts. Le run qualité frontend
coordonné a validé les 70 tests Bun et 23 parcours Playwright, avec 99,18 % des
lignes et 100 % des fonctions globalement couverts. Les correctifs ciblés de Vite
8.2.4, brace-expansion 1.1.21 et source-map-js 1.2.2 donnent zéro vulnérabilité
dans `bun audit`.

Pour le superviseur, quatre tests isolés exécutant le framing Rust de production
ont validé ordre/round-trip, limites de taille, EOF tronqué et PCM invalide. Les
tests Rust ajoutés couvrent aussi l'annulation avant chargement, les pins du
catalogue et les chemins de cache multitalker. La compilation native 0.4.0 et
l'installateur local 0.9.6 réussissent ; 370 tests Rust ordinaires, Clippy et les
17 scénarios réels du superviseur sont validés. La capture Corsair et la
transcription française fonctionnent avec l'exécutable Release. Les preuves et
limites figurent dans le [rapport de validation](verification-2026-10-21.md).
Les métadonnées HF prouvent les
pins et artefacts déclarés; elles ne prouvent pas que les quatre nouveaux modèles
ont été exécutés sur ce PC.

Les tests UI ajoutés utilisent le frontend réel et un backend Tauri simulé. Ils
vérifient les événements et résultats visibles; ils ne constituent pas une preuve
de capture audio physique. Les tests Rust des règles de texte, de sélection des
modèles et de réconciliation des raccourcis sont inclus dans la validation globale
coordonnée. Le build et le remplacement de l'installation sont contrôlés par le
coordinateur, séparément de l'inventaire upstream.

La table suivante distingue les corrections déjà présentes, les reprises de cette
passe, les évolutions différées et les changements de documentation/marque qui
ne s'appliquent pas tels quels à Phonara. Une mention « Revu, différé » signifie
que le changement n'est pas intégré.

## Inventaire complet des 61 commits Handy

| Commit                                                                                     | Sujet upstream                                                                             | Décision                                                                                                |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| [bc7face](https://github.com/cjpais/Handy/commit/bc7facea3a777869182203cfcf5c90f7a98efd99) | 5000ms paste delay                                                                         | Revu, différé : délai de collage maximal; réglage Phonara existant conservé.                            |
| [330b2dd](https://github.com/cjpais/Handy/commit/330b2ddbed3daab8f1fb09385cc1aaf73708e9d7) | fix: scrollbars styling on macOS when using a non-Apple mouse (#2048)                      | Revu, différé : scrollbar macOS; validation WKWebView non disponible ici.                               |
| [988521f](https://github.com/cjpais/Handy/commit/988521f873e5296e4e07b05caa4fc962fe981976) | add debug ui (#2052)                                                                       | Revu, différé : preview onboarding/debug liée aux écrans Handy.                                         |
| [1cd9266](https://github.com/cjpais/Handy/commit/1cd92662805790da9c81639724c3eee5945211bc) | fix: horizontal overflow in onboarding views (#2050)                                       | Revu, différé : onboarding macOS; pas de réécriture des écrans Phonara.                                 |
| [e29520d](https://github.com/cjpais/Handy/commit/e29520d623e2dea86ef1b13d452eea5440ddfe7d) | fix overlay with text scaling on windows (#2059)                                           | Revu, différé : overlay Windows remplacé par le composant compact Phonara; test DPI dédié requis.       |
| [d54c88e](https://github.com/cjpais/Handy/commit/d54c88eb35abab47cdf1d0e2e82add346cc2a9b9) | make microphone callback real-time safe (#1954)                                            | Adapté dans le lot capture coordonné : callback temps réel et transfert borné.                          |
| [42afd1b](https://github.com/cjpais/Handy/commit/42afd1bf2c82722a6743c1c77fd4acfda8a65979) | docs: help users troubleshoot stale clipboard pastes (#2058)                               | Documentation upstream : instructions de collage à adapter à la marque Phonara.                         |
| [e4ae0d4](https://github.com/cjpais/Handy/commit/e4ae0d44b4de21b981e0c8e478d0c93a2ffd3420) | fix: recover gracefully when model files are deleted outside Handy (#1918)                 | Repris et adapté : cohérence des modèles absents et événement loading_failed.                           |
| [2c5c760](https://github.com/cjpais/Handy/commit/2c5c7601d8db493feeb251702e950f11c8326728) | VK_LOADER_LAYERS_DISABLE=~~implcit~~ default on windows (#2053)                            | Revu, différé : politique globale des couches Vulkan, test GPU requis.                                  |
| [ed1bfb9](https://github.com/cjpais/Handy/commit/ed1bfb9bbc51742af4f0917356986ba12f29ad1c) | feat: make Handy available in Catalan (#2065)                                              | Revu, différé : nouvelle locale catalane; synchronisation complète des clés Phonara nécessaire.         |
| [14cfed8](https://github.com/cjpais/Handy/commit/14cfed8aca5d557e0d14f596846bc5bd3fc4b50f) | fix win ci                                                                                 | CI Handy : configuration propre au packaging upstream, non copiée.                                      |
| [2bdf9ac](https://github.com/cjpais/Handy/commit/2bdf9ac05724fd6fa22f28dabb664c54a43fae3c) | feat: add Indonesian translation (#2073)                                                   | Revu, différé : nouvelle locale indonésienne; synchronisation des clés Phonara nécessaire.              |
| [bf8756c](https://github.com/cjpais/Handy/commit/bf8756c3a88a59c964259b929d6cd99f2059a115) | fix: disable WebView2 browser accelerator keys in the main window (#2060)                  | Revu, différé : raccourcis WebView2; valider les raccourcis UI Phonara avant de désactiver globalement. |
| [db1aaac](https://github.com/cjpais/Handy/commit/db1aaac7aaf5cd397da3fed55389d1b7fcec032e) | bump to transcribe-cpp-0.2.3 (#2005)                                                       | Repris via transcribe-cpp 0.4.0 et adaptateur supervisé Phonara.                                        |
| [ba10ce1](https://github.com/cjpais/Handy/commit/ba10ce1943ef34e93c09494027fc0b9ced2e8a44) | note for fedora/ubuntu install                                                             | Documentation distributions Linux : non transposée au README custom.                                    |
| [53c55d7](https://github.com/cjpais/Handy/commit/53c55d706514443580ca25327b256b303ab22ea7) | slim readme                                                                                | README/marque Handy : non applicable tel quel au fork.                                                  |
| [53766a2](https://github.com/cjpais/Handy/commit/53766a27922985f2a4d858f3615dff99dbc9b7d8) | Update README.md                                                                           | README/marque Handy : non applicable tel quel au fork.                                                  |
| [055c7a5](https://github.com/cjpais/Handy/commit/055c7a5eb87305ff6e8348aa164de6c6745a3b50) | Update README.md                                                                           | README/marque Handy : non applicable tel quel au fork.                                                  |
| [6917511](https://github.com/cjpais/Handy/commit/691751149328fd13365f83e60e69df28c535f543) | add canty sponsor                                                                          | Sponsor Handy : non applicable au fork.                                                                 |
| [05e0aed](https://github.com/cjpais/Handy/commit/05e0aedd2906f0d82722735f930465950c476b90) | release 0.9.7                                                                              | Version de release Handy 0.9.7 : numérotation Phonara indépendante.                                     |
| [dc5bdc9](https://github.com/cjpais/Handy/commit/dc5bdc9d098649a389f07327f77c20e9a896768b) | fix: unload model after recordings with no audio (#2106)                                   | Revu, différé : déchargement sur sorties sans audio; FinishGuard Phonara reste distinct.                |
| [7c31572](https://github.com/cjpais/Handy/commit/7c31572d1973415a7115ff28226198a1d752cebe) | fix: reset settings scroll position when switching sections (#2082)                        | Repris : navigation réinitialise le scroll des réglages.                                                |
| [a6eed75](https://github.com/cjpais/Handy/commit/a6eed7541f7206373a93768a43d6d894c947f4c3) | fix(shortcut): reject unknown reset binding IDs (#2033)                                    | Déjà couvert : reset_binding renvoie une erreur pour un identifiant inconnu.                            |
| [496a80c](https://github.com/cjpais/Handy/commit/496a80cc151c8cfba3130c29ce2082f8f10f4f57) | fix(history): show copy success only after clipboard write (#2011)                         | Déjà couvert : clipboard.ts et indicateur de copie attendent le résultat.                               |
| [141f981](https://github.com/cjpais/Handy/commit/141f981d4ddae9f16194e3021aa06b61d86e9735) | fix: emit parseable names for compound shortcut keys (#1862)                               | Déjà couvert : normalisation des noms de touches et tests keyboard.                                     |
| [8f9cf53](https://github.com/cjpais/Handy/commit/8f9cf53cd1410cda26beea39ff802ac306e39585) | docs: restore the recording indicator on Omarchy with native Wayland (#2040)               | Documentation Omarchy/Wayland : non reprise dans cette passe Windows.                                   |
| [8ef8dd4](https://github.com/cjpais/Handy/commit/8ef8dd4347c08ba20936dda1024172fe2e4cb90a) | fix: stop removing "Ha" as an English filler word (#2156)                                  | Repris : Ha reste un mot normal dans le profil anglais.                                                 |
| [2d526b1](https://github.com/cjpais/Handy/commit/2d526b157953ddf9a5bb34194786cea69569b6a1) | bump to transcribe-cpp-0.2.4 (#2147)                                                       | Repris via transcribe-cpp 0.4.0 et adaptateur supervisé Phonara.                                        |
| [eb49dc0](https://github.com/cjpais/Handy/commit/eb49dc02acfe94fe3b03e3b83316c1f1bbee920b) | fix: keep the sentence capital after removing a leading filler (#2157)                     | Repris : majuscule conservée après suppression de filler initial.                                       |
| [eea1f5f](https://github.com/cjpais/Handy/commit/eea1f5f42ca049b7d8092f8933526defc2e14482) | fix: don't start recording when no model can transcribe it (#2161)                         | Revue et adaptation dans le lot coordonné actions.rs : garde modèle et erreur localisée no_model.       |
| [f5c27e6](https://github.com/cjpais/Handy/commit/f5c27e69f4d446c5d5f8b3a94ed9fd56573739e2) | fix: reject shortcuts the Tauri backend cannot parse (#2158)                               | Repris : parseur Tauri effectif dans la validation des raccourcis.                                      |
| [29bd2c0](https://github.com/cjpais/Handy/commit/29bd2c0d6b4b705df5fd6d2f387e5db5ecc27480) | fix: list compute devices off the startup path (#2160)                                     | Repris via superviseur : énumération C++ hors processus et hors initialisation parent.                  |
| [340defb](https://github.com/cjpais/Handy/commit/340defbc631fa00005628e36d154a8e96b6fe1bb) | Update PULL_REQUEST_TEMPLATE.md                                                            | Template de contribution Handy : non applicable tel quel.                                               |
| [5ec58f6](https://github.com/cjpais/Handy/commit/5ec58f696354fcf64ae831102e673779e0249717) | Update PULL_REQUEST_TEMPLATE.md                                                            | Template de contribution Handy : non applicable tel quel.                                               |
| [0bb0428](https://github.com/cjpais/Handy/commit/0bb0428ea6e9a40aea3c05a754134105a1821d3f) | add chinese script selector + simplify internals (#2186)                                   | Revu, différé : selector chinois séparé; Phonara possède déjà ses intentions zh-Hans/zh-Hant.           |
| [b38987a](https://github.com/cjpais/Handy/commit/b38987a9075e62baafef11263cf8b7448dc38b51) | fix: keep the cancel shortcut from staying registered after a short recording (#2190)      | Repris et adapté : réconciliation du dernier état cancel et identité du backend enregistré.             |
| [14f6f0d](https://github.com/cjpais/Handy/commit/14f6f0d31cb22a4268acfbddba3052820fd0a06e) | release v0.9.8                                                                             | Version de release Handy 0.9.8 : numérotation Phonara indépendante.                                     |
| [8605699](https://github.com/cjpais/Handy/commit/8605699d988ef87e7717cee28fff25c0546bb564) | Add installer icon to NSIS configuration (#2117)                                           | Revu, différé : icône installateur Handy; préserver branding et packaging Phonara.                      |
| [345caa8](https://github.com/cjpais/Handy/commit/345caa8f3e42963c270aff9294091f3436306dbf) | fix: refresh custom sounds when opening sound selector (#1941)                             | Déjà couvert : SoundPicker rafraîchit les sons au montage et à ouverture.                               |
| [ffbc950](https://github.com/cjpais/Handy/commit/ffbc9504cbf004ce4819d2ca872fcea92be0fddf) | transcribe 0.3.0 (#2203)                                                                   | Repris via transcribe-cpp 0.4.0 et adaptateur supervisé Phonara.                                        |
| [73ab851](https://github.com/cjpais/Handy/commit/73ab851c2b6242283759a4c101b60f0ece132f08) | Docs/ubuntu 26 04 gnome wayland troubleshooting (#2206)                                    | Documentation Ubuntu/Wayland upstream : non reprise dans cette passe Windows.                           |
| [586a838](https://github.com/cjpais/Handy/commit/586a838cec1b4e89f4654b2c6c399513abaa9c3c) | docs: add overlay, wl-clipboard and non-QWERTY paste notes to the Ubuntu notes (#2212)     | Documentation Ubuntu/Wayland upstream : non reprise dans cette passe Windows.                           |
| [a94b403](https://github.com/cjpais/Handy/commit/a94b403e0610049fafa54b0a4077db2945084dd8) | fix(portable): retain access to legacy model cache (#2116)                                 | Revu, différé : ancien cache HF Handy portable; risques de cache partagé et identité différente.        |
| [c8262ab](https://github.com/cjpais/Handy/commit/c8262ab3ebe56da7f7c4021a6d447d3c42e73176) | isolate transcribe.cpp backend in own worker (#2208)                                       | Repris et adapté : worker supervisé, IPC, annulation par génération; ONNX conservé.                     |
| [20a6685](https://github.com/cjpais/Handy/commit/20a6685e85c061c56386c98065995a5527513011) | fix: show that the model is loading instead of a stuck "Transcribing..." (#2227)           | Revu, différé : états de chargement liés au nouveau superviseur/live.                                   |
| [417dc6a](https://github.com/cjpais/Handy/commit/417dc6ac26ace7ce8eec99e41fa2dbbc36e5c2a0) | fix: show model loading in the Live preview when the load is slow                          | Revu, différé : états de chargement liés au nouveau superviseur/live.                                   |
| [afe5a63](https://github.com/cjpais/Handy/commit/afe5a6310534ffb178794365f31abb8b9fd435a7) | chore: format Ubuntu troubleshooting notes so the prettier check passes                    | Formatage documentation Linux upstream uniquement.                                                      |
| [f6b3f82](https://github.com/cjpais/Handy/commit/f6b3f8297061acaa763a48c4cdefbbf342c814ac) | docs: keep translation contribution guidance aligned with supported locales (#2235)        | Documentation contribution locales Handy : liste et workflow Phonara différents.                        |
| [48a3d8e](https://github.com/cjpais/Handy/commit/48a3d8e9ee456c1c6a3b7223779271c457890b4d) | fix(linux): allow renderer opt-out without dropping crash protection (#2249)               | Revu, différé : opt-out renderer Linux; test Linux WebKit requis.                                       |
| [1b011a1](https://github.com/cjpais/Handy/commit/1b011a19a990384271c39bfa13a3b367b6bd8926) | transcribe 0.4.0 (#2265)                                                                   | Repris : transcribe-cpp 0.4.0 avec worker supervisé et adaptateur ONNX conservé.                        |
| [a42131d](https://github.com/cjpais/Handy/commit/a42131d24c59315fede06775cd354219c4f4a87b) | move to handy-recorder (#2188)                                                             | Adapté dans le lot capture coordonné; priorités et reconnexion Phonara conservées.                      |
| [3985508](https://github.com/cjpais/Handy/commit/3985508ae7cf4dabfba4e65f73666364b331d586) | transcribe.cpp vad (#2267)                                                                 | Revu, différé : VAD transcribe.cpp GGUF avec nouveau moteur.                                            |
| [7b2a28a](https://github.com/cjpais/Handy/commit/7b2a28a30aa24174292ddd7f4e92e12e6e3bd501) | fix: don't re-emit hangover frames in VAD pre-roll                                         | Revu, différé : dépend du nouveau VAD; pipeline Phonara inchangé.                                       |
| [14ae9c6](https://github.com/cjpais/Handy/commit/14ae9c6b42d729371c443c8617ad02c89c4c8061) | feat: support Anthropic Messages API format in the Custom post-processing provider (#2257) | Revu, différé : fournisseur custom Anthropic Messages API, protocole/UI supplémentaires.                |
| [5732406](https://github.com/cjpais/Handy/commit/57324065d327a2e096a38cbfa7e0e99405af36cc) | fix: avoid duplicate history rows during live updates (#2256)                              | Repris : déduplication historique pages et live.                                                        |
| [53db4cb](https://github.com/cjpais/Handy/commit/53db4cb676bcb7831b94d95c716a67ddaaa2731a) | fix: expose setting names to screen readers (#2238)                                        | Repris : noms accessibles cases et curseurs de réglages.                                                |
| [cfcb650](https://github.com/cjpais/Handy/commit/cfcb650758899d96392ab6248cb2c1c03e50aa93) | add ui to migrate onnx model users to gguf (#2277)                                         | Revu, différé : migration ONNX vers GGUF; préserver modèles installés Phonara.                          |
| [5197faf](https://github.com/cjpais/Handy/commit/5197faf0e6fe9c268ed9539ebdc0fcf4ddd6434f) | actually remove onnx (#2279)                                                               | Non repris : suppression ONNX incompatible avec modèles Phonara conservés.                              |
| [4150a4a](https://github.com/cjpais/Handy/commit/4150a4a8d4e1220e943072e21d94951e6fa29e6b) | feat: pass custom words via transcribe-cpp vocabulary API (#2284)                          | Revu, différé : nouvelle API vocabulary du moteur.                                                      |
| [9e57a0d](https://github.com/cjpais/Handy/commit/9e57a0d7929fcc6417ea0d6e54c1b57f62635edd) | long form chunking with vad (#2282)                                                        | Revu, différé : chunking long audio du nouveau VAD/moteur.                                              |
| [93c9ee0](https://github.com/cjpais/Handy/commit/93c9ee05efe294cf2a56bd534b77ea1079f21b77) | catalog from @handy-computer/models package (#2299)                                        | Adapté : 4 ASR ajoutés avec pins/hashes; anciennes entrées et identifiants conservés.                   |

## Inventaire complet des PR Handy ouvertes

Cet inventaire conserve les pistes sans considérer une PR ouverte comme fusionnée ou validée. Les PR hors shortlist ont été inventoriées par métadonnées; leurs patchs ne sont pas tous analysés en détail.

| PR                                                 | Titre                                                                                                                               | Draft | Dernière mise à jour UTC |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------ |
| [#2304](https://github.com/cjpais/Handy/pull/2304) | docs: update README for current models and link to the online documentation                                                         | non   | 2026-10-20T12:35:22Z     |
| [#2303](https://github.com/cjpais/Handy/pull/2303) | new onboarding                                                                                                                      | non   | 2026-10-20T19:58:43Z     |
| [#2302](https://github.com/cjpais/Handy/pull/2302) | fix: stop blocking the main thread during paste                                                                                     | non   | 2026-10-20T12:10:56Z     |
| [#2300](https://github.com/cjpais/Handy/pull/2300) | fix: require parameter support for OpenRouter structured output                                                                     | non   | 2026-10-20T08:52:06Z     |
| [#2298](https://github.com/cjpais/Handy/pull/2298) | fix: retry empty live decode in batch, warn on silent input                                                                         | non   | 2026-10-18T16:12:09Z     |
| [#2293](https://github.com/cjpais/Handy/pull/2293) | fix(linux): respect the selected tool for clipboard paste shortcuts                                                                 | non   | 2026-10-16T16:34:27Z     |
| [#2290](https://github.com/cjpais/Handy/pull/2290) | fix: preserve dictation when post-processing returns blank text                                                                     | non   | 2026-10-16T08:10:26Z     |
| [#2283](https://github.com/cjpais/Handy/pull/2283) | feat: follow keyboard layout for transcription language                                                                             | non   | 2026-10-15T06:06:28Z     |
| [#2255](https://github.com/cjpais/Handy/pull/2255) | fix: report failed history deletions to users                                                                                       | non   | 2026-10-09T18:34:15Z     |
| [#2254](https://github.com/cjpais/Handy/pull/2254) | fix: name the audio playback position control                                                                                       | non   | 2026-10-15T08:02:23Z     |
| [#2253](https://github.com/cjpais/Handy/pull/2253) | fix: identify the setting each reset button affects                                                                                 | non   | 2026-10-19T15:09:08Z     |
| [#2251](https://github.com/cjpais/Handy/pull/2251) | fix: dismiss focused setting tooltips with Escape                                                                                   | non   | 2026-10-09T14:53:27Z     |
| [#2248](https://github.com/cjpais/Handy/pull/2248) | fix: ignore IME confirmation Enter in text inputs                                                                                   | non   | 2026-10-09T14:53:21Z     |
| [#2247](https://github.com/cjpais/Handy/pull/2247) | fix: preserve playback position when starting a seek                                                                                | non   | 2026-10-09T03:20:56Z     |
| [#2246](https://github.com/cjpais/Handy/pull/2246) | fix: let Escape dismiss dropdown menus                                                                                              | non   | 2026-10-09T02:48:29Z     |
| [#2240](https://github.com/cjpais/Handy/pull/2240) | fix: pass Windows shortcuts through to focused apps                                                                                 | non   | 2026-10-08T13:01:47Z     |
| [#2234](https://github.com/cjpais/Handy/pull/2234) | fix: moved re-transcribe button next to copy button in history tab                                                                  | non   | 2026-10-07T21:57:18Z     |
| [#2211](https://github.com/cjpais/Handy/pull/2211) | fix: recover transcription after GPU device loss                                                                                    | oui   | 2026-10-20T15:28:30Z     |
| [#2199](https://github.com/cjpais/Handy/pull/2199) | fix(linux): type multi-line text correctly with dotool                                                                              | non   | 2026-10-07T08:35:04Z     |
| [#2195](https://github.com/cjpais/Handy/pull/2195) | fix: Keep cancelled recordings in history                                                                                           | non   | 2026-10-07T08:35:04Z     |
| [#2180](https://github.com/cjpais/Handy/pull/2180) | fix(llm): trust custom CA bundles from HANDY_CA_BUNDLE / SSL_CERT_FILE                                                              | non   | 2026-10-13T05:12:59Z     |
| [#2168](https://github.com/cjpais/Handy/pull/2168) | fix: add option to mute immediately so background audio isn't recorded                                                              | non   | 2026-10-18T16:21:54Z     |
| [#2163](https://github.com/cjpais/Handy/pull/2163) | fix(macOS): keep hidden tray apps out of the Dock                                                                                   | non   | 2026-10-07T08:35:04Z     |
| [#2159](https://github.com/cjpais/Handy/pull/2159) | fix: apply the autostart setting off the startup thread                                                                             | non   | 2026-10-13T18:22:32Z     |
| [#2155](https://github.com/cjpais/Handy/pull/2155) | fix: time out post-processing requests that never answer                                                                            | non   | 2026-10-13T22:19:23Z     |
| [#2150](https://github.com/cjpais/Handy/pull/2150) | fix: warn when captured audio is digital silence                                                                                    | non   | 2026-10-07T08:35:04Z     |
| [#2148](https://github.com/cjpais/Handy/pull/2148) | fix(linux): bound feedback sound playback so a wedged output device cannot lock the mic/sink                                        | non   | 2026-10-13T21:25:57Z     |
| [#2130](https://github.com/cjpais/Handy/pull/2130) | fix: Numpad digit and operator keys in Tauri shortcuts                                                                              | non   | 2026-10-07T08:35:04Z     |
| [#2122](https://github.com/cjpais/Handy/pull/2122) | feat(history): search past transcriptions and highlight matches                                                                     | non   | 2026-10-07T08:35:04Z     |
| [#2120](https://github.com/cjpais/Handy/pull/2120) | fix: open dropdown menus upward when they would be clipped                                                                          | non   | 2026-10-07T08:35:04Z     |
| [#2119](https://github.com/cjpais/Handy/pull/2119) | fix: even out toggle switch knob inset and hide focus ring on click                                                                 | non   | 2026-10-07T08:35:04Z     |
| [#2110](https://github.com/cjpais/Handy/pull/2110) | fix(audio): don't abort startup when the always-on microphone can't open                                                            | non   | 2026-10-07T08:35:04Z     |
| [#2109](https://github.com/cjpais/Handy/pull/2109) | fix: make Shift+Insert paste work in X11                                                                                            | non   | 2026-10-07T08:35:05Z     |
| [#2108](https://github.com/cjpais/Handy/pull/2108) | fix: register settings store backend listeners only once                                                                            | non   | 2026-10-07T08:35:04Z     |
| [#2102](https://github.com/cjpais/Handy/pull/2102) | fix: stage a CBLAS-capable libblas.so.3 for transcribe-cpp                                                                          | non   | 2026-10-07T08:35:04Z     |
| [#2099](https://github.com/cjpais/Handy/pull/2099) | fix: use Double Metaphone for custom word matching                                                                                  | non   | 2026-10-07T08:35:04Z     |
| [#2097](https://github.com/cjpais/Handy/pull/2097) | fix(shortcut): classify tap vs hold by key event time, not dequeue time                                                             | non   | 2026-10-08T06:41:32Z     |
| [#2078](https://github.com/cjpais/Handy/pull/2078) | feat: add Orukeet as an optional local model                                                                                        | non   | 2026-10-07T08:35:04Z     |
| [#2057](https://github.com/cjpais/Handy/pull/2057) | fix: clear stale macOS accessibility permissions during onboarding                                                                  | non   | 2026-10-07T08:35:04Z     |
| [#2046](https://github.com/cjpais/Handy/pull/2046) | fix(macos): stop recording on AirPods press-to-mute gesture                                                                         | non   | 2026-10-07T08:35:04Z     |
| [#2031](https://github.com/cjpais/Handy/pull/2031) | Integrated multi-protocol fake keyboard support for Linux                                                                           | non   | 2026-10-07T08:35:04Z     |
| [#2025](https://github.com/cjpais/Handy/pull/2025) | docs(linux): document Ubuntu GNOME ydotool setup                                                                                    | non   | 2026-10-07T08:35:04Z     |
| [#2023](https://github.com/cjpais/Handy/pull/2023) | Check default output device first to avoid enumeration delay before feedback beep                                                   | non   | 2026-10-07T08:35:04Z     |
| [#2022](https://github.com/cjpais/Handy/pull/2022) | Quit on window close when --no-tray is set instead of hiding the window                                                             | non   | 2026-10-07T08:35:04Z     |
| [#2021](https://github.com/cjpais/Handy/pull/2021) | Restrict asset protocol scope to recordings directory                                                                               | non   | 2026-10-07T08:35:04Z     |
| [#1991](https://github.com/cjpais/Handy/pull/1991) | fix(macos): prevent silent AirPods recordings when also playing audio from iPhone                                                   | non   | 2026-10-07T08:35:04Z     |
| [#1976](https://github.com/cjpais/Handy/pull/1976) | fix(history): remove stale recordings from frontend after retention cleanup                                                         | non   | 2026-10-20T00:01:15Z     |
| [#1942](https://github.com/cjpais/Handy/pull/1942) | docs: add app screenshots to the README                                                                                             | non   | 2026-10-07T08:35:04Z     |
| [#1931](https://github.com/cjpais/Handy/pull/1931) | fix(ui): close settings window via Ctrl+W and sidebar button on decoration-less WMs (#1914)                                         | non   | 2026-10-07T08:35:04Z     |
| [#1929](https://github.com/cjpais/Handy/pull/1929) | feat: add configurable Chinese conversion                                                                                           | oui   | 2026-10-07T08:35:04Z     |
| [#1928](https://github.com/cjpais/Handy/pull/1928) | feat(nix): auto-enable Handy Cachix binary cache for users                                                                          | non   | 2026-10-18T02:17:57Z     |
| [#1909](https://github.com/cjpais/Handy/pull/1909) | fix(overlay): stale pixels and show/hide races on Wayland layer shell                                                               | non   | 2026-10-19T10:43:16Z     |
| [#1906](https://github.com/cjpais/Handy/pull/1906) | add ipc server                                                                                                                      | non   | 2026-10-07T08:35:04Z     |
| [#1903](https://github.com/cjpais/Handy/pull/1903) | fix: warn when captured audio is silent                                                                                             | non   | 2026-10-07T08:35:04Z     |
| [#1875](https://github.com/cjpais/Handy/pull/1875) | fix: follow changed default microphone                                                                                              | non   | 2026-10-07T08:35:04Z     |
| [#1843](https://github.com/cjpais/Handy/pull/1843) | feat: add structured remote control commands                                                                                        | oui   | 2026-10-07T08:35:04Z     |
| [#1836](https://github.com/cjpais/Handy/pull/1836) | feat(history): prune entries with missing audio and card-based histor…                                                              | non   | 2026-10-07T08:35:04Z     |
| [#1781](https://github.com/cjpais/Handy/pull/1781) | feat: add support lmstudio api                                                                                                      | non   | 2026-10-07T08:35:04Z     |
| [#1774](https://github.com/cjpais/Handy/pull/1774) | feat(audio): native PipeWire capture backend on Linux                                                                               | non   | 2026-10-07T08:35:04Z     |
| [#1768](https://github.com/cjpais/Handy/pull/1768) | fix(windows): keep temporary pastes out of clipboard history                                                                        | non   | 2026-10-07T08:35:04Z     |
| [#1767](https://github.com/cjpais/Handy/pull/1767) | fix: let Fn chords pass through during dictation                                                                                    | oui   | 2026-10-07T08:35:04Z     |
| [#1748](https://github.com/cjpais/Handy/pull/1748) | Add in app bug report                                                                                                               | oui   | 2026-10-19T23:57:27Z     |
| [#1739](https://github.com/cjpais/Handy/pull/1739) | fix: refresh macOS cursor monitor after display changes                                                                             | oui   | 2026-10-07T08:35:04Z     |
| [#1722](https://github.com/cjpais/Handy/pull/1722) | fix(linux): X11 keymap resets silently drop characters in Direct paste (stale enigo keycode bindings)                               | non   | 2026-10-07T08:35:04Z     |
| [#1719](https://github.com/cjpais/Handy/pull/1719) | chore: add Arch PKGBUILD for Handy release packaging                                                                                | non   | 2026-10-07T08:35:06Z     |
| [#1713](https://github.com/cjpais/Handy/pull/1713) | fix: transcription pipeline hangs forever with audio_feedback enabled (WASAPI stall + unbounded recorder waits)                     | non   | 2026-10-07T08:35:05Z     |
| [#1711](https://github.com/cjpais/Handy/pull/1711) | feat: add ${custom_words} placeholder to post-processing prompts                                                                    | non   | 2026-10-07T08:35:05Z     |
| [#1680](https://github.com/cjpais/Handy/pull/1680) | feat: add Apple Speech (SpeechAnalyzer) model on macOS 26+                                                                          | non   | 2026-10-07T08:35:05Z     |
| [#1633](https://github.com/cjpais/Handy/pull/1633) | Use configurable transcribe.cpp output budget                                                                                       | non   | 2026-10-07T08:35:05Z     |
| [#1610](https://github.com/cjpais/Handy/pull/1610) | feat: support ${selected} placeholder in post-processing prompts                                                                    | non   | 2026-10-07T08:35:05Z     |
| [#1568](https://github.com/cjpais/Handy/pull/1568) | fix: support global shortcuts and paste on GNOME/Wayland (Ubuntu 26.04)                                                             | non   | 2026-10-07T08:35:05Z     |
| [#1560](https://github.com/cjpais/Handy/pull/1560) | Linux Wayland Adaptation: text insertion, hotkeys, and Flathub The further changes are compiled together for Obtain stable version. | non   | 2026-10-07T08:35:05Z     |
| [#1547](https://github.com/cjpais/Handy/pull/1547) | feat: double-tap activation for transcribe shortcut                                                                                 | non   | 2026-10-07T08:35:05Z     |
| [#1533](https://github.com/cjpais/Handy/pull/1533) | feat: add deterministic Word Replacements (exact find & replace) for transcripts                                                    | non   | 2026-10-07T08:35:05Z     |
| [#1505](https://github.com/cjpais/Handy/pull/1505) | fix(linux): improve GNOME Wayland overlay behavior                                                                                  | oui   | 2026-10-07T08:35:05Z     |
| [#1503](https://github.com/cjpais/Handy/pull/1503) | feat: 'Volume While Recording' slider — duck audio instead of hard-muting (works on USB interfaces)                                 | non   | 2026-10-07T08:35:05Z     |
| [#1501](https://github.com/cjpais/Handy/pull/1501) | fix: stop 'Mute While Recording' from stranding system audio muted                                                                  | non   | 2026-10-07T08:35:05Z     |
| [#1478](https://github.com/cjpais/Handy/pull/1478) | fix: detect Hyperkey/Karabiner modifiers via event flags                                                                            | non   | 2026-10-07T08:35:05Z     |
| [#1469](https://github.com/cjpais/Handy/pull/1469) | feat: hands-free always-on capture with transcript-prefix command gate                                                              | oui   | 2026-10-07T08:35:05Z     |
| [#1455](https://github.com/cjpais/Handy/pull/1455) | feat(ibus): implement robust native IBus direct input engine and sile…                                                              | non   | 2026-10-07T08:35:05Z     |
| [#1417](https://github.com/cjpais/Handy/pull/1417) | fix: replace osascript with CoreAudio for macOS mute                                                                                | non   | 2026-10-07T08:35:05Z     |
| [#1397](https://github.com/cjpais/Handy/pull/1397) | feat(linux): optional GNOME Shell extension for live status display                                                                 | non   | 2026-10-07T08:35:05Z     |
| [#1388](https://github.com/cjpais/Handy/pull/1388) | Fix dotool latency and HandyKeys fd leak on Linux                                                                                   | non   | 2026-10-07T08:35:05Z     |
| [#1367](https://github.com/cjpais/Handy/pull/1367) | feat: add Hebrew speech recognition models (ivrit-ai)                                                                               | non   | 2026-10-07T08:35:05Z     |
| [#1364](https://github.com/cjpais/Handy/pull/1364) | fix(macos): add menu bar mode for window managers                                                                                   | non   | 2026-10-07T08:35:05Z     |
| [#1343](https://github.com/cjpais/Handy/pull/1343) | Add slow direct typing paste mode                                                                                                   | non   | 2026-10-07T08:35:05Z     |
| [#1337](https://github.com/cjpais/Handy/pull/1337) | fix(wayland): initialise Enigo, and tolerate failure                                                                                | non   | 2026-10-07T08:35:05Z     |
| [#1319](https://github.com/cjpais/Handy/pull/1319) | feat(tray): add language switching submenu                                                                                          | non   | 2026-10-07T08:35:05Z     |
| [#1311](https://github.com/cjpais/Handy/pull/1311) | fix: don't auto-delete recordings when changing history settings (#1262)                                                            | non   | 2026-10-07T08:35:05Z     |
| [#1300](https://github.com/cjpais/Handy/pull/1300) | fix(linux): add 'None' keyboard implementation for Wayland compositors                                                              | non   | 2026-10-07T08:35:05Z     |
| [#1299](https://github.com/cjpais/Handy/pull/1299) | fix(linux): prefer dotool for reliable Wayland text input                                                                           | non   | 2026-10-07T08:35:05Z     |
| [#1287](https://github.com/cjpais/Handy/pull/1287) | feat(linux): add xdg-desktop-portal GlobalShortcuts backend for Wayland                                                             | non   | 2026-10-07T08:35:05Z     |
| [#1259](https://github.com/cjpais/Handy/pull/1259) | feat: add WASAPI loopback capture mixed with microphone (Windows)                                                                   | non   | 2026-10-07T08:35:05Z     |
| [#1146](https://github.com/cjpais/Handy/pull/1146) | fix: macOS Bluetooth input fallback to prevent media pause during recording                                                         | non   | 2026-10-07T08:35:05Z     |
| [#1028](https://github.com/cjpais/Handy/pull/1028) | Add pause-while-recording across macOS, Windows, and Linux (tested on Ubuntu)                                                       | non   | 2026-10-07T08:35:05Z     |
| [#930](https://github.com/cjpais/Handy/pull/930)   | Add transcription hook                                                                                                              | non   | 2026-10-07T08:35:05Z     |
| [#874](https://github.com/cjpais/Handy/pull/874)   | Add custom recordings directory management and UI integration                                                                       | non   | 2026-10-07T08:35:05Z     |
| [#689](https://github.com/cjpais/Handy/pull/689)   | Feat/add remote desktop direct mode on wayland                                                                                      | non   | 2026-10-07T08:35:05Z     |
| [#633](https://github.com/cjpais/Handy/pull/633)   | feat: add llm base url env support                                                                                                  | non   | 2026-10-07T08:35:05Z     |
| [#572](https://github.com/cjpais/Handy/pull/572)   | feat(linux): add Wayland support with GNOME system shortcuts                                                                        | non   | 2026-10-07T08:35:05Z     |
| [#548](https://github.com/cjpais/Handy/pull/548)   | feat: add Flatpak packaging support                                                                                                 | non   | 2026-10-07T08:35:05Z     |
| [#455](https://github.com/cjpais/Handy/pull/455)   | feat: add text replacements feature                                                                                                 | non   | 2026-10-07T08:35:06Z     |
| [#381](https://github.com/cjpais/Handy/pull/381)   | Added feature of transcription of local files (WAV, MP3 and M4A) along with progressbar                                             | non   | 2026-10-07T08:35:06Z     |
