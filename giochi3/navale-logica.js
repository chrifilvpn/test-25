// BATTAGLIA NAVALE SOLITARIA: logica comune (risolutore che conta le soluzioni, forme dei pezzi di nave, generatore).
// Non è un gioco (non esporta meta): giochi/index.js lo ignora. La usano navale.js, i test e il generatore di
// navale-dati.js. Le navi sono dritte, non si toccano nemmeno in diagonale; i numeri dicono quanti pezzi di nave ci
// sono in ogni riga e colonna; alcune caselle sono già scoperte (acqua o un pezzo di nave con la sua forma).

const FLOTTE = { piccola: [3, 2, 2, 1, 1, 1], media: [4, 3, 2, 2, 2, 1, 1, 1], grande: [4, 3, 3, 2, 2, 2, 1, 1, 1, 1] };
const LATI = { piccola: 6, media: 8, grande: 10 };

// la forma di un pezzo di nave nella griglia sol (1 = nave): 'acqua', 'singolo', 'su' (punta in alto: la nave va
// giù), 'giu', 'sinistra', 'destra', 'centro'
function forma(L, sol, i) {
  if (!sol[i]) return 'acqua';
  const x = i % L, y = (i - x) / L;
  const s = y > 0 && sol[i - L], g = y < L - 1 && sol[i + L], o = x > 0 && sol[i - 1], e = x < L - 1 && sol[i + 1];
  if (!s && !g && !o && !e) return 'singolo';
  if ((s && g) || (o && e)) return 'centro';
  if (g) return 'su'; if (s) return 'giu'; if (e) return 'sinistra'; return 'destra';
}
const conteggi = (L, sol) => ({
  righe: Array.from({ length: L }, (_, y) => sol.slice(y * L, y * L + L).reduce((a, b) => a + b, 0)),
  colonne: Array.from({ length: L }, (_, x) => Array.from({ length: L }, (_, y) => sol[y * L + x]).reduce((a, b) => a + b, 0)),
});

