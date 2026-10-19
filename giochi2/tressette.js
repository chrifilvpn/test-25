// TRESSETTE: il classico gioco di prese con le 40 carte, in due (con la pescata scoperta) o in quattro a coppie.
// Si risponde al seme, prende la carta più forte del seme uscito (3, 2, asso, re, cavallo/donna, fante, 7, 6, 5, 4),
// i punti si contano a terzi: asso 3 terzi, 3, 2 e figure 1 terzo, l'ultima presa 3 terzi (11 punti a smazzata).
const { mazzo40, mescola, casuale } = require('../giochi/carte');
const T = require('../giochi/trucco');

const SEMI = ['c', 'q', 'f', 'p'];
const NOMI_SEMI = { c: 'cuori', q: 'quadri', f: 'fiori', p: 'picche' };
const NOMI_RANGHI = { 1: 'asso', 2: 'due', 3: 'tre', 11: 'fante', 12: 'cavallo', 13: 're' };
const FORZA = { 3: 10, 2: 9, 1: 8, 13: 7, 12: 6, 11: 5, 7: 4, 6: 3, 5: 2, 4: 1 };
const forza = (c) => FORZA[c.rango];
const terzi = (c) => (c.rango === 1 ? 3 : c.rango === 2 || c.rango === 3 || c.rango >= 11 ? 1 : 0);
const TUTTE = mazzo40();
const PER_ID = Object.fromEntries(TUTTE.map((c) => [c.id, c]));
const nomeCarta = (c) => `${NOMI_RANGHI[c.rango] || c.rango} di ${NOMI_SEMI[c.seme]}`;
// "7 ⅔": i terzi scritti come punti e frazione
const scriviTerzi = (t) => { const p = Math.floor(t / 3), r = t % 3; return r ? `${p ? p : ''}${p ? ' ' : ''}${r === 1 ? '⅓' : '⅔'}` : String(p); };

// chi prende: la carta più forte del seme di chi ha aperto
function vincitoreDi(tavolo) {
  let m = tavolo[0];
  for (const g of tavolo.slice(1)) if (g.carta.seme === m.carta.seme && forza(g.carta) > forza(m.carta)) m = g;
  return m.posto;
}
// carte che si possono giocare: c'è l'obbligo di rispondere al seme
function valide(mano, tavolo) {
  if (!tavolo.length) return mano;
  const s = tavolo[0].carta.seme;
  const stesse = mano.filter((c) => c.seme === s);
  return stesse.length ? stesse : mano;
}
// accusi di una mano appena data: napoletana (asso, 2 e 3 dello stesso seme) = 3 punti;
// tre o quattro assi, due o tre = 3 o 4 punti
function accusiDi(mano) {
  const out = [];
  for (const s of SEMI) {
    if ([1, 2, 3].every((r) => mano.some((c) => c.rango === r && c.seme === s))) out.push({ tipo: 'napoletana', seme: s, punti: 3, carte: [`1${s}`, `2${s}`, `3${s}`] });
  }
  for (const r of [1, 2, 3]) {
    const cs = mano.filter((c) => c.rango === r);
    if (cs.length >= 3) out.push({ tipo: 'gruppo', rango: r, punti: cs.length, carte: cs.map((c) => c.id) });
  }
  return out;
}
const PLURALI = { 1: 'assi', 2: 'due', 3: 'tre' };
const nomeAccuso = (a) => (a.tipo === 'napoletana' ? `napoletana a ${NOMI_SEMI[a.seme]}` : `${a.punti === 4 ? 'quattro' : 'tre'} ${PLURALI[a.rango]}`);

