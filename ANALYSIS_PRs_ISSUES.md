# Analyse des PRs et Issues - cjpais/Handy & Melvynx/Parler

## PRs ouvertes - cjpais/Handy (33 PRs)

### A IMPLEMENTER (priorite haute)
| # | Titre | Auteur | Interet |
|---|-------|--------|---------|
| 985 | DirectML pour Windows ONNX (5x speedup GPU) | ferologics | GPU acceleration Windows - TRES utile |
| 976 | Supprimer mots repetitifs longs | AlexanderYastrebov | DEJA FAIT dans notre fork |
| 969 | Fix overlay multi-moniteurs | jondeibel | Fix important Windows |
| 991 | Onboarding permission micro Windows | ferologics | Meilleure UX Windows |
| 944 | Slider volume 1% au lieu de 10% | sscotth | Fix simple, UX |
| 369 | Double-clic tray icon pour ouvrir | olejsc | UX simple |
| 477 | Ne pas crasher sans micro | cjpais | Fix stabilite |
| 995 | Fix "Append trailing space" ignore | biggest-endian | Bug report (deja fixe dans Parler) |

### INTERESSANT (priorite moyenne)
| # | Titre | Auteur | Interet |
|---|-------|--------|---------|
| 958 | Selection GPU runtime (DirectML/CUDA/CoreML) | andrewleech | Flexible GPU support |
| 957 | Qwen3-ASR engine | andrewleech | Nouveau moteur transcription |
| 930 | Hook post-transcription | AlexanderYastrebov | Extensibilite |
| 559 | Suivre langue clavier OS | vladstudio | Auto-detection langue |
| 874 | Repertoire custom pour enregistrements | Aravinth-Earth | Personnalisation |
| 814 | Stocker API keys dans keychain OS | VirenMohindra | Securite |
| 768 | Sons feedback audio custom | boeserwolf | Personnalisation |
| 455 | Remplacements de texte | schmurtzm | Post-traitement |
| 704 | Plus de variables pour LLM post-processing | khanhicetea | Post-traitement |
| 633 | Support env var pour LLM base URL | jtracey93 | Flexibilite |
| 851 | Bouton post-process par entree + historique versions | arimxyer | UX historique |
| 552 | Visualisation audio symetrique (style Apple) | BerthalonLucas | UI polish |
| 983 | Scrollbar UI amelioree | arshit09 | UI polish |

### EXPERIMENTAL / COMPLEXE (priorite basse)
| # | Titre | Auteur | Interet |
|---|-------|--------|---------|
| 832 | Transcription en direct (streaming) | cjpais | Feature majeure mais complexe |
| 618 | Wake-Word detection | tachyonicbytes | Mains libres |
| 770 | Context OCR pour post-processing | evrenesat | Niche |
| 509 | Serveur API local style OpenAI | Yorick-Ryu | Integration externe |
| 381 | Transcription fichiers locaux (WAV/MP3/M4A) | Signal46 | Hors scope STT live |
| 572 | Support Wayland GNOME | juulieen | Linux specifique |
| 548 | Packaging Flatpak | GabeDuarteM | Linux specifique |
| 689 | Remote desktop Wayland | petit-aigle | Niche |
| 784 | Storybook design system | edwche10 | Dev tooling |
| 734 | GPU fallback Whisper | BlindMaster24 | Stabilite GPU |
| 747 | Lazy stream close bluetooth | VirenMohindra | Fix bluetooth |
| 872 | Bump macOS min 10.15 | brycedrennan | Prerequis upgrade |
| 948 | Fix Nix build | xilec | Nix specifique |

### NON PERTINENT pour Melvynx/Parler
| # | Titre | Auteur |
|---|-------|--------|
| 4 | Security ship readiness | celstnblacc |
| 5 | README ship update | celstnblacc |

---

## Issues ouvertes - cjpais/Handy (67 issues)

### BUGS CRITIQUES (affectent beaucoup d'utilisateurs)
| # | Titre | Plateforme | Resume |
|---|-------|-----------|--------|
| 502 | Colle le clipboard au lieu du texte parle | macOS | Intermittent, CPU charge |
| 921 | Clipboard ecrase apres transcription | macOS | Clipboard pas restaure |
| 870 | Whisper >= Medium casse la transcription | Multi | Irreversible apres selection |
| 858 | Download partiel empeche re-download | Multi | Fichier corrompu bloque |
| 828 | Enregistrements suivants ne capturent rien | Multi | Seul le 1er marche |
| 783 | Transcription perdue apres long enregistrement | Multi | ~15min perdu |
| 315 | Overlay vole le focus, texte tape dans overlay | Multi | Contournement: desactiver overlay |
| 434 | App freeze quand cible est en admin | Windows | Probleme privileges |

