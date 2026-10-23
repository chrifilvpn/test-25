// CARAMELLE IN FILA: le regole comuni a server e browser (il server lo carica con require, il browser lo trova in
// window.CaramelleLogica). Griglia 8×8 di caramelle di 6 colori: si scambiano due vicine per fare file di 3 o più.
// Le caramelle nuove arrivano da un generatore col seme: con le stesse mosse escono le stesse caramelle, nel server e
// nel browser (che così disegna subito la mossa), e tutti i giocatori partono dallo stesso schema e dalla stessa fila.
// Speciali: 4 in fila = caramella a strisce (svuota la riga o la colonna), 5 a L o a T = incartata (esplode 3×3),
// 5 in fila = bomba di colore (scambiata con una caramella toglie tutte quelle del suo colore).
(function (radice, crea) {
  if (typeof module === 'object' && module.exports) module.exports = crea();
  else radice.CaramelleLogica = crea();
}(typeof window !== 'undefined' ? window : globalThis, () => {
  const N = 8, COLORI = 6;
  const NIENTE = 0, RIGA = 1, COLONNA = 2, INCARTATA = 3, BOMBA = 4;
  const PUNTI_CARAMELLA = 20;

  // generatore col seme: lo stato è un numero, così si copia e si manda al browser
  function prossimo(r) { r.a = (r.a + 0x6d2b79f5) >>> 0; let t = r.a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const intero = (r, n) => Math.floor(prossimo(r) * n);

  const xy = (i) => [i % N, Math.floor(i / N)];
  const vicine = (a, b) => { const [ax, ay] = xy(a), [bx, by] = xy(b); return Math.abs(ax - bx) + Math.abs(ay - by) === 1; };
  const copia = (t) => ({ c: t.c.slice(), s: t.s.slice(), r: { a: t.r.a }, punti: t.punti || 0 });

  // le file di 3 o più dello stesso colore (le bombe non hanno colore)
  function file(t) {
    const out = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N;) {
      const c = t.c[y * N + x]; let k = x + 1;
      while (k < N && c >= 0 && t.c[y * N + k] === c) k++;
      if (c >= 0 && k - x >= 3) out.push({ dir: 'o', celle: Array.from({ length: k - x }, (_, j) => y * N + x + j) });
      x = k;
    }
    for (let x = 0; x < N; x++) for (let y = 0; y < N;) {
      const c = t.c[y * N + x]; let k = y + 1;
      while (k < N && c >= 0 && t.c[k * N + x] === c) k++;
      if (c >= 0 && k - y >= 3) out.push({ dir: 'v', celle: Array.from({ length: k - y }, (_, j) => (y + j) * N + x) });
      y = k;
    }
    return out;
  }
  const ciSonoFile = (t) => file(t).length > 0;

  // le mosse valide: scambi che fanno una fila, o con una bomba, o tra due speciali
  function mosse(t) {
    const out = [];
    for (let i = 0; i < N * N; i++) for (const j of [i + 1, i + N]) {
      if (j >= N * N || !vicine(i, j)) continue;
      if (valida(t, i, j)) out.push([i, j]);
    }
    return out;
  }
  function valida(t, i, j) {
    if (t.s[i] === BOMBA || t.s[j] === BOMBA) return true;
    if (t.s[i] && t.s[j]) return true;
    scambiaCelle(t, i, j);
    const si = file(t).some((f) => f.celle.includes(i) || f.celle.includes(j));
    scambiaCelle(t, i, j);
    return si;
  }
  function scambiaCelle(t, i, j) { [t.c[i], t.c[j]] = [t.c[j], t.c[i]]; [t.s[i], t.s[j]] = [t.s[j], t.s[i]]; }

  // uno schema nuovo senza file già fatte e con almeno una mossa
  function nuova(seme) {
    const t = { c: new Array(N * N).fill(0), s: new Array(N * N).fill(0), r: { a: seme >>> 0 }, punti: 0 };
    do {
      for (let i = 0; i < N * N; i++) {
        const [x, y] = xy(i);
        let c;
        do { c = intero(t.r, COLORI); } while ((x >= 2 && t.c[i - 1] === c && t.c[i - 2] === c) || (y >= 2 && t.c[i - N] === c && t.c[i - 2 * N] === c));
        t.c[i] = c;
      }
    } while (!mosse(t).length);
    return t;
  }

  // l'effetto di una caramella speciale che esplode in i: le celle che porta via
  function effetto(t, i, colorePreferito) {
    const [x, y] = xy(i), out = [];
    if (t.s[i] === RIGA) for (let k = 0; k < N; k++) out.push(y * N + k);
    else if (t.s[i] === COLONNA) for (let k = 0; k < N; k++) out.push(k * N + x);
    else if (t.s[i] === INCARTATA) { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (x + dx >= 0 && x + dx < N && y + dy >= 0 && y + dy < N) out.push((y + dy) * N + x + dx); }
    else if (t.s[i] === BOMBA) {
      // la bomba colpita da un'esplosione toglie il colore più presente (o quello indicato)
      let c = colorePreferito;
      if (c == null || c < 0) { const conta = new Array(COLORI).fill(0); t.c.forEach((v) => { if (v >= 0) conta[v]++; }); c = conta.indexOf(Math.max(...conta)); }
      t.c.forEach((v, k) => { if (v === c) out.push(k); });
    }
    return out;
  }

  // toglie le celle (e fa esplodere a catena gli speciali che ci sono dentro); restituisce l'elenco tolto
  function togli(t, celle, salva = new Set()) {
    const via = new Set(), coda = [...celle];
    while (coda.length) {
      const i = coda.pop();
      if (via.has(i) || salva.has(i) || t.c[i] === null) continue;
      via.add(i);
      if (t.s[i]) for (const k of effetto(t, i)) if (!via.has(k)) coda.push(k);
    }
    for (const i of via) { t.c[i] = null; t.s[i] = NIENTE; }
    return [...via];
  }

  // le caramelle cadono e dall'alto ne arrivano di nuove (dal generatore)
  function cadi(t) {
    const cadute = [], nuove = [];
    for (let x = 0; x < N; x++) {
      let giu = N - 1;
      for (let y = N - 1; y >= 0; y--) {
        const i = y * N + x;
        if (t.c[i] === null) continue;
        const d = giu * N + x;
        if (d !== i) { t.c[d] = t.c[i]; t.s[d] = t.s[i]; t.c[i] = null; t.s[i] = NIENTE; cadute.push([i, d]); }
        giu--;
      }
      for (let y = giu; y >= 0; y--) { const i = y * N + x; t.c[i] = intero(t.r, COLORI); t.s[i] = NIENTE; nuove.push([i, t.c[i], giu + 1]); }
    }
    return { cadute, nuove };
  }

  // UNA MOSSA: scambia i e j e risolve tutto (file, speciali, cadute, file a catena). Restituisce i passi per
  // l'animazione e i punti fatti. Una mossa che non fa niente è rifiutata (la tavola non cambia).
  function scambia(t, i, j) {
    if (!Number.isInteger(i) || !Number.isInteger(j) || i < 0 || j < 0 || i >= N * N || j >= N * N || !vicine(i, j)) return { errore: 'Scambia due caramelle vicine' };
    if (!valida(t, i, j)) return { errore: 'Così non si fa nessuna fila' };
    const passi = [], prima = t.punti;
    const si = t.s[i], sj = t.s[j], ci = t.c[i], cj = t.c[j];
    scambiaCelle(t, i, j);
    let catena = 1;
    // bomba o due speciali: l'effetto parte subito
    if (si === BOMBA || sj === BOMBA || (si && sj)) {
      let celle;
      if (si === BOMBA && sj === BOMBA) celle = t.c.map((_, k) => k);
      else if (si === BOMBA || sj === BOMBA) {
        const [b, altra, sa, ca] = si === BOMBA ? [j, i, sj, cj] : [i, j, si, ci];
        // bomba + speciale: tutte le caramelle di quel colore diventano speciali ed esplodono
        celle = [b];
        t.c.forEach((v, k) => { if (v === ca) { if (sa && sa !== BOMBA) t.s[k] = sa === INCARTATA ? INCARTATA : (k % 2 ? RIGA : COLONNA); celle.push(k); } });
        t.s[b] = NIENTE; celle.push(altra);
      } else {
        const [x, y] = xy(j), dim = si === INCARTATA && sj === INCARTATA ? 2 : (si === INCARTATA || sj === INCARTATA) ? 1 : 0;
        celle = [];
        if (dim === 2) { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (x + dx >= 0 && x + dx < N && y + dy >= 0 && y + dy < N) celle.push((y + dy) * N + x + dx); }
        else for (let d = -dim; d <= dim; d++) for (let k = 0; k < N; k++) { if (y + d >= 0 && y + d < N) celle.push((y + d) * N + k); if (x + d >= 0 && x + d < N) celle.push(k * N + x + d); }
        t.s[i] = NIENTE; t.s[j] = NIENTE;
      }
      const via = togli(t, celle);
      t.punti += via.length * PUNTI_CARAMELLA * 2;
      passi.push({ via, speciali: [], punti: t.punti - prima, ...cadi(t) });
      catena = 2;
    }
    // file, anche a catena
    for (let giro = 0; giro < 60; giro++) {
      const ff = file(t);
      if (!ff.length) break;
      const pPrima = t.punti;
      // gruppi: file che si toccano (stesso colore e una cella in comune) formano una L o una T
      const gruppi = [];
      for (const f of ff) {
        const g = gruppi.find((x) => x.celle.some((c) => f.celle.includes(c)));
        if (g) { g.file.push(f); for (const c of f.celle) if (!g.celle.includes(c)) g.celle.push(c); } else gruppi.push({ file: [f], celle: f.celle.slice() });
      }
      const salva = new Set(), nuoviSpeciali = [];
      for (const g of gruppi) {
        const lunga = Math.max(...g.file.map((f) => f.celle.length));
        let tipo = NIENTE;
        if (lunga >= 5) tipo = BOMBA;
        else if (g.file.length > 1) tipo = INCARTATA;
        else if (lunga === 4) tipo = g.file[0].dir === 'o' ? COLONNA : RIGA;
        if (!tipo) continue;
        // dove nasce: la cella spostata dalla mossa, altrimenti l'incrocio o il centro della fila (non già speciale)
        const libere = g.celle.filter((c) => !t.s[c]);
        const incrocio = g.file.length > 1 ? g.file[0].celle.find((c) => g.file[1].celle.includes(c)) : null;
        let dove = [j, i].find((c) => giro === 0 && libere.includes(c));
        if (dove == null) dove = incrocio != null && libere.includes(incrocio) ? incrocio : libere[Math.floor(libere.length / 2)];
        if (dove == null) continue;
        salva.add(dove);
        nuoviSpeciali.push({ i: dove, s: tipo, c: tipo === BOMBA ? -1 : t.c[dove] });
        t.punti += { [RIGA]: 60, [COLONNA]: 60, [INCARTATA]: 100, [BOMBA]: 200 }[tipo];
      }
      const tutte = gruppi.flatMap((g) => g.celle);
      const via = togli(t, tutte, salva);
      for (const sp of nuoviSpeciali) { t.s[sp.i] = sp.s; t.c[sp.i] = sp.c; }
      t.punti += via.length * PUNTI_CARAMELLA * catena;
      passi.push({ via, speciali: nuoviSpeciali, punti: t.punti - pPrima, ...cadi(t) });
      catena++;
    }
    // nessuna mossa rimasta: si rimescola (sempre col generatore), finché non ci sono file fatte e c'è una mossa
    let mescolata = false;
    if (!mosse(t).length) {
      mescolata = true;
      let ok = false;
      for (let giro = 0; giro < 50 && !ok; giro++) {
        for (let k = N * N - 1; k > 0; k--) scambiaCelle(t, k, intero(t.r, k + 1));
        ok = !ciSonoFile(t) && mosse(t).length > 0;
      }
      if (!ok) { const s = nuova(t.r.a); t.c = s.c; t.s = s.s; t.r = s.r; }
    }
    return { ok: true, passi, punti: t.punti - prima, mescolata };
  }

  // quanto vale una mossa (per il computer e per l'aiuto): si prova su una copia
  function valuta(t, i, j) {
    const k = copia(t), r = scambia(k, i, j);
    if (r.errore) return -1;
    const speciali = r.passi.reduce((s, p) => s + p.speciali.length, 0);
    return { punti: r.punti, speciali, primo: r.passi[0] ? r.passi[0].punti : 0 };
  }

  return { N, COLORI, NIENTE, RIGA, COLONNA, INCARTATA, BOMBA, nuova, mosse, valida, scambia, valuta, copia, file, vicine, xy };
}));
