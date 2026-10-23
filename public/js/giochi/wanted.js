// WANTED!: il manifesto "RICERCATO" in alto e la folla sotto. Dodici personaggi originali disegnati sul canvas:
// pirata, robot, gatto, cuoco, astronauta, ninja, fantasma, dinosauro, mago, alieno, vichingo e zombie. Quando qualcuno lo trova, il ricercato si illumina e gli altri si spengono.
(() => {
  const { COLORI } = window.Arena;
  const TIPI = ['pirata', 'robot', 'gatto', 'cuoco', 'astronauta', 'ninja', 'fantasma', 'dinosauro', 'mago', 'alieno', 'vichingo', 'zombie'];
  const NOMI = { pirata: 'IL PIRATA', robot: 'IL ROBOT', gatto: 'IL GATTO', cuoco: 'IL CUOCO', astronauta: 'L\'ASTRONAUTA', ninja: 'IL NINJA', fantasma: 'IL FANTASMA', dinosauro: 'IL DINOSAURO', mago: 'IL MAGO', alieno: 'L\'ALIENO', vichingo: 'IL VICHINGO', zombie: 'LO ZOMBIE' };
  const MAX_TELEFONO = 120; // sul telefono, con folle enormi, se ne disegnano al massimo tante (il ricercato sempre)
  const telefono = () => window.matchMedia('(pointer: coarse)').matches && Math.min(window.innerWidth, window.innerHeight) < 700;
  let visibili = []; // [x, y] delle facce disegnate adesso (per non mandare tocchi dove non si vede niente)
  const cerchio = (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  const ovale = (g, x, y, a, b, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, a, b, 0, 0, Math.PI * 2); g.fill(); };
  const occhi = (g, dx, y, r, c = '#111') => { cerchio(g, -dx, y, r, c); cerchio(g, dx, y, r, c); };
  // gli otto personaggi nuovi (stessa scala dei vecchi: raggio 24)
  const NUOVI = {
    astronauta(g) {
      cerchio(g, 0, 0, 23, '#eef1f6'); g.strokeStyle = '#9aa4b2'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#20314f'; g.beginPath(); g.ellipse(0, 1, 16, 13, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(120,200,255,.55)'; g.beginPath(); g.ellipse(-6, -4, 6, 3.5, -0.5, 0, Math.PI * 2); g.fill();
      cerchio(g, -17, -14, 3, '#e8322a'); g.fillStyle = '#f2c230'; g.fillRect(12, 14, 8, 5);
    },
    ninja(g) {
      cerchio(g, 0, 2, 21, '#1d1f26');
      g.fillStyle = '#f2c9a0'; g.fillRect(-17, -6, 34, 11);
      occhi(g, 7, 0, 2.6); g.strokeStyle = '#111'; g.lineWidth = 2; g.beginPath(); g.moveTo(-12, -5); g.lineTo(-3, -3); g.moveTo(12, -5); g.lineTo(3, -3); g.stroke();
      g.fillStyle = '#c0392b'; g.fillRect(-21, -12, 42, 5); g.beginPath(); g.moveTo(19, -11); g.lineTo(30, -16); g.lineTo(28, -6); g.fill();
    },
    fantasma(g) {
      g.fillStyle = '#f4f6fb'; g.beginPath(); g.moveTo(-19, 20); g.lineTo(-19, -4); g.arc(0, -4, 19, Math.PI, 0); g.lineTo(19, 20);
      for (let k = 0; k < 4; k++) g.quadraticCurveTo(14 - k * 10, 14, 9.5 - k * 9.5, 20); g.closePath(); g.fill();
      g.strokeStyle = '#b9c2d3'; g.lineWidth = 1.5; g.stroke();
      ovale(g, -7, -4, 3.5, 5, '#1b2140'); ovale(g, 7, -4, 3.5, 5, '#1b2140'); ovale(g, 0, 8, 4, 5, '#1b2140');
    },
    dinosauro(g) {
      g.fillStyle = '#45b35a'; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(-14 + k * 8, -16); g.lineTo(-10 + k * 8, -26); g.lineTo(-6 + k * 8, -16); g.fill(); }
      ovale(g, 0, 2, 22, 18, '#5fcf6f');
      ovale(g, 0, 11, 15, 7, '#9be29c');
      occhi(g, 9, -5, 4.5, '#fff'); occhi(g, 9, -5, 2.2);
      g.fillStyle = '#fff'; for (const x of [-8, -3, 2, 7]) { g.beginPath(); g.moveTo(x, 6); g.lineTo(x + 2.5, 10); g.lineTo(x + 5, 6); g.fill(); }
    },
    mago(g) {
      ovale(g, 0, 5, 16, 17, '#f2c9a0');
      g.fillStyle = '#eef1f6'; g.beginPath(); g.moveTo(-15, 6); g.quadraticCurveTo(0, 36, 15, 6); g.quadraticCurveTo(0, 14, -15, 6); g.fill();
      occhi(g, 6, 1, 2.3);
      g.fillStyle = '#4b2a9c'; g.beginPath(); g.moveTo(-22, -6); g.lineTo(22, -6); g.lineTo(4, -34); g.closePath(); g.fill();
      g.fillStyle = '#f2c230'; g.beginPath(); g.arc(-2, -17, 2.4, 0, Math.PI * 2); g.arc(7, -11, 1.8, 0, Math.PI * 2); g.fill();
    },
    alieno(g) {
      g.strokeStyle = '#4bd06a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-8, -16); g.lineTo(-13, -29); g.moveTo(8, -16); g.lineTo(13, -29); g.stroke();
      cerchio(g, -13, -29, 3.2, '#ff5fae'); cerchio(g, 13, -29, 3.2, '#ff5fae');
      g.fillStyle = '#7ee08a'; g.beginPath(); g.moveTo(0, 22); g.bezierCurveTo(-26, 12, -24, -20, 0, -20); g.bezierCurveTo(24, -20, 26, 12, 0, 22); g.fill();
      g.fillStyle = '#111'; g.beginPath(); g.ellipse(-8, -3, 7, 4, 0.5, 0, Math.PI * 2); g.ellipse(8, -3, 7, 4, -0.5, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#2f7a3c'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 9, 3.5, 0.2, Math.PI - 0.2); g.stroke();
    },
    vichingo(g) {
      g.fillStyle = '#f5ecd7'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 16, -12); g.quadraticCurveTo(s * 30, -16, s * 27, -32); g.quadraticCurveTo(s * 24, -20, s * 12, -18); g.fill(); }
      ovale(g, 0, 4, 17, 18, '#f2c9a0');
      g.fillStyle = '#9aa4b2'; g.beginPath(); g.arc(0, -6, 18, Math.PI, 0); g.fill(); g.fillRect(-2, -6, 4, 12);
      occhi(g, 7, 2, 2.4);
      g.fillStyle = '#d9772b'; g.beginPath(); g.moveTo(-15, 8); g.quadraticCurveTo(0, 34, 15, 8); g.quadraticCurveTo(0, 16, -15, 8); g.fill();
    },
    zombie(g) {
      ovale(g, 0, 3, 18, 20, '#8fb77a');
      g.fillStyle = '#3b3326'; g.beginPath(); g.moveTo(-18, -6); g.lineTo(-12, -20); g.lineTo(-4, -12); g.lineTo(3, -22); g.lineTo(9, -13); g.lineTo(18, -19); g.lineTo(18, -6); g.quadraticCurveTo(0, -12, -18, -6); g.fill();
      cerchio(g, -7, 0, 4.5, '#f4f1e1'); cerchio(g, -7, 0, 1.8, '#b3172f'); cerchio(g, 8, 1, 2.6, '#222');
      g.strokeStyle = '#4c3a2c'; g.lineWidth = 2; g.beginPath(); g.moveTo(-8, 12); g.lineTo(-3, 10); g.lineTo(2, 13); g.lineTo(8, 10); g.stroke();
      g.strokeStyle = '#5d7a4f'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(10, -6); g.lineTo(15, 4); g.moveTo(11, 0); g.lineTo(16, -2); g.stroke();
    },
  };
  let croci = [], stelle = null;
  function faccia(g, tipo, x, y, r, ang = 0) {
    g.save(); g.translate(x, y); if (ang) g.rotate(ang); g.scale(r / 24, r / 24);
    if (NUOVI[tipo]) NUOVI[tipo](g);
    else if (tipo === 'robot') {
      g.strokeStyle = '#6b7482'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -20); g.lineTo(0, -30); g.stroke();
      g.fillStyle = '#e8322a'; g.beginPath(); g.arc(0, -31, 4, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#aab3bf'; g.beginPath(); g.moveTo(-18, -20); g.arcTo(20, -20, 20, 22, 6); g.arcTo(20, 22, -20, 22, 6); g.arcTo(-20, 22, -20, -20, 6); g.arcTo(-20, -20, 20, -20, 6); g.fill();
      g.strokeStyle = '#6b7482'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#1b2a4a'; g.fillRect(-14, -9, 11, 10); g.fillRect(3, -9, 11, 10);
      g.fillStyle = '#46e8e8'; g.fillRect(-12, -7, 7, 6); g.fillRect(5, -7, 7, 6);
      g.fillStyle = '#4b5059'; for (let k = 0; k < 5; k++) g.fillRect(-11 + k * 5, 9, 3, 7);
      g.fillStyle = '#6b7482'; for (const [a, b] of [[-17, -17], [17, -17], [-17, 19], [17, 19]]) { g.beginPath(); g.arc(a, b, 1.6, 0, Math.PI * 2); g.fill(); }
    } else if (tipo === 'gatto') {
      g.fillStyle = '#f08a24';
      g.beginPath(); g.moveTo(-20, -8); g.lineTo(-16, -28); g.lineTo(-4, -18); g.fill(); g.beginPath(); g.moveTo(20, -8); g.lineTo(16, -28); g.lineTo(4, -18); g.fill();
      g.fillStyle = '#f7b8c8'; g.beginPath(); g.moveTo(-16, -12); g.lineTo(-15, -23); g.lineTo(-8, -17); g.fill(); g.beginPath(); g.moveTo(16, -12); g.lineTo(15, -23); g.lineTo(8, -17); g.fill();
      g.fillStyle = '#f08a24'; g.beginPath(); g.ellipse(0, 2, 21, 19, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c96a14'; g.fillRect(-3, -16, 2, 6); g.fillRect(2, -16, 2, 6);
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, 10, 11, 8, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3bb04a'; g.beginPath(); g.ellipse(-8, -2, 4.5, 5.5, 0, 0, Math.PI * 2); g.ellipse(8, -2, 4.5, 5.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#111'; g.beginPath(); g.ellipse(-8, -2, 1.6, 4.5, 0, 0, Math.PI * 2); g.ellipse(8, -2, 1.6, 4.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e8577a'; g.beginPath(); g.moveTo(-3, 6); g.lineTo(3, 6); g.lineTo(0, 9); g.fill();
      g.strokeStyle = '#555'; g.lineWidth = 1; for (const s of [-1, 1]) for (const d of [-2, 2]) { g.beginPath(); g.moveTo(s * 7, 9 + d * 0.5); g.lineTo(s * 22, 7 + d * 2); g.stroke(); }
    } else {
      // faccia umana (pirata o cuoco)
      g.fillStyle = '#f2c9a0'; g.beginPath(); g.ellipse(0, 3, 18, 20, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e8a888'; g.beginPath(); g.arc(-19, 3, 4, 0, Math.PI * 2); g.arc(19, 3, 4, 0, Math.PI * 2); g.fill();
      if (tipo === 'pirata') {
        g.fillStyle = '#d6243a'; g.beginPath(); g.moveTo(-19, -4); g.quadraticCurveTo(0, -30, 19, -4); g.lineTo(19, -9); g.quadraticCurveTo(0, -24, -19, -9); g.closePath(); g.fill();
        g.beginPath(); g.ellipse(0, -10, 19, 10, 0, Math.PI, 0); g.fill();
        g.fillStyle = '#fff'; for (const [a, b] of [[-8, -13], [2, -16], [10, -11]]) { g.beginPath(); g.arc(a, b, 1.8, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#d6243a'; g.beginPath(); g.moveTo(17, -8); g.lineTo(27, -2); g.lineTo(22, 2); g.fill();
        g.strokeStyle = '#111'; g.lineWidth = 2; g.beginPath(); g.moveTo(-17, -6); g.lineTo(10, 6); g.stroke();
        g.fillStyle = '#111'; g.beginPath(); g.ellipse(-7, 1, 6, 5, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(7, 0, 4, 0, Math.PI * 2); g.fill(); g.fillStyle = '#2a1a10'; g.beginPath(); g.arc(7.5, 0.5, 2, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(80,50,30,.5)'; for (let k = 0; k < 14; k++) g.fillRect(-11 + (k * 7) % 22, 12 + (k % 3) * 3, 1.5, 1.5);
        g.strokeStyle = '#7a3a2a'; g.lineWidth = 2; g.beginPath(); g.arc(0, 9, 6, 0.3, Math.PI - 0.3); g.stroke();
        g.fillStyle = '#f2c230'; g.beginPath(); g.arc(-20, 9, 2.6, 0, Math.PI * 2); g.fill();
      } else {
        // cuoco: cappello alto, baffi, guance rosse
        g.fillStyle = '#fff'; g.fillRect(-14, -20, 28, 10); g.beginPath(); g.arc(-9, -26, 9, 0, Math.PI * 2); g.arc(0, -31, 10, 0, Math.PI * 2); g.arc(9, -26, 9, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#ccc'; g.lineWidth = 1.5; g.strokeRect(-14, -20, 28, 10);
        g.fillStyle = '#222'; g.beginPath(); g.arc(-7, 0, 2.6, 0, Math.PI * 2); g.arc(7, 0, 2.6, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(230,90,90,.45)'; g.beginPath(); g.arc(-11, 7, 4, 0, Math.PI * 2); g.arc(11, 7, 4, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#3a2412'; g.beginPath(); g.moveTo(0, 8); g.quadraticCurveTo(-8, 5, -14, 11); g.quadraticCurveTo(-7, 11, 0, 10); g.quadraticCurveTo(7, 11, 14, 11); g.quadraticCurveTo(8, 5, 0, 8); g.fill();
        g.strokeStyle = '#8a3a2a'; g.lineWidth = 2; g.beginPath(); g.arc(0, 13, 4, 0.2, Math.PI - 0.2); g.stroke();
      }
    }
    g.restore();
  }
  function manifesto(g, W, tipo) {
    const x = W / 2 - 90, y = 6, w = 180, h = 118;
    g.save();
    g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x + 5, y + 6, w, h);
    const carta = g.createLinearGradient(x, y, x + w, y + h); carta.addColorStop(0, '#f3dfb0'); carta.addColorStop(1, '#d8bd84');
    g.fillStyle = carta; g.fillRect(x, y, w, h);
    g.strokeStyle = '#7a5226'; g.lineWidth = 3; g.strokeRect(x + 4, y + 4, w - 8, h - 8);
    g.fillStyle = '#5a3818'; g.font = '800 17px Georgia, serif'; g.textAlign = 'center'; g.fillText('RICERCATO', W / 2, y + 22);
    g.fillStyle = '#f7ecd2'; g.fillRect(W / 2 - 34, y + 28, 68, 62); g.strokeStyle = '#7a5226'; g.lineWidth = 2; g.strokeRect(W / 2 - 34, y + 28, 68, 62);
    faccia(g, tipo, W / 2, y + 62, 26);
    g.fillStyle = '#5a3818'; g.font = '700 12px Georgia, serif'; g.fillText(NOMI[tipo], W / 2, y + 106);
    g.fillStyle = '#b3172f'; g.beginPath(); g.arc(x + 12, y + 12, 4, 0, Math.PI * 2); g.arc(x + w - 12, y + 12, 4, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  const tavolo = window.Arena.tavolo({
    id: 'wanted',
    mouse: 'mira',
    comandi: 'nessuno',
    obiettivo: 'punti',
    istruzioni: () => 'Guarda il manifesto e clicca (o tocca) il ricercato nella folla. Attento: un clic sbagliato ti blocca per 2 secondi!',
    // sul telefono non si mandano tocchi dove non c'è una faccia disegnata (con le facce nascoste è più giusto)
    accetta: (x, y) => visibili.some(([a, b, r]) => Math.hypot(a - x, b - y) < r),
    sottotitolo: (p) => { const s = p.stato && p.stato.s; const lv = s && s.lv ? { facile: 'Facile', normale: 'Normale', difficile: 'Difficile', esperto: 'Esperto', estremo: 'Estremo', impossibile: 'Impossibile' }[s.lv] + ' · ' : ''; return s ? lv + { griglia: 'Griglia', sparsi: 'Sparsi', righe: 'File che scorrono', rimbalzo: 'Rimbalzi', cerchi: 'Cerchi', pioggia: 'Pioggia', calca: 'Calca' }[s.sc] || '' : ''; },
    statoGioco: (ctx, s) => (s.s.bl[ctx.mio] > 0 ? `Bloccato ${s.s.bl[ctx.mio].toFixed(1)} s` : `Trova ${NOMI[s.s.ric].toLowerCase()}!`),
    hud: (ctx, s) => `<span>⏱️ ${s.s.resta} s</span><span>👥 ${s.s.nf ?? s.s.f.length} facce</span>`,
    fineRound: (p, s, ctx) => { const t = s.s.tr; return t && t.p !== null ? `${t.p === ctx.mio ? 'L\'hai trovato tu' : `L'ha trovato ${ctx.nome(t.p)}`} in ${t.t.toFixed(1)} s` : 'Nessuno l\'ha trovato'; },
    dopoTick(ctx, d, prima) {
      for (const [p, x, y] of d.s.sb || []) { croci.push({ x, y, t: performance.now(), mio: p === ctx.mio }); if (p === ctx.mio) window.Nuovi.suono([[180, 0.15]], { tipo: 'square', volume: 0.06 }); }
      if (prima && !prima.s.tr && d.s.tr && d.s.tr.p !== null) window.Nuovi.suono(d.s.tr.p === ctx.mio ? [[660, 0.08], [880, 0.08], [1320, 0.2]] : [[330, 0.12]], { volume: 0.07 });
    },
    disegna(g, p, s, prima, u, ctx) {
      const W = p.W, H = p.H, x = s.s, ora = performance.now();
      const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#141a2e'); bg.addColorStop(1, '#0a0d18');
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      if (!stelle) stelle = Array.from({ length: 60 }, (_, k) => [(k * 173) % W, (k * 71) % 125]);
      g.fillStyle = 'rgba(255,255,255,.5)'; for (const [a, b] of stelle) g.fillRect(a, b, 1.5, 1.5);
      g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(0, 130, W, H - 130);
      const pf = prima && prima.s.f && prima.s.f.length === x.f.length ? prima.s.f : null;
      const trovato = x.tr, R = x.r || 24;
      // sul telefono, con folle enormi, si disegna solo una parte delle facce (sempre le stesse, e il ricercato sempre)
      const ric = TIPI.indexOf(x.ric), passo = telefono() && x.f.length > MAX_TELEFONO ? x.f.length / MAX_TELEFONO : 1;
      visibili = [];
      x.f.forEach((f, i) => {
        if (passo > 1 && f[2] !== ric && Math.floor(i / passo) === Math.floor((i - 1) / passo)) return;
        let fx = f[0], fy = f[1];
        if (pf && Math.abs(pf[i][0] - fx) < 80 && Math.abs(pf[i][1] - fy) < 80) { fx = pf[i][0] + (fx - pf[i][0]) * u; fy = pf[i][1] + (fy - pf[i][1]) * u; }
        g.globalAlpha = trovato && trovato.i !== i ? 0.25 : 1;
        faccia(g, TIPI[f[2]], fx, fy, R, (f[3] || 0) / 10);
        visibili.push([fx, fy, R + 6]);
      });
      g.globalAlpha = 1;
      // prima del via le facce restano nascoste (il server non le manda): si vede solo il conto alla rovescia
      if (trovato && x.f[trovato.i]) {
        const f = x.f[trovato.i], a = 0.6 + 0.4 * Math.sin(s.t * 8);
        g.strokeStyle = `rgba(255,220,80,${a})`; g.lineWidth = 5; g.beginPath(); g.arc(f[0], f[1], 34, 0, Math.PI * 2); g.stroke();
        faccia(g, TIPI[f[2]], f[0], f[1], 30);
        if (trovato.p !== null) { g.fillStyle = COLORI[trovato.p % COLORI.length]; g.font = '800 16px system-ui'; g.textAlign = 'center'; g.fillText(trovato.p === ctx.mio ? 'TU!' : ctx.nome(trovato.p), f[0], f[1] - 42); }
      }
      croci = croci.filter((c) => ora - c.t < 700);
      for (const c of croci) { const a = 1 - (ora - c.t) / 700; g.strokeStyle = `rgba(255,60,60,${a})`; g.lineWidth = c.mio ? 5 : 3; g.beginPath(); g.moveTo(c.x - 12, c.y - 12); g.lineTo(c.x + 12, c.y + 12); g.moveTo(c.x + 12, c.y - 12); g.lineTo(c.x - 12, c.y + 12); g.stroke(); }
      manifesto(g, W, x.ric);
      // barra del tempo e blocco
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, H - 6, W, 6); g.fillStyle = '#f2c230'; g.fillRect(0, H - 6, W * (x.resta / 15), 6);
      if (x.bl[ctx.mio] > 0) { g.fillStyle = 'rgba(200,30,40,.18)'; g.fillRect(0, 130, W, H - 130); g.fillStyle = '#ff6b6b'; g.font = '800 26px system-ui'; g.textAlign = 'center'; g.fillText(`❌ Bloccato ${x.bl[ctx.mio].toFixed(1)} s`, W / 2, H - 24); }
    },
  });
  Object.assign(window.Tavoli, { wanted: tavolo });
})();
