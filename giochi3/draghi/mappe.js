// DRAGHI E SEGRETE: le mappe. Due tipi:
// - il MONDO: una regione vista dall'alto (stile pergamena), generata dal seme della campagna con rumore a più ottave:
//   mare, costa, pianure, foreste, colline, montagne, paludi, deserti; più i luoghi (villaggi, dungeon, torri…) che il
//   master aggiunge man mano. Si manda al browser come una griglia di lettere (un bioma per cella).
// - la SCENA: la griglia tattica a quadretti da 1,5 metri per i combattimenti (dungeon a stanze e corridoi, grotta,
//   foresta, villaggio, taverna, cripta, palude, montagna, strada, castello), con muri, porte, acqua, alberi,
//   ostacoli e coperture, le zone di partenza del gruppo e dei nemici sempre collegate.

// ---------- numeri casuali col seme ----------
function rng(seme) { let s = (Number(seme) >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// ---------- MONDO ----------
const MW = 96, MH = 64; // celle della mappa del mondo
const BIOMI = { m: 'mare', c: 'costa', p: 'pianura', f: 'foresta', F: 'foresta fitta', h: 'colline', M: 'montagne', n: 'neve', s: 'palude', d: 'deserto', l: 'lago' };
function rumore(r, w, h, scala) {
  const gw = Math.ceil(w / scala) + 2, gh = Math.ceil(h / scala) + 2;
  const g = Array.from({ length: gw * gh }, () => r());
  const sm = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const gx = x / scala, gy = y / scala, x0 = Math.floor(gx), y0 = Math.floor(gy), tx = sm(gx - x0), ty = sm(gy - y0);
    const v = (i, j) => g[(y0 + j) * gw + (x0 + i)];
    return (v(0, 0) * (1 - tx) + v(1, 0) * tx) * (1 - ty) + (v(0, 1) * (1 - tx) + v(1, 1) * tx) * ty;
  };
}
function generaMondo(seme) {
  const r = rng(seme);
  const alt = [rumore(r, MW, MH, 24), rumore(r, MW, MH, 11), rumore(r, MW, MH, 5)];
  const umi = [rumore(r, MW, MH, 20), rumore(r, MW, MH, 8)];
  const forma = r() < 0.5 ? 'isola' : 'costa'; // un continente circondato dal mare o una costa da un lato
  const lato = Math.floor(r() * 4);
  const celle = [];
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    let h = alt[0](x, y) * 0.6 + alt[1](x, y) * 0.3 + alt[2](x, y) * 0.1;
    const nx = x / MW - 0.5, ny = y / MH - 0.5;
    if (forma === 'isola') h -= Math.max(0, Math.hypot(nx * 1.05, ny * 1.3) - 0.33) * 1.5;
    else { const v = [nx, -nx, ny, -ny][lato]; h -= Math.max(0, v + 0.02) * 1.5; }
    const u = umi[0](x, y) * 0.7 + umi[1](x, y) * 0.3;
    let b;
    if (h < 0.3) b = 'm';
    else if (h < 0.34) b = 'c';
    else if (h > 0.7) b = h > 0.78 ? 'n' : 'M';
    else if (h > 0.6) b = 'h';
    else if (u > 0.68) b = h < 0.42 ? 's' : 'F';
    else if (u > 0.52) b = 'f';
    else if (u < 0.28 && h > 0.4) b = 'd';
    else b = 'p';
    celle.push(b);
  }
  // qualche lago nell'interno
  for (let k = 0; k < 3; k++) {
    const cx = 10 + Math.floor(r() * (MW - 20)), cy = 8 + Math.floor(r() * (MH - 16)), rr = 1.5 + r() * 2;
    if ('mc'.includes(celle[cy * MW + cx])) continue;
    for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 4; x <= cx + 4; x++) if (Math.hypot((x - cx) / 1.4, y - cy) < rr && celle[y * MW + x] !== 'm') celle[y * MW + x] = 'l';
  }
  return { seme, w: MW, h: MH, celle: celle.join(''), luoghi: [], percorso: [] };
}
const terra = (mondo, x, y) => { const b = mondo.celle[Math.round(y) * mondo.w + Math.round(x)]; return b && !'ml'.includes(b); };
// un posto libero sulla terra, vicino a (x, y) se dato, lontano dagli altri luoghi
function postoPerLuogo(mondo, { vicino = null, distanza = [6, 14], tipo = null } = {}, r = Math.random) {
  const preferiti = { porto: 'c', villaggio: 'pfh', citta: 'pc', foresta: 'fF', montagna: 'Mh', palude: 's', deserto: 'd', grotta: 'hM', torre: 'phf', rovine: 'phdf', dungeon: 'hMfF', castello: 'hp', tempio: 'phM' }[tipo] || '';
  let meglio = null, mv = -Infinity;
  for (let k = 0; k < 300; k++) {
    let x, y;
    if (vicino) { const a = r() * Math.PI * 2, dd = distanza[0] + r() * (distanza[1] - distanza[0]); x = vicino.x + Math.cos(a) * dd; y = vicino.y + Math.sin(a) * dd * 0.8; }
    else { x = 8 + r() * (mondo.w - 16); y = 6 + r() * (mondo.h - 12); }
    x = Math.max(2, Math.min(mondo.w - 3, x)); y = Math.max(2, Math.min(mondo.h - 3, y));
    if (!terra(mondo, x, y)) continue;
    const vicinoAltri = Math.min(99, ...mondo.luoghi.map((l) => Math.hypot(l.x - x, l.y - y)));
    const b = mondo.celle[Math.round(y) * mondo.w + Math.round(x)];
    const v = Math.min(vicinoAltri, 8) + (preferiti.includes(b) ? 4 : 0) + r();
    if (v > mv) { mv = v; meglio = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }; }
  }
  return meglio || { x: mondo.w / 2, y: mondo.h / 2 };
}
const TIPI_LUOGO = ['villaggio', 'citta', 'porto', 'taverna', 'castello', 'torre', 'tempio', 'rovine', 'dungeon', 'grotta', 'cripta', 'foresta', 'montagna', 'palude', 'deserto', 'accampamento', 'ponte', 'miniera', 'fattoria', 'lago', 'altro'];
function aggiungiLuogo(mondo, { nome, tipo, descrizione = '', vicinoA = null }, r = Math.random) {
  const t = TIPI_LUOGO.includes(tipo) ? tipo : 'altro';
  const nomeP = String(nome || '').trim().slice(0, 40);
  if (!nomeP) return null;
  const gia = mondo.luoghi.find((l) => l.nome.toLowerCase() === nomeP.toLowerCase());
  if (gia) { if (descrizione) gia.descrizione = String(descrizione).slice(0, 300); return gia; }
  const rif = vicinoA ? mondo.luoghi.find((l) => l.id === vicinoA) : null;
  const pos = postoPerLuogo(mondo, { vicino: rif, tipo: t }, r);
  const l = { id: `l${mondo.luoghi.length + 1}`, nome: nomeP, tipo: t, descrizione: String(descrizione).slice(0, 300), x: pos.x, y: pos.y, visitato: false };
  mondo.luoghi.push(l);
  return l;
}

