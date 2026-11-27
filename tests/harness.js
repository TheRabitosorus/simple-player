const { chromium } = require('playwright-core');
const path = require('path');
// Chrome/Chromium executable: set CHROME_PATH, otherwise common locations.
const CHROME = process.env.CHROME_PATH || ['/usr/bin/google-chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(p => require('fs').existsSync(p));
exports.launch = async () => chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
exports.FILE = require('url').pathToFileURL(path.join(__dirname, '..', 'src', 'renderer', 'index.html')).href;
exports.open = async (b, w, h, opts = {}) => {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: !!opts.touch });
  const page = await ctx.newPage();
  page.errs = []; page.on('pageerror', e => page.errs.push(e.message));
  await page.route(/fonts\.g/, r => r.abort());
  await page.goto(exports.FILE); await page.waitForTimeout(500);
  return page;
};
// Layout-pixel geometry (offset-style, relative to #swipeZone), robust to the interface scale.
exports.geom = (page) => page.evaluate(() => {
  const sz = document.getElementById('swipeZone'), r = sz.getBoundingClientRect(), k = r.height / sz.offsetHeight;
  const rel = id => { const q = document.getElementById(id).getBoundingClientRect(); return { top: (q.top - r.top) / k, bottom: (q.bottom - r.top) / k, left: (q.left - r.left) / k, right: (q.right - r.left) / k, h: q.height / k, w: q.width / k }; };
  return { swH: sz.offsetHeight, swW: sz.offsetWidth, k, art: rel('art'), tick: rel('likedBadge'), info: rel('trackInfo'), title: rel('trackTitle') };
});
exports.goIdle = async (page) => { await page.evaluate(() => { document.getElementById('app').classList.add('idle'); }); await page.evaluate(() => window.dispatchEvent(new Event('resize'))); await page.waitForTimeout(800); await page.evaluate(() => window.dispatchEvent(new Event('resize'))); await page.waitForTimeout(500); };
