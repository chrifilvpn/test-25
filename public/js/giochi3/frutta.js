// AFFETTA LA FRUTTA: tagliere di legno, frutti disegnati (con buccia, polpa e semi), le due metà che si separano
// lungo il taglio, schizzi di succo che restano un attimo sul legno, la scia della lama (la propria disegnata subito
// nel browser, quelle degli altri dai loro movimenti), bombe con la miccia accesa, combo e un piccolo segnatempo.
(() => {
  const { COLORI } = window.Arena;
  // buccia, polpa, succo
  const TINTE = {
    mela: ['#d8282f', '#fff3c4', '#f3e3a0'], arancia: ['#f28a1a', '#ffb347', '#ff9a1f'], anguria: ['#2f8f3a', '#ff4d5e', '#ff3b52'],
    banana: ['#f5d63a', '#fff6c8', '#fff0a0'], kiwi: ['#8a5a2b', '#7cc243', '#8fd44c'], ananas: ['#e0a92a', '#ffe066', '#ffe066'],
    fragola: ['#e2223b', '#ff8a9a', '#ff3d63'], limone: ['#f7e03c', '#fff59a', '#f5ec7a'], cocco: ['#6b4226', '#ffffff', '#f2f2f2'],
    stella: ['#ffd23f', '#fff7c2', '#ffe680'], bomba: ['#222', '#444', '#ff8a1f'],
  };
  let ex = null;
  let macchie = [], schizzi = [], scritte = [], lampo = 0;
  const scie = {}; // posto → [[x, y, ora]]
  let mia = []; // la mia scia, dal mouse
  let giu = false;
  const ora = () => performance.now() / 1000;
  const rnd = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const suono = (n, o) => window.Nuovi && window.Nuovi.suono && window.Nuovi.suono(n, o);

  // la mia lama: si segue il puntatore premuto sul campo (il server riceve gli stessi punti dal motore comune)
  function punto(e) {
    const t = e.target;
    if (!t || !t.classList || !t.classList.contains('ar-tela') || !document.querySelector('.panno-frutta')) return null;
    const r = t.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * ex.W, ((e.clientY - r.top) / r.height) * ex.H, ora()];
  }
  document.addEventListener('pointerdown', (e) => { if (!ex || (e.pointerType === 'mouse' && e.button !== 0)) return; const q = punto(e); if (q) { giu = true; mia = [q]; suono([[900, 0.03]], { tipo: 'triangle', volume: 0.02 }); } });
  document.addEventListener('pointermove', (e) => { if (!ex || !giu) return; const q = punto(e); if (q) { mia.push(q); if (mia.length > 40) mia.shift(); } });
  const su = () => { giu = false; };
  document.addEventListener('pointerup', su); document.addEventListener('pointercancel', su);
  document.addEventListener('contextmenu', (e) => { if (e.target && e.target.classList && e.target.classList.contains('ar-tela') && document.querySelector('.panno-frutta')) e.preventDefault(); });

  function legno(g, W, H) {
    const s = g.createLinearGradient(0, 0, 0, H); s.addColorStop(0, '#7a4a22'); s.addColorStop(1, '#5a3417');
    g.fillStyle = s; g.fillRect(0, 0, W, H);
    // le assi e le venature
    for (let k = 0; k < 6; k++) {
      const y = (k * H) / 6;
      g.fillStyle = k % 2 ? 'rgba(255,220,170,.04)' : 'rgba(0,0,0,.05)'; g.fillRect(0, y, W, H / 6);
      g.strokeStyle = 'rgba(30,14,4,.55)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
      g.strokeStyle = 'rgba(40,20,6,.18)'; g.lineWidth = 1.5;
      for (let v = 0; v < 4; v++) {
        g.beginPath();
        const yy = y + 14 + v * 22 + rnd(k * 9 + v) * 6;
        g.moveTo(0, yy);
        for (let x = 0; x <= W; x += 60) g.lineTo(x, yy + Math.sin(x / 90 + k + v) * 4);
        g.stroke();
      }
      // un nodo del legno
      const nx = rnd(k * 3 + 1) * W, ny = y + H / 12;
      g.strokeStyle = 'rgba(40,20,6,.25)'; g.beginPath(); g.ellipse(nx, ny, 26, 8, 0, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.ellipse(nx, ny, 12, 4, 0, 0, Math.PI * 2); g.stroke();
    }
  }

  // il frutto intero (o la sua metà: lato -1/1, tagliato lungo l'angolo ang) centrato in 0,0 con raggio r
  function forma(g, tipo, r) {
    const [b] = TINTE[tipo];
    g.fillStyle = b; g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2;
    g.beginPath();
    if (tipo === 'banana') { g.arc(0, -r * 0.5, r * 1.15, Math.PI * 0.15, Math.PI * 0.85); g.arc(0, -r * 1.25, r * 1.35, Math.PI * 0.75, Math.PI * 0.25, true); }
    else if (tipo === 'anguria') g.ellipse(0, 0, r * 1.1, r * 0.85, 0, 0, Math.PI * 2);
    else if (tipo === 'ananas') g.ellipse(0, r * 0.1, r * 0.72, r * 0.95, 0, 0, Math.PI * 2);
    else if (tipo === 'fragola') { g.moveTo(0, r); g.bezierCurveTo(-r * 1.2, r * 0.2, -r * 1.1, -r * 0.9, 0, -r * 0.7); g.bezierCurveTo(r * 1.1, -r * 0.9, r * 1.2, r * 0.2, 0, r); }
    else if (tipo === 'limone') g.ellipse(0, 0, r * 1.12, r * 0.82, 0, 0, Math.PI * 2);
    else if (tipo === 'stella') { for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, d = k % 2 ? r * 0.48 : r * 1.1; g.lineTo(Math.cos(a) * d, Math.sin(a) * d); } g.closePath(); }
    else g.arc(0, 0, r, 0, Math.PI * 2);
    g.fill(); g.stroke();
  }
  function dettagli(g, tipo, r) {
    if (tipo === 'mela') { g.strokeStyle = '#5a3a1a'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -r * 0.8); g.lineTo(3, -r * 1.2); g.stroke(); g.fillStyle = '#3f9b3a'; g.beginPath(); g.ellipse(10, -r * 1.05, 9, 4, -0.5, 0, Math.PI * 2); g.fill(); }
    else if (tipo === 'anguria') { g.strokeStyle = '#1d5e25'; g.lineWidth = 5; for (let k = -2; k <= 2; k++) { g.beginPath(); g.ellipse(0, 0, Math.abs(k) * r * 0.25 + 3, r * 0.82, 0, k < 0 ? Math.PI / 2 : -Math.PI / 2, k < 0 ? Math.PI * 1.5 : Math.PI / 2); g.stroke(); } }
    else if (tipo === 'arancia' || tipo === 'limone') { g.fillStyle = 'rgba(0,0,0,.12)'; for (let k = 0; k < 12; k++) { g.beginPath(); g.arc(Math.cos(k * 2.4) * r * 0.55, Math.sin(k * 1.7) * r * 0.5, 1.6, 0, Math.PI * 2); g.fill(); } }
    else if (tipo === 'ananas') {
      g.strokeStyle = 'rgba(120,70,10,.6)'; g.lineWidth = 1.5;
      for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(k * 12 - 20, -r); g.lineTo(k * 12 + 20, r); g.stroke(); g.beginPath(); g.moveTo(k * 12 + 20, -r); g.lineTo(k * 12 - 20, r); g.stroke(); }
      g.fillStyle = '#3f9b3a'; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(k * 6, -r * 0.8); g.lineTo(k * 10, -r * 1.45 + Math.abs(k) * 6); g.lineTo(k * 6 + 6, -r * 0.8); g.fill(); }
    } else if (tipo === 'fragola') {
      g.fillStyle = '#ffe680'; for (let k = 0; k < 12; k++) { g.beginPath(); g.arc((rnd(k) - 0.5) * r * 1.2, (rnd(k + 9) - 0.4) * r * 1.1, 1.5, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#3f9b3a'; g.beginPath(); for (let k = 0; k < 5; k++) { const a = Math.PI + (k * Math.PI) / 4; g.lineTo(Math.cos(a) * r * 0.6, -r * 0.7 + Math.sin(a) * r * 0.35); g.lineTo(Math.cos(a + 0.4) * r * 0.2, -r * 0.7); } g.fill();
    } else if (tipo === 'kiwi') { g.fillStyle = 'rgba(255,255,255,.12)'; for (let k = 0; k < 20; k++) { g.fillRect((rnd(k) - 0.5) * r * 1.6, (rnd(k + 3) - 0.5) * r * 1.6, 2, 1); } }
    else if (tipo === 'cocco') { g.fillStyle = '#2b190c'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(-8 + k * 8, -r * 0.4 + (k === 1 ? -4 : 0), 3, 0, Math.PI * 2); g.fill(); } }
    else if (tipo === 'banana') { g.strokeStyle = '#5a3a1a'; g.lineWidth = 3; g.beginPath(); g.moveTo(-r * 0.95, 0); g.lineTo(-r * 1.1, -4); g.stroke(); }
    // il riflesso
    if (tipo !== 'banana') { g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.ellipse(-r * 0.35, -r * 0.35, r * 0.25, r * 0.14, -0.7, 0, Math.PI * 2); g.fill(); }
  }
  function polpa(g, tipo, r) {
    const [, p] = TINTE[tipo];
    // la superficie del taglio: mezzo ellisse col colore della polpa
    g.fillStyle = p; g.beginPath(); g.ellipse(0, 0, r * 0.95, r * 0.3, 0, 0, Math.PI * 2); g.fill();
    if (tipo === 'kiwi' || tipo === 'anguria') { g.fillStyle = tipo === 'kiwi' ? '#1a1a1a' : '#2b1a10'; for (let k = 0; k < 8; k++) { g.beginPath(); g.ellipse((k - 3.5) * r * 0.2, (k % 2 ? 1 : -1) * r * 0.12, 2, 3, 0, 0, Math.PI * 2); g.fill(); } }
    if (tipo === 'kiwi') { g.fillStyle = '#f2f7d0'; g.beginPath(); g.ellipse(0, r * 0.03, r * 0.25, r * 0.07, 0, 0, Math.PI * 2); g.fill(); }
  }
  function bomba(g, r, t) {
    g.fillStyle = '#1d1d22'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.ellipse(-r * 0.35, -r * 0.35, r * 0.28, r * 0.15, -0.7, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#555'; g.fillRect(-7, -r - 6, 14, 9);
    g.strokeStyle = '#c9a16a'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -r - 6); g.quadraticCurveTo(10, -r - 18, 4, -r - 26); g.stroke();
    // la scintilla della miccia
    const s = 5 + Math.sin(t * 30) * 2;
    g.fillStyle = '#ffdd55'; g.beginPath(); g.arc(4, -r - 27, s, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ff6a1a'; g.beginPath(); g.arc(4, -r - 27, s * 0.5, 0, Math.PI * 2); g.fill();
    // la X rossa
    g.strokeStyle = '#e8453c'; g.lineWidth = 4; g.beginPath(); g.moveTo(-r * 0.35, -r * 0.35); g.lineTo(r * 0.35, r * 0.35); g.moveTo(r * 0.35, -r * 0.35); g.lineTo(-r * 0.35, r * 0.35); g.stroke();
  }
  function frutto(g, f, t) {
    const [, tipo, x, y, rot, chi, tt, ang] = f, nome = ex.frutti[tipo][0], r = ex.frutti[tipo][1];
    if (nome === 'bomba') { if (chi >= 0) return; g.save(); g.translate(x, y); g.rotate(rot * 0.3); bomba(g, r, t); g.restore(); return; }
    if (chi < 0) {
      g.save(); g.translate(x, y); g.rotate(rot);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(6, 10, r, r * 0.9, 0, 0, Math.PI * 2); g.fill();
      forma(g, nome, r); dettagli(g, nome, r); g.restore();
      return;
    }
    // tagliato: due metà che si allontanano lungo il taglio e ruotano
    const sep = 10 + tt * 70;
    for (const lato of [-1, 1]) {
      g.save();
      g.translate(x + Math.cos(ang + Math.PI / 2) * sep * lato, y + Math.sin(ang + Math.PI / 2) * sep * lato);
      g.rotate(ang + lato * tt * 2.2);
      g.beginPath(); g.rect(-r * 2, lato < 0 ? -r * 2 : 0, r * 4, r * 2); g.clip();
      g.save(); g.rotate(rot - ang); forma(g, nome, r); dettagli(g, nome, r); g.restore();
      polpa(g, nome, r);
      g.restore();
    }
  }

  function scia(g, punti, adesso, colore, durata = 0.16) {
    const p = punti.filter((q) => adesso - q[2] < durata);
    if (p.length < 2) return;
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let k = 1; k < p.length; k++) {
      const v = 1 - (adesso - p[k][2]) / durata;
      g.strokeStyle = colore; g.globalAlpha = Math.max(0, v) * 0.55; g.lineWidth = 3 + v * 12;
      g.beginPath(); g.moveTo(p[k - 1][0], p[k - 1][1]); g.lineTo(p[k][0], p[k][1]); g.stroke();
      g.strokeStyle = '#fff'; g.globalAlpha = Math.max(0, v); g.lineWidth = 1 + v * 5;
      g.beginPath(); g.moveTo(p[k - 1][0], p[k - 1][1]); g.lineTo(p[k][0], p[k][1]); g.stroke();
    }
    g.globalAlpha = 1;
  }

  const tavolo = window.Arena.tavolo({
    id: 'frutta',
    mouse: 'traccia',
    comandi: 'nessuno',
    obiettivo: 'punti',
    istruzioni: () => 'Tieni premuto il tasto sinistro del mouse (sul telefono il dito) e trascina sopra i frutti per tagliarli. Tre o più in un colpo solo = combo. Non tagliare le bombe!',
    statoGioco: (ctx, s) => (s.s.l[ctx.mio] && s.s.l[ctx.mio][3] ? 'Stordito! 💫' : 'Taglia! 🔪'),
    hud: (ctx, s) => `<span>🍉 ${s.s.pt[ctx.mio] || 0} punti</span><span>⏱️ ${s.s.tr} s</span>${s.s.w.includes(ctx.mio) ? '<span>✨ lama d\'oro</span>' : ''}`,
    fineRound: (p, s, ctx) => `Hai fatto ${p.punti[ctx.mio]} punti`,
    dopoTick(ctx, d) {
      ex = ctx.partita.extra || ex;
      const adesso = ora();
      for (const e of d.s.e || []) {
        if (e[0] === 'c') {
          const [, , p, x, y, tipo] = e, nome = ex.frutti[tipo][0], [, , succo] = TINTE[nome];
          macchie.push({ x, y, c: succo, r: 18 + Math.random() * 16, t: adesso, s: Math.random() * 99 });
          for (let k = 0; k < 10; k++) { const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 220; schizzi.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, c: succo, t: adesso }); }
          if (p === ctx.mio) suono([[300 + Math.random() * 200, 0.04], [160, 0.06]], { tipo: 'sawtooth', volume: 0.035 });
          if (nome === 'stella') scritte.push({ x, y, txt: '+5 ⭐', c: '#ffe066', t: adesso });
        } else if (e[0] === 'b') {
          const [, x, y, p] = e;
          lampo = adesso;
          for (let k = 0; k < 24; k++) { const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 380; schizzi.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: k % 2 ? '#ffb02e' : '#555', t: adesso }); }
          scritte.push({ x, y, txt: '−10 💣', c: '#ff6a5a', t: adesso });
          suono([[90, 0.08], [60, 0.4]], { tipo: 'sawtooth', volume: p === ctx.mio ? 0.12 : 0.05 });
        } else if (e[0] === 'k') {
          const [, p, n, x, y] = e;
          scritte.push({ x, y: y - 30, txt: `Combo ×${n}! +${n}`, c: COLORI[p % COLORI.length], t: adesso, grande: true });
          if (p === ctx.mio) suono([[523, 0.07], [659, 0.07], [784, 0.07], [1046, 0.15]], { volume: 0.06 });
        } else if (e[0] === 'l') suono([[180, 0.05], [260, 0.08]], { tipo: 'triangle', volume: 0.02 });
      }
      // le scie degli altri dai loro movimenti
      (d.s.l || []).forEach(([x, y, a], p) => {
        if (p === ctx.mio) return;
        const s = scie[p] || (scie[p] = []);
        if (a) s.push([x, y, adesso]); else s.length = 0;
        if (s.length > 12) s.shift();
      });
      if (macchie.length > 40) macchie = macchie.slice(-40);
    },
    disegna(g, p, s, prima, u, ctx) {
      ex = p.extra || ex;
      const W = p.W, H = p.H, adesso = ora();
      if (!ex) return;
      legno(g, W, H);
      // le macchie di succo sul legno (svaniscono piano)
      macchie = macchie.filter((m) => adesso - m.t < 4);
      for (const m of macchie) {
        g.globalAlpha = 0.55 * (1 - (adesso - m.t) / 4); g.fillStyle = m.c;
        g.beginPath(); for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6, d = m.r * (0.7 + rnd(m.s + k) * 0.6); g.lineTo(m.x + Math.cos(a) * d, m.y + Math.sin(a) * d); } g.fill();
      }
      g.globalAlpha = 1;
      // i frutti (interpolati tra un tick e l'altro)
      const pr = new Map(prima ? prima.s.f.map((f) => [f[0], f]) : []);
      for (const f of s.s.f) {
        const a = pr.get(f[0]);
        const q = a ? [f[0], f[1], a[2] + (f[2] - a[2]) * u, a[3] + (f[3] - a[3]) * u, a[4] + (f[4] - a[4]) * u, f[5], a[6] + (f[6] - a[6]) * u, f[7]] : f;
        frutto(g, q, adesso);
      }
      // schizzi di succo in volo
      schizzi = schizzi.filter((z) => adesso - z.t < 0.6);
      for (const z of schizzi) {
        const tt = adesso - z.t;
        g.globalAlpha = 1 - tt / 0.6; g.fillStyle = z.c;
        g.beginPath(); g.arc(z.x + z.vx * tt, z.y + z.vy * tt + 400 * tt * tt, 4, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
      // le lame
      for (const [k, sc] of Object.entries(scie)) scia(g, sc, adesso, COLORI[k % COLORI.length], 0.25);
      if (s.s.l[ctx.mio] && s.s.l[ctx.mio][3]) mia = [];
      scia(g, mia, adesso, s.s.w.includes(ctx.mio) ? '#ffd23f' : COLORI[ctx.mio % COLORI.length]);
      // lo stordimento: stelline attorno alla mia lama
      s.s.l.forEach(([x, y, , st], k) => {
        if (!st) return;
        for (let j = 0; j < 4; j++) { const a = adesso * 5 + (j * Math.PI) / 2; g.fillStyle = '#ffe066'; g.font = '16px system-ui'; g.textAlign = 'center'; g.fillText('✦', x + Math.cos(a) * 22, y + Math.sin(a) * 10 - 20); }
        if (k !== ctx.mio) { g.fillStyle = COLORI[k % COLORI.length]; g.font = '700 12px system-ui'; g.fillText(ctx.nome(k).slice(0, 10), x, y + 24); }
      });
      // scritte (combo, stella, bomba)
      scritte = scritte.filter((w) => adesso - w.t < 1.1);
      g.textAlign = 'center';
      for (const w of scritte) {
        const tt = adesso - w.t;
        g.globalAlpha = Math.min(1, (1.1 - tt) * 3); g.font = `900 ${w.grande ? 30 : 22}px system-ui`;
        g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,.6)'; g.strokeText(w.txt, w.x, w.y - tt * 40); g.fillStyle = w.c; g.fillText(w.txt, w.x, w.y - tt * 40);
      }
      g.globalAlpha = 1;
      // il lampo della bomba
      if (adesso - lampo < 0.35) { g.fillStyle = `rgba(255,240,210,${0.6 * (1 - (adesso - lampo) / 0.35)})`; g.fillRect(0, 0, W, H); }
      // il segnatempo in alto
      const resta = s.s.tr, frac = Math.max(0, Math.min(1, resta / ex.durata));
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(W / 2 - 150, 10, 300, 14);
      g.fillStyle = resta <= 10 ? '#ff6a5a' : '#ffd23f'; g.fillRect(W / 2 - 148, 12, 296 * frac, 10);
      // i punti di tutti in alto a sinistra
      g.textAlign = 'left'; g.font = '800 20px system-ui';
      s.s.pt.forEach((v, k) => { g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.6)'; const txt = `${k === ctx.mio ? 'Tu' : ctx.nome(k).slice(0, 10)}: ${v}`; g.strokeText(txt, 14, 34 + k * 26); g.fillStyle = COLORI[k % COLORI.length]; g.fillText(txt, 14, 34 + k * 26); });
    },
  });
  Object.assign(window.Tavoli, { frutta: tavolo });
})();