// il trucco segreto (!win): porta nella mano la prima carta che va bene, presa da una delle fonti (mazzo o mani degli
// altri), dando in cambio la carta peggiore tra quelle non da tenere: niente doppioni, il numero di carte non cambia
function prendiCarta(mano, fonti, vuoi, tieni, peggiore) {
  const gia = mano.find((c) => vuoi(c) && !tieni.has(c));
  if (gia) { tieni.add(gia); return gia; }
  const via = peggiore(mano.filter((c) => !tieni.has(c)));
  if (!via) return null;
  for (const f of fonti) {
    const i = f.findIndex(vuoi);
    if (i < 0) continue;
    const c = f[i];
    f[i] = via;
    mano[mano.indexOf(via)] = c;
    tieni.add(c);
    return c;
  }
  return null;
}

class Tressette {
  constructor({ n, primo = 0, opzioni = {} }) {
    this.id = 'tressette';
    this.n = n === 4 ? 4 : 2;
    this.aSquadre = this.n === 4;
    this.obiettivo = Number(opzioni.punti) || 21;
    this.accuso = !(opzioni.accuso === false || opzioni.accuso === 'false');
    this.totali = [0, 0];
    this.mazziere = (primo - 1 + this.n) % this.n;
    this.nSmazzata = 0;
    this.nEv = 0;
    this.evento = null;
    this.finita = false;
    this.risultato = null;
    this.pausaMs = 1400;
    this.nGiocate = 0;
    this.nuovaSmazzata();
  }

