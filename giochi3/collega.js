// COLLEGA I COLORI: una griglia con coppie di pallini colorati. Si uniscono i pallini dello stesso colore con dei tubi
// che non si incrociano; il livello è finito quando tutti i colori sono collegati e ogni casella è piena.
// Ogni livello lo crea il generatore (un cammino per tutte le caselle tagliato a pezzi) e il risolutore controlla che
// abbia una sola soluzione (public/js/giochi3/collega-logica.js, uguale nel browser). Da soli o in sfida (2-8): tutti
// hanno gli stessi livelli, vince chi li finisce prima.
const L = require('../public/js/giochi3/collega-logica');
const { SfidaRompicapo, FATTORE_LIVELLO, passoBot } = require('../giochi2/rompicapo-sfida');

const LATI = [5, 6, 7, 8, 9];
const QUANTI = [1, 3, 5];
const AIUTO_MS = 15000;
const RECORD = {};

class Collega extends SfidaRompicapo {
  constructor(o) {
    super('collega', o, 25 * 60000);
    const op = o.opzioni || {};
    this.lato = LATI.includes(Number(op.lato)) ? Number(op.lato) : 6;
    this.quanti = QUANTI.includes(Number(op.livelli)) ? Number(op.livelli) : 3;
    // i livelli crescono: con 3 o 5 livelli si parte un po' più piccoli e si arriva alla griglia scelta
    this.livelli = Array.from({ length: this.quanti }, (_, k) => {
      const N = Math.max(5, this.lato - (this.quanti - 1 - k > 1 ? 1 : 0));
      return L.genera(N);
    });
    this.tavole = Array.from({ length: this.n }, () => ({ liv: 0, tubi: this.livelli[0].coppie.map(() => []), mosse: 0, seq: 0, fatto: null, aiuti: 0, penale: 0, tempiLiv: [] }));
    this.avvia();
  }
  livelloDi(t) { return this.livelli[Math.min(t.liv, this.livelli.length - 1)]; }

  progresso(i, t) {
    if (t.fatto != null) return 1;
    const lv = this.livelloDi(t), c = L.conta(lv.N, lv.coppie, t.tubi);
    return Math.min(0.99, (t.liv + (c.uniti / lv.coppie.length) * 0.5 + (c.piene / c.tutte) * 0.5) / this.quanti);
  }
  risolta(p, t) { return t.liv >= this.quanti; }
  fraseArrivo(p, t) {
    const n = this.quanti > 1 ? `tutti i ${this.quanti} livelli` : 'il livello';
    return { altri: `collega ${n}${t.aiuti ? '' : ' senza aiuti 🏅'}`, io: `Hai collegato ${n}!${t.aiuti ? '' : ' Senza aiuti 🏅'}` };
  }
  ordineArrivo() { return this.arrivi.slice().sort((a, b) => this.tavole[a].fatto - this.tavole[b].fatto); }

