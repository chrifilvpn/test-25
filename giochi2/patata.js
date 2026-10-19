// PATATA BOLLENTE (serie Squid Game): da 3 a 8 giocatori in una palestra con quattro colonne. Uno tiene la "patata",
// una bomba che fuma con la miccia accesa: la passa TOCCANDO un altro giocatore. Il tempo della miccia è nascosto
// (casuale); si sente solo il ticchettio, che accelera più passa il tempo. Quando scoppia, chi la tiene è eliminato;
// dopo un attimo la patata riparte da un altro dei rimasti, finché ne resta uno solo: il vincitore del round.
// Chi ha appena ricevuto la patata non può ridarla subito a chi gliel'ha data (1 s), così niente ping-pong.
// Chi tiene la patata corre un po' più veloce degli altri.
const { Arena, casuale } = require('../giochi/arena');
const T = require('../giochi/trucco');
// !win banana: un vantaggio per il round in corso (al massimo 25 secondi di gioco), poi il trucco si spegne
function aggiornaWin(g, dt) {
  const w = g.winOn || (g.winOn = {}), tw = g.winT || (g.winT = {});
  for (let p = 0; p < g.n; p++) {
    if (!(w[p] = T.armato(g, p))) { tw[p] = 0; continue; }
    tw[p] = (tw[p] || 0) + dt;
    if (tw[p] > 25) { T.consuma(g, p); w[p] = false; tw[p] = 0; }
  }
}
function fineWin(g) { for (let p = 0; p < g.n; p++) { T.consuma(g, p); if (g.winOn) g.winOn[p] = false; } }
const W = 1000, H = 620, R = 16, V = 215, VELOCE = 1.15, BORDO = 40;
const COLONNE = [[270, 185], [730, 185], [270, 435], [730, 435]], R_COL = 32;
const IMMUNITA = 1, PAUSA_SCOPPIO = 2.2, SFRIGOLA = 1.2, ONDA = 110;
const MICCE = { corta: [6, 12], normale: [9, 18], lunga: [14, 26] };

// ticchettio: un colpo ogni "intervallo(t)" secondi, sempre più fitto (dipende solo da quanto è accesa la miccia,
// non da quanto manca: così non svela il tempo nascosto). Lo stesso calcolo è nel browser.
// carattere dei computer: da quanto lontano temono il portatore, quanto stanno lontani dai muri e con che forza
const IA = { paura: { facile: 210, medio: 300, difficile: 380 }, muro: { facile: 50, medio: 120, difficile: 150 }, forza: { facile: 0.6, medio: 1.4, difficile: 1.8 }, lato: 120, altri: 0.35, muroBers: 60, antMax: 0.4, ant: 0.4 };
const intervallo = (t) => Math.max(0.11, 0.72 * Math.pow(0.92, t));

