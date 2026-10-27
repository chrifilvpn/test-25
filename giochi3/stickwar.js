// STICK WAR (come Stick War: Legacy, con i nomi originali): due statue ai capi di un lungo campo di battaglia. I minatori
// scavano l'oro e lo portano alla statua; con l'oro si addestrano spadaccini, arcieri, lancieri, maghi e giganti.
// L'esercito obbedisce a tre ordini (difesa, tieni la linea, attacco) e si può prendere il comando di un soldato e
// muoverlo a mano (più forte del solito). Vince chi distrugge la statua nemica.
// Modalità: "campagna" (8 livelli contro nazioni diverse, ognuna con le sue unità e il suo paesaggio; si gioca da soli
// o in squadra con l'esercito in comune), "torneo" (Crown of Inamorta: 5 battaglie di fila, chi perde è fuori),
// "sfida" (uno contro uno, ognuno il suo esercito) e "Endless Deads" (notti di ondate di non morti contro la statua).
const { Arena } = require('../giochi/arena');
const T = require('../giochi/trucco');

const W = 960, H = 540, L = 3000, STATUA = 140, VITA_STATUA = 3000, POP = 40, CODA = 5;
// le unità: costo, secondi per addestrarla, vita, danno, gittata, secondi tra un colpo e l'altro, velocità,
// posti nell'esercito (pop), armatura (parte di danno tolta), area del colpo, chi è a distanza
const UNITA = {
  minatore: { nome: 'Miner', costo: 150, tempo: 4, vita: 100, danno: 5, gitt: 26, ogni: 1.2, v: 72, pop: 1 },
  spada: { nome: 'Swordwrath', costo: 125, tempo: 3, vita: 120, danno: 14, gitt: 32, ogni: 0.85, v: 108, pop: 1 },
  arciere: { nome: 'Archidon', costo: 300, tempo: 4.5, vita: 90, danno: 17, gitt: 390, ogni: 1.6, v: 86, pop: 1, lontano: true },
  lanciere: { nome: 'Spearton', costo: 500, tempo: 6, vita: 560, danno: 24, gitt: 46, ogni: 1.3, v: 76, pop: 2, arm: 0.3 },
  mago: { nome: 'Magikill', costo: 900, tempo: 8, vita: 170, danno: 46, gitt: 300, ogni: 3.4, v: 70, pop: 3, area: 75, lontano: true },
  gigante: { nome: 'Giant', costo: 1500, tempo: 12, vita: 2300, danno: 95, gitt: 60, ogni: 2.4, v: 46, pop: 4, area: 48 },
  // il Chaos (nazione nemica) e i non morti di Endless Deads
  zombi: { nome: 'Dead', costo: 90, tempo: 2, vita: 110, danno: 11, gitt: 28, ogni: 1.1, v: 56, pop: 1 },
  strisciante: { nome: 'Crawler', costo: 100, tempo: 2, vita: 75, danno: 9, gitt: 26, ogni: 0.7, v: 150, pop: 1 },
  morto: { nome: 'Dead velenoso', costo: 250, tempo: 4, vita: 140, danno: 14, gitt: 220, ogni: 1.6, v: 74, pop: 1, lontano: true },
  cavaliere: { nome: 'Juggerknight', costo: 600, tempo: 7, vita: 950, danno: 32, gitt: 48, ogni: 1.4, v: 70, pop: 3, arm: 0.3 },
  medusa: { nome: 'Medusa', costo: 2500, tempo: 15, vita: 3200, danno: 120, gitt: 270, ogni: 4, v: 40, pop: 6, area: 120, lontano: true },
};
const ORDINE = ['minatore', 'spada', 'arciere', 'lanciere', 'mago', 'gigante'];
const CAOS = ['minatore', 'strisciante', 'morto', 'cavaliere', 'medusa'];
// dove si mette ogni unità nella formazione (avanti/indietro rispetto alla linea)
const POSTO = { lanciere: 35, cavaliere: 35, gigante: 15, spada: 0, zombi: 0, strisciante: 5, arciere: -95, morto: -85, mago: -140, medusa: -120, minatore: 0 };
const MINIERE = [250, 360, 490]; // distanza delle miniere dalla propria statua
const SCAVO = 3, ORO_VIAGGIO = 50, ORDINI = ['difesa', 'tieni', 'attacco'];
const POTENZIAMENTI = {
  miniera: { nome: 'Picconi d\'oro', costo: 400, testo: '+50% oro a ogni viaggio' },
  armi: { nome: 'Armi affilate', costo: 700, testo: '+25% danni' },
  armature: { nome: 'Armature', costo: 700, testo: '+25% vita' },
  statua: { nome: 'Statua di pietra', costo: 500, testo: '+1500 vita alla statua' },
};
// la campagna: la tribù nemica, le sue unità (quante di ognuna, in proporzione) e le unità che hai tu
const LIVELLI = [
  { nome: 'La nazione degli Swordwrath', vinta: 'sconfitta', scena: 'prato', mix: { spada: 1 }, mie: 2, oro: 0.8 },
  { nome: 'Gli Archidonis del bosco', vinta: 'sconfitti', scena: 'bosco', mix: { arciere: 2, spada: 2 }, mie: 3, oro: 0.85 },
  { nome: 'Gli Speartos delle colline', vinta: 'sconfitti', scena: 'colline', mix: { lanciere: 2, arciere: 1, spada: 2 }, mie: 4, oro: 0.9 },
  { nome: 'I Magikill del deserto', vinta: 'sconfitti', scena: 'deserto', mix: { mago: 1, lanciere: 1, arciere: 2, spada: 1 }, mie: 5, oro: 0.95 },
  { nome: 'I Giant delle nevi', vinta: 'sconfitti', scena: 'neve', mix: { gigante: 1, spada: 3, arciere: 2 }, mie: 6, oro: 1 },
  { nome: 'L\'orda del Chaos', vinta: 'sconfitta', scena: 'palude', mix: { strisciante: 4, morto: 2, cavaliere: 1 }, mie: 6, oro: 0.8, caos: true },
  { nome: 'L\'Order ribelle', vinta: 'sconfitto', scena: 'tramonto', mix: { spada: 2, arciere: 2, lanciere: 2, mago: 1, gigante: 1 }, mie: 6, oro: 0.8 },
  { nome: 'Medusa, regina del Chaos', vinta: 'sconfitta', scena: 'notte', mix: { strisciante: 3, morto: 2, cavaliere: 2, medusa: 1 }, mie: 6, oro: 0.75, caos: true, guardia: 'medusa' },
];
const NOTTI = [5, 10, 20];
const TORNEO = [3, 4, 5, 7, 8]; // Crown of Inamorta: le cinque nazioni da battere, una per round
const DIFF = { facile: { oro: 0.75, miniere: 3, attacco: 1.5, pausa: 1.6 }, medio: { oro: 1, miniere: 5, attacco: 1.25, pausa: 0.9 }, difficile: { oro: 1.3, miniere: 7, attacco: 1.1, pausa: 0.5 } };
const MORTE_IMPROVVISA = 12 * 60; // dopo 12 minuti le statue si sgretolano piano: la partita finisce sempre

