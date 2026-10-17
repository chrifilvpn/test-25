// CARRI ARMATI NEL LABIRINTO: pavimento a piastrelle e muri di cemento (disegnati una volta per labirinto in un canvas
// a parte), carri con i cingoli, lo scafo del colore del giocatore e la torretta che gira; proiettili scuri con
// l'alone, vampate allo sparo, esplosioni con le schegge, rottami dei carri saltati, casse di legno con l'icona.
(() => {
  const { COLORI } = window.Arena;
  const { suono, esc } = window.Nuovi;
  const ICONE = ['🔱', '🛡️', '🚀'];
  let visto = 0, sfondo = null, chiaveSfondo = '', fx = [], rottami = new Map(), roundFx = -1;

  // il labirinto dal codice del server (un bit per muro interno, in esadecimale)
  function muriDa(codice, C, Rr) {
    const bit = [];
    for (const ch of codice) { const v = parseInt(ch, 16); bit.push((v >> 3) & 1, (v >> 2) & 1, (v >> 1) & 1, v & 1); }
    const h = Array.from({ length: Rr + 1 }, (_, r) => new Array(C).fill(r === 0 || r === Rr ? 1 : 0));
    const v = Array.from({ length: Rr }, () => new Array(C + 1).fill(0));
    for (let r = 0; r < Rr; r++) { v[r][0] = 1; v[r][C] = 1; }
    let k = 0;
    for (let r = 1; r < Rr; r++) for (let c = 0; c < C; c++) h[r][c] = bit[k++];
    for (let r = 0; r < Rr; r++) for (let c = 1; c < C; c++) v[r][c] = bit[k++];
    return { h, v };
  }
  function preparaSfondo(ex, codice, W, H) {
    const { C, Rr, S, SPESSORE } = ex, k = Math.min(2, window.devicePixelRatio || 1);
    const c = document.createElement('canvas'); c.width = W * k; c.height = H * k;
    const g = c.getContext('2d'); g.scale(k, k);
    // pavimento: piastrelle chiare con una leggera variazione
    g.fillStyle = '#d9d2c3'; g.fillRect(0, 0, W, H);
    for (let r = 0; r < Rr * 2; r++) for (let q = 0; q < C * 2; q++) {
      g.fillStyle = (r + q) % 2 ? 'rgba(120,105,80,.07)' : 'rgba(255,255,255,.08)';
      g.fillRect(q * S / 2, r * S / 2, S / 2, S / 2);
    }
    g.strokeStyle = 'rgba(110,95,70,.12)'; g.lineWidth = 1;
    for (let x = 0; x <= W; x += S / 2) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y <= H; y += S / 2) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    // muri: ombra, poi il cemento con il bordo chiaro
    const L = muriDa(codice, C, Rr), t = SPESSORE / 2, rett = [];
    for (let r = 0; r <= Rr; r++) for (let q = 0; q < C; q++) if (L.h[r][q]) rett.push([q * S - t, r * S - t, S + 2 * t, 2 * t]);
    for (let r = 0; r < Rr; r++) for (let q = 0; q <= C; q++) if (L.v[r][q]) rett.push([q * S - t, r * S - t, 2 * t, S + 2 * t]);
    g.fillStyle = 'rgba(40,30,20,.28)'; for (const [x, y, w, h] of rett) g.fillRect(x + 3, y + 4, w, h);
    g.fillStyle = '#4a5260'; for (const [x, y, w, h] of rett) g.fillRect(x, y, w, h);
    g.fillStyle = '#6b7484'; for (const [x, y, w, h] of rett) g.fillRect(x, y, w, Math.min(h, 3));
    return c;
  }

  function carro(g, x, y, a, tA, col, io, cc) {
    g.save(); g.translate(x, y);
    // ombra
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(3, 4, 19, 15, a, 0, Math.PI * 2); g.fill();
    g.save(); g.rotate(a);
    // cingoli
    g.fillStyle = '#2a2d33'; g.fillRect(-17, -15, 34, 7); g.fillRect(-17, 8, 34, 7);
    g.fillStyle = '#4b5059'; for (let k = -15; k < 17; k += 5) { g.fillRect(k, -15, 2, 7); g.fillRect(k, 8, 2, 7); }
    // scafo
    g.fillStyle = col; g.fillRect(-14, -10, 28, 20);
    g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(-14, -10, 28, 4);
    g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-14, 6, 28, 4);
    g.restore();
    // torretta e canna
    g.save(); g.rotate(tA);
    g.fillStyle = '#30343b'; g.fillRect(4, -3, 18, 6);
    g.fillStyle = '#5a606a'; g.fillRect(18, -3.5, 5, 7);
    g.fillStyle = col; g.beginPath(); g.arc(0, 0, 8.5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = io ? '#fff' : 'rgba(0,0,0,.45)'; g.lineWidth = io ? 2.5 : 1.5; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.arc(-2.5, -2.5, 3, 0, Math.PI * 2); g.fill();
    g.restore();
    // scudo, turbo, colpo triplo
    if (cc[5]) { g.strokeStyle = 'rgba(90,170,255,.85)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 24 + Math.sin(performance.now() / 120) * 1.5, 0, Math.PI * 2); g.stroke(); g.fillStyle = 'rgba(90,170,255,.12)'; g.fill(); }
    if (cc[7]) { g.save(); g.rotate(a); g.fillStyle = `rgba(255,${140 + Math.random() * 80},40,.85)`; g.beginPath(); g.moveTo(-17, -6); g.lineTo(-27 - Math.random() * 6, 0); g.lineTo(-17, 6); g.fill(); g.restore(); }
    if (cc[6] > 0) { g.fillStyle = '#ffd23f'; for (let k = 0; k < cc[6]; k++) { g.beginPath(); g.arc(-9 + k * 6, -24, 2.4, 0, Math.PI * 2); g.fill(); } }
    g.restore();
  }
  function rottame(g, x, y, a) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(0, 0, 22, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2b2b2b'; g.fillRect(-15, -12, 30, 24);
    g.fillStyle = '#444'; g.fillRect(-10, -8, 14, 9); g.fillRect(4, 2, 8, 6);
    g.restore();
  }
  function cassa(g, x, y, tipo) {
    const b = Math.sin(performance.now() / 300) * 1.5;
    g.save(); g.translate(x, y + b);
    g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-12, -9, 26, 24);
    g.fillStyle = '#b07a3c'; g.fillRect(-13, -13, 26, 26);
    g.strokeStyle = '#7a4f22'; g.lineWidth = 2; g.strokeRect(-12, -12, 24, 24);
    g.beginPath(); g.moveTo(-12, -12); g.lineTo(12, 12); g.stroke();
    g.font = '16px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ICONE[tipo] || '?', 0, 1);
    g.restore();
  }

  const lerpA = (a, b, u) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * u; };

  const tavolo = window.Arena.tavolo({
    id: 'carri',
    mouse: 'mira',
    comandi: 'movimento',
    nomeAzione: '💥 Fuoco',
    obiettivo: 'punti',
    istruzioni: () => (window.Arena.touch()
      ? 'Joystick per muoverti; tocca il campo per sparare in quel punto (o 💥 Fuoco per sparare dove guardi). I colpi rimbalzano: attento a non colpirti!'
      : 'Frecce o WASD per muovere il carro, il mouse per mirare, clic o spazio per sparare. I colpi rimbalzano sui muri: attento a non colpirti!'),
    sottotitolo: (p) => (p.extra ? `labirinto ${p.extra.C}×${p.extra.Rr}` : ''),
    statoGioco: (ctx, s) => {
      const io = s.s && s.s.c && s.s.c[ctx.mio];
      if (io && !io[4]) return 'Sei saltato: guarda gli altri';
      const vivi = s.s && s.s.c ? s.s.c.filter((x) => x[4]).length : 0;
      return vivi <= 1 ? 'Ultimi istanti…' : `In gara: ${vivi}`;
    },
    hud: (ctx, s) => {
      const io = s.s && s.s.c && s.s.c[ctx.mio];
      if (!io) return '';
      const cose = [];
      if (!io[4]) cose.push('<span>💥 sei fuori</span>');
      if (io[5]) cose.push('<span>🛡️ scudo</span>');
      if (io[6] > 0) cose.push(`<span>🔱 triplo ×${io[6]}</span>`);
      if (io[7]) cose.push('<span>🚀 turbo</span>');
      const vivi = s.s.c.filter((x) => x[4]).length;
      return `<span>🛡 carri in gara: ${vivi} di ${s.s.c.length}</span>${cose.join('')}`;
    },
    fineRound: (p, s, ctx) => `Punti: ${p.punti[ctx.mio]}`,
    ruolo: (p, s, ctx) => `il tuo carro è ${['rosso', 'blu', 'verde', 'giallo', 'viola', 'rosa', 'azzurro', 'arancione'][ctx.mio % 8]}`,
    dopoTick(ctx, d) {
      if (!d.s) return;
      for (const [num, tipo, x, y] of d.s.b || []) {
        if (num <= visto) continue;
        visto = num;
        const ora = performance.now();
        if (tipo === 0) { fx.push({ t: ora, x, y, tipo }); suono([[180, 0.04]], { tipo: 'square', volume: 0.025 }); }
        else if (tipo === 1) {
          for (let k = 0; k < 18; k++) { const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 160; fx.push({ t: ora, x, y, tipo: 3, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 2 + Math.random() * 3 }); }
          fx.push({ t: ora, x, y, tipo });
          suono([[90, 0.18], [60, 0.25]], { tipo: 'sawtooth', volume: 0.08 });
        } else { fx.push({ t: ora, x, y, tipo }); suono([[900, 0.05], [1200, 0.06]], { volume: 0.04 }); }
      }
    },
    disegna(g, p, s, prima, u, ctx) {
      const ex = p.extra; if (!ex || !s.s || !s.s.c) return;
      const W = p.W, H = p.H, st = s.s;
      if (s.round !== roundFx) { roundFx = s.round; rottami = new Map(); fx = []; }
      const chiave = `${st.L}|${W}`;
      if (chiave !== chiaveSfondo) { sfondo = preparaSfondo(ex, st.L, W, H); chiaveSfondo = chiave; }
      g.drawImage(sfondo, 0, 0, W, H);
      const p0 = prima && prima.s && prima.s.c && prima.round === s.round ? prima.s : null;
      // rottami (sotto tutto)
      st.c.forEach((c, i) => { if (!c[4] && !rottami.has(i)) rottami.set(i, [c[0], c[1], c[2]]); });
      for (const [, r] of rottami) rottame(g, r[0], r[1], r[2]);
      // casse
      for (const q of st.q || []) cassa(g, q[1], q[2], q[3]);
      // carri (interpolati)
      st.c.forEach((c, i) => {
        if (!c[4]) return;
        const a = p0 && p0.c[i] && p0.c[i][4] ? p0.c[i] : c;
        const x = a[0] + (c[0] - a[0]) * u, y = a[1] + (c[1] - a[1]) * u;
        carro(g, x, y, lerpA(a[2], c[2], u), lerpA(a[3], c[3], u), COLORI[i % COLORI.length], i === ctx.mio, c);
        g.font = '600 12px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
        const nome = i === ctx.mio ? 'Tu' : ctx.nome(i);
        g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3; g.strokeText(nome, x, y - 28); g.fillStyle = '#222'; g.fillText(nome, x, y - 28);
      });
      // proiettili (interpolati per id; dopo un rimbalzo il punto vecchio è lontano e si salta)
      const pp = new Map(p0 && p0.p ? p0.p.map((b) => [b[0], b]) : []);
      for (const b of st.p) {
        const a = pp.get(b[0]);
        const x = a && Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 40 ? a[1] + (b[1] - a[1]) * u : b[1];
        const y = a && Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 40 ? a[2] + (b[2] - a[2]) * u : b[2];
        const r = b[4] ? 3 : ex.RP;
        g.fillStyle = 'rgba(255,200,80,.35)'; g.beginPath(); g.arc(x, y, r + 3, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#1d1f24'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        g.fillStyle = COLORI[b[3] % COLORI.length]; g.beginPath(); g.arc(x - 1, y - 1, r * 0.45, 0, Math.PI * 2); g.fill();
      }
      // effetti
      const ora = performance.now();
      fx = fx.filter((f) => ora - f.t < (f.tipo === 3 ? 700 : 400));
      for (const f of fx) {
        const k = (ora - f.t) / (f.tipo === 3 ? 700 : 400);
        if (f.tipo === 0) { g.fillStyle = `rgba(255,220,120,${1 - k})`; g.beginPath(); g.arc(f.x, f.y, 6 + k * 8, 0, Math.PI * 2); g.fill(); }
        else if (f.tipo === 1) { g.fillStyle = `rgba(255,${150 - k * 100},40,${0.9 * (1 - k)})`; g.beginPath(); g.arc(f.x, f.y, 14 + k * 34, 0, Math.PI * 2); g.fill(); }
        else if (f.tipo === 2) { g.strokeStyle = `rgba(120,190,255,${1 - k})`; g.lineWidth = 3; g.beginPath(); g.arc(f.x, f.y, 20 + k * 20, 0, Math.PI * 2); g.stroke(); }
        else { const tt = (ora - f.t) / 1000; g.fillStyle = `rgba(60,50,40,${1 - k})`; g.beginPath(); g.arc(f.x + f.vx * tt, f.y + f.vy * tt, f.r, 0, Math.PI * 2); g.fill(); }
      }
    },
  });
  // nel punteggio anche chi è saltato in questo round
  tavolo.punteggio = (ctx) => {
    const p = ctx.partita, s = p.stato && p.stato.s;
    return p.punti.map((x, i) => `<span style="color:${COLORI[i % COLORI.length]}">${s && s.c && s.c[i] && !s.c[i][4] ? '💥 ' : ''}${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x}</b></span>`).join('') + '<span class="obiettivo">punti</span>';
  };
  Object.assign(window.Tavoli, { carri: tavolo });
})();
