# Journal des versions

Ce fichier résume ce qui change à chaque fois que je te donne une nouvelle version à envoyer sur GitHub.

## v1.21.9 — 25 novembre 2026

- **Volume en glissant la pochette (mode immersif / plein écran)** : un doigt posé sur la pochette qui monte ou descend change le volume (monter = plus fort). La pochette suit le doigt avec une résistance croissante, sans jamais atteindre la tique au-dessus ni le titre en dessous (6 px de marge au minimum, 120 px de course maximum), puis revient doucement au centre au relâchement. La barre de volume s'affiche pendant le geste. Le tap (pause / lecture), le glissement horizontal (piste suivante / précédente), la bande de volume sur le côté et le balayage vers le haut sous la pochette fonctionnent comme avant. Hors mode immersif, rien ne change.
- **Un peu de place réservée autour de la pochette en mode immersif** pour que le glissement soit visible : sur les fenêtres peu hautes (par exemple 1366×768), la pochette est environ 14 % plus petite qu'avant, et la tique est remontée de 10 px. Sur les écrans hauts (portrait), aucun changement de taille.
- **Tous les messages visibles par l'utilisateur sont en anglais** (cette partie, prévue pour la v1.21.9 précédente, n'était jamais arrivée sur GitHub) : menu de la barre des tâches (« Show Simple Player » / « Quit »), fenêtres de choix de fichiers et de dossiers, fenêtre « Update available » (Later / Install now), fenêtre « Permission needed » (reconnexion Spotify), messages d'erreur courts, et page de confirmation de connexion Spotify.
- **Installateur Windows toujours en anglais**, quelle que soit la langue de Windows (`language: 1033`, installateur multilingue désactivé). Les menus internes de Chromium (clic droit) sont aussi forcés en anglais.

## v1.21.8 — 17 novembre 2026

- **Mises à jour automatiques réparées** : l'application installée cherche les nouvelles versions dans les *Releases* GitHub, or ton `deploy.bat` ne fait que pousser le code. Ajout de `.github/workflows/release.yml` : à chaque push avec un nouveau numéro de version, GitHub construit l'installateur Windows et publie la Release tout seul. La Release est publiée directement (pas en brouillon, sinon l'app ne la voit pas).
- **Nom de l'installateur sans espaces** (`Simple-Player-Setup-X.exe`) : les espaces sont remplacés par des points sur GitHub, ce qui casse la mise à jour automatique.

## v1.21.7 — 17 novembre 2026

- **Boutons précédent / suivant / shuffle / repeat au doigt** : sur un PC Windows qui a à la fois un écran tactile et une souris, Chromium considère que « le survol existe » même quand on tape au doigt. Un tap laissait donc le fond de survol (presque noir) collé sur le bouton, et le doigt ne pouvait pas l'enlever. Le survol ne s'applique maintenant que si le dernier pointeur utilisé est la souris ; dès qu'on touche l'écran il est désactivé, et il revient au premier mouvement de souris. Le comportement à la souris ne change pas.

## v1.21.6 — 16 novembre 2026

- **Onglets du bas rapprochés de 20 px** : l'espace entre deux onglets passe de 70 à 50 px (taille de référence, avant zoom). Le bloc reste centré sous le play et le « + ».

## v1.21.5 — 16 novembre 2026

- **Bouton Settings (roue) réduit d'un quart** : icône de 48 à 36 px, bouton de 64 à 48 px. Son centre ne bouge pas.

## v1.21.4 — 16 novembre 2026

- **Les 4 onglets du bas (Search / Player / Library / Local) sont toujours centrés** dans la fenêtre, quelle que soit sa taille. Avant, c'était l'onglet Player seul qui était sur l'axe central, donc le groupe paraissait décalé vers la droite. Sur une fenêtre étroite, l'espace entre les onglets se resserre pour que le groupe reste centré sans toucher la roue des réglages.

## v1.21.3 — 15 novembre 2026

- **Boutons shuffle / repeat (et play) noirs après un clic.** Une règle CSS destinée à effacer le surlignage du bouton qu'on vient de cliquer (`.ctrl:focus… background:transparent`) était plus forte que celle qui met le fond vert des boutons actifs. Résultat : juste après le clic, le bouton activé perdait son fond vert et ne gardait que son icône sombre — donc « noir » sur l'écran — jusqu'à ce qu'on clique ailleurs. Le bouton play était touché de la même façon. La règle ne s'applique plus qu'aux boutons inactifs. Ce n'était pas propre au plein écran : le défaut se produisait à toutes les tailles.
- Un bouton cliqué à la souris ou au doigt ne garde plus le focus clavier (sinon la touche Espace ou Entrée suivante le ré-actionnait).

## v1.21.2 — 14 novembre 2026

**Choix de la playlist au moment de l'ajout — vérifié, et deux défauts corrigés**
- **La tique ouvre maintenant la liste des playlists dans les deux modes.** Avant, elle ne réagissait qu'en mode idle ; en mode normal seul le « + » ouvrait la liste. Sa zone tactile est un peu élargie (l'icône ne fait que 22 px).
- **Tique inutilisable en mode idle plein écran (depuis la v1.20.74).** La bande « survol en haut = sortie du mode idle » faisait 60 px de haut et recouvrait la tique : y poser le doigt ou la souris faisait quitter le mode idle au lieu d'ouvrir la liste. La bande est réduite au bord supérieur de l'écran (4 px) et ne réagit plus qu'à une vraie souris (un appui tactile ne compte plus comme un survol).
- Rappel du fonctionnement, vérifié par test : « + » ou tique → liste « Liked Songs » + toutes les playlists du compte que tu peux modifier (les tiennes et les collaboratives), avec une coche sur celles qui contiennent déjà le titre ; on choisit, le titre est ajouté à celle-là. La liste défile s'il y en a beaucoup ; toucher à côté la ferme sans rien ajouter.

