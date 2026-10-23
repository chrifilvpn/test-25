// ASTEROIDI: navicelle nello spazio (chi esce da un lato rientra dall'altro), massi che si spezzano in due quando li
// colpisci (grandi → medi → piccoli), ondate sempre più fitte e ogni tanto un disco volante che spara. La navicella
// gira verso la direzione dei tasti (o del joystick) e spinge; senza spinta scivola e rallenta piano. Tre vite: chi
// sbatte contro un masso (o viene colpito) perde una vita e riappare al centro, protetto per qualche secondo.
// Punti: masso grande 20, medio 50, piccolo 100, disco volante 200 (e 150 per un'altra navicella, se si sceglie
// "tutti contro tutti"). Vince chi ha più punti quando finisce il tempo o quando tutti hanno finito le vite.
const { Arena } = require('../giochi/arena');
const T = require('../giochi/trucco');
// !win + parola segreta: un vantaggio per il round in corso (al massimo 25 secondi di gioco), poi il trucco si spegne
function aggiornaWin(g, dt) {
  const w = g.winOn || (g.winOn = {}), tw = g.winT || (g.winT = {});
  for (let p = 0; p < g.n; p++) {
    if (!(w[p] = T.armato(g, p))) { tw[p] = 0; continue; }
    tw[p] = (tw[p] || 0) + dt;
    if (tw[p] > 25) { T.consuma(g, p); w[p] = false; tw[p] = 0; }
  }
}
function fineWin(g) { for (let p = 0; p < g.n; p++) { T.consuma(g, p); if (g.winOn) g.winOn[p] = false; } }

const W = 1200, H = 760;
const RAGGI = [44, 24, 13]; // grande, medio, piccolo
const PUNTI = [20, 50, 100];
const R_NAVE = 14, V_MAX = 330, SPINTA = 420, ATTRITO = 0.45, GIRO = 6.5;
const V_COLPO = 560, VITA_COLPO = 1.05, RICARICA = 0.2, MAX_COLPI = 5;
const VITE = 3, PROTETTO = 3, RINASCITA = 1.6;
const UFO_OGNI = 24, UFO_PUNTI = 200, R_UFO = 18;

// la rotazione di un masso dipende solo dal suo id: il browser la calcola da sé (non serve mandarla)
const rotDi = (id) => (((id * 37) % 100) / 100 - 0.5) * 2, angDi = (id) => ((id * 53) % 628) / 100;
const avvolgi = (v, m) => ((v % m) + m) % m;
const dd = (a, m) => { let d = a; if (d > m / 2) d -= m; if (d < -m / 2) d += m; return d; }; // differenza più corta (il campo si avvolge)
const angolo = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const LIV = {
  facile: { ogni: 0.3, rumore: 0.25, anticipo: 0, schiva: 0.3, spara: 0.5 },
  medio: { ogni: 0.15, rumore: 0.08, anticipo: 0.7, schiva: 0.75, spara: 0.85 },
  difficile: { ogni: 0.06, rumore: 0.015, anticipo: 1, schiva: 1, spara: 1 },
};

class Asteroidi extends Arena {
  constructor(o) {
    super(o, { id: 'asteroidi', round: 1, tickMs: 33 });
    const op = o.opzioni || {};
    this.nRound = 1;
    this.W = W; this.H = H;
    this.durata = ([3, 2, 5].includes(Number(op.tempo)) ? Number(op.tempo) : 3) * 60;
    this.contro = op.modo === 'contro';
    this.etichettaPunti = 'punti';
    this.avvia();
  }

