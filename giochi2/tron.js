// MOTO DI LUCE: arena a quadretti vista dall'alto. Ogni moto va sempre avanti e lascia dietro di sé una scia di luce
// che resta per tutto il round; si gira solo di 90° (frecce/WASD, joystick o strisciando il dito). Chi sbatte contro
// una scia (anche la propria) o contro il bordo è fuori: l'ultimo rimasto vince il round. Turbo breve facoltativo.
// Dopo 75 secondi il bordo comincia a stringersi, così nessun round dura per sempre.
// ANTI-LAG: la scia di una moto è una spezzata (gli angoli dove ha girato più la testa): a ogni tick partono solo la
// testa e gli ultimi angoli, il browser se li tiene; se gliene manca qualcuno lo chiede (input { rs: 1 }) e al tick
// dopo riceve la scia intera.
const { Arena } = require('../giochi/arena');
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

const CELLA = 10; // unità del browser per quadretto
const ARENE = { media: [88, 55], piccola: [64, 40], grande: [120, 75] };
const VELOCITA = { normale: 12, lenta: 9, veloce: 16 }; // quadretti al secondo
const TURBO_DURATA = 1, TURBO_RICARICA = 5; // secondi
const STRINGE_DOPO = 75, STRINGE_OGNI = 2.5;
const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1]; // 0 destra, 1 giù, 2 sinistra, 3 su
const NOMI_EXTRA = ['Lampo', 'Saetta', 'Neon', 'Fulmine', 'Scintilla'];
const MURO = 255;

class MotoDiLuce extends Arena {
  constructor(o) {
    const op = o.opzioni || {};
    super(o, { id: 'tron', round: 5, tickMs: 33 });
    this.nRound = [5, 3, 7].includes(Number(op.round)) ? Number(op.round) : 5;
    const [c, r] = ARENE[op.arena] || ARENE.media;
    this.cols = c; this.righe = r;
    this.W = c * CELLA; this.H = r * CELLA;
    this.vel = VELOCITA[op.velocita] || VELOCITA.normale;
    this.conTurbo = op.turbo !== 'no';
    const ex = op.extra === undefined || op.extra === 'auto' ? 'auto' : Number(op.extra);
    this.nExtra = ex === 'auto' || !Number.isFinite(ex) ? (o.n === 1 ? 3 : 0) : Math.max(0, Math.min(4, ex));
    if (o.n === 1 && this.nExtra === 0) this.nExtra = 3; // da soli serve almeno un avversario
    this.forzaExtra = ['medio', 'facile', 'difficile'].includes(op.forza) ? op.forza : 'medio';
    this.tot = this.n + this.nExtra;
    this.N = c * r;
    // la griglia: 0 libero, id+1 scia di quella moto, MURO bordo che si stringe
    this.griglia = new Uint8Array(this.N);
    // attrezzi per le ricerche del computer (allocati una volta sola)
    this.vis = new Int32Array(this.N); this.gen = 1;
    this.dist = new Int16Array(this.N); this.chi = new Uint8Array(this.N); this.coda = new Int32Array(this.N);
    this.seq = new Array(this.n).fill(0); this.daTasti = new Array(this.n).fill(0);
    this.rifai = new Array(this.n).fill(true);
    this.etichettaPunti = 'punti';
    this.puntiTutti = new Array(this.tot).fill(0); // anche le moto del computer in più
    this.avvia();
  }

