const h = require('./harness');
(async () => {
  const b = await h.launch(); const p = await h.open(b, 1366, 768);
  const st = () => p.evaluate(() => ({ paused: document.getElementById('art').classList.contains('paused'), icon: document.getElementById('playIcon').innerHTML.slice(0, 30) }));
  const c = await p.evaluate(() => { const r = document.getElementById('art').getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2 }; });
  console.log('before', JSON.stringify(await st()));
  await p.mouse.click(c.x, c.y); await p.waitForTimeout(400); const s1 = JSON.stringify(await st()); console.log('after tap 1', s1);
  await p.mouse.click(c.x, c.y); await p.waitForTimeout(400); const s2 = JSON.stringify(await st()); console.log('after tap 2', s2);
  await b.close();
  // A tap on the cover must toggle play/pause: the state after tap 1 and tap 2 must differ.
  if (s1 === s2) { console.log('FAIL: tap does not toggle'); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
