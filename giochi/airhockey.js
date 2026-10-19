// AIR HOCKEY in tempo reale: 1 contro 1 o 2 contro 2, a 7 gol. La fisica gira sul server.
// Squadra A = posti pari (difende la porta in basso), squadra B = posti dispari (porta in alto).
const W = 600, H = 1000, R_DISCO = 28, R_MAZZA = 44, PORTA = 230;
const V_MAX = 2100, V_MAZZA = 2600, ATTRITO = 0.9975, RIMBALZO = 0.88;
const PAUSA_GOL = 1300, VIA_MS = 3000;
const T = require('./trucco');
const WIN_MS = 25000; // il trucco segreto (!win): per 25 secondi (o fino al suo gol) avversari lenti e tiri che vanno in porta

class AirHockey {
  constructor({ n, opzioni = {}, bot = [] }) {
    this.id = 'airhockey';
    this.n = n;
    this.aSquadre = n === 4;
    this.obiettivo = [5, 7, 10].includes(Number(opzioni.gol)) ? Number(opzioni.gol) : 7;
    this.bot = bot.slice();
    this.tickMs = 20;
    this.gol = [0, 0];
    this.mazze = Array.from({ length: n }, (_, i) => this.posizioneIniziale(i));
    this.disco = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
    this.fermoFino = Date.now() + VIA_MS;
    this.servizio = Math.random() < 0.5 ? 0 : 1;
    this.ultimo = null;
    this.colpi = 0;
    this.inPausa = false; this.pausaDal = null;
    this.turno = null; this.inAttesa = false; this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    this.metti(this.servizio);
  }
  squadra(p) { return p % 2; }
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  impostaBot(p, l) { this.bot[p] = l; }
  impostaPausa(si) {
    if (si === this.inPausa || this.finita) return;
    if (si) this.pausaDal = Date.now(); else if (this.pausaDal) { this.fermoFino += Date.now() - this.pausaDal; this.ultimo = null; }
    this.inPausa = si;
  }
  posizioneIniziale(p) {
    const s = this.squadra(p), compagno = this.n === 4 ? Math.floor(p / 2) : 0; // in 2 contro 2: uno a sinistra e uno a destra
    const x = this.n === 4 ? (compagno ? W * 0.7 : W * 0.3) : W / 2;
    const y = s === 0 ? H - 130 : 130;
    return { x, y, tx: x, ty: y, vx: 0, vy: 0 };
  }
  metti(squadraCheServe) { // il disco va fermo nella metà di chi deve battere
    this.disco = { x: W / 2 + (Math.random() - 0.5) * 140, y: squadraCheServe === 0 ? H * 0.68 : H * 0.32, vx: 0, vy: 0 };
  }
  limiti(p) { // ognuno resta nella sua metà campo
    const s = this.squadra(p);
    return { x0: R_MAZZA, x1: W - R_MAZZA, y0: s === 0 ? H / 2 + R_MAZZA : R_MAZZA, y1: s === 0 ? H - R_MAZZA : H / 2 - R_MAZZA };
  }
  input(p, d) {
    const m = this.mazze[p];
    if (!m || this.bot[p]) return;
    const x = Number(d.x), y = Number(d.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const l = this.limiti(p);
    m.tx = Math.max(l.x0, Math.min(l.x1, x)); m.ty = Math.max(l.y0, Math.min(l.y1, y));
  }

  tick(ora) {
    if (this.finita || this.inPausa) { this.ultimo = null; return false; }
    const dt = Math.min(0.05, this.ultimo ? (ora - this.ultimo) / 1000 : this.tickMs / 1000);
    this.ultimo = ora;
    this.mazze.forEach((m, p) => { if (this.bot[p]) pensaBot(this, p, this.bot[p]); });
    // chi ha il trucco segreto in questo momento (al massimo uno conta)
    this.win = null;
    for (let p = 0; p < this.n; p++) if (this.conTrucco(p, ora)) this.win = p;
    let cambiato = false;
    const PASSI = 10; // passi piccoli: il disco non può "saltare" oltre una racchetta
    for (let k = 0; k < PASSI && !this.finita; k++) cambiato = this.passo(dt / PASSI, ora) || cambiato;
    return cambiato;
  }

  passo(dt, ora) {
    this.ora = ora;
    // le mazze inseguono il punto indicato, con una velocità massima
    this.mazze.forEach((m, p) => {
      const dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy);
      const lento = this.win != null && this.squadra(p) !== this.squadra(this.win) ? 0.55 : 1;
      const max = (this.bot[p] ? velocitaBot(this.bot[p]) : V_MAZZA) * dt * lento;
      const f = d > max ? max / d : 1;
      const nx = m.x + dx * f, ny = m.y + dy * f;
      m.vx = (nx - m.x) / dt; m.vy = (ny - m.y) / dt;
      m.x = nx; m.y = ny;
    });
    // le mazze della stessa metà non si sovrappongono
    for (let a = 0; a < this.n; a++) for (let b = a + 1; b < this.n; b++) {
      const A = this.mazze[a], B = this.mazze[b];
      const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1;
      if (d < 2 * R_MAZZA) { const s = (2 * R_MAZZA - d) / 2; A.x -= (dx / d) * s; A.y -= (dy / d) * s; B.x += (dx / d) * s; B.y += (dy / d) * s; }
    }
    if (ora < this.fermoFino) return false;
    const c = this.disco;
    c.x += c.vx * dt; c.y += c.vy * dt;
    c.vx *= Math.pow(ATTRITO, dt * 60); c.vy *= Math.pow(ATTRITO, dt * 60);
    // sponde laterali
    if (c.x < R_DISCO) { c.x = R_DISCO; c.vx = Math.abs(c.vx) * RIMBALZO; }
    if (c.x > W - R_DISCO) { c.x = W - R_DISCO; c.vx = -Math.abs(c.vx) * RIMBALZO; }
    // fondo campo: gol se il disco entra nella porta, altrimenti rimbalza
    const inPorta = Math.abs(c.x - W / 2) < PORTA / 2 - R_DISCO * 0.3;
    if (c.y < R_DISCO && !inPorta) { c.y = R_DISCO; c.vy = Math.abs(c.vy) * RIMBALZO; }
    if (c.y > H - R_DISCO && !inPorta) { c.y = H - R_DISCO; c.vy = -Math.abs(c.vy) * RIMBALZO; }
    if (c.y < -R_DISCO) return this.segna(0, ora);   // entrato in alto: gol della squadra A
    if (c.y > H + R_DISCO) return this.segna(1, ora); // entrato in basso: gol della squadra B
    // urti con le mazze
    for (const [p, m] of this.mazze.entries()) {
      const dx = c.x - m.x, dy = c.y - m.y, d = Math.hypot(dx, dy);
      if (d >= R_DISCO + R_MAZZA) continue;
      // normale dell'urto: se i centri coincidono si usa il verso del movimento della racchetta
      let nx, ny;
      if (d > 0.001) { nx = dx / d; ny = dy / d; } else { const v = Math.hypot(m.vx, m.vy) || 1; nx = m.vx / v || 0; ny = m.vy / v || 1; }
      c.x = m.x + nx * (R_DISCO + R_MAZZA); c.y = m.y + ny * (R_DISCO + R_MAZZA);
      // velocità della racchetta limitata: le spinte dovute agli aggiustamenti di posizione non contano
      let mvx = m.vx, mvy = m.vy;
      const vm = Math.hypot(mvx, mvy);
      if (vm > V_MAZZA) { mvx *= V_MAZZA / vm; mvy *= V_MAZZA / vm; }
      const rvx = c.vx - mvx, rvy = c.vy - mvy;
      const vn = rvx * nx + rvy * ny;
      // disco schiacciato tra racchetta e sponda: niente colpi ripetuti (era questo a farlo accelerare all'impazzata)
      const schiacciato = c.x <= R_DISCO + 1 || c.x >= W - R_DISCO - 1 || (!inPorta && (c.y <= R_DISCO + 1 || c.y >= H - R_DISCO - 1));
      if (vn < 0 && !schiacciato) {
        c.vx -= 1.9 * vn * nx; c.vy -= 1.9 * vn * ny;
        c.vx += mvx * 0.2; c.vy += mvy * 0.2;
        // una piccola deviazione a ogni colpo, come sul tavolo vero: il disco non resta mai perfettamente dritto
        const ang = (Math.random() - 0.5) * 0.12, co = Math.cos(ang), si = Math.sin(ang);
        [c.vx, c.vy] = [c.vx * co - c.vy * si, c.vx * si + c.vy * co];
        // col trucco segreto il tiro va dritto verso la porta avversaria, forte
        if (p === this.win) {
          const gy = this.squadra(p) === 0 ? -R_DISCO * 2 : H + R_DISCO * 2, gx = W / 2 + (Math.random() - 0.5) * PORTA * 0.4;
          const dx = gx - c.x, dy = gy - c.y, d = Math.hypot(dx, dy) || 1, v = Math.max(1500, Math.hypot(c.vx, c.vy));
          c.vx = (dx / d) * v; c.vy = (dy / d) * v;
        }
        this.colpi++;
      } else if (schiacciato) {
        // il disco scivola via lungo la sponda, piano
        c.vx *= 0.9; c.vy *= 0.9;
      }
    }
    // velocità massima sempre rispettata (anche dopo i rimbalzi)
    const vd = Math.hypot(c.vx, c.vy);
    if (vd > V_MAX) { c.vx *= V_MAX / vd; c.vy *= V_MAX / vd; }
    // la racchetta non può spingere il disco oltre le sponde (fuori resta solo la bocca della porta)
    c.x = Math.max(R_DISCO, Math.min(W - R_DISCO, c.x));
    if (!inPorta) c.y = Math.max(R_DISCO, Math.min(H - R_DISCO, c.y));
    // se il disco è contro la sponda, è la racchetta a doversi spostare (niente dischi schiacciati)
    for (const m of this.mazze) {
      const dx = m.x - c.x, dy = m.y - c.y, d = Math.hypot(dx, dy) || 1;
      if (d < R_DISCO + R_MAZZA) { m.x = c.x + (dx / d) * (R_DISCO + R_MAZZA); m.y = c.y + (dy / d) * (R_DISCO + R_MAZZA); }
    }
    // disco incastrato vicino a una sponda: dopo un secondo si stacca da solo verso il centro della sua metà
    const vicinoSponda = c.x < R_DISCO + 12 || c.x > W - R_DISCO - 12 || (!inPorta && (c.y < R_DISCO + 12 || c.y > H - R_DISCO - 12));
    const toccato = this.mazze.some((m) => Math.hypot(m.x - c.x, m.y - c.y) < R_DISCO + R_MAZZA + 4);
    const angolo = (c.x < R_DISCO + R_MAZZA || c.x > W - R_DISCO - R_MAZZA) && (c.y < R_DISCO + R_MAZZA * 1.5 || c.y > H - R_DISCO - R_MAZZA * 1.5);
    if ((vicinoSponda || angolo) && (toccato || Math.hypot(c.vx, c.vy) < 80)) {
      this.incastro = (this.incastro || 0) + dt;
      if (this.incastro > (angolo ? 0.6 : 1)) {
        const cy = c.y > H / 2 ? H * 0.72 : H * 0.28;
        const dx = W / 2 - c.x, dy = cy - c.y, d = Math.hypot(dx, dy) || 1;
        c.vx = (dx / d) * 650; c.vy = (dy / d) * 650;
        this.incastro = 0;
        // le racchette vicine si fanno da parte e per mezzo secondo i computer tornano in difesa
        for (const m of this.mazze) {
          const ex = m.x - c.x, ey = m.y - c.y, e = Math.hypot(ex, ey) || 1;
          if (e < R_DISCO + R_MAZZA + 70) { m.x = c.x + (ex / e) * (R_DISCO + R_MAZZA + 70); m.y = c.y + (ey / e) * (R_DISCO + R_MAZZA + 70); }
        }
        this.calmaFino = ora + 900;
      }
    } else this.incastro = 0;
    return false;
  }

