// Local music files: find them on disk and read their tags.
//
// Pure Node (no Electron import) so it can be tested on its own. main.js wires
// it to the window through IPC; the renderer plays the files itself with an
// <audio> element, which is what actually decodes MP3 / FLAC / WAV / OGG /
// Opus / M4A at any bitrate, sample rate or bit depth (Chromium's decoders).
//
// Tags are read here for MP3 (ID3v2.2 / 2.3 / 2.4) and FLAC (Vorbis comments +
// STREAMINFO). Other formats still play; their title / artist / album are
// taken from the file and folder names (Artist/Album/01 - Title.ext).
const fs = require('fs');
const path = require('path');

const AUDIO_EXT = ['.mp3', '.flac', '.wav', '.ogg', '.oga', '.opus', '.m4a', '.aac'];
const COVER_NAMES = ['cover', 'folder', 'front', 'album', 'albumart'];
const COVER_EXT = ['.jpg', '.jpeg', '.png'];
const MAX_FILES = 20000;       // safety net against dropping a whole drive
const MAX_DEPTH = 12;
const MAX_TAG_BYTES = 24 * 1024 * 1024; // an ID3 tag bigger than this is not read (embedded covers are usually < 5 MB)

function isAudioFile(p) {
  return AUDIO_EXT.includes(path.extname(p).toLowerCase());
}

// "Track 2" before "Track 10", accents and case ignored.
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

// ---------------------------------------------------------------- scanning --

// Takes files and/or folders, returns every audio file inside (folders are
// walked recursively), without duplicates, in folder order.
async function scan(inputPaths) {
  const found = [];
  const seen = new Set();
  let truncated = false;

  async function walk(dir, depth) {
    if (depth > MAX_DEPTH || truncated) return;
    let entries;
    try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); } catch (err) { return; }
    entries.sort((a, b) => collator.compare(a.name, b.name));
    // Files of this folder first, then its sub-folders.
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      if (e.isFile() && isAudioFile(e.name)) add(path.join(dir, e.name));
    }
    for (const e of entries) {
      if (e.name.startsWith('.') || e.name.startsWith('$')) continue;
      if (e.isDirectory()) await walk(path.join(dir, e.name), depth + 1);
    }
  }
  function add(file) {
    if (seen.has(file)) return;
    if (found.length >= MAX_FILES) { truncated = true; return; }
    seen.add(file);
    found.push(file);
  }

  for (const p of inputPaths || []) {
    if (typeof p !== 'string' || !p) continue;
    const abs = path.resolve(p);
    let st;
    try { st = await fs.promises.stat(abs); } catch (err) { continue; }
    if (st.isDirectory()) await walk(abs, 0);
    else if (st.isFile() && isAudioFile(abs)) add(abs);
  }
  return { files: found, truncated };
}

// -------------------------------------------------------------- byte tools --

async function readAt(fh, position, length) {
  const buf = Buffer.alloc(length);
  const { bytesRead } = await fh.read(buf, 0, length, position);
  return bytesRead === length ? buf : buf.subarray(0, bytesRead);
}

function synchsafe(buf, off) {
  return ((buf[off] & 0x7f) << 21) | ((buf[off + 1] & 0x7f) << 14) | ((buf[off + 2] & 0x7f) << 7) | (buf[off + 3] & 0x7f);
}

// Undo ID3 "unsynchronisation": every 0xFF 0x00 pair stands for a single 0xFF.
function removeUnsync(buf) {
  const out = Buffer.alloc(buf.length);
  let n = 0;
  for (let i = 0; i < buf.length; i++) {
    out[n++] = buf[i];
    if (buf[i] === 0xff && buf[i + 1] === 0x00) i++;
  }
  return out.subarray(0, n);
}

function decodeUtf16(buf, bigEndian) {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) { bigEndian = false; buf = buf.subarray(2); }
  else if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) { bigEndian = true; buf = buf.subarray(2); }
  if (buf.length % 2) buf = buf.subarray(0, buf.length - 1);
  if (bigEndian) { buf = Buffer.from(buf); buf.swap16(); }
  return buf.toString('utf16le');
}

