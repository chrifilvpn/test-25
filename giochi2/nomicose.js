// NOMI COSE CITTÀ: esce una lettera e tutti insieme scrivono una parola per categoria che cominci con quella
// lettera. Chi ha riempito tutte le caselle può dire STOP: gli altri hanno ancora 10 secondi. Poi si guardano le
// risposte: quelle negli elenchi del gioco valgono da sole, le altre ("dubbie") si votano. Punti: 20 se sei l'unico
// con una risposta valida in quella categoria, 10 se la tua è diversa da quella degli altri, 5 se è uguale.
// I computer scrivono le risposte un po' alla volta durante il round (scadenza) e votano le dubbie.
const D = require('./nomicose-dati');
const P = require('./paroliere-dati');

const TEST = !!process.env.TEST_VELOCE;
const DOPO_STOP = TEST ? 50 : 10000; // dopo lo STOP gli altri hanno ancora 10 secondi
const TEMPO_VOTO = TEST ? 50 : 60000; // il voto si chiude quando tutti hanno confermato, o dopo un minuto
const PAUSA_PUNTI = TEST ? 50 : 30000;
const LETTERE = 'abcdefgilmnoprstv'.split('');
const CLASSICHE = ['nomi', 'cose', 'citta', 'animali', 'frutta', 'mestieri'];
const TUTTE = Object.keys(D.CATEGORIE);

function mescola(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const pulisci = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 30);

// la forma da confrontare: senza accenti, maiuscole, spazi e articolo iniziale ("il Cane" → "cane"), ma
// "La Spezia" e "L'Aquila" restano come sono perché sono negli elenchi così
const ARTICOLO = /^(il|lo|la|i|gli|le|un|uno|una)\s+|^(l|un)'\s*/i;
function forma(cat, testo) {
  const n = D.normalizza(testo);
  if (D.SET[cat].has(n)) return n;
  return D.normalizza(String(testo || '').trim().replace(ARTICOLO, '')) || n;
}
// lo stato di una risposta prima del voto: vuota, lettera sbagliata, valida da sola (negli elenchi) o dubbia
function giudica(cat, lettera, testo) {
  const n = forma(cat, testo);
  if (!n) return 'vuota';
  if (n[0] !== lettera || n.length < 2) return 'no';
  if (D.SET[cat].has(n)) return 'ok';
  return 'dubbia';
}

// ---------------- computer ----------------
const LIVELLI = {
  facile: { trova: 0.45, sbaglia: 0.08, inizio: 0.2, fine: 0.95, stop: false },
  medio: { trova: 0.72, sbaglia: 0.03, inizio: 0.12, fine: 0.8, stop: true },
  difficile: { trova: 0.94, sbaglia: 0, inizio: 0.06, fine: 0.55, stop: true },
};
// le risposte del computer: dagli elenchi (qualche volta il facile scrive una parola della categoria sbagliata)
function rispostePer(cats, lettera, livello) {
  const L = LIVELLI[livello] || LIVELLI.medio;
  const ris = {};
  for (const c of cats) {
    const buone = D.ELENCHI[c].filter((w) => D.normalizza(w)[0] === lettera);
    if (Math.random() < L.sbaglia) {
      const altra = TUTTE.filter((x) => x !== c).flatMap((x) => D.ELENCHI[x]).filter((w) => D.normalizza(w)[0] === lettera && !D.SET[c].has(D.normalizza(w)));
      if (altra.length) { ris[c] = altra[Math.floor(Math.random() * altra.length)]; continue; }
    }
    if (buone.length && Math.random() < L.trova) ris[c] = buone[Math.floor(Math.random() * buone.length)];
  }
  return ris;
}
// il voto del computer su una risposta dubbia: no se è di un'altra categoria; nomi e città non li può sapere tutti
// e li accetta; per il resto basta che sia una parola italiana vera
function votoBot(cat, testo) {
  const n = forma(cat, testo);
  if (TUTTE.some((x) => x !== cat && D.SET[x].has(n)) && !['nomi', 'citta'].includes(cat)) return false;
  if (['nomi', 'citta', 'nazioni'].includes(cat)) return n.length >= 3;
  return P.esiste(n);
}

