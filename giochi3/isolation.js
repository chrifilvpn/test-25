// ALIEN: ISOLATION 3D — il primo gioco in 3D del sito, in prima persona. Un settore della stazione Sevastopol
// (isolation/mappa.js): tutti insieme contro lo xenomorfo. Bisogna riaccendere i tre generatori (Medicina, Ingegneria,
// Comunicazioni) per sbloccare l'attracco del Torrens e scappare. Lo xenomorfo è immortale: si evita, ci si nasconde
// (armadietti, sotto scrivanie e letti), lo si distrae coi razzi, lo si scaccia col lanciafiamme.
// Il mostro lo fa l'IA (isolation/alieno.js: direttrice + mente che impara) oppure un giocatore scelto al tavolo, come
// il master: vede al buio, sente i rumori, si muove nei condotti, apre gli armadietti, uccide da vicino.
// MODALITÀ SURVIVAL (opzione del tavolo): uno o più xenomorfi (persone o computer) contro i sopravvissuti, che devono
// completare insieme tante TASK (minigiochi ai terminali e ai generatori) e poi scappare sul Torrens. Chi sta fermo è
// invisibile agli xenomorfi (se non gli sono attaccati), gli xenomorfi sentono i rumori come nuvolette sulla mappa e
// uccidono con un colpo davanti a sé; il lanciafiamme li stordisce per pochi secondi.
// Il server muove tutto 20 volte al secondo; il browser disegna in 3D (three.js) e muove subito il proprio personaggio
// (Arena: movimento previsto). Unità: il decimetro (vedi mappa.js).
const { Arena } = require('../giochi/arena');
const T_ = require('../giochi/trucco');
const M = require('./isolation/mappa');
const AI = require('./isolation/alieno');

const { T } = M;
const R_UMANO = 4;
const VEL = { cammina: 30, corre: 52, accucciato: 14, rilevatore: 20, alieno: 30, alienoCorre: 62, condotto: 95 };
const RUMORE = { cammina: 55, corre: 180, accucciato: 12, rilevatore: 45, porta: 70, generatore: 260, fiamma: 220, razzo: 320, armadietto: 40, task: 240, botola: 60 };
// survival: le stazioni delle task (terminali e generatori), i minigiochi, quanto durano al minimo, chi sta fermo
const STAZIONI = M.OGGETTI.m.map((t) => ({ t, tipo: 'm' })).concat(M.OGGETTI.G.map((t) => ({ t, tipo: 'G' })));
const MINIGIOCHI = ['fili', 'codice', 'sequenza', 'taratura'];
const TASK_MIN = [0, 1.5, 2.5, 3.5]; // secondi minimi per difficoltà (sotto è un imbroglio)
const TASK_BOT = [0, 6, 8.5, 11]; // quanto ci mette un compagno del computer
const FERMO = 0.5; // dopo mezzo secondo fermo si diventa invisibili agli xenomorfi
const ATTACCATO = 25; // ...tranne che a chi ti sta attaccato (2,5 m)
const BOTOLA = 3; // secondi per strisciare da una botola all'altra
const GEN_TEMPO = 10; // secondi per riaccendere un generatore
const FIATO = 4.5; // secondi di fiato trattenuto
const FIAMMA = { portata: 65, cono: 0.55, durata: 0.7 };
const BIT = { corre: 1, accucciato: 2, rilevatore: 4, respiro: 8 };
const caso = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angolo = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const davanti = (e, d) => ({ x: e.x + Math.cos(e.yaw) * d, y: e.y + Math.sin(e.yaw) * d });

