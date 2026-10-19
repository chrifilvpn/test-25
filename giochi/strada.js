// ATTRAVERSA LA STRADA (stile Crossy Road): si sale verso l'alto un passo alla volta tra prati, strade con le auto,
// fiumi con i tronchi e binari col treno. Le corsie nascono da un seme (giochi/strada-mondo.js, usato anche dal
// browser): il server manda solo il seme, le posizioni dei giocatori e il tempo del round.
// Sfida: vince chi arriva più lontano. Cooperazione: punteggio unico (la somma delle righe fatte da tutti) e chi muore
// lascia uno spirito per 5 secondi: se un compagno lo raggiunge, torna in gioco.
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
// a fine round si spegne (se è servito almeno 3 secondi; altrimenti vale anche per il prossimo round)
function fineTrucco(g, sempre = false) {
  for (let p = 0; p < g.n; p++) { const da = g._winDa && g._winDa[p]; if (da != null && (sempre || g.tempoRound - da >= 3)) T.consuma(g, p); if (g._winDa) delete g._winDa[p]; }
}
const M = require('./strada-mondo');
const { COLS, controlla, terra } = M;
const PARTENZA = 2, DURATA = 300, TEMPO_SPIRITO = 5, PASSO_MIN = 0.085, IMMUNE = 1.5;
const CELLA = 60, RIGHE_VISTE = 13, SOTTO = 4; // campo: 11 × 13 caselle da 60 px; il giocatore sta 4 righe sopra il fondo
const INTERVALLO = { facile: 0.5, medio: 0.3, difficile: 0.2 }; // quanto spesso salta il computer
const PROFONDO = { facile: 1, medio: 2, difficile: 3 }; // quante mosse guarda avanti
const RITARDO = { facile: 0.35, medio: 0.07, difficile: 0 }; // il facile vede il traffico \"in ritardo\" e sbaglia i tempi

const avanzaFondo = (t) => 0.4 + t * 0.005; // il fondo (l'aquila) sale piano anche se stai fermo