  // dopo ogni mossa: livello finito? si passa al prossimo
  controllaLivello(p, t) {
    const lv = this.livelloDi(t);
    if (!L.conta(lv.N, lv.coppie, t.tubi).risolto) return;
    t.tempiLiv.push(this.cronometro());
    t.liv++;
    this.menti[p] = null; // il computer ripensa il suo ritmo sul livello nuovo
    if (t.liv < this.quanti) {
      t.tubi = this.livelli[t.liv].coppie.map(() => []);
      this.annuncia(p, `finisce il livello ${t.liv} di ${this.quanti}`, `Livello ${t.liv} fatto! Ecco il ${t.liv + 1}°`);
    }
  }
  mossa(p, t, a) {
    const lv = this.livelloDi(t);
    if (Number.isInteger(a.liv) && a.liv !== t.liv) return { errore: 'Livello cambiato' };
    if (a.tipo === 'traccia') {
      const tubi = t.tubi.map((x) => x.slice());
      const r = L.traccia(lv.N, lv.coppie, tubi, Number(a.c), Array.isArray(a.celle) ? a.celle.map(Number) : null);
      if (r.errore) return r;
      t.tubi = tubi; t.mosse++;
      this.controllaLivello(p, t);
      return { ok: true };
    }
    if (a.tipo === 'ricomincia') {
      if (t.tubi.every((x) => !x.length)) return { errore: 'Sei già all\'inizio' };
      t.tubi = lv.coppie.map(() => []);
      return { ok: true };
    }
    if (a.tipo === 'aiuto') {
      // un colore non ancora giusto prende il suo tubo della soluzione (+15 s)
      const c = this.daAiutare(t);
      if (c < 0) return { errore: 'Non serve nessun aiuto' };
      L.traccia(lv.N, lv.coppie, t.tubi, c, lv.soluzione[c]);
      t.aiuti++; t.penale += AIUTO_MS; t.mosse++;
      this.annuncia(p, 'chiede un aiuto (+15 s)', 'Aiuto: un colore è al suo posto (+15 s)');
      this.controllaLivello(p, t);
      return { ok: true };
    }
    return { errore: 'Mossa non valida' };
  }
  // il primo colore il cui tubo non è quello della soluzione (dritto o al contrario)
  daAiutare(t) {
    const lv = this.livelloDi(t);
    for (let c = 0; c < lv.coppie.length; c++) {
      const s = lv.soluzione[c], x = t.tubi[c];
      const uguale = x.length === s.length && (x.every((v, k) => v === s[k]) || x.every((v, k) => v === s[s.length - 1 - k]));
      if (!uguale) return c;
    }
    return -1;
  }

  // !win + parola segreta: il percorso giusto di un colore, detto a parole (solo a chi l'ha chiesto)
  suggerimentoWin(posto) {
    const t = this.tavole[posto];
    if (this.finita || !t || t.fatto != null || t.ritirato) return null;
    const c = this.daAiutare(t);
    if (c < 0) return null;
    const lv = this.livelloDi(t), s = lv.soluzione[c], N = lv.N;
    const frecce = s.slice(1).map((x, k) => ({ [-N]: '↑', [N]: '↓', [1]: '→', [-1]: '←' }[x - s[k]])).join('');
    return `💡 ${NOMI[c % NOMI.length]}: parti da riga ${Math.floor(s[0] / N) + 1}, colonna ${(s[0] % N) + 1} e vai ${frecce}`;
  }

  // ---- computer: conosce la soluzione e disegna un tubo alla volta; il facile ogni tanto ne sbaglia uno ----
  pianoBot(p, livello) {
    if (this.menti[p]) return this.menti[p];
    const lv = this.livelloDi(this.tavole[p]);
    const sec = (1.6 + lv.N * 0.45) * (FATTORE_LIVELLO[livello] || 1) * (0.85 + Math.random() * 0.3);
    return (this.menti[p] = { totale: lv.coppie.length * sec * 1000, passi: lv.coppie.length });
  }
  ritmoBot(p, livello, primo) { const m = this.pianoBot(p, livello); return passoBot(m.totale, m.passi) * (primo ? 2 : 1); }
  mossaBot(p, livello) {
    const t = this.tavole[p], lv = this.livelloDi(t);
    const liv0 = t.liv;
    const c = this.daAiutare(t);
    if (c < 0) return { tipo: 'pensa' };
    const s = lv.soluzione[c];
    const svista = { facile: 0.25, medio: 0.08, difficile: 0 }[livello] || 0;
    // la svista: il tubo si ferma a metà (lo finirà più avanti)
    if (Math.random() < svista && s.length > 3) return { tipo: 'traccia', c, celle: s.slice(0, 2 + Math.floor(Math.random() * (s.length - 3))), liv: liv0 };
    return { tipo: 'traccia', c, celle: s, liv: liv0 };
  }