  fazione(p) { return p % 2; }
  postiFazione(f) { return this.aSquadre ? [f, f + 2] : [f]; }
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }

  nuovaSmazzata() {
    const n = this.n;
    this.mazziere = (this.mazziere + 1) % n;
    const primo = (this.mazziere + 1) % n;
    this.mazzo = mescola(mazzo40());
    this.mani = Array.from({ length: n }, () => []);
    for (let g = 0; g < 10; g++) for (let k = 0; k < n; k++) this.mani[(primo + k) % n].push(this.mazzo.pop());
    for (let p = 0; p < n; p++) if (T.consuma(this, p)) this.truccaMano(p);
    this.prese = [[], []];
    this.maniVinte = new Array(n).fill(0);
    this.tavolo = [];
    this.ultimaMano = null;
    this.pescate = null;
    this.mancano = Array.from({ length: n }, () => []); // semi a cui uno non ha risposto (lo sanno tutti)
    this.noti = Array.from({ length: n }, () => []); // carte in mano che tutti conoscono (accusi, pescate)
    this.accusiMano = this.mani.map((m) => (this.accuso ? accusiDi(m) : []));
    this.dichiarato = new Array(n).fill(false);
    this.accusati = [];
    this.ultimaPresa = null;
    this.turno = primo;
    this.fase = 'gioco';
    this.inAttesa = false;
    this.riepilogo = null;
    this.pausaMs = 1400;
  }

  // il trucco segreto (!win): la mano appena data ha la napoletana e gli assi e i tre, presi dal mazzo o dalle mani
  // degli avversari in cambio delle carte più deboli
  truccaMano(p) {
    const mano = this.mani[p];
    const fonti = [this.mazzo, ...this.mani.filter((m, q) => m !== mano && this.fazione(q) !== this.fazione(p))];
    const tieni = new Set();
    const peggiore = (cs) => T.migliore(cs, (c) => -(terzi(c) * 10 + forza(c)));
    // il seme della napoletana: quello di cui ne ha già di più tra asso, 2 e 3
    const quanteDi = (s) => mano.filter((c) => c.seme === s && c.rango <= 3).length;
    const s = [...SEMI].sort((a, b) => quanteDi(b) - quanteDi(a))[0];
    for (const r of [1, 2, 3]) prendiCarta(mano, fonti, (c) => c.rango === r && c.seme === s, tieni, peggiore);
    for (let k = 0; k < 2; k++) prendiCarta(mano, fonti, (c) => c.rango === 1, tieni, peggiore);
    for (let k = 0; k < 2; k++) prendiCarta(mano, fonti, (c) => c.rango === 3, tieni, peggiore);
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inAttesa) return { errore: 'Aspetta che si raccolga la mano' };
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    if (!a || a.tipo !== 'gioca' || typeof a.carta !== 'string') return { errore: 'Mossa non valida' };
    const mano = this.mani[p];
    const i = mano.findIndex((c) => c.id === a.carta);
    if (i < 0) return { errore: 'Non hai questa carta' };
    const carta = mano[i];
    if (!valide(mano, this.tavolo).includes(carta)) return { errore: `Devi rispondere a ${NOMI_SEMI[this.tavolo[0].carta.seme]}` };
    // alla prima carta giocata si dichiarano gli accusi (li fa il computer per tutti)
    if (!this.dichiarato[p]) {
      this.dichiarato[p] = true;
      const acc = this.accusiMano[p];
      if (acc.length) {
        for (const x of acc) { this.accusati.push({ posto: p, ...x }); this.noti[p].push(...x.carte.filter((id) => !this.noti[p].includes(id))); }
        const testo = acc.map((x) => `${nomeAccuso(x)} (+${x.punti})`).join(' e ');
        this.annuncia(p, `accusa ${testo}`, `accusi ${testo}`, true);
      }
    }
    mano.splice(i, 1);
    if (this.tavolo.length && carta.seme !== this.tavolo[0].carta.seme && !this.mancano[p].includes(this.tavolo[0].carta.seme)) this.mancano[p].push(this.tavolo[0].carta.seme);
    this.noti[p] = this.noti[p].filter((id) => id !== carta.id);
    this.tavolo.push({ posto: p, carta });
    this.nGiocate++;
    if (this.tavolo.length === this.n) { this.inAttesa = true; this.turno = null; this.pausaMs = 1400; }
    else this.turno = (p + 1) % this.n;
    return { ok: true };
  }

  avanza() {
    if (this.fase === 'riepilogo') { if (!this.finita) this.nuovaSmazzata(); return; }
    if (this.tavolo.length < this.n) { this.inAttesa = false; return; }
    const v = vincitoreDi(this.tavolo);
    const carte = this.tavolo.map((g) => g.carta);
    this.prese[this.fazione(v)].push(...carte);
    this.maniVinte[v]++;
    this.ultimaMano = { tavolo: this.tavolo, vincitore: v };
    this.tavolo = [];
    this.inAttesa = false;
    // in due si pesca: prima chi ha preso, poi l'altro; le carte pescate si mostrano a tutti
    if (this.mazzo.length >= this.n) {
      this.pescate = [];
      for (let k = 0; k < this.n; k++) {
        const q = (v + k) % this.n;
        // il trucco segreto (!win), in due: si pesca la carta più forte che c'è ancora nel mazzo (un tre, un asso…)
        if (T.consuma(this, q)) { const alta = T.migliore(this.mazzo, (x) => terzi(x) * 10 + forza(x)); T.inCima(this.mazzo, (x) => x === alta); }
        const c = this.mazzo.pop();
        this.mani[q].push(c);
        this.noti[q].push(c.id);
        this.pescate.push({ posto: q, carta: c });
      }
    } else this.pescate = null;
    if (this.mani.every((m) => m.length === 0)) {
      this.ultimaPresa = v;
      this.annuncia(v, 'fa l\'ultima presa (+1)', 'fai l\'ultima presa (+1)');
      this.fineSmazzata();
      return;
    }
    const t = carte.reduce((s, c) => s + terzi(c), 0);
    if (t) this.annuncia(v, `prende ${scriviTerzi(t)}`, `prendi ${scriviTerzi(t)}`);
    this.turno = v;
  }

  fineSmazzata() {
    const righe = [0, 1].map((f) => {
      const t = this.prese[f].reduce((s, c) => s + terzi(c), 0) + (this.fazione(this.ultimaPresa) === f ? 3 : 0);
      const acc = this.accusati.filter((a) => this.fazione(a.posto) === f).reduce((s, a) => s + a.punti, 0);
      const puntiCarte = Math.floor(t / 3);
      const punti = puntiCarte + acc;
      this.totali[f] += punti;
      return { posti: this.postiFazione(f), carte: this.prese[f].length, terzi: t, puntiCarte, ultima: this.fazione(this.ultimaPresa) === f, accusi: acc, punti, totale: this.totali[f] };
    });
    this.nSmazzata++;
    this.riepilogo = { smazzata: this.nSmazzata, righe, accusati: this.accusati.map((a) => ({ posto: a.posto, nome: nomeAccuso(a), punti: a.punti })), ultimaPresa: this.ultimaPresa };
    const max = Math.max(...this.totali);
    if (max >= this.obiettivo && this.totali[0] !== this.totali[1]) {
      const fv = this.totali.indexOf(max);
      this.finita = true;
      this.risultato = {
        fazioni: this.totali.map((t, f) => ({ posti: this.postiFazione(f), punti: t })),
        etichetta: 'punti', pareggio: false, vincitori: this.postiFazione(fv),
      };
    }
    this.fase = 'riepilogo';
    this.turno = null;
    this.inAttesa = !this.finita;
    this.pausaMs = 14000;
  }

  vista(p) {
    const mioTurno = this.turno === p && !this.inAttesa && !this.finita;
    return {
      gioco: this.id,
      n: this.n,
      aSquadre: this.aSquadre,
      mano: this.mani[p] || [],
      valide: mioTurno ? valide(this.mani[p], this.tavolo).map((c) => c.id) : null,
      carteInMano: this.mani.map((m) => m.length),
      tavolo: this.tavolo,
      giocate: this.nGiocate,
      vince: this.tavolo.length ? vincitoreDi(this.tavolo) : null,
      ultimaMano: this.ultimaMano,
      pescate: this.pescate,
      mazzo: this.mazzo.length,
      maniVinte: this.maniVinte,
      accusati: this.accusati.map((a) => ({ posto: a.posto, nome: nomeAccuso(a), punti: a.punti, carte: a.carte })),
      accuso: this.accuso,
      totali: this.totali,
      obiettivo: this.obiettivo,
      mazziere: this.mazziere,
      turno: this.turno,
      inAttesa: this.inAttesa,
      pausaMs: this.pausaMs,
      fase: this.fase,
      riepilogo: this.riepilogo,
      finita: this.finita,
      risultato: this.risultato,
      evento: this.evento,
    };
  }
}

