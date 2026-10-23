// FAST WEST: da 2 a 10, solo tra persone. Ognuno ha un pistolero segreto, delle vite e da 0 a 5 pallottole.
// Ogni turno si gira una carta bersaglio (direzione + evento), poi tutti scelgono in segreto una carta azione,
// si rivelano insieme e si risolvono. Gli eliminati fanno il tifo. Vince l'ultimo in vita; se muoiono tutti vince il west.
const MAX_PALLOTTOLE = 5;
const PAUSA_RIVELA = Number(process.env.FW_PAUSA_RIVELA) || 5500;  // carte scoperte: in questo momento il Baro può cambiare arma
const PAUSA_ESITO = Number(process.env.FW_PAUSA_ESITO) || 7000;   // si guarda cosa è successo

// le 8 carte in mano di ogni pistolero (due Ricariche)
const MANO_INIZIALE = ['ricarica-1', 'ricarica-2', 'schivata', 'revolver', 'winchester', 'dinamite', 'rimbalzo', 'errore'];
const tipoDi = (id) => String(id).split('-')[0];
const CARTE = {
  ricarica: { nome: 'Ricarica', testo: '+1 pallottola e riprendi in mano tutti gli scarti.' },
  schivata: { nome: 'Schivata', testo: 'Annulla Revolver e Winchester che ti colpiscono. Recuperi 1 carta scartata (non una Schivata).' },
  revolver: { nome: 'Revolver', costo: 1, arma: true, testo: '1 pallottola: il bersaglio perde 1 vita.' },
  winchester: { nome: 'Winchester', costo: 2, arma: true, testo: '2 pallottole: il bersaglio perde 1 vita. Batte il Revolver.' },
  dinamite: { nome: 'Dinamite', costo: 5, arma: true, testo: '5 pallottole: il bersaglio perde 2 vite. Non si schiva e non rimbalza.' },
  rimbalzo: { nome: 'Rimbalzo', testo: 'Revolver e Winchester che ti colpiscono passano al pistolero successivo (anche a catena).' },
  errore: { nome: 'Errore di calcolo', costo: 2, testo: '2 pallottole: la Dinamite lanciata contro di te torna a chi l\'ha tirata.' },
};
const TIPI = Object.keys(CARTE);
const FORZA_ARMA = { revolver: 1, winchester: 2, dinamite: 5 };

const EVENTI = {
  salsola: { nome: 'Salsola', testo: 'Rotola una salsola. Non succede niente.' },
  prete: { nome: 'Passa il prete', testo: '+1 pallottola a tutti.' },
  ravvicinato: { nome: 'Scontro ravvicinato', testo: 'La Schivata non ha effetto.' },
  aperto: { nome: 'In campo aperto', testo: 'Il Rimbalzo non ha effetto.' },
  barile: { nome: 'Quel comodo barile', testo: 'Chi ricarica prende 1 pallottola in più.' },
  pioggia: { nome: 'Pioggia di pallottole', testo: 'Le armi non consumano pallottole, ma bisogna averle.' },
  flashback: { nome: 'Flashback', testo: 'Tutti recuperano in mano 1 carta scartata.' },
};
const DIREZIONI = {
  destra: { nome: 'A destra', testo: 'Si spara al pistolero alla propria destra.' },
  sinistra: { nome: 'A sinistra', testo: 'Si spara al pistolero alla propria sinistra.' },
  doppia: { nome: 'Doppia', testo: 'Si spara a entrambi i vicini con un solo colpo.' },
  incrociata: { nome: 'Incrociata', testo: 'Ognuno sceglie a chi sparare.' },
};
const COMPOSIZIONE_EVENTI = { salsola: 8, prete: 3, ravvicinato: 3, aperto: 3, barile: 3, pioggia: 2, flashback: 2 };
const COMPOSIZIONE_DIREZIONI = { destra: 7, sinistra: 7, doppia: 5, incrociata: 5 };