  iniziaRound() {
    this.navi = Array.from({ length: this.n }, (_, i) => this.nuovaNave(i, i));
    this.massi = []; this.nM = 0;
    this.colpi = []; this.nC = 0;
    this.ufo = null; this.prossimoUfo = UFO_OGNI;
    this.ondata = 0;
    this.botti = []; this.nB = this.nB || Math.floor(Date.now() / 10) % 1e9; // cresce anche da una partita all'altra (il browser salta i numeri già visti)
    this.mente = {};
    this.nuovaOndata();
  }
  nuovaNave(i, k = i) {
    // in cerchio attorno al centro, rivolte verso l'esterno
    const a = (k / Math.max(1, this.n)) * Math.PI * 2 - Math.PI / 2, r = this.n > 1 ? 70 : 0;
    const vecchia = this.navi && this.navi[i];
    return { id: i, x: W / 2 + Math.cos(a) * r, y: H / 2 + Math.sin(a) * r, vx: 0, vy: 0, a, vite: vecchia ? vecchia.vite : VITE, vivo: true, protetto: PROTETTO, rinasce: 0, ricarica: 0, spinge: false, fuori: false };
  }
  nuovaOndata() {
    this.ondata++;
    const quanti = Math.min(12, 3 + this.ondata + Math.floor(this.n / 2));
    for (let k = 0; k < quanti; k++) {
      // lontano dalle navicelle (vicino ai bordi)
      let x, y, giri = 0;
      do { x = Math.random() * W; y = Math.random() * H; giri++; } while (giri < 40 && this.navi.some((n) => n.vivo && Math.hypot(dd(n.x - x, W), dd(n.y - y, H)) < 220));
      this.masso(x, y, 0);
    }
    if (this.ondata > 1) this.annuncia(null, `Ondata ${this.ondata}! ☄️`, '', true);
  }
  masso(x, y, t, vx, vy) {
    const v = (40 + Math.random() * 40) * (1 + t * 0.45) * (1 + Math.min(this.ondata, 8) * 0.05), a = Math.random() * Math.PI * 2;
    this.massi.push({ id: ++this.nM, x, y, t, vx: vx !== undefined ? vx + Math.cos(a) * v * 0.6 : Math.cos(a) * v, vy: vy !== undefined ? vy + Math.sin(a) * v * 0.6 : Math.sin(a) * v, rot: 0, ang: 0 });
    const m = this.massi[this.massi.length - 1]; m.rot = rotDi(m.id); m.ang = angDi(m.id) + m.rot * this.tempoRound; // come la calcola il browser
  }
  botto(x) { this.botti.push([++this.nB, ...x, this.tempoRound]); }
  spara(chi, x, y, a, di) {
    this.colpi.push({ id: ++this.nC, x: x + Math.cos(a) * (R_NAVE + 4), y: y + Math.sin(a) * (R_NAVE + 4), vx: Math.cos(a) * V_COLPO + (chi ? chi.vx * 0.5 : 0), vy: Math.sin(a) * V_COLPO + (chi ? chi.vy * 0.5 : 0), vita: VITA_COLPO * (di < 0 ? 1.3 : 1), di });
  }
  rompi(m, chi) {
    m.via = true;
    this.botto([m.t, Math.round(m.x), Math.round(m.y)]);
    if (chi >= 0) this.punti[chi] += PUNTI[m.t];
    if (m.t < 2) for (let k = 0; k < 2; k++) this.masso(m.x, m.y, m.t + 1, m.vx * 0.5, m.vy * 0.5);
    this.cambiato = true;
  }
  colpisci(n, da) {
    if (!n.vivo || n.protetto > 0 || (this.winOn && this.winOn[n.id])) return; // con il trucco non ti colpisce niente
    n.vivo = false; n.vite--; n.rinasce = RINASCITA;
    this.botto([3, Math.round(n.x), Math.round(n.y)]);
    if (n.vite <= 0) { n.fuori = true; this.annuncia(n.id, 'ha finito le vite 💀', 'hai finito le vite 💀'); }
    else if (da >= 0 && da !== n.id) this.annuncia(da, 'colpisce @ 💥', 'colpito! 💥', false, { bersaglio: n.id, testoTe: 'ti ha colpito 💥' });
    if (da >= 0 && da !== n.id) this.punti[da] += 150;
    this.cambiato = true;
  }

