# Interface tests

Headless Chrome/Edge (playwright-core) drives `src/renderer/index.html` with a mocked `window.simplePlayer`.
Covers layout of the cover in immersive mode, vertical drag = volume, horizontal swipe / continuous scrubbing, and touch vs. mouse hover behaviour.

    cd tests && npm install
    set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe   (optional, auto-detected)
    npm test

These tests do NOT cover Electron, Spotify, or the ghost-Spotify process handling (main.js) — those need a real Windows machine.