// i 14 pistoleri
const PISTOLERI = {
  baro: { nome: 'Il Baro', vite: 3, testo: 'Dopo che le carte sono state rivelate può cambiare la sua arma con un\'altra arma che ha in mano, pagando le pallottole di entrambe.' },
  ninja: { nome: 'Il Ninja', vite: 3, testo: 'Mentre ricarica può scartare la sua Schivata (se ce l\'ha in mano) per evitare un colpo di Revolver o Winchester.' },
  sceriffo: { nome: 'Lo Sceriffo', vite: 3, testo: 'Il suo Revolver non consuma pallottole.' },
  dottoressa: { nome: 'La Dottoressa', vite: 2, testo: 'La prima volta che perderebbe l\'ultima vita si cura e resta con 1 vita.' },
  mancino: { nome: 'Il Mancino', vite: 3, testo: 'Quando la carta bersaglio dice destra o sinistra, può sparare dalla parte opposta.' },
  minatore: { nome: 'Il Minatore', vite: 2, testo: 'La sua Dinamite costa 3 pallottole invece di 5.' },
  vedova: { nome: 'La Vedova Nera', vite: 2, testo: 'Chi la colpisce con un Revolver o un Winchester perde anche lui 1 vita.' },
  cacciatore: { nome: 'Il Cacciatore di taglie', vite: 3, testo: 'Se elimina un pistolero si prende tutte le sue pallottole (fino a 5).' },
  becchino: { nome: 'Il Becchino', vite: 3, testo: 'Ogni volta che un altro pistolero viene eliminato prende 1 pallottola e recupera 1 carta scartata.' },
  azzardo: { nome: 'Il Giocatore d\'azzardo', vite: 3, testo: 'Quando ricarica tira un dado: prende da 1 a 3 pallottole invece di 1.' },
  infallibile: { nome: 'L\'Infallibile', vite: 2, testo: 'Il suo Revolver e il suo Winchester non si possono schivare.' },
  cartomante: { nome: 'La Cartomante', vite: 3, testo: 'Vede in anticipo la carta bersaglio del turno successivo.' },
  sciamana: { nome: 'La Sciamana', vite: 3, testo: 'La sua Schivata ferma anche la Dinamite.' },
  fantasma: { nome: 'Il Fantasma', vite: 3, testo: 'Il suo Rimbalzo rimanda sempre il colpo a chi ha sparato.' },
};

const mescola = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function nuovoMazzo() {
  const ev = mescola(Object.entries(COMPOSIZIONE_EVENTI).flatMap(([k, q]) => new Array(q).fill(k)));
  const dir = mescola(Object.entries(COMPOSIZIONE_DIREZIONI).flatMap(([k, q]) => new Array(q).fill(k)));
  return ev.map((e, i) => ({ id: `${dir[i]}-${e}-${Math.random().toString(36).slice(2, 7)}`, dir: dir[i], evento: e }));
}

class FastWest {
  constructor({ n, opzioni = {} }) {
    this.id = 'fastwest';
    this.n = n;
    const ids = mescola(Object.keys(PISTOLERI)).slice(0, n);
    this.g = ids.map((pid) => ({
      pistolero: pid, vite: PISTOLERI[pid].vite, viteMax: PISTOLERI[pid].vite, pallottole: 1,
      mano: [...MANO_INIZIALE], scarti: [], vivo: true, uscito: false, rivelato: false, curata: false, morto: null,
    }));
    this.mazzo = nuovoMazzo();
    this.turnoN = 0;
    this.log = [];         // cosa è successo nell'ultimo turno (per le animazioni)
    this.storia = [];      // i turni passati (riassunto)
    this.inAttesa = false;
    this.pausaMs = PAUSA_RIVELA;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.turno = null;
    this.nuovoTurno();
  }

