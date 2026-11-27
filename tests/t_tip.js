const h = require('./harness');
(async () => {
  const b = await h.launch(); const p = await h.open(b, 1366, 768);
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const info = () => p.evaluate(() => { const t = document.getElementById('tip'); return { hidden: t.hidden, show: t.classList.contains('show'), text: t.textContent, left: t.style.left, top: t.style.top }; });
  const fails = [];
  for (const [id, want] of [['shuffleBtn','Shuffle'],['likedBadge',null],['addBtn','Add to playlist'],['playBtn','Play / Pause']]) {
    const c = await p.evaluate((id) => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2, title: document.getElementById(id).getAttribute('title') }; }, id);
    await p.mouse.move(5, 5); await p.waitForTimeout(100);
    await p.mouse.move(c.x, c.y);
    await p.waitForTimeout(150); const early = await info();
    await p.waitForTimeout(500); const late = await info();
    const title = await p.evaluate((id) => document.getElementById(id).getAttribute('title'), id);
    console.log(id, JSON.stringify({ early: early.show, late, title }));
    if (early.show) fails.push(id + ' shown too early');
    if (!late.show || !late.text || (want && late.text !== want)) fails.push(id + ' not shown / wrong text');
    if (title) fails.push(id + ' still has native title');
    await p.mouse.down(); await p.waitForTimeout(100); const dn = await info(); if (id === 'shuffleBtn' || id === 'playBtn') await p.mouse.up(); else await p.mouse.move(5,5);
    if (dn.show) fails.push(id + ' not hidden on press');
  }
  await p.mouse.move(5, 5); await p.waitForTimeout(200);
  if ((await info()).show) fails.push('not hidden on leave');
  if (errs.length) fails.push('page errors ' + errs.join('|'));
  await b.close();
  if (fails.length) { console.log('FAIL', fails); process.exit(1); } console.log('ok');
})().catch(e => { console.error(e); process.exit(1); });
