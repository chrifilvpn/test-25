// DRAGHI E SEGRETE: le mappe delle ambientazioni horror.
// - la STAZIONE (modalità tempo reale): tutta la campagna su una sola mappa enorme vista dall'alto. Ogni area di
//   horror.js è un settore (un blocco della griglia, gx/gy) con stanze, corridoi e arredi del suo stile; i settori
//   vicini sono collegati da porte (chiuse a chiave se il collegamento chiede un oggetto), quelli lontani da ascensori,
//   tram e condotti (si tocca il punto e si arriva all'altro capo). Dentro: armadietti e letti dove nascondersi,
//   scrivanie sotto cui accovacciarsi, grate dei condotti (da dove esce la creatura), casse da frugare, terminali,
//   i punti degli obiettivi.
// - le SCENE horror per i combattimenti a turni (stessi simboli, una stanza o un pezzo di settore).
// Simboli: '#' muro, '.' pavimento, '+' porta, 'L' porta chiusa a chiave, 'a' armadietto, 'l' letto, 't' scrivania o
// tavolo, 'c' cassa, 'k' terminale, 'o' punto dell'obiettivo, 'v' grata del condotto, 'E' ascensore o tram, 'u' uova
// e resina, 'r' roccia, 'T' albero, 'b' arbusto o panca, '~' acqua bassa, ':' macerie, 'w' vuoto o acqua profonda.
const { rng } = require('./mappe');

const SW = 34, SH = 24; // un settore della stazione: 34 × 24 caselle
// cosa ferma il passo (in tempo reale chi è accovacciato passa sotto scrivanie e letti) e cosa ferma la vista
const BLOCCA = new Set(['#', 'L', 'a', 'c', 'k', 'o', 'u', 'r', 'T', 'w', 't', 'l']);
const SOTTO = new Set(['t', 'l']); // ci si infila sotto (accovacciati)
const OPACO = new Set(['#', 'L', 'a', 'k', 'T', 'r']);
const DIFFICILE = new Set(['~', ':', 'b']);
const STILI = ['stazione', 'uffici', 'alloggi', 'medico', 'laboratorio', 'industriale', 'tram', 'nido', 'sottomarina', 'fondale', 'manicomio', 'fogne', 'cortile'];
const GROTTE = new Set(['nido', 'fondale', 'fogne']);

