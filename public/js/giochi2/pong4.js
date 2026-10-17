// PONG A QUATTRO: campo quadrato in stile sala giochi (fondo blu notte, righe al neon), girato in modo che la propria
// racchetta sia sempre in basso. Racchette del colore del giocatore con le vite accanto, lati chiusi a righe, blocchi
// negli angoli, pallina luminosa con la scia, lampi quando batte e quando passa.
(() => {
  const { COLORI } = window.Arena;
  const { suono, esc } = window.Nuovi;
  let sfondo = null, chiave = '', fx = [], scie = new Map(), visto = 0;

  // la rotazione del campo per chi gioca sul lato "lato" (0 sotto, 1 sinistra, 2 sopra, 3 destra)
  function gira(g, lato, Lc) {
    if (lato === 1) { g.translate(0, Lc); g.rotate(-Math.PI / 2); }
    else if (lato === 2) { g.translate(Lc, Lc); g.rotate(Math.PI); }
    else if (lato === 3) { g.translate(Lc, 0); g.rotate(Math.PI / 2); }
  }
  function centro(lato, s, ex) {
    const { L: Lc, DISTANZA } = ex;
    if (lato === 0) return [s, Lc - DISTANZA];
    if (lato === 2) return [Lc - s, DISTANZA];
    if (lato === 1) return [DISTANZA, s];
    return [Lc - DISTANZA, Lc - s];
  }
  function preparaSfondo(ex) {
    const Lc = ex.L, k = 2, c = document.createElement('canvas'); c.width = Lc * k; c.height = Lc * k;
    const g = c.getContext('2d'); g.scale(k, k);
    const gr = g.createRadialGradient(Lc / 2, Lc / 2, 30, Lc / 2, Lc / 2, Lc * 0.75); gr.addColorStop(0, '#13234a'); gr.addColorStop(1, '#070d20');
    g.fillStyle = gr; g.fillRect(0, 0, Lc, Lc);
    g.strokeStyle = 'rgba(120,170,255,.12)'; g.lineWidth = 1;
    for (let x = 0; x <= Lc; x += 30) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, Lc); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(Lc, x); g.stroke(); }
    g.strokeStyle = 'rgba(160,200,255,.35)'; g.lineWidth = 2; g.setLineDash([10, 10]);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(Lc, Lc); g.moveTo(Lc, 0); g.lineTo(0, Lc); g.stroke(); g.setLineDash([]);
    g.beginPath(); g.arc(Lc / 2, Lc / 2, 60, 0, Math.PI * 2); g.stroke();
    // blocchi negli angoli
    const A = ex.ANGOLO;
    for (const [x, y] of [[0, 0], [Lc - A, 0], [0, Lc - A], [Lc - A, Lc - A]]) {
      g.fillStyle = '#26365e'; g.fillRect(x, y, A, A);
      g.strokeStyle = 'rgba(160,200,255,.6)'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, A - 2, A - 2);
    }
    return c;
  }
  // un lato chiuso: un muro a righe
  function muro(g, lato, ex) {
    const Lc = ex.L, A = ex.ANGOLO;
    g.save();
    const r = lato === 0 ? [A, Lc - 8, Lc - 2 * A, 8] : lato === 2 ? [A, 0, Lc - 2 * A, 8] : lato === 1 ? [0, A, 8, Lc - 2 * A] : [Lc - 8, A, 8, Lc - 2 * A];
    g.fillStyle = '#4a587a'; g.fillRect(...r);
    g.fillStyle = 'rgba(255,255,255,.18)';
    for (let k = 0; k < Lc; k += 16) { if (lato === 0 || lato === 2) g.fillRect(r[0] + k, r[1], 8, 8); else g.fillRect(r[0], r[1] + k, 8, 8); }
    g.restore();
  }

  const tavolo = window.Arena.tavolo({
    id: 'pong4',
    mouse: 'bersaglio',
    comandi: 'movimento',
    clicAzione: false,
    obiettivo: 'punti',
    istruzioni: () => (window.Arena.touch()
      ? 'Trascina il dito sul campo (o usa il joystick): la tua racchetta, in basso, segue il dito. Non far passare la pallina!'
      : 'Muovi il mouse o usa le frecce (A e D): la tua racchetta è quella in basso. Non far passare la pallina!'),
    sottotitolo: (p) => (p.extra ? `${p.extra.vite} vite a testa` : ''),
    ruolo: (p, s, ctx) => 'la tua racchetta è quella in basso',
    statoGioco: (ctx, s) => {
      const io = s.s && s.s.r && s.s.r[ctx.mio];
      if (io && io[2]) return 'Sei fuori: guarda gli altri';
      return io ? `Vite: ${io[1]}` : 'Gioca!';
    },
    hud: (ctx, s) => {
      const io = s.s && s.s.r && s.s.r[ctx.mio];
      if (!io) return '';
      return `<span>❤️ ${'●'.repeat(Math.max(0, io[1]))}</span><span>⚪ palline in campo: ${s.s.p.length}</span>`;
    },
    fineRound: (p, s, ctx) => `Punti: ${p.punti[ctx.mio]}`,
    dopoTick(ctx, d) {
      if (!d.s) return;
      const ora = performance.now();
      for (const [num, tipo, x, y] of d.s.b || []) {
        if (num <= visto) continue;
        visto = num;
        fx.push({ t: ora, x, y, tipo });
        if (tipo === 0) suono([[520, 0.04]], { tipo: 'square', volume: 0.04 });
        else if (tipo === 1) suono([[260, 0.03]], { tipo: 'square', volume: 0.025 });
        else suono([[200, 0.12], [120, 0.2]], { tipo: 'sawtooth', volume: 0.06 });
      }
    },
    disegna(g, p, s, prima, u, ctx) {
      const ex = p.extra; if (!ex || !s.s || !s.s.r) return;
      const Lc = ex.L, st = s.s, p0 = prima && prima.s && prima.s.r ? prima.s : null;
      const mioLato = ex.lati[ctx.mio] ?? 0;
      const k2 = `${Lc}`;
      if (k2 !== chiave) { sfondo = preparaSfondo(ex); chiave = k2; }
      g.save();
      gira(g, mioLato, Lc);
      g.drawImage(sfondo, 0, 0, Lc, Lc);
      // lati chiusi: senza giocatore o con chi è fuori
      for (let lato = 0; lato < 4; lato++) {
        const i = ex.lati.indexOf(lato);
        if (i < 0 || st.r[i][2]) muro(g, lato, ex);
      }
      // racchette
      st.r.forEach((r, i) => {
        if (r[2]) return;
        const lato = ex.lati[i], s0 = p0 && p0.r[i] ? p0.r[i][0] : r[0], sv = s0 + (r[0] - s0) * u;
        const [cx, cy] = centro(lato, sv, ex), orizz = lato === 0 || lato === 2;
        const w = orizz ? ex.RACCHETTA : ex.SPESSA, h = orizz ? ex.SPESSA : ex.RACCHETTA;
        const col = COLORI[i % COLORI.length];
        g.fillStyle = col; g.globalAlpha = 0.25; g.fillRect(cx - w / 2 - 4, cy - h / 2 - 4, w + 8, h + 8); g.globalAlpha = 1;
        g.fillStyle = col; g.fillRect(cx - w / 2, cy - h / 2, w, h);
        g.fillStyle = 'rgba(255,255,255,.45)'; if (orizz) g.fillRect(cx - w / 2, cy - h / 2, w, 3); else g.fillRect(cx - w / 2, cy - h / 2, 3, h);
        if (i === ctx.mio) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(cx - w / 2 - 1, cy - h / 2 - 1, w + 2, h + 2); }
      });
      // palline con la scia
      const pp = new Map(p0 && p0.p ? p0.p.map((b) => [b[0], b]) : []);
      const ora = performance.now();
      for (const b of st.p) {
        const a = pp.get(b[0]);
        const x = a && Math.hypot(a[1] - b[1], a[2] - b[2]) < 60 ? a[1] + (b[1] - a[1]) * u : b[1];
        const y = a && Math.hypot(a[1] - b[1], a[2] - b[2]) < 60 ? a[2] + (b[2] - a[2]) * u : b[2];
        let sc = scie.get(b[0]); if (!sc) { sc = []; scie.set(b[0], sc); }
        if (!b[3]) { sc.push([x, y, ora]); while (sc.length && ora - sc[0][2] > 160) sc.shift(); }
        sc.forEach(([sx, sy, t]) => { const k = 1 - (ora - t) / 160; g.fillStyle = `rgba(255,240,160,${0.35 * k})`; g.beginPath(); g.arc(sx, sy, ex.RP * k, 0, Math.PI * 2); g.fill(); });
        if (b[3]) g.globalAlpha = 0.4 + 0.4 * Math.sin(ora / 80);
        g.fillStyle = 'rgba(255,240,160,.35)'; g.beginPath(); g.arc(x, y, ex.RP + 5, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fffbe8'; g.beginPath(); g.arc(x, y, ex.RP, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;
      }
      if (scie.size > 30) for (const id of scie.keys()) if (!st.p.some((b) => b[0] === id)) scie.delete(id);
      fx = fx.filter((f) => ora - f.t < 350);
      for (const f of fx) {
        const k = (ora - f.t) / 350;
        g.strokeStyle = f.tipo === 2 ? `rgba(255,90,90,${1 - k})` : `rgba(255,255,200,${1 - k})`;
        g.lineWidth = f.tipo === 2 ? 5 : 2; g.beginPath(); g.arc(f.x, f.y, (f.tipo === 2 ? 20 : 8) + k * (f.tipo === 2 ? 50 : 16), 0, Math.PI * 2); g.stroke();
      }
      g.restore();
      // nomi e vite vicino a ogni lato (scritti dritti, dopo la rotazione)
      st.r.forEach((r, i) => {
        const lato = (ex.lati[i] - mioLato + 4) % 4; // il lato come lo vedo io
        const pos = [[Lc / 2, Lc - 44], [44, Lc / 2], [Lc / 2, 44], [Lc - 44, Lc / 2]][lato];
        const testo = `${i === ctx.mio ? 'Tu' : ctx.nome(i)} ${r[2] ? '💀' : '♥'.repeat(Math.max(0, r[1]))}`;
        g.save(); g.translate(pos[0], pos[1]);
        if (lato === 1) g.rotate(-Math.PI / 2); else if (lato === 3) g.rotate(Math.PI / 2);
        g.font = '600 14px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = r[2] ? 'rgba(255,255,255,.35)' : COLORI[i % COLORI.length];
        g.fillText(testo, 0, 0);
        g.restore();
      });
    },
  });
  tavolo.punteggio = (ctx) => {
    const p = ctx.partita;
    return p.punti.map((x, i) => `<span style="color:${COLORI[i % COLORI.length]}">${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x}</b></span>`).join('') + '<span class="obiettivo">punti</span>';
  };
  Object.assign(window.Tavoli, { pong4: tavolo });
})();