// ---------- SCENA (griglia tattica) ----------
// celle: '#' muro, '.' pavimento/terreno, '+' porta, '~' acqua (terreno difficile), 'T' albero (blocca), 'b' cespuglio
// (difficile, copertura), 'r' roccia (blocca), 't' tavolo/mobile (copertura, blocca), ':' macerie (difficile),
// 'w' acqua profonda (non si passa), 'c' colonna (blocca), 'S' sarcofago/altare (blocca), 'f' fuoco/camino (blocca)
// (ambientazioni horror, vedi stazione.js) 'a' armadietto, 'l' letto, 'k' terminale, 'u' uova e resina, 'L' porta
// chiusa (bloccano), 'v' grata del condotto (si passa: da lì esce la creatura)
const BLOCCA = new Set(['#', 'T', 'r', 't', 'w', 'c', 'S', 'f', 'a', 'l', 'k', 'u', 'L', 'o']);
const DIFFICILE = new Set(['~', 'b', ':']);
const OPACO = new Set(['#', 'T', 'r', 'c', 'a', 'k', 'L']);
const STILI_SCENA = ['dungeon', 'grotta', 'foresta', 'villaggio', 'taverna', 'cripta', 'palude', 'montagna', 'strada', 'castello'];

function scena(stile, seme, { w = 30, h = 20, luce = null } = {}) {
  const r = rng(seme);
  const S = require('./stazione');
  if (S.STILI.includes(stile)) return finisci(S.scenaHorror(stile, seme, { w, h, luce }), r);
  const st = STILI_SCENA.includes(stile) ? stile : 'dungeon';
  const g = new Array(w * h).fill('.');
  const I = (x, y) => y * w + x;
  const dentro = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  const set = (x, y, ch) => { if (dentro(x, y)) g[I(x, y)] = ch; };
  const riempi = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, ch); };
  const sparsi = (ch, densita, solo = '.') => { for (let i = 0; i < w * h; i++) if (g[i] === solo && r() < densita) g[i] = ch; };
  if (st === 'dungeon' || st === 'cripta' || st === 'castello') {
    g.fill('#');
    // stanze rettangolari non sovrapposte, poi corridoi tra i centri (in ordine), qualche porta
    const stanze = [];
    for (let k = 0; k < 60 && stanze.length < (st === 'castello' ? 6 : 8); k++) {
      const sw = 4 + Math.floor(r() * (st === 'castello' ? 8 : 6)), sh = 3 + Math.floor(r() * 5);
      const x = 1 + Math.floor(r() * (w - sw - 2)), y = 1 + Math.floor(r() * (h - sh - 2));
      if (stanze.some((s) => x < s.x + s.w + 1 && x + sw + 1 > s.x && y < s.y + s.h + 1 && y + sh + 1 > s.y)) continue;
      stanze.push({ x, y, w: sw, h: sh, cx: x + Math.floor(sw / 2), cy: y + Math.floor(sh / 2) });
    }
    stanze.sort((a, b) => a.cx - b.cx);
    for (const s of stanze) riempi(s.x, s.y, s.x + s.w - 1, s.y + s.h - 1, '.');
    for (let k = 1; k < stanze.length; k++) {
      const a = stanze[k - 1], b = stanze[k];
      const orizzontaleprima = r() < 0.5;
      const scava = (x, y) => { if (g[I(x, y)] === '#') g[I(x, y)] = '.'; };
      if (orizzontaleprima) { for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx); x++) scava(x, a.cy); for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy); y++) scava(b.cx, y); }
      else { for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy); y++) scava(a.cx, y); for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx); x++) scava(x, b.cy); }
    }
    // porte: celle di corridoio sul bordo di una stanza, tra due muri
    for (const s of stanze) for (let x = s.x - 1; x <= s.x + s.w; x++) for (let y = s.y - 1; y <= s.y + s.h; y++) {
      if (!dentro(x, y) || g[I(x, y)] !== '.') continue;
      const bordo = x === s.x - 1 || x === s.x + s.w || y === s.y - 1 || y === s.y + s.h;
      if (!bordo) continue;
      const murOrizz = dentro(x - 1, y) && dentro(x + 1, y) && g[I(x - 1, y)] === '#' && g[I(x + 1, y)] === '#';
      const murVert = dentro(x, y - 1) && dentro(x, y + 1) && g[I(x, y - 1)] === '#' && g[I(x, y + 1)] === '#';
      if ((murOrizz || murVert) && r() < 0.6) g[I(x, y)] = '+';
    }
    // arredi
    for (const s of stanze.slice(1, -1)) {
      if (st === 'cripta' && r() < 0.8) { set(s.cx, s.cy, 'S'); if (s.w > 5) { set(s.cx - 2, s.cy, 'S'); set(s.cx + 2, s.cy, 'S'); } }
      else if (s.w >= 6 && s.h >= 5 && r() < 0.6) { set(s.x + 1, s.y + 1, 'c'); set(s.x + s.w - 2, s.y + 1, 'c'); set(s.x + 1, s.y + s.h - 2, 'c'); set(s.x + s.w - 2, s.y + s.h - 2, 'c'); }
      if (r() < 0.4) set(s.x + Math.floor(r() * s.w), s.y + Math.floor(r() * s.h), ':');
    }
    if (st === 'castello') for (const s of stanze) if (r() < 0.5) set(s.cx, s.y, 't');
    return finisci({ stile: st, w, h, g, luce: luce || (st === 'castello' ? 'torce' : 'buio'), zone: { gruppo: stanze[0], nemici: stanze[stanze.length - 1] } }, r);
  }
  if (st === 'grotta' || st === 'montagna') {
    // automa cellulare: roccia e spazi, poi si tiene la caverna più grande
    for (let i = 0; i < w * h; i++) g[i] = r() < (st === 'grotta' ? 0.44 : 0.3) ? (st === 'grotta' ? '#' : 'r') : '.';
    const roccia = st === 'grotta' ? '#' : 'r';
    for (let passo = 0; passo < 4; passo++) {
      const n = g.slice();
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let k = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!dentro(x + dx, y + dy) || g[I(x + dx, y + dy)] === roccia) k++;
        n[I(x, y)] = k >= 5 ? roccia : '.';
      }
      for (let i = 0; i < w * h; i++) g[i] = n[i];
    }
    tieniPiuGrande(g, w, h, roccia);
    if (st === 'grotta') { sparsi(':', 0.03); sparsi('~', 0.02); } else sparsi('b', 0.04);
    return finisci({ stile: st, w, h, g, luce: luce || (st === 'grotta' ? 'buio' : 'giorno') }, r);
  }
  if (st === 'foresta' || st === 'palude' || st === 'strada') {
    const alberi = st === 'foresta' ? 0.16 : st === 'palude' ? 0.06 : 0.07;
    sparsi('T', alberi); sparsi('b', st === 'palude' ? 0.12 : 0.08);
    if (st === 'palude') { const acqua = rumore(r, w, h, 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = acqua(x, y); if (v > 0.62) g[I(x, y)] = v > 0.75 ? 'w' : '~'; } }
    if (st === 'strada' || st === 'foresta') {
      // un sentiero (o una strada) che attraversa la scena da sinistra a destra
      let y = Math.floor(h / 2);
      for (let x = 0; x < w; x++) { for (let k = -1; k <= (st === 'strada' ? 1 : 0); k++) set(x, y + k, '.'); if (r() < 0.25) y = Math.max(2, Math.min(h - 3, y + (r() < 0.5 ? -1 : 1))); }
    }
    if (st === 'foresta' && r() < 0.6) { const cx = 8 + Math.floor(r() * (w - 16)), cy = 5 + Math.floor(r() * (h - 10)); for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 4; x <= cx + 4; x++) if (Math.hypot((x - cx) / 1.3, y - cy) < 3.2) set(x, y, '.'); }
    return finisci({ stile: st, w, h, g, luce: luce || 'giorno' }, r);
  }
  if (st === 'villaggio') {
    // case (muri con una porta) su un prato con una piazza e un pozzo
    for (let k = 0; k < 40; k++) {
      const cw = 4 + Math.floor(r() * 3), ch = 3 + Math.floor(r() * 3);
      const x = 1 + Math.floor(r() * (w - cw - 2)), y = 1 + Math.floor(r() * (h - ch - 2));
      let libero = true; for (let yy = y - 1; yy <= y + ch; yy++) for (let xx = x - 1; xx <= x + cw; xx++) if (!dentro(xx, yy) || g[I(xx, yy)] !== '.') libero = false;
      if (!libero || Math.abs(x + cw / 2 - w / 2) < 5 && Math.abs(y + ch / 2 - h / 2) < 4) continue;
      for (let yy = y; yy < y + ch; yy++) for (let xx = x; xx < x + cw; xx++) set(xx, yy, yy === y || yy === y + ch - 1 || xx === x || xx === x + cw - 1 ? '#' : '.');
      const lato = Math.floor(r() * 4);
      const [px, py] = [[x + Math.floor(cw / 2), y], [x + Math.floor(cw / 2), y + ch - 1], [x, y + Math.floor(ch / 2)], [x + cw - 1, y + Math.floor(ch / 2)]][lato];
      set(px, py, '+');
      if (r() < 0.5) set(x + 1, y + 1, 't');
    }
    set(Math.floor(w / 2), Math.floor(h / 2), 'w');
    for (let i = 0; i < w * h; i++) if (g[i] === '.' && r() < 0.03) g[i] = 'b';
    for (let i = 0; i < w * h; i++) if (g[i] === '.' && r() < 0.015) g[i] = 'T';
    return finisci({ stile: st, w, h, g, luce: luce || 'giorno' }, r);
  }
  // taverna: una sala grande con tavoli, il bancone, il camino; fuori un po' di strada
  g.fill('#');
  const x0 = 2, y0 = 2, x1 = w - 3, y1 = h - 3;
  riempi(x0, y0, x1, y1, '.');
  for (let x = x0 + 2; x <= x0 + 9; x++) set(x, y0 + 2, 't'); // bancone
  set(x1 - 1, y0, 'f'); // camino
  for (let k = 0; k < 9; k++) { const tx = x0 + 3 + Math.floor(r() * (x1 - x0 - 6)), ty = y0 + 5 + Math.floor(r() * (y1 - y0 - 7)); set(tx, ty, 't'); if (r() < 0.6) set(tx + 1, ty, 't'); }
  set(Math.floor(w / 2), y1 + 1, '+'); riempi(Math.floor(w / 2) - 1, y1 + 2, Math.floor(w / 2) + 1, h - 1, '.');
  set(x0 - 1, Math.floor(h / 2), '+');
  riempi(x1 - 4, y0 + 1, x1 - 4, y0 + 4, '#'); set(x1 - 4, y0 + 3, '+'); // la cucina
  return finisci({ stile: 'taverna', w, h, g, luce: luce || 'torce' }, r);
}
// solo la zona libera più grande resta libera (così tutto è raggiungibile)
function tieniPiuGrande(g, w, h, pieno) {
  const vis = new Int32Array(w * h).fill(-1);
  let migliore = -1, dim = 0, id = 0;
  for (let i = 0; i < w * h; i++) {
    if (g[i] === pieno || vis[i] >= 0) continue;
    const coda = [i]; vis[i] = id; let n = 0;
    while (coda.length) { const j = coda.pop(); n++; const x = j % w, y = Math.floor(j / w); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const k = yy * w + xx; if (vis[k] < 0 && g[k] !== pieno) { vis[k] = id; coda.push(k); } } }
    if (n > dim) { dim = n; migliore = id; }
    id++;
  }
  for (let i = 0; i < w * h; i++) if (g[i] !== pieno && vis[i] !== migliore) g[i] = pieno;
}
const passabile = (ch) => !BLOCCA.has(ch);
// distanze a passi (anche in diagonale) da una cella
function distanze(sc, x0, y0, { costoDifficile = 2 } = {}) {
  const { w, h, g } = sc;
  const dist = new Array(w * h).fill(Infinity);
  dist[y0 * w + x0] = 0;
  const coda = [[0, x0, y0]];
  while (coda.length) {
    coda.sort((a, b) => a[0] - b[0]);
    const [dd, x, y] = coda.shift();
    if (dd > dist[y * w + x]) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const ch = g[yy * w + xx];
      if (!passabile(ch)) continue;
      if (dx && dy && (!passabile(g[y * w + xx]) || !passabile(g[yy * w + x]))) continue; // niente angoli tagliati tra due muri
      const nd = dd + (DIFFICILE.has(ch) ? costoDifficile : 1);
      if (nd < dist[yy * w + xx]) { dist[yy * w + xx] = nd; coda.push([nd, xx, yy]); }
    }
  }
  return dist;
}
// le zone di partenza: il gruppo da una parte, i nemici lontani (ma raggiungibili)
function finisci(sc, r) {
  const { w, h, g } = sc;
  const libere = [];
  for (let i = 0; i < w * h; i++) if (passabile(g[i]) && g[i] !== '~') libere.push(i);
  if (!libere.length) { g.fill('.'); return finisci(sc, r); }
  let partenza = null;
  if (sc.zone && sc.zone.gruppo) { const z = sc.zone.gruppo; partenza = z.cy * w + z.cx; }
  if (partenza === null || !passabile(g[partenza])) {
    // la cella libera più a sinistra della zona collegata più grande
    const comp = new Int32Array(w * h).fill(-1);
    let migliore = -1, dim = 0;
    for (const i0 of libere) {
      if (comp[i0] >= 0) continue;
      const coda = [i0]; comp[i0] = i0; let n = 0;
      while (coda.length) { const j = coda.pop(); n++; const x = j % w, y = Math.floor(j / w); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const k = yy * w + xx; if (comp[k] < 0 && passabile(g[k])) { comp[k] = i0; coda.push(k); } } }
      if (n > dim) { dim = n; migliore = i0; }
    }
    partenza = libere.filter((i) => comp[i] === migliore).reduce((a, b) => ((b % w) < (a % w) ? b : a));
  }
  const dist = distanze(sc, partenza % w, Math.floor(partenza / w));
  const raggiunte = libere.filter((i) => dist[i] < Infinity);
  // il punto più lontano raggiungibile è dove stanno i nemici
  let lontano = raggiunte.reduce((a, b) => (dist[b] > dist[a] ? b : a), partenza);
  if (sc.zone && sc.zone.nemici) { const z = sc.zone.nemici; const k = z.cy * w + z.cx; if (dist[k] < Infinity) lontano = k; }
  const vicino = (centro, n) => raggiunte.slice().sort((a, b) => Math.hypot(a % w - centro % w, Math.floor(a / w) - Math.floor(centro / w)) - Math.hypot(b % w - centro % w, Math.floor(b / w) - Math.floor(centro / w))).slice(0, n).map((i) => ({ x: i % w, y: Math.floor(i / w) }));
  sc.partenzaGruppo = vicino(partenza, 12);
  sc.partenzaNemici = vicino(lontano, 24);
  delete sc.zone;
  sc.g = g.join('');
  return sc;
}