class Patata extends Arena {
  constructor(o) {
    super(o, { id: 'patata', round: 3 });
    this.W = W; this.H = H;
    this.miccia = MICCE[o.opzioni && o.opzioni.miccia] ? o.opzioni.miccia : 'normale';
    this.scoppiTot = new Array(this.n).fill(0); // quante volte ognuno è saltato in aria (riepilogo)
    this.passaggi = new Array(this.n).fill(0);
    this.avvia();
  }
  iniziaRound() {
    // tutti in cerchio intorno al centro, ognuno al suo posto
    this.e = Array.from({ length: this.n }, (_, i) => {
      const a = (i / this.n) * Math.PI * 2 + this.round * 0.7;
      return { id: i, x: W / 2 + Math.cos(a) * 250, y: H / 2 + Math.sin(a) * 175, vx: 0, vy: 0, fuori: false, el: null, kx: 0, ky: 0 };
    });
    this.ordine = [];       // eliminati nell'ordine
    this.bomba = null;      // { chi, da, dal, accesa, durata }
    this.prossima = 0.6;    // quando arriva la patata (secondi del round)
    this.scoppi = [];       // per il disegno: [x, y]
    this.mente = {};
  }
  vivi() { return this.e.filter((e) => !e.fuori).map((e) => e.id); }
  // la patata parte da uno dei rimasti, a caso
  daiBomba() {
    const tutti = this.vivi(), altri = tutti.filter((q) => !(this.winOn && this.winOn[q]));
    const v = altri.length ? altri : tutti; // con il trucco non parte da te
    const chi = v[Math.floor(Math.random() * v.length)];
    const [a, b] = MICCE[this.miccia];
    this.bomba = { chi, da: null, dal: this.tempoRound, accesa: this.tempoRound, durata: casuale(a, b) };
    this.cambiato = true;
    this.annuncia(chi, 'ha la patata bollente! 💣', 'hai tu la patata bollente! 💣 Tocca qualcuno per passarla', false);
  }
  muovi(e, dx, dy, v, dt) {
    // spinta dell'esplosione che si smorza
    e.x += (dx * v + e.kx) * dt; e.y += (dy * v + e.ky) * dt;
    const k = Math.exp(-5 * dt); e.kx *= k; e.ky *= k;
    e.vx = dx * v; e.vy = dy * v;
    e.x = Math.max(BORDO + R, Math.min(W - BORDO - R, e.x)); e.y = Math.max(BORDO + R, Math.min(H - BORDO - R, e.y));
    for (const [cx, cy] of COLONNE) {
      const ddx = e.x - cx, ddy = e.y - cy, d = Math.hypot(ddx, ddy), min = R + R_COL;
      if (d < min) { if (d < 0.01) { e.x = cx + min; continue; } e.x = cx + (ddx / d) * min; e.y = cy + (ddy / d) * min; }
    }
  }
  passo(dt) {
    aggiornaWin(this, dt);
    const t = this.tempoRound, b = this.bomba;
    for (let p = 0; p < this.n; p++) {
      const e = this.e[p];
      if (e.fuori) continue;
      const v = V * (b && b.chi === p ? VELOCE : 1) * (this.winOn[p] ? 1.15 : 1);
      const i = this.inp[p];
      const l = Math.hypot(i.x, i.y), k = l > 1 ? 1 / l : 1;
      this.muovi(e, i.x * k, i.y * k, v, dt);
    }
    // gli omini non si sovrappongono (si scansano un po')
    for (let a = 0; a < this.n; a++) for (let c = a + 1; c < this.n; c++) {
      const A = this.e[a], B = this.e[c];
      if (A.fuori || B.fuori) continue;
      const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
      if (d >= R * 2 || d < 0.001) continue;
      const s = (R * 2 - d) / 2, nx = dx / d, ny = dy / d;
      A.x -= nx * s; A.y -= ny * s; B.x += nx * s; B.y += ny * s;
    }
    if (!b) {
      if (t >= this.prossima && this.vivi().length > 1) this.daiBomba();
    } else {
      // passaggio per contatto
      const h = this.e[b.chi];
      for (let q = 0; q < this.n; q++) {
        if (q === b.chi || this.e[q].fuori) continue;
        if (q === b.da && t - b.dal < IMMUNITA) continue; // niente ping-pong
        if (Math.hypot(this.e[q].x - h.x, this.e[q].y - h.y) <= R * 2 + 3) {
          this.passaggi[b.chi]++;
          this.annuncia(b.chi, 'passa la patata a @ 🥔', 'passi la patata a @ 🥔', false, { bersaglio: q, testoTe: 'ti passa la patata! 💣' });
          b.da = b.chi; b.chi = q; b.dal = t; this.cambiato = true;
          break;
        }
      }
      // scoppia
      // con il trucco in mano tua non scoppia: la miccia dura ancora un po'
      if (t - b.accesa >= b.durata) { if (this.winOn[b.chi]) b.durata += 0.4 + Math.random(); else this.scoppia(); }
    }
    const rimasti = this.vivi().length;
    if (rimasti <= 1 && (!this.ordine.length || t - this.e[this.ordine[this.ordine.length - 1]].el > 1.4)) return true;
    return t > 400; // sicurezza: non succede mai con le micce previste
  }
  scoppia() {
    const p = this.bomba.chi, e = this.e[p];
    e.fuori = true; e.el = this.tempoRound; this.ordine.push(p); this.scoppiTot[p]++;
    this.scoppi.push([Math.round(e.x), Math.round(e.y)]);
    // l'onda dell'esplosione spinge via chi è vicino
    for (const q of this.e) {
      if (q.fuori) continue;
      const dx = q.x - e.x, dy = q.y - e.y, d = Math.hypot(dx, dy);
      if (d < ONDA && d > 0.01) { const f = 520 * (1 - d / ONDA); q.kx += (dx / d) * f; q.ky += (dy / d) * f; }
    }
    this.bomba = null; this.prossima = this.tempoRound + PAUSA_SCOPPIO; this.cambiato = true;
    const rimasti = this.vivi();
    if (rimasti.length === 1) this.annuncia(p, 'salta in aria! 💥', 'sei saltato in aria! 💥', false);
    else this.annuncia(p, `salta in aria! 💥 Restano in ${rimasti.length}`, `sei saltato in aria! 💥 Restano in ${rimasti.length}`, false);
  }
  fineRound() {
    fineWin(this);
    // un punto per ogni giocatore saltato in aria prima di te; l'ultimo rimasto ne prende 2 in più
    this.ordine.forEach((p, k) => { this.punti[p] += k; });
    const rimasti = this.vivi();
    for (const p of rimasti) this.punti[p] += this.ordine.length + (rimasti.length === 1 ? 2 : 0);
    if (rimasti.length === 1) this.annuncia(rimasti[0], 'è l\'ultimo rimasto! 🏆', 'sei l\'ultimo rimasto! 🏆', true);
  }

