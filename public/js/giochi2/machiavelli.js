// MACHIAVELLI: la tavola con tutte le combinazioni (riquadri), la mano in basso. Al proprio turno si lavora su una
// copia locale: si scelgono carte (clic o trascinamento) dalla mano o dalla tavola e si mettono in una combinazione,
// in una nuova o di nuovo in mano (solo quelle calate in questo turno). I gruppi non validi hanno il bordo rosso;
// "Conferma" manda al server la tavola com'è, che la controlla tutta.
(() => {
  const { esc, primaVolta, suono } = window.Nuovi;
  const SEMI = ['c', 'q', 'f', 'p'];
  const daId = (id) => { const x = String(id).match(/^(\d{1,2})([cqfp])(b?)$/); return x ? { id, rango: Number(x[1]), seme: x[2] } : null; };
  const F = (c, cls = '', attr = '') => Carte.fronte(c, cls, attr);

  // stessa regola del server: scala (asso basso o alto, niente giro) oppure tris/poker di semi diversi
  function valuta(carte) {
    if (carte.length < 3) return null;
    const r0 = carte[0].rango;
    if (carte.every((c) => c.rango === r0)) {
      if (carte.length > 4 || new Set(carte.map((c) => c.seme)).size !== carte.length) return null;
      return [...carte].sort((a, b) => SEMI.indexOf(a.seme) - SEMI.indexOf(b.seme));
    }
    if (!carte.every((c) => c.seme === carte[0].seme) || carte.length > 14) return null;
    const assi = carte.filter((c) => c.rango === 1), altre = carte.filter((c) => c.rango !== 1);
    if (new Set(altre.map((c) => c.rango)).size !== altre.length || assi.length > 2) return null;
    const fila = (pa) => { const v = [...altre.map((c) => c.rango), ...pa].sort((a, b) => a - b); return v.every((x, i) => !i || x === v[i - 1] + 1); };
    const ord = (alti) => [...carte].sort((a, b) => (a.rango === 1 ? (alti.includes(a) ? 14 : 1) : a.rango) - (b.rango === 1 ? (alti.includes(b) ? 14 : 1) : b.rango));
    if (!assi.length) return fila([]) ? ord([]) : null;
    if (assi.length === 1) return fila([1]) ? ord([]) : fila([14]) ? ord(assi) : null;
    return fila([1, 14]) ? ord([assi[1]]) : null;
  }
  // ordine "comodo" per un gruppo non valido: per seme e valore
  const ordinaGrezzo = (cs) => [...cs].sort((a, b) => SEMI.indexOf(a.seme) - SEMI.indexOf(b.seme) || a.rango - b.rango);
  let modoMano = 'seme';
  try { modoMano = localStorage.getItem('mv-ordine') === 'valore' ? 'valore' : 'seme'; } catch { /* niente */ }
  const k14 = (c) => (c.rango === 1 ? 14 : c.rango);
  const ordinaMano = (cs) => [...cs].sort((a, b) => (modoMano === 'seme'
    ? SEMI.indexOf(a.seme) - SEMI.indexOf(b.seme) || k14(a) - k14(b)
    : k14(a) - k14(b) || SEMI.indexOf(a.seme) - SEMI.indexOf(b.seme)));

  let ctxMV = null;
  // la bozza del turno: si rifà quando cambia la mossa (o non tocca a me)
  function bozza(ctx) {
    const p = ctx.partita, ui = ctx.ui;
    const mio = p.turno === ctx.mio && !p.finita;
    const chiave = `${p.nMossa}-${mio}`;
    if (ui.mvChiave !== chiave) {
      ui.mvChiave = chiave;
      ui.mvSel = [];
      ui.mvBozza = { gruppi: p.tavolo.map((g) => g.map((c) => c.id)), mano: p.mano.map((c) => c.id) };
      ui.mvInviato = false;
    }
    return ui.mvBozza;
  }
  function carteNote(p) { const m = new Map(); for (const c of [...p.tavolo.flat(), ...p.mano]) m.set(c.id, c); return m; }
  function stato(ctx) {
    const p = ctx.partita, b = bozza(ctx), note = carteNote(p);
    const inTavola = new Set(p.tavolo.flat().map((c) => c.id));
    const gruppi = b.gruppi.map((g) => {
      const cs = g.map((id) => note.get(id)).filter(Boolean);
      const v = valuta(cs);
      return { ids: g, carte: v || ordinaGrezzo(cs), valido: !!v };
    });
    const calate = b.gruppi.flat().filter((id) => !inTavola.has(id));
    const cambiato = calate.length > 0 || JSON.stringify(b.gruppi) !== JSON.stringify(p.tavolo.map((g) => g.map((c) => c.id)));
    return { gruppi, calate, cambiato, tuttiValidi: gruppi.every((g) => g.valido), inTavola, note };
  }

  // sposta le carte scelte: in un gruppo (indice), in un gruppo nuovo ('nuovo') o in mano ('mano')
  function sposta(ctx, dove) {
    const ui = ctx.ui, b = bozza(ctx), p = ctx.partita;
    const inTavola = new Set(p.tavolo.flat().map((c) => c.id));
    let sel = ui.mvSel.slice();
    if (dove === 'mano') sel = sel.filter((id) => !inTavola.has(id)); // le carte della tavola non tornano in mano
    if (!sel.length) { if (dove === 'mano' && ui.mvSel.length) ctx.avviso('Le carte della tavola non si riprendono in mano'); return; }
    const bersaglio = typeof dove === 'number' ? b.gruppi[dove] : null;
    b.gruppi = b.gruppi.map((g) => g.filter((id) => !sel.includes(id)));
    b.mano = b.mano.filter((id) => !sel.includes(id));
    if (dove === 'mano') b.mano.push(...sel);
    else if (dove === 'nuovo' || !bersaglio) b.gruppi.push(sel);
    else bersaglio.push(...sel);
    b.gruppi = b.gruppi.filter((g) => g.length);
    ui.mvSel = [];
    suono([[520, 0.03], [700, 0.04]], { volume: 0.03 });
    ctx.ridisegna();
  }

  const tavolo = {
    reset(ctx) { ctxMV = ctx; },
    panno(ctx) {
      const p = ctx.partita, ui = ctx.ui;
      const mio = p.turno === ctx.mio && !p.finita;
      const s = stato(ctx);
      const sel = new Set(ui.mvSel);
      const ultimeNuove = new Set(!mio && p.ultima && p.ultima.tipo === 'cala' ? p.ultima.nuove : (mio && !s.cambiato && p.ultima && p.ultima.tipo === 'cala' ? p.ultima.nuove : []));
      const gruppi = s.gruppi.map((g, i) => {
        const carte = g.carte.map((c) => {
          const cls = ['mini', sel.has(c.id) ? 'mv-scelta' : '', !s.inTavola.has(c.id) ? 'mv-mia' : '', ultimeNuove.has(c.id) ? 'mv-ultima' : ''].join(' ');
          return F(c, cls, mio ? `data-az="carta" draggable="true" role="button" tabindex="0" aria-pressed="${sel.has(c.id)}"` : '');
        }).join('');
        const meta = mio && ui.mvSel.length ? `data-az="gruppo" data-g="${i}" role="button" tabindex="0" aria-label="Metti qui le carte scelte"` : '';
        return `<div class="mv-gruppo ${g.valido ? '' : 'mv-errato'} ${meta ? 'mv-meta' : ''}" data-drop="${i}" ${meta}>${carte}${meta ? '<span class="mv-piu">+</span>' : ''}</div>`;
      }).join('');
      const nuovo = mio ? `<div class="mv-gruppo mv-nuovo ${ui.mvSel.length ? 'mv-meta' : ''}" data-drop="nuovo" ${ui.mvSel.length ? 'data-az="nuovo" role="button" tabindex="0"' : ''}>${ui.mvSel.length ? `＋ Nuova combinazione <small>(${ui.mvSel.length})</small>` : 'Scegli delle carte (o trascinale qui) per una nuova combinazione'}</div>` : '';
      const vuota = !s.gruppi.length && !mio ? '<p class="tavola-vuota">La tavola è vuota: la prima combinazione la cala…</p>' : '';
      // cosa è successo
      let info = '';
      const u = p.ultima;
      if (u && !p.finita) {
        const chi = u.posto === ctx.mio ? 'Hai' : `${esc(ctx.nome(u.posto))} ha`;
        info = u.tipo === 'pesca' ? `${chi} pescato una carta` : u.tipo === 'passa' ? `${chi} passato (mazzo finito)` : `${chi} calato ${u.nuove.length} ${u.nuove.length === 1 ? 'carta' : 'carte'}${u.rimescolato ? ' rimescolando la tavola' : ''}`;
      }
      const mazzo = `<div class="mv-mazzo" title="Carte nel mazzo">${Carte.retro()}<span>${p.mazzo}</span></div>`;
      const fine = p.finita && p.maniFine ? `<div class="mv-fine">${p.maniFine.map((m, i) => `<div><b>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))}</b> ${m.length ? `${m.map((c) => F(c, 'mini')).join('')} <small>${p.puntiFine[i]} punti</small>` : '— ha finito le carte!'}</div>`).join('')}</div>` : '';
      return `<div class="mv ${mio ? 'mv-attivo' : ''}">
        <div class="mv-testa">${mazzo}<p class="mv-info">${info}${p.passati && !p.mazzo ? ` · ${p.passati} ${p.passati === 1 ? 'passaggio' : 'passaggi'} di fila` : ''}</p></div>
        <div class="mv-tavola">${gruppi}${nuovo}${vuota}</div>${fine}</div>`;
    },
    mano(ctx) {
      const p = ctx.partita, ui = ctx.ui;
      const mio = p.turno === ctx.mio && !p.finita;
      const b = bozza(ctx), note = carteNote(p);
      const sel = new Set(ui.mvSel);
      const carte = ordinaMano(b.mano.map((id) => note.get(id)).filter(Boolean));
      const html = carte.map((c) => `<span class="mv-posto">${F(c, `${mio ? 'giocabile' : ''} ${sel.has(c.id) ? 'alzata' : ''}`, mio ? `data-az="carta" draggable="true" role="button" tabindex="0" aria-pressed="${sel.has(c.id)}" aria-label="${Carte.nome(c)}"` : '')}</span>`).join('');
      return `<div class="mv-mano" data-drop="mano">${html || '<span class="mv-vuota-mano">Hai calato tutto quello che avevi: conferma!</span>'}</div>`;
    },
    azioni(ctx) {
      const p = ctx.partita, ui = ctx.ui;
      const mio = p.turno === ctx.mio && !p.finita;
      const ordina = `<button class="bottone mini-bt" data-az="ordina" title="Ordine delle carte in mano">↕ per ${modoMano === 'seme' ? 'valore' : 'seme'}</button>`;
      if (!mio) return ordina;
      const s = stato(ctx);
      const b = [];
      const puo = s.tuttiValidi && s.calate.length > 0 && !ui.mvInviato;
      b.push(`<button class="bottone piccolo-bt primario-bt" data-az="conferma" ${puo ? '' : 'disabled'}>✓ Conferma${s.calate.length ? ` (${s.calate.length} ${s.calate.length === 1 ? 'carta' : 'carte'})` : ''}</button>`);
      if (ui.mvSel.length) {
        const daMano = ui.mvSel.filter((id) => !s.inTavola.has(id) && !bozza(ctx).mano.includes(id)).length;
        if (daMano) b.push('<button class="bottone piccolo-bt" data-az="inmano">↩ Rimetti in mano</button>');
        b.push('<button class="bottone piccolo-bt" data-az="desel">Deseleziona</button>');
      }
      if (s.cambiato) b.push('<button class="bottone piccolo-bt" data-az="ricomincia">⟲ Ricomincia</button>');
      else b.push(p.mazzo ? '<button class="bottone piccolo-bt" data-az="pesca">Pesca e passa</button>' : '<button class="bottone piccolo-bt" data-az="passa">Passa</button>');
      let aiuto;
      if (!s.tuttiValidi) aiuto = 'I gruppi col bordo rosso non sono ancora combinazioni valide';
      else if (!s.calate.length) aiuto = ui.mvSel.length ? 'Ora tocca una combinazione (o "Nuova combinazione")' : 'Scegli carte dalla mano o dalla tavola: almeno una tua va calata';
      else aiuto = 'Tutto valido: puoi confermare o continuare';
      b.push(`<span class="suggerimento">${aiuto}</span>`, ordina);
      return b.join('');
    },
    infoPosto(ctx, posto) { const n = ctx.partita.carteInMano[posto]; return `${n} ${n === 1 ? 'carta' : 'carte'}`; },
    punteggio(ctx) {
      const p = ctx.partita;
      return `${p.carteInMano.map((n, i) => `<span>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${n}</b></span>`).join('')}<span class="obiettivo">carte in mano · mazzo ${p.mazzo}</span>`;
    },
    stato(ctx) {
      const p = ctx.partita;
      if (p.turno === ctx.mio && !p.finita) return 'Tocca a te: cala o pesca';
      return null;
    },
    dopo(ctx) {
      const p = ctx.partita;
      if (p.ultima && primaVolta(ctx.ui, `mv-s-${p.ultima.n}`) && p.ultima.posto !== ctx.mio) {
        if (p.ultima.tipo === 'cala') suono([[392, 0.05], [523, 0.07]], { volume: 0.04 });
      }
    },
    clic(ctx, el) {
      const ui = ctx.ui, az = el.dataset.az, p = ctx.partita;
      if (az === 'ordina') { modoMano = modoMano === 'seme' ? 'valore' : 'seme'; try { localStorage.setItem('mv-ordine', modoMano); } catch { /* niente */ } return ctx.ridisegna(); }
      if (p.turno !== ctx.mio || p.finita) return undefined;
      if (az === 'carta') {
        const id = el.dataset.id;
        ui.mvSel = ui.mvSel.includes(id) ? ui.mvSel.filter((x) => x !== id) : [...ui.mvSel, id];
        return ctx.ridisegna();
      }
      if (az === 'gruppo') return sposta(ctx, Number(el.dataset.g));
      if (az === 'nuovo') return sposta(ctx, 'nuovo');
      if (az === 'inmano') return sposta(ctx, 'mano');
      if (az === 'desel') { ui.mvSel = []; return ctx.ridisegna(); }
      if (az === 'ricomincia') { ui.mvChiave = null; return ctx.ridisegna(); }
      if (az === 'pesca') return ctx.invia({ tipo: 'pesca' });
      if (az === 'passa') return ctx.invia({ tipo: 'passa' });
      if (az === 'conferma') {
        const s = stato(ctx);
        if (!s.tuttiValidi || !s.calate.length) return undefined;
        ui.mvInviato = true;
        ctx.invia({ tipo: 'gioca', tavolo: s.gruppi.map((g) => g.carte.map((c) => c.id)) });
        return ctx.ridisegna();
      }
      return undefined;
    },
  };

  // ---- trascinamento con il mouse: si trascina una carta (e con lei quelle già scelte) su un gruppo, sulla
  // "nuova combinazione" o sulla mano ----
  const attivo = () => ctxMV && ctxMV.stato && ctxMV.partita && ctxMV.partita.gioco === 'machiavelli' && ctxMV.partita.turno === ctxMV.mio && !ctxMV.partita.finita;
  document.addEventListener('dragstart', (e) => {
    const c = e.target.closest && e.target.closest('.carta[data-az="carta"]');
    if (!c || !attivo() || !c.closest('.mv, .mv-mano')) return;
    const ui = ctxMV.ui;
    if (!ui.mvSel.includes(c.dataset.id)) ui.mvSel = [...ui.mvSel, c.dataset.id];
    e.dataTransfer.setData('text/plain', 'mv');
    e.dataTransfer.effectAllowed = 'move';
  });
  document.addEventListener('dragover', (e) => {
    const z = e.target.closest && e.target.closest('[data-drop]');
    if (!z || !attivo() || !z.closest('.mv, .mv-mano')) return;
    e.preventDefault();
    for (const x of document.querySelectorAll('.mv-sopra')) if (x !== z) x.classList.remove('mv-sopra');
    z.classList.add('mv-sopra');
  });
  document.addEventListener('dragleave', (e) => { const z = e.target.closest && e.target.closest('[data-drop]'); if (z && !z.contains(e.relatedTarget)) z.classList.remove('mv-sopra'); });
  document.addEventListener('drop', (e) => {
    const z = e.target.closest && e.target.closest('[data-drop]');
    if (!z || !attivo() || !z.closest('.mv, .mv-mano')) return;
    e.preventDefault();
    const d = z.dataset.drop;
    sposta(ctxMV, d === 'nuovo' || d === 'mano' ? d : Number(d));
  });
  document.addEventListener('dragend', () => { for (const x of document.querySelectorAll('.mv-sopra')) x.classList.remove('mv-sopra'); if (attivo()) ctxMV.ridisegna(); });

  Object.assign(window.Tavoli, { machiavelli: tavolo });
})();