class Strada extends Arena {
  constructor(o) {
    super(o, { id: 'strada', round: 3, tickMs: 40 });
    this.W = COLS * CELLA; this.H = RIGHE_VISTE * CELLA;
    this.modo = o.opzioni && o.opzioni.modo === 'coop' && this.n > 1 ? 'coop' : 'sfida';
    this.squadra = 0; // punteggio unico della cooperazione (tutti i round)
    this.passiVisti = new Array(this.n).fill(0);
    this.avvia();
  }
  iniziaRound() {
    this.seme = Math.floor(Math.random() * 2 ** 31);
    this.mondo = M.crea(this.seme);
    const colonne = [[5], [4, 6], [3, 5, 7], [2, 4, 6, 8]][this.n - 1] || [5];
    this.e = Array.from({ length: this.n }, (_, i) => {
      const px = colonne[i] + 0.5;
      return { id: i, r: PARTENZA, px, vivo: true, best: PARTENZA, dir: 'u', h: 0, morte: null, spirito: null, cam: PARTENZA - SOTTO, coda: [], ultimo: -1, immune: 0, sicuro: { r: PARTENZA, px }, rianimato: 0 };
    });
    this.squadraRound = 0;
    this.pensiero = new Array(this.n).fill(0);
    this.cambiato = true;
  }
  // tasti: il browser manda un contatore di passi (pn) e le ultime mosse (pm, lettere u d l r): così nessun passo si perde
  input(p, d) {
    super.input(p, d);
    if (!d || this.bot[p] || d.pn === undefined) return;
    const n = Number(d.pn), k = n - this.passiVisti[p];
    if (!Number.isFinite(n) || k <= 0) return;
    this.passiVisti[p] = n;
    if (k > 30 || typeof d.pm !== 'string' || this.fase !== 'gioco') return;
    const e = this.e[p];
    for (const ch of d.pm.slice(-Math.min(k, 6))) if ('udlr'.includes(ch) && e.coda.length < 3) e.coda.push(ch);
  }
  // un passo: aggiorna la casella di e (o di una sua copia per le simulazioni del computer); false se bloccato
  static passo(mondo, e, mossa) {
    const c0 = mondo.corsia(e.r);
    if (mossa === 'l' || mossa === 'r') {
      const dx = mossa === 'l' ? -1 : 1;
      if (c0.k === 'f') { e.px += dx; return true; } // sul tronco ci si sposta di una casella rispetto al tronco
      const col = Math.floor(e.px) + dx;
      if (col < 0 || col >= COLS || (c0.k === 'g' && c0.a.includes(col))) return false;
      e.px = col + 0.5; return true;
    }
    const nr = e.r + (mossa === 'u' ? 1 : -1);
    if (nr < 0) return false;
    const c1 = mondo.corsia(nr);
    if (c1.k === 'f') e.px = Math.max(0.5, Math.min(COLS - 0.5, e.px));
    else {
      const col = Math.max(0, Math.min(COLS - 1, Math.round(e.px - 0.5)));
      if (c1.k === 'g' && c1.a.includes(col)) return false; // c'è un albero
      e.px = col + 0.5;
    }
    e.r = nr;
    return true;
  }
  muovi(p, mossa, t) {
    const e = this.e[p];
    e.dir = mossa;
    if (!Strada.passo(this.mondo, e, mossa)) return;
    e.h++; e.ultimo = t;
    if (e.r > e.best) e.best = e.r;
    if (terra(this.mondo.corsia(e.r))) e.sicuro = { r: e.r, px: e.px };
  }
  muori(p, tipo, t) {
    const e = this.e[p];
    e.vivo = false; e.morte = tipo; e.coda = [];
    this.cambiato = true;
    // in cooperazione resta lo spirito (non se ti ha preso l'aquila): sulla strada dove sei caduto, sulla riva se sei in acqua
    if (this.modo === 'coop' && tipo !== 'aquila') {
      const dove = tipo === 'acqua' || tipo === 'bordo' ? e.sicuro : { r: e.r, px: Math.floor(Math.max(0, Math.min(COLS - 1, e.px))) + 0.5 };
      e.spirito = { r: dove.r, px: dove.px, fino: t + TEMPO_SPIRITO };
    }
    const [lui, tu] = {
      auto: ['è finito sotto una macchina 🚗', 'sei finito sotto una macchina 🚗'], treno: ['è stato preso dal treno 🚆', 'sei stato preso dal treno 🚆'],
      acqua: ['è caduto in acqua 💦', 'sei caduto in acqua 💦'], bordo: ['è stato portato via dal tronco 🌊', 'sei stato portato via dal tronco 🌊'],
      aquila: ['è stato portato via dall\'aquila 🦅', 'sei stato portato via dall\'aquila 🦅'],
    }[tipo];
    this.annuncia(p, lui + (e.spirito ? ': raggiungilo entro 5 s!' : ''), tu + (e.spirito ? ': un compagno può salvarti entro 5 s' : ''));
  }
  passo(dt) {
    const t = this.tempoRound;
    for (let p = 0; p < this.n; p++) {
      const e = this.e[p];
      if (!e.vivo) continue;
      if (!this.bot[p]) { const k = this.nuoviTocchi(p); for (let i = 0; i < k && e.coda.length < 3; i++) e.coda.push('u'); } // spazio o clic = avanti
      if (e.coda.length && t - e.ultimo >= PASSO_MIN) this.muovi(p, e.coda.shift(), t);
      const ris = controlla(this.mondo.corsia(e.r), e.px, t);
      // il trucco segreto (!win): auto e treni non lo prendono, e se finisce in acqua torna sull'ultima riva
      const win = conTrucco(this, p), riva = () => { e.r = e.sicuro.r; e.px = e.sicuro.px; e.coda = []; this.cambiato = true; };
      if (ris && ris.tronco) { e.px += ris.tronco * dt; if (e.px < 0.15 || e.px > COLS - 0.15) { if (win) riva(); else this.muori(p, 'bordo', t); } }
      else if (ris && ris.morte && win) { if (ris.morte === 'acqua') riva(); }
      else if (ris && ris.morte && !(t < e.immune && (ris.morte === 'auto' || ris.morte === 'treno'))) this.muori(p, ris.morte, t);
      if (!e.vivo) continue;
      e.cam = Math.max(e.cam + avanzaFondo(t) * dt, e.r - SOTTO);
      if (e.r < e.cam - 0.5) this.muori(p, 'aquila', t);
    }
    // cooperazione: chi raggiunge lo spirito di un compagno lo rimette in gioco
    if (this.modo === 'coop') {
      for (const e of this.e) {
        if (e.vivo || !e.spirito) continue;
        if (t > e.spirito.fino) { e.spirito = null; this.cambiato = true; continue; }
        const chi = this.e.find((q) => q.vivo && q.r === e.spirito.r && Math.abs(q.px - e.spirito.px) < 0.75);
        if (chi) {
          Object.assign(e, { vivo: true, morte: null, r: e.spirito.r, px: e.spirito.px, immune: t + IMMUNE, cam: Math.min(e.cam, e.spirito.r - 2), coda: [], ultimo: t, rianimato: e.rianimato + 1 });
          e.sicuro = { r: e.r, px: e.px }; e.spirito = null; e.h++;
          this.cambiato = true;
          this.annuncia(chi.id, 'ha salvato un compagno! 💚', 'hai salvato un compagno! 💚');
        }
      }
    }
    const vivi = this.e.filter((e) => e.vivo);
    if (!vivi.length && !this.e.some((e) => e.spirito)) return true;
    if (this.modo === 'sfida' && this.n > 1 && vivi.length === 1 && vivi[0].best > Math.max(...this.e.filter((e) => !e.vivo).map((e) => e.best))) return true; // è rimasto solo e ha già superato tutti
    return t >= DURATA;
  }
  fineRound() {
    fineTrucco(this);
    const righe = this.e.map((e) => e.best - PARTENZA);
    righe.forEach((x, p) => { this.punti[p] += x; });
    if (this.modo === 'coop') {
      this.squadraRound = righe.reduce((a, b) => a + b, 0);
      this.squadra += this.squadraRound;
      this.annuncia(null, `Round finito: la squadra ha fatto ${this.squadraRound} righe`, `Round finito: la squadra ha fatto ${this.squadraRound} righe`, true);
    } else if (this.n > 1) {
      const max = Math.max(...righe), primi = righe.map((x, p) => (x === max ? p : -1)).filter((p) => p >= 0);
      if (primi.length === 1) this.annuncia(primi[0], `è arrivato più lontano: ${max} righe 🏆`, `sei arrivato più lontano: ${max} righe 🏆`, true);
    }
  }
  chiudi() {
    super.chiudi();
    if (this.modo === 'coop') {
      this.risultato = { fazioni: [{ posti: this.e.map((e) => e.id), punti: this.squadra }], etichetta: 'righe di squadra', pareggio: false, vincitori: this.e.map((e) => e.id), titolo: `Punteggio di squadra: ${this.squadra} righe` };
    }
  }

