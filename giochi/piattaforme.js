// SALTA E CORRI: corsa a piattaforme vista di lato. Il percorso alterna tratti in orizzontale (buche, gradini) e tratti
// in verticale (pareti da scalare saltando di piattaforma in piattaforma, scalinate in discesa). Ci sono potenziamenti:
// monete da raccogliere, scatole "?" con oggetti a sorpresa (doppio salto, turbo, stella, fulmine, buccia di banana), piattaforme
// che crollano, e si può saltare in testa agli altri. Chi cade in una buca riparte dall'ultimo punto sicuro.
// Vince chi arriva primo alla bandiera (le monete danno punti in più).
const { Arena, casuale } = require('./arena');
const TR = require('./trucco');
// il trucco segreto (!win): un vantaggio per il resto del round (al massimo 25 secondi di gioco), poi si spegne
function conTrucco(g, p) {
  if (!TR.armato(g, p) || g.fase !== 'gioco') return false;
  const da = (g._winDa = g._winDa || {});
  if (da[p] == null || da[p] > g.tempoRound) da[p] = g.tempoRound;
  if (g.tempoRound - da[p] < 25) return true;
  TR.consuma(g, p); delete da[p];
  return false;
}
// a fine round si spegne (se è servito almeno un secondo; altrimenti vale anche per il prossimo round)
function fineTrucco(g, sempre = false) {
  for (let p = 0; p < g.n; p++) { const da = g._winDa && g._winDa[p]; if (da != null && (sempre || g.tempoRound - da >= 1)) TR.consuma(g, p); if (g._winDa) delete g._winDa[p]; }
}
const T = 40, RIGHE = 24, W = 1000, H = 620;
const LARG = 24, ALT = 34, V = 250, GRAV = 1900, SALTO = 760, POT_T = 8;
const STELLA_T = 5, STORDITO_FULMINE = 1.4, STORDITO_BUCCIA = 1.1, STORDITO_TESTA = 0.9, RITORNO_SCATOLA = 6, MONETE_PUNTO = 5, CROLLO = 0.6, RITORNO_CROLLO = 3;

