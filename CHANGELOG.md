# Journal des versions

Ce fichier résume ce qui change à chaque fois que je te donne une nouvelle version à envoyer sur GitHub.

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
