// DRAGHI E SEGRETE: il motore delle regole. Dadi (anche con vantaggio e svantaggio), modificatori, prove di
// abilità e tiri salvezza, creazione del personaggio (con controllo di ogni scelta), salita di livello, classe
// armatura, attacchi, incantesimi preparati e slot, riposi, danni e cure, condizioni, tiri contro la morte.
// I conti li fa sempre il motore: il master (l'IA) decide cosa succede e chiede le prove, ma non tira i dadi.
const B = require('./base');
const { CLASSI, STILI, SUPPLICHE, slotPer, COMPETENZA, AUMENTI } = require('./classi');
const { INCANTESIMI, perClasse } = require('./incantesimi');
const { MOSTRI } = require('./mostri');

// ---------- dadi ----------
const d = (facce) => 1 + Math.floor(Math.random() * facce);
// "2d6+3", "1d4+1", "2d8+4d6", "70", "1d10-1": restituisce { totale, dadi: [[facce, valore]…], bonus, espr }
function tira(espr, { critico = false, massimo = false, minimoDue = false } = {}) {
  const s = String(espr || '0').replace(/\s+/g, '').toLowerCase();
  let totale = 0, bonus = 0;
  const dadi = [];
  const re = /([+-]?)(\d*)d(\d+)|([+-]?)(\d+)/g;
  let m;
  while ((m = re.exec(s))) {
    if (m[3]) {
      const segno = m[1] === '-' ? -1 : 1, n = Math.min(100, (Number(m[2]) || 1) * (critico ? 2 : 1)), f = Number(m[3]);
      for (let k = 0; k < n; k++) {
        let v = massimo ? f : d(f);
        if (minimoDue && v <= 2) v = d(f); // stile armi grandi: si ritira 1 e 2 (una volta)
        dadi.push([f, v]); totale += segno * v;
      }
    } else if (m[5]) { const v = (m[4] === '-' ? -1 : 1) * Number(m[5]); bonus += v; totale += v; }
  }
  return { totale, dadi, bonus, espr: s };
}
const media = (espr) => { const s = String(espr || '0'); let t = 0; for (const m of s.matchAll(/([+-]?)(\d*)d(\d+)|([+-]?)(\d+)/g)) { if (m[3]) t += (m[1] === '-' ? -1 : 1) * (Number(m[2]) || 1) * (Number(m[3]) + 1) / 2; else if (m[5]) t += (m[4] === '-' ? -1 : 1) * Number(m[5]); } return Math.floor(t); };
// il d20 con vantaggio/svantaggio (si annullano) e la fortuna halfling (un 1 si ritira)
function d20({ vantaggio = false, svantaggio = false, fortunato = false } = {}) {
  const uno = () => { let v = d(20); if (fortunato && v === 1) v = d(20); return v; };
  if (vantaggio && !svantaggio) { const a = uno(), b = uno(); return { valore: Math.max(a, b), dadi: [a, b], modo: 'vantaggio' }; }
  if (svantaggio && !vantaggio) { const a = uno(), b = uno(); return { valore: Math.min(a, b), dadi: [a, b], modo: 'svantaggio' }; }
  const a = uno(); return { valore: a, dadi: [a], modo: 'normale' };
}
const mod = (v) => Math.floor((Number(v) - 10) / 2);
const segno = (n) => (n >= 0 ? `+${n}` : `${n}`);

// ---------- caratteristiche: metodi di creazione ----------
const COSTO_PUNTI = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const STANDARD = [15, 14, 13, 12, 10, 8];
function tira4d6() { const v = [d(6), d(6), d(6), d(6)].sort((x, y) => y - x); return v[0] + v[1] + v[2]; }
const tiraCaratteristiche = () => Array.from({ length: 6 }, tira4d6).sort((x, y) => y - x);
function controllaCaratteristiche(base, metodo, tirati) {
  const v = B.ORDINE_CAR.map((k) => Number(base && base[k]));
  if (v.some((x) => !Number.isInteger(x))) return 'Mancano delle caratteristiche';
  if (metodo === 'punti') {
    if (v.some((x) => x < 8 || x > 15)) return 'Con i punti ogni caratteristica va da 8 a 15';
    const costo = v.reduce((s, x) => s + COSTO_PUNTI[x], 0);
    if (costo > 27) return `Hai speso ${costo} punti su 27`;
    return null;
  }
  const lista = metodo === 'dadi' ? (tirati || []) : STANDARD;
  if (lista.length !== 6) return 'Tira prima i dadi delle caratteristiche';
  const a = v.slice().sort((x, y) => y - x), b = lista.slice().sort((x, y) => y - x);
  return a.every((x, i) => x === b[i]) ? null : 'Usa esattamente i valori a disposizione, uno per caratteristica';
}

// ---------- il personaggio ----------
const listaAbilitaClasse = (cl) => (cl.abilita.tra === 'tutte' ? Object.keys(B.ABILITA) : cl.abilita.tra);
const armiCompetenti = (pg) => { const s = new Set(); for (const a of pg.compArmi) { if (a === 'semplice' || a === 'guerra') { for (const [id, x] of Object.entries(B.ARMI)) if (x.cat === a) s.add(id); } else s.add(a); } s.add('colpo'); return s; };
function privilegiDi(pg) {
  const cl = CLASSI[pg.classe];
  const tutti = [...cl.privilegi.map((p) => ({ ...p, da: cl.nome })), ...cl.sottoclasse.privilegi.map((p) => ({ ...p, da: cl.sottoclasse.nome }))];
  return tutti.filter((p) => p.l <= pg.livello).sort((x, y) => x.l - y.l);
}
const haEffetto = (pg, eff) => privilegiDi(pg).some((p) => p.effetto === eff) || (B.STIRPI[pg.stirpe].tratti || []).some((t) => t.effetto === eff);
// quanti incantesimi può avere: trucchetti, conosciuti/preparati, libro
function limitiMagia(pg) {
  const m = CLASSI[pg.classe].magia;
  if (!m) return null;
  const L = pg.livello, modC = pg.mod[m.car];
  const trucchi = m.trucchetti ? m.trucchetti[Math.min(9, L - 1)] + (pg.classe === 'druido' && L >= 2 ? 1 : 0) : 0;
  const slot = slotPer(m.tipo, L);
  const livMax = slot.length;
  let incantesimi = 0;
  if (m.modo === 'conosciuti') incantesimi = m.conosciuti[L - 1];
  else if (m.modo === 'preparati') incantesimi = Math.max(1, modC + (m.mezzo ? Math.floor(L / 2) : L));
  else if (m.modo === 'libro') incantesimi = Math.max(1, modC + L);
  const libro = m.modo === 'libro' ? m.libro + (L - 1) * m.perLivello : 0;
  return { trucchi, incantesimi, libro, livMax, slot, modo: m.modo, car: m.car };
}
// gli incantesimi sempre preparati della sottoclasse (dominio, giuramento, circolo, patrono)
function incantesimiSottoclasse(pg) {
  const t = CLASSI[pg.classe].sottoclasse.incantesimi || {};
  const out = [];
  for (const [l, lista] of Object.entries(t)) if (pg.livello >= Number(l)) out.push(...lista.filter((x) => INCANTESIMI[x]));
  return out;
}