const avanti = (lato) => (lato ? -1 : 1);
const statuaX = (lato) => (lato ? L - STATUA : STATUA);
const xDa = (lato, f) => (lato ? L - STATUA - f : STATUA + f); // dalla distanza dalla propria statua alla x
const fDa = (lato, x) => (lato ? L - STATUA - x : x - STATUA);

class StickWar extends Arena {
  constructor(o) {
    super(o, { id: 'stickwar', round: 1, tickMs: 50 });
    this.W = W; this.H = H;
    const op = o.opzioni || {};
    this.nRound = op.modo === 'torneo' ? TORNEO.length : 1;
    this.modo = ['campagna', 'torneo', 'sfida', 'nonmorti'].includes(op.modo) ? op.modo : 'campagna';
    if (this.modo === 'sfida' && this.n < 2) this.modo = 'campagna';
    this.livello = Math.max(1, Math.min(LIVELLI.length, Number(op.livello) || 1));
    this.diff = DIFF[op.difficolta] ? op.difficolta : 'medio';
    this.notti = NOTTI.includes(Number(op.notti)) ? Number(op.notti) : 5;
    // in sfida i posti pari sono l'Ordine (a sinistra), i dispari l'esercito di destra; negli altri modi stanno tutti a
    // sinistra con l'esercito in comune (anche i computer del tavolo: la tribù nemica la guida già il gioco)
    this.lati = Array.from({ length: this.n }, (_, p) => (this.modo === 'sfida' ? p % 2 : 0));
    this.menti = {};
    this.avvia();
  }

