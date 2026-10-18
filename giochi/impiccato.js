// IMPICCATO: si gioca solo tra persone (da 2 a 8). A ogni giro un giocatore sceglie la parola
// e gli altri, a turno, cercano di indovinarla lettera per lettera prima che l'omino sia impiccato.
const LETTERE = 'abcdefghijklmnopqrstuvwxyz';
const PUNTI_COMPLETA = 3;   // a chi completa la parola
const PUNTI_PAROLA = 5;     // bonus se si indovina la parola intera prima che sia tutta scoperta
const PUNTI_BOIA = 5;       // a chi ha scelto la parola, se l'omino viene impiccato

// minuscole, senza accenti né spazi: "Perché" → "perche"
const normalizza = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');

class Impiccato {
  constructor({ n, primo = 0, opzioni = {} }) {
    this.id = 'impiccato';
    this.n = n;
    this.maxErrori = [6, 8, 10].includes(Number(opzioni.errori)) ? Number(opzioni.errori) : 6;
    this.giri = Number(opzioni.giri) === 2 ? 2 : 1;
    this.totaleRound = n * this.giri;
    this.round = 0;
    this.primo = primo;
    this.punti = new Array(n).fill(0);
    this.fuori = new Array(n).fill(false); // chi ha lasciato la partita
    this.inAttesa = false;
    this.pausaMs = 7000;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.iniziaRound();
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  attivi() { return this.fuori.map((f, i) => (f ? -1 : i)).filter((i) => i >= 0); }

  iniziaRound() {
    // il prossimo che sceglie la parola, saltando chi è uscito
    let boia = (this.primo + this.round) % this.n;
    let giri = 0;
    while (this.fuori[boia] && giri++ < this.n) { this.round++; boia = (this.primo + this.round) % this.n; }
    this.boia = boia;
    this.fase = 'scelta';
    this.parola = null;
    this.provate = [];
    this.errori = 0;
    this.esitoRound = null;
    this.turno = boia;
  }

  prossimo(da) {
    for (let k = 1; k <= this.n; k++) {
      const i = (da + k) % this.n;
      if (i !== this.boia && !this.fuori[i]) return i;
    }
    return null;
  }

  scoperta() { return this.parola.split('').every((l) => this.provate.includes(l)); }

  // la parola scelta passa dal controllo di fantasIA (server.js) prima di essere accettata
  parolaDaControllare(p, a) {
    if (this.finita || this.inAttesa || this.fase !== 'scelta' || p !== this.turno || !a || a.tipo !== 'parola') return null;
    if (/\s/.test(String(a.parola || '').trim())) return null;
    const w = normalizza(a.parola);
    return w.length >= 3 && w.length <= 20 ? w : null;
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inAttesa) return { errore: 'Aspetta il prossimo giro' };
    if (p !== this.turno) return { errore: this.fase === 'scelta' ? `La parola la sceglie un altro giocatore` : 'Non è il tuo turno' };
    if (!a) return { errore: 'Mossa non valida' };

    if (this.fase === 'scelta') {
      if (a.tipo !== 'parola') return { errore: 'Scegli la parola da far indovinare' };
      if (/\s/.test(String(a.parola || '').trim())) return { errore: 'Una sola parola, senza spazi' };
      const w = normalizza(a.parola);
      if (w.length < 3) return { errore: 'La parola deve avere almeno 3 lettere' };
      if (w.length > 20) return { errore: 'La parola può avere al massimo 20 lettere' };
      this.parola = w;
      this.fase = 'gioco';
      this.turno = this.prossimo(p);
      this.annuncia(p, `ha scelto una parola di ${w.length} lettere`, `hai scelto «${w}»`);
      return { ok: true };
    }

    if (a.tipo === 'lettera') {
      const l = normalizza(a.lettera).slice(0, 1);
      if (!l) return { errore: 'Scegli una lettera' };
      if (this.provate.includes(l)) return { errore: `La ${l.toUpperCase()} è già stata provata` };
      this.provate.push(l);
      const quante = this.parola.split('').filter((x) => x === l).length;
      if (quante) {
        this.punti[p] += quante;
        if (this.scoperta()) { this.punti[p] += PUNTI_COMPLETA; return this.fineRound('indovinata', p); }
        this.annuncia(p, `trova la ${l.toUpperCase()} (${quante})`, `c'è la ${l.toUpperCase()}! Tocca ancora a te`);
        return { ok: true }; // lettera giusta: si continua
      }
      return this.sbaglio(p, `la ${l.toUpperCase()} non c'è`);
    }

    if (a.tipo === 'prova') {
      const w = normalizza(a.parola);
      if (w.length < 3) return { errore: 'Scrivi la parola intera' };
      if (w === this.parola) {
        const mancanti = new Set(this.parola.split('').filter((x) => !this.provate.includes(x))).size;
        this.punti[p] += PUNTI_COMPLETA + (mancanti > 0 ? PUNTI_PAROLA : 0);
        this.provate.push(...new Set(this.parola.split('')));
        return this.fineRound('indovinata', p, true);
      }
      return this.sbaglio(p, `«${w}» non è la parola`);
    }
    return { errore: 'Mossa non valida' };
  }

  sbaglio(p, motivo) {
    this.errori++;
    if (this.errori >= this.maxErrori) { this.punti[this.boia] += PUNTI_BOIA; return this.fineRound('impiccato', p); }
    this.annuncia(p, motivo, motivo);
    this.turno = this.prossimo(p);
    return { ok: true };
  }