// ======================= COMPUTER =======================
// Una carta è "sicura" se tutte le carte più forti del suo seme sono già uscite o sono in mano a chi la gioca.
const PIU_FORTI = Object.fromEntries(TUTTE.map((c) => [c.id, TUTTE.filter((x) => x.seme === c.seme && forza(x) > forza(c)).map((x) => x.id)]));
const VUOTO = new Set();
function sicura(c, mie, fuori) {
  for (const id of PIU_FORTI[c.id]) if (!fuori.has(id) && !mie.has(id)) return false;
  return true;
}

// Scelta "di buon senso" (computer medio, e tutti i giocatori nelle simulazioni del difficile).
// fuori: carte già uscite che il giocatore ricorda (il medio solo quelle in tavola).
function scegliBuonSenso(mano, tavolo, n, p, fuori) {
  const mosse = valide(mano, tavolo);
  if (mosse.length === 1) return mosse[0];
  const mie = new Set(mano.map((c) => c.id));
  const lunghezza = (s) => mano.filter((c) => c.seme === s).length;
  // quanto "costa" buttare via una carta che non prende
  const costo = (c) => {
    let k = terzi(c) * 3 + forza(c) * 0.15;
    if ((c.rango === 3 || c.rango === 2) && sicura(c, mie, fuori)) k += 2.5; // carta che prenderà più avanti
    if (c.rango === 2 && !sicura(c, mie, fuori)) k += 1;
    return k;
  };
  const piuEconomica = (cs) => cs.reduce((a, b) => (costo(b) < costo(a) ? b : a));

  if (!tavolo.length) {
    // apro: prima incasso le carte sicure che portano punti, poi un liscio dal seme più lungo
    const sicure = mosse.filter((c) => sicura(c, mie, fuori));
    if (sicure.length) {
      const conPunti = sicure.filter((c) => terzi(c) > 0 || mano.some((m) => m.seme === c.seme && m.rango === 1));
      if (conPunti.length) return conPunti.reduce((a, b) => (forza(b) > forza(a) ? b : a));
    }
    const lead = (c) => {
      let k = costo(c) - lunghezza(c.seme) * 0.4;
      if (c.rango === 1) k += 6; // l'asso aperto lo mangiano il 2 e il 3
      if (c.rango === 2 && !sicura(c, mie, fuori)) k += 3;
      return k;
    };
    return mosse.reduce((a, b) => (lead(b) < lead(a) ? b : a));
  }

  const seme = tavolo[0].carta.seme;
  const vince = vincitoreDi(tavolo);
  const cartaVince = tavolo.find((g) => g.posto === vince).carta;
  const ultimo = tavolo.length === n - 1;
  const punteggioTavolo = tavolo.reduce((s, g) => s + terzi(g.carta), 0);
  const tutteNote = tavolo.every((g) => fuori.has(g.carta.id)) ? fuori : new Set([...fuori, ...tavolo.map((g) => g.carta.id)]);
  const compagno = n === 4 && vince % 2 === p % 2;
  if (compagno) {
    // il compagno sta prendendo: se è sicuro (o sono l'ultimo) gli do punti ("carico"), altrimenti liscio
    const tiene = ultimo || sicura(cartaVince, VUOTO, tutteNote) || (sicura(cartaVince, mie, tutteNote) && tavolo.length === 2);
    if (tiene) {
      const carichi = mosse.filter((c) => terzi(c) > 0 && !((c.rango === 3 || c.rango === 2) && sicura(c, mie, fuori) && c.seme !== seme));
      if (carichi.length) return carichi.reduce((a, b) => (terzi(b) * 10 - forza(b) > terzi(a) * 10 - forza(a) ? b : a));
    }
    return piuEconomica(mosse);
  }
  const vincenti = mosse.filter((c) => c.seme === seme && forza(c) > forza(cartaVince));
  if (vincenti.length) {
    // prendo se sono l'ultimo o se la mia carta non la batte più nessuno
    const buone = vincenti.filter((c) => ultimo || sicura(c, mie, tutteNote));
    if (buone.length) {
      const guadagno = (c) => punteggioTavolo + terzi(c) - (c.rango === 3 || c.rango === 2 ? 1.2 : 0) + (c.rango === 1 ? 2 : 0);
      const migliore = buone.reduce((a, b) => (guadagno(b) > guadagno(a) ? b : a));
      if (guadagno(migliore) > -0.5 || punteggioTavolo > 0) return migliore;
    }
  }
  // non prendo: butto la carta che costa meno (mai l'asso se posso evitarlo)
  return piuEconomica(mosse);
}

