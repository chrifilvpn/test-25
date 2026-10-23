// DRAGHI E SEGRETE: il combattimento sulla griglia tattica (quadretti da 1,5 metri). Iniziativa, turni con azione,
// azione bonus, reazione e movimento; attacchi con vantaggio e svantaggio (condizioni, prono, invisibile, tattica di
// branco, distanza, nemici vicini), copertura, colpi critici, resistenze; attacchi di opportunità; incantesimi con
// tiro per colpire, tiri salvezza e aree (sfera, cono, linea, cubo), concentrazione; privilegi di classe (ira,
// attacco furtivo, punizione divina, azione impetuosa, raffica di colpi, ispirazione…); tiri contro la morte.
// I mostri e i compagni del computer giocano da soli (ia), con tre livelli di furbizia.
const R = require('./regole');
const B = require('./base');
const { CLASSI } = require('./classi');
const { INCANTESIMI } = require('./incantesimi');
const M = require('./mappe');

const CELLA = 1.5;
const durataInTurni = (durata) => { const s = String(durata || ''); if (/round/.test(s)) return 1; if (/minut/.test(s)) return 10 * (parseInt(s, 10) || 1); if (/or[ae]/.test(s)) return 600; return 10; };
const nomeDi = (c) => c.ref.nome;

class Combattimento {
  // gruppo: personaggi (oggetti di regole.creaPersonaggio, modificati sul posto); nemici: oggetti di regole.mostroDa;
  // alleati: altre creature dalla parte del gruppo (mostroDa); sorpresa: 'gruppo' | 'nemici' | null (chi è sorpreso)
  constructor({ scena, gruppo, nemici, alleati = [], sorpresa = null, livelloIA = 'medio' }) {
    this.scena = scena;
    this.livelloIA = livelloIA;
    this.round = 1;
    this.eventi = []; this.nEv = 0;
    this.creature = [];
    const posti = (lista) => lista.slice();
    const pg = posti(scena.partenzaGruppo), pn = posti(scena.partenzaNemici);
    const metti = (ref, lato, liberi) => {
      const pos = liberi.find((p) => !this.creature.some((c) => c.x === p.x && c.y === p.y)) || this.cellaLibera(liberi[0] || { x: 1, y: 1 });
      const c = { id: ref.uid || `p${this.creature.length}`, lato, ref, x: pos.x, y: pos.y, iniziativa: 0, sorpreso: sorpresa === lato, turno: null, pg: !!ref.pg };
      if (!ref.uid) ref.uid = c.id;
      this.creature.push(c);
      return c;
    };
    for (const p of gruppo) if (!p.morto) metti(p, 'gruppo', pg);
    for (const a of alleati) metti(a, 'gruppo', pg);
    for (const m of nemici) metti(m, 'nemici', pn);
    // iniziativa: d20 + Destrezza (le creature uguali dei nemici tirano insieme, come al tavolo)
    const perNome = {};
    for (const c of this.creature) {
      const des = c.ref.mod ? c.ref.mod.des : 0;
      if (!c.pg && c.lato === 'nemici' && perNome[c.ref.nome] != null) { c.iniziativa = perNome[c.ref.nome]; continue; }
      const vant = c.pg && R.privilegiDi(c.ref).some((p) => p.nome === 'Istinto ferino');
      c.iniziativa = R.d20({ vantaggio: vant }).valore + des + (des / 100);
      if (!c.pg && c.lato === 'nemici') perNome[c.ref.nome] = c.iniziativa;
    }
    this.ordine = this.creature.slice().sort((a, b) => b.iniziativa - a.iniziativa).map((c) => c.id);
    this.indice = 0;
    this.finito = null;
    this.evento({ tipo: 'inizio', testo: `Iniziativa: ${this.ordine.map((id) => `${nomeDi(this.c(id))} ${Math.floor(this.c(id).iniziativa)}`).join(', ')}` });
    this.iniziaTurno();
  }
  c(id) { return this.creature.find((x) => x.id === id); }
  // il trucco segreto (!win + parola segreta): draghi.js mette in this.venti una funzione che dice (e spegne) se il prossimo
  // d20 di quel personaggio è un 20 naturale
  ventiPer(c) { return !!(c && c.pg && this.venti && this.venti(c)); }
  get attivo() { return this.c(this.ordine[this.indice]); }
  evento(e) { e.n = ++this.nEv; e.round = this.round; this.eventi.push(e); if (this.eventi.length > 400) this.eventi.shift(); return e; }
  vivo(c) { return c && !c.ref.morto && !c.fuggito && !(c.ref.pf <= 0 && !c.pg); }
  inPiedi(c) { return this.vivo(c) && c.ref.pf > 0; }
  nemiciDi(c) { return this.creature.filter((x) => x.lato !== c.lato && this.inPiedi(x)); }
  alleatiDi(c) { return this.creature.filter((x) => x.lato === c.lato && x !== c && this.vivo(x)); }
  occupata(x, y, tranne = null) { return this.creature.some((c) => c !== tranne && this.vivo(c) && c.x === x && c.y === y); }
  cellaLibera(p) {
    const { w, h, g } = this.scena;
    for (let r = 0; r < 20; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = p.x + dx, y = p.y + dy;
      if (x >= 0 && y >= 0 && x < w && y < h && M.passabile(g[y * w + x]) && !this.occupata(x, y)) return { x, y };
    }
    return p;
  }
  // distanza in metri (ogni quadretto 1,5 m, anche in diagonale)
  dist(a, b) { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) * CELLA; }
  condizioni(c) { return c.ref.condizioni || []; }
  ha(c, cond) { return this.condizioni(c).includes(cond); }
  effetto(c, nome) { return (c.ref.effetti || []).find((e) => e.effetto === nome); }
  incapacitato(c) { return ['incapacitato', 'paralizzato', 'stordito', 'privo', 'pietrificato'].some((x) => this.ha(c, x)) || c.ref.pf <= 0; }
  velocita(c) {
    let v = c.ref.velocita || 9;
    if (['afferrato', 'trattenuto', 'paralizzato', 'stordito', 'privo', 'pietrificato'].some((x) => this.ha(c, x))) return 0;
    if (this.effetto(c, 'rallentato') || this.ha(c, 'rallentato')) v /= 2;
    if (this.effetto(c, 'velocita')) v *= 2;
    if (c.rallentatoGelo) v = Math.max(0, v - 3);
    if ((c.ref.esaurimento || 0) >= 2) v /= 2;
    return v;
  }

  // ---------- turni ----------
  iniziaTurno() {
    const c = this.attivo;
    if (!c) return;
    c.turno = { azione: true, bonus: true, movimento: this.velocita(c), attacchi: 0, attacchiMax: this.attacchiPerAzione(c), furtivo: false, colossi: false, colpoDivino: false, disimpegno: false, schivata: false, punizioniBonus: 0, attaccato: false };
    c.reazione = true;
    c.rallentatoGelo = false;
    const ref = c.ref;
    // effetti che finiscono all'inizio del turno di chi li ha lanciati
    for (const x of this.creature) {
      if (!x.ref.effetti) continue;
      x.ref.effetti = x.ref.effetti.filter((e) => { if (e.da === c.id && e.durataTurni != null) { e.durataTurni--; return e.durataTurni > 0; } return true; });
      if (x.ref.pg) R.ricalcola(x.ref);
    }
    for (const x of this.creature) if (x.condTurni) { for (const [k, v] of Object.entries(x.condTurni)) if (v.da === c.id) { v.turni--; if (v.turni <= 0) { this.togliCondizione(x, k); delete x.condTurni[k]; } } }
    if (ref.morto) return this.prossimo();
    // a terra: tiro contro la morte
    if (c.pg && ref.pf <= 0) {
      if (!ref.stabile) {
        const t = R.tiroMorte(ref, { venti: this.ventiPer(c) });
        this.evento({ tipo: 'morte', id: c.id, testo: `${ref.nome} tira contro la morte: ${t.valore} (${t.esito}; ${t.successi} successi, ${t.fallimenti} fallimenti)`, tiro: t });
        if (ref.morto) this.evento({ tipo: 'muore', id: c.id, testo: `${ref.nome} è morto.` });
      }
      if (ref.pf <= 0) return this.prossimo();
    }
    // rigenerazione e simili
    if (!c.pg && c.ref.tratti) {
      if (c.ref.tratti.includes('rigenerazioneTroll') && !c.bruciato && ref.pf > 0) { R.cura(ref, 10); }
      if (c.ref.tratti.includes('rigenerazione10') && ref.pf > 0) R.cura(ref, 10);
      c.bruciato = false;
      if (c.ref.soffio && !c.ref.soffio.pronto && R.d(6) >= 5) c.ref.soffio.pronto = true;
    }
    if (c.pg && R.haEffetto(ref, 'sopravvissuto') && ref.pf > 0 && ref.pf < ref.pfMax / 2) R.cura(ref, 5 + ref.mod.cos);
    if (c.sorpreso && this.round === 1) { c.sorpreso = false; this.evento({ tipo: 'nota', id: c.id, testo: `${ref.nome} è sorpreso e perde il turno.` }); return this.prossimo(); }
    if (this.incapacitato(c)) { this.evento({ tipo: 'nota', id: c.id, testo: `${ref.nome} non può agire (${this.condizioni(c).join(', ')}).` }); this.fineTurnoCondizioni(c); return this.prossimo(); }
    this.evento({ tipo: 'turno', id: c.id, testo: `Tocca a ${ref.nome}.` });
  }
  attacchiPerAzione(c) {
    if (!c.pg) return c.ref.multi || 1;
    const p = c.ref, L = p.livello;
    if (R.haEffetto(p, 'attacchiGuerriero')) return L >= 20 ? 4 : L >= 11 ? 3 : 2;
    if (R.haEffetto(p, 'attacchi2')) return 2;
    return 1;
  }
  // alla fine del turno: tiri salvezza per scrollarsi di dosso le condizioni che lo permettono
  fineTurnoCondizioni(c) {
    if (!c.condTurni) return;
    for (const [k, v] of Object.entries(c.condTurni)) {
      if (!v.ripete) continue;
      const ts = this.tiroSalvezza(c, v.ts, v.cd, {});
      if (ts.riuscita) { this.togliCondizione(c, k); delete c.condTurni[k]; this.evento({ tipo: 'nota', id: c.id, testo: `${nomeDi(c)} si libera (${k}).` }); }
    }
  }
  fineTurno(id) {
    const c = this.attivo;
    if (!c || (id && c.id !== id)) return { errore: 'Non è il tuo turno' };
    this.fineTurnoCondizioni(c);
    if (this.effetto(c, 'ira') && c.turno && !c.turno.attaccato && !c.ref.effetti.find((e) => e.effetto === 'ira').nuovo) { /* l'ira continua: semplificato */ }
    for (const e of c.ref.effetti || []) delete e.nuovo;
    return this.prossimo();
  }
  prossimo() {
    this.controllaFine();
    if (this.finito) return { ok: true };
    for (let k = 0; k < this.ordine.length + 1; k++) {
      this.indice++;
      if (this.indice >= this.ordine.length) { this.indice = 0; this.round++; this.evento({ tipo: 'round', testo: `Round ${this.round}` }); }
      const c = this.attivo;
      if (c && !c.ref.morto && !c.fuggito && (c.pg || c.ref.pf > 0)) { this.iniziaTurno(); this.controllaFine(); return { ok: true }; }
    }
    return { ok: true };
  }
  controllaFine() {
    if (!this.finito && (this.round - (this.ultimoDannoRound || 1) >= 8 || this.round > 60)) {
      for (const c of this.creature) if (c.lato === 'nemici' && this.inPiedi(c)) c.fuggito = true;
      this.evento({ tipo: 'fuga', testo: 'Lo scontro si blocca: i nemici rimasti si ritirano.' });
    }
    const gruppo = this.creature.filter((c) => c.lato === 'gruppo');
    const nemici = this.creature.filter((c) => c.lato === 'nemici');
    if (!nemici.some((c) => this.inPiedi(c))) this.finito = 'vittoria';
    else if (!gruppo.some((c) => this.inPiedi(c))) this.finito = 'sconfitta';
    if (this.finito && !this.fineAnnunciata) {
      this.fineAnnunciata = true;
      this.evento({ tipo: 'fine', esito: this.finito, testo: this.finito === 'vittoria' ? 'Vittoria! I nemici sono sconfitti.' : 'Il gruppo è caduto…' });
    }
  }
  pxGuadagnati() { return this.creature.filter((c) => c.lato === 'nemici' && (c.ref.morto || c.ref.pf <= 0 || c.fuggito)).reduce((s, c) => s + (c.ref.px || 0), 0); }

  // ---------- movimento ----------
  // le celle raggiungibili con il movimento rimasto (costo in metri), evitando i nemici; gli alleati si attraversano
  raggiungibili(c, metri = c.turno ? c.turno.movimento : this.velocita(c)) {
    const { w, h, g } = this.scena;
    const costo = new Array(w * h).fill(Infinity), da = new Array(w * h).fill(-1);
    const nem = new Set(this.nemiciDi(c).map((x) => x.y * w + x.x));
    const s = c.y * w + c.x; costo[s] = 0;
    const coda = [s];
    while (coda.length) {
      let bi = 0; for (let k = 1; k < coda.length; k++) if (costo[coda[k]] < costo[coda[bi]]) bi = k;
      const i = coda.splice(bi, 1)[0];
      const x = i % w, y = Math.floor(i / w);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx, ch = g[j];
        if (!M.passabile(ch) || nem.has(j)) continue;
        if (dx && dy && (!M.passabile(g[y * w + xx]) || !M.passabile(g[yy * w + x]))) continue;
        const nc = costo[i] + (M.DIFFICILE.has(ch) || (this.ha(c, 'prono')) ? CELLA * 2 : CELLA);
        if (nc > metri + 1e-9 || nc >= costo[j]) continue;
        costo[j] = nc; da[j] = i; coda.push(j);
      }
    }
    return { costo, da };
  }
  muovi(id, x, y) {
    const c = this.attivo;
    if (!c || c.id !== id) return { errore: 'Non è il tuo turno' };
    x = Math.round(Number(x)); y = Math.round(Number(y));
    const { w, h } = this.scena;
    if (!(x >= 0 && y >= 0 && x < w && y < h)) return { errore: 'Fuori dalla mappa' };
    if (x === c.x && y === c.y) return { errore: 'Sei già lì' };
    if (this.occupata(x, y, c)) return { errore: 'Lì c\'è già qualcuno' };
    const { costo, da } = this.raggiungibili(c);
    const j = y * w + x;
    if (costo[j] === Infinity) return { errore: `Non ci arrivi: ti restano ${c.turno.movimento} metri` };
    const percorso = [];
    for (let i = j; i !== c.y * w + c.x && i >= 0; i = da[i]) percorso.unshift({ x: i % w, y: Math.floor(i / w) });
    // si cammina un passo alla volta: chi esce dalla portata di un nemico subisce l'attacco di opportunità
    const fatto = [{ x: c.x, y: c.y }];
    for (const p of percorso) {
      const prima = { x: c.x, y: c.y };
      const minaccianti = this.nemiciDi(c).filter((n) => !this.incapacitato(n) && n.reazione && this.portataMischia(n) >= this.dist(n, prima) && this.portataMischia(n) < this.dist(n, p));
      c.x = p.x; c.y = p.y; fatto.push({ ...p });
      if (!c.turno.disimpegno) for (const n of minaccianti) {
        n.reazione = false;
        const a = this.miglioreAttaccoMischia(n);
        if (a) { this.evento({ tipo: 'nota', id: n.id, testo: `${nomeDi(n)} attacca ${nomeDi(c)} che si allontana (attacco di opportunità)` }); this.risolviAttacco(n, c, a, { opportunita: true, posAtt: prima }); }
        if (!this.inPiedi(c)) break;
      }
      if (!this.inPiedi(c)) break;
    }
    // caduto a metà strada sopra un alleato: resta nell'ultima casella libera
    if (this.occupata(c.x, c.y, c)) { const libera = fatto.slice().reverse().find((q) => !this.occupata(q.x, q.y, c)) || this.cellaLibera(c); c.x = libera.x; c.y = libera.y; }
    c.turno.movimento = Math.max(0, Math.round((c.turno.movimento - costo[j]) * 10) / 10);
    this.evento({ tipo: 'movimento', id: c.id, percorso: fatto, testo: `${nomeDi(c)} si muove.` });
    this.controllaFine();
    return { ok: true };
  }
  portataMischia(c) {
    if (c.pg) return Math.max(CELLA, ...c.ref.attacchi.filter((a) => a.mischia).map((a) => a.portata || CELLA));
    return Math.max(CELLA, ...c.ref.attacchi.filter((a) => !a.gittata).map((a) => a.portata || CELLA));
  }
  miglioreAttaccoMischia(c) {
    const lista = this.attacchiDi(c).filter((a) => a.mischia);
    return lista.sort((a, b) => R.media(b.danno) - R.media(a.danno))[0] || null;
  }
  // attacchi possibili: per i personaggi quelli delle armi; per i mostri quelli della scheda
  attacchiDi(c) {
    if (c.pg) return c.ref.attacchi.map((a) => ({ ...a, arma: true }));
    return c.ref.attacchi.map((a) => ({ id: a.nome, nome: a.nome, colpire: a.bonus, danno: a.danno, tipo: a.tipo, mischia: !a.gittata, portata: a.portata || CELLA, gittata: a.gittata ? [a.gittata, a.gittata * 3] : null, arma: true, mostro: a }));
  }

  // ---------- attacchi ----------
  vantaggiAttacco(att, ber, a, posAtt = att) {
    const v = [], s = [];
    const d = this.dist(posAtt, ber);
    if (this.ha(att, 'invisibile') || this.effetto(att, 'invisibile') || this.effetto(att, 'invisibileSup')) v.push('invisibile');
    if (['paralizzato', 'stordito', 'privo', 'trattenuto', 'accecato', 'pietrificato'].some((x) => this.ha(ber, x))) v.push(`bersaglio ${this.condizioni(ber).join(', ')}`);
    if (this.ha(ber, 'prono')) { if (d <= CELLA) v.push('bersaglio a terra'); else s.push('bersaglio a terra (da lontano)'); }
    if (this.ha(ber, 'illuminato')) v.push('luminescenza');
    if (ber.irruento) v.push('si è scoperto attaccando');
    if (att.irruentoOra && a.mischia) v.push('attacco irruento');
    if (ber.aiutatoContro && ber.aiutatoContro.lato === att.lato) { v.push('aiuto di un alleato'); ber.aiutatoContro = null; }
    if (this.effetto(att, 'accurato')) { v.push('colpo accurato'); att.ref.effetti = att.ref.effetti.filter((e) => e.effetto !== 'accurato'); }
    if (!att.pg && (att.ref.tratti || []).includes('branco') && this.alleatiDi(att).some((x) => this.inPiedi(x) && this.dist(x, ber) <= CELLA)) v.push('tattica di branco');
    if (ber.dardoGuida) { v.push('segno di luce'); ber.dardoGuida = false; }
    if (['avvelenato', 'spaventato', 'prono', 'trattenuto', 'accecato'].some((x) => this.ha(att, x))) s.push(this.condizioni(att).filter((x) => ['avvelenato', 'spaventato', 'prono', 'trattenuto', 'accecato'].includes(x)).join(', '));
    if (this.effetto(att, 'anatema')) s.push('anatema');
    if (!a.mischia) {
      if (this.nemiciDi(att).some((n) => !this.incapacitato(n) && this.dist(n, posAtt) <= CELLA)) s.push('nemico vicino');
      if (a.gittata && d > a.gittata[0]) s.push('lontano');
    }
    if (this.ha(ber, 'invisibile') || this.effetto(ber, 'invisibile') || this.effetto(ber, 'invisibileSup')) s.push('bersaglio invisibile');
    if (this.effetto(ber, 'sfocatura')) s.push('sfocatura');
    if (ber.turno && ber.turno.schivata && !this.incapacitato(ber)) s.push('schivata');
    if (ber.schivando && !this.incapacitato(ber)) s.push('schivata');
    if (!att.pg && (att.ref.tratti || []).includes('sensibileLuce') && this.scena.luce === 'giorno') s.push('luce del sole');
    if (this.effetto(ber, 'protezioneMale') && !att.pg && ['aberrazione', 'celestiale', 'elementale', 'folletto', 'immondo', 'non morto'].includes(String(att.ref.tipo).split(' ')[0])) s.push('protezione dal male');
    if ((att.ref.esaurimento || 0) >= 3) s.push('esaurimento');
    return { vantaggio: v.length > 0, svantaggio: s.length > 0, perche: [...v.map((x) => `+${x}`), ...s.map((x) => `-${x}`)] };
  }
  risolviAttacco(att, ber, a, opz = {}) {
    const posAtt = opz.posAtt || att;
    const { vantaggio, svantaggio, perche } = this.vantaggiAttacco(att, ber, a, posAtt);
    const fortunato = att.pg && R.haEffetto(att.ref, 'fortunato');
    const t = R.d20({ vantaggio, svantaggio, fortunato, venti: this.ventiPer(att) });
    let bonus = a.colpire;
    const extraTiro = [];
    if (att.pg && this.effetto(att, 'benedizione')) { const b = R.d(4); bonus += b; extraTiro.push(`benedizione +${b}`); }
    if (att.pg && this.effetto(att, 'armaSacra')) bonus += Math.max(1, att.ref.mod.car);
    let ca = ber.ref.ca;
    for (const e of ber.ref.effetti || []) if (!ber.pg && (e.effetto === 'ca2')) ca += 2;
    const cop = !a.mischia ? M.copertura(this.scena, posAtt.x, posAtt.y, ber.x, ber.y) : 0;
    ca += cop;
    const sogliaCritico = att.pg && R.haEffetto(att.ref, 'critico18') ? 18 : att.pg && R.haEffetto(att.ref, 'critico19') ? 19 : 20;
    let critico = t.valore >= sogliaCritico;
    let colpito = t.valore !== 1 && (critico || t.valore + bonus >= ca);
    // reazione Scudo del bersaglio (personaggi che lo conoscono, con uno slot): si usa da sola se basta a parare
    if (colpito && !critico && ber.pg && ber.reazione && this.puoLanciare(ber, 'scudo', 1) && t.valore + bonus < ca + 5) {
      this.spendiSlot(ber, 1); ber.reazione = false;
      R.ricalcola(ber.ref);
      ber.ref.effetti.push({ effetto: 'ca5', da: ber.id, durataTurni: 1, nome: 'Scudo' });
      R.ricalcola(ber.ref);
      colpito = false;
      this.evento({ tipo: 'nota', id: ber.id, testo: `${nomeDi(ber)} alza uno Scudo magico (+5 CA)!` });
    }
    if (colpito && (this.ha(ber, 'paralizzato') || this.ha(ber, 'privo')) && this.dist(posAtt, ber) <= CELLA) critico = true;
    const ev = { tipo: 'attacco', da: att.id, a: ber.id, arma: a.nome, tiro: t.dadi, valore: t.valore, bonus, totale: t.valore + bonus, ca, copertura: cop, colpito, critico, perche, danno: 0, extra: extraTiro };
    if (att.turno) att.turno.attaccato = true;
    if (att.irruentoOra) { att.irruento = true; }
    if (this.effetto(att, 'invisibile') && !this.effetto(att, 'invisibileSup')) att.ref.effetti = att.ref.effetti.filter((e) => e.effetto !== 'invisibile');
    if (!colpito) { ev.testo = `${nomeDi(att)} attacca ${nomeDi(ber)} con ${a.nome}: ${t.valore}${R.segno(bonus)} = ${t.valore + bonus} contro CA ${ca}${cop ? ` (copertura +${cop})` : ''}: mancato${t.valore === 1 ? ' (1 naturale)' : ''}.`; this.evento(ev); return ev; }
    // danni
    const parti = [];
    let espr = opz.dueMani && a.versatile ? a.versatile : a.danno;
    if (opz.senzaMod) espr = espr.replace(/[+-]\d+$/, '');
    const armiGrandi = att.pg && att.ref.stili.includes('armiGrandi') && a.mischia && (a.prop || []).some((p) => p === 'due mani' || p === 'versatile');
    const base = R.tira(espr, { critico, minimoDue: armiGrandi });
    let totale = base.totale; parti.push(`${espr}${critico ? ' ×2 dadi' : ''} = ${base.totale}`);
    const aggiungi = (dadi, nome, tipo = null) => { const r = R.tira(dadi, { critico }); totale += r.totale; parti.push(`${nome} ${r.totale}`); return r.totale; };
    let extraTipi = [];
    if (att.pg) {
      const p = att.ref;
      if (this.effetto(att, 'ira') && a.mischia && a.desc === 'Forza') { const b = p.livello >= 16 ? 4 : p.livello >= 9 ? 3 : 2; totale += b; parti.push(`ira +${b}`); }
      // attacco furtivo: arma accurata o a distanza, con vantaggio o un alleato vicino al bersaglio (e senza svantaggio)
      if (R.haEffetto(p, 'furtivo') && !att.turno.furtivo && ((a.prop || []).includes('accurata') || !a.mischia) && !svantaggio && (vantaggio || this.alleatiDi(att).some((x) => this.inPiedi(x) && this.dist(x, ber) <= CELLA))) {
        att.turno.furtivo = true; aggiungi(`${Math.ceil(p.livello / 2)}d6`, 'attacco furtivo');
      }
      if (R.haEffetto(p, 'colossi') && !att.turno.colossi && ber.ref.pf < ber.ref.pfMax) { att.turno.colossi = true; aggiungi('1d8', 'uccisore di colossi'); }
      if (R.haEffetto(p, 'colpoDivino') && !att.turno.colpoDivino) { att.turno.colpoDivino = true; aggiungi(p.livello >= 14 ? '2d8' : '1d8', 'colpo divino'); extraTipi.push('radioso'); }
      if (R.haEffetto(p, 'punizioneMigliorata') && a.mischia) { aggiungi('1d8', 'punizione migliorata'); extraTipi.push('radioso'); }
      if (opz.punizione && a.mischia) {
        const sl = Number(opz.punizione);
        if (this.puoSpendere(att, sl)) {
          this.spendiSlot(att, sl);
          let n = Math.min(5, 1 + sl);
          if (['non morto', 'immondo'].includes(String(ber.ref.tipo || ''))) n++;
          aggiungi(`${n}d8`, `punizione divina (slot ${sl}°)`); extraTipi.push('radioso');
        }
      }
      for (const e of p.effetti || []) {
        if ((e.effetto === 'marchio' || e.effetto === 'maledizione') && e.bersaglio === ber.id) aggiungi('1d6', e.effetto === 'marchio' ? 'marchio' : 'maledizione');
        if (e.effetto === 'punizioneTonante' && a.mischia) { aggiungi('2d6', 'punizione tonante'); p.effetti = p.effetti.filter((x) => x !== e); const ts = this.tiroSalvezza(ber, 'for', p.magia ? p.magia.cd : 13); if (!ts.riuscita) this.mettiCondizione(ber, 'prono'); }
        if (e.effetto === 'punizioneIra' && a.mischia) { aggiungi('1d6', 'punizione irata'); p.effetti = p.effetti.filter((x) => x !== e); const ts = this.tiroSalvezza(ber, 'sag', p.magia ? p.magia.cd : 13); if (!ts.riuscita) this.mettiCondizione(ber, 'spaventato', { da: att.id, ts: 'sag', cd: p.magia ? p.magia.cd : 13, ripete: true, turni: 10 }); }
      }
      if (critico && a.mischia) {
        if (R.haEffetto(p, 'selvaggio')) aggiungi(espr.match(/\d*d\d+/)[0], 'attacchi selvaggi');
        if (R.haEffetto(p, 'criticoBrutale')) aggiungi(`${p.livello >= 17 ? 3 : p.livello >= 13 ? 2 : 1}${(espr.match(/d\d+/) || ['d6'])[0]}`, 'critico brutale');
      }
    } else if (a.mostro) {
      const m = a.mostro;
      if (m.extra) { const [dadi, tipo] = m.extra.split(' '); aggiungi(dadi, tipo); extraTipi.push(tipo); }
      if ((att.ref.tratti || []).includes('vantaggioMarziale') && !att.turno.furtivo && this.alleatiDi(att).some((x) => this.inPiedi(x) && this.dist(x, ber) <= CELLA)) { att.turno.furtivo = true; aggiungi('2d6', 'vantaggio marziale'); }
      if ((att.ref.tratti || []).includes('furtivo4d6') && !att.turno.furtivo && (vantaggio || this.alleatiDi(att).some((x) => this.inPiedi(x) && this.dist(x, ber) <= CELLA))) { att.turno.furtivo = true; aggiungi('4d6', 'attacco furtivo'); }
    }
    // schivata prodigiosa: il bersaglio dimezza il danno con la reazione
    if (ber.pg && ber.reazione && R.haEffetto(ber.ref, 'schivata') && !this.incapacitato(ber)) { ber.reazione = false; totale = Math.floor(totale / 2); parti.push('dimezzato (schivata prodigiosa)'); }
    const magico = !!(att.pg && (a.magica || this.effetto(att, 'armaSacra') || (a.id === 'colpo' && R.privilegiDi(att.ref).some((p) => p.nome === 'Colpi potenziati dal ki'))));
    const subiti = this.danneggia(ber, totale, a.tipo, { critico, arma: true, magico, da: att });
    ev.danno = subiti; ev.parti = parti;
    ev.testo = `${nomeDi(att)} colpisce ${nomeDi(ber)} con ${a.nome}${critico ? ' — CRITICO!' : ''}: ${t.valore}${R.segno(bonus)} = ${t.valore + bonus} contro CA ${ca}. Danni: ${parti.join(', ')} → ${subiti} ${a.tipo}${extraTipi.length ? ` (+${extraTipi.join(', ')})` : ''}.`;
    this.evento(ev);
    // effetti dei colpi dei mostri: veleno, a terra, paralisi, afferrare
    if (a.mostro && this.vivo(ber) && ber.ref.pf > 0) {
      const m = a.mostro;
      if (m.veleno) { const ts = this.tiroSalvezza(ber, m.veleno.ts, m.veleno.cd, { contro: 'veleno' }); if (!ts.riuscita) { if (m.veleno.danno) this.danneggia(ber, R.tira(m.veleno.danno).totale, 'veleno', { da: att }); if (m.veleno.condizione) this.mettiCondizione(ber, m.veleno.condizione, { da: att.id, turni: 10 }); this.evento({ tipo: 'nota', id: ber.id, testo: `${nomeDi(ber)} è avvelenato!` }); } else if (m.veleno.danno) this.danneggia(ber, Math.floor(R.tira(m.veleno.danno).totale / 2), 'veleno', { da: att }); }
      if (m.prono) { const ts = this.tiroSalvezza(ber, 'for', m.prono); if (!ts.riuscita) { this.mettiCondizione(ber, 'prono'); this.evento({ tipo: 'nota', id: ber.id, testo: `${nomeDi(ber)} finisce a terra!` }); } }
      if (m.paralizza) { const ts = this.tiroSalvezza(ber, m.paralizza.ts, m.paralizza.cd); if (!ts.riuscita) { this.mettiCondizione(ber, 'paralizzato', { da: att.id, ts: m.paralizza.ts, cd: m.paralizza.cd, ripete: true, turni: 10 }); this.evento({ tipo: 'nota', id: ber.id, testo: `${nomeDi(ber)} è paralizzato!` }); } }
      if (m.afferra) { this.mettiCondizione(ber, 'afferrato', { da: att.id, turni: 10 }); }
      if (m.condizione) { const ts = this.tiroSalvezza(ber, 'des', 12); if (!ts.riuscita) this.mettiCondizione(ber, m.condizione, { da: att.id, ts: 'for', cd: 12, ripete: true, turni: 10 }); }
      if (m.risucchio) R.cura(att.ref, subiti);
    }
    // armatura di Agathys: chi colpisce in mischia si gela
    if (a.mischia && this.effetto(ber, 'agathys') && ber.ref.pfTemp > 0) this.danneggia(att, this.effetto(ber, 'agathys').freddo || 5, 'freddo', { da: ber });
    if (att.pg && !this.vivo(ber) || (att.pg && ber.ref.pf <= 0 && !ber.pg)) this.uccisione(att, ber);
    return ev;
  }
  danneggia(c, quanti, tipo, opz = {}) {
    const primaPf = c.ref.pf;
    if (quanti > 0) this.ultimoDannoRound = this.round;
    const subiti = R.applicaDanno(c.ref, quanti, tipo, opz);
    if (tipo === 'fuoco' || tipo === 'acido') c.bruciato = true;
    if (c.ref.ultimoEvento === 'concentrazione') { c.ref.ultimoEvento = null; this.fineConcentrazione(c); this.evento({ tipo: 'nota', id: c.id, testo: `${nomeDi(c)} perde la concentrazione.` }); }
    if (c.ref.ultimoEvento === 'tenacia') { c.ref.ultimoEvento = null; this.evento({ tipo: 'nota', id: c.id, testo: `${nomeDi(c)} resiste con tenacia implacabile e resta in piedi!` }); }
    if (primaPf > 0 && c.ref.pf <= 0) {
      if (c.pg) { this.evento({ tipo: 'cade', id: c.id, testo: c.ref.morto ? `${nomeDi(c)} muore sul colpo!` : `${nomeDi(c)} cade a terra, morente!` }); this.fineConcentrazione(c); }
      else {
        // zombi: tenacia da non morto
        if ((c.ref.tratti || []).includes('tenaciaZombi') && tipo !== 'radioso' && !opz.critico && !c.tenaciaUsata) { const ts = R.d(20) + c.ref.mod.cos; if (ts >= 5 + subiti) { c.ref.pf = 1; c.ref.morto = false; this.evento({ tipo: 'nota', id: c.id, testo: `${nomeDi(c)} si rialza barcollando!` }); return subiti; } }
        c.ref.morto = true;
        this.evento({ tipo: 'muore', id: c.id, testo: `${nomeDi(c)} è sconfitto!` });
        this.fineConcentrazione(c);
        if (opz.da && opz.da.pg) this.uccisione(opz.da, c);
      }
    }
    return subiti;
  }
  uccisione(att, ber) {
    if (ber.contato) return; ber.contato = true;
    if (att.pg && R.haEffetto(att.ref, 'benedizioneOscuro')) { att.ref.pfTemp = Math.max(att.ref.pfTemp, att.ref.mod.car + att.ref.livello); this.evento({ tipo: 'nota', id: att.id, testo: `${nomeDi(att)} riceve la benedizione dell'oscuro (+${att.ref.mod.car + att.ref.livello} PF temporanei).` }); }
  }
  tiroSalvezza(c, car, cd, opz = {}) {
    if (c.pg) {
      // aura di protezione: un paladino alleato entro 3 metri aggiunge il suo Carisma
      let aura = 0;
      for (const x of this.creature) if (x.pg && x.lato === c.lato && this.inPiedi(x) && R.haEffetto(x.ref, 'auraProtezione') && this.dist(x, c) <= 3) aura = Math.max(aura, Math.max(1, x.ref.mod.car));
      const r = R.salvezza(c.ref, car, { cd, aura, ...opz, venti: this.ventiPer(c) });
      if (!r.riuscita && R.haEffetto(c.ref, 'indomito') && c.ref.risorse.indomito && c.ref.risorse.indomito.usati < c.ref.risorse.indomito.max && cd - r.totale <= 6) {
        c.ref.risorse.indomito.usati++;
        const r2 = R.salvezza(c.ref, car, { cd, aura, ...opz });
        this.evento({ tipo: 'nota', id: c.id, testo: `${nomeDi(c)} è indomito e ritira il tiro salvezza: ${r2.totale}.` });
        return r2;
      }
      return r;
    }
    const ref = c.ref;
    if (['for', 'des'].includes(car) && ['paralizzato', 'stordito', 'privo', 'pietrificato'].some((x) => this.ha(c, x))) return { riuscita: false, totale: 0, auto: true };
    let vant = false;
    if (opz.contro === 'affascinato' && (ref.tratti || []).includes('fatato')) vant = true;
    const t = R.d20({ vantaggio: vant, svantaggio: (ref.esaurimento || 0) >= 3 });
    const totale = t.valore + (ref.mod ? ref.mod[car] : 0) + (ref.salvezzaBonus || 0);
    let riuscita = totale >= cd;
    if (!riuscita && (ref.tratti || []).includes('resistenzaLeggendaria3') && (ref.leggendarie == null ? (ref.leggendarie = 3) : ref.leggendarie) > 0 && cd - totale > 2) { ref.leggendarie--; riuscita = true; this.evento({ tipo: 'nota', id: c.id, testo: `${nomeDi(c)} usa una resistenza leggendaria!` }); }
    return { riuscita, totale, d20: t };
  }
  mettiCondizione(c, cond, info = null) {
    if (!c.ref.condizioni) c.ref.condizioni = [];
    if (c.ref.immuneCondizioni && c.ref.immuneCondizioni.includes(cond)) return;
    if (!c.ref.condizioni.includes(cond)) c.ref.condizioni.push(cond);
    if (info) { c.condTurni = c.condTurni || {}; c.condTurni[cond] = { da: info.da, turni: info.turni || 10, ripete: !!info.ripete, ts: info.ts, cd: info.cd, inc: info.inc }; }
  }
  togliCondizione(c, cond) { c.ref.condizioni = (c.ref.condizioni || []).filter((x) => x !== cond); }

  // ---------- azioni ----------
  attacca(id, bersaglioId, { arma = null, punizione = null, dueMani = false, bonus = false } = {}) {
    const c = this.attivo;
    if (!c || c.id !== id) return { errore: 'Non è il tuo turno' };
    const ber = this.c(bersaglioId);
    if (!ber || !this.vivo(ber) || ber.lato === c.lato && !ber) return { errore: 'Bersaglio non valido' };
    if (!bonus) {
      if (c.turno.attacchi === 0 && !c.turno.azione) return { errore: 'Hai già usato l\'azione' };
      if (c.turno.attacchi > 0 && c.turno.attacchi >= c.turno.attacchiMax) return { errore: 'Hai finito gli attacchi di questo turno' };
    } else if (!c.turno.bonus) return { errore: 'Hai già usato l\'azione bonus' };
    const lista = this.attacchiDi(c);
    const a = (arma != null ? lista.find((x) => x.id === arma || x.nome === arma) : null) || this.sceltaArma(c, ber);
    if (!a) return { errore: 'Nessuna arma adatta' };
    const d = this.dist(c, ber);
    if (a.mischia && !a.lancio && d > (a.portata || CELLA)) return { errore: `${nomeDi(ber)} è troppo lontano per ${a.nome} (${d} m)` };
    if (a.mischia && a.lancio && d > (a.portata || CELLA) && (!a.gittata || d > a.gittata[1])) return { errore: 'Troppo lontano anche per lanciarla' };
    if (!a.mischia && a.gittata && d > a.gittata[1]) return { errore: `Fuori gittata (${d} m, massimo ${a.gittata[1]} m)` };
    if (!M.vista(this.scena, c.x, c.y, ber.x, ber.y)) return { errore: 'Non lo vedi: qualcosa è in mezzo' };
    const lanciata = a.mischia && a.lancio && d > (a.portata || CELLA);
    const usa = lanciata ? { ...a, mischia: false } : a;
    if (bonus) c.turno.bonus = false;
    else { if (c.turno.attacchi === 0) c.turno.azione = false; c.turno.attacchi++; }
    const ev = this.risolviAttacco(c, ber, usa, { punizione, dueMani });
    this.controllaFine();
    return { ok: true, ev };
  }
  sceltaArma(c, ber) {
    const d = this.dist(c, ber);
    const lista = this.attacchiDi(c).filter((a) => a.id !== 'colpo' || this.attacchiDi(c).length === 1);
    const utili = lista.filter((a) => (a.mischia && d <= (a.portata || CELLA)) || (!a.mischia && a.gittata && d <= a.gittata[1]) || (a.lancio && a.gittata && d <= a.gittata[1]));
    const tutte = utili.length ? utili : this.attacchiDi(c).filter((a) => a.mischia && d <= (a.portata || CELLA));
    return tutte.sort((x, y) => (R.media(y.danno) + y.colpire * 0.5) - (R.media(x.danno) + x.colpire * 0.5))[0] || null;
  }
  azioneSemplice(id, tipo, extra = {}) {
    const c = this.attivo;
    if (!c || c.id !== id) return { errore: 'Non è il tuo turno' };
    const p = c.ref;
    const usaAzione = () => { if (!c.turno.azione) return 'Hai già usato l\'azione'; c.turno.azione = false; return null; };
    const usaBonus = () => { if (!c.turno.bonus) return 'Hai già usato l\'azione bonus'; c.turno.bonus = false; return null; };
    const risorsa = (k) => { const r = p.risorse && p.risorse[k]; if (!r || r.usati >= r.max) return null; r.usati++; return r; };
    const scaltra = c.pg && R.haEffetto(p, 'scaltra');
    let e;
    switch (tipo) {
      case 'scatto': if ((e = extra.bonus && scaltra ? usaBonus() : usaAzione())) return { errore: e }; c.turno.movimento += this.velocita(c); this.evento({ tipo: 'nota', id, testo: `${p.nome} scatta.` }); return { ok: true };
      case 'disimpegno': if ((e = extra.bonus && scaltra ? usaBonus() : usaAzione())) return { errore: e }; c.turno.disimpegno = true; this.evento({ tipo: 'nota', id, testo: `${p.nome} si disimpegna.` }); return { ok: true };
      case 'schivata': if ((e = usaAzione())) return { errore: e }; c.turno.schivata = true; c.schivando = true; this.evento({ tipo: 'nota', id, testo: `${p.nome} si mette in difesa (Schivare).` }); return { ok: true };
      case 'nascondersi': {
        if ((e = extra.bonus && scaltra ? usaBonus() : usaAzione())) return { errore: e };
        const pr = c.pg ? R.prova(p, 'furtivita', { venti: this.ventiPer(c) }) : { totale: R.d(20) + p.mod.des };
        const visto = this.nemiciDi(c).some((n) => (n.ref.percezionePassiva || 10 + (n.ref.mod ? n.ref.mod.sag : 0)) >= pr.totale && M.vista(this.scena, n.x, n.y, c.x, c.y));
        if (!visto) { p.effetti.push({ effetto: 'invisibile', da: id, durataTurni: 2, nome: 'Nascosto' }); this.evento({ tipo: 'nota', id, testo: `${p.nome} si nasconde (Furtività ${pr.totale}).` }); }
        else this.evento({ tipo: 'nota', id, testo: `${p.nome} prova a nascondersi (${pr.totale}), ma lo vedono.` });
        return { ok: true };
      }
      case 'aiuto': {
        const b = this.c(extra.bersaglio);
        if (!b || b.lato === c.lato || this.dist(c, b) > CELLA) return { errore: 'Aiuta contro un nemico vicino a te' };
        if ((e = usaAzione())) return { errore: e };
        b.aiutatoContro = { lato: c.lato }; this.evento({ tipo: 'nota', id, testo: `${p.nome} distrae ${b.ref.nome}: il prossimo alleato che lo attacca ha vantaggio.` }); return { ok: true };
      }
      case 'ira': {
        if (!c.pg || !R.haEffetto(p, 'ira')) return { errore: 'Solo i barbari vanno in ira' };
        if (this.effetto(c, 'ira')) return { errore: 'Sei già in ira' };
        if ((e = usaBonus())) return { errore: e };
        if (!risorsa('ira')) { c.turno.bonus = true; return { errore: 'Hai finito le ire' }; }
        p.effetti.push({ effetto: 'ira', da: id, durataTurni: 10, nome: 'Ira', nuovo: true });
        if (extra.frenesia && R.haEffetto(p, 'frenesia')) c.frenesia = true;
        this.evento({ tipo: 'nota', id, testo: `${p.nome} entra in IRA!` }); return { ok: true };
      }
      case 'irruento': {
        if (!c.pg || !R.haEffetto(p, 'irruento')) return { errore: 'Non sai fare un attacco irruento' };
        if (c.turno.attacchi > 0) return { errore: 'Va deciso prima del primo attacco' };
        c.irruentoOra = true; return { ok: true };
      }
      case 'recupero': {
        if (!c.pg || !R.haEffetto(p, 'recupero')) return { errore: 'Non hai Recuperare energie' };
        if ((e = usaBonus())) return { errore: e };
        if (!risorsa('recupero')) { c.turno.bonus = true; return { errore: 'Già usato: serve un riposo' }; }
        const q = R.tira(`1d10+${p.livello}`).totale; const curati = R.cura(p, q);
        this.evento({ tipo: 'cura', id, quanti: curati, testo: `${p.nome} recupera energie: +${curati} PF.` }); return { ok: true };
      }
      case 'impeto': {
        if (!c.pg || !R.haEffetto(p, 'impeto')) return { errore: 'Non hai l\'Azione impetuosa' };
        if (!risorsa('impeto')) return { errore: 'Già usata: serve un riposo' };
        c.turno.azione = true; c.turno.attacchi = 0; this.evento({ tipo: 'nota', id, testo: `${p.nome} usa l'Azione impetuosa: un'azione in più!` }); return { ok: true };
      }
      case 'colpoMarziale': case 'raffica': {
        if (!c.pg || !R.haEffetto(p, 'artiMarziali')) return { errore: 'Solo i monaci' };
        if (c.turno.attacchi === 0) return { errore: 'Prima attacca con l\'azione' };
        const b = this.c(extra.bersaglio); if (!b || this.dist(c, b) > CELLA) return { errore: 'Bersaglio non a portata' };
        if (tipo === 'raffica') { if (!c.turno.bonus) return { errore: 'Hai già usato l\'azione bonus' }; if (!risorsa('ki')) return { errore: 'Niente ki' }; c.turno.bonus = false; const colpo = this.attacchiDi(c).find((x) => x.id === 'colpo'); this.risolviAttacco(c, b, colpo); if (this.vivo(b)) this.risolviAttacco(c, b, colpo); this.controllaFine(); return { ok: true }; }
        if ((e = usaBonus())) return { errore: e };
        this.risolviAttacco(c, b, this.attacchiDi(c).find((x) => x.id === 'colpo')); this.controllaFine(); return { ok: true };
      }
      case 'stordente': {
        const b = this.c(extra.bersaglio); if (!b) return { errore: 'Bersaglio?' };
        if (!c.pg || !R.haEffetto(p, 'stordente') || !risorsa('ki')) return { errore: 'Non puoi' };
        const ts = this.tiroSalvezza(b, 'cos', 8 + p.comp + p.mod.sag);
        if (!ts.riuscita) { this.mettiCondizione(b, 'stordito', { da: id, turni: 1 }); this.evento({ tipo: 'nota', id: b.id, testo: `${b.ref.nome} è stordito!` }); } else this.evento({ tipo: 'nota', id: b.id, testo: `${b.ref.nome} resiste al colpo stordente.` });
        return { ok: true };
      }
      case 'secondaArma': {
        const b = this.c(extra.bersaglio); if (!b || this.dist(c, b) > CELLA) return { errore: 'Bersaglio non a portata' };
        const leggere = this.attacchiDi(c).filter((a) => a.mischia && (a.prop || []).includes('leggera'));
        if (!c.pg || leggere.length < 2 && !(p.armi.filter((x) => B.ARMI[x] && B.ARMI[x].prop.includes('leggera')).length >= 2)) return { errore: 'Servono due armi leggere' };
        if (c.turno.attacchi === 0) return { errore: 'Prima attacca con l\'azione' };
        if ((e = usaBonus())) return { errore: e };
        this.risolviAttacco(c, b, leggere[leggere.length - 1] || leggere[0], { senzaMod: !p.stili.includes('dueArmi') }); this.controllaFine(); return { ok: true };
      }
      case 'imposizione': {
        const b = this.c(extra.bersaglio) || c;
        if (!c.pg || !R.haEffetto(p, 'imposizione')) return { errore: 'Solo i paladini' };
        if (this.dist(c, b) > CELLA) return { errore: 'Devi toccarlo' };
        const r = p.risorse.mani; const resto = r.max - r.usati;
        const q = Math.min(resto, Number(extra.punti) || (b.ref.pfMax - b.ref.pf), b.ref.pfMax - Math.max(0, b.ref.pf));
        if (q <= 0) return { errore: resto <= 0 ? 'La riserva è vuota' : 'Non serve' };
        if ((e = usaAzione())) return { errore: e };
        r.usati += q; R.cura(b.ref, q); this.evento({ tipo: 'cura', id: b.id, quanti: q, testo: `${p.nome} impone le mani su ${b.ref.nome}: +${q} PF.` }); return { ok: true };
      }
      case 'ispirazione': {
        const b = this.c(extra.bersaglio);
        if (!c.pg || !R.haEffetto(p, 'ispirazione') || !b || b === c || b.lato !== c.lato) return { errore: 'Scegli un alleato' };
        if ((e = usaBonus())) return { errore: e };
        if (!risorsa('ispirazione')) { c.turno.bonus = true; return { errore: 'Niente ispirazione rimasta' }; }
        const dado = CLASSI.bardo.risorse.ispirazione.dado(p.livello);
        b.ref.effetti.push({ effetto: 'ispirato', dado: `1${dado}`, da: id, nome: 'Ispirazione bardica' });
        this.evento({ tipo: 'nota', id: b.id, testo: `${p.nome} ispira ${b.ref.nome} (1${dado}).` }); return { ok: true };
      }
      case 'soffio': {
        if (!c.pg || p.stirpe !== 'dragonide') return { errore: 'Solo i dragonidi' };
        if ((e = usaAzione())) return { errore: e };
        if (!risorsa('soffio')) { c.turno.azione = true; return { errore: 'Il soffio torna dopo un riposo' }; }
        const disc = B.DISCENDENZE[p.discendenza];
        const dadi = p.livello >= 16 ? '5d6' : p.livello >= 11 ? '4d6' : p.livello >= 6 ? '3d6' : '2d6';
        const area = disc.forma === 'cono' ? { forma: 'cono', m: 4.5 } : { forma: 'linea', m: 9 };
        return this.areaDanno(c, extra.punto || this.puntoVerso(c), area, { danno: dadi, tipoDanno: disc.danno, ts: disc.danno === 'veleno' || disc.danno === 'freddo' ? 'cos' : 'des', cd: 8 + p.mod.cos + p.comp, meta: true, nome: 'Soffio' });
      }
      case 'pozione': {
        const b = this.c(extra.bersaglio) || c;
        if (!c.pg) return { errore: 'Non può' };
        const o = p.oggetti.find((x) => /pozione di guarigione/i.test(x.nome) && x.n > 0);
        if (!o) return { errore: 'Non hai pozioni' };
        if (this.dist(c, b) > CELLA) return { errore: 'Deve essere vicino a te' };
        if ((e = usaAzione())) return { errore: e };
        o.n--; if (!o.n) p.oggetti = p.oggetti.filter((x) => x !== o);
        const q = R.cura(b.ref, R.tira('2d4+2').totale);
        this.evento({ tipo: 'cura', id: b.id, quanti: q, testo: `${p.nome} ${b === c ? 'beve' : `fa bere a ${b.ref.nome}`} una pozione di guarigione: +${q} PF.` }); return { ok: true };
      }
      case 'stabilizza': {
        const b = this.c(extra.bersaglio);
        if (!b || !b.pg || b.ref.pf > 0 || b.ref.morto || this.dist(c, b) > CELLA) return { errore: 'Scegli un alleato morente vicino a te' };
        if ((e = usaAzione())) return { errore: e };
        const pr = c.pg ? R.prova(p, 'medicina', { cd: 10, venti: this.ventiPer(c) }) : { riuscita: true, totale: 10 };
        if (pr.riuscita) { b.ref.stabile = true; this.evento({ tipo: 'nota', id: b.id, testo: `${p.nome} stabilizza ${b.ref.nome} (Medicina ${pr.totale}).` }); }
        else this.evento({ tipo: 'nota', id: b.id, testo: `${p.nome} non riesce a stabilizzare ${b.ref.nome} (Medicina ${pr.totale}).` });
        return { ok: true };
      }
      case 'scacciare': {
        if (!c.pg || !R.haEffetto(p, 'scacciare')) return { errore: 'Solo i chierici' };
        if ((e = usaAzione())) return { errore: e };
        if (!risorsa('divinita')) { c.turno.azione = true; return { errore: 'Incanalare divinità già usato' }; }
        const cd = p.magia.cd; let n = 0;
        for (const m of this.nemiciDi(c)) if (String(m.ref.tipo).startsWith('non morto') && this.dist(c, m) <= 9) {
          const ts = this.tiroSalvezza(m, 'sag', cd);
          if (!ts.riuscita) {
            const soglia = p.livello >= 17 ? 4 : p.livello >= 14 ? 3 : p.livello >= 11 ? 2 : p.livello >= 8 ? 1 : p.livello >= 5 ? 0.5 : -1;
            if ((m.ref.gs || 0) <= soglia) { m.ref.morto = true; this.evento({ tipo: 'muore', id: m.id, testo: `${m.ref.nome} è distrutto dalla luce divina!` }); }
            else { this.mettiCondizione(m, 'spaventato', { da: id, turni: 10 }); m.scacciato = true; }
            n++;
          }
        }
        this.evento({ tipo: 'nota', id, testo: `${p.nome} brandisce il simbolo sacro: ${n} non morti scacciati.` }); this.controllaFine(); return { ok: true };
      }
      case 'preservare': {
        if (!c.pg || !R.haEffetto(p, 'preservare')) return { errore: 'Non puoi' };
        if ((e = usaAzione())) return { errore: e };
        if (!risorsa('divinita')) { c.turno.azione = true; return { errore: 'Incanalare divinità già usato' }; }
        let pool = 5 * p.livello;
        for (const a of this.creature.filter((x) => x.lato === c.lato && this.vivo(x) && this.dist(c, x) <= 9).sort((x, y) => x.ref.pf / x.ref.pfMax - y.ref.pf / y.ref.pfMax)) {
          const max = Math.max(0, Math.floor(a.ref.pfMax / 2) - a.ref.pf); const q = Math.min(max, pool); if (q > 0) { R.cura(a.ref, q); pool -= q; this.evento({ tipo: 'cura', id: a.id, quanti: q, testo: `${a.ref.nome} +${q} PF` }); }
        }
        return { ok: true };
      }
      default: return { errore: 'Azione sconosciuta' };
    }
  }
  puntoVerso(c) { const n = this.nemiciDi(c).sort((a, b) => this.dist(c, a) - this.dist(c, b))[0]; return n ? { x: n.x, y: n.y } : { x: c.x + 1, y: c.y }; }

  // ---------- incantesimi ----------
  conosce(c, id) {
    if (!c.pg) return !!(c.ref.incantesimi && c.ref.incantesimi.lista.includes(id));
    const m = c.ref.magia; if (!m) return false;
    return m.trucchetti.includes(id) || m.incantesimi.includes(id) || m.sempre.includes(id);
  }
  slot(c) { if (c.pg) return { tot: c.ref.magia ? c.ref.magia.slot : [], usati: c.ref.magia ? c.ref.magia.slotUsati : [] }; const i = c.ref.incantesimi; return i ? { tot: i.slot, usati: i.slotUsati } : { tot: [], usati: [] }; }
  puoSpendere(c, liv) { const s = this.slot(c); return liv >= 1 && s.tot[liv - 1] > (s.usati[liv - 1] || 0); }
  spendiSlot(c, liv) { const s = this.slot(c); s.usati[liv - 1] = (s.usati[liv - 1] || 0) + 1; }
  puoLanciare(c, id, liv) { const inc = INCANTESIMI[id]; if (!inc || !this.conosce(c, id)) return false; if (inc.liv === 0) return true; for (let l = Math.max(liv || inc.liv, inc.liv); l <= 9; l++) if (this.puoSpendere(c, l)) return true; return false; }
  datiIncantatore(c) {
    if (c.pg) { const m = c.ref.magia; const k = m ? m.car : 'int'; return { cd: m ? m.cd : 8 + c.ref.comp + c.ref.mod[k], attacco: m ? m.attacco : c.ref.comp + c.ref.mod[k], mod: c.ref.mod[k], livello: c.ref.livello }; }
    const i = c.ref.incantesimi || { cd: 12, bonus: 4, car: 'int' };
    return { cd: i.cd, attacco: i.bonus, mod: c.ref.mod[i.car] || 0, livello: Math.max(1, Math.round((c.ref.gs || 1) * 2)) };
  }
  // le celle colpite da un'area
  celleArea(c, punto, area) {
    const { w, h } = this.scena;
    const out = [];
    const r = area.m / CELLA;
    const px = punto.x, py = punto.y;
    const ang = Math.atan2(py - c.y, px - c.x);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let dentro = false;
      if (area.forma === 'sfera') dentro = Math.hypot(x - (area.suDiMe ? c.x : px), y - (area.suDiMe ? c.y : py)) <= r + 0.01;
      else if (area.forma === 'cubo') { const half = r / 2; dentro = Math.abs(x - px) <= half && Math.abs(y - py) <= half; }
      else if (area.forma === 'cono') { const dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy); if (d > 0 && d <= r + 0.01) { let da = Math.atan2(dy, dx) - ang; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; dentro = Math.abs(da) <= 0.47; } }
      else if (area.forma === 'linea') { const dx = x - c.x, dy = y - c.y; const l = dx * Math.cos(ang) + dy * Math.sin(ang), perp = Math.abs(-dx * Math.sin(ang) + dy * Math.cos(ang)); dentro = l > 0 && l <= r + 0.01 && perp <= 0.55; }
      if (dentro && (area.forma === 'sfera' || M.vista(this.scena, area.suDiMe || area.forma !== 'sfera' ? c.x : px, area.suDiMe || area.forma !== 'sfera' ? c.y : py, x, y))) out.push({ x, y });
    }
    return out;
  }
  inArea(c, punto, area) { const celle = this.celleArea(c, punto, area); return this.creature.filter((x) => this.vivo(x) && celle.some((p) => p.x === x.x && p.y === x.y) && !(area.suDiMe && x === c)); }
  areaDanno(c, punto, area, { danno, tipoDanno, ts, cd, meta, nome, condizione = null, plasmare = false, incId = null, ripete = false, durata = 10 }) {
    let colpiti = this.inArea(c, punto, area);
    if (area.suDiMe) colpiti = colpiti.filter((x) => x.lato !== c.lato);
    const esiti = [];
    for (const b of colpiti) {
      if (plasmare && b.lato === c.lato) { esiti.push(`${b.ref.nome} protetto`); continue; }
      const t = this.tiroSalvezza(b, ts, cd, { magia: true });
      let q = 0;
      if (danno) { const tot = R.tira(danno).totale; q = t.riuscita ? (meta ? Math.floor(tot / 2) : 0) : tot; if (t.riuscita && b.pg && R.haEffetto(b.ref, 'elusione') && ts === 'des') q = 0; else if (!t.riuscita && b.pg && R.haEffetto(b.ref, 'elusione') && ts === 'des') q = Math.floor(q / 2); }
      const subiti = q ? this.danneggia(b, q, tipoDanno, { magico: true, da: c }) : 0;
      if (!t.riuscita && condizione) this.mettiCondizione(b, condizione, { da: c.id, ts, cd, ripete, turni: durata, inc: incId });
      esiti.push(`${b.ref.nome} ${t.riuscita ? 'resiste' : 'fallisce'}${danno ? ` (${subiti} ${tipoDanno})` : ''}${!t.riuscita && condizione ? ` → ${condizione}` : ''}`);
    }
    this.evento({ tipo: 'area', da: c.id, punto, area, celle: this.celleArea(c, punto, area), testo: `${nomeDi(c)}: ${nome}! ${esiti.length ? esiti.join('; ') : 'non colpisce nessuno'}.` });
    this.controllaFine();
    return { ok: true };
  }
  lancia(id, incId, { slot = null, bersagli = [], punto = null } = {}) {
    const c = this.attivo;
    if (!c || c.id !== id) return { errore: 'Non è il tuo turno' };
    const inc = INCANTESIMI[incId];
    if (!inc) return { errore: 'Incantesimo sconosciuto' };
    if (!this.conosce(c, incId)) return { errore: `Non conosci ${inc.nome} (o non è preparato)` };
    if (this.effetto(c, 'ira')) return { errore: 'In ira non si lanciano incantesimi' };
    let liv = inc.liv;
    if (inc.liv > 0) {
      liv = Math.max(inc.liv, Number(slot) || inc.liv);
      if (c.pg && c.ref.classe === 'warlock') liv = Math.max(liv, c.ref.magia.slot.length); // il patto usa sempre lo slot più alto
      while (liv <= 9 && !this.puoSpendere(c, liv)) liv++;
      if (liv > 9) return { errore: `Niente slot di ${inc.liv}° livello o superiori` };
    }
    const bonus = inc.tempo === 'bonus';
    if (inc.tempo === 'reazione') return { errore: 'Questo si usa da solo come reazione' };
    if (bonus ? !c.turno.bonus : !c.turno.azione) return { errore: bonus ? 'Hai già usato l\'azione bonus' : 'Hai già usato l\'azione' };
    const e = inc.e || { tipo: 'utilita' };
    const di = this.datiIncantatore(c);
    const gitt = inc.gittata === 'tocco' ? CELLA : inc.gittata === 'se' ? 0 : Number(inc.gittata) || 18;
    const listaB = (Array.isArray(bersagli) ? bersagli : [bersagli]).map((x) => this.c(x)).filter(Boolean);
    // controllo dei bersagli e della distanza
    if (e.area && !e.area.suDiMe && inc.gittata !== 'se') {
      if (!punto) punto = listaB[0] ? { x: listaB[0].x, y: listaB[0].y } : null;
      if (!punto) return { errore: 'Scegli dove' };
      if (this.dist(c, punto) > gitt) return { errore: `Troppo lontano (massimo ${gitt} m)` };
    } else if (e.area && !e.area.suDiMe) {
      // coni, linee e cubi che partono da chi lancia: il punto dà solo la direzione (il cubo deve toccare chi lancia)
      if (!punto) punto = listaB[0] ? { x: listaB[0].x, y: listaB[0].y } : this.puntoVerso(c);
      punto = { x: Math.round(Number(punto.x)) || 0, y: Math.round(Number(punto.y)) || 0 };
      if (punto.x === c.x && punto.y === c.y) return { errore: 'Scegli una direzione' };
      if (e.area.forma === 'cubo' && this.dist(c, punto) > e.area.m) return { errore: `Il cubo parte da te: massimo ${e.area.m} m` };
    } else if (['attacco', 'salvezza', 'cura', 'buff', 'auto', 'stabilizza', 'ristora', 'rianima', 'uccidi', 'sonno'].includes(e.tipo) && !e.area) {
      if (!listaB.length && inc.gittata !== 'se' && !['buff'].includes(e.tipo)) return { errore: 'Scegli il bersaglio' };
      for (const b of listaB) {
        if (this.dist(c, b) > Math.max(gitt, CELLA)) return { errore: `${b.ref.nome} è troppo lontano (massimo ${gitt} m)` };
        if (!M.vista(this.scena, c.x, c.y, b.x, b.y)) return { errore: `Non vedi ${b.ref.nome}` };
      }
    }
    // si spende
    if (bonus) c.turno.bonus = false; else c.turno.azione = false;
    if (inc.liv > 0) this.spendiSlot(c, liv);
    if (inc.conc) { this.fineConcentrazione(c); c.ref.concentrazione = incId; }
    if (this.effetto(c, 'invisibile') && !this.effetto(c, 'invisibileSup')) c.ref.effetti = c.ref.effetti.filter((x) => x.effetto !== 'invisibile');
    const sopra = liv - inc.liv;
    const dadiTrucchetto = (dadi) => { if (inc.liv > 0) return dadi; const L = di.livello, k = L >= 17 ? 4 : L >= 11 ? 3 : L >= 5 ? 2 : 1; return dadi.replace(/^(\d+)d/, (m0, n) => `${Number(n) * k}d`); };
    let dadiDanno = e.danno ? dadiTrucchetto(e.danno) : null;
    if (dadiDanno && e.scala && sopra > 0) { const [n, f] = e.scala.split('d'); dadiDanno += `+${(Number(n) || 1) * sopra}d${f}`; }
    if (dadiDanno && e.scalaOgni2 && sopra > 0) { const [n, f] = e.scalaOgni2.split('d'); dadiDanno += `+${(Number(n) || 1) * Math.floor(sopra / 2)}d${f}`; }
    const ev = { tipo: 'incantesimo', da: c.id, inc: incId, nome: inc.nome, liv, bersagli: listaB.map((x) => x.id), punto };
    this.evento({ ...ev, testo: `${nomeDi(c)} lancia ${inc.nome}${inc.liv ? ` (slot ${liv}°)` : ''}.` });
    const piuCar = (x) => (e.piuCar ? x + di.mod : x);
    const evocatore = c.pg && R.haEffetto(c.ref, 'invocazioniPotenziate') && inc.scuola === 'invocazione' ? di.mod : 0;
    switch (e.tipo) {
      case 'attacco': {
        let raggi = 1;
        if (e.raggi) raggi = di.livello >= 17 ? 4 : di.livello >= 11 ? 3 : di.livello >= 5 ? 2 : 1;
        if (e.raggiN) raggi = e.raggiN + sopra;
        if (e.raggi || e.raggiN) dadiDanno = e.danno;
        for (let k = 0; k < raggi; k++) {
          const b = listaB[k % listaB.length]; if (!b || !this.vivo(b)) continue;
          const { vantaggio, svantaggio, perche } = this.vantaggiAttacco(c, b, { mischia: !!e.mischia, gittata: [gitt, gitt] });
          const t = R.d20({ vantaggio, svantaggio, venti: this.ventiPer(c) });
          const cop = e.mischia ? 0 : M.copertura(this.scena, c.x, c.y, b.x, b.y);
          const critico = t.valore === 20;
          const colpito = t.valore !== 1 && (critico || t.valore + di.attacco >= b.ref.ca + cop);
          if (!colpito) { this.evento({ tipo: 'attacco', da: c.id, a: b.id, arma: inc.nome, valore: t.valore, totale: t.valore + di.attacco, ca: b.ref.ca + cop, colpito: false, perche, testo: `${inc.nome} manca ${b.ref.nome} (${t.valore + di.attacco} contro CA ${b.ref.ca + cop}).` }); continue; }
          let q = R.tira(dadiDanno, { critico }).totale + (e.piuCar ? di.mod : 0) + evocatore;
          if (incId === 'deflagrazione' && c.pg && (c.ref.suppliche || []).includes('agonizzante')) q += di.mod;
          const subiti = this.danneggia(b, q, e.tipoDanno, { critico, magico: true, da: c });
          if (e.rallenta) b.rallentatoGelo = true;
          if (incId === 'dardoTracciante') b.dardoGuida = true;
          if (e.risucchio) R.cura(c.ref, Math.floor(subiti / 2));
          this.evento({ tipo: 'attacco', da: c.id, a: b.id, arma: inc.nome, valore: t.valore, totale: t.valore + di.attacco, ca: b.ref.ca + cop, colpito: true, critico, danno: subiti, perche, testo: `${inc.nome} colpisce ${b.ref.nome}${critico ? ' (CRITICO)' : ''}: ${subiti} danni da ${e.tipoDanno}.` });
        }
        break;
      }
      case 'salvezza': {
        if (e.area) { this.areaDanno(c, e.area.suDiMe ? { x: c.x, y: c.y } : punto, e.area, { danno: dadiDanno, tipoDanno: e.tipoDanno, ts: e.ts, cd: di.cd, meta: e.meta, nome: inc.nome, condizione: e.condizione, plasmare: c.pg && R.haEffetto(c.ref, 'plasmare') && inc.scuola === 'invocazione', incId, ripete: e.ripete, durata: durataInTurni(inc.durata) }); break; }
        const quanti = (e.bersagli || 1) + (['blocca', 'bloccaMostri', 'charme', 'comando'].includes(incId) ? sopra : 0);
        for (const b of listaB.slice(0, quanti)) {
          const t = this.tiroSalvezza(b, e.ts, di.cd, { magia: true, contro: e.condizione });
          let q = 0;
          if (dadiDanno) { let dd = dadiDanno; if (e.feritoD && b.ref.pf < b.ref.pfMax) dd = dadiTrucchetto(e.feritoD); const tot = R.tira(dd).totale + evocatore; q = t.riuscita ? (e.meta ? Math.floor(tot / 2) : 0) : tot; }
          const subiti = q ? this.danneggia(b, q, e.tipoDanno, { magico: true, da: c }) : 0;
          if (!t.riuscita && e.condizione) this.mettiCondizione(b, e.condizione === 'comando' ? 'incapacitato' : e.condizione, { da: c.id, ts: e.ts, cd: di.cd, ripete: !!e.ripete || ['affascinato', 'spaventato'].includes(e.condizione) === false && e.ripete, turni: e.condizione === 'comando' ? 1 : durataInTurni(inc.durata), inc: incId });
          this.evento({ tipo: 'salvezza', da: c.id, a: b.id, riuscita: t.riuscita, testo: `${b.ref.nome} ${t.riuscita ? 'resiste' : 'non resiste'} a ${inc.nome} (${t.totale} contro CD ${di.cd})${subiti ? `: ${subiti} ${e.tipoDanno}` : ''}${!t.riuscita && e.condizione ? ` → ${e.condizione}` : ''}.` });
        }
        break;
      }
      case 'cura': {
        const quanti = e.bersagli || 1;
        const lista = listaB.length ? listaB.slice(0, quanti) : [c];
        for (const b of lista) {
          if (String(b.ref.tipo || '').startsWith('non morto')) continue;
          let dadi = e.cura; if (e.scala && sopra > 0) { const [n, f] = e.scala.split('d'); dadi += f ? `+${(Number(n) || 1) * sopra}d${f}` : `+${Number(e.scala) * sopra}`; }
          const massimo = this.creature.some((x) => x.lato === c.lato && this.effetto(b, 'faro')) || (c.pg && R.privilegiDi(c.ref).some((p) => p.nome === 'Guarigione suprema'));
          let q = R.tira(dadi, { massimo }).totale; q = piuCar(q);
          if (c.pg && R.haEffetto(c.ref, 'discepoloVita')) q += 2 + liv;
          const curati = R.cura(b.ref, q);
          this.evento({ tipo: 'cura', id: b.id, quanti: curati, testo: `${b.ref.nome} recupera ${curati} PF.` });
        }
        break;
      }
      case 'auto': {
        if (e.dardi) {
          const n = e.dardi + sopra * (e.scalaDardi || 1);
          for (let k = 0; k < n; k++) { const b = listaB[k % listaB.length]; if (!b || !this.vivo(b)) continue; if (this.effetto(b, 'ca5')) continue; this.danneggia(b, R.tira(e.danno).totale + evocatore, e.tipoDanno, { magico: true, da: c }); }
          this.evento({ tipo: 'nota', id: c.id, testo: `${n} dardi incantati colpiscono ${listaB.map((b) => b.ref.nome).join(', ')}.` });
        } else for (const b of listaB) { const subiti = this.danneggia(b, R.tira(dadiDanno).totale, e.tipoDanno, { magico: true, da: c }); this.evento({ tipo: 'nota', id: b.id, testo: `${b.ref.nome} subisce ${subiti} ${e.tipoDanno}.` }); }
        break;
      }
      case 'buff': {
        const lista = listaB.length ? listaB.slice(0, (e.bersagli || 1) + (incId === 'benedizione' ? sopra : 0)) : [c];
        for (const b of lista) {
          const eff = { effetto: e.effetto, da: c.id, nome: inc.nome, durataTurni: durataInTurni(inc.durata), conc: !!inc.conc, inc: incId };
          if (e.effetto === 'marchio' || e.effetto === 'maledizione') { eff.bersaglio = (listaB[0] || {}).id; c.ref.effetti.push(eff); break; }
          if (e.effetto === 'temp') { b.ref.pfTemp = Math.max(b.ref.pfTemp || 0, R.tira(e.temp).totale + sopra * 5); continue; }
          if (e.effetto === 'agathys') { b.ref.pfTemp = Math.max(b.ref.pfTemp || 0, 5 * (1 + sopra)); eff.freddo = 5 * (1 + sopra); }
          if (e.effetto === 'aiuto') { b.ref.pfMax += 5 * (1 + sopra - (inc.liv - 2)); b.ref.pf += 5; }
          b.ref.effetti = (b.ref.effetti || []).filter((x) => x.effetto !== e.effetto);
          b.ref.effetti.push(eff);
          if (b.pg) R.ricalcola(b.ref);
          this.evento({ tipo: 'nota', id: b.id, testo: `${b.ref.nome}: ${inc.nome}.` });
        }
        break;
      }
      case 'sonno': {
        let pool = R.tira(e.dadi).totale + (sopra > 0 ? R.tira(`${2 * sopra}d8`).totale : 0);
        const colpiti = this.inArea(c, punto || { x: listaB[0].x, y: listaB[0].y }, e.area).filter((x) => x.ref.pf > 0 && !x.ref.condizioni.includes('privo') && !String(x.ref.tipo).startsWith('non morto') && !(x.pg && R.haEffetto(x.ref, 'fatato'))).sort((a, b) => a.ref.pf - b.ref.pf);
        const dormono = [];
        for (const b of colpiti) { if (b.ref.pf > pool) break; pool -= b.ref.pf; this.mettiCondizione(b, 'privo', { da: c.id, turni: 10 }); dormono.push(b.ref.nome); }
        this.evento({ tipo: 'nota', id: c.id, testo: dormono.length ? `Si addormentano: ${dormono.join(', ')}.` : 'Nessuno si addormenta.' });
        break;
      }
      case 'stabilizza': for (const b of listaB) if (b.pg && b.ref.pf <= 0) { b.ref.stabile = true; this.evento({ tipo: 'nota', id: b.id, testo: `${b.ref.nome} è stabile.` }); } break;
      case 'ristora': for (const b of listaB) { b.ref.condizioni = b.ref.condizioni.filter((x) => !['accecato', 'assordato', 'paralizzato', 'avvelenato'].includes(x)); this.evento({ tipo: 'nota', id: b.id, testo: `${b.ref.nome} è guarito.` }); } break;
      case 'rianima': for (const b of listaB) if (b.ref.morto) { b.ref.morto = false; b.ref.pf = 1; b.ref.condizioni = []; b.ref.morte = { successi: 0, fallimenti: 0 }; this.evento({ tipo: 'nota', id: b.id, testo: `${b.ref.nome} torna in vita!` }); } break;
      case 'uccidi': for (const b of listaB) if (b.ref.pf <= e.soglia) { b.ref.pf = 0; b.ref.morto = !b.pg; if (b.pg) b.ref.morto = true; this.evento({ tipo: 'muore', id: b.id, testo: `${b.ref.nome} muore all'istante!` }); } else this.evento({ tipo: 'nota', id: b.id, testo: `${b.ref.nome} è troppo forte: resiste.` }); break;
      case 'teletrasporto': {
        if (!punto) return { ok: true };
        const dd = this.dist(c, punto);
        if (dd > e.m || this.occupata(punto.x, punto.y) || !M.passabile(this.scena.g[punto.y * this.scena.w + punto.x])) this.evento({ tipo: 'nota', id: c.id, testo: 'Il teletrasporto non riesce: posto non valido.' });
        else { c.x = punto.x; c.y = punto.y; this.evento({ tipo: 'movimento', id: c.id, percorso: [{ x: c.x, y: c.y }], teletrasporto: true, testo: `${nomeDi(c)} scompare e riappare.` }); }
        break;
      }
      default: this.evento({ tipo: 'nota', id: c.id, testo: `(${inc.nome}: l'effetto lo racconta il master.)`, narra: true });
    }
    this.controllaFine();
    return { ok: true };
  }
  fineConcentrazione(c) {
    const id = c.ref.concentrazione;
    if (!id) return;
    c.ref.concentrazione = null;
    for (const x of this.creature) {
      x.ref.effetti = (x.ref.effetti || []).filter((e) => !(e.da === c.id && e.inc === id));
      if (x.condTurni) for (const [k, v] of Object.entries(x.condTurni)) if (v.da === c.id && v.inc === id) { this.togliCondizione(x, k); delete x.condTurni[k]; }
      if (x.pg) R.ricalcola(x.ref);
    }
  }

  // ---------- il computer: mostri e compagni ----------
  // gioca il turno intero di chi è di turno (se è un mostro o un compagno del computer)
  turnoAutomatico(livello = this.livelloIA) {
    const c = this.attivo;
    if (!c || this.finito) return;
    const furbo = { facile: 0, medio: 1, difficile: 2 }[livello] ?? 1;
    for (let passo = 0; passo < 12 && this.attivo === c && !this.finito; passo++) {
      const fatto = c.pg ? this.iaPersonaggio(c, furbo) : this.iaMostro(c, furbo);
      if (!fatto) break;
    }
    if (this.attivo === c && !this.finito) this.fineTurno(c.id);
  }
  bersaglioPreferito(c, furbo) {
    // anche chi è a terra (ma vivo) può essere colpito: serve quando blocca un corridoio, e i mostri crudeli lo fanno
    const nemici = this.creature.filter((x) => x.lato !== c.lato && this.vivo(x));
    if (!nemici.length) return null;
    const voto = (n) => {
      let v = -this.dist(c, n);
      if (furbo >= 1) v += (1 - n.ref.pf / n.ref.pfMax) * 6;
      if (furbo >= 2) { if (n.ref.concentrazione) v += 5; if (n.pg && n.ref.magia && n.ref.classe !== 'paladino') v += 3; if (n.ref.pf <= 0) v -= 50; }
      if (n.ref.pf <= 0) v -= 30;
      return v + Math.random() * (furbo === 0 ? 8 : 2);
    };
    return nemici.sort((a, b) => voto(b) - voto(a))[0];
  }
  // si avvicina il più possibile a una cella da cui può colpire (in mischia: adiacente al bersaglio)
  avvicina(c, ber, portata) {
    // distanze vere (a passi, intorno ai muri) dal bersaglio verso ogni cella
    const { costo } = this.raggiungibili(c);
    const { w } = this.scena;
    const verso = M.distanze(this.scena, ber.x, ber.y);
    const qui = verso[c.y * w + c.x];
    let meglio = null, mv = Infinity;
    for (let i = 0; i < costo.length; i++) {
      if (costo[i] === Infinity) continue;
      const x = i % w, y = Math.floor(i / w);
      if (this.occupata(x, y, c)) continue;
      const d = Math.max(Math.abs(x - ber.x), Math.abs(y - ber.y)) * CELLA;
      const arriva = d <= portata && (portata <= CELLA || M.vista(this.scena, x, y, ber.x, ber.y));
      const v = (arriva ? 0 : 1000 + verso[i] * 10) + costo[i] * 0.1;
      if (v < mv) { mv = v; meglio = { x, y, arriva, passi: verso[i] }; }
    }
    if (!meglio || (meglio.x === c.x && meglio.y === c.y)) return false;
    if (!meglio.arriva && meglio.passi >= qui) return false; // non si avvicina davvero
    this.muovi(c.id, meglio.x, meglio.y);
    return true;
  }
  allontana(c, minimo) {
    const { costo } = this.raggiungibili(c);
    const { w } = this.scena;
    const nemici = this.nemiciDi(c);
    let meglio = null, mv = -Infinity;
    for (let i = 0; i < costo.length; i++) {
      if (costo[i] === Infinity) continue;
      const x = i % w, y = Math.floor(i / w);
      if (this.occupata(x, y, c)) continue;
      const dmin = Math.min(...nemici.map((n) => Math.max(Math.abs(x - n.x), Math.abs(y - n.y)) * CELLA));
      const v = Math.min(dmin, minimo) - costo[i] * 0.05;
      if (v > mv) { mv = v; meglio = { x, y }; }
    }
    if (meglio && (meglio.x !== c.x || meglio.y !== c.y)) { this.muovi(c.id, meglio.x, meglio.y); return true; }
    return false;
  }
  iaMostro(c, furbo) {
    const t = c.turno, ref = c.ref;
    // morale: le creature intelligenti e deboli fuggono quando sono quasi morte
    if (furbo >= 1 && !c.moraleFatto && ref.pf < ref.pfMax * 0.25 && ['umanoide'].includes(String(ref.tipo)) && (ref.gs || 1) < 2 && Math.random() < 0.35) {
      c.moraleFatto = true; c.fuggito = true; this.evento({ tipo: 'fuga', id: c.id, testo: `${ref.nome} getta le armi e fugge!` }); this.controllaFine(); return false;
    }
    c.moraleFatto = c.moraleFatto || ref.pf < ref.pfMax * 0.25;
    const ber = this.bersaglioPreferito(c, furbo);
    if (!ber) return false;
    // soffio: se prende almeno due nemici
    if (t.azione && ref.soffio && ref.soffio.pronto) {
      const area = { forma: ref.soffio.forma, m: ref.soffio.m };
      const presi = this.inArea(c, { x: ber.x, y: ber.y }, area);
      if (presi.filter((x) => x.lato !== c.lato).length >= (furbo === 0 ? 1 : 2) || (presi.length && Math.random() < 0.3)) {
        t.azione = false; ref.soffio.pronto = false;
        this.areaDanno(c, { x: ber.x, y: ber.y }, area, { danno: ref.soffio.danno, tipoDanno: ref.soffio.tipo, ts: ref.soffio.ts, cd: ref.soffio.cd, meta: true, nome: 'Soffio' });
        return true;
      }
    }
    // incantesimi
    if (t.azione && ref.incantesimi && furbo >= 1) {
      const lista = ref.incantesimi.lista.map((id) => INCANTESIMI[id]).filter(Boolean);
      const ferito = this.creature.filter((x) => x.lato === c.lato && this.inPiedi(x) && x.ref.pf < x.ref.pfMax * 0.4)[0];
      const cura = lista.find((s) => s.e && s.e.tipo === 'cura' && this.puoLanciare(c, s.id));
      if (ferito && cura && this.dist(c, ferito) <= (cura.gittata === 'tocco' ? CELLA : Number(cura.gittata) || 18)) { if (this.lancia(c.id, cura.id, { bersagli: [ferito.id] }).ok) return true; }
      const offensivi = lista.filter((s) => s.e && ['attacco', 'salvezza', 'auto'].includes(s.e.tipo) && (s.e.danno || s.e.condizione || s.e.dardi) && this.puoLanciare(c, s.id)).sort((a, b) => b.liv - a.liv);
      for (const s of offensivi) {
        const gitt = s.gittata === 'tocco' ? CELLA : s.gittata === 'se' ? (s.e.area ? s.e.area.m : CELLA) : Number(s.gittata) || 18;
        if (this.dist(c, ber) > gitt || !M.vista(this.scena, c.x, c.y, ber.x, ber.y)) continue;
        if (s.e.area) { const presi = this.inArea(c, { x: ber.x, y: ber.y }, s.e.area); if (presi.filter((x) => x.lato === c.lato).length > 0 && furbo >= 2) continue; }
        if (this.lancia(c.id, s.id, { bersagli: [ber.id], punto: { x: ber.x, y: ber.y } }).ok) return true;
      }
    }
    // attacchi: a distanza se ha un attacco a distanza e il bersaglio non è vicino, altrimenti in mischia
    const att = this.attacchiDi(c);
    const mischia = att.filter((a) => a.mischia).sort((a, b) => R.media(b.danno) - R.media(a.danno))[0];
    const distanza = att.filter((a) => !a.mischia).sort((a, b) => R.media(b.danno) - R.media(a.danno))[0];
    const d = this.dist(c, ber);
    if (t.azione || (t.attacchi > 0 && t.attacchi < t.attacchiMax)) {
      if (mischia && d <= (mischia.portata || CELLA)) return this.attaccaTutti(c, ber, mischia);
      if (distanza && (!mischia || (d > CELLA * 3 && furbo >= 1)) && d <= distanza.gittata[1] && M.vista(this.scena, c.x, c.y, ber.x, ber.y) && !(furbo >= 1 && this.nemiciDi(c).some((n) => this.dist(c, n) <= CELLA) && mischia)) return this.attaccaTutti(c, ber, distanza);
    }
    if (t.movimento > 0 && !c.mossoIA) {
      c.mossoIA = true;
      const portata = mischia ? (mischia.portata || CELLA) : distanza ? Math.min(distanza.gittata[0], 18) : CELLA;
      // i tiratori furbi stanno lontani
      if (!mischia && distanza && furbo >= 1 && d < 6) { if (this.allontana(c, 9)) return true; }
      if (this.avvicina(c, ber, portata)) return true;
    }
    if (t.azione && !c.dashIA && mischia && d > CELLA && this.velocita(c) > 0) { c.dashIA = true; c.mossoIA = false; return !this.azioneSemplice(c.id, 'scatto').errore; }
    c.mossoIA = false; c.dashIA = false;
    return false;
  }
  attaccaTutti(c, ber, a) {
    const t = c.turno;
    let n = 0;
    while ((t.azione || (t.attacchi > 0 && t.attacchi < t.attacchiMax)) && this.vivo(ber) && ber.ref.pf > 0 && n < 6) {
      const ma = c.pg ? a : (c.ref.multi > 1 ? this.attacchiDi(c)[t.attacchi % this.attacchiDi(c).filter((x) => x.mischia === a.mischia).length] || a : a);
      const usa = ma && ma.mischia === a.mischia ? ma : a;
      if (usa.mischia && this.dist(c, ber) > (usa.portata || CELLA) && !(usa.lancio && usa.gittata && this.dist(c, ber) <= usa.gittata[1])) break;
      const r = this.attacca(c.id, ber.id, { arma: usa.id || usa.nome, punizione: c.pg && c.ref.classe === 'paladino' && usa.mischia && this.puoSpendere(c, 1) && Math.random() < 0.4 ? 1 : null });
      if (r.errore) break;
      n++;
    }
    c.mossoIA = c.mossoIA || false;
    return n > 0;
  }
  iaPersonaggio(c, furbo) {
    const p = c.ref, t = c.turno;
    // cure agli alleati a terra o malmessi
    const feriti = this.creature.filter((x) => x.lato === c.lato && this.vivo(x) && (x.ref.pf <= 0 || x.ref.pf < x.ref.pfMax * 0.35)).sort((a, b) => a.ref.pf - b.ref.pf);
    if (p.magia && feriti.length && (t.azione || t.bonus)) {
      for (const id of ['parolaGuaritrice', 'curaferite', 'parolaMassa', 'preghiera', 'curaFeriteMassa']) {
        const inc = INCANTESIMI[id];
        if (!this.puoLanciare(c, id)) continue;
        if (inc.tempo === 'bonus' ? !t.bonus : !t.azione) continue;
        const f = feriti.find((x) => this.dist(c, x) <= (inc.gittata === 'tocco' ? CELLA : Number(inc.gittata)));
        if (f) { const r = this.lancia(c.id, id, { bersagli: [f.id] }); if (r.ok) return true; }
      }
      if (t.azione) for (const f of feriti) if (f.ref.pf <= 0 && this.dist(c, f) <= CELLA) { if (this.puoLanciare(c, 'salvare')) return this.lancia(c.id, 'salvare', { bersagli: [f.id] }).ok; }
    }
    if (t.bonus && R.haEffetto(p, 'ira') && !this.effetto(c, 'ira') && p.risorse.ira && p.risorse.ira.usati < p.risorse.ira.max && this.nemiciDi(c).some((n) => this.dist(c, n) <= 9)) { if (!this.azioneSemplice(c.id, 'ira').errore) return true; }
    if (t.bonus && R.haEffetto(p, 'recupero') && p.pf < p.pfMax * 0.5 && p.risorse.recupero && p.risorse.recupero.usati < 1) { if (!this.azioneSemplice(c.id, 'recupero').errore) return true; }
    const ber = this.bersaglioPreferito(c, Math.max(1, furbo));
    if (!ber) return false;
    // incantatori: il miglior incantesimo offensivo che arriva
    if (t.azione && p.magia && ['mago', 'stregone', 'warlock', 'druido', 'chierico', 'bardo'].includes(p.classe)) {
      const conosciuti = [...p.magia.trucchetti, ...p.magia.incantesimi, ...p.magia.sempre].map((id) => INCANTESIMI[id]).filter((s) => s && s.e && ['attacco', 'salvezza', 'auto', 'sonno'].includes(s.e.tipo) && (s.e.danno || s.e.dardi || s.e.condizione || s.e.dadi) && s.tempo !== 'reazione');
      const vicini = this.nemiciDi(c).length;
      const scegli = conosciuti.filter((s) => this.puoLanciare(c, s.id)).map((s) => ({ s, v: (s.e.area ? 6 * Math.min(3, vicini) : 0) + R.media(s.e.danno || '2d6') - (s.liv > 0 ? 3 + s.liv * (vicini < 2 ? 3 : 1) : 0) + (s.e.condizione ? 4 : 0) + Math.random() * 3 })).sort((a, b) => b.v - a.v);
      for (const { s } of scegli) {
        const gitt = s.gittata === 'tocco' ? CELLA : s.gittata === 'se' ? (s.e.area ? s.e.area.m : CELLA) : Number(s.gittata) || 18;
        if (this.dist(c, ber) > gitt || !M.vista(this.scena, c.x, c.y, ber.x, ber.y)) continue;
        if (s.e.area && this.inArea(c, { x: ber.x, y: ber.y }, s.e.area).some((x) => x.lato === c.lato)) continue;
        if (this.lancia(c.id, s.id, { bersagli: [ber.id], punto: { x: ber.x, y: ber.y } }).ok) return true;
      }
    }
    const a = this.sceltaArma(c, ber);
    const mischia = p.attacchi.filter((x) => x.mischia && x.id !== 'colpo').sort((x, y) => R.media(y.danno) - R.media(x.danno))[0] || p.attacchi.find((x) => x.id === 'colpo');
    const distanza = p.attacchi.filter((x) => !x.mischia).sort((x, y) => R.media(y.danno) - R.media(x.danno))[0];
    const tiratore = distanza && (p.mod.des > p.mod.for || ['ranger', 'ladro', 'mago', 'stregone', 'warlock'].includes(CLASSI[p.classe].base || p.classe));
    if (a && (t.azione || (t.attacchi > 0 && t.attacchi < t.attacchiMax))) {
      const d = this.dist(c, ber);
      if ((a.mischia && d <= (a.portata || CELLA)) || (!a.mischia && a.gittata && d <= a.gittata[1] && M.vista(this.scena, c.x, c.y, ber.x, ber.y))) {
        if (R.haEffetto(p, 'irruento') && t.attacchi === 0 && a.mischia && furbo >= 1 && p.pf > p.pfMax * 0.5) c.irruentoOra = true;
        const fatto = this.attaccaTutti(c, ber, a);
        c.irruentoOra = false;
        if (fatto) {
          if (t.bonus && R.haEffetto(p, 'artiMarziali') && this.inPiedi(ber) && this.dist(c, ber) <= CELLA) this.azioneSemplice(c.id, p.risorse.ki && p.risorse.ki.usati < p.risorse.ki.max && furbo >= 1 ? 'raffica' : 'colpoMarziale', { bersaglio: ber.id });
          if (t.bonus && R.haEffetto(p, 'scaltra') && tiratore && this.nemiciDi(c).some((n) => this.dist(c, n) <= CELLA)) this.azioneSemplice(c.id, 'disimpegno', { bonus: true });
          return true;
        }
      }
    }
    if (t.movimento > 0 && !c.mossoIA) {
      c.mossoIA = true;
      if (tiratore && this.nemiciDi(c).some((n) => this.dist(c, n) <= CELLA * 2)) { if (this.allontana(c, 9)) return true; }
      const portata = tiratore ? Math.min(distanza.gittata[0], 15) : (mischia ? mischia.portata || CELLA : CELLA);
      if (this.avvicina(c, ber, portata)) return true;
    }
    c.mossoIA = false;
    if (t.azione && !c.dashIA && this.dist(c, ber) > 3) { c.dashIA = true; return !this.azioneSemplice(c.id, 'scatto').errore; }
    c.dashIA = false;
    return false;
  }

  // ---------- quello che vede il browser ----------
  vista() {
    return {
      round: this.round, attivo: this.attivo ? this.attivo.id : null, finito: this.finito,
      ordine: this.ordine.filter((id) => { const c = this.c(id); return c && !c.ref.morto && !c.fuggito; }),
      creature: this.creature.map((c) => ({
        id: c.id, lato: c.lato, pg: c.pg, nome: c.ref.nome, x: c.x, y: c.y, pf: c.ref.pf, pfMax: c.ref.pfMax, pfTemp: c.ref.pfTemp || 0, ca: c.ref.ca,
        morto: !!c.ref.morto, fuggito: !!c.fuggito, condizioni: c.ref.condizioni || [], effetti: (c.ref.effetti || []).map((e) => e.nome || e.effetto), conc: c.ref.concentrazione || null,
        iniziativa: Math.floor(c.iniziativa), aspetto: c.ref.aspetto || null, mostro: c.ref.mostro || null, taglia: c.ref.taglia || 'Media',
        morte: c.pg ? c.ref.morte : null, stabile: c.pg ? !!c.ref.stabile : null,
        turno: c.turno && this.attivo === c ? { azione: c.turno.azione, bonus: c.turno.bonus, movimento: c.turno.movimento, attacchi: c.turno.attacchi, attacchiMax: c.turno.attacchiMax } : null,
        reazione: !!c.reazione,
      })),
      eventi: this.eventi.slice(-60),
    };
  }
}

module.exports = { Combattimento, CELLA, durataInTurni };