// CREAZIONE: scelte = { nome, genere, stirpe, discendenza, classe, background, metodo, base: {for…}, tirati, bonusScelti,
// abilita, abilitaExtra, maestria, stile, equip, trucchetti, incantesimi, aspetto, livello, aumenti }.
// Restituisce { pg } oppure { errore }.
function creaPersonaggio(s) {
  if (!s || typeof s !== 'object') return { errore: 'Scelte mancanti' };
  const nome = String(s.nome || '').replace(/\s+/g, ' ').trim().slice(0, 24);
  if (!nome) return { errore: 'Dai un nome al personaggio' };
  const st = B.STIRPI[s.stirpe], cl = CLASSI[s.classe], bg = B.BACKGROUND[s.background];
  if (!st) return { errore: 'Scegli la stirpe' };
  if (!cl) return { errore: 'Scegli la classe' };
  if (!bg) return { errore: 'Scegli il background' };
  const livello = Math.max(1, Math.min(20, Number(s.livello) || 1));
  const err = controllaCaratteristiche(s.base, s.metodo, s.tirati);
  if (err) return { errore: err };
  const car = {};
  for (const k of B.ORDINE_CAR) car[k] = Number(s.base[k]) + (st.bonus[k] || 0);
  if (st.bonusScelti) {
    const sc = Array.isArray(s.bonusScelti) ? [...new Set(s.bonusScelti)] : [];
    if (sc.length !== st.bonusScelti || sc.some((k) => !B.CARATTERISTICHE[k] || st.bonus[k])) return { errore: `Scegli ${st.bonusScelti} caratteristiche diverse (non il Carisma) per il +1` };
    for (const k of sc) car[k] += 1;
  }
  // aumenti di caratteristica ai livelli 4, 8… (se si parte da un livello alto): +2 o +1/+1
  const nAumenti = [...AUMENTI, ...(cl.aumentiExtra || [])].filter((l) => l <= livello).length;
  const aumenti = Array.isArray(s.aumenti) ? s.aumenti.slice(0, nAumenti * 2) : [];
  while (aumenti.length < nAumenti * 2) aumenti.push(cl.principale[aumenti.length % 2 === 0 ? 0 : 0]);
  for (const k of aumenti) if (B.CARATTERISTICHE[k]) car[k] = Math.min(20, car[k] + 1);
  const pg = {
    pg: true, nome, genere: ['m', 'f', 'n'].includes(s.genere) ? s.genere : 'n', stirpe: s.stirpe, classe: s.classe, sottoclasse: cl.sottoclasse.nome,
    background: s.background, livello, px: PX_LIVELLO[livello - 1], car, base: { ...s.base },
    aspetto: pulisciAspetto(s.aspetto, s.stirpe), storia: String(s.storia || '').slice(0, 600),
    discendenza: null, stili: [], condizioni: [], effetti: [], esaurimento: 0, ispirazione: false,
    morte: { successi: 0, fallimenti: 0 }, stabile: false, morto: false, pfTemp: 0, concentrazione: null,
  };
  // discendenza draconica (dragonidi e stregoni)
  if (s.stirpe === 'dragonide' || s.classe === 'stregone') {
    if (!B.DISCENDENZE[s.discendenza]) return { errore: 'Scegli il colore del drago antenato' };
    pg.discendenza = s.discendenza;
  }
  ricalcolaMod(pg);
  // competenze
  pg.salvezze = [...cl.salvezze];
  pg.compArmature = [...cl.armature, ...(cl.sottoclasse.armature || [])];
  pg.compArmi = [...cl.armi];
  for (const t of st.tratti) if (t.armi) pg.compArmi.push(...t.armi);
  pg.attrezzi = [...(cl.attrezzi || []), ...(bg.attrezzi || [])];
  pg.lingue = [...st.lingue];
  const extraLingue = (st.lingueScelte || 0) + (bg.lingue || 0);
  const scelteLingue = (Array.isArray(s.lingue) ? s.lingue : []).filter((l) => B.LINGUE.includes(l) && !pg.lingue.includes(l));
  for (const l of B.LINGUE) { if (pg.lingue.length >= st.lingue.length + extraLingue) break; if (!pg.lingue.includes(l) && (scelteLingue.includes(l) || scelteLingue.length === 0)) pg.lingue.push(l); }
  // abilità: background + stirpe (fisse) + classe (scelte) + extra (mezzelfo, collegio della sapienza)
  const fisse = new Set([...bg.abilita, ...st.tratti.flatMap((t) => t.abilita || [])]);
  const lista = listaAbilitaClasse(cl);
  const scelte = [...new Set(Array.isArray(s.abilita) ? s.abilita : [])].filter((a) => B.ABILITA[a] && !fisse.has(a));
  if (scelte.length !== cl.abilita.n || scelte.some((a) => !lista.includes(a))) return { errore: `Scegli ${cl.abilita.n} abilità della classe (diverse da quelle del background)` };
  const nExtra = st.tratti.reduce((s2, t) => s2 + (t.abilitaScelte || 0), 0) + (pg.classe === 'bardo' && livello >= 3 ? 3 : 0);
  const extra = [...new Set(Array.isArray(s.abilitaExtra) ? s.abilitaExtra : [])].filter((a) => B.ABILITA[a] && !fisse.has(a) && !scelte.includes(a));
  if (extra.length < nExtra) return { errore: `Scegli altre ${nExtra} abilità a piacere` };
  pg.abilita = [...fisse, ...scelte, ...extra.slice(0, nExtra)];
  // maestria (ladro, bardo)
  const nMaestria = privilegiDi(pg).reduce((s2, p) => s2 + (p.maestria || 0), 0);
  const maestria = [...new Set(Array.isArray(s.maestria) ? s.maestria : [])].filter((a) => pg.abilita.includes(a) || (a === 'grimaldelli' && pg.attrezzi.includes('grimaldelli')));
  if (maestria.length < nMaestria) return { errore: `Scegli ${nMaestria} abilità per la maestria (tra quelle in cui sei competente)` };
  pg.maestria = maestria.slice(0, nMaestria);
  // stili di combattimento
  const nStili = privilegiDi(pg).filter((p) => p.stile).length;
  const stili = [...new Set(Array.isArray(s.stili) ? s.stili : s.stile ? [s.stile] : [])].filter((x) => STILI[x]);
  if (stili.length < nStili) return { errore: 'Scegli lo stile di combattimento' };
  pg.stili = stili.slice(0, nStili);
  // equipaggiamento
  const eq = cl.equip[Number(s.equip) || 0] || cl.equip[0];
  pg.armi = [...eq.armi, ...(eq.extra || []).filter((x) => B.ARMI[x])];
  pg.armatura = eq.armatura || null;
  pg.scudo = !!eq.scudo;
  pg.oggetti = [];
  const aggiungi = (id) => { const nomeO = B.OGGETTI[id] || id; const x = pg.oggetti.find((o) => o.nome === nomeO); if (x) x.n++; else pg.oggetti.push({ nome: nomeO, n: 1 }); };
  for (const id of (B.PACCHETTI[eq.pacchetto] || { oggetti: [] }).oggetti) aggiungi(id);
  for (const id of (eq.extra || []).filter((x) => !B.ARMI[x])) aggiungi(id);
  for (const id of bg.equip) aggiungi(id);
  aggiungi('pozione');
  pg.oro = bg.oro + (livello > 1 ? livello * livello * 25 : 0);
  // incantesimi
  const lm = limitiMagia(pg);
  pg.magia = null;
  if (lm || st.tratti.some((t) => t.trucchetto)) {
    const sempre = incantesimiSottoclasse(pg);
    pg.magia = { car: lm ? lm.car : 'int', trucchetti: [], incantesimi: [], libro: [], sempre, slot: lm ? lm.slot : [], slotUsati: lm ? lm.slot.map(() => 0) : [], modo: lm ? lm.modo : null };
    if (lm) {
      const trucchiOk = perClasse(pg.classe, 0).map((x) => x.id);
      const tr = [...new Set(Array.isArray(s.trucchetti) ? s.trucchetti : [])].filter((x) => trucchiOk.includes(x));
      if (tr.length < lm.trucchi) return { errore: `Scegli ${lm.trucchi} trucchetti` };
      pg.magia.trucchetti = tr.slice(0, lm.trucchi);
      const ok = perClasse(pg.classe, lm.livMax).filter((x) => x.liv >= 1).map((x) => x.id);
      const sc = [...new Set(Array.isArray(s.incantesimi) ? s.incantesimi : [])].filter((x) => ok.includes(x) && !sempre.includes(x));
      const quanti = lm.modo === 'libro' ? lm.libro : lm.incantesimi;
      if (sc.length < Math.min(quanti, ok.length - sempre.length)) return { errore: `Scegli ${quanti} incantesimi${lm.modo === 'libro' ? ' per il libro' : ''}` };
      if (lm.modo === 'libro') { pg.magia.libro = sc.slice(0, lm.libro); pg.magia.incantesimi = pg.magia.libro.slice(0, lm.incantesimi); } else pg.magia.incantesimi = sc.slice(0, quanti);
    }
    // trucchetto razziale (alto elfo: uno da mago)
    if (st.tratti.some((t) => t.trucchetto)) {
      const trM = perClasse('mago', 0).map((x) => x.id);
      const x = trM.includes(s.trucchettoStirpe) ? s.trucchettoStirpe : 'dardoFuoco';
      if (!pg.magia.trucchetti.includes(x)) pg.magia.trucchetti.push(x);
    }
    if (s.stirpe === 'tiefling' && !pg.magia.trucchetti.includes('taumaturgia')) pg.magia.trucchetti.push('taumaturgia');
  }
  if (pg.classe === 'warlock') pg.suppliche = [...new Set(Array.isArray(s.suppliche) ? s.suppliche : [])].filter((x) => SUPPLICHE[x]).slice(0, nSuppliche(livello));
  // punti ferita: massimo al 1° livello, poi la media
  const dv = cl.dado;
  pg.dadiVita = { dado: dv, tot: livello, restanti: livello };
  pg.pfMax = pfMassimi(pg);
  pg.pf = pg.pfMax;
  pg.risorse = {};
  ricalcola(pg);
  ripristinaRisorse(pg, 'lungo');
  return { pg };
}
const nSuppliche = (l) => (l < 2 ? 0 : l >= 18 ? 8 : l >= 15 ? 7 : l >= 12 ? 6 : l >= 9 ? 5 : l >= 7 ? 4 : l >= 5 ? 3 : 2);
function pfMassimi(pg) {
  const dv = CLASSI[pg.classe].dado, L = pg.livello;
  let pf = dv + (L - 1) * (dv / 2 + 1) + pg.mod.cos * L;
  if (haEffetto(pg, 'robusto')) pf += L;
  if (haEffetto(pg, 'resilienzaDraconica')) pf += L;
  return Math.max(1, pf);
}
const PX_LIVELLO = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
function ricalcolaMod(pg) { pg.mod = {}; for (const k of B.ORDINE_CAR) pg.mod[k] = mod(pg.car[k]); pg.comp = COMPETENZA(pg.livello); }

