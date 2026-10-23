// DRAGHI E SEGRETE: le ambientazioni horror giocate A TURNI (la modalità classica: il master racconta, voi scrivete
// cosa fate, i combattimenti sulla mappa tattica). Si aggiungono a Draghi (draghi.js) con Object.assign sul prototipo.
// La campagna (horror.js) è una mappa di settori collegati: il gruppo sta in un settore, può andare in quelli vicini
// (porte, ascensori, tram, condotti; alcuni chiusi finché non trova l'oggetto giusto), frugare, nascondersi, usare il
// rilevatore, costruire oggetti, accendere e spegnere la torcia, curarsi. Gli obiettivi si fanno uno dopo l'altro fino
// al finale. Ogni mossa fa passare il tempo: la creatura (che non si uccide) si sposta tra i settori, verso il rumore;
// se arriva dove siete e non siete tutti nascosti (o vi trova), si combatte. Le batterie si scaricano al buio, la
// paura sale (con 7 o più le prove hanno svantaggio).
const R = require('./regole');
const B = require('./base');
const H = require('./horror');
const { CLASSI } = require('./classi');
const { MOSTRI } = require('./mostri');
const MASTER = require('./master');
const { RUMORE_ARRIVA } = require('./incubo-scontro');
const D = require('./direttore');

const LUCE_SCENA = { accesa: 'torce', emergenza: 'emergenza', buio: 'buio' };
const caso = (a) => a[Math.floor(Math.random() * a.length)];
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

// i settori a un passo (collegamenti in entrambe le direzioni), e la distanza in passi tra due settori
function vicini(cp, id) { return cp.collegamenti.filter((l) => l[0] === id || l[1] === id).map((l) => ({ id: l[0] === id ? l[1] : l[0], tipo: l[2], serve: l[3] })); }
function passi(cp, da, a) {
  const d = { [da]: 0 }, coda = [da];
  while (coda.length) { const x = coda.shift(); for (const v of vicini(cp, x)) if (d[v.id] == null) { d[v.id] = d[x] + 1; coda.push(v.id); } }
  return d[a] == null ? 99 : d[a];
}
function verso(cp, da, a) { // il primo passo da "da" verso "a"
  let meglio = null, md = 99;
  for (const v of vicini(cp, da)) { const k = passi(cp, v.id, a); if (k < md) { md = k; meglio = v.id; } }
  return meglio;
}