// ID3 text: first byte = encoding, then the string(s). Several values can be
// separated by a null character (v2.4); they are joined with ", ".
function id3Text(data) {
  if (!data || data.length < 2) return '';
  const enc = data[0];
  const body = data.subarray(1);
  let s;
  if (enc === 1) s = decodeUtf16(body, false);
  else if (enc === 2) s = decodeUtf16(body, true);
  else if (enc === 3) s = body.toString('utf8');
  else s = body.toString('latin1');
  return s.split('\u0000').map((x) => x.trim()).filter(Boolean).join(', ');
}

// Position of the end of a null-terminated string that starts at `from`
// (2-byte terminator for the UTF-16 encodings).
function endOfString(buf, from, enc) {
  if (enc === 1 || enc === 2) {
    for (let i = from; i + 1 < buf.length; i += 2) if (buf[i] === 0 && buf[i + 1] === 0) return { end: i, next: i + 2 };
    return { end: buf.length, next: buf.length };
  }
  const i = buf.indexOf(0, from);
  return i === -1 ? { end: buf.length, next: buf.length } : { end: i, next: i + 1 };
}

function firstNumber(s) {
  const m = /\d+/.exec(String(s || ''));
  return m ? parseInt(m[0], 10) : 0;
}

// ------------------------------------------------------------------- ID3v2 --

// Returns { tags, picture, size } where size is the whole tag length in bytes
// (so the audio starts at `size`), or null if the file has no ID3v2 tag.
async function readId3(fh, wantPicture) {
  const head = await readAt(fh, 0, 10);
  if (head.length < 10 || head.toString('latin1', 0, 3) !== 'ID3') return null;
  const major = head[3];
  const flags = head[5];
  const bodySize = synchsafe(head, 6);
  const size = 10 + bodySize + ((flags & 0x10) ? 10 : 0); // + footer (v2.4)
  const result = { tags: {}, picture: null, size };
  if (major < 2 || major > 4 || bodySize <= 0 || bodySize > MAX_TAG_BYTES) return result;

  let body = await readAt(fh, 10, bodySize);
  if ((flags & 0x80) && major <= 3) body = removeUnsync(body); // whole-tag unsynchronisation
  let pos = 0;
  if ((flags & 0x40) && major >= 3) { // extended header: skip it
    const ext = major === 4 ? synchsafe(body, 0) : body.readUInt32BE(0) + 4;
    if (ext > 0 && ext < body.length) pos = ext;
  }

  const idLen = major === 2 ? 3 : 4;
  const headLen = major === 2 ? 6 : 10;
  const t = result.tags;
  while (pos + headLen <= body.length) {
    const id = body.toString('latin1', pos, pos + idLen);
    if (!/^[A-Z0-9]+$/.test(id)) break; // padding
    let fsize;
    if (major === 2) fsize = (body[pos + 3] << 16) | (body[pos + 4] << 8) | body[pos + 5];
    else if (major === 4) fsize = synchsafe(body, pos + 4);
    else fsize = body.readUInt32BE(pos + 4);
    const fflags = major === 2 ? 0 : body[pos + 9];
    pos += headLen;
    if (fsize <= 0 || pos + fsize > body.length) break;
    let data = body.subarray(pos, pos + fsize);
    pos += fsize;
    if (major === 4) {
      if (fflags & 0x0c) continue;                 // compressed or encrypted: skip
      if (fflags & 0x01) data = data.subarray(4);  // data length indicator
      if (fflags & 0x02) data = removeUnsync(data);
    } else if (major === 3 && (fflags & 0xc0)) {
      continue;                                    // compressed or encrypted: skip
    }

    switch (id) {
      case 'TIT2': case 'TT2': t.title = id3Text(data); break;
      case 'TPE1': case 'TP1': t.artist = id3Text(data); break;
      case 'TPE2': case 'TP2': t.albumArtist = id3Text(data); break;
      case 'TALB': case 'TAL': t.album = id3Text(data); break;
      case 'TRCK': case 'TRK': t.track = firstNumber(id3Text(data)); break;
      case 'TPOS': case 'TPA': t.disc = firstNumber(id3Text(data)); break;
      case 'TDRC': case 'TYER': case 'TYE': t.year = firstNumber(id3Text(data)); break;
      case 'APIC': case 'PIC': {
        t.hasCover = true;
        if (!wantPicture) break;
        const pic = parseId3Picture(data, major === 2);
        // Keep the front cover (type 3) if there is one, else the first picture.
        if (pic && (!result.picture || (pic.type === 3 && result.picture.type !== 3))) result.picture = pic;
        break;
      }
      default: break;
    }
  }
  return result;
}

