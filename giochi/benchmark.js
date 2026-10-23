// HUMAN BENCHMARK 1 CONTRO 1: cinque prove una dopo l'altra (tempo di reazione, memoria di sequenza, memoria di
// numeri, clic sui bersagli, memoria visiva), al meglio di 5: chi vince 3 prove vince la partita.
// Le due persone fanno la stessa prova nello stesso momento, con gli stessi dati (stessi numeri, stesse sequenze,
// stessi bersagli). Il browser misura i tempi (così il ritardo della rete non conta) e manda al server le risposte,
// che il server controlla. Il ciclo a tick serve per il computer, per le fasi e per chi resta fermo troppo.
const PROVE = ['reazione', 'sequenza', 'numeri', 'bersagli', 'visiva'];
const NOMI = { reazione: 'Tempo di reazione', sequenza: 'Memoria di sequenza', numeri: 'Memoria di numeri', bersagli: 'Clic sui bersagli', visiva: 'Memoria visiva' };
const INTRO_MS = 5000, RISULTATO_MS = 6000, MAX_PROVA_MS = 5 * 60000, FERMO_MS = 45000;
const PROVE_REAZIONE = 5, N_BERSAGLI = 20, VITE_VISIVA = 3, ERRORI_VISIVA = 3;
// computer: [media, variazione] per prova (reazione in ms, livelli raggiunti, ms per bersaglio)
const BOT = {
  facile: { reazione: [390, 60], sequenza: [6, 2], numeri: [6, 1], bersagli: [900, 120], visiva: [6, 2] },
  medio: { reazione: [300, 40], sequenza: [10, 2], numeri: [8, 1], bersagli: [640, 90], visiva: [9, 2] },
  difficile: { reazione: [235, 25], sequenza: [14, 3], numeri: [10, 1.5], bersagli: [470, 60], visiva: [12, 2] },
};
const MINORE_MEGLIO = { reazione: true, bersagli: true };
const T = require('./trucco');
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const intero = (n) => Math.floor(Math.random() * n);

// memoria visiva: griglia che cresce e quadratini da ricordare
const grigliaVisiva = (l) => Math.min(8, 3 + Math.floor((l - 1) / 3));
const tessereVisiva = (l) => Math.min(l + 2, Math.floor(grigliaVisiva(l) ** 2 * 0.55));

function datiProva(tipo) {
  if (tipo === 'reazione') return { attese: Array.from({ length: 16 }, () => 1500 + intero(3500)) };
  if (tipo === 'sequenza') return { seq: Array.from({ length: 60 }, () => intero(9)) };
  if (tipo === 'numeri') return { numeri: Array.from({ length: 30 }, (_, l) => String(1 + intero(9)) + Array.from({ length: l }, () => intero(10)).join('')) };
  if (tipo === 'bersagli') return { punti: Array.from({ length: N_BERSAGLI }, () => [0.06 + Math.random() * 0.88, 0.08 + Math.random() * 0.84].map((v) => Math.round(v * 1000) / 1000)) };
  if (tipo === 'visiva') {
    // per ogni livello più schemi: se sbagli perdi una vita e rifai il livello con uno schema nuovo
    return { schemi: Array.from({ length: 40 }, (_, k) => {
      const l = k + 1, g = grigliaVisiva(l), t = tessereVisiva(l);
      return Array.from({ length: VITE_VISIVA }, () => { const c = Array.from({ length: g * g }, (_, i) => i); for (let i = c.length - 1; i > 0; i--) { const j = intero(i + 1); [c[i], c[j]] = [c[j], c[i]]; } return c.slice(0, t).sort((a, b) => a - b); });
    }) };
  }
  return {};
}

class Benchmark {
  constructor({ n, opzioni = {}, bot = [] }) {
    this.id = 'benchmark';
    this.n = n;
    this.bot = Array.from({ length: n }, (_, i) => bot[i] || null);
    this.ordine = opzioni.ordine === 'caso' ? [...PROVE].sort(() => Math.random() - 0.5) : [...PROVE];
    this.punti = new Array(n).fill(0);
    this.storico = [];
    this.k = -1;
    this.tickMs = 100;
    this.turno = null; this.inAttesa = false; this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    this.inPausa = false; this.pausaDal = null; this.nPausa = 0;
    this.prossimaProva(Date.now());
  }
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  impostaBot(p, l) { this.bot[p] = l || 'medio'; if (this.fase === 'prova' && !this.g[p].fatto) this.pianificaBot(p, Date.now()); }
  impostaPausa(si) {
    if (si === this.inPausa || this.finita) return;
    if (si) { this.pausaDal = Date.now(); this.nPausa++; }
    else if (this.pausaDal) {
      const d = Date.now() - this.pausaDal;
      this.fineFase += d;
      this.g.forEach((x) => { x.ultima += d; if (x.bot) { x.bot.prossimo += d; } });
    }
    this.inPausa = si;
  }

