// DRAGHI E SEGRETE: le ambientazioni horror IN TEMPO REALE (opzione "Come si gioca"). Tutta la campagna su una mappa
// enorme vista dall'alto (stazione.js), come Alien: Isolation in 2D. Il server muove tutto 20 volte al secondo:
// - i personaggi: camminare, correre (veloce ma rumoroso), accovacciarsi (lento, silenzioso, si passa sotto scrivanie
//   e letti), la torcia che consuma le batterie, il rilevatore di movimento (rallenta e fa bip, ma mostra chi si muove,
//   anche nei condotti), E per interagire (porte chiuse, casse, armadietti, terminali, punti degli obiettivi, ascensori,
//   tram e condotti), attacchi con le regole (d20 + bonus contro la CA, dadi del danno), oggetti da lanciare, kit
//   medici, oggetti da costruire. A 0 punti ferita si cade: un compagno vicino può rialzarti, se no si muore
// - la CREATURA (immortale): gira nei condotti (si vede solo col rilevatore), esce dalle grate vicino al rumore o ai
//   personaggi, pattuglia, va a controllare i rumori, insegue chi vede (vede meglio chi ha la torcia accesa, non vede
//   chi è nell'armadietto), fruga negli armadietti vicini (prova di Furtività), uccide al contatto (a "storia" fa solo
//   tanti danni). Il fuoco o tante ferite la scacciano nei condotti per un po'
// - le due intelligenze (direttore.js): la DIRETTRICE dosa la tensione (tregua dopo un brutto incontro, un indizio
//   sulla vostra zona se è tutto troppo calmo) e la MENTE della creatura impara le vostre abitudini
// - gli altri nemici dei settori (androidi lenti e resistenti, sopravvissuti armati, pazienti…): girano, inseguono,
//   attaccano; il tecnico li hackera da vicino, la mina EMP li ferma
// - le AZIONI SCRITTE («parlo con l'androide», «salto», «ascolto»…): le racconta il master (o quello di riserva) mentre
//   il gioco va avanti; urla e salti fanno rumore subito
// - i compagni del computer seguono il gruppo, si nascondono quando arriva la creatura, attaccano i nemici vicini
// Il gioco manda a ognuno solo quello che il suo personaggio vede (vistaTick); la mappa e le cose che cambiano di rado
// vanno nella vista normale (vistaFissa). Obiettivi, chiavi, esperienza e finale sono quelli della campagna (incubo.js).
const R = require('./regole');
const B = require('./base');
const H = require('./horror');
const { CLASSI } = require('./classi');
const { MOSTRI } = require('./mostri');
const S = require('./stazione');
const D = require('./direttore');
const MASTER = require('./master');
const T = require('../../giochi/trucco');

const DT = 0.05;
const VEL = { cammina: 3.2, corre: 4.9, accucciato: 1.7, rilevatore: 2.0 };
const RAGGIO = 0.34;
const CADUTO_MS = 20000; // a terra: 20 secondi per farsi rialzare
const LUCE_VISTA = { accesa: 13, emergenza: 9, buio: 3.2 };
const caso = (a) => a[Math.floor(Math.random() * a.length)];
// prima che arrivi: qualcosa si muove sopra di voi
const PRESAGI = ['🔊 Un colpo sordo nel soffitto. Poi un altro, più lontano. Qualcosa corre nei condotti.', '🔊 Una grata vibra da sola. Dentro il condotto, un respiro che non è vostro.', '🔊 Un rumore di metallo graffiato sopra le vostre teste. Si ferma. Ascolta.'];
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angolo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const diffAng = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };
const tileVel = (m) => Math.max(1.2, Math.min(5.2, ((m && m.velocita) || 9) / 9 * 2.7));

class TempoReale {
  constructor(g) {
    this.g = g;
    this.cp = g.cp;
    this.mappa = S.generaStazione(this.cp, g.seme);
    const m = this.mappa;
    this.w = m.w; this.h = m.h;
    this.cel = m.g.split('');
    this.t = 0; this.ora = Date.now();
    this.rumori = []; // { x, y, r, fino, chi }
    this.fx = []; this.nFx = 0; // effetti brevi (spari, esplosioni, fuoco, fumo) per il browser
    this.fuochi = []; this.fumi = []; this.luci = [];
    this.lanci = [];
    this.nemici = [];
    this.creatura = null;
    this.messaggi = []; this.nMsg = 0;
    this.versione = 1;
    this.aperti = new Set(); // casse aperte (indice cella)
    this.letti = new Set(); // terminali letti
    const inc = g.incubo;
    if (!inc.mente) inc.mente = D.nuovaMente();
    this.mente = inc.mente; this.ordine = 'libera';
    // in tempo reale la creatura non aspetta gli obiettivi: arriva dopo poco (prima si sente nei condotti)
    this.risveglio = g.difficolta === 'storia' ? 50 : g.difficolta === 'mortale' ? 15 : 25;
    // i personaggi alla partenza
    this.gioc = g.pg.map((pg, posto) => {
      const p = this.cellaLibera(m.partenza.x + (posto % 3) - 1, m.partenza.y + Math.floor(posto / 3));
      return { posto, x: p.x + 0.5, y: p.y + 0.5, a: 0, mx: 0, my: 0, corre: false, acc: false, ril: false, armadietto: null, caduto: 0, cd: 0, arma: 0, seq: {}, azione: null, ultimoRumore: 0, bip: 0, sottoMobile: false };
    });
    for (const st of inc.stato) { st.torcia = true; st.nascosto = false; }
    // i nemici dei settori
    for (const ar of this.cp.aree) {
      const n = Math.min(3, ar.nemici.length + (g.livelloMedio() >= 5 ? 1 : 0));
      for (let k = 0; k < n; k++) this.nuovoNemico(ar.nemici[k % ar.nemici.length], ar);
    }
    inc.area = this.areaIn(this.gioc[0]).id;
    inc.visitate = [inc.area];
    this.avvisa(`${this.cp.icona} ${this.cp.nome}. ${this.areaIn(this.gioc[0]).ingresso}`, 'master');
    this.avvisa(`🎯 ${g.obiettivoOra.titolo}: ${g.obiettivoOra.testo}`);
    g.scrivi('sistema', `${this.cp.icona} ${this.cp.nome} in tempo reale. Obiettivo: ${g.obiettivoOra.titolo}.`);
  }

