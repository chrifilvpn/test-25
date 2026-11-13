// DOVE SI TROVA IL MONUMENTO: i disegni dei monumenti più famosi, fatti a codice (SVG) al posto dell'emoji generica.
// Chiave = nome del monumento come in giochi2/monumenti-dati.js; chi non è qui continua a mostrare la sua emoji.
(function () {
  const cielo = (a, b) => `<defs><linearGradient id="mo-c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="120" height="120" rx="14" fill="url(#mo-c)"/>`;
  const GIORNO = cielo('#7fc4ee', '#d9f0fb'), TRAMONTO = cielo('#f6a35c', '#fde3b0'), NOTTE = cielo('#1b2a55', '#5a6fb0'), ALBA = cielo('#f3b6c4', '#fdebd2');
  const prato = (c = '#6aa84f', y = 98) => `<rect x="0" y="${y}" width="120" height="${120 - y}" fill="${c}"/>`;
  const sole = (x, y, c = '#fff3b0') => `<circle cx="${x}" cy="${y}" r="9" fill="${c}"/>`;
  const nuvola = (x, y) => `<g fill="#fff" opacity=".85"><ellipse cx="${x}" cy="${y}" rx="11" ry="5"/><ellipse cx="${x + 8}" cy="${y - 3}" rx="8" ry="5"/></g>`;
  const D = {
    'Torre Eiffel': `${TRAMONTO}${sole(92, 26)}${prato('#5d8f48', 104)}
      <g fill="none" stroke="#4a3a2c" stroke-linecap="round" stroke-linejoin="round">
        <path d="M60 12 L60 30 M56 30 L64 30 M54 30 Q52 58 44 76 M66 30 Q68 58 76 76 M44 76 Q36 94 26 106 M76 76 Q84 94 94 106" stroke-width="3.2"/>
        <path d="M48 52 L72 52 M40 76 L80 76 M52 106 Q60 84 68 106" stroke-width="3"/>
        <path d="M54 34 L66 44 M66 34 L54 44 M51 56 L69 70 M69 56 L51 70 M42 80 L54 98 M78 80 L66 98 M34 98 L48 84 M86 98 L72 84" stroke-width="1.3"/>
      </g><rect x="58.5" y="6" width="3" height="8" fill="#4a3a2c"/>`,
    'Colosseo': `${GIORNO}${nuvola(24, 24)}${prato('#c9b27a', 100)}
      <path d="M10 100 L10 58 Q10 46 22 44 L64 38 L64 26 L104 30 Q110 31 110 38 L110 100 Z" fill="#d9c39a" stroke="#8a6f45" stroke-width="2" stroke-linejoin="round"/>
      <path d="M10 62 L110 62 M10 80 L110 80 M64 44 L110 46" stroke="#8a6f45" stroke-width="1.6"/>
      <g fill="#5b4630">${[16, 30, 44, 58, 72, 86, 98].map((x) => `<path d="M${x} 100 v-12 a4.5 4.5 0 0 1 9 0 v12 z"/><path d="M${x} 78 v-9 a4.5 4.5 0 0 1 9 0 v9 z"/>`).join('')}
      ${[70, 84, 97].map((x) => `<path d="M${x} 60 v-8 a4 4 0 0 1 8 0 v8 z"/>`).join('')}${[70, 84, 97].map((x) => `<rect x="${x + 1}" y="35" width="5" height="6"/>`).join('')}</g>`,
    'Statua della Libertà': `${GIORNO}${nuvola(88, 30)}<rect y="104" width="120" height="16" fill="#3d7fb5"/>
      <path d="M44 106 L48 82 L72 82 L76 106 Z" fill="#b9a98c" stroke="#7d6e55" stroke-width="1.5"/><rect x="40" y="104" width="40" height="6" fill="#9a8a6e"/>
      <g fill="#6fb9a3" stroke="#3f8873" stroke-width="1.5" stroke-linejoin="round">
        <path d="M50 82 L53 50 Q60 44 67 50 L71 82 Z"/><path d="M53 54 L44 30 L48 28 L58 50 Z"/><circle cx="60" cy="42" r="6.5"/>
        <path d="M54 37 L50 30 M57 35 L56 27 M60 34.5 L60 26 M63 35 L64 27 M66 37 L70 30" fill="none" stroke-linecap="round"/><rect x="63" y="58" width="9" height="12" rx="1"/>
      </g><path d="M46 29 Q42 20 46 14 Q50 20 46 29 Z" fill="#ffd257" stroke="#e09a1e" stroke-width="1"/>`,
    'Big Ben': `${ALBA}${nuvola(24, 30)}<rect y="102" width="120" height="18" fill="#56708f"/>
      <g stroke="#6a4d2a" stroke-width="1.5" stroke-linejoin="round"><rect x="46" y="38" width="28" height="68" fill="#d8b877"/><rect x="43" y="36" width="34" height="26" fill="#c9a55f"/>
      <path d="M43 36 L60 6 L77 36 Z" fill="#5d6b78"/><rect x="8" y="78" width="38" height="28" fill="#cfae6d"/><rect x="74" y="84" width="38" height="22" fill="#cfae6d"/></g>
      <circle cx="60" cy="49" r="9.5" fill="#fffaf0" stroke="#3b2c18" stroke-width="1.8"/><path d="M60 49 L60 42.5 M60 49 L65 51" stroke="#3b2c18" stroke-width="1.6" stroke-linecap="round"/>
      <g stroke="#8a6a3a" stroke-width="1.2">${[52, 60, 68].map((x) => `<path d="M${x} 66 V102"/>`).join('')}${[14, 22, 30, 38, 82, 90, 98, 106].map((x) => `<path d="M${x} 88 V102"/>`).join('')}</g>`,
    'Torre di Pisa': `${GIORNO}${sole(22, 24)}${prato('#7db55a', 100)}
      <g transform="rotate(7 60 102)"><rect x="44" y="24" width="32" height="78" rx="2" fill="#f4efe2" stroke="#9c937f" stroke-width="1.8"/><rect x="48" y="14" width="24" height="12" rx="2" fill="#f4efe2" stroke="#9c937f" stroke-width="1.8"/>
      <g stroke="#9c937f" stroke-width="1.4">${[36, 48, 60, 72, 84].map((y) => `<path d="M44 ${y} H76"/>`).join('')}</g>
      <g fill="#8d8572">${[26, 38, 50, 62, 74, 88].map((y) => [48, 55, 62, 69].map((x) => `<path d="M${x} ${y + 9} v-5 a1.6 1.6 0 0 1 3.2 0 v5 z"/>`).join('')).join('')}</g></g>`,
    'Taj Mahal': `${ALBA}<rect y="96" width="120" height="24" fill="#7fb8c9"/>
      <g fill="#fbf7ef" stroke="#b9ab94" stroke-width="1.6" stroke-linejoin="round"><rect x="12" y="50" width="6" height="48"/><rect x="102" y="50" width="6" height="48"/><path d="M10 50 Q15 42 20 50 Z M100 50 Q105 42 110 50 Z"/>
      <rect x="30" y="62" width="60" height="36"/><path d="M44 62 Q40 40 60 28 Q80 40 76 62 Z"/><path d="M30 62 Q30 52 37 50 Q44 52 44 62 Z M76 62 Q76 52 83 50 Q90 52 90 62 Z"/></g>
      <path d="M60 28 V18" stroke="#b9ab94" stroke-width="1.6"/><path d="M53 98 V80 Q60 70 67 80 V98 Z" fill="#8c7f6a"/><g fill="#b9ab94"><rect x="36" y="74" width="7" height="14" rx="3.5"/><rect x="77" y="74" width="7" height="14" rx="3.5"/></g>
      <rect x="24" y="96" width="72" height="4" fill="#e6dccb"/>`,
    'Piramidi di Giza': `${TRAMONTO}${sole(88, 30, '#fff0a0')}<rect y="92" width="120" height="28" fill="#e2bd72"/>
      <path d="M16 96 L56 34 L96 96 Z" fill="#d9a955"/><path d="M56 34 L96 96 L70 96 Z" fill="#b98739"/>
      <path d="M68 100 L92 62 L116 100 Z" fill="#e3b866"/><path d="M92 62 L116 100 L100 100 Z" fill="#c2934a"/>
      <path d="M2 100 L20 72 L38 100 Z" fill="#e9c47a"/><path d="M20 72 L38 100 L27 100 Z" fill="#c99d52"/>
      <path d="M0 106 Q30 100 60 106 T120 104 V120 H0 Z" fill="#d1a85c"/>`,
    'Grande Muraglia': `${GIORNO}${nuvola(86, 22)}<path d="M0 70 Q30 40 60 62 T120 48 V120 H0 Z" fill="#5f9a52"/><path d="M0 92 Q40 70 70 88 T120 80 V120 H0 Z" fill="#4c8243"/>
      <path d="M0 80 Q28 54 54 68 Q84 84 120 56" fill="none" stroke="#b9a78a" stroke-width="9" stroke-linecap="round"/>
      <path d="M0 80 Q28 54 54 68 Q84 84 120 56" fill="none" stroke="#8d7d63" stroke-width="9" stroke-dasharray="1.5 5" stroke-linecap="butt" opacity=".55"/>
      <g fill="#c9b899" stroke="#7d6e55" stroke-width="1.5"><rect x="44" y="48" width="18" height="24"/><path d="M42 48 h4 v-5 h4 v5 h4 v-5 h4 v5 h4 v-5 h2 v5 z"/><rect x="96" y="40" width="14" height="20"/><path d="M94 40 h4 v-4 h4 v4 h4 v-4 h4 v4 z"/></g>
      <rect x="50" y="58" width="6" height="8" fill="#5b4c38"/>`,
    'Opera House': `${GIORNO}${sole(22, 22)}<rect y="92" width="120" height="28" fill="#2f78b7"/><path d="M0 100 Q20 96 40 100 T80 100 T120 100" fill="none" stroke="#7fb8e6" stroke-width="2"/>
      <rect x="14" y="86" width="92" height="8" rx="2" fill="#c9b08a"/>
      <g fill="#fdfdf8" stroke="#9aa3ab" stroke-width="1.6" stroke-linejoin="round"><path d="M22 86 Q26 54 52 44 Q46 66 48 86 Z"/><path d="M40 86 Q46 46 76 34 Q66 62 68 86 Z"/><path d="M62 86 Q68 58 92 50 Q84 70 86 86 Z"/><path d="M82 86 Q86 68 102 64 Q97 76 98 86 Z"/></g>`,
    'Golden Gate': `${ALBA}<path d="M0 84 Q30 66 60 80 T120 72 V120 H0 Z" fill="#c8d6c0" opacity=".8"/><rect y="94" width="120" height="26" fill="#3f86b5"/>
      <g stroke="#c8442b" fill="none" stroke-linecap="round"><path d="M0 44 Q20 74 34 26 Q60 86 86 26 Q100 74 120 44" stroke-width="2.2"/><path d="M0 80 H120" stroke-width="4"/>
      <g stroke-width="1">${[10, 18, 26, 42, 50, 58, 62, 70, 78, 94, 102, 110].map((x) => `<path d="M${x} 80 V${x < 34 ? 44 + (34 - x) * 0.7 : x > 86 ? 44 + (x - 86) * 0.7 : 36 + Math.abs(60 - x) * 1.1 + 20}"/>`).join('')}</g></g>
      <g fill="#c8442b"><rect x="30" y="22" width="8" height="78"/><rect x="82" y="22" width="8" height="78"/></g><g fill="#fde3d6"><rect x="32" y="34" width="4" height="8"/><rect x="32" y="50" width="4" height="8"/><rect x="84" y="34" width="4" height="8"/><rect x="84" y="50" width="4" height="8"/></g>`,
    'Monte Fuji': `${ALBA}${sole(90, 28, '#f4737a')}<path d="M4 100 L48 34 Q60 28 72 34 L116 100 Z" fill="#5b79a8"/>
      <path d="M48 34 Q60 28 72 34 L84 52 L76 47 L70 56 L62 46 L55 57 L48 48 L38 52 Z" fill="#fdfdfd"/><path d="M0 96 Q40 86 70 96 T120 94 V120 H0 Z" fill="#4f8a5a"/>
      <g fill="#f29bb5"><circle cx="16" cy="92" r="7"/><circle cx="26" cy="88" r="6"/><circle cx="104" cy="92" r="7"/></g><path d="M16 96 V106 M104 96 V106" stroke="#6b4a3a" stroke-width="2"/>`,
    'Burj Khalifa': `${NOTTE}<g fill="#fff" opacity=".8"><circle cx="20" cy="20" r="1.2"/><circle cx="96" cy="14" r="1"/><circle cx="84" cy="36" r="1.1"/><circle cx="30" cy="44" r="1"/></g><rect y="104" width="120" height="16" fill="#27314f"/>
      <g fill="#1f2a48">${[[6, 78, 12], [20, 86, 10], [88, 82, 12], [102, 90, 10], [32, 92, 8], [78, 94, 8]].map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="${106 - y}"/>`).join('')}</g>
      <path d="M59 6 L61 6 L62 30 L65 32 L66 54 L69 56 L70 78 L73 80 L74 106 L46 106 L47 80 L50 78 L51 56 L54 54 L55 32 L58 30 Z" fill="#b9d3ea" stroke="#5f85a8" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M60 10 V106 M54 60 V106 M66 60 V106" stroke="#5f85a8" stroke-width="1"/><g fill="#ffe08a" opacity=".85">${[[10, 84], [10, 92], [24, 92], [92, 88], [92, 96], [105, 96]].map(([x, y]) => `<rect x="${x}" y="${y}" width="3" height="3"/>`).join('')}</g>`,
    'Partenone': `${GIORNO}${nuvola(26, 22)}<path d="M0 96 Q60 84 120 96 V120 H0 Z" fill="#b9a98a"/>
      <g fill="#f3ecdc" stroke="#a89878" stroke-width="1.6" stroke-linejoin="round"><path d="M14 46 L60 24 L106 46 Z"/><rect x="14" y="46" width="92" height="8"/><rect x="10" y="92" width="100" height="6"/>
      ${[18, 31, 44, 57, 70, 83, 96].map((x) => `<rect x="${x}" y="54" width="7" height="38"/>`).join('')}</g>
      <g stroke="#c9bb9d" stroke-width="1">${[18, 31, 44, 57, 70, 83, 96].map((x) => `<path d="M${x + 3.5} 56 V90"/>`).join('')}</g>`,
    'Cristo Redentore': `${TRAMONTO}${sole(90, 34, '#fff0a0')}<path d="M0 120 L0 96 Q30 70 52 78 L60 70 L68 78 Q92 72 120 98 V120 Z" fill="#3f7a4c"/>
      <g fill="#f1ece1" stroke="#a79f8e" stroke-width="1.5" stroke-linejoin="round"><rect x="53" y="66" width="14" height="8"/><path d="M55 66 L56 36 L64 36 L65 66 Z"/><path d="M22 34 L56 32 L56 40 L24 41 Z M98 34 L64 32 L64 40 L96 41 Z"/><circle cx="60" cy="27" r="5.5"/></g>`,
  };
  window.MonumentiArte = {
    // dalla domanda «Dove si trova: Colosseo?» al disegno (o null: resta l'emoji)
    di(testo) { const m = /:\s*(.+?)\?\s*$/.exec(String(testo || '')); return m && Object.prototype.hasOwnProperty.call(D, m[1]) ? `<svg viewBox="0 0 120 120" role="img" aria-hidden="true">${D[m[1]]}</svg>` : null; },
    nomi: Object.keys(D),
  };
})();