// aspetto del personaggio (per il ritratto): solo valori ammessi
const ASPETTO = {
  pelle: ['#f6d7c3', '#eac0a0', '#d8a07a', '#b97a52', '#8d5a3a', '#5e3a24', '#9fb88a', '#8aa0c0', '#c05040', '#7a5a8a', '#d0c0a0'],
  capelli: ['#1a1410', '#4a2e1a', '#7a4a20', '#b07030', '#d8b060', '#e8e0c8', '#a0a0a8', '#8a1a1a', '#2a4a8a', '#3a7a4a', '#7a3a8a'],
  occhi: ['#3a2a1a', '#2a5a8a', '#3a7a3a', '#7a7a7a', '#c08020', '#8a1a1a', '#6a3a9a', '#e0e0e0'],
  pettinatura: ['corti', 'lunghi', 'coda', 'treccia', 'calvo', 'ricci', 'cresta', 'chignon', 'spettinati'],
  barba: ['nessuna', 'corta', 'lunga', 'baffi', 'pizzetto', 'treccia'],
  viso: ['ovale', 'squadrato', 'tondo', 'affilato'],
  segni: ['nessuno', 'cicatrice', 'tatuaggio', 'lentiggini', 'benda', 'pitture'],
  mantello: ['#7a1a1a', '#1a3a6a', '#2a5a2a', '#4a2a5a', '#5a4a2a', '#2a2a2a', '#c0a040', '#e0e0e0', '#8a4a1a'],
  corna: ['nessuna', 'piccole', 'ricurve', 'lunghe'],
};
function pulisciAspetto(a, stirpe) {
  const out = {};
  for (const [k, valori] of Object.entries(ASPETTO)) out[k] = a && valori.includes(a[k]) ? a[k] : valori[Math.floor(Math.random() * valori.length)];
  if (stirpe !== 'tiefling' && stirpe !== 'dragonide') out.corna = 'nessuna';
  else if (out.corna === 'nessuna') out.corna = 'ricurve';
  if (a && (stirpe === 'nano') && !a.barba) out.barba = 'lunga';
  return out;
}

// CA, velocità, attacchi, CD degli incantesimi: tutto quello che dipende dal resto
function ricalcola(pg) {
  ricalcolaMod(pg);
  const st = B.STIRPI[pg.stirpe];
  const ar = pg.armatura ? B.ARMATURE[pg.armatura] : null;
  let ca;
  if (ar) ca = ar.ca + (ar.des === true ? pg.mod.des : ar.des === false ? 0 : Math.min(ar.des, pg.mod.des));
  else if (haEffetto(pg, 'difesaBarbaro')) ca = 10 + pg.mod.des + pg.mod.cos;
  else if (haEffetto(pg, 'difesaMonaco') && !pg.scudo) ca = 10 + pg.mod.des + pg.mod.sag;
  else if (haEffetto(pg, 'resilienzaDraconica')) ca = 13 + pg.mod.des;
  else ca = 10 + pg.mod.des;
  if (!ar && pg.effetti.some((e) => e.effetto === 'armaturaMagica')) ca = Math.max(ca, 13 + pg.mod.des);
  if (pg.scudo) ca += 2;
  if (ar && pg.stili.includes('difesa')) ca += 1;
  for (const e of pg.effetti) { if (e.effetto === 'ca2') ca += 2; if (e.effetto === 'ca5') ca += 5; if (e.effetto === 'velocita') ca += 2; if (e.effetto === 'corteccia') ca = Math.max(ca, 16); }
  pg.ca = ca;
  let vel = st.velocita;
  if (haEffetto(pg, 'velocita10') && !(ar && ar.cat === 'pesante')) vel += 10;
  if (haEffetto(pg, 'velocitaMonaco') && !ar && !pg.scudo) vel += pg.livello >= 18 ? 30 : pg.livello >= 14 ? 25 : pg.livello >= 10 ? 20 : pg.livello >= 6 ? 15 : 10;
  if (ar && ar.forza && pg.car.for < ar.forza && pg.stirpe !== 'nano') vel -= 10;
  pg.velocita = Math.round(vel * 0.3 * 10) / 10; // in metri (piedi × 0,3)
  pg.iniziativa = pg.mod.des;
  pg.percezionePassiva = 10 + bonusAbilita(pg, 'percezione');
  if (pg.magia) { const c = pg.mod[pg.magia.car]; pg.magia.cd = 8 + pg.comp + c; pg.magia.attacco = pg.comp + c; }
  pg.attacchi = attacchiDi(pg);
  pg.privilegi = privilegiDi(pg).map((p) => ({ l: p.l, nome: p.nome, desc: p.desc, da: p.da }));
  pg.tratti = st.tratti.map((t) => ({ nome: t.nome, desc: t.desc }));
  // per la scheda e i pulsanti del combattimento nel browser
  pg.bonusAb = {}; for (const k of Object.keys(B.ABILITA)) pg.bonusAb[k] = bonusAbilita(pg, k);
  pg.bonusTs = {}; for (const k of B.ORDINE_CAR) pg.bonusTs[k] = bonusSalvezza(pg, k);
  pg.capacita = [...new Set([...privilegiDi(pg).map((p) => p.effetto), ...st.tratti.map((t) => t.effetto)].filter(Boolean))];
  return pg;
}