class NomiCose {
  constructor({ n, opzioni = {}, bot = [] }) {
    this.id = 'nomicose';
    this.n = n;
    this.nRound = [3, 5, 8].includes(Number(opzioni.round)) ? Number(opzioni.round) : 5;
    this.durata = ([60, 90, 120].includes(Number(opzioni.tempo)) ? Number(opzioni.tempo) : 90) * 1000;
    this.conStop = opzioni.stop !== 'no';
    const tipo = ['classiche', 'miste', 'tutte'].includes(opzioni.categorie) ? opzioni.categorie : 'classiche';
    const sei = mescola(TUTTE.slice()).slice(0, 6);
    this.cats = tipo === 'classiche' ? CLASSICHE.slice() : tipo === 'tutte' ? TUTTE.slice() : TUTTE.filter((c) => sei.includes(c));
    this.bot = Array.from({ length: n }, (_, i) => bot[i] || null);
    this.lettere = mescola(LETTERE.slice()).slice(0, this.nRound);
    this.punti = new Array(n).fill(0);
    this.storico = [];
    this.round = 0;
    this.turno = null;
    this.inAttesa = false;
    this.pausaMs = 0;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.nuovoRound();
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }

  nuovoRound() {
    this.round++;
    this.lettera = this.lettere[this.round - 1];
    this.fase = 'scrivi';
    this.risposte = Array.from({ length: this.n }, () => Object.fromEntries(this.cats.map((c) => [c, ''])));
    this.chiStop = null;
    this.inizio = Date.now();
    this.fine = this.inizio + this.durata;
    this.voti = null;
    this.confermato = new Array(this.n).fill(false);
    this.pronto = new Array(this.n).fill(false);
    this.esito = null;
    // i computer: cosa scrivono e quando; se sono bravi e riempiono tutto dicono STOP
    this.piano = this.bot.map((l) => {
      if (!l) return null;
      const L = LIVELLI[l] || LIVELLI.medio;
      const ris = rispostePer(this.cats, this.lettera, l);
      const passi = Object.entries(ris).map(([c, w]) => ({ c, w, ms: Math.round(this.durata * (L.inizio + Math.random() * (L.fine - L.inizio))) })).sort((a, b) => a.ms - b.ms);
      const tutte = passi.length === this.cats.length;
      if (L.stop && tutte && this.conStop && this.n > 1) passi.push({ stop: true, ms: passi[passi.length - 1].ms + 1500 + Math.round(Math.random() * 3000) });
      return passi;
    });
  }

  attesi() {
    if (this.finita) return [];
    const umani = (arr) => arr.map((f, i) => (!f && !this.bot[i] ? i : -1)).filter((i) => i >= 0);
    if (this.fase === 'scrivi') return umani(new Array(this.n).fill(false));
    if (this.fase === 'voto') return umani(this.confermato);
    return umani(this.pronto);
  }

  scadenza() {
    if (this.finita) return null;
    if (this.fase === 'voto') return this.fineVoto;
    if (this.fase === 'punti') return this.finePunti;
    let t = this.fine;
    for (const pi of this.piano) if (pi && pi.length) t = Math.min(t, this.inizio + pi[0].ms);
    return t;
  }

  controllaTempo() {
    if (this.finita) return false;
    const ora = Date.now();
    if (this.fase === 'voto') { if (ora >= this.fineVoto) { this.chiudiVoto(); return true; } return false; }
    if (this.fase === 'punti') { if (ora >= this.finePunti) { this.avanti(); return true; } return false; }
    let cambiato = false;
    for (let p = 0; p < this.n && this.fase === 'scrivi'; p++) {
      const pi = this.piano[p];
      while (pi && pi.length && this.inizio + pi[0].ms <= Math.min(ora, this.fine) && this.fase === 'scrivi') {
        const x = pi.shift();
        if (x.stop) this.stop(p); else this.risposte[p][x.c] = x.w;
        cambiato = true;
      }
    }
    if (this.fase === 'scrivi' && ora >= this.fine) { this.chiudiScrittura(); return true; }
    return cambiato;
  }