  prossimaProva(ora) {
    this.k++;
    // al meglio di 5; se dopo 5 prove si è pari si va avanti con uno spareggio al tempo di reazione
    this.tipo = this.k < PROVE.length ? this.ordine[this.k] : 'reazione';
    this.spareggio = this.k >= PROVE.length;
    this.dati = datiProva(this.tipo);
    this.fase = 'intro';
    this.fineFase = ora + INTRO_MS;
    this.g = Array.from({ length: this.n }, () => ({ fatto: false, livello: 1, valore: null, tempi: [], vite: VITE_VISIVA, tentativo: 0, ultima: ora, bot: null }));
  }

  pianificaBot(p, ora) {
    const liv = this.bot[p];
    const [m, s] = BOT[liv][this.tipo];
    const x = this.g[p];
    if (this.tipo === 'reazione') x.bot = { prossimo: ora + this.dati.attese[0] + Math.max(150, m + gauss() * s) };
    else if (this.tipo === 'bersagli') x.bot = { prossimo: ora + 900 + Math.max(250, m + gauss() * s), fatti: 0, totale: 0 };
    else {
      // livello a cui sbaglierà
      const arrivo = Math.max(1, Math.round(m + gauss() * s));
      x.bot = { arrivo, prossimo: ora + this.durataLivello(1) };
    }
  }
  durataLivello(l) {
    if (this.tipo === 'sequenza') return 1200 + l * 1100;
    if (this.tipo === 'numeri') return 2500 + l * 900;
    return 2800 + l * 350; // visiva
  }