function costruisci() {
  const segmenti = ['piano', 'salita', 'piano', 'discesa', 'piano', 'salita', 'piano', 'discesa', 'piano'];
  const colonne = []; // per colonna: righe solide (Set)
  const tappe = []; // punti che il computer segue, in ordine
  const controlli = []; // punti di ripartenza
  const pot = [];
  const monete = []; const moneta = (x, y) => monete.push({ id: monete.length + 1, x, y });
  const punte = new Set(); // "riga,colonna" delle caselle con gli spuntoni (non sono solide: uccidono)
  const tratti = [];
  const crollano = new Set(); // piattaforme che crollano poco dopo che qualcuno ci sale (e tornano dopo 3 secondi) // i tratti in piano, per metterci i nemici
  let g = 19, c = 0;
  const pieno = (col, da) => { colonne[col] = colonne[col] || new Set(); for (let r = da; r < RIGHE; r++) colonne[col].add(r); };
  const blocco = (col, r) => { colonne[col] = colonne[col] || new Set(); colonne[col].add(r); };
  const vuoto = (col) => { colonne[col] = colonne[col] || new Set(); };
  for (const s of segmenti) {
    controlli.push({ x: c * T + T * 1.5, y: g * T - ALT });
    if (s === 'piano') {
      const lung = Math.floor(casuale(22, 30));
      tratti.push({ da: c, a: c + lung, g });
      let k = 0, dopoBuca = 0;
      while (k < lung) {
        const qui = c + k;
        if (k > 4 && k < lung - 5 && dopoBuca === 0 && !(colonne[qui - 1] && colonne[qui - 1].has(g - 1)) && Math.random() < 0.1) {
          // spuntoni sul terreno, larghi una o due caselle: si saltano
          const larghe = Math.random() < 0.55 ? 1 : 2;
          for (let j = 0; j < larghe; j++) { pieno(qui + j, g); punte.add(`${g - 1},${qui + j}`); }
          k += larghe; dopoBuca = 4; continue;
        }
        if (k > 3 && k < lung - 4 && dopoBuca === 0 && Math.random() < 0.16) {
          const buca = Math.random() < 0.5 ? 2 : 3;
          for (let j = 0; j < buca; j++) vuoto(qui + j);
          for (let j = 0; j <= buca; j++) moneta((qui + j) * T, (g - 2.2 - Math.sin((j / buca) * Math.PI) * 1.3) * T); // arco di monete sopra la buca
          k += buca; dopoBuca = 3; continue;
        }
        pieno(qui, g);
        if (dopoBuca > 0) dopoBuca--;
        else if (k > 3 && k < lung - 3 && Math.random() < 0.12) { const h = Math.random() < 0.5 ? 1 : 2; for (let r = 1; r <= h; r++) blocco(qui, g - r); tappe.push({ x: qui * T + T / 2, y: (g - h) * T - ALT / 2 }); dopoBuca = 2; }
        else tappe.push({ x: qui * T + T / 2, y: g * T - ALT / 2 });
        if (k % 13 === 7) pot.push({ id: pot.length + 1, x: qui * T + T / 2, y: (g - 2.6) * T }); // scatola "?" da prendere saltando
        else if (k % 9 === 3 && dopoBuca === 0) moneta(qui * T + T / 2, (g - 0.9) * T);
        k++;
      }
      c += lung;
    } else if (s === 'salita') {
      // un pozzo largo 9 colonne con 4 piattaforme sfalsate, poi la parete: in cima si continua più in alto
      for (let j = 0; j < 9; j++) pieno(c + j, g);
      tappe.push({ x: (c + 4) * T, y: g * T - ALT / 2 });
      for (let k = 1; k <= 4; k++) {
        const r = g - k * 3, x0 = c + (k % 2 ? 1 : 6); // l'ultima piattaforma tocca la parete: si passa in cima camminando
        for (let j = 0; j < 3; j++) { blocco(x0 + j, r); if (k === 2 || k === 3) crollano.add(`${r},${x0 + j}`); }
        moneta((x0 + 1) * T + T / 2, (r - 1.2) * T);
        tappe.push({ x: (x0 + 1) * T + T / 2, y: r * T - ALT / 2 });
      }
      g -= 12;
      c += 9;
    } else {
      // scalinata in discesa: 4 gradini di 3 righe
      for (let k = 0; k < 4; k++) { for (let j = 0; j < 3; j++) { pieno(c + j, g + k * 3); } tappe.push({ x: (c + 1) * T + T / 2, y: (g + k * 3) * T - ALT / 2 }); c += 3; }
      g += 12;
    }
  }
  // ultimo tratto e traguardo
  for (let j = 0; j < 8; j++) { pieno(c + j, g); tappe.push({ x: (c + j) * T + T / 2, y: g * T - ALT / 2 }); }
  const traguardo = { x: (c + 5) * T, y: g * T };
  c += 8;
  const cols = c;
  const griglia = Array.from({ length: RIGHE }, (_, r) => Array.from({ length: cols }, (_, k) => (colonne[k] && colonne[k].has(r) ? (crollano.has(`${r},${k}`) ? '4' : '1') : punte.has(`${r},${k}`) ? '2' : '0')).join(''));
  // nemici che camminano avanti e indietro sui tratti in piano abbastanza lunghi e liberi (mai all'inizio della corsa)
  const nemici = [];
  for (const t of tratti) {
    let quanti = 0, run = null;
    const libera = (k) => griglia[t.g][k] === '1' && griglia[t.g - 1][k] === '0' && griglia[t.g - 2][k] === '0' && griglia[t.g - 3][k] === '0';
    for (let k = Math.max(t.da, 10); k <= t.a; k++) {
      if (k < t.a && libera(k)) { if (!run) run = { da: k, a: k }; else run.a = k; continue; }
      if (run && run.a - run.da >= 6 && quanti < 2 && Math.random() < 0.7) {
        const xa = run.da * T + 16, xb = (run.a + 1) * T - 16;
        nemici.push({ id: nemici.length + 1, xa, xb, x: casuale(xa, xb), y: t.g * T - 15, v: casuale(55, 85), dir: Math.random() < 0.5 ? 1 : -1, morto: 0 });
        quanti++;
      }
      run = null;
    }
  }
  return { griglia, cols, tappe, controlli, pot, traguardo, nemici, monete };
}