// ---------- pezzi comuni ----------
// stanze e corridoi dentro un rettangolo (x0, y0, w, h): divisione binaria, una stanza per foglia, corridoi tra i fratelli
function stanzeCorridoi(g, W, x0, y0, w, h, r, { minimo = 7, largo = 1, porte = true } = {}) {
  const set = (x, y, ch) => { g[y * W + x] = ch; };
  const at = (x, y) => g[y * W + x];
  const foglie = [];
  const dividi = (x, y, ww, hh, prof) => {
    const puoV = ww >= minimo * 2 + 1, puoO = hh >= minimo * 2 - 1;
    if (prof > 4 || (!puoV && !puoO) || (prof >= 2 && r() < 0.18)) { foglie.push({ x, y, w: ww, h: hh }); return [{ x, y, w: ww, h: hh }]; }
    const vert = puoV && (!puoO || ww / hh > 1.15 || (ww / hh > 0.85 && r() < 0.5));
    if (vert) { const k = minimo + Math.floor(r() * (ww - minimo * 2 + 1)); const a = dividi(x, y, k, hh, prof + 1), b = dividi(x + k, y, ww - k, hh, prof + 1); unisci(a, b); return [...a, ...b]; }
    const k = minimo - 1 + Math.floor(r() * (hh - minimo * 2 + 3)); const a = dividi(x, y, ww, k, prof + 1), b = dividi(x, y + k, ww, hh - k, prof + 1); unisci(a, b); return [...a, ...b];
  };
  const stanze = [];
  const unioni = [];
  const unisci = (a, b) => unioni.push([a, b]);
  dividi(x0, y0, w, h, 0);
  for (const f of foglie) {
    const sw = Math.max(4, f.w - 1 - Math.floor(r() * 2)), sh = Math.max(3, f.h - 1 - Math.floor(r() * 2));
    const sx = f.x + 1 + Math.floor(r() * Math.max(1, f.w - sw - 1)), sy = f.y + 1 + Math.floor(r() * Math.max(1, f.h - sh - 1));
    const s = { x: sx, y: sy, w: Math.min(sw, x0 + w - 1 - sx), h: Math.min(sh, y0 + h - 1 - sy) };
    if (s.w < 3 || s.h < 2) continue;
    s.cx = s.x + Math.floor(s.w / 2); s.cy = s.y + Math.floor(s.h / 2);
    for (let yy = s.y; yy < s.y + s.h; yy++) for (let xx = s.x; xx < s.x + s.w; xx++) set(xx, yy, '.');
    f.stanza = s; stanze.push(s);
  }
  // un corridoio tra le stanze più vicine dei due gruppi uniti
  const scava = (x, y) => { for (let k = 0; k < largo; k++) { const xx = x + (k && 0), yy = y; if (at(xx, yy) === '#') set(xx, yy, ','); } };
  const corridoio = (a, b) => {
    let x = a.cx, y = a.cy;
    const ox = r() < 0.5;
    const passo = (tx, ty) => { while (x !== tx) { x += Math.sign(tx - x); scava(x, y); if (largo > 1 && at(x, y + 1) === '#' && y + 1 < y0 + h - 1) set(x, y + 1, ','); } while (y !== ty) { y += Math.sign(ty - y); scava(x, y); if (largo > 1 && at(x + 1, y) === '#' && x + 1 < x0 + w - 1) set(x + 1, y, ','); } };
    if (ox) { passo(b.cx, y); passo(x, b.cy); } else { passo(x, b.cy); passo(b.cx, y); }
  };
  for (const [ga, gb] of unioni) {
    const sa = ga.map((f) => foglie.find((q) => q.x === f.x && q.y === f.y && q.w === f.w && q.h === f.h)).filter((f) => f && f.stanza).map((f) => f.stanza);
    const sb = gb.map((f) => foglie.find((q) => q.x === f.x && q.y === f.y && q.w === f.w && q.h === f.h)).filter((f) => f && f.stanza).map((f) => f.stanza);
    let meglio = null, md = Infinity;
    for (const a of sa) for (const b of sb) { const d = Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy); if (d < md) { md = d; meglio = [a, b]; } }
    if (meglio) corridoio(meglio[0], meglio[1]);
  }
  // le porte: dove un corridoio entra in una stanza attraverso il suo bordo
  for (let yy = y0; yy < y0 + h; yy++) for (let xx = x0; xx < x0 + w; xx++) {
    if (at(xx, yy) !== ',') continue;
    set(xx, yy, '.');
    if (!porte) continue;
    const stanza = (x, y) => stanze.some((s) => x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h);
    const muriOr = at(xx - 1, yy) === '#' && at(xx + 1, yy) === '#', muriVe = at(xx, yy - 1) === '#' && at(xx, yy + 1) === '#';
    const vicinoStanza = stanza(xx, yy - 1) || stanza(xx, yy + 1) || stanza(xx - 1, yy) || stanza(xx + 1, yy);
    if ((muriOr || muriVe) && vicinoStanza && !stanza(xx, yy) && r() < 0.55) set(xx, yy, '+');
  }
  return stanze;
}
// caverna (resina, rocce, fogne) con l'automa cellulare, solo la parte più grande
function caverna(g, W, x0, y0, w, h, r, pieno = 0.42) {
  const I = (x, y) => y * W + x;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) g[I(x, y)] = r() < pieno ? '#' : '.';
  for (let passo = 0; passo < 4; passo++) {
    const n = g.slice();
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      let k = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < x0 || yy < y0 || xx >= x0 + w || yy >= y0 + h || g[I(xx, yy)] === '#') k++; }
      n[I(x, y)] = k >= 5 ? '#' : '.';
    }
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) g[I(x, y)] = n[I(x, y)];
  }
  // tiene solo la zona più grande
  const vis = new Map(); let migliore = null, dim = 0;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const i0 = I(x, y); if (g[i0] === '#' || vis.has(i0)) continue;
    const coda = [i0]; vis.set(i0, i0); let n = 0;
    while (coda.length) { const j = coda.pop(); n++; const xx = j % W, yy = Math.floor(j / W); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = xx + dx, b = yy + dy; if (a < x0 || b < y0 || a >= x0 + w || b >= y0 + h) continue; const k = I(a, b); if (g[k] !== '#' && !vis.has(k)) { vis.set(k, i0); coda.push(k); } } }
    if (n > dim) { dim = n; migliore = i0; }
  }
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const i = I(x, y); if (g[i] !== '#' && vis.get(i) !== migliore) g[i] = '#'; }
}
// si può mettere un ostacolo qui senza tagliare il passaggio? (i vicini liberi restano collegati tra loro attorno)
function nonTaglia(g, W, H, x, y) {
  const lib = (xx, yy) => xx >= 0 && yy >= 0 && xx < W && yy < H && !BLOCCA.has(g[yy * W + xx]) && g[yy * W + xx] !== '+';
  const anello = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]].map(([dx, dy]) => lib(x + dx, y + dy));
  // le porte vicine non si bloccano mai
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const ch = g[(y + dy) * W + (x + dx)]; if (ch === '+' || ch === 'L' || ch === 'E' || ch === 'v') return false; }
  let corse = 0;
  for (let k = 0; k < 8; k++) if (anello[k] && !anello[(k + 7) % 8]) corse++;
  const liberi = anello.filter(Boolean).length;
  if (liberi === 8) return true;
  return corse <= 1 && liberi >= 2;
}
const contro = (g, W, x, y) => ['#'].includes(g[(y - 1) * W + x]) || g[(y + 1) * W + x] === '#' || g[y * W + x - 1] === '#' || g[y * W + x + 1] === '#';

