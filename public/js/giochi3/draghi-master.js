// DRAGHI E SEGRETE — la schermata del MASTER UMANO (giochi3/draghi/dm.js). Chi fa il master non ha un personaggio:
// al centro il racconto e la sua consolle (cosa hanno fatto i giocatori, il racconto da scrivere, prove, tiri salvezza,
// combattimenti ed eventi da aggiungere, la bozza e la risposta dell'IA, il pulsante ✨ che fa riscrivere dall'IA in un
// racconto curato quello che il master ha scritto di fretta), a fianco il consigliere IA a cui chiedere
// qualsiasi cosa, la mappa completa (nell'horror tutta la stazione con la creatura), il bestiario, la guida con le CD
// e i segreti dell'ambientazione. In combattimento il master muove lui i nemici (o li lascia al gioco), li può spostare
// a mano dove vuole sulla mappa (🖐️), racconta e giudica le azioni libere dei giocatori. I pezzi comuni del tavolo (gruppo, racconto, mappa) arrivano da draghi.js (window.DraghiTavolo).
(() => {
  const { esc, suono, primaVolta } = window.Nuovi;
  const T = () => window.DraghiTavolo, CB = () => window.DraghiCampo, IN = () => window.DraghiIncubo;
  const CARATT = { for: 'Forza', des: 'Destrezza', cos: 'Costituzione', int: 'Intelligenza', sag: 'Saggezza', car: 'Carisma' };
  const ATMOSFERE = { '': 'Atmosfera: come prima', calma: '🌙 Calma', tensione: '⚠️ Tensione', mistero: '🔮 Mistero', orrore: '💀 Orrore', festa: '🎉 Festa', viaggio: '🧭 In viaggio', battaglia: '⚔️ Battaglia' };
  const TIPI_RICHIESTA = { inizio: '📖 La campagna comincia', azioni: '✍️ Cosa fanno i giocatori', esiti: '🎲 I risultati dei tiri', combattimentoFinito: '🏁 Il combattimento è finito', ripresa: '📂 La campagna riprende' };
  const EVENTI = {
    danno: ['💥', 'Danno', 'dadi, es. 2d6', ''], cura: ['💚', 'Cura', 'dadi, es. 2d4+2', ''], oro: ['🪙', 'Monete d\'oro', 'quante, es. 25', ''], px: ['⭐', 'Esperienza (a testa)', 'quanti PX, es. 100', 'perché'],
    oggetto: ['🎒', 'Oggetto', 'quanti (1)', 'nome dell\'oggetto'], condizione: ['🤢', 'Condizione', 'avvelenato, spaventato, prono…', ''], ispirazione: ['✨', 'Ispirazione', '', ''],
    riposo: ['🌙', 'Riposo', 'breve o lungo', ''], luogo: ['📍', 'Luogo nuovo (ci andate)', 'tipo: villaggio, grotta, castello…', 'nome del luogo'], png: ['🎭', 'Personaggio non giocante', 'chi è, cosa vuole', 'nome'],
    missione: ['📜', 'Missione', 'descrizione', 'titolo'],
  };
  // in più nelle ambientazioni horror (gli eventi di incubo.js)
  const EVENTI_HORROR = {
    vai: ['🚪', 'Andate in un settore vicino', '', ''], rumore: ['🔊', 'Rumore', 'da -3 a 5, es. 2', ''], paura: ['😨', 'Paura', 'da -3 a 3, es. 1', ''], obiettivo: ['🎯', 'Obiettivo completato', '', ''],
    cacciatore: ['👁️', 'La creatura arriva o se ne va', '', ''], risorsa: ['🧰', 'Oggetto della stazione', 'quanti (1)', ''], chiave: ['🗝️', 'Oggetto chiave trovato', '', ''], batterie: ['🔋', 'Batterie', 'es. -10 o +30', ''],
  };
  const CON_CHI = new Set(['danno', 'cura', 'oro', 'oggetto', 'condizione', 'ispirazione', 'paura', 'risorsa', 'batterie']);
  const eventiDi = (p) => (p.incubo ? { ...EVENTI_HORROR, ...EVENTI } : EVENTI);
  const DOMANDE = ['Cosa potrebbe succedere adesso?', 'Che prova chiedo e con che CD?', 'Inventami un PNG per questa scena', 'Un incontro adatto al gruppo', 'Come funzionano vantaggio e svantaggio?'];
  let ultimo = null; // il ctx dell'ultimo disegno (per ridisegnare quando cambia il tipo di evento)

  const sonoDm = (ctx) => ctx.partita.dm != null && ctx.partita.dm === ctx.mio && !ctx.stato.spettatore;
  const info = (ctx) => ctx.partita.dmInfo || {};
  function lista(ctx) { const ui = ctx.ui; if (!ui.drDm) ui.drDm = { prove: [], salvezze: [], eventi: [], nemici: [] }; return ui.drDm; }
  const nomi = (p) => p.pg.filter((x) => x && !x.morto).map((x) => x.nome);
  const opz = (valori, sel) => valori.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(sel) ? 'selected' : ''}>${esc(t)}</option>`).join('');
  const sel = (k, valori, def, attr = '') => `<select data-tieni="${k}" ${attr}>${opz(valori, ultimo && ultimo.ui[`t_${k}`] != null ? ultimo.ui[`t_${k}`] : def)}</select>`;
  const val = (ctx, k, def = '') => (ctx.ui[`t_${k}`] != null ? ctx.ui[`t_${k}`] : def);
  // ✨ "Riscrivi con l'IA" sotto una casella del racconto, e dopo la riscrittura l'avviso con "torna al mio testo"
  function riscrivi(ctx, campo) {
    const I = info(ctx), o = ctx.ui.drDmOrig;
    const bt = `<button type="button" class="dr-bt dr-bt-sec dr-dm-riscr" data-az="dr-dm-riscrivi" data-id="${campo}" ${I.attesaRiscrittura ? 'disabled' : ''} title="Scrivi anche di fretta, a grandi linee: l'IA lo trasforma in un racconto curato, che controlli e cambi prima di mandarlo">✨ Riscrivi con l'IA</button>`;
    const stato = I.attesaRiscrittura && ctx.ui.drDmChiesta === campo ? '<span class="dr-dm-pensa">✨ L\'IA sta riscrivendo il tuo testo…</span>'
      : o && o.campo === campo ? `<span class="dr-dm-riscritto">${o.riserva ? '✏️ L\'IA non è disponibile: ho solo sistemato maiuscole e punteggiatura.' : '✨ Riscritto dall\'IA: rileggilo e cambia quello che vuoi, poi mandalo.'} <button type="button" class="dr-link" data-az="dr-dm-originale" data-id="${campo}">↩️ Torna al mio testo</button></span>` : '';
    return { bt, stato };
  }
  // la riscrittura arriva: prende il posto del testo nella casella (solo se l'ha chiesta questa schermata)
  function caricaRiscrittura(ctx) {
    const x = info(ctx).riscrittura, ui = ctx.ui;
    if (!x || ui.drDmRiscr === x.id) return;
    ui.drDmRiscr = x.id;
    if (ui.drDmChiesta !== x.campo) return;
    ui.drDmChiesta = null;
    if (x.errore) { ctx.avviso(`⚠️ Non riesco a riscrivere: ${x.errore}`); return; }
    ui.drDmOrig = { campo: x.campo, testo: val(ctx, x.campo, x.originale), riserva: !!x.riserva };
    ui[`t_${x.campo}`] = x.testo;
    if (ui.fuoco === x.campo) ui.fuoco = null;
  }
  // testo del consigliere: paragrafi, elenchi e grassetti
  function testoIa(t) {
    return esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').split(/\n+/).filter((x) => x.trim()).map((x) => (/^\s*[-*•]\s+/.test(x) ? `<p class="dr-dm-punto">• ${x.replace(/^\s*[-*•]\s+/, '')}</p>` : `<p>${x}</p>`)).join('');
  }

  // ---------- la creazione: il master non crea il personaggio ----------
  function creazione(ctx, compagnia) {
    return `<div class="dr-pronto"><div class="dr-pronto-carta dr-dm-carta"><span class="dr-dm-cappello">🎩</span><h2>Sei il master</h2>
      <p>Non crei un personaggio: racconti tu la storia, dai voce a chi incontrano, decidi prove, mostri e ricompense. Il gioco tira i dadi e applica le regole.</p>
      <ul class="dr-dm-punti"><li>🧠 L'IA è il tuo consigliere: chiedile regole, idee, nomi e CD.</li><li>📝 Può prepararti una bozza da modificare, o rispondere al posto tuo.</li><li>🤖 Se vuoi riposarti, lasci fare tutto all'IA e riprendi quando vuoi.</li><li>🗺️ Vedi la mappa completa e i segreti dell'ambientazione.</li></ul>
      <p class="dr-nota">Scrivi l'idea della campagna qui a fianco: la leggerai tu (e l'IA, se le chiedi aiuto).</p>
      <button type="button" class="dr-link" data-az="dr-dm-lascia">Non voglio più fare il master</button></div>${compagnia}</div>`;
  }

  // ---------- la consolle sotto il racconto ----------
  function strumenti(ctx) {
    const p = ctx.partita, ui = ctx.ui, I = info(ctx), L = lista(ctx), aperto = ui.drDmStr || null;
    const chi = [['tutti', 'Tutti'], ...nomi(p).map((n) => [n, n])];
    const tab = [['prove', '🎲 Prova o tiro salvezza'], ['combatti', '⚔️ Combattimento'], ['eventi', '🎁 Evento']].map(([id, n]) => `<button type="button" class="dr-chip ${aperto === id ? 'sel' : ''}" data-az="dr-dm-str" data-id="${id}">${n}</button>`).join('');
    let corpo = '';
    if (aperto === 'prove') {
      const tipi = [...Object.entries(T().NOMI_AB).map(([k, [n]]) => [k, `Prova: ${n}`]), ...Object.entries(CARATT).map(([k, n]) => [k, `Prova: ${n}`]), ...Object.entries(CARATT).map(([k, n]) => [`ts:${k}`, `Tiro salvezza: ${n}`])];
      const ts = String(val(ctx, 'dmPTipo', 'percezione')).startsWith('ts:');
      corpo = `<div class="dr-dm-riga">${sel('dmPChi', chi, 'tutti')}${sel('dmPTipo', tipi, 'percezione', 'data-dm-ridisegna')}${sel('dmPCd', [5, 10, 12, 13, 15, 18, 20, 25, 30].map((c) => [c, `CD ${c}`]), 15)}
        ${ts ? `<input data-tieni="dmPDanno" placeholder="danno se fallisce (es. 2d6)" value="${esc(val(ctx, 'dmPDanno'))}" maxlength="20">` : ''}<button type="button" class="dr-bt" data-az="dr-dm-aggiungi" data-id="prova">➕ Aggiungi</button></div>
        <p class="dr-nota">5 facilissima · 10 facile · 15 media · 20 difficile · 25 molto difficile. Il gioco aspetta i tiri e poi ti manda i risultati.</p>`;
    } else if (aperto === 'combatti') {
      const best = (I.bestiario || []).map((m) => [m.id, `${m.nome} (GS ${m.gs})`]);
      corpo = `<div class="dr-dm-riga">${sel('dmMId', best, best[0] ? best[0][0] : '')}${sel('dmMN', [1, 2, 3, 4, 5, 6].map((n) => [n, `×${n}`]), 1)}<button type="button" class="dr-bt" data-az="dr-dm-aggiungi" data-id="mostro">➕ Aggiungi</button></div>
        <div class="dr-dm-riga">${sel('dmScena', (I.scene || []).map((s) => [s, `Scena: ${s}`]), (I.scene || [''])[0])}${sel('dmLuce', [['', 'Luce: dalla scena'], ['giorno', '☀️ Giorno'], ['torce', '🔥 Torce'], ['buio', '🌑 Buio'], ...(p.incubo ? [['emergenza', '🚨 Emergenza']] : [])], '')}</div>
        <p class="dr-nota">Parte quando mandi la risposta: i nemici li muove il gioco, tu racconti e giudichi le azioni libere.</p>`;
    } else if (aperto === 'eventi') {
      const E = eventiDi(p), tipo = E[val(ctx, 'dmETipo', 'danno')] ? val(ctx, 'dmETipo', 'danno') : 'danno', [, , ph1, ph2] = E[tipo];
      const inc = p.incubo || {};
      const extra = tipo === 'vai' ? sel('dmEArea', (inc.strade || []).map((x) => [x.id, `${x.nome}${x.chiuso ? ' 🔒' : ''}`]), (inc.strade || [{}])[0].id)
        : tipo === 'cacciatore' ? sel('dmECacc', [['arriva', 'Arriva qui'], ['via', 'Se ne va']], 'arriva')
        : tipo === 'risorsa' ? sel('dmEOgg', (I.oggettiTema || []).map((o) => [o.id, `${o.icona || ''} ${o.nome}`]), ((I.oggettiTema || [])[0] || {}).id)
        : tipo === 'chiave' ? sel('dmEChiave', (I.chiaviTema || []).map((o) => [o.id, o.nome]), ((I.chiaviTema || [])[0] || {}).id) : '';
      corpo = `<div class="dr-dm-riga">${sel('dmETipo', Object.entries(E).map(([k, [ic, n]]) => [k, `${ic} ${n}`]), 'danno', 'data-dm-ridisegna')}${extra}${CON_CHI.has(tipo) ? sel('dmEChi', tipo === 'oro' ? chi.map(([v, t]) => (v === 'tutti' ? ['gruppo', 'Tutto il gruppo'] : [v, t])) : chi, 'tutti') : ''}
        ${ph2 ? `<input data-tieni="dmETesto" placeholder="${esc(ph2)}" value="${esc(val(ctx, 'dmETesto'))}" maxlength="80">` : ''}${ph1 ? `<input data-tieni="dmEVal" placeholder="${esc(ph1)}" value="${esc(val(ctx, 'dmEVal'))}" maxlength="300">` : ''}
        <button type="button" class="dr-bt" data-az="dr-dm-aggiungi" data-id="evento">➕ Aggiungi</button></div>`;
    }
    // quello che si è aggiunto (si toglie con la ✕)
    const voci = [
      ...L.prove.map((x, k) => [`prove:${k}`, `🎲 ${x.chi}: ${(T().NOMI_AB[x.tipo] || [CARATT[x.tipo] || x.tipo])[0]} CD ${x.cd}`]),
      ...L.salvezze.map((x, k) => [`salvezze:${k}`, `🛡️ ${x.chi}: TS ${CARATT[x.car] || x.car} CD ${x.cd}${x.danno ? ` (${x.danno})` : ''}`]),
      ...L.nemici.map((x, k) => [`nemici:${k}`, `⚔️ ${esc(x.nome || ((I.bestiario || []).find((m) => m.id === x.id) || {}).nome || x.id)}${x.n > 1 ? ` ×${x.n}` : ''}`]),
      ...L.eventi.map((x, k) => [`eventi:${k}`, `${(eventiDi(p)[x.tipo] || ['•'])[0]} ${x.tipo}${x.chi ? ` · ${x.chi}` : ''}${x.nome || x.titolo ? ` · ${x.nome || x.titolo}` : ''}${x.danno || x.cura || x.quantita ? ` · ${x.danno || x.cura || x.quantita}` : ''}`]),
    ];
    const aggiunti = voci.length ? `<div class="dr-chips dr-dm-aggiunti">${voci.map(([k, t]) => `<span class="dr-chip fissa">${esc(t)} <button type="button" class="dr-link" data-az="dr-dm-togli" data-id="${k}" aria-label="Togli">✕</button></span>`).join('')}</div>` : '';
    return `<div class="dr-chips dr-dm-strumenti">${tab}</div>${corpo ? `<div class="dr-dm-str-corpo">${corpo}</div>` : ''}${aggiunti}`;
  }
  function consolle(ctx) {
    const p = ctx.partita, ui = ctx.ui, I = info(ctx), r = I.richiesta;
    if (p.finita) return '<div class="dr-sotto"><p class="dr-fine-camp">🏁 La campagna è finita. Bravo master!</p></div>';
    if (p.fase === 'caduti') return '<div class="dr-sotto"><p class="dr-fine-camp">💀 I personaggi sono tutti morti. Possono tornare con <b>!revive</b> in chat, oppure chiudi la campagna.</p></div>';
    const piede = `<div class="dr-dm-piede">${p.dmAuto ? '<button type="button" class="dr-bt dr-bt-oro" data-az="dr-dm-auto" data-id="0">🎩 Riprendo io il racconto</button>' : '<button type="button" class="dr-link" data-az="dr-dm-auto" data-id="1" title="L\'IA risponde da sola finché non riprendi">🤖 Lascia fare tutto all\'IA</button>'}<button type="button" class="dr-link" data-az="dr-dm-lascia">Lascia il ruolo di master</button></div>`;
    if (p.dmAuto) return `<div class="dr-sotto"><div class="dr-dm-stato">🤖 Sta raccontando l'IA. Puoi intervenire con un racconto o riprendere quando vuoi.</div>${narra(ctx)}${piede}</div>`;
    if (p.attesaIA && !r) return `<div class="dr-sotto"><div class="dr-attende"><span class="dr-candela"></span>L'IA sta rispondendo al posto tuo…</div>${piede}</div>`;
    let testa = '';
    if (r) testa = `<div class="dr-dm-rich"><h3>🎩 Tocca a te, master</h3><small>${esc(TIPI_RICHIESTA[r.tipo] || 'Cosa succede')}</small><div class="dr-dm-rich-testo">${testoIa(r.testo)}</div></div>`;
    else if (p.fase === 'prove') {
      const mancano = p.prove.filter((x) => !x.esito).map((x) => (p.pg[x.posto] || {}).nome).filter(Boolean);
      return `<div class="dr-sotto"><div class="dr-dm-stato">🎲 I giocatori tirano i dadi${mancano.length ? ` (mancano: ${esc([...new Set(mancano)].join(', '))})` : ''}. Poi ti arrivano i risultati.</div>${narra(ctx)}${piede}</div>`;
    } else if (p.fase === 'avventura') {
      const mancano = p.pg.map((x, i) => (x && !x.morto && !p.bot[i] && p.dichiarazioni[i] == null ? x.nome : null)).filter(Boolean);
      const scritti = Object.values(p.dichiarazioni).some((x) => x);
      testa = `<div class="dr-dm-stato">✍️ I giocatori scrivono cosa fanno${mancano.length ? `. Aspettando: ${esc(mancano.join(', '))}` : ''}.${scritti ? ' <button type="button" class="dr-bt" data-az="dr-dm-manda">⏩ Leggi adesso quello che hanno scritto</button>' : ''}<small>Intanto puoi intervenire: racconta, chiedi una prova, fai partire uno scontro.</small></div>`;
    } else return `<div class="dr-sotto">${narra(ctx)}${piede}</div>`;
    const bozza = I.attesaBozza ? '<span class="dr-dm-pensa">🧠 L\'IA scrive la bozza…</span>' : '';
    const rs = riscrivi(ctx, 'dmNarr');
    return `<div class="dr-sotto dr-dm-consolle">${testa}
      <textarea class="dr-dm-testo" data-tieni="dmNarr" maxlength="9000" rows="${r ? 5 : 3}" placeholder="Racconta cosa succede: descrivi, fai parlare i personaggi che incontrano, lascia la scena aperta… (anche di fretta: poi ✨ lo riscrive l'IA)">${esc(val(ctx, 'dmNarr'))}</textarea>
      <div class="dr-dm-bottoni">${rs.bt}${rs.stato}</div>
      ${strumenti(ctx)}
      <div class="dr-dm-riga"><input data-tieni="dmScelte" maxlength="400" placeholder="Idee per i giocatori, separate da ; (facoltative)" value="${esc(val(ctx, 'dmScelte'))}">${sel('dmAtm', Object.entries(ATMOSFERE), '')}</div>
      <div class="dr-dm-bottoni"><button type="button" class="dr-bt dr-bt-oro" data-az="dr-dm-manda-risposta">📜 Manda ai giocatori</button>${r ? `<button type="button" class="dr-bt" data-az="dr-dm-bozza" ${I.attesaBozza ? 'disabled' : ''} title="L'IA scrive una proposta: la modifichi e la mandi tu">🧠 Proponimi una bozza</button><button type="button" class="dr-bt dr-bt-sec" data-az="dr-dm-ia" title="Risponde l'IA, solo questa volta">⚡ Rispondi tu, IA</button>` : ''}${bozza}</div>
      ${piede}</div>`;
  }
  function narra(ctx) {
    const rs = riscrivi(ctx, 'dmNarra');
    return `<div class="dr-dm-narra"><textarea data-tieni="dmNarra" maxlength="3000" rows="2" placeholder="Racconta qualcosa ai giocatori (si aggiunge al racconto)">${esc(val(ctx, 'dmNarra'))}</textarea><div class="dr-dm-narra-bt"><button type="button" class="dr-bt" data-az="dr-dm-narra">🪶 Racconta</button>${rs.bt}</div>${rs.stato ? `<div class="dr-dm-narra-stato">${rs.stato}</div>` : ''}</div>`;
  }

  // ---------- a fianco: master in battaglia, consigliere, mappa, bestiario, guida ----------
  function battaglia(ctx) {
    const p = ctx.partita, x = info(ctx).libera, rs = riscrivi(ctx, 'dmLNarr');
    const lib = x ? `<div class="dr-dm-libera"><h4>⚔️ Azione libera da giudicare</h4><p><b>${esc(x.chi)}</b> tenta: <q>${esc(x.testo)}</q> <span class="dr-dm-d20">d20: <b>${x.d20}</b></span></p>
        <textarea data-tieni="dmLNarr" rows="3" maxlength="3000" placeholder="Racconta cosa succede">${esc(val(ctx, 'dmLNarr'))}</textarea>
        <div class="dr-dm-bottoni">${rs.bt}${rs.stato}</div>
        <div class="dr-dm-riga">${sel('dmLB', [['', 'Nessun bersaglio'], ...x.creature.map((c) => [c.nome, `${c.nome} (${c.pf}/${c.pfMax} PF, CA ${c.ca})`])], '')}<input data-tieni="dmLD" placeholder="danno (es. 2d6)" maxlength="20" value="${esc(val(ctx, 'dmLD'))}">${sel('dmLC', [['', 'Nessuna condizione'], ...['prono', 'afferrato', 'accecato', 'spaventato', 'stordito', 'trattenuto', 'avvelenato', 'incapacitato'].map((c) => [c, c])], '')}</div>
        <div class="dr-dm-bottoni"><button type="button" class="dr-bt dr-bt-oro" data-az="dr-dm-libera" data-id="1">✔ Riesce</button><button type="button" class="dr-bt" data-az="dr-dm-libera" data-id="0">✖ Non riesce</button><button type="button" class="dr-bt dr-bt-sec" data-az="dr-dm-ia">⚡ Decida l'IA</button></div></div>` : '';
    const I = info(ctx), aMano = I.nemiciAMano !== false, sposta = CB().spostando(ctx);
    const comandi = `<div class="dr-dm-nemici"><div class="dr-dm-bottoni"><span>👹 I nemici:</span><button type="button" class="dr-chip ${aMano ? 'sel' : ''}" data-az="dr-dm-nemici" data-id="1">🎩 Li muovo io</button><button type="button" class="dr-chip ${aMano ? '' : 'sel'}" data-az="dr-dm-nemici" data-id="0">🤖 Li muove il gioco</button><button type="button" class="dr-chip ${sposta ? 'sel' : ''}" data-az="dr-cb-sposta" title="Metti un nemico dove vuoi sulla mappa, senza regole e in qualsiasi momento">🖐️ Sposta a mano</button></div>
      <p class="dr-nota">${sposta ? '🖐️ Tocca un nemico sulla mappa, poi la casella dove metterlo. Tocca di nuovo «Sposta a mano» per finire.' : aMano ? 'Al turno di un nemico lo muovi tu, con le regole: spostalo, attacca, usa il soffio o lascia il turno al gioco. Tu racconti la battaglia e giudichi le azioni libere dei giocatori.' : 'I nemici li muove il gioco con le regole. Tu racconti la battaglia e giudichi le azioni libere dei giocatori.'}</p></div>`;
    if (I.mano) return `<div class="dr-dm-cb">${lib}${comandi}${CB().pannello(ctx)}${p.combattimento ? narra(ctx) : ''}</div>`;
    return `<div class="dr-dm-cb">${lib}${comandi}${p.combattimento ? narra(ctx) : ''}${CB().pannello(ctx)}</div>`;
  }
  function consigliere(ctx) {
    const I = info(ctx), msgs = I.consigli || [];
    const righe = msgs.length ? msgs.map((m) => `<div class="dr-dm-msg ${m.ruolo === 'dm' ? 'io' : 'ia'}">${m.ruolo === 'dm' ? esc(m.testo) : testoIa(m.testo)}</div>`).join('') : '<p class="dr-nota">Chiedi qualsiasi cosa: una regola, un\'idea per la scena, un nome, che CD dare, un mostro adatto. I giocatori non vedono niente di qui.</p>';
    return `<div class="dr-dm-consiglio"><div class="dr-dm-msgs" data-scorri="dm-consigli">${righe}${I.attesaConsiglio ? '<div class="dr-dm-msg ia"><span class="dr-dm-pensa">🧠 Sto pensando…</span></div>' : ''}</div>
      <div class="dr-chips">${DOMANDE.map((d) => `<button type="button" class="dr-chip" data-az="dr-dm-chiedi" data-t="${esc(d)}">${esc(d)}</button>`).join('')}</div>
      <div class="dr-dm-chiedi"><textarea data-tieni="dmChiedi" rows="2" maxlength="1500" placeholder="Chiedi al consigliere…"></textarea><button type="button" class="dr-bt dr-bt-oro" data-az="dr-dm-chiedi" ${I.attesaConsiglio ? 'disabled' : ''}>Chiedi</button></div>
      ${msgs.length ? '<button type="button" class="dr-link" data-az="dr-dm-svuota">Cancella la conversazione</button>' : ''}</div>`;
  }
  function bestiario(ctx) {
    const b = info(ctx).bestiario || [];
    return `<p class="dr-nota">Tocca ➕ per mettere un mostro nel prossimo combattimento.</p><ul class="dr-lista dr-dm-best">${b.map((m) => `<li><span>${esc(m.simbolo || '👹')}</span><div><b>${esc(m.nome)}</b><small>GS ${m.gs} · ${m.pf} PF · CA ${m.ca}</small></div><button type="button" class="dr-chip" data-az="dr-dm-mostro" data-id="${esc(m.id)}">➕</button></li>`).join('')}</ul>`;
  }
  function guida(ctx) {
    const I = info(ctx);
    return `<div class="dr-dm-guida">${I.segreti ? `<h4 class="dr-sez-tit">🔒 Quello che sai solo tu</h4><div class="dr-dm-segreti">${testoIa(I.segreti)}</div>` : ''}
      <h4 class="dr-sez-tit">🎩 Come si fa il master</h4><ol><li>Leggi cosa hanno fatto i giocatori.</li><li>Racconta cosa succede (luoghi, rumori, chi parla e cosa dice).</li><li>Se l'esito è incerto chiedi una prova; per i pericoli un tiro salvezza.</li><li>Quando arrivano i risultati, racconta come va.</li><li>Lascia sempre qualcosa da fare: una porta, una voce, un indizio.</li></ol>
      <h4 class="dr-sez-tit">🎲 Le difficoltà (CD)</h4><table class="dr-dm-tab"><tr><td>5</td><td>facilissima</td></tr><tr><td>10</td><td>facile</td></tr><tr><td>15</td><td>media</td></tr><tr><td>20</td><td>difficile</td></tr><tr><td>25</td><td>molto difficile</td></tr><tr><td>30</td><td>quasi impossibile</td></tr></table>
      <h4 class="dr-sez-tit">🛡️ Tiri salvezza</h4><p>Destrezza per schivare (trappole, esplosioni), Costituzione per resistere (veleni, freddo), Saggezza per la mente (paura, magie). Danni tipici: 1d10 al 1° livello, 2d10 al 5°, 4d10 al 10°.</p>
      <h4 class="dr-sez-tit">⭐ Ricompense</h4><p>Un incontro medio vale 50-100 PX a testa al 1° livello, 300-500 al 5°. Dai l'ispirazione per una bella interpretazione.</p>
      <h4 class="dr-sez-tit">💡 Consigli</h4><ul><li>Di' «sì, ma…» invece di «no»: ogni idea dei giocatori può funzionare a un prezzo.</li><li>Un PNG si ricorda con un aspetto, un modo di parlare e un desiderio.</li><li>Se sei bloccato chiedi al consigliere, o fagli scrivere una bozza.</li></ul></div>`;
  }
  function mappa(ctx) {
    const p = ctx.partita, inc = p.incubo;
    if (!inc || !inc.aree) return T().mappa(ctx);
    const ob = inc.obiettivo;
    return `<div class="dr-in-pann"><p class="dr-nota">Vedi tutta la stazione: 📍 dove sono i giocatori, 🎯 l'obiettivo, il bollino rosso è la creatura. I settori tratteggiati non li hanno ancora visti.</p>
      ${ob ? `<div class="dr-in-ob"><small>🎯 Obiettivo ${inc.fatti + 1} di ${inc.totale}</small><b>${esc(ob.titolo)}</b><p>${esc(ob.testo)}</p><small>📍 ${esc(ob.area)}</small></div>` : ''}${IN().mappaStazione(inc)}<p class="dr-nota">🚪 porta · 🛗 ascensore · 🚋 tram · 🕳️ condotto · 🔒 chiuso (serve un oggetto) · 🔊 rumore ${inc.rumore}/10</p></div>`;
  }
  function lato(ctx) {
    const p = ctx.partita, ui = ctx.ui, I = info(ctx);
    const schede = [...(p.combattimento ? [['dm', '🎩', 'Master']] : []), ['consiglio', '🧠', 'Consigliere'], ['mappa', p.incubo ? '🛰️' : '🗺️', 'Mappa'], ['bestiario', '🐉', 'Bestiario'], ['guida', '📘', 'Guida'], ...(p.combattimento ? [] : [['missioni', '📜', 'Missioni']])];
    if (!schede.some((s) => s[0] === ui.drLato)) ui.drLato = schede[0][0];
    const corpo = { dm: battaglia, consiglio: consigliere, mappa, bestiario, guida, missioni: (c) => `${T().missioni(c)}${T().diario(c)}` }[ui.drLato](ctx);
    const pallino = (id) => (id === 'dm' && I.libera ? '<i class="dr-pallino"></i>' : '');
    return `<aside class="dr-lato"><nav class="dr-schede">${schede.map(([id, ic, n]) => `<button type="button" class="${ui.drLato === id ? 'sel' : ''}" data-az="dr-lato" data-id="${id}">${ic}<span>${n}</span>${pallino(id)}</button>`).join('')}</nav><div class="dr-lato-corpo" data-scorri="lato-${ui.drLato}">${corpo}</div></aside>`;
  }

  // la bozza dell'IA arriva: riempie la consolle (il master la cambia e la manda)
  function caricaBozza(ctx) {
    const b = info(ctx).bozza, ui = ctx.ui;
    if (!b || ui.drDmBozza === b.id) return;
    ui.drDmBozza = b.id;
    const r = b.r || {};
    ui.t_dmNarr = r.narrazione || '';
    ui.drDm = { prove: (r.prove || []).map((x) => ({ chi: x.chi || 'tutti', tipo: x.tipo, cd: Number(x.cd) || 15 })), salvezze: (r.salvezze || []).slice(), eventi: (r.eventi || []).slice(), nemici: r.combattimento ? (r.combattimento.nemici || []).slice() : [] };
    if (r.combattimento && r.combattimento.scena) ui.t_dmScena = r.combattimento.scena;
    ui.t_dmScelte = (r.scelte || []).join('; ');
    ui.t_dmAtm = r.atmosfera && ATMOSFERE[r.atmosfera] ? r.atmosfera : '';
  }

  function panno(ctx, scena) {
    ultimo = ctx;
    const p = ctx.partita, ui = ctx.ui, cb = p.combattimento, tel = T().telefono();
    caricaBozza(ctx);
    caricaRiscrittura(ctx);
    const scheda1 = ui.drScheda ? T().scheda(ctx, ui.drScheda) : '';
    if (cb && ui.drCbVisto !== cb.scena.g.length + cb.scena.stile) { ui.drCbVisto = cb.scena.g.length + cb.scena.stile; ui.drTab = 'battaglia'; ui.drLato = 'dm'; }
    if (!cb && ui.drTab === 'battaglia') ui.drTab = 'storia';
    if (info(ctx).libera && primaVolta(ui, `dr-dm-lib-${info(ctx).libera.testo}`)) { ui.drLato = 'dm'; if (tel) ui.drTab = 'mondo'; }
    if (info(ctx).mano && cb && primaVolta(ui, `dr-dm-mano-${cb.round}-${cb.attivo}`)) { ui.drLato = 'dm'; if (tel) ui.drTab = 'battaglia'; }
    // sul telefono la consolle ha la sua scheda «Rispondi»: nella Storia il racconto prende tutto lo schermo
    if (ui.drTab === 'consolle' && (cb || !tel)) ui.drTab = cb ? 'battaglia' : 'storia';
    const tab = ui.drTab || (cb ? 'battaglia' : 'storia');
    const r = info(ctx).richiesta;
    let centro;
    if (cb) centro = `<section class="dr-centro dr-centro-cb">${CB().filaIniziativa(ctx)}<div id="dr-campo-posto" class="dr-campo-posto"></div></section>`;
    else {
      const vai = tel ? `<button type="button" class="dr-dm-vai ${r ? 'forte' : ''}" data-az="dr-tab" data-id="consolle">${r ? '🎩 Tocca a te, master: rispondi' : '🎩 Racconta, chiedi una prova, fai partire uno scontro'} ›</button>` : '';
      centro = `<section class="dr-centro">${T().testaStoria(ctx)}${T().racconto(ctx)}${vai}${consolle(ctx)}</section>`;
    }
    const schede = cb ? [['battaglia', '⚔️', 'Battaglia'], ['mondo', '🎩', 'Master'], ['gruppo', '👥', 'Gruppo']]
      : [['storia', '📖', 'Storia'], ...(tel ? [['consolle', '🎩', 'Rispondi']] : []), ['mondo', '🧠', 'Aiuti'], ['gruppo', '👥', 'Gruppo']];
    const nav = schede.map(([id, ic, n]) => `<button type="button" class="${tab === id ? 'sel' : ''}" data-az="dr-tab" data-id="${id}"><span>${ic}</span>${n}${(id === (tel ? 'consolle' : 'storia') && r) || (id === 'mondo' && info(ctx).libera) ? '<i class="dr-pallino"></i>' : ''}</button>`).join('');
    return `<div class="dr dr-dm ${scena} ${cb ? 'dr-in-cb' : ''} dr-tab-${tab} dr-atm-${esc(p.atmosfera || 'calma')}">${T().gruppo(ctx)}${centro}${lato(ctx)}<nav class="dr-nav">${nav}</nav>${scheda1}</div>`;
  }
  function stato(ctx) {
    const p = ctx.partita, I = info(ctx);
    if (p.finita) return null;
    if (I.richiesta) return '🎩 Tocca a te, master!';
    if (I.libera) return '⚔️ Giudica l\'azione libera';
    if (I.mano) return `🎩 Muovi ${I.mano.nome}`;
    if (p.fase === 'combattimento') return '⚔️ Battaglia';
    if (p.dmAuto) return '🤖 Racconta l\'IA';
    return '🎩 Sei il master';
  }
  function dopo(ctx) {
    const I = info(ctx), ui = ctx.ui;
    if (I.richiesta && primaVolta(ui, `dr-dm-r${I.richiesta.id}`)) suono([[392, 0.08], [523, 0.08], [659, 0.14]], { tipo: 'triangle', volume: 0.045 });
    if (I.libera && primaVolta(ui, `dr-dm-l${I.libera.testo}`)) suono([[330, 0.06], [440, 0.1]], { tipo: 'triangle', volume: 0.04 });
    const m = document.querySelector('#panno [data-scorri="dm-consigli"]'); if (m) m.scrollTop = m.scrollHeight;
  }

  // ---------- i pulsanti ----------
  function aggiungi(ctx, cosa) {
    const ui = ctx.ui, L = lista(ctx), v = (k, d = '') => String(val(ctx, k, d)).trim();
    if (cosa === 'prova') {
      const tipo = v('dmPTipo', 'percezione'), chi = v('dmPChi', 'tutti'), cd = Number(v('dmPCd', 15)) || 15;
      if (tipo.startsWith('ts:')) L.salvezze.push({ chi, car: tipo.slice(3), cd, danno: /^[\dd+\- ]+$/i.test(v('dmPDanno')) ? v('dmPDanno').replace(/\s/g, '') : null, tipoDanno: 'contundente', meta: true });
      else L.prove.push({ chi, tipo, cd });
      ui.t_dmPDanno = '';
    } else if (cosa === 'mostro') {
      const id = v('dmMId', (info(ctx).bestiario || [{}])[0].id); if (!id) return ctx.avviso('Scegli un mostro');
      const n = Number(v('dmMN', 1)) || 1, x = L.nemici.find((m) => m.id === id && !m.attacchi);
      if (x) x.n = Math.min(10, (x.n || 1) + n); else L.nemici.push({ id, n });
    } else if (cosa === 'evento') {
      const tipo = v('dmETipo', 'danno'), chi = v('dmEChi', tipo === 'oro' ? 'gruppo' : 'tutti'), x = v('dmEVal'), t = v('dmETesto');
      const e = { tipo };
      if (CON_CHI.has(tipo)) e.chi = chi;
      if (tipo === 'danno') { e.danno = /^[\dd+\- ]+$/i.test(x) && x ? x.replace(/\s/g, '') : '1d6'; e.tipoDanno = 'contundente'; }
      else if (tipo === 'cura') e.cura = /^[\dd+\- ]+$/i.test(x) && x ? x.replace(/\s/g, '') : '1d8';
      else if (tipo === 'oro') e.quantita = Math.round(Number(x)) || 10;
      else if (tipo === 'px') { e.quantita = Math.round(Number(x)) || 50; if (t) e.motivo = t; }
      else if (tipo === 'oggetto') { if (!t) return ctx.avviso('Scrivi il nome dell\'oggetto'); e.nome = t; e.n = Math.max(1, Number(x) || 1); }
      else if (tipo === 'condizione') { if (!x) return ctx.avviso('Scrivi la condizione (es. avvelenato)'); e.condizione = x.toLowerCase(); }
      else if (tipo === 'riposo') e.durata = /lung/i.test(x) ? 'lungo' : 'breve';
      else if (tipo === 'luogo') { if (!t) return ctx.avviso('Scrivi il nome del luogo'); e.nome = t; e.luogoTipo = x || 'altro'; e.vaiQui = true; }
      else if (tipo === 'png') { if (!t) return ctx.avviso('Scrivi il nome del personaggio'); e.nome = t; e.descrizione = x; e.atteggiamento = 'neutrale'; }
      else if (tipo === 'missione') { if (!t) return ctx.avviso('Scrivi il titolo della missione'); e.titolo = t; e.descrizione = x; e.stato = 'nuova'; }
      else if (tipo === 'vai') { const inc = ctx.partita.incubo || {}; e.area = v('dmEArea', ((inc.strade || [])[0] || {}).id); if (!e.area) return ctx.avviso('Non ci sono settori vicini'); e.forza = true; e.nome = ((inc.strade || []).find((s) => s.id === e.area) || {}).nome; }
      else if (tipo === 'rumore' || tipo === 'paura' || tipo === 'batterie') e.quantita = Math.round(Number(x)) || (tipo === 'batterie' ? -10 : 1);
      else if (tipo === 'cacciatore') { if (v('dmECacc', 'arriva') === 'via') e.via = true; else e.arriva = true; }
      else if (tipo === 'risorsa') { const I = info(ctx); e.tipo = 'oggetto'; e.id = v('dmEOgg', ((I.oggettiTema || [])[0] || {}).id); e.nome = ((I.oggettiTema || []).find((o) => o.id === e.id) || {}).nome; e.n = Math.max(1, Number(x) || 1); }
      else if (tipo === 'chiave') { const I = info(ctx); e.id = v('dmEChiave', ((I.chiaviTema || [])[0] || {}).id); e.nome = ((I.chiaviTema || []).find((o) => o.id === e.id) || {}).nome; }
      L.eventi.push(e);
      ui.t_dmEVal = ''; ui.t_dmETesto = '';
    }
    return ctx.ridisegna();
  }
  function risposta(ctx) {
    const ui = ctx.ui, L = lista(ctx);
    const scelte = String(val(ctx, 'dmScelte')).split(/[;\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 5);
    const out = { narrazione: String(val(ctx, 'dmNarr')).trim(), prove: L.prove, salvezze: L.salvezze, eventi: L.eventi, scelte, atmosfera: val(ctx, 'dmAtm') || null };
    if (L.nemici.length) out.combattimento = { nemici: L.nemici, scena: val(ctx, 'dmScena') || (info(ctx).scene || [])[0], luce: val(ctx, 'dmLuce') || null };
    return out;
  }
  function svuota(ui) { if (ui.drDmOrig && ui.drDmOrig.campo === 'dmNarr') ui.drDmOrig = null; ui.drDm = null; ui.t_dmNarr = ''; ui.t_dmScelte = ''; ui.t_dmAtm = ''; ui.drDmStr = null; ui.fuoco = null; }
  function clic(ctx, el) {
    const az = el.dataset.az, id = el.dataset.id, ui = ctx.ui, L = lista(ctx);
    switch (az) {
      case 'dr-dm-scegli': return ctx.invia({ tipo: 'dm-scegli', posto: Number(id) });
      case 'dr-dm-lascia': if (!window.confirm(ctx.partita.fase === 'creazione' ? 'Non fare più il master? Al suo posto ci sarà l\'IA.' : 'Lasciare il ruolo di master? Da ora racconterà l\'IA.')) return undefined; return ctx.invia({ tipo: 'dm-lascia' });
      case 'dr-dm-str': ui.drDmStr = ui.drDmStr === id ? null : id; return ctx.ridisegna();
      case 'dr-dm-aggiungi': return aggiungi(ctx, id);
      case 'dr-dm-togli': { const [k, i] = String(id).split(':'); if (L[k]) L[k].splice(Number(i), 1); return ctx.ridisegna(); }
      case 'dr-dm-mostro': { const x = L.nemici.find((m) => m.id === id && !m.attacchi); if (x) x.n = Math.min(10, (x.n || 1) + 1); else L.nemici.push({ id, n: 1 }); ui.drDmStr = 'combatti'; if (T().telefono()) ui.drTab = 'consolle'; ctx.avviso('Aggiunto al prossimo combattimento'); return ctx.ridisegna(); }
      case 'dr-dm-manda-risposta': {
        const r = risposta(ctx);
        if (!r.narrazione && !r.prove.length && !r.salvezze.length && !r.eventi.length && !r.combattimento) return ctx.avviso('Scrivi cosa succede (o aggiungi una prova, un combattimento o un evento)');
        svuota(ui);
        if (ui.drTab === 'consolle') ui.drTab = 'storia'; // sul telefono si torna al racconto per vedere cosa succede
        suono([[440, 0.05], [554, 0.05], [659, 0.08]], { tipo: 'sine', volume: 0.035 });
        return ctx.invia({ tipo: 'dm-rispondi', risposta: r });
      }
      case 'dr-dm-manda': return ctx.invia({ tipo: 'manda' });
      case 'dr-dm-bozza': return ctx.invia({ tipo: 'dm-bozza' });
      case 'dr-dm-ia': svuota(ui); if (ui.drTab === 'consolle') ui.drTab = 'storia'; return ctx.invia({ tipo: 'dm-ia' });
      case 'dr-dm-auto': return ctx.invia({ tipo: 'dm-auto', si: id === '1' });
      case 'dr-dm-riscrivi': {
        const campo = id || 'dmNarr', t = String(val(ctx, campo)).trim();
        if (!t) return ctx.avviso('Scrivi prima cosa succede, anche in due parole: poi l\'IA lo racconta per bene');
        ui.drDmChiesta = campo; ui.drDmOrig = null;
        return ctx.invia({ tipo: 'dm-riscrivi', campo, testo: t });
      }
      case 'dr-dm-originale': { const o = ui.drDmOrig; if (o && o.campo === id) { ui[`t_${id}`] = o.testo; ui.drDmOrig = null; ui.fuoco = null; } return ctx.ridisegna(); }
      case 'dr-dm-narra': { const t = String(val(ctx, 'dmNarra')).trim(); if (!t) return ctx.avviso('Scrivi cosa racconti'); if (ui.drDmOrig && ui.drDmOrig.campo === 'dmNarra') ui.drDmOrig = null; ui.t_dmNarra = ''; ui.fuoco = null; return ctx.invia({ tipo: 'dm-narra', testo: t }); }
      case 'dr-dm-libera': {
        const riesce = id === '1', b = val(ctx, 'dmLB'), d = String(val(ctx, 'dmLD')).trim(), c = val(ctx, 'dmLC');
        const effetti = riesce && b && (d || c) ? [{ bersaglio: b, danno: /^[\dd+\- ]+$/i.test(d) && d ? d.replace(/\s/g, '') : null, tipoDanno: 'contundente', condizione: c || null, turni: 1 }] : [];
        const esito = { narrazione: String(val(ctx, 'dmLNarr')).trim(), riuscita: riesce, effetti };
        if (ui.drDmOrig && ui.drDmOrig.campo === 'dmLNarr') ui.drDmOrig = null;
        ui.t_dmLNarr = ''; ui.t_dmLD = ''; ui.t_dmLB = ''; ui.t_dmLC = '';
        return ctx.invia({ tipo: 'dm-libera', esito });
      }
      case 'dr-dm-chiedi': {
        const t = String(el.dataset.t || val(ctx, 'dmChiedi')).trim();
        if (!t) return ctx.avviso('Scrivi la domanda');
        if (!el.dataset.t) { ui.t_dmChiedi = ''; ui.fuoco = null; }
        ui.drLato = 'consiglio';
        return ctx.invia({ tipo: 'dm-chiedi', testo: t });
      }
      case 'dr-dm-svuota': return ctx.invia({ tipo: 'dm-svuota' });
      case 'dr-dm-nemici': return ctx.invia({ tipo: 'dm-nemici', si: id === '1' });
      default: return undefined;
    }
  }
  // cambiare il tipo di prova o di evento cambia i campi da riempire
  document.addEventListener('change', (e) => { if (e.target && e.target.matches && e.target.matches('#panno [data-dm-ridisegna]') && ultimo) { ultimo.ui[`t_${e.target.dataset.tieni}`] = e.target.value; ultimo.ridisegna(); } });
  // Invio nella domanda al consigliere = chiedi
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.shiftKey || !e.target || !e.target.matches || !e.target.matches('#panno textarea[data-tieni="dmChiedi"]')) return;
    e.preventDefault(); const b = document.querySelector('#panno .dr-dm-chiedi [data-az="dr-dm-chiedi"]'); if (b && !b.disabled) b.click();
  });

  window.DraghiMaster = { sonoDm, creazione, panno, stato, dopo, clic };
})();