class Piattaforme extends Arena {
  constructor(o) { super(o, { id: 'piattaforme', round: 2 }); this.W = W; this.H = H; this.avvia(); }
  solido(x, y) { const c = Math.floor(x / T), r = Math.floor(y / T); if (c < 0) return true; if (r < 0 || r >= RIGHE || c >= this.liv.cols) return false; const ch = this.liv.griglia[r][c]; if (ch === '1') return true; if (ch !== '4') return false; const z = this.crolli.get(r * 1000 + c); return !z || z.giu <= 0; }
  punta(x, y) { const c = Math.floor(x / T), r = Math.floor(y / T); return r >= 0 && r < RIGHE && c >= 0 && c < this.liv.cols && this.liv.griglia[r][c] === '2'; }
  muore(p, perche) {
    const e = this.e[p]; e.cade = 1; e.vx = 0; this.cambiato = true;
    this.morti.push([Math.round(e.x), Math.round(e.y), perche === 'nemico' ? 1 : 0]);
    this.annuncia(p, perche === 'nemico' ? 'è stato preso da un nemico! 👾' : 'è finito sugli spuntoni! 💥', perche === 'nemico' ? 'ti ha preso un nemico! Riparti 👾' : 'sugli spuntoni! Riparti 💥');
  }
  iniziaRound() {
    this.morti = [];
    this.liv = costruisci();
    this.presi = new Map(); // scatola -> secondi prima che ricompaia
    this.crolli = new Map(); // casella che crolla -> { trema, giu }
    this.bucce = []; this.nBu = 0; this.lampi = [];
    const c0 = this.liv.controlli[0];
    this.e = Array.from({ length: this.n }, (_, i) => ({ id: i, x: c0.x + i * 6, y: c0.y, vx: 0, vy: 0, aTerra: false, salti: 0, pot: null, potT: 0, arrivo: null, cade: 0, ctrl: 0, salto: 0, dir: 1, stordito: 0, stella: 0, monete: 0, prese: new Set() }));
    this.arrivi = []; this.mente = {};
  }
  muovi(e, dt) {
    // orizzontale
    e.x += e.vx * dt;
    const bordiY = [e.y - ALT / 2 + 2, e.y, e.y + ALT / 2 - 2];
    if (e.vx > 0 && bordiY.some((y) => this.solido(e.x + LARG / 2, y))) e.x = Math.floor((e.x + LARG / 2) / T) * T - LARG / 2 - 0.01;
    if (e.vx < 0 && bordiY.some((y) => this.solido(e.x - LARG / 2, y))) e.x = Math.floor((e.x - LARG / 2) / T + 1) * T + LARG / 2 + 0.01;
    // verticale
    e.vy += GRAV * dt; e.y += e.vy * dt;
    const bordiX = [e.x - LARG / 2 + 2, e.x + LARG / 2 - 2];
    e.aTerra = false;
    if (e.vy > 0 && bordiX.some((x) => this.solido(x, e.y + ALT / 2))) { e.y = Math.floor((e.y + ALT / 2) / T) * T - ALT / 2; e.vy = 0; e.aTerra = true; }
    if (e.vy < 0 && bordiX.some((x) => this.solido(x, e.y - ALT / 2))) { e.y = Math.floor((e.y - ALT / 2) / T + 1) * T + ALT / 2; e.vy = 0; }
  }
  passo(dt) {
    // i nemici camminano avanti e indietro (quelli schiacciati tornano dopo 4 secondi)
    for (const m of this.liv.nemici) {
      if (m.morto > 0) { m.morto -= dt; if (m.morto <= 0) { m.x = m.dir > 0 ? m.xa : m.xb; this.cambiato = true; } continue; }
      m.x += m.v * m.dir * dt;
      if (m.x < m.xa) { m.x = m.xa; m.dir = 1; } if (m.x > m.xb) { m.x = m.xb; m.dir = -1; }
    }
    for (const [id, t] of this.presi) { if (t - dt <= 0) { this.presi.delete(id); this.cambiato = true; } else this.presi.set(id, t - dt); }
    for (const [k, z] of this.crolli) {
      if (z.trema > 0) { z.trema -= dt; if (z.trema <= 0) { z.giu = RITORNO_CROLLO; this.cambiato = true; } }
      else if (z.giu > 0) { z.giu -= dt; if (z.giu <= 0) { this.crolli.delete(k); this.cambiato = true; } }
    }
    this.bucce = this.bucce.filter((b) => this.tempoRound - b.t < 20);
    for (let p = 0; p < this.n; p++) {
      const e = this.e[p], i = this.inp[p];
      if (e.arrivo !== null) continue;
      const win = conTrucco(this, p); // il trucco segreto: una stella che non si vede, più veloce e sempre il doppio salto
      e.stella = Math.max(0, e.stella - dt);
      if (e.cade > 0) { e.cade -= dt; this.nuoviTocchi(p); if (e.cade <= 0) { const c = this.liv.controlli[e.ctrl]; e.x = c.x; e.y = c.y; e.vx = 0; e.vy = 0; e.salto++; } continue; }
      if (e.potT > 0) { e.potT -= dt; if (e.potT <= 0) e.pot = null; }
      const vel = V * (e.pot === 'turbo' ? 1.45 : 1) * (e.stella > 0 ? 1.15 : 1) * (win ? 1.25 : 1);
      if (e.stordito > 0) { e.stordito -= dt; this.nuoviTocchi(p); e.vx *= Math.exp(-5 * dt); this.muovi(e, dt); if (e.y > RIGHE * T + 60) { e.cade = 1; e.stordito = 0; this.cambiato = true; } continue; }
      e.vx = i.x * vel; if (i.x) e.dir = Math.sign(i.x);
      if (e.aTerra) e.salti = e.pot === 'molla' || win ? 2 : 1;
      const tocchi = this.nuoviTocchi(p) + (i.y < -0.5 && !e.suSu ? 1 : 0);
      e.suSu = i.y < -0.5;
      if (tocchi && e.salti > 0) { e.vy = -SALTO; e.salti--; e.aTerra = false; }
      this.muovi(e, dt);
      if (e.aTerra) for (const x of [e.x - LARG / 2 + 2, e.x + LARG / 2 - 2]) {
        const c = Math.floor(x / T), r = Math.floor((e.y + ALT / 2 + 2) / T);
        if (r >= 0 && r < RIGHE && this.liv.griglia[r][c] === '4' && !this.crolli.has(r * 1000 + c)) { for (let j = c - 3; j <= c + 3; j++) if (this.liv.griglia[r][j] === '4' && !this.crolli.has(r * 1000 + j)) this.crolli.set(r * 1000 + j, { trema: CROLLO, giu: 0 }); this.cambiato = true; }
      }
      for (const m of this.liv.monete) if (!e.prese.has(m.id) && Math.abs(m.x - e.x) < 22 && Math.abs(m.y - e.y) < 26) { e.prese.add(m.id); e.monete++; }
      // bucce di banana: si scivola (chi l'ha buttata ci passa sopra senza problemi per un secondo)
      for (const b of this.bucce) if (!b.via && e.stella <= 0 && !win && Math.abs(b.x - e.x) < 18 && Math.abs(b.y - (e.y + ALT / 2)) < 14 && !(b.da === p && this.tempoRound - b.t < 1)) { b.via = true; e.stordito = STORDITO_BUCCIA; e.vx = e.dir * 260; e.vy = -300; this.cambiato = true; this.annuncia(p, 'scivola su una buccia! 🍌', 'sei scivolato su una buccia! 🍌'); }
      this.bucce = this.bucce.filter((b) => !b.via);
      // salto in testa a un altro: lui resta stordito, tu rimbalzi
      if (e.vy > 50) for (let q = 0; q < this.n; q++) {
        const o = this.e[q];
        if (q === p || o.arrivo !== null || o.cade > 0 || o.stordito > 0 || Math.abs(o.x - e.x) > LARG) continue;
        const piedi = e.y + ALT / 2, testa = o.y - ALT / 2;
        if (piedi >= testa - 4 && piedi - e.vy * dt <= testa + 4) { if (o.stella <= 0) o.stordito = STORDITO_TESTA; e.vy = -SALTO * 0.55; this.cambiato = true; this.annuncia(p, `salta in testa a un avversario! 👟`, 'salto in testa! 👟'); break; }
      }
      // punti di ripartenza raggiunti
      while (e.ctrl + 1 < this.liv.controlli.length && e.x > this.liv.controlli[e.ctrl + 1].x - T) e.ctrl++;
      // potenziamenti
      for (const q of this.liv.pot) if (!this.presi.has(q.id) && Math.abs(q.x - e.x) < 28 && Math.abs(q.y - e.y) < 32) { this.presi.set(q.id, RITORNO_SCATOLA); this.cambiato = true; this.oggetto(p); }
      // buca
      if (e.y > RIGHE * T + 60) { e.cade = 1; this.cambiato = true; }
      // spuntoni: basta toccarli con i piedi o con il corpo
      else if (e.stella <= 0 && !win && (e.y + ALT / 2 - 2) % T > T * 0.45 && [e.x - LARG / 2 + 4, e.x, e.x + LARG / 2 - 4].some((x) => this.punta(x, e.y + ALT / 2 - 2))) { this.muore(p, 'punte'); continue; }
      // nemici: da sopra si schiacciano (e si rimbalza), di lato o da sotto ti prendono
      for (const m of this.liv.nemici) {
        if (m.morto > 0 || Math.abs(m.x - e.x) > LARG / 2 + 12 || Math.abs(m.y - e.y) > ALT / 2 + 12) continue;
        if (e.stella > 0 || win || (e.vy > 50 && e.y + ALT / 2 - e.vy * dt <= m.y - 2)) { m.morto = 4; e.vy = -SALTO * 0.6; this.cambiato = true; this.annuncia(p, 'schiaccia un nemico! 👟', 'nemico schiacciato! 👟'); }
        else { this.muore(p, 'nemico'); break; }
      }
      if (e.cade > 0) continue;
      // traguardo
      if (e.x >= this.liv.traguardo.x) {
        e.arrivo = this.tempoRound; this.arrivi.push(p); this.cambiato = true;
        const pt = Math.max(1, this.n + 2 - this.arrivi.length * 2);
        this.punti[p] += pt;
        this.annuncia(p, `arriva ${this.arrivi.length}° alla bandiera! +${pt} 🏁`, `arrivi ${this.arrivi.length}°! +${pt} 🏁`, this.arrivi.length === 1);
      }
    }
    return this.e.every((e) => e.arrivo !== null) || (this.arrivi.length && this.tempoRound - this.e[this.arrivi[0]].arrivo > 25) || this.tempoRound > 180;
  }
  // la scatola "?": l'oggetto dipende dalla posizione in gara (chi è indietro trova gli oggetti più forti)
  oggetto(p) {
    const e = this.e[p];
    const avanti = this.e.filter((o) => o !== e && o.arrivo === null && o.cade <= 0 && o.x > e.x + 60).length;
    const pesi = avanti === 0 ? { molla: 3, turbo: 2, buccia: 4, stella: 0.5, fulmine: 0 } : avanti >= 2 ? { molla: 1, turbo: 2, buccia: 1, stella: 2, fulmine: 3 } : { molla: 2, turbo: 3, buccia: 2, stella: 1.5, fulmine: 1.5 };
    let r = Math.random() * Object.values(pesi).reduce((a, b) => a + b, 0), tipo = 'molla';
    for (const [t, w] of Object.entries(pesi)) { r -= w; if (r <= 0) { tipo = t; break; } }
    if (tipo === 'molla' || tipo === 'turbo') { e.pot = tipo; e.potT = POT_T; this.annuncia(p, tipo === 'molla' ? 'prende il doppio salto 🍄' : 'prende il turbo ⚡', tipo === 'molla' ? 'doppio salto! 🍄' : 'turbo! ⚡'); }
    else if (tipo === 'stella') { e.stella = STELLA_T; this.annuncia(p, 'prende la stella: invincibile! ⭐', 'stella: sei invincibile per 5 secondi! ⭐'); }
    else if (tipo === 'buccia') {
      // la buccia cade per terra un po' dietro
      let x = e.x - e.dir * 50, y = e.y; for (let k = 0; k < 8 && !this.solido(x, y + ALT / 2 + 2); k++) y += T;
      this.bucce.push({ id: ++this.nBu, x, y: Math.floor((y + ALT / 2 + 2) / T) * T, da: p, t: this.tempoRound });
      this.annuncia(p, 'lascia una buccia di banana 🍌', 'hai lasciato una buccia dietro di te 🍌');
    } else {
      let colpiti = 0;
      for (const o of this.e) if (o !== e && o.arrivo === null && o.x > e.x && o.stella <= 0) { o.stordito = STORDITO_FULMINE; colpiti++; }
      this.lampi.push(p);
      this.annuncia(p, `lancia il fulmine: ${colpiti ? 'chi è davanti resta fermo! 🌩️' : 'ma davanti non c\'è nessuno 🌩️'}`, `fulmine! ${colpiti ? 'chi è davanti resta fermo 🌩️' : 'davanti non c\'era nessuno'}`, true);
    }
  }
  fineRound() {
    fineTrucco(this);
    // le monete: un punto ogni 5
    this.e.forEach((e, p) => { const b = Math.floor(e.monete / MONETE_PUNTO); if (b) this.punti[p] += b; });
  }
  // il computer segue le "tappe" del percorso: corre verso la prossima e salta quando serve
  pensa(p, liv) {
    const e = this.e[p];
    if (e.arrivo !== null || e.cade > 0 || e.stordito > 0) return {};
    const m = this.mente[p] || (this.mente[p] = { k: 0, fino: 0, pensa: 0, salto: -1, meglio: 0, fermo: 0 });
    const tappe = this.liv.tappe;
    // dopo una caduta si riparte dalla prima tappa dopo il punto di ripartenza
    if (m.salto !== e.salto) { m.salto = e.salto; const cx = this.liv.controlli[e.ctrl].x; m.k = Math.max(0, tappe.findIndex((q) => q.x >= cx - T)); }
    // si passa alla tappa dopo quando si è arrivati sopra quella attuale, oppure quando è ormai alle spalle e non più in alto
    while (m.k < tappe.length - 1 && ((Math.abs(tappe[m.k].x - e.x) < 18 && Math.abs(tappe[m.k].y - e.y) < 30 && e.aTerra) || (tappe[m.k].x < e.x - 12 && tappe[m.k].y >= e.y - 10 && e.aTerra))) m.k++;
    const t = tappe[Math.min(m.k, tappe.length - 1)];
    const dx = t.x - e.x, dy = t.y - e.y;
    const lento = { facile: 0.78, medio: 0.84, difficile: 1 }[liv];
    let x = Math.abs(dx) > 6 ? Math.sign(dx) * lento : 0;
    // davanti c'è un muro o una buca? oppure la tappa è più in alto? allora salto
    const dir = Math.sign(dx) || e.dir;
    const muro = this.solido(e.x + dir * (LARG / 2 + 8), e.y) || this.solido(e.x + dir * (LARG / 2 + 8), e.y - T * 0.6);
    const buca = !this.solido(e.x + dir * (LARG / 2 + 24), e.y + ALT / 2 + 8) && !this.solido(e.x + dir * (LARG / 2 + 24), e.y + ALT / 2 + T + 8);
    // una piattaforma sospesa più in alto (sotto è vuoto): per i gradini appoggiati a terra basta saltare davanti al muro
    const piuSu = dy < -T * 0.6 && !this.solido(t.x, t.y + ALT / 2 + T + 4);
    let tocco = false;
    // in aria: se si atterrerebbe sugli spuntoni, il medio e il difficile correggono (frenano, tirano dritto o tornano indietro)
    if (!e.aTerra && liv !== 'facile') {
      const vel = V * (e.pot === 'turbo' ? 1.45 : 1);
      const atterra = (vx) => {
        let x = e.x, y = e.y, vy = e.vy;
        for (let t = 0; t < 1.6; t += 0.03) {
          vy += GRAV * 0.03; x += vx * 0.03; y += vy * 0.03;
          if (vy <= 0) continue;
          for (const xx of [x - LARG / 2 + 4, x + LARG / 2 - 4]) { const r = Math.floor((y + ALT / 2) / T), c = Math.floor(xx / T); if (r < 0 || r >= RIGHE || c < 0 || c >= this.liv.cols) continue; const ch = this.liv.griglia[r][c]; if (ch === '2') return '2'; if (ch === '1') return '1'; }
        }
        return '0';
      };
      if (atterra(e.vx) === '2') {
        for (const v of [0, (Math.sign(e.vx) || dir) * vel, -(Math.sign(e.vx) || dir) * vel]) if (atterra(v) !== '2') return { x: v / vel };
      }
    }
    // pericoli davanti: spuntoni appena avanti e nemici che si avvicinano sullo stesso piano
    if (e.aTerra && this.tempoRound >= m.pensa) {
      const d = (liv === 'facile' ? casuale(8, 40) : liv === 'medio' ? 20 : 26) * (e.pot === 'turbo' ? 0.6 : 1);
      const punteAvanti = [0, 14].some((k) => this.punta(e.x + dir * (LARG / 2 + d + k), e.y + ALT / 2 - 3))
        || (liv !== 'facile' && this.bucce.some((b) => Math.abs(b.y - (e.y + ALT / 2)) < 14 && (b.x - e.x) * dir > 0 && (b.x - e.x) * dir < LARG / 2 + d + 22 && !(b.da === p && this.tempoRound - b.t < 1))); // anche le bucce si saltano
      let nemico = false;
      for (const n of this.liv.nemici) {
        if (n.morto > 0 || Math.abs(n.y - e.y) > T) continue;
        const gap = (n.x - e.x) * dir; if (gap < 0) continue;
        const avvicina = V * Math.abs(x) + (n.dir === -dir ? n.v : -n.v);
        const soglia = liv === 'facile' ? casuale(30, 140) : liv === 'medio' ? 55 + avvicina * 0.12 + casuale(-12, 12) : 60 + avvicina * 0.14;
        if (gap < soglia) nemico = true;
      }
      if ((punteAvanti || nemico) && Math.random() < { facile: 0.75, medio: 0.95, difficile: 1 }[liv]) { m.pensa = this.tempoRound + 0.05; return { x: x || dir, tocco: true }; }
    }
    // una piattaforma più in alto: da sotto si batte la testa, quindi prima ci si allontana di lato, poi si salta verso di lei
    // in aria verso una piattaforma: finché i piedi sono sotto il suo bordo si sale dritti, poi ci si sposta sopra
    if (!e.aTerra && dy < -4 && Math.abs(dx) < T * 3.2 && !this.solido(t.x, t.y + ALT / 2 + T + 4)) {
      return { x: e.y + ALT / 2 > t.y + ALT / 2 - 4 ? 0 : Math.sign(dx) };
    }
    if (piuSu && e.aTerra) {
      if (Math.abs(dx) < T * 2.2) x = -(Math.sign(dx) || 1);
      else {
        x = Math.sign(dx);
        // si salta quando si è abbastanza vicini, oppure sul bordo della piattaforma su cui si sta
        const bordo = !this.solido(e.x + x * (LARG / 2 + 24), e.y + ALT / 2 + 8);
        if ((Math.abs(dx) <= T * 3.2 || bordo) && this.tempoRound >= m.pensa) { m.pensa = this.tempoRound + { facile: 0.12, medio: 0.06, difficile: 0.03 }[liv]; if (Math.random() < { facile: 0.7, medio: 0.92, difficile: 1 }[liv]) tocco = true; }
      }
      return { x, tocco };
    }
    // il difficile salta apposta contro le scatole "?" che trova sulla strada
    if (liv === 'difficile' && e.aTerra && this.liv.pot.some((q) => !this.presi.has(q.id) && (q.x - e.x) * dir > 20 && (q.x - e.x) * dir < 70 && q.y < e.y && e.y - q.y < T * 3.2)) return { x: x || dir, tocco: true };
    if (this.tempoRound >= m.pensa) {
      m.pensa = this.tempoRound + { facile: 0.12, medio: 0.06, difficile: 0.03 }[liv];
      if (e.aTerra && (muro || buca) && Math.random() < { facile: 0.7, medio: 0.92, difficile: 1 }[liv]) tocco = true;
      // il doppio salto quando si sta scendendo verso una buca
      if (!e.aTerra && e.salti > 0 && e.vy > 100 && buca && liv !== 'facile') tocco = true;
    }
    return { x, tocco };
  }
  statoTick(posto) {
    const io = this.e[posto];
    return {
      e: this.e.map((e) => ({ id: e.id, x: Math.round(e.x), y: Math.round(e.y), d: e.dir, a: e.arrivo !== null ? 1 : 0, c: e.cade > 0 ? 1 : 0, p: e.pot, t: e.aTerra ? 1 : 0, salto: e.salto, st: e.stordito > 0 ? 1 : 0, sl: e.stella > 0 ? 1 : 0, m: e.monete })),
      presi: [...this.presi.keys()], arr: this.arrivi,
      mp: io ? [...io.prese] : [], bu: this.bucce.map((b) => [b.x, b.y]), fu: this.lampi.splice(0),
      cr: [...this.crolli].map(([k, z]) => [Math.floor(k / 1000), k % 1000, z.trema > 0 ? 1 : 2]),
      ne: this.liv.nemici.map((m) => ({ id: m.id, x: Math.round(m.x), y: m.y, d: m.dir, mo: m.morto > 0 ? 1 : 0 })),
      mo: this.morti.splice(0),
    };
  }
  vistaExtra() { return { griglia: this.liv.griglia, cols: this.liv.cols, T, pot: this.liv.pot, monete: this.liv.monete, traguardo: this.liv.traguardo, righe: RIGHE, mp: MONETE_PUNTO }; }
}

