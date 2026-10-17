// UOMO NERO: in alto gli avversari (dorsi a ventaglio, chi è salvo, quante volte ha preso l'uomo nero), al centro
// la mano da cui si pesca (dorsi grandi, nell'ordine di chi le tiene) e le ultime coppie scartate, in basso le tue
// carte: toccane una e poi un'altra per scambiarle di posto, oppure 🔀 per mescolarle.
(() => {
  const { esc, primaVolta, suono, ritardo } = window.Nuovi;
  const UOMO = '11p';
  const F = (c, cls = '', attr = '') => Carte.fronte(c, `${cls} ${c.id === UOMO ? 'un-uomo' : ''}`, attr);
  const nomeCarta = (id) => Carte.nome({ id, rango: Number(id.slice(0, -1)), seme: id.slice(-1) });
  const ordinale = (k) => `${k + 1}°`;

  const tavolo = {
    libero: true,
    senzaFila: true,
    panno(ctx) {
      const p = ctx.partita, ui = ctx.ui, io = ctx.mio;
      const mioTurno = p.turno === io && !p.inAttesa && !p.finita;
      const nome = (i) => (i === io ? 'Tu' : esc(ctx.nome(i)));
      // ---- avversari in fila, nell'ordine del giro a partire da chi sta alla mia sinistra ----
      const altri = Array.from({ length: p.n - 1 }, (_, k) => (io + 1 + k) % p.n);
      const fila = altri.map((i) => {
        const n = p.carteInMano[i];
        const salvo = p.uscita.indexOf(i);
        const stato = salvo >= 0 ? `<span class="un-salvo">salvo ${ordinale(salvo)}</span>` : p.turno === i ? '<span class="un-pesca">pesca…</span>' : p.daChi === i ? '<span class="un-bersaglio">gli pescano</span>' : '';
        const dorsi = n ? `<div class="un-ventaglio" style="--k:${Math.min(n, 12)}">${Carte.retro().repeat(Math.min(n, 12))}</div>` : '<div class="un-vuota">—</div>';
        return `<div class="un-avv ${p.turno === i ? 'di-turno' : ''} ${salvo >= 0 ? 'fuori' : ''}">
          <div class="un-nome">${nome(i)}${p.perse[i] ? ` <span class="un-segni" title="Volte con l'uomo nero">${'🕴️'.repeat(Math.min(p.perse[i], 5))}</span>` : ''}</div>
          ${dorsi}<div class="un-sotto">${n} ${n === 1 ? 'carta' : 'carte'} ${stato}</div><div class="bolla-posto" data-bolla="${i}"></div></div>`;
      }).join('');

      // ---- centro: la mano da cui si pesca ----
      let centro;
      const u = p.ultima;
      if (p.fase === 'riepilogo' && p.riepilogo) {
        const r = p.riepilogo;
        centro = `<div class="un-esito"><div class="un-grande">🕴️</div><p><b>${r.perdente === io ? 'Sei rimasto tu con l\'uomo nero!' : `${esc(ctx.nome(r.perdente))} resta con l'uomo nero`}</b></p>
          <p class="un-piccolo">Mano ${r.mano} di ${p.nMani} · si riparte tra poco</p></div>`;
      } else if (p.daChi != null && p.turno != null) {
        const n = p.carteInMano[p.daChi];
        const appena = u && u.da === p.daChi && u.nPesca === ui.unVista;
        const dorsi = Array.from({ length: n }, (_, k) => (mioTurno
          ? `<button type="button" class="un-dorso" data-az="pesca" data-i="${k}" aria-label="Pesca la carta ${k + 1} di ${n}" style="--i:${k}">${Carte.retro()}</button>`
          : `<span class="un-dorso fermo ${appena && k === u.indice ? 'un-tolta' : ''}" style="--i:${k}">${Carte.retro()}</span>`)).join('');
        const titolo = mioTurno ? `Pesca una carta da <b>${esc(ctx.nome(p.daChi))}</b>` : `${nome(p.turno)} pesca da ${p.daChi === io ? '<b>te</b>' : esc(ctx.nome(p.daChi))}`;
        centro = `<p class="un-titolo">${titolo}</p><div class="un-bersaglio-mano ${mioTurno ? 'mia' : ''}" style="--n:${n}">${dorsi}</div>`;
      } else centro = '';

      // ---- ultima pescata e scarti ----
      let notizia = '';
      if (u && p.fase === 'gioco') {
        const cosa = u.carta ? nomeCarta(u.carta) : 'una carta';
        if (u.chi === io) notizia = u.coppia ? `Hai pescato ${cosa}: <b>coppia!</b> scartata` : u.carta === UOMO ? `Hai pescato <b class="un-rosso">l'uomo nero</b>! Nascondilo bene…` : `Hai pescato ${cosa}`;
        else if (u.da === io) notizia = `${esc(ctx.nome(u.chi))} ti ha preso ${u.carta === UOMO ? '<b class="un-verde">l\'uomo nero</b>! 😮‍💨' : cosa}${u.coppia ? ' e ha fatto coppia' : ''}`;
        else notizia = `${esc(ctx.nome(u.chi))} ha pescato da ${esc(ctx.nome(u.da))}${u.coppia ? ` e ha scartato una coppia (${cosa})` : ''}`;
      }
      const scarti = p.scarti.length ? `<div class="un-scarti" title="Ultime coppie scartate (${p.nScarti} in tutto)">${p.scarti.slice(-4).map((s) => `<span class="un-coppia">${s.carte.map((c) => F(c, 'mini')).join('')}</span>`).join('')}</div>` : '';

      // ---- la mia mano ----
      const mia = p.mia.map((c, k) => {
        const nuova = u && u.chi === io && !u.coppia && c.id === u.carta && k === p.mia.length - 1 && p.fase === 'gioco';
        const cls = [ui.unSel === k ? 'un-sel' : '', nuova ? 'un-nuova' : ''].join(' ');
        return `<div class="un-mia" data-az="mia" data-k="${k}" role="button" tabindex="0" aria-label="${Carte.nome(c)}: tocca per spostarla" style="${nuova ? ritardo(ui, `un-n-${u.nPesca}`) : ''}">${F(c, cls)}${c.id === UOMO ? '<span class="un-etichetta">uomo nero</span>' : ''}</div>`;
      }).join('');
      const salvoIo = p.uscita.indexOf(io);
      const giu = p.mia.length
        ? `<div class="un-io"><div class="un-mia-mano" style="--n:${p.mia.length}">${mia}</div>
            <div class="un-comandi">${p.mia.length > 1 ? '<button type="button" class="bottone piccolo-bt" data-az="mescola">🔀 Mescola le mie carte</button>' : ''}
            <span class="un-aiuto">${ui.unSel != null ? 'Ora tocca il posto dove metterla' : p.ioHoUomo ? 'Chi pesca da te vede solo i dorsi: mettilo dove pensi che non lo prenda' : 'Tocca due carte per scambiarle di posto'}</span></div></div>`
        : `<p class="un-salvo-io">${salvoIo >= 0 ? `🎉 Sei salvo (${ordinale(salvoIo)})!` : ''} Guarda come finisce…</p>`;

      const giro = `<p class="un-giro">Mano ${p.mano} di ${p.nMani} · ${p.perse.map((x, i) => `${nome(i)} ${x ? '🕴️'.repeat(Math.min(x, 5)) : '0'}`).join(' · ')}</p>`;
      return `<div class="un">${giro}<div class="un-fila">${fila}</div>
        <div class="un-centro">${centro}${notizia ? `<p class="un-notizia" aria-live="polite">${notizia}</p>` : ''}${scarti}</div>${giu}</div>`;
    },
    dopo(ctx) {
      const p = ctx.partita, u = p.ultima;
      if (u && primaVolta(ctx.ui, `un-s-${p.mano}-${u.nPesca}`)) {
        ctx.ui.unVista = u.nPesca;
        if (u.chi === ctx.mio && u.carta === UOMO) suono([[220, 0.12], [185, 0.2]], { tipo: 'sawtooth', volume: 0.04 });
        else if (u.coppia) suono([[660, 0.05], [880, 0.08]], { volume: 0.04 });
        else suono([[440, 0.04]], { volume: 0.03 });
      }
    },
    stato(ctx) {
      const p = ctx.partita;
      if (p.fase === 'riepilogo') return 'Fine mano';
      if (p.turno === ctx.mio) return `Tocca a te: pesca da ${ctx.nome(p.daChi)}`;
      return null;
    },
    punteggio() { return ''; },
    infoPosto(ctx, posto) { const p = ctx.partita; return `${p.carteInMano[posto]} carte`; },
    clic(ctx, el) {
      const p = ctx.partita, ui = ctx.ui, az = el.dataset.az;
      if (az === 'pesca') { el.disabled = true; ui.unSel = null; return ctx.invia({ tipo: 'pesca', indice: Number(el.dataset.i) }); }
      if (az === 'mescola') { ui.unSel = null; suono([[300, 0.03], [360, 0.03], [320, 0.03]], { volume: 0.03 }); return ctx.invia({ tipo: 'mescola' }); }
      if (az === 'mia') {
        const k = Number(el.dataset.k);
        if (ui.unSel == null) { ui.unSel = k; return ctx.ridisegna(); }
        const da = ui.unSel; ui.unSel = null;
        if (da !== k && da < p.mia.length) return ctx.invia({ tipo: 'scambia', da, a: k });
        return ctx.ridisegna();
      }
      return undefined;
    },
    reset(ctx) { const p = ctx.partita; if (ctx.ui.unSel != null && ctx.ui.unSel >= p.mia.length) ctx.ui.unSel = null; },
  };
  Object.assign(window.Tavoli, { uomonero: tavolo });
})();
