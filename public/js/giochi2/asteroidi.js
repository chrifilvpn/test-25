// ASTEROIDI: cielo nero con le stelle e una nebulosa (disegnati una volta), massi grigi irregolari (la forma viene
// dall'id, uguale per tutti), navicelle a punta del colore del giocatore con la fiamma quando spingono, colpi
// luminosi, disco volante, schegge quando un masso si rompe ed esplosione quando salta una navicella.
(() => {
  const { COLORI } = window.Arena;
  const { suono, esc } = window.Nuovi;
  let visto = 0, sfondo = null, fx = [], forme = new Map();

  function cielo(W, H) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.fillStyle = '#05060d'; g.fillRect(0, 0, W, H);
    for (const [x, y, r, col] of [[W * 0.25, H * 0.3, 380, 'rgba(80,40,140,.18)'], [W * 0.75, H * 0.7, 420, 'rgba(30,90,160,.16)']]) {
      const gr = g.createRadialGradient(x, y, 10, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    let s = 7; const caso = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let k = 0; k < 260; k++) { const r = caso() < 0.92 ? 0.8 : 1.6; g.fillStyle = `rgba(255,255,255,${0.3 + caso() * 0.6})`; g.beginPath(); g.arc(caso() * W, caso() * H, r, 0, Math.PI * 2); g.fill(); }
    return c;
  }
  // la forma di un masso: 11 punti con il raggio che cambia un po', sempre uguale per lo stesso id
  function forma(id) {
    let f = forme.get(id);
    if (f) return f;
    let s = id * 9301 + 49297; const caso = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    f = Array.from({ length: 11 }, (_, k) => [(k / 11) * Math.PI * 2, 0.72 + caso() * 0.32]);
    f.crateri = Array.from({ length: 3 }, () => [caso() * 6.28, caso() * 0.5, 0.12 + caso() * 0.12]);
    forme.set(id, f);
    if (forme.size > 400) forme.delete(forme.keys().next().value);
    return f;
  }
  function masso(g, x, y, r, ang, id) {
    const f = forma(id);
    g.save(); g.translate(x, y); g.rotate(ang);
    g.beginPath(); f.forEach(([a, k], i) => { const px = Math.cos(a) * r * k, py = Math.sin(a) * r * k; if (i) g.lineTo(px, py); else g.moveTo(px, py); }); g.closePath();
    const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r); gr.addColorStop(0, '#9a9488'); gr.addColorStop(1, '#4d4840');
    g.fillStyle = gr; g.fill(); g.strokeStyle = '#2e2a25'; g.lineWidth = 2; g.stroke();
    g.fillStyle = 'rgba(40,35,30,.35)';
    for (const [a, d, k] of f.crateri) { g.beginPath(); g.arc(Math.cos(a) * r * d, Math.sin(a) * r * d, r * k, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
  function nave(g, x, y, a, col, io, spinge, protetto) {
    g.save(); g.translate(x, y); g.rotate(a); g.scale(1.25, 1.25);
    if (protetto) g.globalAlpha = Math.floor(performance.now() / 120) % 2 ? 0.3 : 1; // lampeggia quando è protetta
    if (spinge) { g.fillStyle = `rgba(255,${150 + Math.random() * 90},50,.9)`; g.beginPath(); g.moveTo(-10, -5); g.lineTo(-20 - Math.random() * 10, 0); g.lineTo(-10, 5); g.fill(); }
    g.beginPath(); g.moveTo(17, 0); g.lineTo(-12, -11); g.lineTo(-7, 0); g.lineTo(-12, 11); g.closePath();
    g.fillStyle = col; g.fill(); g.strokeStyle = io ? '#fff' : 'rgba(255,255,255,.55)'; g.lineWidth = io ? 2.5 : 1.5; g.stroke();
    g.fillStyle = 'rgba(200,240,255,.85)'; g.beginPath(); g.ellipse(4, 0, 4, 2.6, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  function ufo(g, x, y) {
    g.save(); g.translate(x, y);
    g.fillStyle = 'rgba(150,255,200,.5)'; g.beginPath(); g.ellipse(0, -5, 8, 7, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#b8c0cc'; g.beginPath(); g.ellipse(0, 0, 20, 6.5, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#5c6470'; g.lineWidth = 1.5; g.stroke();
    const k = Math.floor(performance.now() / 150) % 4;
    for (let i = 0; i < 4; i++) { g.fillStyle = i === k ? '#ffe45c' : '#7a5a10'; g.beginPath(); g.arc(-12 + i * 8, 1, 1.8, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
  // posizione interpolata nel campo che si avvolge: niente scie attraverso tutto lo schermo
  const tra = (a, b, u, M) => { let d = b - a; if (d > M / 2) d -= M; if (d < -M / 2) d += M; let v = a + d * u; if (v < 0) v += M; if (v >= M) v -= M; return v; };
  const traA = (a, b, u) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * u; };
  // si disegna anche dall'altra parte quando una cosa è a cavallo del bordo
  function ovunque(W, H, x, y, r, fn) {
    fn(x, y);
    if (x < r) fn(x + W, y); else if (x > W - r) fn(x - W, y);
    if (y < r) fn(x, y + H); else if (y > H - r) fn(x, y - H);
  }

  const tavolo = window.Arena.tavolo({
    id: 'asteroidi',
    mouse: null,
    comandi: 'movimento',
    nomeAzione: '🔫 Spara',
    obiettivo: 'punti',
    suonoAzione: null,
    istruzioni: () => (window.Arena.touch()
      ? 'Joystick: la navicella gira e spinge in quella direzione. 🔫 Spara (tieni premuto per la raffica). Il campo non ha bordi!'
      : 'Frecce o WASD: la navicella gira e spinge in quella direzione. Spazio o clic per sparare (tieni premuto per la raffica). Il campo non ha bordi!'),
    sottotitolo: (p) => (p.extra ? (p.extra.contro ? 'tutti contro tutti' : 'tutti contro i massi') : ''),
    statoGioco: (ctx, s) => {
      const io = s.s && s.s.n && s.s.n[ctx.mio];
      if (io && !io[3]) return io[6] > 0 ? 'Riappari tra un attimo…' : 'Hai finito le vite';
      return `Ondata ${s.s ? s.s.o : 1}`;
    },
    hud: (ctx, s) => {
      const io = s.s && s.s.n && s.s.n[ctx.mio];
      if (!io) return '';
      const m = Math.floor(s.s.r / 60), sec = String(s.s.r % 60).padStart(2, '0');
      return `<span>❤️ ${'●'.repeat(Math.max(0, io[6]))}${'○'.repeat(Math.max(0, 3 - io[6]))}</span><span>☄️ ondata ${s.s.o}</span><span>⏱ ${m}:${sec}</span>`;
    },
    fineRound: (p, s, ctx) => `Punti: ${p.punti[ctx.mio]}`,
    dopoTick(ctx, d) {
      if (!d.s) return;
      const ora = performance.now();
      for (const [num, tipo, x, y] of d.s.b || []) {
        if (num <= visto) continue;
        visto = num;
        if (tipo === 4) { suono([[880, 0.03]], { tipo: 'square', volume: 0.015 }); continue; }
        const n = tipo === 3 || tipo === 5 ? 26 : [14, 10, 7][tipo];
        for (let k = 0; k < n; k++) { const a = Math.random() * 6.28, v = 40 + Math.random() * (tipo >= 3 ? 220 : 140); fx.push({ t: ora, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, col: tipo >= 3 ? `hsl(${20 + Math.random() * 40},100%,60%)` : '#a9a294', r: 1 + Math.random() * 2.5 }); }
        if (tipo >= 3) suono([[110, 0.2], [70, 0.3]], { tipo: 'sawtooth', volume: 0.07 });
        else suono([[[140, 200, 300][tipo], 0.08]], { tipo: 'triangle', volume: 0.05 });
      }
    },
    disegna(g, p, s, prima, u, ctx) {
      if (!s.s || !s.s.n) return;
      const W = p.W, H = p.H, st = s.s, p0 = prima && prima.s && prima.s.n ? prima.s : null;
      if (!sfondo) sfondo = cielo(W, H);
      g.drawImage(sfondo, 0, 0, W, H);
      const R = (p.extra && p.extra.RAGGI) || [44, 24, 13];
      const mp = new Map(p0 ? p0.m.map((m) => [m[0], m]) : []);
      for (const m of st.m) {
        const a = mp.get(m[0]) || m;
        const x = tra(a[1], m[1], u, W), y = tra(a[2], m[2], u, H);
        const rot = (((m[0] * 37) % 100) / 100 - 0.5) * 2, ang = ((m[0] * 53) % 628) / 100 + rot * (prima && prima.t !== undefined ? prima.t + (s.t - prima.t) * u : s.t); // come sul server
        ovunque(W, H, x, y, R[m[3]], (xx, yy) => masso(g, xx, yy, R[m[3]], ang, m[0]));
      }
      const cp = new Map(p0 ? p0.c.map((c) => [c[0], c]) : []);
      for (const c of st.c) {
        const a = cp.get(c[0]) || c;
        const x = tra(a[1], c[1], u, W), y = tra(a[2], c[2], u, H);
        const col = c[3] < 0 ? '#7dffb0' : COLORI[c[3] % COLORI.length];
        g.fillStyle = col; g.globalAlpha = 0.35; g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1; g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 2.2, 0, Math.PI * 2); g.fill();
      }
      if (st.u) { const a = p0 && p0.u ? p0.u : st.u; ufo(g, a[0] + (st.u[0] - a[0]) * u, tra(a[1], st.u[1], u, H)); }
      st.n.forEach((n, i) => {
        if (!n[3]) return;
        const a = p0 && p0.n[i] && p0.n[i][3] ? p0.n[i] : n;
        const x = tra(a[0], n[0], u, W), y = tra(a[1], n[1], u, H);
        ovunque(W, H, x, y, 20, (xx, yy) => nave(g, xx, yy, traA(a[2], n[2], u), COLORI[i % COLORI.length], i === ctx.mio, n[5], n[4]));
        if (p.n > 1) {
          g.font = '600 12px system-ui, sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.75)';
          g.fillText(i === ctx.mio ? 'Tu' : ctx.nome(i), x, y - 22);
        }
      });
      const ora = performance.now();
      fx = fx.filter((f) => ora - f.t < 800);
      for (const f of fx) {
        const k = (ora - f.t) / 800, tt = (ora - f.t) / 1000;
        g.globalAlpha = 1 - k; g.fillStyle = f.col; g.beginPath(); g.arc(f.x + f.vx * tt, f.y + f.vy * tt, f.r, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
    },
  });
  tavolo.infoPosto = (ctx, posto) => { const s = ctx.partita.stato && ctx.partita.stato.s; const n = s && s.n && s.n[posto]; return `${ctx.partita.punti[posto]} punti${n ? ` · ${'❤️'.repeat(Math.max(0, n[6]))}` : ''}`; };
  tavolo.punteggio = (ctx) => {
    const p = ctx.partita;
    return p.punti.map((x, i) => `<span style="color:${COLORI[i % COLORI.length]}">${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x}</b></span>`).join('') + '<span class="obiettivo">punti</span>';
  };
  Object.assign(window.Tavoli, { asteroidi: tavolo });
})();
