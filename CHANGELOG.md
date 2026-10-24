# Journal des versions

Ce fichier résume ce qui change à chaque fois que je te donne une nouvelle version à envoyer sur GitHub.

## v1.20.40 — 24 octobre 2026

- **Mise à l'échelle Windows (DPI scaling).** À 175 % (ou tout autre scaling > 100 %), la fenêtre et le zoom s'adaptent automatiquement au premier lancement. La taille par défaut (480×760) est divisée par le `scaleFactor` de l'écran principal, et le zoom par défaut (1.6) est réduit proportionnellement, afin que l'interface garde les mêmes proportions visuelles quelle que soit la mise à l'échelle Windows. Si l'utilisateur a déjà personnalisé la taille ou le zoom, ses réglages sont toujours respectés.

## v1.20.39 — 24 octobre 2026

- **Animated Background — fix définitif.** Chromium/Electron bloque les animations `transform` sur un élément qui porte aussi un `filter` inline. Solution : architecture à deux couches — `#npBackground` (parent) reçoit uniquement l'animation `transform`, `#npBgInner` (enfant) reçoit l'image, le `blur` et le `brightness`. Les deux ne se partagent plus aucune propriété conflictuelle.

## v1.20.38 — 24 octobre 2026

- **Animated Background — fix animation bloquée.** L'animation `bgDrift` ne démarrait pas parce qu'un `transform: scale(1.2)` inline posé par le rendu du fond prenait la priorité sur l'animation CSS. Désormais, passer Animated Background à On vide ce style inline, et l'état `_bgAnimApplied` évite de relancer l'animation à chaque mise à jour du fond (ce qui la réinitialisait en boucle toutes les 2 s).
- **Background On/Off — fond noir persistant (fix).** Repasser Background de Off à On laissait un fond noir dans le mode real playback, car `updateNpBackground()` ne connaissait pas l'URL de la pochette courante. La dernière URL est maintenant mémorisée dans `_lastArtUrl` et réutilisée immédiatement lors du toggle.

## v1.20.37 — 24 octobre 2026

- **Animated Background.** Nouvelle option dans les Settings (visible uniquement si Background est On). Active une animation lente sur le fond flou — zoom et dérive très légers (cycle de 40 s) qui donnent un effet de mouvement d'eau subtil. L'option Animated Background se masque automatiquement si Background est désactivé.

## v1.20.36 — 23 octobre 2026

- **Tick verte basée sur les playlists, pas les Liked Songs.** Au démarrage (après auth), Simple Player parcourt toutes tes playlists et construit un index de tous les morceaux qu'elles contiennent. La tick est verte si le morceau est dans au moins une de tes playlists — indépendamment du cœur Spotify. La vérification est instantanée à chaque changement de morceau. L'index se reconstruit automatiquement après un ajout ou une modification de bibliothèque.

## v1.20.35 — 23 octobre 2026

- **Molette en idle — barre de volume visible.** La barre de volume idle s'affiche maintenant lors d'un scroll à la molette, exactement comme lors d'un glissement tactile. Elle disparaît automatiquement après 2,5 s sans interaction.

## v1.20.34 — 23 octobre 2026

- **Recentrage complet (suite v1.20.33).** Trois régressions introduites par la symétrie du padding :
  - Tick en mode normal : la compensation `left:calc(50% - …)` n'était plus nécessaire avec un padding symétrique — remplacée par `left:50%`.
  - Tabbar (Search/Player/Library) : le `padding-left:20px` ne compensait plus le padding droit `rail-w + 62px` — les deux côtés sont maintenant égaux.
  - Mode idle : le override `padding-right:20px` laissait le `padding-left` à `rail-w + 62px`, décalant la pochette et le titre vers la droite — `padding-left:20px` ajouté au override idle.

## v1.20.33 — 23 octobre 2026

- **Badge playlist conditionnel à la tick.** Le nom de la playlist ne s'affiche plus en haut à gauche si le morceau en cours ne fait partie d'aucune playlist (tick grise). Le badge est désormais lié à l'état de la tick : il n'apparaît que si la tick est verte, et est recalculé après la réponse asynchrone de Spotify.
- **Recentrage du contenu en mode normal.** La pochette, le titre, la barre de temps, les boutons de lecture, la tick et la tabbar étaient décalés vers la gauche à cause d'un padding asymétrique sur `#swipeZone` (20 px à gauche contre `rail-w + 62 px` à droite). Le padding gauche est maintenant égal au padding droit pour remettre tout le groupe visuellement au centre.
- **Fond assombri persistant après ajout à une playlist (fix définitif).** Le backdrop et le menu d'ajout à une playlist étaient des descendants de `#swipeZone`, dont la propriété `transition: transform` crée un nouveau bloc contenant CSS pendant les animations — les enfants `position:fixed` se retrouvaient confinés à cette zone. Backdrop et menu sont maintenant déplacés vers `document.body` au démarrage, garantissant qu'ils couvrent bien tout le viewport et disparaissent correctement après un ajout.

## v1.20.31 — 23 octobre 2026

- **Molette — correction du fix v1.20.29.** Le filtre anti-scroll bloquait aussi la molette dans le player (normal et idle), car `#view-player` a lui aussi la classe `.view`. La molette change maintenant le volume dans le player (normal et idle) et scrolle normalement dans Settings, Library et Search.

## v1.20.30 — 23 octobre 2026

- **Tick verte après ajout à une playlist.** Après avoir ajouté un morceau à une playlist (en mode normal ou idle), la tick passe immédiatement au vert sans attendre le prochain changement de piste. L'état était perdu parce que `updateLikedBadge` (mode démo) était appelée au lieu de `updateRealLikedBadge`.
- **Overlay du menu playlist.** Le fond semi-transparent derrière le menu de playlists était invisible (pas de `background`), ce qui donnait l'impression que l'écran était figé. Il affiche maintenant un assombrissement léger clair et disparaît bien à la fermeture.

## v1.20.29 — 23 octobre 2026

- **Molette dans Settings.** La molette faisait monter/descendre le volume même quand la liste des réglages était ouverte. Elle fait maintenant défiler les listes normalement et ne touche au volume que depuis le player.
- **Rafraîchissement des boutons.** Play/pause, next, prev, shuffle et repeat n'avaient plus à attendre un clic parasite pour afficher le bon état. Les polls rapides après une action ignorent maintenant un éventuel poll déjà en cours, et l'état play/pause est protégé 3 s contre un retour stale de l'API Spotify.

## v1.20.28 — 23 octobre 2026

- **Idle — tick centrée exactement.** Quelle que soit la taille de la fenêtre, la tick se trouve toujours à égale distance entre le haut de l'application et le haut de la pochette.

## v1.20.27 — 23 octobre 2026

- **Idle — tick = bouton d'ajout à une playlist.** Le bouton + disparaît en mode idle. À la place, la tique verte (ou grise) est maintenant cliquable/tactile et ouvre directement le menu « ajouter à une playlist » au centre de l'écran.
- Le bouton + reste présent et fonctionnel en mode normal.

