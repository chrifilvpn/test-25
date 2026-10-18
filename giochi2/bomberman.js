// BOMBE E MATTONI: labirinto a griglia visto dall'alto, con muri fissi (i pilastri) e mattoni che si rompono.
// Da 2 a 4 giocatori (i posti vuoti li fa il computer) partono dagli angoli e piazzano bombe che dopo 2,5 secondi
// esplodono con fiamme a croce. I mattoni rotti a volte lasciano un potenziamento (bomba in più, fiamma più lunga,
// velocità, calcio della bomba). Chi tocca una fiamma è fuori; l'ultimo rimasto vince il round. Dopo un minuto dai
// bordi cadono blocchi di pietra (a spirale) e la mappa si restringe, così il round finisce sempre.
// A SQUADRE (in 4): due contro due, i compagni partono dagli angoli dello stesso lato (sopra contro sotto). Le fiamme
// del compagno non fanno male (le proprie sì); il round lo vince la squadra che ha ancora qualcuno in piedi.
const { Arena } = require('../giochi/arena');

const C = 15, R = 13, T = 48; // caselle da 48 px
const MICCIA = 2.5, FIAMMA = 0.55, V_BASE = 3.3, V_PIU = 0.55, MAX_V = 4, MAX_BOMBE = 8, MAX_FIAMMA = 8;
const V_CALCIO = 9, PROB_POTERE = 0.32, RESTRINGE = 60, OGNI_BLOCCO = 0.32, CADUTA = 0.45;
const PARTENZE = [[1, 1], [C - 2, R - 2], [C - 2, 1], [1, R - 2]];
const POTERI = ['b', 'f', 'v', 'k']; // bomba in più, fiamma, velocità, calcio
const PESI_POTERI = { b: 3, f: 3, v: 2, k: 1 };
const DIR = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const idx = (c, r) => r * C + c;

// ordine in cui cadono i blocchi: a spirale dal bordo verso il centro
const SPIRALE = (() => {
  const out = [];
  for (let k = 1; k <= Math.floor(Math.min(C, R) / 2); k++) {
    const c0 = k, c1 = C - 1 - k, r0 = k, r1 = R - 1 - k;
    if (c0 > c1 || r0 > r1) break;
    for (let c = c0; c <= c1; c++) out.push(idx(c, r0));
    for (let r = r0 + 1; r <= r1; r++) out.push(idx(c1, r));
    if (r1 > r0) for (let c = c1 - 1; c >= c0; c--) out.push(idx(c, r1));
    if (c1 > c0) for (let r = r1 - 1; r > r0; r--) out.push(idx(c0, r));
  }
  return [...new Set(out)];
})();
const RESTINGE_PRIMA = 54; // da quando il computer comincia a pensare ai blocchi che cadranno
const RANGO = (() => { const r = new Array(C * R).fill(999); SPIRALE.forEach((i, k) => { r[i] = k; }); return r; })();
const pilastro = (c, r) => c === 0 || r === 0 || c === C - 1 || r === R - 1 || (c % 2 === 0 && r % 2 === 0);

class Bombe extends Arena {
  constructor(o) {
    super(o, { id: 'bomberman', round: 3 });
    this.nRound = [3, 5].includes(Number(o.opzioni && o.opzioni.round)) ? Number(o.opzioni.round) : 3;
    const m = o.opzioni && o.opzioni.mattoni;
    this.densita = { pochi: 0.5, normali: 0.72, tanti: 0.88 }[m] || 0.72;
    this.aSquadre = this.n === 4 && o.opzioni && o.opzioni.squadre === 'si';
    this.W = C * T; this.H = R * T;
    this.vittorieRound = new Array(this.n).fill(0);
    this.pausaRoundMs = 3500;
    this.avvia();
  }

