// DRAGHI E SEGRETE: le regole in più del combattimento nelle ambientazioni horror (si accendono con cb.horror, che
// draghi.js mette quando la campagna è una di horror.js). Aggiungono al combattimento normale:
// - la creatura che non si uccide (tratto immortale): non scende mai sotto 1 PF; ferita a fondo o bruciata (temeFuoco)
//   scappa nei condotti: è "scacciata" (cb.scacciato)
// - munizioni contate (le armi da fuoco senza colpi non sparano) e rumore: gli spari, le esplosioni e il diversivo
//   alzano cb.rumore, e con tanto rumore la creatura arriva dalla grata più vicina (cb.entra)
// - gli armadietti: chi ci si chiude dentro non si può colpire; la creatura annusa in giro (prova di Furtività) e se non
//   trova nessuno se ne va; anche gli altri nemici, dopo due turni senza bersagli, smettono di cercare
// - gli oggetti: kit medico (il doppio se lo usa un medico), diversivo e razzo (attirano), fumogeno (nasconde), molotov,
//   bomba a tubo, mina EMP; il tecnico hackera gli androidi vicini e li spegne; il flesher compare alle spalle
// - SENZA ARMI (cb.senzaArmi, il manicomio): non si attacca; ci si nasconde, si distrae o si SCAPPA (prova di
//   Atletica): quando tutti quelli in piedi sono scappati lo scontro finisce con «fuga»; il Dr. Trager taglia le dita
const R = require('./regole');
const B = require('./base');
const { CLASSI } = require('./classi');
const M = require('./mappe');
const H = require('./horror');
const { Combattimento, CELLA } = require('./combattimento');

const P = Combattimento.prototype;
const prima = { danneggia: P.danneggia, attacchiDi: P.attacchiDi, attacca: P.attacca, bersaglioPreferito: P.bersaglioPreferito, iaMostro: P.iaMostro, muovi: P.muovi, azioneSemplice: P.azioneSemplice, vista: P.vista, iniziaTurno: P.iniziaTurno, controllaFine: P.controllaFine, iaPersonaggio: P.iaPersonaggio };
const tratto = (c, t) => (c.ref.tratti || []).includes(t);
const RUMORE_ARRIVA = 6;