## v1.20.26 — 23 octobre 2026

- **Tick « liké » décalée de +10px vers le bas** dans les deux modes (normal et idle).
- **Mode normal — plus d'espace au-dessus de la pochette.** Le padding-top de la zone de lecture passe de 20px à 36px : la pochette, le titre et la barre de temps descendent légèrement, laissant plus de place à la tick qui ne chevauche plus la couverture.

## v1.20.25 — 23 octobre 2026

- **Ajout à une playlist — permission manquante.** Si Spotify renvoie une 403 (token sans le scope `playlist-modify`), un dialog s'affiche avec un bouton « Reconnecter Spotify ». La reconnexion ouvre le navigateur pour ré-autoriser les bons scopes, puis relance automatiquement l'ajout.

## v1.20.24 — 23 octobre 2026

- **Zone de volume agrandie (mode normal).** Toute la largeur du rail de volume est maintenant interactive — plus besoin de viser précisément la fine barre. Le curseur change en flèche haut/bas pour indiquer la zone.

## v1.20.23 — 23 octobre 2026

- **Tique « liké » recentrée (mode normal).** Elle est désormais alignée sur le même axe vertical que le bouton play/pause et le bouton +, et non plus sur le centre géométrique de la swipeZone (qui est décalée par le rail de volume à droite).
- **Rail de volume à mi-distance (mode normal).** Le rail est centré exactement à la moitié de l'espace disponible entre le bord de la pochette et le bord droit de la fenêtre, quelle que soit la taille d'interface choisie.
- **Zone de volume idle toujours visible.** En mode idle, la pochette se réduit automatiquement si nécessaire pour garantir un espace minimum (80px) à droite — la barre de volume est donc toujours accessible.

## v1.20.22 — 23 octobre 2026

- **Roulette de souris = volume.** Molette vers le haut → +5%, vers le bas → −5%. Fonctionne partout dans la fenêtre, en mode normal et idle.

## v1.20.21 — 23 octobre 2026

- **Bouton + en idle** : décalé de 30px vers la gauche et 30px vers le haut, agrandi de 20% (62px → 74px).
- **Menu "ajouter à une playlist" en idle** : le menu est désormais déplacé sur `document.body` au clic pour éviter tout clipping, et centré en plein milieu de l'écran.

## v1.20.20 — 23 octobre 2026

- **Croix X quitte vraiment l'app.** Avant, la croix cachait Simple Player dans le tray sans quitter — Spotify continuait donc à jouer indéfiniment. Désormais la croix déclenche un vrai quit (pause Spotify + kill Ghost Spotify + fermeture). Le tray reste disponible pour afficher/masquer la fenêtre.

## v1.20.19 — 23 octobre 2026