  // ---------- partenza: le moto in fila sui quattro lati, sfalsate, tutte verso l'interno ----------
  posizioni() {
    const lati = [[], [], [], []]; // sinistra, destra, sopra, sotto
    for (let i = 0; i < this.tot; i++) lati[i % 4].push(i);
    const out = [];
    const { cols: C, righe: R } = this;
    lati.forEach((ids, l) => ids.forEach((id, k) => {
      const f = (k + 1) / (ids.length + 1);
      if (l === 0) out[id] = [4, Math.round(f * (R - 1)) - 1, 0];
      if (l === 1) out[id] = [C - 5, Math.round(f * (R - 1)) + 1, 2];
      if (l === 2) out[id] = [Math.round(f * (C - 1)) + 2, 4, 1];
      if (l === 3) out[id] = [Math.round(f * (C - 1)) - 2, R - 5, 3];
    }));
    return out;
  }
  iniziaRound() {
    this.griglia.fill(0);
    const pos = this.posizioni();
    // l'ordine dei posti cambia a ogni round (nessuno parte sempre dallo stesso lato)
    const giro = (this.round - 1) % this.tot;
    this.m = Array.from({ length: this.tot }, (_, i) => {
      const [x, y, dir] = pos[(i + giro) % this.tot];
      const extra = i >= this.n;
      return {
        id: i, x, y, dir, segDir: dir, vivo: true, c: [[x, y]], coda: [], ultimo: 0, periodo: 2,
        turboFino: -1, carica: 1, morto: null, da: null, extra, liv: extra ? this.forzaExtra : null, nome: extra ? NOMI_EXTRA[(i - this.n) % NOMI_EXTRA.length] : null,
      };
    });
    for (const b of this.m) this.griglia[b.y * this.cols + b.x] = b.id + 1;
    this.acc = 0; this.mezzo = 0; this.anello = 0; this.prossimoAnello = STRINGE_DOPO;
    this.ordine = []; // chi si è schiantato, nell'ordine (gruppi di chi cade insieme)
    this.rifai.fill(true);
    this.cambiato = true;
  }
  spostaTempi() {}

  // ---------- comandi: { g: [numero, direzione] } dalla tastiera e dal dito; { x, y } dal joystick ----------
  input(p, d) {
    if (!d || this.finita || this.bot[p]) return;
    if (d.rs) this.rifai[p] = true;
    if (Array.isArray(d.g)) {
      const [k, dir] = d.g.map(Number);
      this.daTasti[p] = Date.now();
      if (Number.isInteger(k) && k > this.seq[p] && [0, 1, 2, 3].includes(dir)) { this.seq[p] = k; this.accoda(p, dir); }
      if (d.t !== undefined) super.input(p, { t: d.t });
      return;
    }
    const prima = this.inp[p], vx = prima.x, vy = prima.y;
    super.input(p, d);
    const i = this.inp[p];
    // la tastiera manda anche { x, y } (lo fa il motore): dopo una svolta { g } valgono solo quelle per un po'
    if (Date.now() - this.daTasti[p] < 2000 || (i.x === vx && i.y === vy)) return;
    if (Math.max(Math.abs(i.x), Math.abs(i.y)) < 0.5) return;
    this.accoda(p, Math.abs(i.x) > Math.abs(i.y) ? (i.x > 0 ? 0 : 2) : (i.y > 0 ? 1 : 3));
  }
  accoda(p, dir) {
    const b = this.m && this.m[p];
    if (!b || !b.vivo || this.fase === 'pausaRound') return;
    const ultima = b.coda.length ? b.coda[b.coda.length - 1] : b.dir;
    if (dir === ultima || dir === (ultima + 2) % 4) return; // stessa direzione o marcia indietro: niente
    if (b.coda.length < 3) b.coda.push(dir);
  }