  passo(dt) {
    aggiornaWin(this, dt);
    const t = this.tempoRound;
    for (const n of this.navi) {
      if (n.fuori) continue;
      if (!n.vivo) {
        n.rinasce -= dt;
        // si riappare al centro quando non c'è un masso troppo vicino
        if (n.rinasce <= 0 && !this.massi.some((m) => !m.via && Math.hypot(dd(m.x - W / 2, W), dd(m.y - H / 2, H)) < RAGGI[m.t] + 80)) {
          Object.assign(n, { x: W / 2, y: H / 2, vx: 0, vy: 0, vivo: true, protetto: PROTETTO });
          this.cambiato = true;
        }
        continue;
      }
      n.protetto = Math.max(0, n.protetto - dt);
      n.ricarica = Math.max(0, n.ricarica - dt);
      let dx, dy, fuoco;
      if (this.bot[n.id]) { const m = this.mente[n.id] || {}; dx = m.dx || 0; dy = m.dy || 0; fuoco = !!m.fuoco; m.fuoco = false; }
      else { const i = this.inp[n.id]; dx = i.x; dy = i.y; fuoco = this.nuoviTocchi(n.id) > 0 || i.a; }
      const forza = Math.min(1, Math.hypot(dx, dy));
      n.spinge = false;
      if (forza > 0.2) {
        const voglio = Math.atan2(dy, dx), diff = angolo(voglio - n.a);
        n.a = angolo(n.a + Math.sign(diff) * Math.min(Math.abs(diff), GIRO * dt));
        if (Math.abs(diff) < 1.2) { n.vx += Math.cos(n.a) * SPINTA * forza * dt; n.vy += Math.sin(n.a) * SPINTA * forza * dt; n.spinge = true; }
      }
      const k = Math.exp(-ATTRITO * dt); n.vx *= k; n.vy *= k;
      const v = Math.hypot(n.vx, n.vy); if (v > V_MAX) { n.vx *= V_MAX / v; n.vy *= V_MAX / v; }
      n.x = avvolgi(n.x + n.vx * dt, W); n.y = avvolgi(n.y + n.vy * dt, H);
      if (fuoco && n.ricarica <= 0 && this.colpi.filter((c) => c.di === n.id).length < MAX_COLPI) { this.spara(n, n.x, n.y, n.a, n.id); n.ricarica = RICARICA * (this.winOn[n.id] ? 0.5 : 1); this.botto([4, Math.round(n.x), Math.round(n.y)]); }
    }
    for (const m of this.massi) { m.x = avvolgi(m.x + m.vx * dt, W); m.y = avvolgi(m.y + m.vy * dt, H); m.ang += m.rot * dt; }
    for (const c of this.colpi) { c.x = avvolgi(c.x + c.vx * dt, W); c.y = avvolgi(c.y + c.vy * dt, H); c.vita -= dt; }
    // il disco volante: attraversa il campo e spara verso la navicella più vicina
    this.prossimoUfo -= dt;
    if (!this.ufo && this.prossimoUfo <= 0) {
      const daDestra = Math.random() < 0.5;
      this.ufo = { x: daDestra ? W + 20 : -20, y: 80 + Math.random() * (H - 160), vx: daDestra ? -110 : 110, vy: 0, cambia: 1.5, spara: 1.3, vita: (W + 60) / 110 };
      this.annuncia(null, 'Arriva il disco volante! 🛸', '', false);
    }
    if (this.ufo) {
      const u = this.ufo;
      u.cambia -= dt; if (u.cambia <= 0) { u.vy = (Math.random() - 0.5) * 140; u.cambia = 1 + Math.random(); }
      u.x += u.vx * dt; u.y = avvolgi(u.y + u.vy * dt, H); u.vita -= dt;
      u.spara -= dt;
      if (u.spara <= 0) {
        u.spara = Math.max(0.7, 1.4 - this.ondata * 0.08);
        const n = this.navi.filter((x) => x.vivo).sort((a, b) => Math.hypot(dd(a.x - u.x, W), dd(a.y - u.y, H)) - Math.hypot(dd(b.x - u.x, W), dd(b.y - u.y, H)))[0];
        if (n) this.spara(null, u.x, u.y, Math.atan2(dd(n.y - u.y, H), dd(n.x - u.x, W)) + (Math.random() - 0.5) * 0.5, -1);
      }
      if (u.vita <= 0 || u.x < -30 || u.x > W + 30) { this.ufo = null; this.prossimoUfo = UFO_OGNI * (0.7 + Math.random() * 0.6); }
    }
    // urti: colpi contro massi, disco e navicelle
    for (const c of this.colpi) {
      if (c.vita <= 0) continue;
      for (const m of this.massi) {
        if (m.via || Math.hypot(dd(m.x - c.x, W), dd(m.y - c.y, H)) > RAGGI[m.t]) continue;
        c.vita = 0; this.rompi(m, c.di); break;
      }
      if (c.vita <= 0) continue;
      if (this.ufo && c.di >= 0 && Math.hypot(this.ufo.x - c.x, this.ufo.y - c.y) < R_UFO + 3) {
        c.vita = 0; this.punti[c.di] += UFO_PUNTI; this.botto([5, Math.round(this.ufo.x), Math.round(this.ufo.y)]);
        this.annuncia(c.di, 'abbatte il disco volante! 🛸 +200', 'disco volante abbattuto! 🛸 +200');
        this.ufo = null; this.prossimoUfo = UFO_OGNI; this.cambiato = true; continue;
      }
      for (const n of this.navi) {
        if (!n.vivo || n.id === c.di || (c.di >= 0 && !this.contro)) continue;
        if (Math.hypot(dd(n.x - c.x, W), dd(n.y - c.y, H)) < R_NAVE + 2) { c.vita = 0; this.colpisci(n, c.di); break; }
      }
    }
    for (const n of this.navi) {
      if (!n.vivo) continue;
      for (const m of this.massi) {
        if (m.via || Math.hypot(dd(m.x - n.x, W), dd(m.y - n.y, H)) > RAGGI[m.t] + R_NAVE * 0.75) continue;
        if (n.protetto > 0) continue;
        this.colpisci(n, -1); this.rompi(m, n.id); break;
      }
      if (n.vivo && this.ufo && Math.hypot(this.ufo.x - n.x, this.ufo.y - n.y) < R_UFO + R_NAVE) this.colpisci(n, -1);
    }
    this.massi = this.massi.filter((m) => !m.via);
    this.colpi = this.colpi.filter((c) => c.vita > 0);
    if (!this.massi.length) this.nuovaOndata();
    return t >= this.durata || this.navi.every((n) => n.fuori);
  }
  fineRound() {
    fineWin(this);
    const max = Math.max(...this.punti);
    const v = this.punti.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
    if (this.n > 1 && v.length === 1) this.annuncia(v[0], `vince con ${max} punti! 🏆`, `hai vinto con ${max} punti! 🏆`, true);
  }