// i bonus di abilità e tiri salvezza
function bonusAbilita(pg, ab) {
  const a = B.ABILITA[ab];
  if (!a) return 0;
  let b = pg.mod[a.car];
  if (pg.abilita.includes(ab)) b += pg.comp * (pg.maestria.includes(ab) ? 2 : 1);
  else if (haEffetto(pg, 'factotum')) b += Math.floor(pg.comp / 2);
  return b;
}
function bonusSalvezza(pg, k) {
  let b = pg.mod[k];
  if (pg.salvezze.includes(k) || haEffetto(pg, 'animaDiamante') || privilegiDi(pg).some((p) => p.salvezza === k)) b += pg.comp;
  return b;
}

// gli attacchi con le armi che ha
function attacchiDi(pg) {
  const comp = armiCompetenti(pg);
  const out = [];
  const monaco = haEffetto(pg, 'artiMarziali');
  const dadoMonaco = pg.livello >= 17 ? '1d10' : pg.livello >= 11 ? '1d8' : pg.livello >= 5 ? '1d6' : '1d4';
  const armiUniche = [...new Set([...pg.armi, 'colpo'])];
  for (const id of armiUniche) {
    const a = B.ARMI[id]; if (!a) continue;
    const accurata = a.prop.includes('accurata');
    const armaMonaco = monaco && (id === 'colpo' || id === 'spadacorta' || (a.cat === 'semplice' && !a.prop.includes('pesante') && !a.prop.includes('due mani')));
    const usaDes = !a.mischia || ((accurata || armaMonaco) && pg.mod.des > pg.mod.for);
    const m = usaDes ? pg.mod.des : pg.mod.for;
    const competente = comp.has(id) || id === 'colpo';
    let colpire = m + (competente ? pg.comp : 0);
    if (!a.mischia && pg.stili.includes('tiro')) colpire += 2;
    let dado = id === 'colpo' ? (monaco ? dadoMonaco : '1') : a.danno;
    if (armaMonaco && id !== 'colpo' && media(dadoMonaco) > media(dado)) dado = dadoMonaco;
    let bonusDanno = m;
    if (a.mischia && pg.stili.includes('duellare') && !a.prop.includes('due mani')) bonusDanno += 2;
    const danno = `${dado}${bonusDanno ? segno(bonusDanno) : ''}`;
    const gittata = a.gittata ? [Math.round(a.gittata[0] * 0.3), Math.round(a.gittata[1] * 0.3)] : null;
    out.push({ id, nome: a.nome, colpire, danno, tipo: a.tipo, mischia: a.mischia, portata: a.prop.includes('portata') ? 3 : 1.5, gittata, lancio: a.prop.includes('lancio'), prop: a.prop, versatile: a.versatile ? `${a.versatile}${bonusDanno ? segno(bonusDanno) : ''}` : null, desc: usaDes ? 'Destrezza' : 'Forza' });
  }
  // armi magiche trovate durante l'avventura: come l'arma di base, più il bonus magico
  for (const m of pg.armiMagiche || []) {
    const baseA = out.find((x) => x.id === m.base) || (() => { const tmp = { ...pg, armi: [m.base], armiMagiche: [] }; return attacchiDi(tmp).find((x) => x.id === m.base); })();
    if (!baseA) continue;
    const b = Number(m.bonus) || 0;
    const danno = b ? baseA.danno.replace(/([+-]\d+)?$/, (x) => segno((Number(x) || 0) + b)) : baseA.danno;
    out.push({ ...baseA, id: m.id, nome: m.nome, colpire: baseA.colpire + b, danno, magica: true });
  }
  return out;
}

// ---------- prove e tiri salvezza (fuori dal combattimento o dentro) ----------
// tipo: chiave di abilità ('furtivita') o di caratteristica ('for'); opz: vantaggio/svantaggio/cd/bonusExtra
function prova(pg, tipo, opz = {}) {
  const ab = B.ABILITA[tipo];
  const car = ab ? ab.car : B.CARATTERISTICHE[tipo] ? tipo : null;
  if (!car) return { errore: 'Prova sconosciuta' };
  let bonus = ab ? bonusAbilita(pg, tipo) : pg.mod[car] + (haEffetto(pg, 'factotum') ? Math.floor(pg.comp / 2) : 0);
  let svantaggio = !!opz.svantaggio, vantaggio = !!opz.vantaggio;
  if (pg.condizioni.includes('avvelenato') || pg.esaurimento >= 1) svantaggio = true;
  if (pg.condizioni.includes('spaventato')) svantaggio = true;
  if (car === 'for' && pg.effetti.some((e) => e.effetto === 'ira')) vantaggio = true;
  if (tipo === 'furtivita' && pg.armatura && B.ARMATURE[pg.armatura].furtivita) svantaggio = true;
  if (pg.effetti.some((e) => e.effetto === 'potenzia' && (!e.car || e.car === car))) vantaggio = true;
  const extra = [];
  if (pg.effetti.some((e) => e.effetto === 'guida')) { const g = d(4); bonus += g; extra.push(`guida +${g}`); pg.effetti = pg.effetti.filter((e) => e.effetto !== 'guida'); }
  if (opz.ispirazione) { const g = tira(opz.ispirazione).totale; bonus += g; extra.push(`ispirazione +${g}`); }
  if (tipo === 'furtivita' && pg.effetti.some((e) => e.effetto === 'senzaTracce')) { bonus += 10; extra.push('senza tracce +10'); }
  const t = d20({ vantaggio, svantaggio, fortunato: haEffetto(pg, 'fortunato') });
  let valore = t.valore;
  if (ab && pg.livello >= 11 && pg.classe === 'ladro' && pg.abilita.includes(tipo)) valore = Math.max(10, valore); // dote affidabile
  const totale = valore + bonus + (opz.bonusExtra || 0);
  const cd = Number(opz.cd) || null;
  return { chi: pg.nome, tipo, nomeTipo: ab ? ab.nome : B.CARATTERISTICHE[car].nome, d20: t, bonus, totale, cd, riuscita: cd ? totale >= cd : null, extra, naturale: t.valore };
}
function salvezza(pg, car, opz = {}) {
  if (!B.CARATTERISTICHE[car]) return { errore: 'Tiro salvezza sconosciuto' };
  let bonus = bonusSalvezza(pg, car) + (opz.bonusExtra || 0);
  let vantaggio = !!opz.vantaggio, svantaggio = !!opz.svantaggio;
  const cond = pg.condizioni || [];
  if ((car === 'for' || car === 'des') && ['paralizzato', 'stordito', 'privo', 'pietrificato'].some((x) => cond.includes(x))) return { chi: pg.nome, car, d20: { valore: 0, dadi: [], modo: 'auto' }, bonus, totale: 0, cd: opz.cd, riuscita: false, auto: true };
  if (car === 'for' && (pg.effetti || []).some((e) => e.effetto === 'ira')) vantaggio = true;
  if (car === 'des' && (pg.effetti || []).some((e) => e.effetto === 'velocita')) vantaggio = true;
  if (car === 'des' && cond.includes('trattenuto')) svantaggio = true;
  if ((pg.esaurimento || 0) >= 3) svantaggio = true;
  if (opz.contro === 'affascinato' && pg.stirpe && haEffetto(pg, 'fatato')) vantaggio = true;
  if (opz.contro === 'spaventato' && pg.stirpe && haEffetto(pg, 'coraggio')) vantaggio = true;
  if (opz.contro === 'veleno' && pg.stirpe && haEffetto(pg, 'resVeleno')) vantaggio = true;
  if (opz.magia && ['int', 'sag', 'car'].includes(car) && pg.stirpe && haEffetto(pg, 'astuzia')) vantaggio = true;
  const extra = [];
  for (const e of pg.effetti || []) {
    if (e.effetto === 'benedizione') { const g = d(4); bonus += g; extra.push(`benedizione +${g}`); }
    if (e.effetto === 'anatema') { const g = d(4); bonus -= g; extra.push(`anatema -${g}`); }
    if (e.effetto === 'resistenza') { const g = d(4); bonus += g; extra.push(`resistenza +${g}`); }
  }
  if ((pg.effetti || []).some((e) => e.effetto === 'resistenza')) pg.effetti = pg.effetti.filter((e) => e.effetto !== 'resistenza');
  if (opz.aura) { bonus += opz.aura; extra.push(`aura +${opz.aura}`); }
  const t = d20({ vantaggio, svantaggio, fortunato: pg.stirpe ? haEffetto(pg, 'fortunato') : false });
  const totale = t.valore + bonus;
  return { chi: pg.nome, car, nomeTipo: `salvezza su ${B.CARATTERISTICHE[car].nome}`, d20: t, bonus, totale, cd: opz.cd || null, riuscita: opz.cd ? totale >= opz.cd : null, extra, naturale: t.valore };
}