  // ---------- il movimento a passi (mezzi passi: col turbo si va al doppio) ----------
  passo(dt) {
    aggiornaWin(this, dt);
    const t = this.tempoRound;
    // turbo
    for (let p = 0; p < this.n; p++) if (!this.bot[p] && this.nuoviTocchi(p)) this.turbo(this.m[p]);
    for (const b of this.m) {
      if (!b.vivo) continue;
      if (b.turboFino < t) b.carica = Math.min(1, b.carica + dt / TURBO_RICARICA);
      b.periodo = b.turboFino >= t ? 1 : 2;
    }
    this.acc += dt * this.vel * 2;
    let giri = 0;
    while (this.acc >= 1 && giri++ < 8) { this.acc -= 1; this.mezzo++; this.mezzoPasso(); }
    // il bordo si stringe
    if (t >= this.prossimoAnello && this.anello < Math.min(this.cols, this.righe) / 2 - 3) { this.prossimoAnello = t + STRINGE_OGNI; this.stringi(); }
    const vivi = this.m.filter((b) => b.vivo).length;
    return vivi <= 1;
  }
  turbo(b) {
    if (!this.conTurbo || !b || !b.vivo || b.carica < 1) return;
    b.carica = 0; b.turboFino = this.tempoRound + TURBO_DURATA;
  }
  mezzoPasso() {
    const pari = this.mezzo % 2 === 0, C = this.cols, R = this.righe, G = this.griglia;
    const muove = this.m.filter((b) => b.vivo && (pari || b.periodo === 1));
    if (!muove.length) return;
    // le direzioni: i computer decidono, le persone prendono la prossima svolta in coda
    for (const b of muove) {
      if (b.extra || this.bot[b.id]) this.decidi(b, b.liv || this.bot[b.id]);
      else while (b.coda.length) { const d = b.coda.shift(); if (d !== b.dir && d !== (b.dir + 2) % 4) { b.dir = d; break; } }
      if (b.id < this.n && this.winOn[b.id]) this.salva(b);
    }
    const dove = new Map(), morti = [];
    for (const b of muove) {
      const nx = b.x + DX[b.dir], ny = b.y + DY[b.dir];
      b.nx = nx; b.ny = ny;
      if (nx < 0 || ny < 0 || nx >= C || ny >= R) { morti.push([b, null]); continue; }
      const v = G[ny * C + nx];
      if (v) { morti.push([b, v === MURO ? null : v - 1]); continue; }
      const k = ny * C + nx;
      if (dove.has(k)) { morti.push([b, dove.get(k).id]); morti.push([dove.get(k), b.id]); } else dove.set(k, b);
    }
    const fuori = new Set(morti.map(([b]) => b));
    for (const b of muove) {
      if (fuori.has(b)) continue;
      if (b.dir !== b.segDir) { b.c.push([b.x, b.y]); b.segDir = b.dir; }
      b.x = b.nx; b.y = b.ny; b.ultimo = this.mezzo;
      G[b.y * C + b.x] = b.id + 1;
    }
    if (morti.length) this.cadono(morti);
  }
  // !win banana: se la moto sta per schiantarsi gira da sola verso la strada più libera
  salva(b) {
    const C = this.cols, R = this.righe, G = this.griglia;
    const libera = (d) => { const x = b.x + DX[d], y = b.y + DY[d]; return x >= 0 && y >= 0 && x < C && y < R && !G[y * C + x]; };
    if (libera(b.dir)) return;
    const corsa = (d) => { let k = 0, x = b.x, y = b.y; while (k < 40) { x += DX[d]; y += DY[d]; if (x < 0 || y < 0 || x >= C || y >= R || G[y * C + x]) break; k++; } return k; };
    const ok = [(b.dir + 1) % 4, (b.dir + 3) % 4].filter(libera).sort((a, c) => corsa(c) - corsa(a));
    if (ok.length) { b.dir = ok[0]; b.coda.length = 0; }
  }
  cadono(morti) {
    const gruppo = [];
    for (const [b, da] of morti) {
      if (!b.vivo) continue;
      b.vivo = false; b.morto = this.tempoRound; b.da = da;
      // la testa si ferma contro l'ostacolo: un angolo in più, così la scia arriva fino al punto dello schianto
      if (b.dir !== b.segDir) { b.c.push([b.x, b.y]); b.segDir = b.dir; }
      b.ultimo = this.mezzo;
      gruppo.push(b.id);
    }
    if (!gruppo.length) return;
    this.ordine.push(gruppo);
    this.cambiato = true;
    for (const id of gruppo) {
      const b = this.m[id];
      if (id >= this.n) continue;
      const da = b.da;
      if (da === null || da === undefined) this.annuncia(id, 'si schianta contro il bordo 💥', 'ti sei schiantato contro il bordo 💥');
      else if (da === id) this.annuncia(id, 'si schianta sulla sua scia 💥', 'ti sei schiantato sulla tua scia 💥');
      else if (da < this.n) this.annuncia(id, 'si schianta sulla scia di @ 💥', 'ti sei schiantato sulla scia di @ 💥', false, { bersaglio: da, testoTe: 'si è schiantato sulla tua scia ⚡' });
      else this.annuncia(id, `si schianta sulla scia di ${this.m[da].nome} 💥`, `ti sei schiantato sulla scia di ${this.m[da].nome} 💥`);
    }
  }
  stringi() {
    const a = this.anello, C = this.cols, R = this.righe, G = this.griglia;
    for (let x = a; x < C - a; x++) { G[a * C + x] = MURO; G[(R - 1 - a) * C + x] = MURO; }
    for (let y = a; y < R - a; y++) { G[y * C + a] = MURO; G[y * C + C - 1 - a] = MURO; }
    this.anello++;
    const presi = this.m.filter((b) => b.vivo && (b.x < this.anello || b.y < this.anello || b.x >= C - this.anello || b.y >= R - this.anello));
    if (presi.length) this.cadono(presi.map((b) => [b, null]));
    this.cambiato = true;
  }
  fineRound() {
    fineWin(this);
    // un punto per ogni moto caduta prima di te; l'ultimo rimasto ne prende 2 in più
    const prima = new Array(this.tot).fill(0);
    let caduti = 0;
    for (const gr of this.ordine) { for (const id of gr) prima[id] = caduti; caduti += gr.length; }
    const vivo = this.m.find((b) => b.vivo);
    if (vivo) prima[vivo.id] = caduti + 2;
    for (let p = 0; p < this.n; p++) this.punti[p] += prima[p];
    for (let i = 0; i < this.tot; i++) this.puntiTutti[i] += prima[i];
    this.vincitoreRound = vivo ? vivo.id : null;
    if (vivo && vivo.id < this.n) this.annuncia(vivo.id, 'vince il round! ⚡🏆', 'hai vinto il round! ⚡🏆', true);
    else if (vivo) this.annuncia(0, `${vivo.nome} vince il round ⚡`, `${vivo.nome} vince il round ⚡`);
    else this.annuncia(0, 'tutti a terra insieme: round pari 🤝', 'tutti a terra insieme: round pari 🤝');
  }

