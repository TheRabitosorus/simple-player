(function(){
  "use strict";

  // Settings for "Ghost Spotify" (see Settings tab + friendlySpotifyError
  // below). Declared early since the Settings-tab wiring reads it before
  // the real-playback code further down the file would otherwise set it.
  var ghostSettings = { enabled: false, exePath: null, platformSupported: false, computerName: '' };
  var ghostLoaded = false; // true once main.js has answered ghost:get-settings

  // ---------------- Data (fictif, pour la démo) ----------------
  var CATALOG = [
    {id:1,title:"Smoked Glass",artist:"Pale Cloud",duration:214},
    {id:2,title:"Low Tide",artist:"Low Hours",duration:187},
    {id:3,title:"Broken Sky",artist:"Pale Cloud",duration:243},
    {id:4,title:"Empty Boulevard",artist:"Rousseau",duration:198},
    {id:5,title:"Soft Neon",artist:"Villa Slow",duration:231},
    {id:6,title:"South Window",artist:"Low Hours",duration:176},
    {id:7,title:"Grain of Salt",artist:"Camille Osaka",duration:205},
    {id:8,title:"Below the Bridge",artist:"Rousseau",duration:219},
    {id:9,title:"Indian Summer",artist:"Villa Slow",duration:252},
    {id:10,title:"Gold Dust",artist:"Camille Osaka",duration:190},
    {id:11,title:"Last Train",artist:"Pale Cloud",duration:208},
    {id:12,title:"Room 12",artist:"Low Hours",duration:226},
    {id:13,title:"Slow Vertigo",artist:"Rousseau",duration:184},
    {id:14,title:"Salt and Ash",artist:"Villa Slow",duration:237},
    {id:15,title:"Warm Mist",artist:"Camille Osaka",duration:201},
    {id:16,title:"North Lot",artist:"Pale Cloud",duration:195},
    {id:17,title:"Shadow Street",artist:"Low Hours",duration:212},
    {id:18,title:"Broken Glass",artist:"Rousseau",duration:229},
    {id:19,title:"Cold Light",artist:"Villa Slow",duration:180},
    {id:20,title:"Marina Hotel",artist:"Camille Osaka",duration:244}
  ];
  var PLAYLISTS = [
    {id:"p1",name:"Calm Night",trackIds:[1,3,6,9,14,19]},
    {id:"p2",name:"Night Drive",trackIds:[4,8,11,13,18]},
    {id:"p3",name:"Slow Morning",trackIds:[2,7,10,15,20]},
    {id:"p4",name:"Studio Focus",trackIds:[5,12,16,17]},
    {id:"p5",name:"Studio Archives",trackIds:[1,4,7,10,13,16,19]},
    {id:"p6",name:"Coming Home",trackIds:[3,6,9,12,15,18]}
  ];
  var LIKED_IDS = [2,5,9,11,14,17,20,3];
  var likedSet = new Set(LIKED_IDS);

  function trackById(id){ for (var i=0;i<CATALOG.length;i++) if (CATALOG[i].id===id) return CATALOG[i]; return null; }
  function fmt(s){ s=Math.max(0,Math.floor(s)); var m=Math.floor(s/60), sec=String(s%60).padStart(2,'0'); return m+":"+sec; }

  // ---------------- Safety helpers ----------------
  // Escape text before putting it into an innerHTML string.
  function escHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }
  // Build a safe CSS url('...') value (usable inside a style="..." attribute
  // or assigned to element.style). Only https images and our own generated
  // data: images (which includes the covers of local files) are allowed;
  // anything else becomes 'none'.
  function cssUrl(u){
    var s = String(u || '');
    if (!/^(https:\/\/|data:image\/)/i.test(s)) return 'none';
    return "url('" + s.replace(/['"\\()\s]/g, function(c){ return encodeURIComponent(c); }) + "')";
  }

  // Fades the start-up logo cover out once a real cover is in place (loaded first, so no blank flash).
  function revealArt(url){
    var art = document.getElementById('art');
    if (!art || art.classList.contains('art-ready')) return;
    var done = function(){ art.classList.add('art-ready'); };
    if (!url) { done(); return; }
    var im = new Image(); im.onload = done; im.onerror = done; im.src = url;
  }

  // ---------------- Generated cover art ----------------
  var artCache = {};
  var hueCache = {};
  function hashSeed(s){ var h=0; for (var i=0;i<s.length;i++){ h=(h*31 + s.charCodeAt(i))|0; } return Math.abs(h); }
  function makeArt(seed){
    if (artCache[seed]) return artCache[seed];
    var h = hashSeed(seed);
    var hue1 = h % 360;
    var hue2 = (hue1 + 45 + (h>>3)%55) % 360;
    var hue3 = (hue1 + 190 + (h>>5)%90) % 360;
    hueCache[seed] = { hue1: hue1, hue2: hue2 };
    var c = document.createElement('canvas'); c.width=320; c.height=320;
    var ctx = c.getContext('2d');
    var g = ctx.createLinearGradient(0,0,320,320);
    g.addColorStop(0, 'hsl('+hue1+' 55% 13%)');
    g.addColorStop(1, 'hsl('+hue2+' 60% 9%)');
    ctx.fillStyle = g; ctx.fillRect(0,0,320,320);
    var hues=[hue1,hue2,hue3];
    for (var i=0;i<4;i++){
      var rx = 55 + ((h>>(i*4)) % 95);
      var cx = (h*(i+3)) % 320;
      var cy = (h*(i+7)*3) % 320;
      var rg = ctx.createRadialGradient(cx,cy,0,cx,cy,rx);
      rg.addColorStop(0, 'hsla('+hues[i%3]+',70%,55%,0.55)');
      rg.addColorStop(1, 'hsla('+hues[i%3]+',70%,55%,0)');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(cx,cy,rx,0,Math.PI*2); ctx.fill();
    }
    var url = c.toDataURL('image/png');
    artCache[seed] = url;
    return url;
  }

  // ---------------- Spotify connection ----------------
  (function(){
    var link = document.getElementById('connectSpotifyBtn');
    var statusEl = document.getElementById('accountStatus');
    var noteEl = document.getElementById('spotifyNote');
    if (!link) return;

    function setStatus(connected){
      statusEl.classList.toggle('connected', connected);
      statusEl.innerHTML = '<span class="status-dot"></span>' + (connected ? 'Connected' : 'Not connected');
      link.textContent = connected ? 'Disconnect' : 'Connect to Spotify';
    }

    if (window.simplePlayer && window.simplePlayer.spotifyGetStatus) {
      // Real app: the whole login flow (browser window, local callback
      // server, token exchange) happens in main.js — this button just
      // triggers it and reflects the result.
      noteEl.textContent = 'Opens Spotify’s official sign-in page in your browser. Come back here once you’ve logged in.';
      var connecting = false;

      window.simplePlayer.spotifyGetStatus().then(setStatus);

      link.addEventListener('click', function(e){
        e.preventDefault();
        if (connecting) return;
        var isConnected = statusEl.classList.contains('connected');
        if (isConnected) {
          window.simplePlayer.spotifyDisconnect().then(function(res){ setStatus(res.connected); });
          return;
        }
        connecting = true;
        link.textContent = 'Connecting…';
        window.simplePlayer.spotifyConnect().then(function(res){
          connecting = false;
          setStatus(res.connected);
          if (res.connected && typeof startPolling === 'function' && !useRealPlayback) {
            startPolling();
          }
          if (!res.connected && res.error) {
            noteEl.textContent = res.error;
          }
        });
      });
    } else {
      // Mockup/preview only (no Electron main process to catch the
      // redirect): build the real Spotify authorize URL so the login
      // screen itself can still be tested, but it can't complete here.
      var CLIENT_ID = '201a8f9dcd014f9ab04024cd9cb1115a';
      var REDIRECT_URI = 'http://127.0.0.1:8888/callback';
      var SCOPES = [
        'streaming','user-read-email','user-read-private',
        'user-read-playback-state','user-modify-playback-state','user-read-currently-playing',
        'user-library-read','user-library-modify',
        'playlist-read-private','playlist-read-collaborative',
        'playlist-modify-public','playlist-modify-private'
      ].join(' ');

      function base64UrlEncode(buffer){
        var bytes = new Uint8Array(buffer);
        var binary = '';
        for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      }
      function randomToken(len){
        var arr = new Uint8Array(len);
        crypto.getRandomValues(arr);
        return base64UrlEncode(arr.buffer);
      }
      function sha256(str){
        var data = new TextEncoder().encode(str);
        return crypto.subtle.digest('SHA-256', data).then(base64UrlEncode);
      }

      if (!window.crypto || !window.crypto.subtle) return;
      var verifier = randomToken(64);
      sha256(verifier).then(function(challenge){
        var params = new URLSearchParams({
          client_id: CLIENT_ID,
          response_type: 'code',
          redirect_uri: REDIRECT_URI,
          code_challenge_method: 'S256',
          code_challenge: challenge,
          scope: SCOPES,
          state: randomToken(16)
        });
        link.href = 'https://accounts.spotify.com/authorize?' + params.toString();
      }).catch(function(){ /* leave href as "#" if crypto fails */ });
    }
  })();

  // ---------------- Réglages ----------------
  var settings = {
    idleDelay: 5000,
    volZone: 'normal',
    bgEnabled: true,
    bgAnimated: 'off', // 'off' | 'normal' | 'medium' | 'fast'
    startup: false
  };
  // Restaure les settings persistés dans localStorage (survit aux relances).
  try {
    var _saved = JSON.parse(localStorage.getItem('sp_settings') || '{}');
    if (typeof _saved.bgEnabled === 'boolean') settings.bgEnabled = _saved.bgEnabled;
    if (_saved.bgAnimated) settings.bgAnimated = _saved.bgAnimated;
    if (_saved.idleDelay > 0) settings.idleDelay = +_saved.idleDelay;
    if (_saved.volZone === 'large' || _saved.volZone === 'xlarge') settings.volZone = _saved.volZone;
  } catch (e) {}
  var RAIL_PRESETS = {
    normal: { rail: '68px', track: '9px' },
    large:  { rail: '84px', track: '16px' },
    xlarge: { rail: '104px', track: '24px' }
  };
  // Applied right away (the saved choice is restored above), before the first layout pass.
  function applyRailPreset(){
    var preset = RAIL_PRESETS[settings.volZone] || RAIL_PRESETS.normal;
    document.documentElement.style.setProperty('--rail-w', preset.rail);
    document.documentElement.style.setProperty('--vol-track-w', preset.track);
  }
  applyRailPreset();

  // ---------------- State ----------------
  var SPEED = 7; // accélère le temps simulé pour pouvoir tester sans attendre 3-4 min
  var state = {
    queue: CATALOG.slice(),
    index: 0,
    playing: false,
    shuffle: false,
    repeat: false,
    volume: 70,
    elapsed: 0,
    timer: null
  };

  // Set by startPolling() once connected to Spotify; everything below
  // falls back to the local simulation until then.
  var useRealPlayback = false;
  // True while the player is playing local files (the "Local" tab): the
  // transport, progress bar and volume then drive the `local` module below
  // instead of Spotify or the demo simulation.
  var localMode = false;
  function leaveLocalMode(){ if (localMode) local.exit(); }
  var onVolumeChange = null; // wired to the Windows volume (or Spotify's) below
  // Set by the idle-volume block below so the wheel handler can reveal the bar.
  var showIdleVolumeBar = null;
  var scheduleIdleVolumeHide = null;
  var seekControl = null; // set by the progress-bar module; used by the cover swipe (immersive mode)

  // Mouse wheel on the window adjusts volume (5% per notch).
  // Disabled when the Settings, Library or Search view is active so the
  // wheel can scroll those lists normally.
  window.addEventListener('wheel', function(e){
    if (!onVolumeChange) return;
    // If the scroll target is inside a non-player view (settings, library,
    // search), let the browser handle it — don't steal it for volume.
    var tgt = e.target && e.target.closest ? e.target : null;
    var closestView = tgt && tgt.closest('.view');
    if (closestView && closestView.id !== 'view-player') return;
    // Same for the add-to-playlist menu (a long list scrolls) and for dialogs.
    if (tgt && tgt.closest('#addMenu, #addBackdrop, #dialogBackdrop')) return;
    e.preventDefault();
    var delta = e.deltaY > 0 ? -5 : 5; // scroll down = lower, scroll up = raise
    state.volume = Math.max(0, Math.min(100, state.volume + delta));
    if (updateVolumeDisplay) updateVolumeDisplay();
    onVolumeChange(state.volume);
    // In idle mode: reveal the volume bar the same way a touch/drag would.
    if (showIdleVolumeBar) showIdleVolumeBar();
    if (scheduleIdleVolumeHide) scheduleIdleVolumeHide();
  }, { passive: false });

  // Finger travel needed to sweep the whole 0-100 range. Used by BOTH volume
  // controls (idle zone and normal-mode rail) so they behave identically.
  var VOLUME_DRAG_PX = 700;
  var updateVolumeDisplay = null; // set by the volume rail; also used by the swipe-to-adjust-volume gesture
  // Speaker icon SVG paths — shared between the normal rail and the idle bar.
  var VOL_ICON_SPEAKER = '<path d="M4 9v6h4l5 4V5L8 9H4z"/>';
  var VOL_ICON_WAVE_S = '<path d="M15.3 10.3a2.2 2.2 0 0 1 0 3.4"/>';
  var VOL_ICON_WAVE_M = '<path d="M16.8 8.8a4 4 0 0 1 0 6.4"/>';
  var VOL_ICON_WAVE_L = '<path d="M18.3 7a6 6 0 0 1 0 10"/>';
  var VOL_ICONS_MAP = {
    mute: VOL_ICON_SPEAKER + '<path d="m16 9 5 6M21 9l-5 6"/>',
    1: VOL_ICON_SPEAKER + VOL_ICON_WAVE_S,
    2: VOL_ICON_SPEAKER + VOL_ICON_WAVE_S + VOL_ICON_WAVE_M,
    3: VOL_ICON_SPEAKER + VOL_ICON_WAVE_S + VOL_ICON_WAVE_M + VOL_ICON_WAVE_L
  };

  // ---------------- DOM refs ----------------
  var $art = document.getElementById('art');
  var $artOverlayIcon = document.getElementById('artOverlayIcon');
  var $title = document.getElementById('trackTitle');
  var $artist = document.getElementById('trackArtist');
  var $progressFill = document.getElementById('progressFill');
  var $elapsed = document.getElementById('timeElapsed');
  var $total = document.getElementById('timeTotal');
  var $playIcon = document.getElementById('playIcon');
  var $shuffleBtn = document.getElementById('shuffleBtn');
  var $repeatBtn = document.getElementById('repeatBtn');
  var $progressBar = document.getElementById('progressBar');

  var $app = document.getElementById('app');
  var $swipeZone = document.getElementById('swipeZone');

  // ---------------- Interface scale ----------------
  // The player is designed for a window of at least UI_BASE_W x UI_BASE_H
  // (CSS px): below that, its fixed-size controls no longer fit and start to
  // overlap. So on a smaller window the interface is laid out at that minimum
  // design size and the whole of #app is scaled down to fit — every element
  // shrinks together and keeps its place, at any window size or zoom level.
  // At or above the design size nothing is scaled (uiScale === 1).
  var UI_BASE_W = 640, UI_BASE_H = 720;
  var uiScale = 1;
  function uiMinWidth(){
    // A wider volume rail reserves more room on both sides of the cover.
    var rail = parseInt((RAIL_PRESETS[settings.volZone] || RAIL_PRESETS.normal).rail, 10) || 68;
    return UI_BASE_W + 2 * (rail - 68);
  }
  function applyUiScale(){
    var W = window.innerWidth, H = window.innerHeight;
    if (!W || !H) return;
    var u = Math.min(1, W / uiMinWidth(), H / UI_BASE_H);
    uiScale = u;
    if (u < 1){
      $app.style.width = (W / u) + 'px';
      $app.style.height = (H / u) + 'px';
      $app.style.transform = 'scale(' + u + ')';
    } else {
      $app.style.width = '';
      $app.style.height = '';
      $app.style.transform = '';
    }
    // 1% of the layout size, for the CSS rules that used to rely on vw/vh.
    var rootStyle = document.documentElement.style;
    rootStyle.setProperty('--vw', (W / u / 100) + 'px');
    rootStyle.setProperty('--vh', (H / u / 100) + 'px');
  }
  applyUiScale();

  var ICON_PLAY = '<path d="M8 5v14l11-7z"/>';
  var ICON_PAUSE = '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>';

  function currentTrack(){ return state.queue[state.index]; }

  function renderTrack(keepPlaying){
    var t = currentTrack();
    if (!t) return;
    $art.style.backgroundImage = cssUrl(makeArt(t.id+':'+t.title));
    $title.textContent = t.title;
    $artist.textContent = t.artist;
    $total.textContent = fmt(t.duration);
    state.elapsed = 0;
    updateProgress();
    updateLikedBadge();
    updatePlaylistBadge();
    updateNpBackground();
    if (!keepPlaying) { /* no-op, playing state handled by caller */ }
  }

  var $likedBadge = document.getElementById('likedBadge');
  // Tracks real playlist-add confirmations from the current session (the
  // API call actually succeeded — this isn't guessed). There's no cheap
  // Spotify endpoint to check "is this track in any playlist" for tracks
  // added before Simple Player touched them, so this only reflects
  // additions made from here, same session.
  var addedPlaylistSet = new Set();
  function updateLikedBadge(){
    var t = currentTrack();
    var liked = !!(t && (likedSet.has(t.id) || addedPlaylistSet.has(t.id)));
    $likedBadge.classList.toggle('on', liked);
    $likedBadge.title = liked ? 'Liked / in a playlist' : 'Not liked';
  }

  // ---- Canvas background — style Spotify fullscreen ----
  // Un dégradé fluide dont une tache lumineuse douce orbite lentement sur fond coloré.
  // Même rendu que le background_anim.mp4 de référence : lumière diffuse, pas de blobs visibles,
  // transition couleur douce basée sur les teintes dominantes de la pochette.
  var $npBackground = document.getElementById('npBackground');
  var $npBgCanvas   = document.getElementById('npBgCanvas');
  var _bgCtx        = $npBgCanvas.getContext('2d');
  var _bgRafId      = null;     // requestAnimationFrame handle
  var _bgColors     = ['#1a1a2e','#16213e','#0f3460']; // fallback sombre
  var _idleArtBottom = 0; // coordonnée Y du bas de la pochette dans swipeZone (maj par fitArtSquare)
  var _bgTick       = 0;  // compteur de frames pour les orbites
  // Vitesse angulaire par paramètre bgAnimated (radians/frame)
  var BG_SPEEDS     = { normal: 0.0008, medium: 0.0020, fast: 0.0045 };

  // Nombres irrationnels utilisés comme fréquences de translation — garantit l'apériodicité
  var _PHI  = 1.6180339887; // nombre d'or
  var _SR2  = 1.4142135623; // √2
  var _SR3  = 1.7320508075; // √3
  var _SR5  = 2.2360679774; // √5
  var _SR7  = 2.6457513110; // √7
  var _SR11 = 3.3166247903; // √11

  // Spotlights orbitaux : orbite elliptique + dérive par sinus à fréquences irrationnelles.
  // tx/ty = amplitude de dérive (fraction de la scène), f1/f2/f3 = fréquences de modulation.
  // Les couleurs seront mises à jour par updateBgSpotlights().
  var _bgSpots = [
    // spotlight principal — très grand, couvre presque toute la scène
    { cx:0.5,  cy:0.35, rx:0.40, ry:0.28, phase:0,           speed:1.0,  r:1.3,  alpha:0.95, color:'#1a3a6e',
      tx:0.18, ty:0.14, f1:_PHI,  f2:_SR3,  f3:_SR7,  scaleF:_SR2,  scaleA:0.10, p1:0.0,    p2:2.1,    p3:4.7  },
    // spotlight secondaire — orbite inverse, aussi grand
    { cx:0.5,  cy:0.65, rx:0.38, ry:0.24, phase:Math.PI,     speed:0.73, r:1.2,  alpha:0.9, color:'#0d2240',
      tx:0.22, ty:0.17, f1:_SR2,  f2:_SR5,  f3:_PHI,  scaleF:_SR3,  scaleA:0.10, p1:1.3,    p2:3.8,    p3:0.9  },
    // highlight clair — grand aussi, très diffus
    { cx:0.5,  cy:0.45, rx:0.28, ry:0.20, phase:Math.PI*0.7, speed:1.15, r:0.9,  alpha:0.6, color:'#e8eeff',
      tx:0.25, ty:0.20, f1:_SR7,  f2:_PHI,  f3:_SR11, scaleF:_SR5,  scaleA:0.12, p1:5.1,    p2:1.7,    p3:3.3  },
    // couleur 3 — bord gauche, large
    { cx:0.28, cy:0.58, rx:0.20, ry:0.16, phase:Math.PI*1.5, speed:0.9,  r:1.0,  alpha:0.9, color:'#0d1a3a',
      tx:0.20, ty:0.22, f1:_SR11, f2:_SR2,  f3:_SR3,  scaleF:_PHI,  scaleA:0.12, p1:2.6,    p2:5.4,    p3:1.1  },
  ];

  // Extraire N couleurs dominantes d'une image via canvas (down-sample + k-means simplifié)
  function extractColors(imgEl, n){
    var s = 32; // résolution d'échantillonnage
    var c = document.createElement('canvas'); c.width = s; c.height = s;
    var x = c.getContext('2d');
    x.drawImage(imgEl, 0, 0, s, s);
    var data = x.getImageData(0, 0, s, s).data;
    // Bucketiser les couleurs en ignorant les très sombres et très claires
    var buckets = {};
    for (var i = 0; i < data.length; i += 4){
      var r = data[i], g = data[i+1], b = data[i+2];
      var brightness = (r + g + b) / 3;
      if (brightness < 18 || brightness > 230) continue; // skip near-black / near-white
      // Quantiser en groupes de 32
      var key = (Math.round(r/32)*32) + ',' + (Math.round(g/32)*32) + ',' + (Math.round(b/32)*32);
      buckets[key] = (buckets[key] || 0) + 1;
    }
    var sorted = Object.keys(buckets).sort(function(a,b){ return buckets[b]-buckets[a]; });
    var colors = [];
    for (var j = 0; j < Math.min(n, sorted.length); j++){
      var rgb = sorted[j].split(',');
      // Assombrir pour que le fond reste discret — les teintes claires doivent rester subtiles
      // Pas d'assombrissement — on garde les teintes vives comme Spotify fullscreen
      var rf = +rgb[0];
      var gf = +rgb[1];
      var bf = +rgb[2];
      colors.push('rgb(' + rf + ',' + gf + ',' + bf + ')');
    }
    return colors.length >= 2 ? colors : ['#1a1234','#0d2240'];
  }

  // Convertit '#rrggbb' ou 'rgb(r,g,b)' en [r,g,b].
  function parseRgb(c){
    var hexM = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c || '');
    if (hexM) return [parseInt(hexM[1],16), parseInt(hexM[2],16), parseInt(hexM[3],16)];
    var rgbM = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(c || '');
    if (rgbM) return [+rgbM[1], +rgbM[2], +rgbM[3]];
    return [30, 60, 120];
  }

  // Profil du dégradé de chaque spotlight : décroissance exponentielle douce
  // depuis le centre (position, fraction de l'alpha) — pas de pic, pas d'anneau.
  var BG_STOPS = [[0,1],[0.05,0.97],[0.12,0.88],[0.20,0.72],[0.30,0.52],[0.42,0.32],[0.55,0.16],[0.68,0.07],[0.82,0.02],[1,0]];
  var _bgBase = '#060810'; // fond de base, recalculé à partir de la couleur principale

  // Affecter les couleurs extraites aux spotlights. Les chaînes de couleur des
  // dégradés sont préparées ici, une fois par pochette, et non à chaque image.
  function _boost(c){var v=parseRgb(c),m=(v[0]+v[1]+v[2])/3;return 'rgb('+v.map(function(x){return Math.max(0,Math.min(255,Math.round(m+(x-m)*1.3)));}).join(',')+')';}
  function updateBgSpotlights(colors){
    colors = colors.map(_boost);
    _bgSpots[0].color = colors[0] || '#1a3a6e';
    _bgSpots[1].color = colors[1] || '#0d2240';
    _bgSpots[2].color = '#e8eeff'; // toujours un highlight clair pour la luminosité
    _bgSpots[3].color = colors[2] || colors[1] || '#0d1a3a';
    _bgSpots.forEach(function(s){
      var prefix = 'rgba(' + parseRgb(s.color).join(',') + ',';
      s.stops = BG_STOPS.map(function(st){ return [st[0], prefix + (s.alpha * st[1]).toFixed(3) + ')']; });
    });
    // Fond de base = couleur principale très sombre — les spotlights ressortent dessus
    var b = parseRgb(_bgSpots[0].color);
    _bgBase = 'rgb(' + Math.round(b[0]*0.12) + ',' + Math.round(b[1]*0.12) + ',' + Math.round(b[2]*0.12) + ')';
  }

  updateBgSpotlights(_bgColors); // couleurs par défaut, tant qu'aucune pochette n'est connue

  // Dessine une image du fond. advance=true fait avancer l'animation d'un pas ;
  // advance=false redessine l'image courante (pause, animation coupée, redimensionnement).
  // Tout est exprimé en fraction de la taille du canvas : le rendu est donc le
  // même quelle que soit sa résolution.
  function drawBg(advance){
    var W = $npBgCanvas.width, H = $npBgCanvas.height;
    if (!W || !H) return;
    var angSpeed = BG_SPEEDS[settings.bgAnimated] || BG_SPEEDS.medium;
    if (advance) _bgTick++;
    // Temps normalisé — vitesse de translation proportionnelle à angSpeed
    var t = _bgTick * angSpeed * 0.8;
    var diag = Math.sqrt(W*W + H*H);

    _bgCtx.globalCompositeOperation = 'source-over';
    _bgCtx.fillStyle = _bgBase;
    _bgCtx.fillRect(0, 0, W, H);

    _bgCtx.globalCompositeOperation = 'screen';
    for (var i = 0; i < _bgSpots.length; i++){
      var s = _bgSpots[i];
      // 1. Orbite elliptique classique (rotation)
      if (advance) s.phase += angSpeed * s.speed;

      // 2. Dérive apériodique par superposition de 3 sinus à fréquences irrationnelles
      //    f1, f2, f3 sont √2, √3, φ… → jamais en phase → jamais de répétition visible
      var driftX = Math.sin(t * s.f1 + s.p1) * 0.50
                 + Math.sin(t * s.f2 + s.p2) * 0.30
                 + Math.sin(t * s.f3 + s.p3) * 0.20;
      var driftY = Math.cos(t * s.f2 + s.p1 + 1.1) * 0.50
                 + Math.cos(t * s.f3 + s.p2 + 2.3) * 0.30
                 + Math.cos(t * s.f1 + s.p3 + 0.7) * 0.20;

      // 3. Variation de scale légère (gradient plus grand/plus petit)
      var scaleMod = 1.0 + Math.sin(t * s.scaleF + s.p1 * 1.7) * s.scaleA;

      // Position finale = orbite + translation
      var sx = (s.cx + Math.cos(s.phase) * s.rx + driftX * s.tx) * W;
      var sy = (s.cy + Math.sin(s.phase) * s.ry + driftY * s.ty) * H;
      var gr = diag * s.r * 0.5 * scaleMod;

      var grd = _bgCtx.createRadialGradient(sx, sy, 0, sx, sy, gr);
      for (var k = 0; k < s.stops.length; k++) grd.addColorStop(s.stops[k][0], s.stops[k][1]);
      _bgCtx.fillStyle = grd;
      _bgCtx.fillRect(0, 0, W, H);
    }
    _bgCtx.globalCompositeOperation = 'source-over';
    // Voile sombre léger — juste assez pour garder le texte lisible
    _bgCtx.fillStyle = 'rgba(0,0,0,0.08)';
    _bgCtx.fillRect(0, 0, W, H);
  }

  // Ajuste la résolution du canvas à sa taille réelle à l'écran (le CSS le
  // garde à 100 % du fond). Minimum 2× pour des dégradés parfaitement lisses,
  // plafonné en nombre de pixels au-delà d'un écran 4K. Renvoie true si
  // la taille a changé (le canvas est alors vide et doit être redessiné).
  var BG_MAX_PIXELS = 3840 * 2160; // jamais plus de pixels qu'un écran 4K
  var BG_RENDER_SCALE = 0.5;       // résolution du dessin = moitié de la taille de la fenêtre (voir sizeBgCanvas)
  function sizeBgCanvas(){
    var rect = $npBackground.getBoundingClientRect();
    if (!rect.width || !rect.height) return false; // onglet Player masqué
    // The background is only big, slow, soft light: drawing it at half the window's size and letting
    // the browser stretch it looks the same but costs ~16x fewer pixels per frame than the old
    // "2x the window" (measured in test: 80 ms -> 5 ms per frame without a graphics card).
    var pw = rect.width * BG_RENDER_SCALE, ph = rect.height * BG_RENDER_SCALE;
    var over = Math.sqrt(BG_MAX_PIXELS / (pw * ph));
    if (over < 1){ pw *= over; ph *= over; }
    pw = Math.max(1, Math.round(pw)); ph = Math.max(1, Math.round(ph));
    if ($npBgCanvas.width === pw && $npBgCanvas.height === ph) return false;
    $npBgCanvas.width = pw;
    $npBgCanvas.height = ph;
    return true;
  }

  function isPlayerViewActive(){ return document.getElementById('view-player').classList.contains('active'); }
  // L'animation ne tourne que si elle sert à quelque chose : fond activé,
  // animation activée, lecture en cours, et onglet Player affiché.
  function bgShouldAnimate(){
    return settings.bgEnabled && settings.bgAnimated !== 'off' && state.playing && isPlayerViewActive();
  }
  function bgFrame(){
    _bgRafId = null;
    if (!bgShouldAnimate()) return;
    drawBg(true);
    _bgRafId = requestAnimationFrame(bgFrame);
  }
  // Point d'entrée unique : met le fond dans l'état voulu (animé, image fixe,
  // ou éteint). redraw=true force le redessin de l'image fixe (nouvelles couleurs).
  function refreshBg(redraw){
    if (!settings.bgEnabled){ stopBgCanvas(); return; }
    var resized = sizeBgCanvas();
    if (bgShouldAnimate()){
      if (resized) drawBg(false); // pas d'image vide en attendant la prochaine frame
      if (!_bgRafId) _bgRafId = requestAnimationFrame(bgFrame);
    } else {
      if (_bgRafId){ cancelAnimationFrame(_bgRafId); _bgRafId = null; }
      if (redraw || resized) drawBg(false);
    }
  }

  function startBgCanvas(colors){
    if (colors && colors.length) _bgColors = colors;
    updateBgSpotlights(_bgColors);
    refreshBg(true);
  }

  function stopBgCanvas(){
    if (_bgRafId){ cancelAnimationFrame(_bgRafId); _bgRafId = null; }
    _bgCtx.clearRect(0, 0, $npBgCanvas.width, $npBgCanvas.height); // laisse voir le fond uni de #npBackground
  }

  function applyBgAnimation(){ refreshBg(true); }

  function updateNpBackground(){
    if (!settings.bgEnabled){ stopBgCanvas(); return; }
    var t = currentTrack(); if (!t) return;
    bgFromSeed(t.id + ':' + t.title);
  }
  // Teinte le fond à partir d'une pochette générée (makeArt) : mode démo, et
  // fichiers locaux sans pochette.
  function bgFromSeed(seed){
    if (!settings.bgEnabled){ stopBgCanvas(); return; }
    if (!hueCache[seed]) makeArt(seed);
    var h = hueCache[seed];
    // Mode démo (sans vraie image) : on génère des couleurs HSL à partir des teintes calculées
    var c1 = 'rgb(' + hslToRgb(h.hue1/360, 0.55, 0.22) + ')';
    var c2 = 'rgb(' + hslToRgb(h.hue2/360, 0.45, 0.18) + ')';
    var c3 = 'rgb(' + hslToRgb((h.hue1+120)/360 % 1, 0.40, 0.15) + ')';
    startBgCanvas([c1, c2, c3, '#0d0d18', '#0a1220']);
  }

  function hslToRgb(h, s, l){
    var r, g, b;
    if (s === 0){ r = g = b = l; }
    else {
      function hue2rgb(p, q, t){ if(t<0)t+=1; if(t>1)t-=1; if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q; if(t<2/3)return p+(q-p)*(2/3-t)*6; return p; }
      var q = l < 0.5 ? l*(1+s) : l+s-l*s, p = 2*l-q;
      r = hue2rgb(p,q,h+1/3); g = hue2rgb(p,q,h); b = hue2rgb(p,q,h-1/3);
    }
    return Math.round(r*255)+','+Math.round(g*255)+','+Math.round(b*255);
  }

  var $playlistBadge = document.getElementById('playlistBadge');
  function updatePlaylistBadge(){
    var t = currentTrack();
    var pl = t && PLAYLISTS.filter(function(p){ return p.trackIds.indexOf(t.id) !== -1; })[0];
    if (pl){ $playlistBadge.textContent = pl.name; $playlistBadge.hidden = false; fitPlaylistBadge(); }
    else { $playlistBadge.hidden = true; }
  }

  function updateProgress(){
    var t = currentTrack();
    if (!t) return;
    var pct = Math.min(100, (state.elapsed / t.duration) * 100);
    $progressFill.style.width = pct + '%';
    $elapsed.textContent = fmt(state.elapsed);
  }

  function setPlayIcon(playing){
    $playIcon.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
    $artOverlayIcon.innerHTML = playing ? ICON_PLAY : ICON_PAUSE;
    // While paused, the pause icon stays visibly shown on the cover art at
    // all times (not just on touch/press) — the main visible cue in idle
    // mode, where the transport controls are hidden.
    $art.classList.toggle('paused', !playing);
  }

  // Synchronise l'animation background avec l'état de lecture (state.playing
  // doit déjà être à jour). Appelé explicitement par play() et pause() — pas
  // par setPlayIcon, aussi appelé lors d'initialisations sans changement réel.
  function syncBgToPlayState(){ refreshBg(false); }

  // Keeps #art a true square at all times, in both normal and idle mode,
  // at any window size or interface zoom level. Rather than relying on
  // CSS aspect-ratio/vw percentages (which turned out unreliable across
  // zoom levels and the idle layout change), this measures artWrap's
  // actual rendered box directly and sets width/height to the same
  // explicit pixel value — so the two are always exactly equal by
  // construction, no matter what else on screen changes.
  var $artWrap = document.getElementById('artWrap');
  var $trackInfo = document.getElementById('trackInfo');
  var COVER_SLIDE_ROOM = 18; // px of guaranteed slide travel each way, immersive mode
  function fitArtSquare(){
    if (!$artWrap.getClientRects().length) return; // hidden (e.g. a different tab is active)
    var isIdle = $app.classList.contains('idle');
    // Everything here is measured with offset* (layout pixels, relative to
    // #swipeZone): unlike getBoundingClientRect, those are not affected by
    // the interface scale nor by the transforms of the idle morph.
    var wrapW = $artWrap.offsetWidth, wrapH = $artWrap.offsetHeight;
    var wrapLeft = $artWrap.offsetLeft, wrapTop = $artWrap.offsetTop;
    var swW = $swipeZone.offsetWidth, swH = $swipeZone.offsetHeight;
    // Normal mode: the cover grows with the window (85% of the free width, between 520 and 760 px)
    // instead of stopping at 520, so tall windows don't leave a big empty gap above the title.
    // Same in immersive mode (560 up to 760 px, within the room left for the volume strip).
    var maxW = isIdle ? wrapW - 120 : wrapW;
    var cap = isIdle ? Math.max(560, Math.min(Math.round(maxW * 0.95), 760))
                     : Math.max(520, Math.min(Math.round(wrapW * 0.85), 760));
    // In idle mode, always leave room on each side of the cover (60px + the
    // zone's own 20px padding) for the volume strip and its "100%" label,
    // even if it means shrinking the art a little.
    var size = Math.min(cap, maxW, wrapH);

    if (isIdle) {
      // Reserve space for title+artist below the art so they never overlap.
      $trackInfo.style.maxHeight = '';
      var padTop = 20;       // padding-top of #swipeZone in idle (CSS)
      var likedBadgeH = 52;  // approx height of enlarged tick icon (44px svg + margin)
      var gapBadgeArt = 8, gapArtInfo = 8;
      var infoH = $trackInfo.offsetHeight || 90; // natural height (big idle font); fallback before first paint
      var bottomPad = 16;    // breathing room at bottom
      size = Math.min(size, swH - padTop - likedBadgeH - gapBadgeArt - gapArtInfo - infoH - bottomPad);
    }

    // The tick lives in the space above the cover (the cover is centred in
    // artWrap). Keep that space tall enough for the tick plus a margin on each
    // side, so the two can never touch.
    var badgeH = isIdle ? 44 : 22; // tick icon height (.liked-badge svg, CSS)
    var BADGE_GAP = 6;
    // Immersive mode: the cover can be slid up/down to change the volume, so
    // keep a little free travel above (up to the tick) and below (down to the
    // title). The tick is centred in the space above, hence the doubling.
    var needAbove = badgeH + 2 * BADGE_GAP + (isIdle ? 2 * COVER_SLIDE_ROOM : 0);
    size = Math.min(size, wrapH - 2 * Math.max(0, needAbove - wrapTop));
    size = Math.max(isIdle ? 60 : 40, Math.floor(size));

    $art.style.width = size + 'px';
    $art.style.height = size + 'px';

    // Where the cover ends up inside #swipeZone (it is centred inside artWrap).
    var artLeft   = Math.round(wrapLeft + (wrapW - size) / 2);
    var artRight  = artLeft + size;
    var artTop    = Math.round(wrapTop  + (wrapH - size) / 2);
    var artBottom = artTop + size;

    // The idle-mode volume reveal zone is a strip against the window's right
    // edge, sized from the free space beside the art — recompute it here too, since this is
    // the one place art's size is known to have just changed (idle
    // entry/exit, resize, zoom, tab switches all already call this).
    var idleZone = document.getElementById('idleVolumeZone');
    if (idleZone) {
      // Zone layout (matches reference image):
      // Orange = right of cover, top of window → bottom of cover (no overlap with yellow).
      // Yellow = full width, below the cover → bottom of window (handled by swipe handler).
      _idleArtBottom = artBottom; // partagé avec le swipe handler pour restreindre le exit idle
      idleZone.style.left   = artRight + 'px';
      idleZone.style.right  = '0';
      idleZone.style.width  = '';
      idleZone.style.top    = '0';
      idleZone.style.bottom = (swH - artBottom) + 'px';
      // Centrer le track de volume horizontalement dans la bande droite (artRight → bord droit)
      var volBar = document.getElementById('idleVolBar');
      if (volBar) {
        var stripW  = swW - artRight; // largeur de la bande orange
        var barW    = volBar.offsetWidth || 5;
        volBar.style.right = '';
        volBar.style.left  = Math.round(artRight + stripW / 2 - barW / 2) + 'px';
      }
      // Idle: the volume bar's "85%" label hangs 36px under the bar (which ends
      // at 85% of the height). If the title block reaches down to it, keep the
      // title narrow enough not to run under the label.
      var infoBottom = $trackInfo.offsetTop + $trackInfo.offsetHeight;
      if (isIdle && infoBottom > swH * 0.85) {
        var barCentre = artRight + (swW - artRight) / 2;
        $trackInfo.style.maxWidth = Math.max(120, Math.floor(2 * (barCentre - 48 - swW / 2))) + 'px';
      } else {
        $trackInfo.style.maxWidth = '';
      }
    }

    // Tick: centred in the space above the cover (nudged 10px down in normal
    // mode, where that space is mostly padding), but never closer than
    // BADGE_GAP to the cover.
    // Immersive mode: nudged 10px up, which leaves the cover more room to slide up.
    var badgeTop = artTop / 2 - badgeH / 2 + (isIdle ? -10 : 10);
    badgeTop = Math.max(4, Math.min(badgeTop, artTop - badgeH - BADGE_GAP));
    $likedBadge.style.top = Math.round(badgeTop) + 'px';
    $likedBadge.style.visibility = '';
    // + button position is handled by CSS; clear any leftover inline top.
    document.getElementById('addToLibraryWrap').style.top = '';

    _artBox.left = artLeft; _artBox.top = artTop;
    fitPlaylistBadge();
  }
  // Playlist name pill (top-left corner of the player): when the cover
  // reaches up to its height, stop the pill before the cover's left edge.
  // Called whenever the cover is refitted or the pill's text/visibility changes.
  var _artBox = { left: 0, top: 0 }; // cover position inside #swipeZone, from fitArtSquare
  var _settleUntil = 0; // while Date.now() < this, the idle morph is playing: no intermediate refits
  function fitPlaylistBadge(){
    if ($playlistBadge.hidden || !$playlistBadge.offsetHeight) return;
    var pillBottom = $playlistBadge.offsetTop + $playlistBadge.offsetHeight;
    if (_artBox.top + $swipeZone.offsetTop < pillBottom + 6) {
      var room = $swipeZone.offsetLeft + _artBox.left - $playlistBadge.offsetLeft - 10;
      $playlistBadge.style.maxWidth = Math.max(48, room) + 'px';
    } else {
      $playlistBadge.style.maxWidth = '';
    }
  }
  // Window resized, or zoom changed (Ctrl +/-/wheel also changes the CSS size
  // of the window): rescale the interface, refit the cover, resize the background.
  var _fitSuspended = false; // true while a window change + immersive morph is being orchestrated (see morphWithWindow)
  function onViewportChange(){
    applyUiScale();
    if (!_fitSuspended) fitArtSquare();
    refreshBg(false);
  }
  window.addEventListener('resize', onViewportChange);
  // The room left for the cover also changes without any window resize: while
  // the idle morph plays, when the web fonts finish loading, when a longer
  // title arrives... Refit once that room has stopped changing (debounced, so
  // the cover is not re-targeted on every frame of an animation).
  if (window.ResizeObserver){
    var refitDebounce = null;
    var artRoomObserver = new ResizeObserver(function(){
      clearTimeout(refitDebounce);
      // During the idle morph the room changes on every frame: refitting then made the
      // cover shrink and re-grow. Wait until the morph is over instead.
      var wait = Math.max(80, _settleUntil - Date.now() + 40);
      refitDebounce = setTimeout(function(){ if (!_fitSuspended) fitArtSquare(); }, wait);
    });
    artRoomObserver.observe($artWrap);
    artRoomObserver.observe($trackInfo);
  }

  function play(){
    if (localMode){ local.play(); return; }
    if (useRealPlayback){
      if (playSavedTrack()) return; // reopened with nothing loaded: resume last music
      // Shown immediately rather than waiting for the next ~2s poll —
      // without this, pressing play/pause visibly does nothing for up
      // to 2 seconds. The next poll still confirms/corrects it either way.
      state.playing = true;
      lastPlayChangeAt = Date.now();
      setPlayIcon(true);
      syncBgToPlayState(true);
      playPath().then(function(path){ return spotifyApi(path, { method: 'PUT' }).then(pollSoon); }).catch(function(err){
        state.playing = false;
        setPlayIcon(false);
        syncBgToPlayState(false);
        showToast(friendlySpotifyError(err));
      });
      return;
    }
    if (state.playing) return;
    state.playing = true;
    setPlayIcon(true);
    syncBgToPlayState(true);
    var last = performance.now();
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(function(){
      var now = performance.now();
      var deltaReal = (now - last) / 1000;
      last = now;
      state.elapsed += deltaReal * SPEED;
      var t = currentTrack();
      if (t && state.elapsed >= t.duration){
        if (state.repeat){
          state.elapsed = 0;
          updateProgress();
          return;
        }
        next(true);
        return;
      }
      updateProgress();
    }, 200);
  }

  function pause(){
    if (localMode){ local.pause(); return; }
    if (useRealPlayback){
      state.playing = false;
      lastPlayChangeAt = Date.now();
      setPlayIcon(false);
      syncBgToPlayState(false);
      spotifyApi('/me/player/pause', { method: 'PUT' }).then(pollSoon).catch(function(err){
        showToast(friendlySpotifyError(err));
      });
      return;
    }
    state.playing = false;
    setPlayIcon(false);
    syncBgToPlayState(false);
    if (state.timer){ clearInterval(state.timer); state.timer = null; }
  }

  // In immersive mode, show the new play/pause symbol on the cover for 1 s,
  // then let CSS fade it out.
  var flashTimer = null;
  function flashPlayState(){
    if (!document.getElementById('app').classList.contains('idle')) return;
    $art.classList.add('flash');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function(){ $art.classList.remove('flash'); }, 1000);
  }
  function togglePlay(){ state.playing ? pause() : play(); flashPlayState(); }

  function pickNextIndex(){
    if (state.shuffle && state.queue.length > 1){
      var i;
      do { i = Math.floor(Math.random() * state.queue.length); } while (i === state.index);
      return i;
    }
    return (state.index + 1) % state.queue.length;
  }
  function pickPrevIndex(){
    if (state.shuffle && state.queue.length > 1){
      var i;
      do { i = Math.floor(Math.random() * state.queue.length); } while (i === state.index);
      return i;
    }
    return (state.index - 1 + state.queue.length) % state.queue.length;
  }

  function next(auto, skipShake){
    if (localMode){ local.next(); return; }
    if (useRealPlayback){
      optimisticSwitch(queueItems.shift());
      spotifyApi('/me/player/next', { method: 'POST' }).then(pollSoon).catch(function(err){ showToast(friendlySpotifyError(err)); }); return; }
    state.index = pickNextIndex();
    renderTrack();
    if (!auto && !skipShake){
      var z = document.getElementById('swipeZone');
      z.classList.remove('anim-prev'); void z.offsetWidth; z.classList.add('anim-next');
    }
    if (state.playing || auto) play();
    renderLibraryPlayingState();
  }
  function prev(skipShake){
    if (localMode){ local.prev(); return; }
    if (useRealPlayback){
      // A swipe/press on "previous" means the previous TRACK. Spotify's own
      // rule is "restart the current track if more than ~3 s have played",
      // so in that case a second 'previous' is sent right after the first.
      var restartsFirst = state.elapsed >= 3;
      if (trackHistory.length) {
        lastOptimisticAt = Date.now();
        var back = trackHistory.pop();
        saveHistory();
        if (currentRealItem) queueItems.unshift(currentRealItem);
        showRealTrackDisplay(back);
        state.elapsed = 0;
        renderRealProgress();
      }
      if (restartsFirst) {
        spotifyApi('/me/player/previous', { method: 'POST' }).catch(function(){});
        setTimeout(function(){
          spotifyApi('/me/player/previous', { method: 'POST' }).then(pollSoon).catch(function(err){ showToast(friendlySpotifyError(err)); });
        }, 200);
        return;
      }
      spotifyApi('/me/player/previous', { method: 'POST' }).then(pollSoon).catch(function(err){ showToast(friendlySpotifyError(err)); }); return; }
    state.index = pickPrevIndex();
    renderTrack();
    if (!skipShake){
      var z = document.getElementById('swipeZone');
      z.classList.remove('anim-next'); void z.offsetWidth; z.classList.add('anim-prev');
    }
    if (state.playing) play();
    renderLibraryPlayingState();
  }

  function toggleShuffle(){
    if (localMode){ local.toggleShuffle(); return; }
    if (useRealPlayback){
      var next = !$shuffleBtn.classList.contains('on');
      // Set this button's own state right away and leave repeat alone —
      // each button only ever touches its own API call and its own
      // class, so they can never visibly affect one another. The next
      // regular poll reconciles if the request actually failed.
      $shuffleBtn.classList.toggle('on', next);
      lastShuffleChangeAt = Date.now();
      spotifyApi('/me/player/shuffle?state=' + next, { method: 'PUT' }).catch(function(err){
        $shuffleBtn.classList.toggle('on', !next);
        showToast(friendlySpotifyError(err));
      });
      return;
    }
    state.shuffle = !state.shuffle;
    $shuffleBtn.classList.toggle('on', state.shuffle);
  }
  function toggleRepeat(){
    if (localMode){ local.toggleRepeat(); return; }
    if (useRealPlayback){
      var isOn = $repeatBtn.classList.contains('on');
      var newState = isOn ? 'off' : 'track';
      $repeatBtn.classList.toggle('on', !isOn);
      lastRepeatChangeAt = Date.now();
      spotifyApi('/me/player/repeat?state=' + newState, { method: 'PUT' }).catch(function(err){
        $repeatBtn.classList.toggle('on', isOn);
        showToast(friendlySpotifyError(err));
      });
      return;
    }
    state.repeat = !state.repeat;
    $repeatBtn.classList.toggle('on', state.repeat);
  }

  // ---------------- Controls ----------------
  // Last pointer type used (mouse vs finger/pen) — drives the hover CSS above.
  (function(){
    var root = document.documentElement;
    root.setAttribute('data-input', 'mouse');
    function set(e){
      var t = (e.pointerType === 'touch' || e.pointerType === 'pen') ? 'touch' : 'mouse';
      if (root.getAttribute('data-input') !== t) root.setAttribute('data-input', t);
    }
    document.addEventListener('pointerdown', set, true);
    document.addEventListener('pointermove', function(e){ if (e.pointerType === 'mouse') set(e); }, true);
  })();

  // Chromium (Windows) bug: after a button click, :hover/:active CSS states
  // don't repaint until the mouse moves again. Force a style recalculation
  // immediately after each click so the button shows its correct state at once.
  function forceRepaint(el){
    void el.offsetHeight; // triggers synchronous layout + repaint
    // Don't keep keyboard focus on a button clicked with the mouse or a finger
    // (e.detail is 0 for a keyboard "click"): a focused button would also be
    // pressed by the next Space / Enter key.
    if (window.event && window.event.detail > 0) el.blur();
  }

  document.getElementById('playBtn').addEventListener('click', function(e){ togglePlay(); forceRepaint(e.currentTarget); });
  document.getElementById('nextBtn').addEventListener('click', function(e){ next(false); forceRepaint(e.currentTarget); });
  document.getElementById('prevBtn').addEventListener('click', function(e){ prev(); forceRepaint(e.currentTarget); });
  $shuffleBtn.addEventListener('click', function(e){ toggleShuffle(); forceRepaint(e.currentTarget); });
  $repeatBtn.addEventListener('click', function(e){ toggleRepeat(); forceRepaint(e.currentTarget); });

  // Supports both a plain tap/click (jump to that point) and dragging a
  // finger/pointer along the bar to scrub, the same way the volume rail
  // already works.
  (function(){
    var seekDragging = false;
    var $seekTarget = document.getElementById('progressWrap');
    function pctFromClientX(clientX){
      var r = $progressBar.getBoundingClientRect();
      return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    }
    function previewSeek(pct){
      if (localMode){ local.previewSeek(pct); return; }
      // Visual-only while dragging: moves the fill/time immediately so
      // the finger feels like it's actually dragging something, without
      // spamming the Spotify API on every pixel of movement.
      if (useRealPlayback){
        if (!realPlaybackMeta.durationMs) return;
        state.elapsed = (pct * realPlaybackMeta.durationMs) / 1000;
        renderRealProgress();
        return;
      }
      var t = currentTrack(); if (!t) return;
      state.elapsed = pct * t.duration;
      updateProgress();
    }
    function commitSeek(pct){
      if (localMode){ local.seek(pct); return; }
      if (useRealPlayback){
        if (!realPlaybackMeta.durationMs) return;
        var positionMs = Math.round(pct * realPlaybackMeta.durationMs);
        spotifyApi('/me/player/seek?position_ms=' + positionMs, { method: 'PUT' }).catch(function(){});
        state.elapsed = positionMs / 1000;
        renderRealProgress();
        return;
      }
      previewSeek(pct); // demo mode has no server round-trip to wait on
    }
    // Used by the cover swipe (immersive mode) to scrub through the track.
    // info(): where we are now + how often it is reasonable to send a seek
    // (the local <audio> can take one every 200 ms, the Spotify API much fewer).
    // to(sec): absolute position, same path as dragging the progress bar.
    seekControl = {
      info: function(){
        var d;
        if (localMode) d = local.duration ? local.duration() : 0;
        else if (useRealPlayback) d = realPlaybackMeta.durationMs / 1000;
        else { var t = currentTrack(); d = t ? t.duration : 0; }
        return { elapsed: state.elapsed || 0, duration: d || 0, everyMs: localMode ? 200 : (useRealPlayback ? 700 : 100) };
      },
      to: function(sec){
        var d = this.info().duration;
        if (!d) return;
        commitSeek(Math.max(0, Math.min(d - 1, sec)) / d);
      }
    };
    $seekTarget.addEventListener('pointerdown', function(e){
      seekDragging = true;
      try { $seekTarget.setPointerCapture(e.pointerId); } catch(err){}
      e.preventDefault();
      previewSeek(pctFromClientX(e.clientX));
    });
    $seekTarget.addEventListener('pointermove', function(e){
      if (!seekDragging) return;
      previewSeek(pctFromClientX(e.clientX));
    });
    $seekTarget.addEventListener('pointerup', function(e){
      if (!seekDragging) return;
      seekDragging = false;
      commitSeek(pctFromClientX(e.clientX));
    });
    $seekTarget.addEventListener('pointercancel', function(){ seekDragging = false; });
  })();

  // ---------------- Swipe (changer de titre, pochette suit le doigt) ----------------
  // Handles ONLY horizontal drag (swipe to change track) and tap/double-tap.
  // Volume is a separate, dedicated gesture on the right-edge zone below —
  // this used to also handle a vertical "drag anywhere to adjust volume"
  // gesture, but detecting that reliably alongside horizontal swipe proved
  // too fragile on real touch input, so it's been split out entirely.
  (function(){
    var zone = document.getElementById('swipeZone');
    var startX = 0, startY = 0, startYInZone = 0, dragging = false, locked = null, pid = null;
    var genId = 0; // bumped on every new gesture so a stale "hand back to CSS" timeout can't clobber a newer one
    var downOnArt = false; // did this touch start on the cover?
    // Immersive mode: dragging the cover up/down changes the volume. The cover
    // follows the finger with growing resistance and can never reach the tick
    // above it nor the title below it; on release it glides back to centre.
    var vg = null; // current volume gesture: { y0, vol0, up, down }
    // Immersive mode, horizontal drag on the cover:
    //  - past 30% of the cover's width: release changes track (left = next, right = previous);
    //  - less: the track is SCRUBBED for as long as the cover is held off-centre
    //    (right = forward, left = back). The speed is proportional to how far
    //    the cover is pushed, from 0 up to SCRUB_SPEED_AT_CHANGE (seconds of
    //    track per real second) just before the change-track distance.
    var CHANGE_TRACK_FRAC = 0.30;
    var SCRUB_SPEED_AT_CHANGE = 30;
    var SEEK_DEAD_PX = 12; // layout px: a smaller wiggle does nothing
    var $seekHint = document.getElementById('seekHint');
    function swipeInfo(dx){ // dx in screen px
      var dxL = dx / uiScale, limit = $art.offsetWidth * CHANGE_TRACK_FRAC;
      if (Math.abs(dxL) > limit) return { mode: 'change', dir: dxL < 0 ? 'next' : 'prev', speed: 0 };
      if (Math.abs(dxL) < SEEK_DEAD_PX) return { mode: 'none', speed: 0 };
      var t = (Math.abs(dxL) - SEEK_DEAD_PX) / Math.max(1, limit - SEEK_DEAD_PX); // 0..1
      return { mode: 'seek', speed: (dxL < 0 ? -1 : 1) * t * SCRUB_SPEED_AT_CHANGE };
    }
    // Scrub state for the current gesture (null when the track length is unknown).
    var scrub = null, scrubTimer = null, curDx = 0;
    function showHint(info){
      if (!$seekHint) return;
      if (info.mode === 'none') { $seekHint.classList.remove('show', 'commit'); return; }
      $seekHint.textContent = info.mode === 'change'
        ? (info.dir === 'next' ? 'Next \u203A' : '\u2039 Previous')
        : (info.seconds < 0 ? '\u2212' : '+') + fmt(Math.abs(info.seconds));
      $seekHint.classList.toggle('commit', info.mode === 'change');
      $seekHint.classList.add('show');
    }
    function scrubTick(){
      var now = performance.now();
      var info = swipeInfo(curDx);
      if (!scrub){ showHint(info.mode === 'change' ? info : { mode: 'none' }); return; }
      var dt = Math.min(0.2, (now - scrub.last) / 1000); // a stalled frame must not teleport
      scrub.last = now;
      if (info.mode === 'seek') scrub.pos = Math.max(0, Math.min(scrub.dur - 1, scrub.pos + info.speed * dt));
      var delta = scrub.pos - scrub.pos0;
      if (info.mode === 'change') showHint(info);
      else if (info.mode === 'seek' || Math.abs(delta) >= 1) showHint({ mode: 'seek', seconds: delta });
      else showHint({ mode: 'none' });
      // Send the new position now and then (not at every frame).
      if (info.mode === 'seek' && Math.abs(scrub.pos - scrub.sentPos) >= 1 && now - scrub.sentAt >= scrub.everyMs){
        seekControl.to(scrub.pos); scrub.sentAt = now; scrub.sentPos = scrub.pos;
      }
    }
    function startScrub(){
      if (scrubTimer) return;
      var i = seekControl ? seekControl.info() : null;
      scrub = (i && i.duration) ? { pos0: i.elapsed, pos: i.elapsed, dur: i.duration, last: performance.now(), sentAt: 0, sentPos: i.elapsed, everyMs: i.everyMs } : null;
      scrubTimer = setInterval(scrubTick, 50);
    }
    function stopScrub(commit){
      if (scrubTimer){ clearInterval(scrubTimer); scrubTimer = null; }
      if (commit && scrub && Math.abs(scrub.pos - scrub.sentPos) > 0.01) seekControl.to(scrub.pos);
      scrub = null;
    }
    function hideHint(){ if ($seekHint) $seekHint.classList.remove('show', 'commit'); }
    var COVER_SLIDE_MAX = 120; // layout px: cap on the travel, even in a tall window
    var COVER_SLIDE_GAP = 6;   // layout px kept between the cover and the tick/title
    function coverSlideLimits(){
      var artTop = _artBox.top, artBottom = _artBox.top + $art.offsetHeight;
      var tickBottom = $likedBadge.offsetTop + $likedBadge.offsetHeight;
      var up = artTop - tickBottom - COVER_SLIDE_GAP;
      var down = $trackInfo.offsetTop - artBottom - COVER_SLIDE_GAP;
      return { up: Math.max(0, Math.min(COVER_SLIDE_MAX, up)), down: Math.max(0, Math.min(COVER_SLIDE_MAX, down)) };
    }
    // tanh: ~1:1 near the start, then ever stiffer, and never past `limit`.
    function softLimit(raw, limit){
      if (limit <= 0) return 0;
      return (raw < 0 ? -1 : 1) * limit * Math.tanh(Math.abs(raw) / limit);
    }
    function volumeDrag(e){
      if (!vg){
        var lim = coverSlideLimits();
        vg = { y0: e.clientY, vol0: state.volume, up: lim.up, down: lim.down };
      }
      var d = e.clientY - vg.y0; // screen px, + = finger moved down
      state.volume = Math.max(0, Math.min(100, vg.vol0 - (d / VOLUME_DRAG_PX) * 100));
      if (updateVolumeDisplay) updateVolumeDisplay();
      if (onVolumeChange) onVolumeChange(state.volume);
      if (showIdleVolumeBar) showIdleVolumeBar();       // show the level while dragging
      if (scheduleIdleVolumeHide) scheduleIdleVolumeHide();
      var raw = d / uiScale; // layout px
      $art.style.transform = 'translate3d(0,' + softLimit(raw, raw < 0 ? vg.up : vg.down).toFixed(1) + 'px,0)';
    }

    function noTransition(){ $art.style.transition = 'none'; }
    function releaseToCss(expectedGen, delay){
      setTimeout(function(){ if (genId === expectedGen) $art.style.transition = ''; }, delay);
    }

    function onDown(e){
      if (e.target.closest('#transport') || e.target.closest('#progressWrap') || e.target.closest('#addToLibraryWrap') || e.target.closest('#likedBadge')) return;
      genId++;
      vg = null;
      stopScrub(false);
      curDx = 0;
      downOnArt = !!e.target.closest('#art');
      dragging = true; locked = null; pid = e.pointerId;
      startX = e.clientX; startY = e.clientY;
      // Position Y relative à swipeZone, pour restreindre le exit-idle à la zone jaune
      var zoneRect = zone.getBoundingClientRect();
      startYInZone = (e.clientY - zoneRect.top) / uiScale; // layout px, like _idleArtBottom
      try { zone.setPointerCapture(pid); } catch(err){}
      noTransition();
    }
    function onMove(e){
      if (!dragging) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (locked === null){
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6){
          locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        }
      }
      // Swipe up (idle only): exit immersive mode.
      // Restreint à la zone jaune = en dessous de la pochette (_idleArtBottom).
      if (locked === 'y'){
        if (dy < -55 && document.getElementById('app').classList.contains('idle') && startYInZone > _idleArtBottom){
          dragging = false; locked = null;
          snapBack();
          idle.exitIdle();
          return;
        }
        if (downOnArt && $app.classList.contains('idle')) volumeDrag(e);
        return;
      }
      if (locked !== 'x') return;
      noTransition();
      $art.style.transform = 'translateX(' + (dx / uiScale) + 'px)'; // follow the finger 1:1 on screen
      $art.style.opacity = String(Math.max(0.35, 1 - Math.abs(dx) / 520));
      if ($app.classList.contains('idle')){ curDx = dx; startScrub(); }
    }
    function finishSwipe(direction){
      hideHint();
      var w = $art.offsetWidth;
      var out = direction === 'next' ? -(w * 0.9 + 60) : (w * 0.9 + 60);
      $art.style.transition = 'transform .26s cubic-bezier(.3,.5,.3,1), opacity .26s ease';
      $art.style.transform = 'translateX(' + out + 'px)';
      $art.style.opacity = '0';
      setTimeout(function(){
        if (direction === 'next') next(false, true); else prev(true);
        var enterX = direction === 'next' ? (w * 0.9 + 60) : -(w * 0.9 + 60);
        $art.style.transition = 'none';
        $art.style.transform = 'translateX(' + enterX + 'px)';
        $art.style.opacity = '0';
        void $art.offsetWidth;
        $art.style.transition = 'transform .32s cubic-bezier(.2,.7,.3,1), opacity .32s ease';
        $art.style.transform = 'translateX(0)';
        $art.style.opacity = '1';
        // Hand control back to the stylesheet once this entrance animation
        // settles, so the idle-mode width/height zoom (defined in CSS, not
        // here) animates smoothly instead of snapping — an inline
        // `transition` left set from the swipe would otherwise silently
        // override it indefinitely.
        releaseToCss(genId, 340);
      }, 220);
    }
    function snapBack(){
      hideHint();
      $art.style.transition = 'transform .25s cubic-bezier(.2,.7,.3,1), opacity .25s ease';
      $art.style.transform = 'translateX(0)';
      $art.style.opacity = '1';
      releaseToCss(genId, 260);
    }
    function onUp(e){
      if (!dragging) return;
      dragging = false;
      if (locked === 'x'){
        var dx = e.clientX - startX;
        if ($app.classList.contains('idle')) {
          var info = swipeInfo(dx);
          if (info.mode === 'change'){ stopScrub(false); finishSwipe(info.dir); }
          else { stopScrub(true); snapBack(); }
        }
        else if (Math.abs(dx) > 55) finishSwipe(dx < 0 ? 'next' : 'prev');
        else snapBack();
      } else if (locked === null){
        // A tap, not a drag. Tap on the cover toggles play/pause.
        // The toggle is done HERE rather than in a 'click' listener on the
        // cover: this zone holds pointer capture during the gesture, which
        // makes the browser aim the click at the zone instead of the cover.
        if (downOnArt) togglePlay();
      }
      if (vg){ vg = null; snapBack(); }
      locked = null;
    }
    zone.addEventListener('pointerdown', onDown);
    zone.addEventListener('pointermove', onMove);
    zone.addEventListener('pointerup', onUp);
    zone.addEventListener('pointercancel', function(){ if (dragging){ dragging = false; locked = null; vg = null; stopScrub(false); snapBack(); } });
  })();

  // ---------------- Volume reveal zone (idle mode) ----------------
  // A strip against the window's right edge (about 45% of the space beside
  // the cover; its bounds are kept in sync by fitArtSquare, above). The rest
  // of that space stays free for the double-tap that leaves immersive mode. While
  // idle: a single tap here reveals the volume rail (sliding in from the
  // right); once revealed, dragging up/down in this same zone adjusts
  // the volume. A tap reveals the bar; a drag (including from that same
  // first touch) adjusts the volume immediately and calls onVolumeChange.
  (function(){
    var zone = document.getElementById('idleVolumeZone');
    var app = document.getElementById('app');
    var dragging = false, startY = 0, startVolume = 0, pid = null, hideTimer = null;
    var iFill = document.getElementById('idleVolFill');
    var iThumb = document.getElementById('idleVolThumb');
    var iLabel = document.getElementById('idleVolLabel');
    var iIcon = document.getElementById('idleVolIcon');

    function isIdle(){ return app.classList.contains('idle'); }

    function updateIdleBar(){
      if (!iFill) return;
      var pct = state.volume;
      iFill.style.height = pct + '%';
      if (iThumb) iThumb.style.bottom = pct + '%';
      if (iLabel) iLabel.textContent = Math.round(pct) + '%';
      if (iIcon) {
        var level = pct === 0 ? 'mute' : (pct <= 33 ? 1 : (pct <= 66 ? 2 : 3));
        var svg = iIcon.querySelector('svg');
        if (svg) svg.innerHTML = VOL_ICONS_MAP[level];
      }
    }

    function scheduleHide(){
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(function(){
        app.classList.remove('volume-revealed');
        hideTimer = null;
      }, 2500);
    }

    // Expose for the wheel handler (defined earlier in outer scope).
    showIdleVolumeBar = function(){
      if (!isIdle()) return;
      app.classList.add('volume-revealed');
      updateIdleBar();
    };
    scheduleIdleVolumeHide = function(){
      if (!isIdle()) return;
      scheduleHide();
    };

    zone.addEventListener('pointerdown', function(e){
      if (!isIdle()) return;
      // Let taps on the liked badge pass through even though the volume zone
      // now covers the full height of the swipeZone.
      if (e.target.closest('#likedBadge')) return;
      // Reveal the bar if not already shown, then start drag immediately —
      // even on the first touch so tap-and-drag works in one gesture.
      if (!app.classList.contains('volume-revealed')){
        app.classList.add('volume-revealed');
        updateIdleBar();
      }
      dragging = true; pid = e.pointerId;
      startY = e.clientY; startVolume = state.volume;
      try { zone.setPointerCapture(pid); } catch(err){}
      scheduleHide();
      e.preventDefault();
    }, { passive: false });

    zone.addEventListener('pointermove', function(e){
      if (!dragging) return;
      var dy = e.clientY - startY;
      var deltaVol = -(dy / VOLUME_DRAG_PX) * 100;
      state.volume = Math.max(0, Math.min(100, startVolume + deltaVol));
      updateIdleBar();
      if (updateVolumeDisplay) updateVolumeDisplay();
      if (onVolumeChange) onVolumeChange(state.volume);
      scheduleHide();
    });

    function endDrag(){
      if (!dragging) return;
      dragging = false;
      scheduleHide();
    }
    zone.addEventListener('pointerup', endDrag);
    zone.addEventListener('pointercancel', endDrag);
  })();

  // ---------------- Volume rail ----------------
  (function(){
    var track = document.getElementById('volTrack');
    var fill = document.getElementById('volFill');
    var thumb = document.getElementById('volThumb');
    var label = document.getElementById('volLabel');
    var muteBtn = document.getElementById('muteBtn');
    var volIcon = document.getElementById('volIcon');
    var lastVolume = state.volume;

    function render(){
      fill.style.height = state.volume + '%';
      thumb.style.bottom = state.volume + '%';
      label.textContent = Math.round(state.volume) + '%';
      var level = state.volume === 0 ? 'mute' : (state.volume <= 33 ? 1 : (state.volume <= 66 ? 2 : 3));
      volIcon.innerHTML = VOL_ICONS_MAP[level];
    }
    // The whole #volumeRail is the drag target — much easier to hit than the
    // narrow track alone. Dragging up/down moves the volume relative to where
    // it was when the touch started (no jump-to-position behaviour).
    var rail = document.getElementById('volumeRail');
    var dragging = false, dragStartY = 0, dragStartVol = 0, dragPid = null;
    function notifyVolumeChange(){ if (onVolumeChange) onVolumeChange(state.volume); }
    rail.addEventListener('pointerdown', function(e){
      if (e.target === muteBtn || muteBtn.contains(e.target)) return; // let mute button work normally
      dragging = true; dragPid = e.pointerId;
      dragStartY = e.clientY; dragStartVol = state.volume;
      try { rail.setPointerCapture(dragPid); } catch (err) {}
      e.preventDefault();
    });
    rail.addEventListener('pointermove', function(e){
      if (!dragging) return;
      var v = dragStartVol - ((e.clientY - dragStartY) / VOLUME_DRAG_PX) * 100;
      state.volume = Math.max(0, Math.min(100, v));
      render(); notifyVolumeChange();
    });
    rail.addEventListener('pointercancel', function(){ dragging = false; });
    rail.addEventListener('pointerup', function(){ dragging = false; });
    muteBtn.addEventListener('click', function(){
      if (state.volume > 0){ lastVolume = state.volume; state.volume = 0; }
      else { state.volume = lastVolume || 70; }
      render();
      notifyVolumeChange();
    });
    updateVolumeDisplay = render; // shared with the swipe-up/down-on-art volume gesture
    render();
  })();

  // Shared toast, used by the add-to-playlist menu and by anything else
  // that needs a quick, non-blocking status message (e.g. shuffle/repeat
  // failures below).
  var $toast = document.getElementById('toast');
  // Direct child of #app: messages raised from Library / Search / Settings
  // were invisible while the toast lived inside the (hidden) player view.
  $app.appendChild($toast);
  var toastTimer = null;
  function showToast(msg){
    if (!msg) return; // callers pass '' when a dialog already explained the problem
    $toast.textContent = msg;
    // Just above the tab bar — and above the "Back to Player" button in Settings.
    var exitWrap = document.getElementById('settingsExitWrap');
    $toast.style.bottom = (document.getElementById('tabbar').offsetHeight + (exitWrap.offsetParent ? exitWrap.offsetHeight : 0) + 12) + 'px';
    $toast.hidden = false;
    requestAnimationFrame(function(){ $toast.classList.add('show'); });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){
      $toast.classList.remove('show');
      setTimeout(function(){ $toast.hidden = true; }, 200);
    }, 1800);
  }

  // ---------------- Ajouter à une bibliothèque ----------------
  (function(){
    var addBtn = document.getElementById('addBtn');
    var menu = document.getElementById('addMenu');
    // Backdrop and menu are direct children of #app: they cover the whole
    // window (never clipped by a view that is display:none or by the animated
    // #swipeZone), and they are scaled together with the rest of the interface.
    var backdrop = document.createElement('div');
    backdrop.id = 'addBackdrop';
    backdrop.hidden = true;
    $app.appendChild(backdrop);
    $app.appendChild(menu);

    function closeMenu(){
      menu.hidden = true;
      menu.classList.remove('idle-menu');
      backdrop.hidden = true;
      addBtn.setAttribute('aria-expanded', 'false');
    }

    // fetchRealPlaylists() is shared (defined with the other real-data
    // helpers below) so the Library tab and this menu reuse one cache
    // instead of each fetching the playlist list separately.

    // Adds the current track to one of the user's playlists (Spotify Web API,
    // "Add Items to Playlist": POST /playlists/{id}/items — the older
    // /tracks path was removed by Spotify in March 2026).
    function postTrackToPlaylist(pl, trackUri, trackId){
      return spotifyApi('/playlists/' + pl.id + '/items', {
        method: 'POST',
        body: JSON.stringify({ uris: [trackUri] })
      }).then(function(res){
        notePlaylistGained(pl, trackId, res && res.snapshot_id);
        if (realPlaybackMeta.trackId === trackId) paintRealTick(trackId);
        showToast('Added to “' + pl.name + '”');
      });
    }
    function addTrackToRealPlaylist(pl){
      closeMenu();
      var trackUri = realPlaybackMeta.trackUri, trackId = realPlaybackMeta.trackId;
      if (!trackUri){ showToast('Nothing playing'); return; }
      // Spotify happily stores the same track twice in a playlist: don't.
      if (playlistHasTrack(pl.id, trackId)){ showToast('Already in “' + pl.name + '”'); return; }
      postTrackToPlaylist(pl, trackUri, trackId).catch(function(err){
        if (err && err.status === 403 && window.simplePlayer && window.simplePlayer.spotifyConnect) {
          // Token is missing the playlist-modify scope — show a dialog that
          // triggers reconnect (which re-requests all scopes) then retries.
          var back = document.createElement('div');
          back.id = 'dialogBackdrop';
          var box = document.createElement('div');
          box.id = 'dialogBox';
          box.setAttribute('role', 'dialog');
          box.innerHTML = '<h4>Permission needed</h4>' +
            '<p>Simple Player needs to reconnect to Spotify to add tracks to your playlists. ' +
            'Your browser will open — sign in, then come back here.</p>' +
            '<div class="dlg-actions"><button class="later">Later</button>' +
            '<button class="primary reconnect">Reconnect Spotify</button></div>';
          back.appendChild(box);
          $app.appendChild(back);
          function closeDialog(){ back.remove(); }
          back.addEventListener('click', function(e){ if (e.target === back) closeDialog(); });
          box.querySelector('.later').addEventListener('click', closeDialog);
          box.querySelector('.reconnect').addEventListener('click', function(){
            closeDialog();
            window.simplePlayer.spotifyConnect().then(function(res){
              if (!res.connected){ showToast('Could not reconnect. Open Settings and press Connect.'); return; }
              // Retry the add now that we have the right scopes
              postTrackToPlaylist(pl, trackUri, trackId).catch(function(){ showToast('Could not add the track. Check your connection and try again.'); });
            });
          });
        } else {
          showToast(friendlySpotifyError(err) || 'Could not add the track');
        }
      });
    }
    // "Save Items to Library": PUT /me/library?uris=… (replaces PUT /me/tracks).
    function likeCurrentRealTrack(){
      var trackId = realPlaybackMeta.trackId, trackUri = realPlaybackMeta.trackUri || ('spotify:track:' + trackId);
      if (likedKnown[trackId] === true){ showToast('Already in Liked Songs'); return; }
      spotifyApi('/me/library?uris=' + encodeURIComponent(trackUri), { method: 'PUT' }).then(function(){
        likedKnown[trackId] = true;
        if (realPlaybackMeta.trackId === trackId) paintRealTick(trackId);
        showToast('Added to Liked Songs');
        refreshLikedSection(); // the Library tab's Liked Songs list gains a row
      }).catch(function(err){ showToast(friendlySpotifyError(err) || 'Could not add the track'); });
    }

    var MENU_CHECK = '<svg class="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 12.5 10 17.5 19 7.5"/></svg>';
    function renderMenuItems(realPls, errorText){
      menu.innerHTML = '';
      var likedItem = document.createElement('button');
      likedItem.className = 'add-menu-item';
      likedItem.innerHTML = '<div class="swatch" style="background:var(--accent-soft);display:flex;align-items:center;justify-content:center;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--accent)" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg></div><span>Liked Songs</span>';
      if (useRealPlayback && likedKnown[realPlaybackMeta.trackId] === true) likedItem.insertAdjacentHTML('beforeend', MENU_CHECK);
      likedItem.addEventListener('click', function(){
        closeMenu();
        if (useRealPlayback){
          if (!realPlaybackMeta.trackId){ showToast('Nothing playing'); return; }
          likeCurrentRealTrack();
          return;
        }
        var t = currentTrack();
        if (t) likedSet.add(t.id);
        updateLikedBadge();
        showToast('Added to Liked Songs');
      });
      menu.appendChild(likedItem);

      var divider = document.createElement('div');
      divider.className = 'add-menu-divider';
      menu.appendChild(divider);

      if (realPls){
        // Real playlists: clicking one really calls the Spotify API.
        realPls.forEach(function(pl){
          var item = document.createElement('button');
          item.className = 'add-menu-item';
          var imgUrl = (pl.images && pl.images[0]) ? pl.images[0].url : '';
          item.innerHTML = '<div class="swatch" style="background-image:' + cssUrl(imgUrl) + ';background-color:var(--bg-elev-2);"></div><span></span>';
          item.querySelector('span').textContent = pl.name;
          // A tick on the playlists that already hold the current track.
          if (playlistHasTrack(pl.id, realPlaybackMeta.trackId)) item.insertAdjacentHTML('beforeend', MENU_CHECK);
          item.addEventListener('click', function(){ addTrackToRealPlaylist(pl); });
          menu.appendChild(item);
        });
        if (!realPls.length){
          var empty = document.createElement('div');
          empty.className = 'search-empty';
          // Show WHY when the list couldn't be loaded, instead of a bare "none".
          empty.textContent = errorText || 'No playlists found';
          menu.appendChild(empty);
        }
      } else {
        // Not connected to real playback: demo data, same as the Library tab.
        PLAYLISTS.forEach(function(pl){
          var item = document.createElement('button');
          item.className = 'add-menu-item';
          item.innerHTML = '<div class="swatch" style="background-image:' + cssUrl(makeArt('pl:'+pl.id)) + '"></div><span></span>';
          item.querySelector('span').textContent = pl.name;
          item.addEventListener('click', function(){ closeMenu(); showToast('Added to "' + pl.name + '"'); });
          menu.appendChild(item);
        });
      }
    }

    function buildMenu(){
      if (useRealPlayback){
        renderMenuItems(sortPlaylistsLikeRecents(realPlaylistsCache || [])); // show immediately with whatever's cached (or empty)
        fetchRealPlaylists().then(function(pls){ if (!menu.hidden) renderMenuItems(sortPlaylistsLikeRecents(pls)); })
          .catch(function(err){ if (!menu.hidden) renderMenuItems([], friendlySpotifyError(err) || 'Could not load your playlists'); });
        // Pick up changes made in the Spotify app meanwhile (new playlist,
        // tracks added there), then redraw the ticks.
        refreshPlaylistIndex().then(function(){ if (!menu.hidden && realPlaylistsCache) renderMenuItems(sortPlaylistsLikeRecents(realPlaylistsCache)); });
      } else {
        renderMenuItems(null);
      }
    }

    addBtn.setAttribute('data-tip', 'Add to playlist');

    addBtn.addEventListener('click', function(){
      if (!menu.hidden){ closeMenu(); return; }
      if (localMode){ showToast('Playlists are not available for local files'); return; }
      buildMenu();
      // Just toggle idle-menu for positioning.
      var isIdleNow = document.getElementById('app').classList.contains('idle');
      menu.classList.toggle('idle-menu', isIdleNow);
      if (!isIdleNow){
        // In normal mode: anchor the menu above the + button.
        // Screen px -> layout px of #app (which may be scaled down).
        var btnRect = addBtn.getBoundingClientRect();
        var appRect = $app.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.bottom = ((appRect.bottom - btnRect.top) / uiScale + 10) + 'px';
        menu.style.left = '50%';
        menu.style.transform = 'translateX(-50%)';
        menu.style.top = '';
      } else {
        menu.style.position = '';
        menu.style.bottom = '';
        menu.style.left = '';
        menu.style.top = '';
        menu.style.transform = '';
      }
      menu.hidden = false;
      backdrop.hidden = false;
      addBtn.setAttribute('aria-expanded', 'true');
    });
    backdrop.addEventListener('click', closeMenu);
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeMenu(); });

    // The tick opens the same playlist chooser as the "+" button — in both
    // modes (in idle mode it is the only one of the two on screen).
    var $lbBtn = document.getElementById('likedBadge');
    if ($lbBtn) {
      $lbBtn.addEventListener('click', function(){
        var isIdleNow = document.getElementById('app').classList.contains('idle');
        if (!isIdleNow){ addBtn.click(); return; } // normal mode: exactly what the + button does
        if (!menu.hidden){ closeMenu(); return; }
        if (localMode){ showToast('Playlists are not available for local files'); return; }
        buildMenu();
        menu.classList.add('idle-menu');
        menu.style.position = '';
        menu.style.bottom = '';
        menu.style.left = '';
        menu.style.top = '';
        menu.style.transform = '';
        menu.hidden = false;
        backdrop.hidden = false;
      });
    }
  })();

  // The tab bar is always visible now (see #tabbar's CSS) — no reveal
  // gesture needed, so there's nothing to wire up here any more.

  // ---------------- Mode immersif (masque l'UI après 3s d'inactivité) ----------------
  var idle = (function(){
    var app = document.getElementById('app');
    var timer = null;
    function isPlayerActive(){ return isPlayerViewActive(); }
    // Fullscreen idle : passe en plein écran à l'entrée, sort au hover haut ou double-tap
    var _idleFullscreen = false; // true seulement si c'est le mode idle qui a mis la fenêtre en plein écran
    var _idleFsWanted = false;   // idle en cours : le plein écran est souhaité
    // Bande tout en haut de l'écran qui fait sortir du mode idle au survol.
    // Volontairement fine (le bord de l'écran) : à 60 px elle recouvrait la
    // tique, qu'on ne pouvait donc plus atteindre ni toucher en mode idle.
    var _idleHoverZone = 4;

    function enterIdleFullscreen(){
      // Resolves true if the window is about to change size (fullscreen requested).
      var sp = window.simplePlayer;
      if (!sp || !sp.setFullScreen) return Promise.resolve(false);
      _idleFsWanted = true;
      // Si la fenêtre est déjà en plein écran (F11), on n'y touche pas : sinon
      // la sortie du mode idle la ferait aussi sortir du plein écran choisi.
      var already = sp.isFullScreen ? sp.isFullScreen() : Promise.resolve(false);
      return already.then(function(isFs){
        if (isFs || !_idleFsWanted || _idleFullscreen) return false;
        _idleFullscreen = true;
        sp.setFullScreen(true);
        return true;
      }).catch(function(){ return false; });
    }
    function exitIdleFullscreen(){
      // Returns true if the window is about to change size.
      _idleFsWanted = false;
      if (_idleFullscreen && window.simplePlayer && window.simplePlayer.setFullScreen){
        _idleFullscreen = false;
        window.simplePlayer.setFullScreen(false);
        return true;
      }
      return false;
    }

    // Hover en haut de fenêtre → sortir du mode idle fullscreen
    // Vraie souris uniquement : un appui tactile produit lui aussi un
    // "mousemove" de compatibilité, qui ne doit pas compter comme un survol.
    document.addEventListener('pointermove', function(e){
      if (e.pointerType !== 'mouse') return;
      if (_idleFullscreen && e.clientY <= _idleHoverZone){
        exitIdle(); // also leaves fullscreen
      }
    }, { passive: true });

    var MORPH_MS = 620; // slightly over --morph-dur (600ms) so layout is settled
    var animTimer = null, refitTimer = null;
    function triggerIdleAnim(cls){
      app.classList.remove('idle-enter','idle-leave');
      // Force reflow so removing+adding the class triggers the animation fresh
      void app.offsetWidth; // eslint-disable-line no-void
      app.classList.add(cls);
      // Remove the class once the animation (--morph-dur) has fully played;
      // one timer only, so an older one can't cut a newer animation short.
      clearTimeout(animTimer);
      animTimer = setTimeout(function(){ app.classList.remove('idle-enter','idle-leave'); }, MORPH_MS);
    }
    // Switch to / from immersive mode with ONE smooth movement. The final layout is
    // measured first with transitions off (class morph-measure), the interface is put
    // back in its starting state, then the real switch runs and the cover and the tick
    // glide straight to the measured final values. Before, the cover was fitted on a
    // half-collapsed layout (it shrank), then refitted at the end (second movement,
    // tick jumping in one frame).
    // progressWrap and transport collapse with `max-height`, which CSS cannot animate from/to
    // "none": the space they take used to vanish (or come back) in ONE frame, shoving the cover.
    // So give them explicit pixel heights for the length of the morph.
    var collapsing = [document.getElementById('progressWrap'), document.getElementById('transport')];
    var heightsTimer = null;
    // Screen rectangles of the pieces that move during the switch (used to glide them from where they WERE).
    var flipEls = ['art','trackInfo','likedBadge','progressWrap','transport','tabbar','volumeRail'].map(function(id){ return document.getElementById(id); }).filter(Boolean);
    function snapshot(){
      return flipEls.map(function(el){ var r = el.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; });
    }
    var _morphSeq = 0, _morphPending = false;
    function morphTo(on, before){
      var natural = on ? collapsing.map(function(e){ return e.offsetHeight; }) : null;
      var oldW = $art.style.width, oldH = $art.style.height, oldTick = $likedBadge.style.top;
      var oldInfoMax = $trackInfo.style.maxWidth;
      app.classList.add('morph-measure');
      app.classList.toggle('idle', on);
      void app.offsetWidth; // eslint-disable-line no-void
      fitArtSquare();
      var fin = { w: $art.style.width, h: $art.style.height, tick: $likedBadge.style.top, infoMax: $trackInfo.style.maxWidth };
      if (!on) natural = collapsing.map(function(e){ return e.offsetHeight; }); // normal-mode heights, seen in the measure pass
      app.classList.toggle('idle', !on);
      $art.style.width = oldW; $art.style.height = oldH; $likedBadge.style.top = oldTick; $trackInfo.style.maxWidth = oldInfoMax;
      void app.offsetWidth; // eslint-disable-line no-void
      app.classList.remove('morph-measure');
      void app.offsetWidth; // eslint-disable-line no-void
      _settleUntil = Date.now() + MORPH_MS;
      clearTimeout(heightsTimer);
      if (on) collapsing.forEach(function(e, i){ e.style.maxHeight = natural[i] + 'px'; }); // start of the collapse = current height
      // The swipe code leaves an inline `transition` on the cover (none, or transform/opacity only):
      // that cancelled the width/height animation, so leaving immersive mode with a swipe made the
      // cover jump. Give the stylesheet's transition back first.
      $art.style.transition = '';
      void app.offsetWidth; // eslint-disable-line no-void
      // The window itself changed size a moment ago (fullscreen in / out), which re-laid everything out
      // in one frame. Each piece is made to START where it was on screen, then glides to its new place
      // with the layout morph. Done with the Web Animations API on the `translate` property: it runs on
      // top of the CSS transitions without touching them (an inline `transition` would replace the
      // per-state transitions of the stylesheet, and some pieces would jump).
      triggerIdleAnim(on ? 'idle-enter' : 'idle-leave');
      app.classList.toggle('idle', on);
      if (on) {
        collapsing.forEach(function(e){ e.style.maxHeight = ''; });                 // the idle rule (0) takes over: animates natural -> 0
      } else {
        collapsing.forEach(function(e){ e.style.maxHeight = '0px'; });             // start from the collapsed height...
        void app.offsetWidth; // eslint-disable-line no-void
        collapsing.forEach(function(e, i){ e.style.maxHeight = natural[i] + 'px'; }); // ...and grow to the natural one
        heightsTimer = setTimeout(function(){ collapsing.forEach(function(e){ e.style.maxHeight = ''; }); }, MORPH_MS + 40);
      }
      $art.style.width = fin.w; $art.style.height = fin.h; $likedBadge.style.top = fin.tick; $trackInfo.style.maxWidth = fin.infoMax;
      // The window itself changed size a moment ago (fullscreen in / out), which re-laid everything out
      // in one frame; and switching the class also moves a few things at once (what is not animated by
      // CSS). So measure where each piece is drawn on the FIRST frame of the morph and make it START
      // where it was on screen before the window changed, then glide to its place with the morph.
      // Done with the Web Animations API on `translate`: it runs on top of the CSS transitions without
      // touching them (an inline `transition` would replace the per-state transitions of the
      // stylesheet and some pieces would jump).
      if (before){
        var k = uiScale || 1;
        var first = snapshot();
        var ease = getComputedStyle(document.documentElement).getPropertyValue('--morph-ease').trim() || 'cubic-bezier(.4,0,.2,1)';
        flipEls.forEach(function(el, i){
          var b = before[i], n = first[i];
          if (!b || !n || !b.w || !n.w) return;
          var dx = (b.l - n.l) / k, dy = (b.t - n.t) / k;
          if (Math.abs(dx) + Math.abs(dy) < 1) return;
          try { el.animate([{ translate: dx + 'px ' + dy + 'px' }, { translate: '0px 0px' }], { duration: MORPH_MS - 20, easing: ease }); } catch (e) {}
        });
      }
      clearTimeout(refitTimer);
      refitTimer = setTimeout(function(){ _fitSuspended = false; _morphPending = false; fitArtSquare(); }, MORPH_MS + 30); // safety pass: no change expected
    }
    // Enter / leave immersive mode WITH the window change (fullscreen). Order matters:
    // 1. remember where everything is, 2. ask for the window change, 3. when the window has
    // resized (inside that same event, before anything is painted) run the morph, gliding each piece
    // from its old place. Without a window change (browser, already fullscreen) it runs at once.
    function morphWithWindow(on){
      var seq = ++_morphSeq;
      var before = snapshot();
      _fitSuspended = true; _morphPending = true;
      var resized = new Promise(function(res){
        var tm = setTimeout(done, 500);
        function done(){ clearTimeout(tm); window.removeEventListener('resize', done); res(); }
        window.addEventListener('resize', done);
      });
      var req = on ? enterIdleFullscreen() : Promise.resolve(exitIdleFullscreen());
      req.then(function(changing){
        if (seq !== _morphSeq) return;
        if (!changing){ morphTo(on); return; }
        resized.then(function(){ if (seq === _morphSeq) morphTo(on, before); });
      });
    }
    function refitNowAndAfterMorph(){
      fitArtSquare();
      clearTimeout(refitTimer);
      refitTimer = setTimeout(fitArtSquare, MORPH_MS);
    }
    function clear(){
      if (timer){ clearTimeout(timer); timer = null; }
      if (!app.classList.contains('idle')){ exitIdleFullscreen(); return; } // nothing to undo
      morphWithWindow(false);
    }
    function schedule(){
      if (timer) clearTimeout(timer);
      timer = setTimeout(function(){
        if (isPlayerActive() && !app.classList.contains('idle') && !_morphPending){
          morphWithWindow(true);
        }
      }, settings.idleDelay);
    }
    function activity(){
      // Keeps the idle timer from firing while the user is actively using
      // the app, but — by design — does NOT dismiss immersive mode once
      // it has already engaged; only an explicit double-tap on the cover
      // art does that (see the swipe gesture handler below), so a stray
      // mouse move, key press, or scroll doesn't interrupt it.
      // (Outside the player tab there is nothing to do on each mouse move:
      // clear() only acts if a timer is pending or idle is still engaged.)
      if (!isPlayerActive()){ if (timer || app.classList.contains('idle')) clear(); return; }
      if (app.classList.contains('idle')) return;
      schedule();
    }
    function exitIdle(){
      // Explicit dismissal (double-tap or hover haut). Unlike clear(), this
      // re-arms the timer so immersive mode can re-engage after another idle period.
      if (app.classList.contains('idle')) morphWithWindow(false);
      else exitIdleFullscreen();
      schedule();
    }
    ['pointerdown','pointermove','keydown','wheel'].forEach(function(ev){
      document.addEventListener(ev, activity, {passive:true});
    });
    return { activity: activity, clear: clear, exitIdle: exitIdle };
  })();

  // ---------------- Réglages : groupes de pilules ----------------
  function wirePillGroup(groupId, defaultValue, onChange){
    var group = document.getElementById(groupId);
    var buttons = group.querySelectorAll('.pill');
    buttons.forEach(function(btn){
      btn.classList.toggle('active', btn.dataset.value === String(defaultValue));
      btn.addEventListener('click', function(){
        buttons.forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        onChange(btn.dataset.value);
      });
    });
  }

  wirePillGroup('idleDelayGroup', settings.idleDelay, function(v){
    settings.idleDelay = parseInt(v, 10);
    saveSettings();
    idle.activity();
  });

  function saveSettings(){
    try { localStorage.setItem('sp_settings', JSON.stringify({
      bgEnabled:  settings.bgEnabled,
      bgAnimated: settings.bgAnimated,
      idleDelay:  settings.idleDelay,
      volZone:    settings.volZone
    })); } catch(e) {}
  }

  wirePillGroup('volZoneGroup', settings.volZone, function(v){
    settings.volZone = v;
    saveSettings();
    applyRailPreset();
    onViewportChange(); // a wider rail changes the minimum layout width
  });

  wirePillGroup('bgToggleGroup', settings.bgEnabled ? 'on' : 'off', function(v){
    settings.bgEnabled = (v === 'on');
    saveSettings();
    document.getElementById('bgAnimSection').style.display = settings.bgEnabled ? '' : 'none';
    // In real-playback mode, use the cached art URL to restore the background.
    if ((useRealPlayback || localMode) && _lastArtUrl) updateNpBackgroundReal(_lastArtUrl);
    else updateNpBackground();
  });
  document.getElementById('bgAnimSection').style.display = settings.bgEnabled ? '' : 'none';

  wirePillGroup('bgAnimGroup', settings.bgAnimated || 'off', function(v){
    settings.bgAnimated = v; // 'off' | 'normal' | 'medium' | 'fast'
    saveSettings();
    // Redémarre ou stoppe l'animation selon le nouvel état (les couleurs ne changent pas)
    applyBgAnimation();
  });

  wirePillGroup('startupGroup', settings.startup ? 'on' : 'off', function(v){
    settings.startup = (v === 'on');
    if (window.simplePlayer) window.simplePlayer.setLaunchAtStartup(settings.startup);
  });

  (function(){
    (function(){
      var ub = document.getElementById('checkUpdateBtn'), un = document.getElementById('updateNote');
      if (!ub || !un) return;
      if (!(window.simplePlayer && window.simplePlayer.checkForUpdate)) { ub.disabled = true; un.textContent = 'Only works in the real Windows app — not in this preview.'; return; }
      window.simplePlayer.getAppVersion().then(function(v){ un.textContent = 'Current version: ' + v; }).catch(function(){});
      ub.addEventListener('click', function(){
        ub.disabled = true; un.textContent = 'Checking…';
        window.simplePlayer.checkForUpdate().then(function(r){
          var cur = 'Current version: ' + r.current + '. ';
          if (r.status === 'downloading') un.textContent = 'Version ' + r.version + ' found, downloading… You will be asked when it is ready to install.';
          else if (r.status === 'ready') un.textContent = 'Version ' + r.version + ' is ready to install.';
          else if (r.status === 'none') un.textContent = cur + 'You are up to date.';
          else if (r.status === 'dev') un.textContent = 'Updates only work in the installed app.';
          else un.textContent = cur + 'Could not reach GitHub. Check your internet connection and try again.';
        }).catch(function(){ un.textContent = 'Could not check for updates.'; })
          .then(function(){ ub.disabled = false; });
      });
    })();
    var btn = document.getElementById('openLogBtn');
    if (!btn) return;
    if (!(window.simplePlayer && window.simplePlayer.openLog)) { btn.disabled = true; return; }
    btn.addEventListener('click', function(){ window.simplePlayer.openLog(); });
  })();

  // ---------------- Window position (manual save/restore) ----------------
  (function(){
    var saveBtn = document.getElementById('savePositionBtn');
    var restoreBtn = document.getElementById('restorePositionBtn');
    var note = document.getElementById('windowPosNote');
    if (!saveBtn || !restoreBtn) return;
    var available = !!(window.simplePlayer && window.simplePlayer.saveWindowPositionNow);
    if (!available) { saveBtn.disabled = true; restoreBtn.disabled = true; return; }
    note.textContent = '';
    saveBtn.addEventListener('click', function(){
      window.simplePlayer.saveWindowPositionNow().then(function(){
        showToast('Position saved');
      });
    });
    restoreBtn.addEventListener('click', function(){
      window.simplePlayer.restoreSavedWindowPosition().then(function(){
        showToast('Position restored');
      });
    });
  })();

  // ---------------- Ghost Spotify ----------------
  (function(){
    var pickBtn = document.getElementById('ghostPickExeBtn');
    var note = document.getElementById('ghostNote');
    var defaultNote = note ? note.textContent : '';

    function refreshNote(){
      if (!note) return;
      if (!ghostSettings.platformSupported) {
        note.textContent = 'Only available in the real Windows app — not in this preview.';
        if (pickBtn) pickBtn.hidden = true;
      } else if (!ghostSettings.exePath) {
        note.textContent = "No classic Spotify.exe found — the Microsoft Store version will be started instead. Only locate Spotify.exe if you use the classic version in a custom place.";
        if (pickBtn) pickBtn.hidden = !ghostSettings.enabled;
      } else {
        note.textContent = defaultNote;
        if (pickBtn) pickBtn.hidden = true;
      }
    }

    wirePillGroup('ghostGroup', 'on', function(v){
      var enabled = (v === 'on');
      if (window.simplePlayer && window.simplePlayer.ghostSetEnabled) {
        window.simplePlayer.ghostSetEnabled(enabled).then(function(){
          ghostSettings.enabled = enabled;
          refreshNote();
          if (enabled) ensureActiveDeviceOrGhost();
        });
      } else {
        ghostSettings.enabled = enabled; // preview only
        refreshNote();
      }
    });

    if (pickBtn) {
      pickBtn.addEventListener('click', function(){
        if (!window.simplePlayer || !window.simplePlayer.ghostPickExe) return;
        window.simplePlayer.ghostPickExe().then(function(exePath){
          ghostSettings.exePath = exePath;
          refreshNote();
        });
      });
    }

    if (window.simplePlayer && window.simplePlayer.ghostGetSettings) {
      window.simplePlayer.ghostGetSettings().then(function(s){
        ghostSettings = s;
        ghostLoaded = true;
        var group = document.getElementById('ghostGroup');
        if (group) {
          group.querySelectorAll('.pill').forEach(function(p){
            p.classList.toggle('active', p.dataset.value === (s.enabled ? 'on' : 'off'));
          });
        }
        refreshNote();
      });
    } else {
      refreshNote();
    }
  })();

  // ---------------- Interface size (zoom) ----------------
  // Interface size setting removed — the layout now adapts automatically
  // to the window size. Ctrl+scroll / Ctrl+/-/0 still work via main.js.

  // In the real Windows app, read back the actual OS-level setting on
  // launch (it could differ if the user changed it outside Simple Player).
  if (window.simplePlayer) {
    document.getElementById('startupNote').hidden = true; // preview-only remark
    window.simplePlayer.getLaunchAtStartup().then(function(enabled){
      settings.startup = !!enabled;
      var group = document.getElementById('startupGroup');
      if (group) {
        group.querySelectorAll('.pill').forEach(function(p){
          p.classList.toggle('active', p.dataset.value === (enabled ? 'on' : 'off'));
        });
      }
    });
  }

  // ---------------- Tabs / views ----------------
  var tabs = document.querySelectorAll('.tab');
  tabs.forEach(function(tab){
    tab.addEventListener('click', function(){
      tabs.forEach(function(t){ t.classList.remove('active'); });
      tab.classList.add('active');
      document.querySelectorAll('.view').forEach(function(v){ v.classList.remove('active'); });
      document.getElementById('view-' + tab.dataset.view).classList.add('active');
      if (tab.dataset.view === 'player'){ idle.activity(); fitArtSquare(); } else idle.clear();
      refreshBg(false); // animate only while the player is on screen
      if (tab.dataset.view !== 'search') setShortcuts(true); // safety: never leave shortcuts off
      // Opening Search puts the cursor straight in the search box.
      if (tab.dataset.view === 'search'){
        var si = document.getElementById('searchInput');
        // Next frame: the view has to be visible before it can take focus.
        requestAnimationFrame(function(){ si.focus(); });
      }
    });
  });
  document.getElementById('settingsExitBtn').addEventListener('click', goToPlayerTab);

  function openSettingsView(){
    setShortcuts(true);
    tabs.forEach(function(t){ t.classList.remove('active'); });
    document.querySelectorAll('.view').forEach(function(v){ v.classList.remove('active'); });
    document.getElementById('view-settings').classList.add('active');
    idle.clear();
    refreshBg(false);
  }
  document.getElementById('settingsBtn').addEventListener('click', openSettingsView);
  function goToPlayerTab(){
    tabs.forEach(function(t){ t.classList.toggle('active', t.dataset.view === 'player'); });
    document.querySelectorAll('.view').forEach(function(v){ v.classList.remove('active'); });
    document.getElementById('view-player').classList.add('active');
    idle.activity();
    fitArtSquare();
    refreshBg(false);
  }

  // ---------------- Bibliothèque ----------------
  // Normalizes either a fictional demo track ({id,title,artist,duration})
  // or a raw Spotify Web API track object into one shape trackRow() can
  // render, so the same row markup/behavior serves both real and demo data.
  function normTrack(t){
    if (t && (t.duration_ms !== undefined || t.uri)){
      return {
        id: t.id,
        title: t.name,
        artist: (t.artists || []).map(function(a){ return a.name; }).join(', '),
        duration: (t.duration_ms || 0) / 1000,
        artUrl: (t.album && t.album.images && t.album.images[0]) ? t.album.images[0].url : ''
      };
    }
    return { id: t.id, title: t.title, artist: t.artist, duration: t.duration, artUrl: makeArt(t.id + ':' + t.title) };
  }

  function trackRow(rawTrack, onPlay){
    var t = normTrack(rawTrack);
    var row = document.createElement('div');
    row.className = 'track-row';
    row.dataset.trackId = t.id;
    row.innerHTML =
      '<div class="thumb" style="background-image:' + cssUrl(t.artUrl) + ';background-color:var(--bg-elev-2);"></div>' +
      '<div class="meta"><div class="ttl"></div><div class="sub"></div></div>' +
      '<div class="dur">' + fmt(t.duration) + '</div>';
    row.querySelector('.ttl').textContent = t.title;
    row.querySelector('.sub').textContent = t.artist;
    row.addEventListener('click', function(){
      leaveLocalMode();
      onPlay();
      renderLibraryPlayingState();
      goToPlayerTab();
    });
    return row;
  }

  var $likedFolderCount = document.getElementById('likedFolderCount');
  function setLikedFolderCount(n){
    $likedFolderCount.textContent = (n === null) ? '…' : (n + (n === 1 ? ' song' : ' songs'));
  }
  (function(){
    var btn = document.getElementById('likedFolderBtn');
    var list = document.getElementById('likedList');
    btn.addEventListener('click', function(){
      var expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      list.hidden = expanded;
    });
  })();

  // The Liked Songs folder of the Library tab (real account). force=true
  // re-reads it from Spotify (after a track was liked from here).
  function refreshLikedSection(force){
    if (!useRealPlayback) return;
    var likedEl = document.getElementById('likedList');
    if (force !== false) force = true;
    if (!realLikedCache) setLikedFolderCount(null);
    fetchRealLikedTracks(force).then(function(tracks){
      likedEl.innerHTML = '';
      setLikedFolderCount(realLikedTotal !== null ? realLikedTotal : tracks.length);
      if (!tracks.length){ likedEl.innerHTML = '<div class="search-empty">No liked songs yet.</div>'; return; }
      var uris = tracks.map(function(t){ return t.uri; });
      tracks.forEach(function(t, i){
        likedEl.appendChild(trackRow(t, function(){ playRealUris(uris, i); }));
      });
      renderLibraryPlayingState();
    });
  }

  function renderLibrary(){
    var likedEl = document.getElementById('likedList');
    var grid = document.getElementById('playlistGrid');

    if (useRealPlayback){
      refreshLikedSection(false);

      grid.classList.add('as-list');
      grid.innerHTML = '<div class="search-empty">Loading…</div>';
      fetchRealPlaylists().then(function(pls){
        grid.innerHTML = '';
        if (!pls.length){ grid.innerHTML = '<div class="search-empty">No playlists found.</div>'; return; }
        sortPlaylistsLikeRecents(pls).forEach(function(pl){
          var img = (pl.images && pl.images[0]) ? pl.images[0].url : '';
          var owner = pl.owner && pl.owner.display_name ? pl.owner.display_name : '';
          var row = document.createElement('div');
          row.className = 'pl-row';
          row.innerHTML =
            '<div class="cover" style="background-image:' + cssUrl(img) + ';background-color:var(--bg-elev-2);"></div>' +
            '<div class="meta"><div class="name"></div><div class="sub"></div></div>';
          row.querySelector('.name').textContent = pl.name;
          row.querySelector('.sub').textContent = 'Playlist' + (owner ? ' · ' + owner : '');
          row.addEventListener('click', function(){
            leaveLocalMode();
            notePlaylistPlayed(pl.uri);
            playRealContext(pl.uri);
            renderLibraryPlayingState();
            goToPlayerTab();
          });
          grid.appendChild(row);
        });
      }).catch(function(err){
        grid.innerHTML = '';
        var e = document.createElement('div');
        e.className = 'search-empty';
        e.textContent = friendlySpotifyError(err) || 'Could not load your playlists.';
        grid.appendChild(e);
      });
      return;
    }

    // Not connected to Spotify: fictional demo data, as before.
    var likedTracks = LIKED_IDS.map(trackById).filter(Boolean);
    likedEl.innerHTML = '';
    setLikedFolderCount(likedTracks.length);
    likedTracks.forEach(function(t, i){
      likedEl.appendChild(trackRow(t, function(){
        state.queue = likedTracks.slice();
        state.index = i;
        renderTrack();
        play();
      }));
    });

    grid.innerHTML = '';
    PLAYLISTS.forEach(function(pl){
      var tracks = pl.trackIds.map(trackById).filter(Boolean);
      var card = document.createElement('div');
      card.className = 'pl-card';
      card.innerHTML =
        '<div class="cover" style="background-image:' + cssUrl(makeArt('pl:'+pl.id)) + '"></div>' +
        '<div class="name"></div><div class="count"></div>';
      card.querySelector('.name').textContent = pl.name;
      card.querySelector('.count').textContent = tracks.length + ' tracks';
      card.addEventListener('click', function(){
        leaveLocalMode();
        state.queue = tracks.slice();
        state.index = 0;
        renderTrack();
        play();
        renderLibraryPlayingState();
        goToPlayerTab();
      });
      grid.appendChild(card);
    });
    renderLibraryPlayingState();
  }
  function renderLibraryPlayingState(){
    var curId = localMode ? local.currentId() : (useRealPlayback ? realPlaybackMeta.trackId : (currentTrack() && currentTrack().id));
    document.querySelectorAll('.track-row').forEach(function(row){
      row.classList.toggle('playing', curId != null && row.dataset.trackId === String(curId));
    });
  }

  // ---------------- Recherche ----------------
  function normalize(s){ return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  var searchInput = document.getElementById('searchInput');
  var searchResults = document.getElementById('searchResults');
  var searchDebounceTimer = null;
  function renderSearch(q){
    if (useRealPlayback){
      if (!q){ searchResults.innerHTML = '<div class="search-empty">Type a song or artist name.</div>'; return; }
      searchResults.innerHTML = '<div class="search-empty">Searching…</div>';
      searchRealAll(q).then(function(res){
        if (searchInput.value.trim() !== q) return; // a newer query already superseded this one
        searchResults.innerHTML = '';
        var tracks = res.tracks;
        if (!tracks.length && !res.artists.length && !res.albums.length && !res.playlists.length){
          searchResults.innerHTML = '<div class="search-empty">No results for “' + escHtml(q) + '”.</div>';
          return;
        }
        if (tracks.length){
          searchResults.appendChild(sectionTitle('Songs'));
          var allTracks = tracks.slice();
          var moreBtn = null;
          var addTracks = function(list, from){
            list.forEach(function(t, k){
              var idx = from + k;
              // Playing a song queues the songs listed so far, starting at it.
              searchResults.insertBefore(trackRow(t, function(){ playRealUris(allTracks.map(function(x){ return x.uri; }), idx); }), moreBtn);
            });
          };
          moreBtn = document.createElement('button');
          moreBtn.className = 'search-more';
          moreBtn.textContent = 'More songs';
          searchResults.appendChild(moreBtn);
          addTracks(tracks, 0);
          moreBtn.addEventListener('click', function(){
            moreBtn.disabled = true;
            moreBtn.textContent = 'Loading…';
            searchMoreTracks(q, allTracks.length).then(function(more){
              if (searchInput.value.trim() !== q) return;
              var from = allTracks.length;
              allTracks = allTracks.concat(more);
              addTracks(more, from);
              if (more.length < 10) moreBtn.remove();
              else { moreBtn.disabled = false; moreBtn.textContent = 'More songs'; }
              renderLibraryPlayingState();
            }).catch(function(err){ moreBtn.disabled = false; moreBtn.textContent = 'More songs'; showToast(friendlySpotifyError(err)); });
          });
        }
        if (res.artists.length){
          searchResults.appendChild(sectionTitle('Artists'));
          res.artists.forEach(function(a){ searchResults.appendChild(contextRow(firstImage(a), a.name, 'Artist', a.uri, true)); });
        }
        if (res.albums.length){
          searchResults.appendChild(sectionTitle('Albums'));
          res.albums.forEach(function(al){
            var by = (al.artists || []).map(function(x){ return x.name; }).join(', ');
            var year = (al.release_date || '').slice(0, 4);
            searchResults.appendChild(contextRow(firstImage(al), al.name, by + (year ? ' · ' + year : ''), al.uri, false));
          });
        }
        if (res.playlists.length){
          searchResults.appendChild(sectionTitle('Playlists'));
          res.playlists.forEach(function(pl){
            var owner = pl.owner && pl.owner.display_name ? 'by ' + pl.owner.display_name : 'Playlist';
            searchResults.appendChild(contextRow(firstImage(pl), pl.name, owner, pl.uri, false));
          });
        }
        renderLibraryPlayingState();
      }).catch(function(err){
        if (searchInput.value.trim() !== q) return;
        searchResults.innerHTML = '';
        var e = document.createElement('div');
        e.className = 'search-empty';
        e.textContent = friendlySpotifyError(err) || 'Search failed.';
        searchResults.appendChild(e);
      });
      return;
    }

    // Not connected to Spotify: search the fictional demo catalog, as before.
    searchResults.innerHTML = '';
    if (!q){
      searchResults.innerHTML = '<div class="search-empty">Type a song or artist name.</div>';
      return;
    }
    var nq = normalize(q);
    var matches = CATALOG.filter(function(t){
      return normalize(t.title).indexOf(nq) !== -1 || normalize(t.artist).indexOf(nq) !== -1;
    });
    if (!matches.length){
      searchResults.innerHTML = '<div class="search-empty">No results for “' + escHtml(q) + '”.</div>';
      return;
    }
    matches.forEach(function(t, i){
      searchResults.appendChild(trackRow(t, function(){
        state.queue = matches.slice();
        state.index = i;
        renderTrack();
        play();
      }));
    });
  }
  // While the search box has focus, Space and the arrow keys are for typing
  // and moving the cursor, so the playback shortcuts (handled in main.js) are
  // switched off; they come back as soon as the box loses focus.
  function setShortcuts(on){
    if (window.simplePlayer && window.simplePlayer.setPlaybackShortcutsEnabled) window.simplePlayer.setPlaybackShortcutsEnabled(on);
  }
  searchInput.addEventListener('focus', function(){ setShortcuts(false); });
  searchInput.addEventListener('blur', function(){ setShortcuts(true); });
  searchInput.addEventListener('input', function(){
    var q = searchInput.value.trim();
    if (useRealPlayback){
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(function(){ renderSearch(q); }, 350);
    } else {
      renderSearch(q);
    }
  });
  renderSearch('');

  // ---------------- Real Spotify playback (account-wide remote control) ----------------
  // Simple Player works as a remote control + display for whatever is
  // currently playing on the account — on a phone, a speaker, this PC, or
  // anywhere else — exactly like opening the official Spotify app on a
  // device that isn't producing the sound itself. Transport commands
  // (play/pause/next/previous/seek/volume/shuffle/repeat) are sent without
  // targeting a specific device, so they act on whichever device is
  // currently active; and the real playback state (track, position,
  // shuffle/repeat, context) is read back by polling the Web API every
  // couple of seconds, which is the only way to see what's playing on a
  // device other than this one — the Web Playback SDK's events only ever
  // report this device's own state, not the account's.
  var realPlaybackMeta = { durationMs: 0, trackId: null, trackUri: null, contextUri: null };
  // Timestamps of the last local shuffle/repeat toggle, so a periodic
  // poll landing right after one doesn't clobber it back before Spotify's
  // own backend has actually caught up (a real, observed propagation gap).
  var lastShuffleChangeAt = 0;
  var lastRepeatChangeAt = 0;
  var lastPlayChangeAt = 0;
  var REAL_STATE_GRACE_MS = 5000; // after pressing shuffle/repeat, ignore polls this long (Spotify can lag)
  var PLAY_GRACE_MS = 3000; // after pressing play/pause, don't let a stale poll flip it back
  var realProgressTimer = null;
  var pollTimer = null;
  var playlistNameCache = {};

  async function spotifyApi(path, options){
    options = options || {};
    // Honour rate-limit backoff for all requests (not just polls).
    if (Date.now() < rateLimitedUntil) {
      var waitErr = new Error('Spotify rate-limited, backing off');
      waitErr.status = 429;
      waitErr.retryAfter = Math.ceil((rateLimitedUntil - Date.now()) / 1000);
      throw waitErr;
    }
    var token;
    try {
      token = await window.simplePlayer.spotifyGetAccessToken();
    } catch (tokenErr) {
      // main.js/spotifyAuth.js marks this with REAUTH_REQUIRED when the
      // stored token is no longer valid and has just been cleared — tag
      // it here so friendlySpotifyError() can tell the user precisely
      // what's wrong instead of the generic "Could not reach Spotify".
      var authErr = new Error((tokenErr && tokenErr.message) || 'Spotify auth error');
      authErr.reauthRequired = /REAUTH_REQUIRED/.test(authErr.message);
      refreshSpotifyConnectedBadge();
      throw authErr;
    }
    var res = await fetch('https://api.spotify.com/v1' + path, Object.assign({}, options, {
      headers: Object.assign({ 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, options.headers || {})
    }));
    if (res.status === 204) return null;
    if (!res.ok) {
      var reason = '';
      try { var body = await res.json(); reason = (body && body.error && body.error.reason) || ''; } catch(e){}
      var err = new Error('Spotify API error ' + res.status + ' on ' + path + (reason ? ' (' + reason + ')' : ''));
      err.status = res.status;
      err.reason = reason;
      err.path = path;
      // Parse Retry-After so callers can back off for the right duration.
      if (res.status === 429) {
        var ra = parseInt(res.headers.get('Retry-After') || '5', 10);
        err.retryAfter = isNaN(ra) ? 5 : ra;
        rateLimitedUntil = Date.now() + err.retryAfter * 1000;
      }
      throw err;
    }
    // Spotify answers some commands (next, previous, shuffle, repeat...) with
    // a 200 and an empty or non-JSON body. The command HAS succeeded then, so
    // a body that doesn't parse must never be reported as an error (that used
    // to show "Could not reach Spotify" even though the action worked, and
    // made the shuffle/repeat buttons flip back).
    var text = await res.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch (parseErr) { return null; }
  }

  // Re-reads the connected/not-connected status from main.js and updates
  // the Settings badge. Used after a token refresh fails and the stored
  // auth gets cleared, so the UI stops claiming "Connected" once it no
  // longer actually is.
  function refreshSpotifyConnectedBadge(){
    if (!window.simplePlayer || !window.simplePlayer.spotifyGetStatus) return;
    window.simplePlayer.spotifyGetStatus().then(function(connected){
      var statusEl = document.getElementById('accountStatus');
      var link = document.getElementById('connectSpotifyBtn');
      if (!statusEl || !link) return;
      statusEl.classList.toggle('connected', connected);
      statusEl.innerHTML = '<span class="status-dot"></span>' + (connected ? 'Connected' : 'Not connected');
      link.textContent = connected ? 'Disconnect' : 'Connect to Spotify';
    });
  }

  // Turns a spotifyApi() error into a message the user can actually act
  // on. "No active device" is by far the most common real-world cause of
  // "nothing happens" — Simple Player is a remote control, so something
  // (phone, computer, speaker) has to already be an active Spotify
  // Connect device for any transport command to have anything to reach.
  // If "Ghost Spotify" is enabled, this also asks main.js to launch a
  // hidden Spotify on this computer instead of just telling the user to
  // do it themselves. (ghostSettings is declared near the top of this file.)
  // Popup shown when Spotify can't be started for lack of a known
  // Spotify.exe (Ghost Spotify needs it). Offers to pick the file right
  // away, or to open the Settings page where it is set.
  var exeDialogOpen = false;
  function showExeMissingDialog(){
    if (exeDialogOpen) return;
    exeDialogOpen = true;
    var back = document.createElement('div');
    back.id = 'dialogBackdrop';
    var box = document.createElement('div');
    box.id = 'dialogBox';
    box.setAttribute('role', 'dialog');
    box.innerHTML = '<h4>Spotify didn\u2019t start</h4>' +
      '<p>Simple Player couldn\u2019t start Spotify on this computer. Make sure the Spotify app is installed ' +
      '(from spotify.com or the Microsoft Store) and that you are signed in to it. If Spotify is installed in an unusual ' +
      'folder, point Simple Player to its Spotify.exe file now, or later in Settings \u203A Ghost Spotify.</p>' +
      '<div class="dlg-actions"><button class="later">Later</button><button class="settings">Open Settings</button><button class="primary pick">Locate Spotify.exe\u2026</button></div>';
    function close(){ exeDialogOpen = false; back.remove(); }
    box.querySelector('.later').addEventListener('click', close);
    box.querySelector('.settings').addEventListener('click', function(){ close(); openSettingsView(); });
    box.querySelector('.pick').addEventListener('click', function(){
      window.simplePlayer.ghostPickExe().then(function(exePath){
        ghostSettings.exePath = exePath;
        close();
        showToast(exePath ? 'Spotify.exe saved \u2014 press Play again.' : 'No file chosen.');
        if (exePath) { var b = document.getElementById('ghostPickExeBtn'); if (b) b.hidden = true; }
      });
    });
    back.appendChild(box);
    $app.appendChild(back);
  }

  function friendlySpotifyError(err){
    if (err && err.reauthRequired) {
      return 'Your Spotify connection expired — go to Settings and reconnect.';
    }
    if (err && (err.reason === 'NO_ACTIVE_DEVICE' || (err.status === 404 && /^\/me\/player/.test(err.path || '')))) {
      if (ghostSettings.enabled && window.simplePlayer.ghostNoActiveDevice) {
        window.simplePlayer.ghostNoActiveDevice();
        return 'No active device — starting Spotify for you, try again in a few seconds.';
      }
      return 'No Spotify device is active. Open Spotify on your phone, computer, or a speaker and press play there first.';
    }
    if (err && err.message === 'LOCAL_DEVICE_TIMEOUT') {
      if (!ghostSettings.exePath) { showExeMissingDialog(); return ''; }
      return "Spotify didn't start on this computer. Make sure the Spotify desktop app is installed and that you are signed in to it, then try again.";
    }
    if (err && err.status === 403) return 'Spotify refused this action. It usually needs a Premium account, or this account may not be allowed to use the app. Try reconnecting in Settings.';
    if (err && err.status === 429) return 'Spotify is busy (too many requests) — wait a few seconds and retry.';
    if (err && err.status === 401) return 'Your Spotify connection expired — go to Settings and reconnect.';
    if (err && err.status >= 500) return 'Spotify is having a problem on its side (error ' + err.status + '). Try again in a moment.';
    if (err && err.status) return 'Spotify could not do that (error ' + err.status + '). Please try again.';
    return 'Could not reach Spotify. Check your internet connection and try again.';
  }

  function renderRealProgress(){
    if (!realPlaybackMeta.durationMs) return;
    var pct = Math.min(100, (state.elapsed * 1000 / realPlaybackMeta.durationMs) * 100);
    $progressFill.style.width = pct + '%';
    $elapsed.textContent = fmt(state.elapsed);
  }

  function startRealProgressTimer(){
    if (realProgressTimer) return; // already ticking (it re-reads state on every tick)
    var last = performance.now();
    realProgressTimer = setInterval(function(){
      if (!state.playing || localMode) { last = performance.now(); return; }
      var now = performance.now();
      state.elapsed += (now - last) / 1000;
      last = now;
      renderRealProgress();
    }, 200);
  }

  function updateRealPlaylistBadge(contextUri){
    // Only show the playlist name if the track is in one of the user's
    // playlists (tick is green). A non-liked track played from someone else's
    // playlist or an album context should not display a playlist name.
    var tickOn = $likedBadge.classList.contains('on');
    var m = contextUri && /spotify:playlist:([A-Za-z0-9]+)/.exec(contextUri);
    if (!m || !tickOn){ $playlistBadge.hidden = true; return; }
    var id = m[1];
    if (playlistNameCache[id]){
      $playlistBadge.textContent = playlistNameCache[id];
      $playlistBadge.hidden = false;
      fitPlaylistBadge();
      return;
    }
    $playlistBadge.hidden = true;
    spotifyApi('/playlists/' + id + '?fields=name').then(function(data){
      if (!data || localMode) return;
      // Re-check tick after async fetch — user may have changed tracks.
      if (!$likedBadge.classList.contains('on')) return;
      playlistNameCache[id] = data.name;
      $playlistBadge.textContent = data.name;
      $playlistBadge.hidden = false;
      fitPlaylistBadge();
    }).catch(function(){ /* private/collaborative playlist details can 403; badge just stays hidden */ });
  }

  // ---------------- Real library / search data (shared) ----------------
  // Shared between the Library tab, the Search tab, and the "+" add-to-
  // playlist menu, so each only hits the Spotify API once per session
  // (or once per explicit refresh) rather than duplicating requests.
  var realPlaylistsCache = null;
  // Your playlists, all pages. Tries a page size of 50 and falls back to
  // smaller ones if Spotify refuses it. Throws on a real failure (the add
  // menu then shows the reason instead of an empty list).
  // Spotify's own app lists playlists by "Recents". The Web API doesn't
  // expose that order, so Simple Player approximates it: playlists you
  // played here come first, most recent first; the rest keep the order
  // Spotify's API returns (the order of your library).
  var RECENCY_KEY = 'simplePlayer.playlistRecency';
  function loadRecency(){
    try { return JSON.parse(localStorage.getItem(RECENCY_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function notePlaylistPlayed(uri){
    if (!uri || !/^spotify:playlist:/.test(uri)) return;
    var r = loadRecency();
    r[uri] = Date.now();
    var keys = Object.keys(r);
    if (keys.length > 100) { keys.sort(function(a, b){ return r[a] - r[b]; }); delete r[keys[0]]; }
    try { localStorage.setItem(RECENCY_KEY, JSON.stringify(r)); } catch (e) {}
  }
  function sortPlaylistsLikeRecents(pls){
    var r = loadRecency();
    var played = pls.filter(function(p){ return r[p.uri]; }).sort(function(a, b){ return r[b.uri] - r[a.uri]; });
    var rest = pls.filter(function(p){ return !r[p.uri]; });
    return played.concat(rest);
  }
  var realMeId = null;
  function fetchRealPlaylists(force){
    if (realPlaylistsCache && !force) return Promise.resolve(realPlaylistsCache);
    function page(size, offset){
      return spotifyApi('/me/playlists?limit=' + size + '&offset=' + offset);
    }
    function loadAll(size){
      var all = [];
      function next(offset){
        return page(size, offset).then(function(r){
          var items = (r && r.items) ? r.items.filter(Boolean) : [];
          all = all.concat(items);
          if (r && r.next && items.length && offset < 400) return next(offset + size);
          return all;
        });
      }
      return next(0);
    }
    return loadAll(50).catch(function(err){
      if (err && err.status === 400) return loadAll(10); // page size refused
      throw err;
    }).then(function(all){
      // Only playlists you can actually add to: yours, or collaborative ones.
      var mePromise = realMeId ? Promise.resolve(realMeId)
        : spotifyApi('/me').then(function(me){ realMeId = me && me.id; return realMeId; }).catch(function(){ return null; });
      return mePromise.then(function(meId){
        var mine = meId ? all.filter(function(pl){ return pl.collaborative || (pl.owner && pl.owner.id === meId); }) : all;
        realPlaylistsCache = mine.length ? mine : all;
        return realPlaylistsCache;
      });
    });
  }

  // ---------------- Which of my playlists hold which track ----------------
  // Spotify has no "is this track in one of my playlists?" call, so the
  // contents of the user's own playlists are read once ("Get Playlist Items",
  // GET /playlists/{id}/items, 50 per page) and indexed here. The index
  // drives the tick on the player and the ticks in the "+" menu, and stops
  // the same track being added twice to a playlist.
  // It is cached in localStorage with each playlist's snapshot_id (which
  // Spotify changes whenever the playlist changes): at the next launch only
  // the playlists that really changed are read again, so the tick is right
  // from the first second.
  var playlistItems = {};        // playlistId -> { snap, ids: { trackId: true } }
  var PLAYLIST_CACHE_KEY = 'simplePlayer.playlistItems.v2';
  var PLAYLIST_MAX_ITEMS = 10000; // per playlist
  var playlistIndexBusy = null;   // promise of the refresh in progress
  var playlistIndexAt = 0;
  try {
    var cachedPl = JSON.parse(localStorage.getItem(PLAYLIST_CACHE_KEY) || '{}') || {};
    Object.keys(cachedPl).forEach(function(id){
      var e = cachedPl[id];
      if (!e || !Array.isArray(e.ids)) return;
      var ids = {};
      e.ids.forEach(function(t){ ids[t] = true; });
      playlistItems[id] = { snap: e.snap || '', ids: ids };
    });
  } catch (e) { playlistItems = {}; }
  function savePlaylistIndex(){
    try {
      var out = {};
      Object.keys(playlistItems).forEach(function(id){ out[id] = { snap: playlistItems[id].snap, ids: Object.keys(playlistItems[id].ids) }; });
      var json = JSON.stringify(out);
      if (json.length < 3000000) localStorage.setItem(PLAYLIST_CACHE_KEY, json);
      else localStorage.removeItem(PLAYLIST_CACHE_KEY); // enormous library: just re-read at each launch
    } catch (e) {}
  }
  function playlistHasTrack(playlistId, trackId){
    var e = playlistItems[playlistId];
    return !!(e && trackId && e.ids[trackId]);
  }
  function trackInMyPlaylists(trackId){
    if (!trackId) return false;
    for (var id in playlistItems) if (playlistItems[id].ids[trackId]) return true;
    return false;
  }
  // A track was just added to a playlist from here.
  function notePlaylistGained(pl, trackId, snapshotId){
    var e = playlistItems[pl.id] || (playlistItems[pl.id] = { snap: '', ids: {} });
    e.ids[trackId] = true;
    if (snapshotId){
      e.snap = snapshotId;
      (realPlaylistsCache || []).forEach(function(p){ if (p.id === pl.id) p.snapshot_id = snapshotId; });
    }
    savePlaylistIndex();
  }
  // All track ids of one playlist. Waits and retries when Spotify says "too
  // many requests", instead of silently ending up with half a playlist.
  function loadPlaylistTrackIds(playlistId){
    var ids = {};
    function page(offset, retries){
      return spotifyApi('/playlists/' + playlistId + '/items?fields=next,items(item(id),track(id))&limit=50&offset=' + offset).then(function(r){
        var items = (r && r.items) || [];
        items.forEach(function(it){
          var tr = it && (it.item || it.track); // "track" is the pre-2026 name of the same field
          if (tr && tr.id) ids[tr.id] = true;
        });
        if (r && r.next && items.length && offset + 50 < PLAYLIST_MAX_ITEMS) return page(offset + 50, 0);
        return ids;
      }, function(err){
        if (err && err.status === 429 && retries < 6){
          return sleep(((err.retryAfter || 5) + 1) * 1000).then(function(){ return page(offset, retries + 1); });
        }
        throw err;
      });
    }
    return page(0, 0);
  }
  // Brings the index up to date with the account: reads the playlists that
  // are new or whose snapshot_id changed, forgets the ones that are gone.
  function refreshPlaylistIndex(){
    if (playlistIndexBusy) return playlistIndexBusy;
    if (Date.now() - playlistIndexAt < 30000) return Promise.resolve(); // just done
    playlistIndexBusy = fetchRealPlaylists(true).then(function(pls){
      var alive = {};
      var todo = pls.filter(function(pl){
        alive[pl.id] = true;
        var e = playlistItems[pl.id];
        return !e || !pl.snapshot_id || e.snap !== pl.snapshot_id;
      });
      Object.keys(playlistItems).forEach(function(id){ if (!alive[id]) delete playlistItems[id]; });
      var chain = Promise.resolve();
      todo.forEach(function(pl){
        chain = chain.then(function(){
          return loadPlaylistTrackIds(pl.id).then(function(ids){
            playlistItems[pl.id] = { snap: pl.snapshot_id || '', ids: ids };
          }, function(){ /* unreadable playlist (e.g. 403): keep what we had */ });
        });
      });
      return chain;
    }).then(function(){
      playlistIndexAt = Date.now();
      savePlaylistIndex();
    }).catch(function(){ /* offline / token problem: the next call tries again */ })
      .then(function(){
        playlistIndexBusy = null;
        // Re-evaluate the current track's tick now that the index is fresh.
        if (!localMode && realPlaybackMeta.trackId) paintRealTick(realPlaybackMeta.trackId);
      });
    return playlistIndexBusy;
  }

  var realLikedCache = null;
  var realLikedTotal = null; // how many liked songs the account has (the list shows the latest 100)
  function fetchRealLikedTracks(force){
    if (realLikedCache && !force) return Promise.resolve(realLikedCache);
    // Liked Songs can run into the thousands; grabbing the first 100
    // (2 pages) keeps this fast and covers the vast majority of use —
    // same trade-off as showing "recently added" first, which is also
    // what Spotify's own apps default to.
    function tracksOf(items){ return items.map(function(it){ return it && it.track; }).filter(Boolean); }
    return spotifyApi('/me/tracks?limit=50').then(function(page1){
      var items = (page1 && page1.items) || [];
      realLikedTotal = (page1 && typeof page1.total === 'number') ? page1.total : null;
      if (page1 && page1.next){
        return spotifyApi('/me/tracks?limit=50&offset=50').then(function(page2){
          items = items.concat((page2 && page2.items) || []);
        }).catch(function(){ /* keep the first page */ }).then(function(){
          realLikedCache = tracksOf(items);
          return realLikedCache;
        });
      }
      realLikedCache = tracksOf(items);
      return realLikedCache;
    }).then(function(list){
      // Everything in this list is, by definition, liked.
      list.forEach(function(t){ if (t.id) likedKnown[t.id] = true; });
      return list;
    }).catch(function(){ return realLikedCache || []; });
  }

  // Searches Spotify's whole catalogue (not just your library): songs,
  // artists, albums and playlists. 10 per type is the most the Web API
  // reliably accepts for this app; "More songs" pages through further songs.
  // If the multi-type request is refused, falls back to songs only.
  function searchRealAll(q){
    var enc = encodeURIComponent(q);
    return spotifyApi('/search?type=track,artist,album,playlist&limit=10&q=' + enc).catch(function(err){
      if (err && err.status === 400) return spotifyApi('/search?type=track&limit=10&q=' + enc);
      throw err;
    }).then(function(r){
      function items(x){ return (x && x.items) ? x.items.filter(Boolean) : []; }
      r = r || {};
      return { tracks: items(r.tracks), artists: items(r.artists), albums: items(r.albums), playlists: items(r.playlists) };
    });
  }
  function searchMoreTracks(q, offset){
    return spotifyApi('/search?type=track&limit=10&offset=' + offset + '&q=' + encodeURIComponent(q)).then(function(r){
      return (r && r.tracks && r.tracks.items) ? r.tracks.items.filter(Boolean) : [];
    });
  }
  function firstImage(o){ return (o && o.images && o.images[0]) ? o.images[0].url : ''; }

  // A result row for something that is played as a whole (artist, album, playlist).
  function contextRow(imgUrl, title, subtitle, uri, round){
    var row = document.createElement('div');
    row.className = 'track-row ctx';
    row.innerHTML = '<div class="thumb' + (round ? ' round' : '') + '" style="background-image:' + cssUrl(imgUrl) + ';background-color:var(--bg-elev-2);"></div>' +
      '<div class="meta"><div class="ttl"></div><div class="sub"></div></div>';
    row.querySelector('.ttl').textContent = title;
    row.querySelector('.sub').textContent = subtitle;
    row.addEventListener('click', function(){
      leaveLocalMode();
      playRealContext(uri);
      goToPlayerTab();
    });
    return row;
  }
  function sectionTitle(text){
    var h = document.createElement('div');
    h.className = 'search-section';
    h.textContent = text;
    return h;
  }

  // Starts real playback at a specific track, either as a flat list of
  // track URIs (Liked Songs, search results) or within a playlist context
  // (so shuffle/repeat and "what playlist is this from" keep working).
  function playRealUris(uris, startIndex){
    var body = { uris: uris };
    if (startIndex) body.offset = { position: startIndex };
    playPath().then(function(path){ return spotifyApi(path, { method: 'PUT', body: JSON.stringify(body) }); }).catch(function(err){ showToast(friendlySpotifyError(err)); });
  }
  function playRealContext(contextUri, trackUri){
    var body = { context_uri: contextUri };
    if (trackUri) body.offset = { uri: trackUri };
    playPath().then(function(path){ return spotifyApi(path, { method: 'PUT', body: JSON.stringify(body) }); }).catch(function(err){ showToast(friendlySpotifyError(err)); });
  }

  // ---------------- The tick on the player ----------------
  // Green when the current track is in Liked Songs or in one of the user's
  // own playlists. "Liked" comes from Spotify ("Check User's Saved Items",
  // GET /me/library/contains?uris=…, which replaced /me/tracks/contains);
  // "in a playlist" comes from the index above.
  var likedKnown = {}; // trackId -> true / false, as last answered by Spotify
  function paintRealTick(trackId){
    var inPlaylist = trackInMyPlaylists(trackId);
    var liked = likedKnown[trackId] === true;
    $likedBadge.classList.toggle('on', liked || inPlaylist);
    $likedBadge.title = inPlaylist ? 'In one of your playlists' : (liked ? 'In Liked Songs' : 'Not in your library');
    updateRealPlaylistBadge(realPlaybackMeta.contextUri);
  }
  function updateRealLikedBadge(trackId){
    if (!trackId) return;
    // Right away, from what is already known — which also clears the previous
    // track's tick instead of leaving it up until Spotify answers.
    paintRealTick(trackId);
    spotifyApi('/me/library/contains?uris=' + encodeURIComponent('spotify:track:' + trackId)).then(function(result){
      if (!Array.isArray(result)) return;
      likedKnown[trackId] = !!result[0];
      if (localMode || realPlaybackMeta.trackId !== trackId) return; // another track is showing now
      paintRealTick(trackId);
    }).catch(function(){ /* tick stays on what is known; the next track change asks again */ });
  }

  var _lastArtUrl = '';
  var _bgArtReq = 0; // numéro de la dernière demande de couleurs de pochette
  function updateNpBackgroundReal(artUrl){
    if (artUrl) _lastArtUrl = artUrl;
    if (!settings.bgEnabled || !artUrl){ stopBgCanvas(); return; }
    // Charger l'image, extraire les couleurs dominantes, puis teinter le fond
    // (animé, ou image fixe si l'animation est coupée ou la lecture en pause).
    var req = ++_bgArtReq;
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function(){
      if (req !== _bgArtReq) return; // une pochette plus récente a été demandée depuis
      var colors;
      try { colors = extractColors(img, 6); }
      catch (e) { colors = ['#1a1234','#0d2240','#1a2040']; } // image illisible (CORS)
      startBgCanvas(colors);
    };
    img.onerror = function(){
      if (req !== _bgArtReq) return;
      // Fallback si l'image ne peut pas être chargée
      startBgCanvas(['#1a1234','#0d2240','#1a2040']);
    };
    img.src = artUrl;
  }

  var lastKnownTrackId = null;

  // ---------------- Instant cover swap ----------------
  // Covers used to appear only after Spotify answered AND the image
  // downloaded. Now the next few covers (from Spotify's queue) are
  // downloaded ahead of time, and the previous ones are remembered, so a
  // swipe shows the new cover and title immediately; the normal poll then
  // just confirms it.
  var currentRealItem = null;
  var trackHistory = [];   // most recent last
  var queueItems = [];     // upcoming tracks, nearest first
  var preloaded = {};      // url -> Image (kept referenced so the cache holds)

  function coverUrl(t){
    return (t && t.album && t.album.images && t.album.images[0]) ? t.album.images[0].url : '';
  }
  function preloadCover(t){
    var u = coverUrl(t);
    if (!u || preloaded[u] || !/^https:\/\//i.test(u)) return;
    var img = new Image();
    img.src = u;
    preloaded[u] = img;
    var keys = Object.keys(preloaded);
    if (keys.length > 40) delete preloaded[keys[0]];
  }
  // Slim copy of a Spotify track, small enough to keep between sessions.
  function slimTrack(t){
    var img = coverUrl(t);
    return {
      id: t.id, uri: t.uri, name: t.name, duration_ms: t.duration_ms,
      artists: (t.artists || []).map(function(a){ return { name: a.name }; }),
      album: { images: img ? [{ url: img }] : [] }
    };
  }
  var HISTORY_KEY = 'simplePlayer.history';
  function saveHistory(){
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(trackHistory)); } catch (e) {}
  }
  function rememberInHistory(t){
    var slim = slimTrack(t);
    var last = trackHistory[trackHistory.length - 1];
    if (!last || last.id !== slim.id) trackHistory.push(slim);
    if (trackHistory.length > 20) trackHistory.shift();
    preloadCover(slim);
    saveHistory();
  }
  // Tracks played in earlier sessions: so "previous" has a cover to show
  // right away even just after the app was reopened.
  try {
    var savedHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    if (Array.isArray(savedHistory)) {
      trackHistory = savedHistory.filter(function(t){ return t && t.id && t.uri; }).slice(-20);
      trackHistory.slice(-6).forEach(preloadCover);
    }
  } catch (e) {}
  function showRealTrackDisplay(t){
    currentRealItem = t;
    lastKnownTrackId = t.id;
    var artUrl = coverUrl(t);
    if (artUrl) { $art.style.backgroundImage = cssUrl(artUrl); revealArt(artUrl); }
    $title.textContent = t.name;
    $artist.textContent = (t.artists || []).map(function(a){ return a.name; }).join(', ');
    $total.textContent = fmt(t.duration_ms / 1000);
    updateNpBackgroundReal(artUrl);
    updateRealLikedBadge(t.id);
    renderLibraryPlayingState();
    realPlaybackMeta.durationMs = t.duration_ms;
    realPlaybackMeta.trackId = t.id;
    realPlaybackMeta.trackUri = t.uri;
  }
  function refreshQueue(){
    spotifyApi('/me/player/queue').then(function(q){
      queueItems = ((q && q.queue) || []).slice(0, 3);
      queueItems.forEach(preloadCover);
    }).catch(function(){ /* optional optimisation: ignore failures */ });
  }
  // Show the expected track right now (before Spotify confirms).
  var lastOptimisticAt = 0;
  var pollSoonTimers = [];
  function pollSoon(){
    // Cancel any pending pollSoon timers before scheduling new ones, so
    // rapid user actions (skip, skip, skip) don't stack up bursts of polls.
    pollSoonTimers.forEach(function(t){ clearTimeout(t); });
    pollSoonTimers = [];
    // Force a poll even if one is already in flight — after a user action
    // (next, prev, play/pause) we need fresh state, not a stale in-progress one.
    pollInFlight = false;
    pollPlaybackState();
    pollSoonTimers.push(setTimeout(function(){ pollInFlight = false; pollPlaybackState(); }, 800));
    pollSoonTimers.push(setTimeout(function(){ pollInFlight = false; pollPlaybackState(); }, 1800));
  }
  function optimisticSwitch(t){
    if (!t) return false;
    lastOptimisticAt = Date.now();
    if (currentRealItem) rememberInHistory(currentRealItem);
    showRealTrackDisplay(t);
    state.elapsed = 0;
    renderRealProgress();
    return true;
  }

  // ---------------- Resume last music ----------------
  // The track (and the playlist/album it came from) + position are saved
  // locally while playing. At startup, if Spotify has nothing loaded
  // anywhere on the account, that music is started again from where it
  // stopped. If something is already loaded on any device (playing or
  // paused), we never override it.
  var LAST_KEY = 'simplePlayer.lastPlayed';
  var lastSaveAt = 0;
  var resumeAttempted = false;

  function rememberLastPlayed(s){
    if (!s || !s.item || !s.item.uri) return;
    var now = Date.now();
    if (now - lastSaveAt < 4000) return;
    lastSaveAt = now;
    var ctx = s.context && s.context.uri;
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify({
        trackUri: s.item.uri,
        // Only keep contexts that start with a track offset reliably.
        contextUri: /^spotify:(playlist|album|artist):/.test(ctx || '') ? ctx : null,
        positionMs: s.progress_ms || 0,
        // Display info, so the last track can be shown on reopen without
        // asking Spotify for it.
        title: s.item.name || '',
        artist: (s.item.artists || []).map(function(a){ return a.name; }).join(', '),
        artUrl: (s.item.album && s.item.album.images && s.item.album.images[0]) ? s.item.album.images[0].url : '',
        durationMs: s.item.duration_ms || 0
      }));
    } catch (e) { /* storage unavailable: just no resume next time */ }
  }

  // Nothing is ever started automatically. If Spotify has nothing loaded
  // anywhere, the last track is only SHOWN (title, cover, position); the
  // user starts it by pressing Play, which calls playSavedTrack().
  var pendingSaved = null;

  function showSavedTrackIfIdle(s){
    if (s && s.item) { pendingSaved = null; return; } // Spotify has its own track: it wins
    if (pendingSaved || resumeAttempted) return;
    resumeAttempted = true;
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(LAST_KEY) || 'null'); } catch (e) {}
    if (!saved || !saved.trackUri) return;
    pendingSaved = saved;
    $title.textContent = saved.title || '';
    $artist.textContent = saved.artist || '';
    if (saved.artUrl) { $art.style.backgroundImage = cssUrl(saved.artUrl); revealArt(saved.artUrl); updateNpBackgroundReal(saved.artUrl); }
    if (saved.durationMs) {
      realPlaybackMeta.durationMs = saved.durationMs;
      $total.textContent = fmt(saved.durationMs / 1000);
      state.elapsed = (saved.positionMs || 0) / 1000;
      renderRealProgress();
    }
  }

  // Returns true if it took over the Play press.
  function playSavedTrack(){
    var saved = pendingSaved;
    if (!saved) return false;
    pendingSaved = null;
    var pos = Math.max(0, Math.floor(saved.positionMs || 0));
    var withContext = saved.contextUri
      ? { context_uri: saved.contextUri, offset: { uri: saved.trackUri }, position_ms: pos }
      : null;
    var trackOnly = { uris: [saved.trackUri], position_ms: pos };
    function put(body){
      return playPath().then(function(path){ return spotifyApi(path, { method: 'PUT', body: JSON.stringify(body) }); });
    }
    state.playing = true;
    setPlayIcon(true);
    syncBgToPlayState(true);
    (withContext ? put(withContext) : put(trackOnly)).catch(function(err){
      if (withContext && !(err && (err.reason === 'NO_ACTIVE_DEVICE' || err.status === 404 || err.reauthRequired))) {
        return put(trackOnly); // context rejected: play just the track
      }
      throw err;
    }).catch(function(err){
      pendingSaved = saved; // let the next Play press try again
      state.playing = false;
      setPlayIcon(false);
      syncBgToPlayState(false);
      showToast(friendlySpotifyError(err));
    });
    return true;
  }

  function renderRealTrack(s){
    // s is the raw object returned by GET /me/player (a
    // "CurrentlyPlayingContext"), not the Web Playback SDK's shape.
    if (!s || !s.item) {
      // Nothing playing anywhere on the account right now.
      state.playing = false;
      setPlayIcon(false);
      syncBgToPlayState();
      return;
    }
    var t = s.item;
    var isNewTrack = t.id !== lastKnownTrackId;
    lastKnownTrackId = t.id;

    if (isNewTrack) {
      if (currentRealItem && currentRealItem.id !== t.id) rememberInHistory(currentRealItem);
      showRealTrackDisplay(t);
      refreshQueue();
    }

    realPlaybackMeta.durationMs = t.duration_ms;
    realPlaybackMeta.trackId = t.id;
    realPlaybackMeta.trackUri = t.uri;
    realPlaybackMeta.contextUri = s.context && s.context.uri;
    if (isNewTrack) notePlaylistPlayed(realPlaybackMeta.contextUri);
    state.elapsed = s.progress_ms / 1000;
    // Don't let a stale poll flip the play/pause icon back right after the
    // user pressed a button — Spotify's API can lag up to ~2-3 s behind.
    if (Date.now() - lastPlayChangeAt > PLAY_GRACE_MS) {
      state.playing = !!s.is_playing;
      setPlayIcon(state.playing);
      syncBgToPlayState(state.playing);
    }
    renderRealProgress();
    syncSpotifyVolume(s.device);
    if (Date.now() - lastShuffleChangeAt > REAL_STATE_GRACE_MS) $shuffleBtn.classList.toggle('on', !!s.shuffle_state);
    if (Date.now() - lastRepeatChangeAt > REAL_STATE_GRACE_MS) $repeatBtn.classList.toggle('on', s.repeat_state === 'context' || s.repeat_state === 'track');
    updateRealPlaylistBadge(realPlaybackMeta.contextUri);
    startRealProgressTimer();
  }

  // One request at a time (a slow response never stacks up behind new
  // ones), and nothing while the window is hidden in the tray — saves
  // Spotify API calls and battery. Polling resumes the moment it's shown.
  var pollInFlight = false;
  // When Spotify returns 429, we store the earliest time we may query again.
  var rateLimitedUntil = 0;

  function pollPlaybackState(){
    if (pollInFlight || document.hidden) return Promise.resolve();
    if (Date.now() < rateLimitedUntil) return Promise.resolve(); // respect rate-limit backoff
    pollInFlight = true;
    var startedAt = Date.now();
    return spotifyApi('/me/player').then(function(s){
      // A reply that was requested before a swipe, or that still shows the
      // old track right after one (Spotify takes a moment to update), must
      // not flip the new cover back to the old one.
      if (localMode) return; // local files are playing: Spotify's state must not repaint the player
      if (startedAt < lastOptimisticAt) return;
      if (Date.now() - lastOptimisticAt < 1500 && s && s.item && currentRealItem && s.item.id !== currentRealItem.id) return;
      renderRealTrack(s);
      rememberLastPlayed(s);
      showSavedTrackIfIdle(s);
    })
      .catch(function(err){
        // If Spotify says we're rate-limited, pause polling for the requested
        // duration (default 5 s if the header is absent).
        if (err && err.status === 429) {
          var retryAfter = (err.retryAfter || 5);
          rateLimitedUntil = Date.now() + retryAfter * 1000;
        }
        // other transient errors: next regular poll retries
      })
      .then(function(){ pollInFlight = false; });
  }
  document.addEventListener('visibilitychange', function(){
    if (!document.hidden && useRealPlayback) pollPlaybackState();
  });

  function startPolling(){
    useRealPlayback = true;
    pollPlaybackState();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(pollPlaybackState, 2000);
    renderLibrary(); // switch Library over from demo data to the real account
    ensureActiveDeviceOrGhost();
    refreshPlaylistIndex(); // which of my playlists hold which track (for the tick), in background
  }

  // ---------------- Tooltips ----------------
  // One dark pill for every button, mouse only (never for a finger). Text comes from `data-tip`;
  // a native `title` is moved there the first time the pointer reaches it (the badge's title is
  // rewritten as the track changes), so the grey system tooltip never shows.
  (function(){
    var tip = document.createElement('div');
    tip.id = 'tip'; tip.hidden = true;
    $app.appendChild(tip);
    var timer = null, current = null;
    function adopt(el){
      var t = el.getAttribute('title');
      if (t) { el.setAttribute('data-tip', t); el.removeAttribute('title'); }
      return el.getAttribute('data-tip');
    }
    Array.prototype.forEach.call(document.querySelectorAll('[title]'), adopt);
    function hide(){ clearTimeout(timer); current = null; tip.classList.remove('show'); tip.hidden = true; }
    function show(el){
      var text = adopt(el);
      if (!text || !document.body.contains(el)) return;
      tip.textContent = text; tip.hidden = false;
      var r = el.getBoundingClientRect(), a = $app.getBoundingClientRect();
      var k = uiScale || 1, w = tip.offsetWidth, h = tip.offsetHeight, areaW = $app.offsetWidth;
      var cx = (r.left + r.width / 2 - a.left) / k;
      cx = Math.max(w / 2 + 6, Math.min(areaW - w / 2 - 6, cx));
      var top = (r.top - a.top) / k - h - 10;
      if (top < 6) top = (r.bottom - a.top) / k + 10; // no room above: show below
      tip.style.left = cx + 'px'; tip.style.top = top + 'px';
      tip.classList.add('show');
    }
    document.addEventListener('pointerover', function(e){
      if (e.pointerType !== 'mouse') return;
      var el = e.target.closest ? e.target.closest('[data-tip],[title]') : null;
      if (el === current) return;
      hide();
      if (!el) return;
      current = el; adopt(el);
      timer = setTimeout(function(){ show(el); }, 450);
    });
    document.addEventListener('pointerout', function(e){
      if (!current) return;
      if (e.relatedTarget && current.contains(e.relatedTarget)) return;
      hide();
    });
    ['pointerdown', 'wheel', 'keydown', 'scroll'].forEach(function(ev){ document.addEventListener(ev, hide, true); });
    window.addEventListener('blur', hide);
  })();

  // ---------------- "Play on this computer only" ----------------
  // With Ghost Spotify on, music must come out of THIS computer, never a
  // phone or speaker that happened to be the last active device. So:
  //  - we look for this computer's Spotify Connect device (Spotify names it
  //    after the Windows computer name), starting the hidden Spotify if it
  //    isn't there yet;
  //  - every "start playing" request is sent with that device's id, which
  //    also moves playback over from any other device;
  //  - at connect time, playback is moved here (paused) if it's elsewhere.
  function sleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }

  function findLocalDevice(){
    return spotifyApi('/me/player/devices').then(function(res){
      var devices = (res && res.devices) || [];
      var name = (ghostSettings.computerName || '').toLowerCase();
      var byName = devices.filter(function(d){ return name && d.name && d.name.toLowerCase() === name; })[0];
      if (byName) return byName;
      var computers = devices.filter(function(d){ return d.type === 'Computer'; });
      return computers.length === 1 ? computers[0] : null;
    });
  }

  var localDeviceInflight = null;
  // Resolves to this computer's device id, or null when Ghost Spotify is
  // off / unsupported / the device never showed up (then we fall back to
  // whatever device is active, as before).
  function ensureLocalDevice(){
    if (localDeviceInflight) return localDeviceInflight;
    var ready = ghostLoaded ? Promise.resolve() : window.simplePlayer.ghostGetSettings().then(function(s){ ghostSettings = s; ghostLoaded = true; });
    localDeviceInflight = ready.then(async function(){
      if (!ghostSettings.enabled || !ghostSettings.platformSupported) return null;
      for (var i = 0; i < 10; i++) {
        var d = await findLocalDevice();
        if (d) return d.id;
        if (i === 0) {
          showToast('Starting Spotify on this computer…');
          window.simplePlayer.ghostNoActiveDevice();
        }
        // Still nothing after ~12 s: our hidden Spotify is stuck or was closed by hand. Restart it once.
        if (i === 5 && window.simplePlayer.ghostRestart) window.simplePlayer.ghostRestart();
        await sleep(2500);
      }
      throw new Error('LOCAL_DEVICE_TIMEOUT');
    }).then(function(id){ localDeviceInflight = null; return id; },
            function(err){ localDeviceInflight = null; throw err; });
    return localDeviceInflight;
  }

  function playPath(){
    if (!window.simplePlayer || !window.simplePlayer.ghostGetSettings) return Promise.resolve('/me/player/play');
    return ensureLocalDevice().then(function(id){
      return '/me/player/play' + (id ? '?device_id=' + encodeURIComponent(id) : '');
    });
  }

  // At connect: if playback is on another device, bring it here (paused).
  function ensureActiveDeviceOrGhost(){
    if (!window.simplePlayer || !window.simplePlayer.ghostGetSettings) return;
    ensureLocalDevice().then(function(id){
      if (!id) return;
      return spotifyApi('/me/player').then(function(s){
        if (s && s.device && s.device.id === id) return;
        return spotifyApi('/me/player', { method: 'PUT', body: JSON.stringify({ device_ids: [id], play: false }) });
      });
    }).catch(function(){ /* worst case: the first Play press does the same job */ });
  }

  // ---------------- Volume ----------------
  // Connected to Spotify: the bars set and show the volume of the active
  // Spotify device. Not connected (Windows only): they set and show the
  // computer's own master volume. The bar must only ever mirror the volume it
  // actually controls: mirroring the Windows volume while controlling
  // Spotify's made the next touch of the bar (or a wheel notch) send that
  // unrelated Windows level to Spotify, i.e. a sudden jump in loudness.
  // Requests are debounced so dragging doesn't flood the helper / Spotify's API.
  var windowsVolume = false;
  var volumeTimer = null, volumeTouchedAt = 0;

  function sendVolume(vol){
    if (localMode){ local.setVolume(vol); return; }
    if (useRealPlayback) spotifyApi('/me/player/volume?volume_percent=' + Math.round(vol), { method: 'PUT' }).catch(function(){});
    else if (windowsVolume) window.simplePlayer.volumeSet(Math.round(vol));
  }
  onVolumeChange = function(vol){
    volumeTouchedAt = Date.now();
    // Debounce: for Spotify (remote), wait 200 ms of silence before sending
    // so dragging the rail doesn't flood the API with PUT requests.
    // For Windows master volume the latency budget is tighter (40 ms).
    var debounce = windowsVolume ? 40 : 200;
    clearTimeout(volumeTimer);
    volumeTimer = setTimeout(function(){ sendVolume(state.volume); }, debounce);
  };

  // Connected: mirror the active Spotify device's volume, read from the
  // regular playback poll (so a change made from the phone or the Spotify
  // app shows here too) — but never while the user is touching the bar, nor
  // right after (Spotify's reply can lag behind the command just sent).
  function syncSpotifyVolume(device){
    if (localMode) return; // the bar shows the local player's own volume then
    if (!device || typeof device.volume_percent !== 'number') return;
    if (Date.now() - volumeTouchedAt < 4000) return;
    var v = Math.max(0, Math.min(100, device.volume_percent));
    if (Math.round(state.volume) === v) return;
    state.volume = v;
    if (updateVolumeDisplay) updateVolumeDisplay();
  }

  // Not connected: keep the bar in sync with the real Windows volume (changed
  // by keyboard, the taskbar, etc.), but never while the user is touching it.
  // A change is only accepted once two consecutive readings agree, so a
  // one-off odd reading can't make the bar jump and snap back.
  var _lastSyncedVolume = -1;
  function syncWindowsVolume(){
    if (useRealPlayback || localMode) return; // the bar then follows Spotify's volume (see syncSpotifyVolume) or the local player's
    if (!windowsVolume || document.hidden || Date.now() - volumeTouchedAt < 2500) return;
    window.simplePlayer.volumeGet().then(function(v){
      if (v === null || Date.now() - volumeTouchedAt < 2500) return;
      var cur = Math.round(state.volume);
      if (cur === v) { _lastSyncedVolume = v; return; }
      // Require two consecutive readings that agree before accepting a change.
      // This filters one-poll transient dips (ducking, brief system noise).
      if (v === _lastSyncedVolume) {
        state.volume = v;
        if (updateVolumeDisplay) updateVolumeDisplay();
      }
      _lastSyncedVolume = v;
    });
  }
  if (window.simplePlayer && window.simplePlayer.volumeIsSupported) {
    window.simplePlayer.volumeIsSupported().then(function(ok){
      if (!ok) return;
      windowsVolume = true;
      syncWindowsVolume();
      setInterval(syncWindowsVolume, 3000);
    });
  }

  if (window.simplePlayer && window.simplePlayer.spotifyGetStatus) {
    window.simplePlayer.spotifyGetStatus().then(function(connected){
      if (connected) startPolling();
    });
  }

  // ---------------- Local files ----------------
  // Plays music files stored on this computer (the "Local" tab). main.js finds
  // the files and reads their tags; playback happens here, with one <audio>
  // element fed file:// URLs — Chromium decodes MP3, FLAC (any bit depth /
  // sample rate), WAV, OGG, Opus and M4A/AAC natively. While `localMode` is
  // on, the player's transport, progress bar and volume are routed here (see
  // the `if (localMode)` lines in play / pause / next / prev / seek / volume).
  var local = (function(){
    var api = (window.simplePlayer && window.simplePlayer.localGetLibrary) ? window.simplePlayer : null;
    var $list = document.getElementById('localList');
    var $hint = document.getElementById('localDropHint');
    var $count = document.getElementById('localCount');
    var $addFiles = document.getElementById('localAddFilesBtn');
    var $addFolder = document.getElementById('localAddFolderBtn');
    var $clear = document.getElementById('localClearBtn');
    var $stop = document.getElementById('localStopBtn');
    var $scroller = document.querySelector('#view-local .scroller');

    var tracks = [];   // the list, in display order (artist / album / disc / track)
    var queue = [];    // what is being played: the list as it was when playback started
    var order = [];    // play order: indices into queue (shuffled or not)
    var pos = -1;      // where we are in `order`
    var shuffle = false, repeat = false;
    var failures = 0;  // consecutive files that could not be played
    var showToken = 0; // guards the asynchronous cover of an older track
    var previewAt = 0; // last time the progress bar was dragged (preview only)
    var busyNow = false;

    var audio = new Audio();
    audio.preload = 'auto';

    // The volume bar's level for local files, remembered on its own (it is not
    // Spotify's volume nor Windows').
    var VOLUME_KEY = 'simplePlayer.localVolume';
    var volume = 70;
    try { var sv = parseFloat(localStorage.getItem(VOLUME_KEY)); if (sv >= 0 && sv <= 100) volume = sv; } catch (e) {}
    function applyVolume(){
      // Squared: the ear hears loudness roughly logarithmically, so a linear
      // slider would do almost everything in its bottom third.
      var v = Math.max(0, Math.min(100, volume)) / 100;
      audio.volume = v * v;
    }
    applyVolume();

    function cur(){ return pos >= 0 ? queue[order[pos]] : null; }
    function duration(){
      if (isFinite(audio.duration) && audio.duration > 0) return audio.duration;
      var t = cur();
      return t && t.duration ? t.duration : 0;
    }
    function dirOf(p){ var i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\')); return i > 0 ? p.slice(0, i) : ''; }
    function albumKey(t){ return dirOf(t.path) + '|' + t.album; }

    // ---- covers (asked to main.js once per album and per size, then cached)
    var coverCache = {};
    function cover(t, size){
      if (!api) return Promise.resolve(null);
      var key = size + '|' + albumKey(t);
      if (!coverCache[key]) coverCache[key] = api.localCover(t.path, size).catch(function(){ return null; });
      return coverCache[key];
    }

    // ---- Now Playing display
    function renderProgress(){
      var d = duration();
      $progressFill.style.width = (d ? Math.min(100, audio.currentTime / d * 100) : 0) + '%';
      $elapsed.textContent = fmt(audio.currentTime || 0);
      $total.textContent = d ? fmt(d) : '–:––';
    }
    function show(t){
      $title.textContent = t.title;
      $artist.textContent = t.artist;
      state.elapsed = 0;
      $progressFill.style.width = '0%';
      $elapsed.textContent = fmt(0);
      $total.textContent = t.duration ? fmt(t.duration) : '–:––';
      // Pill in the corner: album and audio quality ("Discovery · FLAC 24-bit / 96 kHz").
      var pill = [t.album, [t.format, t.quality].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
      $playlistBadge.textContent = pill;
      $playlistBadge.hidden = !pill;
      fitPlaylistBadge();
      $likedBadge.classList.remove('on');
      $likedBadge.title = 'Local file';
      // A generated cover right away, replaced by the real one when it arrives.
      var seed = 'local:' + albumKey(t);
      $art.style.backgroundImage = cssUrl(makeArt(seed));
      revealArt(makeArt(seed));
      bgFromSeed(seed);
      var token = ++showToken;
      cover(t, 'full').then(function(url){
        if (!url || token !== showToken || !localMode) return;
        $art.style.backgroundImage = cssUrl(url);
        updateNpBackgroundReal(url);
      });
      if (navigator.mediaSession && window.MediaMetadata){
        try { navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: t.album || '' }); } catch (e) {}
      }
      renderLibraryPlayingState();
    }

    // ---- playback
    function load(autoplay){
      var t = cur();
      if (!t) return;
      audio.loop = repeat;
      audio.src = t.url;
      show(t);
      if (autoplay) play();
      else { state.playing = false; setPlayIcon(false); syncBgToPlayState(); }
    }
    function play(){
      if (!cur()) return;
      var p = audio.play();
      if (p && p.catch) p.catch(function(){ /* a real failure also fires 'error', handled below */ });
    }
    function pause(){ audio.pause(); }
    function next(auto){
      if (!order.length) return;
      pos = (pos + 1) % order.length;
      load(!!auto || state.playing);
    }
    function prev(){
      if (!order.length) return;
      // Like every player: "previous" first goes back to the start of the track.
      if (audio.currentTime > 3){ audio.currentTime = 0; renderProgress(); return; }
      pos = (pos - 1 + order.length) % order.length;
      load(state.playing);
    }
    function buildOrder(startIndex){
      order = queue.map(function(_, i){ return i; });
      if (shuffle){
        for (var i = order.length - 1; i > 0; i--){
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
        }
        // The chosen track first, the rest in random order.
        var at = order.indexOf(startIndex);
        if (at > 0){ order.splice(at, 1); order.unshift(startIndex); }
        pos = 0;
      } else {
        pos = startIndex;
      }
    }
    function toggleShuffle(){
      shuffle = !shuffle;
      $shuffleBtn.classList.toggle('on', shuffle);
      if (pos >= 0) buildOrder(order[pos]); // keep playing the same track
    }
    function toggleRepeat(){
      repeat = !repeat; // repeats the current track, like the Spotify button here
      $repeatBtn.classList.toggle('on', repeat);
      audio.loop = repeat;
    }
    function previewSeek(pct){
      var d = duration();
      if (!d) return;
      previewAt = Date.now();
      $progressFill.style.width = (pct * 100) + '%';
      $elapsed.textContent = fmt(pct * d);
    }
    function seek(pct){
      var d = duration();
      if (!d) return;
      previewAt = 0;
      try { audio.currentTime = Math.max(0, Math.min(d - 0.05, pct * d)); } catch (e) {}
      state.elapsed = audio.currentTime;
      renderProgress();
    }
    function setVolume(v){
      volume = Math.max(0, Math.min(100, v));
      applyVolume();
      try { localStorage.setItem(VOLUME_KEY, String(Math.round(volume))); } catch (e) {}
    }

    audio.addEventListener('timeupdate', function(){
      if (!localMode) return;
      state.elapsed = audio.currentTime;
      if (Date.now() - previewAt > 400) renderProgress(); // not while the bar is being dragged
    });
    audio.addEventListener('durationchange', function(){ if (localMode) renderProgress(); });
    audio.addEventListener('play', function(){
      if (!localMode) return;
      state.playing = true; setPlayIcon(true); syncBgToPlayState();
    });
    audio.addEventListener('playing', function(){ failures = 0; });
    audio.addEventListener('pause', function(){
      if (!localMode || audio.ended) return; // 'ended' moves on to the next track
      state.playing = false; setPlayIcon(false); syncBgToPlayState();
    });
    audio.addEventListener('ended', function(){ if (localMode) next(true); });
    audio.addEventListener('error', function(){
      if (!localMode) return;
      var t = cur();
      if (t){
        t.missing = true;
        var row = rowFor(t);
        if (row) row.classList.add('missing');
        showToast('Cannot play “' + t.title + '” (file moved, deleted or unreadable)');
      }
      failures++;
      // Skip to the next one, but give up after a few in a row (e.g. the
      // external drive holding the music is unplugged).
      if (failures < Math.min(order.length, 5)) next(true);
      else { state.playing = false; setPlayIcon(false); syncBgToPlayState(); }
    });

    // ---- entering / leaving local mode
    function enter(){
      if (localMode) return;
      // Silence whatever was playing before.
      if (useRealPlayback){
        if (state.playing) spotifyApi('/me/player/pause', { method: 'PUT' }).catch(function(){});
      } else if (state.timer){
        clearInterval(state.timer); state.timer = null;
      }
      state.playing = false;
      localMode = true;
      state.volume = volume;
      if (updateVolumeDisplay) updateVolumeDisplay();
      $shuffleBtn.classList.toggle('on', shuffle);
      $repeatBtn.classList.toggle('on', repeat);
      $stop.hidden = false;
      if (navigator.mediaSession){
        try {
          navigator.mediaSession.setActionHandler('nexttrack', function(){ next(false); });
          navigator.mediaSession.setActionHandler('previoustrack', function(){ prev(); });
        } catch (e) {}
      }
    }
    function exit(){
      if (!localMode) return;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      localMode = false;
      showToken++;
      pos = -1; queue = []; order = []; failures = 0;
      state.playing = false;
      setPlayIcon(false);
      $stop.hidden = true;
      $playlistBadge.hidden = true;
      if (navigator.mediaSession){
        try {
          navigator.mediaSession.metadata = null;
          navigator.mediaSession.setActionHandler('nexttrack', null);
          navigator.mediaSession.setActionHandler('previoustrack', null);
        } catch (e) {}
      }
      volumeTouchedAt = 0; // let the bar pick up Spotify's / Windows' level again right away
      if (useRealPlayback){
        // Back to whatever Spotify has: the next poll repaints everything.
        lastKnownTrackId = null;
        lastShuffleChangeAt = 0; lastRepeatChangeAt = 0; lastPlayChangeAt = 0;
        $title.textContent = '—'; $artist.textContent = '—';
        $progressFill.style.width = '0%'; $elapsed.textContent = fmt(0); $total.textContent = fmt(0);
        pollSoon();
      } else {
        $shuffleBtn.classList.toggle('on', state.shuffle);
        $repeatBtn.classList.toggle('on', state.repeat);
        renderTrack();
      }
      syncBgToPlayState();
      renderLibraryPlayingState();
    }
    function playFrom(index){
      if (!tracks.length) return;
      enter();
      queue = tracks.slice();
      failures = 0;
      buildOrder(Math.max(0, Math.min(index, queue.length - 1)));
      load(true);
    }

    // ---- the list
    function rowFor(t){
      var rows = $list.querySelectorAll('.track-row');
      for (var i = 0; i < rows.length; i++) if (rows[i].dataset.trackId === 'local:' + t.path) return rows[i];
      return null;
    }
    var thumbObserver = window.IntersectionObserver ? new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (!en.isIntersecting) return;
        thumbObserver.unobserve(en.target);
        loadThumb(en.target);
      });
    }, { root: $scroller, rootMargin: '600px 0px' }) : null;
    function loadThumb(row){
      var t = row._track;
      if (!t) return;
      cover(t, 'thumb').then(function(url){
        if (url) row.querySelector('.thumb').style.backgroundImage = cssUrl(url);
      });
    }
    function render(){
      $list.innerHTML = '';
      var frag = document.createDocumentFragment();
      var lastGroup = null, albums = 0;
      tracks.forEach(function(t, i){
        var group = t.albumArtist + '\u0000' + t.album;
        if (group !== lastGroup){
          lastGroup = group; albums++;
          frag.appendChild(sectionTitle(t.albumArtist + (t.album ? ' — ' + t.album : '') + (t.year ? ' (' + t.year + ')' : '')));
        }
        var row = document.createElement('div');
        row.className = 'track-row local' + (t.missing ? ' missing' : '');
        row.dataset.trackId = 'local:' + t.path;
        row._track = t;
        row.innerHTML =
          '<div class="thumb" style="background-color:var(--bg-elev-2);"></div>' +
          '<div class="meta"><div class="ttl"></div><div class="sub"><span class="who"></span><span class="q"></span></div></div>' +
          '<div class="dur"></div>';
        row.querySelector('.ttl').textContent = (t.track ? t.track + '. ' : '') + t.title;
        row.querySelector('.who').textContent = t.artist;
        var quality = [t.format, t.quality].filter(Boolean).join(' ');
        row.querySelector('.q').textContent = quality ? ' · ' + quality : '';
        row.querySelector('.dur').textContent = t.duration ? fmt(t.duration) : '';
        row.addEventListener('click', function(){ playFrom(i); goToPlayerTab(); });
        frag.appendChild(row);
        if (thumbObserver) thumbObserver.observe(row); else loadThumb(row);
      });
      $list.appendChild(frag);
      $hint.hidden = tracks.length > 0;
      $clear.hidden = tracks.length === 0;
      setStatus(tracks.length ? tracks.length + (tracks.length === 1 ? ' track' : ' tracks') + ' · ' + albums + (albums === 1 ? ' album' : ' albums') : '');
      renderLibraryPlayingState();
    }
    function setStatus(text){
      $count.textContent = text;
      $count.hidden = !text;
    }

    // ---- adding files
    function setBusy(on, text){
      busyNow = on;
      $addFiles.disabled = on; $addFolder.disabled = on; $clear.disabled = on;
      $hint.classList.toggle('busy', on);
      if (on) setStatus(text || 'Working…');
    }
    function applyResult(res){
      if (!res) return; // picker cancelled
      tracks = res.tracks || [];
      coverCache = {};
      if (res.truncated) showToast('Too many files: only the first 20,000 were added');
      else if (res.added) showToast('Added ' + res.added + (res.added === 1 ? ' track' : ' tracks'));
      else if (res.found) showToast('Already in the list');
      else showToast('No audio file found there');
    }
    function run(promise, text){
      if (busyNow) return;
      setBusy(true, text);
      promise.then(applyResult).catch(function(){ showToast('Could not read those files'); })
        .then(function(){ setBusy(false); render(); });
    }
    function addPaths(paths){
      if (!api){ showToast('Local files only work in the real Windows app'); return; }
      paths = (paths || []).filter(Boolean);
      if (!paths.length){ showToast('Nothing to add'); return; }
      run(api.localAddPaths(paths), 'Scanning…');
    }

    if (api){
      $addFiles.addEventListener('click', function(){ run(api.localPickFiles(), 'Choose files…'); });
      $addFolder.addEventListener('click', function(){ run(api.localPickFolder(), 'Choose a folder…'); });
      if (api.onLocalProgress) api.onLocalProgress(function(done, total){
        if (busyNow) setStatus('Reading tags… ' + done + ' / ' + total);
      });
      api.localGetLibrary().then(function(list){ tracks = list || []; render(); }).catch(function(){});
    } else {
      $addFiles.disabled = true; $addFolder.disabled = true;
      $hint.textContent = 'Local files only work in the real Windows app — not in this preview.';
    }
    $stop.addEventListener('click', function(){ exit(); });
    // "Clear list" asks for a second press, so a slip of the finger can't wipe the list.
    var clearArmed = null;
    $clear.addEventListener('click', function(){
      if (!clearArmed){
        $clear.textContent = 'Press again to clear';
        clearArmed = setTimeout(function(){ clearArmed = null; $clear.textContent = 'Clear list'; }, 3000);
        return;
      }
      clearTimeout(clearArmed); clearArmed = null; $clear.textContent = 'Clear list';
      exit();
      (api ? api.localClear() : Promise.resolve()).then(function(){ tracks = []; coverCache = {}; render(); });
    });

    // ---- drag and drop: files or folders dropped anywhere on the window
    var $drop = document.createElement('div');
    $drop.id = 'dropOverlay';
    $drop.textContent = 'Drop to add to your local files';
    $drop.hidden = true;
    $app.appendChild($drop);
    var dragDepth = 0;
    function hasFiles(e){
      var types = e.dataTransfer && e.dataTransfer.types;
      return !!types && Array.prototype.indexOf.call(types, 'Files') !== -1;
    }
    window.addEventListener('dragenter', function(e){
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth++;
      $drop.hidden = false;
    });
    window.addEventListener('dragover', function(e){
      if (!hasFiles(e)) return;
      e.preventDefault(); // required for 'drop' to fire
      e.dataTransfer.dropEffect = 'copy';
    });
    window.addEventListener('dragleave', function(e){
      if (!hasFiles(e)) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) $drop.hidden = true;
    });
    window.addEventListener('drop', function(e){
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth = 0;
      $drop.hidden = true;
      var files = e.dataTransfer.files, paths = [];
      for (var i = 0; i < files.length; i++){
        var p = api && api.localPathForFile ? api.localPathForFile(files[i]) : '';
        if (p) paths.push(p);
      }
      var tab = document.querySelector('.tab[data-view="local"]');
      if (tab && !tab.classList.contains('active')) tab.click();
      addPaths(paths);
    });

    return {
      play: play, pause: pause, next: next, prev: prev,
      toggleShuffle: toggleShuffle, toggleRepeat: toggleRepeat,
      previewSeek: previewSeek, seek: seek, setVolume: setVolume, duration: duration,
      exit: exit, addPaths: addPaths,
      currentId: function(){ var t = cur(); return t ? 'local:' + t.path : null; }
    };
  })();

  // ---------------- Keyboard shortcuts (real app only) ----------------
  // Sent from src/main.js's before-input-event handler, only while this
  // window has focus — never an OS-wide/global shortcut.
  if (window.simplePlayer) {
    window.simplePlayer.onTogglePlay(function(){ togglePlay(); });
    window.simplePlayer.onPreviousTrack(function(){ prev(); });
    window.simplePlayer.onNextTrack(function(){ next(); });
    // Pause Spotify just before the app exits so the music stops.
    window.simplePlayer.onAppWillQuit(function(){
      if (useRealPlayback && state.playing){
        // Force the pause even if we're in a rate-limit backoff window —
        // stopping music on quit is more important than the backoff.
        rateLimitedUntil = 0;
        spotifyApi('/me/player/pause', { method: 'PUT' }).catch(function(){});
      }
    });

    // Auto-updater: show a prompt when a new version has been downloaded.
    if (window.simplePlayer.onUpdateReady) {
      window.simplePlayer.onUpdateReady(function(version){
        // Create a self-contained overlay — don't reuse the settings dialog.
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:24px;';
        var box = document.createElement('div');
        box.style.cssText = 'max-width:380px;width:100%;background:var(--bg-elev);border:1px solid var(--border);border-radius:18px;padding:28px 24px 20px;box-shadow:0 20px 60px -10px rgba(0,0,0,.8);';
        box.innerHTML =
          '<p style="font-size:20px;font-weight:700;margin:0 0 10px;color:var(--fg)">Update available</p>' +
          '<p style="color:var(--fg-dim);margin:0 0 24px;font-size:15px;line-height:1.5">Version <strong style="color:var(--fg)">' + escHtml(version) + '</strong> is ready to install.<br>Simple Player will restart automatically.</p>' +
          '<div style="display:flex;gap:12px;justify-content:flex-end">' +
            '<button id="updateLaterBtn" style="padding:10px 20px;border-radius:12px;background:var(--bg-elev-2);border:1px solid var(--border);font-size:15px;color:var(--fg);cursor:pointer">Later</button>' +
            '<button id="updateNowBtn" style="padding:10px 24px;border-radius:12px;background:var(--accent);border:none;font-size:15px;font-weight:700;color:#fff;cursor:pointer">Install now</button>' +
          '</div>';
        overlay.appendChild(box);
        $app.appendChild(overlay);
        box.querySelector('#updateNowBtn').addEventListener('click', function(){
          overlay.remove();
          window.simplePlayer.installUpdate();
        });
        box.querySelector('#updateLaterBtn').addEventListener('click', function(){
          overlay.remove();
        });
      });
    }
  }

  // ---------------- Init ----------------
  renderTrack();
  renderLibrary();
  idle.activity();
  fitArtSquare();

  // ---------------- Debug: visualise hit zones (Ctrl+Shift+D) ----------------
  (function(){
    var active = false;
    var overlays = [];

    var ZONES = [
      // [selector or id, label, color]
      ['#art',            'Cover art',      'rgba(99,179,237,.35)'],
      ['#idleVolumeZone', 'Volume zone',    'rgba(252,129,74,.45)'],
      ['#swipeZone',      'Swipe zone',     'rgba(154,205,50,.15)'],
      ['#likedBadge',     'Liked badge',    'rgba(236,72,153,.45)'],
      ['#addToLibraryWrap','+ button',      'rgba(250,204,21,.4)'],
    ];

    function show(){
      hide();
      ZONES.forEach(function(z){
        var el = document.querySelector(z[0]);
        if (!el || el.offsetWidth === 0) return;
        var r = el.getBoundingClientRect();
        var ov = document.createElement('div');
        ov.style.cssText = [
          'position:fixed',
          'left:' + Math.round(r.left) + 'px',
          'top:' + Math.round(r.top) + 'px',
          'width:' + Math.round(r.width) + 'px',
          'height:' + Math.round(r.height) + 'px',
          'background:' + z[2],
          'border:2px solid ' + z[2].replace(/[\d.]+\)$/, '1)'),
          'z-index:99999',
          'pointer-events:none',
          'box-sizing:border-box',
        ].join(';');
        // label
        var lbl = document.createElement('span');
        lbl.textContent = z[1];
        lbl.style.cssText = 'position:absolute;top:3px;left:5px;font:bold 10px/1 monospace;color:#fff;text-shadow:0 1px 3px #000;white-space:nowrap;';
        ov.appendChild(lbl);
        // size info
        var sz = document.createElement('span');
        sz.textContent = Math.round(r.width) + '×' + Math.round(r.height);
        sz.style.cssText = 'position:absolute;bottom:3px;right:5px;font:10px/1 monospace;color:#fff;text-shadow:0 1px 3px #000;';
        ov.appendChild(sz);
        document.body.appendChild(ov);
        overlays.push(ov);
      });
    }

    function hide(){
      overlays.forEach(function(o){ o.parentNode && o.parentNode.removeChild(o); });
      overlays = [];
    }

    document.addEventListener('keydown', function(e){
      if (e.ctrlKey && e.shiftKey && e.key === 'D'){
        e.preventDefault();
        active = !active;
        active ? show() : hide();
      }
    });

    // Refresh on resize/zoom while active
    window.addEventListener('resize', function(){ if (active) show(); });
  })();
})();