  // il trucco segreto: true per i primi 25 secondi di gioco dopo il comando, poi si spegne
  conTrucco(p, ora) {
    if (!T.armato(this, p) || ora < this.fermoFino) return false;
    const da = (this._winDa = this._winDa || {});
    if (da[p] == null) da[p] = ora;
    if (ora - da[p] < WIN_MS) return true;
    T.consuma(this, p); delete da[p];
    return false;
  }

  segna(squadra, ora) {
    this.gol[squadra]++;
    // il gol della squadra di chi ha il trucco chiude il trucco
    for (let p = 0; p < this.n; p++) if (this.squadra(p) === squadra && this._winDa && this._winDa[p] != null) { T.consuma(this, p); delete this._winDa[p]; }
    this.win = null;
    const chi = this.aSquadre ? null : squadra; // in 1 contro 1 il posto coincide con la squadra
    const nomeSq = squadra === 0 ? 'A' : 'B';
    this.annuncia(chi, this.aSquadre ? `Gol della squadra ${nomeSq}! ${this.gol[0]}–${this.gol[1]}` : `segna! ${this.gol[0]}–${this.gol[1]}`, `gol! ${this.gol[0]}–${this.gol[1]}`, true);
    if (this.gol[squadra] >= this.obiettivo) { this.chiudi(squadra); return true; }
    this.metti(1 - squadra); // batte chi ha subito
    this.mazze.forEach((m, p) => { const s = this.posizioneIniziale(p); if (this.bot[p]) Object.assign(m, s); });
    this.fermoFino = ora + PAUSA_GOL;
    return true;
  }