  // ---- il campo ----
  contro() { return this.modo === 'campagna' || this.modo === 'torneo'; }
  iniziaRound() {
    if (this.modo === 'torneo') this.livello = TORNEO[this.round - 1];
    const lv = LIVELLI[this.livello - 1];
    this.u = []; this.nId = 0; this.effetti = []; this.esito = null; this.vinto = null;
    this.scena = this.modo === 'nonmorti' ? 'cimitero' : this.modo === 'sfida' ? 'prato' : lv.scena;
    this.eserciti = [0, 1].map((lato) => ({
      lato, oro: 500, statua: VITA_STATUA, max: VITA_STATUA, ordine: 'difesa',
      coda: {}, pot: {}, morti: 0, uccisi: 0,
      tipi: this.tipiDi(lato),
      ia: this.modo !== 'sfida' && lato === 1,
    }));
    if (this.modo === 'nonmorti') { this.eserciti[1].statua = 0; this.eserciti[1].nessuna = true; }
    for (const e of this.eserciti) {
      if (e.nessuna) continue;
      for (let k = 0; k < 2; k++) this.nasce(e.lato, 'minatore', 60 + k * 30);
      this.nasce(e.lato, e.tipi.includes('spada') ? 'spada' : 'strisciante', 120);
    }
    // la guardia (Medusa) resta a difendere la sua statua: se partisse all'attacco subito, la partita finirebbe in due minuti
    if (this.contro() && lv.guardia) this.nasce(1, lv.guardia, 200).guardia = true;
    this.comando = new Array(this.n).fill(null); // l'unità comandata a mano da ogni giocatore
    this.dito = new Array(this.n).fill(0); // la direzione dai pulsanti sul telefono
    this.colpo = new Array(this.n).fill(0);
    this.notte = 0; this.giorno = this.modo === 'nonmorti' ? 25 : 0; this.ondata = []; this.prossimoZ = 0;
    this.winT = {};
  }
  spostaTempi() {}
  tipiDi(lato) {
    if (this.modo === 'sfida') return ORDINE.slice();
    if (lato === 0) return this.modo !== 'campagna' ? ORDINE.slice() : ORDINE.slice(0, Math.min(6, LIVELLI[this.livello - 1].mie));
    const lv = LIVELLI[this.livello - 1];
    return ['minatore', ...Object.keys(lv.mix)];
  }
  // un'unità nuova accanto alla statua (f = distanza dalla statua)
  nasce(lato, tipo, f = 60, x = null) {
    const d = UNITA[tipo], e = this.eserciti[lato], k = e.pot.armature ? 1.25 : 1;
    const u = { id: ++this.nId, tipo, lato, x: x === null ? xDa(lato, f) : x, z: ((this.nId * 37) % 100) / 100, vita: d.vita * k, max: d.vita * k, ric: 0, stato: 'f', oro: 0, t: 0, chi: -1, verso: avanti(lato), mira: null };
    this.u.push(u);
    return u;
  }
  pop(lato) { return this.u.filter((u) => u.lato === lato).reduce((s, u) => s + UNITA[u.tipo].pop, 0); }
  nemici(lato) { return this.u.filter((u) => u.lato !== lato && u.vita > 0); }

  // ---- le azioni (dai pulsanti o dal computer) ----
  azione(p, a) {
    if (!a || typeof a.tipo !== 'string') return { errore: 'Mossa non valida' };
    if (this.finita || (this.fase !== 'gioco' && this.fase !== 'via')) return { errore: 'Adesso no' };
    const lato = this.lati[p], e = this.eserciti[lato];
    if (a.tipo === 'addestra') return this.addestra(lato, a.unita);
    if (a.tipo === 'annulla') {
      const c = e.coda[a.unita];
      if (!c || !c.n) return { errore: 'Niente da annullare' };
      c.n--; if (!c.n) c.t = 0; e.oro += UNITA[a.unita].costo; this.cambiato = true;
      return { ok: true };
    }
    if (a.tipo === 'ordine') { if (!ORDINI.includes(a.quale)) return { errore: 'Ordine sconosciuto' }; e.ordine = a.quale; this.cambiato = true; return { ok: true }; }
    if (a.tipo === 'potenzia') return this.potenzia(lato, a.quale);
    if (a.tipo === 'controlla') {
      const u = this.u.find((x) => x.id === Number(a.id));
      if (!u || u.lato !== lato) return { errore: 'Non è un tuo soldato' };
      if (u.tipo === 'minatore') return { errore: 'I minatori lavorano da soli' };
      if (u.chi >= 0 && u.chi !== p) return { errore: 'Lo comanda già un compagno' };
      this.lascia(p); u.chi = p; this.comando[p] = u.id; this.cambiato = true;
      return { ok: true };
    }
    if (a.tipo === 'lascia') { this.lascia(p); this.dito[p] = 0; this.cambiato = true; return { ok: true }; }
    if (a.tipo === 'muovi') { this.dito[p] = Math.max(-1, Math.min(1, Math.round(Number(a.dir) || 0))); return { ok: true }; }
    if (a.tipo === 'colpisci') { this.colpo[p]++; return { ok: true }; }
    return { errore: 'Mossa non valida' };
  }
  // chi esce lascia il soldato che comandava (se no resterebbe fermo in campo)
  esce(p) { super.esce(p); if (this.comando) { this.lascia(p); this.dito[p] = 0; this.cambiato = true; } }
  lascia(p) { const u = this.u.find((x) => x.id === this.comando[p]); if (u) u.chi = -1; this.comando[p] = null; }
  addestra(lato, tipo) {
    const e = this.eserciti[lato], d = UNITA[tipo];
    if (!d || !e.tipi.includes(tipo)) return { errore: 'Unità non disponibile' };
    const c = e.coda[tipo] || (e.coda[tipo] = { n: 0, t: 0 });
    if (c.n >= CODA) return { errore: `Al massimo ${CODA} in coda` };
    if (e.oro < d.costo) return { errore: `Servono ${d.costo} monete` };
    e.oro -= d.costo; c.n++;
    this.cambiato = true;
    return { ok: true };
  }
  potenzia(lato, quale) {
    const e = this.eserciti[lato], d = POTENZIAMENTI[quale];
    if (!d) return { errore: 'Potenziamento sconosciuto' };
    if (e.pot[quale]) return { errore: 'Già fatto' };
    if (e.oro < d.costo) return { errore: `Servono ${d.costo} monete` };
    e.oro -= d.costo; e.pot[quale] = true;
    if (quale === 'armature') for (const u of this.u) if (u.lato === lato) { u.max *= 1.25; u.vita *= 1.25; }
    if (quale === 'statua') { e.max += 1500; e.statua += 1500; }
    this.effetti.push(['p', lato, quale]);
    this.cambiato = true;
    return { ok: true };
  }