  // ---------- il computer ----------
  // il punto dove mirare per prendere un bersaglio che si muove (anticipo), tenendo conto del campo che si avvolge
  mira(n, b, anticipo) {
    let dx = dd(b.x - n.x, W), dy = dd(b.y - n.y, H);
    const t = (Math.hypot(dx, dy) / V_COLPO) * anticipo;
    dx += (b.vx - n.vx * 0.5) * t; dy += (b.vy - n.vy * 0.5) * t;
    return { a: Math.atan2(dy, dx), d: Math.hypot(dx, dy) };
  }
  pensa(p, liv) {
    const n = this.navi[p], L = LIV[liv] || LIV.medio, t = this.tempoRound;
    const m = this.mente[p] || (this.mente[p] = { prossimo: 0, dx: 0, dy: 0, fuoco: false, scappa: 0 });
    if (!n.vivo) return {};
    if (t < m.prossimo) return {};
    m.prossimo = t + L.ogni * (0.7 + Math.random() * 0.6);
    // pericolo: un masso (o il disco) che tra poco mi viene addosso
    let pericolo = null, quando = Infinity;
    if (n.protetto <= 0.3 && Math.random() < L.schiva) {
      const cose = this.massi.map((x) => ({ x: x.x, y: x.y, vx: x.vx, vy: x.vy, r: RAGGI[x.t] }));
      if (this.ufo) cose.push({ x: this.ufo.x, y: this.ufo.y, vx: this.ufo.vx, vy: this.ufo.vy, r: R_UFO });
      for (const c of this.colpi) if (c.di !== p && (c.di < 0 || this.contro)) cose.push({ x: c.x, y: c.y, vx: c.vx, vy: c.vy, r: 3 });
      for (const c of cose) {
        const rx = dd(c.x - n.x, W), ry = dd(c.y - n.y, H), vx = c.vx - n.vx, vy = c.vy - n.vy;
        const v2 = vx * vx + vy * vy; if (v2 < 1) continue;
        const tc = Math.max(0, -(rx * vx + ry * vy) / v2);
        if (tc > 1.4) continue;
        const mx = rx + vx * tc, my = ry + vy * tc;
        if (Math.hypot(mx, my) < c.r + R_NAVE + 18 && tc < quando) { quando = tc; pericolo = { rx, ry, vx, vy }; }
      }
    }
    if (pericolo) {
      // si scappa di lato rispetto alla traiettoria di quello che arriva
      const l = Math.hypot(pericolo.vx, pericolo.vy) || 1;
      let px = -pericolo.vy / l, py = pericolo.vx / l;
      if (px * pericolo.rx + py * pericolo.ry > 0) { px = -px; py = -py; }
      m.dx = px; m.dy = py; m.scappa = t + 0.4;
    } else if (t > m.scappa) {
      // si sta vicino al centro del proprio quartiere, senza correre troppo
      const v = Math.hypot(n.vx, n.vy);
      if (v > 120) { m.dx = -n.vx / v; m.dy = -n.vy / v; } else { m.dx = 0; m.dy = 0; }
    }
    // bersaglio: il masso (o il disco) più comodo da colpire, tenendo conto di quanto bisogna girare
    let meglio = null, bv = Infinity;
    const bersagli = this.massi.map((x) => ({ ...x, r: RAGGI[x.t], pt: PUNTI[x.t] }));
    if (this.ufo) bersagli.push({ ...this.ufo, r: R_UFO, pt: UFO_PUNTI });
    if (this.contro) for (const o of this.navi) if (o.vivo && o !== n && o.protetto <= 0) bersagli.push({ x: o.x, y: o.y, vx: o.vx, vy: o.vy, r: R_NAVE, pt: 150 });
    for (const b of bersagli) {
      const q = this.mira(n, b, L.anticipo);
      if (q.d > V_COLPO * VITA_COLPO * 0.95) continue;
      const v = q.d / 300 + Math.abs(angolo(q.a - n.a)) / GIRO - b.pt / 400;
      if (v < bv) { bv = v; meglio = { ...q, r: b.r }; }
    }
    if (meglio) {
      const a = meglio.a + (Math.random() - 0.5) * L.rumore * 2;
      if (!pericolo) { m.dx = Math.cos(a) * 0.3; m.dy = Math.sin(a) * 0.3; } // si gira verso il bersaglio quasi senza spingere
      const tolleranza = Math.atan2(meglio.r * 0.8, meglio.d) + L.rumore;
      if (Math.abs(angolo(n.a - a)) < tolleranza && Math.random() < L.spara) m.fuoco = true;
    }
    return {};
  }

