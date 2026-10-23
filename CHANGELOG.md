# Journal des versions

Ce fichier résume ce qui change à chaque fois que je te donne une nouvelle version à envoyer sur GitHub.

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