class Isolation extends Arena {
  constructor(o) {
    super(o, { id: 'isolation', round: 1, tickMs: 50 });
    this.nRound = 1;
    this.W = 1280; this.H = 720; // la tela (il mondo è nella mappa)
    const op = o.opzioni || {};
    this.difficolta = ['facile', 'normale', 'difficile'].includes(op.difficolta) ? op.difficolta : 'normale';
    this.survival = op.modalita === 'survival';
    // gli xenomorfi: posti del tavolo (scelto o a caso; i posti vuoti li gioca il computer) oppure l'IA; da soli è sempre l'IA
    this.mostri = [];
    const posto = (chi) => { const c = Number(chi); return Number.isInteger(c) && c >= 1 && c <= this.n ? c - 1 : null; };
    if (this.survival) {
      this.durata = ([10, 5, 15, 20].includes(Number(op.tempoS)) ? Number(op.tempoS) : 10) * 60;
      this.obiettivo = [20, 30, 40].includes(Number(op.task)) ? Number(op.task) : 20;
      this.nAlieni = Math.max(1, Math.min(3, Number(op.alieni) || 1));
      if (this.n >= 2) {
        this.nAlieni = Math.min(this.nAlieni, this.n - 1);
        const primo = posto(op.chiS);
        if (primo !== null) this.mostri.push(primo);
        const liberi = Array.from({ length: this.n }, (_, i) => i).filter((i) => !this.mostri.includes(i));
        while (this.mostri.length < this.nAlieni) this.mostri.push(liberi.splice(Math.floor(Math.random() * liberi.length), 1)[0]);
      }
    } else {
      this.durata = ([20, 30, 15].includes(Number(op.durata)) ? Number(op.durata) : 20) * 60;
      this.nAlieni = 1;
      if (op.mostro === 'giocatore' && this.n >= 2) { const p = posto(op.chi); this.mostri.push(p !== null ? p : Math.floor(Math.random() * this.n)); }
    }
    this.mostro = this.mostri.length ? this.mostri[0] : null;
    this.etichettaPunti = 'punti';
    this.avvia();
  }
  // ---------- preparazione ----------
  iniziaRound() {
    const partenze = M.OGGETTI.S.map(M.centro);
    this.umani = [];
    for (let k = 0; k < this.n; k++) {
      if (this.mostri.includes(k)) continue;
      const p = partenze[this.umani.length % partenze.length];
      this.umani.push({
        k, x: p.x, y: p.y, yaw: 0, pitch: 0, vx: 0, vy: 0, vivo: true, fuggito: false, nascosto: null, sotto: false,
        accucciato: false, corre: false, rilevatore: false, trattiene: false, torcia: true, batteria: 100, carburante: 1, razzi: 1,
        fiato: FIATO, fiamma: 0, gen: null, bip: 0, passi: 0, mente: { fino: 0 }, morto: null, task: null, botola: null, fermo: 0,
      });
    }
    // gli xenomorfi partono da grate diverse (il primo sopra la mensa)
    this.alieni = [];
    for (let i = 0; i < this.nAlieni; i++) {
      const A = AI.nuovo(this.difficolta, [5, 2, 6][i]);
      A.id = i;
      if (this.survival) { A.attesa = 8 + i * 4; A.mente.tregua = A.attesa; } // nella survival si comincia presto
      if (this.mostri[i] !== undefined) Object.assign(A, { giocatore: this.mostri[i], stato: 'condotto', inCondotto: true, stamina: 1, stordito: 0, colpoT: 0, pings: [] });
      this.alieni.push(A);
    }
    // survival: le stazioni (ognuna con il suo minigioco, poi si riposa un po' prima del prossimo)
    this.fatte = 0;
    this.stazioni = this.survival ? STAZIONI.map(() => this.nuovaTask({ pausa: Math.random() < 0.25 ? caso(5, 20) : 0 })) : [];
    this.generatori = M.OGGETTI.G.map(() => ({ carica: 0, acceso: false, chi: null }));
    this.accesi = this.generatori.map(() => false);
    this.sbloccato = false;
    this.porte = M.PORTE.map((p) => ({ a: 0, bloccata: p.bloccata }));
    this.aperte = {};
    // le scorte: a ogni partita ne compare solo una parte, scelta a caso (gli altri punti restano vuoti), e di più
    // quando si è in tanti; una scorta presa ricompare dopo un po'
    this.raccolti = []; this.ricarica = [];
    for (const tipo of ['b', 'f', 'r']) {
      const n = M.OGGETTI[tipo].length, quanti = Math.max(2, Math.min(n, Math.round(n * (0.35 + 0.07 * this.umani.length))));
      const scelti = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, quanti);
      for (let i = 0; i < n; i++) { this.raccolti.push(!scelti.includes(i)); this.ricarica.push(0); }
    }
    this.razzi = []; // { x, y, t }
    this.rumori = []; // i rumori di questo tick
    this.eventi = [];
    this.cmd = Array.from({ length: this.n }, () => ({ yaw: 0, pitch: 0, k: 0, c: [0, 0, 0, 0], visti: [0, 0, 0, 0] }));
    this.vittoria = null;
    this.cambiato = true;
  }
  spostaTempi() {}
  ev(e) { this.eventi.push(e); }
  rumore(x, y, r, tipo, chi = null) { if (chi !== null && this.winOn && this.winOn[chi]) return; this.rumori.push({ x, y, r, tipo, chi }); } // chi ha il trucco non fa rumore
  umano(k) { return this.umani.find((u) => u.k === k) || null; }
  get alieno() { return this.alieni[0]; }
  // lo xenomorfo più vicino a un punto (prima quelli fuori dai condotti)
  alienoVicino(p) {
    const fuori = this.alieni.filter((A) => !A.inCondotto), lista = fuori.length ? fuori : this.alieni;
    return lista.reduce((a, b) => (dist(a, p) <= dist(b, p) ? a : b));
  }
  mioAlieno(posto) { return this.alieni.find((A) => A.giocatore === posto && !this.bot[posto]) || null; }
  persona(A) { return A.giocatore !== undefined && A.giocatore !== null && !this.bot[A.giocatore]; }
  // chi sta fermo è invisibile agli xenomorfi (survival), se non è attaccato
  invisibileA(A, u) { return this.survival && u.fermo > FERMO && dist(A, u) > ATTACCATO; }
  nascostoDel(u) { return !!(u.nascosto || u.botola); }
  // la difficoltà sale con le task già fatte: all'inizio 1-2 stelle, verso la fine 2-3
  nuovaTask(o = {}) { const p = this.obiettivo ? Math.min(1, (this.fatte || 0) / this.obiettivo) : 0; return { tipo: MINIGIOCHI[Math.floor(Math.random() * MINIGIOCHI.length)], diff: Math.min(3, 1 + Math.floor(Math.random() * 2 + p * 1.5)), seme: 1 + Math.floor(Math.random() * 1e6), chi: null, pausa: 0, ...o }; }
  umaniInGioco() { return this.umani.filter((u) => u.vivo && !u.fuggito); }
  invisibile(k) { return !!(this.winOn && this.winOn[k]); }

  // comandi dal browser: oltre al movimento (Arena), dove si guarda, i tasti tenuti (bit) e i contatori dei tasti
  // premuti [usa, interagisci, torcia, razzo]
  input(p, d) {
    super.input(p, d);
    if (!d || this.finita || this.bot[p]) return;
    const c = this.cmd[p];
    if (Number.isFinite(Number(d.yw))) c.yaw = angolo(Number(d.yw));
    if (Number.isFinite(Number(d.pt))) c.pitch = Math.max(-1.4, Math.min(1.4, Number(d.pt)));
    if (Number.isInteger(d.k)) c.k = d.k & 15;
    // un contatore più basso di prima vuol dire pagina ricaricata: si riparte da lì
    if (Array.isArray(d.c)) for (let i = 0; i < 4; i++) { const v = Number(d.c[i]); if (!Number.isInteger(v) || v < 0) continue; if (v < c.c[i]) c.c[i] = c.visti[i] = v; else if (v > c.c[i] && v - c.c[i] < 50) c.c[i] = v; }
    // il minigioco finito: [stazione, seme]
    if (Array.isArray(d.tf) && Number.isInteger(d.tf[0]) && Number.isInteger(d.tf[1])) c.tf = [d.tf[0], d.tf[1]];
  }
  premuti(p) { const c = this.cmd[p], out = c.c.map((v, i) => Math.max(0, v - c.visti[i])); c.visti = c.c.slice(); return out; }

  // ---------- un passo del mondo ----------
  passo(dt) {
    aggiornaWin(this, dt);
    this.rumori = this.rumori.filter((n) => n.dura && (n.dura -= dt) > 0);
    this.porteAperte(dt);
    for (const u of this.umani) if (u.vivo && !u.fuggito) {
      if (this.bot[u.k]) this.pensaUmano(u, dt); else this.comandiUmano(u, dt);
      this.vivi(u, dt);
    }
    // i razzi bruciano e fanno rumore (prima degli xenomorfi, così lo sentono)
    for (const r of this.razzi) { r.t -= dt; if (Math.random() < dt * 2) this.rumore(r.x, r.y, RUMORE.razzo, 'razzo'); }
    this.razzi = this.razzi.filter((r) => r.t > 0);
    for (const A of this.alieni) {
      if (this.persona(A)) this.alienoGiocatore(A, dt);
      else AI.passo(this, A, dt);
      for (const t of A.imparato.splice(0)) this.annuncia(null, IMPARATO[t], IMPARATO[t]);
    }
    this.ricarica.forEach((t, i) => { if (t > 0 && (this.ricarica[i] -= dt) <= 0) { this.ricarica[i] = 0; this.raccolti[i] = false; } });
    for (const S of this.stazioni) if (S.pausa > 0 && (S.pausa -= dt) <= 0) { Object.assign(S, this.nuovaTask()); this.ev(['stazione', this.stazioni.indexOf(S)]); }
    // fine: tutti fuori o morti, o il tempo è finito
    const inGioco = this.umaniInGioco();
    if (!inGioco.length) {
      const salvi = this.umani.filter((u) => u.fuggito).length;
      this.vittoria = salvi ? 'umani' : 'alieno';
      return true;
    }
    if (this.tempoRound >= this.durata) { this.vittoria = this.umani.some((u) => u.fuggito) ? 'umani' : 'alieno'; return true; }
    return false;
  }
  porteAperte(dt) {
    const chi = this.umaniInGioco().filter((u) => !this.nascostoDel(u));
    for (const A of this.alieni) if (!A.inCondotto) chi.push(A);
    M.PORTE.forEach((p, i) => {
      const s = this.porte[i], c = M.centro([p.x, p.y]);
      if (s.bloccata && this.sbloccato) s.bloccata = false;
      const vuole = !s.bloccata && chi.some((e) => dist(e, c) < 34);
      const prima = s.a;
      s.a = Math.max(0, Math.min(1, s.a + (vuole ? 3.5 : -1.6) * dt));
      if (prima === 0 && s.a > 0) { this.ev(['porta', i]); this.rumore(c.x, c.y, RUMORE.porta, 'porta'); }
      this.aperte[i] = s.a > 0.7;
    });
  }
  // la persona: movimento (dal browser, previsto), tasti tenuti, tasti premuti
  comandiUmano(u, dt) {
    const c = this.cmd[u.k], [usa, inter, torcia, razzo] = this.premuti(u.k);
    u.yaw = c.yaw; u.pitch = c.pitch;
    u.corre = !!(c.k & BIT.corre) && !u.nascosto; u.accucciato = !!(c.k & BIT.accucciato); u.rilevatore = !!(c.k & BIT.rilevatore) && !u.nascosto; u.trattiene = !!(c.k & BIT.respiro);
    if (u.botola) return;
    if (torcia) this.torcia(u);
    if (inter) this.interagisci(u);
    // il minigioco finito nel browser (vale solo alla stazione giusta, col seme giusto e non troppo in fretta)
    if (c.tf) {
      const [si, seme] = c.tf; c.tf = null;
      const S = this.stazioni[si];
      if (u.task && u.task.s === si && S && S.seme === seme && S.chi === u.k) u.task.pronta = true; // si chiude appena passa il tempo minimo
    }
    if (u.nascosto) return;
    if (usa) this.fiamma(u);
    if (razzo) this.lancia(u);
    const i = this.inp[u.k];
    let dx, dy;
    if (i.px !== null && i.px !== undefined) { const d = this.verso(u.k, u, this.velocita(u), dt); dx = d.x; dy = d.y; }
    else { const f = -i.y, s = i.x; dx = Math.cos(u.yaw) * f - Math.sin(u.yaw) * s; dy = Math.sin(u.yaw) * f + Math.cos(u.yaw) * s; }
    this.muoviUmano(u, dx, dy, dt);
  }
  velocita(u) { const v = u.accucciato ? VEL.accucciato : u.rilevatore ? VEL.rilevatore : u.corre ? VEL.corre : VEL.cammina; return u.gen !== null || u.task ? 0 : v; }
  muoviUmano(u, dx, dy, dt) {
    const l = Math.hypot(dx, dy), v = this.velocita(u);
    const prima = { x: u.x, y: u.y };
    if (l > 0.05 && v > 0) {
      const k = Math.min(1.25, l) / l;
      M.muovi(u, dx * k * v * dt, dy * k * v * dt, R_UMANO, this.aperte, u.accucciato);
      // non si resta dentro gli altri
    }
    u.vx = (u.x - prima.x) / dt; u.vy = (u.y - prima.y) / dt;
    const vel = Math.hypot(u.vx, u.vy);
    // fermi (girarsi non conta): dopo mezzo secondo invisibili agli xenomorfi
    u.fermo = vel > 1 ? 0 : u.fermo + dt;
    // sotto una scrivania (accucciati dentro il quadretto del mobile)
    const [tx, ty] = M.quadretto(u);
    u.sotto = u.accucciato && M.cella(tx, ty) === 'T';
    // i passi fanno rumore (correndo tanto, accucciati quasi niente)
    if (vel > 5) {
      u.passi += dt;
      if (u.passi > 0.4) { u.passi = 0; this.rumore(u.x, u.y, u.accucciato ? RUMORE.accucciato : u.corre ? RUMORE.corre : RUMORE.cammina, u.corre ? 'corsa' : 'passi', u.k); }
    }
    // le porte bloccate dell'attracco e l'uscita
    if (this.sbloccato && M.OGGETTI.E.some((t) => t[0] === tx && t[1] === ty)) this.fugge(u);
    // si raccolgono le cose passandoci sopra
    this.raccogli(u);
  }
  // ogni tick per chi è in gioco: torcia, rilevatore, fiato, generatore
  vivi(u, dt) {
    if (u.torcia) { u.batteria = Math.max(0, u.batteria - dt * 0.9); if (!u.batteria) { u.torcia = false; this.ev(['torciaSpenta', u.k]); } }
    if (u.rilevatore) { u.bip -= dt; if (u.bip <= 0) { u.bip = 1; this.rumore(u.x, u.y, RUMORE.rilevatore, 'bip', u.k); } }
    if (u.fiamma > 0) u.fiamma -= dt;
    // nel passaggio di servizio: si striscia fino alla botola gemella
    if (u.botola) {
      u.botola.t += dt; u.fermo = 0;
      if (u.botola.t >= BOTOLA) {
        const c = M.centro(M.OGGETTI.P[u.botola.a]); u.x = c.x; u.y = c.y; u.botola = null;
        this.ev(['botola', u.k, 0]); this.rumore(u.x, u.y, RUMORE.botola, 'botola', u.k);
      }
      return;
    }
    // la task in corso: si resta vicini (i compagni del computer la finiscono da soli dopo un po')
    if (u.task) {
      const S = this.stazioni[u.task.s];
      u.task.t += dt;
      if (!S || S.chi !== u.k || S.pausa > 0 || dist(u, M.centro(STAZIONI[u.task.s].t)) > 34) { this.lasciaTask(u); return; }
      if (this.bot[u.k] ? u.task.t >= TASK_BOT[S.diff] : u.task.pronta && u.task.t >= TASK_MIN[S.diff]) this.completa(u);
    }
    // il fiato: si trattiene solo nascosti, poi si rifiata (e se finisce si ansima)
    if (u.nascosto && u.trattiene && u.fiato > 0) u.fiato = Math.max(0, u.fiato - dt);
    else u.fiato = Math.min(FIATO, u.fiato + dt * 0.8);
    if (u.nascosto && u.trattiene && u.fiato <= 0 && !u.ansima) { u.ansima = true; this.rumore(u.x, u.y, 40, 'ansima', u.k); }
    if (u.fiato > 1) u.ansima = false;
    // il generatore: si riaccende restando vicino (fa tanto rumore)
    if (u.gen !== null) {
      const G = this.generatori[u.gen], c = M.centro(M.OGGETTI.G[u.gen]);
      if (dist(u, c) > 30 || G.acceso || G.chi !== u.k) { if (G.chi === u.k) G.chi = null; u.gen = null; return; }
      const prima = G.carica;
      G.carica = Math.min(1, G.carica + dt / GEN_TEMPO);
      if (Math.floor(prima * 4) !== Math.floor(G.carica * 4)) this.rumore(c.x, c.y, RUMORE.generatore, 'generatore');
      if (G.carica >= 1) this.accendi(u, u.gen);
    }
  }
  torcia(u) { if (u.batteria > 0) { u.torcia = !u.torcia; this.ev(['torcia', u.k, u.torcia ? 1 : 0]); } }
  // E: armadietto (entra o esce), generatore, task, botola (nascondi: solo per nascondersi, i compagni del computer in fuga)
  interagisci(u, nascondi = false) {
    if (u.botola) return;
    if (u.nascosto) { this.esceArmadietto(u); return; }
    if (u.task) { this.lasciaTask(u); return; }
    const vicino = (lista, r) => {
      let best = null, bd = r;
      lista.forEach((t, i) => { const c = M.centro(t); const d = dist(u, c); const a = Math.abs(angolo(Math.atan2(c.y - u.y, c.x - u.x) - u.yaw)); if (d < bd && (a < 1.1 || d < 18)) { bd = d; best = i; } });
      return best;
    };
    if (nascondi) { /* niente task né generatori */ } else if (this.survival) {
      // una stazione con la task pronta e libera
      const si = vicino(STAZIONI.map((s) => s.t), 32);
      const S = si !== null ? this.stazioni[si] : null;
      if (S && S.pausa <= 0 && S.chi === null && !this.sbloccato) { S.chi = u.k; u.task = { s: si, t: 0 }; u.corre = false; this.ev(['taskInizia', si, u.k]); return; }
    } else {
      const g = vicino(M.OGGETTI.G, 30);
      // un generatore alla volta: se lo sta già riaccendendo un altro, si aspetta
      if (g !== null && !this.generatori[g].acceso && (this.generatori[g].chi === null || this.generatori[g].chi === u.k)) { u.gen = g; this.generatori[g].chi = u.k; this.ev(['genInizia', g]); return; }
    }
    // la botola di un passaggio di servizio (sotto i piedi)
    const b = M.OGGETTI.P.findIndex((t) => dist(u, M.centro(t)) < 14);
    if (b >= 0) {
      u.botola = { da: b, a: M.gemella(b), t: 0 }; this.lasciaGen(u); u.rilevatore = false; u.corre = false;
      this.ev(['botola', u.k, 1]); this.rumore(u.x, u.y, RUMORE.botola, 'botola', u.k);
      return;
    }
    const l = vicino(M.NASCONDIGLI, 26);
    if (l !== null) {
      const t = M.NASCONDIGLI[l];
      if (this.umani.some((v) => v.nascosto && v.nascosto.x === t[0] && v.nascosto.y === t[1])) return; // occupato
      u.nascosto = { x: t[0], y: t[1], prima: { x: u.x, y: u.y } };
      this.lasciaGen(u); u.rilevatore = false; u.corre = false;
      const c = M.centro(t); u.x = c.x; u.y = c.y;
      const [fx, fy] = M.verso[`${t[0]},${t[1]}`]; u.yaw = Math.atan2(fy, fx);
      this.ev(['armadietto', u.k, 1]); this.rumore(u.x, u.y, RUMORE.armadietto, 'armadietto', u.k);
      for (const A of this.alieni) if (!A.inCondotto && dist(A, u) < 160 && M.vede(A, u.nascosto.prima, this.aperte) && Math.abs(angolo(Math.atan2(u.y - A.y, u.x - A.x) - A.yaw)) < 1.3) AI.vistoNascondersi(this, A, t);
    }
  }
  lasciaGen(u) { if (u.gen !== null && this.generatori[u.gen].chi === u.k) this.generatori[u.gen].chi = null; u.gen = null; }
  lasciaTask(u) { const S = this.stazioni[u.task.s]; if (S && S.chi === u.k) S.chi = null; u.task = null; }
  // una task completata: conta per tutti, fa rumore; alla fine parte la fuga
  completa(u) {
    const si = u.task.s, S = this.stazioni[si], c = M.centro(STAZIONI[si].t);
    u.task = null;
    Object.assign(S, { chi: null, pausa: caso(25, 45) });
    this.fatte++;
    this.punti[u.k] += 1;
    this.rumore(c.x, c.y, RUMORE.task, 'task', u.k);
    this.ev(['task', si, u.k, this.fatte]);
    if (this.fatte >= this.obiettivo && !this.sbloccato) {
      this.sbloccato = true;
      this.annuncia(null, `📡 ${this.fatte} task completate: il Torrens è attraccato! FUGGITE all'attracco (a est del corridoio principale)`, `📡 Task completate: il Torrens è attraccato! FUGGI all'attracco`, true);
      this.ev(['sbloccato']);
      // gli xenomorfi sentono le sirene: vanno a fare la guardia all'attracco
      const e = M.centro([39, 15]);
      for (const A of this.alieni) {
        if (this.persona(A)) A.pings.push({ x: Math.round(e.x), y: Math.round(e.y), t: 8, tipo: 'fiuto' });
        else A.zona = e;
      }
    }
  }
  esceArmadietto(u) {
    const t = [u.nascosto.x, u.nascosto.y], [fx, fy] = M.verso[`${t[0]},${t[1]}`];
    const c = M.centro([t[0] + fx, t[1] + fy]);
    u.x = c.x; u.y = c.y; u.nascosto = null; u.annusato = false; u.sentito = 0;
    this.ev(['armadietto', u.k, 0]); this.rumore(u.x, u.y, RUMORE.armadietto, 'armadietto', u.k);
  }
  // il lanciafiamme: un getto davanti, scaccia la creatura
  fiamma(u) {
    if (u.carburante <= 0 || u.fiamma > 0) { if (u.carburante <= 0) this.ev(['vuoto', u.k]); return; }
    u.carburante--; u.fiamma = FIAMMA.durata;
    this.ev(['fiamma', u.k]); this.rumore(u.x, u.y, RUMORE.fiamma, 'fiamma', u.k);
    for (const A of this.alieni) {
      if (A.inCondotto) continue;
      const d = dist(A, u), a = Math.abs(angolo(Math.atan2(A.y - u.y, A.x - u.x) - u.yaw));
      if (!(d < FIAMMA.portata && (a < FIAMMA.cono || d < 14) && M.vede(u, A, this.aperte))) continue;
      this.punti[u.k] += 1;
      // una persona viene stordita (nella survival resta ferma qualche secondo); il computer scappa nei condotti
      if (this.persona(A)) { A.stordito = 3; A.colpoT = this.survival ? 3 : 6; AI.impara(A, 'fuoco'); this.ev(['brucia', Math.round(A.x), Math.round(A.y)]); }
      else AI.brucia(this, A);
      this.annuncia(u.k, this.survival ? 'stordisce uno xenomorfo col fuoco! 🔥' : 'scaccia lo xenomorfo col fuoco! 🔥', this.survival ? 'l\'hai stordito col fuoco! 🔥' : 'l\'hai scacciato col fuoco! 🔥');
    }
  }
  // il razzo di segnalazione: si lancia avanti, fa luce rossa e tanto rumore
  lancia(u) {
    if (u.razzi <= 0) { this.ev(['vuoto', u.k]); return; }
    u.razzi--;
    const p = { x: u.x, y: u.y }, passi = 20;
    for (let i = 0; i < passi; i++) { const q = { x: p.x + Math.cos(u.yaw) * 4, y: p.y + Math.sin(u.yaw) * 4 }; const [tx, ty] = M.quadretto(q); if (M.solida(tx, ty, this.aperte, true)) break; p.x = q.x; p.y = q.y; }
    this.razzi.push({ x: p.x, y: p.y, t: 18 });
    this.ev(['razzo', Math.round(p.x), Math.round(p.y)]);
    this.rumore(p.x, p.y, RUMORE.razzo, 'razzo');
  }
  raccogli(u) {
    const tipi = [['b', 0], ['f', M.OGGETTI.b.length], ['r', M.OGGETTI.b.length + M.OGGETTI.f.length]];
    for (const [tipo, base] of tipi) M.OGGETTI[tipo].forEach((t, i) => {
      if (this.raccolti[base + i] || dist(u, M.centro(t)) > 13) return;
      if (tipo === 'b') { if (u.batteria > 70) return; u.batteria = Math.min(100, u.batteria + 60); }
      if (tipo === 'f') { if (u.carburante >= 6) return; u.carburante = Math.min(6, u.carburante + 2); }
      if (tipo === 'r') { if (u.razzi >= 3) return; u.razzi++; }
      this.raccolti[base + i] = true;
      // ricompare dopo un po': prima se siete in tanti (le scorte bastano per tutti)
      this.ricarica[base + i] = caso(50, 80) * Math.min(1.5, 3 / Math.max(1, this.umaniInGioco().length || 1));
      this.ev(['preso', u.k, tipo]);
    });
  }
  accendi(u, i) {
    const G = this.generatori[i];
    G.acceso = true; G.carica = 1; G.chi = null; u.gen = null;
    this.accesi[i] = true;
    this.punti[u.k] += 2;
    const nome = M.stanzaDi(M.centro(M.OGGETTI.G[i])).nome.split(' · ')[0];
    const quanti = this.accesi.filter(Boolean).length;
    this.annuncia(u.k, `riaccende il generatore (${nome}) ⚡ ${quanti}/3`, `generatore riacceso (${nome}) ⚡ ${quanti}/3`, true);
    this.ev(['gen', i]);
    const c = M.centro(M.OGGETTI.G[i]);
    this.rumore(c.x, c.y, RUMORE.generatore * 1.5, 'generatore');
    if (quanti === 3) {
      this.sbloccato = true;
      this.annuncia(null, '📡 Il Torrens risponde: l\'attracco è aperto! Correte all\'uscita (a est del corridoio principale)', '📡 Il Torrens risponde: l\'attracco è aperto! Correte all\'uscita', true);
      this.ev(['sbloccato']);
    }
  }
  fugge(u) {
    if (u.task) this.lasciaTask(u);
    this.lasciaGen(u);
    u.fuggito = true; u.nascosto = null;
    this.punti[u.k] += 5;
    this.annuncia(u.k, 'è salito sul Torrens! 🚀', 'sei salito sul Torrens: sei salvo! 🚀', true);
    this.ev(['fugge', u.k]);
  }
  morte(u, armadietto, A = this.alieno) {
    if (u.task) this.lasciaTask(u);
    this.lasciaGen(u);
    u.vivo = false; u.morto = { x: A.x, y: A.y, armadietto: !!armadietto }; u.botola = null;
    if (u.nascosto) { const t = u.nascosto; u.nascosto = null; const [fx, fy] = M.verso[`${t.x},${t.y}`]; const c = M.centro([t.x + fx, t.y + fy]); u.x = c.x; u.y = c.y; }
    if (A.giocatore !== undefined && A.giocatore !== null) this.punti[A.giocatore] += 3;
    this.annuncia(u.k, 'è stato preso dallo xenomorfo 💀', 'lo xenomorfo ti ha preso 💀', true);
    this.ev(['morte', u.k, armadietto ? 1 : 0]);
  }

  // ---------- lo xenomorfo comandato da una persona ----------
  alienoGiocatore(A, dt) {
    const p = A.giocatore, c = this.cmd[p], [usa, inter] = this.premuti(p);
    A.yaw = c.yaw; A.pitch = c.pitch; A.t = (A.t || 0) + dt;
    if (A.stordito > 0) A.stordito -= dt;
    if (A.colpoT > 0) A.colpoT -= dt;
    // i rumori che sente: nuvolette sulla mappa (e segni sullo schermo); ogni xenomorfo li sente per conto suo
    for (const n of this.rumori) {
      n.visti = n.visti || [];
      if (n.visti.includes(A.id)) continue;
      n.visti.push(A.id);
      if (dist(A, n) < n.r * 1.6) A.pings.push({ x: Math.round(n.x), y: Math.round(n.y), t: this.survival ? 4 : 2.5, tipo: n.tipo });
    }
    for (const g of A.pings) g.t -= dt;
    A.pings = A.pings.filter((g) => g.t > 0).slice(-30);
    // l'ultimo istinto: se non trova nessuno da tanto, la direttrice gli fa sentire dove siete (più o meno)
    A.mente.calma = this.umaniInGioco().some((u) => dist(u, A) < 150) ? 0 : A.mente.calma + dt;
    if (A.mente.calma > 30) {
      A.mente.calma = 0;
      // survival: non tradisce chi è nascosto o sta fermo (sono invisibili)
      const lista = this.umaniInGioco().filter((u) => !this.survival || (!this.nascostoDel(u) && !this.invisibileA(A, u)));
      const u = lista[Math.floor(Math.random() * lista.length)];
      if (u) { A.pings.push({ x: Math.round(u.x + caso(-40, 40)), y: Math.round(u.y + caso(-40, 40)), t: 6, tipo: 'fiuto' }); this.ev(['fiuto', p]); }
    }
    if (A.stato === 'uccide') { A.vel = 0; if (A.t > (this.survival ? 1.9 : 2.2)) { A.stato = 'giro'; A.anim = 'cammina'; } return; }
    const i = this.inp[p];
    if (A.inCondotto) {
      // nei condotti si va dove si vuole sopra i soffitti (lo schermo mostra la pianta); E scende dalla grata vicina
      A.anim = 'condotto';
      const v = VEL.condotto * dt;
      A.x = Math.max(T, Math.min((M.COLS - 1) * T, A.x + i.x * v)); A.y = Math.max(T, Math.min((M.RIGHE - 1) * T, A.y + i.y * v));
      A.vel = Math.hypot(i.x, i.y) * VEL.condotto;
      if (inter) {
        const g = AI.grataVicina(A);
        if (dist(g, A) < 40) { A.x = g.x; A.y = g.y; A.inCondotto = false; A.stato = 'giro'; A.anim = 'esce'; A.t = 0; this.ev(['esce', Math.round(A.x), Math.round(A.y)]); }
      }
      return;
    }
    // a piedi: corsa con il fiato (stamina), attacco col clic, E su una grata o un armadietto
    const corre = !!(c.k & BIT.corre) && A.stamina > 0.05 && A.stordito <= 0;
    A.stamina = Math.max(0, Math.min(1, A.stamina + (corre ? -dt / 7 : dt / 5)));
    const v = (corre ? VEL.alienoCorre : VEL.alieno) * (A.stordito > 0 ? (this.survival ? 0 : 0.5) : 1) * (this.winOn[p] ? 1.25 : 1);
    let dx, dy;
    if (i.px !== null && i.px !== undefined) { const d = this.verso(p, A, v, dt); dx = d.x; dy = d.y; }
    else { const f = -i.y, s = i.x; dx = Math.cos(A.yaw) * f - Math.sin(A.yaw) * s; dy = Math.sin(A.yaw) * f + Math.cos(A.yaw) * s; }
    const l = Math.hypot(dx, dy), prima = { x: A.x, y: A.y };
    if (l > 0.05) { const k = Math.min(1.25, l) / l; M.muovi(A, dx * k * v * dt, dy * k * v * dt, AI.R_ALIENO, this.aperte, false); }
    A.vel = dist(prima, A) / dt;
    if (A.anim !== 'esce' || A.t > 1.2) A.anim = A.vel > 40 ? 'corre' : A.vel > 3 ? 'cammina' : 'fermo';
    if (A.vel > 3) { A.passi = (A.passi || 0) + dt; if (A.passi > 0.5) { A.passi = 0; this.ev(['passiAlieno', Math.round(A.x), Math.round(A.y)]); } }
    if (usa && A.colpoT <= 0) {
      // nella survival niente ricarica: solo il tempo dell'animazione, e un colpo solo davanti (anche a chi è invisibile)
      A.colpoT = this.survival ? 0.7 : 1.1; A.anim = 'attacca'; A.t = 0;
      this.ev(['colpo', Math.round(A.x), Math.round(A.y)]);
      const cono = this.survival ? 0.5 : 0.9;
      const vittime = this.umaniInGioco().filter((u) => !this.nascostoDel(u)).filter((u) => {
        const d = dist(A, u), a = Math.abs(angolo(Math.atan2(u.y - A.y, u.x - A.x) - A.yaw));
        return d < (u.sotto ? AI.PRESA_SOTTO + 4 : AI.PRESA + 8) && (a < cono || d < 8) && M.vede(A, u, this.aperte);
      });
      const vittima = vittime.length ? vittime.reduce((a, b) => (dist(A, a) <= dist(A, b) ? a : b)) : null;
      if (vittima) { A.stato = 'uccide'; A.anim = 'uccide'; A.t = 0; A.yaw = Math.atan2(vittima.y - A.y, vittima.x - A.x); this.morte(vittima, false, A); }
    }
    if (inter && A.stordito <= 0) {
      const g = AI.grataVicina(A);
      if (dist(g, A) < 16) { A.inCondotto = true; A.stato = 'condotto'; A.anim = 'entra'; this.ev(['condotto', Math.round(A.x), Math.round(A.y)]); return; }
      // l'armadietto (o la cassa) davanti: se c'è qualcuno dentro lo tira fuori
      const t = M.NASCONDIGLI.find((q) => { const cc = M.centro(q); return dist(cc, A) < 30 && Math.abs(angolo(Math.atan2(cc.y - A.y, cc.x - A.x) - A.yaw)) < 0.9; });
      if (t) {
        this.ev(['apre', t[0], t[1]]);
        const dentro = this.umaniInGioco().find((u) => u.nascosto && u.nascosto.x === t[0] && u.nascosto.y === t[1]);
        if (dentro) { A.stato = 'uccide'; A.anim = 'tira'; A.t = 0; this.morte(dentro, true, A); }
      }
    }
  }

  // ---------- i compagni del computer ----------
  // vanno ai generatori (ognuno il suo, il più vicino ancora spento) o alle task, poi all'uscita; si nascondono
  // (armadietti, casse, passaggi di servizio) quando arriva la creatura, lanciano un razzo di lato per distrarla,
  // trattengono il respiro, usano il fuoco se è vicina, la torcia solo dove è buio e vanno a prendere le scorte
  pensa() { return {}; }
  pensaUmano(u, dt) {
    const A = this.alienoVicino(u), m = u.mente;
    if (u.botola) return;
    if (u.nascosto) {
      u.trattiene = !!u.annusato && Math.random() < 0.97;
      m.nascostoDa = (m.nascostoDa || 0) + dt;
      if ((A.inCondotto || dist(A, u) > 120) && m.nascostoDa > 4) { this.esceArmadietto(u); m.nascostoDa = 0; m.percorso = null; }
      return;
    }
    const inseguito = A.stato === 'caccia' && A.preda === u.k;
    const pericolo = !A.inCondotto && (inseguito ? dist(A, u) < 160 : dist(A, u) < 70 && M.vede(A, u, this.aperte));
    if (pericolo && u.task) this.lasciaTask(u);
    if (pericolo) this.lasciaGen(u);
    u.corre = false; u.accucciato = false; u.rilevatore = false;
    m.razzoT = Math.max(0, (m.razzoT || 0) - dt);
    // fuoco se vicina e davanti
    if (pericolo && u.carburante > 0 && dist(A, u) < 45) { u.yaw = Math.atan2(A.y - u.y, A.x - u.x); this.fiamma(u); }
    // inseguito e non troppo vicino: un razzo lanciato di lato la porta fuori strada
    else if (pericolo && inseguito && u.razzi > 0 && !m.razzoT && dist(A, u) > 50) {
      const via = Math.atan2(u.y - A.y, u.x - A.x), yaw = u.yaw;
      u.yaw = via + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2; this.lancia(u); u.yaw = yaw; m.razzoT = 8;
    }
    let meta = null;
    if (pericolo) {
      // il nascondiglio (o la botola) più vicino lontano dalla creatura, se no si scappa correndo
      const ok = M.NASCONDIGLI.filter((t) => !this.umani.some((v) => v.nascosto && v.nascosto.x === t[0] && v.nascosto.y === t[1]))
        .map((t) => ({ t, c: M.centro(t), botola: false }))
        .concat(M.OGGETTI.P.map((t) => ({ t, c: M.centro(t), botola: true })))
        .filter((o) => dist(o.c, u) < 90 && dist(o.c, A) > dist(o.c, u));
      // survival: senza un nascondiglio vicino ci si immobilizza (chi sta fermo è invisibile), se non è già addosso
      if (this.survival && !inseguito && dist(A, u) > ATTACCATO + 6 && !ok.some((o) => dist(o.c, u) < 40)) { u.accucciato = true; this.muoviUmano(u, 0, 0, dt); return; }
      if (ok.length) {
        const o = ok.reduce((a, b) => (dist(a.c, u) <= dist(b.c, u) ? a : b));
        if (o.botola ? dist(o.c, u) < 12 : dist(o.c, u) < 24) { u.yaw = Math.atan2(o.c.y - u.y, o.c.x - u.x); this.interagisci(u, true); m.nascostoDa = 0; return; }
        if (o.botola) meta = o.c;
        else { const [fx, fy] = M.verso[`${o.t[0]},${o.t[1]}`]; meta = M.centro([o.t[0] + fx, o.t[1] + fy]); }
      } else meta = { x: u.x - (A.x - u.x), y: u.y - (A.y - u.y) };
      u.corre = true;
    } else if (u.gen !== null || u.task) return;
    else if ((meta = this.scorta(u))) {
      // una scorta che manca qui vicino (batteria, carburante, razzo): si fa una deviazione
      u.accucciato = !A.inCondotto && dist(A, u) < 110;
    } else if (this.survival && !this.sbloccato) {
      // la stazione libera più vicina con la task pronta (se non c'è, si aspetta vicino a una che si riposa)
      const libere = this.stazioni.map((S, i) => ({ S, i, c: M.centro(STAZIONI[i].t) })).filter((o) => o.S.chi === null);
      const pronte = libere.filter((o) => o.S.pausa <= 0), lista = pronte.length ? pronte : libere;
      if (lista.length) {
        const o = lista.reduce((a, b) => (dist(a.c, u) + (a.S.pausa || 0) * 20 <= dist(b.c, u) + (b.S.pausa || 0) * 20 ? a : b));
        if (dist(o.c, u) < 28 && o.S.pausa <= 0) { u.yaw = Math.atan2(o.c.y - u.y, o.c.x - u.x); this.interagisci(u); return; }
        const t = STAZIONI[o.i].t, [fx, fy] = M.verso[`${t[0]},${t[1]}`];
        meta = M.centro([t[0] + fx, t[1] + fy]);
        if (dist(meta, u) < 6) return; // aspetta che si liberi
      } else meta = u;
      u.accucciato = !A.inCondotto && dist(A, u) < 110;
    } else {
      // classica: ognuno il suo generatore (quelli già presi da un altro solo se non ne restano); survival: l'uscita
      const spenti = this.survival ? [] : this.generatori.map((g, i) => ({ g, i })).filter((o) => !o.g.acceso && (o.g.chi === null || o.g.chi === u.k));
      const liberi = spenti.filter((o) => !this.umani.some((v) => v !== u && v.vivo && !v.fuggito && this.bot[v.k] && v.mente.gen === o.i));
      const scelta = liberi.length ? liberi : spenti;
      if (scelta.length) {
        const o = scelta.reduce((a, b) => (dist(M.centro(M.OGGETTI.G[a.i]), u) <= dist(M.centro(M.OGGETTI.G[b.i]), u) ? a : b));
        m.gen = o.i;
        const c = M.centro(M.OGGETTI.G[o.i]);
        if (dist(c, u) < 26) { u.yaw = Math.atan2(c.y - u.y, c.x - u.x); this.interagisci(u); return; }
        const [fx, fy] = M.verso[`${M.OGGETTI.G[o.i][0]},${M.OGGETTI.G[o.i][1]}`];
        meta = M.centro([M.OGGETTI.G[o.i][0] + fx, M.OGGETTI.G[o.i][1] + fy]);
      } else { m.gen = null; meta = M.centro(M.OGGETTI.E[0]); }
      // vicino alla creatura (sentita) si va accucciati
      u.accucciato = !A.inCondotto && dist(A, u) < 110;
    }
    u.torcia = u.batteria > 20 && M.luce(u, this.accesi) < 0.3;
    // il percorso (ricalcolato ogni tanto)
    m.t = (m.t || 0) + dt;
    if (!m.percorso || !m.meta || dist(m.meta, meta) > 20 || m.t > 1.5) { m.t = 0; m.meta = meta; m.percorso = M.strada(M.quadretto(u), M.quadretto(meta), this.sbloccato) || null; }
    let dir = { x: 0, y: 0 };
    if (m.percorso && m.percorso.length) {
      while (m.percorso.length > 1 && dist(u, M.centro(m.percorso[0])) < T * 0.5) m.percorso.shift();
      const p = m.percorso.length === 1 ? meta : M.centro(m.percorso[0]);
      const dx = p.x - u.x, dy = p.y - u.y, l = Math.hypot(dx, dy);
      if (l > 2) dir = { x: dx / l, y: dy / l };
      if (m.percorso.length === 1 && l < 3) m.percorso = null;
    }
    if (Math.hypot(dir.x, dir.y) > 0) { const voluto = Math.atan2(dir.y, dir.x), da = angolo(voluto - u.yaw); u.yaw = angolo(u.yaw + Math.sign(da) * Math.min(Math.abs(da), 6 * dt)); }
    this.muoviUmano(u, dir.x, dir.y, dt);
    // bloccati (un compagno davanti): un passo di lato
    if (Math.hypot(u.vx, u.vy) < 2 && Math.hypot(dir.x, dir.y) > 0) { m.fermo = (m.fermo || 0) + dt; if (m.fermo > 1) { m.fermo = 0; m.percorso = null; this.muoviUmano(u, -dir.y, dir.x, dt * 4); } }
  }
  // la scorta più vicina che serve al compagno del computer (entro 12 m), o null
  scorta(u) {
    const serve = { b: u.batteria < 40, f: u.carburante < 1, r: u.razzi < 1 };
    let best = null, bd = 120;
    let base = 0;
    for (const tipo of ['b', 'f', 'r']) {
      M.OGGETTI[tipo].forEach((t, i) => {
        if (!serve[tipo] || this.raccolti[base + i]) return;
        const c = M.centro(t), d = dist(c, u);
        if (d < bd) { bd = d; best = c; }
      });
      base += M.OGGETTI[tipo].length;
    }
    return best;
  }

  fineRound() {
    fineWin(this);
    if (this.vittoria === 'umani') this.annuncia(null, '🚀 Il Torrens si stacca dalla Sevastopol: ce l\'avete fatta!', '🚀 Il Torrens si stacca dalla Sevastopol: ce l\'avete fatta!', true);
    else this.annuncia(null, '👾 Lo xenomorfo ha vinto: nessuno ha lasciato la Sevastopol.', '👾 Lo xenomorfo ha vinto: nessuno ha lasciato la Sevastopol.', true);
  }
  chiudi() {
    this.finita = true; this.fase = 'fine';
    const umani = this.umani.map((u) => u.k), mostro = this.mostri.slice();
    const vinti = this.vittoria === 'umani';
    const fazioni = [{ posti: umani, punti: vinti ? 1 : 0, nome: 'Sopravvissuti' }];
    if (mostro.length) fazioni.push({ posti: mostro, punti: vinti ? 0 : 1, nome: mostro.length > 1 ? 'Xenomorfi' : 'Xenomorfo' });
    this.risultato = { fazioni, etichetta: 'vittoria', pareggio: false, vincitori: vinti ? umani : mostro };
  }

  lentiOra() {
    const ora = {
      p: this.porte.map((s) => Math.round(s.a * 10) + (s.bloccata ? 100 : 0)),
      g: this.survival ? M.OGGETTI.G.map((_, i) => { const S = this.stazioni[STAZIONI.length - M.OGGETTI.G.length + i]; return S.pausa > 0 ? 0 : 50; }) : this.generatori.map((g) => (g.acceso ? 100 : Math.round(g.carica * 99))),
      o: this.raccolti.map((x) => (x ? 1 : 0)).join(''),
    };
    if (this.survival) ora.ts = [this.fatte, this.obiettivo, this.stazioni.map((S) => (S.pausa > 0 ? 0 : S.chi !== null ? 2 : 1)).join('')];
    return ora;
  }
  lenti() {
    const chiave = `${this.nTick}:${this.tempoRound}`;
    if (this._lentiTick === chiave && this._lenti) return this._lenti;
    const ora = this.lentiOra(), prima = this._lentiJ || {}, j = {}, out = {}, tutti = !((this.nTick || 0) % 10);
    for (const k of Object.keys(ora)) { j[k] = JSON.stringify(ora[k]); if (tutti || j[k] !== prima[k]) out[k] = ora[k]; }
    this._lentiTick = chiave; this._lentiJ = j; this._lenti = out;
    return out;
  }
  // lo stato completo (chi entra o si ricollega) ha sempre tutto
  vista(p) { const v = super.vista(p); if (v.stato && v.stato.s) Object.assign(v.stato.s, this.lentiOra()); return v; }
  // il segno della partita: il browser rimette a posto le sue cose quando ne comincia un'altra
  vistaExtra(p) { if (!this.idPartita) this.idPartita = Math.floor(Math.random() * 1e9); return { idPartita: this.idPartita, mostro: this.mostro, mostri: this.mostri, survival: this.survival, obiettivo: this.obiettivo || 0, durata: this.durata, difficolta: this.difficolta, versione: 2 }; }
  statoTick(posto) {
    const r = (v) => Math.round(v * 10) / 10, mioA = this.alieni.find((A) => A.giocatore === posto) || null;
    const eventi = this.eventi; this.eventi = [];
    const bit = (u) => (u.vivo ? 1 : 0) | (u.nascosto ? 2 : 0) | (u.accucciato ? 4 : 0) | (u.corre ? 8 : 0) | (u.rilevatore ? 16 : 0) | (u.torcia ? 32 : 0) | (u.fuggito ? 64 : 0) | (u.fiamma > 0 ? 128 : 0) | (u.sotto ? 256 : 0) | (u.trattiene ? 512 : 0) | (u.annusato ? 1024 : 0) | (u.botola ? 2048 : 0) | (u.task ? 4096 : 0);
    const io = this.umano(posto);
    // allo xenomorfo non arrivano proprio chi è nascosto e (survival) chi sta fermo lontano da lui (invisibili)
    let umani = this.umani;
    if (mioA) umani = umani.filter((u) => !u.vivo || u.fuggito || (!this.nascostoDel(u) && !this.invisibileA(mioA, u)));
    const out = {
      u: umani.map((u) => [u.k, r(u.x), r(u.y), Math.round(u.yaw * 100) / 100, Math.round(u.pitch * 100) / 100, bit(u)]),
      al: this.alieni.map((A) => [r(A.x), r(A.y), Math.round(A.yaw * 100) / 100, A.anim, A.inCondotto ? 1 : 0, Math.round((A.vel || 0)), A.stato, A.giocatore === undefined || A.giocatore === null ? -1 : A.giocatore]),
      fl: this.razzi.map((f) => [Math.round(f.x), Math.round(f.y), Math.round(f.t)]),
      e: eventi, sb: this.sbloccato ? 1 : 0,
      tr: Math.max(0, Math.ceil(this.durata - this.tempoRound)),
    };
    // porte, generatori, scorte e task cambiano di rado: partono solo quando cambiano e due volte al secondo
    // (i tick possono perdersi per strada), il browser tiene gli ultimi
    Object.assign(out, this.lenti());
    if (io) {
      out.me = [Math.round(io.batteria), io.carburante, io.razzi, Math.round((io.fiato / FIATO) * 100), io.gen !== null ? io.gen : -1, null];
      if (io.task) { const S = this.stazioni[io.task.s]; out.me[5] = [io.task.s, MINIGIOCHI.indexOf(S.tipo), S.diff, S.seme]; }
    }
    if (mioA && mioA.pings) out.me = [Math.round(mioA.stamina * 100), mioA.colpoT > 0 ? 1 : 0, mioA.stordito > 0 ? 1 : 0, this.winOn && this.winOn[posto] ? 1 : 0], out.pi = mioA.pings.map((g) => [g.x, g.y, g.tipo, Math.round(g.t * 10)]);
    return out;
  }
}
const IMPARATO = {
  armadietto: '👁️ Lo xenomorfo ha capito che vi nascondete negli armadietti: ora li controlla più spesso.',
  sotto: '👁️ Lo xenomorfo ha imparato a guardare sotto i mobili.',
  corsa: '👁️ Lo xenomorfo ha capito che scappate correndo: ora vi taglia la strada.',
  fuoco: '👁️ Il fuoco lo spaventa meno: scappa per meno tempo.',
  diversivo: '👁️ Lo xenomorfo non crede più ai razzi.',
};
// !win + parola segreta: per 25 secondi lo xenomorfo non ti vede né ti sente (o, se sei tu lo xenomorfo, corri di più)
function aggiornaWin(g, dt) {
  const w = g.winOn || (g.winOn = {}), tw = g.winT || (g.winT = {});
  for (let p = 0; p < g.n; p++) {
    if (!(w[p] = T_.armato(g, p))) { tw[p] = 0; continue; }
    tw[p] = (tw[p] || 0) + dt;
    if (tw[p] > 25) { T_.consuma(g, p); w[p] = false; tw[p] = 0; }
  }
}
function fineWin(g) { for (let p = 0; p < g.n; p++) { T_.consuma(g, p); if (g.winOn) g.winOn[p] = false; } }

