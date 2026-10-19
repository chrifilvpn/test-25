// DUELLO SULLE PIATTAFORME: vista di lato, quattro mappe (Isole sospese, Torri, Nuvole mobili, Vulcano), ognuna con
// le sue piattaforme e il suo power-up esclusivo. Si salta da una piattaforma all'altra. Dal cielo cadono oggetti: si raccolgono passandoci sopra e si usano col tasto azione.
// Ognuno ha 3 cuori: bombe e martellate tolgono un cuore, le palle di neve spingono (e chi cade nel vuoto perde un cuore).
// Chi resta senza cuori è fuori per il round; l'ultimo rimasto vince il round.
const { Arena, casuale } = require('./arena');
const T = require('./trucco');
// il trucco segreto (!win): un vantaggio per il resto del round (al massimo 25 secondi di gioco), poi si spegne
function conTrucco(g, p) {
  if (!T.armato(g, p) || g.fase !== 'gioco') return false;
  const da = (g._winDa = g._winDa || {});
  if (da[p] == null || da[p] > g.tempoRound) da[p] = g.tempoRound;
  if (g.tempoRound - da[p] < 25) return true;
  T.consuma(g, p); delete da[p];
  return false;
}
// a fine round si spegne (se è servito almeno 3 secondi; altrimenti vale anche per il prossimo round)
function fineTrucco(g, sempre = false) {
  for (let p = 0; p < g.n; p++) { const da = g._winDa && g._winDa[p]; if (da != null && (sempre || g.tempoRound - da >= 3)) T.consuma(g, p); if (g._winDa) delete g._winDa[p]; }
}
const W = 1000, H = 620, G = 1900, V = 250, SALTO = 760, LARG = 26, ALT = 40;
// Le mappe: piattaforme (base = non ci si lascia cadere attraverso; mx/per/fase = nuvola che si sposta avanti e
// indietro), il power-up esclusivo della mappa e, nel Vulcano, la lava che sale. Tutti i dislivelli tra piattaforme
// vicine stanno sotto i 150 pixel (un salto arriva a 152, il doppio salto a circa 260), quindi si raggiungono.
const MAPPE = {
  isole: { nome: 'Isole sospese', esclusivo: 'molla', piatt: [
    { x0: 70, x1: 420, y: 420, base: 1 }, { x0: 580, x1: 930, y: 420, base: 1 }, { x0: 430, x1: 570, y: 285 }] },
  torri: { nome: 'Torri', esclusivo: 'gancio', piatt: [
    { x0: 60, x1: 330, y: 470, base: 1 }, { x0: 670, x1: 940, y: 470, base: 1 },
    { x0: 250, x1: 410, y: 360 }, { x0: 590, x1: 750, y: 360 },
    { x0: 70, x1: 230, y: 250 }, { x0: 770, x1: 930, y: 250 },
    { x0: 400, x1: 600, y: 230 }, { x0: 440, x1: 560, y: 120 }] },
  nuvole: { nome: 'Nuvole mobili', esclusivo: 'ali', piatt: [
    { x0: 70, x1: 320, y: 440, base: 1 }, { x0: 680, x1: 930, y: 440, base: 1 },
    { x0: 440, x1: 560, y: 360, mx: 150, per: 6, fase: 0 },
    { x0: 150, x1: 270, y: 310, mx: 60, per: 5, fase: 1.2 }, { x0: 730, x1: 850, y: 310, mx: 60, per: 5, fase: 2.4 },
    { x0: 420, x1: 580, y: 220, mx: 170, per: 7, fase: Math.PI }] },
  vulcano: { nome: 'Vulcano', esclusivo: 'pietra', lava: true, piatt: [
    { x0: 60, x1: 300, y: 470, base: 1 }, { x0: 700, x1: 940, y: 470, base: 1 }, { x0: 360, x1: 640, y: 520, base: 1 },
    { x0: 170, x1: 330, y: 350 }, { x0: 670, x1: 830, y: 350 }, { x0: 410, x1: 590, y: 260 }, { x0: 440, x1: 560, y: 150 }] },
};
const NOMI_MAPPE = Object.keys(MAPPE);
const ISOLE = MAPPE.isole.piatt; // (per compatibilità con i test di prima)
// power-up generali (in tutte le mappe) e il peso di quelli esclusivi; i cuori compaiono la metà di prima
const OGGETTI = { bomba: 3, neve: 3, martello: 2, cuore: 0.5, scudo: 1 };
const PESO_ESCLUSIVO = 1.5;
const LAVA_DA = 12, LAVA_VEL = 4, LAVA_MAX = 410; // la lava sale dopo 12 s, 4 pixel al secondo, fino a coprire le basi
const MOLLA_S = 10, ALI_S = 5, POZZA_S = 6;
const MAX_OGGETTI = 5, CUORI = 3, INVULNERABILE = 0.9, RINASCITA = 1.4;

