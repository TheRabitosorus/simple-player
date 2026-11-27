// Tiny file logger: <userData>/simple-player.log, rotated at ~512 KB
// (the previous file is kept once as simple-player.log.old).
// Never logs tokens or file contents — only events and error messages.
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const MAX_BYTES = 512 * 1024;
let filePath = null;

function getPath() {
  if (!filePath) filePath = path.join(app.getPath('userData'), 'simple-player.log');
  return filePath;
}

function rotateIfNeeded(p) {
  try {
    if (fs.statSync(p).size > MAX_BYTES) fs.renameSync(p, p + '.old');
  } catch (e) { /* no file yet */ }
}

function write(level, parts) {
  try {
    const p = getPath();
    rotateIfNeeded(p);
    const text = parts.map((x) => {
      if (x instanceof Error) return (x.stack || x.message);
      if (typeof x === 'string') return x;
      try { return JSON.stringify(x); } catch (e) { return String(x); }
    }).join(' ');
    fs.appendFileSync(p, new Date().toISOString() + ' [' + level + '] ' + text + '\n');
  } catch (e) {
    // Logging must never break the app.
  }
}

module.exports = {
  path: getPath,
  info: (...a) => write('info', a),
  warn: (...a) => write('warn', a),
  error: (...a) => write('error', a)
};