// ---------- la stazione intera (tempo reale) ----------
function generaStazione(cp, seme) {
  const r = rng(seme);
  const cols = Math.max(...cp.aree.map((a) => a.gx)) + 1, righe = Math.max(...cp.aree.map((a) => a.gy)) + 1;
  const W = cols * SW, H = righe * SH;
  const g = new Array(W * H).fill('#');
  const I = (x, y) => y * W + x;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? '#' : g[I(x, y)]);
  const settore = {}; // area → { x0, y0, stanze }
  const contenitori = [], terminali = [], punti = [], passaggi = [], grate = [];
  for (const ar of cp.aree) {
    const x0 = ar.gx * SW, y0 = ar.gy * SH;
    let stanze = [];
    if (GROTTE.has(ar.stile)) caverna(g, W, x0 + 1, y0 + 1, SW - 2, SH - 2, r, ar.stile === 'fondale' ? 0.36 : 0.42);
    else if (ar.stile === 'cortile') { for (let y = y0 + 2; y < y0 + SH - 2; y++) for (let x = x0 + 2; x < x0 + SW - 2; x++) g[I(x, y)] = '.'; stanze = stanzeCorridoi(g, W, x0 + Math.floor(SW * 0.55), y0 + 1, Math.floor(SW * 0.45) - 1, SH - 2, r, { minimo: 6 }); }
    else stanze = stanzeCorridoi(g, W, x0 + 1, y0 + 1, SW - 2, SH - 2, r, { minimo: ar.stile === 'industriale' || ar.stile === 'tram' ? 9 : 7, largo: ['stazione', 'industriale', 'tram'].includes(ar.stile) ? 2 : 1 });
    settore[ar.id] = { x0, y0, stanze, area: ar };
  }
  const dentro = (ar, x, y) => x > ar.gx * SW && y > ar.gy * SH && x < ar.gx * SW + SW - 1 && y < ar.gy * SH + SH - 1;
  const liberaVicina = (ar, x, y) => { for (let rr = 0; rr < 30; rr++) for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) { const xx = x + dx, yy = y + dy; if (dentro(ar, xx, yy) && at(xx, yy) === '.') return { x: xx, y: yy }; } return { x, y }; };
  const scavaFino = (ar, x, y, dx, dy) => { // da (x, y) verso l'interno finché si trova il pavimento
    for (let k = 0; k < SW; k++) { if (!dentro(ar, x, y)) { x += dx; y += dy; continue; } if (at(x, y) === '.' && k > 0) return; if (at(x, y) === '#') g[I(x, y)] = '.'; x += dx; y += dy; }
  };
  // i collegamenti
  const aree = Object.fromEntries(cp.aree.map((a) => [a.id, a]));
  cp.collegamenti.forEach(([ia, ib, tipo, serve], n) => {
    const A = aree[ia], B = aree[ib];
    const vicini = Math.abs(A.gx - B.gx) + Math.abs(A.gy - B.gy) === 1;
    if (tipo === 'porta' && vicini) {
      const or = A.gy === B.gy; // vicini a destra o a sinistra
      const [P, Q] = (or ? A.gx < B.gx : A.gy < B.gy) ? [A, B] : [B, A];
      const ch = serve ? 'L' : '+';
      if (or) {
        const xb = Q.gx * SW; let y = P.gy * SH + 6 + Math.floor(r() * (SH - 13));
        for (const yy of [y, y + 1]) { g[I(xb - 1, yy)] = ch; g[I(xb, yy)] = ch; scavaFino(P, xb - 2, yy, -1, 0); scavaFino(Q, xb + 1, yy, 1, 0); }
        passaggi.push({ n, tipo, serve, celle: [[xb - 1, y], [xb, y], [xb - 1, y + 1], [xb, y + 1]], aree: [ia, ib] });
      } else {
        const yb = Q.gy * SH; const x = P.gx * SW + 7 + Math.floor(r() * (SW - 15));
        for (const xx of [x, x + 1]) { g[I(xx, yb - 1)] = ch; g[I(xx, yb)] = ch; scavaFino(P, xx, yb - 2, 0, -1); scavaFino(Q, xx, yb + 1, 0, 1); }
        passaggi.push({ n, tipo, serve, celle: [[x, yb - 1], [x, yb], [x + 1, yb - 1], [x + 1, yb]], aree: [ia, ib] });
      }
      return;
    }
    // ascensori, tram, condotti e porte lontane: un punto in ogni settore, si viaggia dall'uno all'altro
    const ch = tipo === 'condotto' ? 'v' : 'E';
    const capi = [A, B].map((ar) => {
      const s = settore[ar.id];
      for (let k = 0; k < 400; k++) {
        const st = s.stanze.length ? s.stanze[Math.floor(r() * s.stanze.length)] : null;
        const x = st ? st.x + Math.floor(r() * st.w) : s.x0 + 2 + Math.floor(r() * (SW - 4)), y = st ? st.y + Math.floor(r() * st.h) : s.y0 + 2 + Math.floor(r() * (SH - 4));
        if (at(x, y) === '.' && (ch === 'v' || contro(g, W, x, y)) && nonTaglia(g, W, H, x, y)) { g[I(x, y)] = ch; return { x, y }; }
      }
      const p = liberaVicina(ar, s.x0 + SW / 2 | 0, s.y0 + SH / 2 | 0); g[I(p.x, p.y)] = ch; return p;
    });
    passaggi.push({ n, tipo, serve, capi, aree: [ia, ib] });
  });
  // arredi, nascondigli, casse, terminali, grate, punti degli obiettivi
  const metti = (ar, ch, quanti, { muro = true, nelleStanze = true } = {}) => {
    const s = settore[ar.id], out = [];
    for (let k = 0; k < quanti * 40 && out.length < quanti; k++) {
      const st = nelleStanze && s.stanze.length ? s.stanze[Math.floor(r() * s.stanze.length)] : null;
      const x = st ? st.x + Math.floor(r() * st.w) : s.x0 + 1 + Math.floor(r() * (SW - 2)), y = st ? st.y + Math.floor(r() * st.h) : s.y0 + 1 + Math.floor(r() * (SH - 2));
      if (!dentro(ar, x, y) || at(x, y) !== '.' || (muro && !contro(g, W, x, y)) || !nonTaglia(g, W, H, x, y)) continue;
      g[I(x, y)] = ch; out.push({ x, y });
    }
    return out;
  };
  for (const ar of cp.aree) {
    const grotta = GROTTE.has(ar.stile);
    if (ar.stile === 'nido') metti(ar, 'u', 22, { muro: false, nelleStanze: false });
    if (ar.stile === 'fondale') metti(ar, 'r', 16, { muro: false, nelleStanze: false });
    if (ar.stile === 'fogne') { const s = settore[ar.id]; for (let y = s.y0 + 1; y < s.y0 + SH - 1; y++) for (let x = s.x0 + 1; x < s.x0 + SW - 1; x++) if (at(x, y) === '.' && r() < 0.45) g[I(x, y)] = '~'; }
    if (ar.stile === 'cortile') { metti(ar, 'T', 12, { muro: false, nelleStanze: false }); metti(ar, 'b', 10, { muro: false, nelleStanze: false }); }
    const nArm = ar.stile === 'manicomio' ? 5 : grotta ? 2 : 6;
    metti(ar, 'a', nArm);
    if (ar.stile === 'manicomio' || ar.stile === 'medico') metti(ar, 'l', 6);
    if (!grotta) metti(ar, 't', ['uffici', 'laboratorio'].includes(ar.stile) ? 8 : 4, { muro: false });
    if (ar.stile === 'industriale') metti(ar, ':', 8, { muro: false });
    for (const p of metti(ar, 'c', grotta ? 3 : 4)) contenitori.push({ ...p, area: ar.id, oggetti: [], aperto: false });
    if (!grotta) for (const p of metti(ar, 'k', 1)) { const testi = ar.documenti && ar.documenti.length ? ar.documenti : ar.eventi; terminali.push({ ...p, area: ar.id, testo: testi[Math.floor(r() * testi.length)] }); }
    for (const p of metti(ar, 'v', 3, { muro: false })) grate.push({ ...p, area: ar.id });
    for (const ob of cp.obiettivi.filter((o) => o.area === ar.id && o.fai !== 'raggiungi')) { const [p] = metti(ar, 'o', 1); if (p) punti.push({ ...p, area: ar.id, obiettivo: ob.id, nome: ob.cosa }); }
  }
  // il bottino delle casse: le risorse dell'area, a volte munizioni o batterie
  for (const c of contenitori) {
    const ar = aree[c.area];
    const n = 1 + Math.floor(r() * 2);
    for (let k = 0; k < n; k++) c.oggetti.push(ar.bottino.length ? ar.bottino[Math.floor(r() * ar.bottino.length)] : 'rottami');
    if (r() < 0.3) c.oggetti.push(cp.armi ? ['proiettili', 'cartucce', 'chiodi', 'carburante', 'batterie'][Math.floor(r() * 5)] : 'batterie');
  }
  // le grate dei condotti tra settori (i collegamenti 'condotto') sono anche grate da cui esce la creatura
  for (const p of passaggi) if (p.capi && p.tipo === 'condotto') p.capi.forEach((c2, k) => grate.push({ ...c2, area: p.aree[k], passaggio: p.n }));
  // la partenza: il centro più libero della prima area
  const prima = cp.aree.find((a) => a.id === cp.obiettivi[0].area) || cp.aree[0];
  const s0 = settore[prima.id];
  const st0 = s0.stanze.length ? s0.stanze.slice().sort((a, b) => (a.x + a.y) - (b.x + b.y))[0] : null;
  const partenza = st0 ? liberaVicina(prima, st0.cx, st0.cy) : liberaVicina(prima, s0.x0 + 4, s0.y0 + SH / 2 | 0);
  return { w: W, h: H, sw: SW, sh: SH, g: g.join(''), contenitori, terminali, punti, passaggi, grate, partenza, cols, righe };
}