  // ---------- il computer ----------
  libera(x, y) { return x >= 0 && y >= 0 && x < this.cols && y < this.righe && !this.griglia[y * this.cols + x]; }
  dritto(x, y, dir, max) { let k = 0; while (k < max && this.libera(x + DX[dir] * (k + 1), y + DY[dir] * (k + 1))) k++; return k; }
  // celle dove un'altra moto può entrare al prossimo passo (pericolose: scontro frontale)
  vicinoATeste(x, y, io) {
    for (const o of this.m) if (o.vivo && o !== io && Math.abs(o.x - x) + Math.abs(o.y - y) === 1) return true;
    return false;
  }
  // spazio raggiungibile da (x, y) (flood fill), fino a "max" quadretti
  area(x, y, max) {
    const C = this.cols, G = this.griglia, vis = this.vis, coda = this.coda, g = ++this.gen;
    const k0 = y * C + x; vis[k0] = g; coda[0] = k0;
    let testa = 0, fine = 1;
    while (testa < fine && fine < max) {
      const k = coda[testa++], cx = k % C, cy = (k - cx) / C;
      for (let d = 0; d < 4; d++) {
        const nx = cx + DX[d], ny = cy + DY[d];
        if (nx < 0 || ny < 0 || nx >= C || ny >= this.righe) continue;
        const kk = ny * C + nx;
        if (G[kk] || vis[kk] === g) continue;
        vis[kk] = g; coda[fine++] = kk;
      }
    }
    return fine;
  }
  // è chiuso in una zona dove non c'è nessun altro? (una volta chiuso lo resta per tutto il round)
  separato(b) {
    const C = this.cols, G = this.griglia, vis = this.vis, coda = this.coda, g = ++this.gen;
    const teste = new Set(); for (const o of this.m) if (o.vivo && o !== b) teste.add(o.y * C + o.x);
    if (!teste.size) return true;
    const k0 = b.y * C + b.x; vis[k0] = g; coda[0] = k0;
    let testa = 0, fine = 1;
    while (testa < fine) {
      if (fine > 2500) return false; // tanto spazio: di sicuro non è chiuso da solo (o non conviene saperlo)
      const k = coda[testa++], cx = k % C, cy = (k - cx) / C;
      for (let d = 0; d < 4; d++) {
        const nx = cx + DX[d], ny = cy + DY[d];
        if (nx < 0 || ny < 0 || nx >= C || ny >= this.righe) continue;
        const kk = ny * C + nx;
        if (teste.has(kk)) return false;
        if (G[kk] || vis[kk] === g) continue;
        vis[kk] = g; coda[fine++] = kk;
      }
    }
    return true;
  }
  // VORONOI: quadretti a cui arrivo prima io (da x, y dopo la mossa) che gli altri (dalle loro teste).
  // Restituisce { mie, insieme }: insieme = c'è almeno un altro nella stessa zona.
  voronoi(x, y, io, prof) {
    const C = this.cols, R = this.righe, G = this.griglia, vis = this.vis, coda = this.coda, dist = this.dist, chi = this.chi, g = ++this.gen;
    let fine = 0;
    const k0 = y * C + x; vis[k0] = g; dist[k0] = 0; chi[k0] = 1; coda[fine++] = k0;
    for (const o of this.m) {
      if (!o.vivo || o === io || Math.abs(o.x - x) + Math.abs(o.y - y) > prof * 1.5) continue; // solo chi è vicino
      const k = o.y * C + o.x; if (vis[k] === g) continue;
      vis[k] = g; dist[k] = 0; chi[k] = 2; coda[fine++] = k;
    }
    let testa = 0, mie = 0, insieme = false;
    while (testa < fine) {
      const k = coda[testa++], dk = dist[k];
      if (dk >= prof) continue;
      const cx = k % C, cy = (k - cx) / C, ck = chi[k];
      for (let d = 0; d < 4; d++) {
        const nx = cx + DX[d], ny = cy + DY[d];
        if (nx < 0 || ny < 0 || nx >= C || ny >= R) continue;
        const kk = ny * C + nx;
        if (G[kk]) continue;
        if (vis[kk] === g) {
          if (chi[kk] !== ck && ck !== 3) { insieme = true; if (dist[kk] === dk + 1 && chi[kk] !== 3) { if (chi[kk] === 1) mie--; chi[kk] = 3; } }
          continue;
        }
        vis[kk] = g; dist[kk] = dk + 1; chi[kk] = ck; coda[fine++] = kk;
        if (ck === 1) mie++;
      }
    }
    return { mie, insieme };
  }
  decidi(b, liv) {
    const scelte = [b.dir, (b.dir + 1) % 4, (b.dir + 3) % 4];
    const voti = [];
    // una sola strada libera: niente calcoli
    const libere = scelte.filter((d) => this.libera(b.x + DX[d], b.y + DY[d]));
    if (libere.length === 1 && liv !== 'facile') { b.dir = libere[0]; return; }
    let sep = false, prof = 24;
    if (liv === 'difficile') {
      // con pochi avversari si guarda lontano, con tanti solo vicino (il calcolo resta veloce)
      const vivi = this.m.reduce((n, o) => n + (o.vivo ? 1 : 0), 0); prof = vivi <= 2 ? 250 : vivi <= 4 ? 34 : 24;
      // chiuso da solo? (una volta chiuso lo resta; se non lo è si ricontrolla ogni 8 passi)
      if (!b.separato && !(b.provaSep > this.mezzo)) { b.separato = this.separato(b); b.provaSep = this.mezzo + 16; }
      sep = b.separato;
    }
    for (const d of scelte) {
      const nx = b.x + DX[d], ny = b.y + DY[d];
      if (!this.libera(nx, ny)) { voti.push(-1e9); continue; }
      const run = this.dritto(b.x, b.y, d, 12);
      let v;
      if (liv === 'facile') {
        v = Math.min(run, 6) * 10 + (d === b.dir ? 15 : 0) + Math.random() * 25;
        if (run < 2) v -= 40;
      } else if (liv === 'medio') {
        v = Math.min(400, this.area(nx, ny, 400)) + run * 2 + (d === b.dir ? 3 : 0) + Math.random() * 6;
        if (this.vicinoATeste(nx, ny, b)) v -= 150;
      } else {
        let a;
        if (!sep) {
          // nella stessa zona degli altri: conta i quadretti a cui arriva prima lui (Voronoi)
          const vr = this.voronoi(nx, ny, b, prof);
          a = this.area(nx, ny, 250); v = vr.mie * 4 + a * 0.6 + run * 0.5;
        } else {
          a = this.area(nx, ny, 700);
          // da solo nella sua zona: riempirla bene, stando attaccato ai muri (si spreca meno spazio)
          let muri = 0; for (let k = 0; k < 4; k++) if (!this.libera(nx + DX[k], ny + DY[k])) muri++;
          v = a * 10 + muri * 3 + (d === b.dir ? 1 : 0);
        }
        if (this.vicinoATeste(nx, ny, b)) v -= a > 30 ? 5000 : 50;
        v += Math.random() * 2;
      }
      voti.push(v);
    }
    let meglio = 0; for (let k = 1; k < 3; k++) if (voti[k] > voti[meglio]) meglio = k;
    // il facile ogni tanto è distratto e non gira in tempo
    if (liv === 'facile' && voti[0] > -1e9 && Math.random() < 0.05) meglio = 0;
    if (liv === 'facile' && voti[0] <= -1e9 && Math.random() < 0.07) meglio = 0;
    b.dir = scelte[meglio];
    // turbo: il difficile lo usa per tagliare la strada a chi è vicino, il medio quando ha tanta strada libera
    if (this.conTurbo && b.carica >= 1) {
      const run = this.dritto(b.x, b.y, b.dir, 20);
      if (liv === 'difficile' && run >= 14 && this.m.some((o) => o.vivo && o !== b && Math.abs(o.x - b.x) + Math.abs(o.y - b.y) < 18)) this.turbo(b);
      else if (liv === 'medio' && run >= 18 && Math.random() < 0.08) this.turbo(b);
      else if (liv === 'facile' && Math.random() < 0.01) this.turbo(b);
    }
  }
  // la classifica conta anche le moto del computer in più: se una di loro fa più punti, nessuna persona vince
  chiudi() {
    super.chiudi();
    if (!this.nExtra) return;
    const max = Math.max(...this.puntiTutti);
    const primi = this.puntiTutti.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
    this.risultato.vincitori = primi.length === 1 && primi[0] < this.n ? primi : [];
    this.risultato.pareggio = primi.length > 1;
    const pos = 1 + this.puntiTutti.filter((x) => x > this.puntiTutti[0]).length;
    if (this.n === 1) this.risultato.titolo = pos === 1 ? `Primo posto! ${this.punti[0]} punti` : `${pos}° posto su ${this.tot} · ${this.punti[0]} punti`;
  }
  pensa() { return {}; } // i computer decidono a ogni passo (vedi decidi)