  // ---------- il computer ----------
  // simula una serie di mosse partendo da adesso: ogni mossa e poi un'attesa di h secondi, controllando il traffico
  simula(p, seq, t0, h, ritardo) {
    const e = this.e[p];
    const s = { r: e.r, px: e.px };
    let t = t0, cam = e.cam, max = e.r;
    const ferma = (durata) => {
      const passi = Math.max(2, Math.ceil(durata / 0.04)), d = durata / passi;
      for (let i = 0; i <= passi; i++) { // anche l'istante del salto (i = 0)
        const ris = controlla(this.mondo.corsia(s.r), s.px, t - ritardo + d * i);
        if (ris && ris.tronco) { if (i) s.px += ris.tronco * d; if (s.px < 0.25 || s.px > COLS - 0.25) return t + d * i; }
        else if (ris && ris.morte && !(t + d * i < e.immune && ris.morte !== 'acqua')) return t + d * i;
        cam = Math.max(cam + avanzaFondo(t) * d, max - SOTTO);
        if (s.r < cam - 0.3) return t + d * i;
      }
      t += durata; return null;
    };
    for (const m of seq) {
      if (m !== 's') { if (!Strada.passo(this.mondo, s, m)) return { bloccato: true }; if (s.r > max) max = s.r; }
      const morte = ferma(h);
      if (morte !== null) return { morte: morte - t0, s, max };
    }
    const morte = ferma(0.3); // e subito dopo non deve arrivare niente
    return { morte: morte === null ? null : morte - t0, s, max };
  }
  pensa(p, liv) {
    const e = this.e[p], t = this.tempoRound;
    if (!e.vivo || e.coda.length) return {};
    const h = INTERVALLO[liv] || 0.3;
    if (t - e.ultimo < h || t < this.pensiero[p]) return {};
    if (liv === 'facile' && Math.random() < 0.08) { this.pensiero[p] = t + 0.25; e.coda.push(['u', 'l', 'r', 'u'][Math.floor(Math.random() * 4)]); return {}; }
    const mosse = ['u', 'l', 'r', 's', 'd'], prof = PROFONDO[liv] || 2;
    // chi deve salvare un compagno punta al suo spirito
    const spirito = this.modo === 'coop' ? this.e.filter((q) => !q.vivo && q.spirito).map((q) => q.spirito).sort((a, b) => Math.abs(a.r - e.r) - Math.abs(b.r - e.r))[0] : null;
    let meglio = null, voto = -Infinity;
    const prova = (seq) => {
      if (seq.length < prof) { for (const m of mosse) prova(seq.concat(m)); return; }
      const r = this.simula(p, seq, t, h, RITARDO[liv] || 0);
      if (r.bloccato) return;
      let v = (r.max - e.r) * 10 + (r.s.r - e.r) * 3 - Math.abs(r.s.px - COLS / 2) * 0.25 + casuale(0, 0.5);
      if (seq[0] === 's') v -= 1.5;
      if (r.morte !== null) v -= 1000 - r.morte * 100;
      if (spirito) v -= (Math.abs(r.s.r - spirito.r) * 3 + Math.abs(r.s.px - spirito.px) * 2) * (liv === 'facile' ? 0.3 : 1.2);
      if (v > voto) { voto = v; meglio = seq; }
    };
    prova([]);
    this.pensiero[p] = t + (liv === 'facile' ? casuale(0, 0.25) : 0);
    if (meglio && meglio[0] !== 's') e.coda.push(meglio[0]);
    else e.ultimo = t - h + 0.06; // resta fermo e ci ripensa tra poco
    return {};
  }

