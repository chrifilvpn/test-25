// MANGIATUTTO: il mangiatore gira nel labirinto e mangia i semini; quattro fantasmi gli danno la caccia. Le pillole
// grandi fanno scappare i fantasmi (per qualche secondo si possono mangiare). Da soli si fa il mangiatore contro 4
// fantasmi del computer; in più giocatori uno fa il mangiatore e gli altri i fantasmi (quelli che mancano li fa il
// computer), e il mangiatore cambia a ogni round. Labirinto, nomi e disegni originali.
const { Arena } = require('./arena');
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
// a fine round si spegne (se è servito almeno 3 secondi; altrimenti vale anche per il prossimo round)
function fineTrucco(g, sempre = false) {
  for (let p = 0; p < g.n; p++) { const da = g._winDa && g._winDa[p]; if (da != null && (sempre || g.tempoRound - da >= 3)) TR.consuma(g, p); if (g._winDa) delete g._winDa[p]; }
}
const LAB = [
  '###################',
  '#o.......#.......o#',
  '#.##.###.#.###.##.#',
  '#.................#',
  '#.##.#.#####.#.##.#',
  '#....#...#...#....#',
  '####.###.#.###.####',
  '####.#       #.####',
  '####.# ##-## #.####',
  '    .  #   #  .    ',
  '####.# ##### #.####',
  '####.#       #.####',
  '####.# ##### #.####',
  '#........#........#',
  '#.##.###.#.###.##.#',
  '#o.#..... .....#.o#',
  '##.#.#.#####.#.#.##',
  '#....#...#...#....#',
  '#.######.#.######.#',
  '#.................#',
  '###################',
];
const C = 19, R = LAB.length, T = 32; // caselle da 32 px
const PARTENZA = [9, 15], USCITA = [9, 7], CASA = [9, 9], PORTA = [9, 8];
const V_PAC = 7.2, V_FANT = 7.0, V_UMANO = 7.0, V_PAURA = 4.4, V_OCCHI = 13, V_TUNNEL = 4;
const VITE = 3, PAURA = 7, DURATA = 150, PAUSA_PRESA = 1.4;
const DIR = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const ANGOLI = [[C - 2, 1], [1, 1], [C - 2, R - 2], [1, R - 2]];
const COL_FANT = ['#e8453c', '#f28ac0', '#34c3e8', '#f5a13a'];

const idx = (c, r) => r * C + ((c % C) + C) % C;
const muro = (c, r) => r < 0 || r >= R || LAB[r][((c % C) + C) % C] === '#';
// chi può passare: la porta della casa solo per chi esce o per gli occhi che rientrano
const passa = (c, r, porta) => !muro(c, r) && (porta || LAB[r][((c % C) + C) % C] !== '-') && !(r === 9 && c >= 8 && c <= 10 && !porta);

// distanze vere nel labirinto tra tutte le caselle percorribili (una volta sola): servono ai computer
const DIST = (() => {
  const n = R * C, d = new Array(n);
  for (let s = 0; s < n; s++) {
    const cs = s % C, rs = Math.floor(s / C);
    if (!passa(cs, rs, false)) { d[s] = null; continue; }
    const a = new Int16Array(n).fill(-1); a[s] = 0; const q = [s];
    for (let i = 0; i < q.length; i++) { const k = q[i], c = k % C, r = Math.floor(k / C); for (const [dx, dy] of DIR) { const nc = (c + dx + C) % C, nr = r + dy; if (passa(nc, nr, false) && a[idx(nc, nr)] < 0) { a[idx(nc, nr)] = a[k] + 1; q.push(idx(nc, nr)); } } }
    d[s] = a;
  }
  return d;
})();
const dist = (a, b) => { const x = DIST[a]; if (!x) return 99; const v = x[b]; return v < 0 ? 99 : v; };

