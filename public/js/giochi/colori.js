// IL LADRO DI COLORI: il pavimento a caselle si colora dove passi. Il browser tiene la griglia e applica i cambi di
// ogni tick; ogni tanto arriva lo stato completo e la griglia si riallinea.
(() => {
  const { COLORI, lerp, omino } = window.Arena;
  let griglia = null, versione = null, meta = null;
  const chiaro = (hex, a) => { const n = parseInt(hex.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255; return `rgba(${r},${g},${b},${a})`; };
  const tavolo = window.Arena.tavolo({
    id: 'colori',
    obiettivo: 'caselle / 10',
    vivo: (ctx, s, i) => (s.s.n && s.s.n[i] != null ? `■ ${s.s.n[i]}` : null),
    istruzioni: () => 'WASD o frecce (sul telefono il joystick): dove passi il pavimento prende il tuo colore. Ruba i colori agli altri!',
    statoGioco: () => 'Colora!',
    hud: (ctx, s) => `<span>⏱️ ${s.s.resta} s</span>${s.s.n.map((x, i) => `<span style="color:${COLORI[i % COLORI.length]}">■ ${x}</span>`).join('')}`,
    fineRound: (p, s, ctx) => `Hai colorato ${s.s.n[ctx.mio]} caselle`,
    dopoTick(ctx, d) {
      if (!griglia || d.s.v !== versione) return;
      const c = d.s.c; for (let k = 0; k < c.length; k += 2) griglia[c[k]] = c[k + 1];
    },
    disegna(g, p, s, prima, u, ctx) {
      const ex = p.extra;
      if (ex && (ex.versione !== versione || !griglia || ex._letta !== true)) { griglia = ex.griglia.slice(); versione = ex.versione; meta = ex; ex._letta = true; }
      if (!meta) return;
      g.fillStyle = '#eceae4'; g.fillRect(0, 0, p.W, p.H);
      const C = meta.cella;
      for (let r = 0; r < meta.righe; r++) for (let c = 0; c < meta.cols; c++) {
        const o = griglia[r * meta.cols + c];
        g.fillStyle = o < 0 ? ((r + c) % 2 ? '#e4e1d9' : '#ecebe6') : chiaro(COLORI[o % COLORI.length], (r + c) % 2 ? 0.78 : 0.9);
        g.fillRect(c * C, r * C, C, C);
      }
      const ee = lerp(prima && prima.s.e, s.s.e, u);
      ee.forEach((e, i) => omino(g, e.x, e.y, 14, COLORI[i % COLORI.length], i === ctx.mio ? 'Tu' : ctx.nome(i).slice(0, 10), { io: i === ctx.mio }));
    },
  });
  Object.assign(window.Tavoli, { colori: tavolo });
})();
