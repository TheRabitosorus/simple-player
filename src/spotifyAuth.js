// Real Spotify OAuth 2.0 Authorization Code flow with PKCE.
// No client secret needed (desktop app): https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
const http = require('http');
const crypto = require('crypto');
const { shell, safeStorage } = require('electron');
const Store = require('electron-store');
const config = require('./config');

const store = new Store({ name: 'spotify-auth' });

function base64url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generatePkcePair() {
  const verifier = base64url(crypto.randomBytes(64));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function buildAuthorizeUrl(challenge, state) {
  const params = new URLSearchParams({
    client_id: config.CLIENT_ID,
    response_type: 'code',
    redirect_uri: config.REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
    scope: config.SCOPES
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

async function exchangeCodeForTokens(code, verifier) {
  const body = new URLSearchParams({
    client_id: config.CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.REDIRECT_URI,
    code_verifier: verifier
  });
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: config.CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Token refresh failed (${res.status}): ${text}`);
  }
  return res.json();
}

// --- Encrypted storage for the refresh token ---
// The refresh token is long-lived, so it's encrypted at rest with Electron's
// OS-backed safeStorage (DPAPI on Windows) rather than kept in plain text.
function saveRefreshToken(refreshToken) {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(refreshToken);
    store.set('refreshTokenEncrypted', encrypted.toString('base64'));
  } else {
    // Extremely unlikely on Windows, but avoid losing the token silently.
    store.set('refreshTokenPlain', refreshToken);
  }
}

function loadRefreshToken() {
  const encrypted = store.get('refreshTokenEncrypted');
  if (encrypted && safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
    } catch {
      return null;
    }
  }
  return store.get('refreshTokenPlain') || null;
}

function clearStoredAuth() {
  store.delete('refreshTokenEncrypted');
  store.delete('refreshTokenPlain');
}

function isConnected() {
  return !!loadRefreshToken();
}

// --- In-memory access token cache (never persisted: short-lived) ---
let cachedAccessToken = null;
let cachedAccessTokenExpiry = 0;

async function getValidAccessToken() {
  const now = Date.now();
  if (cachedAccessToken && now < cachedAccessTokenExpiry - 10000) {
    return cachedAccessToken;
  }
  const refreshToken = loadRefreshToken();
  if (!refreshToken) throw new Error('REAUTH_REQUIRED: not connected');
  let tokens;
  try {
    tokens = await refreshAccessToken(refreshToken);
  } catch (err) {
    // The stored refresh token is no longer valid (revoked, expired, or a
    // leftover from before the storage-location fix in v1.9.2). Clear it
    // so isConnected() stops claiming we're connected when every real API
    // call would actually fail — that mismatch is what caused every
    // action to show a vague "Could not reach Spotify" even while the
    // app displayed "Connected". Marking the error REAUTH_REQUIRED lets
    // the renderer show a precise "reconnect to Spotify" message instead.
    clearStoredAuth();
    cachedAccessToken = null;
    cachedAccessTokenExpiry = 0;
    throw new Error('REAUTH_REQUIRED: ' + err.message);
  }
  cachedAccessToken = tokens.access_token;
  cachedAccessTokenExpiry = now + tokens.expires_in * 1000;
  if (tokens.refresh_token) saveRefreshToken(tokens.refresh_token); // Spotify may rotate it
  return cachedAccessToken;
}

// --- The interactive connect flow ---
// Opens the user's real default browser to Spotify's login page, and spins
// up a one-shot local HTTP server on 127.0.0.1:CALLBACK_PORT to catch the
// redirect with the authorization code.
function startLogin() {
  return new Promise((resolve, reject) => {
    const { verifier, challenge } = generatePkcePair();
    const state = base64url(crypto.randomBytes(16));

    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, config.REDIRECT_URI);
        if (url.pathname !== '/callback') {
          res.writeHead(404).end();
          return;
        }
        const returnedState = url.searchParams.get('state');
        const error = url.searchParams.get('error');
        const code = url.searchParams.get('code');

        const closePage = (message) => {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<!doctype html><html lang="en"><body style="font-family:sans-serif;background:#0b0d0f;color:#eee;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><p>${message}</p></body></html>`);
        };

        if (error) {
          closePage('Connection cancelled. You can close this window.');
          server.close();
          reject(new Error(`Spotify returned an error: ${error}`));
          return;
        }
        if (returnedState !== state) {
          closePage('Security error (invalid state). You can close this window.');
          server.close();
          reject(new Error('State mismatch — possible CSRF attempt, aborting.'));
          return;
        }

        const tokens = await exchangeCodeForTokens(code, verifier);
        saveRefreshToken(tokens.refresh_token);
        cachedAccessToken = tokens.access_token;
        cachedAccessTokenExpiry = Date.now() + tokens.expires_in * 1000;

        closePage('Connected to Spotify! You can close this window and go back to Simple Player.');
        server.close();
        resolve(true);
      } catch (err) {
        try { res.writeHead(500).end('Internal error.'); } catch {}
        server.close();
        reject(err);
      }
    });

    server.on('error', reject);

    server.listen(config.CALLBACK_PORT, '127.0.0.1', () => {
      const authorizeUrl = buildAuthorizeUrl(challenge, state);
      shell.openExternal(authorizeUrl);
    });

    // Give up after 5 minutes so a forgotten login attempt doesn't hold the
    // port open forever.
    setTimeout(() => {
      server.close();
      reject(new Error('Sign-in timed out.'));
    }, 5 * 60 * 1000);
  });
}

function disconnect() {
  clearStoredAuth();
  cachedAccessToken = null;
  cachedAccessTokenExpiry = 0;
}

module.exports = {
  startLogin,
  disconnect,
  isConnected,
  getValidAccessToken
};
