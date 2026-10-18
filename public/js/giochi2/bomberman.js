// BOMBE E MATTONI: labirinto visto dall'alto con il prato a scacchi, pilastri di pietra, mattoni rossi, bombe che
// pulsano sempre più forte, fiamme a croce, potenziamenti disegnati e blocchi che cadono dal cielo alla fine.
// Il proprio omino si muove subito nel browser (stesse regole del server) e il server lo insegue.
(() => {
  const { COLORI } = window.Arena;
  const { suono } = window.Nuovi;
  const V_BASE = 3.3, V_PIU = 0.55;
  const NOMI_COL = ['rosso', 'blu', 'verde', 'giallo'];
  const SQ_COL = ['#ff5a4e', '#4ea3ff'], SQ_NOME = ['rossa', 'blu'];
  const sq = (p, i) => (p.extra && p.extra.aSquadre ? i % 2 : null);
  const ANGOLI = ['in alto a sinistra', 'in basso a destra', 'in alto a destra', 'in basso a sinistra'];
  let fumi = [], scoppi = [], vistiVivi = null, ultimoPreso = null;

  // ---------- movimento (lo stesso del server: giochi2/bomberman.js) ----------
  function chiusa(st, C, R, c, r, x, y) {
    if (c < 0 || r < 0 || c >= C || r >= R) return true;
    if (st.s.g[r * C + c] !== '.') return true;
    for (const b of st.s.b) if (Math.round(b[1]) === c && Math.round(b[2]) === r && !(Math.abs(b[1] - x) < 0.99 && Math.abs(b[2] - y) < 0.99)) return true;
    return false;
  }
  function prova(st, C, R, e, ax, s, dist) {
    const al = ax === 'x' ? 'y' : 'x';
    const corsia = Math.round(e[al]);
    if (Math.abs(e[al] - corsia) < 0.01) e[al] = corsia;
    const off = e[al] - corsia, cur = Math.round(e[ax]);
    const cc = ax === 'x' ? cur + s : corsia, rr = ax === 'x' ? corsia : cur + s;
    if (chiusa(st, C, R, cc, rr, e.x, e.y)) {
      const manca = (cur - e[ax]) * s;
      if (manca <= 1e-6 || Math.abs(off) > 1e-6) return 0;
      const f = Math.min(dist, manca); e[ax] += f * s; return f;
    }
    let fatto = 0;
    if (Math.abs(off) > 1e-6) { const f = Math.min(dist, Math.abs(off)); e[al] -= Math.sign(off) * f; fatto += f; dist -= f; }
    if (dist > 0) { e[ax] += dist * s; fatto += dist; }
    return fatto;
  }
  const predici = {
    prendi(st, ctx) {
      const s = st.s; if (!s || !s.e || !ctx.partita.extra) return null;
      const e = s.e[ctx.mio]; if (!e || !e.v) return null;
      const T = ctx.partita.extra.T; return { x: e.x * T, y: e.y * T };
    },
    muovi(pos, i, dt, ctx, st) {
      const ex = ctx.partita.extra; if (!ex || !st.s || !st.s.g) return pos;
      if (Math.abs(i.x) < 0.2 && Math.abs(i.y) < 0.2) return pos;
      const T = ex.T, e = { x: pos.x / T, y: pos.y / T };
      const vel = st.s.io ? st.s.io[2] : 0, dist = (V_BASE + vel * V_PIU) * dt;
      const prima = Math.abs(i.x) >= Math.abs(i.y) ? ['x', Math.sign(i.x)] : ['y', Math.sign(i.y)];
      const seconda = prima[0] === 'x' ? (Math.abs(i.y) > 0.2 ? ['y', Math.sign(i.y)] : null) : (Math.abs(i.x) > 0.2 ? ['x', Math.sign(i.x)] : null);
      const f = prova(st, ex.C, ex.R, e, prima[0], prima[1], dist);
      if (f < 1e-6 && seconda) prova(st, ex.C, ex.R, e, seconda[0], seconda[1], dist);
      return { x: e.x * T, y: e.y * T };
    },
    metti(st, ctx, pos) {
      if (!st || !st.s || !st.s.e || !ctx.partita.extra) return st;
      const T = ctx.partita.extra.T;
      return { ...st, s: { ...st.s, e: st.s.e.map((o) => (o.id === ctx.mio ? { ...o, x: pos.x / T, y: pos.y / T } : o)) } };
    },
  };

  // ---------- disegni ----------
  function prato(g, C, R, T) {
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { g.fillStyle = (r + c) % 2 ? '#5dae4f' : '#66b957'; g.fillRect(c * T, r * T, T, T); }
  }
  function pietra(g, x, y, T, bordo) {
    g.fillStyle = bordo ? '#59606e' : '#7a8293'; g.fillRect(x, y, T, T);
    g.fillStyle = bordo ? '#6a7282' : '#9aa2b3'; g.fillRect(x + 3, y + 3, T - 6, T - 9);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + 3, y + 3, T - 6, 4);
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x, y + T - 6, T, 6);
  }
  function mattone(g, x, y, T, k = 1) {
    g.save();
    if (k < 1) { g.globalAlpha = k; g.translate(x + T / 2, y + T / 2); g.scale(0.6 + k * 0.4, 0.6 + k * 0.4); g.translate(-x - T / 2, -y - T / 2); }
    g.fillStyle = '#9b4a2c'; g.fillRect(x + 1, y + 1, T - 2, T - 2);
    g.fillStyle = '#c4633a';
    const h = (T - 2) / 4;
    for (let riga = 0; riga < 4; riga++) {
      const sp = riga % 2 ? T / 4 : 0;
      for (let k2 = -1; k2 < 3; k2++) {
        const x0 = x + 2 + sp + k2 * (T / 2), x1 = x0 + T / 2 - 3;
        const a = Math.max(x + 2, x0), b = Math.min(x + T - 2, x1);
        if (b > a) g.fillRect(a, y + 2 + riga * h, b - a, h - 2);
      }
    }
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x + 1, y + T - 5, T - 2, 4);
    g.restore();
  }
  function potere(g, tipo, x, y, T, t) {
    const s = T * 0.36, bob = Math.sin(t * 4 + x) * 2;
    g.save(); g.translate(x, y + bob);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(0, s + 4 - bob, s * 0.8, 4, 0, 0, Math.PI * 2); g.fill();
    const fondo = { b: '#3a4bd8', f: '#e2541c', v: '#16a3b8', k: '#8e44c9' }[tipo] || '#555';
    g.fillStyle = fondo; g.beginPath(); g.roundRect ? g.roundRect(-s, -s, s * 2, s * 2, 7) : g.rect(-s, -s, s * 2, s * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
    if (tipo === 'b') { g.fillStyle = '#111'; g.beginPath(); g.arc(0, 2, s * 0.5, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#f2c230'; g.lineWidth = 2; g.beginPath(); g.moveTo(s * 0.3, -s * 0.3); g.lineTo(s * 0.55, -s * 0.6); g.stroke(); }
    else if (tipo === 'f') { g.fillStyle = '#ffd23a'; g.beginPath(); g.moveTo(0, -s * 0.7); g.quadraticCurveTo(s * 0.7, 0, 0, s * 0.65); g.quadraticCurveTo(-s * 0.7, 0, 0, -s * 0.7); g.fill(); g.fillStyle = '#fff6c2'; g.beginPath(); g.arc(0, s * 0.2, s * 0.22, 0, Math.PI * 2); g.fill(); }
    else if (tipo === 'v') { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-s * 0.55, s * 0.35); g.lineTo(s * 0.55, s * 0.35); g.lineTo(s * 0.55, s * 0.05); g.lineTo(0, -s * 0.1); g.lineTo(-s * 0.15, -s * 0.55); g.lineTo(-s * 0.55, -s * 0.55); g.closePath(); g.fill(); g.strokeStyle = '#ffd23a'; g.lineWidth = 2; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-s * 0.95, -s * 0.3 + k * s * 0.3); g.lineTo(-s * 0.7, -s * 0.3 + k * s * 0.3); g.stroke(); } }
    else if (tipo === 'k') { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-s * 0.2, -s * 0.6); g.lineTo(s * 0.15, -s * 0.6); g.lineTo(s * 0.15, s * 0.1); g.lineTo(s * 0.6, s * 0.15); g.lineTo(s * 0.6, s * 0.45); g.lineTo(-s * 0.2, s * 0.45); g.closePath(); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(s * 0.75, -s * 0.2, s * 0.18, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
  function bomba(g, x, y, T, resta, t) {
    const batte = resta < 0.8 ? 18 : resta < 1.6 ? 10 : 6;
    const sc = 1 + Math.sin(t * batte) * 0.07;
    const r = T * 0.36 * sc;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x + 3, y + r * 0.8, r, r * 0.4, 0, 0, Math.PI * 2); g.fill();
    const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, 2, x, y, r);
    gr.addColorStop(0, '#6d7180'); gr.addColorStop(0.35, '#2a2d36'); gr.addColorStop(1, '#0d0e12');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    if (resta < 0.8) { g.fillStyle = `rgba(255,60,40,${0.25 + 0.25 * Math.sin(t * 30)})`; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#4b4f5c'; g.fillRect(x - 4, y - r - 4, 8, 6);
    g.strokeStyle = '#c8a46a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x, y - r - 3); g.quadraticCurveTo(x + 6, y - r - 12, x + 10, y - r - 10); g.stroke();
    const sp = 3 + Math.random() * 3;
    g.fillStyle = '#ffdf5a'; g.beginPath(); g.arc(x + 10, y - r - 10, sp, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ff7a1a'; g.beginPath(); g.arc(x + 10, y - r - 10, sp * 0.5, 0, Math.PI * 2); g.fill();
  }
  function fiamma(g, x, y, T, o, resta) {
    const k = Math.max(0, Math.min(1, resta / 0.55));
    const largo = T * (0.35 + 0.3 * Math.min(1, k * 1.6)), pieno = T + 2;
    g.save(); g.globalAlpha = 0.35 + 0.65 * Math.min(1, k * 2);
    const disegna = (w, h, col) => { g.fillStyle = col; g.beginPath(); g.roundRect ? g.roundRect(x - w / 2, y - h / 2, w, h, Math.min(w, h) / 2) : g.rect(x - w / 2, y - h / 2, w, h); g.fill(); };
    const forme = o === 0 ? [[pieno, largo], [largo, pieno]] : o === 1 ? [[pieno, largo]] : [[largo, pieno]];
    for (const [w, h] of forme) disegna(w, h, '#ff6a1a');
    for (const [w, h] of forme) disegna(w * (w > h ? 1 : 0.62), h * (h > w ? 1 : 0.62), '#ffb22e');
    for (const [w, h] of forme) disegna(w * (w > h ? 1 : 0.3), h * (h > w ? 1 : 0.3), '#fff3b0');
    g.restore();
  }
  function omino(g, x, y, T, col, dir, mov, t, io, nome, squadra = null) {
    const passo = mov ? Math.sin(t * 16) : 0;
    const r = T * 0.32;
    g.save(); g.translate(x, y);
    // a squadre: un anello del colore della squadra sotto i piedi
    if (squadra !== null) { g.strokeStyle = SQ_COL[squadra]; g.lineWidth = 3; g.beginPath(); g.ellipse(0, r + 6, r * 1.15, 7, 0, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(0, r + 7, r * 0.9, 5, 0, 0, Math.PI * 2); g.fill();
    // piedi
    g.fillStyle = '#2b2b33'; g.beginPath(); g.ellipse(-r * 0.45, r + 3 + passo * 2, 6, 4, 0, 0, Math.PI * 2); g.ellipse(r * 0.45, r + 3 - passo * 2, 6, 4, 0, 0, Math.PI * 2); g.fill();
    // corpo (tuta bianca con la cintura del suo colore)
    g.fillStyle = '#eef0f6'; g.beginPath(); g.ellipse(0, r * 0.45, r * 0.8, r * 0.65, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = col; g.fillRect(-r * 0.75, r * 0.4, r * 1.5, r * 0.22);
    // testa col casco del suo colore
    const hy = -r * 0.35 + Math.abs(passo) * 1.5;
    g.fillStyle = col; g.beginPath(); g.arc(0, hy, r * 0.86, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(-r * 0.3, hy - r * 0.35, r * 0.25, 0, Math.PI * 2); g.fill();
    g.strokeStyle = io ? '#fff' : 'rgba(0,0,0,.45)'; g.lineWidth = io ? 3 : 1.5; g.beginPath(); g.arc(0, hy, r * 0.86, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#f2c230'; g.beginPath(); g.arc(0, hy - r * 0.9, r * 0.2, 0, Math.PI * 2); g.fill(); // pompon
    // viso (verso la direzione)
    const dx = [1, -1, 0, 0][dir] || 0, dy = [0, 0, 1, -1][dir] || 0;
    if (dy !== -1) {
      g.fillStyle = '#ffcfa6'; g.beginPath(); g.ellipse(dx * r * 0.18, hy + r * 0.1 + dy * 2, r * 0.55, r * 0.45, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1d1d26'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(dx * r * 0.32 + s * r * 0.2, hy + r * 0.05 + dy * 2, 2.2, 3.4, 0, 0, Math.PI * 2); g.fill(); }
    }
    g.restore();
    if (nome) { g.font = '700 12px system-ui, sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(nome, x, y - T * 0.62); g.fillStyle = io ? '#fff' : col; g.fillText(nome, x, y - T * 0.62); }
  }

  const tavolo = window.Arena.tavolo({
    id: 'bomberman',
    predici,
    nomeAzione: '💣',
    obiettivo: 'punti',
    istruzioni: () => (window.Arena.touch() ? 'Joystick per muoverti, 💣 per piazzare una bomba.' : 'WASD o frecce per muoverti, spazio per piazzare una bomba.') + ' Rompi i mattoni, prendi i potenziamenti e resta l\'ultimo in piedi!',
    ruolo: (p, s, ctx) => (sq(p, ctx.mio) !== null ? `squadra ${SQ_NOME[sq(p, ctx.mio)]} con ${ctx.nome(ctx.mio ^ 2)}, ${ANGOLI[ctx.mio] || ''}` : `sei il ${NOMI_COL[ctx.mio] || ''}, ${ANGOLI[ctx.mio] || ''}`),
    sottotitolo: (p, ctx) => (sq(p, ctx.mio) !== null ? `squadra ${SQ_NOME[sq(p, ctx.mio)]}` : `sei il ${NOMI_COL[ctx.mio] || ''}`),
    statoGioco: (ctx, s) => { const e = s.s.e[ctx.mio]; if (!e) return ''; if (!e.v) return 'Sei saltato in aria: guarda gli altri'; return s.s.tr > 0 ? 'Piazza le bombe!' : 'La mappa si restringe!'; },
    hud: (ctx, s) => {
      const io = s.s.io, vivi = s.s.e.filter((e) => e.v).length;
      const pot = io ? `<span title="bombe">💣 ${io[0]}</span><span title="fiamma">🔥 ${io[1]}</span><span title="velocità">👟 ${io[2]}</span>${io[3] ? '<span title="calcio">🦶 calcio</span>' : ''}` : '';
      return `${pot}<span>🧍 in gioco: ${vivi}</span>${s.s.tr > 0 ? `<span>🧱 tra ${s.s.tr} s</span>` : '<span style="color:#ff8a80">🧱 cadono i blocchi!</span>'}`;
    },
    fineRound: (p, s, ctx) => {
      const vivi = s.s.e.filter((e) => e.v);
      if (sq(p, ctx.mio) !== null) {
        const sqv = [...new Set(vivi.map((e) => e.id % 2))];
        const tot = (t) => p.punti.reduce((a, x, q) => a + (q % 2 === t ? x : 0), 0), mia = ctx.mio % 2;
        return `${sqv.length === 1 ? (sqv[0] === mia ? 'La tua squadra vince il round!' : `Vince la squadra ${SQ_NOME[sqv[0]]}`) : 'Round pari'} · squadre ${tot(mia)} a ${tot(1 - mia)}`;
      }
      const chi = vivi.length === 1 ? (vivi[0].id === ctx.mio ? 'Hai vinto il round!' : `Vince ${ctx.nome(vivi[0].id)}`) : 'Round pari';
      return `${chi} · tuoi punti: ${p.punti[ctx.mio]}`;
    },
    dopoTick(ctx, d, prima) {
      if (!prima || !prima.s || !prima.s.e || !d.s || !d.s.e) return;
      // esplosioni: le bombe sparite fanno "bum" (una volta per gruppo)
      const ora = d.s.b.map((b) => b[0]);
      const sparite = prima.s.b.filter((b) => !ora.includes(b[0]));
      if (sparite.length) { suono([[110, 0.12], [70, 0.25], [45, 0.3]], { tipo: 'sawtooth', volume: 0.08 }); for (const b of sparite) scoppi.push({ x: b[1], y: b[2], t: performance.now() }); }
      if (d.s.b.length > prima.s.b.length) suono([[420, 0.04], [300, 0.05]], { tipo: 'square', volume: 0.03 });
      d.s.e.forEach((e, i) => {
        const p0 = prima.s.e[i];
        if (p0 && p0.v && !e.v) { fumi.push({ x: p0.x, y: p0.y, col: COLORI[i % COLORI.length], t: performance.now() }); if (i === ctx.mio) suono([[500, 0.1], [300, 0.15], [150, 0.4]], { volume: 0.09 }); }
      });
      const io = d.s.io;
      if (io && io[4] && io[5] !== ultimoPreso) { if (ultimoPreso !== null) suono([[660, 0.06], [880, 0.06], [1320, 0.12]], { volume: 0.06 }); ultimoPreso = io[5]; }
      if (d.s.k.length > (prima.s.k || []).length) suono([[90, 0.08]], { tipo: 'square', volume: 0.03 });
    },
    disegna(g, p, s, prima, u, ctx) {
      const ex = p.extra; if (!ex || !s.s || !s.s.g) return;
      const { C, R, T } = ex, st = s.s, t = s.t, oraP = performance.now();
      prato(g, C, R, T);
      // ombre dei blocchi che stanno per cadere
      for (const [i, tc] of st.k) {
        const c = i % C, r = Math.floor(i / C), k = Math.min(1, tc / 0.45);
        g.fillStyle = `rgba(0,0,0,${0.15 + k * 0.3})`; g.beginPath(); g.ellipse(c * T + T / 2, r * T + T / 2 + 4, T * (0.2 + k * 0.3), T * (0.12 + k * 0.2), 0, 0, Math.PI * 2); g.fill();
      }
      // muri e mattoni
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        const ch = st.g[r * C + c];
        if (ch === '#') pietra(g, c * T, r * T, T, r === 0 || c === 0 || r === R - 1 || c === C - 1);
        else if (ch === 'm') mattone(g, c * T, r * T, T);
      }
      for (const [i, tr] of st.ro || []) mattone(g, (i % C) * T, Math.floor(i / C) * T, T, Math.max(0, 1 - tr / 0.45));
      for (const [i, tipo] of st.w) potere(g, tipo, (i % C) * T + T / 2, Math.floor(i / C) * T + T / 2, T, t);
      // bombe (quelle calciate scivolano: si interpola)
      const bp = new Map(prima && prima.s && prima.s.b ? prima.s.b.map((b) => [b[0], b]) : []);
      for (const b of st.b) {
        const a = bp.get(b[0]);
        const x = a ? a[1] + (b[1] - a[1]) * u : b[1], y = a ? a[2] + (b[2] - a[2]) * u : b[2];
        bomba(g, x * T + T / 2, y * T + T / 2, T, b[3], t);
      }
      for (const [i, o, resta] of st.f) fiamma(g, (i % C) * T + T / 2, Math.floor(i / C) * T + T / 2, T, o, resta);
      // giocatori (interpolati; il mio è già quello previsto)
      const ep = new Map(prima && prima.s && prima.s.e ? prima.s.e.map((e) => [e.id, e]) : []);
      const ordine = st.e.slice().sort((a, b) => a.y - b.y);
      for (const e of ordine) {
        if (!e.v) continue;
        const a = ep.get(e.id);
        const x = a && a.v && e.id !== ctx.mio && Math.abs(a.x - e.x) < 2 && Math.abs(a.y - e.y) < 2 ? a.x + (e.x - a.x) * u : e.x;
        const y = a && a.v && e.id !== ctx.mio && Math.abs(a.x - e.x) < 2 && Math.abs(a.y - e.y) < 2 ? a.y + (e.y - a.y) * u : e.y;
        omino(g, x * T + T / 2, y * T + T / 2, T, COLORI[e.id % COLORI.length], e.d, e.m, t, e.id === ctx.mio, e.id === ctx.mio ? 'Tu' : ctx.nome(e.id).slice(0, 9), sq(p, e.id));
      }
      // blocchi che cadono dall'alto
      for (const [i, tc] of st.k) {
        if (tc >= 0.45) continue;
        const c = i % C, r = Math.floor(i / C), k = tc / 0.45;
        const yy = r * T - (1 - k) * (r * T + T);
        pietra(g, c * T, yy, T, true);
      }
      // scoppi e fumo
      scoppi = scoppi.filter((x) => oraP - x.t < 350);
      for (const x of scoppi) { const a = (oraP - x.t) / 350; g.strokeStyle = `rgba(255,240,180,${1 - a})`; g.lineWidth = 4; g.beginPath(); g.arc(x.x * T + T / 2, x.y * T + T / 2, T * (0.3 + a * 0.9), 0, Math.PI * 2); g.stroke(); }
      fumi = fumi.filter((x) => oraP - x.t < 900);
      for (const x of fumi) {
        const a = (oraP - x.t) / 900;
        g.save(); g.globalAlpha = 1 - a;
        for (let k = 0; k < 5; k++) { const an = k * 1.26; g.fillStyle = k % 2 ? '#d8d8d8' : x.col; g.beginPath(); g.arc(x.x * T + T / 2 + Math.cos(an) * a * 20, x.y * T + T / 2 + Math.sin(an) * a * 20 - a * 25, T * 0.18 * (1 + a), 0, Math.PI * 2); g.fill(); }
        g.restore();
      }
      if (vistiVivi === null) vistiVivi = st.e.length;
    },
  });
  // a ogni round si azzerano gli effetti
  const reset0 = tavolo.reset;
  tavolo.reset = (ctx) => { if (ctx.partita && ctx.partita.stato && ctx.partita.stato.fase === 'via') { fumi = []; scoppi = []; } reset0.call(tavolo, ctx); };
  Object.assign(window.Tavoli, { bomberman: tavolo });
})();