// stato pubblico visto da p: carte uscite, semi mancanti, carte note in mano agli altri
function conoscenza(g, p) {
  const fuori = new Set([...g.prese[0], ...g.prese[1]].map((c) => c.id));
  for (const x of g.tavolo) fuori.add(x.carta.id);
  return fuori;
}

// distribuisce a caso le carte che p non vede, rispettando le carte note e i semi mancanti
function immagina(g, p, fuori) {
  const n = g.n;
  const mie = new Set(g.mani[p].map((c) => c.id));
  const noti = g.noti.map((x, q) => (q === p ? [] : x.filter((id) => !fuori.has(id))));
  const notiTutti = new Set(noti.flat());
  const ignote = TUTTE.filter((c) => !fuori.has(c.id) && !mie.has(c.id) && !notiTutti.has(c.id));
  const vincolati = (c) => g.mancano.filter((m, q) => q !== p && m.includes(c.seme)).length;
  for (let tentativo = 0; tentativo < 30; tentativo++) {
    const mani = Array.from({ length: n }, (_, q) => (q === p ? [...g.mani[p]] : noti[q].map((id) => PER_ID[id])));
    const resto = [];
    // prima le carte dei semi che qualcuno non ha; ognuna va a caso (in proporzione ai posti liberi)
    // a chi la può avere, oppure nel mazzo
    const pool = mescola([...ignote]).sort((a, b) => vincolati(b) - vincolati(a));
    let ok = true;
    for (const c of pool) {
      const cand = [];
      for (let q = 0; q < n; q++) {
        const posto = g.mani[q].length - mani[q].length;
        if (q !== p && posto > 0 && (tentativo >= 20 || !g.mancano[q].includes(c.seme))) cand.push([q, posto]);
      }
      if (g.mazzo.length > resto.length) cand.push([-1, g.mazzo.length - resto.length]);
      if (!cand.length) { ok = false; break; }
      let r = Math.random() * cand.reduce((s, x) => s + x[1], 0);
      let scelto = cand[cand.length - 1][0];
      for (const [q, k] of cand) { r -= k; if (r < 0) { scelto = q; break; } }
      if (scelto < 0) resto.push(c); else mani[scelto].push(c);
    }
    if (ok && mani.every((m, q) => m.length === g.mani[q].length)) return { mani, mazzo: mescola(resto) };
  }
  return null;
}