  // ---- il mondo ----
  passo(dt) {
    this.aggiornaWin(dt);
    const t = this.tempoRound;
    for (const e of this.eserciti) if (!e.nessuna) this.produci(e, dt);
    if (this.modo === 'nonmorti') this.notti_(dt);
    for (const u of this.u.slice()) if (u.vita > 0) this.muovi(u, dt);
    // i morti escono dal campo
    for (const u of this.u) if (u.vita <= 0) this.muore(u);
    this.u = this.u.filter((u) => u.vita > 0);
    // dopo tanto tempo le statue si sgretolano piano (una partita tra due eserciti in difesa finisce comunque)
    if (t > MORTE_IMPROVVISA) for (const e of this.eserciti) if (!e.nessuna) e.statua -= e.max * 0.004 * dt;
    for (const e of this.eserciti) {
      if (e.nessuna || e.statua > 0) continue;
      e.statua = 0; this.vinto = 1 - e.lato;
      this.effetti.push(['s', e.lato]);
      return true;
    }
    if (this.modo === 'nonmorti' && this.notte >= this.notti && !this.ondata.length && !this.u.some((u) => u.lato === 1)) { this.vinto = 0; return true; }
    return false;
  }
  // !win + parola segreta: subito 1500 monete e per 25 secondi l'esercito fa il doppio dei danni
  aggiornaWin(dt) {
    for (let p = 0; p < this.n; p++) {
      if (!T.armato(this, p)) { this.winT[p] = 0; continue; }
      if (!this.winT[p]) this.eserciti[this.lati[p]].oro += 1500;
      this.winT[p] = (this.winT[p] || 0) + dt;
      if (this.winT[p] > 25) { T.consuma(this, p); this.winT[p] = 0; }
    }
  }
  potenziato(lato) { for (let p = 0; p < this.n; p++) if (this.lati[p] === lato && this.winT[p] > 0) return true; return false; }
  produci(e, dt) {
    for (const tipo of e.tipi) {
      const c = e.coda[tipo];
      if (!c || !c.n) continue;
      if (this.pop(e.lato) + UNITA[tipo].pop > POP) continue; // esercito al completo: aspetta
      c.t += dt;
      if (c.t >= UNITA[tipo].tempo) { c.t = 0; c.n--; this.nasce(e.lato, tipo); this.effetti.push(['n', e.lato, tipo]); this.cambiato = true; }
    }
  }
  // non morti: di giorno ci si prepara, di notte arrivano le ondate da destra
  notti_(dt) {
    if (this.giorno > 0) {
      this.giorno -= dt;
      if (this.giorno <= 0 && this.notte < this.notti) {
        this.notte++; this.ondata = this.compOndata(this.notte); this.prossimoZ = 0;
        this.annuncia(null, `Notte ${this.notte} di ${this.notti}: arrivano i non morti! 🌙`, '', this.notte === this.notti);
        this.effetti.push(['o', this.notte]);
      }
      return;
    }
    if (this.ondata.length) {
      this.prossimoZ -= dt;
      if (this.prossimoZ <= 0) {
        // ogni notte i non morti sono un po' più robusti
        const [dopo, tipo] = this.ondata.shift(), z = this.nasce(1, tipo, 0, L + 30), k = 1 + (this.notte - 1) * 0.08;
        z.max *= k; z.vita *= k; this.prossimoZ = dopo;
      }
    } else if (!this.u.some((u) => u.lato === 1) && this.notte < this.notti) {
      this.giorno = 25; this.eserciti[0].oro += 200 + this.notte * 50;
      this.effetti.push(['g', this.notte]);
      this.cambiato = true;
    }
  }
  compOndata(k) {
    const lista = [], quanti = 7 + Math.round(k * 3), dk = { facile: 0.8, medio: 1, difficile: 1.25 }[this.diff];
    for (let i = 0; i < quanti * dk; i++) {
      const r = (i * 7 + k * 13) % 10;
      let tipo = 'zombi';
      if (k >= 2 && r < 3) tipo = 'strisciante';
      if (k >= 3 && r === 5) tipo = 'morto';
      if (k >= 5 && r === 8) tipo = 'cavaliere';
      lista.push([tipo === 'strisciante' ? 0.6 : 1.2, tipo]);
    }
    if (k % 5 === 0) lista.push([2, k >= 10 ? 'medusa' : 'gigante']);
    return lista;
  }

