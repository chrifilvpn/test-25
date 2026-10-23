// COLLEGA I COLORI: le regole comuni a server e browser (il server lo carica con require, il browser lo trova in
// window.CollegaLogica). Una griglia N×N con coppie di pallini dello stesso colore: si uniscono con dei tubi che non
// si incrociano, e alla fine ogni casella deve essere piena.
// Generatore: un percorso che passa per tutte le caselle (cammino hamiltoniano mescolato con le "morsicate"), tagliato
// in pezzi che non si toccano da soli; poi il risolutore controlla che la soluzione sia una sola.
(function (radice, crea) {
  if (typeof module === 'object' && module.exports) module.exports = crea();
  else radice.CollegaLogica = crea();
}(typeof window !== 'undefined' ? window : globalThis, () => {
  const vicine = (N, i) => {
    const x = i % N, y = (i - x) / N, out = [];
    if (y > 0) out.push(i - N); if (x < N - 1) out.push(i + 1); if (y < N - 1) out.push(i + N); if (x > 0) out.push(i - 1);
    return out;
  };
  const accanto = (N, a, b) => { const ax = a % N, bx = b % N; return (Math.abs(a - b) === N) || (Math.abs(a - b) === 1 && Math.abs(ax - bx) === 1); };

  // un cammino che passa per tutte le caselle: si parte dalla greca e lo si mescola con le "morsicate" (un capo
  // salta su una casella vicina del cammino e il pezzo in mezzo si gira)
  function cammino(N, rnd) {
    const p = [];
    for (let y = 0; y < N; y++) for (let k = 0; k < N; k++) p.push(y * N + (y % 2 ? N - 1 - k : k));
    const L = p.length;
    const pos = new Array(L);
    const rifai = () => p.forEach((c, k) => { pos[c] = k; });
    rifai();
    for (let giro = 0; giro < L * 30; giro++) {
      const inizio = rnd() < 0.5;
      const capo = inizio ? p[0] : p[L - 1];
      const vv = vicine(N, capo);
      const v = vv[Math.floor(rnd() * vv.length)];
      const j = pos[v];
      if (inizio) { if (j === 1) continue; const pezzo = p.slice(0, j).reverse(); for (let k = 0; k < j; k++) { p[k] = pezzo[k]; pos[p[k]] = k; } }
      else { if (j === L - 2) continue; const pezzo = p.slice(j + 1).reverse(); for (let k = j + 1; k < L; k++) { p[k] = pezzo[k - j - 1]; pos[p[k]] = k; } }
    }
    return p;
  }

  // taglia il cammino in tubi: un tubo si chiude prima di toccare sé stesso (così non ha scorciatoie) o quando è
  // abbastanza lungo. Tubi di 1-2 caselle non valgono: si riprova.
  function tagli(N, p, rnd) {
    const tubi = [];
    let cur = [], dentro = new Set(), voglio = 0;
    const nuovo = () => { cur = []; dentro = new Set(); voglio = 3 + Math.floor(rnd() * (N * 1.6)); };
    nuovo();
    for (const c of p) {
      const tocca = cur.length && vicine(N, c).some((v) => dentro.has(v) && v !== cur[cur.length - 1]);
      if (cur.length && (tocca || cur.length >= voglio)) { tubi.push(cur); nuovo(); }
      cur.push(c); dentro.add(c);
    }
    tubi.push(cur);
    // un pezzetto corto in fondo: si attacca al tubo prima, se non lo fa toccare sé stesso
    for (let k = tubi.length - 1; k > 0; k--) {
      if (tubi[k].length >= 3) continue;
      const unito = tubi[k - 1].concat(tubi[k]);
      if (!toccaSeStesso(N, unito)) { tubi.splice(k - 1, 2, unito); continue; }
      return null;
    }
    if (tubi[0].length < 3) return null;
    return tubi;
  }
  function toccaSeStesso(N, t) {
    const pos = new Map(t.map((c, k) => [c, k]));
    for (let k = 0; k < t.length; k++) for (const v of vicine(N, t[k])) { const j = pos.get(v); if (j !== undefined && Math.abs(j - k) > 1) return true; }
    return false;
  }

  // RISOLUTORE: conta le soluzioni (fino a "max") facendo crescere i tubi da un capo. Ogni volta si muove il colore
  // con meno scelte; si scartano subito le situazioni senza uscita (casella vuota chiusa, colore che non può più
  // arrivare all'altro capo, zona vuota che nessun tubo può riempire). "budget": massimo di passi, poi si arrende.
  function risolvi(N, coppie, { max = 2, budget = 60000 } = {}) {
    const NN = N * N, K = coppie.length;
    const g = new Int16Array(NN).fill(-1);
    coppie.forEach(([a, b], c) => { g[a] = c; g[b] = c; });
    const testa = coppie.map(([a]) => a), fatto = new Array(K).fill(false);
    const strada = coppie.map(([a]) => [a]);
    const vic = Array.from({ length: NN }, (_, i) => vicine(N, i));
    const soluzioni = [];
    let passi = 0, arreso = false;
    const fine = (c) => coppie[c][1];
    function mosse(c) {
      const out = [];
      for (const v of vic[testa[c]]) { if (v === fine(c)) return [v]; if (g[v] === -1) out.push(v); }
      return out;
    }
    function regge() {
      // caselle vuote: servono due vicini "disponibili" (vuoti, una testa o un capo d'arrivo ancora aperti)
      const apertoIn = new Uint8Array(NN);
      for (let c = 0; c < K; c++) if (!fatto[c]) { apertoIn[testa[c]] = 1; apertoIn[fine(c)] = 1; }
      for (let i = 0; i < NN; i++) {
        if (g[i] !== -1) continue;
        let d = 0; for (const v of vic[i]) if (g[v] === -1 || apertoIn[v]) d++;
        if (d < 2) return false;
      }
      // zone vuote: ogni colore aperto deve poter arrivare, e ogni zona deve essere toccata da un colore aperto
      const zona = new Int32Array(NN).fill(-1);
      let nz = 0;
      for (let i = 0; i < NN; i++) {
        if (g[i] !== -1 || zona[i] !== -1) continue;
        const coda = [i]; zona[i] = nz;
        while (coda.length) { const x = coda.pop(); for (const v of vic[x]) if (g[v] === -1 && zona[v] === -1) { zona[v] = nz; coda.push(v); } }
        nz++;
      }
      const servita = new Uint8Array(nz);
      for (let c = 0; c < K; c++) {
        if (fatto[c]) continue;
        const zt = new Set(), zf = new Set();
        let diretto = false;
        for (const v of vic[testa[c]]) { if (v === fine(c)) diretto = true; if (g[v] === -1) zt.add(zona[v]); }
        for (const v of vic[fine(c)]) if (g[v] === -1) zf.add(zona[v]);
        let comune = false;
        for (const z of zt) if (zf.has(z)) { comune = true; servita[z] = 1; }
        if (!comune && !diretto) return false;
      }
      for (let z = 0; z < nz; z++) if (!servita[z]) return false;
      return true;
    }
    function cerca() {
      if (soluzioni.length >= max || arreso) return;
      if (++passi > budget) { arreso = true; return; }
      let scelto = -1, opz = null;
      for (let c = 0; c < K; c++) {
        if (fatto[c]) continue;
        const m = mosse(c);
        if (!m.length) return;
        if (!opz || m.length < opz.length) { scelto = c; opz = m; if (m.length === 1) break; }
      }
      if (scelto < 0) {
        for (let i = 0; i < NN; i++) if (g[i] === -1) return;
        soluzioni.push(strada.map((s) => s.slice()));
        return;
      }
      const c = scelto, vecchia = testa[c];
      for (const v of opz) {
        if (v === fine(c)) { fatto[c] = true; strada[c].push(v); if (regge()) cerca(); strada[c].pop(); fatto[c] = false; }
        else { g[v] = c; testa[c] = v; strada[c].push(v); if (regge()) cerca(); strada[c].pop(); testa[c] = vecchia; g[v] = -1; }
        if (soluzioni.length >= max || arreso) return;
      }
    }
    if (regge()) cerca();
    return { soluzioni, arreso, passi };
  }

  // un puzzle nuovo con una sola soluzione: { N, coppie: [[a, b], …], soluzione: [[a, …, b], …] }
  function genera(N, rnd = Math.random, { tentativi = 400 } = {}) {
    const minimo = Math.max(3, N - 1), massimo = N + 3;
    let ultimo = null;
    for (let t = 0; t < tentativi; t++) {
      const tubi = tagli(N, cammino(N, rnd), rnd);
      if (!tubi || tubi.length < minimo || tubi.length > massimo) continue;
      const coppie = tubi.map((x) => [x[0], x[x.length - 1]]);
      const r = risolvi(N, coppie, { max: 2, budget: 40000 });
      if (r.arreso || r.soluzioni.length !== 1) { if (!ultimo && r.soluzioni.length) ultimo = { N, coppie, soluzione: tubi }; continue; }
      return { N, coppie, soluzione: r.soluzioni[0] };
    }
    return ultimo; // quasi impossibile: una griglia giusta anche se con più soluzioni
  }

  // ---- le mosse sulla tavola di un giocatore ----
  // tavola: { N, coppie, tubi: [[cella, …] per colore] }: ogni tubo parte da uno dei due capi del suo colore
  function capoDi(coppie, i) { for (let c = 0; c < coppie.length; c++) if (coppie[c][0] === i || coppie[c][1] === i) return c; return -1; }
  // un tubo nuovo per il colore c: controlla che sia valido e taglia gli altri tubi che attraversa
  function traccia(N, coppie, tubi, c, celle) {
    if (!Number.isInteger(c) || c < 0 || c >= coppie.length || !Array.isArray(celle) || celle.length > N * N) return { errore: 'Tubo non valido' };
    const [a, b] = coppie[c];
    if (!celle.length) { tubi[c] = []; return { ok: true }; }
    if (celle[0] !== a && celle[0] !== b) return { errore: 'Il tubo deve partire da un pallino del suo colore' };
    const altro = celle[0] === a ? b : a, viste = new Set();
    for (let k = 0; k < celle.length; k++) {
      const x = celle[k];
      if (!Number.isInteger(x) || x < 0 || x >= N * N || viste.has(x)) return { errore: 'Tubo non valido' };
      viste.add(x);
      if (k && !accanto(N, celle[k - 1], x)) return { errore: 'Le caselle del tubo devono essere vicine' };
      const cap = capoDi(coppie, x);
      if (cap !== -1 && cap !== c) return { errore: 'Non si passa sopra un pallino di un altro colore' };
      if (x === altro && k !== celle.length - 1) return { errore: 'Il tubo finisce sull\'altro pallino' };
    }
    tubi[c] = celle.slice();
    for (let d = 0; d < tubi.length; d++) {
      if (d === c) continue;
      const k = tubi[d].findIndex((x) => viste.has(x));
      if (k >= 0) tubi[d] = tubi[d].slice(0, k);
    }
    return { ok: true };
  }
  const collegato = (coppie, tubi, c) => { const t = tubi[c], [a, b] = coppie[c]; return t.length >= 2 && ((t[0] === a && t[t.length - 1] === b) || (t[0] === b && t[t.length - 1] === a)); };
  function conta(N, coppie, tubi) {
    const piene = new Set();
    coppie.forEach(([a, b]) => { piene.add(a); piene.add(b); });
    for (const t of tubi) for (const x of t) piene.add(x);
    const uniti = coppie.filter((_, c) => collegato(coppie, tubi, c)).length;
    return { uniti, piene: piene.size, tutte: N * N, risolto: uniti === coppie.length && piene.size === N * N };
  }

  // generatore di numeri a caso con il seme (uguale nel server e nel browser)
  function seme(s) { let a = s >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  return { vicine, accanto, cammino, tagli, toccaSeStesso, risolvi, genera, capoDi, traccia, collegato, conta, seme };
}));