  // ---------- quello che vede il browser ----------
  vistaExtra() {
    return { cols: this.cols, righe: this.righe, CELLA, nomi: this.m ? this.m.map((b) => b.nome) : [], tot: this.tot, turbo: this.conTurbo, vel: this.vel };
  }
  statoTick(posto) {
    const r2 = (v) => Math.round(v * 100) / 100;
    const tutto = this.rifai[posto];
    this.rifai[posto] = false;
    const t = this.tempoRound;
    const moto = [], angoli = [];
    for (const b of this.m) {
      // la testa disegnata: tra il quadretto di prima e quello di adesso, secondo il tempo passato dall'ultimo passo
      let hx = b.x, hy = b.y;
      if (b.vivo) {
        const f = Math.min(1, (this.mezzo - b.ultimo + this.acc) / b.periodo);
        hx = b.x - DX[b.dir] * (1 - f); hy = b.y - DY[b.dir] * (1 - f);
        // appena girato: la testa non deve tagliare l'angolo
        const ang = b.c[b.c.length - 1];
        if (ang && (Math.abs(hx - ang[0]) + Math.abs(hy - ang[1]) > Math.abs(b.x - ang[0]) + Math.abs(b.y - ang[1]))) { hx = b.x; hy = b.y; }
      }
      moto.push([r2(hx), r2(hy), b.vivo ? 1 : 0, b.c.length, b.turboFino >= t && b.vivo ? 1 : 0]);
      const da = tutto ? 0 : Math.max(0, b.c.length - 3);
      const a = [da]; for (let k = da; k < b.c.length; k++) a.push(b.c[k][0], b.c[k][1]);
      angoli.push(a);
    }
    const io = this.m[posto];
    return { m: moto, a: angoli, an: this.anello, car: io ? Math.round(io.carica * 100) : 0, vivi: this.m.filter((b) => b.vivo).length, st: Math.max(0, Math.ceil(this.prossimoAnello - t)) };
  }
}