  annuncia(posto, testo, testoIo, forte = false, extra = {}) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte, ...extra }; }
  vivi() { return this.g.map((x, i) => (x.vivo ? i : -1)).filter((i) => i >= 0); }
  tifosi() { return this.g.map((x, i) => (!x.vivo && !x.uscito ? i : -1)).filter((i) => i >= 0); }
  // destra = il pistolero vivo successivo, sinistra = il precedente
  vicino(p, dir) {
    const passo = dir === 'sinistra' ? -1 : 1;
    for (let k = 1; k < this.n; k++) { const i = (((p + passo * k) % this.n) + this.n) % this.n; if (this.g[i].vivo) return i; }
    return p;
  }
  pesca() { if (!this.mazzo.length) this.mazzo = nuovoMazzo(); return this.mazzo.pop(); }
  prossimaCarta() { if (!this.mazzo.length) this.mazzo = nuovoMazzo(); return this.mazzo[this.mazzo.length - 1]; }
  rivela(p, perche) {
    if (this.g[p].rivelato) return;
    this.g[p].rivelato = true;
    this.log.push({ tipo: 'rivela', posto: p, pistolero: this.g[p].pistolero, perche });
  }
  costo(p, tipo) {
    const pid = this.g[p].pistolero;
    if (tipo === 'revolver' && pid === 'sceriffo') return 0;
    if (tipo === 'dinamite' && pid === 'minatore') return 3;
    return CARTE[tipo].costo || 0;
  }

  nuovoTurno() {
    this.turnoN++;
    this.carta = this.pesca();
    this.scelte = new Array(this.n).fill(undefined); // undefined = deve scegliere, null = nessuna carta
    this.tifo = new Array(this.n).fill(undefined);
    this.recuperato = new Array(this.n).fill(false);
    this.cambio = null;
    this.fase = 'scelta';
    this.inAttesa = false;
    if (this.carta.evento === 'prete') for (const i of this.vivi()) this.g[i].pallottole = Math.min(MAX_PALLOTTOLE, this.g[i].pallottole + 1);
    this.annuncia(null, `Turno ${this.turnoN}: ${DIREZIONI[this.carta.dir].nome.toLowerCase()} · ${EVENTI[this.carta.evento].nome}`, '', false);
  }

  // il trucco segreto (!win): quando mancano solo le sue carte, sa chi gli sparerà questo turno e cosa conviene giocare
  suggerimentoWin(p) {
    const io = this.g[p];
    if (this.finita || this.fase !== 'scelta' || !io.vivo) return null;
    const att = this.attesi();
    if (att.length !== 1 || att[0] !== p) return null;
    const ev = this.carta.evento;
    const spari = [];
    for (const q of this.vivi()) {
      const sc = this.scelte[q];
      if (q === p || !sc || !CARTE[tipoDi(sc.carta)].arma) continue;
      let d = this.carta.dir;
      if (sc.inverti && ['destra', 'sinistra'].includes(d)) d = d === 'destra' ? 'sinistra' : 'destra';
      const bersagli = d === 'incrociata' ? [sc.bersaglio] : d === 'doppia' ? [this.vicino(q, 'destra'), this.vicino(q, 'sinistra')] : [this.vicino(q, d)];
      if (bersagli.includes(p)) spari.push({ q, arma: tipoDi(sc.carta) });
    }
    const chi = (q) => (q === this.vicino(p, 'destra') ? 'chi hai a destra' : q === this.vicino(p, 'sinistra') ? 'chi hai a sinistra' : 'un altro pistolero');
    const ho = (t) => io.mano.some((c) => tipoDi(c) === t);
    if (!spari.length) {
      const arma = ['dinamite', 'winchester', 'revolver'].find((t) => ho(t) && io.pallottole >= this.costo(p, t));
      return `💡 Nessuno ti spara: ${arma ? `vai di ${CARTE[arma].nome}` : ho('ricarica') ? 'ricarica tranquillo' : 'stai sereno'}`;
    }
    const testo = spari.map((x) => `${chi(x.q)} (${CARTE[x.arma].nome})`).join(', ');
    let consiglio;
    if (spari.some((x) => x.arma === 'dinamite')) consiglio = ho('errore') && io.pallottole >= 2 ? 'Errore di calcolo' : ho('schivata') && io.pistolero === 'sciamana' && ev !== 'ravvicinato' ? 'Schivata' : null;
    else if (ho('schivata') && ev !== 'ravvicinato') consiglio = 'Schivata';
    else if (ho('rimbalzo') && ev !== 'aperto') consiglio = 'Rimbalzo';
    return `💡 Ti spara ${testo}${consiglio ? `: gioca ${consiglio}` : ''}`;
  }

  deveRecuperare(p) { return this.carta.evento === 'flashback' && !this.recuperato[p] && this.g[p].scarti.length > 0; }

  attesi() {
    if (this.fase !== 'scelta' || this.finita) return [];
    return [...this.vivi().filter((i) => this.scelte[i] === undefined), ...this.tifosi().filter((i) => this.tifo[i] === undefined)];
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (!a) return { errore: 'Mossa non valida' };
    const io = this.g[p];

    // durante la rivelazione: solo il Baro può cambiare arma
    if (a.tipo === 'cambia') {
      if (this.fase !== 'rivelazione') return { errore: 'Si può cambiare arma solo quando le carte sono scoperte' };
      if (io.pistolero !== 'baro' || !io.vivo) return { errore: 'Solo il Baro può cambiare arma' };
      if (this.cambio) return { errore: 'Hai già cambiato arma' };
      const s = this.scelte[p];
      if (!s || !CARTE[tipoDi(s.carta)].arma) return { errore: 'Puoi cambiare solo se hai giocato un\'arma' };
      const nuova = String(a.carta || '');
      if (!io.mano.includes(nuova) || nuova === s.carta || !CARTE[tipoDi(nuova)].arma) return { errore: 'Scegli un\'altra arma che hai in mano' };
      const serve = this.costo(p, tipoDi(s.carta)) + this.costo(p, tipoDi(nuova));
      if (io.pallottole < serve) return { errore: `Servono ${serve} pallottole per pagare entrambe le armi` };
      this.cambio = { posto: p, vecchia: s.carta, nuova, costo: serve };
      s.cartaOriginale = s.carta;
      s.carta = nuova;
      this.rivela(p, 'cambia arma all\'ultimo momento');
      this.annuncia(p, `è il Baro! Cambia ${CARTE[tipoDi(this.cambio.vecchia)].nome} con ${CARTE[tipoDi(nuova)].nome}`, `cambi arma: ${CARTE[tipoDi(nuova)].nome}!`, true);
      return { ok: true };
    }

    if (this.inAttesa) return { errore: 'Un attimo…' };
    if (this.fase !== 'scelta') return { errore: 'Non è il momento' };

    if (a.tipo === 'recupera') {
      if (!io.vivo) return { errore: 'Sei stato eliminato' };
      if (!this.deveRecuperare(p)) return { errore: 'Non devi recuperare carte' };
      const c = String(a.carta || '');
      if (!io.scarti.includes(c)) return { errore: 'Quella carta non è tra i tuoi scarti' };
      io.scarti = io.scarti.filter((x) => x !== c);
      io.mano.push(c);
      this.recuperato[p] = true;
      return { ok: true };
    }

    if (a.tipo === 'gioca') {
      if (!io.vivo) return { errore: 'Sei stato eliminato: ora fai il tifo' };
      if (this.deveRecuperare(p)) return { errore: 'Flashback: prima recupera una carta dagli scarti' };
      const c = String(a.carta || '');
      if (!io.mano.includes(c)) return { errore: 'Non hai questa carta in mano' };
      const tipo = tipoDi(c);
      const s = { carta: c };
      if (CARTE[tipo].arma && this.carta.dir === 'incrociata') {
        const b = Number(a.bersaglio);
        if (!Number.isInteger(b) || b === p || !this.g[b] || !this.g[b].vivo) return { errore: 'Tiro incrociato: scegli a chi sparare' };
        s.bersaglio = b;
      }
      if (CARTE[tipo].arma && a.inverti && io.pistolero === 'mancino' && ['destra', 'sinistra'].includes(this.carta.dir)) s.inverti = true;
      if (tipo === 'schivata' && a.recupero) s.recupero = String(a.recupero);
      this.scelte[p] = s; // si può cambiare finché non hanno scelto tutti
      this.forseRivela();
      return { ok: true };
    }

    if (a.tipo === 'tifa') {
      if (io.vivo) return { errore: 'Fai il tifo solo da eliminato' };
      const chi = Number(a.pistolero);
      const carta = String(a.carta || '');
      if (a.passa) { this.tifo[p] = null; this.forseRivela(); return { ok: true }; }
      if (!Number.isInteger(chi) || !this.g[chi] || !this.g[chi].vivo) return { errore: 'Scegli un pistolero ancora in vita' };
      if (!CARTE[carta]) return { errore: 'Scegli la carta che secondo te giocherà' };
      this.tifo[p] = { pistolero: chi, carta };
      this.forseRivela();
      return { ok: true };
    }
    if (a.tipo === 'annulla') {
      if (io.vivo) this.scelte[p] = undefined; else this.tifo[p] = undefined;
      return { ok: true };
    }
    return { errore: 'Mossa non valida' };
  }

  forseRivela() {
    if (this.attesi().length) return;
    this.fase = 'rivelazione';
    this.inAttesa = true;
    this.pausaMs = PAUSA_RIVELA;
    this.annuncia(null, 'Carte in tavola!', '', false);
  }

  // chi è assente o sulle dispense: resta fermo (nessuna carta) o non fa il tifo
  salta(p) {
    if (this.fase !== 'scelta' || this.finita) return;
    if (this.g[p].vivo) { if (this.scelte[p] === undefined) { this.scelte[p] = null; this.recuperato[p] = true; } } else if (this.tifo[p] === undefined) this.tifo[p] = null;
    this.forseRivela();
  }

  esce(p) {
    const x = this.g[p];
    x.uscito = true;
    if (this.finita) return;
    if (x.vivo) {
      x.vivo = false; x.vite = 0; x.morto = this.turnoN; x.rivelato = true;
      this.annuncia(p, 'lascia la città', '', false);
    }
    if (this.vivi().length <= 1) { this.log = []; this.chiudi(); return; }
    if (this.fase === 'scelta') this.forseRivela();
  }
  rientra(p) { this.g[p].uscito = false; }

  avanza() {
    if (!this.inAttesa) return;
    if (this.fase === 'rivelazione') { this.risolvi(); this.fase = 'esito'; this.pausaMs = PAUSA_ESITO; return; }
    if (this.fase === 'esito') {
      this.inAttesa = false;
      const vivi = this.vivi();
      if (vivi.length <= 1) { this.chiudi(); return; }
      this.nuovoTurno();
    }
  }

  // ----------------------------------- il cuore: la risoluzione del turno -----------------------------------
  risolvi() {
    this.log = [];
    const L = this.log;
    const ev = this.carta.evento, dir = this.carta.dir;
    const vivi = this.vivi();
    const tipo = new Array(this.n).fill(null);
    const efficace = new Array(this.n).fill(false);
    for (const p of vivi) if (this.scelte[p]) tipo[p] = tipoDi(this.scelte[p].carta);

    // tifo: chi indovina la carta di un pistolero ne potenzia l'effetto
    const spinta = new Array(this.n).fill(false);
    for (const t of this.tifosi()) {
      const x = this.tifo[t];
      if (x && tipo[x.pistolero] === x.carta) {
        if (!spinta[x.pistolero]) L.push({ tipo: 'tifo', da: t, a: x.pistolero, carta: x.carta });
        spinta[x.pistolero] = true;
      } else if (x) L.push({ tipo: 'tifoSbagliato', da: t, a: x.pistolero, carta: x.carta });
    }

    // 1. si pagano le pallottole: senza pallottole sufficienti la carta non ha effetto
    for (const p of vivi) {
      const t = tipo[p];
      if (!t) continue;
      const x = this.g[p];
      let serve = this.costo(p, t);
      if (this.cambio && this.cambio.posto === p) serve = this.cambio.costo;
      if (t === 'schivata' && ev === 'ravvicinato') { L.push({ tipo: 'bloccata', posto: p, carta: t, perche: 'Scontro ravvicinato' }); continue; }
      if (t === 'rimbalzo' && ev === 'aperto') { L.push({ tipo: 'bloccata', posto: p, carta: t, perche: 'In campo aperto' }); continue; }
      if (x.pallottole < serve) { L.push({ tipo: 'vuoto', posto: p, carta: t, serve }); continue; }
      const gratis = ev === 'pioggia' && CARTE[t].arma;
      if (!gratis) x.pallottole -= serve;
      efficace[p] = true;
      if (serve > 0) L.push({ tipo: 'paga', posto: p, carta: t, quante: gratis ? 0 : serve });
      if (t === 'revolver' && x.pistolero === 'sceriffo' && x.pallottole < 1 && !gratis) this.rivela(p, 'spara senza pallottole');
      if (t === 'dinamite' && x.pistolero === 'minatore') this.rivela(p, 'la sua Dinamite costa meno');
    }

    // 2. le ricariche (prima dei colpi: gli scarti tornano in mano, la Ricarica giocata finisce negli scarti dopo)
    const ricarica = (p, perche) => {
      const x = this.g[p];
      x.mano.push(...x.scarti);
      const tornate = x.scarti.length;
      x.scarti = [];
      let quante = 1;
      if (x.pistolero === 'azzardo') { quante = 1 + Math.floor(Math.random() * 3); this.rivela(p, `tira il dado: ${quante}`); }
      if (ev === 'barile') quante++;
      if (spinta[p] && perche === 'ricarica') quante++;
      const prima = x.pallottole;
      x.pallottole = Math.min(MAX_PALLOTTOLE, x.pallottole + quante);
      L.push({ tipo: 'ricarica', posto: p, quante: x.pallottole - prima, tornate, perche });
    };
    for (const p of vivi) if (efficace[p] && tipo[p] === 'ricarica') ricarica(p, 'ricarica');
    for (const p of vivi) if (efficace[p] && tipo[p] === 'dinamite' && spinta[p]) ricarica(p, 'dinamite');

    // 3. i colpi
    const colpi = [];
    for (const p of vivi) {
      const t = tipo[p];
      if (!efficace[p] || !CARTE[t].arma) continue;
      const s = this.scelte[p];
      let d = dir;
      if (s.inverti && ['destra', 'sinistra'].includes(d)) { d = d === 'destra' ? 'sinistra' : 'destra'; this.rivela(p, 'spara dalla parte opposta'); }
      let bersagli;
      if (d === 'incrociata') bersagli = [{ a: this.g[s.bersaglio] && this.g[s.bersaglio].vivo ? s.bersaglio : this.vicino(p, 'destra'), verso: 'destra' }];
      else if (d === 'doppia') {
        const dx = this.vicino(p, 'destra'), sx = this.vicino(p, 'sinistra');
        bersagli = dx === sx ? [{ a: dx, verso: 'destra' }] : [{ a: dx, verso: 'destra' }, { a: sx, verso: 'sinistra' }];
      } else bersagli = [{ a: this.vicino(p, d), verso: d }];
      for (const b of bersagli) if (b.a !== p) colpi.push({ da: p, a: b.a, arma: t, verso: b.verso, annullato: false });
    }
    // duelli: due pistoleri che si sparano a vicenda
    for (const c1 of colpi) for (const c2 of colpi) {
      if (c1 === c2 || c1.annullato || c2.annullato || c1.da !== c2.a || c1.a !== c2.da || c1.da > c2.da) continue;
      if (c1.arma === c2.arma) {
        const s1 = spinta[c1.da] && c1.arma !== 'dinamite', s2 = spinta[c2.da] && c2.arma !== 'dinamite';
        if (s1 && !s2) { c2.annullato = true; L.push({ tipo: 'duello', vince: c1.da, perde: c2.da, arma: c1.arma, tifo: true }); }
        else if (s2 && !s1) { c1.annullato = true; L.push({ tipo: 'duello', vince: c2.da, perde: c1.da, arma: c2.arma, tifo: true }); }
        else { c1.annullato = c2.annullato = true; L.push({ tipo: 'pari', a: c1.da, b: c2.da, arma: c1.arma }); }
      } else {
        const [forte, debole] = FORZA_ARMA[c1.arma] > FORZA_ARMA[c2.arma] ? [c1, c2] : [c2, c1];
        debole.annullato = true;
        L.push({ tipo: 'duello', vince: forte.da, perde: debole.da, arma: forte.arma, armaPerde: debole.arma });
      }
    }
    const danni = new Array(this.n).fill(0);
    const feritoDa = Array.from({ length: this.n }, () => new Set());
    const ferisci = (vittima, chi, quanto) => { danni[vittima] += quanto; feritoDa[vittima].add(chi); };
    for (const c of colpi) {
      if (c.annullato) continue;
      const sp = c.da;
      if (c.arma === 'dinamite') {
        const x = c.a;
        if (efficace[x] && tipo[x] === 'errore') {
          L.push({ tipo: 'errore', da: sp, a: x });
          ferisci(sp, x, 2);
          L.push({ tipo: 'colpito', da: x, a: sp, arma: 'dinamite', danno: 2, tornata: true });
        } else if (efficace[x] && tipo[x] === 'schivata' && this.g[x].pistolero === 'sciamana') {
          this.rivela(x, 'la sua Schivata ferma la Dinamite');
          L.push({ tipo: 'schivato', da: sp, a: x, arma: 'dinamite' });
        } else {
          ferisci(x, sp, 2);
          L.push({ tipo: 'colpito', da: sp, a: x, arma: 'dinamite', danno: 2 });
        }
        continue;
      }
      // Revolver o Winchester: può essere schivato o rimbalzare, anche a catena
      let cur = c.a;
      const visti = new Set();
      const schivabile = this.g[sp].pistolero !== 'infallibile';
      let guardia = 0;
      while (guardia++ < 40) {
        const t = tipo[cur];
        if (cur !== sp && schivabile && efficace[cur] && t === 'schivata') { L.push({ tipo: 'schivato', da: sp, a: cur, arma: c.arma }); break; }
        if (cur !== sp && schivabile && this.g[cur].pistolero === 'ninja' && t === 'ricarica' && ev !== 'ravvicinato' && this.g[cur].mano.includes('schivata')) {
          this.g[cur].mano = this.g[cur].mano.filter((x) => x !== 'schivata');
          this.g[cur].scarti.push('schivata');
          this.rivela(cur, 'scarta la Schivata mentre ricarica');
          L.push({ tipo: 'schivato', da: sp, a: cur, arma: c.arma, ninja: true });
          break;
        }
        if (cur !== sp && efficace[cur] && t === 'rimbalzo' && !visti.has(cur)) {
          visti.add(cur);
          let dopo;
          if (spinta[cur] || this.g[cur].pistolero === 'fantasma') { dopo = sp; if (!spinta[cur]) this.rivela(cur, 'il suo Rimbalzo torna a chi spara'); } else dopo = this.vicino(cur, c.verso);
          L.push({ tipo: 'rimbalzo', da: cur, a: dopo, arma: c.arma, origine: sp });
          cur = dopo;
          continue;
        }
        if (!schivabile && efficace[cur] && t === 'schivata') this.rivela(sp, 'il suo colpo non si può schivare');
        ferisci(cur, sp, 1);
        L.push({ tipo: 'colpito', da: sp, a: cur, arma: c.arma, danno: 1, rimbalzato: cur !== c.a });
        if (this.g[cur].pistolero === 'vedova' && cur !== sp) {
          ferisci(sp, cur, 1);
          this.rivela(cur, 'chi la colpisce paga');
          L.push({ tipo: 'vedova', da: cur, a: sp });
        }
        break;
      }
    }

    // 4. si tolgono le vite, tutte insieme
    for (const p of vivi) {
      if (!danni[p]) continue;
      const x = this.g[p];
      x.vite -= danni[p];
      if (x.vite <= 0 && x.pistolero === 'dottoressa' && !x.curata) {
        x.curata = true; x.vite = 1;
        this.rivela(p, 'si cura all\'ultimo');
        L.push({ tipo: 'cura', posto: p });
      }
    }

    // 5. Schivata: recupero di carte (non Schivate)
    for (const p of vivi) {
      if (!efficace[p] || tipo[p] !== 'schivata') continue;
      const x = this.g[p];
      const quante = spinta[p] ? 2 : 1;
      const prese = [];
      for (let k = 0; k < quante; k++) {
        const pos = x.scarti.filter((c) => tipoDi(c) !== 'schivata');
        if (!pos.length) break;
        const voluta = this.scelte[p].recupero;
        const c = k === 0 && voluta && pos.includes(voluta) ? voluta : pos.find((c) => tipoDi(c) === 'ricarica') || pos[0];
        x.scarti = x.scarti.filter((y) => y !== c);
        x.mano.push(c);
        prese.push(c);
      }
      if (prese.length) L.push({ tipo: 'recupera', posto: p, carte: prese });
    }

    // 6. le carte giocate vanno negli scarti (l'Errore di calcolo spinto dal tifo torna in mano)
    for (const p of vivi) {
      const s = this.scelte[p];
      if (!s) continue;
      const x = this.g[p];
      const via = [s.carta];
      if (s.cartaOriginale) via.push(s.cartaOriginale);
      for (const c of via) {
        if (tipoDi(c) === 'errore' && spinta[p] && efficace[p]) { L.push({ tipo: 'tornaInMano', posto: p, carta: c }); continue; }
        x.mano = x.mano.filter((y) => y !== c);
        x.scarti.push(c);
      }
    }

    // 7. gli eliminati
    const morti = vivi.filter((p) => this.g[p].vite <= 0);
    for (const p of morti) {
      const x = this.g[p];
      x.vite = 0; x.vivo = false; x.morto = this.turnoN; x.rivelato = true;
      L.push({ tipo: 'morto', posto: p, pistolero: x.pistolero });
    }
    for (const p of morti) {
      for (const k of feritoDa[p]) {
        const y = this.g[k];
        if (y.pistolero === 'cacciatore' && y.vivo && k !== p && this.g[p].pallottole > 0) {
          const prima = y.pallottole;
          y.pallottole = Math.min(MAX_PALLOTTOLE, y.pallottole + this.g[p].pallottole);
          this.rivela(k, 'incassa la taglia');
          L.push({ tipo: 'taglia', posto: k, da: p, quante: y.pallottole - prima });
        }
      }
      for (const k of this.vivi()) {
        const y = this.g[k];
        if (y.pistolero !== 'becchino') continue;
        y.pallottole = Math.min(MAX_PALLOTTOLE, y.pallottole + 1);
        const c = y.scarti.find((z) => tipoDi(z) === 'ricarica') || y.scarti[0];
        if (c) { y.scarti = y.scarti.filter((z) => z !== c); y.mano.push(c); }
        this.rivela(k, 'prepara la cassa');
        L.push({ tipo: 'becchino', posto: k, per: p, carta: c || null });
      }
      this.g[p].pallottole = 0;
    }

    this.storia.push({ turno: this.turnoN, carta: this.carta, scelte: this.scelte.map((s) => (s ? { carta: s.carta, bersaglio: s.bersaglio ?? null } : null)), log: L });
    if (this.storia.length > 30) this.storia.shift();
    const nuoviMorti = morti.length;
    const rimasti = this.vivi();
    if (rimasti.length === 1) this.annuncia(rimasti[0], 'è l\'ultimo pistolero in piedi! 🤠', 'sei l\'ultimo pistolero in piedi! 🤠', true);
    else if (!rimasti.length) this.annuncia(null, 'Sono caduti tutti… vince il west. 🌵', '', true);
    else if (nuoviMorti) this.annuncia(null, `${nuoviMorti === 1 ? 'Un pistolero è caduto' : `${nuoviMorti} pistoleri sono caduti`}!`, '', true);
  }

  chiudi() {
    this.finita = true;
    this.inAttesa = false;
    this.turno = null;
    this.fase = 'fine';
    for (const x of this.g) x.rivelato = true;
    const vivi = this.vivi();
    const vincitori = vivi.length === 1 ? vivi : [];
    this.vinceIlWest = vivi.length === 0;
    // punti: turno di caduta (chi resiste di più sta più in alto), il vincitore sopra tutti
    this.risultato = {
      fazioni: this.g.map((x, i) => ({ posti: [i], punti: x.vivo ? this.turnoN + 1 : x.morto || 0 })),
      etichetta: 'turni',
      pareggio: false,
      vincitori,
      titolo: this.vinceIlWest ? 'Vince il west' : null,
    };
    return { ok: true };
  }

  vista(p) {
    const io = this.g[p];
    const scoperte = this.fase === 'rivelazione' || this.fase === 'esito' || this.fase === 'fine';
    return {
      gioco: this.id, n: this.n, fase: this.fase, turno: null, inAttesa: this.inAttesa, pausaMs: this.pausaMs, turnoN: this.turnoN,
      carta: this.carta,
      prossima: io.pistolero === 'cartomante' && io.vivo ? this.prossimaCarta() : null,
      giocatori: this.g.map((x, i) => ({
        vite: x.vite, viteMax: x.viteMax, pallottole: x.pallottole, vivo: x.vivo, uscito: x.uscito, morto: x.morto,
        pistolero: x.rivelato || i === p || this.finita ? x.pistolero : null, rivelato: x.rivelato, curata: x.curata,
        scarti: x.scarti, manoN: x.mano.length,
        pronto: x.vivo ? this.scelte[i] !== undefined : this.tifo[i] !== undefined,
        giocata: scoperte && this.scelte[i] ? { carta: this.scelte[i].carta, bersaglio: this.scelte[i].bersaglio ?? null, inverti: !!this.scelte[i].inverti, originale: this.scelte[i].cartaOriginale || null } : null,
        tifo: scoperte ? this.tifo[i] || null : null,
      })),
      mano: io.mano, mioPistolero: io.pistolero,
      miaScelta: this.scelte[p] || null, mioTifo: this.tifo[p] || null,
      deveRecuperare: this.fase === 'scelta' && io.vivo && this.deveRecuperare(p),
      cambio: this.cambio,
      log: this.fase === 'esito' || this.fase === 'fine' ? this.log : [],
      mazzoRimasto: this.mazzo.length,
      pistoleri: PISTOLERI, // nomi, vite e poteri (servono al disegno)
      vinceIlWest: !!this.vinceIlWest,
      finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

const elencoPistoleri = Object.values(PISTOLERI).map((x) => `${x.nome} (${x.vite} vite): ${x.testo}`);

module.exports = {
  meta: {
    id: 'fastwest',
    nome: 'Fast West',
    tipo: 'tabellone',
    soloPersone: true,
    giocatori: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    descrizione: 'Pistoleri segreti, carte scelte di nascosto e colpi tutti insieme. L\'ultimo in piedi vince.',
    opzioni: [],
    regole: [
      'Si gioca solo tra persone, da 2 a 10. Ogni giocatore riceve un pistolero segreto (ce ne sono 14, elencati sotto), con le sue vite (3, o 2 per i pistoleri più forti) e 1 pallottola. Le pallottole vanno da 0 a 5. Vite e pallottole di tutti si vedono sempre; il pistolero degli altri no, finché non usa il suo potere o viene eliminato.',
      'Ognuno ha in mano le stesse 8 carte azione: 2 Ricariche, Schivata, Revolver, Winchester, Dinamite, Rimbalzo, Errore di calcolo. La carta giocata va negli scarti, che tutti vedono.',
      'A ogni turno si gira una carta bersaglio. La direzione dice a chi si spara: a destra (il pistolero successivo), a sinistra (il precedente), doppia (entrambi i vicini con un solo colpo e un solo costo) o incrociata (ognuno sceglie un pistolero qualsiasi).',
      'La carta bersaglio ha anche un evento. Salsola: niente. Passa il prete: +1 pallottola a tutti, subito. Scontro ravvicinato: la Schivata non ha effetto. In campo aperto: il Rimbalzo non ha effetto. Quel comodo barile: chi ricarica prende 1 pallottola in più. Pioggia di pallottole: le armi non consumano pallottole, ma bisogna averne abbastanza. Flashback: prima di scegliere, tutti recuperano in mano 1 carta scartata.',
      'Poi tutti scelgono in segreto 1 carta dalla mano e confermano. Finché non hanno scelto tutti si può cambiare. Quando hanno scelto tutti, le carte si scoprono insieme e si risolvono.',
      'Ricarica: +1 pallottola e riprendi in mano tutti gli scarti; la Ricarica giocata finisce negli scarti. Schivata: annulla i Revolver e i Winchester che ti colpiscono e recuperi 1 carta scartata che non sia una Schivata (puoi sceglierla). Revolver: costa 1 pallottola, toglie 1 vita. Winchester: costa 2, toglie 1 vita. Dinamite: costa 5, toglie 2 vite, non si può schivare né far rimbalzare. Rimbalzo: i Revolver e i Winchester che ti colpiscono passano al pistolero successivo nella stessa direzione del colpo (se anche lui ha giocato Rimbalzo il colpo continua, a catena). Errore di calcolo: costa 2, la Dinamite lanciata contro di te torna a chi l\'ha tirata.',
      'Se non hai abbastanza pallottole la carta non ha effetto (e non paghi). Le vite si tolgono tutte insieme alla fine del turno.',
      'Due pistoleri che si sparano a vicenda: se usano la stessa arma nessuno dei due colpisce; altrimenti colpisce solo chi ha l\'arma più costosa (Dinamite batte Winchester, Winchester batte Revolver).',
      'Chi resta senza vite è eliminato e fa il tifo: a ogni turno sceglie un pistolero e prova a indovinare la carta che giocherà. Se indovina, l\'effetto di quella carta è potenziato: Ricarica +2 pallottole; Revolver e Winchester vincono il duello a parità d\'arma; Schivata recupera 2 carte; Dinamite dà anche una Ricarica a chi la tira; Rimbalzo rimanda il colpo a chi ha sparato; Errore di calcolo torna in mano invece di essere scartato.',
      'Vince l\'ultimo pistolero in vita. Se muoiono tutti nello stesso turno, vince il west.',
      'Chi è assente o sulle dispense per 25 secondi resta fermo per quel turno (nessuna carta). Chi lascia la partita esce di scena.',
      'I pistoleri:',
      ...elencoPistoleri,
    ],
  },
  crea: (o) => new FastWest(o),
  _test: { PISTOLERI, CARTE, EVENTI, DIREZIONI, tipoDi, MANO_INIZIALE },
};
