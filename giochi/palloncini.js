// PALLONCINI IN FUGA: ognuno ha un palloncino che sale da solo (il cielo scorre verso il basso). Il vento lo spinge
// piano verso sinistra; con un solo tasto gli dai una spinta verso destra. Bisogna evitare gli spuntoni che arrivano
// dall'alto e i bordi (anche loro pungono). Chi resta in aria più a lungo vince il round.
const { Arena, casuale } = require('./arena');
const T = require('./trucco');
// il trucco segreto (!win): un vantaggio per il resto del round (al massimo 25 secondi di gioco), poi si spegne
function conTrucco(g, p) {
  if (!T.armato(g, p) || g.fase !== 'gioco') return false;
  const da = (g._winDa = g._winDa || {});
  if (da[p] == null || da[p] > g.tempoRound) da[p] = g.tempoRound;
  if (g.tempoRound - da[p] < 25) return true;
  T.consuma(g, p); delete da[p];
  return false;
}
// a fine round si spegne (se è servito almeno un secondo; altrimenti vale anche per il prossimo round)
function fineTrucco(g, sempre = false) {
  for (let p = 0; p < g.n; p++) { const da = g._winDa && g._winDa[p]; if (da != null && (sempre || g.tempoRound - da >= 1)) T.consuma(g, p); if (g._winDa) delete g._winDa[p]; }
}
const W = 1000, H = 620, Y_PALLONE = 480, R_PALLONE = 20;
const V_SBARRA = 115;
const VENTO = 240, SPINTA = 210, ATTRITO = 1.4, DURATA = 90;
// difficoltà: velocità del cielo (partenza e aumento al secondo), spuntoni (ogni quanto: dal primo al minimo), quanti
// si muovono di lato, raffiche di vento, sbarre con un solo varco (ogni quanti secondi e quanto è largo il varco)
const LIVELLI = {
  facile: { v0: 105, acc: 3, sp0: 1.05, spMin: 0.34, mobili: 0.15, raffica: 0, vento: 215, sbarre: 0, varco: 0, rMax: 22 },
  normale: { v0: 130, acc: 5, sp0: 0.85, spMin: 0.22, mobili: 0.3, raffica: 0, vento: 240, sbarre: 0, varco: 0, rMax: 26 },
  difficile: { v0: 155, acc: 5.5, sp0: 0.75, spMin: 0.21, mobili: 0.45, raffica: 0.3, vento: 255, sbarre: 7, varco: 200, rMax: 28 },
  estremo: { v0: 180, acc: 6.5, sp0: 0.65, spMin: 0.19, mobili: 0.6, raffica: 0.45, vento: 270, sbarre: 4.5, varco: 170, rMax: 30 },
};