// gioca fino alla fine della smazzata con il buon senso per tutti; restituisce i terzi delle due fazioni da qui in poi
function simula(n, mani, tavolo, mazzo, turno, fuori) {
  const fatti = [0, 0];
  fuori = new Set(fuori);
  for (const x of tavolo) fuori.add(x.carta.id);
  tavolo = [...tavolo];
  let t = turno;
  for (let passi = 0; passi < 200; passi++) {
    if (tavolo.length === n) {
      const v = vincitoreDi(tavolo);
      fatti[v % 2] += tavolo.reduce((s, x) => s + terzi(x.carta), 0);
      tavolo = [];
      if (mazzo.length >= n) for (let k = 0; k < n; k++) mani[(v + k) % n].push(mazzo.pop());
      if (mani.every((m) => !m.length)) { fatti[v % 2] += 3; break; }
      t = v;
    }
    const c = scegliBuonSenso(mani[t], tavolo, n, t, fuori);
    mani[t] = mani[t].filter((x) => x !== c);
    tavolo.push({ posto: t, carta: c });
    fuori.add(c.id);
    t = (t + 1) % n;
  }
  return fatti;
}

function bot(g, p, livello) {
  const mano = g.mani[p];
  const mosse = valide(mano, g.tavolo);
  const gioca = (c) => ({ tipo: 'gioca', carta: c.id });
  if (mosse.length === 1) return gioca(mosse[0]);
  if (livello === 'facile' && Math.random() < 0.7) return gioca(casuale(mosse));
  if (livello !== 'difficile') {
    // il medio ricorda solo le carte in tavola
    return gioca(scegliBuonSenso(mano, g.tavolo, g.n, p, new Set(g.tavolo.map((x) => x.carta.id))));
  }
  // DIFFICILE: conta le carte uscite e sa chi non ha più un seme; prova ogni carta su tante distribuzioni
  // possibili delle carte che non vede (giocando poi tutti con buon senso) e sceglie quella che rende di più
  // alla sua coppia
  const fuori = conoscenza(g, p);
  const quante = process.env.TEST_VELOCE ? 10 : 36;
  const somma = new Map(mosse.map((c) => [c.id, 0]));
  for (let k = 0; k < quante; k++) {
    const mondo = immagina(g, p, fuori);
    if (!mondo) break;
    for (const c of mosse) {
      const mani = mondo.mani.map((m) => [...m]);
      mani[p] = mani[p].filter((x) => x.id !== c.id);
      const tavolo = [...g.tavolo, { posto: p, carta: c }];
      const f = simula(g.n, mani, tavolo, [...mondo.mazzo], (p + 1) % g.n, fuori);
      somma.set(c.id, somma.get(c.id) + f[p % 2] - f[1 - (p % 2)]);
    }
  }
  const migliore = mosse.reduce((a, b) => (somma.get(b.id) > somma.get(a.id) ? b : a));
  return gioca(migliore);
}

