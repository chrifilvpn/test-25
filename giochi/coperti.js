// NUMERI COPERTI: una fila di N numeri coperti (da 1 a 9). Si indovinano in ordine, da sinistra a destra.
// Chi indovina scopre il numero, prende 1 punto e continua; chi sbaglia passa il turno. I tentativi sbagliati restano
// scritti sotto la casella: chi ha memoria (e guarda gli altri) sa cosa non provare.
const QUANTI = [4, 5, 6, 8];

class Coperti {
  constructor({ n, primo = 0, opzioni = {} }) {
    this.id = 'coperti';
    this.n = n;
    this.quanti = QUANTI.includes(Number(opzioni.quanti)) ? Number(opzioni.quanti) : 5;
    this.diversi = opzioni.diversi !== 'no';
    const cifre = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = cifre.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cifre[i], cifre[j]] = [cifre[j], cifre[i]]; }
    this.numeri = this.diversi ? cifre.slice(0, this.quanti) : Array.from({ length: this.quanti }, () => 1 + Math.floor(Math.random() * 9));
    this.pos = 0;                               // la prossima casella da indovinare
    this.chi = new Array(this.quanti).fill(null); // chi l'ha scoperta
    this.sbagliati = Array.from({ length: this.quanti }, () => []); // [{ numero, posto }]
    this.punti = new Array(n).fill(0);
    this.turno = primo % n;
    this.inAttesa = false;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.ultimo = null;
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (!a || a.tipo !== 'prova') return { errore: 'Scegli un numero' };
    const x = Number(a.numero);
    if (!Number.isInteger(x) || x < 1 || x > 9) return { errore: 'I numeri vanno da 1 a 9' };
    if (this.sbagliati[this.pos].some((s) => s.numero === x)) return { errore: `${x} qui è già stato provato: non è lui` };
    if (x === this.numeri[this.pos]) {
      this.chi[this.pos] = p;
      this.punti[p]++;
      this.ultimo = { pos: this.pos, numero: x, giusto: true, posto: p };
      this.annuncia(p, `indovina il ${x}! ✅`, `giusto, è il ${x}! Continua ✅`);
      this.pos++;
      if (this.pos >= this.quanti) return this.chiudi();
      return { ok: true };
    }
    this.sbagliati[this.pos].push({ numero: x, posto: p });
    this.ultimo = { pos: this.pos, numero: x, giusto: false, posto: p };
    this.annuncia(p, `prova il ${x}… sbagliato ❌`, `il ${x} è sbagliato ❌`);
    this.turno = (p + 1) % this.n;
    return { ok: true };
  }

  chiudi() {
    this.finita = true;
    this.turno = null;
    const max = Math.max(...this.punti);
    const v = this.punti.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
    this.risultato = { fazioni: this.punti.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'numeri', pareggio: v.length > 1, vincitori: v.length > 1 ? [] : v };
    return { ok: true };
  }

  // numeri ancora possibili per la casella da indovinare
  candidati(ricorda = { sbagliati: true, scoperti: true }) {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((x) => !(ricorda.sbagliati && this.sbagliati[this.pos].some((s) => s.numero === x))
      && !(ricorda.scoperti && this.diversi && this.numeri.slice(0, this.pos).includes(x)));
  }

  // trucco segreto (!win): al suo turno, i numeri ancora coperti in ordine (chi indovina continua: li prende tutti)
  suggerimentoWin(p) {
    if (this.finita || this.turno !== p) return null;
    return `💡 I numeri coperti sono: ${this.numeri.slice(this.pos).join(' ')}`;
  }

  vista() {
    return {
      gioco: this.id, n: this.n, turno: this.turno, inAttesa: false, quanti: this.quanti, diversi: this.diversi, pos: this.pos,
      scoperti: this.numeri.map((x, i) => (i < this.pos || this.finita ? x : null)), chi: this.chi, sbagliati: this.sbagliati,
      punti: this.punti, ultimo: this.ultimo, possibili: this.finita ? [] : this.candidati(),
      finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// facile: si ricorda solo i numeri già scoperti; medio: anche i tentativi sbagliati, ma ogni tanto se ne scorda;
// difficile: sceglie sempre tra i numeri davvero possibili
function bot(g, p, livello) {
  const scelta = (a) => a[Math.floor(Math.random() * a.length)];
  const possibili = g.candidati();
  let lista;
  if (livello === 'difficile') lista = possibili;
  else if (livello === 'medio') lista = Math.random() < 0.8 ? possibili : g.candidati({ sbagliati: false, scoperti: true });
  else lista = g.candidati({ sbagliati: false, scoperti: Math.random() < 0.5 });
  // non ripete mai un tentativo già segnato come sbagliato (il gioco non lo permette)
  lista = lista.filter((x) => possibili.includes(x) || !g.sbagliati[g.pos].some((s) => s.numero === x));
  return { tipo: 'prova', numero: scelta(lista.length ? lista : possibili) };
}

module.exports = {
  meta: {
    id: 'coperti',
    nome: 'Numeri coperti',
    tipo: 'tabellone',
    giocatori: [2, 3, 4, 5, 6],
    descrizione: 'Una fila di numeri coperti da indovinare in ordine: se sbagli, tocca all\'altro.',
    alias: ['numeri nascosti', 'indovina in ordine'],
    opzioni: [
      { id: 'quanti', nome: 'Numeri', valori: QUANTI, etichette: QUANTI.map((q) => `${q} numeri`), predefinito: 5 },
      { id: 'diversi', nome: 'Ripetizioni', valori: ['si', 'no'], etichette: ['Tutti diversi', 'Si possono ripetere'], predefinito: 'si' },
    ],
    regole: [
      'C\'è una fila di numeri coperti, ognuno da 1 a 9 (4, 5, 6 o 8 numeri, da scegliere prima). Di solito sono tutti diversi; con l\'opzione "si possono ripetere" lo stesso numero può uscire più volte.',
      'Si indovinano in ordine, da sinistra a destra: la casella da indovinare è evidenziata. A turno si sceglie un numero da 1 a 9.',
      'Se indovini, il numero si scopre, prendi 1 punto e continui tu con la casella dopo. Se sbagli, il turno passa al prossimo giocatore.',
      'I numeri sbagliati restano scritti sotto la casella, con il nome di chi li ha provati, e non si possono riprovare lì. Se i numeri sono tutti diversi, anche quelli già scoperti non vanno più bene.',
      'Quando tutti i numeri sono scoperti vince chi ne ha indovinati di più. A parità è pareggio.',
      'Il computer facile si scorda i tentativi sbagliati, il medio li ricorda quasi sempre, il difficile sceglie sempre tra i numeri ancora possibili.',
    ],
  },
  crea: (o) => new Coperti(o),
  bot,
  _test: { QUANTI },
};
