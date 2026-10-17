// MOTO DI LUCE: arena scura a quadretti (preparata una volta in un canvas a parte), scie al neon (una riga larga e
// trasparente più una sottile e chiara, niente shadowBlur), moto con il faro, scintille quando qualcuno cade.
// Le scie arrivano a pezzi (solo gli angoli nuovi): il browser se le tiene in "scie" e le ridisegna da sé.
(() => {
  const { COLORI } = window.Arena;
  const { suono } = window.Nuovi;
  const EXTRA = ['#f2f2f2', '#9cff57', '#ff9a3c', '#57e3ff'];
  const colore = (id) => (id < 8 ? COLORI[id] : EXTRA[(id - 8) % EXTRA.length]);
  const NEON = ['#ff5a4f', '#4fa8ff', '#3fe07a', '#ffd23f', '#c07dff', '#ff7fc0', '#3ff0e0', '#ff9a4a', '#f2f2f2', '#9cff57', '#ffb36b', '#80ecff'];
  const neon = (id) => NEON[id % NEON.length];
  let scie = new Map(); // id -> [[x, y], ...] gli angoli di ogni moto nel round
  let roundScie = -1, chiesto = 0, sfondo = null, chiaveSfondo = '', scintille = [], seq = 0, ctxT = null;

  // ---------- comandi: tastiera (svolte in coda, una per quadretto) e dito (strisciata sul campo) ----------
  const DIR = { arrowright: 0, d: 0, arrowdown: 1, s: 1, arrowleft: 2, a: 2, arrowup: 3, w: 3 };
  const attivo = () => ctxT && ctxT.partita && ctxT.partita.gioco === 'tron' && !ctxT.partita.finita && !(window.Boss && Boss.attivo);
  let ultimaSvolta = null;
  function svolta(dir) {
    if (!attivo()) return;
    ctxT.emetti('input', { g: [++seq, dir] });
    ultimaSvolta = { dir, t: performance.now() };
  }
  document.addEventListener('keydown', (e) => {
    if (!attivo() || e.repeat || (e.target.closest && e.target.closest('input, textarea, select'))) return;
    const d = DIR[e.key.toLowerCase()];
    if (d !== undefined) svolta(d);
  });
  let dito = null;
  document.addEventListener('pointerdown', (e) => {
    if (!attivo() || e.pointerType !== 'touch' || !e.target.classList || !e.target.classList.contains('ar-tela')) return;
    dito = { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  document.addEventListener('pointermove', (e) => {
    if (!dito || e.pointerId !== dito.id) return;
    const dx = e.clientX - dito.x, dy = e.clientY - dito.y;
    if (Math.hypot(dx, dy) < 24) return;
    svolta(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3));
    dito.x = e.clientX; dito.y = e.clientY; // si può strisciare ancora senza staccare il dito
  });
  const lascia = (e) => { if (dito && e.pointerId === dito.id) dito = null; };
  document.addEventListener('pointerup', lascia); document.addEventListener('pointercancel', lascia);

  // ---------- le scie che arrivano a pezzi ----------
  function prendiAngoli(ctx, d) {
    if (!d || !d.s || !d.s.a) return;
    if (d.round !== roundScie) { scie = new Map(); roundScie = d.round; }
    let manca = false;
    d.s.a.forEach((a, id) => {
      const da = a[0];
      let l = scie.get(id); if (!l) { l = []; scie.set(id, l); }
      if (da > l.length) { manca = true; return; }
      for (let k = 1; k < a.length; k += 2) l[da + (k - 1) / 2] = [a[k], a[k + 1]];
    });
    // mancano dei pezzi (un tick perso per strada): si chiede la scia intera, al massimo due volte al secondo
    if (manca && performance.now() - chiesto > 500) { chiesto = performance.now(); ctx.emetti('input', { rs: 1 }); }
  }

  function preparaSfondo(ex) {
    const C = ex.CELLA, w = ex.cols * C, h = ex.righe * C, k = 2;
    const c = document.createElement('canvas'); c.width = w * k; c.height = h * k;
    const g = c.getContext('2d'); g.scale(k, k);
    const gr = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, Math.max(w, h) * 0.7);
    gr.addColorStop(0, '#0d1a2e'); gr.addColorStop(1, '#050a14');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.lineWidth = 0.6;
    for (let x = 0; x <= ex.cols; x++) { g.strokeStyle = x % 5 ? 'rgba(70,140,220,.10)' : 'rgba(90,170,255,.22)'; g.beginPath(); g.moveTo(x * C, 0); g.lineTo(x * C, h); g.stroke(); }
    for (let y = 0; y <= ex.righe; y++) { g.strokeStyle = y % 5 ? 'rgba(70,140,220,.10)' : 'rgba(90,170,255,.22)'; g.beginPath(); g.moveTo(0, y * C); g.lineTo(w, y * C); g.stroke(); }
    g.strokeStyle = 'rgba(120,200,255,.85)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
    g.strokeStyle = 'rgba(120,200,255,.2)'; g.lineWidth = 9; g.strokeRect(4.5, 4.5, w - 9, h - 9);
    return c;
  }

  // la testa tra il tick di prima e quello di adesso: lungo la scia vera (passando dagli angoli), non in diagonale
  function testa(id, m, m0, u) {
    if (!m0 || !m[2] && !m0[2]) return [m[0], m[1]];
    const l = scie.get(id) || [];
    const pts = [[m0[0], m0[1]]];
    for (let k = m0[3]; k < m[3]; k++) if (l[k]) pts.push(l[k]);
    pts.push([m[0], m[1]]);
    let tot = 0; for (let k = 1; k < pts.length; k++) tot += Math.abs(pts[k][0] - pts[k - 1][0]) + Math.abs(pts[k][1] - pts[k - 1][1]);
    if (tot > 6 || tot === 0) return [m[0], m[1]];
    let resta = tot * u;
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k], s = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
      if (resta <= s && s > 0) return [a[0] + ((b[0] - a[0]) * resta) / s, a[1] + ((b[1] - a[1]) * resta) / s];
      resta -= s;
    }
    return [m[0], m[1]];
  }

  const nomeDi = (ctx, ex, id) => (id === ctx.mio ? 'Tu' : id < ctx.partita.n ? ctx.nome(id).slice(0, 10) : (ex.nomi && ex.nomi[id]) || 'CPU');

  const tavolo = window.Arena.tavolo({
    id: 'tron',
    comandi: 'movimento',
    nomeAzione: '⚡ Turbo',
    obiettivo: 'punti',
    suonoAzione: null,
    istruzioni: () => (window.Arena.touch() ? 'Striscia il dito sul campo (o usa il joystick) per girare; ⚡ per il turbo.' : 'Frecce o WASD per girare (le svolte si fanno a ogni quadretto, una dopo l\'altra); spazio per il turbo.') + ' Non sbattere contro le scie e il bordo!',
    sottotitolo: (p) => (p.extra ? `${p.extra.cols}×${p.extra.righe} quadretti` : ''),
    statoGioco: (ctx, s) => { const m = s.s.m && s.s.m[ctx.mio]; return !m ? '' : m[2] ? 'Vai!' : 'Fuori: guarda gli altri'; },
    hud: (ctx, s) => {
      const st = s.s, ex = ctx.partita.extra; if (!st || !st.m || !ex) return '';
      const mio = st.m[ctx.mio];
      const turbo = ex.turbo ? `<span>⚡ <span style="display:inline-block;width:4.5rem;height:.55rem;border-radius:9px;background:rgba(255,255,255,.15);vertical-align:middle;overflow:hidden"><span style="display:block;height:100%;width:${st.car}%;background:${st.car >= 100 ? '#ffd23f' : '#5a7da8'}"></span></span></span>` : '';
      const stringe = st.an ? '<span style="color:#ff8a7a">🔻 il bordo si stringe!</span>' : st.st <= 15 ? `<span>🔻 bordo tra ${st.st} s</span>` : '';
      return `<span>🏍️ in gara: ${st.vivi} di ${st.m.length}</span>${mio && !mio[2] ? '<span>💥 sei fuori</span>' : ''}${turbo}${stringe}`;
    },
    ruolo: (p, s, ctx) => `il tuo colore: ${['rosso', 'blu', 'verde', 'giallo', 'viola', 'rosa', 'azzurro', 'arancione'][ctx.mio % 8]}`,
    fineRound: (p, s, ctx) => `Punti totali: ${p.punti[ctx.mio]}`,
    dopoTick(ctx, d, prima) {
      ctxT = ctx;
      prendiAngoli(ctx, d);
      if (!prima || !prima.s || !prima.s.m || !d.s.m || prima.round !== d.round) return;
      d.s.m.forEach((m, id) => {
        const m0 = prima.s.m[id];
        if (m0 && m0[2] && !m[2]) {
          scintille.push({ x: m[0], y: m[1], id, t: performance.now() });
          suono(id === ctx.mio ? [[320, 0.08], [160, 0.15], [70, 0.35]] : [[220, 0.06], [110, 0.12]], { tipo: 'sawtooth', volume: id === ctx.mio ? 0.08 : 0.03 });
        }
        if (id === ctx.mio && m[4] && !m0[4]) suono([[440, 0.05], [660, 0.05], [990, 0.12]], { tipo: 'square', volume: 0.035 });
      });
    },
    disegna(g, p, s, prima, u, ctx) {
      const ex = p.extra, st = s.s; if (!ex || !st || !st.m) return;
      ctxT = ctx;
      if (s.round !== roundScie) prendiAngoli(ctx, s);
      const C = ex.CELLA, W = ex.cols * C, H = ex.righe * C;
      const chiave = `${ex.cols}x${ex.righe}`;
      if (!sfondo || chiave !== chiaveSfondo) { sfondo = preparaSfondo(ex); chiaveSfondo = chiave; }
      g.drawImage(sfondo, 0, 0, W, H);
      const px = 1 / Math.max(0.3, (g.canvas.clientWidth || W) / W); // unità per pixel dello schermo
      // il bordo che si stringe
      if (st.an) {
        const a = st.an * C;
        g.fillStyle = 'rgba(60,8,16,.82)';
        g.fillRect(0, 0, W, a); g.fillRect(0, H - a, W, a); g.fillRect(0, a, a, H - 2 * a); g.fillRect(W - a, a, a, H - 2 * a);
        g.strokeStyle = '#ff4a5a'; g.lineWidth = 2.5; g.strokeRect(a, a, W - 2 * a, H - 2 * a);
      }
      const m0s = prima && prima.s && prima.s.m && prima.round === s.round ? prima.s.m : null;
      const teste = st.m.map((m, id) => testa(id, m, m0s && m0s[id], u));
      const X = (v) => (v + 0.5) * C;
      // le scie (prima quelle di chi è caduto, più spente; la mia per ultima)
      const ordine = st.m.map((m, id) => id).sort((a, b) => (st.m[a][2] - st.m[b][2]) || ((a === ctx.mio) - (b === ctx.mio)));
      g.lineJoin = 'round'; g.lineCap = 'round';
      for (const id of ordine) {
        const m = st.m[id], l = scie.get(id) || [], [hx, hy] = teste[id];
        g.beginPath();
        let primo = true;
        for (let k = 0; k < m[3] && k < l.length; k++) { if (!l[k]) continue; if (primo) { g.moveTo(X(l[k][0]), X(l[k][1])); primo = false; } else g.lineTo(X(l[k][0]), X(l[k][1])); }
        if (primo) g.moveTo(X(hx), X(hy)); else g.lineTo(X(hx), X(hy));
        const col = neon(id);
        g.globalAlpha = m[2] ? 0.22 : 0.1; g.strokeStyle = col; g.lineWidth = C * 0.95; g.stroke();
        g.globalAlpha = m[2] ? 1 : 0.45; g.lineWidth = C * 0.42; g.stroke();
        if (m[2]) { g.globalAlpha = 0.75; g.strokeStyle = '#fff'; g.lineWidth = C * 0.12; g.stroke(); }
        g.globalAlpha = 1;
      }
      // le moto
      const ora = performance.now();
      st.m.forEach((m, id) => {
        if (!m[2]) return;
        const [hx, hy] = teste[id];
        const l = scie.get(id) || [], ang = l[m[3] - 1];
        // la direzione: dall'ultimo angolo verso la testa
        let dx = 1, dy = 0;
        if (ang) { const vx = hx - ang[0], vy = hy - ang[1]; if (Math.abs(vx) + Math.abs(vy) > 0.01) { if (Math.abs(vx) > Math.abs(vy)) { dx = Math.sign(vx); dy = 0; } else { dx = 0; dy = Math.sign(vy); } } }
        const x = X(hx), y = X(hy), r = Math.atan2(dy, dx), col = colore(id);
        g.save(); g.translate(x, y); g.rotate(r);
        // il faro davanti
        g.fillStyle = m[4] ? 'rgba(255,230,120,.35)' : 'rgba(200,230,255,.16)';
        g.beginPath(); g.moveTo(C * 0.6, 0); g.lineTo(C * 4.2, -C * 1.5); g.lineTo(C * 4.2, C * 1.5); g.closePath(); g.fill();
        if (m[4]) { g.fillStyle = 'rgba(255,170,60,.8)'; g.beginPath(); g.moveTo(-C * 0.9, 0); g.lineTo(-C * (2 + Math.random()), -C * 0.35); g.lineTo(-C * (2 + Math.random()), C * 0.35); g.closePath(); g.fill(); }
        g.fillStyle = '#0b1220'; g.strokeStyle = neon(id); g.lineWidth = 1.6;
        g.beginPath(); g.roundRect ? g.roundRect(-C * 0.95, -C * 0.5, C * 1.9, C, C * 0.45) : g.rect(-C * 0.95, -C * 0.5, C * 1.9, C); g.fill(); g.stroke();
        g.fillStyle = col; g.fillRect(-C * 0.35, -C * 0.28, C * 0.7, C * 0.56);
        g.fillStyle = '#fff'; g.beginPath(); g.arc(C * 0.75, 0, C * 0.18, 0, Math.PI * 2); g.fill();
        g.restore();
        const io = id === ctx.mio;
        g.font = `700 ${Math.round((io ? 13 : 11) * px)}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
        g.lineWidth = 3 * px; g.strokeStyle = 'rgba(0,0,0,.8)';
        const nome = nomeDi(ctx, ex, id);
        g.strokeText(nome, x, y - C * 1.1 - 2 * px); g.fillStyle = io ? '#fff' : neon(id); g.fillText(nome, x, y - C * 1.1 - 2 * px);
        if (io && s.fase === 'gioco' && s.t < 2.5) { g.strokeStyle = '#fff'; g.lineWidth = 2 * px; g.globalAlpha = 0.5 + 0.5 * Math.sin(ora / 120); g.beginPath(); g.arc(x, y, C * 2.2, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
      });
      // la svolta appena premuta (risposta immediata, prima che arrivi dal server)
      const mio = st.m[ctx.mio];
      if (mio && mio[2] && ultimaSvolta && ora - ultimaSvolta.t < 220) {
        const [hx, hy] = teste[ctx.mio], d = ultimaSvolta.dir, a = (1 - (ora - ultimaSvolta.t) / 220);
        const ox = [1, 0, -1, 0][d], oy = [0, 1, 0, -1][d];
        g.save(); g.globalAlpha = a; g.fillStyle = '#fff'; g.translate(X(hx) + ox * C * 1.6, X(hy) + oy * C * 1.6); g.rotate(Math.atan2(oy, ox));
        g.beginPath(); g.moveTo(C * 0.8, 0); g.lineTo(-C * 0.3, -C * 0.6); g.lineTo(-C * 0.3, C * 0.6); g.closePath(); g.fill(); g.restore();
      }
      // scintille di chi cade
      scintille = scintille.filter((k) => ora - k.t < 700);
      for (const k of scintille) {
        const a = (ora - k.t) / 700, col = neon(k.id);
        g.strokeStyle = col; g.globalAlpha = 1 - a; g.lineWidth = 2;
        for (let j = 0; j < 12; j++) {
          const an = (j * Math.PI) / 6 + k.id, r0 = C * (0.5 + a * 2), r1 = C * (1 + a * 5);
          g.beginPath(); g.moveTo(X(k.x) + Math.cos(an) * r0, X(k.y) + Math.sin(an) * r0); g.lineTo(X(k.x) + Math.cos(an) * r1, X(k.y) + Math.sin(an) * r1); g.stroke();
        }
        g.globalAlpha = 1;
      }
    },
  });
  const reset0 = tavolo.reset;
  tavolo.reset = (ctx) => { ctxT = ctx; reset0.call(tavolo, ctx); };
  Object.assign(window.Tavoli, { tron: tavolo });
})();
