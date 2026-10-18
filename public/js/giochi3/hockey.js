// HOCKEY SU GHIACCIO: la pista vista dall'alto (ghiaccio, balaustre arrotondate, linee rosse e blu, cerchi
// d'ingaggio, aree del portiere), le porte con la rete, i pattinatori con la maglia della squadra e il bastone che
// guarda dove vanno, i portieri con i gambali. Gol: la lampada rossa dietro la porta si accende.
(() => {
  const { suono } = window.Nuovi;
  const SQ = ['#d63b3b', '#2f6fd6'], SQ_SCURO = ['#7c1d1d', '#163c7a'], NOMI = ['Rossi', 'Blu'];
  let effetti = [], gol = null, ultimoGol = null;
  const touch = () => window.Arena.touch();

  function pista(g, ex) {
    const { W, H, RAGGIO_ANGOLO: R, LINEA_PORTA: LP, BOCCA, PROF_PORTA: PP } = ex;
    const bordo = new Path2D();
    bordo.roundRect(0, 0, W, H, R);
    g.fillStyle = '#16304a'; g.fillRect(-40, -40, W + 80, H + 80);
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#f4f9fc'); gr.addColorStop(1, '#e3eef5');
    g.fillStyle = gr; g.fill(bordo);
    g.save(); g.clip(bordo);
    // riflessi sul ghiaccio
    g.globalAlpha = 0.35; g.strokeStyle = '#ffffff'; g.lineWidth = 18;
    for (let k = -2; k < 8; k++) { g.beginPath(); g.moveTo(k * 180, 0); g.lineTo(k * 180 + 260, H); g.stroke(); }
    g.globalAlpha = 1;
    // linee: porta (rosse sottili), blu, centrale rossa
    g.fillStyle = '#d64545'; g.fillRect(LP - 2, 0, 4, H); g.fillRect(W - LP - 2, 0, 4, H);
    g.fillStyle = '#2f6fd6'; g.fillRect(W / 2 - 185, 0, 10, H); g.fillRect(W / 2 + 175, 0, 10, H);
    g.fillStyle = '#d64545'; g.fillRect(W / 2 - 4, 0, 8, H);
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.setLineDash([8, 8]); g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke(); g.setLineDash([]);
    // cerchio centrale e cerchi d'ingaggio
    g.strokeStyle = '#2f6fd6'; g.lineWidth = 3; g.beginPath(); g.arc(W / 2, H / 2, 70, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#2f6fd6'; g.beginPath(); g.arc(W / 2, H / 2, 5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#d64545';
    for (const x of [LP + 150, W - LP - 150]) for (const y of [H / 2 - 150, H / 2 + 150]) {
      g.beginPath(); g.arc(x, y, 58, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#d64545'; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
    }
    // aree del portiere
    for (const [gx, av] of [[LP, 1], [W - LP, -1]]) {
      g.fillStyle = 'rgba(80,160,230,.28)'; g.strokeStyle = '#d64545'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(gx, H / 2 - 62); g.arc(gx, H / 2, 62, -Math.PI / 2, Math.PI / 2, av < 0); g.closePath(); g.fill(); g.stroke();
    }
    g.restore();
    // balaustra
    g.lineWidth = 10; g.strokeStyle = '#f2c94c'; g.stroke(bordo);
    g.lineWidth = 3; g.strokeStyle = '#22394f'; g.stroke(bordo);
    // porte: gabbia rossa con la rete
    for (const [x0, av] of [[LP - PP, 1], [W - LP, -1]]) {
      g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(x0, H / 2 - BOCCA, PP, BOCCA * 2);
      g.strokeStyle = 'rgba(120,130,140,.6)'; g.lineWidth = 1;
      for (let y = H / 2 - BOCCA + 8; y < H / 2 + BOCCA; y += 8) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + PP, y); g.stroke(); }
      for (let x = x0 + 7; x < x0 + PP; x += 7) { g.beginPath(); g.moveTo(x, H / 2 - BOCCA); g.lineTo(x, H / 2 + BOCCA); g.stroke(); }
      g.strokeStyle = '#c92a2a'; g.lineWidth = 5; g.beginPath();
      const fronte = av > 0 ? x0 + PP : x0, retro = av > 0 ? x0 : x0 + PP;
      g.moveTo(fronte, H / 2 - BOCCA); g.lineTo(retro, H / 2 - BOCCA); g.lineTo(retro, H / 2 + BOCCA); g.lineTo(fronte, H / 2 + BOCCA); g.stroke();
    }
  }
  function pattinatore(g, x, y, a, R, sq, nome, io, v) {
    // scie dei pattini
    if (v > 120) { g.strokeStyle = 'rgba(160,190,215,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - Math.cos(a) * R * 1.2, y - Math.sin(a) * R * 1.2); g.lineTo(x - Math.cos(a) * R * 2.6, y - Math.sin(a) * R * 2.6); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x + 3, y + 4, R, R * 0.8, 0, 0, Math.PI * 2); g.fill();
    // bastone: dal fianco fino alla lama, che guarda avanti
    const bx = x + Math.cos(a + 0.5) * R * 0.6, by = y + Math.sin(a + 0.5) * R * 0.6;
    const lx = x + Math.cos(a) * (R + 9), ly = y + Math.sin(a) * (R + 9);
    g.strokeStyle = '#6b4a2a'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(bx, by); g.lineTo(lx, ly); g.stroke();
    g.strokeStyle = '#1d1d1d'; g.lineWidth = 5; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + Math.cos(a - 1.3) * 9, ly + Math.sin(a - 1.3) * 9); g.stroke();
    g.lineCap = 'butt';
    // spalle con la maglia, casco
    g.fillStyle = SQ[sq]; g.beginPath(); g.ellipse(x, y, R, R * 0.92, a + Math.PI / 2, 0, Math.PI * 2); g.fill();
    g.strokeStyle = io ? '#fff' : SQ_SCURO[sq]; g.lineWidth = io ? 3 : 2; g.stroke();
    g.fillStyle = '#fff'; g.fillRect(x - R * 0.7 * Math.sin(a) - 1.5, y + R * 0.7 * Math.cos(a) - 1.5, 3, 3);
    g.fillStyle = SQ_SCURO[sq]; g.beginPath(); g.arc(x + Math.cos(a) * 2, y + Math.sin(a) * 2, R * 0.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(x + Math.cos(a) * 2 - 2, y + Math.sin(a) * 2 - 2, R * 0.18, 0, Math.PI * 2); g.fill();
    if (nome) { g.font = '700 12px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.9)'; g.strokeText(nome, x, y - R - 7); g.fillStyle = io ? '#111' : SQ_SCURO[sq]; g.fillText(nome, x, y - R - 7); }
  }
  function portiere(g, x, y, R, sq, av, tiene) {
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x + 3, y + 4, R * 1.1, R * 0.8, 0, 0, Math.PI * 2); g.fill();
    // gambali larghi verso il tiro, poi il corpo e la maschera
    g.fillStyle = '#f5f5f5'; g.strokeStyle = SQ_SCURO[sq]; g.lineWidth = 2;
    for (const s of [-1, 1]) { g.beginPath(); g.roundRect(x + av * R * 0.2 - 5, y + s * R * 0.55 - 8, 10, 16, 3); g.fill(); g.stroke(); }
    g.fillStyle = SQ[sq]; g.beginPath(); g.arc(x, y, R * 0.78, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#e9e9e9'; g.beginPath(); g.arc(x + av * 2, y, R * 0.42, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#555'; g.lineWidth = 1; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x + av * 2 - 5, y + k * 3); g.lineTo(x + av * 2 + 5, y + k * 3); g.stroke(); }
    if (tiene) { g.strokeStyle = '#ffd166'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, R + 4, 0, Math.PI * 2); g.stroke(); }
  }

  const tavolo = window.Arena.tavolo({
    id: 'hockey',
    nomeAzione: '🏒',
    obiettivo: 'gol',
    istruzioni: () => (touch() ? 'Joystick per pattinare, 🏒 per tirare (guardando la porta), passare (guardando il compagno) o rubare il disco.' : 'WASD o frecce per pattinare, spazio per tirare (guardando la porta), passare (guardando il compagno) o rubare il disco.'),
    ruolo: (p, s, ctx) => `sei nei ${NOMI[ctx.mio % 2]}: attacchi verso ${ctx.mio % 2 ? 'sinistra ⬅️' : 'destra ➡️'}`,
    sottotitolo: (p, ctx) => `${NOMI[ctx.mio % 2]} · attacchi verso ${ctx.mio % 2 ? 'sinistra' : 'destra'}`,
    statoGioco: (ctx, s) => {
      if (!s.s) return '';
      if (s.s.pg) return 'Gol! 🚨';
      if (s.s.d[2] === ctx.mio) return 'Hai il disco: tira o passa!';
      return s.s.ot ? 'Supplementari: chi segna vince!' : 'Prendi il disco!';
    },
    hud: (ctx, s) => {
      if (!s.s) return '';
      const st = s.s, m = Math.floor(st.tr / 60), sec = String(st.tr % 60).padStart(2, '0');
      return `<span style="color:${SQ[0]}">● Rossi <b>${st.g[0]}</b></span><span>–</span><span style="color:${SQ[1]}"><b>${st.g[1]}</b> Blu ●</span><span>⏱ ${m}:${sec}${st.ot ? ' · supplementari' : ''}</span>`;
    },
    fineRound: (p, s, ctx) => (s.s ? `Rossi ${s.s.g[0]} – ${s.s.g[1]} Blu` : ''),
    dopoTick(ctx, d, prima) {
      if (!d.s) return;
      for (const e of d.s.e || []) {
        if (e[0] === 'g') { gol = { sq: e[1], t: performance.now() }; suono([[880, 0.15], [660, 0.15], [880, 0.15], [660, 0.3]], { tipo: 'square', volume: 0.06 }); }
        else if (e[0] === 'u') { effetti.push({ tipo: 'u', x: e[1], y: e[2], t: performance.now() }); suono([[90, 0.08]], { tipo: 'square', volume: 0.05 }); }
        else if (e[0] === 't') suono([[1400, 0.04], [700, 0.05]], { tipo: 'triangle', volume: 0.05 });
        else if (e[0] === 'p') { effetti.push({ tipo: 'p', x: e[1], y: e[2], t: performance.now() }); suono([[300, 0.06]], { tipo: 'sine', volume: 0.05 }); }
      }
      if (prima && prima.s && prima.s.d[2] !== d.s.d[2] && d.s.d[2] === ctx.mio) suono([[520, 0.04]], { tipo: 'triangle', volume: 0.04 });
      ultimoGol = d.s.ug;
    },
    disegna(g, p, s, prima, u, ctx) {
      const ex = p.extra; if (!ex || !s.s) return;
      pista(g, ex);
      const st = s.s, pr = prima && prima.s ? prima.s : null, ora = performance.now();
      const lerp = (a, b) => (pr ? a + (b - a) * u : b);
      // lampada del gol dietro la porta
      if (st.pg && ultimoGol !== null) {
        const gx = ultimoGol === 0 ? ex.W - ex.LINEA_PORTA + ex.PROF_PORTA + 14 : ex.LINEA_PORTA - ex.PROF_PORTA - 14;
        const k = 0.5 + 0.5 * Math.sin(ora / 90);
        const rg = g.createRadialGradient(gx, ex.H / 2, 2, gx, ex.H / 2, 90); rg.addColorStop(0, `rgba(255,40,40,${0.7 * k})`); rg.addColorStop(1, 'rgba(255,40,40,0)');
        g.fillStyle = rg; g.beginPath(); g.arc(gx, ex.H / 2, 90, 0, Math.PI * 2); g.fill();
      }
      // portieri
      st.q.forEach((q, i) => { const a = pr ? pr.q[i] : q; portiere(g, lerp(a[0], q[0]), lerp(a[1], q[1]), ex.R_PORTIERE, i, i === 0 ? 1 : -1, q[2]); });
      // disco (sotto i giocatori se lo porta qualcuno)
      const dsc = st.d, dp = pr ? pr.d : dsc;
      const dx = Math.abs(dp[0] - dsc[0]) < 120 ? lerp(dp[0], dsc[0]) : dsc[0], dy = Math.abs(dp[1] - dsc[1]) < 120 ? lerp(dp[1], dsc[1]) : dsc[1];
      const disco = () => { g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(dx + 2, dy + 2, ex.R_DISCO, ex.R_DISCO * 0.8, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(dx, dy, ex.R_DISCO, 0, Math.PI * 2); g.fill(); g.fillStyle = '#555'; g.beginPath(); g.arc(dx - 1.5, dy - 1.5, ex.R_DISCO * 0.4, 0, Math.PI * 2); g.fill(); };
      disco();
      // pattinatori
      st.p.forEach((q, k) => {
        const a = pr ? pr.p[k] : q;
        const salto = Math.hypot(a[0] - q[0], a[1] - q[1]) > 80;
        const x = salto ? q[0] : lerp(a[0], q[0]), y = salto ? q[1] : lerp(a[1], q[1]);
        let an = q[2]; if (!salto && pr) { let d = q[2] - a[2]; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; an = a[2] + d * u; }
        const nome = k < p.n ? (k === ctx.mio ? 'Tu' : ctx.nome(k).slice(0, 9)) : 'PC';
        pattinatore(g, x, y, an, ex.R_GIOC, k % 2, nome, k === ctx.mio, q[3]);
      });
      if (dsc[2] >= 0) disco(); // il disco portato si vede sopra la lama
      // effetti: spintoni e parate
      effetti = effetti.filter((e) => ora - e.t < 700);
      for (const e of effetti) {
        const k = (ora - e.t) / 700;
        g.save(); g.globalAlpha = 1 - k; g.textAlign = 'center'; g.textBaseline = 'middle';
        if (e.tipo === 'u') { g.font = `${Math.round(22 + k * 10)}px system-ui`; g.fillText('💥', e.x, e.y - k * 20); }
        else { g.font = '800 18px system-ui, sans-serif'; g.lineWidth = 4; g.strokeStyle = '#fff'; g.strokeText('PARATA!', e.x, e.y - 30 - k * 25); g.fillStyle = '#16304a'; g.fillText('PARATA!', e.x, e.y - 30 - k * 25); }
        g.restore();
      }
      if (gol && ora - gol.t < 2400) {
        const k = Math.min(1, (ora - gol.t) / 300);
        g.save(); g.globalAlpha = Math.min(1, (2400 - (ora - gol.t)) / 400); g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = `400 ${Math.round(60 + k * 30)}px "Young Serif", Georgia, serif`; g.lineWidth = 8; g.strokeStyle = '#fff'; g.strokeText('GOL!', ex.W / 2, ex.H / 2 - 40); g.fillStyle = SQ[gol.sq]; g.fillText('GOL!', ex.W / 2, ex.H / 2 - 40);
        g.restore();
      }
    },
  });
  Object.assign(window.Tavoli, { hockey: tavolo });
})();