function parseId3Picture(data, v22) {
  if (data.length < 6) return null;
  const enc = data[0];
  let pos = 1;
  let mime;
  if (v22) { // 3-letter image format
    const fmt = data.toString('latin1', 1, 4).toUpperCase();
    mime = fmt === 'PNG' ? 'image/png' : 'image/jpeg';
    pos = 4;
  } else {
    const m = endOfString(data, 1, 0);
    mime = data.toString('latin1', 1, m.end).toLowerCase();
    pos = m.next;
  }
  const type = data[pos];
  pos += 1;
  const d = endOfString(data, pos, enc);
  const image = data.subarray(d.next);
  if (image.length < 16) return null;
  return { type, mime: sniffImage(image) || mime, data: image };
}

function sniffImage(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf.length > 8 && buf.toString('latin1', 1, 4) === 'PNG') return 'image/png';
  return null;
}

// --------------------------------------------------------- MP3 frame header --

const MP3_BITRATES = {
  // [version][layer] -> kbps table (index 1..14)
  v1l1: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
  v1l2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
  v1l3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  v2l1: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
  v2l23: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
};
const MP3_RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

// Looks at the first audio frame: bitrate, sample rate and (when a Xing/Info or
// VBRI header is there) the exact duration and the average bitrate.
async function readMp3Info(fh, audioStart, fileSize) {
  const buf = await readAt(fh, audioStart, 16384);
  for (let i = 0; i + 4 < buf.length; i++) {
    if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) continue;
    const ver = (buf[i + 1] >> 3) & 3;      // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
    const layer = (buf[i + 1] >> 1) & 3;    // 1 = Layer III, 2 = II, 3 = I
    const brIdx = buf[i + 2] >> 4;
    const srIdx = (buf[i + 2] >> 2) & 3;
    if (ver === 1 || layer === 0 || brIdx === 0 || brIdx === 15 || srIdx === 3) continue;
    const table = ver === 3 ? (layer === 3 ? 'v1l1' : layer === 2 ? 'v1l2' : 'v1l3') : (layer === 3 ? 'v2l1' : 'v2l23');
    const kbps = MP3_BITRATES[table][brIdx];
    const sampleRate = MP3_RATES[ver][srIdx];
    const channels = (buf[i + 3] >> 6) === 3 ? 1 : 2;
    const samplesPerFrame = layer === 3 ? 384 : (layer === 2 ? 1152 : (ver === 3 ? 1152 : 576));
    const audioBytes = Math.max(0, fileSize - audioStart - i);
    const info = { sampleRate, channels, kbps, vbr: false, duration: kbps ? audioBytes / (kbps * 125) : 0 };

    // Xing / Info header (VBR, or CBR written by LAME): frame count -> exact duration.
    const side = ver === 3 ? (channels === 1 ? 17 : 32) : (channels === 1 ? 9 : 17);
    const x = i + 4 + side;
    const tag = buf.toString('latin1', x, x + 4);
    let frames = 0;
    if ((tag === 'Xing' || tag === 'Info') && x + 12 <= buf.length) {
      if (buf.readUInt32BE(x + 4) & 1) frames = buf.readUInt32BE(x + 8);
      info.vbr = tag === 'Xing';
    } else if (buf.toString('latin1', i + 36, i + 40) === 'VBRI' && i + 54 <= buf.length) {
      frames = buf.readUInt32BE(i + 50);
      info.vbr = true;
    }
    if (frames > 0) {
      info.duration = frames * samplesPerFrame / sampleRate;
      // Average bitrate only for real VBR files; a CBR file keeps its nominal rate.
      if (info.vbr && info.duration > 0) info.kbps = Math.round(audioBytes * 8 / info.duration / 1000);
    }
    return info;
  }
  return null;
}

// -------------------------------------------------------------------- FLAC --

