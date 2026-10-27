// CHI È L'IMPOSTORE: il tavolo nel browser
(() => {
  const { esc, ritardo } = window.Nuovi;
  const nomeCorto = (ctx, i) => (i === ctx.mio ? 'Tu' : ctx.nome(i));

  // la lente dell'impostore
  const LENTE = '<svg viewBox="0 0 64 64" class="ip-icona" aria-hidden="true"><circle cx="26" cy="26" r="16" fill="none" stroke="currentColor" stroke-width="6"/><path d="M38 38l16 16" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><path d="M18 22a9 9 0 0 1 9-7" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/></svg>';
  const BUSTA = '<svg viewBox="0 0 64 64" class="ip-icona" aria-hidden="true"><rect x="6" y="14" width="52" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="4"/><path d="M8 17l24 19 24-19" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/></svg>';

  function cartaRuolo(ctx) {
    const p = ctx.partita, ui = ctx.ui;
    if (p.sonoImpostore) {
      return `<section class="ip-ruolo impostore" aria-label="Il tuo ruolo">${LENTE}
        <div><h3>Sei l'impostore${p.categoria ? ` <small>${esc(p.categoria)}</small>` : ''}</h3><p>Non conosci la parola${p.categoria ? ', ma sai la categoria' : ''}. Ascolta gli indizi degli altri e inventane uno credibile.</p></div></section>`;
    }
    const vedi = !!ui.vediParola;
    return `<section class="ip-ruolo" aria-label="La tua parola">${BUSTA}
      <div><h3>La parola segreta${p.categoria ? ` <small>${esc(p.categoria)}</small>` : ''}</h3>
      <button type="button" class="ip-parola ${vedi ? 'vista' : ''}" data-az="vedi" aria-pressed="${vedi}" title="${vedi ? 'Nascondi' : 'Mostra'} la parola">
        <span>${vedi ? esc(p.parola) : '••••••'}</span><small>${vedi ? 'tocca per nasconderla' : 'tocca per vederla'}</small></button></div></section>`;
  }

  function tabellaIndizi(ctx) {
    const p = ctx.partita;
    const giri = Array.from({ length: p.giriTotali }, (_, k) => k + 1);
    const righe = Array.from({ length: p.n }, (_, i) => i).map((i) => {
      const celle = giri.map((g) => {
        const x = p.indizi.find((d) => d.posto === i && d.giro === g);
        const adesso = p.fase === 'indizi' && p.turno === i && p.giro === g;
        return `<td class="${adesso ? 'adesso' : ''} ${g > p.giriBase ? 'extra' : ''}">${x ? `«${esc(x.testo)}»` : adesso ? '<span class="ip-scrive">sta scrivendo<i>.</i><i>.</i><i>.</i></span>' : ''}</td>`;
      }).join('');
      return `<tr class="${i === ctx.mio ? 'riga-mia' : ''} ${p.fuori[i] ? 'fuori' : ''}"><th scope="row">${esc(nomeCorto(ctx, i))}</th>${celle}</tr>`;
    }).join('');
    return `<div class="ip-scorri"><table class="ip-indizi"><thead><tr><th></th>${giri.map((g) => `<th scope="col">${g > p.giriBase ? `Spareggio ${g - p.giriBase}` : `Giro ${g}`}</th>`).join('')}</tr></thead><tbody>${righe}</tbody></table></div>`;
  }

  function pannelloIndizio(ctx) {
    const p = ctx.partita;
    if (p.turno !== ctx.mio) return `<p class="ip-attesa">Tocca a <b>${esc(ctx.nome(p.turno))}</b> dare l'indizio. Intanto potete parlarne in chat.</p>`;
    return `<div class="ip-mio-turno">
      <label for="ip-indizio">${p.sonoImpostore ? 'Il tuo indizio (bluffa!)' : 'Il tuo indizio: fai capire che conosci la parola, senza svelarla'}</label>
      <div class="riga"><input id="ip-indizio" maxlength="40" autocomplete="off" spellcheck="false" placeholder="Una parola o una frase breve" data-tieni="indizio" data-invio="indizio" value="${esc(ctx.ui.t_indizio || '')}">
      <button type="button" class="bottone primario-bt" data-az="indizio">Dai l'indizio</button></div></div>`;
  }

  function pannelloVoto(ctx) {
    const p = ctx.partita;
    const bottoni = Array.from({ length: p.n }, (_, i) => i).filter((i) => !p.fuori[i]).map((i) => {
      const io = i === ctx.mio;
      const scelto = p.mioVoto === i;
      return `<button type="button" class="ip-sospetto ${scelto ? 'scelto' : ''}" data-az="vota" data-posto="${i}" ${io ? 'disabled' : ''} aria-pressed="${scelto}">
        <span class="ip-faccia">${esc(ctx.nome(i).slice(0, 1).toUpperCase())}</span><b>${esc(nomeCorto(ctx, i))}</b>
        <small>${p.haVotato[i] ? '🗳️ ha votato' : 'sta decidendo…'}</small>${scelto ? '<em>il tuo voto</em>' : ''}</button>`;
    }).join('');
    const quanti = p.haVotato.filter((x, i) => x && !p.fuori[i]).length;
    return `<div class="ip-voto"><h3>Chi è l'impostore?</h3>
      <p class="piccolo">Il voto è segreto e puoi cambiarlo finché non hanno votato tutti (${quanti} su ${p.fuori.filter((f) => !f).length}).</p>
      <div class="ip-sospetti">${bottoni}</div></div>`;
  }

  function contaVoti(ctx, v) {
    const p = ctx.partita;
    const max = Math.max(1, ...v.conteggio);
    return `<ul class="ip-conteggio">${v.conteggio.map((c, i) => ({ c, i })).filter((x) => !p.fuori[x.i]).sort((a, b) => b.c - a.c).map(({ c, i }) => {
      const chi = v.voti.map((x, k) => (x === i ? k : -1)).filter((k) => k >= 0).map((k) => nomeCorto(ctx, k));
      return `<li><span>${esc(nomeCorto(ctx, i))}</span><i style="--w:${(c / max) * 100}%"></i><b>${c}</b><small>${chi.length ? esc(chi.join(', ')) : ''}</small></li>`;
    }).join('')}</ul>`;
  }

  // la rivelazione dell'accusato: rullo di tamburi, poi il timbro
  function verdetto(ctx) {
    const p = ctx.partita;
    const chi = nomeCorto(ctx, p.accusato);
    const eraLui = p.accusatoImpostore;
    return `<div class="ip-verdetto" style="${ritardo(ctx.ui, `verdetto-${p.storicoVoti.length}`)}">
      <div class="ip-riflettore"></div>
      ${contaVoti(ctx, p.ultimoVoto)}
      <p class="ip-accusa">${p.accusato === ctx.mio ? 'Sei stato accusato tu…' : `Il più votato è <b>${esc(chi)}</b>…`}</p>
      <p class="ip-suspense"><span>Era</span> <span>davvero</span> <span>l'impostore?</span></p>
      <div class="ip-timbro ${eraLui ? 'si' : 'no'}">${eraLui ? 'Impostore!' : 'Innocente'}</div>
      <p class="ip-dopo">${eraLui ? 'Ma non è finita: l\'impostore può ancora indovinare la parola.' : 'Avete accusato la persona sbagliata.'}</p></div>`;
  }

  function ultima(ctx) {
    const p = ctx.partita;
    if (p.sonoImpostore) {
      return `<div class="ip-ultima"><h3>Ti hanno scoperto!</h3><p>Ultima possibilità: scrivi la parola segreta. Se la indovini, vinci tu.</p>
        <div class="riga"><input maxlength="40" autocomplete="off" spellcheck="false" placeholder="La parola segreta è…" data-tieni="tentativo" data-invio="indovina" value="${esc(ctx.ui.t_tentativo || '')}">
        <button type="button" class="bottone primario-bt" data-az="indovina">Tenta</button></div></div>`;
    }
    return `<div class="ip-ultima"><h3>${esc(ctx.nome(p.impostore))} era l'impostore!</h3>
      <p>Adesso prova a indovinare la parola. Se ci riesce vince lo stesso…</p><p class="ip-scrive grande">sta pensando<i>.</i><i>.</i><i>.</i></p></div>`;
  }

  // la grande rivelazione finale
  function finale(ctx) {
    const p = ctx.partita;
    const imp = p.impostore;
    const sonoIo = imp === ctx.mio;
    const titolo = p.esito === 'fuga' ? 'L\'impostore è scappato!' : p.vinceImpostore ? (sonoIo ? 'Hai vinto tu!' : 'Vince l\'impostore!') : (sonoIo ? 'Hai perso…' : 'Vincono i giocatori!');
    const motivo = {
      innocente: 'Avete accusato un innocente.',
      'scoperto-indovina': `Scoperto, ma ha indovinato la parola${p.tentativo ? ` («${esc(p.tentativo)}»)` : ''}.`,
      scoperto: p.tentativo ? `Ha provato con «${esc(p.tentativo)}»: sbagliato!` : 'Non ha provato a indovinare.',
      fuga: 'Ha lasciato la partita.',
      resta: 'Siete rimasti in pochi: l\'impostore non si può più trovare.',
      pareggio: 'Troppi pareggi: l\'impostore è rimasto nascosto.',
    }[p.esito] || '';
    return `<div class="ip-finale ${p.vinceImpostore === sonoIo ? 'verde' : 'rosso'}" style="${ritardo(ctx.ui, 'finale')}">
      <p class="ip-f1">L'impostore era…</p>
      <div class="ip-carta-rivela"><div class="ip-fronte">?</div><div class="ip-retro">${LENTE}<b>${esc(sonoIo ? 'Tu' : ctx.nome(imp))}</b></div></div>
      <p class="ip-f2">e la parola era</p>
      <p class="ip-f3">${esc(p.parola)}</p>
      <h2 class="ip-f4">${esc(titolo)}</h2>
      <p class="ip-f5">${motivo}</p></div>`;
  }

  const impostore = {
    libero: true,
    panno(ctx) {
      const p = ctx.partita;
      let centro;
      if (p.fase === 'indizi') centro = `${tabellaIndizi(ctx)}${pannelloIndizio(ctx)}`;
      else if (p.fase === 'voto') centro = `${pannelloVoto(ctx)}${tabellaIndizi(ctx)}`;
      else if (p.fase === 'verdetto') centro = verdetto(ctx);
      else if (p.fase === 'ultima') centro = `${ultima(ctx)}${tabellaIndizi(ctx)}`;
      else centro = `${finale(ctx)}${p.storicoVoti.length ? contaVoti(ctx, p.storicoVoti[p.storicoVoti.length - 1]) : ''}${tabellaIndizi(ctx)}`;
      const testa = p.fase === 'finale' || p.fase === 'fine' ? '' : cartaRuolo(ctx);
      const giro = p.fase === 'indizi' ? `<p class="ip-giro">${p.giro > p.giriBase ? `Spareggio: giro in più ${p.giro - p.giriBase}` : `Giro ${p.giro} di ${p.giriBase}`} · poi si vota</p>` : '';
      return `<div class="ip ip-fase-${p.fase}">${testa}${giro}${centro}</div>`;
    },
    reset(ctx) {
      window.NuoviTesto && window.NuoviTesto(ctx);
      // l'indizio scritto resta finché il server non lo accetta (se viene rifiutato non si riscrive da capo)
      const p = ctx.partita, ui = ctx.ui, miei = p.indizi.filter((d) => d.posto === ctx.mio).length;
      if (ui._mieiIndizi !== undefined && miei > ui._mieiIndizi) ui.t_indizio = '';
      ui._mieiIndizi = miei;
    },
    dopo(ctx) {
      // rimette il cursore nella casella se si stava scrivendo
      const k = ctx.ui.fuoco;
      if (!k || (window.Boss && Boss.attivo)) return;
      const el = document.querySelector(`[data-tieni="${k}"]`);
      if (el && !el.disabled) { el.focus({ preventScroll: true }); try { el.setSelectionRange(el.value.length, el.value.length); } catch {} }
    },
    statoAttesa(ctx) { return ctx.partita.fase === 'verdetto' ? 'Il verdetto…' : 'La grande rivelazione'; },
    stato(ctx) {
      const p = ctx.partita;
      if (p.finita) return null;
      if (p.fase === 'indizi') return p.turno === ctx.mio ? 'Tocca a te: dai l\'indizio' : `Indizio di ${ctx.nome(p.turno)}`;
      if (p.fase === 'voto') return p.mioVoto == null ? 'Vota l\'impostore' : 'Aspetta gli altri voti';
      if (p.fase === 'ultima') return p.sonoImpostore ? 'Indovina la parola!' : 'L\'impostore tenta la parola';
      return null;
    },
    punteggio(ctx) {
      const p = ctx.partita;
      return `<span>Giocatori <b>${p.fuori.filter((f) => !f).length}</b></span><span>Impostori <b>1</b></span>${p.spareggi ? `<span>Spareggi <b>${p.spareggi}</b></span>` : ''}`;
    },
    infoPosto(ctx, posto) {
      const p = ctx.partita;
      if (p.fuori[posto]) return '<span class="eliminato">uscito</span>';
      if (p.fase === 'voto') return p.haVotato[posto] ? '🗳️ ha votato' : 'sta votando…';
      if (p.fase === 'indizi') return p.turno === posto ? '✍️ sta scrivendo' : `${p.indizi.filter((d) => d.posto === posto).length} indizi`;
      if ((p.fase === 'finale' || p.fase === 'fine') && p.impostore === posto) return '<span class="eliminato">🕵️ impostore</span>';
      return '';
    },
    clic(ctx, el) {
      const ui = ctx.ui, az = el.dataset.az;
      if (az === 'vedi') { ui.vediParola = !ui.vediParola; return ctx.ridisegna(); }
      if (az === 'indizio') {
        const t = (ui.t_indizio || '').trim();
        if (!t) return ctx.avviso('Scrivi prima l\'indizio');
        ui.fuoco = null;
        return ctx.invia({ tipo: 'indizio', testo: t });
      }
      if (az === 'vota') return ctx.invia({ tipo: 'vota', posto: Number(el.dataset.posto) });
      if (az === 'indovina') {
        const t = (ui.t_tentativo || '').trim();
        if (!t) return ctx.avviso('Scrivi la parola');
        ui.fuoco = null;
        return ctx.invia({ tipo: 'indovina', parola: t });
      }
    },
  };
  Object.assign(window.Tavoli, { impostore });
})();