module.exports = {
  meta: {
    id: 'tressette',
    nome: 'Tressette',
    tipo: 'carte',
    giocatori: [2, 4],
    alias: ['tresette', 'tre sette', 'terziglio'],
    descrizione: 'Rispondi al seme e fai tuoi assi, tre e due: in due con la pescata scoperta, in quattro a coppie.',
    opzioni: [
      { id: 'punti', nome: 'Si vince a', valori: [21, 31], predefinito: 21 },
      { id: 'accuso', nome: 'Accuso', valori: [true, false], etichette: ['Sì', 'No'], predefinito: true },
    ],
    regole: [
      'Si gioca con 40 carte: dall\'asso al 7, più fante, cavallo (la donna) e re. Ognuno riceve 10 carte.',
      'Chi è dopo il mazziere apre la prima mano; poi apre chi ha preso. C\'è l\'obbligo di rispondere al seme uscito: solo chi non ha quel seme può giocare un\'altra carta. Non ci sono briscole.',
      'Prende la carta più forte del seme uscito. Ordine di forza: 3, 2, asso, re, cavallo, fante, 7, 6, 5, 4.',
      'Punti a terzi: l\'asso vale 1 punto, il 3, il 2 e le figure 1/3 di punto, le altre carte niente. L\'ultima presa vale 1 punto. A fine smazzata i terzi avanzati si perdono (si arrotonda per difetto): in tutto si fanno 11 punti.',
      'In due: dopo ogni presa si pesca una carta dal mazzo, prima chi ha preso, poi l\'altro. La carta pescata si mostra a tutti (resta scoperta sul tavolo fino alla presa successiva). Finito il mazzo si giocano le ultime 10 carte.',
      'In quattro: si gioca a coppie fisse con chi sta di fronte e non si pesca. Non si parla e non si fanno segnali al compagno.',
      'Accuso (se attivo): chi ha in mano fin dall\'inizio asso, 2 e 3 dello stesso seme (napoletana) fa 3 punti; tre assi, tre 2 o tre 3 valgono 3 punti, tutti e quattro 4 punti. L\'accuso si dichiara da solo quando si gioca la prima carta, e tutti vedono le carte dichiarate.',
      'Le carte in mano sono in ordine di seme e di forza; quando tocca a te quelle che non puoi giocare sono più scure. Il numerino in alto a destra dice quanto vale la carta (1 l\'asso, ⅓ il 3, il 2 e le figure).',
      'Vince chi arriva per primo ai punti stabiliti (21 o 31). Se a fine smazzata le due parti sono pari si gioca un\'altra smazzata.',
      'Il computer: il facile gioca carte valide quasi a caso; il medio ragiona sulla mano in corso (prende quando conviene, scarta i lisci, dà punti al compagno che prende); il difficile conta le carte uscite, sa chi non ha più un seme, ricorda le carte pescate e accusate e prova le giocate possibili prima di scegliere, giocando con il compagno.',
    ],
  },
  crea: (o) => new Tressette(o),
  bot,
  _test: { vincitoreDi, valide, accusiDi, terzi, forza, scriviTerzi, sicura, scegliBuonSenso },
};