  attesi() { return []; }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inPausa) return { errore: 'La partita è in pausa' };
    if (this.fase !== 'prova') return { errore: 'Aspetta che inizi la prova' };
    const x = this.g[p];
    if (x.fatto) return { errore: 'Hai già finito questa prova' };
    if (!a || a.prova !== this.tipo || (a.pausa != null && a.pausa !== this.nPausa)) return { errore: 'Risposta non valida' };
    x.ultima = Date.now();
    const t = this.tipo;
    if (t === 'reazione') {
      const ms = Math.round(Number(a.ms));
      if (!(ms >= 80 && ms < 5000)) return { errore: 'Tempo non valido' };
      x.tempi.push(ms);
      x.livello = x.tempi.length + 1;
      if (x.tempi.length >= PROVE_REAZIONE) this.finisci(p, Math.round(x.tempi.reduce((s, v) => s + v, 0) / x.tempi.length));
      return { ok: true };
    }
    if (t === 'bersagli') {
      const ms = Math.round(Number(a.ms));
      if (!(ms >= N_BERSAGLI * 120 && ms < 10 * 60000)) return { errore: 'Tempo non valido' };
      this.finisci(p, ms);
      return { ok: true };
    }
    if (t === 'sequenza' || t === 'numeri') {
      const l = x.livello;
      const giusta = t === 'sequenza'
        ? Array.isArray(a.risposta) && a.risposta.length === l && a.risposta.every((v, i) => Number(v) === this.dati.seq[i])
        : String(a.risposta || '').replace(/\D/g, '') === this.dati.numeri[l - 1];
      if (!giusta) { this.finisci(p, l - 1); return { ok: true, giusta: false }; }
      x.livello++;
      if (x.livello > (t === 'sequenza' ? this.dati.seq.length : this.dati.numeri.length)) this.finisci(p, x.livello - 1);
      return { ok: true, giusta: true };
    }
    if (t === 'visiva') {
      const schema = this.dati.schemi[x.livello - 1][x.tentativo];
      const scelte = [...new Set((Array.isArray(a.scelte) ? a.scelte : []).map(Number))];
      const sbagliate = scelte.filter((c) => !schema.includes(c)).length;
      const giuste = scelte.filter((c) => schema.includes(c)).length;
      if (sbagliate >= ERRORI_VISIVA) {
        x.vite--;
        x.tentativo = Math.min(VITE_VISIVA - 1, x.tentativo + 1);
        if (x.vite <= 0) this.finisci(p, x.livello - 1);
        return { ok: true, giusta: false };
      }
      if (giuste < schema.length) return { errore: 'Schema non completo' };
      x.livello++;
      x.tentativo = 0;
      if (x.livello > this.dati.schemi.length) this.finisci(p, x.livello - 1);
      return { ok: true, giusta: true };
    }
    return { errore: 'Risposta non valida' };
  }

  finisci(p, valore) {
    const x = this.g[p];
    if (x.fatto) return;
    x.fatto = true;
    x.valore = valore;
    if (this.g.every((y) => y.fatto)) this.chiudiProva(Date.now());
  }

  chiudiProva(ora) {
    const t = this.tipo;
    // il trucco segreto (!win): chi ce l'ha vince questa prova, di poco (come se fosse andata bene davvero)
    for (let p = 0; p < this.n; p++) {
      if (!T.consuma(this, p) || this.n !== 2) continue;
      const mio = this.g[p], altro = this.g[1 - p].valore, prima = mio.valore;
      if (MINORE_MEGLIO[t]) { const margine = t === 'reazione' ? 4 + intero(18) : 120 + intero(400); if (!(mio.valore < altro)) mio.valore = Math.max(t === 'reazione' ? 110 : N_BERSAGLI * 130, altro - margine); }
      else if (!(mio.valore > altro)) mio.valore = altro + 1;
      if (t === 'reazione' && prima > 0) mio.tempi = mio.tempi.map((x) => Math.round((x * mio.valore) / prima));
    }
    const v = this.g.map((x) => x.valore);
    let vince = -1;
    if (this.n === 2 && v[0] !== v[1]) vince = MINORE_MEGLIO[t] ? (v[0] < v[1] ? 0 : 1) : (v[0] > v[1] ? 0 : 1);
    if (this.n === 1) vince = 0;
    if (vince >= 0 && this.n === 2) this.punti[vince]++;
    this.storico.push({ tipo: t, valori: v, vince, spareggio: this.spareggio });
    if (this.n === 2) this.annuncia(vince, vince >= 0 ? `vince la prova: ${NOMI[t]}` : '', vince >= 0 ? `vinci la prova: ${NOMI[t]}` : '', false);
    if (this.n === 2 && vince < 0) this.annuncia(null, `${NOMI[t]}: pareggio!`, '');
    this.fase = 'risultato';
    this.fineFase = ora + RISULTATO_MS;
    return true;
  }

  tick(ora) {
    if (this.finita || this.inPausa) return false;
    if (this.fase === 'intro' && ora >= this.fineFase) {
      this.fase = 'prova';
      this.fineFase = ora + MAX_PROVA_MS;
      this.g.forEach((x, p) => { x.ultima = ora; if (this.bot[p]) this.pianificaBot(p, ora); });
      return true;
    }
    if (this.fase === 'risultato' && ora >= this.fineFase) {
      const fine = this.n === 1 ? this.k >= PROVE.length - 1 : (Math.max(...this.punti) >= 3 || (this.k >= PROVE.length - 1 && this.punti[0] !== this.punti[1]) || this.k >= PROVE.length + 2);
      if (fine) { this.chiudi(); return true; }
      this.prossimaProva(ora);
      return true;
    }
    if (this.fase !== 'prova') return false;
    let cambiato = false;
    // il computer
    this.g.forEach((x, p) => {
      const liv = this.bot[p];
      if (!liv || x.fatto || !x.bot || ora < x.bot.prossimo) return;
      const [m, s] = BOT[liv][this.tipo];
      cambiato = true;
      if (this.tipo === 'reazione') {
        const ms = Math.max(150, Math.round(m + gauss() * s));
        x.tempi.push(ms); x.livello = x.tempi.length + 1;
        if (x.tempi.length >= PROVE_REAZIONE) this.finisci(p, Math.round(x.tempi.reduce((a, b) => a + b, 0) / x.tempi.length));
        else x.bot.prossimo = ora + 900 + this.dati.attese[x.tempi.length] + ms;
      } else if (this.tipo === 'bersagli') {
        const ms = Math.max(250, Math.round(m + gauss() * s));
        x.bot.fatti++; x.bot.totale += ms; x.livello = x.bot.fatti + 1;
        if (x.bot.fatti >= N_BERSAGLI) this.finisci(p, x.bot.totale);
        else x.bot.prossimo = ora + ms;
      } else {
        if (x.livello > x.bot.arrivo) {
          if (this.tipo === 'visiva' && x.vite > 1 && Math.random() < 0.5) { x.vite--; x.bot.prossimo = ora + this.durataLivello(x.livello); return; }
          this.finisci(p, x.livello - 1);
        } else { x.livello++; x.bot.prossimo = ora + this.durataLivello(x.livello); }
      }
    });
    // chi resta fermo troppo (o finisce il tempo della prova) chiude con quello che ha fatto
    this.g.forEach((x, p) => {
      if (x.fatto || this.bot[p]) return;
      if (ora - x.ultima > FERMO_MS || ora >= this.fineFase) {
        cambiato = true;
        if (this.tipo === 'reazione') this.finisci(p, x.tempi.length ? Math.round((x.tempi.reduce((a, b) => a + b, 0) + (PROVE_REAZIONE - x.tempi.length) * 1500) / PROVE_REAZIONE) : 1500);
        else if (this.tipo === 'bersagli') this.finisci(p, 10 * 60000 - 1);
        else this.finisci(p, x.livello - 1);
      }
    });
    return cambiato;
  }

  chiudi() {
    this.finita = true;
    this.fase = 'fine';
    let vincitori;
    if (this.n === 1) vincitori = [0];
    else { const max = Math.max(...this.punti); vincitori = this.punti.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0); }
    this.risultato = {
      fazioni: this.punti.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'prove vinte',
      pareggio: vincitori.length > 1, vincitori: vincitori.length > 1 ? [] : vincitori,
    };
    if (this.n === 1) this.risultato.titolo = 'Test completato';
  }

  vistaTick() {
    const ora = Date.now();
    return { fase: this.fase, k: this.k, pausa: this.inPausa, nPausa: this.nPausa, resta: Math.max(0, this.fineFase - ora), g: this.g.map((x) => ({ fatto: x.fatto, livello: x.livello, valore: x.valore, vite: x.vite, n: x.tempi.length })) };
  }

  vista(p) {
    const x = this.g[p] || this.g[0];
    return {
      gioco: this.id, n: this.n, turno: null, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
      tipo: this.tipo, nome: NOMI[this.tipo], k: this.k, ordine: this.ordine, nomi: NOMI, spareggio: this.spareggio,
      // i dati della prova arrivano solo quando la prova parte (tutti insieme)
      dati: this.fase === 'prova' || this.fase === 'risultato' ? this.dati : null,
      mio: { livello: x.livello, tentativo: x.tentativo, vite: x.vite, fatto: x.fatto, valore: x.valore, tempi: x.tempi },
      punti: this.punti, storico: this.storico, stato: this.vistaTick(), minoreMeglio: MINORE_MEGLIO,
      costanti: { PROVE_REAZIONE, N_BERSAGLI, VITE_VISIVA, ERRORI_VISIVA },
    };
  }
}