  // ---- ogni unità: minatori al lavoro, soldati in formazione o all'attacco, o comandati a mano ----
  muovi(u, dt) {
    const d = UNITA[u.tipo];
    u.ric = Math.max(0, u.ric - dt);
    if (u.lento) u.lento = Math.max(0, u.lento - dt);
    if (u.chi >= 0) return this.aMano(u, d, dt);
    if (u.tipo === 'minatore') return this.lavora(u, d, dt);
    const e = this.eserciti[u.lato];
    // i non morti attaccano sempre; il computer degli eserciti usa i suoi ordini
    const ordine = this.modo === 'nonmorti' && u.lato === 1 ? 'attacco' : u.guardia ? 'difesa' : e.ordine;
    const fLinea = ordine === 'difesa' ? 260 : ordine === 'tieni' ? L * 0.38 : null;
    const bersaglio = this.bersaglio(u, d, ordine, fLinea);
    if (bersaglio) {
      const dx = bersaglio.x - u.x, dist = Math.abs(dx) - (bersaglio.statua ? 40 : 0);
      u.verso = Math.sign(dx) || u.verso;
      if (dist <= d.gitt) { u.stato = 'f'; return this.attacca(u, d, bersaglio); }
      return this.passi(u, d, Math.sign(dx), dt);
    }
    // nessun nemico: in formazione sulla linea (o avanti verso la statua nemica)
    const fx = fLinea === null ? null : xDa(u.lato, fLinea + (POSTO[u.tipo] || 0) + ((u.id * 13) % 50) - 25);
    if (fx === null) { const meta = statuaX(1 - u.lato); if (Math.abs(meta - u.x) > 30) return this.passi(u, d, Math.sign(meta - u.x), dt); }
    else if (Math.abs(fx - u.x) > 6) return this.passi(u, d, Math.sign(fx - u.x), dt);
    u.stato = 'f'; u.verso = avanti(u.lato);
  }
  passi(u, d, dir, dt) {
    u.x = Math.max(-40, Math.min(L + 40, u.x + dir * d.v * (u.lento ? 0.5 : 1) * dt));
    u.verso = dir; u.stato = 'c';
  }
  // il nemico da colpire: il più vicino che si vede (in difesa solo chi entra nel proprio campo)
  bersaglio(u, d, ordine, fLinea) {
    const vista = Math.max(d.gitt + 80, 260);
    let best = null, bd = Infinity;
    for (const n of this.u) {
      if (n.lato === u.lato || n.vita <= 0) continue;
      const dist = Math.abs(n.x - u.x);
      if (ordine === 'attacco' ? dist > vista + 120 : dist > vista) continue;
      if (ordine === 'difesa' && fDa(u.lato, n.x) > fLinea + 260) continue;
      if (ordine === 'tieni' && fDa(u.lato, n.x) > fLinea + 220) continue;
      if (dist < bd) { bd = dist; best = n; }
    }
    if (best) return best;
    // la statua nemica, se ci si arriva
    const e = this.eserciti[1 - u.lato];
    if (!e.nessuna && ordine === 'attacco' && Math.abs(statuaX(e.lato) - u.x) < vista + 40) return { statua: true, lato: e.lato, x: statuaX(e.lato) };
    return null;
  }
  danno(lato, d) { return d.danno * (this.eserciti[lato].pot.armi ? 1.25 : 1) * (this.potenziato(lato) ? 2 : 1); }
  attacca(u, d, b, molt = 1) {
    if (u.ric > 0) return;
    u.ric = d.ogni;
    const dn = this.danno(u.lato, d) * molt;
    this.effetti.push(['a', u.id, Math.round(b.x), b.statua ? -1 : b.id]);
    if (d.area) {
      // colpo ad area (magia, clava del gigante, sguardo di Medusa): tutti i nemici vicini al punto
      for (const n of this.u) if (n.lato !== u.lato && n.vita > 0 && Math.abs(n.x - b.x) < d.area) this.ferisci(n, dn, u);
      if (b.statua) this.ferisciStatua(b.lato, dn, u);
      if (u.tipo === 'medusa') for (const n of this.u) if (n.lato !== u.lato && Math.abs(n.x - b.x) < d.area) n.lento = 2;
    } else if (b.statua) this.ferisciStatua(b.lato, dn, u);
    else this.ferisci(b, dn, u);
  }
  ferisci(n, dn, da) {
    n.vita -= dn * (1 - (UNITA[n.tipo].arm || 0));
    if (n.vita <= 0 && !n.contato) {
      n.contato = true;
      this.eserciti[da.lato].uccisi++;
      for (let p = 0; p < this.n; p++) if (this.lati[p] === da.lato) this.punti[p] += Math.round(UNITA[n.tipo].costo / 10);
    }
  }
  ferisciStatua(lato, dn, da) {
    const e = this.eserciti[lato];
    e.statua -= dn;
    for (let p = 0; p < this.n; p++) if (this.lati[p] === da.lato) this.punti[p] += dn / 20;
  }
  muore(u) {
    this.effetti.push(['d', u.id, u.tipo, u.lato, Math.round(u.x), u.verso]);
    this.eserciti[u.lato].morti++;
    if (u.chi >= 0) { this.comando[u.chi] = null; this.dito[u.chi] = 0; }
    this.cambiato = true;
  }
  // il minatore: va alla miniera meno affollata, scava, riporta l'oro alla statua
  lavora(u, d, dt) {
    const e = this.eserciti[u.lato];
    if (u.oro > 0) {
      const casa = xDa(u.lato, 40);
      if (Math.abs(casa - u.x) > 8) return this.passi(u, d, Math.sign(casa - u.x), dt);
      e.oro += u.oro * (e.ia ? this.oroIa() : 1); u.oro = 0; u.min = null;
      this.effetti.push(['$', u.id]);
      return;
    }
    if (u.min === null || u.min === undefined) {
      const quanti = MINIERE.map((_, k) => this.u.filter((x) => x.lato === u.lato && x.tipo === 'minatore' && x.min === k).length);
      u.min = quanti.map((q, k) => [q + k * 0.5, k]).sort((a, b) => a[0] - b[0])[0][1]; // le vicine valgono un po' di più
    }
    const mx = xDa(u.lato, MINIERE[u.min] - 25 + ((u.id * 7) % 20));
    if (Math.abs(mx - u.x) > 8) { u.t = 0; return this.passi(u, d, Math.sign(mx - u.x), dt); }
    u.stato = 'm'; u.verso = Math.sign(xDa(u.lato, MINIERE[u.min]) - u.x) || avanti(u.lato);
    u.t += dt;
    if (u.t >= SCAVO) { u.t = 0; u.oro = ORO_VIAGGIO * (e.pot.miniera ? 1.5 : 1); }
  }
  oroIa() {
    if (!this.contro()) return DIFF[this.diff].oro;
    return DIFF[this.diff].oro * LIVELLI[this.livello - 1].oro;
  }
  // comandato a mano: più veloce e più forte; colpisce chi ha davanti
  aMano(u, d, dt) {
    const p = u.chi, i = this.inp[p];
    const dir = this.dito[p] || Math.sign(Math.round(i.x * 2) / 2);
    if (dir) { u.x = Math.max(0, Math.min(L, u.x + dir * d.v * 1.25 * dt)); u.verso = dir; u.stato = 'c'; } else u.stato = 'f';
    const colpi = this.nuoviTocchi(p) + this.colpo[p] + (i.a ? 1 : 0);
    this.colpo[p] = 0;
    if (!colpi || u.ric > 0) return;
    // il nemico più vicino davanti, nella gittata
    let best = null, bd = Infinity;
    for (const n of this.u) {
      if (n.lato === u.lato || n.vita <= 0) continue;
      const dx = (n.x - u.x) * u.verso;
      if (dx < -15 || dx > d.gitt * 1.1) continue;
      if (dx < bd) { bd = dx; best = n; }
    }
    const e = this.eserciti[1 - u.lato];
    if (!best && !e.nessuna && (statuaX(e.lato) - u.x) * u.verso > -10 && Math.abs(statuaX(e.lato) - u.x) - 40 <= d.gitt * 1.1) best = { statua: true, lato: e.lato, x: statuaX(e.lato) };
    if (best) this.attacca(u, d, best, 1.5);
    else { u.ric = d.ogni * 0.6; this.effetti.push(['a', u.id, Math.round(u.x + u.verso * d.gitt), 0]); } // colpo a vuoto
  }