// ---------- danni, cure, morte ----------
// tipoDanno e magico servono per resistenze/immunità; restituisce i danni subiti davvero
function applicaDanno(c, quanti, tipoDanno, { critico = false, magico = false, arma = false } = {}) {
  if (c.morto) return 0;
  let q = Math.max(0, Math.floor(quanti));
  const res = c.resistente || [], imm = c.immune || [], vul = c.vulnerabile || [];
  const fisico = ['contundente', 'perforante', 'taglio'].includes(tipoDanno);
  if (imm.includes(tipoDanno) || (arma && fisico && !magico && imm.includes('arma'))) q = 0;
  else {
    let resiste = res.includes(tipoDanno) || (arma && fisico && !magico && res.includes('arma'));
    if (c.effetti && c.effetti.some((e) => e.effetto === 'ira') && fisico) resiste = true;
    if (c.effetti && c.effetti.some((e) => e.effetto === 'interdizione') && fisico && arma) resiste = true;
    if (c.effetti && c.effetti.some((e) => e.effetto === 'pietra') && fisico && !magico) resiste = true;
    if (c.stirpe === 'tiefling' && tipoDanno === 'fuoco') resiste = true;
    if (c.stirpe === 'nano' && tipoDanno === 'veleno') resiste = true;
    if (c.stirpe === 'dragonide' && c.discendenza && B.DISCENDENZE[c.discendenza].danno === tipoDanno) resiste = true;
    if (resiste) q = Math.floor(q / 2);
    if (vul.includes(tipoDanno)) q *= 2;
  }
  const subiti = q;
  if (c.pfTemp > 0) { const t = Math.min(c.pfTemp, q); c.pfTemp -= t; q -= t; }
  if (q <= 0) return subiti;
  if (c.pf <= 0 && c.pg) {
    // già a terra: un fallimento (due se critico); danno enorme = morte
    if (q >= c.pfMax) { c.morto = true; return subiti; }
    c.morte.fallimenti += critico ? 2 : 1;
    if (c.morte.fallimenti >= 3) c.morto = true;
    c.stabile = false;
    return subiti;
  }
  c.pf -= q;
  if (c.pf <= 0) {
    const resto = -c.pf;
    // interdizione alla morte e tenacia implacabile (mezzorco)
    const interd = (c.effetti || []).find((e) => e.effetto === 'interdizioneMorte');
    if (interd) { c.pf = 1; c.effetti = c.effetti.filter((e) => e !== interd); return subiti; }
    if (c.pg && c.stirpe === 'mezzorco' && c.risorse && c.risorse.tenacia && c.risorse.tenacia.usati < 1 && resto < c.pfMax) { c.risorse.tenacia.usati = 1; c.pf = 1; c.ultimoEvento = 'tenacia'; return subiti; }
    c.pf = 0;
    if (c.pg) {
      if (resto >= c.pfMax) { c.morto = true; return subiti; }
      if (!c.condizioni.includes('privo')) c.condizioni.push('privo');
      if (!c.condizioni.includes('prono')) c.condizioni.push('prono');
      c.morte = { successi: 0, fallimenti: 0 }; c.stabile = false;
      terminaConcentrazione(c);
      c.effetti = (c.effetti || []).filter((e) => e.effetto !== 'ira');
    } else c.morto = true;
  } else if (c.concentrazione) {
    // concentrazione: tiro salvezza su Costituzione, CD 10 o metà del danno
    const ts = c.pg ? salvezza(c, 'cos', { cd: Math.max(10, Math.floor(q / 2)) }) : { riuscita: d(20) + (c.mod ? c.mod.cos : 0) >= Math.max(10, Math.floor(q / 2)) };
    if (!ts.riuscita) { c.ultimoEvento = 'concentrazione'; terminaConcentrazione(c); }
  }
  return subiti;
}
function cura(c, quanti) {
  if (c.morto) return 0;
  const prima = c.pf;
  c.pf = Math.min(c.pfMax, c.pf + Math.max(0, Math.floor(quanti)));
  if (prima <= 0 && c.pf > 0) { c.condizioni = c.condizioni.filter((x) => x !== 'privo'); c.morte = { successi: 0, fallimenti: 0 }; c.stabile = false; }
  return c.pf - prima;
}
// tiro contro la morte, all'inizio del turno di chi è a terra
function tiroMorte(pg) {
  if (pg.morto || pg.pf > 0 || pg.stabile) return null;
  const v = d(20);
  let esito;
  if (v === 20) { pg.pf = 1; pg.condizioni = pg.condizioni.filter((x) => x !== 'privo'); pg.morte = { successi: 0, fallimenti: 0 }; esito = 'si rialza'; }
  else if (v === 1) { pg.morte.fallimenti += 2; esito = 'due fallimenti'; }
  else if (v >= 10) { pg.morte.successi++; esito = 'successo'; }
  else { pg.morte.fallimenti++; esito = 'fallimento'; }
  if (pg.morte.fallimenti >= 3) { pg.morto = true; esito = 'muore'; }
  else if (pg.morte.successi >= 3) { pg.stabile = true; esito = 'stabile'; }
  return { valore: v, esito, successi: pg.morte.successi, fallimenti: pg.morte.fallimenti };
}
function terminaConcentrazione(c) {
  if (!c.concentrazione) return;
  const id = c.concentrazione; c.concentrazione = null;
  if (c.onFineConcentrazione) c.onFineConcentrazione(id);
}