  risultatoSolo(t) {
    const k = `${this.lato}:${this.quanti}`;
    const lista = (RECORD[k] = RECORD[k] || []);
    const voce = { ms: t.fatto, aiuti: t.aiuti, id: Math.random() };
    lista.push(voce); lista.sort((x, y) => x.ms - y.ms); lista.splice(5);
    this.posizioneRecord = lista.indexOf(voce);
    const r = super.risultatoSolo(t);
    r.titolo = t.aiuti ? `Tutto collegato (${t.aiuti} aiut${t.aiuti > 1 ? 'i' : 'o'})` : 'Tutto collegato senza aiuti! 🏅';
    return r;
  }

  vista(p) {
    const t = this.tavole[p] || this.tavole[0];
    const lv = this.livelloDi(t);
    return {
      ...this.vistaComune(p),
      N: lv.N, coppie: lv.coppie, tubi: t.tubi, liv: Math.min(t.liv, this.quanti - 1), quanti: this.quanti, finiti: t.liv,
      aiuti: t.aiuti, penale: t.penale, mosse: t.mosse,
      livelliAltri: this.tavole.map((x) => Math.min(x.liv, this.quanti)),
      record: this.sfida ? [] : RECORD[`${this.lato}:${this.quanti}`] || [], posizioneRecord: this.finita ? this.posizioneRecord ?? -1 : -1,
    };
  }
}
const NOMI = ['Il rosso', 'Il blu', 'Il verde', 'Il giallo', 'L\'arancione', 'Il celeste', 'Il viola', 'Il rosa', 'Il marrone', 'Il bianco', 'Il verde scuro', 'Il blu scuro', 'Il grigio'];

module.exports = {
  meta: {
    id: 'collega',
    nome: 'Collega i colori',
    tipo: 'tabellone',
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    saltaAssenti: true,
    descrizione: 'Unisci i pallini dello stesso colore con tubi che non si incrociano e riempi tutta la griglia. Livelli sempre nuovi, con una sola soluzione. Da soli o in sfida.',
    alias: ['collega i colori', 'collega', 'flow', 'flow free', 'tubi', 'unisci i colori', 'unisci i puntini', 'numberlink'],
    opzioni: [
      { id: 'lato', nome: 'Griglia', valori: LATI, etichette: ['5×5', '6×6', '7×7', '8×8', '9×9'], predefinito: 6 },
      { id: 'livelli', nome: 'Livelli', valori: QUANTI, etichette: ['1 livello', '3 livelli di fila', '5 livelli di fila'], predefinito: 3 },
    ],
    regole: [
      'Sulla griglia ci sono coppie di pallini dello stesso colore. Trascina da un pallino per disegnare un tubo fino all\'altro pallino del suo colore.',
      'I tubi vanno solo in orizzontale e in verticale e non si incrociano: se passi sopra un altro tubo, quello si accorcia. Non si passa sopra i pallini degli altri colori.',
      'Il livello è finito quando tutti i colori sono collegati E ogni casella della griglia è piena.',
      'Per correggere: riprendi un tubo dal suo pallino (si ridisegna) o da un punto in mezzo (si riparte da lì). Toccare un pallino senza trascinare cancella il suo tubo.',
      'Ogni livello è creato al momento e il risolutore controlla che abbia UNA sola soluzione. Con 3 o 5 livelli le griglie crescono fino a quella scelta. 💡 Aiuto: un colore va al suo posto (+15 secondi).',
      'Da soli si gioca per il tempo. In sfida (da 2 a 8) tutti hanno gli stessi livelli: vince chi li finisce prima. Punti: 10 al primo, 7 al secondo, 5 al terzo e poi a scendere.',
      'Il computer conosce la soluzione e disegna un tubo alla volta: il difficile è veloce e preciso, il medio più lento, il facile è lento e ogni tanto lascia un tubo a metà.',
    ],
  },
  crea: (o) => new Collega(o),
  bot: (g, p, livello) => g.mossaBot(p, livello),
  _test: { L, LATI },
};
