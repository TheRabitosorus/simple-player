# Journal des versions

Ce fichier résume ce qui change à chaque fois que je te donne une nouvelle version à envoyer sur GitHub.

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