// ---------- risorse e riposi ----------
function ripristinaRisorse(pg, tipo) {
  const cl = CLASSI[pg.classe];
  pg.risorse = pg.risorse || {};
  for (const [k, r] of Object.entries(cl.risorse || {})) {
    const max = r.usi(pg.livello, pg);
    if (max <= 0) { delete pg.risorse[k]; continue; }
    const rip = typeof r.riposo === 'function' ? r.riposo(pg.livello) : r.riposo;
    if (!pg.risorse[k]) pg.risorse[k] = { nome: r.nome, max, usati: 0, punti: !!r.punti };
    pg.risorse[k].max = max;
    if (tipo === 'lungo' || rip === 'breve') pg.risorse[k].usati = 0;
  }
  if (pg.stirpe === 'mezzorco' && (tipo === 'lungo' || !pg.risorse.tenacia)) pg.risorse.tenacia = { nome: 'Tenacia implacabile', max: 1, usati: 0 };
  if (pg.stirpe === 'dragonide' && (tipo !== 'nessuno' || !pg.risorse.soffio)) pg.risorse.soffio = { nome: 'Soffio', max: 1, usati: 0 };
  if (pg.magia) {
    pg.magia.slot = slotPer((CLASSI[pg.classe].magia || {}).tipo, pg.livello);
    if (!pg.magia.slotUsati || pg.magia.slotUsati.length !== pg.magia.slot.length) pg.magia.slotUsati = pg.magia.slot.map(() => 0);
    if (tipo === 'lungo' || (tipo === 'breve' && pg.classe === 'warlock')) pg.magia.slotUsati = pg.magia.slot.map(() => 0);
  }
}
function riposo(pg, tipo, { dadiDaSpendere = null } = {}) {
  if (pg.morto) return { errore: `${pg.nome} è morto` };
  const out = { chi: pg.nome, tipo, curati: 0, dadi: [] };
  if (tipo === 'lungo') {
    out.curati = pg.pfMax - pg.pf;
    pg.pf = pg.pfMax; pg.pfTemp = 0;
    pg.dadiVita.restanti = Math.min(pg.dadiVita.tot, pg.dadiVita.restanti + Math.max(1, Math.floor(pg.dadiVita.tot / 2)));
    pg.condizioni = pg.condizioni.filter((x) => !['privo', 'prono'].includes(x));
    pg.esaurimento = Math.max(0, pg.esaurimento - 1);
    pg.morte = { successi: 0, fallimenti: 0 }; pg.stabile = false;
    pg.effetti = pg.effetti.filter((e) => e.durata === 'giorno');
  } else {
    // breve: si spendono dadi vita finché servono (o quanti detto)
    const n = dadiDaSpendere == null ? Infinity : dadiDaSpendere;
    let spesi = 0;
    while (pg.dadiVita.restanti > 0 && spesi < n && pg.pf < pg.pfMax) {
      const v = Math.max(1, d(pg.dadiVita.dado) + pg.mod.cos);
      out.dadi.push(v); out.curati += cura(pg, v); pg.dadiVita.restanti--; spesi++;
      if (dadiDaSpendere == null && pg.pf >= pg.pfMax * 0.75) break;
    }
  }
  ripristinaRisorse(pg, tipo);
  ricalcola(pg);
  return out;
}

// ---------- livelli ----------
function livelloDaPx(px) { let l = 1; while (l < 20 && px >= PX_LIVELLO[l]) l++; return l; }
// sale di livello: punti ferita (media), nuovi slot e privilegi; restituisce le scelte che servono (incantesimi, aumenti)
function saliLivello(pg, scelte = {}) {
  if (pg.livello >= 20) return { errore: 'Livello massimo' };
  const cl = CLASSI[pg.classe];
  pg.livello++;
  const aumento = [...AUMENTI, ...(cl.aumentiExtra || [])].includes(pg.livello);
  if (aumento) {
    const a = Array.isArray(scelte.aumenti) && scelte.aumenti.length ? scelte.aumenti.slice(0, 2) : [cl.principale[0], cl.principale[0]];
    for (const k of a) if (B.CARATTERISTICHE[k]) pg.car[k] = Math.min(20, pg.car[k] + 1);
  }
  if (pg.livello === 20 && haEffetto(pg, 'campionePrimordiale')) { pg.car.for = Math.min(24, pg.car.for + 4); pg.car.cos = Math.min(24, pg.car.cos + 4); }
  ricalcolaMod(pg);
  const vecchiMax = pg.pfMax;
  pg.pfMax = pfMassimi(pg);
  pg.pf += pg.pfMax - vecchiMax;
  pg.dadiVita.tot = pg.livello; pg.dadiVita.restanti++;
  // incantesimi: si aggiungono da soli quelli che mancano (il giocatore li può cambiare)
  if (pg.magia && pg.magia.modo) {
    const lm = limitiMagia(pg);
    pg.magia.sempre = incantesimiSottoclasse(pg);
    const okT = perClasse(pg.classe, 0).map((x) => x.id).filter((x) => !pg.magia.trucchetti.includes(x));
    while (pg.magia.trucchetti.length < lm.trucchi && okT.length) pg.magia.trucchetti.push(scelte.trucchetto && okT.includes(scelte.trucchetto) ? okT.splice(okT.indexOf(scelte.trucchetto), 1)[0] : okT.shift());
    const ok = perClasse(pg.classe, lm.livMax).filter((x) => x.liv >= 1 && !pg.magia.incantesimi.includes(x.id) && !pg.magia.libro.includes(x.id) && !pg.magia.sempre.includes(x.id)).sort((x, y) => y.liv - x.liv);
    const voluti = (Array.isArray(scelte.incantesimi) ? scelte.incantesimi : []).filter((x) => ok.some((s) => s.id === x));
    const prendi = () => (voluti.length ? ok.splice(ok.findIndex((s) => s.id === voluti.shift()), 1)[0].id : ok.length ? ok.shift().id : null);
    if (lm.modo === 'libro') { for (let k = 0; k < 2; k++) { const x = prendi(); if (x) pg.magia.libro.push(x); } }
    const quanti = lm.incantesimi;
    const fonte = lm.modo === 'libro' ? pg.magia.libro.filter((x) => !pg.magia.incantesimi.includes(x)) : null;
    while (pg.magia.incantesimi.length < quanti) { const x = fonte ? fonte.shift() : prendi(); if (!x) break; pg.magia.incantesimi.push(x); }
  }
  if (pg.classe === 'warlock') { const tutte = Object.keys(SUPPLICHE).filter((x) => !(pg.suppliche || []).includes(x)); pg.suppliche = pg.suppliche || []; while (pg.suppliche.length < nSuppliche(pg.livello) && tutte.length) pg.suppliche.push(tutte.shift()); }
  ripristinaRisorse(pg, 'nessuno');
  ricalcola(pg);
  return { ok: true, livello: pg.livello, aumento, nuovi: privilegiDi(pg).filter((p) => p.l === pg.livello).map((p) => p.nome) };
}
function aggiungiPx(pg, px) {
  pg.px += Math.max(0, Math.floor(px));
  let saliti = 0;
  while (pg.livello < 20 && pg.px >= PX_LIVELLO[pg.livello]) { saliLivello(pg); saliti++; }
  return saliti;
}

