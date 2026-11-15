# Simple Player

Lecteur Spotify minimaliste pour Windows — gros boutons, mode tactile, swipe pour changer de piste, mode sombre uniquement. Conçu pour remplacer l'app Spotify officielle par quelque chose de plus pratique au quotidien.

## Structure du projet

```
simple-player/
├── src/
│   ├── main.js          → Processus principal Electron (fenêtre, tray, raccourcis, mises à jour)
│   ├── preload.js        → Pont sécurisé entre main.js et l'interface
│   ├── config.js          → Identifiants/paramètres de connexion Spotify (Client ID, redirect URI)
│   └── renderer/
│       └── index.html      → Toute l'interface (HTML + CSS + JS) : lecteur, bibliothèque, recherche, réglages
├── build/
│   ├── icon.ico            → Icône Windows (multi-résolutions), utilisée par l'installeur et la fenêtre
│   ├── icon_tray.png         → Icône pour la zone de notification (même design, plus petit)
│   ├── icon.png, icon_source_1024.png → Sources haute résolution de l'icône
│   └── make_icon_f3_variant_b.py      → Script Python qui génère l'icône (modifiable si on veut l'ajuster plus tard)
├── mockup.html              → Le prototype interactif original (gardé comme référence, n'est plus utilisé par l'app)
├── package.json             → Dépendances, infos de l'app, config de l'installeur Windows
├── push.bat                 → Raccourci optionnel pour envoyer les changements sur GitHub en une étape (nécessite Git en ligne de commande)
└── README.md                → Ce fichier
```

## Ce que fait chaque fichier, en détail

### `src/main.js`
Le "cerveau" de l'application — tout ce qui touche à Windows plutôt qu'à l'affichage :
- Crée la fenêtre principale et se souvient de sa taille/position/état maximisé d'une session à l'autre.
- Crée l'icône dans la zone de notification (tray) : clic pour afficher/masquer la fenêtre, clic droit pour un menu avec "Quitter".
- Ferme en minimisant vers le tray plutôt que de quitter (sauf via "Quitter" dans le menu du tray).
- Écoute les touches **Espace** (lecture/pause), **←** (piste précédente), **→** (piste suivante) — uniquement quand la fenêtre a le focus, jamais comme raccourcis globaux Windows.
- Gère le réglage "démarrage avec Windows" (`app.setLoginItemSettings`).
- Vérifie s'il existe une nouvelle version à chaque lancement de l'application (via `electron-updater`).

### `src/preload.js`
Un petit fichier de sécurité qui expose uniquement les fonctions nécessaires (raccourcis clavier, réglage de démarrage) à l'interface, sans lui donner un accès direct et dangereux au système.

### `src/config.js`
Les paramètres de connexion à Spotify : l'identifiant de l'application (Client ID) et l'adresse locale utilisée pendant la connexion (`http://127.0.0.1:8888/callback`).

### `src/spotifyAuth.js`
La vraie connexion à Spotify : ouvre la page de connexion officielle dans ton navigateur, reçoit la réponse via un petit serveur local temporaire, échange le code contre les jetons d'accès, et conserve le jeton de rafraîchissement **chiffré** sur ton disque (via le coffre-fort intégré de Windows) pour que tu n'aies pas à te reconnecter à chaque lancement.

### Lecture réelle (dans `src/renderer/index.html`)
Une fois connecté, Simple Player agit comme une télécommande + afficheur pour ton compte Spotify — exactement comme quand tu ouvres l'app officielle Spotify sur un appareil qui ne fait pas jouer le son lui-même (ton ordi, par exemple, pendant que la musique sort de ton téléphone ou d'une enceinte). Les boutons play/pause/suivant/précédent/volume/shuffle/repeat envoient de vraies commandes à l'appareil actuellement actif (peu importe lequel), et l'app interroge l'état réel de ton compte toutes les 2 secondes pour afficher ce qui joue vraiment, où que ce soit.

### `src/localMusic.js`
Fichiers de musique de l'ordinateur (onglet « Local ») : parcourt les dossiers ajoutés et lit les tags MP3 (ID3v2) et FLAC, la qualité, la durée et les pochettes. La lecture elle-même est faite par la fenêtre (élément audio de Chromium : MP3, FLAC, WAV, OGG, Opus, M4A/AAC).

### `src/renderer/index.html`
Toute l'interface que tu vois et utilises : la pochette d'album, les boutons de lecture, le swipe tactile, la barre de volume, la bibliothèque, la recherche, et les réglages. C'est ce fichier qui gère l'affichage et qui, une fois la connexion Spotify branchée, parlera à ton compte Spotify.

### `package.json`
La carte d'identité de l'application pour Electron : son nom, sa version, comment la lancer en développement (`npm start`), comment construire l'installeur Windows (`npm run dist`), et où publier les mises à jour (ton repo GitHub).

### `build/`
Tout ce qui concerne l'icône de l'application : l'icône finale (`icon.ico`, `icon_tray.png`) et les scripts qui l'ont générée, gardés au cas où on voudrait l'ajuster plus tard.

## Lancer le projet en développement

```
npm install
npm start
```

## Construire l'installeur Windows

```
npm run dist
```

Ça produit un fichier `Simple Player-Setup-X.X.X.exe` dans un dossier `dist/`, prêt à installer.

## État actuel du projet

- ✅ Interface complète et validée (lecteur, bibliothèque, recherche, réglages, swipe, icône)
- ✅ Fenêtre Windows, tray, position mémorisée, raccourcis clavier, démarrage avec Windows, vérification de mise à jour
- ✅ Connexion réelle à Spotify (OAuth) — bouton "Connect to Spotify" fonctionnel dans les réglages
- ✅ Zoom de l'interface : Ctrl + molette, Ctrl +/-/0, ou un réglage dans les Settings
- ✅ Contrôle réel de ta lecture Spotify, en télécommande : play/pause/suivant/précédent/volume/shuffle/repeat/progression/pochette réelle, synchronisé avec l'état réel de Spotify (fonctionne même si tu changes de piste depuis ton téléphone). Simple Player ne joue pas le son lui-même — il faut qu'un appareil Spotify (téléphone, ordi, enceinte Connect) soit actif quelque part. On a étudié la lecture directe via le Web Playback SDK officiel de Spotify : confirmé non supporté dans Electron par Spotify lui-même (échec du côté DRM). La seule alternative connue (librespot) n'est pas officielle et comporte un risque réel sur le compte — mise de côté pour l'instant.
- ✅ Bibliothèque (Liked Songs + tes vraies playlists) et recherche branchées sur ton vrai compte Spotify
- ⏳ **"Ghost Spotify"** (optionnel, activé par défaut depuis la v1.14.3; classique ou Microsoft Store depuis la v1.16.0) : si aucun appareil n'est actif, lance automatiquement le vrai client Spotify (officiel, version installeur classique) en arrière-plan sur ton ordinateur, masqué de la barre des tâches, fermé avec Simple Player. Pas encore testé en conditions réelles.
- ✅ **Fichiers locaux** (depuis la v1.21.0) : onglet « Local » pour lire les MP3 / FLAC (et WAV, OGG, Opus, M4A) de l'ordinateur — ajout par sélecteur, par dossier ou par glisser-déposer, liste mémorisée.