class Palloncini extends Arena {
  constructor(o) {
    super(o, { id: 'palloncini', round: 3 });
    this.W = W; this.H = H;
    this.diff = LIVELLI[o.opzioni && o.opzioni.difficolta] ? o.opzioni.difficolta : 'normale';
    this.L = LIVELLI[this.diff];
    this.avvia();
  }
  // vento del momento: con le raffiche cambia forza piano piano (mai verso destra)
  ventoOra() { const L = this.L; return L.vento * (1 + L.raffica * Math.sin(this.tempoRound * 0.8) * Math.sin(this.tempoRound * 0.37 + 1)); }
  iniziaRound() {
    this.spuntoni = [];
    this.sbarre = []; this.nSb = 0; this.prossimaSbarra = this.L.sbarre ? 5 : Infinity;
    this.nSp = 0;
    this.velocita = this.L.v0;
    this.prossimo = 0.4;
    this.popTempo = new Array(this.n).fill(null);
    this.ordine = [];
    this.pal = Array.from({ length: this.n }, (_, i) => ({ id: i, x: W / 2 + (i - (this.n - 1) / 2) * 36, vx: 0, vivo: true }));
    this.pensiero = new Array(this.n).fill(null);
  }
  passo(dt) {
    const L = this.L;
    this.velocita = L.v0 + this.tempoRound * L.acc; // il cielo corre sempre di più
    // nuovi spuntoni
    this.prossimo -= dt;
    if (this.prossimo <= 0) {
      const r = casuale(14, L.rMax);
      const vicina = this.sbarre.some((b) => Math.abs(b.y + r) < 150); // niente spuntoni appiccicati alle sbarre
      if (!vicina) this.spuntoni.push({ id: ++this.nSp, x: casuale(50, W - 50), y: -r, r, vx: Math.random() < L.mobili ? casuale(-60, 60) * (this.diff === 'estremo' ? 1.5 : 1) : 0, giro: casuale(-2, 2) });
      this.prossimo = Math.max(L.spMin, L.sp0 - this.tempoRound * 0.008) * casuale(0.6, 1.3);
    }
    // sbarre: una fila di punte da un bordo all'altro con un solo varco
    this.prossimaSbarra -= dt;
    if (this.prossimaSbarra <= 0) {
      const varco = Math.max(L.varco - this.tempoRound * 0.6, L.varco * 0.75);
      this.sbarre.push({ id: ++this.nSb, y: -20, x: casuale(80 + varco / 2, W - 80 - varco / 2), w: varco });
      this.prossimaSbarra = L.sbarre * casuale(0.8, 1.2);
    }
    for (const s of this.spuntoni) { s.y += this.velocita * dt; s.x += s.vx * dt; if (s.x < s.r || s.x > W - s.r) s.vx = -s.vx; }
    for (const b of this.sbarre) b.y += V_SBARRA * dt; // le sbarre scendono più piano: c'è sempre il tempo di arrivare al varco
    this.spuntoni = this.spuntoni.filter((s) => s.y < H + 40);
    this.sbarre = this.sbarre.filter((b) => b.y < H + 40);
    const vento = this.ventoOra();
    // palloncini
    for (let p = 0; p < this.n; p++) {
      const b = this.pal[p];
      if (!b.vivo) continue;
      const k = this.nuoviTocchi(p);
      if (k) b.vx += SPINTA * Math.min(k, 3);
      b.vx -= vento * dt;
      b.vx *= Math.exp(-ATTRITO * dt);
      b.x += b.vx * dt;
      // col trucco segreto il palloncino non scoppia: gli spuntoni lo sfiorano e i bordi lo respingono
      if (conTrucco(this, p)) { if (b.x < 22 + R_PALLONE || b.x > W - 22 - R_PALLONE) { b.x = Math.max(22 + R_PALLONE, Math.min(W - 22 - R_PALLONE, b.x)); b.vx = 0; } continue; }
      const tocca = b.x < 22 + R_PALLONE - 6 || b.x > W - 22 - R_PALLONE + 6 || this.spuntoni.some((s) => Math.hypot(s.x - b.x, s.y - Y_PALLONE) < s.r + R_PALLONE - 3)
        || this.sbarre.some((s) => Math.abs(s.y - Y_PALLONE) < 12 + R_PALLONE - 4 && Math.abs(s.x - b.x) > s.w / 2 - R_PALLONE + 4);
      if (tocca) {
        b.vivo = false;
        this.popTempo[p] = this.tempoRound;
        this.ordine.push(p);
        this.cambiato = true;
        this.annuncia(p, 'è scoppiato! 💥', 'sei scoppiato! 💥');
      }
    }
    const vivi = this.pal.filter((b) => b.vivo).length;
    return vivi === 0 || (this.n > 1 && vivi === 1 && this.tempoRound > 1 && this.ordine.length === this.n - 1 && this.ultimoSolo()) || this.tempoRound >= DURATA;
  }
  // in più giocatori il round finisce quando ne resta uno solo (ma solo dopo che è rimasto in aria altri 3 secondi, per il gusto)
  ultimoSolo() { this._solo = this._solo || this.tempoRound; return this.tempoRound - this._solo > 3; }
  fineRound() {
    fineTrucco(this);
    this._solo = null;
    for (let p = 0; p < this.n; p++) {
      const t = this.popTempo[p] ?? this.tempoRound;
      this.punti[p] += Math.round(t);
    }
    const vivi = this.pal.map((b, p) => (b.vivo ? p : -1)).filter((p) => p >= 0);
    if (vivi.length === 1 && this.n > 1) { this.punti[vivi[0]] += 10; this.annuncia(vivi[0], 'è l\'ultimo in aria: +10 🎈', 'sei l\'ultimo in aria: +10 🎈', true); }
  }
  // il computer guarda gli spuntoni che arriveranno all'altezza del palloncino e sceglie dove stare
  pensa(p, liv) {
    const b = this.pal[p];
    if (!b.vivo) return {};
    const avanti = { facile: 0.7, medio: 1.2, difficile: 1.8 }[liv];
    let pens = this.pensiero[p];
    const ora = this.tempoRound;
    if (!pens || ora >= pens.fino) {
      // costo di ogni posizione: spuntoni che passeranno di lì presto, e bordi
      let meglio = b.x, costo = Infinity;
      for (let x = 70; x <= W - 70; x += 20) {
        let c = Math.abs(x - b.x) * 0.004 + (x < 150 || x > W - 150 ? 0.6 : 0);
        for (const s of this.spuntoni) {
          const t = (Y_PALLONE - s.y) / this.velocita;
          if (t < -0.3 || t > avanti) continue;
          const sx = s.x + s.vx * Math.max(0, t);
          const d = Math.abs(sx - x) - s.r - R_PALLONE;
          if (d < 45) c += (45 - d) / 20 + (t < 0.5 ? 2 : 0);
        }
        // le sbarre: fuori dal varco è punto sicuro di scoppio
        for (const s of this.sbarre) {
          const t = (Y_PALLONE - s.y) / V_SBARRA;
          if (t < -0.25) continue; // le sbarre si vedono da lontano: il computer le guarda sempre
          const fuori = Math.abs(x - s.x) - (s.w / 2 - R_PALLONE - 12);
          if (fuori > 0) c += 8 + fuori / 10;
          else c += Math.abs(x - s.x) / 120; // meglio stare in mezzo al varco
        }
        if (c < costo) { costo = c; meglio = x; }
      }
      // il difficile controlla anche la strada: prova qualche obiettivo e simula il volo per 2 secondi,
      // scartando quelli che lo fanno passare su uno spuntone o fuori dal varco di una sbarra
      if (liv === 'difficile') meglio = this.strada(b, meglio);
      pens = this.pensiero[p] = { obiettivo: meglio + casuale(-1, 1) * { facile: 50, medio: 18, difficile: 4 }[liv], fino: ora + { facile: 0.45, medio: 0.25, difficile: 0.12 }[liv] };
    }
    // si spinge quando si scivolerebbe a sinistra dell'obiettivo
    // velocità voluta: verso l'obiettivo, senza esagerare; se si va troppo a sinistra si spinge
    const voluta = Math.max(-160, Math.min(160, (pens.obiettivo - b.x) * 2.2));
    const tocco = b.vx < voluta - 60 && Math.random() < { facile: 0.25, medio: 0.5, difficile: 0.85 }[liv];
    return { tocco };
  }
  strada(b, preferito) {
    const vento = this.ventoOra(), passi = 60, dt = 1 / 30;
    let meglio = preferito, voto = -Infinity;
    const candidati = [preferito, b.x]; for (let d = -360; d <= 360; d += 60) candidati.push(b.x + d);
    for (const obj of candidati) {
      if (obj < 50 || obj > W - 50) continue;
      let x = b.x, vx = b.vx, colpo = null, vicino = Infinity;
      for (let k = 1; k <= passi && colpo === null; k++) {
        const t = k * dt;
        const voluta = Math.max(-160, Math.min(160, (obj - x) * 2.2));
        if (vx < voluta - 60) vx += SPINTA;
        vx -= vento * dt; vx *= Math.exp(-ATTRITO * dt); x += vx * dt;
        if (x < 22 + R_PALLONE - 6 || x > W - 22 - R_PALLONE + 6) colpo = t;
        for (const s of this.spuntoni) {
          const sy = s.y + this.velocita * t; if (Math.abs(sy - Y_PALLONE) > 60) continue;
          const d = Math.hypot(s.x + s.vx * t - x, sy - Y_PALLONE) - s.r - R_PALLONE;
          if (d < 0) { colpo = t; break; } if (d < vicino) vicino = d;
        }
        for (const s of this.sbarre) { const sy = s.y + V_SBARRA * t; if (Math.abs(sy - Y_PALLONE) < 28 && Math.abs(s.x - x) > s.w / 2 - R_PALLONE + 2) colpo = t; }
      }
      let v = colpo === null ? 100 + Math.min(vicino, 60) - (obj === preferito ? 0 : 8) : colpo * 10;
      // una sbarra in arrivo più tardi: bisogna finire nel suo varco
      for (const s of this.sbarre) if (s.y < Y_PALLONE + 10) { const fuori = Math.abs(obj - s.x) - (s.w / 2 - R_PALLONE - 10); if (fuori > 0) v -= 40 + fuori / 5; }
      if (v > voto) { voto = v; meglio = obj; }
    }
    return meglio;
  }
  vistaExtra() { return { diff: this.diff }; }
  statoTick() {
    return { v: Math.round(this.velocita), ve: Math.round(this.ventoOra()), sb: this.sbarre.map((b) => ({ id: 'b' + b.id, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w) })), b: this.pal.map((b) => ({ id: b.id, x: Math.round(b.x), y: Y_PALLONE, vivo: b.vivo })), sp: this.spuntoni.map((s) => ({ id: s.id, x: Math.round(s.x), y: Math.round(s.y), r: Math.round(s.r), g: s.giro })) };
  }
}

