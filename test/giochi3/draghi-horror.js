// DRAGHI E SEGRETE, le ambientazioni horror (Sevastopol, PATHOS-II, Mount Massive): catalogo a tema (solo umani,
// classi e passati a tema), mappa a settori tutta raggiungibile, le tre campagne a turni giocate fino al finale col
// master di riserva, la modalità in tempo reale (creatura, armadietti, rilevatore, obiettivi), le due IA della creatura
// (direttrice e abitudini) e !revive che riporta in vita a turni, in combattimento e in tempo reale.
const assert = require('assert');
const G = require('../../giochi3/draghi');
const H = require('../../giochi3/draghi/horror');
const S = require('../../giochi3/draghi/stazione');
const D = require('../../giochi3/draghi/direttore');
const INC = require('../../giochi3/draghi/incubo');

const aspetta = () => new Promise((r) => setImmediate(r));
function nuova(amb, opz = {}) {
  const g = G.crea({ n: 2, bot: [null, 'medio'], opzioni: { ambientazione: amb, ...opz } });
  g.chiave = ''; // niente Gemini: master di riserva
  return g;
}

(async () => {
  const t0 = Date.now();
  // ---------- catalogo e creazione ----------
  for (const amb of Object.keys(H.CAMPAGNE)) {
    const g = nuova(amb);
    const cat = g.vista(0).catalogo;
    assert.deepStrictEqual(Object.keys(cat.stirpi), ['umano'], `${amb}: solo umani`);
    assert.ok(Object.keys(cat.classi).length >= 3 && Object.keys(cat.classi).every((c) => H.CLASSI[c]), `${amb}: solo classi a tema`);
    assert.ok(cat.stirpi.umano.nomi.f.length > 2, `${amb}: nomi dell'ambientazione`);
    assert.ok(g.azione(0, { tipo: 'crea', scelte: { classe: 'mago' } }).errore, `${amb}: le classi fantasy non si scelgono`);
    assert.ok(!g.azione(0, { tipo: 'crea', casuale: true, scelte: {} }).errore);
    const pg = g.pg[0];
    assert.strictEqual(pg.stirpe, 'umano');
    assert.ok(pg.oggetti.every((o) => H.OGGETTI[o.id]), `${amb}: niente oggetti fantasy`);
    if (!H.CAMPAGNE[amb].armi) assert.ok(pg.attacchi.every((a) => !H.ARMI[a.id] || H.ARMI[a.id].mischia), `${amb}: niente armi da fuoco`);
  }
  { const g = G.crea({ n: 1, bot: [null], opzioni: { ambientazione: 'classica' } }); assert.ok(Object.keys(g.vista(0).catalogo.classi).every((c) => !H.CLASSI[c]), 'il fantasy non vede le classi a tema'); }

  // ---------- la mappa: ogni settore, obiettivo e cassa si raggiunge ----------
  for (const [id, cp] of Object.entries(H.CAMPAGNE)) for (const seme of [1, 7, 42]) {
    const m = S.generaStazione(cp, seme);
    const vis = new Set([m.partenza.y * m.w + m.partenza.x]), coda = [...vis];
    const tele = new Map(); for (const p of m.passaggi) if (p.capi) { const [a, b] = p.capi.map((c) => c.y * m.w + c.x); tele.set(a, b); tele.set(b, a); }
    while (coda.length) {
      const i = coda.pop(), x = i % m.w, y = Math.floor(i / m.w);
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (y + dy) * m.w + x + dx); if (tele.has(i)) nb.push(tele.get(i));
      for (const j of nb) { const ch = m.g[j]; if (vis.has(j) || !(!S.BLOCCA.has(ch) || 'LEvock'.includes(ch))) continue; vis.add(j); if (!'ock'.includes(ch)) coda.push(j); }
    }
    for (const a of cp.aree) { let ok = false; for (let y = a.gy * m.sh; y < (a.gy + 1) * m.sh && !ok; y++) for (let x = a.gx * m.sw; x < (a.gx + 1) * m.sw; x++) if (vis.has(y * m.w + x)) { ok = true; break; } assert.ok(ok, `${id}/${seme}: ${a.id} raggiungibile`); }
    assert.ok(m.punti.every((p) => vis.has(p.y * m.w + p.x)) && m.contenitori.every((p) => vis.has(p.y * m.w + p.x)), `${id}/${seme}: obiettivi e casse raggiungibili`);
  }

  // ---------- le campagne a turni fino al finale ----------
  const finali = [];
  for (const amb of Object.keys(H.CAMPAGNE)) {
    const g = nuova(amb);
    g.azione(0, { tipo: 'crea', casuale: true, scelte: {} }); g.azione(1, { tipo: 'crea', casuale: true, scelte: {} });
    for (let k = 0; k < 5; k++) { await aspetta(); g.controllaTempo(); }
    let giri = 0, revive = 0;
    while (!g.finita && giri++ < 900) {
      if (g.fase === 'avventura' && !g.attesaIA) {
        const v = g.vista(0).incubo;
        if (v.obiettivo && v.obiettivo.qui) g.azione(0, { tipo: 'incubo', az: 'obiettivo' });
        else {
          const meta = g.cp.obiettivi[g.incubo.obiettivo].area;
          const strade = v.strade.filter((s) => !s.chiuso).sort((a, b) => INC.passi(g.cp, a.id, meta) - INC.passi(g.cp, b.id, meta));
          if (Math.random() < 0.2) g.azione(0, { tipo: 'incubo', az: 'cerca' }); else g.azione(0, { tipo: 'incubo', az: 'vai', area: strade[0] && strade[0].id });
        }
      } else if (g.fase === 'prove') { for (const x of g.prove.filter((q) => !q.esito)) g.azione(x.posto, { tipo: 'tira', id: x.id }); } else if (g.fase === 'combattimento') { const att = g.attesi(); if (att.length) g.azione(att[0], { tipo: 'autoTurno' }); g.prossimaMossaMostro = 0; } else if (g.fase === 'caduti') { assert.ok(g.azione(0, { tipo: 'incubo', az: 'cerca' }).errore, 'da morti non si gioca'); assert.ok(g.revive() > 0); revive++; assert.strictEqual(g.fase, 'avventura'); assert.ok(g.pg.every((p) => !p.morto && p.pf === p.pfMax), '!revive: tutti vivi a punti ferita pieni'); }
      for (let k = 0; k < 3; k++) { await aspetta(); g.controllaTempo(); }
    }
    assert.ok(g.finita && g.incubo.fatti.length === g.cp.obiettivi.length, `${amb}: la campagna arriva al finale (${g.incubo.fatti.length}/${g.cp.obiettivi.length})`);
    assert.ok(g.incubo.mente && typeof g.incubo.mente.tensione === 'number', `${amb}: la direttrice lavora anche a turni`);
    JSON.stringify(g.vista(0));
    finali.push(`${amb} ${g.incubo.mosse} mosse, ${revive} !revive`);
  }

  // ---------- le due IA: direttrice e abitudini ----------
  {
    const m = D.nuovaMente();
    let capito = null; for (let k = 0; k < 4 && !capito; k++) capito = D.impara(m, 'armadietto');
    assert.strictEqual(capito, 'armadietto', 'dopo qualche armadietto la creatura ha capito');
    assert.ok(D.quanto(m, 'armadietto') >= 0.5);
    D.dimentica(m, 200); assert.ok(D.quanto(m, 'armadietto') < 0.5, 'e se cambiate strategia dimentica');
    // tanta tensione: tregua; tanta calma: un indizio vicino (ma non esatto) al gruppo
    let o; for (let t = 0; t < 10; t += 0.05) o = D.direttrice(m, 0.05, t, { dMin: 3, caccia: true, vede: true, fuori: true, difficolta: 'normale', gruppo: { x: 10, y: 10 } });
    assert.strictEqual(o, 'tregua');
    const n = D.nuovaMente();
    for (let t = 0; t < 60; t += 0.05) o = D.direttrice(n, 0.05, t, { dMin: 50, caccia: false, vede: false, fuori: false, difficolta: 'normale', gruppo: { x: 40, y: 30 } });
    assert.strictEqual(o, 'indizio'); assert.ok(Math.hypot(n.indizio.x - 40, n.indizio.y - 30) <= n.indizio.errore * 1.5);
    assert.strictEqual(D.direttriceTurni(D.nuovaMente(), 0, 'normale'), 'libera');
  }

  // ---------- in tempo reale ----------
  const reali = [];
  for (const amb of Object.keys(H.CAMPAGNE)) {
    const g = G.crea({ n: 3, bot: [null, 'medio', 'medio'], opzioni: { ambientazione: amb, modalita: 'reale' } });
    g.chiave = '';
    assert.strictEqual(g.modalita, 'reale');
    for (let i = 0; i < 3; i++) g.azione(i, { tipo: 'crea', casuale: true, scelte: {} });
    assert.strictEqual(g.fase, 'reale');
    assert.ok(typeof g.tick === 'function' && g.tickMs === 50);
    const R = g.reale, vf = g.vista(0).reale;
    assert.ok(vf.mappa.length === vf.w * vf.h && vf.w >= 136);
    let ora = Date.now(), seq = 1, maxMs = 0, morti = 0, rev = 0, blip = 0;
    for (let k = 0; k < 20 * 240; k++) {
      ora += 50;
      const p = R.gioc[0];
      if (g.fase === 'reale' && !g.pg[0].morto) {
        const meta = R.puntoObiettivo();
        const d = { mx: 0, my: 0, a: p.a, ril: k % 200 < 40 };
        if (!p.azione && meta) { if (Math.hypot(meta.x - p.x, meta.y - p.y) < 1.4) d.usa = ++seq; else { const v = R.verso(p, meta); d.mx = v.x; d.my = v.y; } }
        g.input(0, d);
      }
      if (g.fase === 'caduti') { morti++; assert.ok(g.revive() > 0); rev++; assert.strictEqual(g.fase, 'reale', '!revive torna al tempo reale'); }
      const a = Date.now(); g.tick(ora); const v = g.vistaTick(0); maxMs = Math.max(maxMs, Date.now() - a);
      if (v.blip) blip++;
      if (k === 20 * 60) { R.svegliaCreatura(); g.incubo.caccia.attiva = true; }
    }
    assert.ok(g.incubo.fatti.length >= 1, `${amb}: in tempo reale si completano obiettivi`);
    assert.ok(R.creatura, `${amb}: la creatura si sveglia`);
    assert.ok(g.cp.meccaniche.rilevatore ? blip > 0 : blip === 0, `${amb}: il rilevatore manda i bip (e nel manicomio non c'è)`);
    assert.ok(['libera', 'tregua', 'indizio'].includes(R.ordine));
    assert.ok(JSON.stringify(g.vistaTick(0)).length < 6000, 'il tick è leggero');
    // !revive anche con uno solo morto (gli altri vivi)
    g.revive(); g.pg[1].morto = true; g.pg[1].pf = 0;
    assert.strictEqual(g.revive(), 1); assert.ok(!g.pg[1].morto && g.pg[1].pf === g.pg[1].pfMax);
    reali.push(`${amb} ${g.incubo.fatti.length} obiettivi, tick max ${maxMs} ms`);
  }
  // ---------- !revive nel fantasy, in combattimento ----------
  {
    const g = G.crea({ n: 1, bot: [null], opzioni: {} }); g.chiave = '';
    g.azione(0, { tipo: 'crea', casuale: true, scelte: {} });
    for (let k = 0; k < 5; k++) { await aspetta(); g.controllaTempo(); }
    g.pg[0].pf = 0; g.pg[0].morto = true;
    assert.strictEqual(g.revive(), 1); assert.ok(!g.pg[0].morto && g.pg[0].pf === g.pg[0].pfMax, '!revive anche nel fantasy');
  }
  console.log(`✓ Draghi e Segrete horror: catalogo a tema, mappe raggiungibili, campagne a turni fino al finale (${finali.join(' · ')}), tempo reale (${reali.join(' · ')}), direttrice e abitudini della creatura, !revive ovunque (${Date.now() - t0} ms)`);
})().catch((e) => { console.error(e); process.exit(1); });