class Mangiatutto extends Arena {
  constructor(o) {
    super(o, { id: 'mangiatutto', round: 3, tickMs: 40 });
    this.W = C * T; this.H = R * T;
    this.nRound = this.n > 1 ? this.n : Number(o.opzioni && o.opzioni.round) || 3; // in più giocatori ognuno fa il mangiatore una volta
    this.livFant = ['facile', 'medio', 'difficile'].includes(o.opzioni && o.opzioni.fantasmi) ? o.opzioni.fantasmi : 'medio';
    this.pausaRoundMs = 3500;
    this.avvia();
  }
  iniziaRound() {
    this.pac = (this.round - 1) % this.n; // chi fa il mangiatore
    this.cibo = LAB.map((riga) => [...riga].map((ch) => (ch === '.' ? 1 : ch === 'o' ? 2 : 0))).flat();
    this.restano = this.cibo.filter(Boolean).length;
    this.vite = VITE; this.paura = 0; this.catena = 0; this.presa = 0;
    // i fantasmi: prima i giocatori (nei posti che non fanno il mangiatore), poi quelli del computer fino a 4
    const posti = Array.from({ length: this.n }, (_, i) => i).filter((i) => i !== this.pac);
    this.f = Array.from({ length: 4 }, (_, k) => ({ k, posto: k < posti.length ? posti[k] : null }));
    this.mente = {};
    this.riparti(true);
    this.cambiato = true;
  }
  // tutti al loro posto (a inizio round e dopo una presa)
  riparti() {
    this.m = { x: PARTENZA[0], y: PARTENZA[1], dx: 0, dy: 0, vx: -1, vy: 0, bocca: 0 };
    this.f.forEach((f, k) => {
      const umano = f.posto !== null;
      Object.assign(f, umano ? { x: USCITA[0] + (k % 2 ? 1 : -1) * (1 + k), y: USCITA[1], stato: 'caccia', esce: 0 } : { x: CASA[0] - 1 + (k % 3), y: CASA[1], stato: 'casa', esce: 1 + k * 2.5 }, { dx: 0, dy: 0, vx: 0, vy: 0, paura: false });
      if (umano) f.x = Math.max(4, Math.min(14, f.x));
      if (umano && !passa(Math.round(f.x), f.y, false)) f.x = USCITA[0];
    });
    this.tempoVita = 0;
  }
  // un passo lungo il labirinto: si gira solo al centro di una casella; chi è libero (mangiatore, giocatori) può
  // tornare indietro in qualsiasi momento; v in caselle al secondo
  cammina(e, v, dt, sceglie, porta = false) {
    let resto = v * dt;
    for (let giri = 0; resto > 1e-6 && giri < 6; giri++) {
      const c = Math.round(e.x), r = Math.round(e.y), alCentro = Math.abs(e.x - c) < 1e-6 && Math.abs(e.y - r) < 1e-6;
      if (alCentro) {
        e.x = c; e.y = r;
        const [dx, dy] = sceglie(c, r);
        if (passa(c + dx, r + dy, porta) && (dx || dy)) { e.vx = dx; e.vy = dy; } else if (!passa(c + e.vx, r + e.vy, porta)) { e.vx = 0; e.vy = 0; return; }
        if (!e.vx && !e.vy) return;
      } else if (e.libero && e.dx === -e.vx && e.dy === -e.vy && (e.dx || e.dy)) { e.vx = e.dx; e.vy = e.dy; } // inversione
      const verso = e.vx ? e.x : e.y, prossimo = (e.vx || e.vy) > 0 ? Math.floor(verso + 1e-6) + 1 : Math.ceil(verso - 1e-6) - 1;
      const manca = Math.min(Math.abs(prossimo - verso), 1), fa = Math.min(resto, manca);
      if (e.vx) e.x += e.vx * fa; else e.y += e.vy * fa;
      resto -= fa;
      if (fa === manca) { e.x = Math.round(e.x); e.y = Math.round(e.y); }
      if (e.x < -0.5) e.x += C; if (e.x > C - 0.5) e.x -= C; // il tunnel
    }
  }
  direzioneInput(p) { const i = this.inp[p]; if (Math.abs(i.x) < 0.3 && Math.abs(i.y) < 0.3) return null; return Math.abs(i.x) > Math.abs(i.y) ? [Math.sign(i.x), 0] : [0, Math.sign(i.y)]; }
  tunnel(e) { return Math.round(e.y) === 9 && (e.x < 3 || e.x > C - 4); }
  passo(dt) {
    const t = this.tempoRound;
    if (this.presa > 0) { this.presa -= dt; if (this.presa <= 0) { if (this.vite <= 0) return true; this.riparti(); this.cambiato = true; } return false; }
    this.tempoVita += dt;
    // il trucco segreto (!win): il mangiatore non viene preso e i fantasmi rallentano; un fantasma corre di più e non si fa mangiare
    const win = Array.from({ length: this.n }, (_, p) => conTrucco(this, p));
    this.paura = Math.max(0, this.paura - dt);
    if (!this.paura) { this.catena = 0; for (const f of this.f) f.paura = false; }
    // il mangiatore
    const m = this.m, pm = this.pac;
    if (!this.bot[pm]) { const d = this.direzioneInput(pm); if (d) [m.dx, m.dy] = d; }
    m.libero = true;
    this.cammina(m, V_PAC * (this.paura ? 1.1 : 1), dt, () => [m.dx, m.dy]);
    if (m.vx || m.vy) m.bocca += dt;
    const qui = idx(Math.round(m.x), Math.round(m.y));
    if (this.cibo[qui]) {
      const pillola = this.cibo[qui] === 2;
      this.cibo[qui] = 0; this.restano--; this.punti[pm] += pillola ? 50 : 10;
      if (pillola) this.cambiato = true;
      if (pillola) { this.paura = Math.max(3, PAURA - this.round * 0.3); this.catena = 0; for (const f of this.f) if (f.stato === 'caccia') { f.paura = true; if (f.posto === null) { f.vx = -f.vx; f.vy = -f.vy; } } }
    }
    // il punteggio in alto (stato completo) si aggiorna al massimo una volta al secondo
    const somma = this.punti.reduce((x, y) => x + y, 0);
    if (somma !== this.sommaVista && t - (this.ultimoAgg || -9) > 1) { this.cambiato = true; this.ultimoAgg = t; this.sommaVista = somma; }
    if (!this.restano) { this.punti[pm] += 1000; this.annuncia(pm, 'ha mangiato tutto il labirinto! +1000 🍒', 'hai ripulito il labirinto! +1000 🍒', true); return true; }
    // i fantasmi
    for (const f of this.f) {
      if (f.stato === 'casa') { if (this.tempoVita >= f.esce) { Object.assign(f, { x: USCITA[0], y: USCITA[1], stato: 'caccia', vx: -1, vy: 0, paura: false }); } continue; }
      if (f.stato === 'occhi') {
        const bersaglio = idx(USCITA[0], USCITA[1]);
        this.cammina(f, V_OCCHI, dt, (c, r) => this.versoMeta(c, r, bersaglio, f, true));
        if (Math.round(f.x) === USCITA[0] && Math.round(f.y) === USCITA[1]) Object.assign(f, { stato: 'casa', x: CASA[0], y: CASA[1], esce: this.tempoVita + 1.2, paura: false });
        continue;
      }
      const v = (this.tunnel(f) ? V_TUNNEL : f.paura ? V_PAURA : f.posto !== null && !this.bot[f.posto] ? V_UMANO : V_FANT) * (1 + this.round * 0.01) * (win[pm] ? 0.6 : 1) * (f.posto !== null && win[f.posto] ? 1.3 : 1);
      if (f.posto !== null && !this.bot[f.posto]) { const d = this.direzioneInput(f.posto); if (d) [f.dx, f.dy] = d; f.libero = true; this.cammina(f, v, dt, () => [f.dx, f.dy]); }
      else { f.libero = false; const liv = f.posto !== null ? this.bot[f.posto] : this.livFant; this.cammina(f, v, dt, (c, r) => this.pensaFantasma(f, c, r, liv)); }
    }
    // incontri
    for (const f of this.f) {
      if (f.stato !== 'caccia' || Math.hypot(f.x - m.x, f.y - m.y) > 0.65) continue;
      if (f.paura ? f.posto !== null && win[f.posto] : win[pm]) continue;
      if (f.paura) {
        this.catena++; const pt = 200 * 2 ** (this.catena - 1); this.punti[pm] += pt;
        Object.assign(f, { stato: 'occhi', paura: false, vx: -f.vx, vy: -f.vy });
        this.cambiato = true; this.annuncia(pm, `mangia un fantasma! +${pt} 👻`, `fantasma mangiato! +${pt} 👻`);
      } else {
        this.vite--; this.presa = PAUSA_PRESA; this.paura = 0; this.cambiato = true;
        if (f.posto !== null) { this.punti[f.posto] += 500; this.annuncia(f.posto, `acchiappa il mangiatore! +500 👻`, 'hai acchiappato il mangiatore! +500 👻', true); }
        else this.annuncia(pm, this.vite ? `è stato preso! Restano ${this.vite} vite` : 'è stato preso: vite finite 💀', this.vite ? `ti hanno preso! Restano ${this.vite} vite` : 'ti hanno preso: vite finite 💀', true);
        return false;
      }
    }
    return t >= DURATA;
  }
  fineRound() { fineTrucco(this); }
  // il vicino più vicino alla meta (senza tornare indietro, se si può): gli occhi usano la strada vera
  versoMeta(c, r, meta, f, porta) {
    let meglio = [0, 0], dm = Infinity;
    for (const [dx, dy] of DIR) {
      const nc = c + dx, nr = r + dy;
      if (!passa(nc, nr, porta) || (dx === -f.vx && dy === -f.vy && (f.vx || f.vy))) continue;
      const d = dist(idx(nc, nr), meta);
      if (d < dm) { dm = d; meglio = [dx, dy]; }
    }
    if (dm === Infinity) return [-f.vx, -f.vy];
    return meglio;
  }
  // i fantasmi del computer: inseguono (ognuno a modo suo), alternando ogni tanto un giro verso il suo angolo;
  // con la paura scappano a caso. Il facile sbaglia strada spesso, il difficile usa le distanze vere e accerchia
  pensaFantasma(f, c, r, liv) {
    const m = this.m, mc = Math.round(m.x), mr = Math.round(m.y);
    const vicini = DIR.filter(([dx, dy]) => passa(c + dx, r + dy, false) && !(dx === -f.vx && dy === -f.vy && (f.vx || f.vy)));
    if (!vicini.length) return [-f.vx, -f.vy];
    const caso = f.paura ? 1 : { facile: 0.35, medio: 0.1, difficile: 0.02 }[liv] || 0.1;
    if (Math.random() < caso) return vicini[Math.floor(Math.random() * vicini.length)];
    const giro = liv !== 'difficile' && (this.tempoVita % 27) < 6; // pausa nell'angolo (il difficile non molla mai)
    let tc = mc, tr = mr;
    if (giro) [tc, tr] = ANGOLI[f.k];
    else if (f.k === 1) { tc = mc + m.vx * 4; tr = mr + m.vy * 4; } // lo aspetta davanti
    else if (f.k === 2) { const a = this.f[0]; tc = mc + m.vx * 2 * 2 - (Math.round(a.x) - mc); tr = mr + m.vy * 2 * 2 - (Math.round(a.y) - mr); } // lo prende di fianco
    else if (f.k === 3 && Math.hypot(c - mc, r - mr) < 7 && liv !== 'difficile') [tc, tr] = ANGOLI[3];
    if (liv === 'difficile' && f.k >= 2) { tc = mc + m.vx * 3; tr = mr + m.vy * 3; } // il difficile gli taglia la strada
    tc = Math.max(0, Math.min(C - 1, tc)); tr = Math.max(0, Math.min(R - 1, tr));
    let meglio = vicini[0], dm = Infinity;
    for (const [dx, dy] of vicini) {
      const n = idx(c + dx, r + dy);
      let d;
      if (liv === 'facile') d = Math.hypot(c + dx - tc, r + dy - tr);
      else { const meta = passa(tc, tr, false) ? idx(tc, tr) : idx(mc, mr); d = liv === 'difficile' ? dist(n, meta) : dist(n, meta) * 0.6 + Math.hypot(c + dx - tc, r + dy - tr) * 0.4; }
      if (d < dm) { dm = d; meglio = [dx, dy]; }
    }
    return meglio;
  }
  // il mangiatore del computer: sceglie la strada verso il cibo tenendosi lontano dai fantasmi; il difficile va a
  // prendere le pillole quando è braccato e insegue i fantasmi spaventati
  pensa(p, liv) {
    if (p !== this.pac) return {}; // da fantasma lo guida pensaFantasma
    const m = this.m;
    // si decide per la prossima casella in cui si arriverà (al centro della quale si può girare)
    let c = Math.round(m.x), r = Math.round(m.y);
    if (m.vx && Math.abs(m.x - c) > 1e-6) c = m.vx > 0 ? Math.ceil(m.x) : Math.floor(m.x);
    if (m.vy && Math.abs(m.y - r) > 1e-6) r = m.vy > 0 ? Math.ceil(m.y) : Math.floor(m.y);
    c = ((c % C) + C) % C;
    const mente = this.mente[p] || (this.mente[p] = { ultima: -1, dir: [-1, 0] });
    const qui = idx(c, r);
    if (mente.ultima === qui && (m.vx || m.vy)) return this.dirInput(mente.dir);
    mente.ultima = qui;
    const L = { facile: { raggio: 2, caso: 0.3, cibo: 1 }, medio: { raggio: 5, caso: 0.05, cibo: 1 }, difficile: { raggio: 6, caso: 0, cibo: 1.1 } }[liv];
    const cibi = []; this.cibo.forEach((x, i) => { if (x) cibi.push(i); });
    let meglio = null, voto = -Infinity;
    for (const [dx, dy] of DIR) {
      if (!passa(c + dx, r + dy, false)) continue;
      const n = idx(c + dx, r + dy);
      let v = 0, vicino = 99;
      for (const i of cibi) { const d = dist(n, i); if (d < vicino) vicino = d; }
      v -= vicino * 3 * L.cibo;
      for (const f of this.f) {
        if (f.stato !== 'caccia') continue;
        const fi = idx(Math.round(f.x), Math.round(f.y)), d = dist(fi, n), dq = dist(fi, qui);
        if (f.paura && this.paura > 1) { if (liv === 'difficile' && this.paura > 2.5 && d < 6) v += (8 - d) * 4; continue; }
        if (d > L.raggio) continue;
        v -= (L.raggio + 1 - d) ** 2 * 6;
        if (d <= 1) v -= 400;
        if (liv === 'difficile' && d < dq && d < 4) v -= 30; // andrei incontro al fantasma
      }
      // braccato: meglio andare verso una pillola
      if (liv === 'difficile' && this.f.some((f) => f.stato === 'caccia' && !f.paura && dist(idx(Math.round(f.x), Math.round(f.y)), qui) < 6)) {
        let dp = 99; this.cibo.forEach((x, i) => { if (x === 2) dp = Math.min(dp, dist(n, i)); }); if (dp < 12) v += (12 - dp) * 4;
      }
      if (dx === -mente.dir[0] && dy === -mente.dir[1]) v -= 2; // meglio non fare avanti e indietro
      v += Math.random() * 2 + (Math.random() < L.caso ? 50 : 0);
      if (v > voto) { voto = v; meglio = [dx, dy]; }
    }
    if (meglio) mente.dir = meglio;
    return this.dirInput(mente.dir);
  }
  dirInput([dx, dy]) { this.m.dx = dx; this.m.dy = dy; return { x: dx, y: dy }; }
  vistaExtra() { return { lab: LAB, T, pac: this.pac, fantasmi: this.f.map((f) => f.posto), col: COL_FANT, vite: VITE }; }
  statoTick() {
    const r1 = (v) => Math.round(v * 100) / 100;
    return {
      m: { x: r1(this.m.x), y: r1(this.m.y), vx: this.m.vx, vy: this.m.vy, b: r1(this.m.bocca) },
      f: this.f.map((f) => ({ x: r1(f.x), y: r1(f.y), vx: f.vx, vy: f.vy, s: f.stato === 'caccia' ? (f.paura ? 'p' : 'c') : f.stato === 'occhi' ? 'o' : 'h' })),
      cibo: this.cibo.join(''), vite: this.vite, paura: Math.round(this.paura * 10) / 10, presa: this.presa > 0 ? 1 : 0, pac: this.pac,
    };
  }
}

