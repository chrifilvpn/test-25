// IL LADRO DI COLORI: ognuno si muove lasciando dietro di sé una scia del suo colore sulle caselle del pavimento
// (anche sopra i colori degli altri). Dopo 30 secondi vince chi ha colorato più caselle.
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
const W = 1000, H = 620, CELLA = 25, COLS = W / CELLA, RIGHE = Math.floor(H / CELLA), V = 230, R = 13, DURATA = 30;
const PENNELLO = 30; // raggio della macchia di colore
const PARTENZE = [[80, 80], [W - 80, H - 80], [W - 80, 80], [80, H - 80], [W / 2, 60], [W / 2, H - 60], [60, H / 2], [W - 60, H / 2]];

class Colori extends Arena {
  constructor(o) { super(o, { id: 'colori', round: 3 }); this.W = W; this.H = H; this.avvia(); }
  iniziaRound() {
    this.griglia = new Array(COLS * RIGHE).fill(-1);
    this.conta = new Array(this.n).fill(0);
    this.e = Array.from({ length: this.n }, (_, i) => ({ id: i, x: PARTENZE[i % 8][0], y: PARTENZE[i % 8][1] }));
    this.mente = {};
    this.cambi = []; // caselle cambiate dall'ultimo tick (il browser aggiorna solo quelle)
    this.versione = (this.versione || 0) + 1;
  }
  // il pennello è largo: colora le caselle entro PENNELLO pixel (una macchia, non una linea sottile)
  colora(p, x, y, pennello = PENNELLO) {
    const c0 = Math.floor(x / CELLA), r0 = Math.floor(y / CELLA), k0 = Math.ceil(pennello / CELLA);
    for (let r = r0 - k0; r <= r0 + k0; r++) for (let c = c0 - k0; c <= c0 + k0; c++) {
      if (c < 0 || r < 0 || c >= COLS || r >= RIGHE) continue;
      if (Math.hypot((c + 0.5) * CELLA - x, (r + 0.5) * CELLA - y) > pennello) continue;
      const k = r * COLS + c, prima = this.griglia[k];
      if (prima === p) continue;
      if (prima >= 0) this.conta[prima]--;
      this.griglia[k] = p; this.conta[p]++;
      this.cambi.push(k, p);
    }
  }
  passo(dt) {
    for (let p = 0; p < this.n; p++) {
      const e = this.e[p], i = this.inp[p];
      const ox = e.x, oy = e.y;
      const win = conTrucco(this, p), v = V * (win ? 1.3 : 1); // col trucco segreto: più veloce e pennello più largo
      e.x = Math.max(R, Math.min(W - R, e.x + i.x * v * dt));
      e.y = Math.max(R, Math.min(RIGHE * CELLA - R, e.y + i.y * v * dt));
      // si colorano anche le caselle a metà strada, così la scia non ha buchi
      const passi = Math.max(1, Math.ceil(Math.hypot(e.x - ox, e.y - oy) / (CELLA / 2)));
      for (let k = 1; k <= passi; k++) this.colora(p, ox + ((e.x - ox) * k) / passi, oy + ((e.y - oy) * k) / passi, win ? PENNELLO * 1.7 : PENNELLO);
    }
    // ogni 2 secondi lo stato completo (se un pezzetto si è perso per strada, il pavimento torna giusto)
    if (Math.floor(this.tempoRound / 2) !== Math.floor((this.tempoRound - dt) / 2)) this.cambiato = true;
    return this.tempoRound >= DURATA;
  }
  fineRound() {
    fineTrucco(this);
    const max = Math.max(...this.conta);
    this.conta.forEach((c, p) => { this.punti[p] += Math.round(c / 10); });
    const v = this.conta.indexOf(max);
    this.annuncia(v, `colora di più: ${max} caselle 🎨`, `hai colorato di più: ${max} caselle 🎨`, true);
  }
  // il computer va verso una zona con tante caselle non sue (il difficile preferisce quelle di chi è in testa)
  pensa(p, liv) {
    const e = this.e[p], ora = this.tempoRound;
    const m = this.mente[p] || (this.mente[p] = { fino: 0, bx: e.x, by: e.y });
    if (ora >= m.fino || Math.hypot(m.bx - e.x, m.by - e.y) < 20) {
      const capo = this.conta.indexOf(Math.max(...this.conta));
      let meglio = null, vm = -Infinity;
      for (let k = 0; k < { facile: 6, medio: 20, difficile: 45 }[liv]; k++) {
        const c = Math.floor(Math.random() * COLS), r = Math.floor(Math.random() * RIGHE);
        let v = 0;
        for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
          const cc = c + dc, rr = r + dr; if (cc < 0 || rr < 0 || cc >= COLS || rr >= RIGHE) continue;
          const o = this.griglia[rr * COLS + cc];
          if (o !== p) v += o === -1 ? 1 : liv === 'difficile' && o === capo && capo !== p ? 1.6 : 1.2;
        }
        const x = (c + 0.5) * CELLA, y = (r + 0.5) * CELLA;
        v -= Math.hypot(x - e.x, y - e.y) / (liv === 'facile' ? 200 : 60);
        if (v > vm) { vm = v; meglio = [x, y]; }
      }
      m.bx = meglio[0]; m.by = meglio[1];
      m.fino = ora + { facile: 1.6, medio: 1.1, difficile: 0.8 }[liv];
    }
    const dx = m.bx - e.x, dy = m.by - e.y, l = Math.hypot(dx, dy) || 1;
    const vel = { facile: 0.75, medio: 0.92, difficile: 1 }[liv];
    return { x: (dx / l) * vel, y: (dy / l) * vel };
  }
  statoTick() {
    const cambi = this.cambi; this.cambi = [];
    return { v: this.versione, c: cambi, e: this.e.map((e) => ({ id: e.id, x: Math.round(e.x), y: Math.round(e.y) })), n: this.conta, resta: Math.max(0, Math.round(DURATA - this.tempoRound)) };
  }
  vistaExtra() { return { griglia: this.griglia, versione: this.versione, cols: COLS, righe: RIGHE, cella: CELLA }; }
}

module.exports = {
  meta: {
    id: 'colori',
    nome: 'Il ladro di colori',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Muoviti e lascia una scia del tuo colore: in 30 secondi vince chi colora più pavimento (rubando anche agli altri).',
    alias: ['colori', 'splatoon', 'ink', 'tron', 'vernice', 'pittura'],
    opzioni: [{ id: 'round', nome: 'Round', valori: [3, 1, 5], etichette: ['3 round', '1 round', '5 round'], predefinito: 3 }],
    regole: [
      'Ognuno ha un colore. Muoviti con WASD o le frecce (sul telefono col joystick): ogni casella del pavimento su cui passi diventa del tuo colore, anche se era già di un altro.',
      'Un round dura 30 secondi. Alla fine si contano le caselle di ognuno: chi ne ha di più vince il round. Punti: uno ogni 10 caselle colorate. Il pennello è largo: colori una striscia di circa tre caselle.',
      'Dopo 3 round (o 1, o 5) vince chi ha più punti.',
      'Il gioco è in tempo reale: si ferma per tutti quando qualcuno apre le dispense.',
      'Il computer facile gira un po\' a caso e va più piano; il medio cerca le zone ancora libere; il difficile va dritto dove c\'è più da colorare e ruba soprattutto a chi è in testa.',
    ],
  },
  crea: (o) => new Colori(o),
  bot: () => ({}),
  _test: { Colori, COLS, RIGHE },
};
