const h = require('./harness');
(async () => {
  const b = await h.launch();
  for (const [w, hh] of [[1280,1920],[1920,1080],[1366,768],[800,1280],[640,720],[480,760],[1000,700]]) {
    const p = await h.open(b, w, hh); await h.goIdle(p);
    const g = await h.geom(p);
    console.log(`${w}x${hh}  art ${g.art.top.toFixed(0)}-${g.art.bottom.toFixed(0)} (${g.art.w.toFixed(0)}px) tick bottom ${g.tick.bottom.toFixed(0)} info top ${g.info.top.toFixed(0)} | roomUp=${(g.art.top-g.tick.bottom).toFixed(0)} roomDown=${(g.info.top-g.art.bottom).toFixed(0)} errs=${p.errs.length}`);
    await p.context().close();
  }
  await b.close();
})();