  // ---------------- computer ----------------
  // chi ha la patata insegue (il difficile anticipa dove andrà il bersaglio e sceglie chi raggiunge prima);
  // gli altri scappano dal portatore restando lontani dai muri, dagli angoli e dalle colonne.
  pensa(p, liv) {
    const e = this.e[p];
    if (e.fuori) return {};
    const t = this.tempoRound, b = this.bomba;
    const m = this.mente[p] || (this.mente[p] = { fino: 0, x: 0, y: 0 });
    if (t < m.fino) return { x: m.x, y: m.y };
    m.fino = t + { facile: 0.32, medio: 0.14, difficile: 0.04 }[liv];
    let fx = 0, fy = 0;
    if (b && b.chi === p) {
      // inseguo
      let meglio = null, costo = Infinity;
      for (let q = 0; q < this.n; q++) {
        const o = this.e[q];
        if (q === p || o.fuori) continue;
        let tx = o.x, ty = o.y;
        if (liv === 'difficile') {
          // dove sarà quando lo raggiungo (due passi di stima)
          for (let k = 0; k < 2; k++) { const tt = Math.min(IA.antMax, Math.hypot(tx - e.x, ty - e.y) / (V * VELOCE) * IA.ant); tx = o.x + o.vx * tt; ty = o.y + o.vy * tt; }
        }
        let c = Math.hypot(tx - e.x, ty - e.y);
        if (q === b.da && t - b.dal < IMMUNITA) c += 400; // chi me l'ha data non la riprende subito
        if (liv === 'difficile') c += this.vicinoMuro(o) ? -IA.muroBers : 0; // chi è vicino a un muro è più facile da chiudere
        if (c < costo) { costo = c; meglio = { x: tx, y: ty }; }
      }
      if (meglio) {
        const err = { facile: 70, medio: 25, difficile: 0 }[liv];
        const d = Math.hypot(meglio.x - e.x, meglio.y - e.y) || 1;
        fx = (meglio.x + casuale(-err, err) - e.x) / d; fy = (meglio.y + casuale(-err, err) - e.y) / d;
      }
      // girare intorno alle colonne
      this.evitaColonne(e, liv, (x, y) => { fx += x; fy += y; }, 0.9);
    } else if (b) {
      // scappo dal portatore
      const h = this.e[b.chi];
      const dh = Math.hypot(e.x - h.x, e.y - h.y) || 1;
      const paura = IA.paura[liv];
      if (dh < paura) { const f = (paura / dh) * 1.3; fx += ((e.x - h.x) / dh) * f; fy += ((e.y - h.y) / dh) * f; }
      // se mi insegue da vicino, scarto di lato (il difficile)
      if (liv === 'difficile' && dh < IA.lato) { const sx = -(e.y - h.y) / dh, sy = (e.x - h.x) / dh, verso = (sx * (W / 2 - e.x) + sy * (H / 2 - e.y)) >= 0 ? 1 : -1; fx += sx * verso * 0.9; fy += sy * verso * 0.9; }
      // lontano dai muri e dagli angoli (il facile se ne accorge poco)
      const muro = IA.muro[liv], forza = IA.forza[liv];
      if (e.x < BORDO + muro) fx += forza * (1 - (e.x - BORDO) / muro);
      if (e.x > W - BORDO - muro) fx -= forza * (1 - (W - BORDO - e.x) / muro);
      if (e.y < BORDO + muro) fy += forza * (1 - (e.y - BORDO) / muro);
      if (e.y > H - BORDO - muro) fy -= forza * (1 - (H - BORDO - e.y) / muro);
      // lontano anche dagli altri (se il portatore prende uno vicino a me, poi tocca a me)
      if (liv !== 'facile') for (const o of this.e) { if (o.fuori || o.id === p || o.id === b.chi) continue; const d = Math.hypot(e.x - o.x, e.y - o.y); if (d < 70 && d > 0.01) { fx += ((e.x - o.x) / d) * IA.altri; fy += ((e.y - o.y) / d) * IA.altri; } }
      this.evitaColonne(e, liv, (x, y) => { fx += x; fy += y; }, 1.2);
      if (dh >= paura) { fx += (W / 2 - e.x) / 600; fy += (H / 2 - e.y) / 600; }
    } else {
      // nessuna patata in giro: verso il centro, lontano dagli altri
      fx = (W / 2 - e.x) / 400 + casuale(-0.3, 0.3); fy = (H / 2 - e.y) / 400 + casuale(-0.3, 0.3);
      for (const o of this.e) { if (o.fuori || o.id === p) continue; const d = Math.hypot(e.x - o.x, e.y - o.y); if (d < 120 && d > 0.01) { fx += (e.x - o.x) / d; fy += (e.y - o.y) / d; } }
    }
    const errore = { facile: 0.55, medio: 0.2, difficile: 0.04 }[liv];
    fx += casuale(-errore, errore); fy += casuale(-errore, errore);
    const l = Math.hypot(fx, fy);
    if (l < 0.08) { m.x = 0; m.y = 0; } else { m.x = fx / l; m.y = fy / l; }
    if (liv === 'facile' && !(b && b.chi === p)) { m.x *= 0.88; m.y *= 0.88; } // il facile non scatta mai al massimo
    return { x: m.x, y: m.y };
  }
  vicinoMuro(o) { return o.x < BORDO + 90 || o.x > W - BORDO - 90 || o.y < BORDO + 90 || o.y > H - BORDO - 90; }
  evitaColonne(e, liv, agg, f) {
    if (liv === 'facile') f *= 0.5;
    for (const [cx, cy] of COLONNE) {
      const dx = e.x - cx, dy = e.y - cy, d = Math.hypot(dx, dy) || 1;
      if (d < R_COL + R + 45) { const k = f * (1 - (d - R_COL - R) / 45); agg((dx / d) * k - (dy / d) * k * 0.6, (dy / d) * k + (dx / d) * k * 0.6); }
    }
  }
  vistaExtra() { return { miccia: this.miccia, colonne: COLONNE, rCol: R_COL, bordo: BORDO, r: R, scoppi: this.scoppiTot, passaggi: this.passaggi }; }
  statoTick() {
    const sc = this.scoppi; this.scoppi = [];
    const b = this.bomba, t = this.tempoRound;
    return {
      e: this.e.map((e) => ({ id: e.id, x: Math.round(e.x), y: Math.round(e.y), f: e.fuori ? 1 : 0, el: e.el })),
      // la bomba: chi la tiene, da chi l'ha avuta e da quanto, da quanto è accesa la miccia (non quanto manca!)
      b: b ? { c: b.chi, da: b.da, im: b.da !== null && t - b.dal < IMMUNITA ? 1 : 0, ma: Math.round((t - b.accesa) * 100) / 100, sf: b.durata - (t - b.accesa) < SFRIGOLA ? 1 : 0 } : null,
      pr: !b && this.vivi().length > 1 ? Math.max(0, Math.round((this.prossima - t) * 10) / 10) : null,
      sc,
    };
  }
}