  chiudi(squadra) {
    this.finita = true;
    const vincitori = Array.from({ length: this.n }, (_, i) => i).filter((i) => this.squadra(i) === squadra);
    this.risultato = {
      fazioni: this.aSquadre ? [{ posti: [0, 2], punti: this.gol[0] }, { posti: [1, 3], punti: this.gol[1] }] : [0, 1].map((i) => ({ posti: [i], punti: this.gol[i] })),
      etichetta: 'gol', pareggio: false, vincitori,
    };
  }

  vistaTick() {
    const r = (v) => Math.round(v);
    return { d: [r(this.disco.x), r(this.disco.y), r(this.disco.vx), r(this.disco.vy)], m: this.mazze.map((m) => [r(m.x), r(m.y)]), g: this.gol, fermo: Math.max(0, this.fermoFino - Date.now()), pausa: this.inPausa, t: Date.now() };
  }
  vista(p) {
    return {
      gioco: this.id, n: this.n, aSquadre: this.aSquadre, obiettivo: this.obiettivo, W, H, R_DISCO, R_MAZZA, PORTA, V_MAZZA,
      miaSquadra: this.squadra(p), limiti: this.limiti(p), stato: this.vistaTick(), gol: this.gol,
      turno: null, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// ---------------- computer ----------------
const velocitaBot = (l) => ({ facile: 900, medio: 1500, difficile: 2300 })[l] || 1500;
const REAZIONE = { facile: 260, medio: 150, difficile: 60 };
function pensaBot(g, p, livello) {
  const m = g.mazze[p], c = g.disco, s = g.squadra(p), l = g.limiti(p);
  // tempo di reazione: il computer rivede la sua mossa solo ogni tanto
  const ora = g.ora || Date.now();
  if (m.pensaDopo && ora < m.pensaDopo) return;
  m.pensaDopo = ora + (REAZIONE[livello] || 150) * (0.7 + Math.random() * 0.6);
  const mia = s === 0 ? c.y > H / 2 : c.y < H / 2;
  const portaY = s === 0 ? H - R_MAZZA - 10 : R_MAZZA + 10;
  const verso = s === 0 ? -1 : 1;              // verso la porta avversaria
  const difensore = g.n === 4 && Math.floor(p / 2) === 1; // in 2 contro 2: uno difende, l'altro attacca
  let tx, ty;
  const calma = g.calmaFino && g.ora < g.calmaFino;
  // se il disco è incollato alla sponda dietro, il computer lo prende di lato invece di schiacciarlo
  const inFondo = s === 0 ? c.y > H - R_DISCO - R_MAZZA - 20 : c.y < R_DISCO + R_MAZZA + 20;
  // disco in un angolo: il computer non ci si butta sopra (lo bloccherebbe), resta davanti e aspetta che esca
  const nellAngolo = (c.x < R_DISCO + R_MAZZA * 1.2 || c.x > W - R_DISCO - R_MAZZA * 1.2) && inFondo;
  // se sta spingendo il disco da un po' e il disco non si muove, si allontana per un attimo
  const vicino = Math.hypot(m.x - c.x, m.y - c.y) < R_DISCO + R_MAZZA + 6;
  if (vicino && Math.hypot(c.vx, c.vy) < 120) m.spinta = (m.spinta || 0) + 1; else m.spinta = 0;
  if (m.spinta > 6) { m.indietroFino = ora + 700; m.spinta = 0; }
  const indietro = m.indietroFino && ora < m.indietroFino;
  if (mia && !difensore && !calma && (nellAngolo || indietro)) {
    tx = W / 2 + (c.x - W / 2) * 0.35; ty = c.y + verso * (R_DISCO + R_MAZZA * 2.6);
  } else if (mia && !difensore && !calma && inFondo) {
    tx = c.x + (c.x > W / 2 ? -1 : 1) * (R_DISCO + R_MAZZA * 0.8); ty = c.y;
  } else if (mia && !difensore && !calma) {
    // attacca: sceglie un angolo della porta avversaria (lontano dal portiere) e colpisce il disco da dietro
    const anticipo = livello === 'difficile' ? 0.08 : livello === 'medio' ? 0.04 : 0;
    const px = c.x + c.vx * anticipo, py = c.y + c.vy * anticipo;
    if (!m.mira || Math.random() < 0.01) {
      const avversari = g.mazze.filter((_, i) => g.squadra(i) !== s);
      const portiere = avversari.length ? avversari.reduce((a, b) => (Math.abs(b.y - (s === 0 ? 0 : H)) < Math.abs(a.y - (s === 0 ? 0 : H)) ? b : a)) : { x: W / 2 };
      const lato = portiere.x > W / 2 ? -1 : 1;
      m.mira = W / 2 + lato * PORTA * (livello === 'facile' ? Math.random() * 0.5 : 0.36);
    }
    const ay = s === 0 ? -40 : H + 40;
    const dx = m.mira - px, dy = ay - py, d = Math.hypot(dx, dy) || 1;
    // se è già dietro al disco spinge attraverso, altrimenti prima si posiziona
    const dietro = (m.y - py) * verso < -R_MAZZA * 0.3;
    const k = dietro ? -R_MAZZA * 0.9 : R_MAZZA * 1.1;
    tx = px - (dx / d) * k; ty = py - (dy / d) * k;
    if (!dietro && Math.abs(m.x - tx) < R_MAZZA && (m.y - py) * verso > 0) tx += (m.x < px ? -1 : 1) * R_MAZZA * 1.4; // gira intorno al disco
    if (livello === 'facile' && Math.random() < 0.25) { tx = m.x; ty = m.y; }
  } else {
    m.mira = null;
    // difende: tra il disco e la propria porta
    const rientro = difensore ? 0.14 : 0.22;
    tx = W / 2 + (c.x - W / 2) * 0.5; ty = portaY + verso * (H / 2) * rientro;
  }
  m.tx = Math.max(l.x0, Math.min(l.x1, tx)); m.ty = Math.max(l.y0, Math.min(l.y1, ty));
}

module.exports = {
  meta: {
    id: 'airhockey',
    nome: 'Air Hockey',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [2, 4],
    descrizione: 'In tempo reale, 1 contro 1 o 2 contro 2: spingi il disco nella porta avversaria.',
    opzioni: [
      { id: 'gol', nome: 'Si vince a', valori: [7, 5, 10], etichette: ['7 gol', '5 gol', '10 gol'], predefinito: 7 },
    ],
    regole: [
      'Si gioca in tempo reale su un tavolo da air hockey: in 2 (uno contro uno) o in 4 (due contro due, i compagni sono i posti 1 e 3 contro 2 e 4).',
      'Muovi la tua racchetta con il mouse o col dito (segue il puntatore), oppure con WASD o le frecce; resta sempre nella tua metà campo. La tua porta è sempre quella in basso sullo schermo.',
      'Colpisci il disco per mandarlo nella porta avversaria. Il disco rimbalza sulle sponde e rallenta pian piano. Più la racchetta si muove veloce, più forte parte il disco.',
      'Dopo ogni gol il disco si ferma per un attimo e batte chi ha subito il gol. Vince chi arriva per primo a 7 gol (o a 5 o 10, se scelto prima di iniziare).',
      'La partita parte dopo un conto alla rovescia di 3 secondi. È in tempo reale: se qualcuno apre le dispense (Esc) si ferma per tutti.',
      'Il computer facile è lento e ogni tanto si distrae, il medio difende e attacca con ordine, il difficile è velocissimo e anticipa dove va il disco. In 2 contro 2 i computer si dividono il campo: uno attacca e uno difende.',
    ],
  },
  crea: (o) => new AirHockey(o),
  bot: () => ({}),
  _test: { W, H },
};