  iniziaRound() {
    // la griglia: '#' muro, 'm' mattone, '.' libero. Gli angoli di partenza (e le due caselle vicine) restano liberi
    const liberi = new Set();
    for (const [c, r] of PARTENZE) for (const [dc, dr] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) liberi.add(idx(c + dc, r + dr));
    this.g = [];
    this.nascosti = new Map(); // potenziamenti sotto i mattoni (il browser non li vede)
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (pilastro(c, r)) { this.g.push('#'); continue; }
      if (liberi.has(idx(c, r)) || Math.random() > this.densita) { this.g.push('.'); continue; }
      this.g.push('m');
      if (Math.random() < PROB_POTERE) this.nascosti.set(idx(c, r), this.potereACaso());
    }
    this.poteri = new Map(); // casella -> tipo (visibili)
    this.bombe = []; this.nB = 0;
    this.fiamme = new Map(); // casella -> { fino, o (0 centro, 1 orizzontale, 2 verticale), da }
    this.rotti = []; // mattoni che si sbriciolano (solo per il disegno)
    this.cadute = []; // blocchi che stanno cadendo { i, t }
    this.prossimoBlocco = 0; this.kSpirale = 0;
    this.morti = [];
    this.e = Array.from({ length: this.n }, (_, i) => {
      const [c, r] = PARTENZE[i];
      return { id: i, x: c, y: r, vivo: true, dir: 2, mov: 0, bombe: 1, fiamma: 2, vel: 0, calcio: false, morto: 0 };
    });
    this.mente = {};
    this.cambiato = true;
  }
  potereACaso() {
    let r = Math.random() * Object.values(PESI_POTERI).reduce((a, b) => a + b, 0);
    for (const t of POTERI) { r -= PESI_POTERI[t]; if (r <= 0) return t; }
    return 'b';
  }
  spostaTempi() {}
  // squadra di un posto: a squadre 0 = sopra (angoli 0 e 2), 1 = sotto (angoli 1 e 3); senza squadre ognuno la sua
  squadra(p) { return this.aSquadre ? p % 2 : p; }
  // le squadre (o i giocatori) che hanno ancora qualcuno in piedi
  squadreVive() { return [...new Set(this.e.filter((e) => e.vivo).map((e) => this.squadra(e.id)))]; }

  // ---------- movimento sulla griglia ----------
  bombaIn(i) { return this.bombe.find((b) => idx(Math.round(b.x), Math.round(b.y)) === i); }
  // la casella è chiusa per chi sta in (x, y)? La bomba non blocca chi ci sta ancora sopra (appena piazzata)
  chiusa(c, r, x, y) {
    if (c < 0 || r < 0 || c >= C || r >= R) return true;
    const ch = this.g[idx(c, r)];
    if (ch !== '.') return true;
    const b = this.bombaIn(idx(c, r));
    if (b && !(Math.abs(b.x - x) < 0.99 && Math.abs(b.y - y) < 0.99)) return b;
    return false;
  }
  // prova a muoversi lungo un asse (ax 'x' o 'y', verso s); restituisce quanta strada ha fatto
  prova(e, ax, s, dist, p) {
    const al = ax === 'x' ? 'y' : 'x';
    const corsia = Math.round(e[al]);
    if (Math.abs(e[al] - corsia) < 0.01) e[al] = corsia; // quasi allineato: si allinea del tutto
    const off = e[al] - corsia;
    const cur = Math.round(e[ax]);
    const cc = ax === 'x' ? cur + s : corsia, rr = ax === 'x' ? corsia : cur + s;
    const blocco = this.chiusa(cc, rr, e.x, e.y);
    let fatto = 0;
    if (blocco) {
      // calcio: la bomba davanti parte scivolando
      if (blocco !== true && p !== undefined && !this.bot[p] && this.e[p].calcio && Math.abs(off) < 0.25 && Math.abs(e[ax] - cur) < 0.12 && !blocco.mov) {
        const dx = ax === 'x' ? s : 0, dy = ax === 'y' ? s : 0;
        if (!this.chiusaPerBomba(Math.round(blocco.x) + dx, Math.round(blocco.y) + dy)) { blocco.mov = [dx, dy]; blocco.calciata = p; this.cambiato = true; }
      }
      // si arriva al massimo al centro della propria casella
      const manca = (cur - e[ax]) * s;
      if (manca <= 1e-6) return 0;
      if (Math.abs(off) > 1e-6) return 0;
      const f = Math.min(dist, manca); e[ax] += f * s; return f;
    }
    // prima ci si allinea alla corsia (aiuto negli angoli), poi si va avanti
    if (Math.abs(off) > 1e-6) { const f = Math.min(dist, Math.abs(off)); e[al] -= Math.sign(off) * f; fatto += f; dist -= f; }
    if (dist > 0) { e[ax] += dist * s; fatto += dist; }
    return fatto;
  }
  muovi(e, ix, iy, dist, p) {
    if (Math.abs(ix) < 0.2 && Math.abs(iy) < 0.2) { e.mov = 0; return; }
    const prima = Math.abs(ix) >= Math.abs(iy) ? ['x', Math.sign(ix)] : ['y', Math.sign(iy)];
    const seconda = prima[0] === 'x' ? (Math.abs(iy) > 0.2 ? ['y', Math.sign(iy)] : null) : (Math.abs(ix) > 0.2 ? ['x', Math.sign(ix)] : null);
    let f = this.prova(e, prima[0], prima[1], dist, p);
    let usato = prima;
    if (f < 1e-6 && seconda) { f = this.prova(e, seconda[0], seconda[1], dist, p); usato = seconda; }
    e.mov = f > 1e-6 ? 1 : 0;
    e.dir = usato[0] === 'x' ? (usato[1] > 0 ? 0 : 1) : (usato[1] > 0 ? 2 : 3);
  }
  chiusaPerBomba(c, r) {
    if (c < 0 || r < 0 || c >= C || r >= R || this.g[idx(c, r)] !== '.') return true;
    if (this.bombaIn(idx(c, r)) || this.poteri.has(idx(c, r))) return true;
    return this.e.some((e) => e.vivo && Math.round(e.x) === c && Math.round(e.y) === r);
  }
  velocita(e) { return V_BASE + e.vel * V_PIU; }

  // ---------- bombe e fiamme ----------
  piazza(p, dove = null) {
    const e = this.e[p];
    const [c, r] = dove || [Math.round(e.x), Math.round(e.y)], i = idx(c, r);
    if (this.g[i] !== '.' || this.bombaIn(i) || this.bombe.filter((b) => b.p === p).length >= e.bombe) return false;
    this.bombe.push({ id: ++this.nB, x: c, y: r, t: MICCIA, f: e.fiamma, p, mov: null });
    this.poteri.delete(i);
    return true;
  }
  esplodi(b) {
    this.bombe = this.bombe.filter((x) => x !== b);
    const c = Math.round(b.x), r = Math.round(b.y);
    const fino = this.tempoRound + FIAMMA;
    const brucia = (i, o) => { const v = this.fiamme.get(i); this.fiamme.set(i, { fino, o: v && v.o !== o ? 0 : o, da: b.p }); };
    brucia(idx(c, r), 0);
    const catena = [];
    for (const [dc, dr] of DIR) {
      for (let k = 1; k <= b.f; k++) {
        const cc = c + dc * k, rr = r + dr * k, i = idx(cc, rr);
        if (cc < 0 || rr < 0 || cc >= C || rr >= R) break;
        const ch = this.g[i];
        if (ch === '#') break;
        const o = dc ? 1 : 2;
        if (ch === 'm') { this.g[i] = '.'; this.rotti.push({ i, t: this.tempoRound }); brucia(i, o); const pw = this.nascosti.get(i); if (pw) { this.poteri.set(i, pw); this.nascosti.delete(i); this.appena = this.appena || new Set(); this.appena.add(i); } break; }
        const altra = this.bombaIn(i);
        if (altra) { catena.push(altra); brucia(i, o); break; }
        if (this.poteri.has(i) && !(this.appena && this.appena.has(i))) { this.poteri.delete(i); brucia(i, o); break; }
        brucia(i, o);
      }
    }
    this.cambiato = true;
    for (const x of catena) if (this.bombe.includes(x)) this.esplodi(x);
  }
  elimina(p, da) {
    const e = this.e[p];
    if (!e.vivo) return;
    e.vivo = false; e.morto = this.tempoRound; this.morti.push(p); this.cambiato = true;
    if (da !== undefined && da !== null && da !== p) { this.punti[da] += 1; this.annuncia(da, 'fa saltare in aria @! 💥', 'hai fatto saltare in aria @! 💥', false, { bersaglio: p, testoTe: 'ti ha fatto saltare in aria 💥' }); }
    else if (da === p) this.annuncia(p, 'è saltato sulla sua bomba! 💣', 'sei saltato sulla tua bomba! 💣');
    else this.annuncia(p, 'è stato schiacciato da un blocco! 🧱', 'ti è caduto addosso un blocco! 🧱');
  }

  passo(dt) {
    const t = this.tempoRound;
    this.appena = null;
    // giocatori
    for (let p = 0; p < this.n; p++) {
      const e = this.e[p];
      if (!e.vivo) { this.nuoviTocchi(p); continue; }
      const v = this.velocita(e);
      // chi gioca dal browser manda la posizione che ha già previsto (in pixel): il server la insegue con le sue regole
      const segue = !this.bot[p] && this.inp[p].px !== null && this.inp[p].px !== undefined;
      // la bomba va dove si è premuto: nella casella vista dal browser, se il server ci è già sopra almeno in parte
      if (this.nuoviTocchi(p) > 0) {
        let dove = null;
        if (segue) { const c = Math.round(this.inp[p].px / T), r = Math.round(this.inp[p].py / T); if (Math.abs(c - e.x) < 0.99 && Math.abs(r - e.y) < 0.99) dove = [c, r]; }
        this.piazza(p, dove);
      }
      const d = this.verso(p, { x: e.x * T, y: e.y * T }, v * T, dt);
      const k = Math.hypot(d.x, d.y);
      this.muovi(e, d.x, d.y, v * dt * (segue ? Math.min(1.25, k) : 1), p);
      // potenziamenti
      const i = idx(Math.round(e.x), Math.round(e.y));
      const pw = this.poteri.get(i);
      if (pw) {
        this.poteri.delete(i); this.cambiato = true;
        if (pw === 'b') e.bombe = Math.min(MAX_BOMBE, e.bombe + 1);
        if (pw === 'f') e.fiamma = Math.min(MAX_FIAMMA, e.fiamma + 1);
        if (pw === 'v') e.vel = Math.min(MAX_V, e.vel + 1);
        if (pw === 'k') e.calcio = true;
        e.preso = { tipo: pw, t };
      }
    }
    // bombe calciate che scivolano
    for (const b of this.bombe) {
      if (!b.mov) continue;
      const [dx, dy] = b.mov;
      let resto = V_CALCIO * dt;
      while (resto > 1e-6 && b.mov) {
        const c = Math.round(b.x), r = Math.round(b.y), dentro = (dx ? b.x - c : b.y - r) * (dx || dy);
        if (dentro >= -1e-6 && this.chiusaPerBomba(c + dx, r + dy)) { b.x = c; b.y = r; b.mov = null; break; }
        const verso = dentro < 0 ? -dentro : 1 - dentro;
        const f = Math.min(resto, verso);
        b.x += dx * f; b.y += dy * f; resto -= f;
        if (Math.abs(f - verso) < 1e-9) { b.x = Math.round(b.x * 1e6) / 1e6; b.y = Math.round(b.y * 1e6) / 1e6; }
      }
    }
    // miccia
    for (const b of this.bombe.slice()) { b.t -= dt; if (b.t <= 0 && this.bombe.includes(b)) this.esplodi(b); }
    // le bombe toccate da una fiamma esplodono subito
    for (const b of this.bombe.slice()) if (this.fiamme.has(idx(Math.round(b.x), Math.round(b.y))) && this.bombe.includes(b)) this.esplodi(b);
    for (const [i, f] of this.fiamme) if (f.fino <= t) this.fiamme.delete(i);
    this.rotti = this.rotti.filter((x) => t - x.t < 0.5);
    // chi tocca una fiamma è fuori
    for (let p = 0; p < this.n; p++) {
      const e = this.e[p];
      if (!e.vivo) continue;
      const f = this.fiamme.get(idx(Math.round(e.x), Math.round(e.y)));
      // le fiamme di un compagno non fanno male
      if (f && !(f.da != null && f.da !== p && this.squadra(f.da) === this.squadra(p))) this.elimina(p, f.da);
    }
    // la mappa si restringe: blocchi che cadono a spirale dal bordo
    if (t >= RESTRINGE && this.squadreVive().length > 1) {
      if (!this.avvisoRestringe) { this.avvisoRestringe = true; this.annuncia(null, 'cadono i blocchi: la mappa si restringe! 🧱', 'cadono i blocchi: la mappa si restringe! 🧱', true); }
      this.prossimoBlocco -= dt;
      while (this.prossimoBlocco <= 0 && this.kSpirale < SPIRALE.length) {
        const i = SPIRALE[this.kSpirale++];
        if (this.g[i] === '#') continue;
        this.cadute.push({ i, t: 0 });
        this.prossimoBlocco += OGNI_BLOCCO;
      }
    }
    // quando ne resta uno solo i blocchi smettono di cadere (anche quelli già in aria): ha vinto lui
    if (this.squadreVive().length <= 1) this.cadute = this.cadute.filter((k) => k.fatto);
    for (const k of this.cadute) {
      k.t += dt;
      if (k.t < CADUTA || k.fatto) continue;
      k.fatto = true; this.g[k.i] = '#'; this.poteri.delete(k.i); this.nascosti.delete(k.i); this.fiamme.delete(k.i);
      this.bombe = this.bombe.filter((b) => idx(Math.round(b.x), Math.round(b.y)) !== k.i);
      this.cambiato = true;
      for (let p = 0; p < this.n; p++) { const e = this.e[p]; if (e.vivo && idx(Math.round(e.x), Math.round(e.y)) === k.i) this.elimina(p, null); }
    }
    this.cadute = this.cadute.filter((k) => !k.fatto || k.t < CADUTA + 0.3);
    const vivi = this.squadreVive().length;
    if (vivi <= 1) { this.fineDopo = this.fineDopo ?? t + 0.7; } // un attimo per vedere l'ultima esplosione
    return this.fineDopo !== undefined && this.fineDopo !== null && t >= this.fineDopo;
  }
  nuovoRound(ora) { this.fineDopo = null; this.avvisoRestringe = false; super.nuovoRound(ora); }
  fineRound() {
    const vivi = this.e.filter((e) => e.vivo).map((e) => e.id);
    if (this.aSquadre) {
      const sq = this.squadreVive();
      if (sq.length === 1) {
        const membri = [0, 1, 2, 3].filter((q) => this.squadra(q) === sq[0]);
        for (const q of membri) { this.punti[q] += 3; this.vittorieRound[q]++; }
        this.annuncia(membri[0], `e il compagno vincono il round! 🏆 (+3)`, 'la tua squadra vince il round! 🏆 (+3)', true);
      } else this.annuncia(null, 'nessun sopravvissuto: round pari 💥', 'nessun sopravvissuto: round pari 💥', true);
      return;
    }
    if (vivi.length === 1) {
      const v = vivi[0];
      this.punti[v] += 3; this.vittorieRound[v]++;
      this.annuncia(v, `vince il round! 🏆 (+3)`, 'hai vinto il round! 🏆 (+3)', true);
    } else this.annuncia(null, 'nessun sopravvissuto: round pari 💥', 'nessun sopravvissuto: round pari 💥', true);
  }

  // ---------- il computer ----------
  // tempo (in secondi da adesso) in cui ogni casella prenderà fuoco; Infinity = sicura. Tiene conto delle catene
  // di bombe (una fiamma che arriva su un'altra bomba la fa esplodere prima) e dei blocchi che stanno per cadere.
  pericoli(extra = null, catene = true) {
    const pe = new Array(C * R).fill(Infinity);
    const bombe = this.bombe.map((b) => ({ c: Math.round(b.x), r: Math.round(b.y), t: Math.max(0, b.t), f: b.f }));
    if (extra) bombe.push(extra);
    const raggio = (b) => {
      const out = [idx(b.c, b.r)];
      for (const [dc, dr] of DIR) for (let k = 1; k <= b.f; k++) {
        const cc = b.c + dc * k, rr = b.r + dr * k; if (cc < 0 || rr < 0 || cc >= C || rr >= R) break;
        const ch = this.g[idx(cc, rr)]; if (ch === '#') break; out.push(idx(cc, rr)); if (ch === 'm') break;
      }
      return out;
    };
    const celle = bombe.map(raggio);
    if (catene) {
      for (let giro = 0; giro < 4; giro++) {
        let cambia = false;
        bombe.forEach((b, k) => { for (const i of celle[k]) bombe.forEach((b2) => { if (b2 !== b && idx(b2.c, b2.r) === i && b2.t > b.t) { b2.t = b.t; cambia = true; } }); });
        if (!cambia) break;
      }
    }
    bombe.forEach((b, k) => { for (const i of celle[k]) pe[i] = Math.min(pe[i], b.t); });
    pe.fuoco = new Float32Array(C * R); // per quanto brucia ancora una casella già in fiamme
    for (const [i, f] of this.fiamme) pe.fuoco[i] = f.fino - this.tempoRound;
    for (const k of this.cadute) if (!k.fatto) pe[k.i] = Math.min(pe[k.i], Math.max(0, CADUTA - k.t));
    // i prossimi blocchi della spirale (entro 1,5 s)
    if (this.tempoRound >= RESTRINGE - 2.5) {
      let tempo = Math.max(0, RESTRINGE - this.tempoRound) + this.prossimoBlocco + CADUTA;
      for (let k = this.kSpirale; k < SPIRALE.length && tempo < 3.5; k++) { if (this.g[SPIRALE[k]] === '#') continue; pe[SPIRALE[k]] = Math.min(pe[SPIRALE[k]], tempo); tempo += OGNI_BLOCCO; }
    }
    return pe;
  }
  // visita in ampiezza dalla casella del computer: per ogni casella raggiungibile, la distanza (in caselle) e da
  // dove si arriva. Si entra in una casella solo se non brucia mentre ci si passa (stretta: con un po' di margine).
  // I tempi tengono conto di dove si è davvero dentro la casella di partenza (anche a metà strada).
  visita(p, pe, prudenza = 0.25, da0 = null, stretta = true) {
    const e = this.e[p], v = this.velocita(e);
    const s = da0 !== null ? da0 : idx(Math.round(e.x), Math.round(e.y));
    const ox = da0 !== null ? 0 : e.x - (s % C), oy = da0 !== null ? 0 : e.y - Math.floor(s / C);
    const d = new Int16Array(C * R).fill(-1), da = new Int16Array(C * R).fill(-1), base = new Float32Array(C * R);
    d[s] = 0; const q = [s];
    for (let n = 0; n < q.length; n++) {
      const i = q[n], c = i % C, r = Math.floor(i / C);
      for (const [dc, dr] of DIR) {
        const j = idx(c + dc, r + dr);
        if (d[j] >= 0 || this.g[j] !== '.' || this.bombaIn(j)) continue;
        const k = d[i] + 1;
        // il primo passo: quanto manca davvero al bordo della casella (e quanto serve per allinearsi alla corsia)
        const b = i === s ? (-(ox * dc + oy * dr) + Math.abs(dc ? oy : ox)) / v : base[i];
        const entra = Math.max(0, (k - 0.5) / v + b), esce = (k + 0.5) / v + b;
        if (!this.passabile(pe, j, entra, esce, stretta ? prudenza : 0.05, stretta ? 0.1 : 0.03)) continue;
        d[j] = k; da[j] = i; base[j] = b; q.push(j);
      }
    }
    return { d, da, s, ordine: q };
  }
  // si può stare nella casella j tra gli istanti entra ed esce (secondi da adesso)?
  passabile(pe, j, entra, esce, prima, dopo) {
    if (pe.fuoco[j] > 0 && pe.fuoco[j] + dopo > entra) return false; // ancora in fiamme quando ci entro
    const x = pe[j];
    return !(x !== Infinity && x < esce + prima && x + FIAMMA + dopo > entra); // brucia mentre ci passo
  }
  // la strada dalla partenza della visita fino alla meta (caselle in ordine)
  cammino(vis, meta) {
    if (meta === null || meta === undefined || vis.d[meta] < 0) return null;
    const out = [];
    for (let i = meta; i >= 0; i = vis.da[i]) { out.push(i); if (i === vis.s) break; }
    return out.reverse();
  }
  // la strada scelta è ancora buona da qui (posizione k)? Caselle libere e niente fiamme mentre ci si passa
  stradaBuona(p, pe, piano, k) {
    const e = this.e[p], v = this.velocita(e), s = piano[k];
    const ox = e.x - (s % C), oy = e.y - Math.floor(s / C);
    let b = 0;
    for (let n = k + 1; n < piano.length; n++) {
      const j = piano[n];
      if (this.g[j] !== '.' || this.bombaIn(j)) return false;
      if (n === k + 1) { const dc = (j % C) - (s % C), dr = Math.floor(j / C) - Math.floor(s / C); b = (-(ox * dc + oy * dr) + Math.abs(dc ? oy : ox)) / v; }
      const passi = n - k, entra = Math.max(0, (passi - 0.5) / v + b), esce = (passi + 0.5) / v + b;
      if (!this.passabile(pe, j, entra, n === piano.length - 1 ? Infinity : esce, 0.05, 0.03)) return false;
    }
    return true;
  }
  inLinea(c, r, f, c2, r2) {
    if (c !== c2 && r !== r2) return false;
    const k = Math.abs(c - c2) + Math.abs(r - r2);
    if (k > f) return false;
    const dc = Math.sign(c2 - c), dr = Math.sign(r2 - r);
    for (let s = 1; s < k; s++) if (this.g[idx(c + dc * s, r + dr * s)] !== '.') return false;
    return true;
  }
  pensa(p, liv) {
    const e = this.e[p];
    if (!e.vivo) return {};
    const L = {
      facile: { ogni: 0.32, catene: false, prudenza: 0.1, caccia: 0, attacca: 0.15, distratto: 0.15 },
      medio: { ogni: 0.22, catene: false, prudenza: 0.2, caccia: 0.3, attacca: 0.5, distratto: 0.03 },
      difficile: { ogni: 0.1, catene: true, prudenza: 0.2, caccia: 1, attacca: 1, distratto: 0 },
    }[liv] || { ogni: 0.18, catene: true, prudenza: 0.2, caccia: 0.35, attacca: 0.6, distratto: 0.03 };
    // quando la mappa si restringe tutti diventano più aggressivi (sennò finirebbero schiacciati insieme)
    if (this.tempoRound > RESTRINGE && liv !== 'facile') { L.caccia = liv === 'difficile' ? 1 : 0.7; L.attacca = 1; }
    const m = this.mente[p] || (this.mente[p] = { fino: -1, meta: null, x: 0, y: 0, attesa: 0 });
    const c = Math.round(e.x), r = Math.round(e.y), qui = idx(c, r);
    const pe = this.pericoli(null, L.catene);
    const inPericolo = pe[qui] !== Infinity;
    // (il facile si accorge del pericolo con un po' di ritardo)
    if (!inPericolo) m.allarme = null; else if (m.allarme === null || m.allarme === undefined) m.allarme = this.tempoRound;
    const reagisce = inPericolo && (liv !== 'facile' || this.tempoRound - m.allarme > 0.25);
    if (this.tempoRound >= m.fino || (reagisce && (m.meta === null || pe[m.meta] !== Infinity))) {
      m.fino = this.tempoRound + L.ogni * (0.7 + Math.random() * 0.6);
      this.decidi(p, liv, L, m, pe);
    }
    // si va verso la casella scelta seguendo la strada decisa, un passo alla volta. Se la strada non è più buona
    // (una bomba nuova, un mattone) si decide di nuovo
    let tocco = false;
    if (m.bomba) { tocco = true; m.bomba = false; }
    if (!m.piano) return { x: 0, y: 0, tocco };
    let k = m.piano.indexOf(qui);
    if (k < 0 || (!tocco && !this.stradaBuona(p, pe, m.piano, k))) {
      this.decidi(p, liv, L, m, pe);
      if (m.bomba) { tocco = true; m.bomba = false; }
      k = m.piano ? m.piano.indexOf(qui) : -1;
      if (k < 0) return { x: 0, y: 0, tocco };
    }
    if (k === m.piano.length - 1) return { x: 0, y: 0, tocco };
    const prossimo = m.piano[k + 1];
    // non entrare in una casella che sta per bruciare (se si è al sicuro)
    if (!inPericolo && !tocco && pe[prossimo] !== Infinity && pe[prossimo] < 1.2) return { x: 0, y: 0, tocco };
    // un passo verso la casella vicina: all'allineamento con la corsia ci pensa il movimento (aiuto negli angoli)
    const pc = prossimo % C, pr = Math.floor(prossimo / C);
    let x = pc !== c ? Math.sign(pc - c) : 0, y = pr !== r ? Math.sign(pr - r) : 0;
    if (L.distratto && !inPericolo && Math.random() < L.distratto * 0.1) { x = Math.sign(Math.random() - 0.5); y = 0; }
    return { x, y, tocco };
  }
  decidi(p, liv, L, m, pe) {
    const e = this.e[p], c = Math.round(e.x), r = Math.round(e.y), qui = idx(c, r);
    const vis = this.visita(p, pe, L.prudenza);
    m.vis = vis;
    // 1) in pericolo: alla casella sicura più vicina
    if (pe[qui] !== Infinity) {
      // meglio una casella dove non c'è già un avversario (sotto un blocco che cade si finisce schiacciati in due)
      const occupate = new Set(this.e.filter((x) => x.vivo && x.id !== p).map((x) => idx(Math.round(x.x), Math.round(x.y))));
      let sicura = vis.ordine.find((i) => pe[i] === Infinity && !occupate.has(i));
      if (sicura === undefined) sicura = vis.ordine.find((i) => pe[i] === Infinity);
      // nessuna strada sicura con i calcoli prudenti: si prova con i tempi giusti, senza margini
      if (sicura === undefined && liv !== 'facile') {
        const v2 = this.visita(p, pe, 0, null, false);
        sicura = v2.ordine.find((i) => pe[i] === Infinity);
        if (sicura !== undefined) m.vis = v2;
      }
      // nessuna casella sicura (per esempio alla fine, quando cade tutto): quella che brucia o crolla più tardi
      if (sicura === undefined) {
        let tardi = -1;
        for (const i of m.vis.ordine) { const x = pe[i] + (occupate.has(i) ? -0.5 : 0); if (x > tardi + 0.05) { tardi = x; sicura = i; } }
      }
      m.meta = sicura !== undefined ? sicura : null;
      m.piano = this.cammino(m.vis, m.meta);
      return;
    }
    // 2) piazzare una bomba? Solo se poi c'è una via di fuga
    const mie = this.bombe.filter((b) => b.p === p).length;
    const nemici = this.e.filter((x) => x.vivo && x.id !== p && this.squadra(x.id) !== this.squadra(p));
    let voglia = 0;
    if (mie < e.bombe && !this.bombaIn(qui)) {
      for (const [dc, dr] of DIR) for (let k = 1; k <= e.fiamma; k++) {
        const ch = this.g[idx(c + dc * k, r + dr * k)]; if (ch === '#') break; if (ch === 'm') { voglia += 1; break; }
      }
      if (Math.random() < L.attacca) for (const n of nemici) if (this.inLinea(c, r, e.fiamma, Math.round(n.x), Math.round(n.y))) voglia += liv === 'difficile' ? 3 : 2;
      // il difficile chiude gli avversari: bomba se a quell'avversario non resterebbe una via di fuga
      if (liv === 'difficile') for (const n of nemici) {
        const nc = Math.round(n.x), nr = Math.round(n.y);
        if (Math.abs(nc - c) + Math.abs(nr - r) > e.fiamma + 2) continue;
        const pe2 = this.pericoli({ c, r, t: MICCIA, f: e.fiamma }, true);
        if (pe2[idx(nc, nr)] === Infinity) continue;
        const vis2 = this.visita(n.id, pe2, 0.15), salve = vis2.ordine.filter((j) => pe2[j] === Infinity).length;
        if (!salve) voglia += 5; else if (salve <= 2) voglia += 1.5;
      }
    }
    if (voglia > 0) {
      const pe2 = this.pericoli({ c, r, t: MICCIA, f: e.fiamma }, L.catene);
      const salvo = this.visita(p, pe2, L.prudenza);
      const fuga = salvo.ordine.find((i) => pe2[i] === Infinity && salvo.d[i] / this.velocita(e) < MICCIA - 0.5);
      if (fuga !== undefined) {
        m.bomba = true;
        m.vis = salvo; m.meta = fuga; m.piano = this.cammino(salvo, fuga);
        return;
      }
    }
    // 3) dove andare: potenziamenti, mattoni da rompere, avversari da inseguire
    const voti = [];
    for (const i of vis.ordine) {
      if (pe[i] !== Infinity) continue;
      const d = vis.d[i], ic = i % C, ir = Math.floor(i / C);
      let v = 0;
      const potere = this.poteri.has(i);
      if (potere) v += liv === 'facile' ? 6 : 14;
      let mattoni = 0;
      for (const [dc, dr] of DIR) for (let k = 1; k <= e.fiamma; k++) { const ch = this.g[idx(ic + dc * k, ir + dr * k)]; if (ch === '#') break; if (ch === 'm') { mattoni++; break; } }
      v += mattoni * 3;
      if (L.caccia) for (const n of nemici) {
        const dn = Math.abs(Math.round(n.x) - ic) + Math.abs(Math.round(n.y) - ir);
        if (dn === 0 && this.tempoRound > RESTRINGE) v -= 9; // nell'ultima casella libera in due si finisce schiacciati insieme
        else if (dn <= 1) v += 7 * L.caccia;
        else if (dn <= e.fiamma && this.inLinea(ic, ir, e.fiamma, Math.round(n.x), Math.round(n.y))) v += 5 * L.caccia;
        else v += Math.max(0, 6 - dn) * 0.5 * L.caccia;
      }
      if (i === qui && !mattoni && !potere) v -= 2;
      // il difficile evita di mettersi in linea con chi può piazzargli una bomba addosso, e preferisce gli incroci
      if (liv === 'difficile') {
        for (const n of nemici) if (this.bombe.filter((b) => b.p === n.id).length < n.bombe && this.inLinea(ic, ir, n.fiamma + 1, Math.round(n.x), Math.round(n.y))) v -= 3;
        let uscite = 0; for (const [dc, dr] of DIR) if (this.g[idx(ic + dc, ir + dr)] === '.') uscite++;
        v += uscite * 0.6;
      }
      // quando la mappa si restringe meglio stare verso il centro (i blocchi cadono a spirale dal bordo)
      if (this.tempoRound > RESTINGE_PRIMA) { const resta = RANGO[i] - this.kSpirale; v -= Math.max(0, 30 - resta) * (liv === 'facile' ? 0.3 : 1); }
      v -= d * (liv === 'facile' ? 0.6 : 0.9);
      v += Math.random() * (liv === 'facile' ? 4 : 1);
      if (i === m.meta) v += 2.5; // non cambiare idea a ogni momento
      voti.push([v, i, mattoni > 0 && !potere]);
    }
    voti.sort((a, b) => b[0] - a[0]);
    // per rompere i mattoni bisogna poter scappare dopo aver piazzato la bomba: le caselle senza via di fuga si
    // scartano
    m.meta = null;
    let prove = 0;
    for (const [, i, bomba] of voti) {
      if (bomba && prove++ < 8) {
        const pe2 = this.pericoli({ c: i % C, r: Math.floor(i / C), t: MICCIA, f: e.fiamma }, L.catene);
        const da = this.visita(p, pe2, L.prudenza, i);
        if (!da.ordine.some((j) => pe2[j] === Infinity && da.d[j] / this.velocita(e) < MICCIA - 0.5)) continue;
      }
      m.meta = i; break;
    }
    if (m.meta === null && voti.length) m.meta = voti[Math.floor(Math.random() * voti.length)][1];
    m.piano = this.cammino(vis, m.meta);
  }

  vistaExtra() { return { C, R, T, aSquadre: !!this.aSquadre }; }
  chiudi() {
    if (!this.aSquadre) return super.chiudi();
    this.finita = true; this.fase = 'fine';
    const fazioni = [0, 1].map((t) => { const posti = [0, 1, 2, 3].filter((q) => this.squadra(q) === t); return { posti, punti: posti.reduce((s, q) => s + Math.round(this.punti[q]), 0) }; });
    const pari = fazioni[0].punti === fazioni[1].punti;
    this.risultato = { fazioni, etichetta: 'punti', pareggio: pari, vincitori: pari ? [] : fazioni[fazioni[0].punti > fazioni[1].punti ? 0 : 1].posti };
  }
  statoTick(posto) {
    const r2 = (v) => Math.round(v * 100) / 100;
    const io = this.e[posto];
    return {
      g: this.g.join(''),
      e: this.e.map((e) => ({ id: e.id, x: r2(e.x), y: r2(e.y), v: e.vivo ? 1 : 0, d: e.dir, m: e.mov })),
      b: this.bombe.map((b) => [b.id, r2(b.x), r2(b.y), Math.round(b.t * 10) / 10]),
      f: [...this.fiamme].map(([i, f]) => [i, f.o, Math.round((f.fino - this.tempoRound) * 100) / 100]),
      w: [...this.poteri].map(([i, t]) => [i, t]),
      k: this.cadute.map((k) => [k.i, Math.round(k.t * 100) / 100]),
      ro: this.rotti.map((x) => [x.i, Math.round((this.tempoRound - x.t) * 100) / 100]),
      io: io ? [io.bombe, io.fiamma, io.vel, io.calcio ? 1 : 0, io.preso ? io.preso.tipo : '', io.preso ? r2(io.preso.t) : 0] : null,
      tr: Math.max(0, Math.ceil(RESTRINGE - this.tempoRound)),
      vr: this.vittorieRound,
    };
  }
}