// ---------- scelte automatiche ("scegli tu per me" e compagni del computer) ----------
const PRIORITA_CAR = {
  barbaro: ['for', 'cos', 'des', 'sag', 'car', 'int'], bardo: ['car', 'des', 'cos', 'sag', 'int', 'for'], chierico: ['sag', 'cos', 'for', 'des', 'car', 'int'],
  druido: ['sag', 'cos', 'des', 'int', 'car', 'for'], guerriero: ['for', 'cos', 'des', 'sag', 'car', 'int'], ladro: ['des', 'cos', 'int', 'sag', 'car', 'for'],
  mago: ['int', 'cos', 'des', 'sag', 'car', 'for'], monaco: ['des', 'sag', 'cos', 'for', 'int', 'car'], paladino: ['for', 'car', 'cos', 'sag', 'des', 'int'],
  ranger: ['des', 'sag', 'cos', 'for', 'int', 'car'], stregone: ['car', 'cos', 'des', 'sag', 'int', 'for'], warlock: ['car', 'cos', 'des', 'sag', 'int', 'for'],
};
const caso = (a) => a[Math.floor(Math.random() * a.length)];
const mescola = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
// completa le scelte mancanti in modo sensato (non cambia quelle già fatte e valide)
function completaScelte(s = {}) {
  const out = { ...s };
  if (!B.STIRPI[out.stirpe]) out.stirpe = caso(Object.keys(B.STIRPI));
  if (!CLASSI[out.classe]) out.classe = caso(Object.keys(CLASSI));
  if (!B.BACKGROUND[out.background]) out.background = caso(Object.keys(B.BACKGROUND));
  if (!['m', 'f', 'n'].includes(out.genere)) out.genere = caso(['m', 'f']);
  const st = B.STIRPI[out.stirpe], cl = CLASSI[out.classe], bg = B.BACKGROUND[out.background];
  if (!out.nome || !String(out.nome).trim()) out.nome = caso(st.nomi[out.genere === 'f' ? 'f' : 'm']);
  if (!out.livello) out.livello = 1;
  // caratteristiche: la serie standard sulle priorità della classe
  if (!out.metodo || controllaCaratteristiche(out.base, out.metodo, out.tirati)) {
    const valori = out.metodo === 'dadi' && out.tirati && out.tirati.length === 6 ? out.tirati.slice().sort((x, y) => y - x) : STANDARD;
    out.metodo = out.metodo === 'dadi' && out.tirati && out.tirati.length === 6 ? 'dadi' : 'standard';
    out.base = {}; PRIORITA_CAR[out.classe].forEach((k, i) => { out.base[k] = valori[i]; });
  }
  if (st.bonusScelti && (!Array.isArray(out.bonusScelti) || out.bonusScelti.length !== st.bonusScelti)) out.bonusScelti = PRIORITA_CAR[out.classe].filter((k) => k !== 'car').slice(0, st.bonusScelti);
  if ((out.stirpe === 'dragonide' || out.classe === 'stregone') && !B.DISCENDENZE[out.discendenza]) out.discendenza = caso(Object.keys(B.DISCENDENZE));
  const fisse = new Set([...bg.abilita, ...st.tratti.flatMap((t) => t.abilita || [])]);
  const lista = listaAbilitaClasse(cl).filter((a) => !fisse.has(a));
  const ab = (Array.isArray(out.abilita) ? out.abilita : []).filter((a) => lista.includes(a));
  for (const a of mescola(lista)) if (ab.length < cl.abilita.n && !ab.includes(a)) ab.push(a);
  out.abilita = ab.slice(0, cl.abilita.n);
  const libere = mescola(Object.keys(B.ABILITA).filter((a) => !fisse.has(a) && !out.abilita.includes(a)));
  out.abilitaExtra = (Array.isArray(out.abilitaExtra) ? out.abilitaExtra : []).filter((a) => libere.includes(a));
  const nExtra = st.tratti.reduce((n, t) => n + (t.abilitaScelte || 0), 0) + (out.classe === 'bardo' && out.livello >= 3 ? 3 : 0);
  for (const a of libere) if (out.abilitaExtra.length < nExtra && !out.abilitaExtra.includes(a)) out.abilitaExtra.push(a);
  out.abilitaExtra = out.abilitaExtra.slice(0, nExtra);
  const tutteAb = [...fisse, ...out.abilita, ...out.abilitaExtra];
  out.maestria = [...(Array.isArray(out.maestria) ? out.maestria : []), ...['furtivita', 'percezione', 'rapidita', 'persuasione', 'inganno', 'acrobazia', ...tutteAb]].filter((a, i, arr) => tutteAb.includes(a) && arr.indexOf(a) === i).slice(0, 4);
  if (!Array.isArray(out.stili) || !out.stili.length) out.stili = out.classe === 'ranger' ? ['tiro', 'difesa'] : out.classe === 'paladino' ? ['difesa', 'duellare'] : caso([['difesa', 'duellare'], ['duellare', 'difesa'], ['armiGrandi', 'difesa']]);
  if (out.equip == null) out.equip = 0;
  // incantesimi: i più utili per la classe
  if (cl.magia) {
    const finto = { classe: out.classe, livello: out.livello, mod: {}, comp: COMPETENZA(out.livello) };
    const nAum = [...AUMENTI, ...(cl.aumentiExtra || [])].filter((l) => l <= out.livello).length * 2;
    const aum = Array.isArray(out.aumenti) && out.aumenti.length ? out.aumenti : new Array(nAum).fill(cl.principale[0]);
    for (const k of B.ORDINE_CAR) finto.mod[k] = mod(Math.min(20, out.base[k] + (st.bonus[k] || 0) + ((out.bonusScelti || []).includes(k) ? 1 : 0) + aum.filter((x) => x === k).length));
    const lm = limitiMagia(finto);
    const preferiti = ['deflagrazione', 'dardoFuoco', 'fiammaSacra', 'scherno', 'produrreFiamma', 'raggioGelo', 'guida', 'luce', 'manoMagica', 'stretta', 'rintocco', 'salvare', 'resistenza', 'prestidigitazione', 'taumaturgia', 'druidismo', 'fiotto', 'spruzzo', 'messaggio', 'illusioneMinore', 'frusta', 'randelloIncantato'];
    const okT = perClasse(out.classe, 0).map((x) => x.id);
    const tr = (Array.isArray(out.trucchetti) ? out.trucchetti : []).filter((x) => okT.includes(x));
    for (const x of [...preferiti, ...okT]) if (tr.length < lm.trucchi && okT.includes(x) && !tr.includes(x)) tr.push(x);
    out.trucchetti = tr;
    const prefInc = ['curaferite', 'parolaGuaritrice', 'dardoIncantato', 'scudo', 'sonno', 'maniBrucianti', 'benedizione', 'dardoTracciante', 'marchio', 'maledizione', 'armaturaMagica', 'onda', 'intralcio', 'fuocoFatato', 'charme', 'comando', 'scudoFede', 'raggioRovente', 'blocca', 'passoVelato', 'armaspirituale', 'invisibilita', 'frantumare', 'ragnatela', 'pallaDiFuoco', 'guardianoSpirito', 'fulmine', 'controincantesimo', 'velocita', 'ipnotico', 'rinascita', 'parolaMassa'];
    const sempre = incantesimiSottoclasse(finto);
    const ok = perClasse(out.classe, lm.livMax).filter((x) => x.liv >= 1 && !sempre.includes(x.id)).map((x) => x.id);
    const inc = (Array.isArray(out.incantesimi) ? out.incantesimi : []).filter((x) => ok.includes(x));
    const quanti = lm.modo === 'libro' ? lm.libro : lm.incantesimi;
    for (const x of [...prefInc, ...ok]) if (inc.length < quanti && ok.includes(x) && !inc.includes(x)) inc.push(x);
    out.incantesimi = inc;
  }
  if (out.classe === 'warlock' && (!Array.isArray(out.suppliche) || !out.suppliche.length)) out.suppliche = ['agonizzante', 'armaturaOmbre', 'vistaDiavolo', 'respinta', 'milleVolti', 'vistaMistica', 'lunghezza', 'vocePadrone'];
  return out;
}