module.exports = {
  meta: {
    id: 'mangiatutto',
    nome: 'Mangiatutto',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [1, 2, 3, 4, 5],
    descrizione: 'Mangia tutti i semini del labirinto scappando dai fantasmi. In compagnia: uno è il mangiatore, gli altri fanno i fantasmi!',
    alias: ['pacman', 'pac-man', 'pac man', 'fantasmi', 'labirinto', 'mangia'],
    opzioni: [
      { id: 'fantasmi', nome: 'Fantasmi del computer', valori: ['medio', 'facile', 'difficile'], etichette: ['Fantasmi normali', 'Fantasmi lenti di testa', 'Fantasmi furbi'], predefinito: 'medio' },
      { id: 'round', nome: 'Round (da soli)', valori: [3, 1, 5], etichette: ['3 round', '1 round', '5 round'], predefinito: 3 },
    ],
    regole: [
      'Il mangiatore gira nel labirinto con le frecce (o WASD, o il joystick sul telefono) e mangia i semini (10 punti) e le 4 pillole grandi (50 punti). Il passaggio a destra e a sinistra porta dall\'altra parte.',
      'Quattro fantasmi gli danno la caccia: se lo toccano perde una vita (ne ha 3) e tutti tornano al loro posto. Quando le vite finiscono, o quando il labirinto è pulito (+1000), o dopo 2 minuti e mezzo, il round finisce.',
      'Dopo una pillola grande i fantasmi diventano blu e scappano per qualche secondo: se il mangiatore li tocca li mangia (200, 400, 800, 1600 punti di fila) e i loro occhi tornano alla casa.',
      'Da soli fai sempre il mangiatore contro 4 fantasmi del computer (si sceglie quanto sono furbi) per 3 round (o 1, o 5).',
      'In più giocatori (fino a 5) uno fa il mangiatore e gli altri sono fantasmi (quelli che mancano per arrivare a 4 li fa il computer). I fantasmi dei giocatori si muovono con le frecce come il mangiatore e non possono entrare nella casa. Chi acchiappa il mangiatore prende 500 punti. Il mangiatore cambia a ogni round, così ognuno lo fa una volta.',
      'Vince chi ha più punti alla fine.',
      'Il gioco è in tempo reale: si ferma per tutti quando qualcuno apre le dispense.',
      'Il computer facile da mangiatore vede i fantasmi solo quando sono vicinissimi, da fantasma sbaglia strada spesso; il medio è attento; il difficile da mangiatore usa le pillole quando è braccato e insegue i fantasmi blu, da fantasma usa la strada più corta e taglia la strada al mangiatore.',
    ],
  },
  crea: (o) => new Mangiatutto(o),
  bot: () => ({}),
  _test: { Mangiatutto, LAB, DIST, passa, dist, idx },
};