class Duello extends Arena {
  constructor(o) {
    super(o, { id: 'duello', round: 3 }); this.W = W; this.H = H;
    const m = o.opzioni && o.opzioni.mappa;
    this.sceltaMappa = MAPPE[m] ? m : 'casuale';
    this.avvia();
  }
  iniziaRound() {
    // "Casuale": a ogni round una mappa diversa (se si può, non la stessa di prima)
    if (this.sceltaMappa !== 'casuale') this.mappa = this.sceltaMappa;
    else { const altre = NOMI_MAPPE.filter((x) => x !== this.mappa); this.mappa = altre[Math.floor(Math.random() * altre.length)]; }
    this.M = MAPPE[this.mappa];
    this.isole = this.M.piatt.map((q, k) => ({ ...q, k, b0: q.x0, b1: q.x1, rid: 0, dx: 0 }));
    this.lava = this.M.lava ? H + 40 : null;
    const basi = this.isole.filter((q) => q.base && q.y < 500);
    this.e = Array.from({ length: this.n }, (_, i) => {
      const isola = basi[i % basi.length], k = Math.floor(i / basi.length), n = Math.ceil(this.n / basi.length);
      return { id: i, x: isola.x0 + 40 + ((k + 0.5) / n) * (isola.x1 - isola.x0 - 80), y: isola.y - ALT / 2, vx: 0, vy: 0, terra: true, dir: i % 2 ? -1 : 1,
        cuori: CUORI, fuori: false, ogg: null, usi: 0, scudo: 0, molla: 0, ali: 0, immune: 0, stordito: 0, rinasce: 0, colpo: 0, ordine: null, salti: 0, su: null };
    });
    this.oggetti = []; this.proiettili = []; this.botti = []; this.colpi = []; this.pozze = []; this.nO = 0;
    this.prossimo = 1.5;
    this.usciti2 = [];
    this.mente = {};
  }
  // le nuvole si spostano, nel finale tutto si sgretola dai bordi
  muoviPiattaforme(t, dt) {
    for (const q of this.isole) {
      if (q.via) continue;
      if (t > 60) q.rid += 7 * dt;
      const off = q.mx ? q.mx * Math.sin((2 * Math.PI * t) / q.per + q.fase) : 0;
      const x0 = q.b0 + off + q.rid, x1 = q.b1 + off - q.rid;
      if (x1 - x0 < 20) { q.via = true; q.x0 = q.x1 = -1000; q.dx = 0; continue; }
      q.dx = q.x0 === undefined ? 0 : x0 - q.x0; q.x0 = x0; q.x1 = x1;
    }
  }
  sullIsola(x, y, vy, yPrima) {
    for (const s of this.isole) if (!s.via && x > s.x0 - LARG / 2 && x < s.x1 + LARG / 2 && vy >= 0 && yPrima + ALT / 2 <= s.y + 2 && y + ALT / 2 >= s.y) return s;
    return null;
  }
  // una piattaforma sicura dove ricomparire (sopra la lava)
  doveRinascere() {
    const ok = this.isole.filter((q) => !q.via && q.x1 - q.x0 > 90 && (this.lava === null || q.y < this.lava - 60));
    const lista = ok.length ? ok : this.isole.filter((q) => !q.via);
    return lista.length ? lista[Math.floor(Math.random() * lista.length)] : { x0: 300, x1: 700, y: 300 };
  }
  ferisci(p, danno, spintaX, spintaY, da) {
    const e = this.e[p];
    if (e.fuori || e.rinasce > 0 || e.immune > 0) return;
    if (conTrucco(this, p)) return; // il trucco segreto: i colpi non gli fanno niente
    if (e.scudo > 0) { e.scudo = 0; this.cambiato = true; this.annuncia(p, 'para il colpo con lo scudo 🛡️', 'lo scudo ti ha protetto 🛡️'); return; }
    e.vx = spintaX; e.vy = spintaY; e.stordito = 0.35; e.terra = false; e.su = null;
    if (danno) { e.cuori -= danno; e.immune = INVULNERABILE; e.colpo++; this.cambiato = true; if (da !== undefined && da !== p) this.annuncia(da, `colpisce @! 💥`, 'colpito! 💥', false, { bersaglio: p, testoTe: 'ti hanno colpito! 💔' }); }
    if (e.cuori <= 0) this.elimina(p);
  }
  elimina(p) {
    const e = this.e[p];
    if (e.fuori) return;
    e.fuori = true; e.cuori = 0; e.ordine = this.usciti2.length; this.usciti2.push(p); this.cambiato = true;
    this.annuncia(p, 'ha finito i cuori ed è fuori! 💀', 'hai finito i cuori: sei fuori!');
  }
  perdiCuore(p, perche) {
    const e = this.e[p];
    if (conTrucco(this, p)) { e.rinasce = 0.4; this.cambiato = true; return; } // col trucco segreto ricompare subito, senza perdere il cuore
    e.cuori--; e.colpo++; this.cambiato = true;
    if (e.cuori <= 0) this.elimina(p); else { e.rinasce = RINASCITA; this.annuncia(p, perche === 'lava' ? 'è finito nella lava! 🔥' : 'è caduto nel vuoto! 💔', perche === 'lava' ? 'sei finito nella lava! 🔥' : 'sei caduto nel vuoto! 💔'); }
  }
  passo(dt) {
    const t = this.tempoRound;
    for (let p = 0; p < this.n; p++) conTrucco(this, p); // fa partire (e finire) il tempo del trucco segreto
    this.muoviPiattaforme(t, dt);
    if (this.lava !== null && t > LAVA_DA) this.lava = Math.max(LAVA_MAX, this.lava - LAVA_VEL * dt * (this.lava > H ? 12 : 1));
    // nuovi oggetti che cadono dal cielo: i generali e quello esclusivo della mappa
    this.prossimo -= dt;
    if (this.prossimo <= 0 && this.oggetti.length < (t > 60 ? 9 : MAX_OGGETTI)) {
      // dopo un minuto "pioggia di bombe": quasi solo bombe, e più spesso, così il round finisce
      const finale = t > 60;
      const pesi = finale ? { bomba: 6, neve: 2, martello: 1 } : { ...OGGETTI, [this.M.esclusivo]: PESO_ESCLUSIVO };
      const tipi = Object.entries(pesi); let r = Math.random() * tipi.reduce((a, [, p]) => a + p, 0), tipo = 'bomba';
      for (const [k, p] of tipi) { r -= p; if (r <= 0) { tipo = k; break; } }
      const vive = this.isole.filter((q) => !q.via && (this.lava === null || q.y < this.lava - 20));
      if (vive.length) {
        const s = vive[Math.floor(Math.random() * vive.length)];
        this.oggetti.push({ id: ++this.nO, tipo, x: casuale(s.x0 + 20, s.x1 - 20), y: -20, vy: 0, fermo: false, su: null });
      }
      this.prossimo = t > 60 ? casuale(0.6, 1.1) : casuale(1.2, 2.2);
    }
    for (const o of this.oggetti) {
      if (o.fermo) {
        // sopra una nuvola che si muove: si muove con lei; se la piattaforma sparisce, cade
        const s = o.su !== null ? this.isole[o.su] : null;
        if (s && !s.via) { o.x += s.dx; if (o.x < s.x0 || o.x > s.x1) { o.fermo = false; o.su = null; } } else if (s) { o.fermo = false; o.su = null; }
        if (this.lava !== null && o.y > this.lava) o.via = true;
        continue;
      }
      const y0 = o.y; o.vy += G * 0.5 * dt; o.y += o.vy * dt;
      const s = this.isole.find((q) => !q.via && o.x > q.x0 && o.x < q.x1 && y0 <= q.y - 12 && o.y >= q.y - 12);
      if (s) { o.y = s.y - 12; o.fermo = true; o.su = s.k; }
      if (o.y > H + 40 || (this.lava !== null && o.y > this.lava)) o.via = true;
    }
    // giocatori
    for (let p = 0; p < this.n; p++) {
      const e = this.e[p], i = this.inp[p];
      if (e.fuori) continue;
      if (e.rinasce > 0) { e.rinasce -= dt; if (e.rinasce <= 0) { const s = this.doveRinascere(); e.x = casuale(s.x0 + 30, s.x1 - 30); e.y = -30; e.vx = e.vy = 0; e.immune = 1.5; e.su = null; } continue; }
      e.immune = Math.max(0, e.immune - dt); e.scudo = Math.max(0, e.scudo - dt); e.stordito = Math.max(0, e.stordito - dt);
      e.molla = Math.max(0, e.molla - dt); e.ali = Math.max(0, e.ali - dt);
      // sopra una nuvola che si muove: ci si sposta con lei
      if (e.terra && e.su !== null && this.isole[e.su]) e.x += this.isole[e.su].dx;
      const vuole = e.stordito > 0 ? 0 : i.x;
      if (e.stordito > 0) e.vx *= Math.exp(-2 * dt); else e.vx = vuole * V;
      if (Math.abs(vuole) > 0.2) e.dir = Math.sign(vuole);
      // salto: su (W, freccia o joystick in alto), anche un secondo salto in aria; con la molla si salta molto più in alto
      const su = i.y < -0.5, spinta = SALTO * (e.molla > 0 ? 1.35 : 1);
      if (su && !e.suPrima && e.stordito <= 0 && (e.terra || e.salti < 2)) { e.vy = -spinta * (e.terra ? 1 : 0.85); e.salti = e.terra ? 1 : 2; e.terra = false; e.su = null; }
      e.suPrima = su;
      const y0 = e.y;
      // con le ali: tenendo su si vola (spinta verso l'alto), altrimenti si plana piano
      if (e.ali > 0) { e.vy += (su ? -G * 0.9 : G * 0.45) * dt; e.vy = Math.max(-420, Math.min(e.vy, 380)); } else e.vy += G * dt;
      e.x += e.vx * dt; e.y += e.vy * dt;
      e.x = Math.max(LARG / 2, Math.min(W - LARG / 2, e.x));
      if (e.y < -60) { e.y = -60; e.vy = Math.max(0, e.vy); }
      const s = this.sullIsola(e.x, e.y, e.vy, y0);
      // dalle piattaforme che non sono basi si scende tenendo giù
      if (s && !(i.y > 0.5 && !s.base)) { e.y = s.y - ALT / 2; e.vy = 0; e.terra = true; e.salti = 0; e.su = s.k; } else if (!s || e.vy < 0) { e.terra = false; e.su = null; }
      // caduto nel vuoto (o nella lava): perde un cuore e ricompare dall'alto
      if (e.y > H + 60) { this.perdiCuore(p, 'vuoto'); continue; }
      if (this.lava !== null && e.y + ALT / 2 > this.lava + 6) { this.perdiCuore(p, 'lava'); continue; }
      // pozze di pietra lavica: tolgono un cuore a chi ci mette i piedi (non a chi l'ha lanciata, per un attimo)
      for (const z of this.pozze) if (Math.abs(e.x - z.x) < z.r && Math.abs(e.y + ALT / 2 - z.y) < 8 && !(z.da === p && z.t < 0.6)) this.ferisci(p, 1, Math.sign(e.x - z.x || 1) * 200, -420, z.da);
      // raccoglie gli oggetti
      for (const o of this.oggetti) {
        if (o.via || Math.abs(o.x - e.x) > 26 || Math.abs(o.y - e.y) > 34) continue;
        if (o.tipo === 'cuore') { if (e.cuori >= CUORI) continue; e.cuori++; o.via = true; this.cambiato = true; continue; }
        if (o.tipo === 'scudo') { e.scudo = 8; o.via = true; this.cambiato = true; continue; }
        if (o.tipo === 'molla') { e.molla = MOLLA_S; o.via = true; this.cambiato = true; continue; }
        if (o.tipo === 'ali') { e.ali = ALI_S; o.via = true; this.cambiato = true; continue; }
        if (e.ogg) continue;
        e.ogg = o.tipo; e.usi = o.tipo === 'martello' ? 3 : 1; o.via = true; this.cambiato = true;
      }
      // usa l'oggetto
      if (this.nuoviTocchi(p) && e.ogg && e.stordito <= 0) this.usa(p);
    }
    this.oggetti = this.oggetti.filter((o) => !o.via);
    for (const z of this.pozze) { z.t += dt; const s = this.isole[z.su]; if (s && !s.via) z.x += s.dx; if (!s || s.via || z.t > POZZA_S || (this.lava !== null && z.y > this.lava)) z.via = true; }
    this.pozze = this.pozze.filter((z) => !z.via);
    // proiettili
    for (const q of this.proiettili) {
      q.t += dt; q.vy += (q.tipo === 'bomba' || q.tipo === 'pietra' ? G * 0.75 : q.tipo === 'gancio' ? 0 : 300) * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      const tocca = this.e.find((e) => !e.fuori && e.rinasce <= 0 && e.id !== q.da && Math.abs(e.x - q.x) < LARG / 2 + 10 && Math.abs(e.y - q.y) < ALT / 2 + 10);
      const terra = this.isole.find((s) => !s.via && q.x > s.x0 && q.x < s.x1 && Math.abs(q.y - s.y) < 12 && q.vy > 0);
      if (q.tipo === 'bomba' && (tocca || terra || q.t > 1.6)) this.esplodi(q);
      else if (q.tipo === 'neve' && tocca) { q.via = true; this.ferisci(tocca.id, 0, Math.sign(q.vx) * 560, -280, q.da); this.botti.push({ tipo: 'neve', x: Math.round(q.x), y: Math.round(q.y) }); }
      else if (q.tipo === 'pietra' && (tocca || terra)) {
        q.via = true; this.botti.push({ tipo: 'pietra', x: Math.round(q.x), y: Math.round(q.y) });
        if (tocca) this.ferisci(tocca.id, 1, Math.sign(q.vx) * 300, -300, q.da);
        const s = terra || this.isole.find((z) => !z.via && q.x > z.x0 && q.x < z.x1 && z.y >= q.y - 10);
        if (s) this.pozze.push({ x: Math.max(s.x0 + 30, Math.min(s.x1 - 30, q.x)), y: s.y, r: 38, t: 0, da: q.da, su: s.k });
      } else if (q.tipo === 'gancio' && (tocca || q.t > 0.55)) {
        // il gancio: se prende qualcuno lo tira verso chi l'ha lanciato
        q.via = true;
        if (tocca) { const d = this.e[q.da]; this.ferisci(tocca.id, 0, Math.sign(d.x - tocca.x || 1) * 640, -330, q.da); this.botti.push({ tipo: 'gancio', x: Math.round(tocca.x), y: Math.round(tocca.y) }); }
      }
      if (q.y > H + 60 || q.x < -60 || q.x > W + 60) q.via = true;
    }
    this.proiettili = this.proiettili.filter((q) => !q.via);
    const vivi = this.e.filter((e) => !e.fuori);
    return vivi.length <= (this.n === 1 ? 0 : 1) || t > 120;
  }
  usa(p) {
    const e = this.e[p];
    if (e.ogg === 'bomba') this.proiettili.push({ tipo: 'bomba', x: e.x + e.dir * 16, y: e.y - 10, vx: e.dir * 380, vy: -430, da: p, t: 0 });
    else if (e.ogg === 'pietra') this.proiettili.push({ tipo: 'pietra', x: e.x + e.dir * 16, y: e.y - 10, vx: e.dir * 340, vy: -380, da: p, t: 0 });
    else if (e.ogg === 'neve') this.proiettili.push({ tipo: 'neve', x: e.x + e.dir * 16, y: e.y - 6, vx: e.dir * 680, vy: -60, da: p, t: 0 });
    else if (e.ogg === 'gancio') this.proiettili.push({ tipo: 'gancio', x: e.x + e.dir * 16, y: e.y - 4, vx: e.dir * 820, vy: 0, da: p, t: 0 });
    else if (e.ogg === 'martello') {
      this.colpi.push({ x: Math.round(e.x), y: Math.round(e.y), d: e.dir });
      for (const o of this.e) if (o.id !== p && !o.fuori && o.rinasce <= 0 && (o.x - e.x) * e.dir > -8 && Math.abs(o.x - e.x) < 62 && Math.abs(o.y - e.y) < 40) this.ferisci(o.id, 1, e.dir * 470, -380, p);
    }
    e.usi--; if (e.usi <= 0) e.ogg = null;
    this.cambiato = true;
  }
  esplodi(q) {
    q.via = true; this.botti.push({ tipo: 'bomba', x: Math.round(q.x), y: Math.round(q.y) });
    for (const o of this.e) {
      if (o.fuori || o.rinasce > 0) continue;
      const d = Math.hypot(o.x - q.x, o.y - q.y);
      if (d < 90) this.ferisci(o.id, 1, Math.sign(o.x - q.x || 1) * 430, -420, q.da);
    }
  }
  fineRound() {
    fineTrucco(this);
    // punti: uno per ogni giocatore uscito prima di te; chi resta prende 2 in più
    this.e.forEach((e) => { if (e.fuori) this.punti[e.id] += e.ordine; else this.punti[e.id] += this.usciti2.length + 2; });
    const vivi = this.e.filter((e) => !e.fuori);
    if (vivi.length === 1 && this.n > 1) this.annuncia(vivi[0].id, 'vince il round! 🏆', 'hai vinto il round! 🏆', true);
  }
  // ---------------- computer ----------------
  // la piattaforma su cui sta (o appena sotto i piedi)
  piattaformaDi(x, y) { return this.isole.find((s) => !s.via && x > s.x0 - 10 && x < s.x1 + 10 && Math.abs(y + ALT / 2 - s.y) < 6) || null; }
  // la piattaforma "sotto" un punto (quella più alta sotto di lui): serve per sapere dove si trova un bersaglio
  piattaformaSotto(x, y) { let m = null; for (const s of this.isole) if (!s.via && x > s.x0 - 6 && x < s.x1 + 6 && s.y >= y + ALT / 2 - 8 && (!m || s.y < m.y)) m = s; return m; }
  sicura(s) { return s && !s.via && (this.lava === null || s.y < this.lava - 50); }
  // come sullIsola, ma con le nuvole dove saranno tra "fra" secondi
  sullIsolaTra(x, y, vy, yPrima, fra) {
    const t = this.tempoRound + fra;
    for (const s of this.isole) {
      if (s.via) continue;
      const off = s.mx ? s.mx * Math.sin((2 * Math.PI * t) / s.per + s.fase) : 0, x0 = s.b0 + off + s.rid, x1 = s.b1 + off - s.rid;
      if (x > x0 - LARG / 2 + 4 && x < x1 + LARG / 2 - 4 && vy >= 0 && yPrima + ALT / 2 <= s.y + 2 && y + ALT / 2 >= s.y) return s;
    }
    return null;
  }
  // guarda avanti: con questi comandi (direzione, salto adesso, secondo salto in cima) dove atterra? (null = nel vuoto)
  prevedi(e, dir, saltaOra, doppio) {
    let x = e.x, y = e.y, vy = e.vy, salti = e.terra ? 0 : Math.max(1, e.salti), terra = e.terra;
    const dt = 1 / 30, spinta = SALTO * (e.molla > 0 ? 1.35 : 1);
    if (saltaOra && (terra || salti < 2)) { vy = -spinta * (terra ? 1 : 0.85); salti = terra ? 1 : 2; terra = false; }
    for (let k = 0; k < 75; k++) {
      if (doppio && salti < 2 && vy > -60 && !terra) { vy = -spinta * 0.85; salti = 2; }
      const y0 = y; vy += G * dt; x = Math.max(LARG / 2, Math.min(W - LARG / 2, x + dir * V * dt)); y += vy * dt;
      const s = this.sullIsolaTra(x, y, vy, y0, (k + 1) * dt);
      if (s && k > 1) return this.sicura(s) ? s : null;
      if (s && terra) return this.sicura(s) ? s : null;
      if (y > H + 60 || (this.lava !== null && y + ALT / 2 > this.lava)) return null;
    }
    return this.piattaformaSotto(x, y) && this.sicura(this.piattaformaSotto(x, y)) ? this.piattaformaSotto(x, y) : null;
  }
  // il medio (non sempre) e il difficile non si buttano nel vuoto: se i comandi scelti portano giù, ne cercano altri
  sicurezza(e, m, r, liv, meta) {
    if (liv === 'facile' || e.ali > 0 || e.stordito > 0 || (liv === 'medio' && Math.random() < 0.3)) return r;
    if (r.y > 0) return r; // lasciarsi cadere da una piattaforma: l'ha già deciso guardando sotto
    const puoSaltare = (e.terra || e.salti < 2) && !m.suPrimaVera;
    const prova = (dir, ora, doppio) => this.prevedi(e, dir, ora && puoSaltare, doppio && (e.terra ? true : e.salti < 2));
    // i comandi scelti vanno bene?
    if (e.terra && !(r.y < 0) && Math.abs(r.x) < 0.1) return r;
    const scelta = prova(Math.sign(r.x), r.y < 0, r.y < 0 && !e.terra ? false : r.y < 0);
    if (scelta) return r;
    // altrimenti: la prima alternativa che atterra su qualcosa di sicuro, preferendo quella più vicina al bersaglio
    const opzioni = [];
    for (const dir of [Math.sign(r.x), -1, 0, 1]) for (const [ora, doppio] of [[false, false], [true, false], [true, true], [false, true]]) {
      if ((ora || doppio) && !puoSaltare && !(doppio && !e.terra && e.salti < 2)) continue;
      const s = prova(dir, ora, doppio);
      if (s) opzioni.push({ dir, ora, doppio, s, d: meta ? Math.abs((s.x0 + s.x1) / 2 - meta.x) + Math.abs(s.y - meta.y) : 0 });
    }
    if (!opzioni.length) return e.terra ? { x: 0, y: 0, tocco: r.tocco } : r;
    opzioni.sort((a, b) => a.d - b.d);
    const o = opzioni[0];
    return { x: o.dir, y: o.ora || (o.doppio && !e.terra && e.vy > -60) ? -1 : 0, tocco: r.tocco };
  }
  pensa(p, liv) {
    const e = this.e[p], m0 = this.mente[p] || (this.mente[p] = { fino: 0, meta: null });
    m0.suPrimaVera = e.suPrima;
    const r = this.pensa0(p, liv);
    if (!r || r.x === undefined) return r;
    const f = this.sicurezza(e, m0, r, liv, m0.meta);
    m0.suPrima = f.y < 0;
    return f;
  }
  pensa0(p, liv) {
    const e = this.e[p];
    if (e.fuori || e.rinasce > 0) return {};
    const m = this.mente[p] || (this.mente[p] = { fino: 0, meta: null });
    const t = this.tempoRound, isola = e.terra ? this.piattaformaDi(e.x, e.y) : null;
    const R = { facile: 0.5, medio: 0.25, difficile: 0.1 }[liv];
    let x = 0, y = 0, tocco = false;
    const piede = e.y + ALT / 2;
    // prima di tutto: non stare sul bordo (nel finale le piattaforme si restringono); il facile non ci pensa
    const margine = liv === 'difficile' ? 42 : 35;
    if (isola && liv !== 'facile') {
      const centro = (isola.x0 + isola.x1) / 2, largo = isola.x1 - isola.x0;
      if (largo < 60 && !isola.base) return { x: 0, y: 1 }; // la piattaforma sta sparendo: si scende
      if ((!isola.mx || liv === 'difficile') && (e.x < isola.x0 + margine * 0.7 || e.x > isola.x1 - margine * 0.7)) return { x: Math.sign(centro - e.x), y: 0 }; // sulle nuvole che si muovono ci pensa solo il difficile
    }
    // lava che sale: il medio e il difficile vanno in alto per tempo
    if (this.lava !== null && liv !== 'facile' && isola && isola.y > this.lava - (liv === 'difficile' ? 110 : 70)) m.meta = { x: (this.isole.filter((q) => this.sicura(q) && q.y < isola.y - 40).sort((a, b) => Math.abs((a.x0 + a.x1) / 2 - e.x) - Math.abs((b.x0 + b.x1) / 2 - e.x))[0] || { x0: 500, x1: 500 }).x0 + 40, y: 0, fuga: true }, m.fino = t + 0.8;
    const bomba = this.proiettili.find((q) => (q.tipo === 'bomba' || q.tipo === 'pietra') && q.da !== p && Math.abs(q.x - e.x) < 130 && Math.abs(q.y - e.y) < 160);
    const verso = (d) => (!isola || (d > 0 ? e.x < isola.x1 - margine - 30 : e.x > isola.x0 + margine + 30) ? d : 0); // si scappa solo se c'è spazio
    if (bomba && liv !== 'facile') return { x: verso(Math.sign(e.x - bomba.x) || 1), y: verso(Math.sign(e.x - bomba.x) || 1) ? 0 : (e.terra ? -1 : 0) };
    // pozze di lava sulla piattaforma: ci si sposta
    const pozza = this.pozze.find((z) => Math.abs(z.x - e.x) < z.r + 20 && Math.abs(z.y - piede) < 10);
    if (pozza && liv !== 'facile') { const via = verso(Math.sign(e.x - pozza.x) || 1); return via ? { x: via, y: 0 } : { x: Math.sign(e.x - pozza.x) || 1, y: e.terra ? -1 : 0 }; }
    // il difficile salta le palle di neve e i ganci in arrivo e sta lontano da chi ha il martello
    if (liv === 'difficile') {
      const neve = this.proiettili.find((q) => (q.tipo === 'neve' || q.tipo === 'gancio') && q.da !== p && Math.sign(e.x - q.x) === Math.sign(q.vx) && Math.abs(q.x - e.x) < 170 && Math.abs(q.y - e.y) < 40);
      if (neve && e.terra) { m.suPrima = true; return { x: 0, y: -1 }; }
      const martello = this.e.find((o) => o.id !== p && !o.fuori && o.ogg === 'martello' && Math.abs(o.x - e.x) < 90 && Math.abs(o.y - e.y) < 50);
      if (martello && e.ogg !== 'martello') { const via = verso(Math.sign(e.x - martello.x) || 1); if (via) return { x: via, y: 0 }; }
    }
    // bersaglio: se ha un oggetto il nemico più vicino, altrimenti l'oggetto più vicino (i cuori quando servono)
    const nemici = this.e.filter((o) => o.id !== p && !o.fuori && o.rinasce <= 0);
    const vicino = (a, b) => Math.hypot(a.x - e.x, (a.y - e.y) * 1.5) - Math.hypot(b.x - e.x, (b.y - e.y) * 1.5);
    const oggetti = this.oggetti.filter((o) => o.fermo && (o.tipo !== 'cuore' || e.cuori < CUORI) && (o.tipo !== 'molla' || e.molla <= 0) && (o.tipo !== 'ali' || e.ali <= 0));
    if (t >= m.fino) {
      m.fino = t + R;
      if (e.ogg && nemici.length) m.meta = nemici.sort(vicino)[0];
      else if (oggetti.length) m.meta = oggetti.sort(vicino)[0];
      else m.meta = nemici[0] || null;
    }
    const q = m.meta; if (!q) return {};
    const dx = q.x - e.x;
    // tiene la distanza giusta per l'oggetto che ha
    const giusta = { bomba: 200, pietra: 180, neve: 260, gancio: 300, martello: 40 }[e.ogg] || 0;
    const stessoPiano = Math.abs(q.y - e.y) < 50;
    if (Math.abs(dx) > giusta + 20 || !stessoPiano) x = Math.sign(dx); else if (giusta && Math.abs(dx) < giusta - 60 && e.ogg !== 'martello') x = -Math.sign(dx);
    // il difficile non si gira mai di spalle per prendere le distanze: si mette di fronte (piano) e tira
    if (liv === 'difficile' && e.ogg && stessoPiano && Math.abs(dx) < giusta + 60 && (Math.abs(dx) > giusta - 90 || e.ogg === 'neve' || e.ogg === 'gancio')) x = Math.sign(dx) * 0.25;
    const mira = Math.abs(dx) < giusta + 60;
    if (e.ogg && stessoPiano && mira && Math.sign(dx) === e.dir && Math.random() < { facile: 0.05, medio: 0.15, difficile: 0.5 }[liv]) tocco = true;
    // ---- come arrivarci: piattaforme più in alto, più in basso o dall'altra parte di un salto ----
    const sotto = this.piattaformaSotto(q.x, q.y);
    if (isola && sotto && sotto !== isola && (liv !== 'facile' || Math.random() < 0.6)) {
      if (sotto.y < isola.y - 20) {
        // più in alto: ci si mette sotto il bordo più vicino della piattaforma e si salta (attraverso, da sotto)
        const px = Math.max(sotto.x0 + 18, Math.min(sotto.x1 - 18, e.x));
        const alta = sotto.y < isola.y - 145; // troppo alta per un salto solo: serve il doppio salto
        if (Math.abs(px - e.x) > 14) x = Math.sign(px - e.x); else { x = Math.sign(dx) * 0.4; if (e.terra) y = -1; }
        if (alta && e.terra && Math.abs(px - e.x) < 40) y = -1;
      } else if (sotto.y > isola.y + 20) {
        // più in basso: dalle piattaforme che non sono basi ci si lascia cadere, altrimenti si scende dal bordo
        const sopraSotto = e.x > sotto.x0 + 10 && e.x < sotto.x1 - 10;
        if (!isola.base && sopraSotto) return { x: 0, y: 1 };
        x = Math.sign((sotto.x0 + sotto.x1) / 2 - e.x);
      } else x = Math.sign(dx); // stessa altezza su un'altra piattaforma: si salta dal bordo (sotto)
    }
    // salti: per passare all'altra piattaforma, per salire in alto, per non cadere
    const altra = isola && (q.x < isola.x0 || q.x > isola.x1);
    const bordo = isola && ((x > 0 && e.x > isola.x1 - (liv === 'facile' ? 22 : margine)) || (x < 0 && e.x < isola.x0 + (liv === 'facile' ? 22 : margine)));
    if (bordo) {
      // oltre il bordo c'è qualcosa (a un salto di distanza)? allora si salta, altrimenti ci si ferma
      const dir = x > 0 ? 1 : -1;
      const atterra = this.isole.some((s) => s !== isola && !s.via && this.sicura(s) && (dir > 0 ? s.x0 > e.x - 10 && s.x0 < e.x + 260 : s.x1 < e.x + 10 && s.x1 > e.x - 260) && s.y > isola.y - 150 && s.y < isola.y + 260);
      if ((altra || liv === 'facile') && (atterra || liv === 'facile')) y = -1;
      else if (!(sotto && sotto.y > isola.y + 20 && atterra)) x = 0; // non si butta nel vuoto
    }
    if (q.y < e.y - 80 && e.terra && Math.abs(dx) < 140 && (t < 55 || liv === 'facile') && !sotto) y = -1;
    // in aria sopra il vuoto: il secondo salto per arrivare (il facile a volte se lo dimentica)
    const sottoMe = this.piattaformaSotto(e.x, e.y);
    if (!e.terra && e.vy > 120 && e.salti < 2 && (!sottoMe || !this.sicura(sottoMe)) && Math.random() < { facile: 0.35, medio: 0.8, difficile: 1 }[liv]) y = -1;
    // con le ali: tiene su finché non è sopra una piattaforma sicura
    if (e.ali > 0 && !e.terra && (!sottoMe || !this.sicura(sottoMe) || (sotto && sotto.y < e.y))) { y = -1; m.suPrima = false; }
    // tenere premuto "su" non fa un altro salto: bisogna lasciarlo
    if (y < 0 && m.suPrima && e.ali <= 0) y = 0;
    m.suPrima = y < 0;
    // anche in aria cerca di tornare sopra una piattaforma sicura
    if (!e.terra && e.vy > 0 && (!sottoMe || !this.sicura(sottoMe))) {
      const s = this.isole.filter((z) => this.sicura(z) && z.y > e.y).sort((a, b) => Math.abs((a.x0 + a.x1) / 2 - e.x) - Math.abs((b.x0 + b.x1) / 2 - e.x))[0];
      if (s) { if (e.x < s.x0 + 20) x = 1; else if (e.x > s.x1 - 20) x = -1; }
    }
    return { x, y, tocco };
  }
  vistaExtra() { return { isole: ISOLE, cuori: CUORI, mappe: Object.fromEntries(NOMI_MAPPE.map((k) => [k, MAPPE[k].nome])) }; }
  statoTick() {
    const botti = this.botti, colpi = this.colpi; this.botti = []; this.colpi = [];
    return {
      m: this.mappa,
      e: this.e.map((e) => ({ id: e.id, x: Math.round(e.x), y: Math.round(e.y), d: e.dir, c: e.cuori, f: e.fuori ? 1 : 0, o: e.ogg, u: e.usi, sc: e.scudo > 0 ? 1 : 0, ml: e.molla > 0 ? 1 : 0, al: e.ali > 0 ? 1 : 0, im: e.immune > 0 || e.rinasce > 0 ? 1 : 0, r: e.rinasce > 0 ? 1 : 0, st: e.stordito > 0 ? 1 : 0, t: e.terra ? 1 : 0, colpo: e.colpo })),
      o: this.oggetti.map((o) => ({ id: o.id, t: o.tipo, x: Math.round(o.x), y: Math.round(o.y) })),
      p: this.proiettili.map((q) => ({ t: q.tipo, x: Math.round(q.x), y: Math.round(q.y), d: Math.sign(q.vx) })),
      b: botti, cl: colpi, is: this.isole.map((q) => [Math.round(q.x0), Math.round(q.x1), q.y, q.base ? 1 : 0, q.mx ? 1 : 0]),
      lv: this.lava === null ? null : Math.round(this.lava), pz: this.pozze.map((z) => [Math.round(z.x), z.y, z.r, Math.round((POZZA_S - z.t) * 10) / 10]),
    };
  }
}