const metodi = {
  // ---------- preparazione (dal costruttore) ----------
  preparaIncubo() {
    const cp = this.cp;
    this.incubo = {
      area: null, visitate: [], ripulite: [], chiavi: [], obiettivo: 0, fatti: [], mosse: 0, rumore: 0, scorte: {},
      caccia: { attiva: false, area: null, fino: 0, avvisata: false },
      stato: Array.from({ length: this.n }, () => ({ paura: 0, batteria: 100, torcia: true, nascosto: false })),
      rilevato: null, // l'ultimo bip del rilevatore: { mossa, passi, area }
      mente: D.nuovaMente(), // la direttrice e quello che la creatura ha imparato (direttore.js)
    };
    for (const a of cp.aree) this.incubo.scorte[a.id] = 3;
  },
  // il personaggio di un'ambientazione horror: solo umani, solo le classi e i passati a tema, nomi dell'ambientazione
  scelteIncubo(s) {
    s.tema = this.cp.id; s.stirpe = 'umano';
    if (s.classe && !(CLASSI[s.classe] && (CLASSI[s.classe].tema || []).includes(this.cp.id))) delete s.classe;
    if (s.background && !(B.BACKGROUND[s.background] && (B.BACKGROUND[s.background].tema || []).includes(this.cp.id))) delete s.background;
    return s;
  },
  dopoCreazioneIncubo(pg, s) {
    const cp = this.cp;
    if (!s.nome || !String(s.nome).trim()) {
      const presi = new Set(this.pg.filter(Boolean).map((x) => x.nome));
      const lista = cp.nomiPg[pg.genere === 'f' ? 'f' : 'm'].filter((x) => !presi.has(x));
      pg.nome = caso(lista.length ? lista : cp.nomiPg.m);
    }
    // munizioni a scatole, dotazione dell'ambientazione, niente armi da fuoco dove non ce ne sono
    pg.oggetti = pg.oggetti.filter((o) => o.id && H.OGGETTI[o.id]); // niente pozioni e corde da fantasy
    for (const o of pg.oggetti) if (H.SCATOLA[o.id]) o.n *= H.SCATOLA[o.id];
    for (const id of H.DOTAZIONE[cp.id] || []) H.dai(pg, id, H.SCATOLA[id] || 1);
    if (!cp.armi) { pg.armi = pg.armi.filter((a) => B.ARMI[a] && B.ARMI[a].mischia); pg.oggetti = pg.oggetti.filter((o) => !H.SCATOLA[o.id]); }
    pg.oro = 0;
    R.ricalcola(pg);
  },
  classeCompagnoIncubo(p) {
    const prese = new Set(this.pg.filter(Boolean).map((x) => x.classe));
    return this.cp.classi.find((c) => !prese.has(c)) || this.cp.classi[p % this.cp.classi.length];
  },
  areaDi(id) { return this.cp.aree.find((a) => a.id === id) || null; },
  get obiettivoOra() { return this.cp.obiettivi[this.incubo.obiettivo] || null; },

  // ---------- inizio ----------
  iniziaIncubo() {
    const cp = this.cp, inc = this.incubo;
    this.fase = 'avventura';
    const prima = this.areaDi(cp.obiettivi[0].area) || cp.aree[0];
    const partenza = cp.aree.find((a) => vicini(cp, a.id).some((v) => v.id === prima.id) && a.gx === 0 && a.gy === 0) || cp.aree.find((a) => a.gx === 0 && a.gy === 0) || prima;
    this.entraIn(partenza.id, { silenzio: true });
    this.scrivi('sistema', `${cp.icona} ${cp.nome} — ${cp.sottotitolo}. La squadra: ${this.pg.map((x) => `${x.nome} (${CLASSI[x.classe].nome.toLowerCase()} ${x.livello}°)`).join(', ')}.`);
    this.scrivi('sistema', `🎯 Obiettivo: ${this.obiettivoOra.titolo}. ${this.obiettivoOra.testo}`);
    this.chiediMaster('inizio', `Comincia la campagna horror "${cp.nome}" (${cp.luogo}). Il gruppo arriva in ${partenza.nome}: ${partenza.desc}. ${this.idea ? `Idea scritta dal tavolo: «${this.idea}». Seguila se si può.` : ''} Presenta l'arrivo, l'atmosfera e il primo obiettivo (${this.obiettivoOra.titolo}: ${this.obiettivoOra.testo}). Non far ancora comparire la creatura: solo segni della sua presenza.`);
    inc.inizio = Date.now();
  },
  // il gruppo entra in un settore
  entraIn(id, { silenzio = false } = {}) {
    const inc = this.incubo, ar = this.areaDi(id);
    if (!ar) return;
    inc.area = id;
    const nuova = !inc.visitate.includes(id);
    if (nuova) inc.visitate.push(id);
    for (const st of inc.stato) st.nascosto = false;
    this.scrivi('sistema', `📍 ${ar.nome}${ar.luce === 'buio' ? ' (buio)' : ar.luce === 'emergenza' ? ' (luci d\'emergenza)' : ''}`);
    if (nuova && !silenzio) this.scrivi('master', ar.ingresso);
    // un obiettivo che si fa arrivando
    const ob = this.obiettivoOra;
    if (ob && ob.fai === 'raggiungi' && ob.area === id) this.completaObiettivo();
    // i nemici del settore (una volta sola)
    if (this.fase === 'avventura' && ar.nemici.length && !inc.ripulite.includes(id) && nuova && !this.finita) {
      const lv = this.livelloMedio();
      const n = Math.max(1, Math.min(ar.nemici.length + Math.floor(lv / 4), 5));
      this.iniziaCombattimento({ nemici: Array.from({ length: n }, (_, k) => ({ id: ar.nemici[k % ar.nemici.length] })), sorpresa: null });
    }
  },
  livelloMedio() { const v = this.pgVivi(); return Math.round(v.reduce((s, i) => s + this.pg[i].livello, 0) / Math.max(1, v.length)); },
  chiaviDelGruppo() { const set = new Set(this.incubo.chiavi); for (const p of this.pg) if (p) for (const o of p.oggetti || []) if (o.id && H.OGGETTI[o.id] && H.OGGETTI[o.id].tipo === 'chiave') set.add(o.id); return set; },

  // ---------- le azioni dirette (pulsanti del pannello) ----------
  azioneIncubo(p, a) {
    if (this.fase !== 'avventura') return { errore: 'Adesso non si può' };
    if (this.attesaIA) return { errore: 'Il master sta scrivendo…' };
    const cp = this.cp, inc = this.incubo, pg = this.pg[p], st = inc.stato[p];
    if (!pg || pg.morto) return { errore: 'Il tuo personaggio non può agire' };
    const ar = this.areaDi(inc.area);
    const mec = cp.meccaniche;
    const az = String(a.az || '');
    if (az === 'vai') {
      const v = vicini(cp, inc.area).find((x) => x.id === a.area);
      if (!v) return { errore: 'Da qui non ci si arriva' };
      if (v.serve && !this.chiaviDelGruppo().has(v.serve)) return { errore: `È chiuso: serve ${H.OGGETTI[v.serve].nome}` };
      const dove = this.areaDi(v.id);
      this.scrivi('azione', `${v.tipo === 'condotto' ? 'Strisciamo nel condotto' : v.tipo === 'ascensore' ? 'Prendiamo l\'ascensore' : v.tipo === 'tram' ? 'Prendiamo il tram' : 'Andiamo'} verso ${dove.nome}.`, { posto: p, chi: pg.nome });
      if (v.tipo !== 'condotto') this.rumore(v.tipo === 'tram' || v.tipo === 'ascensore' ? 2 : 1);
      this.entraIn(v.id);
      this.passaTempo();
      return { ok: true };
    }
    if (az === 'cerca') {
      if (inc.scorte[inc.area] <= 0) return { errore: 'Qui avete già frugato dappertutto' };
      inc.scorte[inc.area]--;
      const buio = ar.luce === 'buio' && !(st.torcia && st.batteria > 0);
      const pr = R.prova(pg, pg.abilita.includes('indagare') ? 'indagare' : 'percezione', { cd: 10, svantaggio: buio || st.paura >= 7 });
      const trovati = [];
      if (pr.riuscita) { const n = 1 + (pr.totale >= 15 ? 1 : 0) + (pr.totale >= 20 ? 1 : 0); for (let k = 0; k < n; k++) trovati.push(caso(ar.bottino.length ? ar.bottino : ['rottami'])); if (Math.random() < 0.3) trovati.push(cp.armi ? caso(['proiettili', 'cartucce', 'chiodi', 'carburante', 'batterie']) : 'batterie'); }
      for (const id of trovati) H.dai(pg, id, H.SCATOLA[id] || 1);
      this.scrivi('tiro', `🔎 ${pg.nome} fruga in ${ar.nome} (${pr.nomeTipo} ${pr.totale}${buio ? ', al buio' : ''}): ${trovati.length ? trovati.map((id) => `${H.OGGETTI[id].icona} ${H.OGGETTI[id].nome}`).join(', ') : 'niente di utile'}.`, { posto: p });
      this.rumore(1);
      this.passaTempo();
      return { ok: true };
    }
    if (az === 'nascondi') {
      if (!mec.nascondigli) return { errore: 'Qui non ci sono nascondigli' };
      st.nascosto = !st.nascosto;
      this.scrivi('azione', st.nascosto ? `${pg.nome} si infila in un armadietto e trattiene il fiato.` : `${pg.nome} esce dal nascondiglio.`, { posto: p, chi: pg.nome });
      if (st.nascosto) this.passaTempo({ calmo: true });
      return { ok: true };
    }
    if (az === 'rilevatore') {
      if (!mec.rilevatore || !H.conta(pg, 'rilevatore')) return { errore: 'Non hai il rilevatore di movimento' };
      const c = inc.caccia;
      const k = c.attiva && c.area && inc.mosse >= c.fino ? passi(cp, inc.area, c.area) : 99;
      inc.rilevato = { mossa: inc.mosse, passi: k, area: k <= 2 ? c.area : null };
      this.scrivi('sistema', `📡 Bip… ${k === 0 ? 'il segnale è QUI, in questo settore!' : k === 1 ? `un segnale grosso, nel settore accanto (${this.areaDi(c.area).nome})!` : k === 2 ? 'un segnale lontano, a due settori.' : 'niente si muove nei dintorni.'}`, { posto: p });
      return { ok: true };
    }
    if (az === 'torcia') {
      if (!mec.batterie) return { errore: 'Qui non serve' };
      st.torcia = !st.torcia;
      this.scrivi('sistema', `${st.torcia ? '🔦' : '🌑'} ${pg.nome} ${st.torcia ? 'accende' : 'spegne'} la ${cp.id === 'manicomio' ? 'visione notturna' : 'torcia'}.`, { posto: p });
      return { ok: true };
    }
    if (az === 'ricarica') {
      if (!H.togli(pg, 'batterie')) return { errore: 'Non hai batterie' };
      st.batteria = Math.min(100, st.batteria + 50);
      this.scrivi('sistema', `🔋 ${pg.nome} cambia le batterie (${st.batteria}%).`, { posto: p });
      return { ok: true };
    }
    if (az === 'costruisci') {
      if (!mec.costruzione) return { errore: 'Qui non si costruisce' };
      const id = String(a.ricetta || '');
      const ric = H.RICETTE[id];
      if (!ric) return { errore: 'Ricetta sconosciuta' };
      const serve = this.costoRicetta(pg, id);
      const gruppo = this.pgVivi().map((i) => this.pg[i]);
      for (const [k, n] of Object.entries(serve)) if (gruppo.reduce((s, x) => s + H.conta(x, k), 0) < n) return { errore: `Manca: ${H.OGGETTI[k].nome}` };
      for (const [k, n] of Object.entries(serve)) { let resto = n; for (const x of [pg, ...gruppo.filter((q) => q !== pg)]) while (resto > 0 && H.togli(x, k)) resto--; }
      H.dai(pg, id, H.SCATOLA[id] || 1);
      this.scrivi('sistema', `🛠️ ${pg.nome} costruisce: ${H.OGGETTI[id].icona} ${H.OGGETTI[id].nome}.`, { posto: p });
      this.passaTempo({ calmo: true });
      return { ok: true };
    }
    if (az === 'cura') {
      const b = a.chi != null ? this.pg[Number(a.chi)] : pg;
      if (!b || b.morto) return { errore: 'Chi vuoi curare?' };
      if (!H.togli(pg, 'kitMedico')) return { errore: 'Non hai kit medici' };
      const volte = CLASSI[pg.classe].cura || 1;
      let q = 0; for (let k = 0; k < volte; k++) q += R.tira(H.OGGETTI.kitMedico.cura).totale;
      q = R.cura(b, q); if (b.pf > 0) b.stabile = false;
      this.scrivi('tiro', `➕ ${pg.nome} usa un kit medico su ${b === pg ? 'sé stesso' : b.nome}: +${q} PF.`, { posto: p });
      return { ok: true };
    }
    if (az === 'obiettivo') {
      const ob = this.obiettivoOra;
      if (!ob || ob.area !== inc.area || ob.fai === 'raggiungi') return { errore: 'Qui non c\'è niente da fare per l\'obiettivo' };
      this.scrivi('azione', `${ob.fai === 'usa' ? 'Uso' : 'Prendo'}: ${ob.cosa}.`, { posto: p, chi: pg.nome });
      this.rumore(1);
      this.completaObiettivo(p);
      if (!this.finita && this.fase === 'avventura') this.passaTempo();
      return { ok: true };
    }
    return { errore: 'Mossa non valida' };
  },
  costoRicetta(pg, id) {
    const serve = { ...H.RICETTE[id].serve };
    if (CLASSI[pg.classe] && CLASSI[pg.classe].costruisce) { // l'ingegnere risparmia un pezzo
      const k = Object.keys(serve).sort((a, b) => serve[b] - serve[a])[0];
      if (serve[k] > 1) serve[k]--; else if (Object.keys(serve).length > 1) delete serve[k];
    }
    return serve;
  },
  rumore(q) { this.incubo.rumore = Math.max(0, Math.min(10, this.incubo.rumore + q)); },
  paura(k, q) { const st = this.incubo.stato[k]; if (!st || !this.cp.meccaniche.paura) return; st.paura = Math.max(0, Math.min(10, st.paura + q)); const pg = this.pg[k]; if (pg && st.paura >= 10 && !pg.condizioni.includes('spaventato')) { pg.condizioni.push('spaventato'); this.scrivi('sistema', `😱 ${pg.nome} è nel panico: spaventato.`, { posto: k }); } if (pg && st.paura < 10) pg.condizioni = pg.condizioni.filter((x) => x !== 'spaventato'); },

  // ---------- un obiettivo fatto ----------
  completaObiettivo(p = null) {
    const inc = this.incubo, ob = this.obiettivoOra;
    if (!ob) return;
    inc.fatti.push(ob.id);
    inc.obiettivo++;
    for (const id of ob.da || []) { inc.chiavi.push(id); this.scrivi('sistema', `🗝️ Trovato: ${H.OGGETTI[id].nome}.`); }
    this.scrivi('sistema', `✅ Obiettivo completato: ${ob.titolo}.`);
    this.missioni = this.missioni.filter((m) => m.titolo !== ob.titolo);
    this.daiPx(Math.round(75 * Math.max(1, this.livelloMedio()) * (ob.finale ? 4 : 1)), ob.titolo);
    if (ob.attiva === 'cacciatore' && !inc.caccia.attiva) {
      inc.caccia.attiva = true;
      const dove = this.cp.aree.filter((a) => a.cacciatore && a.id !== inc.area).sort((a, b) => passi(this.cp, inc.area, a.id) - passi(this.cp, inc.area, b.id))[0];
      inc.caccia.area = dove ? dove.id : this.cp.aree[this.cp.aree.length - 1].id;
      this.scrivi('master', caso(this.cp.arrivo));
      for (const k of this.pgVivi()) this.paura(k, 2);
    }
    if (ob.finale) { this.vittoriaIncubo(); return; }
    const nuovo = this.obiettivoOra;
    if (nuovo) this.scrivi('sistema', `🎯 Nuovo obiettivo: ${nuovo.titolo}. ${nuovo.testo}`);
  },
  vittoriaIncubo() {
    this.scrivi('master', this.cp.finale);
    this.chiudi(`${this.cp.nome}: ce l'avete fatta.`);
  },

  // ---------- il tempo che passa: la creatura si muove, le batterie si scaricano, la paura sale ----------
  passaTempo({ calmo = false } = {}) {
    const cp = this.cp, inc = this.incubo, c = inc.caccia;
    inc.mosse++;
    // batterie e paura
    const ar = this.areaDi(inc.area);
    for (const k of this.pgVivi()) {
      const st = inc.stato[k];
      if (cp.meccaniche.batterie && st.torcia && ar.luce !== 'accesa' && st.batteria > 0) { st.batteria = Math.max(0, st.batteria - (cp.id === 'manicomio' ? 7 : 4)); if (!st.batteria) { st.torcia = false; this.scrivi('sistema', `🪫 La ${cp.id === 'manicomio' ? 'videocamera' : 'torcia'} di ${this.pg[k].nome} si spegne: batterie finite.`, { posto: k }); } }
      if (ar.luce === 'buio' && !(st.torcia && st.batteria > 0)) this.paura(k, 1);
      else if (ar.luce === 'accesa' && Math.random() < 0.5) this.paura(k, -1);
    }
    const prima = inc.rumore;
    inc.rumore = Math.max(0, inc.rumore - 1);
    if (!c.attiva) return;
    if (inc.mosse < c.fino) return; // scacciata: per un po' non torna
    if (!inc.mente) inc.mente = D.nuovaMente();
    D.dimentica(inc.mente, 1, 0.03);
    // la direttrice: dopo un brutto momento vi lascia respirare, se è tutto troppo calmo la manda verso di voi
    const ordine = D.direttriceTurni(inc.mente, passi(cp, c.area, inc.area), this.difficolta);
    if (ordine === 'tregua' && prima < RUMORE_ARRIVA + 2) {
      const lontane = vicini(cp, c.area).map((v) => v.id).filter((id) => passi(cp, id, inc.area) > passi(cp, c.area, inc.area));
      if (lontane.length) c.area = caso(lontane);
      return;
    }
    if (ordine === 'spingi') { inc.mente.calma = Math.max(0, inc.mente.calma - 2); c.area = verso(cp, c.area, inc.area) || c.area; }
    // dove va: verso il rumore se lo sente, altrimenti gira per i suoi settori (e dove vi ha già trovati)
    const lenta = this.difficolta === 'storia' ? 0.45 : this.difficolta === 'mortale' ? 0.85 : 0.65;
    if (ordine === 'spingi') { /* già mossa */ } else if (Math.random() < lenta || prima >= RUMORE_ARRIVA) {
      const k = passi(cp, c.area, inc.area);
      if (prima >= 4 && k <= 3) c.area = verso(cp, c.area, inc.area) || c.area;
      else {
        const sue = vicini(cp, c.area).map((v) => v.id).filter((id) => (this.areaDi(id).cacciatore || inc.mente.zone[id] || Math.random() < 0.3));
        if (sue.length) c.area = D.zonaPreferita(inc.mente, sue);
      }
    }
    const k = passi(cp, c.area, inc.area);
    if (k === 1 && !calmo && Math.random() < 0.6) { this.scrivi('master', caso(cp.arrivo)); for (const q of this.pgVivi()) this.paura(q, 1); }
    if (k === 0) this.incontroCacciatore();
  },
  // la creatura è nel vostro settore
  incontroCacciatore() {
    const inc = this.incubo, cp = this.cp;
    const ar = this.areaDi(inc.area);
    const id = ar.cacciatore || cp.cacciatore;
    const m = MOSTRI[id];
    for (const k of this.pgVivi()) this.paura(k, 2);
    if (inc.mente) D.ricordaZona(inc.mente, inc.area, 2);
    const vivi = this.pgVivi();
    const tutti = vivi.every((k) => inc.stato[k].nascosto || this.pg[k].pf <= 0);
    if (tutti && cp.meccaniche.nascondigli) {
      if (!inc.mente) inc.mente = D.nuovaMente();
      const cd = 10 + Math.floor(inc.rumore / 2) + ((m.tratti || []).includes('sensiAcuti') ? 2 : 0) + Math.round(3 * D.quanto(inc.mente, 'armadietto'));
      const capito = D.impara(inc.mente, 'armadietto');
      if (capito) this.scrivi('master', `🧠 ${D.CAPITO[capito](m.nome)}`);
      const esiti = vivi.filter((k) => this.pg[k].pf > 0).map((k) => ({ k, r: R.prova(this.pg[k], 'furtivita', { cd, svantaggio: inc.stato[k].paura >= 7 }) }));
      this.scrivi('master', `${m.nome} entra. Lo sentite camminare piano tra gli armadietti, annusare l'aria, fermarsi…`);
      for (const e of esiti) this.scrivi('tiro', `🫣 ${this.pg[e.k].nome}, Furtività: ${e.r.totale} contro CD ${cd}: ${e.r.riuscita ? 'resta immobile' : 'un respiro di troppo…'}`, { posto: e.k, riuscita: e.r.riuscita });
      if (esiti.every((e) => e.r.riuscita)) {
        this.scrivi('master', `…e se ne va. ${m.nome} torna nei condotti. Per stavolta.`);
        const via = vicini(cp, inc.area).map((v) => v.id); inc.caccia.area = caso(via.length ? via : [inc.area]); inc.caccia.fino = inc.mosse + 2;
        return;
      }
    } else this.scrivi('master', `${m.nome} è qui. ${caso(['Un sibilo dietro di voi.', 'Le luci tremano: la vedete, finalmente, e vorreste non averla vista.', 'Non c\'è tempo per nascondersi.'])}`);
    this.iniziaCombattimento({ nemici: [{ id }], sorpresa: tutti ? null : (inc.rumore >= RUMORE_ARRIVA ? null : 'gruppo') });
  },

  // ---------- combattimento: la scena del settore, il rumore che chiama la creatura, la fine ----------
  scenaIncubo(def) {
    const ar = this.areaDi(this.incubo.area);
    return { stile: ar.stile, luce: def.luce && ['giorno', 'buio', 'torce', 'emergenza'].includes(def.luce) ? def.luce : LUCE_SCENA[ar.luce] || 'buio' };
  },
  rumoreInCombattimento() {
    const cb = this.combattimento, inc = this.incubo, c = inc.caccia;
    if (!cb || cb.finito || cb.arrivata || !c.attiva || inc.mosse < c.fino || (cb.rumore || 0) < RUMORE_ARRIVA) return;
    if (cb.creature.some((x) => x.lato === 'nemici' && (x.ref.tratti || []).includes('cacciatore'))) return;
    if (passi(this.cp, c.area, inc.area) > 2) return;
    cb.arrivata = true;
    const ar = this.areaDi(inc.area);
    const m = R.mostroDa({ id: ar.cacciatore || this.cp.cacciatore });
    if (m) { cb.entra(m); c.area = inc.area; for (const k of this.pgVivi()) this.paura(k, 2); }
  },
  dopoScontroIncubo(cb, esito) {
    const inc = this.incubo, c = inc.caccia;
    // sconfitti: chi è a terra non si salva (morte permanente, c'è !revive); vinto: chi è svenuto si rialza a 1 PF
    for (const k of this.pgVivi()) {
      const pg = this.pg[k];
      if (pg.pf > 0) continue;
      if (esito === 'vittoria') { pg.pf = 1; pg.stabile = false; this.scrivi('sistema', `🩹 ${pg.nome} si rialza a fatica (1 PF).`); } else { pg.morto = true; this.scrivi('master', `💀 ${pg.nome}: ${caso(this.cp.morte)}`); }
    }
    const cacciatori = cb.creature.filter((x) => x.lato === 'nemici' && (x.ref.tratti || []).includes('cacciatore'));
    for (const x of cacciatori) {
      if (x.scacciato) {
        if (inc.mente && cb.fuocoSulCacciatore) { const capito = D.impara(inc.mente, 'fuoco'); if (capito) this.scrivi('master', `🧠 ${D.CAPITO[capito](x.ref.nome)}`); }
        // scacciata: torna nel nido (o nel settore più lontano) e per un po' vi lascia stare
        const nido = this.cp.aree.find((a) => a.stile === 'nido') || this.cp.aree.slice().sort((a, b) => passi(this.cp, inc.area, b.id) - passi(this.cp, inc.area, a.id))[0];
        c.area = nido.id; c.fino = inc.mosse + 6;
        this.scrivi('sistema', `🔥 ${x.ref.nome} è scacciato: per un po' vi lascia in pace. Tornerà.`);
        x.ref.pf = x.ref.pfMax;
      } else { const via = vicini(this.cp, inc.area).map((v) => v.id); c.area = caso(via.length ? via : [inc.area]); c.fino = inc.mosse + 2; }
    }
    if (esito === 'vittoria' && !cb.creature.some((x) => x.lato === 'nemici' && !x.ref.morto && !x.fuggito)) if (!inc.ripulite.includes(inc.area)) inc.ripulite.push(inc.area);
    for (const st of inc.stato) st.nascosto = false;
    inc.rumore = Math.max(0, Math.min(inc.rumore, 3) + Math.round((cb.rumore || 0) / 3));
  },

  // ---------- il master ----------
  contestoIncubo() {
    const cp = this.cp, inc = this.incubo, ar = this.areaDi(inc.area), ob = this.obiettivoOra;
    const chiavi = this.chiaviDelGruppo();
    const strade = vicini(cp, inc.area).map((v) => `${this.areaDi(v.id).nome} [id ${v.id}] (${v.tipo}${v.serve ? `, ${chiavi.has(v.serve) ? 'aperto' : `CHIUSO: serve ${H.OGGETTI[v.serve].nome}`}` : ''})`).join('; ');
    const c = inc.caccia;
    const k = c.attiva ? passi(cp, c.area, inc.area) : 99;
    const stato = this.pg.map((p, i) => (p ? `${p.nome}: paura ${inc.stato[i].paura}/10${cp.meccaniche.batterie ? `, batteria ${inc.stato[i].batteria}% (${inc.stato[i].torcia ? 'accesa' : 'spenta'})` : ''}${inc.stato[i].nascosto ? ', NASCOSTO' : ''}` : null)).filter(Boolean).join('; ');
    return `\n\nAMBIENTAZIONE HORROR: ${cp.nome} (${cp.luogo})\nSETTORE ATTUALE: ${ar.nome} [id ${ar.id}] — ${ar.desc}. Luce: ${ar.luce}.\nSTRADE DA QUI: ${strade}\nSETTORI VISITATI: ${inc.visitate.map((id) => this.areaDi(id).nome).join(', ')}\nOBIETTIVO ATTUALE: ${ob ? `${ob.titolo} — ${ob.testo} (nel settore ${this.areaDi(ob.area).nome}${ob.fai !== 'raggiungi' ? `, "${ob.cosa}"` : ''})` : 'nessuno'}\nOGGETTI CHIAVE DEL GRUPPO: ${[...chiavi].map((id) => H.OGGETTI[id].nome).join(', ') || 'nessuno'}\nRUMORE: ${inc.rumore}/10\nLA CREATURA (${MOSTRI[cp.cacciatore].nome}): ${!c.attiva ? 'non si è ancora mostrata (solo segni e indizi)' : inc.mosse < c.fino ? 'scacciata, per ora lontana' : k === 0 ? 'È QUI, in questo settore' : k === 1 ? 'nel settore accanto: si sente nei condotti' : 'lontana, da qualche parte nella stazione'} (i giocatori non lo sanno con certezza: fallo sentire, non dirlo)\nSTATO: ${stato}`;
  },
  // eventi in più che il master IA può usare nelle ambientazioni horror
  eventoIncubo(e, t, chi) {
    const inc = this.incubo, cp = this.cp;
    if (t === 'vai') {
      const id = cp.aree.find((a) => a.id === e.area || norm(a.nome) === norm(e.area || e.nome));
      const v = id && vicini(cp, inc.area).find((x) => x.id === id.id);
      if (v && (!v.serve || this.chiaviDelGruppo().has(v.serve) || e.forza)) this.entraIn(v.id);
      return true;
    }
    if (t === 'rumore') { this.rumore(Math.round(Number(e.quantita) || 1)); return true; }
    if (t === 'paura') { for (const k of chi) this.paura(k, Math.round(Number(e.quantita) || 1)); return true; }
    if (t === 'batterie') { for (const k of chi) inc.stato[k].batteria = Math.max(0, Math.min(100, inc.stato[k].batteria + Math.round(Number(e.quantita) || 0))); return true; }
    if (t === 'chiave') { const id = H.CHIAVI[e.id] ? e.id : Object.keys(H.CHIAVI).find((k) => norm(H.CHIAVI[k]) === norm(e.nome)); if (id && !inc.chiavi.includes(id)) { inc.chiavi.push(id); this.scrivi('sistema', `🗝️ Trovato: ${H.OGGETTI[id].nome}.`); } return true; }
    if (t === 'obiettivo') { const ob = this.obiettivoOra; if (ob && ob.area === inc.area) this.completaObiettivo(); return true; }
    if (t === 'cacciatore') {
      const c = inc.caccia; if (!c.attiva) return true;
      if (e.via) { c.fino = inc.mosse + 4; c.area = caso(vicini(cp, inc.area).map((v) => v.id)); } else if (e.arriva) { c.area = inc.area; c.fino = 0; this.cacciatoreArriva = true; }
      return true;
    }
    if (t === 'oggetto' && H.OGGETTI[e.id]) { for (const k of chi.slice(0, 1)) { H.dai(this.pg[k], e.id, Math.max(1, Math.min(20, Number(e.n) || 1)) * (H.SCATOLA[e.id] || 1)); this.scrivi('sistema', `🎒 ${this.pg[k].nome} ottiene: ${H.OGGETTI[e.id].nome}.`); } return true; }
    return false;
  },
  // senza IA: il master di riserva usa i testi scritti a mano dei settori
  masterRiservaIncubo(tipo) {
    const cp = this.cp, inc = this.incubo, ar = this.areaDi(inc.area), ob = this.obiettivoOra;
    const out = { narrazione: '', prove: [], salvezze: [], eventi: [], combattimento: null, scelte: [], diario: null, atmosfera: 'orrore' };
    if (tipo === 'inizio') out.narrazione = `${ar.ingresso}\n\n${ob ? `Il vostro obiettivo: ${ob.testo}` : ''}`;
    else if (tipo === 'esiti') out.narrazione = (this.ultimiEsiti || []).every((e) => e.riuscita) ? 'Ce la fate, col cuore in gola. Nessuno sembra avervi sentito.' : 'Non va come speravate: un rumore di troppo rimbomba nei corridoi.';
    else if (tipo === 'combattimentoFinito') out.narrazione = 'Il silenzio torna, ma non è un silenzio tranquillo. Vi rimettete in piedi e controllate le ferite.';
    else {
      out.narrazione = caso(ar.eventi);
      if (Math.random() < 0.3) out.prove.push({ chi: 'tutti', tipo: caso(['percezione', 'furtivita', 'indagare']), cd: 12, motivo: 'per non farsi sorprendere' });
      if (Math.random() < 0.35) { out.eventi.push({ tipo: 'rumore', quantita: 1 }); }
    }
    out.scelte = [ob && ob.area === inc.area && ob.fai !== 'raggiungi' ? `${ob.fai === 'usa' ? 'Usare' : 'Prendere'}: ${ob.cosa}` : ob ? `Raggiungere ${this.areaDi(ob.area).nome}` : 'Fuggire', 'Frugare in giro', 'Nascondersi e ascoltare'];
    return out;
  },

  // ---------- quello che vede il browser ----------
  vistaIncubo(p) {
    const cp = this.cp, inc = this.incubo;
    const chiavi = this.chiaviDelGruppo();
    const note = new Set(inc.visitate);
    for (const id of inc.visitate) for (const v of vicini(cp, id)) note.add(v.id);
    const mio = this.pg[p];
    const ob = this.obiettivoOra;
    const ril = inc.rilevato && inc.rilevato.mossa === inc.mosse ? inc.rilevato : null;
    return {
      id: cp.id, nome: cp.nome, icona: cp.icona, luogo: cp.luogo, sottotitolo: cp.sottotitolo, meccaniche: cp.meccaniche, armi: cp.armi,
      area: inc.area, mosse: inc.mosse, rumore: inc.rumore, cols: Math.max(...cp.aree.map((a) => a.gx)) + 1, righe: Math.max(...cp.aree.map((a) => a.gy)) + 1,
      aree: cp.aree.filter((a) => note.has(a.id)).map((a) => ({ id: a.id, nome: inc.visitate.includes(a.id) ? a.nome : '?', gx: a.gx, gy: a.gy, stile: a.stile, luce: inc.visitate.includes(a.id) ? a.luce : null, visitata: inc.visitate.includes(a.id), obiettivo: !!(ob && ob.area === a.id && inc.visitate.includes(a.id)), segnale: !!(ril && ril.area === a.id) })),
      collegamenti: cp.collegamenti.filter((l) => note.has(l[0]) && note.has(l[1]) && (inc.visitate.includes(l[0]) || inc.visitate.includes(l[1]))).map((l) => ({ a: l[0], b: l[1], tipo: l[2], chiuso: !!(l[3] && !chiavi.has(l[3])), serve: l[3] ? H.OGGETTI[l[3]].nome : null })),
      strade: vicini(cp, inc.area).map((v) => ({ id: v.id, nome: inc.visitate.includes(v.id) ? this.areaDi(v.id).nome : `${this.areaDi(v.id).nome.split(' ')[0]}…`, tipo: v.tipo, chiuso: !!(v.serve && !chiavi.has(v.serve)), serve: v.serve ? H.OGGETTI[v.serve].nome : null })),
      obiettivo: ob ? { titolo: ob.titolo, testo: ob.testo, area: this.areaDi(ob.area).nome, qui: ob.area === inc.area && ob.fai !== 'raggiungi', cosa: ob.cosa || null, fai: ob.fai } : null,
      fatti: inc.fatti.length, totale: cp.obiettivi.length,
      chiavi: [...chiavi].map((id) => H.OGGETTI[id].nome),
      scorte: inc.scorte[inc.area],
      stato: inc.stato, rilevato: ril ? { passi: ril.passi } : null,
      cacciaAttiva: inc.caccia.attiva, scacciata: inc.caccia.attiva && inc.mosse < inc.caccia.fino,
      ricette: Object.keys(H.RICETTE).map((id) => ({ id, nome: H.OGGETTI[id].nome, icona: H.OGGETTI[id].icona, desc: H.OGGETTI[id].desc, serve: mio ? Object.entries(this.costoRicetta(mio, id)).map(([k, n]) => ({ id: k, nome: H.OGGETTI[k].nome, icona: H.OGGETTI[k].icona, n })) : [] })),
      oggetti: H.OGGETTI,
      classi: Object.fromEntries(Object.entries(CLASSI).filter(([, c]) => (c.tema || []).includes(cp.id)).map(([k, c]) => [k, { nome: c.nome, icona: c.icona, hacker: !!c.hacker, costruisce: !!c.costruisce, cura: c.cura || 1 }])),
    };
  },
};

