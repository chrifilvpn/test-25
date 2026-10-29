// PUTT PARTY 2D: il campo su canvas (disegnato da PuttBuche, lo stesso file del server). Le palline arrivano col tick
// e qui si interpolano per essere fluide; mulini, blocchi e cerchi che si muovono si calcolano dal tempo della buca.
// Le buche sono più grandi dello schermo: la telecamera segue la mia pallina (e guarda verso il tiro mentre miro);
// la minimappa in alto a destra mostra tutta la buca. Ogni course ha il suo tema (colori e decorazioni).
// Si tira come con una fionda: premi, trascina all'indietro, lascia. I power-up si usano coi pulsanti o 1, 2, 3.
(() => {
  const { esc, suono, primaVolta } = window.Nuovi;
  const PB = window.PuttBuche;
  let ctxA = null, tela = null;
  let ultimo = null, prima = null, arrivo = 0, primaArrivo = 0;
  let mira = null;
  const cam = { x: 0, y: 0, k: null };
  const attiva = () => ctxA && ctxA.stato && ctxA.partita && ctxA.partita.gioco === 'putt';
  const bucaDi = (rif) => (rif ? PB.COURSE[rif[0]].buche[rif[1]] : null);
  const ICONE = { turbo: '🚀', calamita: '🧲', rifai: '⏪', nebbia: '🌫️', mira: '🙈', terremoto: '🌋' };
  // colori di ogni tema: fuori dal campo, prato, strisce, muri
  const TEMI = {
    classica: { fuori: '#1b5e3a', prato: '#3fae5a', strisce: 'rgba(255,255,255,.06)', muro: ['#6b4423', '#9a6a3a'] },
    pirati: { fuori: '#1f8fb0', prato: '#57b84f', strisce: 'rgba(255,255,255,.06)', muro: ['#5a3818', '#8c5a2b'], sabbiaFuori: '#e9d39a' },
    ghiaccio: { fuori: '#cfe6f5', prato: '#eef6fb', strisce: 'rgba(120,170,210,.08)', muro: ['#7fb2d6', '#bfe0f5'] },
    giungla: { fuori: '#163d22', prato: '#4e9a3c', strisce: 'rgba(0,0,0,.05)', muro: ['#5b4a34', '#8a7354'] },
    spazio: { fuori: '#0b0d22', prato: '#3b3f6e', strisce: 'rgba(255,255,255,.04)', muro: ['#8d93b8', '#c9cfee'] },
    open: { fuori: '#2a6b3c', prato: '#45b45e', strisce: 'rgba(255,255,255,.06)', muro: ['#6b4423', '#9a6a3a'] },
  };

  function poly(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }
  function segmento(g, [x1, y1, x2, y2], w, c) { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }

  function palleOra() {
    if (!ultimo) return [];
    const u = Math.min(1, (performance.now() - arrivo) / Math.max(20, arrivo - primaArrivo || 33));
    return ultimo.palle.map((q, i) => {
      const a = prima && prima.palle[i] && prima.k === ultimo.k ? prima.palle[i] : q;
      // un salto di tubo o di acqua non si interpola
      const lontano = Math.hypot(q.x - a.x, q.y - a.y) > 140;
      return { ...q, x: lontano ? q.x : a.x + (q.x - a.x) * u, y: lontano ? q.y : a.y + (q.y - a.y) * u };
    });
  }

  // decorazioni a tema per gli ostacoli rotondi fissi (rocce)
  function roccia(g, tema, x, y, r, t) {
    if (tema === 'pirati') { // palma vista dall'alto
      g.fillStyle = '#7a5530'; g.beginPath(); g.arc(x, y, r * 0.45, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2f8f3a'; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + 0.3; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.75, r * 0.28, a, 0, Math.PI * 2); g.fill(); }
    } else if (tema === 'ghiaccio') { // blocco di ghiaccio
      g.fillStyle = '#a9d4f0'; g.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); g.fill();
      g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.stroke(); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(x - r * 0.4, y - r * 0.5, r * 0.3, r * 0.6);
    } else if (tema === 'giungla') { // statua di pietra
      g.fillStyle = '#8a8a7a'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#5f6152'; g.fillRect(x - r * 0.5, y - r * 0.15, r * 0.3, r * 0.2); g.fillRect(x + r * 0.2, y - r * 0.15, r * 0.3, r * 0.2); g.fillRect(x - r * 0.35, y + r * 0.35, r * 0.7, r * 0.15);
      g.strokeStyle = '#3e7a2e'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r * 0.95, 0.3, 1.6); g.stroke();
    } else if (tema === 'spazio') { // piccolo pianeta
      g.fillStyle = '#c7814d'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.arc(x + r * 0.3, y + r * 0.2, r * 0.3, 0, Math.PI * 2); g.fill();
    } else { g.fillStyle = '#7d7f86'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2); g.fill(); }
  }
  // i cerchi che si muovono: casse (pirati), pinguini (ghiaccio), tronchi galleggianti/scimmie (giungla), asteroidi (spazio)
  function mobile(g, tema, x, y, r, t) {
    if (tema === 'ghiaccio') { g.fillStyle = '#1d2230'; g.beginPath(); g.ellipse(x, y, r, r * 0.85, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, y + 3, r * 0.65, r * 0.6, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#f2a33a'; g.beginPath(); g.moveTo(x - 4, y - r * 0.4); g.lineTo(x + 4, y - r * 0.4); g.lineTo(x, y - r * 0.4 - 7); g.fill(); g.fillStyle = '#111'; g.fillRect(x - 6, y - r * 0.55, 3, 3); g.fillRect(x + 3, y - r * 0.55, 3, 3); }
    else if (tema === 'spazio') { g.fillStyle = '#6e6a66'; g.beginPath(); for (let k = 0; k < 9; k++) { const a = k * Math.PI * 2 / 9 + t * 0.6; g.lineTo(x + Math.cos(a) * r * (0.8 + 0.2 * ((k * 7) % 3) / 2), y + Math.sin(a) * r * (0.8 + 0.2 * ((k * 7) % 3) / 2)); } g.closePath(); g.fill(); g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(x - r * 0.3, y, r * 0.2, 0, Math.PI * 2); g.arc(x + r * 0.25, y + r * 0.3, r * 0.15, 0, Math.PI * 2); g.fill(); }
    else if (tema === 'pirati') { g.fillStyle = '#9a6a3a'; g.fillRect(x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6); g.strokeStyle = '#5a3818'; g.lineWidth = 3; g.strokeRect(x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6); g.beginPath(); g.moveTo(x - r * 0.8, y - r * 0.8); g.lineTo(x + r * 0.8, y + r * 0.8); g.stroke(); }
    else { g.fillStyle = '#7a5230'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#5a3818'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r * 0.6, 0, Math.PI * 2); g.arc(x, y, r * 0.3, 0, Math.PI * 2); g.stroke(); }
  }
  function sfondo(g, tema, b, t) {
    const T = TEMI[tema] || TEMI.classica;
    g.fillStyle = T.fuori; g.fillRect(-2000, -2000, b.W + 4000, b.H + 4000);
    if (tema === 'spazio') { g.fillStyle = 'rgba(255,255,255,.8)'; for (let k = 0; k < 220; k++) { const x = (k * 397) % (b.W + 600) - 300, y = (k * 211) % (b.H + 600) - 300; g.fillRect(x, y, k % 5 ? 1.5 : 3, k % 5 ? 1.5 : 3); } }
    else if (tema === 'pirati') { g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 3; for (let y = -200; y < b.H + 200; y += 60) { g.beginPath(); for (let x = -300; x < b.W + 300; x += 30) g.lineTo(x, y + Math.sin(x / 50 + t * 1.5) * 6); g.stroke(); } }
    else if (tema === 'ghiaccio') { g.fillStyle = 'rgba(255,255,255,.7)'; for (let k = 0; k < 120; k++) { const x = (k * 263) % (b.W + 400) - 200, y = ((k * 149) + t * 40) % (b.H + 400) - 200; g.beginPath(); g.arc(x, y, 2.5, 0, Math.PI * 2); g.fill(); } }
    else if (tema === 'giungla') { g.fillStyle = '#1f5a2d'; for (let k = 0; k < 90; k++) { const x = (k * 311) % (b.W + 400) - 200, y = (k * 173) % (b.H + 400) - 200; g.beginPath(); g.ellipse(x, y, 40, 16, k, 0, Math.PI * 2); g.fill(); } }
    else { g.fillStyle = 'rgba(255,255,255,.035)'; for (let x = -200; x < b.W + 200; x += 60) g.fillRect(x, -200, 30, b.H + 400); }
  }

  function disegnaCampo(g, b, tema, t, mini) {
    const T = TEMI[tema] || TEMI.classica;
    if (!mini) sfondo(g, tema, b, t); else { g.fillStyle = T.fuori; g.fillRect(0, 0, b.W, b.H); }
    if (T.sabbiaFuori && !mini) { poly(g, b.bordo); g.strokeStyle = T.sabbiaFuori; g.lineWidth = 60; g.stroke(); }
    poly(g, b.bordo); g.fillStyle = T.prato; g.fill();
    g.save(); poly(g, b.bordo); g.clip();
    if (!mini) { g.fillStyle = T.strisce; for (let x = 0; x < b.W; x += 50) g.fillRect(x, 0, 25, b.H); }
    const zona = (lista, colore, extra) => { for (const [x, y, w, h] of lista || []) { g.fillStyle = colore; g.beginPath(); g.roundRect(x, y, w, h, Math.min(18, w / 3, h / 3)); g.fill(); if (extra && !mini) extra(x, y, w, h); } };
    zona(b.sabbia, '#e8d08f', (x, y, w, h) => { g.fillStyle = 'rgba(160,120,50,.25)'; for (let k = 0; k < 18; k++) g.fillRect(x + ((k * 37) % w), y + ((k * 53) % h), 3, 3); });
    zona(b.neve, '#ffffff', (x, y, w, h) => { g.fillStyle = 'rgba(150,190,220,.35)'; for (let k = 0; k < 16; k++) { g.beginPath(); g.arc(x + ((k * 41) % w), y + ((k * 59) % h), 4, 0, Math.PI * 2); g.fill(); } });
    zona(b.fango, '#7a5a32', (x, y, w, h) => { g.strokeStyle = 'rgba(40,25,10,.4)'; g.lineWidth = 2; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + w / 2, y + h / 2, (k + 1) * Math.min(w, h) / 10 + (t * 6) % 8, 0, Math.PI * 2); g.stroke(); } });
    zona(b.ghiaccio, 'rgba(160,215,245,.85)', (x, y, w, h) => { g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(x + ((k * 97) % w), y + ((k * 61) % h)); g.lineTo(x + ((k * 97) % w) + 30, y + ((k * 61) % h) + 12); g.stroke(); } });
    for (const [x, y, w, h] of b.acqua || []) {
      g.fillStyle = tema === 'spazio' ? '#05060f' : tema === 'ghiaccio' ? '#2b5f8c' : '#2f7fd8'; g.fillRect(x, y, w, h);
      if (!mini) { g.strokeStyle = tema === 'spazio' ? 'rgba(160,140,255,.25)' : 'rgba(255,255,255,.35)'; g.lineWidth = 2; for (let yy = y + 14; yy < y + h; yy += 18) { g.beginPath(); for (let xx = x; xx <= x + w; xx += 8) g.lineTo(xx, yy + Math.sin(xx / 14 + t * 2) * 3); g.stroke(); } }
    }
    for (const h of b.buchiNeri || []) { const gr = g.createRadialGradient(h.x, h.y, 4, h.x, h.y, h.r); gr.addColorStop(0, '#000'); gr.addColorStop(0.15, '#1a0630'); gr.addColorStop(0.6, 'rgba(90,40,160,.35)'); gr.addColorStop(1, 'rgba(90,40,160,0)'); g.fillStyle = gr; g.beginPath(); g.arc(h.x, h.y, h.r, 0, Math.PI * 2); g.fill();
      if (!mini) { g.strokeStyle = 'rgba(200,170,255,.5)'; g.lineWidth = 2; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(h.x, h.y, h.r * (0.3 + k * 0.22), t * (1.5 + k) , t * (1.5 + k) + 2); g.stroke(); } } }
    // rampe: frecce nella direzione del salto
    for (const r of b.rampe || []) { const [x, y, w, h] = r.r; g.fillStyle = '#c98b3a'; g.fillRect(x, y, w, h); if (!mini) { g.fillStyle = '#f6d28a'; g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(r.a); for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(-14 + k * 22, -20); g.lineTo(6 + k * 22, 0); g.lineTo(-14 + k * 22, 20); g.lineTo(-6 + k * 22, 0); g.fill(); } g.restore(); } }
    g.restore();
    for (const s of PB.segmentiFissi(b)) { segmento(g, s, mini ? 10 : 14, T.muro[0]); if (!mini) segmento(g, s, 7, T.muro[1]); }
    for (const s of b.muretti || []) { segmento(g, s, 8, '#b08a5a'); if (!mini) segmento(g, s, 3, '#e3c89a'); }
    for (const [x, y, r] of b.respingenti || []) {
      g.fillStyle = tema === 'spazio' ? '#d65ab8' : '#d64541'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      if (!mini) { g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r * 0.65, 0, Math.PI * 2); g.stroke(); }
    }
    for (const [x, y, r] of b.rocce || []) roccia(g, tema, x, y, r, t);
    for (const [x, y, r] of PB.mobiliAl(b, t)) mobile(g, tema, x, y, r, t);
    for (const m of b.mulini || []) { g.fillStyle = '#6b4423'; g.beginPath(); g.arc(m.x, m.y, 10, 0, Math.PI * 2); g.fill(); }
    for (const r of b.scorrevoli || []) { const [x, y, w, h] = PB.rettScorrevole(r, t); g.fillStyle = tema === 'ghiaccio' ? '#f4f9fd' : '#8e55c9'; g.fillRect(x, y, w, h); g.strokeStyle = tema === 'ghiaccio' ? '#9cc4e0' : '#5b2f8f'; g.lineWidth = 2; g.strokeRect(x, y, w, h); }
    for (const s of PB.segmentiMobili({ mulini: b.mulini }, t)) { segmento(g, s, 12, '#7a2a20'); if (!mini) segmento(g, s, 6, '#e05a47'); }
    // tubi: entrata e uscita, e il tubo che passa sotto (tratteggiato)
    for (const tu of b.tubi || []) {
      g.setLineDash([16, 12]); segmento(g, [tu.a[0], tu.a[1], tu.b[0], tu.b[1]], 10, 'rgba(60,60,70,.35)'); g.setLineDash([]);
      for (const [p, c] of [[tu.a, '#2a2d35'], [tu.b, '#5d6270']]) { g.fillStyle = '#9aa3b0'; g.beginPath(); g.arc(p[0], p[1], PB.R_TUBO + 5, 0, Math.PI * 2); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(p[0], p[1], PB.R_TUBO, 0, Math.PI * 2); g.fill(); }
    }
    // buca e bandierina
    const [bx, by] = b.buca;
    g.fillStyle = '#111'; g.beginPath(); g.arc(bx, by, mini ? 22 : PB.R_BUCA, 0, Math.PI * 2); g.fill();
    if (!mini) { g.strokeStyle = '#ddd'; g.lineWidth = 2; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx, by - 46); g.stroke(); g.fillStyle = '#e0473c'; g.beginPath(); g.moveTo(bx, by - 46); g.lineTo(bx + 24, by - 39); g.lineTo(bx, by - 32); g.fill(); }
    else { g.fillStyle = '#e0473c'; g.fillRect(bx - 6, by - 70, 50, 34); }
  }

  function disegna() {
    if (!attiva() || !tela || !tela.isConnected || !ultimo) return;
    const p = ctxA.partita;
    if (p.buca == null) return;
    const b = bucaDi(p.buca), tema = PB.COURSE[p.buca[0]].tema;
    const box = tela.parentElement;
    // il riquadro: largo come lo spazio, alto in proporzione (16:10), e mostra al massimo 1100 × 690 del campo
    // sul telefono in orizzontale l'altezza si misura da dove comincia il campo (con un numero fisso usciva di sotto)
    const sdraiato = window.Arena.touch() && window.innerWidth > window.innerHeight && window.innerHeight <= 520;
    const libera = sdraiato ? window.innerHeight - Math.max(0, box.getBoundingClientRect().top + (window.scrollY || 0)) - 16 : window.innerHeight - 270;
    const largo = box.clientWidth, alto = Math.max(sdraiato ? 180 : 240, Math.min(libera, Math.round(largo * 0.62)));
    const dpr = window.devicePixelRatio || 1;
    if (tela.width !== Math.round(largo * dpr) || tela.height !== Math.round(alto * dpr)) { tela.width = Math.round(largo * dpr); tela.height = Math.round(alto * dpr); tela.style.width = `${largo}px`; tela.style.height = `${alto}px`; }
    const scala = Math.max(largo / 1100, alto / 690, Math.min(largo / b.W, alto / b.H));
    const vw = largo / scala, vh = alto / scala;
    const g = tela.getContext('2d');
    const t = ultimo.pausa ? ultimo.t : ultimo.t + (performance.now() - arrivo) / 1000;
    const palle = palleOra(), mia = palle[ctxA.mio];
    // telecamera: segue la mia pallina (se sono in buca, la bandierina); mentre miro guarda verso il tiro
    let cx = mia && !mia.d ? mia.x : b.buca[0], cy = mia && !mia.d ? mia.y : b.buca[1];
    if (mira && mira.len > 0) { cx += Math.cos(mira.a) * mira.f * vw * 0.3; cy += Math.sin(mira.a) * mira.f * vh * 0.3; }
    cx = vw >= b.W ? b.W / 2 : Math.max(vw / 2, Math.min(b.W - vw / 2, cx)); cy = vh >= b.H ? b.H / 2 : Math.max(vh / 2, Math.min(b.H - vh / 2, cy));
    if (cam.k !== ultimo.k) { cam.x = cx; cam.y = cy; cam.k = ultimo.k; } else { cam.x += (cx - cam.x) * 0.15; cam.y += (cy - cam.y) * 0.15; }
    g.setTransform(dpr * scala, 0, 0, dpr * scala, dpr * (largo / 2 - cam.x * scala), dpr * (alto / 2 - cam.y * scala));
    disegnaCampo(g, b, tema, t, false);
    // partenza
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath(); g.arc(b.partenza[0], b.partenza[1], 14, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    // scatole dei power-up (quelle che ho già preso sono vuote)
    const prese = (ultimo.palle[ctxA.mio] && ultimo.palle[ctxA.mio].pr) || [];
    (b.pu || []).forEach(([x, y], k) => {
      const presa = prese.includes(k), su = Math.sin(t * 3 + k) * 3;
      g.globalAlpha = presa ? 0.3 : 1;
      g.fillStyle = '#f2c230'; g.fillRect(x - 13, y - 13 + su, 26, 26); g.fillStyle = '#e0473c'; g.fillRect(x - 3, y - 13 + su, 6, 26); g.fillRect(x - 13, y - 3 + su, 26, 6);
      if (!presa) { g.fillStyle = '#fff'; g.font = '700 16px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('?', x, y - 18 + su); }
      g.globalAlpha = 1;
    });
    // palline: prima gli altri (trasparenti), poi la mia; in volo sono più grandi e hanno l'ombra lontana
    const ordine = palle.map((_, i) => i).filter((i) => i !== ctxA.mio).concat([ctxA.mio]);
    for (const i of ordine) {
      const q = palle[i];
      if (!q || q.d || p.usciti[i]) continue;
      const z = q.z || 0, rr = PB.R_PALLA * (1 + z * 0.6);
      g.globalAlpha = i === ctxA.mio ? 1 : 0.55;
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.arc(q.x + 2 + z * 14, q.y + 3 + z * 18, PB.R_PALLA, 0, Math.PI * 2); g.fill();
      g.fillStyle = p.colori[i % p.colori.length]; g.beginPath(); g.arc(q.x, q.y - z * 10, rr, 0, Math.PI * 2); g.fill();
      g.strokeStyle = i === ctxA.mio ? '#1f2430' : 'rgba(0,0,0,.4)'; g.lineWidth = i === ctxA.mio ? 2.5 : 1.5; g.stroke();
      if (q.tb || q.cm) { g.strokeStyle = q.tb ? '#ff7a1a' : '#5fd3ff'; g.lineWidth = 2; g.beginPath(); g.arc(q.x, q.y, rr + 5 + Math.sin(t * 8) * 2, 0, Math.PI * 2); g.stroke(); }
      g.fillStyle = '#fff'; g.font = '600 13px system-ui, sans-serif'; g.textAlign = 'center';
      if (i === ctxA.mio || !mia || Math.hypot(q.x - mia.x, q.y - mia.y) > 26) g.fillText(i === ctxA.mio ? 'Tu' : ctxA.nome(i).slice(0, 8), q.x, q.y - 14 - z * 10);
      g.globalAlpha = 1;
    }
    // la mira: freccia dalla mia pallina (niente freccia se qualcuno mi ha nascosto la mira)
    const io = ultimo.palle[ctxA.mio] || {};
    if (mira && mira.len > 0 && mia) {
      const f = mira.f, a = mira.a, col = `hsl(${120 - f * 120} 85% 55%)`;
      if (!io.ci) {
        const lung = 30 + f * 230, ex = mia.x + Math.cos(a) * lung, ey = mia.y + Math.sin(a) * lung;
        g.strokeStyle = col; g.lineWidth = 5; g.setLineDash([10, 7]); g.beginPath(); g.moveTo(mia.x, mia.y); g.lineTo(ex, ey); g.stroke(); g.setLineDash([]);
        g.fillStyle = col; g.beginPath(); g.moveTo(ex + Math.cos(a) * 14, ey + Math.sin(a) * 14); g.lineTo(ex + Math.cos(a + 2.5) * 12, ey + Math.sin(a + 2.5) * 12); g.lineTo(ex + Math.cos(a - 2.5) * 12, ey + Math.sin(a - 2.5) * 12); g.fill();
        g.fillStyle = '#fff'; g.font = '700 15px system-ui, sans-serif'; g.fillText(`${Math.round(f * 100)}%${io.tb ? ' 🚀' : ''}`, ex, ey - 16);
      } else { g.fillStyle = '#fff'; g.font = '700 15px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText(`🙈 ${Math.round(f * 100)}%`, mia.x, mia.y - 30); }
    }
    // nebbia: vedo solo intorno alla mia pallina
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (io.nb && mia) {
      const sx = largo / 2 + (mia.x - cam.x) * scala, sy = alto / 2 + (mia.y - cam.y) * scala, rg = 140 * scala;
      const gr = g.createRadialGradient(sx, sy, rg * 0.5, sx, sy, rg * 1.4); gr.addColorStop(0, 'rgba(210,215,225,0)'); gr.addColorStop(1, 'rgba(210,215,225,.97)');
      g.fillStyle = gr; g.fillRect(0, 0, largo, alto);
      g.fillStyle = '#334'; g.font = '700 14px system-ui, sans-serif'; g.textAlign = 'left'; g.fillText(`🌫️ Nebbia: ${io.nb} s`, 10, alto - 12);
    }
    // minimappa in alto a destra (non con la nebbia)
    if (!io.nb && (b.W > vw + 10 || b.H > vh + 10)) {
      const mw = Math.min(largo * 0.3, 190), mk = mw / b.W, mh = b.H * mk, mx = largo - mw - 8, my = 8;
      g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(mx - 3, my - 3, mw + 6, mh + 6);
      g.save(); g.translate(mx, my); g.scale(mk, mk); disegnaCampo(g, b, tema, t, true);
      palle.forEach((q, i) => { if (!q || q.d || p.usciti[i]) return; g.fillStyle = p.colori[i % p.colori.length]; g.beginPath(); g.arc(q.x, q.y, (i === ctxA.mio ? 34 : 24), 0, Math.PI * 2); g.fill(); if (i === ctxA.mio) { g.strokeStyle = '#000'; g.lineWidth = 8; g.stroke(); } });
      g.strokeStyle = '#fff'; g.lineWidth = 2 / mk; g.strokeRect(cam.x - vw / 2, cam.y - vh / 2, vw, vh);
      g.restore();
    }
    // scritte
    let scritta = '';
    if (ultimo.pausa) scritta = '⏸ In pausa';
    else if (ultimo.fase === 'via') scritta = `${PB.COURSE[p.buca[0]].nome} · ${b.nome}`;
    else if (ultimo.fase === 'fineBuca') scritta = 'Buca finita!';
    if (scritta) {
      g.fillStyle = 'rgba(10,25,18,.6)'; g.fillRect(0, alto / 2 - 40, largo, 80);
      g.fillStyle = '#fff'; g.font = `400 ${Math.max(18, Math.min(38, largo / 22))}px "Young Serif", Georgia, serif`; g.textAlign = 'center'; g.fillText(scritta, largo / 2, alto / 2 + 12);
    }
  }
  (function ciclo() { try { disegna(); } catch (e) { /* un frame perso non ferma il gioco */ } requestAnimationFrame(ciclo); })();

  // ---------- tiro a fionda ----------
  function puoTirare() {
    const u = ultimo;
    if (!attiva() || !u || u.fase !== 'buca' || u.pausa || ctxA.partita.finita) return false;
    const q = u.palle[ctxA.mio];
    return q && !q.d && !q.m;
  }
  function aggiornaMira(e) {
    const r = tela.getBoundingClientRect();
    const dx = e.clientX - mira.x0, dy = e.clientY - mira.y0;
    mira.len = Math.hypot(dx, dy);
    mira.a = Math.atan2(-dy, -dx);
    mira.f = Math.min(1, mira.len / (Math.min(r.width, r.height * 1.6) * 0.32));
  }
  document.addEventListener('pointerdown', (e) => {
    if (!tela || e.target !== tela || !puoTirare()) return;
    e.preventDefault();
    try { tela.setPointerCapture(e.pointerId); } catch {}
    mira = { x0: e.clientX, y0: e.clientY, len: 0, a: 0, f: 0, id: e.pointerId };
  });
  document.addEventListener('pointermove', (e) => { if (mira && e.pointerId === mira.id) aggiornaMira(e); });
  document.addEventListener('pointerup', (e) => {
    if (!mira || e.pointerId !== mira.id) return;
    aggiornaMira(e);
    const m = mira; mira = null;
    if (m.len < 12 || !puoTirare()) return;
    ctxA.emetti('input', { t: 'tiro', a: m.a, f: m.f });
    suono([[240 + m.f * 200, 0.05]], { tipo: 'triangle', volume: 0.08 });
  });
  document.addEventListener('pointercancel', () => { mira = null; });

  // ---------- power-up: pulsanti sotto il campo e tasti 1, 2, 3 ----------
  function usaPotere(i) {
    if (!attiva() || !ultimo || ultimo.fase !== 'buca' || ultimo.pausa) return;
    const tasca = (ultimo.poteri || [])[ctxA.mio] || [];
    if (i >= tasca.length) return;
    ctxA.emetti('input', { t: 'usa', i });
    suono([[520, 0.05], [780, 0.07]], { volume: 0.08 });
  }
  document.addEventListener('keydown', (e) => {
    if (!attiva() || e.target.closest('input, textarea, select')) return;
    if (['1', '2', '3'].includes(e.key)) { usaPotere(Number(e.key) - 1); e.preventDefault(); }
  });
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-potere]'); if (b && attiva()) usaPotere(Number(b.dataset.potere)); });
  function disegnaPoteri() {
    const box = document.querySelector('.pt-poteri');
    if (!box || !ultimo) return;
    const tasca = (ultimo.poteri || [])[ctxA.mio] || [], nomi = ctxA.partita.nomiPoteri || {};
    const html = tasca.length ? tasca.map((t, i) => `<button type="button" class="bottone pt-potere" data-potere="${i}" title="${esc(nomi[t] || t)} (tasto ${i + 1})">${ICONE[t] || '🎁'} ${esc(nomi[t] || t)} <small>${i + 1}</small></button>`).join('') : '<span class="piccolo">Power-up: passa sulle scatole 🎁 per prenderne (al massimo 3)</span>';
    if (box.dataset.ultimo !== html) { box.innerHTML = html; box.dataset.ultimo = html; }
  }

  function tabellino(ctx) {
    const p = ctx.partita;
    const buche = p.ordine.map((rif) => bucaDi(rif));
    return `<div class="tabella-scorre"><table class="conti pt-tab"><thead><tr><th></th>${buche.map((b, k) => `<th class="${k === p.k && !p.finita ? 'ora' : ''}" title="${esc(b.nome)}">${k + 1}</th>`).join('')}<th>Tot</th></tr>
      <tr class="par"><th>par</th>${buche.map((b) => `<td>${b.par}</td>`).join('')}<td>${buche.reduce((s, b) => s + b.par, 0)}</td></tr></thead>
      <tbody>${Array.from({ length: p.n }, (_, i) => `<tr class="${i === ctx.mio ? 'mia' : ''}"><th><i style="background:${p.colori[i % p.colori.length]}"></i>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))}</th>${buche.map((b, k) => { const c = p.colpi[i][k]; return `<td class="${c == null ? '' : c < b.par ? 'sotto' : c > b.par ? 'sopra' : ''}">${c == null ? '' : c}</td>`; }).join('')}<td><b>${p.totali[i]}</b></td></tr>`).join('')}</tbody></table></div>`;
  }

  const tavolo = {
    libero: true,
    senzaFila: true,
    reset(ctx) {
      ctxA = ctx;
      const d = ctx.partita.stato;
      if (!ultimo || ultimo.k !== d.k || ultimo.fase !== d.fase) { prima = null; ultimo = d; arrivo = performance.now(); primaArrivo = arrivo - 33; }
      if (!tela) { tela = document.createElement('canvas'); tela.className = 'pt-tela'; tela.setAttribute('aria-label', 'Campo da minigolf'); }
    },
    tick(ctx, d) {
      ctxA = ctx;
      prima = ultimo; ultimo = d; primaArrivo = arrivo; arrivo = performance.now();
      const mio = d.palle[ctx.mio];
      const info = document.querySelector('.pt-info');
      if (info && mio) info.innerHTML = d.fase === 'buca' ? `Colpi in questa buca: <b>${mio.c}</b>${mio.d ? ' · ⛳ in buca!' : mio.m ? '' : ' · tocca e trascina per tirare'}${mio.ci ? ' · 🙈 mira nascosta' : ''}${mio.tb ? ' · 🚀 turbo pronto' : ''}${mio.cm ? ' · 🧲 calamita pronta' : ''} · ${Math.ceil(d.resta / 1000)} s` : '';
      disegnaPoteri();
      if (mio && mio.d && prima && prima.palle[ctx.mio] && !prima.palle[ctx.mio].d && prima.k === d.k) suono([[660, 0.08], [880, 0.08], [1046, 0.15]], { volume: 0.09 });
    },
    panno(ctx) {
      const p = ctx.partita;
      const b = p.buca != null ? bucaDi(p.buca) : null;
      // numero della buca dentro la course e numero della course
      const nc = p.buca ? p.course.indexOf(p.buca[0]) : -1, nb = p.buca ? p.ordine.slice(0, p.k + 1).filter((r) => r[0] === p.buca[0]).length : 0;
      return `<div class="pt">
        ${b ? `<p class="pa-round">${esc(PB.COURSE[p.buca[0]].nome)}${p.course.length > 1 ? ` (course ${nc + 1} di ${p.course.length})` : ''} · buca ${nb} di ${PB.COURSE[p.buca[0]].fisse ? PB.COURSE[p.buca[0]].buche.length : PB.BUCHE_PER_COURSE} · ${esc(b.nome)} · par ${b.par}</p>` : ''}
        <div class="pt-box"></div>
        <div class="pt-poteri"></div>
        <p class="pt-info piccolo"></p>
        ${tabellino(ctx)}
      </div>`;
    },
    dopo() { const box = document.querySelector('.pt-box'); if (box && tela && tela.parentElement !== box) box.append(tela); const pt = document.querySelector('.pt-poteri'); if (pt) pt.dataset.ultimo = ''; disegnaPoteri(); },
    stato(ctx) {
      const p = ctx.partita, u = ultimo || p.stato;
      if (p.finita) return null;
      if (u.pausa) return 'In pausa';
      if (u.fase === 'via') return 'Si parte…';
      if (u.fase === 'fineBuca') return 'Buca finita';
      const mio = u.palle[ctx.mio];
      return mio && mio.d ? 'In buca! Aspetta gli altri' : 'Tira quando vuoi';
    },
    punteggio(ctx) {
      const p = ctx.partita;
      return p.totali.map((x, i) => `<span>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x}</b></span>`).join('') + '<span class="obiettivo">vince chi fa meno colpi</span>';
    },
    infoPosto(ctx, posto) { return `${ctx.partita.totali[posto]} colpi`; },
    clic() {},
  };
  Object.assign(window.Tavoli, { putt: tavolo });
})();
