// ALIEN: ISOLATION 3D — il primo gioco in 3D del sito, in prima persona. Un settore della stazione Sevastopol
// (isolation/mappa.js): tutti insieme contro lo xenomorfo. Bisogna riaccendere i tre generatori (Medicina, Ingegneria,
// Comunicazioni) per sbloccare l'attracco del Torrens e scappare. Lo xenomorfo è immortale: si evita, ci si nasconde
// (armadietti, sotto scrivanie e letti), lo si distrae coi razzi, lo si scaccia col lanciafiamme.
// Il mostro lo fa l'IA (isolation/alieno.js: direttrice + mente che impara) oppure un giocatore scelto al tavolo, come
// il master: vede al buio, sente i rumori, si muove nei condotti, apre gli armadietti, uccide da vicino.
// Il server muove tutto 20 volte al secondo; il browser disegna in 3D (three.js) e muove subito il proprio personaggio
// (Arena: movimento previsto). Unità: il decimetro (vedi mappa.js).
const { Arena } = require('../giochi/arena');
const T_ = require('../giochi/trucco');
const M = require('./isolation/mappa');
const AI = require('./isolation/alieno');

const { T } = M;
const R_UMANO = 4;
const VEL = { cammina: 30, corre: 52, accucciato: 14, rilevatore: 20, alieno: 30, alienoCorre: 62, condotto: 95 };
const RUMORE = { cammina: 55, corre: 180, accucciato: 12, rilevatore: 45, porta: 70, generatore: 260, fiamma: 220, razzo: 320, armadietto: 40 };
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
    this.durata = ([20, 30, 15].includes(Number(op.durata)) ? Number(op.durata) : 20) * 60;
    // il mostro: l'IA, oppure un posto del tavolo (scelto o a caso); da soli è sempre l'IA
    this.mostro = null;
    if (op.mostro === 'giocatore' && this.n >= 2) {
      const chi = Number(op.chi);
      this.mostro = Number.isInteger(chi) && chi >= 1 && chi <= this.n ? chi - 1 : Math.floor(Math.random() * this.n);
    }
    this.etichettaPunti = 'punti';
    this.avvia();
  }
  // ---------- preparazione ----------
  iniziaRound() {
    const partenze = M.OGGETTI.S.map(M.centro);
    this.umani = [];
    for (let k = 0; k < this.n; k++) {
      if (k === this.mostro) continue;
      const p = partenze[this.umani.length % partenze.length];
      this.umani.push({
        k, x: p.x, y: p.y, yaw: 0, pitch: 0, vx: 0, vy: 0, vivo: true, fuggito: false, nascosto: null, sotto: false,
        accucciato: false, corre: false, rilevatore: false, trattiene: false, torcia: true, batteria: 100, carburante: 1, razzi: 1,
        fiato: FIATO, fiamma: 0, gen: null, bip: 0, passi: 0, mente: { fino: 0 }, morto: null,
      });
    }
    this.alieno = AI.nuovo(this.difficolta);
    if (this.mostro !== null) Object.assign(this.alieno, { giocatore: this.mostro, stato: 'condotto', inCondotto: true, stamina: 1, stordito: 0, colpoT: 0, pings: [] });
    this.generatori = M.OGGETTI.G.map(() => ({ carica: 0, acceso: false, chi: null }));
    this.accesi = this.generatori.map(() => false);
    this.sbloccato = false;
    this.porte = M.PORTE.map((p) => ({ a: 0, bloccata: p.bloccata }));
    this.aperte = {};
    this.raccolti = M.OGGETTI.b.map(() => false).concat(M.OGGETTI.f.map(() => false), M.OGGETTI.r.map(() => false));
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
    if (Array.isArray(d.c)) for (let i = 0; i < 4; i++) { const v = Number(d.c[i]); if (Number.isInteger(v) && v > c.c[i] && v - c.c[i] < 50) c.c[i] = v; }
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
    const A = this.alieno;
    if (A.giocatore !== undefined && A.giocatore !== null && !this.bot[A.giocatore]) this.alienoGiocatore(A, dt);
    else AI.passo(this, A, dt);
    for (const t of A.imparato.splice(0)) this.annuncia(null, IMPARATO[t], IMPARATO[t]);
    // i razzi bruciano e fanno rumore
    for (const r of this.razzi) { r.t -= dt; if (Math.random() < dt * 2) this.rumore(r.x, r.y, RUMORE.razzo, 'razzo'); }
    this.razzi = this.razzi.filter((r) => r.t > 0);
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
    const chi = this.umaniInGioco().filter((u) => !u.nascosto);
    if (!this.alieno.inCondotto) chi.push(this.alieno);
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
    if (torcia) this.torcia(u);
    if (inter) this.interagisci(u);
    if (u.nascosto) return;
    if (usa) this.fiamma(u);
    if (razzo) this.lancia(u);
    const i = this.inp[u.k];
    let dx, dy;
    if (i.px !== null && i.px !== undefined) { const d = this.verso(u.k, u, this.velocita(u), dt); dx = d.x; dy = d.y; }
    else { const f = -i.y, s = i.x; dx = Math.cos(u.yaw) * f - Math.sin(u.yaw) * s; dy = Math.sin(u.yaw) * f + Math.cos(u.yaw) * s; }
    this.muoviUmano(u, dx, dy, dt);
  }
  velocita(u) { const v = u.accucciato ? VEL.accucciato : u.rilevatore ? VEL.rilevatore : u.corre ? VEL.corre : VEL.cammina; return u.gen !== null ? 0 : v; }
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
    // il fiato: si trattiene solo nascosti, poi si rifiata (e se finisce si ansima)
    if (u.nascosto && u.trattiene && u.fiato > 0) u.fiato = Math.max(0, u.fiato - dt);
    else u.fiato = Math.min(FIATO, u.fiato + dt * 0.8);
    if (u.nascosto && u.trattiene && u.fiato <= 0 && !u.ansima) { u.ansima = true; this.rumore(u.x, u.y, 40, 'ansima', u.k); }
    if (u.fiato > 1) u.ansima = false;
    // il generatore: si riaccende restando vicino (fa tanto rumore)
    if (u.gen !== null) {
      const G = this.generatori[u.gen], c = M.centro(M.OGGETTI.G[u.gen]);
      if (dist(u, c) > 30 || G.acceso) { u.gen = null; G.chi = null; return; }
      const prima = G.carica;
      G.carica = Math.min(1, G.carica + dt / GEN_TEMPO);
      if (Math.floor(prima * 4) !== Math.floor(G.carica * 4)) this.rumore(c.x, c.y, RUMORE.generatore, 'generatore');
      if (G.carica >= 1) this.accendi(u, u.gen);
    }
  }
  torcia(u) { if (u.batteria > 0) { u.torcia = !u.torcia; this.ev(['torcia', u.k, u.torcia ? 1 : 0]); } }
  // E: armadietto (entra o esce), generatore
  interagisci(u) {
    if (u.nascosto) { this.esceArmadietto(u); return; }
    const vicino = (lista, r) => {
      let best = null, bd = r;
      lista.forEach((t, i) => { const c = M.centro(t); const d = dist(u, c); const a = Math.abs(angolo(Math.atan2(c.y - u.y, c.x - u.x) - u.yaw)); if (d < bd && (a < 1.1 || d < 18)) { bd = d; best = i; } });
      return best;
    };
    const g = vicino(M.OGGETTI.G, 30);
    if (g !== null && !this.generatori[g].acceso) { u.gen = g; this.generatori[g].chi = u.k; this.ev(['genInizia', g]); return; }
    const l = vicino(M.OGGETTI.L, 26);
    if (l !== null) {
      const t = M.OGGETTI.L[l];
      if (this.umani.some((v) => v.nascosto && v.nascosto.x === t[0] && v.nascosto.y === t[1])) return; // occupato
      u.nascosto = { x: t[0], y: t[1], prima: { x: u.x, y: u.y } };
      u.gen = null; u.rilevatore = false; u.corre = false;
      const c = M.centro(t); u.x = c.x; u.y = c.y;
      const [fx, fy] = M.verso[`${t[0]},${t[1]}`]; u.yaw = Math.atan2(fy, fx);
      this.ev(['armadietto', u.k, 1]); this.rumore(u.x, u.y, RUMORE.armadietto, 'armadietto', u.k);
      const A = this.alieno;
      if (!A.inCondotto && dist(A, u) < 160 && M.vede(A, u.nascosto.prima, this.aperte) && Math.abs(angolo(Math.atan2(u.y - A.y, u.x - A.x) - A.yaw)) < 1.3) AI.vistoNascondersi(this, A, t);
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
    const A = this.alieno;
    if (A.inCondotto) return;
    const d = dist(A, u), a = Math.abs(angolo(Math.atan2(A.y - u.y, A.x - u.x) - u.yaw));
    if (d < FIAMMA.portata && (a < FIAMMA.cono || d < 14) && M.vede(u, A, this.aperte)) {
      u.punti = (u.punti || 0);
      this.punti[u.k] += 1;
      if (A.giocatore !== undefined && A.giocatore !== null && !this.bot[A.giocatore]) { A.stordito = 3; A.colpoT = 6; AI.impara(A, 'fuoco'); this.ev(['brucia', Math.round(A.x), Math.round(A.y)]); }
      else AI.brucia(this, A);
      this.annuncia(u.k, 'scaccia lo xenomorfo col fuoco! 🔥', 'l\'hai scacciato col fuoco! 🔥');
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
    u.fuggito = true; u.nascosto = null; u.gen = null;
    this.punti[u.k] += 5;
    this.annuncia(u.k, 'è salito sul Torrens! 🚀', 'sei salito sul Torrens: sei salvo! 🚀', true);
    this.ev(['fugge', u.k]);
  }
  morte(u, armadietto) {
    u.vivo = false; u.morto = { x: this.alieno.x, y: this.alieno.y, armadietto: !!armadietto };
    u.gen = null; if (u.nascosto) { const t = u.nascosto; u.nascosto = null; const [fx, fy] = M.verso[`${t.x},${t.y}`]; const c = M.centro([t.x + fx, t.y + fy]); u.x = c.x; u.y = c.y; }
    const A = this.alieno;
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
    // i rumori che sente: puntini per il suo schermo (solo quelli degli umani, dei razzi e dei generatori)
    for (const n of this.rumori) if (!n.visto) { n.visto = true; if (dist(A, n) < n.r * 1.6) A.pings.push({ x: Math.round(n.x), y: Math.round(n.y), t: 2.5, tipo: n.tipo }); }
    for (const g of A.pings) g.t -= dt;
    A.pings = A.pings.filter((g) => g.t > 0).slice(-30);
    // l'ultimo istinto: se non trova nessuno da tanto, la direttrice gli fa sentire dove siete (più o meno)
    A.mente.calma = this.umaniInGioco().some((u) => dist(u, A) < 150) ? 0 : A.mente.calma + dt;
    if (A.mente.calma > 30) {
      A.mente.calma = 0;
      const u = this.umaniInGioco()[Math.floor(Math.random() * this.umaniInGioco().length)];
      if (u) { A.pings.push({ x: Math.round(u.x + caso(-40, 40)), y: Math.round(u.y + caso(-40, 40)), t: 6, tipo: 'fiuto' }); this.ev(['fiuto']); }
    }
    if (A.stato === 'uccide') { A.vel = 0; if (A.t > 2.2) { A.stato = 'giro'; A.anim = 'cammina'; } return; }
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
    const v = (corre ? VEL.alienoCorre : VEL.alieno) * (A.stordito > 0 ? 0.5 : 1) * (this.winOn[p] ? 1.25 : 1);
    let dx, dy;
    if (i.px !== null && i.px !== undefined) { const d = this.verso(p, A, v, dt); dx = d.x; dy = d.y; }
    else { const f = -i.y, s = i.x; dx = Math.cos(A.yaw) * f - Math.sin(A.yaw) * s; dy = Math.sin(A.yaw) * f + Math.cos(A.yaw) * s; }
    const l = Math.hypot(dx, dy), prima = { x: A.x, y: A.y };
    if (l > 0.05) { const k = Math.min(1.25, l) / l; M.muovi(A, dx * k * v * dt, dy * k * v * dt, AI.R_ALIENO, this.aperte, false); }
    A.vel = dist(prima, A) / dt;
    if (A.anim !== 'esce' || A.t > 1.2) A.anim = A.vel > 40 ? 'corre' : A.vel > 3 ? 'cammina' : 'fermo';
    if (A.vel > 3) { A.passi = (A.passi || 0) + dt; if (A.passi > 0.5) { A.passi = 0; this.ev(['passiAlieno', Math.round(A.x), Math.round(A.y)]); } }
    if (usa && A.colpoT <= 0) {
      A.colpoT = 1.1; A.anim = 'attacca'; A.t = 0;
      this.ev(['colpo', Math.round(A.x), Math.round(A.y)]);
      const vittima = this.umaniInGioco().filter((u) => !u.nascosto).find((u) => {
        const d = dist(A, u), a = Math.abs(angolo(Math.atan2(u.y - A.y, u.x - A.x) - A.yaw));
        return d < (u.sotto ? AI.PRESA_SOTTO + 4 : AI.PRESA + 8) && a < 0.9 && M.vede(A, u, this.aperte);
      });
      if (vittima) { A.stato = 'uccide'; A.t = 0; A.yaw = Math.atan2(vittima.y - A.y, vittima.x - A.x); this.morte(vittima, false); }
    }
    if (inter) {
      const g = AI.grataVicina(A);
      if (dist(g, A) < 16) { A.inCondotto = true; A.stato = 'condotto'; A.anim = 'entra'; this.ev(['condotto', Math.round(A.x), Math.round(A.y)]); return; }
      // l'armadietto davanti: se c'è qualcuno dentro lo tira fuori
      const t = M.OGGETTI.L.find((q) => { const cc = M.centro(q); return dist(cc, A) < 30 && Math.abs(angolo(Math.atan2(cc.y - A.y, cc.x - A.x) - A.yaw)) < 0.9; });
      if (t) {
        this.ev(['apre', t[0], t[1]]);
        const dentro = this.umaniInGioco().find((u) => u.nascosto && u.nascosto.x === t[0] && u.nascosto.y === t[1]);
        if (dentro) { A.stato = 'uccide'; A.anim = 'tira'; A.t = 0; this.morte(dentro, true); }
      }
    }
  }

  // ---------- i compagni del computer ----------
  // vanno ai generatori (il più vicino ancora spento), poi all'uscita; si nascondono quando arriva la creatura,
  // trattengono il respiro, usano il fuoco se è vicina e la torcia solo dove è buio
  pensa() { return {}; }
  pensaUmano(u, dt) {
    const A = this.alieno, m = u.mente;
    if (u.nascosto) {
      u.trattiene = !!u.annusato && Math.random() < 0.97;
      m.nascostoDa = (m.nascostoDa || 0) + dt;
      if ((A.inCondotto || dist(A, u) > 120) && m.nascostoDa > 4) { this.esceArmadietto(u); m.nascostoDa = 0; m.percorso = null; }
      return;
    }
    const pericolo = !A.inCondotto && (A.stato === 'caccia' && A.preda === u.k ? dist(A, u) < 160 : dist(A, u) < 70 && M.vede(A, u, this.aperte));
    u.corre = false; u.accucciato = false; u.rilevatore = false;
    // fuoco se vicina e davanti
    if (pericolo && u.carburante > 0 && dist(A, u) < 45) { u.yaw = Math.atan2(A.y - u.y, A.x - u.x); this.fiamma(u); }
    let meta = null;
    if (pericolo) {
      // l'armadietto più vicino lontano dalla creatura, se no si scappa correndo
      const ok = M.OGGETTI.L.filter((t) => !this.umani.some((v) => v.nascosto && v.nascosto.x === t[0] && v.nascosto.y === t[1]))
        .map((t) => ({ t, c: M.centro(t) })).filter((o) => dist(o.c, u) < 90 && dist(o.c, A) > dist(o.c, u));
      if (ok.length) {
        const o = ok.reduce((a, b) => (dist(a.c, u) <= dist(b.c, u) ? a : b));
        if (dist(o.c, u) < 24) { u.yaw = Math.atan2(o.c.y - u.y, o.c.x - u.x); this.interagisci(u); m.nascostoDa = 0; return; }
        const [fx, fy] = M.verso[`${o.t[0]},${o.t[1]}`];
        meta = M.centro([o.t[0] + fx, o.t[1] + fy]);
      } else meta = { x: u.x - (A.x - u.x), y: u.y - (A.y - u.y) };
      u.corre = true;
    } else if (u.gen !== null) return;
    else {
      const spenti = this.generatori.map((g, i) => ({ g, i })).filter((o) => !o.g.acceso);
      if (spenti.length) {
        const o = spenti.reduce((a, b) => (dist(M.centro(M.OGGETTI.G[a.i]), u) <= dist(M.centro(M.OGGETTI.G[b.i]), u) ? a : b));
        const c = M.centro(M.OGGETTI.G[o.i]);
        if (dist(c, u) < 26) { u.yaw = Math.atan2(c.y - u.y, c.x - u.x); this.interagisci(u); return; }
        const [fx, fy] = M.verso[`${M.OGGETTI.G[o.i][0]},${M.OGGETTI.G[o.i][1]}`];
        meta = M.centro([M.OGGETTI.G[o.i][0] + fx, M.OGGETTI.G[o.i][1] + fy]);
      } else meta = M.centro(M.OGGETTI.E[0]);
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

  fineRound() {
    fineWin(this);
    if (this.vittoria === 'umani') this.annuncia(null, '🚀 Il Torrens si stacca dalla Sevastopol: ce l\'avete fatta!', '🚀 Il Torrens si stacca dalla Sevastopol: ce l\'avete fatta!', true);
    else this.annuncia(null, '👾 Lo xenomorfo ha vinto: nessuno ha lasciato la Sevastopol.', '👾 Lo xenomorfo ha vinto: nessuno ha lasciato la Sevastopol.', true);
  }
  chiudi() {
    this.finita = true; this.fase = 'fine';
    const umani = this.umani.map((u) => u.k), mostro = this.mostro !== null ? [this.mostro] : [];
    const vinti = this.vittoria === 'umani';
    const fazioni = [{ posti: umani, punti: vinti ? 1 : 0, nome: 'Sopravvissuti' }];
    if (mostro.length) fazioni.push({ posti: mostro, punti: vinti ? 0 : 1, nome: 'Xenomorfo' });
    this.risultato = { fazioni, etichetta: 'vittoria', pareggio: false, vincitori: vinti ? umani : mostro };
  }

  vistaExtra(p) { return { mostro: this.mostro, durata: this.durata, difficolta: this.difficolta, versione: 1 }; }
  statoTick(posto) {
    const r = (v) => Math.round(v * 10) / 10, A = this.alieno;
    const eventi = this.eventi; this.eventi = [];
    const bit = (u) => (u.vivo ? 1 : 0) | (u.nascosto ? 2 : 0) | (u.accucciato ? 4 : 0) | (u.corre ? 8 : 0) | (u.rilevatore ? 16 : 0) | (u.torcia ? 32 : 0) | (u.fuggito ? 64 : 0) | (u.fiamma > 0 ? 128 : 0) | (u.sotto ? 256 : 0) | (u.trattiene ? 512 : 0) | (u.annusato ? 1024 : 0);
    const io = this.umano(posto);
    const out = {
      u: this.umani.map((u) => [u.k, r(u.x), r(u.y), Math.round(u.yaw * 100) / 100, Math.round(u.pitch * 100) / 100, bit(u)]),
      a: [r(A.x), r(A.y), Math.round(A.yaw * 100) / 100, A.anim, A.inCondotto ? 1 : 0, Math.round((A.vel || 0)), A.stato],
      p: this.porte.map((s) => Math.round(s.a * 10) + (s.bloccata ? 100 : 0)),
      g: this.generatori.map((g) => (g.acceso ? 100 : Math.round(g.carica * 99))),
      o: this.raccolti.map((x) => (x ? 1 : 0)).join(''),
      fl: this.razzi.map((f) => [Math.round(f.x), Math.round(f.y), Math.round(f.t)]),
      e: eventi, sb: this.sbloccato ? 1 : 0,
      tr: Math.max(0, Math.ceil(this.durata - this.tempoRound)),
    };
    if (io) out.me = [Math.round(io.batteria), io.carburante, io.razzi, Math.round((io.fiato / FIATO) * 100), io.gen !== null ? io.gen : -1];
    if (posto === this.mostro && A.pings) out.me = [Math.round(A.stamina * 100), A.colpoT > 0 ? 1 : 0, A.stordito > 0 ? 1 : 0], out.pi = A.pings.map((g) => [g.x, g.y, g.tipo]);
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
      { id: 'mostro', nome: 'Chi è lo xenomorfo', valori: ['ia', 'giocatore'], etichette: ['🤖 L\'IA (pensa e impara da sola)', '🧑 Un giocatore del tavolo'], predefinito: 'ia' },
      { id: 'chi', nome: 'Se è un giocatore, chi', valori: ['caso', 1, 2, 3, 4, 5, 6, 7, 8], etichette: ['A caso', 'Il 1° posto (chi apre il tavolo)', 'Il 2° posto', 'Il 3° posto', 'Il 4° posto', 'Il 5° posto', 'Il 6° posto', 'Il 7° posto', 'L\'8° posto'], predefinito: 'caso' },
      { id: 'difficolta', nome: 'Difficoltà', valori: ['normale', 'facile', 'difficile'], etichette: ['Normale', 'Facile', 'Difficile (incubo)'], predefinito: 'normale' },
      { id: 'durata', nome: 'Tempo', valori: [20, 30, 15], etichette: ['20 minuti', '30 minuti', '15 minuti'], predefinito: 20 },
    ],
    regole: [
      'Siete sulla stazione Sevastopol, in prima persona. Dovete riaccendere i TRE GENERATORI (San Cristobal Medicina, Ingegneria, Torre Solomons Comunicazioni) restando vicini per qualche secondo (E), poi raggiungere l\'attracco del Torrens, in fondo al corridoio principale, e salire a bordo. Basta che uno di voi si salvi per vincere tutti; se lo xenomorfo vi prende tutti (o finisce il tempo) vince lui.',
      'Lo xenomorfo non si può uccidere. Vede chi ha la torcia accesa o sta nella luce, sente i passi (correre fa tanto rumore, accucciati quasi niente), le porte, i generatori e il bip del rilevatore. Gira anche nei condotti, sopra i soffitti: lo vedi solo col rilevatore di movimento.',
      'Comandi: WASD o frecce per muoversi, il mouse per guardare (clicca sulla scena per bloccarlo), Maiusc per correre, C per accucciarsi, Q (o il tasto destro) per il rilevatore di movimento, F per la torcia, E per usare (armadietti, generatori), clic per il lanciafiamme, G per lanciare un razzo, spazio tenuto per trattenere il respiro. Si gioca al computer, con mouse e tastiera.',
      'Nascondersi: E davanti a un armadietto per entrarci (E per uscire), oppure accucciati sotto scrivanie e letti. Se lo xenomorfo annusa l\'armadietto, trattieni il respiro (spazio) ma non troppo a lungo. Il lanciafiamme lo fa scappare nei condotti; i razzi lo attirano lontano. Batterie, carburante e razzi si raccolgono passandoci sopra.',
      'Lo xenomorfo ha due intelligenze, come nel gioco vero: la direttrice decide quando mandarlo verso di voi (non sa mai esattamente dove siete) e quando concedervi una tregua; la mente impara le vostre abitudini: più usate lo stesso trucco (armadietti, fuoco, razzi, correre) meno funziona.',
      'Lo xenomorfo può farlo anche un giocatore (opzione del tavolo): vede al buio, sente i rumori (puntini sullo schermo), corre col fiato, attacca col clic, apre gli armadietti con E e con E su una grata entra nei condotti (si vede la pianta e si scende da un\'altra grata con E).',
      'Il gioco è in tempo reale e si ferma per tutti quando qualcuno apre le dispense. I posti vuoti sono compagni del computer che vanno ai generatori e si nascondono quando arriva lo xenomorfo.',
    ],
  },
  crea: (o) => new Isolation(o),
  bot: () => ({}),
  _test: { Isolation, M, AI, VEL, RUMORE, BIT, FIATO },
};