// le istruzioni del master IA per un'ambientazione horror: quelle normali più il tono e gli eventi in più
function istruzioniIncubo(base, cp) {
  return `${base}

AMBIENTAZIONE HORROR (più importante di tutto quello che c'è sopra sul tono): ${cp.nome}, ispirata a ${cp.ispirato}. ${cp.tono}
Niente magia, niente stirpi fantasy: i personaggi sono esseri umani normali con le loro classi a tema. La creatura (${MOSTRI[cp.cacciatore].nome}) NON SI PUÒ UCCIDERE: si può solo evitare, nascondersi, distrarla col rumore o scacciarla (col fuoco o ferendola a fondo). Non far mai finire la creatura morta.
La mappa è fatta di SETTORI collegati (li trovi nel contesto con il loro id): il gruppo si sposta con l'evento "vai" solo verso un settore collegato e aperto. Le porte chiuse si aprono solo con l'oggetto chiave giusto. Gli obiettivi vanno in ordine: guida i giocatori verso quello attuale senza risolverlo tu (si completa quando lo fanno sul posto: evento "obiettivo").
EVENTI IN PIÙ PER L'HORROR (oltre a quelli normali):
    {"tipo": "vai", "area": "id del settore collegato"},
    {"tipo": "rumore", "quantita": 2}   (rumore fatto dal gruppo, da -3 a 5: spari, urla, oggetti che cadono; il rumore attira la creatura),
    {"tipo": "paura", "chi": "nome o tutti", "quantita": 1}   (da -3 a 3),
    {"tipo": "batterie", "chi": "nome", "quantita": -10},
    {"tipo": "chiave", "id": "${Object.keys(H.CHIAVI).join('|')}"}   (solo quando il gruppo trova davvero l'oggetto chiave),
    {"tipo": "obiettivo"}   (il gruppo ha appena completato l'obiettivo attuale nel suo settore),
    {"tipo": "cacciatore", "arriva": true}   (la creatura entra nel settore: poi il gioco decide se li trova) oppure {"tipo": "cacciatore", "via": true},
    {"tipo": "oggetto", "chi": "nome", "id": "${Object.keys(H.OGGETTI).filter((k) => H.OGGETTI[k].tipo !== 'chiave').join('|')}", "n": 1}   (risorse e oggetti dell'ambientazione).
Bestiario dell'ambientazione (id per "combattimento"): ${Object.values(MOSTRI).filter((m) => (m.tema || []).includes(cp.id)).map((m) => `${m.id} (${m.nome})`).join(', ')}. Per le scene usa "scena": "${'stazione|uffici|alloggi|medico|laboratorio|industriale|tram|nido|sottomarina|fondale|manicomio|fogne|cortile'}" e "luce": "buio|emergenza|torce".
Usa "atmosfera": "orrore" o "tensione" quasi sempre.`;
}

module.exports = { metodi, istruzioniIncubo, vicini, passi, verso, LUCE_SCENA };