// ---------- mostri ----------
// da un id del bestiario o da una scheda inventata dal master: { nome, pf, ca, attacchi: [{ nome, bonus, danno, tipo }] … }
let NUM_MOSTRO = 0;
function mostroDa(def, { pfMedi = true } = {}) {
  let base = null;
  if (typeof def === 'string') base = MOSTRI[def];
  else if (def && def.id && MOSTRI[def.id]) base = { ...MOSTRI[def.id], ...(def.nome ? { nome: String(def.nome).slice(0, 30) } : {}) };
  else if (def && typeof def === 'object') {
    // inventato: si controllano e si limitano i valori
    const num = (v, a, b, x) => { const n = Number(v); return Number.isFinite(n) ? Math.max(a, Math.min(b, Math.round(n))) : x; };
    const gs = Number(def.gs) || 1;
    const carx = {}; for (const k of B.ORDINE_CAR) carx[k] = num(def.car && def.car[k], 1, 30, 10);
    const attacchi = (Array.isArray(def.attacchi) ? def.attacchi : []).slice(0, 4).map((a) => ({
      nome: String(a.nome || 'Attacco').slice(0, 30), bonus: num(a.bonus, -2, 20, 4), danno: /^[\dd+\- ]+$/i.test(String(a.danno || '')) ? String(a.danno).replace(/\s/g, '') : '1d6+2',
      tipo: B.TIPI_DANNO[a.tipo] ? a.tipo : 'contundente', ...(a.gittata ? { gittata: num(a.gittata, 3, 200, 24) } : {}),
    }));
    if (!attacchi.length) attacchi.push({ nome: 'Colpo', bonus: 3 + Math.ceil(gs), danno: `1d8+${2 + Math.ceil(gs)}`, tipo: 'contundente' });
    base = {
      id: 'inventato', nome: String(def.nome || 'Creatura').slice(0, 30), tipo: String(def.tipo || 'mostruosità').slice(0, 30), taglia: String(def.taglia || 'Media'),
      ca: num(def.ca, 5, 25, 12), pf: def.pf != null && /^\d+$/.test(String(def.pf)) ? String(num(def.pf, 1, 700, 20)) : (/^\d+d\d+([+-]\d+)?$/.test(String(def.pf || '')) ? def.pf : '4d8'),
      vel: num(def.vel, 0, 36, 9), vola: !!def.vola, car: carx, gs, px: num(def.px, 0, 155000, require('./mostri').PX[gs] || 100),
      attacchi, multi: num(def.multi, 1, 5, 1), tratti: [], resistente: (def.resistente || []).filter((x) => B.TIPI_DANNO[x] || x === 'arma'), immune: (def.immune || []).filter((x) => B.TIPI_DANNO[x] || x === 'arma'), vulnerabile: (def.vulnerabile || []).filter((x) => B.TIPI_DANNO[x]),
      descrizione: String(def.descrizione || '').slice(0, 300),
      aspetto: { s: typeof def.simbolo === 'string' && def.simbolo.length <= 4 ? def.simbolo : '👾', col: /^#[0-9a-f]{6}$/i.test(def.colore || '') ? def.colore : '#8a3a3a' },
      ...(def.soffio ? { soffio: { danno: String(def.soffio.danno || '6d6'), tipo: B.TIPI_DANNO[def.soffio.tipo] ? def.soffio.tipo : 'fuoco', ts: B.CARATTERISTICHE[def.soffio.ts] ? def.soffio.ts : 'des', cd: num(def.soffio.cd, 8, 25, 13), forma: def.soffio.forma === 'linea' ? 'linea' : 'cono', m: num(def.soffio.m, 3, 30, 9) } } : {}),
    };
  }
  if (!base) return null;
  const pf = /^\d+$/.test(String(base.pf)) ? Number(base.pf) : pfMedi ? Math.max(1, media(base.pf)) : Math.max(1, tira(base.pf).totale);
  const modi = {}; for (const k of B.ORDINE_CAR) modi[k] = mod(base.car[k]);
  return {
    uid: `m${++NUM_MOSTRO}`, mostro: base.id, nome: base.nome, tipo: base.tipo, taglia: base.taglia, ca: base.ca, pf, pfMax: pf, pfTemp: 0,
    velocita: base.vel, vola: !!base.vola, car: { ...base.car }, mod: modi, gs: base.gs, px: base.px, attacchi: base.attacchi.map((a) => ({ ...a })), multi: base.multi || 1,
    incantesimi: base.incantesimi ? { ...base.incantesimi, slotUsati: base.incantesimi.slot.map(() => 0) } : null, soffio: base.soffio ? { ...base.soffio, pronto: true } : null,
    tratti: base.tratti || [], resistente: base.resistente || [], immune: base.immune || [], vulnerabile: base.vulnerabile || [],
    aspetto: base.aspetto || { s: '👾', col: '#8a3a3a' }, descrizione: base.descrizione || '', condizioni: [], effetti: [], concentrazione: null, morto: false,
  };
}

// ---------- il riassunto di un personaggio per il master (testo compatto) ----------
function schedaBreve(pg) {
  const cl = CLASSI[pg.classe], st = B.STIRPI[pg.stirpe];
  const ab = pg.abilita.map((a) => B.ABILITA[a].nome).join(', ');
  const inc = pg.magia ? ` · incantesimi: ${[...pg.magia.trucchetti, ...pg.magia.sempre, ...pg.magia.incantesimi].map((x) => INCANTESIMI[x] ? INCANTESIMI[x].nome : x).join(', ')} · slot liberi ${pg.magia.slot.map((n, i) => `${i + 1}°:${n - pg.magia.slotUsati[i]}`).join(' ')}` : '';
  const ogg = pg.oggetti.slice(0, 12).map((o) => (o.n > 1 ? `${o.nome} ×${o.n}` : o.nome)).join(', ');
  return `${pg.nome} (${pg.genere === 'f' ? 'lei' : pg.genere === 'm' ? 'lui' : 'loro'}): ${st.nome} ${cl.nome} ${pg.livello}° (${cl.sottoclasse.nome}), background ${B.BACKGROUND[pg.background].nome}. PF ${pg.pf}/${pg.pfMax}${pg.pfTemp ? ` (+${pg.pfTemp} temp.)` : ''}, CA ${pg.ca}. ${B.ORDINE_CAR.map((k) => `${B.CARATTERISTICHE[k].breve} ${pg.car[k]}`).join(' ')}. Abilità: ${ab}. Armi: ${pg.attacchi.filter((a) => a.id !== 'colpo').map((a) => a.nome).join(', ') || 'nessuna'}${pg.armatura ? `, armatura ${B.ARMATURE[pg.armatura].nome}` : ''}${pg.scudo ? ', scudo' : ''}. Oggetti: ${ogg}; ${pg.oro} mo${inc}.${pg.condizioni.length ? ` Condizioni: ${pg.condizioni.join(', ')}.` : ''}${pg.morto ? ' MORTO.' : pg.pf <= 0 ? ' A TERRA, morente.' : ''}${pg.storia ? ` Storia: ${pg.storia}` : ''}`;
}

module.exports = {
  d, tira, media, d20, mod, segno, tiraCaratteristiche, controllaCaratteristiche, COSTO_PUNTI, STANDARD,
  creaPersonaggio, completaScelte, ricalcola, privilegiDi, haEffetto, limitiMagia, incantesimiSottoclasse, armiCompetenti, listaAbilitaClasse,
  bonusAbilita, bonusSalvezza, prova, salvezza, applicaDanno, cura, tiroMorte, terminaConcentrazione, riposo, ripristinaRisorse,
  saliLivello, aggiungiPx, livelloDaPx, PX_LIVELLO, mostroDa, schedaBreve, ASPETTO, pulisciAspetto, nSuppliche, caso, mescola,
};