  vistaExtra() { return { seme: this.seme, modo: this.modo, partenza: PARTENZA, sotto: SOTTO }; }
  statoTick() {
    const t = this.tempoRound;
    return {
      sq: this.modo === 'coop' ? this.squadra + this.e.reduce((a, e) => a + e.best - PARTENZA, 0) * (this.fase === 'gioco' ? 1 : 0) : undefined,
      g: this.e.map((e) => ({
        id: e.id, r: e.r, x: Math.round(e.px * 100) / 100, v: e.vivo ? 1 : 0, b: e.best - PARTENZA, d: e.dir, h: e.h, m: e.morte, c: Math.round(e.cam * 100) / 100,
        im: t < e.immune ? 1 : 0, sp: e.spirito ? { r: e.spirito.r, x: e.spirito.px, f: Math.max(0, Math.round((e.spirito.fino - t) * 10) / 10) } : null,
      })),
    };
  }
}

module.exports = {
  meta: {
    id: 'strada',
    nome: 'Attraversa la strada',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [1, 2, 3, 4],
    descrizione: 'Un passo alla volta tra strade, fiumi e binari: sfida a chi arriva più lontano o cooperazione a punteggio unico.',
    alias: ['crossy road', 'crossy', 'strada', 'attraversa', 'rana', 'frogger', 'gallina'],
    opzioni: [
      { id: 'modo', nome: 'Modo', valori: ['sfida', 'coop'], etichette: ['Sfida: chi arriva più lontano', 'Cooperazione: punteggio unico'], predefinito: 'sfida' },
      { id: 'round', nome: 'Round', valori: [3, 1, 5], etichette: ['3 round', '1 round', '5 round'], predefinito: 3 },
    ],
    regole: [
      'Si sale verso l\'alto un passo alla volta: freccia su (o W, spazio, un clic sul campo) va avanti, le altre frecce (o A, S, D) di lato e indietro. Sul telefono tocca il campo per andare avanti, striscia il dito per andare di lato o indietro, oppure usa le frecce sotto il campo.',
      'Sul prato gli alberi non si attraversano. Sulle strade passano auto e camion: se ti prendono sei fuori. Sul binario prima del treno si accende la luce rossa: quando passa, non ci devi essere.',
      'Il fiume si attraversa solo saltando sui tronchi (che ti portano con sé: se ti portano fuori dallo schermo sei fuori) o sulle ninfee, che stanno ferme. L\'acqua è fatale.',
      'Non restare fermo troppo a lungo e non tornare troppo indietro: il fondo dello schermo sale piano piano e chi resta sotto viene portato via dall\'aquila.',
      'Ognuno ha il suo omino e i giocatori non si scontrano tra loro. Il mondo è uguale per tutti ed è diverso a ogni round; più si sale più è difficile (strade più veloci, fiumi più larghi).',
      'Sfida (1 contro 1 o fino a 4): ogni riga conquistata vale un punto; vince chi arriva più lontano. Il round finisce quando cadono tutti, oppure quando resta uno solo che ha già superato tutti gli altri (al massimo 5 minuti).',
      'Cooperazione: il punteggio è unico, la somma delle righe fatte da tutti. Chi cade (non per l\'aquila) lascia uno spirito per 5 secondi: se un compagno lo raggiunge, torna in gioco lì (per un secondo e mezzo le auto non lo toccano). Chi cade in acqua lascia lo spirito sulla riva da cui era partito.',
      'Dopo 3 round (o 1, o 5) vince chi ha fatto più righe in tutto; in cooperazione conta il punteggio della squadra.',
      'Il gioco è in tempo reale: si ferma per tutti quando qualcuno apre le dispense.',
      'Il computer facile salta piano e vede il traffico in ritardo, il medio guarda due mosse avanti, il difficile salta veloce e controlla tre mosse avanti dove saranno auto, tronchi e treni.',
    ],
  },
  crea: (o) => new Strada(o),
  bot: () => ({}),
  _test: { Strada, PARTENZA, M },
};