module.exports = {
  meta: {
    id: 'duello',
    nome: 'Duello sulle piattaforme',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Quattro mappe (isole, torri, nuvole che si muovono, vulcano con la lava), oggetti che piovono dall\'alto e 3 cuori a testa. Resta l\'ultimo in piedi!',
    alias: ['duello', 'piattaforme', 'smash', 'isole', 'bombe', 'martello', 'cuori'],
    opzioni: [
      { id: 'mappa', nome: 'Mappa', valori: ['casuale', 'isole', 'torri', 'nuvole', 'vulcano'], etichette: ['Casuale (cambia a ogni round)', 'Isole sospese', 'Torri', 'Nuvole mobili', 'Vulcano'], predefinito: 'casuale' },
      { id: 'round', nome: 'Round', valori: [3, 1, 5], etichette: ['3 round', '1 round', '5 round'], predefinito: 3 },
    ],
    regole: [
      'Vista di lato. Ti muovi con A e D (o le frecce), salti con W (o freccia su); in aria puoi fare un secondo salto. Sul telefono: joystick (in alto per saltare) e il pulsante per usare gli oggetti. Dalle piattaforme piccole (non da quelle in basso) si scende tenendo giù.',
      'Mappe (si sceglie al tavolo, o Casuale che cambia a ogni round): 🏝️ Isole sospese (due isole e una piccola in alto); 🏰 Torri (piattaforme di pietra su quattro piani); ☁️ Nuvole mobili (le nuvole in mezzo vanno avanti e indietro e ti portano con sé); 🌋 Vulcano (dopo 12 secondi la lava sale e copre le rocce in basso: toccarla costa un cuore).',
      'Ognuno ha 3 cuori. Se cadi nel vuoto (o nella lava) perdi un cuore e ricompari dall\'alto dopo un attimo, su una piattaforma sicura. Chi finisce i cuori è fuori per il resto del round.',
      'Dal cielo cadono oggetti: si raccolgono passandoci sopra e si usano con spazio (o il pulsante). Se ne tiene uno alla volta. Oggetti in tutte le mappe: 💣 Bomba: la lanci ad arco, esplode appena tocca qualcuno o il terreno: chi è vicino perde un cuore e viene sbalzato. ❄️ Palla di neve: va dritta e veloce, non toglie cuori ma spinge forte. 🔨 Martello: tre colpi da vicino, ognuno toglie un cuore e sbalza. ❤️ Cuore: +1 (al massimo 3; ne cadono pochi). 🛡️ Scudo: per 8 secondi para il prossimo colpo.',
      'Oggetti esclusivi, uno per mappa: 🌀 Molla (Isole): per 10 secondi salti molto più in alto. 🪝 Gancio (Torri): lo lanci dritto e tira verso di te chi prende (per buttarlo giù o finirlo col martello). 🪽 Ali (Nuvole): per 5 secondi tieni su per volare, altrimenti plani. 🪨 Pietra lavica (Vulcano): la lanci ad arco, toglie un cuore a chi colpisce e lascia per 6 secondi una pozza di lava sulla piattaforma: chi ci mette i piedi perde un cuore.',
      'Dopo un colpo si è protetti per un attimo (lampeggi). Chi ricompare dall\'alto è protetto per un secondo e mezzo.',
      'Dopo un minuto arriva il finale: le piattaforme si sgretolano dai bordi e piovono quasi solo bombe, così il round finisce. Punti del round: uno per ogni giocatore uscito prima di te; l\'ultimo rimasto prende 2 punti in più. Dopo 3 round (o 1, o 5) vince chi ha più punti.',
      'Il gioco è in tempo reale: si ferma per tutti quando qualcuno apre le dispense.',
      'Il computer facile salta a caso e a volte cade nel vuoto; il medio raccoglie gli oggetti, sale e scende tra le piattaforme e di solito guarda dove salta; il difficile guarda sempre dove atterra (anche sulle nuvole che si muovono), scappa dalle bombe e dalle pozze, salta le palle di neve e i ganci, sale per tempo quando arriva la lava e tira stando di fronte all\'avversario.',
    ],
  },
  crea: (o) => new Duello(o),
  bot: () => ({}),
  _test: { Duello, ISOLE, MAPPE, OGGETTI },
};
