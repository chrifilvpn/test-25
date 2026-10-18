// CORSA DI MACCHININE: pista d'asfalto con i cordoli bianchi e rossi, erba con gli alberi, linea del traguardo a
// scacchi, semaforo alla partenza, macchinine colorate che lasciano i segni delle gomme in derapata. La telecamera
// segue la propria macchina (o mostra tutta la pista: pulsante 🎥). Sul telefono comandi sopra il campo: pulsanti
// oppure "dito" (gas sempre premuto, si sterza trascinando il dito). Con la pista disegnata, prima della gara c'è il
// foglio dove chi ha aperto il tavolo traccia il giro: il server lo liscia e lo rimanda come pista vera (asfalto,
// linea del traguardo e freccia del verso), che tutti vedono.
(() => {
  const { COLORI } = window.Arena;
  const { esc, suono } = window.Nuovi;
  const PASSO_C = 20;
  const mem = { get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* niente */ } } };
  let modo = mem.get('corsaComandi', 'pulsanti'); // 'pulsanti' | 'dito'
  let vista = mem.get('corsaVista', ''); // '' = automatica, 'segui', 'tutta'
  let geo = null, chiaveGeo = null, segni = [], scintille = [], cam = null, ultimoSem = -1, ctxC = null;

  // ---------- la stessa linea di mezzo del server (giochi2/corsa.js) ----------
  function lineaDi(punti) {
    const n = punti.length, fitta = [];
    for (let i = 0; i < n; i++) {
      const p0 = punti[(i - 1 + n) % n], p1 = punti[i], p2 = punti[(i + 1) % n], p3 = punti[(i + 2) % n];
      const passi = Math.max(4, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 8));
      for (let k = 0; k < passi; k++) {
        const t = k / passi, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        fitta.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    let tot = 0; const lun = [0];
    for (let i = 1; i <= fitta.length; i++) { const a = fitta[i - 1], b = fitta[i % fitta.length]; tot += Math.hypot(b[0] - a[0], b[1] - a[1]); lun.push(tot); }
    const N = Math.round(tot / PASSO_C), out = [];
    let j = 0;
    for (let k = 0; k < N; k++) {
      const s = (k / N) * tot;
      while (lun[j + 1] < s) j++;
      const a = fitta[j], b = fitta[(j + 1) % fitta.length], u = (s - lun[j]) / Math.max(1e-9, lun[j + 1] - lun[j]);
      out.push({ x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u });
    }
    for (let i = 0; i < N; i++) {
      const a = out[(i - 1 + N) % N], b = out[(i + 1) % N], l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      out[i].tx = (b.x - a.x) / l; out[i].ty = (b.y - a.y) / l; out[i].nx = -out[i].ty; out[i].ny = out[i].tx;
    }
    return out;
  }
  // tutto ciò che non cambia: linea, bordi, cordoli nelle curve, alberi (posti sempre uguali per ogni pista)
  function preparaGeo(ex) {
    const C = lineaDi(ex.punti), N = C.length, m = ex.larga / 2;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of C) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
    const curva = C.map((p, i) => { const a = C[(i - 2 + N) % N], b = C[(i + 2) % N]; let d = Math.atan2(b.ty, b.tx) - Math.atan2(a.ty, a.tx); while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; });
    let seme = ex.punti.length * 7919 + Math.round(ex.punti[0][0]);
    const caso = () => { seme = (seme * 16807) % 2147483647; return seme / 2147483647; };
    const alberi = [];
    for (let k = 0; k < 400 && alberi.length < 70; k++) {
      const x = x0 - 300 + caso() * (x1 - x0 + 600), y = y0 - 300 + caso() * (y1 - y0 + 600);
      let d = Infinity; for (let i = 0; i < N; i += 3) d = Math.min(d, Math.hypot(C[i].x - x, C[i].y - y));
      if (d > m + ex.fuori + 50) alberi.push({ x, y, r: 26 + caso() * 22, t: caso() });
    }
    return { C, N, m, alberi, curva, box: [x0 - m - ex.fuori, y0 - m - ex.fuori, x1 + m + ex.fuori, y1 + m + ex.fuori] };
  }
  const percorso = (g, C, off) => { g.beginPath(); C.forEach((p, i) => { const x = p.x + p.nx * off, y = p.y + p.ny * off; if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); };
  function disegnaPista(g, ex, G) {
    const { C, N, m } = G;
    // guard-rail, bordo dell'erba
    g.lineJoin = 'round';
    for (const lato of [-1, 1]) { percorso(g, C, lato * (m + ex.fuori)); g.strokeStyle = '#c9ccd2'; g.lineWidth = 8; g.stroke(); g.strokeStyle = '#7a7f88'; g.lineWidth = 3; g.stroke(); }
    // asfalto
    percorso(g, C, 0); g.strokeStyle = '#3c3f46'; g.lineWidth = m * 2 + 10; g.stroke();
    g.strokeStyle = '#4a4e57'; g.lineWidth = m * 2; g.stroke();
    // cordoli bianchi e rossi nelle curve, bordo bianco sul resto
    for (const lato of [-1, 1]) {
      g.lineWidth = 9;
      for (let i = 0; i < N; i++) {
        const a = C[i], b = C[(i + 1) % N], inCurva = Math.abs(G.curva[i]) > 0.06;
        g.strokeStyle = inCurva ? (i % 2 ? '#e8322a' : '#f4f4f4') : 'rgba(255,255,255,.75)';
        if (!inCurva) g.lineWidth = 3; else g.lineWidth = 10;
        const o = lato * (m - (inCurva ? 4 : 2));
        g.beginPath(); g.moveTo(a.x + a.nx * o, a.y + a.ny * o); g.lineTo(b.x + b.nx * o, b.y + b.ny * o); g.stroke();
      }
    }
    // riga tratteggiata in mezzo
    g.setLineDash([30, 40]); percorso(g, C, 0); g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 3; g.stroke(); g.setLineDash([]);
    // traguardo a scacchi
    const p = C[0], q = 14, n = Math.round((m * 2) / q);
    for (let r = 0; r < 2; r++) for (let k = 0; k < n; k++) {
      g.fillStyle = (k + r) % 2 ? '#111' : '#fff';
      const o = -m + k * q, x = p.x + p.nx * o + p.tx * (r * q - q), y = p.y + p.ny * o + p.ty * (r * q - q);
      g.save(); g.translate(x, y); g.rotate(Math.atan2(p.ty, p.tx)); g.fillRect(0, 0, q, q); g.restore();
    }
  }
  function macchina(g, x, y, a, col, io, deriva, frena) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-20, -9, 42, 22);
    g.fillStyle = '#111'; for (const [rx, ry] of [[-14, -13], [10, -13], [-14, 9], [10, 9]]) g.fillRect(rx, ry, 9, 4);
    g.fillStyle = col; g.beginPath(); g.roundRect ? g.roundRect(-21, -11, 42, 22, 7) : g.rect(-21, -11, 42, 22); g.fill();
    g.strokeStyle = io ? '#fff' : 'rgba(0,0,0,.5)'; g.lineWidth = io ? 3 : 1.5; g.stroke();
    g.fillStyle = 'rgba(160,210,255,.9)'; g.fillRect(2, -8, 8, 16); g.fillStyle = 'rgba(120,170,220,.85)'; g.fillRect(-14, -7, 6, 14);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-8, -2.5, 20, 5);
    g.fillStyle = '#fff6b0'; g.fillRect(19, -9, 3, 5); g.fillRect(19, 4, 3, 5);
    g.fillStyle = frena ? '#ff2a1a' : '#8a1a12'; g.fillRect(-22, -9, 2.5, 5); g.fillRect(-22, 4, 2.5, 5);
    g.restore();
    if (deriva) segni.push({ x: x - Math.cos(a) * 14, y: y - Math.sin(a) * 14, a, t: performance.now() });
  }
  function semaforo(g, W, sem, ex, px) {
    if (sem >= ex.semaforo + 0.8) return;
    const verde = sem >= ex.verde, accese = Math.min(3, Math.floor(sem / (ex.verde / 3.5)));
    const s = 22 * px, w = s * 5.6, h = s * 1.9, x = W / 2 - w / 2, y = 16 * px;
    g.fillStyle = '#1b1d22'; g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, s * 0.5) : g.rect(x, y, w, h); g.fill();
    for (let k = 0; k < 3; k++) {
      g.fillStyle = verde ? '#2fe05a' : k < accese ? '#ff3020' : '#40262a';
      g.beginPath(); g.arc(x + s * 1.1 + k * s * 1.7, y + h / 2, s * 0.62, 0, Math.PI * 2); g.fill();
    }
    if (verde) { g.fillStyle = '#fff'; g.font = `800 ${Math.round(s * 1.4)}px system-ui, sans-serif`; g.textAlign = 'center'; g.fillText('VIA!', W / 2, y + h + s * 1.6); }
  }
  // tasti finti per i pulsanti sullo schermo: il motore li legge come la tastiera
  const tasto = (k, giu) => document.dispatchEvent(new KeyboardEvent(giu ? 'keydown' : 'keyup', { key: k, bubbles: true }));
  const premuti = new Map(); // pointerId -> tasto
  let dito = null; // { id, x0 } per lo sterzo col dito
  let gasDito = false;
  function sterzaDito(dx) {
    const l = dx < -18, r = dx > 18;
    if (l !== !!dito.l) { tasto('ArrowLeft', l); dito.l = l; }
    if (r !== !!dito.r) { tasto('ArrowRight', r); dito.r = r; }
  }
  function attivaGasDito(si) { if (si !== gasDito) { gasDito = si; tasto('ArrowUp', si); } }
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest && e.target.closest('[data-cs]');
    if (!b) return;
    e.preventDefault();
    if (b.dataset.cs === 'dito') { dito = { id: e.pointerId, x0: e.clientX }; try { b.setPointerCapture(e.pointerId); } catch { /* niente */ } return; }
    if (b.dataset.cs === 'ArrowDown' && modo === 'dito') attivaGasDito(false);
    premuti.set(e.pointerId, b.dataset.cs); tasto(b.dataset.cs, true); b.classList.add('cor-giu');
  }, { passive: false });
  document.addEventListener('pointermove', (e) => { if (dito && e.pointerId === dito.id) { e.preventDefault(); sterzaDito(e.clientX - dito.x0); } }, { passive: false });
  const lascia = (e) => {
    if (dito && e.pointerId === dito.id) { sterzaDito(0); dito = null; }
    const k = premuti.get(e.pointerId);
    if (k) { premuti.delete(e.pointerId); tasto(k, false); document.querySelectorAll(`[data-cs="${k}"]`).forEach((x) => x.classList.remove('cor-giu')); if (k === 'ArrowDown' && modo === 'dito' && ctxC && corre(ctxC)) attivaGasDito(true); }
  };
  document.addEventListener('pointerup', lascia); document.addEventListener('pointercancel', lascia);
  const corre = (ctx) => ctx && ctx.partita && ctx.partita.gioco === 'corsa' && !ctx.partita.finita;

  const touch = () => window.Arena.touch();
  const tavolo = window.Arena.tavolo({
    id: 'corsa',
    comandi: 'nessuno',
    obiettivo: 'punti',
    istruzioni: () => (touch() ? 'Pulsanti sopra il campo: ◀ ▶ sterzano, ⏫ gas, 🛑 freno (🕹️ per sterzare col dito). 🎥 cambia la vista.' : 'Freccia su o W: gas · giù o S: freno e retromarcia · destra/sinistra o A/D: sterzo · spazio: freno a mano. 🎥 cambia la vista.'),
    sottotitolo: (p) => (p.extra ? `${esc(p.extra.nome)} · ${p.extra.giri} ${p.extra.giri === 1 ? 'giro' : 'giri'}` : ''),
    statoGioco: (ctx, s) => {
      const c = s.s.a[ctx.mio]; if (!c) return '';
      if (s.s.sem < (ctx.partita.extra ? ctx.partita.extra.verde : 2.6)) return 'Semaforo rosso…';
      if (c.f !== null) return `Arrivato! ${tempo(c.f)}`;
      return c.cm ? '⚠️ Contromano!' : `Giro ${Math.min(ctx.partita.extra.giri, c.g + 1)} di ${ctx.partita.extra.giri}`;
    },
    hud: (ctx, s) => {
      const c = s.s.a[ctx.mio], ex = ctx.partita.extra; if (!c || !ex) return '';
      const pos = s.s.cl.indexOf(ctx.mio) + 1;
      return `<span>🏁 giro ${Math.min(ex.giri, c.g + 1)}/${ex.giri}</span><span>🏅 ${pos}° di ${s.s.a.length}</span><span>⏱️ ${tempo(c.f !== null ? c.f : s.s.cr)}</span><span>${Math.round(c.v / 6)} km/h</span>${s.s.fine !== null ? `<span style="color:#ffb074">fine tra ${s.s.fine} s</span>` : ''}${touch() ? '' : `<button type="button" class="cor-bt cor-hud" data-az="cor-vista">🎥 ${vistaAdesso() === 'tutta' ? 'segui la macchina' : 'tutta la pista'}</button>`}`;
    },
    fineRound: (p, s, ctx) => { const pos = s.s.cl.indexOf(ctx.mio) + 1; return `Sei arrivato ${pos}°`; },
    sopra: (ctx) => {
      if (!corre(ctx)) return '';
      const cam = `<button type="button" class="cor-bt cor-vista" data-az="cor-vista" aria-label="Cambia vista">🎥</button>`;
      if (!touch()) return '';
      const modoBt = `<button type="button" class="cor-bt cor-modo" data-az="cor-modo" aria-label="Cambia comandi">🕹️ ${modo === 'dito' ? 'dito' : 'pulsanti'}</button>`;
      if (modo === 'dito') return `<div class="cor-strato">${cam}${modoBt}<div class="cor-dito" data-cs="dito"><span>⟵ trascina il dito per sterzare ⟶</span></div><div class="cor-destra"><button type="button" class="cor-bt cor-grande" data-cs="ArrowDown">🛑</button></div></div>`;
      return `<div class="cor-strato">${cam}${modoBt}<div class="cor-sinistra"><button type="button" class="cor-bt cor-grande" data-cs="ArrowLeft">◀</button><button type="button" class="cor-bt cor-grande" data-cs="ArrowRight">▶</button></div><div class="cor-destra"><button type="button" class="cor-bt cor-grande" data-cs="ArrowDown">🛑</button><button type="button" class="cor-bt cor-grande cor-gas" data-cs="ArrowUp">⏫</button></div></div>`;
    },
    clic(ctx, el) {
      if (el.dataset.az === 'cor-vista') { vista = vistaAdesso() === 'tutta' ? 'segui' : 'tutta'; mem.set('corsaVista', vista); }
      if (el.dataset.az === 'cor-modo') {
        modo = modo === 'dito' ? 'pulsanti' : 'dito'; mem.set('corsaComandi', modo);
        attivaGasDito(modo === 'dito');
        const so = document.querySelector('.ar-sopra'); if (so) so._html = null;
      }
    },
    dopoTick(ctx, d, prima) {
      ctxC = ctx;
      if (modo === 'dito' && touch() && !gasDito && corre(ctx) && !premuti.size) attivaGasDito(true);
      for (const [x, y] of d.s.u || []) { scintille.push({ x, y, t: performance.now() }); suono([[140 + Math.random() * 60, 0.07]], { tipo: 'square', volume: 0.05 }); }
      const ex = ctx.partita.extra; if (!ex) return;
      const fase = d.s.sem >= ex.verde ? 4 : Math.min(3, Math.floor(d.s.sem / (ex.verde / 3.5)));
      if (fase !== ultimoSem && d.fase === 'gioco') { if (fase >= 1 && fase <= 3) suono([[440, 0.18]], { volume: 0.07 }); if (fase === 4 && ultimoSem !== 4) suono([[880, 0.4]], { volume: 0.08 }); ultimoSem = fase; }
      const c = d.s.a[ctx.mio], c0 = prima && prima.s && prima.s.a && prima.s.a[ctx.mio];
      if (c && c0 && c.g > c0.g && c.f === null && c.g > 0) suono([[660, 0.08], [990, 0.12]], { volume: 0.06 });
      if (c && c0 && c.f !== null && c0.f === null) suono([[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.3]], { volume: 0.08 });
    },
    disegna(g, p, s, prima, u, ctx) {
      const ex = p.extra; if (!ex || !s.s || !s.s.a) return;
      const k = ex.pista + ex.larga;
      if (chiaveGeo !== k) { geo = preparaGeo(ex); chiaveGeo = k; segni = []; }
      const W = p.W, H = p.H, sc = (g.canvas.clientWidth || W) / W, px = 1 / Math.max(0.35, sc);
      // posizioni interpolate
      const pm = prima && prima.s && prima.s.a ? prima.s.a : null;
      const auto = s.s.a.map((c, i) => {
        const a0 = pm && pm[i];
        if (!a0 || Math.hypot(a0.x - c.x, a0.y - c.y) > 80) return c;
        let da = c.r - a0.r; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        return { ...c, x: a0.x + (c.x - a0.x) * u, y: a0.y + (c.y - a0.y) * u, r: a0.r + da * u };
      });
      const mia = auto[ctx.mio] || auto[0];
      // telecamera
      const [bx0, by0, bx1, by1] = geo.box;
      const scalaTutta = Math.min(W / (bx1 - bx0), H / (by1 - by0));
      const tutta = vistaAdesso() === 'tutta';
      let z, cx, cy;
      if (tutta) { z = scalaTutta; cx = (bx0 + bx1) / 2; cy = (by0 + by1) / 2; cam = null; }
      else {
        z = Math.max(scalaTutta, (Math.min(W, H) / 900) * (sc < 0.5 ? 1.15 : 1));
        // si guarda un po' avanti nella direzione in cui si va
        const tx = mia.x + Math.cos(mia.r) * Math.min(160, mia.v * 0.25), ty = mia.y + Math.sin(mia.r) * Math.min(160, mia.v * 0.25);
        if (!cam || Math.hypot(cam[0] - tx, cam[1] - ty) > 500) cam = [tx, ty]; else { cam[0] += (tx - cam[0]) * 0.15; cam[1] += (ty - cam[1]) * 0.15; }
        [cx, cy] = cam;
      }
      g.fillStyle = '#3f8f3a'; g.fillRect(0, 0, W, H);
      g.save(); g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-cx, -cy);
      // erba a strisce
      g.fillStyle = 'rgba(255,255,255,.05)';
      for (let x = Math.floor((cx - W / 2 / z) / 120) * 120; x < cx + W / 2 / z; x += 240) g.fillRect(x, cy - H / 2 / z, 120, H / z);
      disegnaPista(g, ex, geo);
      // segni delle gomme
      const ora = performance.now();
      segni = segni.filter((x) => ora - x.t < 4000).slice(-400);
      g.fillStyle = 'rgba(20,20,20,.35)';
      for (const m of segni) { g.save(); g.translate(m.x, m.y); g.rotate(m.a); g.globalAlpha = 1 - (ora - m.t) / 4000; g.fillRect(-3, -11, 6, 4); g.fillRect(-3, 7, 6, 4); g.restore(); }
      g.globalAlpha = 1;
      // macchine (la mia sopra)
      const ordine = auto.slice().sort((a, b) => (a.id === ctx.mio) - (b.id === ctx.mio));
      for (const c of ordine) {
        macchina(g, c.x, c.y, c.r, COLORI[c.id % COLORI.length], c.id === ctx.mio, c.d && c.v > 120, false);
        const nome = c.id === ctx.mio ? 'Tu' : ctx.nome(c.id).slice(0, 9);
        g.font = `700 ${Math.round(12 * px / z)}px system-ui, sans-serif`; g.textAlign = 'center'; g.lineWidth = 3 / z * px; g.strokeStyle = 'rgba(0,0,0,.7)';
        g.strokeText(nome, c.x, c.y - 26); g.fillStyle = c.id === ctx.mio ? '#fff' : COLORI[c.id % COLORI.length]; g.fillText(nome, c.x, c.y - 26);
      }
      // alberi sopra le macchine (ombre comprese)
      for (const a of geo.alberi) {
        if (Math.abs(a.x - cx) > W / 2 / z + 80 || Math.abs(a.y - cy) > H / 2 / z + 80) continue;
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(a.x + 8, a.y + 10, a.r, 0, Math.PI * 2); g.fill();
        g.fillStyle = a.t > 0.5 ? '#2c6e2a' : '#357a2f'; g.beginPath(); g.arc(a.x, a.y, a.r, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(a.x - a.r * 0.3, a.y - a.r * 0.3, a.r * 0.45, 0, Math.PI * 2); g.fill();
      }
      scintille = scintille.filter((x) => ora - x.t < 300);
      for (const x of scintille) { const t = (ora - x.t) / 300; g.strokeStyle = `rgba(255,230,120,${1 - t})`; g.lineWidth = 3; for (let j = 0; j < 6; j++) { const an = j * 1.05; g.beginPath(); g.moveTo(x.x + Math.cos(an) * 6, x.y + Math.sin(an) * 6); g.lineTo(x.x + Math.cos(an) * (12 + t * 18), x.y + Math.sin(an) * (12 + t * 18)); g.stroke(); } }
      g.restore();
      // classifica dal vivo (in alto a sinistra)
      const fs = 11 * px, riga = fs * 1.4;
      g.fillStyle = 'rgba(15,20,30,.62)'; g.fillRect(8, 8, fs * 9.5, riga * s.s.cl.length + fs * 0.7);
      s.s.cl.forEach((id, n) => {
        const c = s.s.a[id];
        g.font = `${id === ctx.mio ? 800 : 600} ${fs}px system-ui, sans-serif`; g.textAlign = 'left';
        g.fillStyle = COLORI[id % COLORI.length]; g.fillText(`${n + 1}. ${id === ctx.mio ? 'Tu' : ctx.nome(id).slice(0, 8)}`, 8 + fs * 0.5, 8 + riga * (n + 1));
        g.textAlign = 'right'; g.fillStyle = '#fff'; g.fillText(c.f !== null ? '🏁' : `${Math.min(ex.giri, c.g + 1)}/${ex.giri}`, 8 + fs * 9, 8 + riga * (n + 1));
      });
      // mappa piccola quando si segue la macchina
      if (!tutta) {
        const mw = Math.min(W * 0.3, 95 * px), ms = mw / (bx1 - bx0), mh = (by1 - by0) * ms, mx = W - mw - 10, my = touch() ? 10 + 40 * px : 10;
        g.fillStyle = 'rgba(15,20,30,.5)'; g.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
        g.save(); g.translate(mx - bx0 * ms, my - by0 * ms); g.scale(ms, ms);
        percorso(g, geo.C, 0); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = Math.max(ex.larga * 0.6, 3 / ms); g.stroke();
        for (const c of auto) { g.fillStyle = c.id === ctx.mio ? '#fff' : COLORI[c.id % COLORI.length]; g.beginPath(); g.arc(c.x, c.y, (c.id === ctx.mio ? 5 : 3.5) / ms, 0, Math.PI * 2); g.fill(); }
        g.restore();
      }
      semaforo(g, W, s.s.sem, ex, px);
      if (s.s.a[ctx.mio] && s.s.a[ctx.mio].cm) { g.fillStyle = '#ffdd33'; g.font = `800 ${Math.round(22 * px)}px system-ui, sans-serif`; g.textAlign = 'center'; g.fillText('⚠️ CONTROMANO', W / 2, H * 0.3); }
    },
  });
  function vistaAdesso() {
    if (vista) return vista;
    const tela = document.querySelector('.ar-tela');
    return tela && tela.clientWidth >= 820 ? 'tutta' : 'segui';
  }
  const tempo = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
  // il campo prende la forma dello schermo: in verticale sul telefono è alto, sul computer è largo
  function adatta(ctx) {
    const p = ctx.partita; if (!p || p.gioco !== 'corsa') return;
    const verticale = window.innerHeight > window.innerWidth;
    p.W = verticale ? 700 : 1000; p.H = verticale ? 900 : 640;
  }
  const reset0 = tavolo.reset, tick0 = tavolo.tick;
  tavolo.reset = (ctx) => { adatta(ctx); if (!corre(ctx) || modo !== 'dito') attivaGasDito(false); if (ctx.partita.stato && ctx.partita.stato.fase === 'via') { cam = null; segni = []; ultimoSem = -1; } reset0.call(tavolo, ctx); };
  tavolo.tick = function (ctx, d) { adatta(ctx); return tick0.call(this, ctx, d); };

  // ---------- la pista disegnata ----------
  const inDisegno = (p) => !!(p && p.extra && p.extra.disegno);
  const ricevuto = new WeakMap();
  let tratto = null;
  const restaDisegno = (p) => Math.max(0, p.extra.resta - (Date.now() - (ricevuto.get(p) || Date.now())));
  setInterval(() => {
    const p = ctxC && ctxC.partita, el = document.querySelector('.cor-d-tempo');
    if (el && inDisegno(p)) { const s = Math.ceil(restaDisegno(p) / 1000); el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
  }, 500);
  function pannoDisegno(ctx) {
    ctxC = ctx;
    const p = ctx.partita, ex = p.extra, [MW, MH] = ex.mondo;
    if (!ricevuto.has(p)) ricevuto.set(p, Date.now());
    const mio = ctx.mio === ex.disegnatore && !ctx.stato.spettatore;
    let pista = '';
    if (ex.bozza) {
      const C = lineaDi(ex.bozza), m = ex.larga / 2;
      const d = `M${C.map((q) => `${Math.round(q.x)},${Math.round(q.y)}`).join('L')}Z`;
      const a = C[0], f = C[Math.min(C.length - 1, 14)];
      const freccia = [[f.x + f.tx * 60, f.y + f.ty * 60], [f.x - f.tx * 30 + f.nx * 40, f.y - f.ty * 30 + f.ny * 40], [f.x - f.tx * 30 - f.nx * 40, f.y - f.ty * 30 - f.ny * 40]].map((q) => q.map(Math.round).join(',')).join(' ');
      pista = `<path d="${d}" class="cor-d-bordo" stroke-width="${ex.larga + 44}"/><path d="${d}" class="cor-d-asf" stroke-width="${ex.larga}"/><path d="${d}" class="cor-d-mezzo"/>
        <line class="cor-d-via" x1="${Math.round(a.x + a.nx * m)}" y1="${Math.round(a.y + a.ny * m)}" x2="${Math.round(a.x - a.nx * m)}" y2="${Math.round(a.y - a.ny * m)}"/><polygon class="cor-d-freccia" points="${freccia}"/>`;
    }
    const nome = esc(ctx.nome(ex.disegnatore));
    const testa = mio
      ? `<b>✏️ Disegna la pista!</b> Tieni premuto e traccia un giro chiuso (si corre nel verso in cui disegni). Curve larghe, e la pista non deve toccarsi.`
      : `<b>✏️ ${nome} sta disegnando la pista…</b> ${ex.bozza ? 'Ecco la bozza.' : ''}`;
    const comandi = mio ? `<div class="cor-d-comandi">
        <button type="button" class="bottone" data-az="cor-d-caso">🎲 Pista a caso</button>
        <button type="button" class="bottone" data-az="cor-d-cancella" ${ex.bozza ? '' : 'disabled'}>🗑 Cancella</button>
        <button type="button" class="bottone primario-bt" data-az="cor-d-via" ${ex.bozza ? '' : 'disabled'}>🏁 Via! (${ex.giri} ${ex.giri === 1 ? 'giro' : 'giri'})</button></div>` : '';
    return `<div class="cor-dis">
      <p class="cor-d-testa">${testa} <span class="cor-d-resta">⏱ <b class="cor-d-tempo">${Math.ceil(restaDisegno(p) / 1000)}</b></span></p>
      <div class="cor-d-foglio ${mio ? 'mio' : ''}"><svg id="cor-d-svg" viewBox="0 0 ${MW} ${MH}" preserveAspectRatio="xMidYMid meet" aria-label="Il foglio della pista">
        <defs><pattern id="cor-d-prato" width="160" height="160" patternUnits="userSpaceOnUse"><rect width="160" height="160" fill="#4f9a45"/><rect width="80" height="80" fill="#55a14a"/><rect x="80" y="80" width="80" height="80" fill="#55a14a"/></pattern></defs>
        <rect width="${MW}" height="${MH}" fill="url(#cor-d-prato)"/>${pista}
        <polyline id="cor-d-tratto" class="cor-d-tratto" points=""/>
        ${!ex.bozza ? `<text x="${MW / 2}" y="${MH / 2}" class="cor-d-vuoto">${mio ? 'Disegna qui il giro ✏️' : 'Aspetta la pista…'}</text>` : ''}
      </svg></div>${comandi}</div>`;
  }
  function dopoDisegno(ctx) {
    const svg = document.getElementById('cor-d-svg');
    if (!svg || svg.dataset.pronto || ctx.mio !== ctx.partita.extra.disegnatore) return;
    svg.dataset.pronto = '1';
    const linea = svg.querySelector('#cor-d-tratto');
    const [MW, MH] = ctx.partita.extra.mondo;
    // coordinate del dito nel foglio (0..1), tenendo conto delle bande se il foglio non ha la stessa forma
    const punto = (e) => {
      const r = svg.getBoundingClientRect(), s = Math.min(r.width / MW, r.height / MH);
      const ox = (r.width - MW * s) / 2, oy = (r.height - MH * s) / 2;
      return [(e.clientX - r.left - ox) / (MW * s), (e.clientY - r.top - oy) / (MH * s)];
    };
    const mostra = () => { linea.setAttribute('points', (tratto || []).map((q) => `${Math.round(q[0] * MW)},${Math.round(q[1] * MH)}`).join(' ')); };
    svg.addEventListener('pointerdown', (e) => { e.preventDefault(); try { svg.setPointerCapture(e.pointerId); } catch { /* niente */ } tratto = [punto(e)]; mostra(); });
    svg.addEventListener('pointermove', (e) => {
      if (!tratto) return;
      const q = punto(e), u = tratto[tratto.length - 1];
      if (Math.hypot((q[0] - u[0]) * MW, (q[1] - u[1]) * MH) < 25) return;
      tratto.push(q); mostra();
    });
    const fine = () => {
      if (!tratto) return;
      const t = tratto; tratto = null;
      if (t.length < 10) { mostra(); return; }
      // al massimo 400 punti
      const passo = Math.ceil(t.length / 400);
      ctxC.invia({ tipo: 'traccia', punti: t.filter((_, i) => i % passo === 0).map((q) => [Math.round(q[0] * 1000) / 1000, Math.round(q[1] * 1000) / 1000]) });
      suono([[520, 0.05], [700, 0.08]], { volume: 0.04 });
    };
    svg.addEventListener('pointerup', fine);
    svg.addEventListener('pointercancel', () => { tratto = null; mostra(); });
  }
  const panno0 = tavolo.panno, dopo0 = tavolo.dopo, stato0 = tavolo.stato, tick1 = tavolo.tick, clic0 = tavolo.clic, punteggio0 = tavolo.punteggio;
  tavolo.panno = (ctx) => (inDisegno(ctx.partita) ? pannoDisegno(ctx) : panno0.call(tavolo, ctx));
  tavolo.dopo = (ctx) => (inDisegno(ctx.partita) ? dopoDisegno(ctx) : dopo0.call(tavolo, ctx));
  tavolo.stato = (ctx) => (inDisegno(ctx.partita) ? (ctx.mio === ctx.partita.extra.disegnatore ? 'Disegna la pista' : 'Si disegna la pista…') : stato0.call(tavolo, ctx));
  tavolo.punteggio = (ctx) => (inDisegno(ctx.partita) ? '<span class="obiettivo">pista da disegnare</span>' : punteggio0.call(tavolo, ctx));
  tavolo.tick = function (ctx, d) { if (d && d.fase === 'disegno') return undefined; return tick1.call(this, ctx, d); };
  tavolo.clic = (ctx, el) => {
    const az = el.dataset.az;
    if (az === 'cor-d-caso') return ctx.invia({ tipo: 'caso' });
    if (az === 'cor-d-cancella') return ctx.invia({ tipo: 'cancella' });
    if (az === 'cor-d-via') return ctx.invia({ tipo: 'via' });
    return clic0.call(tavolo, ctx, el);
  };
  Object.assign(window.Tavoli, { corsa: tavolo });
})();