## v1.21.1 — 14 novembre 2026

**Bibliothèque et playlists Spotify — cause trouvée : Spotify a supprimé les routes que l'app utilisait.** Depuis le 9 mars 2026, les applications en « Development Mode » (c'est le cas de Simple Player) n'ont plus accès à plusieurs routes de l'API Web. L'app appelait encore les anciennes, qui échouaient en silence :

| Ce que faisait l'app | Ancienne route (supprimée) | Nouvelle route utilisée |
|---|---|---|
| Ajouter un titre à une playlist | `POST /playlists/{id}/tracks` | `POST /playlists/{id}/items` |
| Lire le contenu de mes playlists (pour la tique) | `GET /playlists/{id}/tracks` (100 par page) | `GET /playlists/{id}/items` (50 par page maximum) |
| Savoir si un titre est liké | `GET /me/tracks/contains` | `GET /me/library/contains?uris=…` |
| Ajouter à Liked Songs | `PUT /me/tracks` | `PUT /me/library?uris=…` |

- **Ajout à une playlist** : fonctionne de nouveau ; plus de doublon possible (un 2e appui sur la même playlist affiche « Already in … » au lieu d'ajouter le titre une seconde fois).
- **Tique** : verte si le titre est dans Liked Songs **ou** dans une de tes playlists. Corrigé aussi : elle gardait l'état du titre *précédent* tant que Spotify n'avait pas répondu ; elle se met maintenant à jour immédiatement au changement de piste.
- **Playlists entières** : le contenu n'était lu que jusqu'au 600e titre, et un « trop de requêtes » de Spotify laissait une playlist à moitié lue. Tout est lu (jusqu'à 10 000 titres par playlist), avec attente et nouvel essai si Spotify demande de ralentir.
- **Mémorisé entre deux lancements** : le contenu des playlists est gardé en cache avec leur numéro de version Spotify ; au lancement, seules les playlists modifiées sont relues, donc la tique est juste dès la première seconde. Les changements faits depuis l'app Spotify sont repris à l'ouverture du menu « + ».
- **Menu « + »** : une coche indique Liked Songs et les playlists qui contiennent déjà le titre en cours.
- **Onglet Library** : la liste Liked Songs se met à jour après un ajout, et le compteur affiche le vrai total du compte (il plafonnait à 100).
- Un « 404 » sur une route de bibliothèque n'est plus pris pour « aucun appareil actif » (ce qui lançait Ghost Spotify pour rien).

**Non fait volontairement** : retirer un titre d'une playlist ou de Liked Songs depuis l'app (risque de suppression par un appui accidentel) — à ajouter si tu le veux.

**Limites** : testé avec une API Spotify simulée d'après la documentation officielle de mars 2026, pas sur ton vrai compte (je n'y ai pas accès). Sources : guide de migration et changelog de février 2026 sur developer.spotify.com.

## v1.21.0 — 14 novembre 2026

**Nouveau : lecture des fichiers de ton ordinateur (onglet « Local »)**
- **Nouvel onglet « Local »** dans la barre du bas, entre Library et la roue des réglages (icône liste de lecture).
- **Trois façons d'ajouter de la musique** : « Add files… » (sélecteur de fichiers Windows), « Add folder… » (un dossier d'artiste ou d'album, parcouru avec tous ses sous-dossiers), ou **glisser-déposer** des fichiers / un dossier n'importe où sur la fenêtre (un voile « Drop to add… » apparaît, l'onglet Local s'ouvre tout seul). Pas de doublons si on rajoute le même dossier.
- **Formats** : MP3 (CBR et VBR, tous débits) et FLAC (16 ou 24 bits, 44,1 à 192 kHz), plus WAV, OGG, Opus et M4A/AAC. Le décodage est fait par le moteur audio de Chromium intégré à l'app.
- **Tags lus** pour MP3 (ID3v2.2/2.3/2.4) et FLAC : titre, artiste, album, n° de piste et de disque, année, pochette intégrée. Sans tag (ou pour les autres formats), le titre / l'album / l'artiste sont déduits des noms de fichier et de dossiers (`Artiste/Album/01 - Titre.mp3`), et la pochette d'un `cover.jpg` / `folder.jpg` posé dans le dossier.
- **Liste triée** par artiste, album (par année), disque et piste, avec la **qualité affichée** sur chaque ligne (« FLAC 24-bit / 96 kHz », « MP3 320 kbps », « VBR »…) et la durée.
- **Lecture dans le Player habituel** : pochette, fond teinté aux couleurs de la pochette, barre de progression (clic et glisser), suivant / précédent (swipe, boutons, flèches du clavier), pause (bouton, tap sur la pochette, barre d'espace), shuffle, repeat, enchaînement automatique des pistes, mode idle. La pastille en haut à gauche indique l'album et la qualité.
- **Volume propre aux fichiers locaux** (mémorisé), réglé par la même barre / la molette.
- **Cohabitation avec Spotify** : lancer un fichier local met Spotify en pause ; choisir un titre Spotify (ou « Stop local playback ») rend la main à Spotify. Le bouton « + » (ajout à une playlist Spotify) affiche un message en mode local.
- **Liste mémorisée** entre deux lancements. Un fichier déplacé ou supprimé est signalé, grisé, et la lecture passe au suivant. « Clear list » (deux pressions) vide la liste — sans toucher aux fichiers.
- Nouveau fichier `src/localMusic.js` (recherche des fichiers + lecture des tags, sans dépendance supplémentaire).

**Testé** dans la vraie application Electron (sous Linux) avec de vrais fichiers : lecture réelle des 11 fichiers de test (MP3 CBR/VBR, FLAC 16/44,1 – 24/96 – 24/192, WAV, OGG, Opus, M4A), seek, fin de piste, shuffle, repeat, volume, fichier manquant, persistance. **Non testé** : sous Windows même ; le glisser-déposer d'un *dossier* depuis l'Explorateur (seul le dépôt d'un fichier a pu être simulé) ; de très grosses bibliothèques (limite fixée à 20 000 fichiers).

**Corrige aussi** : le zip v1.20.76 contenait par erreur une ébauche non fonctionnelle de cet onglet (boutons sans effet).

## v1.20.76 — 14 novembre 2026

Audit complet du code (main, preload, renderer) + tests automatisés de l'interface dans Chromium à plusieurs centaines de tailles de fenêtre, en mode normal et idle.

**Interface — plus aucun chevauchement, à toutes les tailles**
- **Mise à l'échelle automatique.** L'interface est conçue pour une fenêtre d'au moins 640 × 720 px (CSS). En dessous, les boutons, textes et barres (de taille fixe) ne tenaient plus : pochette réduite à 40 px, boutons shuffle/repeat hors écran, onglets sous la roue des réglages, barre de volume par-dessus la barre de progression… Désormais, sous cette taille, toute l'interface est calculée à sa taille de référence puis réduite d'un bloc pour tenir dans la fenêtre : tout rétrécit ensemble et garde sa place. À 640 × 720 et au-delà, rien ne change.
- **Tique « liké » qui touchait la pochette** (fenêtres de 450 à 900 px de haut, mode normal et idle) : la pochette laisse maintenant toujours la place à la tique, avec une marge.
- **Titres longs.** Un titre ou un artiste long traversait toute la fenêtre et passait par-dessus la barre de volume (les « … » prévus ne s'appliquaient jamais). Ils sont maintenant coupés proprement avec « … », en mode normal comme en idle.
- **Mode idle** : le « 85 % » sous la barre de volume ne sort plus de la fenêtre et ne touche plus le titre sur les fenêtres étroites.
- **Pastille du nom de playlist** : elle s'arrête avant la pochette quand celle-ci monte jusqu'à elle (nom long).
- **Fond animé après redimensionnement.** Le canvas gardait son ancienne taille quand la fenêtre changeait (dont le passage en plein écran du mode idle) : le fond ne couvrait plus toute la zone et repassait en basse résolution. Il suit maintenant la fenêtre en permanence, toujours en 2× minimum.
- **Recalage automatique de la pochette** quand la place disponible change sans redimensionnement (fin du morph idle, chargement des polices, titre plus long).
- Le menu « + », les dialogues, l'invite de mise à jour et les messages (toast) suivent la même mise à l'échelle et restent entièrement dans la fenêtre.

**Volume**
- **Cause réelle trouvée pour les sauts de volume.** Connecté à Spotify, la barre *réglait* le volume Spotify mais *affichait* le volume Windows (resynchronisé toutes les 3 s). Au moindre contact (cran de molette, doigt sur le rail ou sur la zone de droite en idle), c'est donc le niveau Windows qui était envoyé à Spotify → saut brutal du son. La barre affiche maintenant le volume qu'elle contrôle : celui de l'appareil Spotify quand on est connecté (lu à chaque poll, donc à jour aussi si on le change depuis le téléphone), celui de Windows sinon.
- La molette au-dessus du menu « + » fait défiler la liste au lieu de changer le volume.

**Bugs corrigés**
- **Dialogue « Permission manquante » invisible** (ajout à une playlist refusé par Spotify) : la boîte était créée hors de l'écran, on ne voyait qu'un voile sombre.
- **Messages invisibles hors de l'onglet Player** (« Position saved », erreurs de recherche…) : le toast vivait dans la vue Player, masquée ailleurs.
- **Taille plein écran mémorisée par erreur** : quitter l'app en mode idle (plein écran) faisait rouvrir la fenêtre à la taille de l'écran entier.
- **Idle + F11** : si la fenêtre est déjà en plein écran, la sortie du mode idle ne la sort plus du plein écran.
- **Background On + animation Off** affichait un fond noir : on retrouve un fond teinté fixe (comme avant le passage au canvas). Idem en pause.
- **Tique « liké »** : une réponse tardive de Spotify pour l'ancienne piste ne peut plus modifier la tique de la piste en cours ; même protection pour les couleurs du fond.
- **Réglages non mémorisés** : la largeur de la barre de volume et le délai du mode idle sont maintenant conservés entre deux lancements.
- **Icône de la zone de notification** : `build/icon.ico` et `build/icon_tray.png` n'étaient pas inclus dans l'application installée (le dossier `build/` n'est pas empaqueté par défaut) ; ils le sont maintenant, avec un repli si l'un manque.
- Couleur de base du fond mal calculée pour une couleur hexadécimale (même bug que la v1.20.69, un second endroit).
- Numéro de version échappé dans l'invite de mise à jour ; remarque « not in this preview » masquée dans la vraie app.

**Optimisations**
- L'animation du fond s'arrête quand l'onglet Player n'est pas affiché, et ne recalcule plus ses couleurs à chaque image (préparées une fois par pochette).
- Hors de l'onglet Player, chaque mouvement de souris relançait une animation et deux recalculs de mise en page : supprimé.
- Le minuteur de progression n'est plus recréé à chaque poll (toutes les 2 s).
- L'animation d'entrée/sortie du mode idle n'est plus coupée avant sa fin (380 ms au lieu de 600).

**Volontairement inchangé** : le réglage Windows « ducking » ajouté en v1.20.75 est conservé, mais son explication d'alors était en partie fausse (le ducking ne modifie pas le volume général que lit la barre) — la cause démontrée est celle décrite ci-dessus.

**Limites** : tout a été testé dans Chromium avec une simulation de l'API Electron et de Spotify ; je n'ai pas pu lancer la vraie application Windows ici (volume Windows, plein écran natif, installeur et icône de la zone de notification restent à vérifier chez toi).

## v1.20.75 — 27 octobre 2026

- **Volume : plus de baisse aléatoire.** Double fix : (1) au démarrage, l'app désactive le "Communications Ducking" Windows (la feature qui baisse tous les sons quand Teams/Discord/etc. ouvre une session audio) via une clé registre `HKCU` — non-destructif, par utilisateur, réversible. (2) la synchronisation du volume toutes les 3s requiert désormais deux lectures consécutives identiques avant de mettre à jour la barre — les dips transitoires d'une seule poll (ducking résiduel, bruit système) sont filtrés et n'affichent plus de saut visuel.

## v1.20.74 — 27 octobre 2026

- **Mode idle plein écran.** En mode idle, la fenêtre passe automatiquement en fullscreen — la titlebar Windows disparaît et le fond animé prend tout l'espace sans bordure. Pour sortir : déplacer la souris dans les 60px du haut de l'écran (la titlebar réapparaît) ou double-tap sur la pochette. F11 reste fonctionnel indépendamment.

## v1.20.73 — 27 octobre 2026

- **Animation background — centre invisible, dégradé vraiment smooth.** Profil corrigé : décroissance exponentielle depuis le centre (alpha plein → 0), pas de pic intermédiaire qui créait l'anneau visible. Rayons des spotlights augmentés (r:1.2–1.6×) pour qu'ils soient vraiment diffus sur toute la scène.

## v1.20.72 — 27 octobre 2026

- **Animation background — dégradés parfaitement lisses.** Double fix : (1) résolution forcée à minimum 2× devicePixelRatio pour éliminer le banding même sur écrans 1×; (2) profil gaussien sur les color stops (10 stops, alpha 0 au centre → pic doux à 28% → retour à 0) — supprime le "point" visible au centre de chaque spotlight et toute ligne de transition.

## v1.20.71 — 27 octobre 2026

- **Animation background — résolution physique (HiDPI).** Canvas dimensionné en pixels physiques (×`devicePixelRatio`) au lieu de CSS px. Sur un écran 2× le canvas avait la moitié de la résolution utile, ce qui créait des bandes visibles dans les dégradés. Le contexte est scalé via `setTransform(dpr,…)` pour que toutes les coordonnées restent en CSS px dans le code de dessin.

## v1.20.70 — 27 octobre 2026

- **Animation background — mouvement apériodique.** Chaque spotlight combine désormais : orbite elliptique (rotation) + dérive en translation par superposition de 3 sinus à fréquences irrationnelles (φ, √2, √3, √5, √7, √11) + variation de scale légère. Les fréquences irrationnelles garantissent mathématiquement que le pattern ne se répète jamais à l'échelle humaine. Chaque spotlight a ses propres fréquences et phases de départ → les combinaisons sont infinies.

## v1.20.69 — 27 octobre 2026

- **Animation background — bug critique : couleurs hex mal parsées.** `.match(/\d+/g)` sur `'#1a3a6e'` ne donne pas les composantes RGB (ça extrait juste `['1', '3', '6']`), donc tous les gradients étaient quasi-noirs. Fix : parsing hex correct via `parseInt(hexM[n], 16)` avec fallback rgb(). C'était la vraie cause du blocage visuel — l'animation tournait bien mais ne dessinait rien de visible.

## v1.20.68 — 27 octobre 2026

- **Animation background — RAF ne se coupe plus au démarrage.** Le bug : `setPlayIcon(false)` (appelé à l'init) annulait le RAF juste après `startBgCanvas`. Fix : découplage complet — `syncBgToPlayState(bool)` est appelé uniquement par `play()`, `pause()`, `playSavedTrack()` et le poll Spotify lors d'un vrai changement d'état. `setPlayIcon` ne touche plus au canvas.

## v1.20.67 — 27 octobre 2026

- **Animation background — mouvement visible.** Fond de base ramené à 18% de la couleur (très sombre) pour que les spotlights ressortent clairement. Gradient des spotlights étendu sur 70% du rayon. Résultat : fond sombre avec taches lumineuses colorées bien visibles qui orbitent.

## v1.20.66 — 27 octobre 2026

- **Animation background — contraste maximal style Spotify fullscreen.** Couleurs extraites sans assombrissement (×1.0), fond de base à 75% de luminosité (plus gris-noir), 4 spotlights dont un highlight quasi-blanc pour la tache lumineuse centrale, voile noir réduit à 18%. L'animation est maintenant aussi vivide que le player Spotify en plein écran.

## v1.20.65 — 27 octobre 2026

- **Animation background plus contrastée.** Alpha des spotlights augmenté (0.55→0.90, 0.42→0.75, 0.30→0.60), couleurs extraites moins assombries (×0.65→×0.85), fond de base plus clair (×0.35→×0.55), voile noir final réduit (0.55→0.30). L'animation est maintenant clairement visible.

## v1.20.64 — 27 octobre 2026

- **Animation background liée à la lecture.** L'animation canvas se stoppe quand le player est en pause et reprend automatiquement à la reprise de la lecture. Le changement passe par `setPlayIcon()` — appelé aussi bien par les contrôles manuels que par les polls Spotify.

## v1.20.63 — 26 octobre 2026

- **Animation background refaite — style vidéo de référence.** Remplacé les blobs flottants par un système de **spotlights orbitaux** : 3 gradients radiaux très larges et très doux dont les centres décrivent des ellipses lentes, en mode `screen`. Résultat : une tache lumineuse douce qui voyage lentement sur un fond teinté — exactement comme l'animation Spotify de la vidéo. Pas de blobs visibles, transitions fluides et imperceptibles. Les vitesses `normal/medium/fast` restent disponibles.

## v1.20.62 — 24 octobre 2026

- **Canvas background clippé.** Ajout de `overflow:hidden` sur `#app` — les blobs canvas ne débordent plus à l'extérieur de la fenêtre du player.
- **Slider volume centré dynamiquement.** Le track vertical est maintenant positionné par JS dans `fitArtSquare()` : centré dans la bande entre le bord droit de la pochette et le bord droit de l'application, quelle que soit la taille de la fenêtre.

## v1.20.61 — 24 octobre 2026

- **Zones idle — exactement comme l'image de référence.** La zone jaune (swipe-up pour quitter le mode idle) est maintenant restreinte au-dessous de la pochette : la position de départ du geste (`startYInZone`) doit être plus basse que `_idleArtBottom` (calculé par `fitArtSquare`). Avant, le swipe-up fonctionnait depuis n'importe où dans `#swipeZone`.
- **Background canvas moins lumineux.** Les blobs canvas étaient trop vifs (teintes jaune/brun). Alpha réduit (0.75→0.45, 0.35→0.18) et assombrissement global renforcé (0.45→0.65). Résultat : fond très discret, ambiance sombre.
- **Slider volume idle quasi pleine hauteur.** Le track vertical en mode idle couvre maintenant 15%–85% de la hauteur totale du player (pas de la zone orange). Déplacé comme enfant direct de `#swipeZone` pour que `top/bottom` soient relatifs à la pleine fenêtre. Comportement inchangé.

## v1.20.60 — 24 octobre 2026

- **Background : blobs canvas style Spotify.** Remplacé l'animation CSS par un canvas animé en JS — 6 blobs de couleur extraits de la pochette (via down-sample + quantisation) dérivent de façon indépendante avec une trajectoire sinusoïdale, fondus par `radialGradient` en mode `screen`. En mode réel, les couleurs sont extraites de la vraie pochette Spotify. Résultat : fond vivant, organique, jamais répétitif.

## v1.20.59 — 24 octobre 2026

- **Background : animation organique.** Remplacement du drift linéaire par deux animations CSS indépendantes jouées simultanément — `bgDriftMove` (déplacement spatial + scale) et `bgDriftPos` (variation de `background-position` qui morphe les couleurs du blur). Les durées sont des multiples non-entiers l'une de l'autre, donc les cycles ne se synchronisent jamais et le mouvement paraît aléatoire.

## v1.20.58 — 24 octobre 2026

- **Background animé persisté.** `bgEnabled` et `bgAnimated` étaient en RAM pure — à chaque lancement l'animation revenait à `off`. Maintenant sauvegardés dans `localStorage` (`sp_settings`) et restaurés au démarrage. Le choix de vitesse (normal/medium/fast) survit aux relances.
- **Animation forcée au démarrage.** Ajout d'un reflow (`void offsetWidth`) avant de reposer la classe `bg-animated`, pour que Chromium rejoue l'animation depuis 0% au lieu de la laisser figée.

## v1.20.57 — 24 octobre 2026

- **Idle : zone volume corrigée en hauteur.** La zone orange s'arrête maintenant au bas de la pochette (plus de chevauchement avec la zone jaune). Calcul via `offsetTop`/`offsetHeight` — cohérent avec la correction horizontale de la v1.20.56. La zone jaune (swipe) couvre bien toute la largeur sous la pochette.

## v1.20.56 — 24 octobre 2026

- **Idle : zone volume repositionnée correctement.** L'ancienne méthode (`getBoundingClientRect` avec transform temporairement effacé) donnait des coordonnées erronées à cause du padding de `#swipeZone`. Remplacé par `offsetLeft`/`offsetWidth` qui opèrent directement dans le système de coordonnées local de swipeZone, sans être affectés par les transforms CSS. La zone orange démarre maintenant exactement au bord droit de la pochette.

## v1.20.55 — 24 octobre 2026

- **Touches DevTools réactivées.** F12, Ctrl+Shift+I et Ctrl+Shift+J fonctionnent à nouveau (la désactivation de la v1.20.54 était une mauvaise interprétation de la demande).
- **Fenêtre cmd cachée au lancement.** Ajout de `run.vbs` — lance `run.bat` sans afficher de fenêtre de commande Windows. Double-cliquer sur `run.vbs` au lieu de `run.bat` pour démarrer Simple Player silencieusement.

## v1.20.54 — 24 octobre 2026

- **Console Chromium désactivée.** F12, Ctrl+Shift+I et Ctrl+Shift+J sont maintenant bloqués dans le handler `before-input-event` de `main.js` — la console DevTools ne peut plus s'ouvrir accidentellement pendant l'utilisation normale.

## v1.20.53 — 24 octobre 2026

- **Settings : suppression de l'option "Interface size".** Les trois boutons Normal/Large/Extra large ont été retirés — l'interface s'adapte maintenant automatiquement à la taille de la fenêtre. Ctrl+scroll et Ctrl+/-/0 fonctionnent toujours via main.js pour les besoins ponctuels.

## v1.20.52 — 24 octobre 2026

- **Player normal : pochette plus grande, meilleure lisibilité.** `#trackInfo` passe de `flex:1 1 auto` à `flex:0 0 auto` — il prenait la moitié de l'espace vertical en concurrence avec la pochette. Maintenant `#artWrap` prend tout l'espace disponible, et la pochette est calculée sur cette hauteur réelle. Cap relevé de 380 px à 520 px.

## v1.20.51 — 24 octobre 2026

- **Idle : zones redéfinies selon l'image de référence.**
  - Zone orange (volume) : s'étend maintenant sur toute la hauteur de `#swipeZone` (top:0, bottom:0), à droite de la pochette. Elle n'était auparavant limitée qu'à la hauteur de la pochette.
  - Zone bleue (pochette) : inchangée — déjà gérée par `downOnArt` (swipe gauche/droite et play-pause).
  - Zone jaune (fond) : inchangée — swipe vers le haut ou double-tap pour quitter l'idle.
  - Tique : un guard dans le handler `pointerdown` de la zone volume laisse passer les taps sur le badge liké, même si la zone volume s'étend maintenant au-dessus de lui.

## v1.20.50 — 24 octobre 2026

- **Fix bouton Réduire.** Le bouton — de la fenêtre réduit maintenant l'application dans la barre des tâches Windows, comme attendu. Auparavant, le handler `minimize` interceptait l'événement et appelait `hide()` (masquer dans le tray), ce qui donnait l'impression que l'app se fermait. Supprimé — Windows gère la minimisation nativement. Le bouton X continue de quitter l'application (comportement inchangé).

## v1.20.49 — 24 octobre 2026

- **Idle : tique toujours visible.** La tique (badge liké) ne disparaît plus jamais — la pochette se réduit autant que nécessaire pour lui laisser la place au-dessus, quelle que soit la taille de la fenêtre. Taille minimale de la pochette abaissée à 60 px pour maximiser l'espace disponible pour les autres éléments.

## v1.20.48 — 24 octobre 2026

- **Idle : aucun overlap quelle que soit la taille de fenêtre.** `fitArtSquare()` calcule maintenant l'espace vertical disponible dans `#swipeZone` et soustrait la hauteur du badge liké, des gaps flex, de la hauteur naturelle du titre+artiste et une marge basse (16 px) avant de dimensionner la pochette. Résultat : la pochette rétrécit automatiquement si nécessaire pour que titre et artiste tiennent toujours en dessous sans jamais les chevaucher. Le badge liké est masqué (visibility:hidden) s'il ne peut pas tenir au-dessus de la pochette sans se superposer.

## v1.20.47 — 24 octobre 2026

- **Fix définitif animation de fond.** L'animation `bgDrift` était appliquée sur `#npBackground` (le conteneur), mais c'est `#npBgInner` qui porte l'image et le `transform:scale(1.2)` inline — ce scale inline écrasait silencieusement l'animation du parent, rendant le fond statique. Correction : le sélecteur CSS est maintenant `#npBackground.bg-animated #npBgInner`, et `applyBgAnimation()` vide le transform inline dès que l'animation est active. `_bgAnimApplied` est réinitialisé à chaque changement de piste pour éviter que le guard bloque la re-application.
- **Choix de vitesse d'animation de fond.** Dans les réglages, le bouton On/Off est remplacé par trois vitesses : Normal (40 s), Medium (20 s), Fast (10 s). La vitesse est injectée via la custom property CSS `--bg-anim-dur` directement sur l'élément.
- **Réajustement des zones après morph idle↔normal.** `fitArtSquare()` est désormais appelé deux fois lors de chaque transition : immédiatement (pour le redimensionnement de la pochette) et 620 ms plus tard (après la fin du morph à 600 ms, pour que les positions des zones reflètent le layout définitivement stabilisé). Cela corrige le désalignement de la zone volume et de la zone swipe visible dans le debug overlay après un changement de mode.

## v1.20.46 — 24 octobre 2026

- **Debug zones d'activation (Ctrl+Shift+D).** En mode idle, appuyer sur Ctrl+Shift+D superpose des calques colorés semi-transparents sur chaque zone d'activation : pochette (bleu), zone volume (orange), zone swipe (vert), badge liké (rose), bouton + (jaune). Chaque calque affiche son nom et ses dimensions en pixels. Re-appuyer sur Ctrl+Shift+D retire les calques. Les calques se rafraîchissent automatiquement au redimensionnement de la fenêtre.

## v1.20.45 — 24 octobre 2026

- **Fix zone volume idle — ne chevauche plus la pochette.** La zone d'activation du volume en mode immersif utilisait `getBoundingClientRect()` pour calculer sa position, ce qui faussait le résultat quand `#swipeZone` portait un `transform` actif (morph, animation). Remplacé par un calcul en coordonnées locales (`offsetLeft`/`offsetTop` remontés jusqu'à `#swipeZone`) qui est invariant par rapport aux transforms CSS. Un garde-fou de 12 px est ajouté entre le bord droit de la pochette et le début de la zone, garanti quelle que soit la taille de la fenêtre ou le redimensionnement.

## v1.20.44 — 24 octobre 2026

- **Morph idle ↔ normal.** La transition entre le player normal et le mode immersif est maintenant un morph fluide à 600 ms : tous les éléments partagent la même easing (`cubic-bezier(.4,0,.2,1)`) et bougent ensemble. Les contrôles (transport, barre de progression, tab bar) glissent vers le bas et s'effacent à l'entrée en idle ; remontent à la sortie. La taille du titre/artiste s'interpole en douceur (plus de saut instantané de font-size). La pochette grandit en même temps. Une légère impulsion de scale+translate sur `#swipeZone` donne un sentiment de "pop" organique à chaque transition.

## v1.20.43 — 24 octobre 2026

- **Fix refresh boutons transport.** Bug Chromium/Windows : après un clic sur un bouton (play, pause, next, previous, shuffle, repeat), les états CSS `:hover`/`:active` ne se repeignaient pas tant que la souris ne bougeait pas, laissant le bouton dans un état visuel intermédiaire (noir, sans le rond vert ni le grisé correct). Correction : `void el.offsetHeight` après chaque clic force un recalcul synchrone du layout/repaint, ce qui applique immédiatement le bon état visuel.

## v1.20.42 — 24 octobre 2026

- **Revert DPI scaling (v1.20.40).** L'ajustement automatique de taille et de zoom selon le `scaleFactor` Windows a été entièrement supprimé de `main.js`. Une analyse vidéo a confirmé qu'il provoquait une superposition de calques (double titre, pochette coupée, contrôles écrasés) lors du déplacement de la fenêtre et du passage idle↔player. L'interface retrouve son comportement stable d'avant la v1.20.40 ; l'utilisateur peut ajuster le zoom manuellement via Ctrl+scroll.

## v1.20.41 — 24 octobre 2026

- **Animated Background — fix définitif (tentative 3).** Trois causes résiduelles corrigées :
  1. `transition:background 1s ease` sur `#npBackground` forçait un compositing layer qui bloquait l'animation `transform` (supprimé).
  2. `$npBgInner.style.transform = 'scale(1.2)'` était posé juste avant `applyBgAnimation()` — le guard `_bgAnimApplied` empêchait le vidage, laissant le scale inline contrecarrer l'animation du parent. Corrigé : le scale est vidé manuellement si l'animation est voulue.
  3. En mode fictif (démo), le gradient était appliqué directement sur `#npBackground` au lieu de `#npBgInner` — l'animation agrandissait un fond déjà à taille normale et les bords noirs apparaissaient. Corrigé : même architecture que le mode réel (contenu visuel sur l'inner, animation sur le parent).
  4. Ajout `overflow:hidden` sur `#npBackground` pour éviter toute fuite visuelle lors du scale.

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