module.exports = {
  meta: {
    id: 'patata',
    nome: 'Patata bollente',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [3, 4, 5, 6, 7, 8],
    descrizione: 'Squid Game: passa la bomba toccando gli altri prima che scoppi. La miccia è segreta, il ticchettio accelera… l\'ultimo rimasto vince.',
    alias: ['patata', 'patata bollente', 'bomba', 'hot potato', 'squid game', 'passa la bomba'],
    opzioni: [
      { id: 'miccia', nome: 'Miccia', valori: ['normale', 'corta', 'lunga'], etichette: ['Normale (9-18 s)', 'Corta (6-12 s)', 'Lunga (14-26 s)'], predefinito: 'normale' },
      { id: 'round', nome: 'Round', valori: [3, 1, 5], etichette: ['3 round', '1 round', '5 round'], predefinito: 3 },
    ],
    regole: [
      'Si gioca in 3-8 (i posti liberi li prende il computer) in una palestra con quattro colonne. Ti muovi con WASD o le frecce (sul telefono col joystick).',
      'Uno di voi ha la PATATA BOLLENTE: una bomba che fuma, con la miccia accesa. Per liberartene devi TOCCARE un altro giocatore: la patata passa a lui all\'istante.',
      'Chi ha appena ricevuto la patata non può ridarla a chi gliel\'ha data per 1 secondo (niente ping-pong): può però passarla subito a chiunque altro.',
      'Chi tiene la patata corre un po\' più veloce degli altri (il 15% in più): gli altri devono scappare e non farsi chiudere negli angoli.',
      'La miccia dura un tempo segreto, scelto a caso (Normale: da 9 a 18 secondi; Corta: da 6 a 12; Lunga: da 14 a 26). Si sente solo il ticchettio, che accelera più a lungo resta accesa; nell\'ultimo secondo la miccia sfrigola rossa.',
      'Quando scoppia, chi tiene la patata è eliminato (e chi è vicino viene sbalzato via dall\'onda). Dopo due secondi la patata riparte da uno dei rimasti, scelto a caso, con una miccia nuova. Si continua finché ne resta uno solo: ha vinto il round.',
      'Punti del round: un punto per ogni giocatore saltato in aria prima di te; l\'ultimo rimasto ne prende 2 in più. Dopo 3 round (o 1, o 5) vince chi ha più punti.',
      'Il gioco è in tempo reale: si ferma per tutti quando qualcuno apre le dispense.',
      'Il computer facile reagisce tardi, insegue il più vicino un po\' a caso e scappa senza badare ai muri; il medio insegue e scappa bene stando lontano dai muri; il difficile con la patata anticipa la traiettoria del bersaglio e punta chi è chiuso contro un muro, senza patata scappa prima e più lontano, scarta di lato quando è inseguito da vicino e sta lontano da muri, angoli e colonne.',
    ],
  },
  crea: (o) => new Patata(o),
  bot: () => ({}),
  _test: { IA, Patata, intervallo, IMMUNITA, MICCE, V, VELOCE },
};