  // nel torneo chi perde una battaglia è fuori: si chiude subito
  fineRound() {
    if (this.modo !== 'torneo') return;
    this.vinte = (this.vinte || 0) + (this.vinto === 0 ? 1 : 0);
    if (this.vinto !== 0) this.nRound = this.round;
  }
  chiudi() {
    super.chiudi();
    const r = this.risultato, tutti = Array.from({ length: this.n }, (_, i) => i);
    const vinti = tutti.filter((p) => this.lati[p] === this.vinto);
    r.vincitori = vinti; r.pareggio = false;
    if (this.modo === 'torneo') r.titolo = this.vinte === TORNEO.length ? 'Hai conquistato la Crown of Inamorta! 👑' : `Torneo: eliminato alla battaglia ${this.round} di ${TORNEO.length} (${LIVELLI[this.livello - 1].nome})`;
    else if (this.modo === 'sfida') r.titolo = this.vinto === null ? 'Partita finita' : `La statua ${this.vinto ? 'di sinistra' : 'di destra'} è caduta: vince ${this.vinto ? 'l\'esercito di destra' : 'l\'Order'}!`;
    else if (this.modo === 'nonmorti') r.titolo = this.vinto === 0 ? `Statua salva: ${this.notti} notti superate! 🌅` : `La statua è caduta alla notte ${this.notte} di ${this.notti} 🧟`;
    else {
      const lv = LIVELLI[this.livello - 1];
      r.titolo = this.vinto === 0 ? `Livello ${this.livello} vinto: ${lv.nome} ${lv.vinta}! 🏆` : `La tua statua è caduta (livello ${this.livello}: ${lv.nome})`;
    }
  }