module.exports = {
  meta: {
    id: 'isolation',
    nome: 'Alien: Isolation 3D',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    tre_d: true,
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Il primo gioco in 3D: in prima persona sulla stazione Sevastopol, tutti insieme contro lo xenomorfo. Riaccendete i generatori e scappate sul Torrens. Il mostro è l\'IA o uno di voi.',
    alias: ['alien', 'alien isolation', 'isolation', 'xenomorfo', 'sevastopol', '3d', 'horror', 'alieno 3d', 'torrens', 'amanda ripley'],
    opzioni: [
      { id: 'modalita', nome: 'Modalità', valori: ['classica', 'survival'], etichette: ['🔦 Classica: i generatori e la fuga', '🧪 Survival: task e xenomorfi giocatori'], predefinito: 'classica' },
      { id: 'mostro', nome: 'Chi è lo xenomorfo', valori: ['ia', 'giocatore'], etichette: ['🤖 L\'IA (pensa e impara da sola)', '🧑 Un giocatore del tavolo'], predefinito: 'ia', se: { modalita: ['classica'] } },
      { id: 'chi', nome: 'Se è un giocatore, chi', valori: ['caso', 1, 2, 3, 4, 5, 6, 7, 8], etichette: ['A caso', 'Il 1° posto (chi apre il tavolo)', 'Il 2° posto', 'Il 3° posto', 'Il 4° posto', 'Il 5° posto', 'Il 6° posto', 'Il 7° posto', 'L\'8° posto'], predefinito: 'caso', se: { modalita: ['classica'] } },
      { id: 'alieni', nome: 'Quanti xenomorfi', valori: [1, 2, 3], etichette: ['Uno', 'Due', 'Tre'], predefinito: 1, se: { modalita: ['survival'] } },
      { id: 'chiS', nome: 'Chi è lo xenomorfo', valori: ['caso', 1, 2, 3, 4, 5, 6, 7, 8], etichette: ['A caso', 'Il 1° posto (chi apre il tavolo)', 'Il 2° posto', 'Il 3° posto', 'Il 4° posto', 'Il 5° posto', 'Il 6° posto', 'Il 7° posto', 'L\'8° posto'], predefinito: 'caso', se: { modalita: ['survival'] } },
      { id: 'task', nome: 'Task da completare (tutti insieme)', valori: [20, 30, 40], etichette: ['20', '30', '40'], predefinito: 20, se: { modalita: ['survival'] } },
      { id: 'tempoS', nome: 'Tempo', valori: [10, 5, 15, 20], etichette: ['10 minuti', '5 minuti', '15 minuti', '20 minuti'], predefinito: 10, se: { modalita: ['survival'] } },
      { id: 'difficolta', nome: 'Difficoltà', valori: ['normale', 'facile', 'difficile'], etichette: ['Normale', 'Facile', 'Difficile (incubo)'], predefinito: 'normale' },
      { id: 'durata', nome: 'Tempo', valori: [20, 30, 15], etichette: ['20 minuti', '30 minuti', '15 minuti'], predefinito: 20, se: { modalita: ['classica'] } },
    ],
    regole: [
      'Siete sulla stazione Sevastopol, in prima persona. Dovete riaccendere i TRE GENERATORI (San Cristobal Medicina, Ingegneria, Torre Solomons Comunicazioni) restando vicini per qualche secondo (E), poi raggiungere l\'attracco del Torrens, in fondo al corridoio principale, e salire a bordo. Basta che uno di voi si salvi per vincere tutti; se lo xenomorfo vi prende tutti (o finisce il tempo) vince lui.',
      'Lo xenomorfo non si può uccidere. Vede chi ha la torcia accesa o sta nella luce, sente i passi (correre fa tanto rumore, accucciati quasi niente), le porte, i generatori e il bip del rilevatore. Gira anche nei condotti, sopra i soffitti: lo vedi solo col rilevatore di movimento.',
      'Comandi: WASD o frecce per muoversi, il mouse per guardare (clicca sulla scena per bloccarlo), Maiusc per correre, C per accucciarsi, Q (o il tasto destro) per il rilevatore di movimento, F per la torcia, E per usare (armadietti, generatori), clic per il lanciafiamme, G per lanciare un razzo, spazio tenuto per trattenere il respiro. Si gioca al computer, con mouse e tastiera.',
      'Nascondersi: E davanti a un armadietto per entrarci (E per uscire), oppure accucciati sotto scrivanie e letti. Se lo xenomorfo annusa l\'armadietto, trattieni il respiro (spazio) ma non troppo a lungo. Il lanciafiamme lo fa scappare nei condotti; i razzi lo attirano lontano (fanno rumore finché bruciano). Batterie, carburante e razzi si raccolgono passandoci sopra: cambiano posto a ogni partita, ce ne sono di più se siete in tanti e ricompaiono dopo un po\'.',
      'Lo xenomorfo ha due intelligenze, come nel gioco vero: la direttrice decide quando mandarlo verso di voi (non sa mai esattamente dove siete) e quando concedervi una tregua; la mente impara le vostre abitudini: più usate lo stesso trucco (armadietti, fuoco, razzi, correre) meno funziona.',
      'Lo xenomorfo può farlo anche un giocatore (opzione del tavolo): vede al buio, sente i rumori (puntini sullo schermo), corre col fiato, attacca col clic, apre gli armadietti con E e con E su una grata entra nei condotti (si vede la pianta e si scende da un\'altra grata con E).',
      'MODALITÀ SURVIVAL: uno, due o tre xenomorfi (persone del tavolo o il computer) contro gli altri. I sopravvissuti completano insieme 20 o più TASK: E davanti a un terminale o a un generatore apre un minigioco (fili da collegare, codice, sequenza, taratura; più o meno difficile). Ogni task finita fa rumore. Finite tutte parte la FUGA: il Torrens è attraccato, correte all\'attracco. Gli xenomorfi vincono se non scappa nessuno prima della fine del tempo.',
      'Nella survival chi sta FERMO è invisibile agli xenomorfi (girare la visuale non conta), a meno che non gli stia attaccato. Gli xenomorfi sentono i rumori come nuvolette di gas rosso sulla mappa, uccidono con un colpo (clic, solo davanti a sé, senza ricarica) e il lanciafiamme li stordisce per qualche secondo. Ci si nasconde negli armadietti, nelle casse grandi e nei passaggi di servizio (E sulla botola a terra: si striscia fino alla botola gemella). I morti guardano gli altri.',
      'Il gioco è in tempo reale e si ferma per tutti quando qualcuno apre le dispense. I posti vuoti sono compagni del computer che vanno ai generatori e si nascondono quando arriva lo xenomorfo.',
    ],
  },
  crea: (o) => new Isolation(o),
  bot: () => ({}),
  _test: { Isolation, M, AI, VEL, RUMORE, BIT, FIATO, STAZIONI, MINIGIOCHI, TASK_MIN, FERMO, ATTACCATO, BOTOLA },
};
