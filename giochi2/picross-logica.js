// PICROSS A COLORI: logica comune (indizi con i colori, risolutore riga per riga). Non è un gioco: giochi/index.js lo
// ignora. Regola dei colori: due blocchi dello STESSO colore sono separati da almeno una casella vuota; due blocchi
// di colori diversi possono toccarsi.
// Le caselle: 0 = vuota, 1..k = colori. Nel risolutore ogni casella è un insieme di possibilità (bit: 1 << colore).

// indizi di una fila: [[lunghezza, colore], ...]
function indiziFila(fila) {
  const out = [];
  let k = 0, col = 0;
  for (const v of fila) {
    if (v && v === col) k++;
    else { if (col) out.push([k, col]); col = v; k = v ? 1 : 0; }
  }
  if (col) out.push([k, col]);
  return out;
}
function indizi(W, H, img) {
  const righe = [], colonne = [];
  for (let y = 0; y < H; y++) righe.push(indiziFila(img.slice(y * W, y * W + W)));
  for (let x = 0; x < W; x++) colonne.push(indiziFila(Array.from({ length: H }, (_, y) => img[y * W + x])));
  return { righe, colonne };
}

// una fila: poss[i] = bit dei valori ancora possibili. Restituisce le nuove possibilità (solo quelle che compaiono in
// almeno una sistemazione valida dei blocchi) oppure null se non c'è nessuna sistemazione.
function risolviFila(poss, ind) {
  const n = poss.length, k = ind.length, VUOTA = 1;
  // puo[c][i]: quante caselle consecutive da i in poi possono avere il colore c
  const colori = [...new Set(ind.map((b) => b[1]))];
  const lungo = {};
  for (const c of colori) {
    const a = new Int32Array(n + 1);
    for (let i = n - 1; i >= 0; i--) a[i] = poss[i] & (1 << c) ? a[i + 1] + 1 : 0;
    lungo[c] = a;
  }
  const vuotaDa = new Uint8Array(n + 1); vuotaDa[n] = 1; // da i alla fine possono essere tutte vuote
  for (let i = n - 1; i >= 0; i--) vuotaDa[i] = vuotaDa[i + 1] && poss[i] & VUOTA ? 1 : 0;
  // ok[j][i]: i blocchi da j in poi si possono sistemare nelle caselle da i in poi
  const ok = Array.from({ length: k + 1 }, () => new Uint8Array(n + 2));
  for (let i = 0; i <= n; i++) ok[k][i] = vuotaDa[i];
  for (let j = k - 1; j >= 0; j--) {
    const [L, c] = ind[j], stessa = j + 1 < k && ind[j + 1][1] === c;
    for (let i = n; i >= 0; i--) {
      let v = 0;
      if (i < n && poss[i] & VUOTA && ok[j][i + 1]) v = 1;
      if (!v && i + L <= n && lungo[c][i] >= L) {
        const dopo = i + L;
        if (stessa) { if (dopo < n && poss[dopo] & VUOTA && ok[j + 1][dopo + 1]) v = 1; } else if (ok[j + 1][dopo]) v = 1;
      }
      ok[j][i] = v;
    }
  }
  if (!ok[0][0]) return null;
  // in avanti: si segnano i valori usati in qualche sistemazione valida
  const nuove = new Int32Array(n);
  const visto = Array.from({ length: k + 1 }, () => new Uint8Array(n + 2));
  visto[0][0] = 1;
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= k; j++) {
      if (!visto[j][i] || !ok[j][i]) continue;
      if (j === k) { for (let t = i; t < n; t++) nuove[t] |= VUOTA; continue; }
      if (i < n && poss[i] & VUOTA && ok[j][i + 1]) { nuove[i] |= VUOTA; visto[j][i + 1] = 1; }
      const [L, c] = ind[j], stessa = j + 1 < k && ind[j + 1][1] === c;
      if (i + L <= n && lungo[c][i] >= L) {
        const dopo = i + L;
        if (stessa) {
          if (dopo < n && poss[dopo] & VUOTA && ok[j + 1][dopo + 1]) { for (let t = i; t < dopo; t++) nuove[t] |= 1 << c; nuove[dopo] |= VUOTA; visto[j + 1][dopo + 1] = 1; }
        } else if (ok[j + 1][dopo]) { for (let t = i; t < dopo; t++) nuove[t] |= 1 << c; visto[j + 1][dopo] = 1; }
      }
    }
  }
  return nuove;
}

// risolve tutto con la sola logica delle file (niente tentativi). note: caselle già note (Map casella -> valore).
// Restituisce { poss, risolto, passi } (passi = quante file sono state ripassate: una misura della difficoltà)
function risolviLogica(W, H, ind, nColori, note = new Map()) {
  const tutti = (1 << (nColori + 1)) - 1;
  const poss = new Int32Array(W * H).fill(tutti);
  for (const [i, v] of note) poss[i] = 1 << v;
  let cambiato = true, passi = 0;
  const fila = (idx, ii) => {
    const prima = idx.map((i) => poss[i]);
    const dopo = risolviFila(prima, ii);
    if (!dopo) return null;
    let c = false;
    idx.forEach((i, t) => { if (dopo[t] !== poss[i]) { poss[i] = dopo[t]; c = true; } });
    return c;
  };
  while (cambiato) {
    cambiato = false;
    for (let y = 0; y < H; y++) { const r = fila(Array.from({ length: W }, (_, x) => y * W + x), ind.righe[y]); passi++; if (r === null) return { poss, risolto: false, contraddizione: true, passi }; if (r) cambiato = true; }
    for (let x = 0; x < W; x++) { const r = fila(Array.from({ length: H }, (_, y) => y * W + x), ind.colonne[x]); passi++; if (r === null) return { poss, risolto: false, contraddizione: true, passi }; if (r) cambiato = true; }
  }
  const risolto = [...poss].every((v) => v && !(v & (v - 1)));
  return { poss, risolto, passi };
}

// legge un disegno: righe di caratteri, '.' = vuota, ogni lettera un colore della tavolozza (nell'ordine)
function leggi(d) {
  const righe = d.righe;
  const H = righe.length, W = righe[0].length;
  const lettere = Object.keys(d.colori);
  const img = [];
  for (const r of righe) for (const ch of r) img.push(ch === '.' ? 0 : lettere.indexOf(ch) + 1);
  return { W, H, img, colori: lettere.map((l) => d.colori[l]), nomiColori: lettere.map((l) => d.nomi ? d.nomi[l] : l) };
}

module.exports = { indiziFila, indizi, risolviFila, risolviLogica, leggi };