  // ---------- quello che vede il browser ----------
  vistaExtra() { return { RAGGI, R_NAVE, durata: this.durata, contro: this.contro }; }
  statoTick() {
    // gli effetti degli ultimi istanti, numerati: ogni giocatore li riceve (anche se un tick si perde) e il browser
    // salta quelli già visti
    const ora = this.tempoRound; this.botti = this.botti.filter((x) => ora - x[4] < 0.5);
    const botti = this.botti.map((x) => x.slice(0, 4));
    const r = (v) => Math.round(v), a2 = (v) => Math.round(v * 100) / 100;
    return {
      n: this.navi.map((n) => [r(n.x), r(n.y), a2(n.a), n.vivo ? 1 : 0, n.protetto > 0 ? 1 : 0, n.spinge ? 1 : 0, n.vite]),
      m: this.massi.map((m) => [m.id, r(m.x), r(m.y), m.t]),
      c: this.colpi.map((c) => [c.id, r(c.x), r(c.y), c.di]),
      u: this.ufo ? [r(this.ufo.x), r(this.ufo.y)] : 0,
      o: this.ondata, r: Math.max(0, Math.ceil(this.durata - this.tempoRound)), b: botti,
    };
  }
}

module.exports = {
  meta: {
    id: 'asteroidi',
    nome: 'Asteroidi',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Navicelle nello spazio tra massi che si spezzano in pezzi sempre più piccoli e veloci, e un disco volante che spara. Chi fa più punti?',
    alias: ['asteroidi', 'asteroids', 'navicella', 'spazio', 'massi', 'meteoriti', 'disco volante', 'ufo'],
    opzioni: [
      { id: 'tempo', nome: 'Durata', valori: [3, 2, 5], etichette: ['3 minuti', '2 minuti', '5 minuti'], predefinito: 3 },
      { id: 'modo', nome: 'Modo', valori: ['massi', 'contro'], etichette: ['Tutti contro i massi (i colpi non toccano le altre navicelle)', 'Tutti contro tutti (si può colpire anche gli altri)'], predefinito: 'massi' },
    ],
    regole: [
      'Ognuno guida una navicella nello spazio. Il campo non ha bordi: chi esce da un lato rientra dal lato opposto (anche i massi e i colpi).',
      'La navicella gira verso la direzione delle frecce (o WASD, o del joystick) e spinge in quella direzione; lasciando i tasti scivola e rallenta piano. Si spara in avanti con lo spazio, il clic o il pulsante 🔫 Spara (tenendo premuto spara a raffica). Al massimo 5 colpi in volo.',
      'I massi grandi colpiti si spezzano in due medi, i medi in due piccoli, i piccoli spariscono. Punti: grande 20, medio 50, piccolo 100. Quando non ci sono più massi arriva un\'ondata nuova, più fitta.',
      'Ogni tanto passa un disco volante 🛸 che spara alle navicelle: abbatterlo vale 200 punti.',
      'Ognuno ha 3 vite. Sbattere contro un masso o il disco, o essere colpiti dal disco, costa una vita: si riappare al centro, protetti (lampeggianti) per 3 secondi.',
      'Modo "Tutti contro tutti": i colpi prendono anche le altre navicelle (150 punti a chi colpisce).',
      'La partita dura 3 minuti (o 2, o 5) o finché tutti hanno finito le vite: vince chi ha più punti. Da soli si gioca per il record.',
      'Il gioco è in tempo reale: si ferma per tutti quando qualcuno apre le dispense.',
      'Il computer facile mira dove il masso è adesso (e spesso lo manca) e schiva poco; il medio anticipa un po\' il movimento e schiva i massi che vede arrivare; il difficile calcola dove sarà il bersaglio quando arriva il colpo, sceglie i massi che valgono di più e schiva quasi tutto.',
    ],
  },
  crea: (o) => new Asteroidi(o),
  bot: () => ({}),
  _test: { Asteroidi, W, H, RAGGI, PUNTI, V_COLPO, dd, avvolgi },
};