  // il trucco segreto (!win): durante la scrittura gli sussurra una risposta valida (che gli altri non hanno scritto)
  // per ogni categoria in cui non ne ha ancora una
  suggerimentoWin(posto) {
    if (this.finita || this.fase !== 'scrivi') return null;
    const parti = [];
    for (const c of this.cats) {
      if (giudica(c, this.lettera, this.risposte[posto][c]) === 'ok') continue;
      const altri = new Set(this.risposte.map((r) => forma(c, r[c])));
      const buone = D.ELENCHI[c].filter((w) => D.normalizza(w)[0] === this.lettera && !altri.has(D.normalizza(w)));
      if (buone.length) parti.push(`${D.CATEGORIE[c].icona} ${buone[Math.floor(Math.random() * buone.length)]}`);
    }
    return parti.length ? parti.join('  ') : null;
  }

  piene(p) { return this.cats.every((c) => D.normalizza(this.risposte[p][c]).length > 0); }

  stop(p) {
    if (this.chiStop !== null || this.fase !== 'scrivi') return;
    this.chiStop = p;
    this.fine = Math.min(this.fine, Date.now() + DOPO_STOP);
    this.annuncia(p, 'dice STOP! ✋ Ancora 10 secondi', 'STOP! ✋ Gli altri hanno ancora 10 secondi', true);
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (!Number.isInteger(p) || p < 0 || p >= this.n) return { errore: 'Posto non valido' };
    if (!a || typeof a !== 'object') return { errore: 'Mossa non valida' };
    if (this.fase === 'scrivi') {
      if (Date.now() > this.fine + 1500) return { errore: 'Tempo scaduto!' };
      if (a.tipo === 'risposta') {
        if (!this.cats.includes(a.cat)) return { errore: 'Categoria non valida' };
        this.risposte[p][a.cat] = pulisci(a.testo);
        return { ok: true, silenzioso: true };
      }
      if (a.tipo === 'stop') {
        if (!this.conStop) return { errore: 'In questa partita non si può dire STOP' };
        if (this.chiStop !== null) return { errore: 'Qualcuno ha già detto STOP' };
        if (!this.piene(p)) return { errore: 'Per dire STOP devi riempire tutte le caselle' };
        this.stop(p);
        return { ok: true };
      }
      return { errore: 'Mossa non valida' };
    }
    if (this.fase === 'voto') {
      if (a.tipo === 'voto') {
        const q = Number(a.posto);
        const v = this.voti && this.voti[`${q}:${a.cat}`];
        if (!v) return { errore: 'Questa risposta non si vota' };
        if (q === p) return { errore: 'La tua risposta la votano gli altri' };
        if (this.confermato[p]) return { errore: 'Hai già confermato i tuoi voti' };
        if (a.si === null) delete v[p]; else v[p] = !!a.si;
        return { ok: true };
      }
      if (a.tipo === 'conferma') {
        if (!this.confermato[p]) { this.confermato[p] = true; if (!this.attesi().length) this.chiudiVoto(); }
        return { ok: true };
      }
      return { errore: 'Adesso si votano le risposte dubbie' };
    }
    if (a.tipo !== 'pronto') return { errore: 'Guarda i punti e premi Avanti' };
    if (!this.pronto[p]) { this.pronto[p] = true; if (!this.attesi().length) this.avanti(); }
    return { ok: true };
  }

  salta(p) {
    if (this.finita) return;
    if (this.fase === 'voto' && !this.confermato[p]) { this.confermato[p] = true; if (!this.attesi().length) this.chiudiVoto(); }
    else if (this.fase === 'punti' && !this.pronto[p]) { this.pronto[p] = true; if (!this.attesi().length) this.avanti(); }
  }

  chiudiScrittura() {
    if (this.fase !== 'scrivi') return;
    this.piano = this.piano.map(() => null);
    // le risposte dubbie: le votano tutti tranne chi le ha scritte; i computer votano subito
    this.stati = this.risposte.map((r) => Object.fromEntries(this.cats.map((c) => [c, giudica(c, this.lettera, r[c])])));
    this.voti = {};
    for (let p = 0; p < this.n; p++) {
      for (const c of this.cats) {
        if (this.stati[p][c] !== 'dubbia') continue;
        const v = {};
        for (let q = 0; q < this.n; q++) if (q !== p && this.bot[q]) v[q] = votoBot(c, this.risposte[p][c]);
        this.voti[`${p}:${c}`] = v;
      }
    }
    const daVotare = Object.keys(this.voti).length;
    // se non c'è niente da votare (o votano solo i computer) si passa subito ai punti
    const votanti = (p) => Array.from({ length: this.n }, (_, q) => q).filter((q) => q !== p && !this.bot[q]);
    const servonoPersone = Object.keys(this.voti).some((k) => votanti(Number(k.split(':')[0])).length > 0);
    this.fase = 'voto';
    this.fineVoto = Date.now() + TEMPO_VOTO;
    if (!daVotare || !servonoPersone) return this.chiudiVoto();
    this.annuncia(null, `${daVotare} ${daVotare === 1 ? 'risposta dubbia' : 'risposte dubbie'} da votare`, '', true);
  }