  // ---- il computer: miniere, esercito secondo la sua tribù, ordini secondo le forze in campo ----
  // (la guardia conta solo per chi la deve affrontare: non parte all'attacco)
  valore(lato, guardia = true) { return this.u.filter((u) => u.lato === lato && u.tipo !== 'minatore' && (guardia || !u.guardia)).reduce((s, u) => s + UNITA[u.tipo].costo * (u.vita / u.max), 0); }
  gioca(lato, liv) {
    const e = this.eserciti[lato], B = DIFF[liv] || DIFF.medio, m = this.menti[lato] || (this.menti[lato] = { pausa: 1, scelta: null });
    m.pausa -= this.tickMs / 1000;
    if (m.pausa > 0) return;
    m.pausa = B.pausa * (0.6 + Math.random() * 0.8);
    const mie = (t) => this.u.filter((u) => u.lato === lato && u.tipo === t).length + ((e.coda[t] && e.coda[t].n) || 0);
    const mix = this.contro() && lato === 1 ? LIVELLI[this.livello - 1].mix : { spada: 3, arciere: 2, lanciere: 2, mago: 1, gigante: 1 };
    const voglio = Math.min(B.miniere + (this.tempoRound > 120 ? 1 : 0), 9);
    const minacciato = this.u.some((u) => u.lato !== lato && u.tipo !== 'minatore' && fDa(lato, u.x) < 600);
    // potenziamenti quando avanza oro
    if (liv !== 'facile' && e.oro > 1500) for (const q of ['miniera', 'armi', 'armature']) if (!e.pot[q] && e.oro >= POTENZIAMENTI[q].costo + 600) { this.potenzia(lato, q); break; }
    if (mie('minatore') < voglio && (!minacciato || mie('minatore') < 2) && e.oro >= UNITA.minatore.costo) this.addestra(lato, 'minatore');
    else {
      // l'unità più "in ritardo" rispetto al suo peso nella tribù (il difficile risponde ai giganti con i maghi e agli
      // arcieri con gli spadaccini)
      if (!m.scelta) {
        const pesi = { ...mix };
        if (liv === 'difficile') {
          const loro = (t) => this.u.filter((u) => u.lato !== lato && u.tipo === t).length;
          if (loro('arciere') + loro('morto') > 3 && pesi.spada) pesi.spada += 2;
          if (loro('gigante') + loro('cavaliere') > 0 && pesi.mago) pesi.mago += 1;
        }
        const tipi = Object.keys(pesi).filter((t) => e.tipi.includes(t));
        m.scelta = tipi.sort((a, b) => mie(a) / pesi[a] - mie(b) / pesi[b] || UNITA[a].costo - UNITA[b].costo)[0];
      }
      if (m.scelta && e.oro >= UNITA[m.scelta].costo) { if (!this.addestra(lato, m.scelta).errore) m.scelta = null; else m.scelta = null; }
      else if (m.scelta && liv === 'facile' && Math.random() < 0.3) m.scelta = null;
    }
    // ordini: all'attacco quando si è più forti, in difesa quando si è più deboli
    const mio = this.valore(lato, false), loro = this.valore(1 - lato), pieno = this.pop(lato) >= POP - 3;
    if (e.ordine !== 'attacco' && (pieno || (mio > 900 && mio > loro * B.attacco) || (mio > 600 && this.eserciti[1 - lato].statua < this.eserciti[1 - lato].max * 0.3))) e.ordine = 'attacco';
    else if (e.ordine === 'attacco' && mio < loro * 0.75 && !pieno) e.ordine = minacciato ? 'difesa' : 'tieni';
    else if (e.ordine === 'difesa' && mio > 500 && !minacciato && liv !== 'facile') e.ordine = 'tieni';
  }
  pensa(p, liv) {
    if (this.fase !== 'gioco') return {};
    const lato = this.lati[p];
    // in squadra decide solo il primo computer dell'esercito, e solo se non c'è nessuno di persona
    const primo = this.lati.findIndex((l, q) => l === lato && this.bot[q]);
    const umani = this.lati.some((l, q) => l === lato && !this.bot[q]);
    if (primo === p && !umani && !this.eserciti[lato].ia && !this.eserciti[lato].nessuna) this.gioca(lato, liv);
    return {};
  }
  // il computer interno (tribù della campagna) gioca dopo ogni tick
  tick(ora) {
    const r = super.tick(ora);
    if (this.fase === 'gioco' && !this.finita && !this.inPausa) {
      const e = this.eserciti[1];
      if (e.ia && this.contro()) this.gioca(1, this.diff);
    }
    return r;
  }