- **Transition idle ↔ normal plus fluide.** Légère animation de zoom (scale) au passage entre les deux modes — plus de saut visuel.
- **Tick (likedBadge) en player normal.** Repositionnée au-dessus de la pochette (centrée dans l'espace au-dessus de la cover), comme avant.
- **Bouton + en idle.** Fixé dans le coin inférieur droit de la zone, toujours visible — plus de positionnement JS approximatif.
- **Zone volume idle.** Limitée verticalement à la hauteur de la pochette (haut → bas de la cover) ; n'empiète plus sur la zone du bouton +.
- **Rond noir qui reste sur Prev/Next.** Suppression du focus ring navigateur après un tap tactile (conservé pour la navigation clavier).

## v1.20.18 — 23 octobre 2026

- **Musique qui continue après quit — corrigé.** La séquence de fermeture est désormais : pause API → 800ms → kill Ghost Spotify → quit. Avant, le kill et le quit arrivaient simultanément au pause, ce qui ne laissait pas le temps à Spotify de traiter l'arrêt. De plus, le pause est forcé même si un backoff 429 est en cours.

## v1.20.17 — 23 octobre 2026

- **Gestion du rate-limiting Spotify (erreur 429 "too busy").** Trois corrections :
  1. `spotifyApi()` lit le header `Retry-After` sur les réponses 429 et bloque *toutes* les requêtes (polls et commandes) pendant la durée indiquée par Spotify.
  2. `pollSoon()` annule les timers précédents avant d'en créer de nouveaux — plusieurs actions rapides n'empilent plus des rafales de polls.
  3. Volume : debounce propre à 200 ms pour Spotify (était un throttle mal calibré) — glisser le rail n'envoie plus qu'une seule requête après 200 ms de silence.

## v1.20.16 — 23 octobre 2026

- **Player idle — ajustements bouton +.** Titre/artiste décalé 1px vers le haut (`margin-top:-29px`). Bouton + réduit de 20% (94px → 75px, svg 40px → 32px). Position JS recalculée avec cap bas pour que le bouton reste entièrement visible dans la zone.

## v1.20.15 — 23 octobre 2026

- **Auto-updater complet.** Au lancement, Simple Player vérifie silencieusement si une nouvelle version existe sur GitHub. Quand elle est téléchargée, un pop-up s'affiche avec « Installer maintenant » (redémarre et installe) ou « Plus tard ». L'installeur NSIS et le désinstalleur Windows (Ajout/Suppression de programmes) sont déjà configurés via electron-builder.

## v1.20.14 — 23 octobre 2026

- **Mode idle — bouton + réduit à 30%.** 94px (était 312px), icône 40px.

## v1.20.13 — 23 octobre 2026

- **Tabbar — ordre final.** Search | Player | Library.

## v1.20.12 — 23 octobre 2026

- **Quit — Ghost Spotify toujours fermé.** Quand le Ghost Spotify est activé dans les settings, Spotify est maintenant tué à chaque fermeture de Simple Player — même s'il était déjà ouvert au lancement. La musique s'arrête garantiment.

## v1.20.11 — 23 octobre 2026

- **Tabbar — ordre inversé.** Library à gauche, Player au centre, Search à droite.
- **Volume corrigé.** La barre de volume contrôle maintenant le volume Spotify (API) en priorité quand connecté, au lieu du volume master Windows. Le fallback Windows reste actif hors connexion Spotify.

## v1.20.10 — 23 octobre 2026

- **Mode idle — bouton + deux fois plus grand.** 312px (était 156px), icône 132px.
- **Mode idle — titre/artiste rapproché de la pochette.** Le bloc texte descend maintenant directement sous la pochette avec un petit espace, laissant plus de place au bouton + en bas.

## v1.20.9 — 23 octobre 2026

- **Mode normal — barre de volume décalée 50px vers la gauche.** Le rail de volume (`#volumeRail`) est maintenant à `right:50px` au lieu de `right:0`, et le padding du contenu a été ajusté en conséquence.
- **Mode normal — tick de playlist centrée.** La coche est maintenant positionnée par JS exactement au milieu vertical de l'espace entre le bas de la pochette et le bas de l'app.
- **Mode idle — menu « Ajouter à une playlist » centré à l'écran.** La fenêtre de sélection s'affiche maintenant en plein milieu de l'écran (position fixe, centré H+V) au lieu d'apparaître au-dessus du bouton.

## v1.20.8 — 23 octobre 2026

- **Mode idle — bouton + trois fois plus grand.** 156px (était 52px), icône 66px, uniquement en idle.
- **Mode idle — titre/artiste remonté.** Moins d'espace entre la pochette et le texte, ce qui laisse plus de place au bouton + en bas.

## v1.20.7 — 23 octobre 2026

- **Mode idle — titre et artiste deux fois plus grands.** Titre jusqu'à 56px (était 28px), artiste jusqu'à 32px (était 14px).
- **Mode idle — zone tactile volume corrigée.** La zone d'activation s'étend maintenant correctement de la droite de la pochette jusqu'au bord droit de l'application.
- **Mode idle — barre de volume centrée.** La barre s'affiche exactement au milieu de l'espace disponible à droite de la pochette.

## v1.20.6 — 23 octobre 2026

- **Swipe Previous plus réactif.** Trois améliorations combinées : (1) le délai avant le 2e appel "previous" à Spotify réduit de 350ms à 200ms ; (2) `pollSoon` vérifie maintenant à 0ms + 800ms + 1800ms au lieu de 0ms + 1600ms, donc la pochette se met à jour beaucoup plus vite après confirmation Spotify ; (3) les 6 dernières pochettes de l'historique sont préchargées au démarrage (au lieu de 3) pour que l'image s'affiche instantanément sans attendre le réseau.

## v1.20.5 — 23 octobre 2026

- **Boutons Next/Prev tactile : fond fantôme corrigé.** Le rond noir restait affiché après un tap. Les effets `:hover` sont maintenant limités aux vrais pointeurs souris (`@media (hover: hover)`) — sur écran tactile, seul `:active` (pendant l'appui) s'affiche, et il disparaît correctement au relâchement.

## v1.20.4 — 23 octobre 2026

- **Mode normal — titre/artiste centré.** Le bloc titre+artiste occupe maintenant tout l'espace entre la pochette et la barre de progression, et est centré verticalement dedans.
- **Mode idle — bouton + repositionné.** Centré entre le bas du nom d'artiste et le bas de l'application (via positionnement JS absolu).

## v1.20.3 — 23 octobre 2026

- **Volume idle : zone d'activation élargie.** Tout l'espace entre la pochette et le bord droit de l'application active maintenant la barre de volume. La barre est centrée dans cet espace.

## v1.20.2 — 23 octobre 2026

- **Bouton repeat : répète la chanson en cours** (au lieu de répéter la playlist entière). L'API Spotify reçoit maintenant `track` au lieu de `context`.
- **Fermeture : pause automatique.** La musique Spotify s'arrête proprement quand on quitte Simple Player.
- **Shuffle** : vérifié — envoie bien `true/false` à l'API Spotify, qui gère le hasard côté serveur.

## v1.20.1 — 23 octobre 2026

- **Titre/artiste : marge minimale sous la pochette.** Un `margin-top` garanti évite que le texte ne remonte sur la pochette sur les petites fenêtres.

## v1.20.0 — 23 octobre 2026

- **Bouton + en idle : même position qu'en mode normal.** Centré sous le titre/artiste dans le flux de la page, au lieu d'être repositionné à droite.

## v1.19.9 — 23 octobre 2026

- **Symbole pause en vert sur la pochette.** Le ⏸ était noir (SVG fill par défaut) — corrigé, il hérite maintenant de la couleur accent (vert) comme le ▶.

## v1.19.8 — 23 octobre 2026

- **Bouton + visible en mode idle.** Positionné à droite, centré verticalement dans l'espace entre le haut de la pochette et le haut de l'app.
- **Menu de sélection de playlist deux fois plus grand.** Pochettes 52 px, texte 22 px, coches 30 px, menu plus large (360 px min).
- **Tique liké : correction de position.** Centrée exactement entre le haut de la pochette et le haut de l'application.

## v1.19.7 — 23 octobre 2026

- **Icônes de la barre du bas trois fois plus grandes.** Icônes 48 px (étaient 21 px), labels 18 px (étaient 10 px). Inclut l'icône Settings.

## v1.19.6 — 23 octobre 2026

- **Icône haut-parleur dans la barre volume idle.** L'icône apparaît au-dessus de la barre et réagit au niveau (muet / 1 onde / 2 ondes / 3 ondes), identique au player normal.
- **Résultats de recherche deux fois plus grands.** Pochettes 116 px, titre 22 px, sous-titre 17 px — même taille que la bibliothèque.
- **Correction bug volume idle.** Les constantes SVG du haut-parleur sont maintenant globales, accessibles par les deux zones de volume.

## v1.19.5 — 23 octobre 2026

- **Textes deux fois plus grands.** Compteur de temps (élapsé / total) : 28 px au lieu de 14 px. Pourcentage de volume en idle : 24 px au lieu de 12 px.

## v1.19.4 — 23 octobre 2026

- **Bibliothèque : pochettes et textes deux fois plus grands.** Pochettes : 116 px (au lieu de 58 px). Titre : 22 px, sous-titre : 17 px.
- **Tique « liké » en mode idle.** Deux fois plus grande (44 px). En idle, positionnée et centrée automatiquement dans l'espace entre le bord supérieur de la fenêtre et le haut de la pochette.
- **Volume en mode idle : nouvelle barre centrée dans le strip droit.** La barre apparaît maintenant à l'intérieur du strip, centrée horizontalement, au lieu de glisser depuis le bord droit. Un seul tap suffit pour la faire apparaître ET commencer à ajuster le volume en même temps (glisser dès le premier tap, sans avoir à tapoter deux fois). La barre disparaît au bout de 2,5 s sans interaction. Le réglage est bien transmis au volume réel (Windows ou Spotify selon la configuration).
- **Sortir du mode idle : glisser vers le haut.** Remplace le double-tap. Glisser vers le haut de plus de 55 px n'importe où dans le player (sauf dans le strip volume) fait revenir au player normal.

## v1.19.3 — 23 octobre 2026

- **Correction du symbole sur la pochette en idle.** L'icône était inversée : ▶ s'affichait en pause et ⏸ pendant la lecture. Maintenant :
  - En pause → symbole ⏸ reste affiché en vert.
  - En lecture → symbole ▶ s'affiche brièvement puis disparaît en fondu.

## v1.19.2 — 23 octobre 2026

- **Mode idle : symbole play/pause sur la pochette.**
  - En pause : le symbole reste visible en permanence, dans le vert de l'interface.
  - Quand on appuie sur play : le symbole s'affiche brièvement, puis disparaît en fondu sur environ une seconde.
- **Correction du tap sur la pochette en idle.** Le clic n'était pas détecté à cause du pointer capture sur la zone de swipe. La bascule play/pause se fait maintenant dans le gestionnaire `onUp`, ce qui règle le problème.

## v1.19.1 — 23 octobre 2026

- **Mode idle : les boutons play/pause/next/shuffle/repeat et le « + » sont de nouveau cachés.** Cause trouvée : en v1.14.0, quand j'ai supprimé la barre noire du haut, mon nettoyage du CSS a effacé par erreur, au passage, la règle qui cache ces boutons en mode idle (elle était écrite sur la même ligne que les règles de l'ancienne barre). Règle remise. Vérifié dans un navigateur de test : en idle, il ne reste que la pochette, le titre, l'artiste et la coche « liké » ; boutons, barre de progression et barre du bas sont masqués et non cliquables.

## v1.19.0 — 23 octobre 2026

- **Bibliothèque présentée comme dans Spotify.** Les playlists sont maintenant une **liste** (pochette à gauche, nom en gras, « Playlist · propriétaire » dessous) au lieu d'une grille, et **Liked Songs est épinglé tout en haut**, comme dans l'app officielle.
- **Bug trouvé et corrigé : la liste « Liked Songs » restait toujours dépliée** (jusqu'à 100 chansons) même si le dossier devait être replié. Une règle CSS écrasait l'attribut « caché ». Elle ne s'ouvre maintenant que quand on la touche.
- **Ordre des playlists.** L'API de Spotify ne donne pas l'ordre « Récents » de l'app officielle. Simple Player l'approche : les playlists que tu as jouées depuis Simple Player passent en premier (la plus récente en haut), les autres gardent l'ordre renvoyé par Spotify. Il ne sera donc pas identique à Spotify au début, et se rapproche de ton usage avec le temps.
- **Menu « + » (ajouter à une playlist).** Je l'ai testé avec de fausses données et il s'affiche correctement. Si la liste réelle ne peut pas être chargée, il affiche maintenant la **raison** au lieu d'une liste vide. La récupération des playlists est plus robuste (toutes les pages, page plus petite si Spotify refuse 50, et seulement tes playlists ou celles collaboratives, puisque l'ajout n'est possible que dans celles-là) et le même ordre s'y applique.

## v1.18.2 — 23 octobre 2026

- **« Could not reach Spotify » alors que l'action fonctionne.** Cause la plus probable (je n'ai pas pu la reproduire ici) : pour certaines commandes (next, previous, shuffle, repeat), Spotify répond « OK » avec un corps vide ou qui n'est pas du JSON. L'app essayait de le lire quand même, échouait, et traitait ça comme une erreur de connexion alors que la commande avait réussi. Maintenant une réponse OK est toujours traitée comme un succès.
- **Bouton Shuffle (et Repeat) : vrai on/off.** La même erreur fantôme faisait revenir le bouton en arrière juste après l'appui, d'où les appuis multiples nécessaires. De plus, après un appui, l'app ignore pendant 5 s (au lieu de 3) les états renvoyés par Spotify, qui peut mettre du temps à se mettre à jour, pour que le bouton ne clignote pas.

## v1.18.1 — 23 octobre 2026

- **Barre de progression (déplacement dans le temps) beaucoup plus facile à attraper au toucher.** Vraie cause du bug : la zone tactile invisible autour de la barre était coupée par le conteneur (qui masque son débordement), donc un doigt posé juste à côté de la ligne fine de 5 px tombait sur la pochette et changeait de piste. Maintenant la zone tactile est un vrai espace autour de la barre (22 px au-dessus et en dessous, 24 px de chaque côté, environ 55 px de haut au total contre 5 avant), et la barre visible est un peu plus épaisse (8 px). Glisser dessus ne peut plus déclencher Next/Previous.

## v1.18.0 — 23 octobre 2026

- **La recherche couvre tout le catalogue Spotify**, et plus seulement des chansons : résultats en sections **Songs, Artists, Albums, Playlists** (10 de chaque). Un clic sur un artiste, un album ou une playlist le joue en entier; un clic sur une chanson met en file les chansons listées à partir de celle-ci. Un bouton **More songs** charge 10 chansons de plus à chaque clic.
- Avant, la requête demandait 20 résultats, ce que l'API Spotify refuse peut-être pour cette app : l'erreur était avalée et affichait « No results ». Maintenant la limite est de 10, et une vraie erreur s'affiche au lieu de « No results ».

## v1.17.3 — 23 octobre 2026

- **Raccourcis clavier désactivés pendant que tu tapes dans la recherche.** Tant que le curseur est dans la barre de recherche, Espace et les flèches gauche/droite servent à écrire et à déplacer le curseur, et ne contrôlent plus la lecture. Dès que tu quittes la barre (autre onglet, clic ailleurs), les raccourcis redeviennent actifs.

## v1.17.2 — 23 octobre 2026

- **Barre de recherche deux fois plus haute** (environ 90 px au lieu de 45), avec un texte et une loupe plus grands.

## v1.17.1 — 23 octobre 2026

- **Recherche : le curseur est déjà dans la barre de recherche** dès que tu ouvres l'onglet Search, tu peux taper tout de suite.

## v1.17.0 — 23 octobre 2026

- **Les barres de son règlent maintenant le volume de Windows** (le volume général de l'ordinateur), pas seulement celui de Spotify. Un petit programme PowerShell invisible tourne en arrière-plan pour parler à l'API audio de Windows (il démarre au premier usage et s'arrête avec l'app). La barre se synchronise aussi avec le volume réel de Windows toutes les 3 secondes (si tu changes le son avec le clavier ou la barre des tâches), sauf pendant que tu la touches. Hors Windows, elle retombe sur le volume Spotify. Le volume propre de Spotify n'est plus touché. Les mises à jour sont limitées en fréquence pour ne pas saturer.
- **La barre de son du mode normal se comporte exactement comme celle du mode idle** : toucher ne fait plus « sauter » le volume, on glisse vers le haut/bas, et 700 px de glissement couvrent toute la plage (même constante pour les deux).
- **Previous aussi instantané que Next.** Les pistes écoutées sont gardées en mémoire (et entre les sessions) avec leur pochette, qui est préchargée : un swipe vers l'arrière affiche tout de suite la pochette précédente. Avant, ça ne marchait que dans les 3 premières secondes d'une piste et jamais juste après la réouverture de l'app.
- **Changement de comportement :** « previous » va toujours à la piste précédente. Si plus de 3 s de la piste avaient été jouées, Spotify la recommencerait normalement; l'app envoie maintenant un second « previous » juste après pour revenir vraiment en arrière. Dis-moi si tu préfères le comportement normal de Spotify.
- **Limites :** je n'ai pas pu tester le programme de volume sous Windows. Une piste jouée avant la toute première utilisation de cette version n'a pas de pochette en mémoire.

## v1.16.1 — 23 octobre 2026

- **Mode idle : la zone du volume ne prend plus tout l'espace à droite de la pochette.** C'est maintenant une bande collée au bord droit (environ 45 % de l'espace libre, entre 48 et 120 px). Le reste de cet espace redevient une zone normale, où le **double tap** fait sortir du mode immersif (il était bloqué avant, car la zone de volume interceptait les taps).

## v1.16.0 — 23 octobre 2026

- **Support de la version Microsoft Store de Spotify.** Si `Spotify.exe` n'est pas trouvé (la version Store est installée dans un dossier protégé), Ghost Spotify démarre maintenant Spotify en passant par Windows (le lien `spotify:`), ce qui marche pour les deux types d'installation. Plus besoin de renseigner `Spotify.exe` dans ce cas. Si tu as la version classique à un endroit inhabituel, tu peux toujours le localiser dans les réglages.
- La fenêtre de Spotify est masquée et fermée avec Simple Player par **nom de processus** (et non plus par un seul identifiant), pour fonctionner aussi avec la version Store. Si Spotify était déjà ouvert quand tu lances Simple Player, il n'est ni touché ni fermé.
- Le popup n'apparaît plus qu'en dernier recours (Spotify introuvable ou qui ne démarre pas après 25 s), avec un texte adapté aux deux versions. Pense à être **connecté** dans Spotify sur le PC.
- **Limite connue :** Spotify étant lancé par Windows, il peut faire apparaître sa fenêtre 1 à 3 secondes avant d'être masqué. Je n'ai pas pu tester la version Store ici.

## v1.15.1 — 23 octobre 2026

- **Popup « Spotify.exe not set ».** Quand Simple Player doit démarrer Spotify sur ton ordinateur (ou reçoit « No active device ») et ne connaît pas l'emplacement de `Spotify.exe`, il ne reste plus bloqué avec un message vague : il affiche un petit popup avec trois choix — **Locate Spotify.exe…** (choisir le fichier tout de suite), **Open Settings** (ouvre la page des réglages) ou **Later**. Il n'attend plus 25 secondes pour rien dans ce cas.
- Message de délai dépassé plus précis : si Spotify est bien trouvé mais n'apparaît pas, l'app rappelle de vérifier qu'il est installé (version classique) et que tu y es **connecté**.

## v1.15.0 — 23 octobre 2026

- **La musique joue sur TON ORDINATEUR, pas sur le téléphone.** Avant, Ghost Spotify ne démarrait Spotify que s'il n'y avait *aucun* appareil actif — donc si le téléphone était actif, rien ne se passait côté PC. Maintenant, avec Ghost Spotify activé :
  - l'app cherche l'appareil Spotify de cet ordinateur (Spotify le nomme d'après le nom de l'ordinateur Windows) et démarre Spotify masqué s'il n'est pas là (sans en relancer un second si le tien est déjà ouvert) ;
  - chaque Play est envoyé explicitement à cet appareil, ce qui rapatrie aussi la lecture depuis le téléphone ;
  - à la connexion, si la lecture est sur un autre appareil, elle est ramenée ici (en pause).
  Si Spotify ne se montre pas en 25 s, un message clair l'indique.
- **Messages d'erreur plus précis.** « Could not reach Spotify » ne s'affiche plus que pour une vraie coupure réseau ; sinon tu vois le code d'erreur Spotify (ex. « Spotify error 500 »), ou « Spotify is busy » en cas de limite de requêtes. Si une erreur persiste, dis-moi exactement le message.
- **Pochettes instantanées au swipe.** Les 3 prochaines pochettes (file d'attente Spotify) sont téléchargées d'avance, et les précédentes sont gardées en mémoire : au swipe, la nouvelle pochette et le nouveau titre s'affichent tout de suite, puis Spotify confirme. Les réponses de Spotify qui montrent encore l'ancienne piste juste après un swipe sont ignorées pour éviter un retour en arrière visuel.

## v1.14.3 — 23 octobre 2026

- **Ghost Spotify est maintenant activé par défaut.** Si tu l'avais laissé sur Off dans une ancienne version, il est passé sur On une seule fois au premier lancement de cette version; ensuite ton choix est toujours respecté. Au lancement (ou quand tu appuies sur Play), si aucun appareil Spotify n'est actif, il démarre Spotify masqué sur ton ordinateur — sans lancer de musique — et le ferme avec Simple Player.

## v1.14.2 — 23 octobre 2026

- **« Window position » est maintenant toujours la dernière section des réglages** (après Ghost Spotify). Une note dans le code rappelle que tout nouveau réglage s'ajoute au-dessus d'elle.

## v1.14.1 — 23 octobre 2026

- **Plus de démarrage automatique de la musique à l'ouverture.** À la réouverture, si Spotify n'a rien de chargé, Simple Player affiche simplement la dernière piste (titre, pochette, position) en pause. **La musique ne démarre que quand tu appuies sur Play**, et repart alors de la position sauvegardée. Si Spotify a déjà sa propre piste chargée, c'est elle qui s'affiche. (Précision : Ghost Spotify, lui, peut toujours démarrer Spotify masqué à l'ouverture s'il est activé — cela ne lance aucune musique.)

## v1.14.0 — 23 octobre 2026

- **Barre noire du haut supprimée complètement** (bouton plein écran compris). Le plein écran se fait maintenant avec la touche **F11**.
- **Volume au toucher beaucoup moins sensible.** En mode idle, il faut maintenant 700 px de glissement pour couvrir toute la plage (avant : 220 px). Sur la barre de volume normale, un tap saute toujours à l'endroit touché, mais le glissement qui suit ne bouge le volume qu'à 35 % de la distance parcourue par le doigt.
- **Reprise de la dernière musique.** Simple Player mémorise la piste (et la playlist/l'album d'où elle vient) ainsi que la position. À la réouverture, si Spotify n'a rien de chargé sur aucun appareil, la musique repart là où elle s'était arrêtée. Si quelque chose est déjà chargé (en lecture ou en pause), rien n'est écrasé. (Remplacé en v1.14.1 : la reprise ne démarre plus toute seule.)

## v1.13.0 — 23 octobre 2026

**IMPORTANT — erreur de ma part dans l'emballage des zips (v1.9.2 à v1.12.0).** Ces zips contenaient un dossier racine `simple-player/` au lieu d'avoir les fichiers directement à la racine. Résultat : `deploy.bat` extrayait tout dans `F:\GitHub Repo\simple-player\simple-player\`, et `run.bat` continuait de lancer l'ancienne v1.9.1 restée à la racine. **Aucune des versions 1.9.2 à 1.12.0 n'a réellement tourné chez toi** — ce qui explique que rien ne changeait (position de fenêtre, immersif 5 s, volume, erreurs Spotify). Ce zip-ci est de nouveau à plat.

**À faire une fois :** supprime le dossier `F:\GitHub Repo\simple-player\simple-player` (copie en trop, probablement poussée sur GitHub aussi), puis lance deploy.bat et run.bat.

Revue complète du code (sécurité, propreté, performance) :
- **Sécurité** : fenêtre en mode `sandbox`, navigation et nouvelles fenêtres bloquées, Content-Security-Policy dans la page (seul api.spotify.com est joignable), texte de recherche échappé avant affichage, URLs d'images filtrées (https uniquement), entrées IPC validées, l'objet d'événement IPC n'est plus transmis à la page.
- **Position de fenêtre** : sauvegarde différée de 300 ms pendant le déplacement (au lieu de dizaines d'écritures disque par seconde) ; si l'écran sauvegardé n'existe plus (moniteur débranché), la fenêtre se recentre au lieu d'apparaître hors écran.
- **Performance** : le sondage Spotify (toutes les 2 s) ne fait plus qu'une requête à la fois et se met en pause quand la fenêtre est cachée dans le tray.
- **Propreté** : encodage UTF-8 déclaré, commentaires périmés (Web Playback SDK) corrigés, code mort retiré.

## v1.12.0 — 23 octobre 2026

- **Volume en mode idle, refait selon ta description.** Une zone tactile invisible couvre maintenant **tout l'espace entre le bord droit de la pochette et le bord de la fenêtre** (sa largeur suit la taille réelle de la pochette). Un **tap** dans cette zone fait apparaître la barre de volume, qui glisse depuis la droite. Une fois visible, **glisse le doigt vers le haut/bas dans cette même zone** pour régler le son. La barre se recache toute seule après 2,5 secondes sans interaction.
- **Bande noire du haut supprimée.** Plus de barre "Simple Player" en haut du player : il ne reste que le bouton plein écran, en haut à droite (toujours caché en mode idle, comme avant).
- **Version affichée** dans le titre de la fenêtre Windows : "Simple Player v1.12.0".
- Immersive mode : le délai par défaut est bien de 5 secondes (c'était déjà le cas depuis la v1.10.1 — si tu testais une version plus ancienne, c'est pour ça).

## v1.11.1 — 23 octobre 2026

- **Trouvé une cause probable et sérieuse pour la position de fenêtre qui ne se garde pas : rien n'empêchait d'avoir plusieurs copies de Simple Player ouvertes en même temps.** Fermer avec le X ne quitte pas vraiment l'app (elle se cache dans le tray, volontairement) — donc si tu relances l'app sans passer par "Quitter" dans le tray, une **deuxième** copie démarre, avec sa propre fenêtre, et les deux se marchent dessus en écrivant dans le même fichier de réglages. Une ancienne copie oubliée en arrière-plan peut très bien réécrire par-dessus la position que tu viens d'ajuster dans la nouvelle. C'est corrigé : une seconde tentative de lancement ramène maintenant simplement la fenêtre existante au premier plan, au lieu d'en ouvrir une nouvelle.
- **Ajouté, comme tu l'as suggéré** : dans Settings → "Window position", deux boutons pour sauvegarder ou restaurer la position manuellement, en filet de sécurité si jamais la sauvegarde automatique semble ne pas fonctionner.
- Si le problème persiste même après cette mise à jour (en étant sûr de n'avoir qu'une seule copie ouverte), dis-le-moi — on creusera plus loin.

## v1.11.0 — 23 octobre 2026

**Nouveau geste pour le volume en mode idle, suite à ta suggestion.** Le geste "glisser n'importe où sur la pochette pour ajuster le son" s'est révélé trop peu fiable sur tactile (deux corrections n'ont pas suffi), donc je l'ai remplacé par une approche plus simple, comme tu l'as proposé :

- La pochette ne gère plus que : **tap** = play/pause, **glisser horizontalement** = changer de piste.
- **Toucher le bord droit de l'écran** (là où se trouve la barre de volume, même quand elle est invisible en idle) la fait apparaître immédiatement, et tu peux continuer à glisser le doigt vers le haut/bas dans ce même geste pour régler le son.

## v1.10.2 — 23 octobre 2026

- **Trouvé la vraie cause de la barre de volume invisible — spécifique au tactile.** `touch-action:pan-y` était posé sur la zone de swipe, ce qui dit explicitement à Chromium (le moteur derrière Electron) de prendre lui-même en charge le geste vertical, comme un scroll natif. Sur tactile, ça annulait notre propre geste (volume) en plein milieu, avant que la barre ait eu le temps de s'afficher — alors qu'à la souris, cette propriété n'a aucun effet, donc ça marchait très bien (ce qui m'a mis sur la piste). Remplacé par `touch-action:none`, puisqu'on gère déjà nous-mêmes les deux axes (horizontal = changer de piste, vertical = volume). Merci d'avoir précisé que ça marchait à la souris — sans ce détail, je n'aurais pas trouvé celle-là.

## v1.10.1 — 23 octobre 2026

- **Trouvé et corrigé : "Could not reach Spotify" partout, et rien ne joue, même connecté.** La vraie cause : l'app vérifiait seulement si un jeton de connexion *existait*, jamais s'il était encore valide. Si ce jeton était mort (révoqué, ou un reliquat de l'ancien dossier de stockage d'avant le correctif v1.9.2), l'app continuait d'afficher "Connecté" alors qu'aucun appel à Spotify ne pouvait réellement passer. Maintenant, si ça arrive, l'app efface ce jeton mort, affiche "Not connected" dans Settings, et te dit clairement d'aller te reconnecter — au lieu du message vague d'avant. **Si tu vois encore "Could not reach Spotify" après cette mise à jour : va dans Settings et reconnecte-toi à Spotify.** Si le problème persiste même après une reconnexion fraîche, dis-le-moi, ce serait autre chose.
- **Barre de volume invisible en idle, corrigé.** En mode immersif (idle), la pochette d'album récupère l'espace normalement réservé à la barre de volume (puisqu'elle est censée être cachée). Mais quand tu glissais le doigt pour ajuster le son, cet espace n'était jamais restitué à la barre, qui redevenait donc techniquement visible mais écrasée par la pochette, désormais énorme. C'est corrigé : l'espace est maintenant restitué pendant que tu glisses, pochette comprise.
- Immersive mode : délai par défaut avant l'effacement de l'interface passé de 3 à 5 secondes.

## v1.10.0 — 23 octobre 2026

**Nouveau réglage : "Ghost Spotify"** (désactivé par défaut, dans Settings). Une fois activé : quand Simple Player détecte qu'aucun appareil Spotify n'est actif nulle part (au lancement, et chaque fois qu'une commande échoue avec "no active device"), il lance automatiquement le **vrai client Spotify officiel** installé sur ton ordinateur, en arrière-plan, et tente de le masquer de la barre des tâches. Quand tu fermes Simple Player, ce Spotify "fantôme" se ferme avec lui — mais seulement celui que Simple Player a lui-même lancé ; si tu avais déjà Spotify ouvert avant, il n'y touche pas.

À savoir avant de l'activer :
- Fonctionne uniquement avec la **version installeur classique** de Spotify (celle de spotify.com), pas la version Microsoft Store. Si Simple Player ne trouve pas `Spotify.exe` automatiquement, un bouton apparaît dans Settings pour le localiser toi-même.
- Le masquage complet de la fenêtre utilise une manipulation Windows bas niveau (pas une fonctionnalité officielle de Spotify) — ça devrait marcher, mais si Spotify change la structure de son application un jour, ça peut recommencer à apparaître brièvement, sans que ce soit un bug de Simple Player en tant que tel. Dis-moi si tu vois la fenêtre Spotify apparaître/rester visible, pour que j'ajuste.
- **Je n'ai pas pu tester ça moi-même** (pas de Windows ni de Spotify installés dans mon environnement) — c'est du code écrit selon les API Windows documentées, mais le vrai test, c'est le tien. N'hésite pas à me dire précisément ce qui se passe si ce n'est pas parfait du premier coup.

## v1.9.2 — 23 octobre 2026

- **Trouvé et corrigé : la position de la fenêtre (et d'autres réglages) qui semblait ne pas être enregistrée.** La vraie cause : selon la façon dont l'app était lancée (via `run.bat` en mode développement, ou via la version installée), Windows et Electron ne se mettaient pas d'accord sur **quel dossier** utiliser pour sauvegarder tes réglages (`%APPDATA%\simple-player` d'un côté, `%APPDATA%\Simple Player` de l'autre). Du coup, position de fenêtre, zoom, démarrage automatique, et même ta connexion Spotify, pouvaient sembler "oubliés" simplement parce qu'ils avaient été écrits dans l'autre dossier la fois précédente. C'est maintenant corrigé : un seul dossier est utilisé, peu importe comment tu lances l'app. J'ai aussi ajouté une sauvegarde de sécurité supplémentaire au moment de la fermeture, au cas où Windows interromprait l'app avant qu'elle ait fini de sauvegarder normalement.
  - **Si tu utilises la version installée (le `.exe`) depuis le début**, rien ne devrait changer pour toi : c'est déjà le dossier qu'elle utilisait. Si en revanche tu as aussi testé via `run.bat`, ces réglages-là (position de fenêtre, et potentiellement la connexion Spotify) ne seront pas récupérés automatiquement — il faudra juste re-régler la fenêtre et te reconnecter à Spotify une fois après cette mise à jour, après quoi ça restera stable.

## v1.9.1 — 23 octobre 2026

- Les erreurs Spotify sont maintenant précises partout (play/pause/suivant/précédent/shuffle/repeat/Library/Search) : si Spotify refuse une commande parce qu'**aucun appareil n'est actif**, tu vois maintenant exactement ce message au lieu de "Could not reach Spotify" ou d'un échec silencieux. C'est très probablement la vraie cause de ce que tu observais.

## v1.9.0 — 23 octobre 2026

- Dans **Library**, tes **vraies playlists** s'affichent maintenant en premier. **Liked Songs** vient après, et apparaît comme un dossier replié (juste une rangée avec le nombre de chansons) — clique dessus pour dérouler la liste complète.
- **Shuffle et Repeat** : j'ai ajouté un vrai message d'erreur ("Spotify refused that") si l'activation échoue réellement côté Spotify, plutôt que le bouton qui se rallume puis s'éteint sans explication. J'ai aussi ajouté une petite protection pour qu'une vérification automatique (toutes les 2 secondes) n'annule pas ton changement avant que Spotify ait eu le temps de le confirmer. **Si le bouton ne reste toujours pas allumé après cette mise à jour, dis-moi exactement ce qui s'affiche** (le bouton redevient gris tout seul ? un message apparaît ?) — ça me dira si c'est Spotify qui refuse la commande plutôt qu'un bug d'affichage.

## v1.8.0 — 23 octobre 2026

- **Important : retour en arrière sur la barre du bas.** La rendre cachée par défaut (depuis la v1.4.0) causait plus de problèmes qu'elle n'en résolvait — sa zone de détection a fini par voler les clics du bouton "+". La barre Player/Library/Search/Settings est donc de nouveau **toujours visible** (comme dans le mockup original), et se cache seulement en mode idle comme le reste de l'interface. Le bouton "+" refonctionne normalement : il ouvre bien le menu "ajouter à une playlist".
- **Library** est maintenant bien centré sous le "+", avec **Player** et **Search** à égale distance de chaque côté.
- **Shuffle et Repeat sont maintenant vraiment indépendants** : chacun ne touche plus que son propre bouton et son propre appel à Spotify — avant, une coïncidence de timing entre les deux pouvait donner l'impression qu'ils s'influençaient.
- Le bouton **Play/Pause** change d'icône **immédiatement** au clic, au lieu d'attendre jusqu'à 2 secondes la prochaine vérification de l'état réel.
- La **barre de progression** peut maintenant être glissée avec le doigt pour avancer/reculer dans la chanson (avant, seul un tap fonctionnait) — et sa zone tactile a aussi été élargie, comme celle du volume.

## v1.7.0 — 22 octobre 2026

**La Bibliothèque et la Recherche sont maintenant réelles** — c'était le dernier gros morceau marqué comme fictif dans le projet.

- L'onglet **Library** affiche tes vraies Liked Songs (jusqu'à 100) et tes vraies playlists, avec leurs vraies pochettes.
- Cliquer sur une chanson de Liked Songs la joue réellement sur ton appareil actif ; cliquer sur une playlist la lance réellement.
- L'onglet **Search** interroge maintenant vraiment Spotify pendant que tu tapes, et cliquer sur un résultat le joue réellement.
- La chanson actuellement en train de jouer est maintenant surlignée dans la Bibliothèque et la Recherche, basé sur son vrai identifiant (pas son titre — plus fiable si deux chansons ont le même nom).
- Tant que tu n'es pas connecté à Spotify, Library/Search affichent encore les données fictives de démonstration comme avant (utile pour essayer l'interface sans compte).

**Limite à savoir** : comme toujours avec Simple Player (une télécommande, pas le lecteur lui-même), ça suppose qu'un appareil Spotify est déjà actif quelque part (téléphone, ordi, enceinte) — sinon Spotify n'a rien à qui envoyer l'ordre de lecture.

## v1.6.0 — 22 octobre 2026

**Important : reconnexion Spotify requise.** Ajouter une chanson à une vraie playlist demande une permission Spotify que l'app ne demandait pas encore. Va dans **Settings → Spotify Account → Disconnect, puis Connect to Spotify à nouveau** et accepte les permissions — sinon tu auras un message "Reconnect Spotify in Settings" en essayant d'ajouter à une playlist.

- Le bouton "+" affiche maintenant tes **vraies playlists Spotify** (plus des données fictives), et y ajouter une chanson l'ajoute **réellement** sur ton compte.
- Quand une chanson est ajoutée à une playlist (ou à Liked Songs), la petite tique verte en haut devient verte pour le confirmer. **Limite à savoir** : comme Spotify n'offre pas de façon simple de vérifier "cette chanson est-elle déjà dans une de mes playlists", la tique ne reflète que les ajouts faits depuis Simple Player pendant la session en cours — pas les chansons déjà présentes dans tes playlists avant.
- Correction : en mode idle, la pochette était décalée vers la gauche (l'espace réservé pour le rail de volume à droite restait en place même si le rail devenait invisible). Elle est maintenant bien centrée.

## v1.5.0 — 21 octobre 2026

**Corrections suite à tes tests sur la v1.4.0** :

- **Important, barre du bas** : le geste pour faire réapparaître la barre Player/Library/Search/Settings était trop difficile à déclencher et pouvait te laisser sans accès aux réglages. La zone au bas de l'écran est maintenant beaucoup plus grande, marquée par une petite poignée visible, et **un simple tap sur cette zone fonctionne aussi** (en plus du glisser vers le haut) — donc il y a toujours un moyen garanti d'y revenir.
- **Pochette carrée** : le système précédent (basé sur les pourcentages d'écran) ne donnait pas toujours un carré parfait, surtout en mode idle. Remplacé par un calcul qui mesure l'espace réellement disponible à chaque instant (redimensionnement, changement de zoom, bascule idle) et force toujours la même valeur en largeur et en hauteur — donc un carré garanti, peu importe le zoom ou la taille de fenêtre.
- **Barre noire en haut en mode idle** : la zone du titre (en haut) restait réservée, même invisible, en mode idle. Elle se referme maintenant complètement, comme la barre du bas, et le lecteur utilise toute la fenêtre.
- Le symbole pause reste maintenant affiché sur la pochette tant que la musique est en pause (avant, il ne s'affichait qu'en touchant/pressant l'écran).
- En glissant vers le haut/bas sur la pochette en mode idle pour ajuster le volume, le repère de volume redevient visible pendant le geste, pour voir le niveau et la direction.
- Shuffle et Repeat s'allument maintenant en **vert plein** (comme le bouton Play) au lieu d'un vert pâle à peine visible.
- La zone tactile du réglage de volume (le petit rail à droite) est maintenant beaucoup plus large qu'avant, sans changer son apparence — pour éviter de la rater du doigt.

## v1.4.0 — 21 octobre 2026

**Correction de bug important** : à un zoom élevé, la pochette (dimensionnée en pourcentages de l'écran) ne tenait plus compte de l'espace réellement disponible et débordait par-dessus les boutons et la barre du bas — exactement ce que montraient tes captures. Corrigé en profondeur : la pochette s'ajuste maintenant toujours à l'espace réellement libre, peu importe le niveau de zoom ou la taille de la fenêtre.

Nouveaux comportements tactiles, sur demande :
- La barre Player/Library/Search + Settings est maintenant **cachée par défaut, partout**. Pour la faire apparaître : glisse vers le haut depuis le tout bas de l'écran (comme la barre de navigation d'un téléphone Android). Elle se recache automatiquement après quelques secondes.
- En mode idle (pochette agrandie), **un seul tap** bascule toujours play/pause — mais n'en sort plus. Il faut un **double tap** pour revenir à l'affichage complet.
- **Glisser le doigt vers le haut ou le bas sur la pochette** augmente ou diminue le volume.

## v1.3.1 — 21 octobre 2026

- Les paliers de zoom dans Settings sont relevés (Normal = 1.2×, Large = 1.6×, Extra large = 1.9×) et une nouvelle installation démarre maintenant directement à 1.6× par défaut.

**Important** : comme tu as déjà lancé l'app une fois, ton réglage de zoom est déjà sauvegardé sur ton disque à son ancienne valeur — ce nouveau défaut ne s'applique qu'aux installations neuves. Va dans Settings → Interface size et clique "Large" ou "Extra large" une fois ; ça restera ensuite.

## v1.3.0 — 21 octobre 2026

**Correction de bug important** : Simple Player ne reflétait pas la musique jouée depuis un autre appareil (ton téléphone, par exemple). Cause réelle : au démarrage, l'app s'accaparait le statut d'appareil actif Spotify, donc elle ne pouvait voir que son propre état, jamais celui d'un autre appareil. L'architecture a été corrigée : Simple Player agit maintenant comme une vraie télécommande, en interrogeant l'état réel de ton compte toutes les 2 secondes et en envoyant ses commandes à l'appareil actif, peu importe lequel. Ça devrait maintenant se synchroniser correctement, d'où que vienne la musique.

- Correction : la transition du mode idle (agrandissement de la pochette) était saccadée après un swipe — un style laissé en place par l'animation de swipe bloquait silencieusement l'animation d'agrandissement. Corrigé, et la transition est maintenant plus douce (effet "zoom").
- Ajout du zoom de l'interface : Ctrl + molette de souris, ou Ctrl +/-/0 au clavier, comme dans Chrome. Un réglage "Interface size" (Normal/Large/Extra large) a aussi été ajouté dans les Settings pour les cas où ça ne marche pas à la souris.

## v1.2.0 — 21 octobre 2026

- La lecture de musique est maintenant **réelle** : une fois connecté, Simple Player devient un vrai appareil Spotify Connect (comme une enceinte ou un autre téléphone).
- Play/pause, suivant, précédent, volume, shuffle et repeat envoient de vraies commandes à Spotify.
- La pochette, le titre, l'artiste et la progression affichés sont ceux réellement en train de jouer — et si tu changes de musique depuis ton téléphone ou un autre appareil, Simple Player se met à jour tout seul.
- Le bouton "+" → "Liked Songs" ajoute réellement la chanson à tes Liked Songs sur Spotify.
- Le nom de la playlist en haut à gauche s'affiche maintenant pour de vrai quand la lecture vient d'une de tes playlists.

**Pas encore fonctionnel** : les onglets Bibliothèque et Recherche affichent encore des données fictives de démonstration — pas encore branchés sur ton vrai compte. C'est la prochaine étape.

## v1.1.0 — 21 octobre 2026

- Le bouton "Connect to Spotify" dans les réglages fonctionne maintenant pour vrai : il ouvre la page de connexion officielle Spotify dans ton navigateur, récupère automatiquement la réponse, et t'affiche "Connected" une fois terminé.
- Le jeton de connexion est stocké chiffré sur ton disque (grâce au coffre-fort de Windows) — tu n'auras pas à te reconnecter à chaque lancement.
- Ajout du bouton "Disconnect" (même bouton, une fois connecté) pour retirer ton compte de l'app.
- Ajout du README.md et de ce journal des versions.

**Pas encore fonctionnel** : la connexion s'établit, mais rien n'écoute encore de musique — le Web Playback SDK et les vraies données (bibliothèque, recherche, lecture) ne sont pas encore branchés. C'est la prochaine étape.

## v1.0.0 — 21 octobre 2026

Première version du vrai code (au-delà du prototype).

- Fenêtre Windows fonctionnelle (Electron) : redimensionnable, plein écran, minimisable.
- Position et taille de la fenêtre mémorisées d'une session à l'autre.
- Icône dans la zone de notification (tray) avec menu "Afficher" / "Quitter".
- Raccourcis clavier Espace (lecture/pause), ← (précédent), → (suivant), actifs seulement quand la fenêtre a le focus.
- Réglage "démarrage avec Windows" réellement fonctionnel (plus seulement visuel).
- Vérification automatique des mises à jour à chaque lancement de l'app.
- Interface reprise telle quelle du mockup validé (lecteur, bibliothèque, recherche, réglages, swipe tactile, icône de l'app).

**Pas encore fonctionnel** : la connexion Spotify est préparée (Client ID, adresse de redirection) mais pas encore branchée — impossible pour l'instant de réellement se connecter ou écouter de la musique. C'est la prochaine étape.