  // si contano i voti e i punti del round
  chiudiVoto() {
    if (this.fase !== 'voto') return;
    const valide = this.risposte.map(() => ({}));
    const dettaglio = {};
    for (let p = 0; p < this.n; p++) {
      for (const c of this.cats) {
        let st = this.stati[p][c];
        if (st === 'dubbia') {
          const v = Object.values(this.voti[`${p}:${c}`] || {});
          // da soli non c'è chi vota: decide il gioco come farebbe il computer
          if (this.n === 1) v.push(votoBot(c, this.risposte[p][c]));
          const si = v.filter(Boolean).length, no = v.length - si;
          st = si >= no ? 'accettata' : 'rifiutata'; // in parità (o senza voti) la risposta vale
          dettaglio[`${p}:${c}`] = { si, no };
        }
        this.stati[p][c] = st;
        if (st === 'ok' || st === 'accettata') valide[p][c] = forma(c, this.risposte[p][c]);
      }
    }
    const puntiRound = new Array(this.n).fill(0);
    const puntiCella = this.risposte.map(() => ({}));
    for (const c of this.cats) {
      const chi = valide.map((v, p) => (v[c] ? p : -1)).filter((p) => p >= 0);
      for (const p of chi) {
        const uguali = chi.filter((q) => q !== p && valide[q][c] === valide[p][c]).length;
        const x = chi.length === 1 && this.n > 1 ? 20 : uguali ? 5 : 10;
        puntiCella[p][c] = x;
        puntiRound[p] += x;
      }
    }
    puntiRound.forEach((x, p) => { this.punti[p] += x; });
    this.esito = { punti: puntiRound, celle: puntiCella, voti: dettaglio };
    this.storico.push({ lettera: this.lettera, punti: puntiRound });
    this.fase = 'punti';
    this.finePunti = Date.now() + PAUSA_PUNTI;
    const max = Math.max(...puntiRound);
    const primi = puntiRound.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
    if (this.n > 1 && primi.length === 1 && max > 0) this.annuncia(primi[0], `vince la lettera ${this.lettera.toUpperCase()} con ${max} punti`, `lettera ${this.lettera.toUpperCase()} vinta con ${max} punti! 🎉`, true);
    else this.annuncia(null, `Punti della lettera ${this.lettera.toUpperCase()}`, '', false);
  }

  avanti() {
    if (this.fase !== 'punti') return;
    if (this.round >= this.nRound) return this.chiudi();
    this.nuovoRound();
  }

  chiudi() {
    this.finita = true;
    const max = Math.max(...this.punti);
    const v = this.punti.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
    this.risultato = {
      fazioni: this.punti.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'punti',
      pareggio: this.n > 1 && v.length > 1, vincitori: this.n === 1 || v.length === 1 ? v : [],
    };
    if (this.n === 1) this.risultato.titolo = `${max} punti`;
  }