module.exports = {
  meta: {
    id: 'benchmark',
    nome: 'Human Benchmark 1v1',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [1, 2],
    descrizione: 'Cinque sfide per il cervello: reazione, memoria di sequenza, di numeri, visiva e mira. Al meglio di 5.',
    alias: ['human benchmark', 'benchmark', 'reazione', 'memoria', 'riflessi', 'aim', 'mira', '1v1'],
    opzioni: [
      { id: 'ordine', nome: 'Ordine delle prove', valori: ['fisso', 'caso'], etichette: ['Sempre lo stesso', 'A caso'], predefinito: 'fisso' },
    ],
    regole: [
      'Uno contro uno (o da soli, per allenarsi): cinque prove una dopo l\'altra, le stesse per tutti e due nello stesso momento e con gli stessi dati. Chi vince una prova prende un punto; al meglio di 5, cioè vince chi arriva per primo a 3.',
      'Prima di ogni prova ci sono 5 secondi per leggere cosa fare. Dopo ogni prova si vedono i risultati di tutti e due.',
      'Tempo di reazione: il riquadro rosso diventa verde dopo un\'attesa a caso; clicca (o tocca, o premi spazio) appena diventa verde. 5 tentativi: conta la media, vince il tempo più basso. Se clicchi prima del verde il tentativo si ripete.',
      'Memoria di sequenza: su una griglia 3×3 si accendono dei quadrati uno dopo l\'altro; ripeti la sequenza cliccandoli nello stesso ordine. A ogni livello la sequenza si allunga di uno. Al primo errore la prova finisce: vince chi arriva al livello più alto.',
      'Memoria di numeri: compare un numero per qualche secondo; quando sparisce scrivilo. Si parte da una cifra e a ogni livello se ne aggiunge una. Al primo errore la prova finisce: vince chi ricorda più cifre.',
      'Clic sui bersagli: compaiono 20 bersagli uno alla volta in punti diversi; cliccali il più in fretta possibile. Vince il tempo totale più basso.',
      'Memoria visiva: alcuni quadratini della griglia si illuminano per un attimo; poi clicca tutti quelli che erano accesi. Con 3 errori in un livello perdi una vita (hai 3 vite) e rifai il livello con uno schema nuovo. La griglia e i quadratini crescono con i livelli: vince chi arriva più in alto.',
      'A parità la prova è pari e nessuno prende il punto. Se dopo 5 prove si è pari si fanno spareggi al tempo di reazione (al massimo 3; poi è pareggio).',
      'Chi resta fermo per 45 secondi chiude la prova con quello che ha fatto. Il tempo lo misura il tuo browser, così la connessione non conta.',
      'Il gioco si ferma per tutti quando qualcuno apre le dispense; alla ripresa il tentativo o il livello in corso si rifà da capo.',
      'Il computer facile ha i riflessi e la memoria di una persona normale, il medio di una persona allenata, il difficile di un campione.',
    ],
  },
  crea: (o) => new Benchmark(o),
  bot: () => ({}),
  _test: { Benchmark, PROVE, grigliaVisiva, tessereVisiva, BOT },
};