module.exports = {
  meta: {
    id: 'bomberman',
    nome: 'Bombe e mattoni',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [2, 3, 4],
    descrizione: 'Labirinto con mattoni da far saltare: piazza le bombe, raccogli i potenziamenti e resta l\'ultimo in piedi.',
    alias: ['bombe', 'bomba', 'bomber', 'mattoni', 'esplosioni', 'labirinto', 'dynablaster'],
    opzioni: [
      { id: 'round', nome: 'Round', valori: [3, 5], etichette: ['3 round', '5 round'], predefinito: 3 },
      { id: 'squadre', nome: 'Squadre', valori: ['no', 'si'], etichette: ['Tutti contro tutti', 'Due contro due (in 4)'], predefinito: 'no' },
      { id: 'mattoni', nome: 'Mattoni', valori: ['normali', 'pochi', 'tanti'], etichette: ['Mattoni normali', 'Pochi mattoni', 'Tanti mattoni'], predefinito: 'normali' },
    ],
    regole: [
      'Da 2 a 4 giocatori in un labirinto visto dall\'alto: ognuno parte da un angolo. I posti vuoti li fa il computer.',
      'Ti muovi con WASD o le frecce (sul telefono col joystick) e piazzi una bomba con lo spazio (sul telefono il pulsante 💣). Dopo 2,5 secondi la bomba esplode con una fiamma a croce che va in su, giù, a destra e a sinistra.',
      'I muri grigi (i pilastri e il bordo) fermano la fiamma; i mattoni marroni si rompono e fermano la fiamma; una fiamma che arriva su un\'altra bomba la fa esplodere subito (reazione a catena).',
      'Non puoi passare sopra le bombe: appena piazzata puoi solo uscire dalla casella. All\'inizio hai 1 bomba alla volta e una fiamma lunga 2 caselle.',
      'I mattoni rotti a volte lasciano un potenziamento: 💣 una bomba in più alla volta, 🔥 fiamma più lunga di una casella, 👟 più veloce, 🦶 calcio (camminando contro una bomba la spingi: scivola finché non trova un ostacolo). Anche i potenziamenti bruciano se li colpisce una fiamma.',
      'Chi viene toccato da una fiamma (anche la sua!) è fuori fino alla fine del round. L\'ultimo che resta vince il round; se esplodono tutti insieme il round è pari.',
      'Dopo un minuto dal bordo cominciano a cadere blocchi di pietra, a spirale verso il centro: la mappa si restringe e chi resta sotto un blocco è fuori. Così il round finisce sempre.',
      'Punti: 3 per ogni round vinto e 1 per ogni avversario fatto saltare in aria con le tue bombe. Si giocano 3 round (o 5): vince chi ha più punti.',
      'A SQUADRE (in 4): due contro due, i compagni partono dagli angoli dello stesso lato (squadra rossa sopra, squadra blu sotto). Le fiamme del compagno non ti fanno male (le tue sì!). Vince il round la squadra che ha ancora qualcuno in piedi: +3 a tutti e due. Alla fine vince la squadra con più punti sommati.',
      'Il gioco è in tempo reale: si ferma per tutti quando qualcuno apre le dispense.',
      'Il computer facile pensa piano, rompe i mattoni e si accorge tardi delle reazioni a catena (a volte resta chiuso dalle sue bombe); il medio calcola le caselle pericolose, raccoglie i potenziamenti e attacca chi gli passa vicino; il difficile prevede anche le catene di bombe, insegue gli avversari e prova a chiuderli in un angolo dove non hanno scampo.',
    ],
  },
  crea: (o) => new Bombe(o),
  bot: () => ({}),
  _test: { Bombe, C, R, T, SPIRALE, MICCIA, RESTRINGE, idx },
};
