// CHI È L'IMPOSTORE: solo tra persone, da 3 a 10. Tutti ricevono la stessa parola segreta tranne l'impostore,
// che sa di esserlo e non riceve nulla. A turno si dà un indizio (2 o 3 giri), poi si vota chi è l'impostore.
// Pareggio = un altro giro di indizi e si rivota. Se l'impostore viene scoperto può ancora vincere indovinando la parola.
const { PAROLE } = require('./parole-impostore');

// minuscole, senza accenti, spazi e apostrofi: "Tiramisù" → "tiramisu", "moto d'acqua" → "motodacqua"
const normalizza = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

// distanza di modifica (per perdonare un errore di battitura all'impostore)
function distanza(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
}
const indovinata = (tentativo, parola) => {
  const t = normalizza(tentativo), w = normalizza(parola);
  if (!t) return false;
  return t === w || (w.length >= 5 && distanza(t, w) <= 1);
};

const PAUSA_VERDETTO = 8500; // la rivelazione dell'accusato
const PAUSA_FINALE = 9000;   // la rivelazione finale prima dei risultati

class Impostore {
  constructor({ n, primo = 0, opzioni = {} }) {
    this.id = 'impostore';
    this.n = n;
    this.giri = Number(opzioni.giri) === 3 ? 3 : 2;
    const cat = PAROLE[opzioni.categoria] ? opzioni.categoria : 'tutte';
    const categorie = cat === 'tutte' ? Object.keys(PAROLE) : [cat];
    this.categoria = categorie[Math.floor(Math.random() * categorie.length)];
    const elenco = PAROLE[this.categoria].parole;
    this.parola = elenco[Math.floor(Math.random() * elenco.length)];
    this.impostore = Math.floor(Math.random() * n);
    this.fuori = new Array(n).fill(false);
    this.indizi = [];           // { giro, posto, testo }
    this.giro = 1;
    this.giriTotali = this.giri; // cresce di 1 a ogni pareggio
    this.spareggi = 0;
    // si comincia da "primo", ma l'impostore non apre mai il giro (sarebbe troppo difficile)
    this.apre = primo % n === this.impostore ? (primo + 1) % n : primo % n;
    this.turno = this.apre;
    this.parlati = new Set();   // chi ha già dato l'indizio in questo giro
    this.fase = 'indizi';
    this.voti = new Array(n).fill(undefined); // undefined = deve votare, null = astenuto
    this.storicoVoti = [];      // ogni votazione: { voti, conteggio, pareggio }
    this.accusato = null;
    this.tentativo = null;
    this.esito = null;          // 'scoperto-indovina' | 'scoperto' | 'innocente' | 'fuga'
    this.inAttesa = false;
    this.pausaMs = PAUSA_VERDETTO;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.chatDa = [];           // il server li mette in chat come messaggi del giocatore
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  attivi() { return this.fuori.map((f, i) => (f ? -1 : i)).filter((i) => i >= 0); }

  prossimoParlante(da) {
    for (let k = 1; k <= this.n; k++) {
      const i = (da + k) % this.n;
      if (!this.fuori[i] && !this.parlati.has(i)) return i;
    }
    return null;
  }

  // dopo ogni indizio: avanti col giro, o nuovo giro, o si vota
  passaTurno(da) {
    const dopo = this.prossimoParlante(da);
    if (dopo !== null) { this.turno = dopo; return; }
    if (this.giro < this.giriTotali) {
      this.giro++;
      this.parlati = new Set();
      this.turno = this.fuori[this.apre] ? this.prossimoParlante(this.apre) : this.apre;
      return;
    }
    this.iniziaVoto();
  }

  iniziaVoto() {
    this.fase = 'voto';
    this.turno = null;
    this.voti = this.voti.map((_, i) => (this.fuori[i] ? null : undefined));
    this.annuncia(null, '🗳️ Si vota! Chi è l\'impostore?', '', true);
  }

  // fase di voto: tutti insieme
  attesi() {
    if (this.fase !== 'voto' || this.inAttesa || this.finita) return [];
    return this.attivi().filter((i) => this.voti[i] === undefined);
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inAttesa) return { errore: 'Un attimo: si sta rivelando…' };
    if (!a) return { errore: 'Mossa non valida' };
    if (this.fuori[p]) return { errore: 'Hai lasciato la partita' };

    if (this.fase === 'indizi') {
      if (a.tipo !== 'indizio') return { errore: 'Ora si danno gli indizi' };
      if (p !== this.turno) return { errore: `Tocca a un altro dare l'indizio` };
      const testo = String(a.testo || '').trim().replace(/\s+/g, ' ');
      if (!normalizza(testo)) return { errore: 'Scrivi un indizio' };
      if (testo.length > 40) return { errore: 'L\'indizio può avere al massimo 40 caratteri' };
      // chi conosce la parola non può dirla (l'impostore invece non viene controllato: non deve scoprire nulla)
      if (p !== this.impostore) {
        const w = normalizza(this.parola);
        if (normalizza(testo).includes(w) || testo.split(/[\s']+/).some((x) => normalizza(x) === w)) return { errore: 'Non puoi dire la parola segreta!' };
      }
      this.indizi.push({ giro: this.giro, posto: p, testo });
      this.parlati.add(p);
      this.chatDa.push({ posto: p, testo: `🔎 ${testo}` });
      this.annuncia(p, `dice: «${testo}»`, `hai detto: «${testo}»`);
      this.passaTurno(p);
      return { ok: true };
    }

    if (this.fase === 'voto') {
      if (a.tipo !== 'vota') return { errore: 'Ora si vota' };
      const v = Number(a.posto);
      if (!Number.isInteger(v) || v < 0 || v >= this.n || this.fuori[v]) return { errore: 'Scegli un giocatore' };
      if (v === p) return { errore: 'Non puoi votare te stesso' };
      this.voti[p] = v; // si può cambiare idea finché non hanno votato tutti
      if (!this.attesi().length) this.scrutinio();
      return { ok: true };
    }

    if (this.fase === 'ultima') {
      if (p !== this.impostore) return { errore: 'Ora è l\'impostore a tentare la parola' };
      if (a.tipo !== 'indovina') return { errore: 'Scrivi la parola che pensi sia quella segreta' };
      const t = String(a.parola || '').trim();
      if (!normalizza(t)) return { errore: 'Scrivi una parola' };
      if (t.length > 40) return { errore: 'Troppo lunga' };
      this.tentativo = t;
      this.esito = indovinata(t, this.parola) ? 'scoperto-indovina' : 'scoperto';
      this.vaiAlFinale();
      return { ok: true };
    }
    return { errore: 'Mossa non valida' };
  }

  scrutinio() {
    const conteggio = new Array(this.n).fill(0);
    this.voti.forEach((v) => { if (v != null) conteggio[v]++; });
    const max = Math.max(...conteggio);
    const primi = conteggio.map((c, i) => (c === max ? i : -1)).filter((i) => i >= 0 && !this.fuori[i]);
    const pareggio = max === 0 || primi.length > 1;
    this.storicoVoti.push({ voti: [...this.voti], conteggio, pareggio });
    if (pareggio) {
      // pareggio: un altro giro di indizi e si rivota
      this.spareggi++;
      this.giriTotali++;
      this.giro++;
      this.parlati = new Set();
      this.fase = 'indizi';
      this.turno = this.fuori[this.apre] ? this.prossimoParlante(this.apre) : this.apre;
      this.annuncia(null, max === 0 ? 'Nessun voto: un altro giro di indizi!' : `Pareggio tra ${primi.length}: un altro giro di indizi!`, '', true);
      return;
    }
    this.accusato = primi[0];
    this.fase = 'verdetto';
    this.inAttesa = true;
    this.pausaMs = PAUSA_VERDETTO;
    this.annuncia(this.accusato, 'è accusato… sarà davvero l\'impostore?', 'sei accusato… 😬', false);
  }

  avanza() {
    if (!this.inAttesa) return;
    this.inAttesa = false;
    if (this.fase === 'verdetto') {
      if (this.accusato === this.impostore) {
        this.fase = 'ultima';
        this.turno = this.impostore;
        this.annuncia(this.impostore, 'era l\'impostore! Ultima possibilità: indovinare la parola', 'ti hanno scoperto! Indovina la parola per vincere lo stesso', true);
      } else {
        this.esito = 'innocente';
        this.vaiAlFinale();
      }
      return;
    }
    if (this.fase === 'finale') this.chiudi();
  }

  vaiAlFinale() {
    this.fase = 'finale';
    this.turno = null;
    this.inAttesa = true;
    this.pausaMs = PAUSA_FINALE;
  }

  vinceImpostore() { return this.esito === 'innocente' || this.esito === 'scoperto-indovina' || this.esito === 'resta'; }

  // chi è assente o sulle dispense: salta l'indizio, si astiene dal voto, e l'impostore perde il tentativo
  salta(p) {
    if (this.finita || this.inAttesa) return;
    if (this.fase === 'indizi' && p === this.turno) {
      this.parlati.add(p);
      this.annuncia(p, 'non risponde: salta l\'indizio', 'hai saltato l\'indizio');
      this.passaTurno(p);
    } else if (this.fase === 'voto' && this.voti[p] === undefined) {
      this.voti[p] = null;
      if (!this.attesi().length) this.scrutinio();
    } else if (this.fase === 'ultima' && p === this.impostore) {
      this.tentativo = null;
      this.esito = 'scoperto';
      this.vaiAlFinale();
    }
  }

  esce(p) {
    this.fuori[p] = true;
    if (this.finita) return;
    if (p === this.impostore) { // l'impostore è scappato: vincono gli altri
      this.esito = 'fuga';
      this.inAttesa = false;
      this.vaiAlFinale();
      return;
    }
    if (this.attivi().length < 3) { this.esito = 'resta'; this.inAttesa = false; this.vaiAlFinale(); return; }
    if (this.fase === 'indizi' && this.turno === p) this.passaTurno(p);
    else if (this.fase === 'voto') {
      this.voti = this.voti.map((v, i) => (this.fuori[i] ? null : v === p ? undefined : v)); // chi aveva votato lui rivota
      if (!this.attesi().length) this.scrutinio();
    }
  }
  rientra(p) { this.fuori[p] = false; }

  chiudi() {
    this.finita = true;
    this.turno = null;
    this.inAttesa = false;
    this.fase = 'fine';
    const vince = this.vinceImpostore();
    const vincitori = vince ? [this.impostore] : this.attivi().filter((i) => i !== this.impostore);
    this.risultato = {
      fazioni: Array.from({ length: this.n }, (_, i) => ({ posti: [i], punti: vincitori.includes(i) ? 1 : 0 })),
      etichetta: 'vittoria',
      pareggio: false,
      vincitori,
    };
    return { ok: true };
  }

  // il trucco segreto (!win): all'impostore sussurra la parola, agli altri chi è l'impostore
  suggerimentoWin(posto) {
    if (this.finita || this.fase === 'finale' || this.fuori[posto]) return null;
    if (posto === this.impostore) return `🕵️ La parola è ${this.parola.toUpperCase()}`;
    const nome = (this.nomiGiocatori && this.nomiGiocatori[this.impostore]) || `il giocatore ${this.impostore + 1}`;
    return `🕵️ L'impostore è ${nome}`;
  }

  vista(p) {
    const sonoImpostore = p === this.impostore;
    const svelato = this.fase === 'finale' || this.fase === 'fine';
    const ultimo = this.storicoVoti[this.storicoVoti.length - 1] || null;
    return {
      gioco: this.id, n: this.n, fase: this.fase, turno: this.turno, inAttesa: this.inAttesa, pausaMs: this.pausaMs,
      sonoImpostore,
      parola: sonoImpostore && !svelato ? null : this.parola,
      categoria: sonoImpostore && !svelato ? null : PAROLE[this.categoria].nome,
      giro: this.giro, giriTotali: this.giriTotali, giriBase: this.giri, spareggi: this.spareggi,
      indizi: this.indizi, fuori: this.fuori,
      haVotato: this.voti.map((v) => v !== undefined),
      mioVoto: this.voti[p] ?? null,
      // i voti si vedono solo a scrutinio fatto
      ultimoVoto: ultimo,
      storicoVoti: this.storicoVoti,
      accusato: this.accusato,
      accusatoImpostore: this.accusato == null ? null : this.accusato === this.impostore,
      impostore: svelato || (this.accusato === this.impostore && this.fase === 'ultima') || sonoImpostore ? this.impostore : null,
      tentativo: svelato ? this.tentativo : null,
      esito: svelato ? this.esito : null,
      vinceImpostore: svelato ? this.vinceImpostore() : null,
      finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

const opzioniCategorie = ['tutte', ...Object.keys(PAROLE)];

module.exports = {
  meta: {
    id: 'impostore',
    nome: 'Chi è l\'impostore',
    tipo: 'tabellone',
    soloPersone: true,
    giocatori: [3, 4, 5, 6, 7, 8, 9, 10],
    descrizione: 'Tutti hanno la stessa parola, tranne uno. Indizi, sospetti e voto. Solo con amici.',
    opzioni: [
      { id: 'categoria', nome: 'Parole', valori: opzioniCategorie, etichette: ['Tutte le categorie', ...Object.values(PAROLE).map((c) => c.nome)], predefinito: 'tutte' },
      { id: 'giri', nome: 'Giri di indizi', valori: [2, 3], etichette: ['2 giri', '3 giri'], predefinito: 2 },
    ],
    regole: [
      'Si gioca solo tra persone, da 3 a 10. All\'inizio il sito sceglie a caso una parola dal dizionario e la mostra a tutti tranne a uno: l\'impostore. L\'impostore sa di esserlo, ma non riceve nessuna parola e nessun aiuto.',
      'Gli indizi si danno a turno, uno a testa, per 2 giri (o 3, se scelto). Si scrive l\'indizio nel riquadro: una parola o una frase breve (al massimo 40 caratteri). L\'indizio compare sul tavolo e anche in chat. L\'impostore non apre mai il primo giro.',
      'Chi conosce la parola deve far capire agli altri che la conosce, senza renderla troppo facile all\'impostore. Non si può scrivere la parola segreta. L\'impostore deve bluffare: ascolta gli indizi e ne inventa uno credibile.',
      'Non c\'è nessun timer: prendetevi il tempo che serve. Per discutere, accusare e difendersi usate la chat.',
      'Finiti i giri si vota tutti insieme, in segreto: ognuno sceglie chi secondo lui è l\'impostore (non si può votare sé stessi). Finché non hanno votato tutti si può cambiare voto. Poi i voti vengono mostrati.',
      'Se due o più giocatori hanno lo stesso numero di voti è pareggio: si fa un altro giro di indizi e si vota di nuovo.',
      'Il più votato viene rivelato. Se era innocente, vince l\'impostore. Se era davvero l\'impostore, ha un\'ultima possibilità: scrivere la parola segreta. Se la indovina vince lui (accenti e maiuscole non contano, e con parole di almeno 5 lettere si perdona un errore di battitura); altrimenti vincono tutti gli altri.',
      'Alla fine c\'è la grande rivelazione: chi era l\'impostore e qual era la parola.',
      'Chi è assente o sulle dispense per 25 secondi salta l\'indizio o si astiene dal voto. Se l\'impostore lascia la partita vincono gli altri; se restano meno di 3 giocatori vince l\'impostore.',
    ],
  },
  crea: (o) => new Impostore(o),
  _test: { normalizza, indovinata },
};
