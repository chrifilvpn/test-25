// NURIKABE: logica comune (risolutore per controllare che uno schema abbia UNA sola soluzione, e trasformazioni).
// Non è un gioco (non esporta meta): giochi/index.js lo ignora. Lo usano nurikabe.js, i test e il generatore che ha
// creato nurikabe-dati.js.
// Regole: ogni numero sta in un'isola di tante caselle quante dice il numero, un numero per isola; le isole non si
// toccano di lato; tutto il resto è mare, il mare è tutto collegato e non ha quadrati 2×2.

// tutte le forme possibili (insiemi collegati di n caselle) di un'isola che contiene la casella c; vietate[i] = 1
// per le caselle dove l'isola non può andare (altri numeri e le loro vicine). Al massimo `tetto` forme.
function forme(W, H, c, n, vietate, tetto = 60000) {
  const out = [];
  const vic = (i) => { const x = i % W, y = (i - x) / W, v = []; if (x > 0) v.push(i - 1); if (x < W - 1) v.push(i + 1); if (y > 0) v.push(i - W); if (y < H - 1) v.push(i + W); return v; };
  // enumerazione di Redelmeier: ogni insieme collegato viene generato una volta sola
  const dentro = new Set([c]);
  const visti = new Set([c]);
  const rec = (bordo) => {
    if (out.length >= tetto) return;
    if (dentro.size === n) { out.push([...dentro]); return; }
    for (let k = 0; k < bordo.length; k++) {
      const i = bordo[k];
      const nuovo = bordo.slice(k + 1);
      const aggiunti = [];
      for (const j of vic(i)) if (!visti.has(j) && !vietate[j]) { visti.add(j); aggiunti.push(j); nuovo.push(j); }
      dentro.add(i);
      rec(nuovo);
      dentro.delete(i);
      for (const j of aggiunti) visti.delete(j);
      if (out.length >= tetto) return;
    }
  };
  const bordo = [];
  for (const j of vic(c)) if (!vietate[j]) { visti.add(j); bordo.push(j); }
  rec(bordo);
  return out;
}

// RISOLUTORE: conta le soluzioni (fino a `quante`). numeri: array lungo W*H, 0 = casella vuota.
// Restituisce { soluzioni: [array 1 = isola, 0 = mare], troppo } (troppo = superato il limite di nodi).
function risolvi(W, H, numeri, quante = 2, limiteNodi = 400000) {
  const N = W * H;
  const vic = (i) => { const x = i % W, y = (i - x) / W, v = []; if (x > 0) v.push(i - 1); if (x < W - 1) v.push(i + 1); if (y > 0) v.push(i - W); if (y < H - 1) v.push(i + W); return v; };
  const V = Array.from({ length: N }, (_, i) => vic(i));
  const indizi = [];
  for (let i = 0; i < N; i++) if (numeri[i]) indizi.push({ c: i, n: numeri[i] });
  const totaleIsole = indizi.reduce((s, x) => s + x.n, 0);
  if (totaleIsole >= N) return { soluzioni: [], troppo: false };
  // le forme di ogni isola: non toccano gli altri numeri né le loro vicine
  for (const d of indizi) {
    const vietate = new Uint8Array(N);
    for (const e of indizi) if (e !== d) { vietate[e.c] = 1; for (const j of V[e.c]) vietate[j] = 1; }
    d.forme = forme(W, H, d.c, d.n, vietate).map((f) => {
      const s = new Uint8Array(N); for (const i of f) s[i] = 1;
      const intorno = new Set(); for (const i of f) for (const j of V[i]) if (!s[j]) intorno.add(j);
      return { celle: f, s, intorno: [...intorno] };
    });
    if (!d.forme.length) return { soluzioni: [], troppo: false };
  }
  const blocchi = [];
  for (let y = 0; y + 1 < H; y++) for (let x = 0; x + 1 < W; x++) { const i = y * W + x; blocchi.push([i, i + 1, i + W, i + W + 1]); }
  const terra = new Uint8Array(N); // isola già messa
  const vietato = new Uint8Array(N); // vicina di un'isola messa: non può essere di un'altra isola (contatore)
  const soluzioni = [];
  let nodi = 0, troppo = false;
  const compatibile = (f) => { for (const i of f.celle) if (terra[i] || vietato[i]) return false; for (const j of f.intorno) if (terra[j]) return false; return true; };

  const rec = (rimasti) => {
    if (troppo || soluzioni.length >= quante) return;
    if (++nodi > limiteNodi) { troppo = true; return; }
    // forme ancora possibili per ogni isola rimasta; la casella "può essere terra" se una forma la copre
    const copre = new Uint8Array(N);
    let scelto = null, possibili = null;
    for (const d of rimasti) {
      const ok = d.forme.filter(compatibile);
      if (!ok.length) return;
      for (const f of ok) for (const i of f.celle) copre[i] = 1;
      if (!possibili || ok.length < possibili.length) { possibili = ok; scelto = d; }
    }
    // niente 2×2 di mare sicuro
    for (const b of blocchi) if (!terra[b[0]] && !terra[b[1]] && !terra[b[2]] && !terra[b[3]] && !copre[b[0]] && !copre[b[1]] && !copre[b[2]] && !copre[b[3]]) return;
    // il mare sicuro (non terra e non copribile) deve potersi collegare passando da caselle non terra
    let primo = -1, sicuro = 0;
    for (let i = 0; i < N; i++) if (!terra[i] && !copre[i]) { sicuro++; if (primo < 0) primo = i; }
    if (primo >= 0) {
      const vis = new Uint8Array(N), coda = [primo]; vis[primo] = 1; let trovati = 0;
      for (let q = 0; q < coda.length; q++) { const i = coda[q]; if (!copre[i]) trovati++; for (const j of V[i]) if (!vis[j] && !terra[j]) { vis[j] = 1; coda.push(j); } }
      if (trovati < sicuro) return;
    }
    if (!rimasti.length) {
      // tutto messo: il mare è il resto; controlli finali (collegato e senza 2×2 c'è già)
      soluzioni.push(Array.from(terra));
      return;
    }
    const resto = rimasti.filter((d) => d !== scelto);
    for (const f of possibili) {
      for (const i of f.celle) terra[i] = 1;
      for (const j of f.intorno) vietato[j]++;
      rec(resto);
      for (const j of f.intorno) vietato[j]--;
      for (const i of f.celle) terra[i] = 0;
      if (troppo || soluzioni.length >= quante) return;
    }
  };
  rec(indizi);
  // il mare deve essere collegato anche senza "copre": lo controlla già il passo finale (copre vuoto)
  return { soluzioni, troppo, nodi };
}

// le 8 trasformazioni del quadrato (rotazioni e specchi) di una griglia W×H; per W ≠ H solo le 4 che tengono la forma
function trasforma(W, H, arr, k) {
  const out = new Array(W * H);
  const quadrato = W === H;
  const t = quadrato ? k % 8 : [0, 2, 4, 6][k % 4];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let nx = x, ny = y;
    if (t & 1) [nx, ny] = [ny, nx]; // trasposta (solo nei quadrati)
    if (t & 2) nx = (quadrato ? W : W) - 1 - nx;
    if (t & 4) ny = H - 1 - ny;
    out[ny * W + nx] = arr[y * W + x];
  }
  return out;
}

module.exports = { forme, risolvi, trasforma };
