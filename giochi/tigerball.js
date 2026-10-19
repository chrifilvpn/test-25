// TIGERBALL: si lancia la pallina tigrata con la fionda (si trascina all'indietro e si lascia) per farla finire nel
// cesto, tra muri, respingenti, pale e blocchi che si muovono. Ognuno ha la sua pallina, che non tocca quelle degli
// altri. Sfida: vince chi finisce i livelli con meno tiri. Cooperazione: il livello è superato quando sono entrate
// tutte le palline, e i tiri di tutti si sommano. Livelli e fisica in giochi/tigerball-livelli.js (anche nel browser).
const { Arena, casuale } = require('./arena');
const T = require('./trucco');
const L = require('./tigerball-livelli');
const { LIVELLI, V_MAX, segmenti, passo, nelCesto, fuori } = L;
const TEMPO = 90, PENALITA = 3, FERMA = 0.6;

function mescola(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

class Tigerball extends Arena {
  constructor(o) {
    super(o, { id: 'tigerball', round: 5, tickMs: 33 });
    this.W = L.W; this.H = L.H;
    this.modo = o.opzioni && o.opzioni.modo === 'coop' && this.n > 1 ? 'coop' : 'sfida';
    this.nRound = Math.min(LIVELLI.length, Number(o.opzioni && o.opzioni.round) || 5);
    // i primi due livelli sono sempre i più facili, poi gli altri in ordine casuale
    this.ordine = [0, 1, ...mescola(LIVELLI.map((_, i) => i).slice(2))];
    this.tiriTot = new Array(this.n).fill(0);
    this.pausaRoundMs = 3000;
    this.avvia();
  }
  get liv() { return LIVELLI[this.ordine[(this.round - 1) % this.ordine.length]]; }
  iniziaRound() {
    const [x, y] = this.liv.partenza;
    this.b = Array.from({ length: this.n }, (_, i) => ({ id: i, x, y, vx: 0, vy: 0, stato: 'pronta', ferma: 0, tiri: 0, dentro: null }));
    this.mente = {};
    this.cambiato = true;
  }
  // un tiro: angolo (radianti) e forza (0-1)
  tira(p, a, f) {
    const b = this.b[p];
    if (this.fase !== 'gioco' || b.stato !== 'pronta') return false;
    if (!Number.isFinite(a) || !Number.isFinite(f)) return false;
    f = Math.max(0.05, Math.min(1, f));
    if (T.consuma(this, p)) [a, f] = this.tiroBuono(a, f); // il trucco segreto (!win): il tiro si corregge da solo verso il cesto
    Object.assign(b, { vx: Math.cos(a) * f * V_MAX, vy: Math.sin(a) * f * V_MAX, stato: 'vola', ferma: 0, lancio: this.tempoRound, acc: 0 });
    b.tiri++; this.tiriTot[p]++; this.punti[p]++; this.cambiato = true;
    return true;
  }
  azione(p, a) {
    if (!a || a.tipo !== 'tira') return { errore: 'Azione non valida' };
    if (!this.tira(p, Number(a.a), Number(a.f))) return { errore: 'La pallina non è ancora pronta' };
    return { ok: true };
  }
  torna(b) { const [x, y] = this.liv.partenza; Object.assign(b, { x, y, vx: 0, vy: 0, stato: 'pronta', ferma: 0 }); this.cambiato = true; }
  passo(dt) {
    const t = this.tempoRound, segs = segmenti(this.liv, t);
    for (const b of this.b) {
      if (b.stato === 'vola') {
        // passi fissi da 1/120 di secondo, gli stessi che usa il computer quando prova i tiri nella sua testa
        b.acc = (b.acc || 0) + dt;
        while (b.acc >= 1 / 120 - 1e-9 && b.stato === 'vola') { b.acc -= 1 / 120; passo(this.liv, b, t, 1 / 120, segs); if (nelCesto(this.liv, b)) break; }
        if (nelCesto(this.liv, b)) {
          b.stato = 'dentro'; b.dentro = t; this.cambiato = true;
          this.annuncia(b.id, `fa canestro in ${b.tiri} ${b.tiri === 1 ? 'tiro' : 'tiri'}! 🐯`, `dentro in ${b.tiri} ${b.tiri === 1 ? 'tiro' : 'tiri'}! 🐯`);
        } else if (fuori(b)) { b.stato = 'torna'; b.ferma = 0.5; }
        else if (Math.hypot(b.vx, b.vy) < 14) { b.ferma += dt; if (b.ferma > FERMA) { b.stato = 'torna'; b.ferma = 0.3; } }
        else b.ferma = 0;
      } else if (b.stato === 'torna') { b.ferma -= dt; if (b.ferma <= 0) this.torna(b); }
    }
    if (this.b.every((b) => b.stato === 'dentro')) return true;
    return t >= TEMPO;
  }
  fineRound() {
    // chi non è entrato entro il tempo prende 3 tiri in più
    for (const b of this.b) if (b.stato !== 'dentro') { this.tiriTot[b.id] += PENALITA; this.punti[b.id] += PENALITA; }
    if (this.modo === 'coop') { const tot = this.b.reduce((a, b) => a + b.tiri + (b.stato === 'dentro' ? 0 : PENALITA), 0); this.annuncia(null, `Livello superato con ${tot} tiri di squadra`, `Livello superato con ${tot} tiri di squadra`, true); }
  }
  chiudi() {
    this.finita = true; this.fase = 'fine';
    if (this.modo === 'coop') {
      const tot = this.tiriTot.reduce((a, b) => a + b, 0);
      this.risultato = { fazioni: [{ posti: this.b.map((b) => b.id), punti: tot }], etichetta: 'tiri di squadra', crescente: true, pareggio: false, vincitori: this.b.map((b) => b.id), titolo: `Tiri di squadra: ${tot}` };
      return;
    }
    const min = Math.min(...this.tiriTot), v = this.tiriTot.map((x, i) => (x === min ? i : -1)).filter((i) => i >= 0);
    this.risultato = { fazioni: this.tiriTot.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'tiri', crescente: true, pareggio: this.n > 1 && v.length > 1, vincitori: this.n === 1 ? [0] : v.length > 1 ? [] : v };
  }

  // ---------- il computer: prova tanti tiri simulando la fisica e sceglie quello che entra (o ci va più vicino) ----------
  simulaTiro(a, f, t0) {
    const Lv = this.liv, [x, y] = Lv.partenza, c = Lv.cesto;
    const p = { x, y, vx: Math.cos(a) * f * V_MAX, vy: Math.sin(a) * f * V_MAX };
    let meglio = Infinity, ferma = 0;
    const mobili = (Lv.pale || []).length + (Lv.blocchi || []).length, fissi = segmenti(Lv, t0);
    for (let t = 0; t < 4; t += 1 / 120) {
      passo(Lv, p, t0 + t, 1 / 120, mobili ? segmenti(Lv, t0 + t) : fissi);
      if (nelCesto(Lv, p)) return 0;
      if (fuori(p)) break;
      const d = Math.hypot(p.x - (c.x + c.w / 2), p.y - (c.y - c.h / 2));
      if (d < meglio) meglio = d;
      if (Math.hypot(p.vx, p.vy) < 14) { ferma += 1 / 120; if (ferma > FERMA) break; } else ferma = 0;
    }
    return 10 + meglio;
  }
  // il tiro che entra più vicino a quello scelto: prima piccole correzioni, poi (se serve) una ricerca larga come il computer difficile
  tiroBuono(a, f) {
    const t0 = this.tempoRound;
    let best = [a, f], voto = this.simulaTiro(a, f, t0);
    const prova = (x, y) => { if (voto <= 0) return; y = Math.max(0.05, Math.min(1, y)); const v = this.simulaTiro(x, y, t0); if (v < voto) { voto = v; best = [x, y]; } };
    for (let k = 0; k < 40 && voto > 0; k++) prova(a + casuale(-0.15, 0.15), f + casuale(-0.15, 0.15));
    for (let k = 0; k < 60 && voto > 0; k++) prova(casuale(-Math.PI * 0.95, -0.05), casuale(0.25, 1));
    for (let k = 0; k < 40 && voto > 0; k++) prova(best[0] + casuale(-0.06, 0.06), best[1] + casuale(-0.05, 0.05));
    return best;
  }
  pensa(p, liv) {
    const b = this.b[p], t = this.tempoRound;
    if (b.stato !== 'pronta') return {};
    const m = this.mente[p] || (this.mente[p] = {});
    if (m.quando === undefined) { m.quando = t + { facile: casuale(1.5, 3), medio: casuale(1.2, 2.4), difficile: casuale(1, 2) }[liv]; return {}; }
    if (t < m.quando) return {};
    m.quando = undefined;
    const n = { facile: 12, medio: 30, difficile: 50 }[liv], t0 = t;
    let best = null, voto = Infinity;
    const prova = (a, f) => { const v = this.simulaTiro(a, f, t0); if (v < voto) { voto = v; best = [a, f]; } };
    for (let k = 0; k < n; k++) prova(casuale(-Math.PI * 0.95, -0.05), casuale(0.25, 1));
    // il difficile (e un po' il medio) raffina attorno al tiro migliore
    const raffina = { facile: 0, medio: 8, difficile: 30 }[liv];
    for (let k = 0; k < raffina && voto > 0; k++) prova(best[0] + casuale(-0.08, 0.08), Math.min(1, best[1] + casuale(-0.06, 0.06)));
    const errA = { facile: 0.1, medio: 0.035, difficile: 0.008 }[liv], errF = { facile: 0.12, medio: 0.04, difficile: 0.01 }[liv];
    this.tira(p, best[0] + casuale(-errA, errA), best[1] * (1 + casuale(-errF, errF)));
    return {};
  }
  vistaExtra() { return { liv: this.ordine[(this.round - 1) % this.ordine.length], modo: this.modo, tempo: TEMPO }; }
  statoTick() {
    const r1 = (v) => Math.round(v * 10) / 10;
    return {
      b: this.b.map((b) => ({ id: b.id, x: r1(b.x), y: r1(b.y), s: b.stato[0], n: b.tiri, g: b.stato === 'vola' ? Math.round((t2(b) * 180) / Math.PI) : 0 })),
      tt: this.tiriTot, resta: Math.max(0, Math.ceil(TEMPO - this.tempoRound)),
    };
  }
}
// la pallina gira mentre vola (solo per il disegno)
const t2 = (b) => ((b.x / 11) % (2 * Math.PI));

module.exports = {
  meta: {
    id: 'tigerball',
    nome: 'Tigerball',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Lancia la pallina tigrata con la fionda e fai canestro tra muri, molle e pale che girano. Sfida a chi usa meno tiri o in squadra.',
    alias: ['tiger ball', 'tigre', 'fionda', 'canestro', 'fisica', 'pallina'],
    opzioni: [
      { id: 'modo', nome: 'Modo', valori: ['sfida', 'coop'], etichette: ['Sfida: meno tiri', 'Cooperazione: tiri sommati'], predefinito: 'sfida' },
      { id: 'round', nome: 'Livelli', valori: [5, 3, 8], etichette: ['5 livelli', '3 livelli', '8 livelli'], predefinito: 5 },
    ],
    regole: [
      'Ognuno ha la sua pallina tigrata sul punto di lancio. Si tira come con una fionda: premi sul campo (o appoggia il dito), trascina all\'indietro e lascia. Più tiri indietro, più forte parte; la linea tratteggiata mostra il primo tratto del volo.',
      'La pallina rimbalza sui muri e sulle piattaforme, le molle rosse la rilanciano, i pioli la deviano, le pale girano e i blocchi si spostano. Deve finire dentro il cesto della tigre.',
      'Se la pallina si ferma fuori dal cesto o cade fuori dal campo, torna al punto di lancio e si tira di nuovo. Ogni lancio conta un tiro.',
      'Le palline non si toccano tra loro: ognuno fa il suo percorso. Tutti tirano quando vogliono.',
      'Il livello finisce quando sono entrate tutte le palline, o dopo 90 secondi: chi non è entrato prende 3 tiri in più.',
      'Sfida: dopo 5 livelli (o 3, o 8) vince chi ha fatto meno tiri in tutto. Cooperazione: il livello si supera quando sono entrati tutti e i tiri di tutti si sommano in un punteggio di squadra (meno è meglio).',
      'Otto livelli disegnati apposta: Primo lancio, Il muro, Il rimbalzo, La finestra, Il mulino, Il blocco che va e viene, La pioggia di pioli, Sopra il burrone. I primi due sono sempre all\'inizio, gli altri in ordine casuale.',
      'Il gioco è in tempo reale: si ferma per tutti quando qualcuno apre le dispense.',
      'Il computer prova i tiri nella sua testa prima di lanciare: il facile ne prova pochi e ha la mano poco ferma, il medio di più, il difficile tantissimi, li perfeziona e ha la mano fermissima.',
    ],
  },
  crea: (o) => new Tigerball(o),
  bot: () => ({}),
  _test: { Tigerball, L },
};