async function readFlac(fh, start, wantPicture) {
  const result = { tags: {}, picture: null, info: null };
  let pos = start + 4; // after "fLaC"
  for (let guard = 0; guard < 64; guard++) {
    const h = await readAt(fh, pos, 4);
    if (h.length < 4) break;
    const last = !!(h[0] & 0x80);
    const type = h[0] & 0x7f;
    const len = (h[1] << 16) | (h[2] << 8) | h[3];
    pos += 4;
    if (type === 0 && len >= 18) { // STREAMINFO
      const b = await readAt(fh, pos, 18);
      if (b.length === 18) {
        const sampleRate = (b[10] << 12) | (b[11] << 4) | (b[12] >> 4);
        const channels = ((b[12] >> 1) & 7) + 1;
        const bits = (((b[12] & 1) << 4) | (b[13] >> 4)) + 1;
        const totalSamples = (b[13] & 0x0f) * 4294967296 + b.readUInt32BE(14);
        result.info = { sampleRate, channels, bits, duration: sampleRate ? totalSamples / sampleRate : 0 };
      }
    } else if (type === 4 && len > 8 && len < 4 * 1024 * 1024) { // VORBIS_COMMENT
      parseVorbisComments(await readAt(fh, pos, len), result.tags);
    } else if (type === 6 && len > 32) { // PICTURE
      result.tags.hasCover = true;
      if (wantPicture && len <= MAX_TAG_BYTES) {
        const pic = parseFlacPicture(await readAt(fh, pos, len));
        if (pic && (!result.picture || (pic.type === 3 && result.picture.type !== 3))) result.picture = pic;
      }
    }
    pos += len;
    if (last) break;
  }
  return result;
}

function parseVorbisComments(b, t) {
  try {
    let pos = 0;
    const vendorLen = b.readUInt32LE(pos); pos += 4 + vendorLen;
    const count = b.readUInt32LE(pos); pos += 4;
    const multi = {};
    for (let i = 0; i < count && pos + 4 <= b.length; i++) {
      const len = b.readUInt32LE(pos); pos += 4;
      if (pos + len > b.length) break;
      const s = b.toString('utf8', pos, pos + len); pos += len;
      const eq = s.indexOf('=');
      if (eq < 1) continue;
      const key = s.slice(0, eq).toUpperCase();
      const val = s.slice(eq + 1).trim();
      if (!val) continue;
      (multi[key] = multi[key] || []).push(val);
    }
    const get = (k) => (multi[k] ? multi[k].join(', ') : '');
    if (get('TITLE')) t.title = get('TITLE');
    if (get('ARTIST')) t.artist = get('ARTIST');
    if (get('ALBUMARTIST') || get('ALBUM ARTIST')) t.albumArtist = get('ALBUMARTIST') || get('ALBUM ARTIST');
    if (get('ALBUM')) t.album = get('ALBUM');
    if (get('TRACKNUMBER')) t.track = firstNumber(get('TRACKNUMBER'));
    if (get('DISCNUMBER')) t.disc = firstNumber(get('DISCNUMBER'));
    if (get('DATE') || get('YEAR')) t.year = firstNumber(get('DATE') || get('YEAR'));
  } catch (err) { /* malformed block: keep what was read */ }
}

function parseFlacPicture(b) {
  try {
    let pos = 0;
    const type = b.readUInt32BE(pos); pos += 4;
    const mimeLen = b.readUInt32BE(pos); pos += 4;
    const mime = b.toString('latin1', pos, pos + mimeLen).toLowerCase(); pos += mimeLen;
    const descLen = b.readUInt32BE(pos); pos += 4 + descLen;
    pos += 16; // width, height, depth, colours
    const dataLen = b.readUInt32BE(pos); pos += 4;
    const data = b.subarray(pos, pos + dataLen);
    if (data.length < 16) return null;
    return { type, mime: sniffImage(data) || mime, data };
  } catch (err) { return null; }
}

// ------------------------------------------------------------ public reads --

function khz(rate) {
  const k = rate / 1000;
  return (Number.isInteger(k) ? String(k) : k.toFixed(1)) + ' kHz';
}

// Title / artist / album guessed from "…/Artist/Album/01 - Title.ext".
function namesFromPath(file) {
  const base = path.basename(file, path.extname(file));
  const m = /^\s*(\d{1,3})\s*[-._)]?\s+(.*\S)\s*$/.exec(base);
  const dir = path.dirname(file);
  const album = path.basename(dir);
  const artist = path.basename(path.dirname(dir));
  return {
    title: (m ? m[2] : base).replace(/_/g, ' ').trim() || base,
    track: m ? parseInt(m[1], 10) : 0,
    album: album || '',
    artist: artist && artist !== album && !/^[A-Za-z]:\\?$/.test(artist) ? artist : ''
  };
}

