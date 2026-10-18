// BRISCOLA CHIAMATA: in cinque il tavolo è "libero" (gli avversari in fila in alto) con il panno disegnato qui: le
// carte giocate a cerchio con il nome di chi le ha messe, il cartellino della chiamata (carta, briscola, punti, socio),
// l'asta con le chiamate fatte e i pulsanti per chiamare o passare, la scelta del seme per chi ha vinto l'asta.
(() => {
  const { esc, primaVolta, suono } = window.Nuovi;
  const ORDINE = [1, 3, 13, 12, 11, 7, 6, 5, 4, 2];
  const NOMI = { 1: 'Asso', 3: 'Tre', 13: 'Re', 12: 'Donna', 11: 'Fante', 7: 'Sette', 6: 'Sei', 5: 'Cinque', 4: 'Quattro', 2: 'Due' };
  const SIGLA = { 1: 'A', 3: '3', 13: 'K', 12: 'Q', 11: 'J', 7: '7', 6: '6', 5: '5', 4: '4', 2: '2' };
  const SEMI = ['c', 'q', 'f', 'p'];
  const NOMI_SEMI = { c: 'cuori', q: 'quadri', f: 'fiori', p: 'picche' };
  const PUNTI = { 1: 11, 3: 10, 13: 4, 12: 3, 11: 2 };
  const F = (c, cls = '', attr = '') => Carte.fronte(c, cls, attr, PUNTI[c.rango] ? { valore: String(PUNTI[c.rango]) } : {});
  const livello = (L) => (L < 10 ? { rango: ORDINE[L], soglia: 61 } : { rango: 2, soglia: 61 + (L - 9) });
  const testoLivello = (L) => { const x = livello(L); return x.soglia > 61 ? `2 a ${x.soglia}` : NOMI[x.rango]; };
  const chi = (ctx, i) => (i === ctx.mio ? 'Tu' : ctx.nome(i));
  // la mano: per seme (la briscola in fondo), dalla più debole alla più forte
  const ordina = (p) => [...p.mano].sort((a, b) => {
    const B = p.chiamata && p.chiamata.seme, sa = a.seme === B ? 9 : SEMI.indexOf(a.seme), sb = b.seme === B ? 9 : SEMI.indexOf(b.seme);
    return sa - sb || ORDINE.indexOf(b.rango) - ORDINE.indexOf(a.rango);
  });

  function cartellino(ctx) {
    const p = ctx.partita, c = p.chiamata;
    if (!c) return '';
    const carta = F({ id: c.carta, rango: c.rango, seme: c.seme }, 'mini');
    const socio = p.socio != null ? (p.solo ? '<b>nessuno: gioca da solo!</b>' : `<b>${esc(chi(ctx, p.socio))}</b>${p.socio === ctx.mio && !p.rivelato ? ' <small>(lo sai solo tu)</small>' : ''}`) : '<b>?</b> <small>(si scopre quando gioca la carta)</small>';
    return `<div class="bch-cartellino">${carta}<div><p><b>${esc(chi(ctx, c.chiamante))}</b> ${c.chiamante === ctx.mio ? 'chiami' : 'chiama'} il <b>${NOMI[c.rango]} di ${NOMI_SEMI[c.seme]}</b></p>
      <p>Briscola ${Carte.seme(c.seme, 'bch-seme')} ${NOMI_SEMI[c.seme]} · servono <b>${c.soglia}</b> punti</p><p>Socio: ${socio}</p></div></div>`;
  }

  function asta(ctx) {
    const p = ctx.partita, A = p.asta, mio = p.turno === ctx.mio && !p.inAttesa && !ctx.stato.spettatore;
    const storia = A.storia.map((x) => `<span class="${x.passo ? 'passo' : ''}"><b>${esc(chi(ctx, x.posto))}</b> ${x.passo ? 'passa' : testoLivello(x.livello)}</span>`).join('');
    const offerta = A.livello >= 0 ? `Chiamata più bassa: <b>${testoLivello(A.livello)}</b> di ${esc(chi(ctx, A.chi))}` : 'Nessuno ha ancora chiamato';
    let bottoni = '';
    if (mio) {
      const carte = ORDINE.map((r, L) => (L > A.livello ? `<button type="button" class="bch-ch" data-az="chiama" data-l="${L}">${SIGLA[r]}<small>${NOMI[r]}</small></button>` : '')).join('');
      const minP = Math.max(62, A.livello >= 10 ? livello(A.livello).soglia + 1 : 62);
      const ui = ctx.ui; if (!ui.puntiAsta || ui.puntiAsta < minP) ui.puntiAsta = minP;
      const punti = minP <= 120 ? `<div class="bch-punti"><button type="button" class="bottone piccolo-bt" data-az="meno">−</button><b>2 a ${ui.puntiAsta}</b><button type="button" class="bottone piccolo-bt" data-az="piu">+</button>
        <button type="button" class="bottone" data-az="chiama" data-l="${ui.puntiAsta - 61 + 9}">Chiama</button></div>` : '';
      bottoni = `<p class="bch-tocca">Tocca a te: chiama una carta più bassa (o più punti col 2) oppure passa</p>
        <div class="bch-carte-asta">${carte}</div>${punti}<button type="button" class="bottone leggero" data-az="passo">✋ Passo</button>`;
    }
    return `<div class="bch-asta"><h3>Asta · mano ${p.nSmazzata + 1} di ${p.nMani}</h3><p>${offerta}</p><div class="bch-storia">${storia || '<i>…</i>'}</div>${bottoni}</div>`;
  }

  function sceltaSeme(ctx) {
    const p = ctx.partita, x = livello(p.asta.livello);
    if (p.turno !== ctx.mio || ctx.stato.spettatore) return `<div class="bch-asta"><h3>${esc(ctx.nome(p.turno))} ha vinto l'asta</h3><p>Sta scegliendo il seme di briscola…</p></div>`;
    const bott = SEMI.map((s) => {
      const ho = p.mano.some((c) => c.rango === x.rango && c.seme === s);
      const quante = p.mano.filter((c) => c.seme === s).length;
      return `<button type="button" class="bch-seme-bt" data-az="seme" data-s="${s}">${Carte.seme(s, 'bch-seme grande')}<span>${NOMI_SEMI[s]}</span><small>${quante} in mano${ho ? ' · il ' + NOMI[x.rango].toLowerCase() + ' ce l\'hai tu: giocheresti da solo' : ''}</small></button>`;
    }).join('');
    return `<div class="bch-asta"><h3>Hai vinto l'asta: ${testoLivello(p.asta.livello)}</h3><p>Scegli la briscola: il socio sarà chi ha il <b>${NOMI[x.rango]}</b> di quel seme${x.soglia > 61 ? `, e dovrete fare ${x.soglia} punti` : ''}.</p><div class="bch-semi">${bott}</div></div>`;
  }

  const tavolo = {
    libero: true,
    panno(ctx) {
      const p = ctx.partita;
      if (p.fase === 'asta' || p.fase === 'rimescola') return `<div class="bch">${asta(ctx)}</div>`;
      if (p.fase === 'seme') return `<div class="bch">${sceltaSeme(ctx)}</div>`;
      // il cerchio delle carte giocate: io in basso, gli altri in senso orario
      const raccolta = p.inAttesa && p.tavolo.length === p.n;
      const giocate = p.tavolo.map((g) => {
        const rel = (g.posto - ctx.mio + p.n) % p.n, a = Math.PI / 2 + (rel * 2 * Math.PI) / p.n;
        const x = 50 + Math.cos(a) * 30, y = 50 + Math.sin(a) * 30;
        const sq = p.socio != null ? (g.posto === p.chiamata.chiamante || g.posto === p.socio) : g.posto === p.chiamata.chiamante;
        return `<div class="bch-giocata ${g.posto === p.vince ? (raccolta ? 'prende' : 'sta') : ''}" style="left:${x}%;top:${y}%">${F(g.carta)}<span class="${sq ? 'ch' : ''}">${esc(chi(ctx, g.posto))}</span></div>`;
      }).join('');
      const vuoto = !p.tavolo.length && p.turno != null && !p.finita ? `<p class="bch-apre">${p.turno === ctx.mio ? 'Apri tu: gioca una carta' : `Apre ${esc(ctx.nome(p.turno))}`}</p>` : '';
      const u = p.ultimaMano;
      const ultima = ctx.ui.vediUltima && u ? `<div class="bch-ultima" data-az="ultima"><p>Ultima presa: <b>${esc(chi(ctx, u.vincitore))}</b> (${u.punti} punti)</p><div>${u.tavolo.map((g) => F(g.carta, 'mini')).join('')}</div></div>` : '';
      return `<div class="bch">${cartellino(ctx)}<div class="bch-cerchio">${giocate}${vuoto}</div>${ultima}</div>`;
    },
    mano(ctx) {
      const p = ctx.partita, puoi = p.fase === 'gioco' && p.mioTurno;
      return ordina(p).map((c) => F(c, `${puoi ? 'giocabile' : ''} ${p.chiamata && c.id === p.chiamata.carta ? 'bch-chiamata' : ''}`, puoi ? `data-az="gioca" role="button" tabindex="0" aria-label="Gioca ${Carte.nome(c)}"` : '')).join('');
    },
    azioni(ctx) { const p = ctx.partita; return p.ultimaMano && p.fase === 'gioco' ? `<button class="bottone piccolo-bt" data-az="ultima">${ctx.ui.vediUltima ? 'Chiudi' : '👁 Ultima presa'}</button>` : ''; },
    infoPosto(ctx, posto) {
      const p = ctx.partita;
      const ruolo = p.chiamata && posto === p.chiamata.chiamante ? ' · 📣 chiama' : p.socio === posto && p.chiamata && !p.solo ? ' · 🤝 socio' : '';
      const asta = p.fase === 'asta' && !p.asta.attivi[posto] ? ' · passa' : '';
      return `${p.totali[posto] > 0 ? '+' : ''}${p.totali[posto]}${ruolo}${asta}${p.mazziere === posto ? ' · mazziere' : ''}`;
    },
    punteggio(ctx) {
      const p = ctx.partita;
      return p.totali.map((t, i) => `<span>${esc(chi(ctx, i))} <b>${t > 0 ? '+' : ''}${t}</b></span>`).join('') + `<span class="obiettivo">mano ${Math.min(p.nSmazzata + 1, p.nMani)} di ${p.nMani}</span>`;
    },
    stato(ctx) {
      const p = ctx.partita;
      if (p.finita || p.inAttesa) return null;
      if (p.fase === 'asta') return p.turno === ctx.mio ? 'Asta: tocca a te' : `Asta: tocca a ${ctx.nome(p.turno)}`;
      if (p.fase === 'seme') return p.turno === ctx.mio ? 'Scegli la briscola' : `${ctx.nome(p.turno)} sceglie la briscola`;
      return null;
    },
    statoAttesa(ctx) { const p = ctx.partita; if (p.fase === 'rimescola') return 'Si rimescola…'; return p.vince == null ? null : p.vince === ctx.mio ? 'Prendi tu' : `Prende ${ctx.nome(p.vince)}`; },
    dopo(ctx) {
      const p = ctx.partita;
      if (p.giocate && primaVolta(ctx.ui, `bch-g-${p.giocate}`)) suono([[260 + (p.giocate % 5) * 20, 0.04]], { tipo: 'sine', volume: 0.04 });
    },
    riepilogo(ctx) {
      const r = ctx.partita.riepilogo;
      if (!r) return null;
      const righe = r.righe.map((x, i) => `<tr class="${x.squadra ? 'bch-sq' : ''}"><th>${esc(chi(ctx, i))}${i === r.chiamante ? ' 📣' : i === r.socio && !r.solo ? ' 🤝' : ''}</th><td>${x.prese}</td><td>${x.punti}</td><td class="${x.unita > 0 ? 'vinto' : ''}">${x.unita > 0 ? '+' : ''}${x.unita}</td><td>${x.totale > 0 ? '+' : ''}${x.totale}</td></tr>`).join('');
      return `<h2>Mano ${r.smazzata} di ${r.di}: ${r.vinto ? 'il chiamante ce la fa' : 'il chiamante non ce la fa'}</h2>
        <p>${esc(chi(ctx, r.chiamante))} ha chiamato il <b>${NOMI[r.rango]} di ${NOMI_SEMI[r.seme]}</b>${r.solo ? ' (ce l\'aveva: da solo contro tutti)' : `, socio <b>${esc(chi(ctx, r.socio))}</b>`}: ${r.fatti} punti su ${r.soglia} necessari.</p>
        <div class="tabella-scorre"><table class="conti"><thead><tr><th></th><th>Prese</th><th>Punti</th><th>Mano</th><th>Totale</th></tr></thead><tbody>${righe}</tbody></table></div>
        <p class="piccolo">Chiamante ±2, socio ±1, gli altri ∓1 (da solo: ±4 e ∓1 agli altri).</p>`;
    },
    clic(ctx, el) {
      const az = el.dataset.az, ui = ctx.ui;
      if (az === 'gioca') { el.classList.add('via'); ui.vediUltima = false; return ctx.invia({ tipo: 'gioca', carta: el.dataset.id }); }
      if (az === 'chiama') return ctx.invia({ tipo: 'chiama', livello: Number(el.dataset.l) });
      if (az === 'passo') return ctx.invia({ tipo: 'passo' });
      if (az === 'piu') { ui.puntiAsta = Math.min(120, ui.puntiAsta + 1); return ctx.ridisegna(); }
      if (az === 'meno') { ui.puntiAsta = Math.max(62, ui.puntiAsta - 1); return ctx.ridisegna(); }
      if (az === 'seme') return ctx.invia({ tipo: 'seme', seme: el.dataset.s });
      if (az === 'ultima') { ui.vediUltima = !ui.vediUltima; return ctx.ridisegna(); }
      return undefined;
    },
  };
  Object.assign(window.Tavoli, { chiamata: tavolo });
})();
