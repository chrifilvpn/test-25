// BACKGAMMON: tavola in SVG vista dalla propria parte (la tua casa in basso a destra, punte 1-6), barra al centro con
// il cubo, vassoio delle pedine uscite a destra. Clic su una pedina (o sulla barra) e poi sulla punta evidenziata;
// se la pedina ha una sola mossa possibile si muove subito. Tasti: spazio = tira / fine turno, Backspace = annulla.
(() => {
  const { esc, primaVolta, suono } = window.Nuovi;
  const W = 1000, H = 720, X0 = 24, BAR = 64, LP = (880 - BAR) / 12, YT = 24, YB = H - 24, HT = 280, R = 27;
  // coordinate della punta i (prospettiva di chi guarda): x del centro e se è in alto
  function punta(i) {
    if (i >= 1 && i <= 12) { // in basso, da destra (1) a sinistra (12)
      const col = 12 - i; // 0 = più a sinistra
      return { x: X0 + col * LP + (col >= 6 ? BAR : 0) + LP / 2, alto: false };
    }
    const col = i - 13; // in alto, da sinistra (13) a destra (24)
    return { x: X0 + col * LP + (col >= 6 ? BAR : 0) + LP / 2, alto: true };
  }
  const XBAR = X0 + 6 * LP + BAR / 2, XFUORI = 940;
  let ctxBG = null;

  // una pila di pedine: la prima con il centro in y0, le altre verso dir (+1 giù, -1 su); oltre 5 si scrive quante sono
  function pedine(x, y0, dir, n, cls, extra = '') {
    let s = '';
    const vis = Math.min(n, 5);
    for (let k = 0; k < vis; k++) {
      const y = y0 + dir * k * (2 * R - 2);
      s += `<circle class="bkg-ped ${cls}" cx="${x}" cy="${y}" r="${R - 1.5}"/><circle class="bkg-ped-in ${cls}" cx="${x}" cy="${y}" r="${R - 11}"/>`;
    }
    if (n > 5) s += `<text class="bkg-conta ${cls}" x="${x}" y="${y0 + dir * 4 * (2 * R - 2) + 8}">${n}</text>`;
    return `<g ${extra}>${s}</g>`;
  }
  const pila = (i) => { const { x, alto } = punta(i); return [x, alto ? YT + R : YB - R, alto ? 1 : -1]; };

  const tavolo = {
    libero: true,
    reset(ctx) { ctxBG = ctx; const p = ctx.partita; if (!p.prossimi.some((m) => m.da === ctx.ui.bgDa)) ctx.ui.bgDa = null; },
    panno(ctx) {
      const p = ctx.partita, ui = ctx.ui, io = ctx.mio;
      const colMio = io === 0 ? 'chiaro' : 'scuro', colSuo = io === 0 ? 'scuro' : 'chiaro';
      const mioTurno = p.turno === io && !p.finita && !p.inAttesa;
      const sorgenti = new Set(p.prossimi.map((m) => m.da));
      const mete = new Set(ui.bgDa != null ? p.prossimi.filter((m) => m.da === ui.bgDa).map((m) => m.a) : []);
      // ultima mossa dell'avversario (nella mia prospettiva) e passi già fatti da me in questo turno
      const segni = new Set();
      if (p.ultima && p.ultima.posto !== io && p.turno === io && !p.passi.length) for (const q of p.ultima.passi) { if (q.a > 0) segni.add(25 - q.a); }
      let s = '';
      // fondo: legno, i due campi, la barra, il vassoio
      s += `<rect class="bkg-cornice" x="0" y="0" width="${W}" height="${H}" rx="22"/>`;
      s += `<rect class="bkg-campo" x="${X0}" y="${YT}" width="${6 * LP}" height="${YB - YT}" rx="6"/><rect class="bkg-campo" x="${X0 + 6 * LP + BAR}" y="${YT}" width="${6 * LP}" height="${YB - YT}" rx="6"/>`;
      s += `<rect class="bkg-barra" x="${X0 + 6 * LP}" y="${YT}" width="${BAR}" height="${YB - YT}"/>`;
      s += `<rect class="bkg-vassoio" x="${XFUORI - 36}" y="${YT}" width="72" height="${YB - YT}" rx="8"/>`;
      for (let i = 1; i <= 24; i++) {
        const { x, alto } = punta(i);
        const y0 = alto ? YT : YB, y1 = alto ? YT + HT : YB - HT;
        const colore = (i % 2) ? 'a' : 'b';
        const meta = mete.has(i);
        s += `<path class="bkg-punta ${colore} ${meta ? 'meta' : ''} ${segni.has(i) ? 'segnata' : ''}" d="M${x - LP / 2 + 3} ${y0} L${x + LP / 2 - 3} ${y0} L${x} ${y1} Z"/>`;
        s += `<text class="bkg-num" x="${x}" y="${alto ? YT - 7 : YB + 18}">${i}</text>`;
      }
      // pedine sulle punte
      for (let i = 1; i <= 24; i++) {
        const { x, alto } = punta(i);
        const m = p.mie[i], o = p.sue[25 - i];
        const cliccabile = mioTurno && sorgenti.has(i);
        if (m) s += pedine(...pila(i), m, `${colMio} ${cliccabile ? 'mobile' : ''} ${ui.bgDa === i ? 'scelta' : ''}`, cliccabile ? `data-az="da" data-p="${i}" role="button" tabindex="0" aria-label="Pedine sulla punta ${i}"` : '');
        if (o) s += pedine(...pila(i), o, colSuo);
        if (mete.has(i)) s += `<rect class="bkg-zona" data-az="a" data-p="${i}" x="${x - LP / 2}" y="${alto ? YT : YB - HT - 20}" width="${LP}" height="${HT + 20}" role="button" aria-label="Porta sulla punta ${i}"/>`;
      }
      // barra: le mie in basso, le sue in alto
      const barCl = mioTurno && sorgenti.has(25);
      if (p.mie[25]) s += pedine(XBAR, H / 2 + 48 + R, 1, p.mie[25], `${colMio} ${barCl ? 'mobile' : ''} ${ui.bgDa === 25 ? 'scelta' : ''}`, barCl ? 'data-az="da" data-p="25" role="button" tabindex="0" aria-label="Pedine sulla barra"' : '');
      if (p.sue[25]) s += pedine(XBAR, H / 2 - 48 - R, -1, p.sue[25], colSuo);
      // cubo
      if (p.conCubo) {
        const yc = p.padroneCubo === null ? H / 2 : p.padroneCubo === io ? YB - 40 : YT + 40;
        s += `<g class="bkg-cubo ${p.crawford ? 'spento' : ''}"><rect x="${XBAR - 22}" y="${yc - 22}" width="44" height="44" rx="7"/><text x="${XBAR}" y="${yc + 8}">${p.cubo === 1 ? 64 : p.cubo}</text></g>`;
      }
      // vassoio: pedine uscite (strisce)
      const strisce = (n, alto, cls) => Array.from({ length: n }, (_, k) => `<rect class="bkg-uscita ${cls}" x="${XFUORI - 28}" y="${alto ? YT + 8 + k * 14 : YB - 20 - k * 14}" width="56" height="11" rx="3"/>`).join('');
      s += strisce(p.mie[0], false, colMio) + strisce(p.sue[0], true, colSuo);
      if (mete.has(0)) s += `<rect class="bkg-zona fuori" data-az="a" data-p="0" x="${XFUORI - 36}" y="${H / 2}" width="72" height="${YB - H / 2}" rx="8" role="button" aria-label="Porta fuori"/><text class="bkg-fuori-txt" x="${XFUORI}" y="${H / 2 + 40}">FUORI</text>`;
      // dadi sul campo di destra
      if (p.dadi && p.fase !== 'tira' && p.fase !== 'offerta') {
        const usati = p.usati.slice();
        const lista = p.dadi[0] === p.dadi[1] ? [p.dadi[0], p.dadi[0], p.dadi[0], p.dadi[0]] : p.dadi;
        const xd = X0 + 6 * LP + BAR + 3 * LP, yd = H / 2;
        const chi = p.turno === io ? colMio : colSuo;
        s += lista.map((d, k) => {
          const j = usati.indexOf(d); const usato = j >= 0; if (usato) usati.splice(j, 1);
          const x = xd + (k - (lista.length - 1) / 2) * 62;
          return `<g class="bkg-dado ${chi} ${usato ? 'usato' : ''}" transform="translate(${x} ${yd})"><rect x="-25" y="-25" width="50" height="50" rx="9"/>${PUNTI[d].map(([a, b]) => `<circle cx="${a * 14}" cy="${b * 14}" r="5"/>`).join('')}</g>`;
        }).join('');
      }
      const svg = `<svg class="bkg-svg" viewBox="0 0 ${W} ${H + 6}" role="img" aria-label="Tavola del backgammon">${s}</svg>`;

      // pannello di lato: punteggio, pip, messaggio e pulsanti
      const nome = (i) => (i === io ? 'Tu' : esc(ctx.nome(i)));
      let msg;
      if (p.finita) msg = p.risultato.vincitori[0] === io ? 'Hai vinto la sfida! 🏆' : `${esc(ctx.nome(p.risultato.vincitori[0]))} vince la sfida`;
      else if (p.fase === 'fineGioco' && p.riepilogo) msg = `${nome(p.riepilogo.vince)} ${p.riepilogo.vince === io ? 'vinci' : 'vince'} ${p.riepilogo.punti} ${p.riepilogo.punti === 1 ? 'punto' : 'punti'}${p.riepilogo.tipo === 'gammon' ? ' con un gammon' : p.riepilogo.tipo === 'backgammon' ? ' con un backgammon' : p.riepilogo.tipo === 'rifiuto' ? ' (raddoppio rifiutato)' : ''}`;
      else if (p.fase === 'offerta') msg = p.offerta.a === io ? `${esc(ctx.nome(p.offerta.da))} raddoppia: la posta diventerebbe <b>${p.cubo * 2}</b>. Accetti?` : 'Aspetti la risposta al raddoppio…';
      else if (p.fase === 'bloccato') msg = `${nome(p.turno)} non ${p.turno === io ? 'puoi' : 'può'} muovere con ${p.dadi[0]} e ${p.dadi[1]}`;
      else if (p.turno === io) msg = p.fase === 'tira' ? 'Tocca a te: tira i dadi' : p.puoConfermare ? 'Dadi usati: premi <b>Fine turno</b>' : ui.bgDa != null ? 'Ora clicca la punta dove portarla' : 'Clicca una pedina che si può muovere';
      else msg = `${esc(ctx.nome(p.turno))} ${p.fase === 'tira' ? 'sta per tirare' : 'muove'}…`;
      if (p.apertura && p.nPartita && p.fase === 'muovi' && !p.passi.length) msg = `Apertura: ${p.turno === io ? 'tu' : esc(ctx.nome(p.turno))} ${p.apertura.dadi[0]} contro ${p.apertura.dadi[1]}. ${msg}`;
      const bt = [];
      if (mioTurno && p.fase === 'tira') {
        bt.push('<button class="bottone primario-bt" data-az="tira">🎲 Tira</button>');
        if (p.puoRaddoppiare) bt.push(`<button class="bottone" data-az="raddoppia">Raddoppia a ${p.cubo * 2}</button>`);
      }
      if (mioTurno && p.fase === 'muovi') {
        if (p.puoConfermare) bt.push('<button class="bottone primario-bt" data-az="conferma">✓ Fine turno</button>');
        if (p.passi.length) bt.push('<button class="bottone" data-az="annulla">↶ Annulla</button>');
      }
      if (p.fase === 'offerta' && p.offerta.a === io && !p.inAttesa) bt.push('<button class="bottone primario-bt" data-az="accetta">Accetto</button><button class="bottone" data-az="rifiuta">Rifiuto</button>');
      const colori = (i) => `<span class="bkg-pallino ${i === 0 ? 'chiaro' : 'scuro'}"></span>`;
      const lato = `<div class="bkg-lato">
        <div class="bkg-sfida">Sfida a ${p.lunghezza} ${p.lunghezza === 1 ? 'punto' : 'punti'}${p.crawford ? ' · <b>Crawford</b>' : ''}</div>
        ${[io, 1 - io].map((i) => `<div class="bkg-gioc ${p.turno === i && !p.finita ? 'di-turno' : ''}">${colori(i)}<b>${nome(i)}</b><span class="bkg-punti">${p.punti[i]}</span><small>pip ${p.pip[i]}</small></div>`).join('')}
        <p class="bkg-msg" aria-live="polite">${msg}</p>
        <div class="bkg-bottoni">${bt.join('')}</div>
        <p class="bkg-aiuto">Spazio: tira / fine turno · ⌫ annulla</p></div>`;
      return `<div class="bkg">${svg}${lato}</div>`;
    },
    dopo(ctx) {
      const p = ctx.partita;
      if (p.dadi && primaVolta(ctx.ui, `bkg-d-${p.nPartita}-${p.ultima ? p.ultima.n : 0}-${p.fase === 'tira' ? 't' : 'm'}`) && p.fase === 'muovi') suono([[300, 0.03], [420, 0.03], [360, 0.04]], { tipo: 'square', volume: 0.025 });
    },
    stato(ctx) {
      const p = ctx.partita;
      if (p.fase === 'offerta') return p.offerta.a === ctx.mio ? 'Raddoppio: accetti?' : 'Raddoppio offerto';
      if (p.turno === ctx.mio && !p.finita) return p.fase === 'tira' ? 'Tocca a te: tira' : 'Tocca a te: muovi';
      return null;
    },
    punteggio() { return ''; },
    infoPosto(ctx, posto) { const p = ctx.partita; return `${p.punti[posto]} punti · pip ${p.pip[posto]}`; },
    clic(ctx, el) {
      const p = ctx.partita, ui = ctx.ui, az = el.dataset.az;
      if (['tira', 'raddoppia', 'accetta', 'rifiuta', 'conferma', 'annulla'].includes(az)) { ui.bgDa = null; return ctx.invia({ tipo: az }); }
      if (az === 'da') {
        const da = Number(el.dataset.p);
        if (ui.bgDa === da) { ui.bgDa = null; return ctx.ridisegna(); }
        const mete = [...new Set(p.prossimi.filter((m) => m.da === da).map((m) => m.a))];
        if (mete.length === 1) { ui.bgDa = null; suono([[520, 0.03]], { volume: 0.03 }); return ctx.invia({ tipo: 'passo', da, a: mete[0] }); }
        ui.bgDa = da; return ctx.ridisegna();
      }
      if (az === 'a' && ui.bgDa != null) {
        const da = ui.bgDa; ui.bgDa = null;
        suono([[520, 0.03]], { volume: 0.03 });
        return ctx.invia({ tipo: 'passo', da, a: Number(el.dataset.p) });
      }
      return undefined;
    },
  };
  const PUNTI = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };

  document.addEventListener('keydown', (e) => {
    const ctx = ctxBG, p = ctx && ctx.stato && ctx.partita;
    if (!p || p.gioco !== 'backgammon' || p.turno !== ctx.mio || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON')) return;
    if (!document.querySelector('#panno .bkg')) return;
    if (e.key === ' ') { e.preventDefault(); if (p.fase === 'tira') ctx.invia({ tipo: 'tira' }); else if (p.puoConfermare) ctx.invia({ tipo: 'conferma' }); }
    else if (e.key === 'Backspace' && p.passi.length) { e.preventDefault(); ctx.ui.bgDa = null; ctx.invia({ tipo: 'annulla' }); }
  });
  Object.assign(window.Tavoli, { backgammon: tavolo });
})();