module.exports = {
  meta: {
    id: 'tron',
    nome: 'Moto di luce',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Moto velocissime che lasciano una scia di luce: gira a 90°, chiudi la strada agli altri e non sbattere. L\'ultimo rimasto vince il round.',
    alias: ['tron', 'moto', 'light cycle', 'lightcycle', 'scia', 'moto di luce', 'snake a più giocatori'],
    opzioni: [
      { id: 'velocita', nome: 'Velocità', valori: ['normale', 'lenta', 'veloce'], etichette: ['Velocità normale', 'Lenta', 'Veloce'], predefinito: 'normale' },
      { id: 'arena', nome: 'Arena', valori: ['media', 'piccola', 'grande'], etichette: ['Arena media', 'Arena piccola', 'Arena grande'], predefinito: 'media' },
      { id: 'turbo', nome: 'Turbo', valori: ['si', 'no'], etichette: ['Con il turbo', 'Senza turbo'], predefinito: 'si' },
      { id: 'round', nome: 'Round', valori: [5, 3, 7], etichette: ['5 round', '3 round', '7 round'], predefinito: 5 },
      { id: 'extra', nome: 'Moto del computer in più', valori: ['auto', 0, 1, 2, 3, 4], etichette: ['3 se giochi da solo', 'Nessuna', '1 in più', '2 in più', '3 in più', '4 in più'], predefinito: 'auto' },
      { id: 'forza', nome: 'Forza delle moto in più', valori: ['medio', 'facile', 'difficile'], etichette: ['Medie', 'Facili', 'Difficili'], predefinito: 'medio' },
    ],
    regole: [
      'Ognuno guida una moto in un\'arena a quadretti vista dall\'alto. La moto va sempre avanti da sola e dietro di sé lascia una scia di luce che resta lì per tutto il round.',
      'Si gira solo ad angolo retto: frecce o WASD sul computer; sul telefono il joystick oppure strisciando il dito sul campo nella direzione voluta. Le svolte premute in fretta vengono fatte una dopo l\'altra, a ogni quadretto. Non si può tornare indietro.',
      'Chi sbatte contro il bordo o contro una scia qualsiasi (anche la propria, e anche quella di chi è già caduto) è fuori. Se due moto entrano nello stesso quadretto insieme cadono tutte e due.',
      'Turbo (se attivo): spazio, clic o il pulsante ⚡ raddoppia la velocità per un secondo; poi si ricarica in 5 secondi (la barra in alto).',
      'Dopo 75 secondi il bordo dell\'arena comincia a stringersi di un quadretto ogni due secondi e mezzo: chi resta sul bordo che si chiude cade.',
      'Punti: in ogni round prendi un punto per ogni moto caduta prima di te, e l\'ultimo rimasto ne prende 2 in più. Dopo 5 round (o 3, o 7) vince chi ha più punti.',
      'Si sceglie la velocità (lenta, normale, veloce), la grandezza dell\'arena e se usare il turbo. Se giochi da solo entrano 3 moto del computer (si può cambiare il numero e la forza).',
      'Il gioco è in tempo reale: si ferma per tutti quando qualcuno apre le dispense.',
      'Il computer facile guarda solo poco davanti a sé e ogni tanto si distrae; il medio sceglie la strada con più spazio libero ed evita gli scontri frontali; il difficile calcola tutto lo spazio che può raggiungere prima degli altri, taglia la strada usando il turbo e, quando resta chiuso da solo, riempie il suo spazio stando attaccato ai muri.',
    ],
  },
  crea: (o) => new MotoDiLuce(o),
  bot: () => ({}),
  _test: { MotoDiLuce, ARENE, VELOCITA, DX, DY, MURO, STRINGE_DOPO },
};
