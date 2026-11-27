const h = require('./harness');
async function run(b, w, hh, kind) {
  const p = await h.open(b, w, hh, { touch: kind === 'touch' });
  await h.goIdle(p);
  const g0 = await h.geom(p);
  const sz = await p.evaluate(() => { const r = document.getElementById('art').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const vol = () => p.evaluate(() => document.getElementById('volLabel').textContent);
  const art = () => p.evaluate(() => { const a = document.getElementById('art'); return { t: a.style.transform, op: a.style.opacity }; });
  const v0 = await vol();
  const out = { size: `${w}x${hh} ${kind}`, vol0: v0 };
  const cdp = kind === 'touch' ? await p.context().newCDPSession(p) : null;
  const touch = (type, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: sz.x, y, id: 1 }] });
  const steps = async (fromY, toY, n = 12) => { for (let i = 1; i <= n; i++) { const y = fromY + (toY - fromY) * i / n; if (cdp) await touch('touchMove', y); else await p.mouse.move(sz.x, y); await p.waitForTimeout(16); } };
  async function drag(dy) {
    if (cdp) await touch('touchStart', sz.y); else { await p.mouse.move(sz.x, sz.y); await p.mouse.down(); }
    await steps(sz.y, sz.y + dy);
    const mid = await h.geom(p), v = await vol(), a = await art(), barShown = await p.evaluate(() => document.getElementById('app').classList.contains('volume-revealed'));
    if (cdp) await touch('touchEnd'); else await p.mouse.up();
    await p.waitForTimeout(450);
    const end = await h.geom(p), aEnd = await art();
    return { shift: +(mid.art.top - g0.art.top).toFixed(1), tickGap: +(mid.art.top - mid.tick.bottom).toFixed(1), titleGap: +(mid.info.top - mid.art.bottom).toFixed(1), vol: v, bar: barShown, back: +(end.art.top - g0.art.top).toFixed(1), tf: aEnd.t, op: aEnd.op };
  }
  out.up = await drag(-300); out.down = await drag(+300); out.upSmall = await drag(-60);
  out.idleStill = await p.evaluate(() => document.getElementById('app').classList.contains('idle'));
  out.errs = p.errs;
  console.log(JSON.stringify(out));
  await p.context().close();
}
(async () => {
  const b = await h.launch();
  for (const kind of ['mouse', 'touch']) for (const [w, hh] of [[1366, 768], [1280, 1920], [1000, 700]]) await run(b, w, hh, kind);
  await b.close();
})();