// ---------- scene horror per il combattimento a turni ----------
function scenaHorror(stile, seme, { w = 30, h = 20, luce = null } = {}) {
  const r = rng(seme);
  const st = STILI.includes(stile) ? stile : 'stazione';
  const g = new Array(w * h).fill('#');
  let stanze = [];
  if (GROTTE.has(st)) caverna(g, w, 1, 1, w - 2, h - 2, r, st === 'fondale' ? 0.34 : 0.4);
  else if (st === 'cortile') { for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) g[y * w + x] = '.'; }
  else stanze = stanzeCorridoi(g, w, 1, 1, w - 2, h - 2, r, { minimo: 6, largo: ['stazione', 'industriale', 'tram'].includes(st) ? 2 : 1 });
  const metti = (ch, n, muro = true) => { for (let k = 0; k < n * 40 && n > 0; k++) { const x = 1 + Math.floor(r() * (w - 2)), y = 1 + Math.floor(r() * (h - 2)); if (g[y * w + x] !== '.' || (muro && !contro(g, w, x, y)) || !nonTaglia(g, w, h, x, y)) continue; g[y * w + x] = ch; n--; } };
  if (st === 'nido') metti('u', 14, false);
  if (st === 'fondale') metti('r', 10, false);
  if (st === 'cortile') { metti('T', 10, false); metti('b', 14, false); }
  if (st === 'fogne') for (let i = 0; i < w * h; i++) if (g[i] === '.' && r() < 0.4) g[i] = '~';
  metti('a', GROTTE.has(st) ? 2 : 5);
  if (!GROTTE.has(st) && st !== 'cortile') metti('t', 5, false);
  if (st === 'manicomio' || st === 'medico') metti('l', 4);
  metti('v', 2, false);
  return { stile: st, w, h, g, luce: luce || 'buio', zone: stanze.length > 1 ? { gruppo: stanze.slice().sort((a, b) => a.cx - b.cx)[0], nemici: stanze.slice().sort((a, b) => b.cx - a.cx)[0] } : null };
}

// linea di vista sulla stazione (centri delle caselle): la fermano muri, armadietti, terminali, porte chiuse
function vede(m, x0, y0, x1, y1, chiusa = null) {
  const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2.5) + 1;
  for (let k = 1; k < n; k++) {
    const x = Math.floor(x0 + ((x1 - x0) * k) / n), y = Math.floor(y0 + ((y1 - y0) * k) / n);
    if (x === Math.floor(x1) && y === Math.floor(y1)) continue;
    const ch = m.g[y * m.w + x];
    if (OPACO.has(ch) || (ch === '+' && chiusa && chiusa(x, y))) return false;
  }
  return true;
}

module.exports = { generaStazione, scenaHorror, vede, SW, SH, BLOCCA, SOTTO, OPACO, DIFFICILE, STILI, GROTTE, nonTaglia };
