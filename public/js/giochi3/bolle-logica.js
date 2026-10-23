// BOLLE COLORATE: le regole comuni a server e browser (il server lo carica con require, il browser lo trova in
// window.BolleLogica). Bolle in una griglia a nido d'ape attaccata al soffitto; dal cannone in basso si tira una bolla
// che rimbalza sui lati e si attacca dove tocca. 3 o più dello stesso colore scoppiano, e cadono quelle rimaste senza
// appiglio. Ogni tanto il soffitto scende di una riga. Le bolle nuove escono da un generatore col seme: con gli stessi
// tiri, le stesse bolle (così il browser disegna subito il tiro e tutti hanno la stessa partita).
(function (radice, crea) {
  if (typeof module === 'object' && module.exports) module.exports = crea();
  else radice.BolleLogica = crea();
}(typeof window !== 'undefined' ? window : globalThis, () => {
  const R = 20, D = 40, COL = 11, RH = D * Math.sqrt(3) / 2;
  const W = COL * D, RIGHE_MAX = 12; // una bolla nella riga 12 (la tredicesima) = bolle arrivate in fondo
  const H = Math.round(R + RIGHE_MAX * RH + 110);
  const CANNONE = { x: W / 2, y: H - 46 };
  const LIVELLI = {
    facile: { colori: 4, righe: 5, ogni: 8 },
    medio: { colori: 5, righe: 6, ogni: 6 },
    difficile: { colori: 6, righe: 7, ogni: 5 },
  };
  const ANGOLO_MAX = 1.42; // circa 81° dalla verticale

  function prossimo(r) { r.a = (r.a + 0x6d2b79f5) >>> 0; let t = r.a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const intero = (r, n) => Math.floor(prossimo(r) * n);

  // la riga r è "corta" (una bolla in meno, spostata di mezza bolla) a righe alterne; sfasa cambia quando scende il soffitto
  const corta = (t, r) => (r + t.sfasa) % 2 === 1;
  const larghezza = (t, r) => (corta(t, r) ? COL - 1 : COL);
  const centro = (t, r, c) => [R + c * D + (corta(t, r) ? R : 0), R + r * RH];
  function vicine(t, r, c) {
    const out = [[r, c - 1], [r, c + 1]];
    const d = corta(t, r) ? [0, 1] : [-1, 0];
    for (const rr of [r - 1, r + 1]) for (const dc of d) out.push([rr, c + dc]);
    return out.filter(([a, b]) => a >= 0 && b >= 0 && b < larghezza(t, a));
  }
  const presa = (t, r, c) => (t.g[r] && t.g[r][c] != null && t.g[r][c] >= 0 ? t.g[r][c] : -1);
  const copia = (t) => ({ ...t, g: t.g.map((x) => x.slice()), r: { a: t.r.a }, colpi: t.colpi });

  function coloriPresenti(t) { const s = new Set(); for (const riga of t.g) for (const v of riga) if (v >= 0) s.add(v); return [...s].sort((a, b) => a - b); }
  // la bolla che arriva: un colore ancora in gioco (all'inizio: uno qualsiasi)
  function pesca(t) { const ci = coloriPresenti(t); return ci.length ? ci[intero(t.r, ci.length)] : intero(t.r, t.colori); }

  function nuova(seme, livello = 'medio') {
    const L = LIVELLI[livello] || LIVELLI.medio;
    const t = { g: [], sfasa: 0, r: { a: seme >>> 0 }, colori: L.colori, ogni: L.ogni, mancati: 0, punti: 0, colpi: 0, perso: false };
    for (let r = 0; r < L.righe; r++) t.g.push(rigaNuova(t, r));
    t.attuale = pesca(t); t.prossima = pesca(t);
    return t;
  }
  // una riga piena: a coppie dello stesso colore ogni tanto, così si vedono subito dei gruppi
  function rigaNuova(t, r) {
    const out = [];
    for (let c = 0; c < larghezza(t, r); c++) out.push(c && prossimo(t.r) < 0.35 ? out[c - 1] : intero(t.r, t.colori));
    return out;
  }

  // IL TIRO: la strada della bolla (punti dove cambia direzione) e la casella dove si attacca
  function traiettoria(t, angolo) {
    const a = Math.max(-ANGOLO_MAX, Math.min(ANGOLO_MAX, Number(angolo) || 0));
    let x = CANNONE.x, y = CANNONE.y, dx = Math.sin(a), dy = -Math.cos(a);
    const punti = [[x, y]], passo = 4;
    for (let k = 0; k < 4000; k++) {
      x += dx * passo; y += dy * passo;
      if (x < R) { x = 2 * R - x; dx = -dx; punti.push([R, y]); }
      if (x > W - R) { x = 2 * (W - R) - x; dx = -dx; punti.push([W - R, y]); }
      let tocca = y <= R;
      if (!tocca) {
        // contro una bolla (un po' più stretti del diametro, così si passa nei varchi come nel gioco vero)
        const r0 = Math.max(0, Math.floor((y - R) / RH) - 1);
        const c0 = Math.max(0, Math.floor((x - 2 * R) / D) - 1);
        for (let r = r0; r <= r0 + 3 && r < t.g.length && !tocca; r++) for (let c = c0; c <= c0 + 3 && c < larghezza(t, r); c++) {
          if (presa(t, r, c) < 0) continue;
          const [cx, cy] = centro(t, r, c);
          if ((cx - x) ** 2 + (cy - y) ** 2 < (D * 0.82) ** 2) { tocca = true; break; }
        }
      }
      if (tocca) { const [r, c] = posto(t, x, y); punti.push(centro(t, r, c)); return { punti, r, c }; }
    }
    return null;
  }
  // la casella libera più vicina al punto d'arrivo, attaccata al soffitto o a un'altra bolla
  function posto(t, x, y) {
    let meglio = null, md = Infinity;
    const r0 = Math.max(0, Math.round((y - R) / RH) - 1);
    for (let r = r0; r <= r0 + 2; r++) for (let c = 0; c < larghezza(t, r); c++) {
      if (presa(t, r, c) >= 0) continue;
      const attaccata = r === 0 || vicine(t, r, c).some(([a, b]) => presa(t, a, b) >= 0);
      if (!attaccata) continue;
      const [cx, cy] = centro(t, r, c), d = (cx - x) ** 2 + (cy - y) ** 2;
      if (d < md) { md = d; meglio = [r, c]; }
    }
    return meglio || [0, Math.max(0, Math.min(larghezza(t, 0) - 1, Math.round((x - R) / D)))];
  }
  function gruppo(t, r, c, stesso) {
    const v0 = presa(t, r, c), visti = new Set([`${r},${c}`]), coda = [[r, c]], out = [];
    while (coda.length) {
      const [a, b] = coda.pop(); out.push([a, b]);
      for (const [x, y] of vicine(t, a, b)) { const k = `${x},${y}`; if (visti.has(k) || presa(t, x, y) < 0 || (stesso && presa(t, x, y) !== v0)) continue; visti.add(k); coda.push([x, y]); }
    }
    return out;
  }
  const quante = (t) => t.g.reduce((s, riga) => s + riga.filter((v) => v >= 0).length, 0);

  // UN TIRO: la bolla parte con l'angolo dato, si attacca, scoppia (3+), cadono le bolle staccate; ogni tanto scende
  // il soffitto. Restituisce cosa è successo, per l'animazione.
  function tira(t, angolo) {
    if (t.perso || !quante(t)) return { errore: 'La partita è finita' };
    const tr = traiettoria(t, angolo);
    if (!tr) return { errore: 'Tiro non valido' };
    const colore = t.attuale;
    while (t.g.length <= tr.r) t.g.push(new Array(larghezza(t, t.g.length)).fill(-1));
    t.g[tr.r][tr.c] = colore;
    t.colpi++;
    let scoppiate = [], cadute = [];
    const stesso = gruppo(t, tr.r, tr.c, true);
    if (stesso.length >= 3) {
      scoppiate = stesso.map(([a, b]) => [a, b, colore]);
      for (const [a, b] of stesso) t.g[a][b] = -1;
      // cadono le bolle che non sono più attaccate al soffitto
      const tenute = new Set();
      for (let c = 0; c < larghezza(t, 0); c++) if (presa(t, 0, c) >= 0) for (const [a, b] of gruppo(t, 0, c, false)) tenute.add(`${a},${b}`);
      t.g.forEach((riga, a) => riga.forEach((v, b) => { if (v >= 0 && !tenute.has(`${a},${b}`)) { cadute.push([a, b, v]); riga[b] = -1; } }));
      t.punti += scoppiate.length * 10 + cadute.length * 20 + (cadute.length >= 5 ? cadute.length * 10 : 0);
      t.mancati = 0;
    } else t.mancati++;
    while (t.g.length && t.g[t.g.length - 1].every((v) => v < 0)) t.g.pop();
    let scende = false;
    if (t.mancati >= t.ogni && quante(t)) {
      // il soffitto scende: una riga nuova in cima
      t.mancati = 0; scende = true;
      t.sfasa ^= 1;
      t.g.unshift(rigaNuova(t, 0));
    }
    t.attuale = t.prossima; t.prossima = pesca(t);
    // la bolla che deve partire deve essere di un colore ancora in gioco
    const ci = coloriPresenti(t);
    if (ci.length && !ci.includes(t.attuale)) t.attuale = ci[intero(t.r, ci.length)];
    if (t.g.length > RIGHE_MAX) t.perso = true;
    return { ok: true, punti: tr.punti, r: tr.r, c: tr.c, colore, scoppiate, cadute, scende, vuota: !quante(t), perso: t.perso };
  }
  function scambia(t) { [t.attuale, t.prossima] = [t.prossima, t.attuale]; return { ok: true }; }

  // il computer (e l'aiuto): prova tanti angoli e dice quanto vale ognuno (la bolla si mette per finta e si toglie)
  function prova(t, angolo) {
    const tr = traiettoria(t, angolo);
    if (!tr) return null;
    const righe = t.g.length;
    while (t.g.length <= tr.r) t.g.push(new Array(larghezza(t, t.g.length)).fill(-1));
    t.g[tr.r][tr.c] = t.attuale;
    const stesso = gruppo(t, tr.r, tr.c, true);
    let cadute = 0;
    if (stesso.length >= 3) {
      const k = copia(t);
      for (const [a, b2] of stesso) k.g[a][b2] = -1;
      const tenute = new Set();
      for (let c = 0; c < larghezza(k, 0); c++) if (presa(k, 0, c) >= 0) for (const [a, b2] of gruppo(k, 0, c, false)) tenute.add(`${a},${b2}`);
      k.g.forEach((riga, a) => riga.forEach((v, b2) => { if (v >= 0 && !tenute.has(`${a},${b2}`)) cadute++; }));
    }
    const vicini = stesso.length - 1;
    t.g[tr.r][tr.c] = -1;
    t.g.length = righe;
    return { scoppiate: stesso.length >= 3 ? stesso.length : 0, cadute, vicini, riga: tr.r, perso: stesso.length < 3 && tr.r >= RIGHE_MAX, vuota: false };
  }

  return { R, D, COL, RH, W, H, CANNONE, RIGHE_MAX, LIVELLI, ANGOLO_MAX, nuova, tira, scambia, traiettoria, prova, copia, centro, larghezza, corta, quante, vicine, coloriPresenti };
}));