module.exports = {
  meta: {
    id: 'palloncini',
    nome: 'Palloncini in fuga',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Un tasto solo: spingi il tuo palloncino contro il vento ed evita gli spuntoni. Chi resta in aria più a lungo vince.',
    alias: ['palloncino', 'balloon', 'un tasto', 'spuntoni'],
    opzioni: [
      { id: 'difficolta', nome: 'Difficoltà', valori: ['normale', 'facile', 'difficile', 'estremo'], etichette: ['Normale', 'Facile', 'Difficile', 'Estremo'], predefinito: 'normale' },
      { id: 'round', nome: 'Round', valori: [3, 1, 5], etichette: ['3 round', '1 round', '5 round'], predefinito: 3 },
    ],
    regole: [
      'Ognuno ha un palloncino che sale da solo: il cielo scorre verso il basso, sempre più veloce. I palloncini non si toccano tra loro.',
      'Il vento spinge sempre il palloncino verso sinistra. Con un solo tasto (spazio, Invio, un clic o il pulsante sullo schermo) gli dai una spinta verso destra: tocchi leggeri per stare fermo, tanti tocchi per andare a destra.',
      'Evita gli spuntoni che arrivano dall\'alto (alcuni si spostano di lato) e i bordi, che pungono anche loro: al primo tocco il palloncino scoppia.',
      'Punti: un punto per ogni secondo passato in aria; l\'ultimo che resta in aria prende 10 punti in più (il round finisce 3 secondi dopo che è rimasto da solo, o dopo 90 secondi). Dopo 3 round (o 1, o 5) vince chi ha più punti.',
      'Difficoltà (si sceglie prima): Facile ha il cielo lento e pochi spuntoni; Normale è la partita classica; Difficile ha il cielo più veloce, più spuntoni che si muovono di lato, raffiche di vento che cambiano forza e ogni tanto una sbarra di punte da un bordo all\'altro con un solo varco; Estremo ha tutto questo ancora più forte, con varchi più stretti che si stringono col passare del tempo.',
      'Il gioco è in tempo reale: si ferma per tutti quando qualcuno apre le dispense.',
      'Il computer facile guarda poco avanti e reagisce tardi, il medio abbastanza, il difficile vede gli spuntoni da lontano e si piazza al sicuro.',
    ],
  },
  crea: (o) => new Palloncini(o),
  bot: () => ({}),
  _test: { Palloncini, Y_PALLONE, LIVELLI },
};