module.exports = {
  meta: {
    id: 'piattaforme',
    nome: 'Salta e corri',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Corsa a piattaforme: salta le buche, scala le pareti, raccogli monete, pesca oggetti a sorpresa (fulmine, stella, bucce) e arriva primo alla bandiera.',
    alias: ['platform', 'piattaforme', 'salta', 'corri', 'mario', 'runner', 'corsa'],
    opzioni: [{ id: 'round', nome: 'Round', valori: [2, 1, 3], etichette: ['2 corse', '1 corsa', '3 corse'], predefinito: 2 }],
    regole: [
      'Una corsa a piattaforme vista di lato: si parte tutti insieme e vince chi arriva prima alla bandiera. Gli altri li vedi un po\' trasparenti: si passa attraverso, ma se salti in testa a un avversario lui resta stordito per un attimo e tu rimbalzi.',
      'Ti muovi con A e D (o le frecce) e salti con spazio, W o freccia su (sul telefono: joystick e pulsante "Salta").',
      'Il percorso cambia a ogni corsa e alterna tratti in orizzontale, con buche e gradini, e tratti in verticale: pareti da scalare saltando da una piattaforma all\'altra e scalinate in discesa.',
      'Scatole ❓ sospese (si prendono saltandoci contro, tornano dopo 6 secondi): dentro c\'è un oggetto a sorpresa, più forte se sei indietro. 🍄 doppio salto e ⚡ turbo (8 secondi); ⭐ stella (5 secondi invincibile: spuntoni e nemici non ti fanno niente, e corri un po\' di più); 🌩️ fulmine (chi è davanti a te resta fermo per un secondo e mezzo); 🍌 buccia di banana (cade dietro di te: chi ci passa sopra scivola e resta stordito).',
      'Monete 🪙: in fila sul terreno, ad arco sopra le buche e sulle piattaforme. Ognuno raccoglie le sue (le monete non spariscono per gli altri); ogni 5 monete vale un punto in più a fine corsa.',
      'Nelle pareti da scalare alcune piattaforme sono crepate: poco dopo che qualcuno ci sale tremano e crollano (anche per gli altri), e tornano dopo 3 secondi.',
      'Pericoli: gli spuntoni sul terreno (larghi una o due caselle) e i nemici che camminano avanti e indietro sui tratti in piano. Se tocchi gli spuntoni, o un nemico di lato o da sotto, riparti dall\'ultimo punto sicuro. Come nei giochi di Mario, però, se atterri sopra un nemico lo schiacci e rimbalzi (torna dopo 4 secondi).',
      'Se cadi in una buca riparti dall\'ultimo punto sicuro che hai passato.',
      'Punti: chi arriva primo prende i punti più alti, poi via via meno (più un punto ogni 5 monete). Dopo che è arrivato il primo, gli altri hanno ancora 25 secondi. Dopo 2 corse (o 1, o 3) vince chi ha più punti.',
      'Il gioco è in tempo reale: si ferma per tutti quando qualcuno apre le dispense.',
      'Il computer facile corre più piano, a volte salta tardi e finisce sugli spuntoni o addosso ai nemici; il medio corre bene; il difficile salta sempre al momento giusto e usa il doppio salto per salvarsi.',
    ],
  },
  crea: (o) => new Piattaforme(o),
  bot: () => ({}),
  _test: { costruisci, Piattaforme },
};
