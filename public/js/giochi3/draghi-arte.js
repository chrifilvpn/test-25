// DRAGHI E SEGRETE: l'arte del gioco, tutta disegnata in SVG (niente immagini esterne). Il RITRATTO del personaggio è
// fatto a strati: sfondo col colore della classe, capelli dietro, mantello, armatura o veste secondo la classe, collo,
// orecchie secondo la stirpe (a punta per gli elfi, grandi per gnomi e halfling), testa con la forma del viso, corna dei
// tiefling, muso a scaglie dei dragonidi, zanne dei mezzorchi, chiaroscuro del viso, occhi con iride sfumata e palpebre,
// sopracciglia piene, naso con narici, labbra, barba, capelli davanti (pieni, con attaccatura e ciocche),
// segni (cicatrice, tatuaggio, lentiggini, benda, pitture), l'arma o il simbolo della classe dietro la spalla.
// Poi gli EMBLEMI delle classi, le ICONE dei luoghi della mappa del mondo e il DADO a venti facce.
(() => {
  let nId = 0;
  const uid = () => `dr${++nId}`;
  const scurisci = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`; };
  const COLORE_CLASSE = {
    barbaro: ['#7a2a1a', '#3a1208'], bardo: ['#7a3a7a', '#2e1430'], chierico: ['#c8a84a', '#5a4410'], druido: ['#3a6a2a', '#16300e'],
    guerriero: ['#6a6a7a', '#24242e'], ladro: ['#3a3a4a', '#121218'], mago: ['#2a3a8a', '#0e1440'], monaco: ['#c87a2a', '#5a2e08'],
    paladino: ['#d0b060', '#5a4a1a'], ranger: ['#4a6a3a', '#1a2a12'], stregone: ['#a03030', '#3a0a0a'], warlock: ['#4a2a6a', '#14081e'],
    // le classi delle ambientazioni horror
    sicurezza: ['#3a4a5a', '#10161e'], ingegnere: ['#b07a20', '#3a2408'], medico: ['#d8e0e0', '#4a5a5a'], tecnico: ['#2a6a6a', '#0a2222'], sommozzatore: ['#c8a020', '#3a3008'],
    ricercatore: ['#8a8a9a', '#2a2a34'], giornalista: ['#6a4a3a', '#24160e'], infermiere: ['#a0c8c0', '#2a4a44'], guardia: ['#2a3a2a', '#0e140e'], fuggiasco: ['#9a9a8a', '#34342a'],
  };
  // i vestiti delle classi horror si disegnano come quelli di una classe fantasy che gli somiglia
  const VESTE_COME = { sicurezza: 'guerriero', ingegnere: 'ranger', medico: 'ladro', tecnico: 'ladro', sommozzatore: 'guerriero', ricercatore: 'ladro', giornalista: 'ranger', infermiere: 'ladro', guardia: 'guerriero', fuggiasco: 'monaco' };
  const DRAGO_COL = { rosso: '#b8302a', oro: '#d8a83a', ottone: '#c8a050', blu: '#3060b0', bronzo: '#a87030', nero: '#3a3a3a', rame: '#b86a3a', bianco: '#d8e0e8', argento: '#a8b0c0', verde: '#3a8a4a' };

  // ---------- EMBLEMI DELLE CLASSI (tracciati in un quadrato 0..100) ----------
  const EMBLEMI = {
    barbaro: '<path d="M30 80 L62 30" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><path d="M50 22 C72 18 86 34 80 52 C70 44 60 40 50 22 Z" fill="currentColor"/><path d="M50 22 C40 34 40 46 50 52 C58 44 58 32 50 22 Z" fill="currentColor" opacity=".7"/>',
    bardo: '<ellipse cx="40" cy="64" rx="20" ry="18" fill="currentColor"/><path d="M52 54 L80 20" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><circle cx="40" cy="64" r="6" fill="#000" opacity=".35"/><path d="M74 16 L86 26" stroke="currentColor" stroke-width="5"/>',
    chierico: '<circle cx="50" cy="50" r="14" fill="currentColor"/><g stroke="currentColor" stroke-width="6" stroke-linecap="round">' + Array.from({ length: 8 }, (_, k) => { const a = (k * Math.PI) / 4; return `<path d="M${50 + Math.cos(a) * 22} ${50 + Math.sin(a) * 22} L${50 + Math.cos(a) * 36} ${50 + Math.sin(a) * 36}"/>`; }).join('') + '</g>',
    druido: '<path d="M50 86 C50 60 50 40 50 18" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path d="M50 50 C30 46 22 30 26 18 C40 22 50 34 50 50 Z M50 40 C66 36 76 22 74 12 C60 14 50 26 50 40 Z M50 64 C34 64 24 54 22 44 C36 44 48 52 50 64 Z" fill="currentColor"/>',
    guerriero: '<path d="M50 12 L58 22 L58 62 L42 62 L42 22 Z" fill="currentColor"/><rect x="28" y="62" width="44" height="8" rx="3" fill="currentColor"/><rect x="46" y="70" width="8" height="16" fill="currentColor"/><circle cx="50" cy="90" r="5" fill="currentColor"/>',
    ladro: '<path d="M20 80 L66 26 L74 34 L28 88 Z" fill="currentColor"/><path d="M80 80 L34 26 L26 34 L72 88 Z" fill="currentColor" opacity=".8"/><circle cx="70" cy="22" r="6" fill="currentColor"/><circle cx="30" cy="22" r="6" fill="currentColor" opacity=".8"/>',
    mago: '<path d="M50 10 L64 60 L36 60 Z" fill="currentColor"/><ellipse cx="50" cy="62" rx="30" ry="8" fill="currentColor"/><path d="M50 74 L50 92" stroke="currentColor" stroke-width="6"/><circle cx="58" cy="34" r="3" fill="#fff" opacity=".7"/><circle cx="46" cy="46" r="2" fill="#fff" opacity=".7"/>',
    monaco: '<circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" stroke-width="7"/><path d="M50 20 A15 15 0 0 1 50 50 A15 15 0 0 0 50 80 A30 30 0 0 1 50 20 Z" fill="currentColor"/><circle cx="50" cy="35" r="5" fill="#000" opacity=".4"/><circle cx="50" cy="65" r="5" fill="currentColor"/>',
    paladino: '<path d="M50 10 L82 22 L80 54 C76 74 62 84 50 90 C38 84 24 74 20 54 L18 22 Z" fill="currentColor"/><path d="M50 26 L50 74 M34 44 L66 44" stroke="#000" stroke-opacity=".35" stroke-width="7" stroke-linecap="round"/>',
    ranger: '<path d="M28 14 C64 34 64 66 28 86" fill="none" stroke="currentColor" stroke-width="6"/><path d="M28 14 L28 86" stroke="currentColor" stroke-width="2"/><path d="M22 50 L84 50" stroke="currentColor" stroke-width="5"/><path d="M84 50 L74 42 L74 58 Z" fill="currentColor"/>',
    stregone: '<path d="M50 88 C26 84 22 60 34 44 C36 56 44 58 44 58 C38 40 46 22 62 12 C58 30 72 38 70 56 C76 52 78 46 78 46 C86 66 74 86 50 88 Z" fill="currentColor"/>',
    warlock: '<path d="M10 50 C28 26 72 26 90 50 C72 74 28 74 10 50 Z" fill="currentColor"/><circle cx="50" cy="50" r="13" fill="#000" opacity=".55"/><ellipse cx="50" cy="50" rx="4" ry="11" fill="currentColor"/>',
  };
  const emblema = (classe, col = 'currentColor', dim = 40) => `<svg class="dr-emblema" viewBox="0 0 100 100" width="${dim}" height="${dim}" style="color:${col}" aria-hidden="true">${EMBLEMI[classe] || EMBLEMI.guerriero}</svg>`;

  // ---------- RITRATTO ----------
  // p: { stirpe, classe, genere, discendenza, aspetto: { pelle, capelli, occhi, pettinatura, barba, viso, segni, mantello, corna } }
  function ritratto(p, { cornice = true, sfondo = true } = {}) {
    const a = (p && p.aspetto) || {};
    const id = uid();
    const st = p.stirpe || 'umano', clc = COLORE_CLASSE[p.classe] ? p.classe : 'guerriero', cl = VESTE_COME[clc] || clc;
    const drago = st === 'dragonide';
    let pelle = a.pelle || '#e0b090';
    if (drago) pelle = DRAGO_COL[p.discendenza] || '#7a8a3a';
    const pelleS = scurisci(pelle, 0.78), pelleSS = scurisci(pelle, 0.6);
    const cap = a.capelli || '#4a2e1a', capS = scurisci(cap, 0.65);
    const occhi = a.occhi || '#3a2a1a';
    const mant = a.mantello || COLORE_CLASSE[clc][0], mantS = scurisci(mant, 0.55);
    const [c1, c2] = COLORE_CLASSE[clc];
    const viso = a.viso || 'ovale';
    const pett = drago ? 'calvo' : (a.pettinatura || 'corti');
    const barba = drago ? 'nessuna' : (a.barba || 'nessuna');
    const f = p.genere === 'f';
    const piccolo = st === 'gnomo' || st === 'halfling';
    const largo = st === 'nano' || st === 'mezzorco';
    // dimensioni della testa: gnomi e halfling hanno teste più rotonde, nani e mezzorchi più larghe
    const hx = 100, hy = piccolo ? 104 : 98;
    const rx = largo ? 36 : piccolo ? 34 : f ? 30 : 32, ry = piccolo ? 38 : 42;
    const out = [];
    out.push(`<svg class="dr-ritratto" viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${(p.nome || 'Ritratto').replace(/"/g, '')}">`);
    out.push(`<defs>
      <radialGradient id="${id}bg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="${c1}"/><stop offset=".75" stop-color="${c2}"/><stop offset="1" stop-color="#050505"/></radialGradient>
      <radialGradient id="${id}pe" cx="42%" cy="35%" r="70%"><stop offset="0" stop-color="${scurisci(pelle, 1.12)}"/><stop offset=".7" stop-color="${pelle}"/><stop offset="1" stop-color="${pelleS}"/></radialGradient>
      <linearGradient id="${id}ma" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mant}"/><stop offset="1" stop-color="${mantS}"/></linearGradient>
      <linearGradient id="${id}me" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8ecf2"/><stop offset=".45" stop-color="#9aa2b0"/><stop offset="1" stop-color="#4a505c"/></linearGradient>
      <linearGradient id="${id}cu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a32"/><stop offset="1" stop-color="#4a2e16"/></linearGradient>
      <linearGradient id="${id}ca" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${scurisci(cap, 1.25)}"/><stop offset="1" stop-color="${capS}"/></linearGradient>
      <linearGradient id="${id}om" x1="0" y1="0" x2="1" y2="0"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
      <radialGradient id="${id}ir" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="${scurisci(occhi, 1.6)}"/><stop offset=".55" stop-color="${occhi}"/><stop offset="1" stop-color="${scurisci(occhi, 0.45)}"/></radialGradient>
      <radialGradient id="${id}lu" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <radialGradient id="${id}sc" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${pelleSS}" stop-opacity=".55"/><stop offset="1" stop-color="${pelleSS}" stop-opacity="0"/></radialGradient>
      <linearGradient id="${id}cv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${scurisci(cap, 1.35)}"/><stop offset=".35" stop-color="${cap}"/><stop offset="1" stop-color="${capS}"/></linearGradient>
      <clipPath id="${id}fv"><path d="${formaViso(viso, hx, hy, rx, ry)}"/></clipPath>
      <clipPath id="${id}cl"><rect x="0" y="0" width="200" height="240" rx="${cornice ? 14 : 0}"/></clipPath>
    </defs>`);
    out.push(`<g clip-path="url(#${id}cl)">`);
    if (sfondo) {
      out.push(`<rect width="200" height="240" fill="url(#${id}bg)"/>`);
      out.push(`<g opacity=".13" transform="translate(110 10) scale(.9)" style="color:#fff">${EMBLEMI[cl] || ''}</g>`);
      // polvere di luce
      for (let k = 0; k < 14; k++) out.push(`<circle cx="${(k * 53) % 200}" cy="${(k * 37) % 150}" r="${0.6 + (k % 3) * 0.5}" fill="#fff" opacity="${0.12 + (k % 4) * 0.05}"/>`);
    }
    // la figura un po' più grande nella cornice
    out.push('<g transform="translate(100 150) scale(1.13) translate(-100 -150)">');
    // ---- arma dietro la spalla ----
    out.push(armaDietro(cl, id));
    // ---- cappuccio del warlock (dietro la testa) ----
    if (cl === 'warlock') out.push(`<path d="M${hx - rx - 14} ${hy + 40} C${hx - rx - 20} ${hy - 30} ${hx - 20} ${hy - ry - 22} ${hx} ${hy - ry - 22} C${hx + 20} ${hy - ry - 22} ${hx + rx + 20} ${hy - 30} ${hx + rx + 14} ${hy + 40} Z" fill="${scurisci(mant, 0.5)}"/>`);
    // ---- capelli dietro (la massa che sta dietro la testa e le spalle) ----
    if (!drago) out.push(capelliDietro(pett, hx, hy, rx, ry, id, f));
    // ---- corpo: mantello e armatura o veste ----
    out.push(`<path d="M8 240 C12 196 46 176 100 172 C154 176 188 196 192 240 Z" fill="url(#${id}ma)"/>`);
    out.push(corpo(cl, id, { f, mant, c1 }));
    // ---- collo ----
    out.push(`<path d="M${hx - 14} ${hy + ry - 14} L${hx - 15} ${hy + ry + 18} Q${hx} ${hy + ry + 26} ${hx + 15} ${hy + ry + 18} L${hx + 14} ${hy + ry - 14} Z" fill="${pelleS}"/>`);
    out.push(`<ellipse cx="${hx}" cy="${hy + ry - 2}" rx="17" ry="10" fill="url(#${id}sc)"/>`);
    out.push(colletto(cl, hx, hy + ry + 16, id, mant));
    // ---- orecchie ----
    out.push(orecchie(st, hx, hy, rx, pelle, pelleS));
    // ---- testa ----
    if (drago) out.push(testaDrago(hx, hy, rx, ry, pelle, pelleS, pelleSS, id));
    else out.push(`<path d="${formaViso(viso, hx, hy, rx, ry)}" fill="url(#${id}pe)"/>`);
    // chiaroscuro: orbite, zigomi, guance, mascella, fronte e mento (tutto dentro la forma del viso)
    if (!drago) out.push(modella({ hx, hy, rx, ry, id, f, pelleS, pelleSS }));
    // ---- corna ----
    if (a.corna && a.corna !== 'nessuna') out.push(corna(a.corna, hx, hy, rx, ry, drago ? scurisci(pelle, 0.5) : '#3a2a2a', id));
    // ---- occhi, sopracciglia, naso, bocca ----
    const faccia = drago ? { sopra: occhiDrago({ hx, hy, rx, occhi, pelleSS, segni: a.segni }), bocca: '' } : occhiFaccia({ hx, hy, rx, ry, id, cap, pelle, st, f, pelleS, pelleSS, segni: a.segni });
    out.push(faccia.sopra);
    // ---- barba (i baffi coprono il labbro di sopra; con la barba piena la bocca resta sopra) ----
    const baffiSopra = barba === 'baffi' || barba === 'pizzetto';
    if (baffiSopra) out.push(faccia.bocca);
    if (barba !== 'nessuna') out.push(disegnaBarba(barba, hx, hy, rx, ry, id, cap));
    if (!baffiSopra) out.push(faccia.bocca);
    // zanne del mezzorco (sopra la barba)
    if (st === 'mezzorco') out.push(`<path d="M${hx - 9} ${hy + 30} l2 -8 l3 8 Z M${hx + 9} ${hy + 30} l-2 -8 l-3 8 Z" fill="#f4ecd8" stroke="#8a7a5a" stroke-width=".6"/>`);
    // ---- capelli davanti ----
    if (!drago) out.push(capelliDavanti(pett, hx, hy, rx, ry, id, f, cap));
    // ---- segni ----
    out.push(segni(a.segni, hx, hy, rx, ry, c1));
    // ---- accessori della classe ----
    out.push(accessori(cl, hx, hy, rx, ry, id, { pett, drago }));
    // luce da sinistra: un velo d'ombra sul lato destro del viso
    if (!drago) out.push(`<path d="${formaViso(viso, hx, hy, rx, ry)}" fill="url(#${id}om)"/>`);
    out.push('</g></g>');
    if (cornice) out.push(`<rect x="2" y="2" width="196" height="236" rx="13" fill="none" stroke="#d8b25a" stroke-width="3"/><rect x="6" y="6" width="188" height="228" rx="10" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="1.5"/>`);
    out.push('</svg>');
    return out.join('');
  }
  function formaViso(viso, x, y, rx, ry) {
    if (viso === 'tondo') return `M${x} ${y - ry} C${x + rx * 1.1} ${y - ry} ${x + rx * 1.12} ${y + ry * 0.9} ${x} ${y + ry * 0.95} C${x - rx * 1.12} ${y + ry * 0.9} ${x - rx * 1.1} ${y - ry} ${x} ${y - ry} Z`;
    if (viso === 'squadrato') return `M${x} ${y - ry} C${x + rx} ${y - ry} ${x + rx * 1.05} ${y - 10} ${x + rx} ${y + 14} C${x + rx * 0.95} ${y + ry * 0.75} ${x + rx * 0.55} ${y + ry} ${x} ${y + ry} C${x - rx * 0.55} ${y + ry} ${x - rx * 0.95} ${y + ry * 0.75} ${x - rx} ${y + 14} C${x - rx * 1.05} ${y - 10} ${x - rx} ${y - ry} ${x} ${y - ry} Z`;
    if (viso === 'affilato') return `M${x} ${y - ry} C${x + rx * 1.02} ${y - ry} ${x + rx * 1.04} ${y + 4} ${x + rx * 0.7} ${y + ry * 0.6} C${x + rx * 0.4} ${y + ry * 0.95} ${x + 6} ${y + ry * 1.05} ${x} ${y + ry * 1.06} C${x - 6} ${y + ry * 1.05} ${x - rx * 0.4} ${y + ry * 0.95} ${x - rx * 0.7} ${y + ry * 0.6} C${x - rx * 1.04} ${y + 4} ${x - rx * 1.02} ${y - ry} ${x} ${y - ry} Z`;
    return `M${x} ${y - ry} C${x + rx * 1.08} ${y - ry} ${x + rx * 1.06} ${y + ry * 0.55} ${x + rx * 0.62} ${y + ry * 0.82} C${x + rx * 0.35} ${y + ry} ${x - rx * 0.35} ${y + ry} ${x - rx * 0.62} ${y + ry * 0.82} C${x - rx * 1.06} ${y + ry * 0.55} ${x - rx * 1.08} ${y - ry} ${x} ${y - ry} Z`;
  }
  function testaDrago(x, y, rx, ry, pelle, ps, pss, id) {
    // testa allungata con muso, scaglie, creste dietro
    return `<path d="M${x - rx - 10} ${y - 18} L${x - rx - 26} ${y - 34} L${x - rx - 4} ${y - 30} Z M${x + rx + 10} ${y - 18} L${x + rx + 26} ${y - 34} L${x + rx + 4} ${y - 30} Z" fill="${pss}"/>
      <path d="M${x} ${y - ry} C${x + rx * 1.1} ${y - ry} ${x + rx * 1.15} ${y + 4} ${x + rx * 0.8} ${y + 22} C${x + rx * 0.6} ${y + ry * 0.95} ${x + 12} ${y + ry + 8} ${x} ${y + ry + 8} C${x - 12} ${y + ry + 8} ${x - rx * 0.6} ${y + ry * 0.95} ${x - rx * 0.8} ${y + 22} C${x - rx * 1.15} ${y + 4} ${x - rx * 1.1} ${y - ry} ${x} ${y - ry} Z" fill="url(#${id}pe)"/>
      <path d="M${x - 16} ${y + 26} C${x - 10} ${y + 42} ${x + 10} ${y + 42} ${x + 16} ${y + 26}" fill="${ps}" opacity=".7"/>
      <g fill="${pss}" opacity=".45">${Array.from({ length: 12 }, (_, k) => `<path d="M${x - 24 + (k % 4) * 16} ${y - 30 + Math.floor(k / 4) * 12} q4 -5 8 0 q-4 4 -8 0Z"/>`).join('')}</g>
      <circle cx="${x - 6}" cy="${y + 30}" r="1.6" fill="${pss}"/><circle cx="${x + 6}" cy="${y + 30}" r="1.6" fill="${pss}"/>`;
  }
  function orecchie(st, x, y, rx, pe, ps) {
    const L = x - rx + 2, Rr = x + rx - 2, yy = y + 4;
    if (st === 'elfo' || st === 'mezzelfo') {
      const lung = st === 'elfo' ? 30 : 18;
      return `<path d="M${L + 2} ${yy - 8} C${L - 10} ${yy - 14} ${L - 14} ${yy - lung} ${L - 16} ${yy - lung - 6} C${L - 6} ${yy - lung + 4} ${L - 4} ${yy + 6} ${L + 4} ${yy + 12} Z" fill="${pe}" stroke="${ps}" stroke-width="1.2"/>
        <path d="M${Rr - 2} ${yy - 8} C${Rr + 10} ${yy - 14} ${Rr + 14} ${yy - lung} ${Rr + 16} ${yy - lung - 6} C${Rr + 6} ${yy - lung + 4} ${Rr + 4} ${yy + 6} ${Rr - 4} ${yy + 12} Z" fill="${pe}" stroke="${ps}" stroke-width="1.2"/>`;
    }
    if (st === 'dragonide') return '';
    const r = st === 'gnomo' || st === 'halfling' ? 11 : st === 'mezzorco' ? 9 : 8;
    const punta = st === 'mezzorco' || st === 'gnomo' ? -6 : 0;
    return `<path d="M${L + 3} ${yy - 10} C${L - r} ${yy - 12 + punta} ${L - r - 2} ${yy + 10} ${L + 3} ${yy + 12} Z" fill="${pe}" stroke="${ps}" stroke-width="1.2"/><path d="M${L - 2} ${yy - 2} q-3 4 1 8" stroke="${ps}" fill="none"/>
      <path d="M${Rr - 3} ${yy - 10} C${Rr + r} ${yy - 12 + punta} ${Rr + r + 2} ${yy + 10} ${Rr - 3} ${yy + 12} Z" fill="${pe}" stroke="${ps}" stroke-width="1.2"/><path d="M${Rr + 2} ${yy - 2} q3 4 -1 8" stroke="${ps}" fill="none"/>`;
  }
  function corna(tipo, x, y, rx, ry, col, id) {
    const top = y - ry + 8;
    if (tipo === 'piccole') return `<path d="M${x - 16} ${top + 2} l-6 -16 l12 10 Z M${x + 16} ${top + 2} l6 -16 l-12 10 Z" fill="${col}" stroke="#000" stroke-opacity=".4"/>`;
    if (tipo === 'lunghe') return `<path d="M${x - 14} ${top} C${x - 22} ${top - 30} ${x - 26} ${top - 48} ${x - 18} ${top - 62} C${x - 34} ${top - 44} ${x - 34} ${top - 20} ${x - 24} ${top + 4} Z M${x + 14} ${top} C${x + 22} ${top - 30} ${x + 26} ${top - 48} ${x + 18} ${top - 62} C${x + 34} ${top - 44} ${x + 34} ${top - 20} ${x + 24} ${top + 4} Z" fill="${col}" stroke="#000" stroke-opacity=".45"/>`;
    // ricurve all'indietro, da ariete
    return `<path d="M${x - 18} ${top + 4} C${x - 30} ${top - 22} ${x - 58} ${top - 10} ${x - 52} ${top + 18} C${x - 48} ${top + 30} ${x - 36} ${top + 26} ${x - 38} ${top + 14} C${x - 44} ${top + 4} ${x - 34} ${top - 6} ${x - 26} ${top + 10} Z M${x + 18} ${top + 4} C${x + 30} ${top - 22} ${x + 58} ${top - 10} ${x + 52} ${top + 18} C${x + 48} ${top + 30} ${x + 36} ${top + 26} ${x + 38} ${top + 14} C${x + 44} ${top + 4} ${x + 34} ${top - 6} ${x + 26} ${top + 10} Z" fill="${col}" stroke="#000" stroke-opacity=".45"/>
      <path d="M${x - 44} ${top + 2} q4 4 0 9 M${x + 44} ${top + 2} q-4 4 0 9" stroke="#fff" stroke-opacity=".2" fill="none"/>`;
  }
  // occhi da rettile e bocca a fessura dei dragonidi
  function occhiDrago({ hx, hy, rx, occhi, pelleSS, segni: sg }) {
    const ey = hy - 4, dx = rx * 0.42;
    const occhio = (cx) => `<path d="M${cx - 8} ${ey} Q${cx} ${ey - 7} ${cx + 8} ${ey} Q${cx} ${ey + 5} ${cx - 8} ${ey} Z" fill="#f4e090"/><ellipse cx="${cx}" cy="${ey}" rx="4.5" ry="5" fill="${occhi === '#3a2a1a' ? '#e0b030' : occhi}"/><ellipse cx="${cx}" cy="${ey}" rx="1.3" ry="4.4" fill="#111"/>
      <path d="M${cx - 9} ${ey} Q${cx} ${ey - 7.5} ${cx + 9} ${ey - 0.5}" stroke="#20140c" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    const my = hy + 34;
    return `${occhio(hx - dx)}${sg === 'benda' ? '' : occhio(hx + dx)}<path d="M${hx - 18} ${my - 4} Q${hx} ${my + 3} ${hx + 18} ${my - 4}" stroke="${pelleSS}" stroke-width="2" fill="none"/>`;
  }
  // mescola due colori (t = 0 il primo, 1 il secondo)
  const mescola = (c1, c2, t) => { const a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16); return `#${[16, 8, 0].map((k) => Math.round(((a >> k) & 255) * (1 - t) + ((b >> k) & 255) * t).toString(16).padStart(2, '0')).join('')}`; };
  // il chiaroscuro del viso: luce da sinistra in alto
  function modella({ hx, hy, rx, ry, id, f, pelleS, pelleSS }) {
    const ey = hy - 4, dx = rx * 0.42;
    return `<g clip-path="url(#${id}fv)">
      <ellipse cx="${hx - dx}" cy="${ey - 1}" rx="12" ry="7" fill="url(#${id}sc)" opacity=".75"/><ellipse cx="${hx + dx}" cy="${ey - 1}" rx="12" ry="7" fill="url(#${id}sc)" opacity=".85"/>
      <path d="M${hx - rx * 0.95} ${hy + 4} Q${hx - rx * 0.7} ${hy + 22} ${hx - rx * 0.3} ${hy + ry * 0.78}" stroke="${pelleS}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".22"/>
      <path d="M${hx + rx * 0.95} ${hy + 4} Q${hx + rx * 0.7} ${hy + 22} ${hx + rx * 0.3} ${hy + ry * 0.78}" stroke="${pelleSS}" stroke-width="8" fill="none" stroke-linecap="round" opacity=".25"/>
      <ellipse cx="${hx - rx * 0.5}" cy="${hy + 10}" rx="10" ry="6" fill="#e2706a" opacity="${f ? 0.22 : 0.1}"/><ellipse cx="${hx + rx * 0.5}" cy="${hy + 10}" rx="10" ry="6" fill="#e2706a" opacity="${f ? 0.2 : 0.09}"/>
      <ellipse cx="${hx - rx * 0.5}" cy="${hy + 2}" rx="8" ry="4" fill="url(#${id}lu)" opacity=".5"/>
      <ellipse cx="${hx - 6}" cy="${hy - ry * 0.62}" rx="15" ry="8" fill="url(#${id}lu)" opacity=".45"/>
      <ellipse cx="${hx - 2}" cy="${hy + ry * 0.84}" rx="7" ry="3.5" fill="url(#${id}lu)" opacity=".4"/>
      <path d="M${hx - rx * 0.62} ${hy + ry * 0.86} Q${hx} ${hy + ry * 1.08} ${hx + rx * 0.62} ${hy + ry * 0.86}" stroke="${pelleSS}" stroke-width="5" fill="none" opacity=".25"/>
    </g>`;
  }
  // occhi (iride sfumata, palpebre, piega, ciglia), sopracciglia, naso e bocca con le labbra
  function occhiFaccia({ hx, hy, rx, ry, id, cap, pelle, st, f, pelleS, pelleSS, segni: sg }) {
    const ey = hy - 4, dx = rx * 0.42;
    const elf = st === 'elfo' || st === 'mezzelfo';
    const w = elf ? 9 : 8.2, h = 4.8, alza = elf ? 2.2 : 0.6;
    // lato: -1 occhio a sinistra (angolo esterno a sinistra), +1 a destra
    const occhio = (cx, lato, n) => {
      const xi = cx - lato * w, xo = cx + lato * w, yo = ey - alza;
      const forma = `M${xi} ${ey + 0.6} C${cx - lato * w * 0.45} ${ey - h * 1.2} ${cx + lato * w * 0.5} ${ey - h * 1.25} ${xo} ${yo} C${cx + lato * w * 0.45} ${ey + h * 0.85} ${cx - lato * w * 0.5} ${ey + h * 0.9} ${xi} ${ey + 0.6} Z`;
      const cid = `${id}oc${n}`;
      const ciglia = f ? `<path d="M${xo} ${yo} l${lato * 3} -2.4 M${xo - lato * 2.2} ${yo - 1.6} l${lato * 2.2} -2.8 M${xo - lato * 4.6} ${yo - 2.8} l${lato * 1.2} -2.8" stroke="#1a0e08" stroke-width="1.1" stroke-linecap="round"/>` : '';
      return `<clipPath id="${cid}"><path d="${forma}"/></clipPath>
        <path d="${forma}" fill="#f6f1ea"/>
        <g clip-path="url(#${cid})"><circle cx="${cx}" cy="${ey + 0.2}" r="4.3" fill="url(#${id}ir)"/><circle cx="${cx}" cy="${ey + 0.2}" r="4.3" fill="none" stroke="#000" stroke-opacity=".35" stroke-width=".8"/>
          <circle cx="${cx}" cy="${ey + 0.2}" r="1.9" fill="#0b0806"/><circle cx="${cx + 1.5}" cy="${ey - 1.5}" r="1.15" fill="#fff"/><circle cx="${cx - 1.3}" cy="${ey + 1.6}" r=".6" fill="#fff" opacity=".6"/>
          <path d="M${xi - 2} ${ey - 2} Q${cx} ${ey - h * 1.6} ${xo + 2} ${yo - 2} L${xo + 2} ${yo - 6} L${xi - 2} ${ey - 6} Z" fill="#000" opacity=".22" transform="translate(0 2.2)"/></g>
        <path d="M${xi - lato * 0.5} ${ey + 0.4} C${cx - lato * w * 0.45} ${ey - h * 1.25} ${cx + lato * w * 0.5} ${ey - h * 1.3} ${xo + lato * 1} ${yo - 0.3}" stroke="#1e120a" stroke-width="${f ? 2.1 : 1.7}" fill="none" stroke-linecap="round"/>
        <path d="M${xi + lato * 1} ${ey - 4.6} Q${cx} ${ey - h * 2.05} ${xo - lato * 0.5} ${yo - 3.6}" stroke="${pelleSS}" stroke-width="1" fill="none" opacity=".7"/>
        <path d="M${xi + lato * 1.5} ${ey + 2.2} Q${cx} ${ey + h * 1.05} ${xo - lato * 1} ${yo + 1.4}" stroke="${pelleSS}" stroke-width=".9" fill="none" opacity=".55"/>${ciglia}`;
    };
    // sopracciglia piene, più spesse all'interno e sottili verso l'esterno
    const colS = scurisci(cap, cap === '#e8e0c8' || cap === '#d8b060' ? 0.7 : 0.85), sp = f ? 2.1 : 3.2;
    const ciglio = (cx, lato) => {
      const xi = cx - lato * (w + 0.5), xo = cx + lato * (w + 3.5), by = ey - 9.5 - (elf ? 1 : 0);
      return `<path d="M${xi} ${by + 0.5} Q${cx - lato * 1} ${by - 4.2} ${xo} ${by - (elf ? 2.5 : 0.5)} Q${cx} ${by - 4.8 - sp} ${xi} ${by - sp} Z" fill="${colS}"/>`;
    };
    const benda = sg === 'benda';
    const k = st === 'gnomo' ? 1.35 : st === 'mezzorco' ? 1.12 : 1;
    const nt = ey + 16 * k;
    const naso = `<path d="M${hx - 3} ${ey + 1} Q${hx - 5.5} ${ey + 9 * k} ${hx - 6} ${nt - 2}" stroke="${pelleS}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".45"/>
      <ellipse cx="${hx + 0.5}" cy="${nt}" rx="${4.4 * k}" ry="${3.4 * k}" fill="${scurisci(pelle, 1.05)}"/>
      <ellipse cx="${hx - 0.8}" cy="${nt - 1.2}" rx="${2 * k}" ry="${1.4 * k}" fill="#fff" opacity=".3"/>
      <path d="M${hx - 6.5 * k} ${nt - 0.5} Q${hx - 8 * k} ${nt + 3.5} ${hx - 3.5} ${nt + 3.4}" stroke="${pelleSS}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
      <path d="M${hx + 6.5 * k} ${nt - 0.5} Q${hx + 8 * k} ${nt + 3.5} ${hx + 3.5} ${nt + 3.4}" stroke="${pelleSS}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
      <ellipse cx="${hx - 2.6}" cy="${nt + 3}" rx="1.6" ry=".9" fill="${scurisci(pelle, 0.4)}" opacity=".8"/><ellipse cx="${hx + 2.6}" cy="${nt + 3}" rx="1.6" ry=".9" fill="${scurisci(pelle, 0.4)}" opacity=".8"/>
      <ellipse cx="${hx}" cy="${nt + 6}" rx="6" ry="1.8" fill="${pelleSS}" opacity=".25"/>`;
    // le labbra: quello di sopra più scuro, quello di sotto più pieno con un riflesso
    const my = hy + 27, lab = f ? mescola(pelle, '#b8404c', 0.55) : mescola(pelle, '#9a4a40', 0.38), lw = f ? 9.5 : 10;
    const bocca = `<path d="M${hx - lw} ${my} Q${hx - 5} ${my - 3.4} ${hx} ${my - 1.6} Q${hx + 5} ${my - 3.4} ${hx + lw} ${my} Q${hx} ${my + 0.8} ${hx - lw} ${my} Z" fill="${scurisci(lab, 0.82)}"/>
      <path d="M${hx - lw + 1} ${my + 0.4} Q${hx} ${my + (f ? 6.4 : 4.6)} ${hx + lw - 1} ${my + 0.4} Q${hx} ${my + 1.4} ${hx - lw + 1} ${my + 0.4} Z" fill="${lab}"/>
      <path d="M${hx - lw} ${my} Q${hx} ${my + 1.6} ${hx + lw} ${my}" stroke="${scurisci(lab, 0.45)}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
      <ellipse cx="${hx - 2}" cy="${my + (f ? 3 : 2.3)}" rx="3" ry=".9" fill="#fff" opacity="${f ? 0.35 : 0.2}"/>
      <ellipse cx="${hx}" cy="${my + (f ? 9.5 : 8)}" rx="6" ry="2" fill="${pelleSS}" opacity=".3"/>`;
    return { sopra: `${occhio(hx - dx, -1, 1)}${benda ? '' : occhio(hx + dx, 1, 2)}${ciglio(hx - dx, -1)}${ciglio(hx + dx, 1)}${naso}`, bocca };
  }
  function disegnaBarba(tipo, x, y, rx, ry, id, cap) {
    const g = `url(#${id}ca)`;
    if (tipo === 'baffi') return `<path d="M${x - 2} ${y + 22} C${x - 10} ${y + 18} ${x - 20} ${y + 24} ${x - 22} ${y + 32} C${x - 14} ${y + 26} ${x - 6} ${y + 28} ${x} ${y + 25} C${x + 6} ${y + 28} ${x + 14} ${y + 26} ${x + 22} ${y + 32} C${x + 20} ${y + 24} ${x + 10} ${y + 18} ${x + 2} ${y + 22} Z" fill="${g}"/>`;
    if (tipo === 'pizzetto') return `<path d="M${x - 9} ${y + 33} Q${x} ${y + 52} ${x + 9} ${y + 33} Q${x} ${y + 38} ${x - 9} ${y + 33} Z" fill="${g}"/><path d="M${x - 2} ${y + 22} C${x - 8} ${y + 19} ${x - 14} ${y + 23} ${x - 15} ${y + 28} C${x - 9} ${y + 25} ${x - 4} ${y + 26} ${x} ${y + 24} C${x + 4} ${y + 26} ${x + 9} ${y + 25} ${x + 15} ${y + 28} C${x + 14} ${y + 23} ${x + 8} ${y + 19} ${x + 2} ${y + 22} Z" fill="${g}"/>`;
    const lung = tipo === 'lunga' ? 46 : tipo === 'treccia' ? 40 : 22;
    let s = `<path d="M${x - rx + 2} ${y + 2} C${x - rx + 2} ${y + 30} ${x - 20} ${y + ry + lung * 0.6} ${x} ${y + ry + lung * 0.75} C${x + 20} ${y + ry + lung * 0.6} ${x + rx - 2} ${y + 30} ${x + rx - 2} ${y + 2} C${x + rx - 8} ${y + 22} ${x + 14} ${y + 30} ${x} ${y + 32} C${x - 14} ${y + 30} ${x - rx + 8} ${y + 22} ${x - rx + 2} ${y + 2} Z" fill="${g}"/>`;
    s += `<path d="M${x - 11} ${y + 27} Q${x} ${y + 33} ${x + 11} ${y + 27}" stroke="#7a3a2a" stroke-width="2" fill="none"/>`;
    s += `<g stroke="${scurisci(cap, 0.55)}" stroke-width="1" opacity=".5" fill="none">${Array.from({ length: 7 }, (_, k) => `<path d="M${x - 18 + k * 6} ${y + 34} q${k % 2 ? 2 : -2} ${10 + lung * 0.3} 0 ${14 + lung * 0.4}"/>`).join('')}</g>`;
    if (tipo === 'treccia') s += `<g fill="${scurisci(cap, 0.8)}">${[0, 1, 2].map((k) => `<ellipse cx="${x}" cy="${y + ry + 26 + k * 9}" rx="6" ry="5"/>`).join('')}</g><circle cx="${x}" cy="${y + ry + 54}" r="3" fill="#d8b25a"/>`;
    return s;
  }
  // ciocche: fili di luce e d'ombra che seguono la forma dei capelli
  const ciocche = (linee, cap) => `<g fill="none" stroke-linecap="round"><g stroke="${scurisci(cap, 1.7)}" stroke-opacity=".28" stroke-width="1.1">${linee.map((d) => `<path d="${d}"/>`).join('')}</g><g stroke="${scurisci(cap, 0.45)}" stroke-opacity=".35" stroke-width=".9" transform="translate(1.6 1.2)">${linee.map((d) => `<path d="${d}"/>`).join('')}</g></g>`;
  function capelliDietro(pett, x, y, rx, ry, id, f) {
    const g = `url(#${id}cv)`, top = y - ry;
    switch (pett) {
      case 'lunghi': return `<path d="M${x - rx - 9} ${y - 12} C${x - rx - 16} ${top - 10} ${x + rx + 16} ${top - 10} ${x + rx + 9} ${y - 12} C${x + rx + 18} ${y + 30} ${x + rx + 22} ${y + 72} ${x + rx + 10} ${y + 96} L${x - rx - 10} ${y + 96} C${x - rx - 22} ${y + 72} ${x - rx - 18} ${y + 30} ${x - rx - 9} ${y - 12} Z" fill="${g}"/>
        <ellipse cx="${x}" cy="${y + ry + 8}" rx="${rx}" ry="22" fill="#000" opacity=".16"/>`;
      case 'ricci': {
        const n = f ? 22 : 16;
        return `<g fill="${g}">${Array.from({ length: n }, (_, k) => { const t = k / (n - 1), a = Math.PI * (f ? 0.62 : 0.86) + t * Math.PI * (f ? 1.76 : 1.28); const r = 11 + ((k * 5) % 4); return `<circle cx="${x + Math.cos(a) * (rx + 6)}" cy="${y - 6 + Math.sin(a) * (ry + 6)}" r="${r}"/>`; }).join('')}</g>`;
      }
      case 'coda': return `<path d="M${x + rx - 10} ${top + 12} C${x + rx + 18} ${top + 10} ${x + rx + 30} ${y + 20} ${x + rx + 16} ${y + 74} C${x + rx + 10} ${y + 56} ${x + rx + 6} ${y + 24} ${x + rx - 6} ${y - 4} Z" fill="${g}"/>
        <path d="M${x + rx + 6} ${top + 22} q10 20 8 50" stroke="${scurisci('#ffffff', 1)}" stroke-opacity=".15" fill="none"/>`;
      case 'chignon': return `<circle cx="${x + 2}" cy="${top - 7}" r="16" fill="${g}"/><path d="M${x - 10} ${top - 10} q12 -10 24 0 M${x - 8} ${top - 3} q10 -8 20 0" stroke="#fff" stroke-opacity=".18" fill="none"/>`;
      case 'treccia': return `<path d="M${x - rx - 4} ${y - 8} C${x - rx - 8} ${top} ${x + rx + 8} ${top} ${x + rx + 4} ${y - 8} L${x + rx} ${y + 10} L${x - rx} ${y + 10} Z" fill="${g}"/>`;
      default: return '';
    }
  }
  function capelliDavanti(pett, x, y, rx, ry, id, f, cap) {
    const g = `url(#${id}cv)`, top = y - ry, hl = y - ry * 0.5;
    switch (pett) {
      case 'calvo': return `<ellipse cx="${x - 10}" cy="${top + 14}" rx="13" ry="6" fill="url(#${id}lu)" opacity=".6"/>`;
      case 'cresta': return `<path d="M${x - rx - 1} ${y - 2} C${x - rx - 3} ${top} ${x + rx + 3} ${top} ${x + rx + 1} ${y - 2} C${x + rx - 4} ${top + 16} ${x - rx + 4} ${top + 16} ${x - rx - 1} ${y - 2} Z" fill="${cap}" opacity=".22"/>
        <path d="M${x - 9} ${hl} C${x - 12} ${top - 18} ${x - 6} ${top - 34} ${x + 1} ${top - 38} C${x + 8} ${top - 32} ${x + 12} ${top - 18} ${x + 9} ${hl} Q${x} ${hl - 4} ${x - 9} ${hl} Z" fill="${g}"/>
        ${ciocche([`M${x - 4} ${hl - 2} Q${x - 5} ${top - 16} ${x} ${top - 32}`, `M${x + 4} ${hl - 2} Q${x + 4} ${top - 14} ${x + 2} ${top - 30}`], cap)}`;
      case 'ricci': {
        const n = 9;
        return `<path d="M${x - rx - 3} ${y + 2} C${x - rx - 8} ${top - 6} ${x + rx + 8} ${top - 6} ${x + rx + 3} ${y + 2} L${x + rx - 3} ${y + 2} C${x + rx - 4} ${hl + 6} ${x + 10} ${hl} ${x} ${hl} C${x - 10} ${hl} ${x - rx + 4} ${hl + 6} ${x - rx + 3} ${y + 2} Z" fill="${g}"/>
          <g fill="${g}" stroke="${scurisci(cap, 0.5)}" stroke-opacity=".35" stroke-width=".8">${Array.from({ length: n }, (_, k) => { const t = k / (n - 1), a = Math.PI * (1.02 + t * 0.96); return `<circle cx="${x + Math.cos(a) * (rx * 0.92)}" cy="${hl - 2 + Math.sin(a) * 12 + (k % 2) * 3}" r="${7 + (k % 3)}"/>`; }).join('')}
          ${Array.from({ length: 7 }, (_, k) => { const t = k / 6, a = Math.PI * (1.1 + t * 0.8); return `<circle cx="${x + Math.cos(a) * (rx + 2)}" cy="${top + 2 + Math.sin(a) * 8 + 6}" r="${8 + (k % 2) * 2}"/>`; }).join('')}
          <circle cx="${x - rx - 1}" cy="${y - 6}" r="6.5"/><circle cx="${x + rx + 1}" cy="${y - 6}" r="6.5"/></g>
          <g fill="none" stroke="#fff" stroke-opacity=".2">${Array.from({ length: 7 }, (_, k) => `<path d="M${x - 24 + k * 8} ${top - 1 + (k % 2) * 3} q3 -4 6 0"/>`).join('')}</g>`;
      }
      case 'spettinati': return `<path d="M${x - rx - 3} ${y + 2} L${x - rx - 9} ${top + 6} L${x - rx + 1} ${top + 4} L${x - rx + 4} ${top - 10} L${x - 12} ${top - 4} L${x - 6} ${top - 18} L${x + 2} ${top - 6} L${x + 12} ${top - 17} L${x + 14} ${top - 4} L${x + rx - 2} ${top - 10} L${x + rx + 2} ${top + 4} L${x + rx + 10} ${top + 8} L${x + rx + 3} ${y + 2}
          L${x + rx - 3} ${y + 2} L${x + rx - 4} ${hl + 2} L${x + rx - 10} ${hl + 6} L${x + 14} ${hl - 3} L${x + 9} ${hl + 6} L${x + 2} ${hl - 4} L${x - 5} ${hl + 7} L${x - 10} ${hl - 3} L${x - 18} ${hl + 6} L${x - rx + 6} ${hl - 1} L${x - rx + 3} ${y + 2} Z" fill="${g}" stroke-linejoin="round"/>
        ${ciocche([`M${x - 18} ${hl} L${x - 10} ${top - 2}`, `M${x + 4} ${hl - 2} L${x + 10} ${top - 12}`, `M${x - 4} ${hl} L${x - 6} ${top - 12}`, `M${x + rx - 8} ${hl} L${x + rx - 4} ${top - 4}`], cap)}`;
      case 'lunghi': return `<path d="M${x - rx - 5} ${y + 62} C${x - rx - 14} ${y + 24} ${x - rx - 12} ${top - 6} ${x} ${top - 10} C${x + rx + 12} ${top - 6} ${x + rx + 14} ${y + 24} ${x + rx + 5} ${y + 62}
          L${x + rx - 3} ${y + 58} C${x + rx + 2} ${y + 24} ${x + rx + 1} ${y - 8} ${x + rx - 8} ${hl + 1} C${x + 16} ${hl - 8} ${x + 5} ${hl - 11} ${x + 1} ${hl - 12} C${x - 4} ${hl - 11} ${x - 16} ${hl - 8} ${x - rx + 8} ${hl + 1} C${x - rx - 1} ${y - 8} ${x - rx - 2} ${y + 24} ${x - rx + 3} ${y + 58} Z" fill="${g}"/>
        ${ciocche([`M${x + 1} ${hl - 11} C${x - 14} ${hl - 8} ${x - rx - 6} ${y - 4} ${x - rx - 4} ${y + 50}`, `M${x - 3} ${top - 6} C${x - 20} ${top} ${x - rx - 10} ${y + 6} ${x - rx - 9} ${y + 40}`, `M${x + 2} ${hl - 11} C${x + 14} ${hl - 8} ${x + rx + 6} ${y - 4} ${x + rx + 4} ${y + 50}`, `M${x + 5} ${top - 6} C${x + 20} ${top} ${x + rx + 10} ${y + 6} ${x + rx + 9} ${y + 40}`], cap)}`;
      case 'coda': case 'treccia': case 'chignon': {
        // capelli tirati indietro: attaccatura piena sulla fronte, tempie coperte fino alle orecchie, pettinati all'indietro
        let s = `<path d="M${x - rx - 3} ${y + 4} C${x - rx - 7} ${top - 2} ${x - rx * 0.5} ${top - 8} ${x} ${top - 8} C${x + rx * 0.5} ${top - 8} ${x + rx + 7} ${top - 2} ${x + rx + 3} ${y + 4}
          L${x + rx - 3} ${y + 4} C${x + rx - 3} ${y - 12} ${x + rx - 8} ${hl + 2} ${x + rx - 15} ${hl} C${x + 6} ${hl - 5} ${x - 6} ${hl - 5} ${x - rx + 15} ${hl} C${x - rx + 8} ${hl + 2} ${x - rx + 3} ${y - 12} ${x - rx + 3} ${y + 4} Z" fill="${g}"/>`;
        s += ciocche([`M${x - rx + 12} ${hl} C${x - rx + 4} ${top + 6} ${x - 6} ${top - 6} ${x + 4} ${top - 7}`, `M${x - 6} ${hl - 3} C${x - 8} ${top + 4} ${x + 2} ${top - 4} ${x + 10} ${top - 6}`, `M${x + 8} ${hl - 3} C${x + 10} ${top + 2} ${x + 16} ${top - 2} ${x + 22} ${top - 2}`, `M${x + rx - 12} ${hl} C${x + rx - 6} ${top + 8} ${x + rx} ${top + 10} ${x + rx + 2} ${y - 10}`], cap);
        if (pett === 'treccia') s += `<g fill="${g}" stroke="${scurisci(cap, 0.45)}" stroke-opacity=".5" stroke-width=".8">${[0, 1, 2, 3, 4, 5].map((k) => `<ellipse cx="${x + rx + 4 + k * 1.4 + (k % 2 ? 2.5 : -2.5)}" cy="${y + 6 + k * 10}" rx="6.5" ry="6.2" transform="rotate(${k % 2 ? 28 : -28} ${x + rx + 4 + k * 1.4} ${y + 6 + k * 10})"/>`).join('')}</g><rect x="${x + rx + 5}" y="${y + 64}" width="9" height="4" rx="2" fill="#d8b25a"/><path d="M${x + rx + 6} ${y + 68} q-3 10 2 14 M${x + rx + 10} ${y + 68} q1 10 4 13 M${x + rx + 13} ${y + 68} q4 8 6 11" stroke="${cap}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
        if (pett === 'coda') s += `<rect x="${x + rx - 4}" y="${top + 12}" width="5" height="9" rx="2" fill="#7a2a1a" transform="rotate(-30 ${x + rx - 2} ${top + 16})"/>`;
        return s;
      }
      default: // corti, riga di lato e ciuffo
        return `<path d="M${x - rx - 3} ${y + 4} C${x - rx - 8} ${top - 2} ${x - rx * 0.55} ${top - 11} ${x + 2} ${top - 11} C${x + rx * 0.6} ${top - 11} ${x + rx + 8} ${top - 2} ${x + rx + 3} ${y + 4}
          L${x + rx - 3} ${y + 4} C${x + rx - 4} ${y - 10} ${x + rx - 6} ${hl} ${x + rx - 14} ${hl - 1} C${x + 8} ${hl - 4} ${x - 2} ${hl - 8} ${x - 8} ${hl - 9} C${x - 13} ${hl - 1} ${x - rx + 6} ${hl - 1} ${x - rx + 3} ${y - 8} L${x - rx + 3} ${y + 4} Z" fill="${g}"/>
        ${ciocche([`M${x - 8} ${hl - 9} C${x - 4} ${top - 6} ${x + 14} ${top - 9} ${x + rx} ${top + 6}`, `M${x - 6} ${hl - 6} C${x + 4} ${hl - 12} ${x + 18} ${hl - 10} ${x + rx - 6} ${hl - 2}`, `M${x - 9} ${hl - 8} C${x - 16} ${top - 2} ${x - rx} ${top + 4} ${x - rx - 3} ${y - 6}`], cap)}`;
    }
  }
  function segni(tipo, x, y, rx, ry, col) {
    const ey = y - 4, dx = rx * 0.42;
    if (tipo === 'cicatrice') return `<path d="M${x + dx - 6} ${ey - 18} L${x + dx + 8} ${ey + 16}" stroke="#a04848" stroke-width="2.4" stroke-linecap="round" opacity=".8"/><path d="M${x + dx - 3} ${ey - 10} l5 -2 M${x + dx + 1} ${ey} l5 -2 M${x + dx + 4} ${ey + 9} l5 -2" stroke="#a04848" stroke-width="1.2" opacity=".7"/>`;
    if (tipo === 'tatuaggio') return `<path d="M${x - dx - 14} ${ey + 8} q6 10 2 20 M${x - dx - 8} ${ey + 10} q4 8 0 14 M${x} ${y - ry + 10} l0 10 m-5 -5 l10 0" stroke="#2a4a8a" stroke-width="2" fill="none" opacity=".75"/>`;
    if (tipo === 'lentiggini') return `<g fill="#a0603a" opacity=".55">${Array.from({ length: 14 }, (_, k) => `<circle cx="${x + (k < 7 ? -1 : 1) * (8 + (k % 7) * 3)}" cy="${ey + 10 + ((k * 7) % 5)}" r="1.1"/>`).join('')}</g>`;
    if (tipo === 'benda') return `<path d="M${x - rx - 2} ${y - 20} L${x + rx + 2} ${y + 4}" stroke="#1a1a1a" stroke-width="2.4"/><ellipse cx="${x + dx}" cy="${ey}" rx="10" ry="8" fill="#1a1a1a"/>`;
    if (tipo === 'pitture') return `<path d="M${x - dx - 10} ${ey + 8} l18 -2 M${x - dx - 10} ${ey + 14} l18 -2 M${x + dx - 8} ${ey + 6} l18 2 M${x + dx - 8} ${ey + 12} l18 2" stroke="${col}" stroke-width="3" stroke-linecap="round" opacity=".85"/>`;
    return '';
  }
  // il torso: armatura di piastre, cuoio, pelliccia, veste…
  function corpo(cl, id, { mant, c1 }) {
    const piastre = ['guerriero', 'paladino', 'chierico'].includes(cl);
    if (piastre) {
      const oro = cl === 'paladino' || cl === 'chierico';
      return `<path d="M40 240 C44 204 64 188 100 186 C136 188 156 204 160 240 Z" fill="url(#${id}me)"/>
        <path d="M100 190 L100 240" stroke="#3a404a" stroke-width="2" opacity=".6"/>
        <path d="M54 214 Q100 230 146 214" stroke="#3a404a" stroke-width="2" fill="none" opacity=".5"/>
        <ellipse cx="44" cy="200" rx="30" ry="22" fill="url(#${id}me)" stroke="#2a2e36" stroke-width="2"/><ellipse cx="156" cy="200" rx="30" ry="22" fill="url(#${id}me)" stroke="#2a2e36" stroke-width="2"/>
        <path d="M18 204 Q44 186 70 204 M130 204 Q156 186 182 204" stroke="${oro ? '#d8b25a' : '#2a2e36'}" stroke-width="3" fill="none"/>
        ${[34, 54, 146, 166].map((x) => `<circle cx="${x}" cy="196" r="2.2" fill="#e8ecf2"/>`).join('')}
        ${oro ? `<g transform="translate(86 200) scale(.28)" style="color:#d8b25a">${EMBLEMI[cl]}</g>` : ''}`;
    }
    if (cl === 'barbaro') return `<path d="M30 240 C34 200 60 186 100 186 C140 186 166 200 170 240 Z" fill="${'#b07a52'}"/>
      <path d="M14 214 C26 186 58 176 74 188 C62 196 50 206 44 222 Z M186 214 C174 186 142 176 126 188 C138 196 150 206 156 222 Z" fill="#6a4a2a"/>
      <g stroke="#3a2a14" stroke-width="2" opacity=".6">${Array.from({ length: 10 }, (_, k) => `<path d="M${22 + k * 6} ${200 + (k % 3) * 4} l-3 10"/><path d="M${178 - k * 6} ${200 + (k % 3) * 4} l3 10"/>`).join('')}</g>
      <path d="M60 196 L140 236" stroke="#4a2e16" stroke-width="9"/><circle cx="100" cy="216" r="5" fill="#c0c0c0"/>`;
    if (['ranger', 'ladro', 'druido'].includes(cl)) {
      const verde = cl === 'ranger' ? '#3a5a2a' : cl === 'druido' ? '#4a6a2a' : '#2a2a30';
      return `<path d="M36 240 C40 202 62 188 100 186 C138 188 160 202 164 240 Z" fill="url(#${id}cu)"/>
        <path d="M30 210 C36 192 64 182 100 180 C136 182 164 192 170 210 C150 200 124 196 100 198 C76 196 50 200 30 210 Z" fill="${verde}"/>
        <path d="M70 196 L120 240" stroke="#2a1a0a" stroke-width="6"/><rect x="86" y="214" width="12" height="10" rx="2" fill="#c8a050"/>
        <g stroke="#2a1a0a" stroke-width="1.2" opacity=".5">${[112, 124, 136, 148].map((y2) => `<path d="M${60} ${y2 + 60} l80 0"/>`).join('')}</g>`;
    }
    if (cl === 'monaco') return `<path d="M36 240 C40 202 62 188 100 186 C138 188 160 202 164 240 Z" fill="#d08a3a"/>
      <path d="M70 188 L130 240 M130 188 L92 222" stroke="#a0581a" stroke-width="8" fill="none"/><path d="M40 226 Q100 236 160 226" stroke="#5a2e08" stroke-width="7" fill="none"/>
      <g fill="#6a3a1a">${Array.from({ length: 9 }, (_, k) => `<circle cx="${70 + k * 7.5}" cy="${196 + Math.sin(k / 8 * Math.PI) * 14}" r="3.4"/>`).join('')}</g>`;
    // vesti dei maghi, stregoni, warlock, bardi
    const veste = cl === 'bardo' ? '#8a3a8a' : cl === 'warlock' ? '#2a1a3a' : cl === 'stregone' ? '#7a1a1a' : '#1e2a6a';
    return `<path d="M34 240 C38 200 62 186 100 184 C138 186 162 200 166 240 Z" fill="${veste}"/>
      <path d="M100 186 L100 240" stroke="${c1}" stroke-width="7"/><path d="M100 186 L100 240" stroke="#d8b25a" stroke-width="1.5" stroke-dasharray="3 4"/>
      <path d="M34 240 C38 200 62 186 100 184 C138 186 162 200 166 240" fill="none" stroke="#d8b25a" stroke-width="2.5" opacity=".7"/>
      ${cl === 'bardo' ? '<path d="M60 200 l12 8 l-4 8 Z M140 200 l-12 8 l4 8 Z" fill="#e8c860"/>' : ''}`;
  }
  function colletto(cl, x, y, id, mant) {
    if (['mago', 'stregone', 'warlock'].includes(cl)) return `<path d="M${x - 30} ${y + 2} L${x - 16} ${y - 18} L${x} ${y + 4} L${x + 16} ${y - 18} L${x + 30} ${y + 2} Z" fill="${scurisci(mant, 0.7)}" stroke="#d8b25a" stroke-width="1.4"/>`;
    if (cl === 'chierico') return `<path d="M${x - 8} ${y - 4} L${x} ${y + 14} L${x + 8} ${y - 4}" stroke="#d8b25a" stroke-width="1.6" fill="none"/><circle cx="${x}" cy="${y + 18}" r="6" fill="#e8c860" stroke="#7a5a10"/><path d="M${x} ${y + 13} v10 M${x - 5} ${y + 18} h10" stroke="#7a5a10" stroke-width="1.6"/>`;
    return '';
  }
  function armaDietro(cl, id) {
    switch (cl) {
      case 'guerriero': case 'paladino': return `<g transform="rotate(-24 150 120)"><rect x="146" y="20" width="9" height="140" rx="2" fill="url(#${id}me)" stroke="#2a2e36"/><rect x="132" y="150" width="37" height="8" rx="3" fill="#7a5a2a"/><rect x="146" y="158" width="9" height="30" fill="#4a2e16"/><circle cx="150.5" cy="192" r="6" fill="#d8b25a"/></g>`;
      case 'barbaro': return `<g transform="rotate(-28 150 110)"><rect x="147" y="30" width="7" height="160" rx="3" fill="#5a3a1a"/><path d="M150 36 C178 30 190 54 184 76 C170 66 160 62 150 60 Z" fill="url(#${id}me)" stroke="#2a2e36"/><path d="M150 36 C126 30 114 54 120 76 C134 66 144 62 150 60 Z" fill="url(#${id}me)" stroke="#2a2e36"/></g>`;
      case 'ranger': return `<g transform="rotate(18 60 120)"><path d="M44 20 C90 60 90 170 44 210" fill="none" stroke="#6a4020" stroke-width="7"/><path d="M44 20 L44 210" stroke="#ddd" stroke-width="1"/></g><g transform="rotate(-18 150 120)"><rect x="140" y="40" width="18" height="70" rx="4" fill="#5a3a1a"/>${[0, 1, 2, 3].map((k) => `<path d="M${143 + k * 4} 40 l0 -18 m-3 0 l3 -6 l3 6" stroke="#ccc" stroke-width="1.5" fill="#c84a3a"/>`).join('')}</g>`;
      case 'mago': case 'druido': {
        const gemma = cl === 'mago' ? '#6ab8ff' : '#7ae07a';
        return `<g transform="rotate(10 160 120)"><rect x="156" y="20" width="8" height="200" rx="3" fill="#5a3a1a"/>${cl === 'druido' ? '<path d="M160 22 C140 10 136 -4 150 -10 C152 6 162 8 160 22 Z M160 22 C180 14 188 0 176 -8 C172 8 162 10 160 22Z" fill="#3a7a2a"/>' : '<path d="M152 24 C152 8 168 8 168 24" stroke="#c8a050" stroke-width="3" fill="none"/>'}<circle cx="160" cy="18" r="9" fill="${gemma}"/><circle cx="160" cy="18" r="16" fill="${gemma}" opacity=".25"/><circle cx="157" cy="15" r="3" fill="#fff" opacity=".8"/></g>`;
      }
      case 'bardo': return `<g transform="rotate(-30 150 110)"><rect x="146" y="20" width="8" height="90" fill="#6a3a1a"/><ellipse cx="150" cy="130" rx="24" ry="30" fill="#b06a2a" stroke="#4a2a0a" stroke-width="2"/><circle cx="150" cy="128" r="7" fill="#2a1a0a"/>${[0, 1, 2, 3].map((k) => `<path d="M${144 + k * 4} 20 L${144 + k * 4} 150" stroke="#eee" stroke-width=".7"/>`).join('')}</g>`;
      case 'ladro': return `<g transform="rotate(-36 156 130)"><path d="M152 60 L160 60 L158 140 L154 140 Z" fill="url(#${id}me)"/><rect x="146" y="138" width="20" height="6" fill="#3a2a1a"/><rect x="152" y="144" width="8" height="20" fill="#2a1a0a"/></g><g transform="rotate(36 44 130)"><path d="M40 60 L48 60 L46 140 L42 140 Z" fill="url(#${id}me)"/><rect x="34" y="138" width="20" height="6" fill="#3a2a1a"/><rect x="40" y="144" width="8" height="20" fill="#2a1a0a"/></g>`;
      case 'stregone': return `<circle cx="160" cy="70" r="22" fill="#ff7a3a" opacity=".25"/><circle cx="160" cy="70" r="12" fill="#ffb060"/><path d="M160 52 C150 62 154 72 160 76 C166 72 170 62 160 52 Z" fill="#fff4c0"/>`;
      case 'warlock': return `<g opacity=".9"><circle cx="40" cy="70" r="24" fill="#8a3aff" opacity=".18"/><path d="M22 70 C30 58 50 58 58 70 C50 82 30 82 22 70 Z" fill="#b080ff"/><circle cx="40" cy="70" r="6" fill="#1a0a2a"/></g>`;
      case 'chierico': return `<g transform="rotate(-22 152 120)"><rect x="148" y="40" width="8" height="140" rx="2" fill="#5a3a1a"/><rect x="138" y="26" width="28" height="30" rx="6" fill="url(#${id}me)" stroke="#2a2e36"/>${[0, 1, 2].map((k) => `<rect x="${137 + k * 11}" y="22" width="6" height="38" rx="2" fill="url(#${id}me)"/>`).join('')}</g>`;
      case 'monaco': return '';
      default: return '';
    }
  }
  function accessori(cl, x, y, rx, ry, id, { pett, drago }) {
    if (cl === 'druido') return `<g fill="#3a7a2a">${Array.from({ length: 7 }, (_, k) => { const a = Math.PI * (1.15 + k * 0.12); return `<path transform="translate(${x + Math.cos(a) * (rx + 2)} ${y - 8 + Math.sin(a) * (ry + 2)}) rotate(${(a * 180) / Math.PI + 90})" d="M0 0 C-5 -6 -5 -12 0 -16 C5 -12 5 -6 0 0 Z"/>`; }).join('')}</g><g fill="#c83a3a">${[0, 1].map((k) => `<circle cx="${x - 18 + k * 36}" cy="${y - ry + 4}" r="2.6"/>`).join('')}</g>`;
    if (cl === 'stregone') return `<path d="M${x - rx + 2} ${y - ry + 14} Q${x} ${y - ry + 2} ${x + rx - 2} ${y - ry + 14}" stroke="#d8b25a" stroke-width="3" fill="none"/><path d="M${x} ${y - ry + 4} l-5 6 l5 6 l5 -6 Z" fill="#e04040" stroke="#d8b25a"/>`;
    if (cl === 'monaco') return pett === 'calvo' ? `<g fill="#3a2a1a" opacity=".7">${[0, 1, 2].map((k) => `<circle cx="${x - 8 + k * 8}" cy="${y - ry + 14}" r="1.5"/>`).join('')}</g>` : `<path d="M${x - rx - 2} ${y - ry + 18} Q${x} ${y - ry + 8} ${x + rx + 2} ${y - ry + 18}" stroke="#c83a2a" stroke-width="5" fill="none"/><path d="M${x + rx} ${y - ry + 18} l10 12 m-6 -10 l4 14" stroke="#c83a2a" stroke-width="3"/>`;
    if (cl === 'ranger') return `<path d="M${x - rx - 22} ${y + ry + 30} C${x - rx - 30} ${y + ry} ${x - rx - 10} ${y + ry - 2} ${x - rx + 8} ${y + ry + 12} M${x + rx + 22} ${y + ry + 30} C${x + rx + 30} ${y + ry} ${x + rx + 10} ${y + ry - 2} ${x + rx - 8} ${y + ry + 12}" stroke="#2a4a1a" stroke-width="10" fill="none" stroke-linecap="round"/>`;
    if (cl === 'paladino' && !drago) return `<path d="M${x - rx + 6} ${y - ry + 12} Q${x} ${y - ry - 2} ${x + rx - 6} ${y - ry + 12}" stroke="#e8c860" stroke-width="2.4" fill="none" opacity=".9"/>`;
    return '';
  }

  // ---------- ICONE DEI LUOGHI (mappa del mondo) ----------
  const ICONE_LUOGO = {
    villaggio: '<path d="M-9 4 L-9 -3 L-5 -7 L-1 -3 L-1 4 Z M1 4 L1 -1 L5 -5 L9 -1 L9 4 Z" fill="#7a4a2a" stroke="#2a1a0a"/><path d="M-10 -3 L-5 -8 L0 -3 M0 -1 L5 -6 L10 -1" stroke="#a03a2a" stroke-width="2" fill="none"/>',
    citta: '<path d="M-11 6 L-11 -4 L-7 -4 L-7 -9 L-3 -9 L-3 -2 L1 -2 L1 -12 L5 -12 L5 -2 L9 -2 L9 6 Z" fill="#8a7a6a" stroke="#2a1a0a"/><path d="M1 -12 L3 -16 L5 -12" fill="#a03a2a"/>',
    porto: '<path d="M-10 2 L10 2 L7 7 L-7 7 Z" fill="#6a4a2a" stroke="#2a1a0a"/><path d="M0 2 L0 -12 M0 -12 L8 -3 L0 -3" stroke="#2a1a0a" fill="#e8e0c8"/>',
    taverna: '<path d="M-8 6 L-8 -4 L0 -10 L8 -4 L8 6 Z" fill="#8a5a2a" stroke="#2a1a0a"/><rect x="-3" y="0" width="6" height="6" fill="#2a1a0a"/><circle cx="7" cy="-6" r="3" fill="#e8b030" stroke="#2a1a0a"/>',
    castello: '<path d="M-11 7 L-11 -6 L-8 -6 L-8 -3 L-5 -3 L-5 -6 L-2 -6 L-2 -3 L2 -3 L2 -6 L5 -6 L5 -3 L8 -3 L8 -6 L11 -6 L11 7 Z" fill="#8a8a90" stroke="#2a2a2a"/><path d="M-2 7 L-2 2 Q0 -1 2 2 L2 7" fill="#2a1a0a"/><path d="M0 -6 L0 -14 L6 -11 L0 -9" stroke="#2a2a2a" fill="#c03030"/>',
    torre: '<path d="M-5 8 L-4 -8 L4 -8 L5 8 Z" fill="#7a7a80" stroke="#2a2a2a"/><path d="M-6 -8 L0 -15 L6 -8 Z" fill="#4a3a6a" stroke="#2a2a2a"/><rect x="-1.5" y="-4" width="3" height="4" fill="#ffd060"/>',
    tempio: '<path d="M-10 7 L10 7 L10 5 L-10 5 Z M-9 5 L-9 -3 M-4 5 L-4 -3 M1 5 L1 -3 M6 5 L6 -3" stroke="#8a8070" stroke-width="2" fill="#d8d0c0"/><path d="M-11 -3 L0 -10 L11 -3 Z" fill="#d8d0c0" stroke="#5a5040"/>',
    rovine: '<path d="M-9 7 L-9 -2 L-6 -5 L-6 7 M-2 7 L-2 -8 L1 -8 L1 0 M5 7 L5 1 L9 -1 L9 7" stroke="#7a7060" stroke-width="2.4" fill="none"/><path d="M-11 7 L11 7" stroke="#5a5040" stroke-width="2"/>',
    dungeon: '<path d="M-10 6 Q-10 -9 0 -9 Q10 -9 10 6 Z" fill="#4a4040" stroke="#1a1010"/><path d="M-5 6 Q-5 -3 0 -3 Q5 -3 5 6 Z" fill="#100808"/><circle cx="-1.5" cy="-6" r="1" fill="#e04040"/><circle cx="1.5" cy="-6" r="1" fill="#e04040"/>',
    grotta: '<path d="M-12 7 Q-8 -10 0 -10 Q8 -10 12 7 Z" fill="#6a6058" stroke="#2a2420"/><path d="M-5 7 Q-4 -2 0 -3 Q4 -2 5 7 Z" fill="#100808"/>',
    cripta: '<path d="M-6 8 L-6 -4 Q0 -10 6 -4 L6 8 Z" fill="#7a7a80" stroke="#2a2a2a"/><path d="M0 -3 L0 5 M-3 0 L3 0" stroke="#2a2a2a" stroke-width="2"/>',
    foresta: '<path d="M-7 6 L-2 -9 L3 6 Z M1 7 L6 -5 L11 7 Z M-12 7 L-8 -3 L-4 7 Z" fill="#2a5a2a" stroke="#0e2a0e"/>',
    montagna: '<path d="M-12 7 L-3 -11 L6 7 Z" fill="#7a6a5a" stroke="#2a2018"/><path d="M-3 -11 L-6 -5 L-3 -6 L0 -4 Z" fill="#fff"/><path d="M1 7 L7 -4 L13 7 Z" fill="#6a5a4a" stroke="#2a2018"/>',
    palude: '<path d="M-10 4 Q-5 1 0 4 Q5 7 10 4" stroke="#3a5a4a" stroke-width="2" fill="none"/><path d="M-6 3 L-6 -6 M-4 3 L-3 -8 M4 4 L4 -5 M6 4 L7 -7" stroke="#4a6a2a" stroke-width="1.6"/>',
    deserto: '<path d="M-12 6 Q-4 -4 4 6 Z M0 6 Q6 0 12 6 Z" fill="#d8b070" stroke="#7a5a2a"/><circle cx="6" cy="-6" r="3" fill="#f0c040"/>',
    accampamento: '<path d="M-9 6 L0 -9 L9 6 Z" fill="#a08050" stroke="#3a2a14"/><path d="M0 -9 L0 6 M-3 6 L0 0 L3 6" stroke="#3a2a14" fill="#3a2a14"/>',
    ponte: '<path d="M-12 4 Q0 -8 12 4" stroke="#6a4a2a" stroke-width="3" fill="none"/><path d="M-8 1 L-8 6 M-3 -2 L-3 6 M3 -2 L3 6 M8 1 L8 6" stroke="#6a4a2a" stroke-width="1.6"/>',
    miniera: '<path d="M-9 7 L-9 -5 L9 -5 L9 7" stroke="#5a3a1a" stroke-width="3" fill="#100808"/><path d="M-6 -2 L4 -12 M2 -12 L8 -8" stroke="#8a8a90" stroke-width="2.4"/>',
    fattoria: '<path d="M-8 6 L-8 -3 L0 -9 L8 -3 L8 6 Z" fill="#b03a2a" stroke="#3a1a0a"/><path d="M-3 6 L-3 0 L3 0 L3 6" fill="#e8d8b0"/>',
    lago: '<ellipse cx="0" cy="1" rx="10" ry="6" fill="#4a7ab0" stroke="#1a3a6a"/><path d="M-5 0 q2 -2 4 0 M1 3 q2 -2 4 0" stroke="#bcd8f0" fill="none"/>',
    altro: '<circle cx="0" cy="0" r="6" fill="#d8b25a" stroke="#3a2a0a" stroke-width="1.5"/><circle cx="0" cy="0" r="2" fill="#3a2a0a"/>',
  };
  const iconaLuogo = (tipo) => ICONE_LUOGO[tipo] || ICONE_LUOGO.altro;

  // ---------- IL d20 ----------
  function d20(valore, { colore = '#c8343a', dim = 90, animato = false } = {}) {
    const id = uid();
    return `<svg class="dr-d20 ${animato ? 'gira' : ''}" viewBox="0 0 100 100" width="${dim}" height="${dim}" aria-label="d20: ${valore}">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${scurisci(colore, 1.35)}"/><stop offset="1" stop-color="${scurisci(colore, 0.6)}"/></linearGradient></defs>
      <polygon points="50,4 92,28 92,72 50,96 8,72 8,28" fill="url(#${id})" stroke="#1a0606" stroke-width="2.5" stroke-linejoin="round"/>
      <polygon points="50,22 76,64 24,64" fill="${scurisci(colore, 1.15)}" stroke="#1a0606" stroke-width="1.6" stroke-linejoin="round" opacity=".95"/>
      <path d="M50 4 L50 22 M92 28 L76 64 M8 28 L24 64 M50 96 L24 64 M50 96 L76 64 M8 72 L24 64 M92 72 L76 64 M8 28 L50 22 L92 28" stroke="#1a0606" stroke-width="1.4" fill="none" opacity=".7"/>
      <text x="50" y="${String(valore).length > 1 ? 56 : 57}" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="${String(valore).length > 1 ? 20 : 24}" fill="#fff8e8" stroke="#1a0606" stroke-width=".6">${valore}</text></svg>`;
  }

  window.DraghiArte = { ritratto, emblema, EMBLEMI, COLORE_CLASSE, DRAGO_COL, iconaLuogo, ICONE_LUOGO, d20, scurisci };
})();
