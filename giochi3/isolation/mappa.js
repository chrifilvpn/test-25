// ALIEN: ISOLATION 3D — la stazione Sevastopol (un settore): stanze, corridoi, porte, armadietti, scrivanie, condotti,
// generatori, oggetti e luci. Il file serve sia al server sia al browser (lo stesso movimento, gli stessi muri):
// nel browser si carica da /js/isolation-mappa.js e si trova in window.IsolationMappa.
// Unità: il decimetro (un quadretto è 25 dm = 2,5 m, il soffitto è a 32 dm). La griglia è COLS × RIGHE quadretti.
(function (radice) {
  const T = 25, COLS = 48, RIGHE = 33, SOFFITTO = 32;

  // le stanze (interni, estremi compresi) con lo stile che decide arredi, luci e musica nel browser
  const STANZE = [
    { id: 'atrio', nome: 'Atrio · Sevastopol Spaceflight', x0: 2, y0: 12, x1: 11, y1: 19, stile: 'atrio', luce: 0.55 },
    { id: 'medicina', nome: 'San Cristobal · Medicina', x0: 2, y0: 2, x1: 12, y1: 8, stile: 'medico', luce: 0.35 },
    { id: 'seegson', nome: 'Seegson Synthetics · Uffici', x0: 17, y0: 2, x1: 30, y1: 9, stile: 'uffici', luce: 0.45 },
    { id: 'comunicazioni', nome: 'Torre Solomons · Comunicazioni', x0: 34, y0: 2, x1: 44, y1: 9, stile: 'comunicazioni', luce: 0.4 },
    { id: 'ingegneria', nome: 'Ingegneria · Reattore', x0: 2, y0: 23, x1: 13, y1: 31, stile: 'ingegneria', luce: 0.25 },
    { id: 'alloggi', nome: 'Habitation · Mensa', x0: 17, y0: 21, x1: 29, y1: 30, stile: 'alloggi', luce: 0.35 },
    { id: 'manutenzione', nome: 'Manutenzione · Gemini', x0: 33, y0: 21, x1: 38, y1: 30, stile: 'manutenzione', luce: 0.12 },
    { id: 'attracco', nome: 'Attracco del Torrens', x0: 41, y0: 11, x1: 46, y1: 20, stile: 'attracco', luce: 0.5 },
  ];
  // i corridoi (rettangoli scavati); dove toccano una stanza c'è una porta
  const CORRIDOI = [
    [12, 15, 40, 16], // il corridoio principale (largo due)
    [6, 9, 6, 11], [23, 10, 24, 14], [39, 10, 39, 14], [7, 20, 7, 22], [23, 17, 24, 20], [35, 17, 35, 20],
    [13, 5, 16, 5], [31, 6, 33, 6], [14, 28, 16, 28], [30, 24, 32, 24],
  ];
  // porte bloccate finché non tornano tutti e tre i generatori (l'uscita verso il Torrens)
  const BLOCCATE = ['40,15', '40,16'];
  // gli oggetti: L armadietto, T scrivania o letto (ci si passa sotto solo accucciati), m terminale, c cassa,
  // G generatore, V grata del condotto, b batteria, f carburante, r razzo di segnalazione, S partenza, E uscita,
  // P botole dei passaggi di servizio per le persone (a coppie: si entra in una e si esce dall'altra)
  const OGGETTI = {
    L: [[2, 13], [2, 18], [11, 13], [4, 12], [9, 19], [2, 2], [2, 8], [12, 2], [9, 8], [17, 2], [30, 2], [17, 9], [30, 9], [34, 9], [44, 2], [44, 9],
      [2, 31], [13, 31], [13, 23], [17, 21], [29, 30], [17, 30], [29, 21], [33, 30], [38, 30], [41, 11], [46, 20]],
    T: [[5, 15], [6, 15], [7, 15], [4, 3], [6, 3], [8, 3], [10, 3], [20, 4], [21, 4], [26, 4], [27, 4], [20, 7], [21, 7], [26, 7], [27, 7],
      [37, 4], [38, 4], [41, 7], [42, 7], [20, 24], [21, 24], [22, 24], [25, 24], [26, 24], [27, 24], [20, 27], [21, 27], [25, 27], [26, 27], [4, 25], [5, 25]],
    m: [[12, 6], [24, 2], [25, 2], [36, 2], [38, 2], [40, 2], [2, 16], [8, 31], [46, 12]],
    c: [[10, 26], [11, 26], [10, 29], [34, 23], [37, 25], [34, 27], [28, 15], [31, 16], [19, 15]],
    G: [[7, 6], [7, 28], [40, 5]],
    V: [[9, 17], [4, 7], [24, 6], [35, 5], [11, 24], [23, 29], [36, 28], [16, 16], [33, 15], [43, 18]],
    b: [[10, 5], [29, 8], [43, 4], [19, 29], [37, 22], [3, 12], [22, 2], [34, 2], [25, 30], [13, 24], [27, 29], [8, 23]],
    f: [[12, 30], [38, 23], [30, 3], [2, 19], [27, 9], [39, 12], [33, 21], [18, 28]],
    r: [[3, 17], [28, 22], [35, 8], [11, 2], [23, 7], [41, 9], [6, 31], [36, 30]],
    S: [[4, 14], [4, 17], [5, 13], [5, 18], [8, 14], [8, 17], [9, 13], [9, 18]],
    E: [[45, 14], [46, 14], [45, 15], [46, 15], [45, 16], [46, 16], [45, 17], [46, 17]],
    P: [[11, 7], [18, 5], [10, 18], [3, 28], [43, 7], [37, 29], [28, 26], [29, 6]],
  };
  // dove ci si nasconde: armadietti e casse grandi
  const NASCONDIGLI = OGGETTI.L.concat(OGGETTI.c);
  // la botola gemella di una botola (0↔1, 2↔3…)
  const gemella = (i) => (i % 2 ? i - 1 : i + 1);
  const SOLIDI = 'LmcG'; // T (scrivania) è solida solo per chi è in piedi

  function costruisci() {
    const g = Array.from({ length: RIGHE }, () => new Array(COLS).fill('#'));
    const zona = Array.from({ length: RIGHE }, () => new Array(COLS).fill(-1)); // indice della stanza, -1 corridoio o muro
    STANZE.forEach((s, i) => { for (let y = s.y0; y <= s.y1; y++) for (let x = s.x0; x <= s.x1; x++) { g[y][x] = '.'; zona[y][x] = i; } });
    const corr = new Set();
    for (const [x0, y0, x1, y1] of CORRIDOI) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y][x] === '#') { g[y][x] = '.'; corr.add(`${x},${y}`); }
    // le porte: i quadretti di corridoio accanto a una stanza
    const porte = [];
    for (const k of corr) {
      const [x, y] = k.split(',').map(Number);
      const accanto = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => zona[y + dy] && zona[y + dy][x + dx] >= 0);
      if (!accanto.length) continue;
      g[y][x] = 'D';
      porte.push({ x, y, asse: accanto[0][0] !== 0 ? 'x' : 'y', bloccata: BLOCCATE.includes(k) });
    }
    for (const [tipo, lista] of Object.entries(OGGETTI)) for (const [x, y] of lista) if ('LTmcGV'.includes(tipo)) g[y][x] = tipo;
    // da che parte guarda un armadietto o un terminale: verso il quadretto libero
    const verso = {};
    for (const tipo of ['L', 'm', 'G', 'c']) for (const [x, y] of OGGETTI[tipo]) {
      const libero = [[0, 1], [0, -1], [1, 0], [-1, 0]].find(([dx, dy]) => g[y + dy] && g[y + dy][x + dx] === '.');
      verso[`${x},${y}`] = libero || [0, 1];
    }
    return { g, zona, porte, verso };
  }
  const C = costruisci();
  const PORTE = C.porte;
  const portaIn = new Map(PORTE.map((p, i) => [`${p.x},${p.y}`, i]));

  // ---------- muri e movimento ----------
  const cella = (x, y) => (x < 0 || y < 0 || x >= COLS || y >= RIGHE ? '#' : C.g[y][x]);
  // aperte: le porte aperte (indice → true); accucciato: si passa sotto le scrivanie
  function solida(tx, ty, aperte, accucciato) {
    const c = cella(tx, ty);
    if (c === '#') return true;
    if (SOLIDI.includes(c)) return true;
    if (c === 'T') return !accucciato;
    if (c === 'D') return !(aperte && aperte[portaIn.get(`${tx},${ty}`)]);
    return false;
  }
  // muove un cerchio di raggio r di (dx, dy) contro i quadretti solidi, un asse alla volta (scivola lungo i muri)
  function muovi(e, dx, dy, r, aperte, accucciato) {
    const passi = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (r * 0.8)));
    for (let i = 0; i < passi; i++) {
      e.x += dx / passi; spingi(e, r, aperte, accucciato, 'x');
      e.y += dy / passi; spingi(e, r, aperte, accucciato, 'y');
    }
    return e;
  }
  // la parte solida di un quadretto (in dm), o null: i muri pieni; gli armadietti e i terminali appoggiati al muro;
  // generatori, casse e scrivanie in mezzo al quadretto; le porte chiuse sono una lastra spessa al centro
  function rettangolo(tx, ty, aperte, accucciato) {
    if (!solida(tx, ty, aperte, accucciato)) return null;
    const x0 = tx * T, y0 = ty * T, c = cella(tx, ty);
    if (c === 'L' || c === 'm') {
      const [fx, fy] = C.verso[`${tx},${ty}`] || [0, 1], prof = c === 'L' ? 8 : 9, lato = c === 'L' ? 0 : 4;
      if (fx > 0) return [x0, y0 + lato, x0 + prof, y0 + T - lato];
      if (fx < 0) return [x0 + T - prof, y0 + lato, x0 + T, y0 + T - lato];
      if (fy > 0) return [x0 + lato, y0, x0 + T - lato, y0 + prof];
      return [x0 + lato, y0 + T - prof, x0 + T - lato, y0 + T];
    }
    if (c === 'G' || c === 'c') { const m = c === 'G' ? 4 : 5; return [x0 + m, y0 + m, x0 + T - m, y0 + T - m]; }
    if (c === 'T') return [x0 + 2, y0 + 6, x0 + T - 2, y0 + T - 6];
    if (c === 'D') { const p = PORTE[portaIn.get(`${tx},${ty}`)]; return p.asse === 'x' ? [x0 + T / 2 - 3, y0, x0 + T / 2 + 3, y0 + T] : [x0, y0 + T / 2 - 3, x0 + T, y0 + T / 2 + 3]; }
    return [x0, y0, x0 + T, y0 + T];
  }
  function spingi(e, r, aperte, accucciato, asse) {
    const tx0 = Math.floor((e.x - r) / T), tx1 = Math.floor((e.x + r) / T), ty0 = Math.floor((e.y - r) / T), ty1 = Math.floor((e.y + r) / T);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const q = rettangolo(tx, ty, aperte, accucciato);
      if (!q) continue;
      const px = Math.max(q[0], Math.min(e.x, q[2])), py = Math.max(q[1], Math.min(e.y, q[3]));
      const ddx = e.x - px, ddy = e.y - py, d = Math.hypot(ddx, ddy);
      if (d >= r) continue;
      if (asse === 'x') { if (d > 1e-6 && Math.abs(ddx) > 1e-6) e.x = px + Math.sign(ddx) * Math.sqrt(Math.max(0, r * r - ddy * ddy)); else if (Math.abs(ddy) < 1e-6) e.x = e.x < (q[0] + q[2]) / 2 ? q[0] - r : q[2] + r; }
      else { if (d > 1e-6 && Math.abs(ddy) > 1e-6) e.y = py + Math.sign(ddy) * Math.sqrt(Math.max(0, r * r - ddx * ddx)); else if (Math.abs(ddx) < 1e-6) e.y = e.y < (q[1] + q[3]) / 2 ? q[1] - r : q[3] + r; }
    }
  }
  // si vede da a a b? (i muri, le cose alte e le porte chiuse fermano lo sguardo; scrivanie e casse basse no)
  function vede(a, b, aperte) {
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy);
    if (l < 1e-6) return true;
    const passo = T / 4, n = Math.ceil(l / passo);
    for (let i = 1; i < n; i++) {
      const x = a.x + (dx * i) / n, y = a.y + (dy * i) / n, tx = Math.floor(x / T), ty = Math.floor(y / T);
      const c = cella(tx, ty);
      if (c === '#' || c === 'L' || c === 'm' || c === 'G') return false;
      if (c === 'D' && !(aperte && aperte[portaIn.get(`${tx},${ty}`)])) return false;
    }
    return true;
  }
  // la strada più breve tra due quadretti (A*, otto direzioni senza tagliare gli angoli). Le porte non bloccate si
  // considerano aperte (si aprono quando ci si avvicina); quelle bloccate solo se sbloccate = true
  function strada(da, a, sbloccate) {
    const k = (x, y) => y * COLS + x;
    const libera = (x, y) => { const c = cella(x, y); if (c === '#' || SOLIDI.includes(c) || c === 'T') return false; if (c === 'D') { const p = PORTE[portaIn.get(`${x},${y}`)]; return !p.bloccata || !!sbloccate; } return true; };
    if (!libera(a[0], a[1]) || !libera(da[0], da[1])) return null;
    const g = new Map([[k(da[0], da[1]), 0]]), prima = new Map(), aperti = [[da[0], da[1], 0]], chiusi = new Set();
    const h = (x, y) => Math.hypot(x - a[0], y - a[1]);
    // la coda con priorità (un mucchio binario): il punto aperto più promettente si prende senza scorrere tutta la lista
    const metti = (e) => { aperti.push(e); let i = aperti.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (aperti[p][2] <= aperti[i][2]) break; [aperti[p], aperti[i]] = [aperti[i], aperti[p]]; i = p; } };
    const togli = () => {
      const top = aperti[0], fine = aperti.pop();
      if (aperti.length) {
        aperti[0] = fine; let i = 0;
        for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < aperti.length && aperti[l][2] < aperti[m][2]) m = l; if (r < aperti.length && aperti[r][2] < aperti[m][2]) m = r; if (m === i) break; [aperti[m], aperti[i]] = [aperti[i], aperti[m]]; i = m; }
      }
      return top;
    };
    while (aperti.length) {
      const [x, y] = togli();
      if (chiusi.has(k(x, y))) continue;
      chiusi.add(k(x, y));
      if (x === a[0] && y === a[1]) {
        const out = [[x, y]]; let c = k(x, y);
        while (prima.has(c)) { c = prima.get(c); out.push([c % COLS, Math.floor(c / COLS)]); }
        return out.reverse();
      }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (!libera(nx, ny)) continue;
        if (dx && dy && (!libera(x + dx, y) || !libera(x, y + dy))) continue;
        const ng = g.get(k(x, y)) + (dx && dy ? 1.414 : 1);
        if (g.has(k(nx, ny)) && g.get(k(nx, ny)) <= ng) continue;
        g.set(k(nx, ny), ng); prima.set(k(nx, ny), k(x, y));
        metti([nx, ny, ng + h(nx, ny)]);
      }
    }
    return null;
  }
  const centro = (t) => ({ x: (t[0] + 0.5) * T, y: (t[1] + 0.5) * T });
  const quadretto = (p) => [Math.floor(p.x / T), Math.floor(p.y / T)];
  // la stanza in cui si trova un punto (null nei corridoi)
  function stanzaDi(p) { const [tx, ty] = quadretto(p); const z = C.zona[ty] && C.zona[ty][tx]; return z >= 0 ? STANZE[z] : null; }
  // quanta luce c'è in un punto (0 buio, 1 pieno): la stanza, i generatori riaccesi (accesi: indici dei generatori)
  function luce(p, accesi) {
    const s = stanzaDi(p);
    if (!s) return 0.18; // corridoi: solo le luci rosse d'emergenza
    const gen = OGGETTI.G.findIndex(([x, y]) => C.zona[y][x] === STANZE.indexOf(s));
    return gen >= 0 && accesi && accesi[gen] ? Math.max(s.luce, 0.7) : s.luce;
  }

  const M = { T, COLS, RIGHE, SOFFITTO, STANZE, OGGETTI, NASCONDIGLI, gemella, PORTE, griglia: C.g, zona: C.zona, verso: C.verso, cella, solida, rettangolo, muovi, vede, strada, centro, quadretto, stanzaDi, luce, portaIn };
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
  else radice.IsolationMappa = M;
})(typeof window !== 'undefined' ? window : this);
