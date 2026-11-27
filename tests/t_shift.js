const h = require('./harness');
(async () => {
  const b = await h.launch();
  const p = await h.open(b, 1366, 768); await h.goIdle(p);
  const top = async (l) => { const g = await h.geom(p); console.log(l.padEnd(34), 'art.top', g.art.top.toFixed(1), 'size', g.art.h.toFixed(0), 'tick.bottom', g.tick.bottom.toFixed(1), 'info.top', g.info.top.toFixed(1), 'volrevealed', await p.evaluate(()=>document.getElementById('app').classList.contains('volume-revealed'))); };
  await top('idle +0.7s'); await p.waitForTimeout(1500); await top('idle +2.2s (no interaction)');
  await p.mouse.move(600, 300); await p.waitForTimeout(300); await top('after mouse move over page');
  await p.evaluate(() => document.getElementById('app').classList.add('volume-revealed')); await p.waitForTimeout(400); await top('volume bar revealed (class only)');
  await p.evaluate(() => window.dispatchEvent(new Event('resize'))); await p.waitForTimeout(800); await top('after resize event');
  await b.close();
})();