P.scaccia = function (c, perche) {
  if (c.fuggito) return;
  c.fuggito = true; c.scacciato = true; this.scacciato = c.ref.id || c.ref.nome;
  this.evento({ tipo: 'fuga', id: c.id, testo: `${c.ref.nome} urla e sparisce in un condotto: ${perche}. Per ora è scacciato.` });
  this.controllaFine();
};
P.danneggia = function (c, quanti, tipo, opz = {}) {
  if (!this.horror || c.pg || !tratto(c, 'immortale')) return prima.danneggia.call(this, c, quanti, tipo, opz);
  const subiti = R.applicaDanno(c.ref, quanti, tipo, opz);
  if (quanti > 0) this.ultimoDannoRound = this.round;
  if (c.ref.pf <= 0) { c.ref.pf = 1; c.ref.morto = false; }
  if (tipo === 'fuoco' && tratto(c, 'temeFuoco')) this.fuocoSulCacciatore = true;
  // se ha imparato che usate il fuoco, a volte non scappa (cb.fuocoImparato: 0-1, dalla mente della creatura)
  if (tipo === 'fuoco' && tratto(c, 'temeFuoco') && Math.random() < 0.6 * (this.fuocoImparato || 0)) this.evento({ tipo: 'nota', testo: `🧠 ${c.ref.nome} si scansa dalle fiamme… e resta.` });
  else if (tipo === 'fuoco' && tratto(c, 'temeFuoco')) this.scaccia(c, 'odia il fuoco');
  else if (c.ref.pf <= c.ref.pfMax * 0.4) this.scaccia(c, 'è ferita e si ritira');
  return subiti;
};
// munizioni: le armi che le chiedono e non ne hanno non compaiono
P.attacchiDi = function (c) {
  const lista = prima.attacchiDi.call(this, c);
  if (!this.horror || !c.pg) return lista;
  return lista.filter((a) => { const def = B.ARMI[a.id]; return !def || !def.munizioni || H.conta(c.ref, def.munizioni) > 0; });
};
P.attacca = function (id, bersaglioId, opz = {}) {
  const ber = this.c(bersaglioId);
  if (this.horror && this.senzaArmi && this.attivo && this.attivo.pg) return { errore: 'Qui non hai armi: nasconditi, distraili o scappa' };
  if (this.horror && ber && ber.armadietto) return { errore: `${ber.ref.nome} è chiuso in un armadietto` };
  const c = this.attivo;
  const r = prima.attacca.call(this, id, bersaglioId, opz);
  if (this.horror && r.ok && c && c.pg && r.ev) {
    const def = B.ARMI[r.ev.armaId || ''] || Object.values(B.ARMI).find((x) => x.nome === r.ev.arma);
    if (def && def.munizioni) H.togli(c.ref, def.munizioni, 1);
    if (def && (def.prop.includes('rumorosa') || def.prop.includes('fiamma'))) this.fai(def.prop.includes('rumorosa') ? 3 : 1);
  }
  // il Dr. Trager: se ti prende, ti taglia un dito (ogni due dita perse, un punto di Destrezza in meno)
  if (this.horror && r.ok && c && !c.pg && r.ev && r.ev.colpito && tratto(c, 'tagliaDita') && ber && ber.pg && Math.random() < 0.6) { const t = H.tagliaDito(ber.ref); if (t) R.ricalcola(ber.ref); if (t) this.evento({ tipo: 'nota', id: ber.id, testo: t }); }
  return r;
};
// tutti quelli ancora in piedi sono scappati: lo scontro finisce senza vincitori (chi resta a terra non si salva)
P.controllaFine = function () {
  if (this.horror && !this.finito) {
    const gruppo = this.creature.filter((x) => x.lato === 'gruppo');
    if (gruppo.some((x) => x.scappato) && !gruppo.some((x) => !x.scappato && this.inPiedi(x))) {
      this.finito = 'fuga'; this.fineAnnunciata = true;
      this.evento({ tipo: 'fine', esito: 'fuga', testo: 'Siete scappati: per ora siete vivi.' });
      return;
    }
  }
  return prima.controllaFine.call(this);
};
// i compagni del computer senza armi: nascondersi, se no scappare
P.iaPersonaggio = function (c, furbo) {
  if (!this.horror || !this.senzaArmi) return prima.iaPersonaggio.call(this, c, furbo);
  if (c.armadietto || !c.turno.azione) return false;
  if (!this.azioneSemplice(c.id, 'armadietto').errore) return true;
  return !this.azioneSemplice(c.id, 'scappa').errore;
};
P.fai = function (rumore) { this.rumore = Math.min(10, (this.rumore || 0) + rumore); };
// chi è nell'armadietto o nel fumo non si vede
P.bersaglioPreferito = function (c, furbo) {
  if (!this.horror) return prima.bersaglioPreferito.call(this, c, furbo);
  const nascosti = this.creature.filter((x) => x.armadietto || (x.fumo && this.dist(c, x) > CELLA));
  for (const x of nascosti) x._via = x.x, x.x = -999; // fuori portata solo per la scelta
  const b = prima.bersaglioPreferito.call(this, c, furbo);
  for (const x of nascosti) x.x = x._via;
  return b && !b.armadietto ? b : null;
};
P.muovi = function (id, x, y) {
  const c = this.attivo;
  const r = prima.muovi.call(this, id, x, y);
  if (this.horror && r.ok && c && c.armadietto) { c.armadietto = false; this.evento({ tipo: 'nota', id: c.id, testo: `${c.ref.nome} esce dall'armadietto.` }); }
  return r;
};
P.iniziaTurno = function () {
  prima.iniziaTurno.call(this);
  const c = this.attivo;
  if (this.horror && c) { if (c.fumo && --c.fumo <= 0) c.fumo = 0; if (c.distratto) c.distratto--; }
};
P.iaMostro = function (c, furbo) {
  if (!this.horror) return prima.iaMostro.call(this, c, furbo);
  const t = c.turno;
  // distratto da un diversivo: va verso il rumore e perde il turno
  if (c.distratto && c.verso) { if (!c.mossoIA) { c.mossoIA = true; const fin = { x: c.verso.x, y: c.verso.y, ref: { pf: 1 }, lato: 'x' }; this.avvicina(c, fin, CELLA); return true; } c.mossoIA = false; return false; }
  // il flesher compare alle spalle
  if (tratto(c, 'teletrasporto') && t.movimento > 0 && !c.saltato && Math.random() < 0.5) {
    const b = this.bersaglioPreferito(c, furbo);
    if (b && this.dist(c, b) > CELLA * 2) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const x = b.x + dx, y = b.y + dy;
        if (x >= 0 && y >= 0 && x < this.scena.w && y < this.scena.h && M.passabile(this.scena.g[y * this.scena.w + x]) && !this.occupata(x, y)) { c.x = x; c.y = y; c.saltato = true; this.evento({ tipo: 'nota', id: c.id, testo: `${c.ref.nome} sparisce in un lampo e ricompare alle spalle di ${b.ref.nome}!` }); return true; }
      }
    }
  }
  const b = this.bersaglioPreferito(c, furbo);
  if (b) { c.senzaPreda = 0; return prima.iaMostro.call(this, c, furbo); }
  if (c.cercato) { c.cercato = false; return false; }
  c.cercato = true;
  // nessuno in vista: annusa intorno agli armadietti (Furtività contro la sua Percezione)
  const nascosti = this.creature.filter((x) => x.lato !== c.lato && this.vivo(x) && x.armadietto && this.dist(c, x) <= CELLA * 4);
  for (const x of nascosti) {
    const cd = 10 + (c.ref.mod ? c.ref.mod.sag : 0) + (tratto(c, 'sensiAcuti') ? 3 : 0) + Math.floor((this.rumore || 0) / 2);
    const pr = R.prova(x.ref, 'furtivita', { cd, venti: this.ventiPer(x) });
    if (pr.riuscita) this.evento({ tipo: 'nota', id: x.id, testo: `${c.ref.nome} annusa davanti all'armadietto di ${x.ref.nome}… (Furtività ${pr.totale} contro ${cd}: non lo trova)` });
    else { x.armadietto = false; this.evento({ tipo: 'nota', id: x.id, testo: `${c.ref.nome} spalanca l'armadietto: ha trovato ${x.ref.nome}! (Furtività ${pr.totale} contro ${cd})` }); return prima.iaMostro.call(this, c, furbo); }
  }
  c.senzaPreda = (c.senzaPreda || 0) + 1;
  if (c.senzaPreda >= 2) {
    c.fuggito = true; c.ref.px = 0; c.seneVa = true;
    this.evento({ tipo: 'fuga', id: c.id, testo: tratto(c, 'cacciatore') ? `${c.ref.nome} non trova nessuno e risale nei condotti.` : `${c.ref.nome} smette di cercare e se ne va.` });
    this.controllaFine();
  }
  return false;
};
// la creatura arriva in mezzo allo scontro (dalla grata più lontana dal gruppo, o dal bordo)
P.entra = function (ref) {
  const { w, g } = this.scena;
  const grate = [];
  for (let i = 0; i < g.length; i++) if (g[i] === 'v') grate.push({ x: i % w, y: Math.floor(i / w) });
  const gruppo = this.creature.filter((c) => c.lato === 'gruppo' && this.vivo(c));
  const lontananza = (p) => Math.min(...gruppo.map((c) => Math.hypot(c.x - p.x, c.y - p.y)), 99);
  const da = grate.sort((a, b) => lontananza(b) - lontananza(a))[0] || this.scena.partenzaNemici[0] || { x: 1, y: 1 };
  const pos = this.cellaLibera(da);
  const c = { id: ref.uid || `p${this.creature.length}`, lato: 'nemici', ref, x: pos.x, y: pos.y, iniziativa: 99, sorpreso: false, turno: null, pg: false };
  ref.uid = c.id;
  this.creature.push(c);
  this.ordine.splice(this.indice + 1, 0, c.id);
  this.evento({ tipo: 'nota', id: c.id, testo: `Un rumore nel condotto… ${ref.nome} esce dalla grata!` });
  return c;
};
P.azioneSemplice = function (id, tipo, extra = {}) {
  if (!this.horror || !['armadietto', 'oggetto', 'hackera', 'scappa'].includes(tipo)) return prima.azioneSemplice.call(this, id, tipo, extra);
  const c = this.attivo;
  if (!c || c.id !== id) return { errore: 'Non è il tuo turno' };
  const p = c.ref;
  const { w, h, g } = this.scena;
  const vicino = (ch) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1], [0, 0]].some(([dx, dy]) => { const x = c.x + dx, y = c.y + dy; return x >= 0 && y >= 0 && x < w && y < h && g[y * w + x] === ch; });
  if (tipo === 'armadietto') {
    if (c.armadietto) return { errore: 'Sei già nell\'armadietto: muoviti per uscire' };
    if (!vicino('a') && !vicino('l')) return { errore: 'Non c\'è un armadietto (o un letto) vicino a te' };
    if (!c.turno.azione) return { errore: 'Hai già usato l\'azione' };
    c.turno.azione = false; c.armadietto = true;
    this.evento({ tipo: 'nota', id, testo: `${p.nome} si chiude in un nascondiglio e trattiene il respiro.` });
    return { ok: true };
  }
  if (tipo === 'scappa') {
    if (!c.pg) return { errore: 'Solo i personaggi scappano' };
    if (!c.turno.azione) return { errore: 'Hai già usato l\'azione' };
    c.turno.azione = false;
    const addosso = this.creature.some((x) => x.lato !== c.lato && this.inPiedi(x) && this.dist(c, x) <= CELLA);
    const cd = 11 + (addosso ? 3 : 0);
    const pr = R.prova(p, 'atletica', { cd, venti: this.ventiPer(c) });
    if (pr.riuscita) { c.scappato = true; c.fuggito = true; c.armadietto = false; this.evento({ tipo: 'fuga', id, testo: `${p.nome} corre via e si infila in un corridoio buio: è scappato! (Atletica ${pr.totale} contro ${cd})` }); this.controllaFine(); }
    else this.evento({ tipo: 'nota', id, testo: `${p.nome} prova a scappare ma inciampa (Atletica ${pr.totale} contro ${cd}).` });
    return { ok: true };
  }
  if (tipo === 'hackera') {
    if (!c.pg || !(CLASSI[p.classe] && CLASSI[p.classe].hacker)) return { errore: 'Solo il tecnico informatico sa hackerare' };
    const b = this.c(extra.bersaglio);
    if (!b || !this.vivo(b) || !tratto(b, 'androide') || this.dist(c, b) > CELLA) return { errore: 'Serve un androide vicino a te' };
    if (!c.turno.azione) return { errore: 'Hai già usato l\'azione' };
    c.turno.azione = false;
    const cd = 10 + Math.round(Number(b.ref.gs) || 1);
    const pr = R.prova(p, 'indagare', { cd, venti: this.ventiPer(c) });
    if (pr.riuscita) { b.fuggito = true; b.spento = true; this.evento({ tipo: 'fuga', id: b.id, testo: `${p.nome} infila il cavo nel collo di ${b.ref.nome}: «Arresto di emergenza». Si spegne. (${pr.totale} contro ${cd})` }); this.controllaFine(); }
    else this.evento({ tipo: 'nota', id, testo: `${p.nome} prova a hackerare ${b.ref.nome}, ma il codice non entra (${pr.totale} contro ${cd}).` });
    return { ok: true };
  }
  // un oggetto dallo zaino
  const ogg = String(extra.oggetto || '');
  const def = H.OGGETTI[ogg];
  if (!c.pg || !def || def.tipo !== 'uso' || !H.conta(p, ogg)) return { errore: 'Non hai quell\'oggetto' };
  if (!c.turno.azione) return { errore: 'Hai già usato l\'azione' };
  if (ogg === 'kitMedico') {
    const b = this.c(extra.bersaglio) || c;
    if (b.lato !== c.lato || this.dist(c, b) > CELLA) return { errore: 'Deve essere vicino a te' };
    c.turno.azione = false; H.togli(p, ogg);
    const volte = (CLASSI[p.classe] && CLASSI[p.classe].cura) || 1;
    let q = 0; for (let k = 0; k < volte; k++) q += R.tira(def.cura).totale;
    q = R.cura(b.ref, q);
    this.evento({ tipo: 'cura', id: b.id, quanti: q, testo: `${p.nome} usa un kit medico su ${b === c ? 'sé stesso' : b.ref.nome}: +${q} PF.` });
    return { ok: true };
  }
  if (!def.lancio) return { errore: 'Questo non si usa in combattimento' };
  const pt = extra.punto && Number.isFinite(Number(extra.punto.x)) ? { x: Math.round(Number(extra.punto.x)), y: Math.round(Number(extra.punto.y)) } : null;
  if (!pt || pt.x < 0 || pt.y < 0 || pt.x >= w || pt.y >= h) return { errore: 'Scegli dove lanciarlo' };
  if (Math.max(Math.abs(pt.x - c.x), Math.abs(pt.y - c.y)) * CELLA > 12) return { errore: 'Troppo lontano (massimo 12 metri)' };
  if (!M.vista(this.scena, c.x, c.y, pt.x, pt.y)) return { errore: 'Non vedi quel punto' };
  c.turno.azione = false; H.togli(p, ogg);
  const area = { forma: 'sfera', m: 3 };
  if (def.danno) {
    const contro = ogg === 'minaEmp' ? (x) => tratto(x, 'androide') : () => true;
    this.evento({ tipo: 'nota', id, testo: `${p.nome} lancia: ${def.nome}!` });
    const presi = this.inArea(c, pt, area).filter(contro);
    for (const x of presi) {
      const ts = this.tiroSalvezza(x, 'des', 13);
      const tot = R.tira(def.danno).totale, q = ts.riuscita ? Math.floor(tot / 2) : tot;
      const sub = this.danneggia(x, q, def.tipoDanno, { da: c });
      this.evento({ tipo: 'attacco', da: c.id, a: x.id, arma: def.nome, colpito: true, danno: sub, testo: `${x.ref.nome}: ${sub} danni da ${def.tipoDanno}${ts.riuscita ? ' (si scansa a metà)' : ''}.` });
      if (ogg === 'minaEmp' && !x.fuggito && this.vivo(x)) { this.mettiCondizione(x, 'stordito', { da: id, turni: 2 }); }
    }
    this.fai(ogg === 'bombaTubo' ? 6 : ogg === 'molotov' ? 2 : 1);
  } else if (ogg === 'fumogeno') {
    for (const x of this.inArea(c, pt, area)) if (x.lato === c.lato) x.fumo = 3;
    this.evento({ tipo: 'nota', id, testo: `${p.nome} lancia un fumogeno: chi è nella nube non si vede da lontano.` });
  } else {
    // diversivo e razzo: i nemici che sentono vanno verso il rumore
    for (const x of this.creature.filter((q) => q.lato !== c.lato && this.vivo(q) && !tratto(q, 'androide'))) { x.distratto = 2; x.verso = pt; }
    this.evento({ tipo: 'nota', id, testo: `${p.nome} lancia ${def.nome.toLowerCase()}: ${ogg === 'razzo' ? 'una luce rossa sfrigola e' : 'il congegno strilla e'} i nemici si girano verso il rumore.` });
    this.fai(3);
  }
  this.controllaFine();
  return { ok: true };
};
P.vista = function () {
  const v = prima.vista.call(this);
  if (!this.horror) return v;
  for (const x of v.creature) { const c = this.c(x.id); x.armadietto = !!c.armadietto; x.fumo = !!c.fumo; x.androide = tratto(c, 'androide'); x.immortale = tratto(c, 'immortale'); }
  v.rumore = this.rumore || 0;
  v.horror = true;
  return v;
};

module.exports = { RUMORE_ARRIVA };