// RISOLUTORE: quante soluzioni hanno questi numeri e queste caselle scoperte (indizi: Map casella -> forma)?
// Si mettono le navi dalla più lunga; navi uguali in ordine crescente di posizione (niente doppioni).
function risolvi(L, flotta, righe, colonne, indizi, quante = 2, limite = 3e6) {
  const N = L * L;
  const nave = new Uint8Array(N), vicino = new Uint8Array(N); // vicino: contatore delle navi che toccano la casella
  const r = righe.slice(), c = colonne.slice();
  const acqua = new Uint8Array(N), pezzo = new Uint8Array(N);
  for (const [i, f] of indizi) { if (f === 'acqua') acqua[i] = 1; else pezzo[i] = 1; }
  const soluzioni = [];
  let nodi = 0, troppo = false;
  const ordinate = flotta.slice().sort((a, b) => b - a);
  // posizioni possibili di ogni lunghezza: [celle, orientamento]
  const posizioni = {};
  for (const n of new Set(ordinate)) {
    posizioni[n] = [];
    for (let y = 0; y < L; y++) for (let x = 0; x < L; x++) {
      if (x + n <= L) posizioni[n].push({ inizio: y * L + x, celle: Array.from({ length: n }, (_, k) => y * L + x + k), oriz: true });
      if (n > 1 && y + n <= L) posizioni[n].push({ inizio: y * L + x, celle: Array.from({ length: n }, (_, k) => (y + k) * L + x), oriz: false });
    }
    // per n = 1 c'è solo la posizione orizzontale
  }
  const intorno = (celle) => {
    const s = new Set();
    for (const i of celle) { const x = i % L, y = (i - x) / L; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < L && b < L) s.add(b * L + a); } }
    for (const i of celle) s.delete(i);
    return [...s];
  };
  for (const n of Object.keys(posizioni)) for (const p of posizioni[n]) p.intorno = intorno(p.celle);
  const pezziDaCoprire = [...indizi].filter(([, f]) => f !== 'acqua').map(([i]) => i);

  const rec = (k, minimo) => {
    if (troppo || soluzioni.length >= quante) return;
    if (++nodi > limite) { troppo = true; return; }
    if (k === ordinate.length) {
      if (r.some((v) => v) || c.some((v) => v)) return;
      for (const i of pezziDaCoprire) if (!nave[i]) return;
      const sol = Array.from(nave);
      for (const [i, f] of indizi) if (forma(L, sol, i) !== f) return;
      soluzioni.push(sol);
      return;
    }
    // potatura: i pezzi che restano bastano per righe e colonne? (somma dei numeri = somma delle navi rimaste)
    const n = ordinate[k];
    const stessa = k > 0 && ordinate[k - 1] === n;
    for (const p of posizioni[n]) {
      if (stessa && p.inizio <= minimo) continue;
      let ok = true;
      for (const i of p.celle) if (nave[i] || vicino[i] || acqua[i]) { ok = false; break; }
      if (!ok) continue;
      for (const i of p.intorno) if (nave[i] || pezzo[i]) { ok = false; break; }
      if (!ok) continue;
      // righe e colonne
      if (p.oriz) { const y = Math.floor(p.inizio / L); if (r[y] < n) continue; for (const i of p.celle) if (c[i % L] < 1) { ok = false; break; } } else { const x = p.inizio % L; if (c[x] < n) continue; for (const i of p.celle) if (r[Math.floor(i / L)] < 1) { ok = false; break; } }
      if (!ok) continue;
      for (const i of p.celle) { nave[i] = 1; r[Math.floor(i / L)]--; c[i % L]--; }
      for (const i of p.intorno) vicino[i]++;
      // un pezzo scoperto non ancora coperto deve poter essere coperto dalle navi rimaste: controllo leggero sul numero
      rec(k + 1, stessa || (k + 1 < ordinate.length && ordinate[k + 1] === n) ? p.inizio : -1);
      for (const i of p.intorno) vicino[i]--;
      for (const i of p.celle) { nave[i] = 0; r[Math.floor(i / L)]++; c[i % L]++; }
      if (troppo || soluzioni.length >= quante) return;
    }
  };
  rec(0, -1);
  return { soluzioni, troppo, nodi };
}

// una flotta a caso nella griglia (nessuna nave tocca un'altra, nemmeno in diagonale)
function flottaCaso(L, flotta, rnd = Math.random) {
  for (let giro = 0; giro < 500; giro++) {
    const sol = new Uint8Array(L * L), vic = new Uint8Array(L * L);
    let ok = true;
    for (const n of flotta.slice().sort((a, b) => b - a)) {
      let messo = false;
      for (let t = 0; t < 200 && !messo; t++) {
        const oriz = rnd() < 0.5, x = Math.floor(rnd() * (oriz ? L - n + 1 : L)), y = Math.floor(rnd() * (oriz ? L : L - n + 1));
        const celle = Array.from({ length: n }, (_, k) => (oriz ? y * L + x + k : (y + k) * L + x));
        if (celle.some((i) => sol[i] || vic[i])) continue;
        for (const i of celle) sol[i] = 1;
        for (const i of celle) { const a = i % L, b = (i - a) / L; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const u = a + dx, v = b + dy; if (u >= 0 && v >= 0 && u < L && v < L) vic[v * L + u] = 1; } }
        messo = true;
      }
      if (!messo) { ok = false; break; }
    }
    if (ok) return Array.from(sol);
  }
  return null;
}

// le 8 trasformazioni del quadrato
function trasforma(L, arr, k) {
  const out = new Array(L * L);
  for (let y = 0; y < L; y++) for (let x = 0; x < L; x++) {
    let nx = x, ny = y;
    if (k & 1) [nx, ny] = [ny, nx];
    if (k & 2) nx = L - 1 - nx;
    if (k & 4) ny = L - 1 - ny;
    out[ny * L + nx] = arr[y * L + x];
  }
  return out;
}

module.exports = { FLOTTE, LATI, forma, conteggi, risolvi, flottaCaso, trasforma };
