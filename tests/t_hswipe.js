const h = require('./harness');
const toSec = t => { const [m, s] = t.split(':').map(Number); return m * 60 + s; };
async function run(b, w, hh, kind) {
  const p = await h.open(b, w, hh, { touch: kind === 'touch' });
  await h.goIdle(p);
  const info = await p.evaluate(() => { const r = document.getElementById('art').getBoundingClientRect(), sz = document.getElementById('swipeZone'); return { x: r.left + r.width/2, y: r.top + r.height/2, w: r.width, k: sz.getBoundingClientRect().height / sz.offsetHeight }; });
  const cdp = kind === 'touch' ? await p.context().newCDPSession(p) : null;
  const touch = (type, x) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: info.y, id: 1 }] });
  const title = () => p.evaluate(() => document.getElementById('trackTitle').textContent);
  const elapsed = async () => toSec(await p.evaluate(() => document.getElementById('timeElapsed').textContent));
  const hint = () => p.evaluate(() => { const e = document.getElementById('seekHint'); return e.classList.contains('show') ? e.textContent + (e.classList.contains('commit') ? ' [commit]' : '') : '(hidden)'; });
  const limit = info.w * 0.30; // screen px: 30% of the cover
  async function swipe(frac, label) {            // frac of the 30% limit, signed
    const dx = frac * limit, t0 = await title(), e0 = await elapsed();
    if (cdp) await touch('touchStart', info.x); else { await p.mouse.move(info.x, info.y); await p.mouse.down(); }
    for (let i = 1; i <= 12; i++) { const x = info.x + dx * i / 12; if (cdp) await touch('touchMove', x); else await p.mouse.move(x, info.y); await p.waitForTimeout(16); }
    const hnt = await hint(), tf = await p.evaluate(() => document.getElementById('art').style.transform);
    if (cdp) await touch('touchEnd'); else await p.mouse.up();
    await p.waitForTimeout(900);
    const t1 = await title(), e1 = await elapsed();
    return `${label.padEnd(26)} hint=${hnt.padEnd(14)} cover@release=${tf.padEnd(22)} track ${t0}${t1 === t0 ? ' (same)' : ' -> ' + t1}  elapsed ${e0}s -> ${e1}s (${e1 - e0 >= 0 ? '+' : ''}${e1 - e0}s)`;
  }
  console.log(`== ${w}x${hh} ${kind}  (cover ${Math.round(info.w / info.k)} layout px, 30% = ${Math.round(limit / info.k)} px)`);
  for (const [f, l] of [[0.04, 'wiggle (tiny, right)'], [0.5, '50% of limit, right'], [0.95, '95% of limit, right'], [-0.5, '50% of limit, left'], [-0.95, '95% of limit, left'], [1.15, '115% of limit, right'], [-1.15, '115% of limit, left']]) console.log('  ' + await swipe(f, l));
  console.log('  errs', JSON.stringify(p.errs));
  await p.context().close();
}
(async () => {
  const b = await h.launch();
  await run(b, 1366, 768, 'mouse'); await run(b, 1280, 1920, 'touch');
  await b.close();
})();