### BUGS WINDOWS
| # | Titre | Resume |
|---|-------|--------|
| 990 | "backend-specific error" Win11 | Erreur au lancement enregistrement |
| 966 | Pas de hotkeys RCtrl/RAlt/RWin | Touches droites pas detectees |
| 917 | Super key pas completement override | Menu demarrer apparait |
| 811 | Overlay pas sur moniteurs secondaires | Multi-ecran |
| 574 | Parakeet fail avec chemin Cyrillique | Unicode path |
| 508 | Etats overlay inverses | Recording/Transcribing confondus |
| 263 | Overlay coupe avec scaling 150% | DPI scaling |
| 491 | Crash avec micro Bluetooth | Win11 |
| 537 | Crash au lancement | Win10, vieux CPU |
| 436 | Crash a chaque activation | Win11 Pro |
| 290 | Vulkan entry point manquant | Win10, vieux GPU |
| 99 | Crash vulkan-1.dll manquant | Win10 |
| 132 | Whisper crash fresh install | Win11 |
| 55 | App inutilisable apres crash | Win10 |
| 653 | Download modele bloque a 0% | Win11 Nvidia |

### BUGS MACOS
| # | Titre | Resume |
|---|-------|--------|
| 986 | Crash immediat macOS 26.3.1 | Apple Silicon |
| 963 | Fin de parole coupee | Apple hardware |
| 981 | Volume systeme modifie par Handy | Force le volume |
| 956 | Modifiers comme shortcut activent Handy | Fn/Cmd combo |
| 650 | Freeze apres appel Zoom | macOS |
| 646 | AirPods Handoff declenche | Son Handy vole AirPods |
| 642 | Delai mute pendant enregistrement | macOS |
| 713 | Erreur ORT pas affichee dans UI | macOS |
| 703 | Delai avant beep Ready | Device non-default |
| 337 | Login Items montre mauvais nom | macOS |
| 422 | Pas d'ouverture macOS 11 Big Sur | Vieux macOS |
| 305 | Touche @ = intlbackslash AZERTY | Mac AZERTY |

### BUGS LINUX
| # | Titre | Resume |
|---|-------|--------|
| 924 | Crash Kubuntu 25.10 | libayatana-appindicator |
| 895 | AppImage DirIcon casse | Fedora |
| 867 | Vulkan DeviceLostError Nvidia | GPU discrete |
| 861 | AppImage update telecharge .deb | Auto-update |
| 806 | Pas de capture micro Pop!_OS PipeWire | Audio backend |
| 699 | UI cassee au 1er lancement AppImage | Layout |
| 603 | AppImage ne se lance pas | Gdk errors |
| 554 | Illegal instruction au lancement | CPU incompatible |
| 522 | wtype failures silencieuses | Wayland |
| 521 | Micro/Output que "Default" | KDE Wayland |
| 512 | pkill -USR2 crash AppImage | Signal handling |
| 420 | Version AppImage = hash commit | Packaging |
| 400 | Updates Ubuntu ne marchent pas | Auto-update |
| 373 | Boutons title bar non reactifs RPM | RPM packaging |
| 227 | Crash Ubuntu 22.04 dual GPU | AMD+Nvidia |
| 102 | Shortcut ne marche pas Ubuntu | Ubuntu 22.04 |
| 92 | Tous les keybindings "already in use" | Fedora GNOME |
| 844 | Super key pas detecte Ubuntu | Ubuntu |
| 429 | 1er caractere manquant Direct paste | GNOME Wayland |

### FEATURE REQUESTS
| # | Titre | Resume |
|---|-------|--------|
| 199 | Support Whisper --initial-prompt | Ameliore chinois/ponctuation |
| 483 | API keys depuis env vars | Securite |
| 147 | Auto push-to-talk + CLI options | UX amelioree |
| 994 | Guide fix Ubuntu GNOME Wayland | Documentation |
| 407 | Comment verifier signatures Linux | Documentation |

### BUGS GENERIQUES / DEJA FIXES
| # | Titre | Status probable |
|---|-------|----------------|
| 995 | Append trailing space ignore | DEJA FIXE dans Parler (clipboard.rs) |
| 845 | Alt+Q ouvre menu Opera | Specifique navigateur, pas fixable |
| 417 | Audio plein de bruit | Probleme hardware utilisateur |
| 439 | Direct paste mauvais layout clavier | Connu, complexe |
| 96 | Shortcut revert a Ctrl+Space | Ancien, peut-etre fixe |

---

## RESUME - Actions recommandees pour Phonara

### Deja fait dans notre fork:
- PR #976: Stutter collapse etendu aux mots longs
- Issue #995: Trailing space (deja present dans Parler)
- Overlay high visibility (notre ajout custom)

### A porter en priorite:
1. **PR #985** - DirectML Windows (5x GPU speedup) - GROS gain perf
2. **PR #969** - Fix overlay multi-moniteurs
3. **PR #991** - Onboarding permission micro Windows
4. **PR #944** - Volume slider 1%
5. **PR #477** - Ne pas crasher sans micro
6. **PR #369** - Double-clic tray icon

### A considerer ensuite:
7. PR #958 - Selection GPU runtime
8. PR #930 - Hook post-transcription
9. PR #559 - Suivre langue clavier
10. PR #814 - API keys dans keychain
11. PR #455 - Remplacements texte
12. PR #552 - Visualisation audio amelioree
