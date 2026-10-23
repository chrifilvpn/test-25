// DRAGHI E SEGRETE — la creazione guidata del personaggio: nove passaggi (stirpe, classe, passato, caratteristiche,
// abilità, magia, equipaggiamento, aspetto, riepilogo) con il ritratto che cambia a ogni scelta. In ogni passaggio
// "scegli tu per me": stirpe, classe, passato, equipaggiamento e aspetto li sceglie il browser, caratteristiche,
// abilità e incantesimi il server (con le stesse priorità dei compagni del computer). Le regole sono le stesse del
// server (regole.js): qui servono a dire subito cosa manca, il controllo vero lo fa lui quando si crea il personaggio.
(() => {
  const { esc, suono } = window.Nuovi;
  const A = () => window.DraghiArte;
  const PASSI = [
    { id: 'stirpe', nome: 'Stirpe', ic: '🧝' }, { id: 'classe', nome: 'Classe', ic: '⚔️' }, { id: 'background', nome: 'Passato', ic: '📜' },
    { id: 'car', nome: 'Caratteristiche', ic: '💪' }, { id: 'abilita', nome: 'Abilità', ic: '🎯' }, { id: 'magia', nome: 'Magia', ic: '✨' },
    { id: 'equip', nome: 'Equipaggiamento', ic: '🎒' }, { id: 'aspetto', nome: 'Aspetto e nome', ic: '🎨' }, { id: 'fine', nome: 'Riepilogo', ic: '📖' },
  ];
  const PRIORITA = {
    barbaro: ['for', 'cos', 'des', 'sag', 'car', 'int'], bardo: ['car', 'des', 'cos', 'sag', 'int', 'for'], chierico: ['sag', 'cos', 'for', 'des', 'car', 'int'],
    druido: ['sag', 'cos', 'des', 'int', 'car', 'for'], guerriero: ['for', 'cos', 'des', 'sag', 'car', 'int'], ladro: ['des', 'cos', 'int', 'sag', 'car', 'for'],
    mago: ['int', 'cos', 'des', 'sag', 'car', 'for'], monaco: ['des', 'sag', 'cos', 'for', 'int', 'car'], paladino: ['for', 'car', 'cos', 'sag', 'des', 'int'],
    ranger: ['des', 'sag', 'cos', 'for', 'int', 'car'], stregone: ['car', 'cos', 'des', 'sag', 'int', 'for'], warlock: ['car', 'cos', 'des', 'sag', 'int', 'for'],
  };
  const AUMENTI = [4, 8, 12, 16, 19];
  const IC_BG = { accolito: '🕯️', criminale: '🗝️', eroe: '🌾', nobile: '👑', sapiente: '📚', soldato: '🎖️', vagabondo: '🐀', eremita: '🏔️', marinaio: '⚓', artista: '🎭', ciarlatano: '🃏', forestiero: '🏕️' };
  const SCUOLE = { abiurazione: '🛡️', ammaliamento: '💫', divinazione: '👁️', evocazione: '🌀', illusione: '🎭', invocazione: '🔥', necromanzia: '💀', trasmutazione: '⚗️' };
  const NOMI_ASP = { pelle: 'Pelle', capelli: 'Capelli', occhi: 'Occhi', mantello: 'Mantello', pettinatura: 'Pettinatura', barba: 'Barba', viso: 'Viso', segni: 'Segni particolari', corna: 'Corna' };
  // l'aspetto tipico di ogni stirpe (per le carte e come partenza quando la si sceglie)
  const ASP_STIRPE = {
    umano: { pelle: '#eac0a0', capelli: '#4a2e1a', occhi: '#2a5a8a', pettinatura: 'corti', barba: 'corta', viso: 'squadrato' },
    elfo: { pelle: '#f6d7c3', capelli: '#d8b060', occhi: '#3a7a3a', pettinatura: 'lunghi', barba: 'nessuna', viso: 'affilato' },
    nano: { pelle: '#d8a07a', capelli: '#8a1a1a', occhi: '#3a2a1a', pettinatura: 'treccia', barba: 'lunga', viso: 'squadrato' },
    halfling: { pelle: '#eac0a0', capelli: '#7a4a20', occhi: '#3a2a1a', pettinatura: 'ricci', barba: 'nessuna', viso: 'tondo', segni: 'lentiggini' },
    gnomo: { pelle: '#f6d7c3', capelli: '#e8e0c8', occhi: '#2a5a8a', pettinatura: 'spettinati', barba: 'baffi', viso: 'tondo' },
    mezzelfo: { pelle: '#d8a07a', capelli: '#1a1410', occhi: '#6a3a9a', pettinatura: 'coda', barba: 'nessuna', viso: 'ovale' },
    mezzorco: { pelle: '#9fb88a', capelli: '#1a1410', occhi: '#c08020', pettinatura: 'cresta', barba: 'nessuna', viso: 'squadrato', segni: 'cicatrice' },
    dragonide: { occhi: '#c08020', viso: 'squadrato', corna: 'ricurve' },
    tiefling: { pelle: '#c05040', capelli: '#1a1410', occhi: '#e0e0e0', pettinatura: 'lunghi', barba: 'nessuna', viso: 'affilato', corna: 'ricurve' },
  };
  const aspettoStirpe = (id, genere) => { const a = { segni: 'nessuno', corna: 'nessuna', ...ASP_STIRPE[id] }; if (genere === 'f') { if (id !== 'nano' || Math.random() < 0.9) a.barba = 'nessuna'; if (a.pettinatura === 'corti' || a.pettinatura === 'cresta') a.pettinatura = 'lunghi'; } return a; };
  const mod = (v) => Math.floor((v - 10) / 2);
  const segno = (n) => (n >= 0 ? `+${n}` : `${n}`);
  const caso = (a) => a[Math.floor(Math.random() * a.length)];

  // ---------- i conti (come in regole.js) ----------
  function stato(ctx) {
    const ui = ctx.ui;
    if (!ui.cr) ui.cr = { passo: 'stirpe', s: { metodo: 'standard', genere: caso(['m', 'f']), equip: 0, aspetto: {} }, sel: null, sugVisto: 0, tiriVisti: 0 };
    return ui.cr;
  }
  function valoriMetodo(p, s) { return s.metodo === 'dadi' ? (p.tirati || null) : [15, 14, 13, 12, 10, 8]; }
  function assegna(p, s) {
    const v = valoriMetodo(p, s);
    if (s.metodo === 'punti') { s.base = { for: 8, des: 8, cos: 8, int: 8, sag: 8, car: 8 }; return; }
    if (!v) { s.base = null; return; }
    const ord = PRIORITA[s.classe] || PRIORITA.guerriero, val = v.slice().sort((a, b) => b - a);
    s.base = {}; ord.forEach((k, i) => { s.base[k] = val[i]; });
  }
  function nAumenti(K, s, L) { const cl = K.classi[s.classe]; return cl ? [...AUMENTI, ...(cl.aumentiExtra || [])].filter((l) => l <= L).length : 0; }
  function finali(K, s, L) {
    const st = K.stirpi[s.stirpe], out = {};
    for (const k of K.ordine) out[k] = (s.base ? s.base[k] : 8) + (st ? st.bonus[k] || 0 : 0) + ((s.bonusScelti || []).includes(k) ? 1 : 0);
    const cl = K.classi[s.classe];
    if (cl && s.base) { const k = cl.principale[0]; out[k] = Math.min(20, out[k] + nAumenti(K, s, L) * 2); }
    return out;
  }
  function costoPunti(K, s) { return s.base ? K.ordine.reduce((t, k) => t + (K.costoPunti[s.base[k]] ?? 99), 0) : 0; }
  function carOk(p, K, s) {
    if (!s.base) return false;
    const st = K.stirpi[s.stirpe];
    if (st && st.bonusScelti && ((s.bonusScelti || []).length !== st.bonusScelti)) return false;
    if (s.metodo === 'punti') return K.ordine.every((k) => s.base[k] >= 8 && s.base[k] <= 15) && costoPunti(K, s) <= 27;
    const v = valoriMetodo(p, s); if (!v) return false;
    const a = K.ordine.map((k) => s.base[k]).sort((x, y) => y - x), b = v.slice().sort((x, y) => y - x);
    return a.every((x, i) => x === b[i]);
  }
  function fisse(K, s) { const st = K.stirpi[s.stirpe], bg = K.background[s.background]; return new Set([...(bg ? bg.abilita : []), ...(st ? st.tratti.flatMap((t) => t.abilita || []) : [])]); }
  function privilegi(K, s, L) { const cl = K.classi[s.classe]; return cl ? [...cl.privilegi, ...cl.sottoclasse.privilegi].filter((x) => x.l <= L) : []; }
  function regoleAbilita(K, s, L) {
    const cl = K.classi[s.classe], st = K.stirpi[s.stirpe];
    const n = cl ? cl.abilita.n : 0;
    const nExtra = (st ? st.tratti.reduce((t, x) => t + (x.abilitaScelte || 0), 0) : 0) + (s.classe === 'bardo' && L >= 3 ? 3 : 0);
    const nMaestria = privilegi(K, s, L).reduce((t, x) => t + (x.maestria || 0), 0);
    const nStili = privilegi(K, s, L).filter((x) => x.stile).length;
    return { n, nExtra, nMaestria, nStili, lista: cl ? cl.abilita.tra : [] };
  }
  function abilitaOk(K, s, L) {
    const r = regoleAbilita(K, s, L), f = fisse(K, s);
    const sc = (s.abilita || []).filter((a) => !f.has(a) && r.lista.includes(a));
    const ex = (s.abilitaExtra || []).filter((a) => !f.has(a) && !sc.includes(a));
    return sc.length === r.n && ex.length >= r.nExtra && (s.maestria || []).length >= r.nMaestria && (s.stili || []).length >= r.nStili;
  }
  function limitiMagia(K, s, L) {
    const cl = K.classi[s.classe]; if (!cl || !cl.magia) return null;
    const m = cl.magia, modC = mod(finali(K, s, L)[m.car]);
    const trucchi = m.trucchetti ? m.trucchetti[Math.min(9, L - 1)] + (s.classe === 'druido' && L >= 2 ? 1 : 0) : 0;
    const livMax = m.livMax[L - 1];
    let inc = 0;
    if (m.modo === 'conosciuti') inc = m.conosciuti[L - 1];
    else if (m.modo === 'preparati') inc = Math.max(1, modC + (m.mezzo ? Math.floor(L / 2) : L));
    else if (m.modo === 'libro') inc = Math.max(1, modC + L);
    const libro = m.modo === 'libro' ? m.libro + (L - 1) * m.perLivello : 0;
    const sempre = Object.entries(cl.sottoclasse.incantesimi || {}).filter(([l]) => L >= Number(l)).flatMap(([, x]) => x);
    return { trucchi, inc: m.modo === 'libro' ? libro : inc, preparati: inc, livMax, modo: m.modo, car: m.car, sempre };
  }
  const nSuppliche = (l) => (l < 2 ? 0 : l >= 18 ? 8 : l >= 15 ? 7 : l >= 12 ? 6 : l >= 9 ? 5 : l >= 7 ? 4 : l >= 5 ? 3 : 2);
  function haTrucchettoStirpe(K, s) { const st = K.stirpi[s.stirpe]; return !!(st && st.tratti.some((t) => t.trucchetto)); }
  function serveMagia(K, s, L) { return !!limitiMagia(K, s, L) || haTrucchettoStirpe(K, s) || (s.classe === 'warlock' && nSuppliche(L) > 0); }
  function listeMagia(K, s, L) {
    const lm = limitiMagia(K, s, L);
    const tutti = Object.entries(K.incantesimi);
    const trucchi = lm ? tutti.filter(([, x]) => x.liv === 0 && x.classi.includes(s.classe)) : [];
    const inc = lm ? tutti.filter(([id, x]) => x.liv >= 1 && x.liv <= lm.livMax && x.classi.includes(s.classe) && !lm.sempre.includes(id)) : [];
    const trucchiMago = tutti.filter(([, x]) => x.liv === 0 && x.classi.includes('mago'));
    return { lm, trucchi, inc, trucchiMago };
  }
  function magiaOk(K, s, L) {
    const { lm, inc } = listeMagia(K, s, L);
    if (lm) {
      if ((s.trucchetti || []).length < lm.trucchi) return false;
      if ((s.incantesimi || []).length < Math.min(lm.inc, inc.length)) return false;
    }
    if (s.classe === 'warlock' && (s.suppliche || []).length < nSuppliche(L)) return false;
    return true;
  }
  const nomeDi = (ctx, cr) => String(ctx.ui.t_nome != null ? ctx.ui.t_nome : cr.s.nome || '').trim();
  function passoOk(ctx, id) {
    const p = ctx.partita, K = p.catalogo, cr = stato(ctx), s = cr.s, L = p.livelloIniziale;
    switch (id) {
      case 'stirpe': return !!s.stirpe && (s.stirpe !== 'dragonide' || !!s.discendenza);
      case 'classe': return !!s.classe && (s.classe !== 'stregone' || !!s.discendenza);
      case 'background': return !!s.background;
      case 'car': return carOk(p, K, s);
      case 'abilita': return !!s.classe && !!s.background && abilitaOk(K, s, L);
      case 'magia': return !!s.classe && (!serveMagia(K, s, L) || magiaOk(K, s, L));
      case 'equip': return !!s.classe && s.equip != null;
      case 'aspetto': return !!nomeDi(ctx, cr);
      default: return true;
    }
  }
  const passiVisibili = (ctx) => PASSI.filter((x) => x.id !== 'magia' || !ctx.partita.catalogo.classi[stato(ctx).s.classe] || serveMagia(ctx.partita.catalogo, stato(ctx).s, ctx.partita.livelloIniziale));
  // si può andare a un passaggio se tutti quelli prima sono a posto
  function raggiungibile(ctx, id) { for (const x of passiVisibili(ctx)) { if (x.id === id) return true; if (!passoOk(ctx, x.id)) return false; } return false; }
  function scelteFinali(ctx) {
    const cr = stato(ctx), s = { ...cr.s };
    s.nome = nomeDi(ctx, cr); s.storia = String(ctx.ui.t_storia != null ? ctx.ui.t_storia : s.storia || '').trim();
    return s;
  }

  // ---------- pezzi di html ----------
  const pips = (n, tot) => `<span class="dr-pips">${Array.from({ length: tot }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
  const conta = (n, tot, cosa) => `<span class="dr-conta ${n >= tot ? 'ok' : ''}">${n >= tot ? '✓' : `${n}/${tot}`} ${cosa}</span>`;
  const testa = (titolo, sotto, ctx, conSceltaMia = true) => `<div class="dr-cr-testa"><div><h2>${titolo}</h2>${sotto ? `<p>${sotto}</p>` : ''}</div>${conSceltaMia ? '<button type="button" class="dr-bt dr-bt-dado" data-az="dr-cr-caso">🎲 Scegli tu per me</button>' : ''}</div>`;

  function passoStirpe(ctx) {
    const K = ctx.partita.catalogo, s = stato(ctx).s;
    const carte = Object.entries(K.stirpi).map(([id, st]) => {
      const bonus = Object.entries(st.bonus).map(([k, v]) => `${K.caratteristiche[k].breve} ${segno(v)}`).join(' · ') + (st.bonusScelti ? ` · +1 a ${st.bonusScelti} a scelta` : '');
      const r = A().ritratto({ stirpe: id, classe: s.classe || 'guerriero', genere: s.genere, discendenza: s.discendenza || 'rosso', aspetto: id === s.stirpe ? s.aspetto : { ...aspettoStirpe(id, s.genere), mantello: s.aspetto.mantello } }, { cornice: false });
      return `<button type="button" class="dr-carta dr-carta-stirpe ${s.stirpe === id ? 'sel' : ''}" data-az="dr-cr-stirpe" data-id="${id}">
        <span class="dr-carta-img">${r}</span><span class="dr-carta-corpo"><b>${esc(st.nome)}</b><small class="dr-bonus">${esc(bonus)}</small><span class="dr-carta-desc">${esc(st.desc)}</span>
        <small class="dr-tratti">${st.tratti.map((t) => esc(t.nome)).join(' · ')} · ${Math.round(st.velocita * 0.3 * 10) / 10} m</small></span></button>`;
    }).join('');
    const disc = s.stirpe === 'dragonide' ? discendenze(K, s, 'Il colore del tuo antenato drago (soffio e resistenza)') : '';
    return `${testa('Scegli la stirpe', 'Il popolo da cui vieni: dà bonus alle caratteristiche e tratti speciali.', ctx)}${disc}<div class="dr-griglia-carte">${carte}</div>`;
  }
  function discendenze(K, s, titolo) {
    return `<div class="dr-riquadro"><h3>${titolo}</h3><div class="dr-draghi">${Object.entries(K.discendenze).map(([id, d]) => `<button type="button" class="dr-drago ${s.discendenza === id ? 'sel' : ''}" data-az="dr-cr-disc" data-id="${id}" style="--col:${A().DRAGO_COL[id] || '#888'}"><i></i><b>${esc(d.nome.replace('Drago ', ''))}</b><small>${esc(d.danno)} · ${d.forma}</small></button>`).join('')}</div></div>`;
  }
  function passoClasse(ctx) {
    const p = ctx.partita, K = p.catalogo, s = stato(ctx).s, L = p.livelloIniziale;
    const carte = Object.entries(K.classi).map(([id, c]) => {
      const col = A().COLORE_CLASSE[id] || ['#888', '#444'];
      const magia = c.magia ? `<small class="dr-magia-tag">✨ ${c.magia.tipo === 'pieno' ? 'incantatore' : c.magia.tipo === 'patto' ? 'magia del patto' : 'mezzo incantatore'}</small>` : '';
      return `<button type="button" class="dr-carta dr-carta-classe ${s.classe === id ? 'sel' : ''}" data-az="dr-cr-classe" data-id="${id}" style="--c1:${col[0]};--c2:${col[1]}">
        <span class="dr-stemma">${A().emblema(id, '#f4e6c0', 46)}</span><span class="dr-carta-corpo"><b>${esc(c.nome)}</b>
        <small class="dr-bonus">d${c.dado} · ${c.principale.map((k) => K.caratteristiche[k].nome).join(' o ')}</small><span class="dr-carta-desc">${esc(c.desc)}</span>${magia}</span></button>`;
    }).join('');
    let dettaglio = '';
    const c = K.classi[s.classe];
    if (c) {
      const priv = [...c.privilegi, ...c.sottoclasse.privilegi].filter((x) => x.l <= Math.max(L, 3)).sort((a, b) => a.l - b.l);
      dettaglio = `<div class="dr-riquadro dr-dettaglio"><h3>${A().emblema(s.classe, 'currentColor', 22)} ${esc(c.nome)} — ${esc(c.sottoclasse.nome)}</h3>
        <p class="dr-righe"><span>🎲 Dado vita <b>d${c.dado}</b></span><span>🛡️ Tiri salvezza <b>${c.salvezze.map((k) => K.caratteristiche[k].nome).join(', ')}</b></span><span>🥋 Armature <b>${c.armature.length ? c.armature.join(', ') : 'nessuna'}</b></span><span>⚔️ Armi <b>${c.armi.join(', ')}</b></span></p>
        <ul class="dr-privilegi">${priv.map((x) => `<li class="${x.l > L ? 'dopo' : ''}"><b>${x.l}° ${esc(x.nome)}</b> ${esc(x.desc)}</li>`).join('')}</ul></div>`;
    }
    const disc = s.classe === 'stregone' && s.stirpe !== 'dragonide' ? discendenze(K, s, 'Discendenza draconica: il drago nel tuo sangue') : '';
    return `${testa('Scegli la classe', 'Il tuo mestiere da avventuriero: come combatti, che magie usi, cosa sai fare.', ctx)}${disc}<div class="dr-griglia-carte dr-classi">${carte}</div>${dettaglio}`;
  }
  function passoBackground(ctx) {
    const K = ctx.partita.catalogo, s = stato(ctx).s;
    const carte = Object.entries(K.background).map(([id, b]) => `<button type="button" class="dr-carta dr-carta-bg ${s.background === id ? 'sel' : ''}" data-az="dr-cr-bg" data-id="${id}">
      <span class="dr-bg-ic">${IC_BG[id] || '📜'}</span><span class="dr-carta-corpo"><b>${esc(b.nome)}</b><small class="dr-bonus">${b.abilita.map((a) => K.abilita[a].nome).join(' · ')}${b.lingue ? ` · ${b.lingue} lingu${b.lingue > 1 ? 'e' : 'a'}` : ''} · ${b.oro} mo</small>
      <span class="dr-carta-desc">${esc(b.desc)}</span><small class="dr-tratti">${esc(b.privilegio)}</small></span></button>`).join('');
    return `${testa('Il tuo passato', 'Chi eri prima di diventare un avventuriero: due abilità, qualche oggetto e un privilegio.', ctx)}<div class="dr-griglia-carte dr-bgs">${carte}</div>`;
  }
  function passoCar(ctx) {
    const p = ctx.partita, K = p.catalogo, cr = stato(ctx), s = cr.s, L = p.livelloIniziale, st = K.stirpi[s.stirpe];
    if (s.metodo === 'dadi' && p.tiriFatti !== cr.tiriVisti) { cr.tiriVisti = p.tiriFatti; assegna(p, s); }
    if (!s.base && (s.metodo !== 'dadi' || p.tirati)) assegna(p, s);
    const fin = finali(K, s, L);
    const metodi = [['standard', 'Serie standard', '15, 14, 13, 12, 10, 8'], ['punti', 'Acquisto a punti', '27 punti da spendere'], ['dadi', 'Tira i dadi', '4d6, si tengono i 3 più alti']];
    const tab = `<div class="dr-metodi">${metodi.map(([id, n, d]) => `<button type="button" class="dr-metodo ${s.metodo === id ? 'sel' : ''}" data-az="dr-cr-metodo" data-id="${id}"><b>${n}</b><small>${d}</small></button>`).join('')}</div>`;
    let sopra = '';
    if (s.metodo === 'punti') { const c = costoPunti(K, s); sopra = `<p class="dr-punti ${c > 27 ? 'troppi' : ''}">Punti spesi <b>${c}</b> / 27 ${pips(Math.min(27, c), 27)}</p>`; }
    if (s.metodo === 'dadi') {
      const resto = 3 - p.tiriFatti;
      sopra = `<div class="dr-tiri">${p.tirati ? `<div class="dr-tirati">${p.tirati.map((v) => A().d20(v, { dim: 44, colore: v >= 15 ? '#2a7a4a' : v <= 8 ? '#8a2a2a' : '#5a4a8a' })).join('')}<small>totale ${p.tirati.reduce((a, b) => a + b, 0)}</small></div>` : '<p>Tira 4d6 sei volte: il destino decide.</p>'}
        <button type="button" class="dr-bt" data-az="dr-cr-tira" ${resto <= 0 ? 'disabled' : ''}>🎲 ${p.tirati ? 'Ritira' : 'Tira'} (${resto} ${resto === 1 ? 'tiro rimasto' : 'tiri rimasti'})</button></div>`;
    }
    const scambio = s.metodo !== 'punti';
    const righe = s.base ? K.ordine.map((k) => {
      const c = K.caratteristiche[k], b = (st && st.bonus[k]) || 0, scelto = (s.bonusScelti || []).includes(k);
      const principale = K.classi[s.classe] && K.classi[s.classe].principale.includes(k);
      const val = scambio ? `<button type="button" class="dr-valore ${cr.sel === k ? 'sel' : ''}" data-az="dr-cr-scambia" data-id="${k}" title="Tocca due caratteristiche per scambiarle">${s.base[k]}</button>`
        : `<span class="dr-piu-meno"><button type="button" data-az="dr-cr-punti" data-id="${k}" data-d="-1" ${s.base[k] <= 8 ? 'disabled' : ''}>−</button><b>${s.base[k]}</b><button type="button" data-az="dr-cr-punti" data-id="${k}" data-d="1" ${s.base[k] >= 15 ? 'disabled' : ''}>+</button></span>`;
      const scegli = st && st.bonusScelti && !st.bonus[k] ? `<button type="button" class="dr-piu1 ${scelto ? 'sel' : ''}" data-az="dr-cr-bonus" data-id="${k}">+1</button>` : '';
      return `<div class="dr-car ${principale ? 'principale' : ''}"><span class="dr-car-nome"><b>${c.nome}</b><small>${esc(c.desc)}</small></span>${val}
        <span class="dr-car-bonus">${b ? `<i>${segno(b)}</i>` : ''}${scegli}</span><span class="dr-car-fin"><b>${fin[k]}</b><small>${segno(mod(fin[k]))}</small></span></div>`;
    }).join('') : '';
    const auments = nAumenti(K, s, L) ? `<p class="dr-nota">Partendo dal ${L}° livello: +${nAumenti(K, s, L) * 2} a ${K.caratteristiche[K.classi[s.classe].principale[0]].nome} (aumenti di caratteristica, massimo 20).</p>` : '';
    const bonusNota = st && st.bonusScelti ? `<p class="dr-nota">${esc(st.nome)}: scegli ${st.bonusScelti} caratteristiche per il +1 ${conta((s.bonusScelti || []).length, st.bonusScelti, '')}</p>` : '';
    return `${testa('Le caratteristiche', scambio ? 'Tocca due valori per scambiarli. In evidenza quelle importanti per la tua classe.' : 'Ogni punto oltre l\'8 costa: 13 costa 5, 14 costa 7, 15 costa 9.', ctx)}${tab}${sopra}${bonusNota}<div class="dr-cars">${righe}</div>${auments}`;
  }
  function chip(az, id, testo, sel, extra = '', dis = false, titolo = '') { return `<button type="button" class="dr-chip ${sel ? 'sel' : ''}" data-az="${az}" data-id="${id}" ${dis && !sel ? 'disabled' : ''} ${titolo ? `title="${esc(titolo)}"` : ''}>${testo}${extra}</button>`; }
  function passoAbilita(ctx) {
    const p = ctx.partita, K = p.catalogo, s = stato(ctx).s, L = p.livelloIniziale;
    const r = regoleAbilita(K, s, L), f = fisse(K, s), fin = finali(K, s, L), comp = Math.ceil(L / 4) + 1;
    const bonus = (a) => mod(fin[K.abilita[a].car]) + comp * ((s.maestria || []).includes(a) ? 2 : 1);
    const scelte = (s.abilita || []).filter((a) => !f.has(a) && r.lista.includes(a));
    const extra = (s.abilitaExtra || []).filter((a) => !f.has(a) && !scelte.includes(a));
    const tutte = [...f, ...scelte, ...extra];
    const nomeAb = (a) => `${esc(K.abilita[a].nome)} <small>${K.caratteristiche[K.abilita[a].car].breve}</small>`;
    let h = `${testa('Abilità e talenti', `Competenza: +${comp} alle prove delle abilità che conosci.`, ctx)}`;
    h += `<div class="dr-riquadro"><h3>Dalla stirpe e dal passato</h3><div class="dr-chips">${[...f].map((a) => `<span class="dr-chip fissa">${nomeAb(a)} <em>${segno(bonus(a))}</em></span>`).join('') || '<small>nessuna</small>'}</div></div>`;
    h += `<div class="dr-riquadro"><h3>Abilità della classe ${conta(scelte.length, r.n, '')}</h3><div class="dr-chips">${r.lista.filter((a) => !f.has(a)).map((a) => chip('dr-cr-ab', a, nomeAb(a), scelte.includes(a), scelte.includes(a) ? ` <em>${segno(bonus(a))}</em>` : '', scelte.length >= r.n)).join('')}</div></div>`;
    if (r.nExtra) h += `<div class="dr-riquadro"><h3>Abilità a scelta ${conta(extra.length, r.nExtra, '')}</h3><div class="dr-chips">${Object.keys(K.abilita).filter((a) => !f.has(a) && !scelte.includes(a)).map((a) => chip('dr-cr-abx', a, nomeAb(a), extra.includes(a), '', extra.length >= r.nExtra)).join('')}</div></div>`;
    if (r.nMaestria) h += `<div class="dr-riquadro"><h3>Maestria: competenza raddoppiata ${conta((s.maestria || []).length, r.nMaestria, '')}</h3><div class="dr-chips">${tutte.map((a) => chip('dr-cr-mae', a, nomeAb(a), (s.maestria || []).includes(a), '', (s.maestria || []).length >= r.nMaestria)).join('')}</div></div>`;
    if (r.nStili) h += `<div class="dr-riquadro"><h3>Stile di combattimento ${conta((s.stili || []).length, r.nStili, '')}</h3><div class="dr-stili">${Object.entries(K.stili).map(([id, x]) => `<button type="button" class="dr-stile ${(s.stili || []).includes(id) ? 'sel' : ''}" data-az="dr-cr-stile" data-id="${id}" ${(s.stili || []).length >= r.nStili && !(s.stili || []).includes(id) ? 'disabled' : ''}><b>${esc(x.nome)}</b><small>${esc(x.desc)}</small></button>`).join('')}</div></div>`;
    return h;
  }
  function cartaInc(id, x, sel, az, dis) {
    return `<button type="button" class="dr-inc ${sel ? 'sel' : ''}" data-az="${az}" data-id="${id}" ${dis && !sel ? 'disabled' : ''}>
      <span class="dr-inc-testa"><span class="dr-inc-ic">${SCUOLE[x.scuola] || '✨'}</span><b>${esc(x.nome)}</b>${x.conc ? '<i title="Concentrazione">C</i>' : ''}${x.rituale ? '<i title="Rituale">R</i>' : ''}</span>
      <small class="dr-inc-info">${x.liv ? `${x.liv}° livello` : 'trucchetto'} · ${esc(x.tempo)} · ${esc(String(x.gittata))}${/^\d+$/.test(String(x.gittata)) ? ' m' : ''}</small><span class="dr-inc-desc">${esc(x.desc)}</span></button>`;
  }
  function passoMagia(ctx) {
    const p = ctx.partita, K = p.catalogo, s = stato(ctx).s, L = p.livelloIniziale;
    const { lm, trucchi, inc, trucchiMago } = listeMagia(K, s, L);
    let h = testa('La magia', lm ? `${lm.modo === 'libro' ? 'Scrivi gli incantesimi nel tuo libro' : lm.modo === 'preparati' ? 'Gli incantesimi che prepari (li potrai cambiare)' : 'Gli incantesimi che conosci'} · caratteristica: ${K.caratteristiche[lm.car].nome}` : 'I doni magici della tua stirpe e del tuo patto.', ctx);
    if (lm && lm.sempre.length) h += `<div class="dr-riquadro"><h3>Sempre preparati (${esc(K.classi[s.classe].sottoclasse.nome)})</h3><div class="dr-chips">${lm.sempre.map((id) => `<span class="dr-chip fissa">${esc((K.incantesimi[id] || { nome: id }).nome)}</span>`).join('')}</div></div>`;
    if (lm && lm.trucchi) { const n = (s.trucchetti || []).length; h += `<div class="dr-riquadro"><h3>Trucchetti ${conta(n, lm.trucchi, '')}</h3><div class="dr-incs">${trucchi.map(([id, x]) => cartaInc(id, x, (s.trucchetti || []).includes(id), 'dr-cr-tr', n >= lm.trucchi)).join('')}</div></div>`; }
    if (lm && lm.inc) {
      const n = (s.incantesimi || []).length, tot = Math.min(lm.inc, inc.length);
      const perLiv = {}; for (const [id, x] of inc) (perLiv[x.liv] = perLiv[x.liv] || []).push([id, x]);
      h += `<div class="dr-riquadro"><h3>${lm.modo === 'libro' ? 'Libro degli incantesimi' : 'Incantesimi'} ${conta(n, tot, '')}${lm.modo === 'libro' ? ` <small>(ne prepari ${lm.preparati} ogni giorno)</small>` : ''}</h3>
        ${Object.entries(perLiv).map(([lv, lista]) => `<h4>${lv}° livello</h4><div class="dr-incs">${lista.map(([id, x]) => cartaInc(id, x, (s.incantesimi || []).includes(id), 'dr-cr-inc', n >= tot)).join('')}</div>`).join('')}</div>`;
    }
    if (haTrucchettoStirpe(K, s)) h += `<div class="dr-riquadro"><h3>Trucchetto elfico (un trucchetto da mago) ${conta(s.trucchettoStirpe ? 1 : 0, 1, '')}</h3><div class="dr-incs">${trucchiMago.map(([id, x]) => cartaInc(id, x, s.trucchettoStirpe === id, 'dr-cr-trs', false)).join('')}</div></div>`;
    if (s.classe === 'warlock' && nSuppliche(L)) { const n = (s.suppliche || []).length, tot = nSuppliche(L); h += `<div class="dr-riquadro"><h3>Suppliche occulte ${conta(n, tot, '')}</h3><div class="dr-stili">${Object.entries(K.suppliche).map(([id, t]) => { const [nome, ...d] = String(t).split(':'); return `<button type="button" class="dr-stile ${(s.suppliche || []).includes(id) ? 'sel' : ''}" data-az="dr-cr-sup" data-id="${id}" ${n >= tot && !(s.suppliche || []).includes(id) ? 'disabled' : ''}><b>${esc(nome)}</b><small>${esc(d.join(':').trim())}</small></button>`; }).join('')}</div></div>`; }
    return h;
  }
  function passoEquip(ctx) {
    const K = ctx.partita.catalogo, s = stato(ctx).s, c = K.classi[s.classe], bg = K.background[s.background];
    if (!c) return '';
    return `${testa('Equipaggiamento', `Scegli il corredo della classe. In più: gli oggetti del passato (${esc(bg ? bg.nome : '')}), una pozione di guarigione e ${bg ? bg.oro : 0} monete d'oro.`, ctx)}
      <div class="dr-equip">${c.equip.map((e, i) => `<button type="button" class="dr-pacco ${Number(s.equip) === i ? 'sel' : ''}" data-az="dr-cr-equip" data-id="${i}">
        <b>${esc(e.nome)}</b><span>${e.armi.map((a) => `<i>⚔️ ${esc(a)}</i>`).join('')}${e.armatura ? `<i>🥋 ${esc(e.armatura)}</i>` : ''}${e.scudo ? '<i>🛡️ Scudo</i>' : ''}</span></button>`).join('')}</div>`;
  }
  function passoAspetto(ctx) {
    const p = ctx.partita, K = p.catalogo, cr = stato(ctx), s = cr.s, asp = K.aspetto;
    const colori = ['pelle', 'capelli', 'occhi', 'mantello'].filter((k) => !(k === 'pelle' && s.stirpe === 'dragonide')).map((k) => `<div class="dr-asp-riga"><span>${NOMI_ASP[k]}</span><span class="dr-campioni">${asp[k].map((c) => `<button type="button" class="dr-campione ${s.aspetto[k] === c ? 'sel' : ''}" data-az="dr-cr-asp" data-k="${k}" data-id="${c}" style="background:${c}" aria-label="${NOMI_ASP[k]} ${c}"></button>`).join('')}</span></div>`).join('');
    const forme = ['pettinatura', 'barba', 'viso', 'segni', ...(s.stirpe === 'tiefling' || s.stirpe === 'dragonide' ? ['corna'] : [])].filter((k) => !(s.stirpe === 'dragonide' && (k === 'pettinatura' || k === 'barba'))).map((k) => `<div class="dr-asp-riga"><span>${NOMI_ASP[k]}</span><span class="dr-chips">${asp[k].filter((v) => !(k === 'corna' && v === 'nessuna')).map((v) => chip('dr-cr-asp', v, esc(v), s.aspetto[k] === v).replace('data-id', `data-k="${k}" data-id`)).join('')}</span></div>`).join('');
    const nome = esc(ctx.ui.t_nome != null ? ctx.ui.t_nome : s.nome || '');
    const storia = esc(ctx.ui.t_storia != null ? ctx.ui.t_storia : s.storia || '');
    return `${testa('Aspetto, nome e storia', 'Come ti vedono gli altri. Il master userà la tua storia per agganciarti all\'avventura.', ctx)}
      <div class="dr-riquadro"><div class="dr-nome-riga"><label>Nome<input maxlength="24" data-tieni="nome" value="${nome}" placeholder="Il nome del tuo eroe" autocomplete="off" spellcheck="false"></label><button type="button" class="dr-bt dr-bt-dado" data-az="dr-cr-nome" title="Un nome a caso">🎲</button></div>
      <div class="dr-asp-riga"><span>Genere</span><span class="dr-chips">${[['m', 'Maschile'], ['f', 'Femminile'], ['n', 'Non dirlo']].map(([g, n]) => chip('dr-cr-gen', g, n, s.genere === g)).join('')}</span></div></div>
      <div class="dr-riquadro">${colori}${forme}</div>
      <div class="dr-riquadro"><label class="dr-storia-lab">La tua storia <small>(facoltativa: origini, un segreto, cosa cerchi)</small><textarea data-tieni="storia" maxlength="600" rows="4" placeholder="Es.: cresciuta tra i contrabbandieri del porto, cerco l'uomo che ha bruciato la mia casa…">${storia}</textarea></label></div>`;
  }
  function passoFine(ctx) {
    const p = ctx.partita, K = p.catalogo, s = scelteFinali(ctx), L = p.livelloIniziale, fin = finali(K, s, L);
    const c = K.classi[s.classe], st = K.stirpi[s.stirpe], bg = K.background[s.background];
    const mancano = passiVisibili(ctx).filter((x) => x.id !== 'fine' && !passoOk(ctx, x.id));
    const comp = Math.ceil(L / 4) + 1;
    const pf = c ? c.dado + (L - 1) * (c.dado / 2 + 1) + mod(fin.cos) * L + ((st && st.tratti.some((t) => t.effetto === 'robusto')) ? L : 0) : 0;
    const inc = [...(s.trucchetti || []), ...(s.trucchettoStirpe ? [s.trucchettoStirpe] : []), ...(s.incantesimi || [])].map((id) => (K.incantesimi[id] || { nome: id }).nome);
    return `${testa('Il tuo eroe è pronto?', mancano.length ? `Manca ancora: ${mancano.map((x) => x.nome).join(', ')}.` : 'Controlla e crea il personaggio: potrai sempre rifarlo prima che cominci l\'avventura.', ctx, false)}
      <div class="dr-riep"><div class="dr-riep-car">${K.ordine.map((k) => `<span><small>${K.caratteristiche[k].breve}</small><b>${fin[k]}</b><i>${segno(mod(fin[k]))}</i></span>`).join('')}</div>
      <p class="dr-righe"><span>❤️ Punti ferita <b>${Math.max(1, pf)}</b></span><span>🎓 Competenza <b>+${comp}</b></span><span>🎲 Dado vita <b>${L}d${c ? c.dado : '?'}</b></span><span>📜 ${esc(bg ? bg.nome : '?')}</span></p>
      <p class="dr-righe"><span>🎯 ${[...fisse(K, s), ...(s.abilita || []), ...(s.abilitaExtra || [])].map((a) => K.abilita[a] ? K.abilita[a].nome : a).join(', ')}</span></p>
      ${inc.length ? `<p class="dr-righe"><span>✨ ${esc(inc.join(', '))}</span></p>` : ''}
      ${s.storia ? `<blockquote>${esc(s.storia)}</blockquote>` : ''}</div>
      <div class="dr-crea-bt"><button type="button" class="dr-bt dr-bt-oro dr-bt-grande" data-az="dr-cr-crea" ${mancano.length ? 'disabled' : ''}>⚔️ Crea ${esc(s.nome || 'il personaggio')}</button>
      <button type="button" class="dr-bt" data-az="dr-cr-completa">🎲 Completa tu quello che manca</button></div>`;
  }
  // l'anteprima: il ritratto e le scelte fatte
  function anteprima(ctx) {
    const p = ctx.partita, K = p.catalogo, s = scelteFinali(ctx), L = p.livelloIniziale;
    const st = K.stirpi[s.stirpe], c = K.classi[s.classe], bg = K.background[s.background];
    const fin = s.base ? finali(K, s, L) : null;
    return `<div class="dr-anteprima"><div class="dr-ant-ritratto">${A().ritratto({ ...s, stirpe: s.stirpe || 'umano', classe: s.classe || 'guerriero', discendenza: s.discendenza || 'rosso' })}</div>
      <h3>${esc(s.nome || 'Senza nome')}</h3><p>${st ? esc(st.nome) : '<i>stirpe?</i>'} · ${c ? esc(c.nome) : '<i>classe?</i>'} · ${L}° liv.</p>${bg ? `<p class="dr-ant-bg">${IC_BG[s.background] || ''} ${esc(bg.nome)}</p>` : ''}
      ${fin ? `<div class="dr-ant-car">${K.ordine.map((k) => `<span><small>${K.caratteristiche[k].breve}</small><b>${fin[k]}</b></span>`).join('')}</div>` : ''}</div>`;
  }

  function html(ctx, extraLato = '') {
    const p = ctx.partita, K = p.catalogo, cr = stato(ctx);
    // "scegli tu per me" del server
    if (p.suggerite && p.suggerite.n > cr.sugVisto) { const prima = cr.sugVisto; cr.sugVisto = p.suggerite.n; if (prima && cr.sugPasso) applicaSuggerite(ctx, p.suggerite.scelte, cr.sugPasso); cr.sugPasso = null; }
    const vis = passiVisibili(ctx);
    if (!vis.some((x) => x.id === cr.passo)) cr.passo = 'equip';
    const nav = vis.map((x, i) => { const ok = passoOk(ctx, x.id), rag = raggiungibile(ctx, x.id); return `<button type="button" class="dr-passo ${cr.passo === x.id ? 'sel' : ''} ${ok && rag && x.id !== 'fine' ? 'fatto' : ''}" data-az="dr-cr-passo" data-id="${x.id}" ${rag ? '' : 'disabled'}><i><b>${ok && rag && x.id !== 'fine' && cr.passo !== x.id ? '✓' : i + 1}</b></i><span>${x.nome}</span></button>`; }).join('');
    const corpo = { stirpe: passoStirpe, classe: passoClasse, background: passoBackground, car: passoCar, abilita: passoAbilita, magia: passoMagia, equip: passoEquip, aspetto: passoAspetto, fine: passoFine }[cr.passo](ctx);
    const i = vis.findIndex((x) => x.id === cr.passo);
    const piede = `<div class="dr-cr-piede">${i > 0 ? `<button type="button" class="dr-bt" data-az="dr-cr-passo" data-id="${vis[i - 1].id}">← ${vis[i - 1].nome}</button>` : '<span></span>'}
      <button type="button" class="dr-bt dr-bt-sec" data-az="dr-cr-tutto" title="Il computer crea un personaggio completo, tenendo le scelte già fatte">⚡ Fai tutto tu</button>
      ${i < vis.length - 1 ? `<button type="button" class="dr-bt dr-bt-oro" data-az="dr-cr-avanti" ${passoOk(ctx, cr.passo) ? '' : 'disabled'}>${vis[i + 1].nome} →</button>` : '<span></span>'}</div>`;
    return `<div class="dr-crea"><nav class="dr-passi">${nav}</nav><div class="dr-cr-centro"><div class="dr-cr-corpo" data-passo="${cr.passo}">${corpo}</div>${piede}</div><aside class="dr-cr-lato">${anteprima(ctx)}${extraLato}</aside></div>`;
  }

  const CHIAVI_PASSO = { car: ['metodo', 'base', 'bonusScelti'], abilita: ['abilita', 'abilitaExtra', 'maestria', 'stili'], magia: ['trucchetti', 'incantesimi', 'suppliche', 'trucchettoStirpe'] };
  function applicaSuggerite(ctx, sug, passo) {
    const p = ctx.partita, K = p.catalogo, s = stato(ctx).s, L = p.livelloIniziale;
    for (const k of CHIAVI_PASSO[passo] || []) if (sug[k] !== undefined) s[k] = Array.isArray(sug[k]) ? sug[k].slice() : (sug[k] && typeof sug[k] === 'object' ? { ...sug[k] } : sug[k]);
    if (passo === 'abilita') { const r = regoleAbilita(K, s, L); s.maestria = (s.maestria || []).slice(0, r.nMaestria); s.stili = (s.stili || []).slice(0, r.nStili); }
    if (passo === 'magia' && haTrucchettoStirpe(K, s) && !s.trucchettoStirpe) s.trucchettoStirpe = caso(listeMagia(K, s, L).trucchiMago.filter(([id]) => !(s.trucchetti || []).includes(id)).map(([id]) => id));
    if (passo === 'magia' && s.classe === 'warlock') s.suppliche = (s.suppliche || []).slice(0, nSuppliche(L));
  }
  function aspettoCaso(K, s) {
    const a = {};
    for (const [k, v] of Object.entries(K.aspetto)) a[k] = caso(v);
    if (s.stirpe !== 'tiefling' && s.stirpe !== 'dragonide') a.corna = 'nessuna'; else if (a.corna === 'nessuna') a.corna = 'ricurve';
    if (s.genere === 'f' && Math.random() < 0.9) a.barba = 'nessuna';
    if (s.stirpe === 'nano' && s.genere !== 'f') a.barba = caso(['lunga', 'treccia']);
    if (['elfo', 'mezzelfo', 'halfling', 'gnomo'].includes(s.stirpe) && Math.random() < 0.7) a.barba = 'nessuna';
    return a;
  }
  const togli = (lista, x) => (lista || []).filter((y) => y !== x);
  function alterna(s, k, id, max) { const l = s[k] || []; s[k] = l.includes(id) ? togli(l, id) : l.length < max ? [...l, id] : l; }

  function clic(ctx, el) {
    const az = el.dataset.az, id = el.dataset.id, p = ctx.partita, K = p.catalogo, cr = stato(ctx), s = cr.s, L = p.livelloIniziale;
    const ridisegna = () => { suono([[620, 0.03]], { tipo: 'sine', volume: 0.03 }); ctx.ridisegna(); };
    switch (az) {
      case 'dr-cr-passo': if (raggiungibile(ctx, id)) { cr.passo = id; cr.sel = null; scorriSu(); } return ctx.ridisegna();
      case 'dr-cr-avanti': { const vis = passiVisibili(ctx), i = vis.findIndex((x) => x.id === cr.passo); if (passoOk(ctx, cr.passo) && vis[i + 1]) { cr.passo = vis[i + 1].id; cr.sel = null; scorriSu(); } return ctx.ridisegna(); }
      case 'dr-cr-stirpe':
        if (s.stirpe !== id) { s.stirpe = id; s.bonusScelti = []; s.abilitaExtra = []; s.trucchettoStirpe = null; s.aspetto = { ...aspettoStirpe(id, s.genere), mantello: s.aspetto.mantello }; }
        return ridisegna();
      case 'dr-cr-disc': s.discendenza = id; return ridisegna();
      case 'dr-cr-classe':
        if (s.classe !== id) { s.classe = id; s.abilita = []; s.maestria = []; s.stili = []; s.trucchetti = []; s.incantesimi = []; s.suppliche = []; s.equip = 0; if (s.metodo !== 'punti') assegna(p, s); }
        return ridisegna();
      case 'dr-cr-bg': if (s.background !== id) { s.background = id; const f = fisse(K, s); s.abilita = togli(s.abilita, null).filter((a) => !f.has(a)); s.abilitaExtra = (s.abilitaExtra || []).filter((a) => !f.has(a)); } return ridisegna();
      case 'dr-cr-metodo': if (s.metodo !== id) { s.metodo = id; cr.sel = null; assegna(p, s); } return ridisegna();
      case 'dr-cr-tira': return ctx.invia({ tipo: 'tiraCaratteristiche' });
      case 'dr-cr-scambia':
        if (!cr.sel) cr.sel = id;
        else { if (cr.sel !== id) { const t = s.base[cr.sel]; s.base[cr.sel] = s.base[id]; s.base[id] = t; } cr.sel = null; }
        return ridisegna();
      case 'dr-cr-punti': { const v = s.base[id] + Number(el.dataset.d); if (v < 8 || v > 15) return undefined; const prova = { ...s, base: { ...s.base, [id]: v } }; if (costoPunti(K, prova) > 27) return ctx.avviso('Hai finito i punti'); s.base[id] = v; return ridisegna(); }
      case 'dr-cr-bonus': alterna(s, 'bonusScelti', id, K.stirpi[s.stirpe].bonusScelti); return ridisegna();
      case 'dr-cr-ab': alterna(s, 'abilita', id, regoleAbilita(K, s, L).n); s.abilitaExtra = togli(s.abilitaExtra, id); s.maestria = (s.maestria || []).filter((a) => fisse(K, s).has(a) || (s.abilita || []).includes(a) || (s.abilitaExtra || []).includes(a)); return ridisegna();
      case 'dr-cr-abx': alterna(s, 'abilitaExtra', id, regoleAbilita(K, s, L).nExtra); s.maestria = (s.maestria || []).filter((a) => fisse(K, s).has(a) || (s.abilita || []).includes(a) || (s.abilitaExtra || []).includes(a)); return ridisegna();
      case 'dr-cr-mae': alterna(s, 'maestria', id, regoleAbilita(K, s, L).nMaestria); return ridisegna();
      case 'dr-cr-stile': alterna(s, 'stili', id, regoleAbilita(K, s, L).nStili); return ridisegna();
      case 'dr-cr-tr': alterna(s, 'trucchetti', id, limitiMagia(K, s, L).trucchi); return ridisegna();
      case 'dr-cr-inc': { const { lm, inc } = listeMagia(K, s, L); alterna(s, 'incantesimi', id, Math.min(lm.inc, inc.length)); return ridisegna(); }
      case 'dr-cr-trs': s.trucchettoStirpe = s.trucchettoStirpe === id ? null : id; return ridisegna();
      case 'dr-cr-sup': alterna(s, 'suppliche', id, nSuppliche(L)); return ridisegna();
      case 'dr-cr-equip': s.equip = Number(id); return ridisegna();
      case 'dr-cr-asp': s.aspetto = { ...s.aspetto, [el.dataset.k]: id }; return ridisegna();
      case 'dr-cr-gen': s.genere = id; if (id === 'f' && s.stirpe !== 'nano') s.aspetto = { ...s.aspetto, barba: 'nessuna' }; return ridisegna();
      case 'dr-cr-nome': { const st = K.stirpi[s.stirpe] || K.stirpi.umano; ctx.ui.t_nome = caso(st.nomi[s.genere === 'f' ? 'f' : s.genere === 'm' ? 'm' : caso(['m', 'f'])]); return ridisegna(); }
      case 'dr-cr-caso': return sceltaMia(ctx);
      case 'dr-cr-crea': suono([[392, 0.08], [523, 0.08], [659, 0.15]], { tipo: 'triangle', volume: 0.05 }); return ctx.invia({ tipo: 'crea', scelte: scelteFinali(ctx) });
      case 'dr-cr-completa': case 'dr-cr-tutto': {
        const sc = scelteFinali(ctx);
        if (!sc.nome) delete sc.nome;
        if (!carOk(p, K, sc)) { delete sc.base; if (sc.metodo !== 'dadi') delete sc.metodo; }
        if (!sc.aspetto || Object.keys(sc.aspetto).length < 5) sc.aspetto = aspettoCaso(K, sc);
        return ctx.invia({ tipo: 'crea', casuale: true, scelte: sc });
      }
      default: return undefined;
    }
  }
  function scorriSu() { setTimeout(() => { const c = document.querySelector('.dr-cr-corpo'); if (c) c.scrollTop = 0; }, 0); }
  // "scegli tu per me" del passaggio in cui si è
  function sceltaMia(ctx) {
    const p = ctx.partita, K = p.catalogo, cr = stato(ctx), s = cr.s;
    suono([[300, 0.04], [420, 0.04], [560, 0.06]], { tipo: 'triangle', volume: 0.04 });
    const altro = (lista, ora) => caso(lista.filter((x) => x !== ora)) || ora;
    if (cr.passo === 'stirpe') { s.stirpe = altro(Object.keys(K.stirpi), s.stirpe); s.bonusScelti = []; s.abilitaExtra = []; if (s.stirpe === 'dragonide') s.discendenza = caso(Object.keys(K.discendenze)); s.aspetto = aspettoCaso(K, s); return ctx.ridisegna(); }
    if (cr.passo === 'classe') { s.classe = altro(Object.keys(K.classi), s.classe); s.abilita = []; s.maestria = []; s.stili = []; s.trucchetti = []; s.incantesimi = []; s.suppliche = []; s.equip = 0; if (s.classe === 'stregone' && !s.discendenza) s.discendenza = caso(Object.keys(K.discendenze)); if (s.metodo !== 'punti') assegna(p, s); return ctx.ridisegna(); }
    if (cr.passo === 'background') { s.background = altro(Object.keys(K.background), s.background); const f = fisse(K, s); s.abilita = (s.abilita || []).filter((a) => !f.has(a)); return ctx.ridisegna(); }
    if (cr.passo === 'equip') { s.equip = Math.floor(Math.random() * K.classi[s.classe].equip.length); return ctx.ridisegna(); }
    if (cr.passo === 'aspetto') { s.aspetto = aspettoCaso(K, s); const st = K.stirpi[s.stirpe] || K.stirpi.umano; ctx.ui.t_nome = caso(st.nomi[s.genere === 'f' ? 'f' : 'm']); return ctx.ridisegna(); }
    // caratteristiche, abilità e incantesimi: li sceglie il server con le priorità della classe
    const sc = { ...s };
    for (const k of CHIAVI_PASSO[cr.passo] || []) delete sc[k];
    if (cr.passo === 'car' && s.metodo === 'dadi' && p.tirati) sc.metodo = 'dadi';
    if (cr.passo === 'abilita') { sc.abilita = []; sc.abilitaExtra = []; }
    if (cr.passo === 'magia') { sc.trucchetti = []; sc.incantesimi = []; }
    cr.sugPasso = cr.passo;
    if (!cr.sugVisto) cr.sugVisto = (p.suggerite && p.suggerite.n) || 0;
    if (!cr.sugVisto) cr.sugVisto = -1; // il primo suggerimento (n = 1) va applicato
    return ctx.invia({ tipo: 'suggerisci', scelte: sc });
  }

  window.DraghiCrea = { html, clic, anteprima };
})();
