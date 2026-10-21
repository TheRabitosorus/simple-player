// ============================================================
// CONFIGURATION - À remplir avant de lancer l'app
// ============================================================

module.exports = {
  // Colle ici le Client ID récupéré sur developer.spotify.com/dashboard
  CLIENT_ID: '201a8f9dcd014f9ab04024cd9cb1115a',

  // Doit correspondre EXACTEMENT au Redirect URI enregistré dans le dashboard Spotify
  REDIRECT_URI: 'http://127.0.0.1:8888/callback',
  CALLBACK_PORT: 8888,

  // Permissions demandées à Spotify
  SCOPES: [
    'streaming',                    // requis pour le Web Playback SDK (lecture audio)
    'user-read-email',              // requis par le Web Playback SDK
    'user-read-private',            // requis par le Web Playback SDK
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'user-library-read',
    'user-library-modify',
    'playlist-read-private',
    'playlist-read-collaborative'
  ].join(' ')
};
