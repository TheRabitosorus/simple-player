# Journal des versions

Ce fichier résume ce qui change à chaque fois que je te donne une nouvelle version à envoyer sur GitHub.

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
