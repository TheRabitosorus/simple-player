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
  const hint = () => p.evaluate(() => { const e = document.getElementById('seekHint'); return e.classList.contains('show') ? e.textContent : '(hidden)'; });
  const limit = info.w * 0.30, dead = 12 * info.k;
  const base0 = await elapsed(); await p.waitForTimeout(2000); const drift = ((await elapsed()) - base0) / 2;
  console.log(`== ${w}x${hh} ${kind}  natural drift of demo clock: ${drift.toFixed(1)} s/s, 30% = ${Math.round(limit / info.k)} px, dead zone 12 px`);
  async function hold(frac, secs, label, pre) {
    const dx = frac * limit, t0 = await title();
    if (pre) { /* seek forward a bit first so a backward test has room */ }
    const e0 = await elapsed();
    if (cdp) await touch('touchStart', info.x); else { await p.mouse.move(info.x, info.y); await p.mouse.down(); }
    for (let i = 1; i <= 8; i++) { const x = info.x + dx * i / 8; if (cdp) await touch('touchMove', x); else await p.mouse.move(x, info.y); await p.waitForTimeout(16); }
    const samples = [];
    for (let i = 0; i < secs * 2; i++) { await p.waitForTimeout(500); samples.push(await hint()); }   // finger STILL
    const tf = await p.evaluate(() => document.getElementById('art').style.transform);
    if (cdp) await touch('touchEnd'); else await p.mouse.up();
    await p.waitForTimeout(700);
    const e1 = await elapsed(), t1 = await title(), tfEnd = await p.evaluate(() => document.getElementById('art').style.transform);
    const t = (Math.abs(dx) / info.k - 12) / (limit / info.k - 12), expect = Math.sign(dx) * t * 30 * secs;
    console.log(`  ${label.padEnd(24)} hint while held: ${samples.join(' → ')}`);
    console.log(`  ${''.padEnd(24)} elapsed ${e0}s → ${e1}s (${e1 - e0 >= 0 ? '+' : ''}${e1 - e0}s, expected ≈ ${expect.toFixed(0)}s${drift ? ' + clock drift ' + (drift * (secs + 1)).toFixed(0) : ''}) | track ${t0 === t1 ? 'same' : t0 + ' → ' + t1} | cover after release ${tfEnd}`);
  }
  await hold(0.06, 1, 'tiny (dead zone), 1 s');
  await hold(0.30, 2, '30% of limit, 2 s');
  await hold(0.60, 2, '60% of limit, 2 s');
  await hold(-0.30, 2, '30% left, 2 s');
  await hold(-0.60, 2, '60% left, 2 s');
  await hold(1.20, 1, '120% (change track)');
  console.log('  errs', JSON.stringify(p.errs));
  await p.context().close();
}
(async () => { const b = await h.launch(); await run(b, 1280, 1920, 'touch'); await run(b, 1366, 768, 'mouse'); await b.close(); })();