// linea di vista tra due celle (centri): la blocca un muro, un albero, una roccia, una colonna
function vista(sc, x0, y0, x1, y1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 3;
  for (let k = 1; k < n; k++) {
    const x = Math.round(x0 + ((x1 - x0) * k) / n), y = Math.round(y0 + ((y1 - y0) * k) / n);
    if ((x === x0 && y === y0) || (x === x1 && y === y1)) continue;
    if (OPACO.has(sc.g[y * sc.w + x])) return false;
  }
  return true;
}
// copertura: mezza (+2 CA) se tra attaccante e bersaglio c'è un cespuglio, un tavolo, una creatura; tre quarti (+5) se è
// dietro a uno spigolo di muro
function copertura(sc, x0, y0, x1, y1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 3;
  let c = 0;
  for (let k = 1; k < n; k++) {
    const x = Math.round(x0 + ((x1 - x0) * k) / n), y = Math.round(y0 + ((y1 - y0) * k) / n);
    if ((x === x0 && y === y0) || (x === x1 && y === y1)) continue;
    const ch = sc.g[y * sc.w + x];
    if (ch === 'b' || ch === 't' || ch === 'S' || ch === 'l') c = Math.max(c, 2);
  }
  return c;
}

module.exports = { rng, generaMondo, aggiungiLuogo, postoPerLuogo, TIPI_LUOGO, BIOMI, MW, MH, scena, STILI_SCENA, BLOCCA, DIFFICILE, OPACO, passabile, distanze, vista, copertura };