  vista(p) {
    const q = Number.isInteger(p) && p >= 0 && p < this.n ? p : 0;
    const scrivi = this.fase === 'scrivi';
    const base = {
      gioco: this.id, n: this.n, fase: this.fase, round: this.round, nRound: this.nRound, lettera: this.lettera,
      lettereFatte: this.lettere.slice(0, this.round - 1),
      cats: this.cats.map((c) => ({ id: c, ...D.CATEGORIE[c] })), conStop: this.conStop, durata: this.durata,
      resta: scrivi ? Math.max(0, this.fine - Date.now()) : 0, chiStop: this.chiStop,
      punti: this.punti, storico: this.storico.map((s) => s.punti),
      turno: null, inAttesa: false, pausaMs: 0, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
    if (scrivi) {
      // degli altri si vede solo quante caselle hanno riempito
      return { ...base, mie: this.risposte[q], piene: this.risposte.map((r) => this.cats.filter((c) => D.normalizza(r[c])).length) };
    }
    const voti = {};
    for (const [k, v] of Object.entries(this.voti || {})) {
      const vv = Object.values(v);
      voti[k] = { si: vv.filter(Boolean).length, no: vv.filter((x) => !x).length, mio: v[q] === undefined ? null : v[q] };
    }
    return {
      ...base, risposte: this.risposte, stati: this.stati, voti, confermato: this.confermato, pronto: this.pronto,
      restaVoto: this.fase === 'voto' ? Math.max(0, this.fineVoto - Date.now()) : 0,
      restaPunti: this.fase === 'punti' ? Math.max(0, this.finePunti - Date.now()) : 0,
      esito: this.esito,
    };
  }
}

// il server lo chiama per un computer messo al posto di chi è uscito
function bot(g) {
  if (g.fase === 'voto') return { tipo: 'conferma' };
  if (g.fase === 'punti') return { tipo: 'pronto' };
  return null;
}

module.exports = {
  meta: {
    id: 'nomicose',
    nome: 'Nomi cose città',
    tipo: 'tabellone',
    saltaAssenti: true,
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Esce una lettera: scrivi un nome, una cosa, una città, un animale… che comincino con quella lettera. Le risposte dubbie si votano.',
    alias: ['nomi cose citta', 'nomi cose e città', 'nomi cose animali', 'nomi cose città animali', 'stop', 'nomi e cose', 'categorie', 'lettera'],
    opzioni: [
      { id: 'round', nome: 'Lettere', valori: [5, 3, 8], etichette: ['5 lettere', '3 lettere', '8 lettere'], predefinito: 5 },
      { id: 'tempo', nome: 'Tempo', valori: [90, 60, 120], etichette: ['90 secondi', '60 secondi', '2 minuti'], predefinito: 90 },
      { id: 'categorie', nome: 'Categorie', valori: ['classiche', 'miste', 'tutte'], etichette: ['Nomi, cose, città, animali, frutta e verdura, mestieri', '6 a caso tra 8 (con nazioni e fiori e piante)', 'Tutte e 8'], predefinito: 'classiche' },
      { id: 'stop', nome: 'Stop', valori: ['si', 'no'], etichette: ['Chi ha finito può dire STOP', 'Si gioca sempre fino alla fine del tempo'], predefinito: 'si' },
    ],
    regole: [
      'A ogni giro esce una lettera (mai due volte la stessa). Tutti insieme scrivono, per ogni categoria, una parola che cominci con quella lettera: un nome di persona, una cosa, una città, un animale, un frutto o una verdura, un mestiere (con l\'opzione anche nazioni e fiori e piante).',
      'Si ha 90 secondi (o 60, o 2 minuti). Chi ha riempito tutte le caselle può dire STOP: gli altri hanno ancora 10 secondi e poi si posano le penne. Accenti, maiuscole e articoli non contano; le parole vanno al singolare.',
      'Poi si vedono le risposte di tutti. Quelle che il gioco conosce (ha centinaia di parole per categoria) valgono da sole ✓; quelle con la lettera sbagliata non valgono. Le altre sono dubbie: le votano gli altri giocatori con 👍 o 👎 (chi l\'ha scritta non vota). In parità la risposta vale.',
      'Punti per ogni categoria: 20 se sei l\'unico ad avere una risposta valida, 10 se la tua è diversa da quelle degli altri, 5 se qualcun altro ha scritto la stessa parola. Una risposta vuota o non valida fa 0.',
      'Vince chi ha più punti dopo 5 lettere (o 3, o 8). Da soli si gioca per il record (senza i 20 punti dell\'unico).',
      'Il computer facile lascia molte caselle vuote e qualche volta sbaglia categoria; il medio ne riempie quasi tutte; il difficile le riempie tutte in fretta e dice STOP. Anche il computer vota le risposte dubbie degli altri.',
    ],
  },
  crea: (o) => new NomiCose(o),
  bot,
  _test: { forma, giudica, rispostePer, votoBot, LIVELLI, LETTERE, CLASSICHE, TUTTE },
};