  // ---------- la mappa ----------
  ch(x, y) { x = Math.floor(x); y = Math.floor(y); return x < 0 || y < 0 || x >= this.w || y >= this.h ? '#' : this.cel[y * this.w + x]; }
  blocca(x, y, chi = null) {
    const c = this.ch(x, y);
    if (c === 'L') return true;
    if (S.SOTTO.has(c)) return !(chi && chi.acc);
    return S.BLOCCA.has(c);
  }
  libera(x, y, chi) { const r = RAGGIO; return !this.blocca(x - r, y - r, chi) && !this.blocca(x + r, y - r, chi) && !this.blocca(x - r, y + r, chi) && !this.blocca(x + r, y + r, chi); }
  cellaLibera(x, y) {
    for (let r = 0; r < 30; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const xx = x + dx, yy = y + dy; if (!S.BLOCCA.has(this.ch(xx, yy)) && this.ch(xx, yy) !== 'L' && !['E', 'v'].includes(this.ch(xx, yy))) return { x: xx, y: yy }; }
    return { x, y };
  }
  areaIn(e) { const gx = Math.floor(e.x / S.SW), gy = Math.floor(e.y / S.SH); return this.cp.aree.find((a) => a.gx === gx && a.gy === gy) || this.cp.aree[0]; }
  vede(a, b) { return S.vede(this.mappa, a.x, a.y, b.x, b.y, (x, y) => this.portaChiusa(x, y)) && !this.fumi.some((f) => this.attraversa(a, b, f)); }
  attraversa(a, b, f) { // il segmento a-b passa nel fumo?
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((f.x - a.x) * dx + (f.y - a.y) * dy) / l2));
    return Math.hypot(a.x + dx * t - f.x, a.y + dy * t - f.y) < f.r && dist(a, f) > 1 && dist(b, f) > 0.6;
  }
  // le porte normali si aprono da sole quando c'è qualcuno vicino; chiuse fermano la vista
  portaChiusa(x, y) {
    const c = { x: x + 0.5, y: y + 0.5 };
    if (this.gioc.some((p) => !this.g.pg[p.posto].morto && dist(p, c) < 1.6)) return false;
    if (this.nemici.some((n) => !n.via && dist(n, c) < 1.6)) return false;
    if (this.creatura && this.creatura.fuori && dist(this.creatura, c) < 1.8) return false;
    return true;
  }
  // percorso a passi (BFS sulle celle) verso un punto: restituisce la prossima cella su cui andare
  percorso(da, a, chi = null, max = 14000) {
    const W = this.w, s = Math.floor(da.y) * W + Math.floor(da.x), f = Math.floor(a.y) * W + Math.floor(a.x);
    if (s === f) return a;
    const prec = new Map([[s, -1]]), coda = [s];
    let trovato = false;
    for (let q = 0; q < coda.length && q < max; q++) {
      const i = coda[q];
      if (i === f) { trovato = true; break; }
      const x = i % W, y = Math.floor(i / W);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy, j = yy * W + xx;
        if (prec.has(j) || (j !== f && this.blocca(xx + 0.5, yy + 0.5, chi))) continue;
        prec.set(j, i); coda.push(j);
      }
    }
    if (!trovato) return null;
    let i = f, prima = f;
    while (prec.get(i) !== s && prec.get(i) !== -1 && prec.get(i) != null) { prima = i; i = prec.get(i); }
    const j = prec.get(i) === s ? i : prima;
    return { x: (j % W) + 0.5, y: Math.floor(j / W) + 0.5, lunghezza: coda.length };
  }
  muovi(e, vx, vy, chi) {
    const nx = e.x + vx * DT, ny = e.y + vy * DT;
    if (this.libera(nx, e.y, chi)) e.x = nx;
    if (this.libera(e.x, ny, chi)) e.y = ny;
  }
  vaiVerso(e, p, vel, chi = null) {
    if (!e.pPasso || e.pPassoT < this.t || dist(e, e.pPasso) < 0.15 || dist(e.pMeta || p, p) > 1.5) { e.pPasso = this.percorso(e, p, chi) || p; e.pPassoT = this.t + 0.4; e.pMeta = { x: p.x, y: p.y }; }
    const q = dist(e, p) < 1.2 ? p : e.pPasso;
    const d = dist(e, q);
    if (d < 0.05) return true;
    e.a = angolo(e, q);
    this.muovi(e, (q.x - e.x) / d * vel, (q.y - e.y) / d * vel, chi);
    return dist(e, p) < 0.6;
  }

  // ---------- messaggi, rumori, effetti ----------
  avvisa(testo, tipo = 'sistema', posto = null) { this.messaggi.push({ n: ++this.nMsg, testo, tipo, posto, t: this.t }); if (this.messaggi.length > 30) this.messaggi.shift(); }
  rumore(x, y, r, secondi = 0.6, chi = null, tipo = null) { this.rumori.push({ x, y, r, fino: this.t + secondi, chi, tipo }); }
  // la creatura impara un trucco (e la prima volta che l'ha capito lo dice)
  impara(tipo, k = 1) { const capito = D.impara(this.mente, tipo, k); if (capito && this.creatura) this.avvisa(`🧠 ${D.CAPITO[capito](this.creatura.ref.nome)}`, 'master'); }
  sa(tipo) { return D.quanto(this.mente, tipo); }
  effetto(e) { e.n = ++this.nFx; e.t = this.t; this.fx.push(e); if (this.fx.length > 40) this.fx.shift(); }

  // ---------- nemici e creatura ----------
  nuovoNemico(id, ar) {
    const ref = R.mostroDa({ id });
    if (!ref) return null;
    const p = this.cellaLibera(ar.gx * S.SW + 4 + Math.floor(Math.random() * (S.SW - 8)), ar.gy * S.SH + 4 + Math.floor(Math.random() * (S.SH - 8)));
    const n = { id: `n${this.nemici.length}`, ref, x: p.x + 0.5, y: p.y + 0.5, a: Math.random() * 6, area: ar.id, casa: { x: p.x + 0.5, y: p.y + 0.5 }, stato: 'giro', meta: null, cd: 0, vel: tileVel(ref), via: false, androide: ref.tratti.includes('androide'), stordito: 0 };
    this.nemici.push(n);
    return n;
  }
  svegliaCreatura() {
    if (this.creatura) return;
    const ref = R.mostroDa({ id: this.cp.cacciatore });
    // la prima volta esce vicino a voi: un indizio preciso della direttrice
    const vivi = this.gioc.filter((p) => !this.g.pg[p.posto].morto), v = vivi[0] || this.gioc[0];
    this.mente.indizio = { x: v.x, y: v.y, fino: this.t + 16, errore: 4 };
    this.creatura = { id: 'creatura', ref, x: 0, y: 0, a: 0, fuori: false, stato: 'condotti', fino: this.t + 5, meta: null, cd: 0, vel: tileVel(ref), cercati: new Set(), grata: null, scacciata: 0 };
    this.avvisa(caso(this.cp.arrivo), 'master');
  }
  // la creatura esce da una grata (vicino a dove vuole andare)
  esci(verso) {
    const c = this.creatura;
    const grate = this.mappa.grate.filter((q) => !this.gioc.some((p) => !this.g.pg[p.posto].morto && dist(p, { x: q.x + 0.5, y: q.y + 0.5 }) < 4));
    const vicine = grate.map((q) => ({ q, d: Math.hypot(q.x + 0.5 - verso.x, q.y + 0.5 - verso.y) })).filter((x) => x.d < 26).sort((a, b) => a.d - b.d);
    const sc = vicine.length ? vicine[Math.min(vicine.length - 1, Math.floor(Math.random() * 3))].q : null;
    if (!sc) { c.fino = this.t + 4; return; }
    const p = this.cellaLibera(sc.x, sc.y);
    c.x = p.x + 0.5; c.y = p.y + 0.5; c.fuori = true; c.grata = sc;
    c.stato = 'giro'; c.fino = this.t + 32 + Math.random() * 22; c.meta = { x: verso.x, y: verso.y }; c.cercati.clear();
    this.rumore(c.x, c.y, 7, 0.8, 'creatura');
    this.effetto({ tipo: 'grata', x: c.x, y: c.y });
  }
  rientra() {
    const c = this.creatura;
    c.fuori = false; c.stato = 'condotti'; c.fino = this.t + (c.scacciata > this.t ? c.scacciata - this.t : 4 + Math.random() * 6); c.meta = null;
    this.effetto({ tipo: 'grata', x: c.x, y: c.y });
  }
  scaccia(perche) {
    const c = this.creatura;
    if (!c || !c.fuori || c.stato === 'fuga') return;
    c.stato = 'fuga'; c.scacciata = this.t + (18 + Math.random() * 10) * (1 - 0.4 * this.sa('fuoco')); this.mente.tensione = 30; this.mente.calma = 0;
    const grata = this.mappa.grate.map((q) => ({ q, d: Math.hypot(q.x + 0.5 - c.x, q.y + 0.5 - c.y) })).sort((a, b) => a.d - b.d)[0];
    c.meta = grata ? { x: grata.q.x + 0.5, y: grata.q.y + 0.5 } : null;
    c.ref.pf = c.ref.pfMax;
    this.avvisa(`🔥 ${c.ref.nome} urla e scappa nei condotti: ${perche}. Per un po' non torna.`, 'master');
    this.g.daiPx(Math.round(50 * this.g.livelloMedio()), `${c.ref.nome} scacciato`);
    this.versione++;
  }
  // chi vede la creatura (o un nemico): distanza, cono, luce, torcia, accovacciato, nascosto
  vedePg(n, p, { cono = 1.2, lontano = 12 } = {}) {
    const st = this.g.incubo.stato[p.posto];
    if (p.armadietto || this.g.pg[p.posto].morto) return false;
    const d = dist(n, p);
    const ar = this.areaIn(p);
    let r = ar.luce === 'accesa' ? lontano : ar.luce === 'emergenza' ? lontano * 0.75 : lontano * 0.45;
    if (st.torcia && st.batteria > 0) r = Math.max(r, lontano * 1.1);
    if (p.acc) r *= 0.55;
    if (p.sottoMobile && p.acc) r = n === this.creatura ? 1.4 + 3 * this.sa('sotto') : 1.4;
    if (d > r) return false;
    if (d > 1.6 && diffAng(n.a, angolo(n, p)) > cono) return false;
    return this.vede(n, p);
  }
  // l'attacco di un nemico (regole: d20 + bonus contro la CA)
  colpisci(n, p) {
    const pg = this.g.pg[p.posto];
    const a = n.ref.attacchi.find((x) => !x.gittata) || n.ref.attacchi[0];
    const t = R.d20({});
    const colpito = t.valore === 20 || (t.valore !== 1 && t.valore + a.bonus >= pg.ca);
    this.effetto({ tipo: 'colpo', x: p.x, y: p.y, da: n.id, colpito });
    if (!colpito) { this.avvisa(`${n.ref.nome} attacca ${pg.nome} con ${a.nome}: ${t.valore + a.bonus} contro CA ${pg.ca}, mancato.`, 'tiro', p.posto); return; }
    const q = R.tira(a.danno, { critico: t.valore === 20 }).totale;
    this.danno(p, q, a.tipo, `${n.ref.nome} (${a.nome})`);
  }
  danno(p, q, tipo, da) {
    const pg = this.g.pg[p.posto];
    if (pg.morto) return;
    const prima = pg.pf;
    const sub = R.applicaDanno(pg, q, tipo, {});
    this.avvisa(`💥 ${pg.nome} subisce ${sub} danni da ${da}.`, 'tiro', p.posto);
    this.effetto({ tipo: 'sangue', x: p.x, y: p.y });
    this.g.paura(p.posto, 1);
    if (pg.pf <= 0 && prima > 0 && !pg.morto) { p.caduto = this.ora + CADUTO_MS; p.armadietto = null; this.avvisa(`🩸 ${pg.nome} è a terra! Un compagno vicino può ${pg.genere === 'f' ? 'rialzarla' : 'rialzarlo'} con E.`, 'master'); }
    if (pg.morto) this.muore(p);
  }
  muore(p, testo = null) {
    const pg = this.g.pg[p.posto];
    pg.morto = true; pg.pf = 0; p.caduto = 0; p.armadietto = null;
    this.avvisa(`💀 ${pg.nome} è ${pg.genere === 'f' ? 'morta' : 'morto'}. ${testo || ''}`, 'master');
    this.g.scrivi('sistema', `💀 ${pg.nome} è ${pg.genere === 'f' ? 'morta' : 'morto'}.`);
    this.versione++;
    if (this.g.pgVivi().length === 0) this.g.tuttiMorti();
  }

  // ---------- un passo del gioco ----------
  tick(ora) {
    const g = this.g;
    if (g.fase !== 'reale') return false;
    this.ora = ora; this.t += DT;
    const v0 = this.versione;
    this.rumori = this.rumori.filter((r) => r.fino > this.t);
    this.fuochi = this.fuochi.filter((f) => f.fino > this.t);
    this.fumi = this.fumi.filter((f) => f.fino > this.t);
    this.luci = this.luci.filter((f) => f.fino > this.t);
    for (const p of this.gioc) this.passoPg(p);
    for (const l of this.lanci.splice(0)) if (l.arriva > this.t) this.lanci.push(l); else this.atterra(l);
    for (const n of this.nemici) if (!n.via) this.passoNemico(n);
    if (this.creatura) { this.dirigi(); this.passoCreatura(); } else if (g.incubo.caccia.attiva || this.t > this.risveglio) { g.incubo.caccia.attiva = true; this.svegliaCreatura(); }
    else if (this.t > this.risveglio * 0.4 && !this.presagio) { this.presagio = true; this.avvisa(caso(PRESAGI), 'master'); this.rumore(this.gioc[0].x + 6, this.gioc[0].y - 4, 9, 1.2, 'creatura'); }
    // il fuoco brucia chi ci passa
    for (const f of this.fuochi) {
      for (const n of [...this.nemici.filter((x) => !x.via), ...(this.creatura && this.creatura.fuori ? [this.creatura] : [])]) if (dist(n, f) < f.r && !(f.colpiti.has(n.id))) { f.colpiti.add(n.id); this.feriscinemico(n, R.tira('2d6').totale, 'fuoco', null); }
    }
    // gli obiettivi da raggiungere e i settori visitati
    for (const p of this.gioc) {
      if (g.pg[p.posto].morto) continue;
      const ar = this.areaIn(p);
      if (!g.incubo.visitate.includes(ar.id)) { g.incubo.visitate.push(ar.id); this.avvisa(`📍 ${ar.nome}. ${ar.ingresso}`, 'master'); this.versione++; }
      const ob = g.obiettivoOra;
      if (ob && ob.fai === 'raggiungi' && ob.area === ar.id) this.obiettivo(p);
    }
    const pr = this.gioc.find((p) => !g.pg[p.posto].morto) || this.gioc[0];
    g.incubo.area = this.areaIn(pr).id;
    return this.versione !== v0 || g.finita || g.fase !== 'reale';
  }
  passoPg(p) {
    const g = this.g, pg = g.pg[p.posto], st = g.incubo.stato[p.posto];
    if (pg.morto) return;
    if (pg.pf <= 0) { if (p.caduto && this.ora > p.caduto) this.muore(p, 'Nessuno è arrivato in tempo.'); return; }
    if (g.bot[p.posto]) this.pensaBot(p);
    p.cd = Math.max(0, p.cd - DT);
    if (p.azione) { // un'azione lunga (costruire, usare un terminale, rialzare un compagno): bisogna restare fermi
      if (Math.hypot(p.mx, p.my) > 0.2) { p.azione = null; this.avvisa('Azione interrotta.', 'sistema', p.posto); }
      else if (this.t >= p.azione.fino) { const a = p.azione; p.azione = null; a.fatto(); }
    }
    if (p.armadietto) return;
    const vel = p.ril ? VEL.rilevatore : p.acc ? VEL.accucciato : p.corre ? VEL.corre : VEL.cammina;
    const l = Math.hypot(p.mx, p.my);
    if (l > 0.1) {
      const k = Math.min(1, l);
      this.muovi(p, (p.mx / l) * vel * k, (p.my / l) * vel * k, p);
      if (p.corre && !p.acc && this.t - p.ultimoRumore > 0.3) { p.ultimoRumore = this.t; this.rumore(p.x, p.y, 7.5, 0.4, p.posto, 'corsa'); }
      else if (!p.acc && this.t - p.ultimoRumore > 0.6) { p.ultimoRumore = this.t; this.rumore(p.x, p.y, 2.5, 0.4, p.posto, st.torcia && st.batteria > 0 ? 'passi' : 'buio'); }
    }
    p.sottoMobile = S.SOTTO.has(this.ch(p.x, p.y));
    // batterie della torcia
    const ar = this.areaIn(p);
    if (st.torcia && st.batteria > 0 && ar.luce !== 'accesa' && this.cp.meccaniche.batterie) {
      st.batteria = Math.max(0, st.batteria - DT * (this.cp.id === 'manicomio' ? 0.6 : 0.3));
      if (!st.batteria) { st.torcia = false; this.avvisa('🪫 Batterie finite: la luce si spegne.', 'sistema', p.posto); this.versione++; }
    }
    // la paura: al buio sale piano, alla luce scende
    if (Math.random() < DT / 6) g.paura(p.posto, ar.luce === 'buio' && !(st.torcia && st.batteria > 0) ? 1 : ar.luce === 'accesa' ? -1 : 0);
    // il rilevatore fa bip
    if (p.ril && this.t - p.bip > 1) { p.bip = this.t; this.rumore(p.x, p.y, 2.5, 0.3, p.posto); }
  }
  pensaBot(p) {
    const g = this.g;
    const umani = this.gioc.filter((q) => q !== p && !g.bot[q.posto] && !g.pg[q.posto].morto);
    const capo = umani.sort((a, b) => dist(a, p) - dist(b, p))[0] || this.gioc.find((q) => q !== p && !g.pg[q.posto].morto);
    const c = this.creatura;
    p.mx = 0; p.my = 0; p.corre = false; p.acc = false;
    // la creatura è vicina e lo cerca: nell'armadietto
    if (c && c.fuori && dist(c, p) < 9 && c.stato !== 'fuga') {
      if (p.armadietto) return;
      const arm = this.vicinoA(p, ['a'], 4);
      if (arm) { if (dist(p, arm) < 1.3) this.entraArmadietto(p, arm); else { const v = this.verso(p, arm); p.mx = v.x; p.my = v.y; } return; }
      p.acc = true;
    } else if (p.armadietto && (!c || !c.fuori || dist(c, p) > 14)) { this.esciArmadietto(p); return; }
    if (p.armadietto) return;
    // attacca i nemici vicini
    const ber = this.nemici.filter((n) => !n.via && dist(n, p) < 6 && this.vede(p, n)).sort((a, b) => dist(a, p) - dist(b, p))[0];
    if (ber && p.cd <= 0) { p.a = angolo(p, ber); this.attacca(p); }
    // segue il capo (o va verso l'obiettivo)
    const meta = capo || this.puntoObiettivo();
    if (meta && dist(p, meta) > 2.2) { const v = this.verso(p, meta); p.mx = v.x; p.my = v.y; p.corre = dist(p, meta) > 7 && !(c && c.fuori); }
    // compagni a terra
    const giu = this.gioc.find((q) => q !== p && g.pg[q.posto].pf <= 0 && !g.pg[q.posto].morto && dist(q, p) < 1.5);
    if (giu && !p.azione) this.interagisci(p);
  }
  verso(p, meta) { const q = this.percorso(p, meta, p) || meta; const d = dist(p, q) || 1; return { x: (q.x - p.x) / d, y: (q.y - p.y) / d }; }
  vicinoA(p, simboli, r) {
    let meglio = null, md = r;
    for (let y = Math.floor(p.y - r); y <= p.y + r; y++) for (let x = Math.floor(p.x - r); x <= p.x + r; x++) if (simboli.includes(this.ch(x, y))) { const d = Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y); if (d < md) { md = d; meglio = { x: x + 0.5, y: y + 0.5, cx: x, cy: y }; } }
    return meglio;
  }
  puntoObiettivo() {
    const ob = this.g.obiettivoOra;
    if (!ob) return null;
    const pt = this.mappa.punti.find((q) => q.obiettivo === ob.id);
    if (pt) return { x: pt.x + 0.5, y: pt.y + 0.5 };
    const ar = this.cp.aree.find((a) => a.id === ob.area);
    return ar ? this.cellaLibera(ar.gx * S.SW + S.SW / 2 | 0, ar.gy * S.SH + S.SH / 2 | 0) : null;
  }
  entraArmadietto(p, arm) { p.nascostoDa = this.t; const c = this.creatura; if (c && c.fuori && dist(c, p) < 12 && !(p.imparato > this.t)) { p.imparato = this.t + 8; this.impara('armadietto'); } p.armadietto = { x: arm.cx, y: arm.cy, da: { x: p.x, y: p.y } }; p.x = arm.x; p.y = arm.y; this.g.incubo.stato[p.posto].nascosto = true; this.rumore(p.x, p.y, 1.5, 0.3, p.posto); }
  esciArmadietto(p) { const a = p.armadietto; if (!a) return; p.x = a.da.x; p.y = a.da.y; p.armadietto = null; this.g.incubo.stato[p.posto].nascosto = false; this.rumore(p.x, p.y, 2, 0.3, p.posto); }

  passoNemico(n) {
    n.cd = Math.max(0, n.cd - DT);
    if (n.stordito > this.t) return;
    const vivi = this.gioc.filter((p) => !this.g.pg[p.posto].morto && this.g.pg[p.posto].pf > 0);
    const visto = vivi.filter((p) => this.vedePg(n, p, { lontano: 9 })).sort((a, b) => dist(a, n) - dist(b, n))[0];
    if (visto) { n.stato = 'insegue'; n.meta = { x: visto.x, y: visto.y }; n.perso = this.t + 5; }
    else if (n.stato === 'insegue' && this.t > n.perso) n.stato = 'giro';
    if (n.stato === 'giro') {
      // sente il rumore?
      const r = this.rumori.find((q) => q.chi !== 'creatura' && dist(q, n) < q.r * (n.androide ? 0.35 : 0.8));
      if (r) { n.meta = { x: r.x, y: r.y }; n.stato = 'indaga'; }
      else if (!n.meta || dist(n, n.meta) < 0.7) { const p = this.cellaLibera(Math.floor(n.casa.x + (Math.random() - 0.5) * 14), Math.floor(n.casa.y + (Math.random() - 0.5) * 10)); n.meta = { x: p.x + 0.5, y: p.y + 0.5 }; }
    }
    if (n.stato === 'indaga' && n.meta && dist(n, n.meta) < 0.8) n.stato = 'giro';
    if (!n.meta) return;
    const tiro = n.ref.attacchi.find((a) => a.gittata);
    if (n.stato === 'insegue' && visto && tiro && dist(n, visto) > 2 && dist(n, visto) < tiro.gittata / 1.5) {
      n.a = angolo(n, visto);
      if (n.cd <= 0) { n.cd = 1.6; this.effetto({ tipo: 'sparo', x: n.x, y: n.y, x2: visto.x, y2: visto.y }); this.rumore(n.x, n.y, 12, 0.5, 'nemico'); this.colpisciDistanza(n, visto, tiro); }
      return;
    }
    // il facehugger salta addosso da qualche metro
    if (visto && n.ref.tratti.includes('facehugger') && dist(n, visto) < 4 && dist(n, visto) > 1.1 && n.cd <= 0 && !(n.salto > this.t)) { n.salto = this.t + 0.35; n.cd = 2.2; this.rumore(n.x, n.y, 4, 0.3, 'nemico'); }
    const arriva = this.vaiVerso(n, n.meta, n.salto > this.t ? n.vel * 3.4 : n.stato === 'insegue' ? n.vel * 1.15 : n.vel * 0.6);
    if (n.salto > this.t && visto && dist(n, visto) < 1.1) { n.salto = 0; this.colpisci(n, visto); return; }
    if (n.stato === 'insegue' && visto && dist(n, visto) < 1.1 && n.cd <= 0) { n.cd = 1.4; this.colpisci(n, visto); }
    if (arriva && n.stato !== 'insegue') n.meta = null;
  }
  colpisciDistanza(n, p, a) {
    const pg = this.g.pg[p.posto];
    const t = R.d20({});
    if (t.valore === 20 || (t.valore !== 1 && t.valore + a.bonus >= pg.ca)) this.danno(p, R.tira(a.danno).totale, a.tipo, `${n.ref.nome} (${a.nome})`);
  }
  // la direttrice: guarda quanto siete al sicuro e quanto è passato dall'ultimo incontro
  dirigi() {
    const c = this.creatura, g = this.g;
    const vivi = this.gioc.filter((p) => !g.pg[p.posto].morto);
    if (!vivi.length) return;
    const dMin = Math.min(...vivi.map((p) => dist(p, c)));
    const vede = c.fuori && vivi.some((p) => !p.armadietto && dist(p, c) < 14 && this.vede(c, p));
    const gruppo = { x: vivi.reduce((s, p) => s + p.x, 0) / vivi.length, y: vivi.reduce((s, p) => s + p.y, 0) / vivi.length };
    const prima = this.ordine;
    this.ordine = D.direttrice(this.mente, DT, this.t, { dMin: c.x || c.y ? dMin : Infinity, caccia: c.fuori && c.stato === 'caccia', vede, fuori: c.fuori, difficolta: g.difficolta, gruppo });
    if (prima !== 'tregua' && this.ordine === 'tregua' && c.fuori && c.stato !== 'caccia') c.fino = Math.min(c.fino, this.t + 3);
    D.dimentica(this.mente, DT);
  }
  passoCreatura() {
    const c = this.creatura, g = this.g;
    c.cd = Math.max(0, c.cd - DT);
    const vivi = this.gioc.filter((p) => !g.pg[p.posto].morto);
    if (!vivi.length) return;
    if (!c.fuori) {
      // nei condotti: si sposta verso il rumore più forte o verso un personaggio a caso, poi esce
      if (c.scacciata > this.t) return;
      const tregua = this.ordine === 'tregua', ind = this.ordine === 'indizio' && this.mente.indizio;
      const forte = this.rumori.filter((r) => r.chi !== 'creatura' && r.r >= (tregua ? 20 : 7) && this.abbocca(r)).sort((a, b) => b.r - a.r)[0];
      if (forte && this.t > c.fino - 6) { this.esci(forte); if (c.fuori) { c.stato = 'indaga'; c.meta = { x: forte.x, y: forte.y }; } return; }
      if (ind && this.t > c.fino - 8) { this.esci(ind); if (c.fuori) { c.stato = 'cerca'; c.meta = this.vicinoLibero(ind, ind.errore); c.fino = this.t + 25; } return; }
      // nel condotto si muove (il rilevatore lo vede passare): in tregua lontano da voi, se no verso la zona che sceglie
      if (!c.condotto || this.t > c.condotto.fino) {
        const zona = ind || this.zonaDiCaccia();
        const gr = tregua ? caso(this.mappa.grate.filter((q) => vivi.every((p) => Math.hypot(q.x - p.x, q.y - p.y) > 30))) : caso(this.mappa.grate.filter((q) => Math.hypot(q.x - zona.x, q.y - zona.y) < 26));
        const g2 = gr || caso(this.mappa.grate);
        c.condotto = { x: g2.x + 0.5, y: g2.y + 0.5, fino: this.t + 3 + Math.random() * 3, verso: zona };
      }
      if (tregua) { c.fino = Math.max(c.fino, this.t + 2); }
      const d = dist(c, c.condotto) || 1; const v = Math.min(d, 7 * DT);
      // si sente passare sopra di voi
      if (!tregua && this.t > (c.tonfo || 0) && vivi.some((p) => dist(p, c) < 14)) { c.tonfo = this.t + 2 + Math.random() * 3; this.rumore(c.x, c.y, 8, 0.9, 'creatura'); }
      if (c.x === 0 && c.y === 0) { c.x = c.condotto.x; c.y = c.condotto.y; }
      c.x += (c.condotto.x - c.x) / d * v; c.y += (c.condotto.y - c.y) / d * v;
      const lenta = g.difficolta === 'storia' ? 1.6 : g.difficolta === 'mortale' ? 0.7 : 1;
      if (this.t > c.fino * 1) { c.fino = this.t + 999; this.esci(c.condotto.verso); if (!c.fuori) c.fino = this.t + 5 * lenta; }
      return;
    }
    const velBase = c.vel * (g.difficolta === 'storia' ? 0.85 : g.difficolta === 'mortale' ? 1.08 : 1);
    if (c.stato === 'fuga') {
      if (!c.meta || this.vaiVerso(c, c.meta, velBase * 1.2)) this.rientra();
      return;
    }
    // torna alla grata (fine del giro o tregua della direttrice): se vede qualcuno però insegue
    if (c.stato === 'rientro' && (!c.meta || this.vaiVerso(c, c.meta, velBase * 0.8) || this.t > c.fino)) { this.rientra(); return; }
    if (c.stato === 'rientro' && c.trascina > this.t) return; // si porta via il corpo: non guarda nessuno
    // vede qualcuno?
    const visto = vivi.filter((p) => g.pg[p.posto].pf > 0 && this.vedePg(c, p, { cono: 1.05, lontano: 14 })).sort((a, b) => dist(a, c) - dist(b, c))[0];
    if (visto) {
      if (c.stato !== 'caccia') { c.ruggito = this.t + 0.8; this.avvisa(`⚠️ ${c.ref.nome} vi ha visti!`, 'master'); for (const p of vivi) if (dist(p, c) < 15) g.paura(p.posto, 2); this.rumore(c.x, c.y, 10, 0.8, 'creatura'); this.effetto({ tipo: 'urlo', x: c.x, y: c.y }); }
      c.stato = 'caccia'; c.meta = { x: visto.x, y: visto.y }; c.perso = this.t + 4; c.preda = visto.posto; D.ricordaZona(this.mente, this.areaIn(visto).id, DT * 2);
    }
    if (c.stato === 'caccia') {
      const preda = this.gioc[c.preda];
      if (!visto && this.t > c.perso) { c.stato = 'cerca'; c.fino = Math.max(c.fino, this.t + 12); c.cercati.clear(); }
      if (preda && !visto && preda.armadietto && dist(c, preda) < 6) { c.stato = 'cerca'; c.meta = { x: preda.x, y: preda.y }; }
      if (preda && preda.corre && visto === preda) this.impara('corsa', DT * 0.5);
      const vicino = vivi.filter((p) => g.pg[p.posto].pf > 0 && !p.armadietto && dist(p, c) < 0.95)[0];
      if (vicino && c.cd <= 0) { this.uccide(c, vicino); return; }
      if (c.ruggito > this.t) { c.a = angolo(c, c.meta); return; } // si ferma un attimo a ruggire: il tempo di girarsi e correre
      // in caccia è più veloce di chi corre: bisogna rompere la linea di vista e nascondersi
      this.vaiVerso(c, c.meta, Math.max(velBase * 1.25, VEL.corre * (g.difficolta === 'storia' ? 0.92 : g.difficolta === 'mortale' ? 1.12 : 1.05)) * (1 + 0.08 * this.sa('corsa')));
      return;
    }
    // sente qualcosa? (chi corre o cammina al buio lo sente meglio, se ha imparato che lo fate)
    const orecchio = (q) => q.r * (c.ref.tratti.includes('sensiAcuti') ? 1.4 : 1) * (q.tipo === 'corsa' ? 1 + 0.6 * this.sa('corsa') : q.tipo === 'buio' ? 1 + 0.8 * this.sa('buio') : 1);
    const r = this.rumori.filter((q) => q.chi !== 'creatura' && dist(q, c) < orecchio(q) && this.abbocca(q)).sort((a, b) => b.r - a.r)[0];
    if (r && !(this.ordine === 'tregua' && r.r < 20)) { c.stato = 'indaga'; c.meta = { x: r.x, y: r.y }; c.fino = Math.max(c.fino, this.t + 10); if (r.chi != null && this.gioc[r.chi]) D.ricordaZona(this.mente, this.areaIn(r).id, 0.3); }
    // impara guardando: chi si accovaccia sotto i mobili o resta al buio mentre lei cerca
    if (c.stato === 'cerca' || c.stato === 'indaga') for (const p of vivi) {
      if (dist(p, c) > 8) continue;
      if (p.sottoMobile && p.acc) this.impara('sotto', DT * 0.5);
      const st = g.incubo.stato[p.posto];
      if (!(st.torcia && st.batteria > 0) && !p.armadietto) this.impara('buio', DT * 0.25);
    }
    if (c.stato === 'indaga' || c.stato === 'cerca') {
      // ogni tanto si ferma ad ascoltare (gira la testa, non cammina)
      const ascolta = c.ascolta > this.t;
      if (ascolta) c.a += DT * 1.4 * (c.verso || 1);
      const arrivato = !ascolta && (!c.meta || this.vaiVerso(c, c.meta, velBase * (c.stato === 'indaga' ? 1.15 : 0.85)));
      if (arrivato && Math.random() < 0.4) { c.ascolta = this.t + 1.5 + Math.random() * 2; c.verso = Math.random() < 0.5 ? -1 : 1; }
      // fruga negli armadietti vicini (una volta ciascuno)
      for (const p of vivi) if (p.armadietto && dist(p, c) < 1.9 + 1.5 * this.sa('armadietto') && !c.cercati.has(p.posto)) {
        c.cercati.add(p.posto);
        const pg = g.pg[p.posto];
        const cd = 11 + (c.ref.tratti.includes('sensiAcuti') ? 2 : 0) + (g.difficolta === 'mortale' ? 2 : g.difficolta === 'storia' ? -3 : 0) + Math.round(3 * this.sa('armadietto')) + Math.min(3, Math.floor((this.t - (p.nascostoDa || this.t)) / 20)); // chi resta nascosto troppo a lungo rischia di più
        const pr = R.prova(pg, 'furtivita', { cd, svantaggio: g.incubo.stato[p.posto].paura >= 7, venti: T.consuma(g, p.posto) });
        this.avvisa(`🫣 ${c.ref.nome} si ferma davanti all'armadietto di ${pg.nome}… Furtività ${pr.totale} contro ${cd}: ${pr.riuscita ? 'non ti trova' : 'TI HA TROVATO!'}`, 'tiro', p.posto);
        if (!pr.riuscita) { this.esciArmadietto(p); this.uccide(c, p); return; }
        this.impara('armadietto', 0.5);
      }
      if (arrivato) {
        if (c.stato === 'indaga') { c.stato = 'cerca'; c.cercati.clear(); }
        // dove guarda: negli armadietti, sotto i mobili (se ha imparato che vi nascondete lì) o in giro
        const sotto = this.sa('sotto'), arm = this.vicinoA(c, sotto > 0.3 ? ['a', 'l', 't'] : ['a'], 7);
        c.meta = arm && Math.random() < 0.5 + 0.45 * Math.max(this.sa('armadietto'), sotto) ? arm : this.vicinoLibero(c, 6);
      }
    } else {
      // pattuglia: non sa dove siete. Va verso l'indizio della direttrice o nelle zone dove vi ha già trovati
      if (!c.meta || dist(c, c.meta) < 1) { const ind = this.ordine === 'indizio' && this.mente.indizio; c.meta = ind ? this.vicinoLibero(ind, ind.errore) : this.vicinoLibero(this.zonaDiCaccia(), 7); }
      if (this.ordine === 'tregua' && c.fino > this.t + 3) c.fino = this.t + 3;
      this.vaiVerso(c, c.meta, velBase * 0.8);
    }
    if (this.t > c.fino && c.stato !== 'caccia') { // torna nei condotti dalla grata più vicina
      const gr = this.vicinoA(c, ['v'], 3);
      if (gr) this.rientra(); else { const q = this.mappa.grate.map((x) => ({ x: x.x + 0.5, y: x.y + 0.5, d: Math.hypot(x.x - c.x, x.y - c.y) })).sort((a, b) => a.d - b.d)[0]; c.meta = { x: q.x, y: q.y }; c.stato = 'rientro'; c.fino = this.t + 20; }
    }
  }
  // un diversivo: se ha imparato il trucco spesso non ci casca (si decide una volta per rumore)
  abbocca(r) {
    if (r.tipo !== 'diversivo') return true;
    if (r.abbocca == null) { r.abbocca = Math.random() >= 0.8 * this.sa('diversivo'); if (r.abbocca) this.impara('diversivo'); else if (this.creatura && this.creatura.fuori && dist(r, this.creatura) < r.r) this.avvisa(`🧠 ${this.creatura.ref.nome} sente il diversivo… e non si muove.`, 'master'); }
    return r.abbocca;
  }
  // la zona dove cercare senza indizi: un settore dove vi ha già trovati, o uno di quelli visitati
  zonaDiCaccia() {
    const aree = this.g.incubo.visitate.length ? this.g.incubo.visitate : [this.cp.aree[0].id];
    const a = this.cp.aree.find((x) => x.id === D.zonaPreferita(this.mente, aree)) || this.cp.aree[0];
    return { x: a.gx * S.SW + S.SW / 2, y: a.gy * S.SH + S.SH / 2 };
  }
  vicinoLibero(q, r) { const p = this.cellaLibera(Math.floor(q.x + (Math.random() - 0.5) * 2 * r), Math.floor(q.y + (Math.random() - 0.5) * 2 * r)); return { x: p.x + 0.5, y: p.y + 0.5 }; }
  uccide(c, p) {
    const g = this.g, pg = g.pg[p.posto];
    c.cd = 2.5;
    this.effetto({ tipo: 'urlo', x: c.x, y: c.y });
    if (g.difficolta === 'storia') { this.danno(p, R.tira('4d10').totale, 'perforante', c.ref.nome); return; }
    // l'ultima possibilità: un tiro salvezza su Destrezza (CD 18) per divincolarsi
    const ts = R.salvezza(pg, 'des', { cd: g.difficolta === 'mortale' ? 20 : 17, venti: T.consuma(g, p.posto) });
    if (ts.riuscita) { this.avvisa(`😮‍💨 ${pg.nome} si divincola all'ultimo! (tiro salvezza su Destrezza ${ts.totale})`, 'tiro', p.posto); this.danno(p, R.tira('2d10').totale, 'taglio', c.ref.nome); c.cd = 1.5; return; }
    this.muore(p, caso(this.cp.morte));
    // si porta via il corpo nei condotti: gli altri hanno un momento per scappare
    if (c === this.creatura) { const q = this.mappa.grate.map((x) => ({ x: x.x + 0.5, y: x.y + 0.5, d: Math.hypot(x.x - c.x, x.y - c.y) })).sort((a, b) => a.d - b.d)[0]; if (q) { c.stato = 'rientro'; c.meta = { x: q.x, y: q.y }; c.fino = this.t + 12; c.trascina = this.t + 7; } }
  }
  feriscinemico(n, q, tipo, p) {
    if (n === this.creatura) {
      const sub = R.applicaDanno(n.ref, q, tipo, {});
      if (n.ref.pf <= 0) n.ref.pf = 1;
      this.effetto({ tipo: 'sangue', x: n.x, y: n.y, acido: true });
      if (tipo === 'fuoco') this.impara('fuoco');
      if (tipo === 'fuoco' && n.ref.tratti.includes('temeFuoco') && Math.random() < 0.6 * this.sa('fuoco')) { n.stato = 'cerca'; n.meta = this.vicinoLibero(n, 5); n.fino = this.t + 6; this.avvisa(`🧠 ${n.ref.nome} si scansa dalle fiamme… e resta.`, 'master'); }
      else if (tipo === 'fuoco' && n.ref.tratti.includes('temeFuoco')) this.scaccia('odia il fuoco');
      else if (n.ref.pf <= n.ref.pfMax * 0.4) this.scaccia('è ferita');
      else { n.stato = 'caccia'; n.meta = p ? { x: p.x, y: p.y } : n.meta; n.perso = this.t + 3; if (p) n.preda = p.posto; }
      return sub;
    }
    const sub = R.applicaDanno(n.ref, q, tipo, {});
    this.effetto({ tipo: 'sangue', x: n.x, y: n.y, olio: n.androide });
    if (p) { n.stato = 'insegue'; n.meta = { x: p.x, y: p.y }; n.perso = this.t + 5; }
    if (n.ref.pf <= 0) {
      n.via = true;
      this.avvisa(`☠️ ${n.ref.nome} è a terra.`, 'tiro');
      this.g.daiPx(Math.max(10, Math.round((n.ref.px || 25) / Math.max(1, this.g.pgVivi().length))), n.ref.nome);
      this.versione++;
    }
    return sub;
  }

  // ---------- le azioni dei giocatori ----------
  attacca(p) {
    const g = this.g, pg = g.pg[p.posto];
    if (p.cd > 0 || p.armadietto || pg.pf <= 0) return;
    const lista = this.armi(pg);
    const a = lista[Math.min(p.arma, lista.length - 1)];
    if (!a) return;
    const def = B.ARMI[a.id];
    if (def && def.munizioni) { if (!H.togli(pg, def.munizioni)) { this.avvisa(`Niente munizioni per ${a.nome}.`, 'sistema', p.posto); p.cd = 0.4; return; } this.versione++; }
    p.cd = a.mischia ? 0.75 : def && def.prop.includes('ricarica') ? 1.6 : 0.9;
    const bersagli = [...this.nemici.filter((n) => !n.via), ...(this.creatura && this.creatura.fuori ? [this.creatura] : [])];
    let colpito = null;
    if (a.mischia) {
      colpito = bersagli.filter((n) => dist(n, p) < 1.5 && diffAng(p.a, angolo(p, n)) < 0.9).sort((x, y) => dist(x, p) - dist(y, p))[0];
      this.effetto({ tipo: 'fendente', x: p.x, y: p.y, a: p.a });
      this.rumore(p.x, p.y, 4, 0.4, p.posto);
    } else {
      const portata = (a.gittata ? a.gittata[1] : 20) / 1.5;
      const fiamma = def && def.prop.includes('fiamma');
      const cand = bersagli.filter((n) => dist(n, p) < portata && diffAng(p.a, angolo(p, n)) < (fiamma ? 0.35 : 0.14 + 0.5 / Math.max(1, dist(n, p))) && this.vede(p, n)).sort((x, y) => dist(x, p) - dist(y, p));
      colpito = cand[0];
      const fine = colpito || { x: p.x + Math.cos(p.a) * Math.min(portata, 12), y: p.y + Math.sin(p.a) * Math.min(portata, 12) };
      this.effetto({ tipo: fiamma ? 'fiamma' : 'sparo', x: p.x, y: p.y, x2: fine.x, y2: fine.y });
      this.rumore(p.x, p.y, def && def.prop.includes('rumorosa') ? 16 : 6, 0.6, p.posto);
      if (fiamma) { this.fuochi.push({ x: fine.x, y: fine.y, r: 1.2, fino: this.t + 2, colpiti: new Set() }); if (this.creatura && this.creatura.fuori && dist(this.creatura, p) < portata && diffAng(p.a, angolo(p, this.creatura)) < 0.4 && this.vede(p, this.creatura)) this.scaccia('il lanciafiamme la brucia'); }
    }
    if (!colpito) return;
    const t = R.d20({ venti: T.consuma(g, p.posto) });
    const ok = t.valore === 20 || (t.valore !== 1 && t.valore + a.colpire >= colpito.ref.ca);
    if (!ok) { this.avvisa(`${pg.nome} → ${colpito.ref.nome} con ${a.nome}: ${t.valore}${R.segno(a.colpire)} = ${t.valore + a.colpire} contro CA ${colpito.ref.ca}, mancato.`, 'tiro', p.posto); return; }
    const q = R.tira(a.danno, { critico: t.valore === 20 }).totale;
    const sub = this.feriscinemico(colpito, q, a.tipo, p);
    this.avvisa(`${pg.nome} → ${colpito.ref.nome} con ${a.nome}: ${t.valore + a.colpire} contro CA ${colpito.ref.ca}${t.valore === 20 ? ', CRITICO' : ''}: ${sub} danni.`, 'tiro', p.posto);
    if (def && def.prop.includes('stordisce') && colpito !== this.creatura) { colpito.stordito = this.t + (colpito.androide ? 3 : 2); this.avvisa(`⚡ ${colpito.ref.nome} è stordito.`, 'tiro', p.posto); }
  }
  armi(pg) {
    return pg.attacchi.filter((a) => a.id !== 'colpo' || pg.attacchi.length === 1 || CLASSI[pg.classe].base === 'monaco').map((a) => {
      const def = B.ARMI[a.id];
      return { ...a, munizioni: def && def.munizioni ? H.conta(pg, def.munizioni) : null };
    });
  }
  lancia(p, id, tx, ty) {
    const pg = this.g.pg[p.posto], def = H.OGGETTI[id];
    if (!def || !def.lancio || p.armadietto || !H.togli(pg, id)) return;
    const d = Math.hypot(tx - p.x, ty - p.y), max = 10;
    const k = d > max ? max / d : 1;
    let x = p.x + (tx - p.x) * k, y = p.y + (ty - p.y) * k;
    // si ferma contro i muri
    const n = Math.ceil(d * k * 3);
    for (let i = 1; i <= n; i++) { const xx = p.x + (x - p.x) * i / n, yy = p.y + (y - p.y) * i / n; if (S.OPACO.has(this.ch(xx, yy))) { x = p.x + (x - p.x) * (i - 1) / n; y = p.y + (y - p.y) * (i - 1) / n; break; } }
    this.lanci.push({ id, x, y, da: { x: p.x, y: p.y }, arriva: this.t + 0.5 + d * k * 0.03, posto: p.posto });
    this.effetto({ tipo: 'lancio', x: p.x, y: p.y, x2: x, y2: y, ogg: id });
    this.versione++;
  }
  atterra(l) {
    const def = H.OGGETTI[l.id], p = this.gioc[l.posto];
    this.effetto({ tipo: l.id, x: l.x, y: l.y });
    if (l.id === 'diversivo') { this.rumore(l.x, l.y, 22, 5, 'diversivo', 'diversivo'); return; }
    if (l.id === 'razzo') { this.rumore(l.x, l.y, 16, 7, 'diversivo', 'diversivo'); this.luci.push({ x: l.x, y: l.y, r: 6, fino: this.t + 8 }); return; }
    if (l.id === 'fumogeno') { this.fumi.push({ x: l.x, y: l.y, r: 3.2, fino: this.t + 9 }); return; }
    if (l.id === 'molotov') { this.fuochi.push({ x: l.x, y: l.y, r: 2.2, fino: this.t + 7, colpiti: new Set() }); this.rumore(l.x, l.y, 9, 0.6, 'diversivo'); return; }
    const raggio = l.id === 'bombaTubo' ? 2.8 : 2.4;
    this.rumore(l.x, l.y, l.id === 'bombaTubo' ? 26 : 8, 0.8, 'diversivo');
    for (const n of [...this.nemici.filter((x) => !x.via), ...(this.creatura && this.creatura.fuori ? [this.creatura] : [])]) {
      if (dist(n, l) > raggio) continue;
      if (l.id === 'minaEmp') { if (!n.androide) continue; n.stordito = this.t + 8; }
      this.feriscinemico(n, R.tira(def.danno).totale, def.tipoDanno, p);
    }
    if (l.id === 'bombaTubo') for (const q of this.gioc) if (!this.g.pg[q.posto].morto && dist(q, l) < raggio) this.danno(q, Math.floor(R.tira(def.danno).totale / 2), 'perforante', 'la bomba');
    if (l.id === 'bombaTubo' && this.creatura && this.creatura.fuori && dist(this.creatura, l) < raggio + 1) this.scaccia('l\'esplosione');
  }
  // E: la cosa più vicina con cui si può fare qualcosa
  interagisci(p) {
    const g = this.g, pg = g.pg[p.posto];
    if (p.armadietto) { this.esciArmadietto(p); return; }
    // un compagno a terra
    const giu = this.gioc.find((q) => q !== p && g.pg[q.posto].pf <= 0 && !g.pg[q.posto].morto && dist(q, p) < 1.6);
    if (giu) { p.azione = { nome: `Rialzi ${g.pg[giu.posto].nome}`, fino: this.t + 2.5, dur: 2.5, fatto: () => { const b = g.pg[giu.posto]; if (b.morto) return; const q = H.togli(pg, 'kitMedico') ? R.tira('2d4+2').totale * ((CLASSI[pg.classe].cura) || 1) : 1; R.cura(b, q); b.stabile = false; giu.caduto = 0; this.avvisa(`➕ ${pg.nome} rialza ${b.nome} (${b.pf} PF).`); this.versione++; } }; return; }
    // il punto dell'obiettivo attuale ha la precedenza sugli armadietti e le casse accanto
    const pt = this.puntoObiettivo();
    const cosa = (pt && this.ch(pt.x, pt.y) === 'o' && Math.hypot(pt.x - p.x, pt.y - p.y) < 1.6 && { x: pt.x, y: pt.y, cx: Math.floor(pt.x), cy: Math.floor(pt.y) }) || this.vicinoA(p, ['L', 'c', 'k', 'o', 'a', 'E', 'v'], 1.6);
    if (!cosa) return;
    const ch = this.ch(cosa.cx, cosa.cy), i = cosa.cy * this.w + cosa.cx;
    if (ch === 'a') { this.entraArmadietto(p, cosa); return; }
    if (ch === 'L') {
      const pas = this.mappa.passaggi.find((q) => q.celle && q.celle.some(([x, y]) => x === cosa.cx && y === cosa.cy));
      if (!pas) return;
      if (!g.chiaviDelGruppo().has(pas.serve)) { this.avvisa(`🔒 Chiuso: serve ${H.OGGETTI[pas.serve].nome}.`, 'sistema', p.posto); return; }
      const hacker = CLASSI[pg.classe].hacker;
      p.azione = { nome: hacker ? 'Bypass della porta' : 'Apri la porta', fino: this.t + (hacker ? 1 : 2), dur: hacker ? 1 : 2, fatto: () => { for (const [x, y] of pas.celle) this.cel[y * this.w + x] = '+'; this.mappa.g = this.cel.join(''); this.avvisa(`🔓 ${pg.nome} apre la porta con ${H.OGGETTI[pas.serve].nome}.`); this.rumore(cosa.x, cosa.y, 5, 0.5, p.posto); this.versione++; } };
      return;
    }
    if (ch === 'c') {
      if (this.aperti.has(i)) { this.avvisa('Vuota.', 'sistema', p.posto); return; }
      p.azione = { nome: 'Frughi nella cassa', fino: this.t + 1.5, dur: 1.5, fatto: () => {
        this.aperti.add(i);
        const cassa = this.mappa.contenitori.find((q) => q.x === cosa.cx && q.y === cosa.cy);
        const ogg = cassa ? cassa.oggetti : [];
        for (const id of ogg) H.dai(pg, id, H.SCATOLA[id] || 1);
        this.avvisa(`📦 ${pg.nome} trova: ${ogg.length ? ogg.map((id) => `${H.OGGETTI[id].icona} ${H.OGGETTI[id].nome}`).join(', ') : 'niente'}.`, 'sistema', p.posto);
        this.rumore(cosa.x, cosa.y, 3, 0.4, p.posto); this.versione++;
      } };
      return;
    }
    if (ch === 'k') { const term = this.mappa.terminali.find((q) => q.x === cosa.cx && q.y === cosa.cy); this.letti.add(i); this.salvataggio = { x: p.x, y: p.y }; this.avvisa(`🖥️ ${term ? term.testo : 'Il terminale è morto.'}`, 'master', p.posto); this.avvisa('💾 Posizione registrata al terminale: con !revive si riparte da qui.', 'sistema', p.posto); this.versione++; return; }
    if (ch === 'o') {
      const pt = this.mappa.punti.find((q) => q.x === cosa.cx && q.y === cosa.cy);
      const ob = g.obiettivoOra;
      if (!pt || !ob || pt.obiettivo !== ob.id) { this.avvisa(pt && g.incubo.fatti.includes(pt.obiettivo) ? 'Già fatto.' : 'Non ancora: c\'è prima altro da fare.', 'sistema', p.posto); return; }
      p.azione = { nome: ob.cosa, fino: this.t + 3, dur: 3, fatto: () => { this.rumore(cosa.x, cosa.y, 6, 1, p.posto); this.obiettivo(p); } };
      return;
    }
    if (ch === 'E' || ch === 'v') {
      const pas = this.mappa.passaggi.find((q) => q.capi && q.capi.some((c2) => c2.x === cosa.cx && c2.y === cosa.cy));
      if (!pas) { if (ch === 'v') this.avvisa('La grata è saldata: un condotto della creatura.', 'sistema', p.posto); return; }
      if (pas.serve && !g.chiaviDelGruppo().has(pas.serve)) { this.avvisa(`🔒 Non funziona: serve ${H.OGGETTI[pas.serve].nome}.`, 'sistema', p.posto); return; }
      const k = pas.capi.findIndex((c2) => c2.x === cosa.cx && c2.y === cosa.cy);
      const altro = pas.capi[1 - k];
      const tempo = pas.tipo === 'condotto' ? 2.5 : 3.5;
      p.azione = { nome: pas.tipo === 'condotto' ? 'Strisci nel condotto' : pas.tipo === 'tram' ? 'Prendi il tram' : 'Prendi l\'ascensore', fino: this.t + tempo, dur: tempo, fatto: () => {
        // il gruppo vicino viaggia insieme
        const insieme = this.gioc.filter((q) => !g.pg[q.posto].morto && g.pg[q.posto].pf > 0 && (q === p || dist(q, p) < 3.5 || g.bot[q.posto]));
        insieme.forEach((q, n2) => { const c3 = this.cellaLibera(altro.x + (n2 % 2), altro.y + Math.floor(n2 / 2)); q.x = c3.x + 0.5; q.y = c3.y + 0.5; q.armadietto = null; });
        if (pas.tipo !== 'condotto') this.rumore(altro.x, altro.y, 8, 1, p.posto);
        this.avvisa(`${pas.tipo === 'condotto' ? '🕳️' : pas.tipo === 'tram' ? '🚋' : '🛗'} ${this.areaIn(p).nome}.`);
        this.versione++;
      } };
    }
  }
  obiettivo(p) {
    const g = this.g, ob = g.obiettivoOra;
    if (!ob) return;
    this.avvisa(`✅ ${ob.titolo}`, 'master');
    g.completaObiettivo(p.posto);
    if (!g.finita) { const nuovo = g.obiettivoOra; if (nuovo) this.avvisa(`🎯 ${nuovo.titolo}: ${nuovo.testo}`); }
    if (g.incubo.caccia.attiva && !this.creatura) this.svegliaCreatura();
    this.versione++;
  }
  costruisci(p, id) {
    const g = this.g, pg = g.pg[p.posto];
    if (!H.RICETTE[id] || !this.cp.meccaniche.costruzione) return;
    const serve = g.costoRicetta(pg, id);
    for (const [k, n] of Object.entries(serve)) if (H.conta(pg, k) < n) { this.avvisa(`Manca: ${H.OGGETTI[k].nome}.`, 'sistema', p.posto); return; }
    p.azione = { nome: `Costruisci: ${H.OGGETTI[id].nome}`, fino: this.t + 2, dur: 2, fatto: () => {
      for (const [k, n] of Object.entries(serve)) if (H.conta(pg, k) < n) return;
      for (const [k, n] of Object.entries(serve)) H.togli(pg, k, n);
      H.dai(pg, id, H.SCATOLA[id] || 1);
      this.avvisa(`🛠️ ${pg.nome} costruisce: ${H.OGGETTI[id].icona} ${H.OGGETTI[id].nome}.`, 'sistema', p.posto); this.versione++;
    } };
  }
  // i comandi dal browser: { mx, my, corre, acc, a, ril, arma } sempre; gli altri con un numero che cresce (seq)
  input(posto, d) {
    const p = this.gioc[posto], g = this.g;
    if (!p || g.fase !== 'reale' || g.bot[posto]) return;
    const pg = g.pg[posto];
    if (!pg || pg.morto) return;
    const num = (v, a, b) => { const n = Number(v); return Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : 0; };
    p.mx = num(d.mx, -1, 1); p.my = num(d.my, -1, 1);
    p.corre = !!d.corre; p.acc = !!d.acc;
    if (Number.isFinite(Number(d.a))) p.a = Number(d.a);
    p.ril = !!d.ril && this.cp.meccaniche.rilevatore && H.conta(pg, 'rilevatore') > 0;
    if (Number.isInteger(d.arma)) p.arma = Math.max(0, Math.min(8, d.arma));
    const nuovo = (k) => { const s = Number(d[k]); if (!Number.isFinite(s) || s === p.seq[k]) return false; const primo = p.seq[k] == null; p.seq[k] = s; return !primo || s > 0; };
    if (pg.pf <= 0) return;
    if (d.att && nuovo('att')) this.attacca(p);
    if (d.usa && nuovo('usa')) this.interagisci(p);
    if (d.torcia && nuovo('torcia') && this.cp.meccaniche.batterie) { const st = g.incubo.stato[posto]; st.torcia = !st.torcia && st.batteria > 0; this.versione++; }
    if (d.ricarica && nuovo('ricarica')) { const st = g.incubo.stato[posto]; if (H.togli(pg, 'batterie')) { st.batteria = Math.min(100, st.batteria + 50); this.avvisa(`🔋 Batterie: ${Math.round(st.batteria)}%.`, 'sistema', posto); this.versione++; } }
    if (d.cura && nuovo('cura')) { if (pg.pf < pg.pfMax && H.togli(pg, 'kitMedico')) { const volte = CLASSI[pg.classe].cura || 1; let q = 0; for (let k = 0; k < volte; k++) q += R.tira('2d4+2').totale; q = R.cura(pg, q); this.avvisa(`➕ +${q} PF.`, 'sistema', posto); this.versione++; } }
    if (d.lancia && d.lancia.seq && nuovo('lancia')) this.lancia(p, String(d.lancia.id), num(d.lancia.x, 0, this.w), num(d.lancia.y, 0, this.h));
    if (d.costruisci && d.costruisci.seq && nuovo('costruisci')) this.costruisci(p, String(d.costruisci.id));
    if (d.hack && nuovo('hack')) {
      const n = this.nemici.find((x) => !x.via && x.androide && dist(x, p) < 1.6);
      if (n && CLASSI[pg.classe].hacker) p.azione = { nome: `Hackeri ${n.ref.nome}`, fino: this.t + 2, dur: 2, fatto: () => { const cd = 10 + Math.round(n.ref.gs || 1); const pr = R.prova(pg, 'indagare', { cd }); if (pr.riuscita && !n.via) { n.via = true; n.spento = true; this.avvisa(`💻 ${n.ref.nome}: «Arresto di emergenza». Si spegne. (${pr.totale} contro ${cd})`); this.versione++; } else this.avvisa(`💻 Il codice non entra (${pr.totale} contro ${cd}).`, 'sistema', posto); } };
    }
  }
  // dal pannello normale (azione del gioco): per ora niente, si gioca con input()
  azione(p, a) {
    if (a && a.tipo === 'input') { this.input(p, a.dati || {}); return { ok: true }; }
    if (a && a.tipo === 'scrivi') return this.scrivi(this.gioc[p], a.testo);
    return { errore: 'In tempo reale si gioca con la tastiera o il joystick' };
  }

  // ---------- l'azione scritta: il gioco non si ferma mentre il master risponde ----------
  scrivi(p, testo) {
    const g = this.g, pg = p && g.pg[p.posto];
    testo = String(testo || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!pg) return { errore: 'Non sei al tavolo' };
    if (!testo) return { errore: 'Scrivi cosa fai' };
    if (pg.morto) return { errore: 'Sei morto: scrivete !revive in chat' };
    if (p.scriveFino > this.t) return { errore: 'Aspetta: il master sta ancora rispondendo' };
    p.scriveFino = this.t + 10;
    this.avvisa(`✍️ ${pg.nome}: ${testo}`, 'azione');
    g.scrivi('azione', testo, { posto: p.posto, chi: pg.nome });
    const n = norm(testo);
    // subito, senza aspettare il master: urla, salti e colpi fanno rumore, respirare piano calma
    if (/\b(urlo|urla|grido|strillo|chiamo|canto|fischio|bestemmio)/.test(n)) this.rumore(p.x, p.y, 15, 1.2, p.posto);
    else if (/\b(salto|saltello|sbatto|calcio|prendo a calci|batto|rompo|spacco|tiro un pugno)/.test(n)) this.rumore(p.x, p.y, 7, 0.8, p.posto);
    else if (/\b(parlo|dico|chiedo|rispondo|sussurro|chiamo)/.test(n)) this.rumore(p.x, p.y, /sussurr/.test(n) ? 2 : 4.5, 0.6, p.posto);
    if (/\b(respiro|mi calmo|calmarmi|prego|chiudo gli occhi)/.test(n)) g.paura(p.posto, -1);
    const vicini = this.chiVede(p);
    if (g.chiave) {
      const ar = this.areaIn(p), ob = g.obiettivoOra, c = this.creatura;
      const msg = `TEMPO REALE (il gioco non si ferma). Settore: ${ar.nome} (${ar.desc}, luce: ${ar.luce}). Obiettivo attuale: ${ob ? `${ob.titolo}: ${ob.testo}` : 'nessuno'}.
Vicino a ${pg.nome}: ${vicini.length ? vicini.map((v) => `${v.nome}${v.androide ? ' (androide)' : ''} a ${Math.round(v.d * 1.5)} m`).join(', ') : 'nessuno in vista'}. ${c && c.fuori && dist(c, p) < 20 ? `${c.ref.nome} è a ${Math.round(dist(c, p) * 1.5)} m (${c.stato}).` : 'La creatura non è in vista.'}
${pg.nome} (${pg.classe}, ${pg.pf}/${pg.pfMax} PF, paura ${g.incubo.stato[p.posto].paura}/10) scrive: «${testo}».
Racconta l'esito in 1-3 frasi brevi, in italiano, al presente (i PNG parlano tra «»). Non muovere personaggi né creature, non dare oggetti: lo fa il gioco. Rispondi SOLO in JSON: {"narrazione": "…", "rumore": 0-5, "paura": -2..2}`;
      MASTER.chiamaGemini({ chiave: g.chiave, sistema: g.sistema(), messaggi: [{ ruolo: 'giocatori', testo: msg }], fetch: g.fetch, maxToken: 600 })
        .then((x) => {
          let o = null;
          if (!x.errore) { const t = String(x.testo || ''); try { o = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)); } catch (e) { o = { narrazione: MASTER.leggiRisposta(t).narrazione }; } }
          this.risposta(p, o && o.narrazione ? o : this.riserva(p, n, vicini));
        })
        .catch(() => this.risposta(p, this.riserva(p, n, vicini)));
    } else this.risposta(p, this.riserva(p, n, vicini));
    return { ok: true };
  }
  // chi vede il personaggio da vicino (per parlarci)
  chiVede(p) {
    const out = [];
    for (const n of this.nemici) if (!n.via && dist(n, p) < 8 && this.vede(p, n)) out.push({ nome: n.ref.nome, androide: n.androide, d: dist(n, p), n });
    const c = this.creatura;
    if (c && c.fuori && dist(c, p) < 10 && this.vede(p, c)) out.push({ nome: c.ref.nome, creatura: true, d: dist(c, p), n: c });
    return out.sort((a, b) => a.d - b.d);
  }
  risposta(p, o) {
    const g = this.g;
    if (g.finita || g.fase !== 'reale') return;
    p.scriveFino = 0;
    const testo = String(o.narrazione || '').trim().slice(0, 500);
    if (testo) { this.avvisa(`📜 ${testo}`, 'master'); g.scrivi('master', testo); }
    const r = Math.max(0, Math.min(5, Math.round(Number(o.rumore) || 0)));
    if (r) this.rumore(p.x, p.y, r * 3, 1, p.posto);
    const q = Math.max(-2, Math.min(2, Math.round(Number(o.paura) || 0)));
    if (q) g.paura(p.posto, q);
  }
  // il master di riserva: risponde da solo alle cose più comuni
  riserva(p, n, vicini) {
    const g = this.g, pg = g.pg[p.posto], ar = this.areaIn(p), c = this.creatura, v = vicini[0];
    const parla = /\b(parlo|dico|chiedo|rispondo|sussurro|saluto|convinco|minaccio|imploro|chiamo)/.test(n);
    if (parla && v && v.creatura) return { narrazione: `${v.nome} non capisce le parole. Capisce la voce: gira la testa verso di te.`, paura: 1 };
    if (parla && v && v.androide) return { narrazione: caso(this.cp.id === 'pathos' ? [`${v.nome} gracchia con una voce umana: «Non riesco a vedere… sei tu, mamma?»`, `${v.nome}: «Il WAU ci protegge. Il WAU protegge tutti.»`, `${v.nome} si ferma un istante, gli occhi che lampeggiano: «Non dovreste essere qui.»`] : [`${v.nome}, gentile: «Questa zona è riservata al personale autorizzato.»`, `${v.nome}: «Vi prego di non correre nei corridoi.»`, `${v.nome}, senza espressione: «È irregolare. Siete un pericolo per voi stessi.»`, `${v.nome}: «Sono qui per aiutarvi.» Le mani si alzano comunque.`]) };
    if (parla && v) return { narrazione: caso([`${v.nome} non vuole sentire ragioni: ha paura quanto voi, e la paura lo rende cattivo.`, `${v.nome} vi guarda un attimo, poi ringhia qualcosa di incomprensibile.`, `«Andatevene!» grida ${v.nome}. Troppo forte.`]) };
    if (parla) return { narrazione: caso([`La voce di ${pg.nome} rimbalza nel corridoio vuoto. Nessuno risponde… per ora.`, 'Solo l\'eco, e il ronzio delle ventole. Qualcuno, da qualche parte, ha sentito.', 'Silenzio. Poi un rumore metallico, lontano, nei condotti.']) };
    if (/\b(ascolto|ascolta|sento|tendo l'orecchio|origlio)/.test(n)) {
      if (!c || (!c.fuori && !c.condotto)) return { narrazione: 'Ronzio delle macchine, gocce, il tuo respiro. Niente si muove, per ora.' };
      const d = dist(c, p), a = angolo(p, c), dir = ['a est', 'a sud-est', 'a sud', 'a sud-ovest', 'a ovest', 'a nord-ovest', 'a nord', 'a nord-est'][(Math.round(a / (Math.PI / 4)) + 8) % 8];
      return { narrazione: d < 25 ? `${c.fuori ? 'Passi pesanti' : 'Qualcosa striscia nei condotti'}, ${dir}${d < 10 ? ', vicinissimo' : ''}.` : 'Molto lontano, qualcosa si muove nei condotti. Per ora non è qui.', paura: d < 10 ? 1 : 0 };
    }
    if (/\b(urlo|urla|grido|strillo|canto|fischio|bestemmio)/.test(n)) return { narrazione: 'Il tuo urlo riempie il settore e rimbomba nei condotti. Qualcosa, da qualche parte, si è girato verso di te.', paura: 1 };
    if (/\b(salto|saltello|sbatto|calcio|batto|rompo|spacco)/.test(n)) return { narrazione: 'Un colpo secco sul metallo: il rumore corre lungo le pareti.' };
    if (/\b(respiro|mi calmo|calmarmi|prego|chiudo gli occhi)/.test(n)) return { narrazione: `${pg.nome} respira piano, conta fino a dieci. Il cuore rallenta un po'.` };
    if (/\b(guardo|osservo|esamino|leggo|cerco)/.test(n)) return { narrazione: `${caso(ar.eventi || [ar.ingresso])} (Per frugare nelle casse e usare le cose: E.)` };
    return { narrazione: caso([`${pg.nome} ci prova. ${caso(ar.eventi || ['Il settore resta in silenzio.'])}`, `Fatto. Intorno, ${ar.nome} resta immobile e buio… quasi.`, `${caso(ar.eventi || ['Le luci tremano.'])}`]) };
  }
  revive(morti) {
    const vivo = this.gioc.find((q) => !this.g.pg[q.posto].morto && !morti.includes(q.posto));
    const base = vivo || this.salvataggio || { x: this.mappa.partenza.x + 0.5, y: this.mappa.partenza.y + 0.5 };
    morti.forEach((k, n) => { const q = this.gioc[k]; const c = this.cellaLibera(Math.floor(base.x) + (n % 2) + 1, Math.floor(base.y)); q.x = c.x + 0.5; q.y = c.y + 0.5; q.caduto = 0; q.armadietto = null; });
    if (this.g.fase !== 'reale' && !this.g.finita) this.g.fase = 'reale';
    if (this.creatura && this.creatura.fuori) { this.creatura.scacciata = this.t + 20; this.rientra(); }
    this.versione++;
  }

  // ---------- quello che vede ognuno ----------
  visibile(p, e) {
    if (dist(p, e) < 1.6) return true;
    const st = this.g.incubo.stato[p.posto];
    const ar = this.areaIn(e);
    let r = LUCE_VISTA[ar.luce] || 9;
    const torcia = st.torcia && st.batteria > 0;
    if (torcia && diffAng(p.a, angolo(p, e)) < 0.55) r = Math.max(r, this.cp.id === 'manicomio' ? 11 : 12);
    if (this.luci.some((l) => dist(l, e) < l.r) || this.fuochi.some((f) => dist(f, e) < f.r + 2)) r = 16;
    if (p.armadietto) r = Math.min(r, 6);
    return dist(p, e) <= r && this.vede(p, e);
  }
  vistaTick(posto) {
    const g = this.g, p = this.gioc[posto];
    if (!p) return null;
    // chi è morto guarda un compagno vivo
    const occhi = !g.pg[posto].morto ? p : this.gioc.find((q) => !g.pg[q.posto].morto) || p;
    const st = g.incubo.stato[occhi.posto];
    const ent = [];
    for (const n of this.nemici) if (!n.via && this.visibile(occhi, n)) ent.push({ id: n.id, k: n.androide ? 'androide' : 'nemico', s: n.ref.aspetto.s, x: +n.x.toFixed(2), y: +n.y.toFixed(2), a: +n.a.toFixed(2), pf: n.ref.pf, pfMax: n.ref.pfMax, st: n.stordito > this.t ? 'stordito' : n.stato });
    const c = this.creatura;
    if (c && c.fuori && this.visibile(occhi, c)) ent.push({ id: 'creatura', k: 'creatura', s: c.ref.aspetto.s, x: +c.x.toFixed(2), y: +c.y.toFixed(2), a: +c.a.toFixed(2), st: c.stato });
    // il rilevatore: tutto quello che si muove entro 22 caselle (anche nei condotti), senza dire cos'è
    let blip = null;
    if (p.ril && !g.pg[posto].morto) {
      blip = [];
      const mosso = (e) => e.pPasso || e.stato === 'insegue' || e.stato === 'caccia';
      const vago = (e) => [+(e.x + (Math.random() - 0.5) * 1.2).toFixed(1), +(e.y + (Math.random() - 0.5) * 1.2).toFixed(1)]; // il segnale non è preciso
      for (const n of this.nemici) if (!n.via && dist(n, p) < 22 && mosso(n)) blip.push(vago(n));
      if (c && (c.fuori ? !(c.ascolta > this.t) : c.condotto) && dist(c, p) < 22 && !(c.scacciata > this.t && !c.fuori)) blip.push(vago(c));
      for (const q of this.gioc) if (q !== p && !g.pg[q.posto].morto && Math.hypot(q.mx, q.my) > 0.1 && dist(q, p) < 22) blip.push([+q.x.toFixed(1), +q.y.toFixed(1)]);
    }
    const suoni = this.rumori.filter((r) => r.chi !== posto && dist(r, occhi) < r.r + 6 && r.fino - this.t > 0.2 && (r.chi === 'creatura' || r.r >= 7)).slice(-4).map((r) => [+r.x.toFixed(1), +r.y.toFixed(1), r.chi === 'creatura' ? 1 : 0]);
    return {
      t: +this.t.toFixed(2), io: posto, occhi: occhi.posto,
      g: this.gioc.map((q) => ({ x: +q.x.toFixed(2), y: +q.y.toFixed(2), a: +q.a.toFixed(2), acc: q.acc, corre: q.corre && Math.hypot(q.mx, q.my) > 0.1, arm: !!q.armadietto, giu: g.pg[q.posto].pf <= 0 && !g.pg[q.posto].morto, morto: !!g.pg[q.posto].morto, torcia: g.incubo.stato[q.posto].torcia && g.incubo.stato[q.posto].batteria > 0, ril: q.ril, az: q.azione ? { nome: q.azione.nome, p: 1 - (q.azione.fino - this.t) / q.azione.dur } : null, caduto: q.caduto ? Math.max(0, Math.round((q.caduto - this.ora) / 1000)) : 0 })),
      ent, blip, suoni,
      fx: this.fx.filter((f) => this.t - f.t < 0.6 && dist(f, occhi) < 30).map((f) => ({ ...f, t: undefined })),
      fuochi: this.fuochi.filter((f) => dist(f, occhi) < 30).map((f) => [+f.x.toFixed(1), +f.y.toFixed(1), f.r]),
      fumi: this.fumi.filter((f) => dist(f, occhi) < 30).map((f) => [+f.x.toFixed(1), +f.y.toFixed(1), f.r]),
      luci: this.luci.filter((f) => dist(f, occhi) < 30).map((f) => [+f.x.toFixed(1), +f.y.toFixed(1), f.r]),
      bat: Math.round(st.batteria), paura: st.paura, cd: +p.cd.toFixed(2),
      porte: this.porteAperte(occhi),
      msg: this.messaggi.filter((m) => m.posto == null || m.posto === posto).slice(-6).map((m) => ({ n: m.n, testo: m.testo, tipo: m.tipo })),
      allarme: !!(c && c.fuori && c.stato === 'caccia' && dist(c, occhi) < 16),
      inseguito: !!(c && c.fuori && c.stato === 'caccia' && c.preda === occhi.posto),
      vicina: !c || (c.x === 0 && c.y === 0) || c.scacciata > this.t ? 0 : c.fuori ? (dist(c, occhi) < 8 ? 3 : dist(c, occhi) < 15 ? 2 : dist(c, occhi) < 24 ? 1 : 0) : dist(c, occhi) < 10 ? 1 : 0,
    };
  }
  porteAperte(p) { // le porte vicine aperte (per disegnarle)
    const out = [];
    for (let y = Math.floor(p.y - 14); y <= p.y + 14; y++) for (let x = Math.floor(p.x - 20); x <= p.x + 20; x++) if (this.ch(x, y) === '+' && !this.portaChiusa(x, y)) out.push(y * this.w + x);
    return out;
  }
  // la parte che cambia di rado (va nella vista normale del gioco)
  vistaFissa(posto) {
    const g = this.g, pg = g.pg[posto];
    return {
      v: this.versione, w: this.w, h: this.h, sw: S.SW, sh: S.SH, mappa: this.mappa.g,
      aree: this.cp.aree.map((a) => ({ id: a.id, nome: a.nome, gx: a.gx, gy: a.gy, luce: a.luce, stile: a.stile, visitata: g.incubo.visitate.includes(a.id) })),
      aperti: [...this.aperti], letti: [...this.letti],
      punto: (() => { const p = this.puntoObiettivo(); return p ? [p.x, p.y] : null; })(),
      armi: pg ? this.armi(pg).map((a) => ({ nome: a.nome, mischia: a.mischia, munizioni: a.munizioni, danno: a.danno, colpire: a.colpire })) : [],
      creaturaSveglia: !!this.creatura, nomeCreatura: MOSTRI[this.cp.cacciatore].nome,
    };
  }
}

module.exports = { TempoReale };