async function readRaw(file, wantPicture) {
  const ext = path.extname(file).toLowerCase();
  const out = { tags: {}, picture: null, format: ext.slice(1).toUpperCase(), quality: '', duration: 0 };
  let fh;
  try {
    fh = await fs.promises.open(file, 'r');
    const size = (await fh.stat()).size;
    const id3 = await readId3(fh, wantPicture);
    const audioStart = id3 ? id3.size : 0;
    if (id3) { out.tags = id3.tags; out.picture = id3.picture; }
    const magic = (await readAt(fh, audioStart, 4)).toString('latin1');

    if (magic === 'fLaC') {
      const flac = await readFlac(fh, audioStart, wantPicture);
      out.tags = Object.assign({}, out.tags, flac.tags);
      out.picture = flac.picture || out.picture;
      out.format = 'FLAC';
      if (flac.info) {
        out.duration = flac.info.duration;
        out.quality = flac.info.bits + '-bit / ' + khz(flac.info.sampleRate);
      }
    } else if (ext === '.mp3' || id3) {
      const mp3 = await readMp3Info(fh, audioStart, size);
      out.format = 'MP3';
      if (mp3) {
        out.duration = mp3.duration;
        out.quality = mp3.kbps + ' kbps' + (mp3.vbr ? ' VBR' : '');
      }
    } else if (ext === '.m4a') {
      out.format = 'M4A';
    }
  } catch (err) {
    out.error = true;
  } finally {
    if (fh) await fh.close().catch(() => {});
  }
  return out;
}

// One track, ready for the renderer.
async function readTrack(file) {
  const raw = await readRaw(file, false);
  const guess = namesFromPath(file);
  const t = raw.tags;
  return {
    path: file,
    title: t.title || guess.title,
    artist: t.artist || t.albumArtist || guess.artist || 'Unknown artist',
    albumArtist: t.albumArtist || t.artist || guess.artist || 'Unknown artist',
    album: t.album || guess.album || '',
    track: t.track || guess.track || 0,
    disc: t.disc || 0,
    year: t.year || 0,
    duration: Number.isFinite(raw.duration) && raw.duration > 0 ? Math.round(raw.duration * 10) / 10 : 0,
    format: raw.format,
    quality: raw.quality,
    hasCover: !!t.hasCover
  };
}

// Reads many tracks, a few files at a time.
async function readTracks(files, onProgress) {
  const out = new Array(files.length);
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < files.length) {
      const i = next++;
      out[i] = await readTrack(files[i]);
      done++;
      if (onProgress && (done % 25 === 0 || done === files.length)) onProgress(done, files.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(8, files.length) }, worker));
  return out;
}

// Library order: artist, then album (by year), disc, track number, title.
function sortTracks(tracks) {
  return tracks.slice().sort((a, b) =>
    collator.compare(a.albumArtist, b.albumArtist) ||
    (a.album === b.album ? 0 : ((a.year || 9999) - (b.year || 9999)) || collator.compare(a.album, b.album)) ||
    (a.disc - b.disc) || (a.track - b.track) || collator.compare(a.title, b.title) || collator.compare(a.path, b.path));
}

// The cover for a file: the picture embedded in it, else an image file sitting
// in the same folder (cover.jpg, folder.jpg, front.png...). { mime, data } or null.
async function readCover(file) {
  const raw = await readRaw(file, true);
  if (raw.picture && raw.picture.data && raw.picture.data.length) return { mime: raw.picture.mime || 'image/jpeg', data: raw.picture.data };
  const dir = path.dirname(file);
  let names;
  try { names = await fs.promises.readdir(dir); } catch (err) { return null; }
  const images = names.filter((n) => COVER_EXT.includes(path.extname(n).toLowerCase()));
  if (!images.length) return null;
  const rank = (n) => {
    const i = COVER_NAMES.indexOf(path.basename(n, path.extname(n)).toLowerCase());
    return i === -1 ? COVER_NAMES.length : i;
  };
  images.sort((a, b) => rank(a) - rank(b) || collator.compare(a, b));
  const pick = images[0];
  try {
    const st = await fs.promises.stat(path.join(dir, pick));
    if (!st.isFile() || st.size > MAX_TAG_BYTES) return null;
    const data = await fs.promises.readFile(path.join(dir, pick));
    return { mime: sniffImage(data) || (path.extname(pick).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg'), data };
  } catch (err) { return null; }
}

module.exports = { AUDIO_EXT, isAudioFile, scan, readTrack, readTracks, sortTracks, readCover, namesFromPath };
