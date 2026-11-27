const h = require('./harness');
(async () => {
  const b = await h.launch();
  const p = await h.open(b, 1366, 768);
  const c = await p.evaluate(() => { const r = document.getElementById('art').getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2 }; });
  const playing = () => p.evaluate(() => !document.getElementById('art').classList.contains('paused'));
  const title = () => p.evaluate(() => document.getElementById('trackTitle').textContent);
  const vol = () => p.evaluate(() => document.getElementById('volLabel').textContent);
  // --- normal mode
  let t0 = await title(), pl0 = await playing(), v0 = await vol();
  await p.mouse.click(c.x, c.y); await p.waitForTimeout(300);
  console.log('normal: tap toggles play', pl0, '->', await playing());
  await p.mouse.move(c.x, c.y); await p.mouse.down(); for (let i=1;i<=12;i++){ await p.mouse.move(c.x, c.y-25*i); await p.waitForTimeout(16);} await p.mouse.up(); await p.waitForTimeout(400);
  console.log('normal: vertical drag on cover leaves volume alone', v0, '->', await vol(), '| cover transform:', await p.evaluate(()=>document.getElementById('art').style.transform));
  await p.mouse.move(c.x, c.y); await p.mouse.down(); for (let i=1;i<=12;i++){ await p.mouse.move(c.x-40*i, c.y); await p.waitForTimeout(16);} await p.mouse.up(); await p.waitForTimeout(900);
  console.log('normal: horizontal swipe changes track', JSON.stringify(t0), '->', JSON.stringify(await title()));
  // --- immersive mode
  await h.goIdle(p);
  const c2 = await p.evaluate(() => { const r = document.getElementById('art').getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2 }; });
  t0 = await title(); pl0 = await playing();
  await p.mouse.click(c2.x, c2.y); await p.waitForTimeout(300);
  console.log('idle: tap toggles play', pl0, '->', await playing(), '| still idle', await p.evaluate(()=>document.getElementById('app').classList.contains('idle')));
  await p.mouse.move(c2.x, c2.y); await p.mouse.down(); for (let i=1;i<=12;i++){ await p.mouse.move(c2.x-40*i, c2.y); await p.waitForTimeout(16);} await p.mouse.up(); await p.waitForTimeout(900);
  console.log('idle: horizontal swipe changes track', JSON.stringify(t0), '->', JSON.stringify(await title()));
  // swipe-up below the cover still leaves immersive mode
  const g = await h.geom(p); const k = g.k; const sz = await p.evaluate(()=>document.getElementById('swipeZone').getBoundingClientRect().top);
  const yBelow = sz + (g.art.bottom + 20) * k, x = c2.x;
  await p.mouse.move(x, yBelow); await p.mouse.down(); for (let i=1;i<=10;i++){ await p.mouse.move(x, yBelow-12*i); await p.waitForTimeout(16);} await p.mouse.up(); await p.waitForTimeout(900);
  console.log('idle: swipe up below the cover exits immersive mode ->', !(await p.evaluate(()=>document.getElementById('app').classList.contains('idle'))));
  // side strip still reveals/controls the volume bar
  await h.goIdle(p);
  const zr = await p.evaluate(() => { const r = document.getElementById('idleVolumeZone').getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2 }; });
  const vb = await vol();
  await p.mouse.move(zr.x, zr.y); await p.mouse.down(); for (let i=1;i<=10;i++){ await p.mouse.move(zr.x, zr.y-20*i); await p.waitForTimeout(16);} await p.mouse.up();
  console.log('idle: side strip drag still works', vb, '->', await vol(), '| bar shown', await p.evaluate(()=>document.getElementById('app').classList.contains('volume-revealed')));
  console.log('errs', JSON.stringify(p.errs));
  await b.close();
})();