  vistaExtra() {
    return {
      W, H, L, STATUA, POP, CODA, modo: this.modo, scena: this.scena, livello: this.livello, notti: this.notti,
      lati: this.lati, miniere: MINIERE, nomeLivello: this.contro() ? LIVELLI[this.livello - 1].nome : null, torneo: this.modo === 'torneo' ? TORNEO.length : null,
      unita: Object.fromEntries(Object.entries(UNITA).map(([k, d]) => [k, { nome: d.nome, costo: d.costo, tempo: d.tempo, pop: d.pop, gitt: d.gitt }])),
      pot: Object.fromEntries(Object.entries(POTENZIAMENTI).map(([k, d]) => [k, { nome: d.nome, costo: d.costo, testo: d.testo }])),
      caos: this.modo === 'nonmorti' || (this.contro() && !!LIVELLI[this.livello - 1].caos),
    };
  }
  statoTick() {
    const r = Math.round, eff = this.effetti; this.effetti = [];
    return {
      u: this.u.map((u) => [u.id, u.tipo, u.lato, r(u.x), u.z, r((u.vita / u.max) * 100), u.stato, u.verso, u.chi, u.oro > 0 ? 1 : 0, u.lento ? 1 : 0]),
      e: eff,
      es: this.eserciti.map((e) => ({ oro: Math.floor(e.oro), st: Math.max(0, r(e.statua)), max: e.max, o: e.ordine, c: Object.fromEntries(Object.entries(e.coda).filter(([, c]) => c.n).map(([k, c]) => [k, [c.n, Math.round((c.t / UNITA[k].tempo) * 100)]])), pot: Object.keys(e.pot), pop: this.pop(e.lato), tipi: e.tipi })),
      cm: this.comando.slice(), nt: this.notte, gi: this.giorno > 0 ? Math.ceil(this.giorno) : 0,
      w: Object.keys(this.winT).filter((k) => this.winT[k] > 0).map(Number),
    };
  }
}

module.exports = {
  meta: {
    id: 'stickwar',
    nome: 'Stick War',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [1, 2, 3, 4],
    descrizione: 'Come Stick War: Legacy. Miner, Swordwrath, Archidon, Spearton, Magikill e Giant: raccogli l\'oro, addestra l\'esercito dell\'Order, dai gli ordini o comanda un soldato a mano e distruggi la statua nemica. Campagna, torneo Crown of Inamorta, sfida ed Endless Deads.',
    alias: ['guerra degli stecchini', 'stick war', 'stickwar', 'stick war legacy', 'stecchini', 'stickman'],
    opzioni: [
      { id: 'modo', nome: 'Modalità', valori: ['campagna', 'torneo', 'sfida', 'nonmorti'], etichette: ['Campagna classica', 'Torneo: Crown of Inamorta', 'Sfida (uno contro uno)', 'Endless Deads (non morti)'], predefinito: 'campagna' },
      { id: 'livello', nome: 'Livello della campagna', valori: LIVELLI.map((_, k) => k + 1), etichette: LIVELLI.map((l, k) => `${k + 1}. ${l.nome}`), predefinito: 1, se: { modo: ['campagna'] } },
      { id: 'notti', nome: 'Notti di Endless Deads', valori: NOTTI, etichette: NOTTI.map((n) => `${n} notti`), predefinito: 5, se: { modo: ['nonmorti'] } },
      { id: 'difficolta', nome: 'Difficoltà', valori: ['facile', 'medio', 'difficile'], etichette: ['Facile', 'Media', 'Difficile'], predefinito: 'medio' },
    ],
    regole: [
      'Ogni esercito ha una statua: chi perde la statua perde la battaglia. I Miner scavano l\'oro nelle miniere vicino alla statua e lo riportano indietro; con l\'oro si addestrano i soldati (pulsanti in basso, fino a 5 in coda per tipo, al massimo 40 posti nell\'esercito).',
      'Unità dell\'Order: Miner (150, raccoglie oro), Swordwrath (125, spadaccino veloce), Archidon (300, arciere che tira da lontano), Spearton (500, scudo e lancia, regge la prima linea), Magikill (900, magia che colpisce tutti i nemici vicini) e Giant (1500, lento ma fortissimo).',
      'Tre ordini per tutto l\'esercito: 🛡️ Difesa (davanti alla statua), ✋ Tieni la linea (a metà del proprio campo) e ⚔️ Attacco (avanti fino alla statua nemica). In formazione gli Spearton stanno davanti e Archidon e Magikill dietro.',
      'Clicca (o tocca) un tuo soldato per comandarlo a mano: si muove con A/D o le frecce e colpisce con lo spazio (sul telefono con i pulsanti). Comandato va più veloce e fa il 50% di danni in più. "Lascia" lo rimette con gli altri.',
      'Potenziamenti nell\'armeria (valgono per la partita): picconi d\'oro (+50% oro), armi affilate (+25% danni), armature (+25% vita) e statua di pietra (+1500 vita).',
      'Campagna classica: 8 livelli contro nazioni diverse (Swordwrath, Archidonis, Speartos, Magikill, Giant, l\'orda del Chaos con Crawler, Dead e Juggerknight, l\'Order ribelle e Medusa), ognuna col suo paesaggio; a ogni livello hai un\'unità in più. Torneo Crown of Inamorta: 5 battaglie di fila con tutte le unità, alla prima sconfitta sei fuori. In più giocatori l\'esercito è in comune (anche coi computer del tavolo). Sfida: uno contro uno (posti pari a sinistra, dispari a destra). Endless Deads: di giorno ti prepari, di notte arrivano i non morti, sempre di più.',
      'Il computer facile ha meno oro e attacca tardi; il medio bilancia miniere ed esercito; il difficile ha più oro, compra i potenziamenti e risponde a quello che schieri tu.',
    ],
  },
  crea: (o) => new StickWar(o),
  bot: () => ({}),
  _test: { StickWar, TORNEO, UNITA, LIVELLI, POTENZIAMENTI, MINIERE, L, STATUA, VITA_STATUA, POP },
};