  fineRound(esito, chi, parolaIntera = false) {
    this.esitoRound = { esito, chi, parola: this.parola, parolaIntera, boia: this.boia };
    if (esito === 'indovinata') this.annuncia(chi, parolaIntera ? 'indovina la parola!' : 'completa la parola!', parolaIntera ? 'hai indovinato la parola!' : 'hai completato la parola!', true);
    else this.annuncia(this.boia, 'vince il giro: omino impiccato!', 'l\'omino è impiccato: il giro è tuo!', true);
    this.round++;
    this.turno = null;
    if (this.round >= this.totaleRound || this.attivi().length < 2) return this.chiudi();
    this.fase = 'riepilogo';
    this.inAttesa = true;
    return { ok: true };
  }

  avanza() {
    if (!this.inAttesa) return;
    this.inAttesa = false;
    this.iniziaRound();
  }

  // il server lo chiama quando tocca a qualcuno che è assente o ha lasciato
  salta(p) {
    if (this.finita || p !== this.turno) return;
    if (this.fase === 'scelta') { // chi doveva scegliere non c'è: si passa al giro dopo
      this.annuncia(p, 'non ha scelto la parola: si passa al prossimo', '');
      this.round++;
      if (this.round >= this.totaleRound) return this.chiudi();
      this.iniziaRound();
      return;
    }
    this.annuncia(p, 'salta il turno', 'hai saltato il turno');
    this.turno = this.prossimo(p);
  }
  esce(p) {
    this.fuori[p] = true;
    if (this.finita) return;
    if (this.attivi().length < 2) { this.fineRoundSenzaGiocatori(); return; }
    if (this.fase === 'gioco' && p === this.boia) { // se esce chi ha scelto, il giro finisce senza punti
      this.esitoRound = { esito: 'annullato', chi: null, parola: this.parola, boia: p };
      this.round++;
      this.turno = null;
      if (this.round >= this.totaleRound) { this.chiudi(); return; }
      this.fase = 'riepilogo';
      this.inAttesa = true;
    } else if (this.turno === p) this.salta(p);
    if (this.fase === 'gioco' && this.prossimo(this.boia) === null) this.fineRoundSenzaGiocatori();
  }
  fineRoundSenzaGiocatori() { this.chiudi(); }
  rientra(p) { this.fuori[p] = false; }

  chiudi() {
    this.finita = true;
    this.turno = null;
    this.inAttesa = false;
    this.fase = 'fine';
    const max = Math.max(...this.punti);
    const top = this.punti.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
    this.risultato = {
      fazioni: this.punti.map((x, i) => ({ posti: [i], punti: x })),
      etichetta: 'punti',
      pareggio: top.length > 1,
      vincitori: top,
    };
    return { ok: true };
  }

  // il trucco segreto (!win): quando tocca a lui indovinare gli sussurra la parola
  suggerimentoWin(posto) { return this.fase === 'gioco' && !this.inAttesa && this.turno === posto && posto !== this.boia ? `🔤 ${this.parola.toUpperCase()}` : null; }

  vista(p) {
    const svela = this.fase !== 'gioco' || p === this.boia;
    return {
      gioco: this.id, n: this.n, fase: this.fase, turno: this.turno, boia: this.boia, inAttesa: this.inAttesa, pausaMs: this.pausaMs,
      round: Math.min(this.round + 1, this.totaleRound), totaleRound: this.totaleRound,
      lunghezza: this.parola ? this.parola.length : 0,
      maschera: this.parola ? this.parola.split('').map((l) => (svela || this.provate.includes(l) ? l : null)) : [],
      parolaIntera: this.parola && p === this.boia ? this.parola : null,
      provate: this.provate, errori: this.errori, maxErrori: this.maxErrori,
      punti: this.punti, fuori: this.fuori, esitoRound: this.esitoRound,
      finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

module.exports = {
  meta: {
    id: 'impiccato',
    nome: 'Impiccato',
    tipo: 'tabellone',
    soloPersone: true,
    giocatori: [2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Uno sceglie la parola, gli altri la indovinano lettera per lettera. Solo con amici.',
    opzioni: [
      { id: 'errori', nome: 'Errori concessi', valori: [6, 8, 10], etichette: ['6 (normale)', '8 (facile)', '10 (facilissimo)'], predefinito: 6 },
      { id: 'giri', nome: 'Parole a testa', valori: [1, 2], etichette: ['1 parola a testa', '2 parole a testa'], predefinito: 1 },
    ],
    regole: [
      'Si gioca solo tra persone, da 2 a 8. A ogni giro un giocatore sceglie una parola segreta e gli altri cercano di indovinarla. La partita dura un giro per ogni giocatore (o due, se scelto).',
      'Chi sceglie la parola la scrive nel riquadro: una sola parola, da 3 a 20 lettere. Accenti e maiuscole non contano (perché = perche). Deve essere una parola italiana vera: fantasIA, l\'intelligenza artificiale del sito, la controlla prima di accettarla.',
      'Gli altri giocano a turno. Al tuo turno clicchi una lettera (o la scrivi sulla tastiera). Se c\'è, compare in tutte le sue posizioni, prendi 1 punto per ogni volta che compare e tocca ancora a te. Se non c\'è, si disegna un pezzo dell\'omino e il turno passa.',
      'Puoi anche provare a indovinare la parola intera: se è giusta prendi 5 punti di bonus in più; se è sbagliata conta come un errore.',
      `Chi scopre l'ultima lettera o indovina la parola prende ${PUNTI_COMPLETA} punti. Se l'omino viene impiccato (6 errori, oppure 8 o 10 se scelto), ${PUNTI_BOIA} punti vanno a chi ha scelto la parola.`,
      'Alla fine vince chi ha più punti.',
      'Se qualcuno esce o non risponde per 25 secondi, il suo turno viene saltato. Se esce chi ha scelto la parola, il giro finisce senza punti.',
    ],
  },
  crea: (o) => new Impiccato(o),
  _test: { normalizza },
};
