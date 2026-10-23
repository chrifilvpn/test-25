// DISPENSE — Storia (il Novecento, classe 5ª): gli argomenti, ognuno con la sua pagina.
// Usa gli aiuti di boss-pagina.js (nota, figura, tabella…) e alcuni schemi SVG propri: linee del tempo, mappe concettuali,
// grafici a barre e cartine schematiche (non in scala).
(() => {
  const { nota, figura, tabella, esc } = window.BossAiuti;
  const FONT = 'font-family="Segoe UI, Roboto, Arial, sans-serif"';
  // spezza un testo in righe di al massimo n caratteri (per i testi dentro gli SVG)
  const avvolgi = (t, n) => {
    const r = []; let l = '';
    for (const p of String(t).split(' ')) { if (l && `${l} ${p}`.length > n) { r.push(l); l = p; } else l = l ? `${l} ${p}` : p; }
    if (l) r.push(l);
    return r;
  };
  // linea del tempo verticale: eventi [anno, testo, evidenziato?]
  function lineaTempo(eventi, etichetta) {
    let y = 22; const righe = [];
    for (const [anno, testo, ev] of eventi) { const ll = avvolgi(testo, 48); righe.push({ anno, ll, y, ev }); y += ll.length * 21 + 16; }
    const H = y + 2;
    return `<svg class="st-alto" viewBox="0 0 540 ${H}" role="img" aria-label="${esc(etichetta)}"><g ${FONT} font-size="15" fill="#1f2d3d">
      <line x1="96" y1="12" x2="96" y2="${H - 8}" stroke="#b7c6d6" stroke-width="3"/>
      ${righe.map((r) => `<circle cx="96" cy="${r.y + 5}" r="7" fill="${r.ev ? '#c5483c' : '#1a5fb4'}" stroke="#fff" stroke-width="2"/>
        <text x="80" y="${r.y + 10}" text-anchor="end" font-weight="700" fill="${r.ev ? '#a3302a' : '#16365f'}">${esc(r.anno)}</text>
        ${r.ll.map((l, i) => `<text x="114" y="${r.y + 10 + i * 21}">${esc(l)}</text>`).join('')}`).join('')}
    </g></svg>`;
  }
  // mappa concettuale: un concetto al centro in alto e i rami [titolo, descrizione] su due colonne, collegati da un tronco
  const COLORI = [['#eef5fe', '#1a5fb4'], ['#e8f5ee', '#3f9b6b'], ['#fff4e0', '#e0a33a'], ['#fdeaea', '#c5483c'], ['#f1ecfb', '#7a5cc4'], ['#eef2f7', '#5b6b7f']];
  function mappa(centro, rami, etichetta) {
    const cl = avvolgi(centro, 34), ch = cl.length * 20 + 18;
    let out = `<rect x="110" y="8" width="320" height="${ch}" rx="12" fill="#16365f"/>${cl.map((l, i) => `<text x="270" y="${31 + i * 20}" text-anchor="middle" fill="#fff" font-weight="700" font-size="16">${esc(l)}</text>`).join('')}`;
    let y = ch + 36; const yTronco = ch + 8; let yUltimo = y;
    for (let i = 0; i < rami.length; i += 2) {
      const blocchi = rami.slice(i, i + 2).map(([t, d]) => ({ t: avvolgi(t, 26), d: avvolgi(d, 31) }));
      const h = Math.max(...blocchi.map((b) => b.t.length * 19 + b.d.length * 18 + 22));
      blocchi.forEach((b, j) => {
        const x = j === 0 ? 6 : 289, [f, s] = COLORI[(i + j) % COLORI.length];
        out += `<line x1="270" y1="${y + 22}" x2="${j === 0 ? 251 : 289}" y2="${y + 22}" stroke="#7c8a99" stroke-width="2"/>
          <rect x="${x}" y="${y}" width="245" height="${h}" rx="9" fill="${f}" stroke="${s}" stroke-width="1.5"/>
          ${b.t.map((l, k) => `<text x="${x + 12}" y="${y + 22 + k * 19}" font-weight="700" fill="${s === '#5b6b7f' ? '#1f2d3d' : s}">${esc(l)}</text>`).join('')}
          ${b.d.map((l, k) => `<text x="${x + 12}" y="${y + 24 + b.t.length * 19 + k * 18}" font-size="13.5">${esc(l)}</text>`).join('')}`;
      });
      yUltimo = y + 22; y += h + 16;
    }
    return `<svg class="st-alto" viewBox="0 0 540 ${y}" role="img" aria-label="${esc(etichetta)}"><g ${FONT} font-size="14.5" fill="#1f2d3d">
      <line x1="270" y1="${yTronco}" x2="270" y2="${yUltimo}" stroke="#7c8a99" stroke-width="2"/>${out}</g></svg>`;
  }
  // grafico a barre orizzontali: dati [etichetta, valore, testo del valore]
  function barre(dati, max, etichetta, colore = '#1a5fb4') {
    const H = dati.length * 40 + 16;
    return `<svg class="st-alto" viewBox="0 0 540 ${H}" role="img" aria-label="${esc(etichetta)}"><g ${FONT} font-size="14.5" fill="#1f2d3d">
      <line x1="170" y1="6" x2="170" y2="${H - 6}" stroke="#9fb3c8" stroke-width="1.5"/>
      ${dati.map(([e, v, t, c], i) => `<text x="160" y="${i * 40 + 33}" text-anchor="end">${esc(e)}</text>
        <rect x="171" y="${i * 40 + 14}" width="${Math.max(2, (v / max) * 290).toFixed(1)}" height="26" rx="3" fill="${c || colore}"/>
        <text x="${(178 + (v / max) * 290).toFixed(1)}" y="${i * 40 + 33}" font-weight="700">${esc(t)}</text>`).join('')}
    </g></svg>`;
  }
  // cartina schematica a blocchi: regioni [nome, x, y, w, h, tipo]; legenda [[tipo, testo]]; extra = SVG aggiuntivo
  const TIPI = { blu: ['#dbe8fb', '#1a5fb4'], rosso: ['#fde1dc', '#c5483c'], grigio: ['#eef0f3', '#8a96a3'], giallo: ['#fff1cc', '#c98e10'], verde: ['#e2f3e8', '#3f9b6b'], viola: ['#ece6fa', '#7a5cc4'] };
  function cartina(regioni, legenda, extra, etichetta, H) {
    const righeLeg = Math.ceil(legenda.length / 2), HT = H + righeLeg * 26 + 16;
    return `<svg class="st-alto" viewBox="0 0 540 ${HT}" role="img" aria-label="${esc(etichetta)}"><g ${FONT} font-size="12.5" fill="#1f2d3d">
      <rect x="0" y="0" width="540" height="${H}" rx="8" fill="#dceaf7"/>
      ${regioni.map(([n, x, y, w, h, t]) => { const [f, s] = TIPI[t], ll = avvolgi(n, Math.max(6, Math.floor(w / 7.2))); return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${f}" stroke="${s}" stroke-width="1.6"/>
        ${ll.map((l, i) => `<text x="${x + w / 2}" y="${y + h / 2 + 4 + (i - (ll.length - 1) / 2) * 15}" text-anchor="middle" font-weight="600">${esc(l)}</text>`).join('')}`; }).join('')}
      ${extra || ''}
      ${legenda.map(([t, testo], i) => `<rect x="${10 + (i % 2) * 265}" y="${H + 12 + Math.floor(i / 2) * 26}" width="18" height="16" rx="3" fill="${TIPI[t][0]}" stroke="${TIPI[t][1]}" stroke-width="1.6"/>
        <text x="${36 + (i % 2) * 265}" y="${H + 25 + Math.floor(i / 2) * 26}" font-size="13">${esc(testo)}</text>`).join('')}
    </g></svg>`;
  }
  const punto = (x, y, nome, dx = 8, dy = 4, anchor = 'start') => `<circle cx="${x}" cy="${y}" r="5" fill="#16365f" stroke="#fff" stroke-width="1.5"/><text x="${x + dx}" y="${y + dy}" text-anchor="${anchor}" font-size="12.5" font-weight="600">${esc(nome)}</text>`;
  // documento (fonte) con la sua indicazione
  const fonte = (testo, origine) => `<blockquote class="st-cit st-fonte">${testo}<cite>${origine}</cite></blockquote>`;

  window.BossContenuti = window.BossContenuti || {};
  window.BossContenuti.storia = {
    id: 'storia', nome: 'Storia',
    argomenti: [
      // ============================== BELLE ÉPOQUE E GIOLITTI ==============================
      { id: 'giolitti', titolo: 'La Belle Époque e l\'età giolittiana', minuti: 16, giorni: -35, corpo: () => `
        <p class="st-intro">Tra la fine dell'Ottocento e il 1914 l'Europa vive un periodo di pace, di crescita economica e di fiducia nel progresso che i francesi chiameranno, con nostalgia, <b>Belle Époque</b> («bella epoca»). In Italia questi anni coincidono con l'<b>età giolittiana</b> (1901-1914), quando Giovanni Giolitti guida la modernizzazione del paese. Sotto la superficie, però, crescono le tensioni che porteranno alla guerra.</p>
        <h2 id="st-s1">1. La seconda rivoluzione industriale e la società di massa</h2>
        <p>Dal 1870 circa nuove fonti di energia (<b>elettricità</b> e <b>petrolio</b>) e nuovi settori (acciaio, chimica, industria elettrica) trasformano l'economia. Nascono le grandi imprese e i monopoli; la produzione si organizza in modo scientifico: l'ingegnere americano F. W. <b>Taylor</b> studia i tempi di ogni movimento dell'operaio (<i>taylorismo</i>), Henry <b>Ford</b> introduce la <b>catena di montaggio</b> (1913) per produrre in serie il Modello T.</p>
        ${tabella(['Invenzione', 'Anno', 'Inventore'], [
          ['Lampadina a incandescenza', '1879', 'T. A. Edison'],
          ['Motore a scoppio / automobile', '1885-86', 'G. Daimler, K. Benz'],
          ['Cinematografo', '1895', 'Fratelli Lumière'],
          ['Telegrafo senza fili (radio)', '1895-1901', 'G. Marconi'],
          ['Primo volo a motore', '1903', 'Fratelli Wright'],
        ])}
        <p>Nasce la <b>società di massa</b>: milioni di persone vivono in città, lavorano in fabbrica, leggono i giornali, votano. Compaiono i <b>partiti di massa</b> (i partiti socialisti, il Partito socialista italiano nasce nel 1892) e i <b>sindacati</b> (in Italia la CGdL, 1906). La Chiesa interviene sulla questione sociale con l'enciclica <i>Rerum novarum</i> di Leone XIII (1891).</p>
        ${nota('avviso', 'Il lato oscuro della Belle Époque', 'Gli stessi anni sono quelli dell\'<b>imperialismo</b> (spartizione dell\'Africa dopo la Conferenza di Berlino, 1884-85), del <b>nazionalismo</b> aggressivo, del razzismo «scientifico» e dell\'antisemitismo (affare Dreyfus in Francia, 1894), della corsa agli armamenti.')}
        <h2 id="st-s2">2. L'Italia: dalla crisi di fine secolo a Giolitti</h2>
        <p>Gli anni Novanta dell'Ottocento sono drammatici: scandali bancari, la sconfitta di <b>Adua</b> (1896) in Etiopia, proteste per il prezzo del pane. Nel maggio <b>1898</b> a Milano il generale Bava Beccaris fa sparare con i cannoni sulla folla (oltre 80 morti). Il 29 luglio <b>1900</b> l'anarchico Gaetano Bresci uccide a Monza il re <b>Umberto I</b>, per vendicare quei morti. Il nuovo re, Vittorio Emanuele III, sceglie una linea più liberale.</p>
        <h2 id="st-s3">3. La politica di Giolitti</h2>
        <p>Giovanni <b>Giolitti</b>, ministro dell'Interno dal 1901 e poi presidente del Consiglio quasi senza interruzioni fino al 1914, è un liberale moderato che vuole <b>allargare le basi dello Stato</b>, integrando socialisti riformisti e cattolici. La sua idea chiave: lo Stato deve restare <b>neutrale</b> nei conflitti tra operai e padroni, senza mandare l'esercito contro gli scioperi.</p>
        ${tabella(['Ambito', 'Provvedimenti'], [
          ['Lavoro', 'Leggi sul lavoro delle donne e dei bambini (1902), riposo settimanale, sviluppo delle assicurazioni sociali'],
          ['Economia', 'Nazionalizzazione delle ferrovie (1905); monopolio statale delle assicurazioni sulla vita (INA, 1912); conversione della rendita'],
          ['Politica', '<b>Suffragio universale maschile</b> (1912): votano tutti gli uomini con almeno 30 anni e quelli di 21 anni alfabetizzati o che hanno fatto il servizio militare; gli elettori passano da circa 3 a oltre 8 milioni'],
          ['Cattolici', '<b>Patto Gentiloni</b> (1913): i cattolici votano i candidati liberali che si impegnano a difendere i valori cattolici'],
          ['Politica estera', '<b>Guerra di Libia</b> (1911-12) contro l\'Impero ottomano: l\'Italia conquista la Libia e il Dodecaneso'],
        ])}
        <p>In questi anni l'Italia vive il suo <b>decollo industriale</b>, concentrato nel <b>triangolo industriale</b> Milano-Torino-Genova (FIAT nasce nel 1899). Ma il divario tra Nord e Sud cresce, e milioni di italiani <b>emigrano</b>: nel solo 1913 partono oltre 870.000 persone, verso le Americhe e l'Europa.</p>
        ${figura(lineaTempo([
          ['1896', 'Sconfitta italiana ad Adua'],
          ['1898', 'Milano: Bava Beccaris spara sulla folla'],
          ['1900', 'Assassinio di Umberto I a Monza', true],
          ['1903', 'Giolitti presidente del Consiglio (fino al 1905)'],
          ['1905', 'Nazionalizzazione delle ferrovie'],
          ['1911-12', 'Guerra di Libia', true],
          ['1912', 'Suffragio universale maschile', true],
          ['1913', 'Patto Gentiloni; prime elezioni a suffragio allargato'],
          ['1914', 'Giolitti si dimette; gli succede Salandra'],
        ], 'Linea del tempo dell\'età giolittiana'), 'Figura 1 – L\'Italia dalla crisi di fine secolo alla vigilia della guerra.')}
        <h2 id="st-s4">4. Fonte: il «ministro della malavita»</h2>
        ${fonte('«Il ministro della mala vita»', 'G. Salvemini, titolo di un opuscolo del 1910 contro Giolitti')}
        <p><b>Commento.</b> Lo storico e politico Gaetano <b>Salvemini</b> accusa Giolitti di avere due volti: progressista al Nord, dove dialoga con i socialisti, ma al Sud alleato dei notabili locali e della malavita, che controllano le elezioni con la corruzione e la violenza. La fonte mostra il limite principale del sistema giolittiano: la modernizzazione non arriva al Mezzogiorno. Va letta come un testo <b>polemico</b>, non neutrale.</p>
        <h2 id="st-s5">5. Tabella riassuntiva</h2>
        ${tabella(['Aspetti positivi', 'Limiti'], [
          ['Crescita industriale e del reddito', 'Divario Nord-Sud in aumento, emigrazione di massa'],
          ['Riforme sociali e libertà sindacale', 'Clientelismo e corruzione elettorale al Sud'],
          ['Allargamento del voto (1912)', 'Opposizione crescente di nazionalisti e socialisti massimalisti'],
          ['Integrazione dei cattolici nella vita politica', 'La guerra di Libia rafforza il nazionalismo'],
        ])}
        <h2 id="st-s6">6. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Spiega perché il periodo 1871-1914 è chiamato Belle Époque e indica due elementi che lo contraddicono.</li>
          <li>Che cosa significa che lo Stato giolittiano è «neutrale» nei conflitti di lavoro?</li>
          <li>Chi poteva votare con la legge elettorale del 1912? Chi restava escluso?</li>
          <li>Commenta la definizione di Salvemini: in che senso è una fonte di parte?</li>
        </ol>` },

      // ============================== PRIMA GUERRA MONDIALE ==============================
      { id: 'grande-guerra', titolo: 'La Prima guerra mondiale', minuti: 20, giorni: -31, corpo: () => `
        <p class="st-intro">La <b>Prima guerra mondiale</b> (1914-1918) è la prima guerra «totale» della storia: coinvolge interi popoli, l'economia, la propaganda; uccide circa 10 milioni di soldati. Cancella quattro imperi e cambia la carta d'Europa. Studiamo cause, fasi, l'intervento dell'Italia e i trattati di pace.</p>
        <h2 id="st-s1">1. Le cause</h2>
        ${tabella(['Causa', 'Spiegazione'], [
          ['Sistema delle alleanze', '<b>Triplice Alleanza</b> (1882): Germania, Austria-Ungheria, Italia. <b>Triplice Intesa</b> (1907): Francia, Russia, Regno Unito. Un conflitto locale rischia di coinvolgere tutti.'],
          ['Imperialismo', 'Rivalità coloniali ed economiche, soprattutto tra Germania e Regno Unito (anche nella corsa agli armamenti navali).'],
          ['Nazionalismi', 'La Francia vuole riprendersi l\'Alsazia-Lorena (persa nel 1871); i popoli slavi dell\'Austria-Ungheria vogliono l\'indipendenza.'],
          ['Questione balcanica', 'Il declino dell\'Impero ottomano lascia i Balcani contesi tra Austria e Russia (guerre balcaniche 1912-13).'],
          ['Causa occasionale', '28 giugno 1914: a <b>Sarajevo</b> lo studente serbo-bosniaco Gavrilo Princip uccide l\'arciduca Francesco Ferdinando, erede al trono d\'Austria.'],
        ])}
        ${figura(cartina([
          ['Regno Unito', 30, 30, 85, 95, 'blu'], ['Francia', 50, 150, 120, 110, 'blu'], ['Russia', 330, 15, 200, 190, 'blu'],
          ['Germania', 185, 70, 120, 120, 'rosso'], ['Austria-Ungheria', 230, 205, 150, 70, 'rosso'], ['Impero ottomano', 420, 285, 110, 75, 'rosso'],
          ['Italia (neutrale nel 1914)', 185, 285, 75, 105, 'giallo'], ['Serbia', 330, 285, 75, 45, 'blu'], ['Spagna', 15, 280, 120, 80, 'grigio'],
          ['Belgio', 125, 95, 55, 45, 'grigio'],
        ], [['blu', 'Intesa e suoi alleati'], ['rosso', 'Imperi centrali'], ['giallo', 'Italia: in guerra dal 1915 con l\'Intesa'], ['grigio', 'Paesi neutrali (il Belgio viene invaso)']],
        `${punto(362, 262, 'Sarajevo', -8, 4, 'end')}`, 'Cartina schematica delle alleanze nel 1914', 400), 'Figura 1 – Le alleanze nel 1914 (schema non in scala: le posizioni sono indicative). Sarajevo era in Bosnia, annessa dall\'Austria-Ungheria nel 1908.')}
        <h2 id="st-s2">2. Lo scoppio e la guerra di logoramento</h2>
        <p>Il 28 luglio 1914 l'Austria dichiara guerra alla Serbia; in pochi giorni, per il gioco delle alleanze, entrano in guerra Russia, Germania, Francia e Regno Unito. La Germania applica il <b>piano Schlieffen</b>: invadere la Francia passando per il Belgio neutrale per vincere in poche settimane. Ma sulla <b>Marna</b> (settembre 1914) i francesi la fermano.</p>
        <p>La guerra di movimento diventa <b>guerra di posizione</b>: milioni di soldati vivono nelle <b>trincee</b>, tra fango, topi, pidocchi, freddo, con assalti che costano migliaia di morti per pochi metri di terreno. Le nuove armi (mitragliatrici, artiglieria pesante, gas, aerei, carri armati, sottomarini) rendono la guerra una strage industriale. Nel 1916 le battaglie di <b>Verdun</b> e della <b>Somme</b> fanno da sole oltre un milione di vittime tra morti e feriti.</p>
        <h2 id="st-s3">3. L'Italia: dalla neutralità all'intervento</h2>
        <p>Nel 1914 l'Italia si dichiara <b>neutrale</b>: la Triplice Alleanza era difensiva e l'Austria non l'aveva consultata. Il paese si divide.</p>
        ${tabella(['Neutralisti', 'Interventisti'], [
          ['Giolitti e gran parte dei liberali: l\'Italia può ottenere «parecchio» senza guerra', 'Nazionalisti: la guerra rafforza la nazione'],
          ['Socialisti: la guerra è dei padroni, non dei lavoratori', 'Interventisti democratici (Salvemini, Battisti): completare il Risorgimento con Trento e Trieste'],
          ['Cattolici: rifiuto della guerra (papa Benedetto XV)', 'Mussolini, espulso dal PSI (1914); D\'Annunzio; i futuristi'],
        ])}
        <p>Il 26 aprile <b>1915</b> il governo Salandra firma in segreto il <b>Patto di Londra</b> con l'Intesa: in caso di vittoria l'Italia avrà Trentino, Alto Adige fino al Brennero, Trieste, Istria e parte della Dalmazia (ma non Fiume). Dopo le manifestazioni delle «radiose giornate di maggio», il <b>24 maggio 1915</b> l'Italia entra in guerra contro l'Austria.</p>
        ${figura(`<svg class="st-alto" viewBox="0 0 540 448" role="img" aria-label="Cartina schematica del fronte italiano"><defs><marker id="st-fr-it" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5 0 10z" fill="#16365f"/></marker></defs>
          <g ${FONT} font-size="12.5" fill="#1f2d3d">
          <rect x="0" y="0" width="540" height="380" rx="8" fill="#f6f1e4"/>
          <path d="M0 0H540V300H470L430 230 420 140 330 120 250 130 180 150 120 110 60 120 0 100Z" fill="#fde1dc" stroke="#c5483c" stroke-width="1.5"/>
          <path d="M240 380L300 290 380 272 440 300 540 322V380Z" fill="#dceaf7"/>
          <text x="40" y="40" font-weight="700" fill="#a3302a" font-size="14">AUSTRIA-UNGHERIA</text>
          <text x="40" y="250" font-weight="700" fill="#7a5a14" font-size="14">REGNO D'ITALIA</text>
          <text x="440" y="358" text-anchor="middle" fill="#1a5fb4" font-style="italic">Mare Adriatico</text>
          <path d="M436 70C443 125 424 180 438 262" fill="none" stroke="#c5483c" stroke-width="3" stroke-dasharray="7 5"/><path d="M445 55C452 120 432 180 446 262" fill="none" stroke="#3b82c4" stroke-width="3"/><text x="458" y="150" fill="#1a5fb4" font-style="italic">Isonzo</text>
          <path d="M292 60C282 140 306 210 300 288" fill="none" stroke="#3b82c4" stroke-width="3"/><text x="250" y="105" fill="#1a5fb4" font-style="italic">Piave</text>
          <path d="M180 150L235 178 270 168 300 200 300 286" fill="none" stroke="#16365f" stroke-width="4" stroke-dasharray="9 5"/>
          <path d="M425 120C380 150 350 175 312 195" fill="none" stroke="#16365f" stroke-width="2" marker-end="url(#st-fr-it)"/>
          <text x="372" y="254" font-size="11.5" text-anchor="middle" font-style="italic">ritirata</text><text x="372" y="268" font-size="11.5" text-anchor="middle" font-style="italic">(ott.-nov. 1917)</text>
          ${punto(150, 92, 'Trento', 0, -10, 'middle')}${punto(210, 165, 'Asiago', 0, 20, 'middle')}${punto(262, 158, 'Grappa', 0, -10, 'middle')}
          ${punto(318, 148, 'Vittorio Veneto')}${punto(440, 95, 'Caporetto', -8, 4, 'end')}${punto(440, 205, 'Gorizia', -8, 4, 'end')}
          ${punto(474, 282, 'Trieste', 8, -4)}${punto(285, 296, 'Venezia', -8, 4, 'end')}
          <line x1="20" y1="402" x2="60" y2="402" stroke="#c5483c" stroke-width="2"/><text x="68" y="406">confine del 1914</text>
          <line x1="280" y1="402" x2="320" y2="402" stroke="#16365f" stroke-width="4" stroke-dasharray="9 5"/><text x="328" y="406">linea Grappa-Piave (nov. 1917)</text>
          <line x1="20" y1="428" x2="60" y2="428" stroke="#c5483c" stroke-width="3" stroke-dasharray="7 5"/><text x="68" y="432">fronte dell'Isonzo 1915-17</text>
          </g></svg>`, 'Figura 2 – Il fronte italiano (schema non in scala): dall\'Isonzo alla ritirata sul Piave dopo Caporetto.')}
        <p>Il comandante <b>Luigi Cadorna</b> lancia undici offensive sull'<b>Isonzo</b> (1915-17) con enormi perdite e risultati modesti (presa di Gorizia, agosto 1916). Nel maggio 1916 gli austriaci attaccano dal Trentino (<i>Strafexpedition</i>). Il <b>24 ottobre 1917</b> gli austro-tedeschi sfondano a <b>Caporetto</b>: l'esercito italiano si ritira fino al <b>Piave</b>, lasciando centinaia di migliaia di prigionieri. Cadorna è sostituito da <b>Armando Diaz</b>. Il fronte resiste sul Piave e sul Grappa (battaglia del Solstizio, giugno 1918); a fine ottobre 1918 l'offensiva di <b>Vittorio Veneto</b> porta all'armistizio di <b>Villa Giusti</b>, firmato il 3 novembre ed entrato in vigore il <b>4 novembre 1918</b>.</p>
        <h2 id="st-s4">4. Il 1917, anno di svolta, e la fine della guerra</h2>
        <ul>
          <li><b>Aprile 1917</b>: gli <b>Stati Uniti</b> entrano in guerra, dopo la guerra sottomarina tedesca indiscriminata (il <i>Lusitania</i> era stato affondato nel 1915).</li>
          <li><b>1917</b>: in Russia la rivoluzione; con la pace di <b>Brest-Litovsk</b> (marzo 1918) la Russia esce dalla guerra.</li>
          <li>Ovunque crescono stanchezza, diserzioni, ammutinamenti (in Francia) e scioperi.</li>
          <li><b>11 novembre 1918</b>: la Germania, ormai sconfitta, firma l'armistizio a <b>Compiègne</b>; l'imperatore Guglielmo II abdica.</li>
        </ul>
        ${figura(lineaTempo([
          ['28/6/1914', 'Attentato di Sarajevo', true],
          ['set. 1914', 'Battaglia della Marna: inizia la guerra di posizione'],
          ['26/4/1915', 'Patto di Londra'],
          ['24/5/1915', 'L\'Italia entra in guerra', true],
          ['1916', 'Verdun e Somme; Strafexpedition; presa di Gorizia'],
          ['apr. 1917', 'Gli Stati Uniti entrano in guerra'],
          ['24/10/1917', 'Disfatta di Caporetto', true],
          ['mar. 1918', 'Pace di Brest-Litovsk: la Russia esce dalla guerra'],
          ['4/11/1918', 'Armistizio di Villa Giusti dopo Vittorio Veneto', true],
          ['11/11/1918', 'Armistizio di Compiègne con la Germania'],
          ['28/6/1919', 'Trattato di Versailles'],
        ], 'Linea del tempo della Prima guerra mondiale'), 'Figura 3 – La Prima guerra mondiale in undici date.')}
        <h2 id="st-s5">5. La pace: i trattati di Parigi (1919-20)</h2>
        <p>Il presidente americano <b>Woodrow Wilson</b> aveva proposto nei <b>Quattordici punti</b> (gennaio 1918) una pace giusta, basata sull'autodeterminazione dei popoli e su una <b>Società delle Nazioni</b>. La pace reale è invece punitiva verso i vinti.</p>
        ${tabella(['Trattato', 'Paese sconfitto', 'Conseguenze principali'], [
          ['<b>Versailles</b> (1919)', 'Germania', 'Colpevole della guerra (art. 231); perde Alsazia-Lorena, le colonie e territori a est (corridoio di Danzica alla Polonia); esercito limitato a 100.000 uomini; Renania smilitarizzata; enormi riparazioni di guerra'],
          ['<b>Saint-Germain</b> (1919)', 'Austria', 'Fine dell\'impero; l\'Italia ottiene il Trentino-Alto Adige fino al Brennero (il confine orientale, con Trieste e l\'Istria, sarà fissato con la Jugoslavia dal trattato di Rapallo, 1920)'],
          ['<b>Trianon</b> (1920)', 'Ungheria', 'Perde due terzi del territorio'],
          ['<b>Neuilly</b> (1919)', 'Bulgaria', 'Perdite territoriali'],
          ['<b>Sèvres</b> (1920)', 'Impero ottomano', 'Smembramento; nascerà la Turchia di Atatürk'],
        ])}
        ${fonte('«[…] questa lotta tremenda, la quale, ogni giorno più, apparisce inutile strage.»', 'Benedetto XV, <i>Lettera ai capi dei popoli belligeranti</i>, 1° agosto 1917')}
        <p><b>Commento.</b> Il papa propone una pace senza vincitori: disarmo, arbitrato internazionale, rinuncia alle riparazioni. L'espressione «<b>inutile strage</b>» diventa celebre, ma la nota viene respinta da tutti i governi. In Italia, dopo Caporetto, i nazionalisti la accusano di aver indebolito il morale delle truppe. La fonte mostra che già nel 1917 la guerra appariva a molti senza senso.</p>
        <h2 id="st-s6">6. Cause e conseguenze in sintesi</h2>
        ${tabella(['Conseguenze politiche', 'Conseguenze economiche e sociali'], [
          ['Crollo di quattro imperi: russo, tedesco, austro-ungarico, ottomano', 'Circa 10 milioni di soldati morti (in Italia circa 650.000)'],
          ['Nascita di nuovi stati: Polonia, Cecoslovacchia, Jugoslavia, Austria, Ungheria, stati baltici', 'Debiti di guerra, inflazione, riconversione difficile'],
          ['Rivoluzione in Russia', 'Le donne entrano nel lavoro di fabbrica e negli uffici'],
          ['In Italia il mito della «vittoria mutilata»', 'Milioni di reduci e mutilati da reinserire'],
        ])}
        <h2 id="st-s7">7. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Distingui le cause profonde dalla causa occasionale della guerra.</li>
          <li>Perché la guerra di movimento diventò guerra di posizione? Descrivi la vita in trincea.</li>
          <li>Confronta le posizioni di neutralisti e interventisti in Italia.</li>
          <li>Che cosa prometteva il Patto di Londra e che cosa ottenne davvero l'Italia nel 1919?</li>
          <li>Spiega l'espressione «inutile strage» e il contesto in cui fu scritta.</li>
        </ol>` },

      // ============================== RIVOLUZIONE RUSSA E STALIN ==============================
      { id: 'russia', titolo: 'La Rivoluzione russa e l\'URSS di Stalin', minuti: 18, giorni: -27, corpo: () => `
        <p class="st-intro">Nel 1917 in Russia cade l'impero degli zar e nasce il primo stato socialista della storia. Studiamo le due rivoluzioni del 1917, la guerra civile, la nascita dell'<b>URSS</b> e il regime totalitario di <b>Stalin</b>, con l'industrializzazione forzata, la collettivizzazione e il terrore.</p>
        <h2 id="st-s1">1. La Russia prima della rivoluzione</h2>
        <p>All'inizio del Novecento la Russia è un impero immenso e arretrato: l'80% della popolazione è contadina, la servitù della gleba è stata abolita solo nel 1861, lo zar <b>Nicola II</b> governa in modo autocratico. Esiste però un'industria moderna concentrata in poche città, con un proletariato combattivo. Il Partito operaio socialdemocratico russo nel 1903 si divide in <b>bolscevichi</b> («maggioritari», guidati da <b>Lenin</b>, favorevoli a un partito di rivoluzionari di professione) e <b>menscevichi</b> («minoritari», più moderati).</p>
        <p>Nel <b>1905</b>, dopo la sconfitta contro il Giappone, una manifestazione pacifica davanti al Palazzo d'Inverno viene repressa nel sangue («domenica di sangue»). Nascono i primi <b>soviet</b> (consigli di operai e soldati); lo zar concede un parlamento, la <b>Duma</b>, ma ne limita presto i poteri.</p>
        <h2 id="st-s2">2. Il 1917: due rivoluzioni</h2>
        ${tabella(['', 'Rivoluzione di febbraio', 'Rivoluzione d\'ottobre'], [
          ['Data (calendario russo / nostro)', '23 febbraio / 8 marzo 1917', '25 ottobre / 7 novembre 1917'],
          ['Cause', 'Fame, sconfitte militari, scioperi a Pietrogrado; i soldati si uniscono ai dimostranti', 'Il governo provvisorio continua la guerra e non fa la riforma agraria'],
          ['Protagonisti', 'Operai, soldati, partiti liberali e socialisti moderati', 'Bolscevichi guidati da Lenin e Trotskij'],
          ['Risultato', 'Abdicazione di Nicola II; <b>governo provvisorio</b> (poi guidato da Kerenskij) accanto al soviet: è il «doppio potere»', 'Presa del Palazzo d\'Inverno; governo dei commissari del popolo presieduto da Lenin'],
        ])}
        <p>Tornato dall'esilio in Svizzera (aprile 1917), Lenin presenta le <b>Tesi di aprile</b>: nessun appoggio al governo provvisorio, pace immediata, terra ai contadini, «tutto il potere ai soviet». Dopo la presa del potere, i bolscevichi emanano i decreti sulla <b>pace</b> e sulla <b>terra</b>; nel gennaio 1918 sciolgono l'Assemblea costituente, in cui non avevano la maggioranza, e istituiscono una polizia politica (Čeka). Con la pace di <b>Brest-Litovsk</b> (marzo 1918) la Russia esce dalla guerra cedendo vasti territori.</p>
        ${fonte('«Nessun appoggio al governo provvisorio […]. Non una repubblica parlamentare, […] ma una repubblica dei soviet dei deputati operai, braccianti e contadini in tutto il paese, dal basso in alto.»', 'V. I. Lenin, <i>Tesi di aprile</i>, 1917 (traduzione)')}
        <p><b>Commento.</b> Lenin rifiuta il modello della democrazia parlamentare occidentale e propone il potere dei soviet. In pratica i soviet saranno presto controllati dal partito bolscevico: la fonte mostra il programma, non la realtà che seguirà, cioè la <b>dittatura del partito</b>.</p>
        <h2 id="st-s3">3. Guerra civile, comunismo di guerra e NEP</h2>
        <p>Dal 1918 al 1921 i bolscevichi (<b>Rossi</b>) combattono contro i <b>Bianchi</b> (zaristi, liberali, socialisti moderati), aiutati da truppe straniere. Trotskij organizza l'<b>Armata Rossa</b>; nel luglio 1918 lo zar e la sua famiglia vengono uccisi a Ekaterinburg. Per sfamare città ed esercito il governo applica il <b>comunismo di guerra</b>: requisizioni dei raccolti, nazionalizzazione di tutte le imprese. La produzione crolla e scoppia una grave carestia; nel 1921 si ribellano anche i marinai di Kronštadt.</p>
        <p>Lenin vara allora la <b>NEP</b> (Nuova politica economica, 1921): i contadini possono vendere le eccedenze e tornano il piccolo commercio e le piccole imprese private, mentre lo Stato mantiene banche, grande industria e commercio estero. Il 30 dicembre <b>1922</b> nasce l'<b>Unione delle Repubbliche Socialiste Sovietiche</b> (URSS). Lenin muore nel gennaio 1924.</p>
        <h2 id="st-s4">4. Stalin al potere</h2>
        <p>Nella lotta per la successione si scontrano <b>Trotskij</b>, che sostiene la «rivoluzione permanente» da esportare nel mondo, e <b>Stalin</b>, segretario del partito dal 1922, che propone il «<b>socialismo in un solo paese</b>». Stalin vince controllando l'apparato del partito: Trotskij viene espulso dall'URSS (1929) e assassinato in Messico (1940).</p>
        ${tabella(['Politica', 'Contenuto', 'Conseguenze'], [
          ['<b>Piani quinquennali</b> (dal 1928)', 'Industrializzazione forzata, decisa dallo Stato: industria pesante, energia, armi', 'L\'URSS diventa una potenza industriale; condizioni di lavoro durissime'],
          ['<b>Collettivizzazione</b> delle campagne', 'Le terre passano a fattorie collettive (<i>kolchoz</i>) e statali (<i>sovchoz</i>); i contadini benestanti (<b>kulaki</b>) sono deportati', 'Crollo della produzione; carestia del 1932-33 con milioni di morti, soprattutto in Ucraina (<i>Holodomor</i>)'],
          ['<b>Grandi purghe</b> (1936-38)', 'Processi farsa contro i vecchi bolscevichi, epurazione dell\'esercito e del partito', 'Centinaia di migliaia di fucilati, milioni nei campi di lavoro (<b>gulag</b>)'],
          ['<b>Culto della personalità</b>', 'Propaganda che presenta Stalin come guida infallibile («piccolo padre»)', 'Controllo totale di cultura, scuola, arte (realismo socialista)'],
        ])}
        ${figura(lineaTempo([
          ['1905', 'Domenica di sangue; nascono i soviet'],
          ['feb. 1917', 'Rivoluzione di febbraio: abdica Nicola II', true],
          ['ott. 1917', 'Rivoluzione d\'ottobre: i bolscevichi al potere', true],
          ['1918', 'Pace di Brest-Litovsk; inizia la guerra civile'],
          ['1921', 'Nuova politica economica (NEP)'],
          ['1922', 'Nasce l\'URSS', true],
          ['1924', 'Muore Lenin'],
          ['1928', 'Primo piano quinquennale e collettivizzazione'],
          ['1932-33', 'Grande carestia (Holodomor)'],
          ['1936-38', 'Grandi purghe', true],
        ], 'Linea del tempo della Russia dal 1905 al 1938'), 'Figura 1 – Dalla Russia degli zar all\'URSS di Stalin.')}
        ${nota('info', 'Che cos\'è un regime totalitario', 'Secondo la filosofa Hannah Arendt (<i>Le origini del totalitarismo</i>, 1951), un regime totalitario ha: un <b>partito unico</b> guidato da un capo; un\'<b>ideologia</b> che pretende di spiegare tutto; il <b>terrore</b> della polizia politica e dei campi; il controllo dei mezzi di comunicazione e dell\'economia; la mobilitazione delle masse. Stalinismo e nazismo ne sono i due esempi principali.')}
        <h2 id="st-s5">5. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Spiega che cosa si intende per «doppio potere» dopo la rivoluzione di febbraio.</li>
          <li>Confronta comunismo di guerra e NEP in una tabella.</li>
          <li>Quali furono i costi umani della collettivizzazione?</li>
          <li>Applica all'URSS di Stalin le caratteristiche del totalitarismo indicate da Hannah Arendt.</li>
        </ol>` },

      // ============================== FASCISMO ==============================
      { id: 'fascismo', titolo: 'Il dopoguerra e il fascismo in Italia', minuti: 20, giorni: -23, corpo: () => `
        <p class="st-intro">L'Italia esce dalla Prima guerra mondiale vincitrice ma profondamente in crisi. In pochi anni lo Stato liberale crolla e <b>Benito Mussolini</b> costruisce una dittatura che durerà vent'anni (il «Ventennio», 1922-1943). Studiamo come il fascismo arrivò al potere, come diventò regime e quali furono la sua politica interna, economica ed estera.</p>
        <h2 id="st-s1">1. La crisi del dopoguerra (1919-1922)</h2>
        <ul>
          <li><b>Economia</b>: debiti, inflazione, disoccupazione dei reduci, aumento dei prezzi.</li>
          <li><b>«Vittoria mutilata»</b>: l'espressione di D'Annunzio denuncia che l'Italia non ha ottenuto la Dalmazia e Fiume; nel 1919 D'Annunzio occupa Fiume.</li>
          <li><b>Biennio rosso</b> (1919-20): scioperi, occupazione delle terre e, nel settembre 1920, delle fabbriche del Nord. La borghesia teme una rivoluzione come in Russia.</li>
          <li><b>Nuovi partiti di massa</b>: il Partito popolare italiano di don Luigi <b>Sturzo</b> (1919); il Partito comunista d'Italia nasce a Livorno da una scissione del PSI (gennaio 1921). Alle elezioni del 1919, con il sistema proporzionale, i socialisti sono il primo partito, ma nessuno ha la maggioranza: i governi sono deboli.</li>
        </ul>
        <h2 id="st-s2">2. La nascita del fascismo e la marcia su Roma</h2>
        <p>Il <b>23 marzo 1919</b>, in piazza San Sepolcro a Milano, Mussolini fonda i <b>Fasci di combattimento</b>, con un programma inizialmente repubblicano e di sinistra. Il movimento cresce dal 1920 con lo <b>squadrismo</b>: bande armate di «camicie nere», finanziate da agrari e industriali, distruggono sedi socialiste, camere del lavoro e cooperative, con la tolleranza di polizia e prefetti. Nel 1921 Giolitti accoglie i fascisti nelle sue liste (blocchi nazionali): entrano in Parlamento 35 deputati fascisti. Nel novembre 1921 nasce il <b>Partito nazionale fascista</b> (PNF).</p>
        <p>Il <b>28 ottobre 1922</b> migliaia di squadristi marciano su Roma. Il re <b>Vittorio Emanuele III</b> rifiuta di firmare lo stato d'assedio proposto dal governo Facta e il 30 ottobre incarica Mussolini di formare il governo. Non è un colpo di Stato militare: è una pressione armata accettata dalle istituzioni.</p>
        <h2 id="st-s3">3. Dal governo alla dittatura (1922-1926)</h2>
        ${tabella(['Data', 'Evento', 'Significato'], [
          ['dic. 1922 - gen. 1923', 'Gran Consiglio del fascismo; Milizia volontaria per la sicurezza nazionale', 'Il partito si dà organi paralleli allo Stato; gli squadristi diventano milizia di Stato'],
          ['1923', '<b>Legge Acerbo</b>', 'La lista che ottiene almeno il 25% dei voti riceve i due terzi dei seggi'],
          ['aprile 1924', 'Elezioni con violenze e brogli', 'Il «listone» fascista ottiene circa il 65% dei voti'],
          ['30 maggio 1924', 'Discorso di Giacomo <b>Matteotti</b> alla Camera', 'Il segretario del Partito socialista unitario denuncia le violenze e chiede di annullare le elezioni'],
          ['10 giugno 1924', 'Matteotti viene rapito e ucciso da squadristi', 'Crisi del governo; le opposizioni lasciano la Camera (secessione dell\'<b>Aventino</b>)'],
          ['3 gennaio 1925', 'Discorso di Mussolini alla Camera', 'Inizio della dittatura'],
          ['1925-26', '<b>Leggi fascistissime</b>', 'Partiti e sindacati non fascisti sciolti, stampa censurata, Tribunale speciale, confino, podestà al posto dei sindaci eletti'],
        ])}
        ${fonte('«Dichiaro qui, al cospetto di questa Assemblea e al cospetto di tutto il popolo italiano, che io assumo, io solo, la responsabilità politica, morale, storica di tutto quanto è avvenuto.»', 'B. Mussolini, discorso alla Camera dei deputati, 3 gennaio 1925')}
        <p><b>Commento.</b> Con questa frase Mussolini si assume la responsabilità del clima di violenza che ha portato al delitto Matteotti, sfidando l'opposizione: nessuno ha più la forza di fermarlo. Il re non interviene. È l'atto di nascita della dittatura: nei mesi seguenti le leggi fascistissime cancellano lo Stato liberale. La fonte va letta come un discorso <b>politico e propagandistico</b>: è una prova di forza, non un'ammissione di colpa davanti a un giudice.</p>
        <h2 id="st-s4">4. Il regime: consenso e repressione</h2>
        <ul>
          <li><b>Patti lateranensi</b> (11 febbraio 1929) con la Chiesa: nasce lo Stato della Città del Vaticano, il cattolicesimo è religione di Stato, il matrimonio religioso ha valore civile. Il regime ottiene il consenso dei cattolici.</li>
          <li><b>Propaganda</b>: Istituto Luce (cinegiornali), radio, Ministero della cultura popolare (1937), culto del Duce.</li>
          <li><b>Educazione</b>: Opera nazionale Balilla (1926), poi Gioventù italiana del littorio; libro di testo unico; giuramento di fedeltà imposto ai professori universitari (1931): solo una dozzina rifiutò.</li>
          <li><b>Repressione</b>: polizia segreta (OVRA), Tribunale speciale, confino (Gramsci muore nel 1937 dopo anni di carcere; i fratelli Rosselli sono assassinati in Francia nel 1937).</li>
        </ul>
        <h2 id="st-s5">5. Economia e politica estera</h2>
        ${tabella(['Fase / politica', 'Contenuto'], [
          ['Liberismo (1922-25)', 'Meno tasse per le imprese, privatizzazioni'],
          ['Battaglia del grano (1925)', 'Aumentare la produzione per non dipendere dalle importazioni'],
          ['Quota 90 (1926-27)', 'Rivalutazione della lira: 90 lire per una sterlina'],
          ['Corporativismo', 'Carta del lavoro (1927): datori e lavoratori riuniti nelle corporazioni, sciopero vietato'],
          ['IRI (1933)', 'Dopo la crisi del 1929 lo Stato salva banche e industrie e ne diventa proprietario'],
          ['Autarchia (dal 1936)', 'Produrre tutto in Italia, dopo le sanzioni della Società delle Nazioni'],
        ])}
        <p>In politica estera il fascismo diventa sempre più aggressivo: la <b>guerra d'Etiopia</b> (ottobre 1935 - maggio 1936, con uso di gas tossici) porta alla proclamazione dell'<b>Impero</b> (9 maggio 1936) e alle sanzioni della Società delle Nazioni. L'Italia si avvicina alla Germania: intervento nella guerra civile spagnola a fianco di Franco (1936-39), <b>Asse Roma-Berlino</b> (1936), <b>leggi razziali</b> contro gli ebrei (1938), <b>Patto d'acciaio</b> (maggio 1939).</p>
        ${figura(lineaTempo([
          ['1919', 'Fasci di combattimento; biennio rosso; Fiume'],
          ['1921', 'Nascono PNF e Partito comunista d\'Italia'],
          ['28/10/1922', 'Marcia su Roma', true],
          ['1924', 'Elezioni e delitto Matteotti', true],
          ['3/1/1925', 'Discorso di Mussolini: inizia la dittatura', true],
          ['1925-26', 'Leggi fascistissime'],
          ['1929', 'Patti lateranensi'],
          ['1935-36', 'Guerra d\'Etiopia e proclamazione dell\'Impero'],
          ['1938', 'Leggi razziali', true],
          ['1939', 'Patto d\'acciaio con la Germania'],
        ], 'Linea del tempo del fascismo'), 'Figura 1 – Il fascismo dalla nascita al Patto d\'acciaio.')}
        ${nota('avviso', 'Il fascismo fu totalitario?', 'Il regime voleva esserlo («tutto nello Stato, niente al di fuori dello Stato»), ma dovette convivere con la <b>monarchia</b> (il re resta capo dello Stato e nel 1943 farà arrestare Mussolini) e con la <b>Chiesa</b>. Molti storici parlano perciò di un totalitarismo «imperfetto».')}
        <h2 id="st-s6">6. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Elenca le cause che favorirono l'ascesa del fascismo nel dopoguerra.</li>
          <li>Perché la marcia su Roma non fu un vero colpo di Stato? Quale fu il ruolo del re?</li>
          <li>Spiega come funzionava la legge Acerbo con un esempio numerico.</li>
          <li>Commenta il discorso del 3 gennaio 1925 collocandolo nel suo contesto.</li>
          <li>Quali strumenti usò il regime per ottenere il consenso? E per reprimere il dissenso?</li>
        </ol>` },

      // ============================== 1929 E NAZISMO ==============================
      { id: 'nazismo', titolo: 'La crisi del 1929 e il nazismo', minuti: 20, giorni: -19, corpo: () => `
        <p class="st-intro">Nell'ottobre 1929 il crollo della Borsa di New York apre la più grave crisi economica del Novecento, la <b>Grande depressione</b>. Gli Stati Uniti reagiscono con il <b>New Deal</b>; in Germania la crisi travolge la fragile Repubblica di Weimar e porta al potere <b>Adolf Hitler</b>. Studiamo cause e conseguenze della crisi e la costruzione dello Stato nazista.</p>
        <h2 id="st-s1">1. Gli «anni ruggenti» e il crollo di Wall Street</h2>
        <p>Negli anni Venti gli Stati Uniti sono la prima potenza economica: producono automobili, elettrodomestici, radio; il credito facile spinge i consumi; milioni di americani comprano azioni, spesso a debito, contando su guadagni continui. Ma i salari crescono meno della produzione (<b>sovrapproduzione</b>), l'agricoltura è in crisi e la Borsa è gonfiata dalla <b>speculazione</b>.</p>
        <p>Il <b>24 ottobre 1929</b> («giovedì nero») e il <b>29 ottobre</b> («martedì nero») i prezzi delle azioni crollano. Chi aveva comprato a credito non può pagare, le banche falliscono a catena, le imprese chiudono, la disoccupazione esplode.</p>
        ${figura(barre([
          ['1929', 3.2, '3,2%'], ['1930', 8.7, '8,7%'], ['1931', 15.9, '15,9%'], ['1932', 23.6, '23,6%'], ['1933', 24.9, '24,9%', '#c5483c'], ['1935', 20.1, '20,1%'], ['1937', 14.3, '14,3%'],
        ], 26, 'Disoccupazione negli Stati Uniti 1929-1937'), 'Figura 1 – Disoccupati negli Stati Uniti, in percentuale della forza lavoro (stime storiche).')}
        <h2 id="st-s2">2. La crisi diventa mondiale; il New Deal</h2>
        <p>Le banche americane ritirano i prestiti dall'Europa, soprattutto dalla Germania e dall'Austria (nel 1931 fallisce la Creditanstalt di Vienna). Il commercio mondiale si riduce di due terzi; ogni paese alza i dazi (<b>protezionismo</b>), aggravando la crisi.</p>
        <p>Il presidente <b>Franklin D. Roosevelt</b>, eletto nel 1932, lancia il <b>New Deal</b> («nuovo patto»): lo Stato interviene nell'economia per rilanciare l'occupazione e la domanda. Lavori pubblici (la Tennessee Valley Authority costruisce dighe e centrali), controlli sulle banche e sulla Borsa, sostegno ai prezzi agricoli, sussidi, sindacati riconosciuti, pensioni e assicurazione contro la disoccupazione (<i>Social Security Act</i>, 1935). Le idee dell'economista J. M. <b>Keynes</b> (<i>Teoria generale</i>, 1936) daranno una base teorica a questo intervento pubblico.</p>
        ${fonte('«Lasciatemi affermare la mia ferma convinzione che l\'unica cosa di cui dobbiamo avere paura è la paura stessa.»', 'F. D. Roosevelt, discorso di insediamento, 4 marzo 1933 (traduzione)')}
        <p><b>Commento.</b> Roosevelt parla a un paese in cui le banche sono chiuse e un lavoratore su quattro è disoccupato. La frase indica che la crisi è anche <b>psicologica</b>: il panico spinge a ritirare i risparmi e a non spendere, aggravando il crollo. Restituire fiducia è il primo obiettivo del New Deal. Roosevelt userà la radio («chiacchiere al caminetto») per parlare direttamente agli americani.</p>
        <h2 id="st-s3">3. La Repubblica di Weimar</h2>
        <p>Nel 1919 la Germania diventa una repubblica democratica, con una costituzione scritta a Weimar. Ma nasce debole: accusata dalla destra di aver firmato l'umiliante pace di Versailles (la leggenda della «pugnalata alle spalle»), attaccata dai comunisti (rivolta spartachista, 1919) e dall'estrema destra. Nel <b>1923</b> la Francia occupa la Ruhr perché la Germania non paga le riparazioni: l'<b>iperinflazione</b> distrugge i risparmi (a novembre un dollaro vale oltre 4.000 miliardi di marchi). Nello stesso anno Hitler tenta un colpo di Stato a Monaco (<i>putsch</i> della birreria); in carcere scrive <i>Mein Kampf</i>. Dopo il 1924, con i prestiti americani (piano Dawes) e il ministro Stresemann, arrivano alcuni anni di stabilità, che la crisi del 1929 cancella.</p>
        ${figura(barre([
          ['1928', 2.6, '2,6%'], ['1930', 18.3, '18,3%'], ['lug. 1932', 37.3, '37,3%', '#c5483c'], ['nov. 1932', 33.1, '33,1%'], ['mar. 1933', 43.9, '43,9%', '#7a5cc4'],
        ], 50, 'Voti al partito nazista 1928-1933', '#16365f'), 'Figura 2 – Percentuale di voti del Partito nazionalsocialista (NSDAP) alle elezioni del Reichstag: la crescita segue quella della disoccupazione.')}
        <h2 id="st-s4">4. Hitler al potere e lo Stato nazista</h2>
        ${tabella(['Data', 'Evento'], [
          ['30 gennaio 1933', 'Il presidente Hindenburg nomina Hitler cancelliere'],
          ['27-28 febbraio 1933', 'Incendio del Reichstag, attribuito ai comunisti; decreto che sospende le libertà costituzionali'],
          ['23 marzo 1933', '<b>Legge dei pieni poteri</b>: il governo può fare leggi senza il Parlamento'],
          ['luglio 1933', 'Il partito nazista diventa partito unico'],
          ['30 giugno 1934', '«<b>Notte dei lunghi coltelli</b>»: eliminati i capi delle SA (Röhm) e altri oppositori'],
          ['agosto 1934', 'Morto Hindenburg, Hitler unisce le cariche di cancelliere e presidente: è il <b>Führer</b>'],
          ['15 settembre 1935', '<b>Leggi di Norimberga</b>: gli ebrei perdono la cittadinanza'],
          ['9-10 novembre 1938', '«<b>Notte dei cristalli</b>»: pogrom contro sinagoghe, negozi e case di ebrei'],
        ])}
        <p>Il nazismo è un <b>totalitarismo</b> fondato sull'ideologia della <b>razza</b>: i tedeschi «ariani» sarebbero una razza superiore destinata a dominare, gli ebrei il nemico assoluto. Il regime si basa sul terrore delle <b>SS</b> (Himmler) e della <b>Gestapo</b>, sui campi di concentramento (Dachau, marzo 1933), sulla propaganda di <b>Goebbels</b> (roghi dei libri, cinema, radio, grandi adunate). Il riarmo e i lavori pubblici riducono rapidamente la disoccupazione.</p>
        ${fonte('«I matrimoni tra ebrei e cittadini di sangue tedesco o affine sono proibiti.»', 'Legge per la protezione del sangue e dell\'onore tedesco (una delle leggi di Norimberga), 15 settembre 1935, § 1 (traduzione)')}
        <p><b>Commento.</b> La legge trasforma il razzismo in <b>diritto</b>: lo Stato decide chi può sposare chi in base a una presunta «razza». È il primo passo di un percorso che porterà dall'esclusione civile alla persecuzione e allo sterminio. Una fonte normativa è particolarmente preziosa perché mostra le intenzioni ufficiali dello Stato.</p>
        <h2 id="st-s5">5. La politica estera verso la guerra</h2>
        <p>Hitler vuole cancellare Versailles e conquistare lo «<b>spazio vitale</b>» a est: esce dalla Società delle Nazioni (1933), reintroduce la leva (1935), rimilitarizza la Renania (1936), annette l'Austria (<b>Anschluss</b>, marzo 1938). Alla <b>Conferenza di Monaco</b> (settembre 1938) Francia e Regno Unito, seguendo la politica dell'<b>appeasement</b>, gli concedono i Sudeti cecoslovacchi; nel marzo 1939 Hitler occupa il resto della Boemia e della Moravia. Il <b>23 agosto 1939</b> firma con Stalin il <b>patto Molotov-Ribbentrop</b> di non aggressione, con un protocollo segreto per spartirsi la Polonia.</p>
        ${tabella(['Cause della crisi del 1929', 'Conseguenze'], [
          ['Sovrapproduzione e salari bassi', 'Disoccupazione di massa negli USA e in Europa'],
          ['Speculazione in Borsa e credito facile', 'Fallimenti di banche e imprese'],
          ['Dipendenza dell\'Europa dai prestiti americani', 'Protezionismo, crollo del commercio mondiale'],
          ['Crisi dell\'agricoltura', 'Stato più presente nell\'economia (New Deal, IRI); in Germania, ascesa del nazismo'],
        ])}
        <h2 id="st-s6">6. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Spiega il meccanismo che dal crollo della Borsa portò alla disoccupazione di massa.</li>
          <li>Confronta i due grafici: quale relazione c'è tra crisi economica e voti al nazismo?</li>
          <li>In quali tappe Hitler trasformò il cancellierato in dittatura (1933-34)?</li>
          <li>Che cos'era l'appeasement e perché fallì?</li>
        </ol>` },

      // ============================== SECONDA GUERRA MONDIALE E SHOAH ==============================
      { id: 'seconda-guerra', titolo: 'La Seconda guerra mondiale e la Shoah', minuti: 22, giorni: -15, corpo: () => `
        <p class="st-intro">La <b>Seconda guerra mondiale</b> (1939-1945) è il conflitto più distruttivo della storia: oltre 50 milioni di morti, in maggioranza civili. Dentro la guerra si compie la <b>Shoah</b>, lo sterminio pianificato di circa sei milioni di ebrei europei. Per l'Italia la guerra significa anche la caduta del fascismo, l'occupazione tedesca e la <b>Resistenza</b>.</p>
        <h2 id="st-s1">1. Le fasi della guerra</h2>
        ${tabella(['Fase', 'Eventi principali'], [
          ['<b>1939-40</b>: la guerra lampo', '1° settembre 1939 la Germania invade la Polonia; Francia e Regno Unito dichiarano guerra. L\'URSS occupa la Polonia orientale. Nel 1940 la Germania occupa Danimarca, Norvegia, Olanda, Belgio e sconfigge la Francia in sei settimane (armistizio 22 giugno; governo collaborazionista di Vichy). Il 10 giugno 1940 l\'Italia entra in guerra. Il Regno Unito di Churchill resiste ai bombardamenti (battaglia d\'Inghilterra).'],
          ['<b>1941</b>: la guerra diventa mondiale', '22 giugno: la Germania invade l\'URSS (<b>operazione Barbarossa</b>) e arriva alle porte di Mosca. 7 dicembre: il Giappone attacca la flotta americana a <b>Pearl Harbor</b>; gli Stati Uniti entrano in guerra.'],
          ['<b>1942-43</b>: la svolta', 'Midway (giugno 1942) nel Pacifico; <b>El Alamein</b> (ottobre-novembre 1942) in Africa; <b>Stalingrado</b> (la 6ª armata tedesca si arrende il 2 febbraio 1943). Luglio 1943: sbarco alleato in Sicilia.'],
          ['<b>1944-45</b>: la vittoria alleata', '6 giugno 1944: sbarco in <b>Normandia</b>. L\'Armata Rossa avanza da est fino a Berlino; Hitler si uccide il 30 aprile 1945; la Germania si arrende l\'8 maggio. Il 6 e 9 agosto bombe atomiche su <b>Hiroshima</b> e <b>Nagasaki</b>; il Giappone si arrende il 2 settembre 1945.'],
        ])}
        ${figura(cartina([
          ['Regno Unito', 25, 25, 85, 95, 'blu'], ['Norvegia (occupata)', 140, 10, 75, 90, 'viola'], ['Svezia', 222, 10, 60, 95, 'grigio'], ['Finlandia', 288, 10, 62, 85, 'giallo'],
          ['URSS', 360, 10, 170, 265, 'blu'], ['Francia (occupata / Vichy)', 35, 140, 120, 120, 'viola'], ['Germania', 165, 112, 120, 92, 'rosso'], ['Polonia (occupata)', 289, 112, 68, 92, 'viola'],
          ['Ungheria, Romania, Bulgaria', 252, 212, 102, 50, 'giallo'], ['Svizzera', 160, 220, 60, 34, 'grigio'], ['Spagna e Portogallo', 10, 280, 120, 80, 'grigio'],
          ['Italia', 175, 268, 62, 105, 'rosso'], ['Jugoslavia e Grecia (occupate)', 250, 270, 100, 85, 'viola'], ['Turchia', 368, 292, 120, 55, 'grigio'],
          ['Africa settentrionale', 90, 380, 380, 40, 'verde'],
        ], [['rosso', 'Germania e Italia (Asse)'], ['giallo', 'Alleati dell\'Asse'], ['viola', 'Territori occupati dall\'Asse'], ['blu', 'Alleati'], ['grigio', 'Paesi neutrali'], ['verde', 'Fronte africano 1940-43']],
        `${punto(440, 225, 'Stalingrado', 0, 22, 'middle')}${punto(445, 50, 'Mosca', 0, 19, 'middle')}${punto(380, 400, 'El Alamein', 8, 4)}`, 'Cartina schematica dell\'Europa nel 1942', 430), 'Figura 1 – L\'Europa nel 1942, alla massima espansione dell\'Asse (schema non in scala).')}
        <h2 id="st-s2">2. L'Italia in guerra (1940-1945)</h2>
        <p>Mussolini dichiara guerra il <b>10 giugno 1940</b>, convinto che il conflitto finirà presto. La «guerra parallela» fallisce subito: l'attacco alla Grecia (ottobre 1940) deve essere salvato dai tedeschi, l'Africa orientale è perduta, in Russia l'ARMIR viene travolta nell'inverno 1942-43. Gli Alleati sbarcano in Sicilia il <b>10 luglio 1943</b>.</p>
        <ul>
          <li><b>25 luglio 1943</b>: il Gran Consiglio sfiducia Mussolini; il re lo fa arrestare e nomina capo del governo il maresciallo Badoglio.</li>
          <li><b>8 settembre 1943</b>: viene annunciato l'armistizio con gli Alleati. Il re e il governo fuggono a Brindisi; l'esercito, senza ordini, si sbanda; i tedeschi occupano il Centro-Nord e deportano oltre 600.000 militari italiani (a Cefalonia la divisione Acqui viene massacrata).</li>
          <li>Mussolini, liberato dai tedeschi, fonda la <b>Repubblica sociale italiana</b> (RSI, o di Salò), stato fantoccio dei nazisti.</li>
          <li>Nasce la <b>Resistenza</b>: i partiti antifascisti formano il Comitato di liberazione nazionale (CLN); bande partigiane combattono in montagna e in città. I nazifascisti rispondono con stragi di civili (Fosse Ardeatine, marzo 1944; Marzabotto, autunno 1944).</li>
          <li>Roma è liberata il 4 giugno 1944. Il <b>25 aprile 1945</b> il CLN proclama l'insurrezione generale nel Nord; Mussolini viene catturato e fucilato il 28 aprile.</li>
        </ul>
        ${figura(lineaTempo([
          ['1/9/1939', 'La Germania invade la Polonia', true],
          ['10/6/1940', 'L\'Italia entra in guerra'],
          ['22/6/1941', 'Operazione Barbarossa contro l\'URSS'],
          ['7/12/1941', 'Pearl Harbor: entrano in guerra gli USA', true],
          ['20/1/1942', 'Conferenza di Wannsee: la «soluzione finale»'],
          ['2/2/1943', 'Resa tedesca a Stalingrado', true],
          ['25/7/1943', 'Caduta di Mussolini'],
          ['8/9/1943', 'Armistizio; occupazione tedesca; inizia la Resistenza', true],
          ['6/6/1944', 'Sbarco in Normandia'],
          ['27/1/1945', 'L\'Armata Rossa entra ad Auschwitz'],
          ['25/4/1945', 'Liberazione dell\'Italia', true],
          ['8/5/1945', 'Resa della Germania'],
          ['6 e 9/8/1945', 'Bombe atomiche su Hiroshima e Nagasaki'],
          ['2/9/1945', 'Resa del Giappone: fine della guerra'],
        ], 'Linea del tempo della Seconda guerra mondiale'), 'Figura 2 – La Seconda guerra mondiale e l\'Italia.')}
        <h2 id="st-s3">3. La Shoah</h2>
        <p><b>Shoah</b> è la parola ebraica che significa «catastrofe»: indica lo sterminio degli ebrei d'Europa da parte della Germania nazista e dei suoi alleati. Si parla anche di <b>Olocausto</b>. Fu un genocidio pianificato e organizzato con i mezzi di uno Stato moderno.</p>
        ${tabella(['Fase', 'Anni', 'Che cosa accade'], [
          ['Esclusione', '1933-1938', 'Boicottaggi, licenziamenti, leggi di Norimberga (1935), notte dei cristalli (1938)'],
          ['Ghettizzazione', '1939-1941', 'In Polonia gli ebrei sono chiusi nei ghetti (Varsavia, Łódź): fame e malattie'],
          ['Stragi', 'dal 1941', 'Nei territori sovietici occupati le <i>Einsatzgruppen</i> fucilano centinaia di migliaia di ebrei (Babij Jar, 1941)'],
          ['Sterminio industriale', '1942-1945', 'Dopo la conferenza di <b>Wannsee</b> (gennaio 1942) i deportati sono uccisi nelle camere a gas dei campi di sterminio: Auschwitz-Birkenau, Treblinka, Sobibór, Bełżec, Chełmno, Majdanek'],
        ])}
        <p>Furono perseguitati e uccisi anche <b>rom e sinti</b>, <b>disabili</b> (programma di «eutanasia» T4), omosessuali, testimoni di Geova, oppositori politici, prigionieri di guerra sovietici. In Italia le <b>leggi razziali</b> del 1938 esclusero gli ebrei da scuole, impieghi e professioni; dopo l'8 settembre 1943 iniziarono le deportazioni (il 16 ottobre 1943 oltre mille ebrei romani furono catturati nel ghetto e deportati ad Auschwitz: ne tornarono sedici). Funzionarono campi di transito come <b>Fossoli</b> e la <b>Risiera di San Sabba</b> a Trieste.</p>
        ${fonte('«La Repubblica italiana riconosce il giorno 27 gennaio, data dell\'abbattimento dei cancelli di Auschwitz, "Giorno della Memoria", al fine di ricordare la Shoah (sterminio del popolo ebraico), le leggi razziali, la persecuzione italiana dei cittadini ebrei, gli italiani che hanno subìto la deportazione, la prigionia, la morte […]»', 'Legge 20 luglio 2000, n. 211, art. 1')}
        <p><b>Commento.</b> La legge non ricorda solo lo sterminio compiuto dai nazisti, ma anche le responsabilità italiane: le leggi razziali e la «persecuzione italiana dei cittadini ebrei». È un esempio di <b>memoria pubblica</b>: lo Stato sceglie una data e chiede alle scuole di riflettere, perché ciò che è accaduto non si ripeta.</p>
        ${nota('info', 'Dopo la guerra', 'Al <b>processo di Norimberga</b> (1945-46) i capi nazisti furono giudicati per crimini contro la pace, crimini di guerra e <b>crimini contro l\'umanità</b>. Nel 1945 nasce l\'<b>ONU</b>; nel 1948 vengono approvate la <b>Dichiarazione universale dei diritti umani</b> e la Convenzione contro il genocidio.')}
        <h2 id="st-s4">4. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Perché il 1942-43 è considerato l'anno della svolta? Indica tre battaglie.</li>
          <li>Spiega che cosa accadde in Italia tra il 25 luglio e l'8 settembre 1943.</li>
          <li>Descrivi le fasi della Shoah e spiega il ruolo della conferenza di Wannsee.</li>
          <li>Perché la legge sul Giorno della Memoria cita la «persecuzione italiana»?</li>
          <li>Che cos'è la Resistenza e quale ruolo ebbe nella nascita della Repubblica?</li>
        </ol>` },

      // ============================== GUERRA FREDDA E DECOLONIZZAZIONE ==============================
      { id: 'guerra-fredda', titolo: 'La Guerra fredda e la decolonizzazione', minuti: 20, giorni: -11, corpo: () => `
        <p class="st-intro">Dopo il 1945 il mondo si divide in due blocchi guidati dalle superpotenze, <b>Stati Uniti</b> e <b>Unione Sovietica</b>. È la <b>Guerra fredda</b> (1947-1991): un confronto politico, economico, ideologico e militare che non diventa mai guerra diretta tra i due, grazie alla paura delle armi atomiche. Negli stessi anni gli imperi coloniali europei crollano: è la <b>decolonizzazione</b>.</p>
        <h2 id="st-s1">1. La divisione del mondo</h2>
        <p>Già alla conferenza di <b>Jalta</b> (febbraio 1945) Roosevelt, Churchill e Stalin avevano deciso il destino dell'Europa liberata. Dopo la guerra nell'Europa dell'Est occupata dall'Armata Rossa si instaurano regimi comunisti controllati da Mosca (le «democrazie popolari»).</p>
        ${fonte('«Da Stettino nel Baltico a Trieste nell\'Adriatico, una cortina di ferro è scesa attraverso il continente.»', 'W. Churchill, discorso di Fulton (Missouri), 5 marzo 1946 (traduzione)')}
        <p><b>Commento.</b> L'ex primo ministro britannico usa per primo l'immagine della «<b>cortina di ferro</b>» per indicare il confine tra l'Europa occidentale e quella controllata dall'URSS. È un discorso che invita gli Stati Uniti a non ritirarsi dall'Europa: annuncia la politica che, un anno dopo, diventerà la <b>dottrina Truman</b> del «contenimento» del comunismo.</p>
        ${tabella(['', 'Blocco occidentale', 'Blocco orientale'], [
          ['Guida', 'Stati Uniti', 'Unione Sovietica'],
          ['Sistema politico', 'Democrazie parlamentari (con eccezioni: Spagna, Portogallo, Grecia dei colonnelli)', 'Regimi a partito unico comunista'],
          ['Economia', 'Capitalismo, mercato', 'Economia pianificata dallo Stato'],
          ['Aiuti economici', '<b>Piano Marshall</b> (1947)', '<b>Comecon</b> (1949)'],
          ['Alleanza militare', '<b>NATO</b> (4 aprile 1949)', '<b>Patto di Varsavia</b> (1955)'],
        ])}
        ${figura(cartina([
          ['Regno Unito', 25, 25, 85, 95, 'blu'], ['Norvegia', 140, 10, 70, 80, 'blu'], ['Svezia', 216, 10, 60, 95, 'grigio'], ['Finlandia', 282, 10, 68, 85, 'grigio'],
          ['URSS', 360, 10, 170, 268, 'rosso'], ['Danimarca', 140, 96, 70, 30, 'blu'], ['Benelux', 105, 132, 58, 42, 'blu'], ['Francia', 30, 182, 125, 100, 'blu'],
          ['RFT', 168, 132, 68, 100, 'blu'], ['DDR', 243, 110, 55, 86, 'rosso'], ['Polonia', 303, 110, 52, 95, 'rosso'], ['Cecoslovacchia', 243, 200, 112, 38, 'rosso'],
          ['Svizzera', 160, 240, 52, 34, 'grigio'], ['Austria', 216, 244, 64, 32, 'grigio'], ['Ungheria', 285, 244, 70, 34, 'rosso'], ['Romania', 360, 284, 70, 40, 'rosso'],
          ['Portogallo', 6, 300, 68, 80, 'blu'], ['Spagna', 78, 300, 80, 80, 'grigio'], ['Italia', 180, 288, 62, 110, 'blu'], ['Jugoslavia', 250, 284, 92, 54, 'giallo'],
          ['Bulgaria', 360, 330, 70, 36, 'rosso'], ['Albania', 254, 344, 52, 40, 'rosso'], ['Grecia', 310, 372, 72, 46, 'blu'], ['Turchia', 440, 300, 92, 64, 'blu'],
        ], [['blu', 'Paesi NATO'], ['rosso', 'Patto di Varsavia'], ['giallo', 'Non allineati (Jugoslavia)'], ['grigio', 'Neutrali o fuori dai blocchi']],
        `<path d="M239 100V200M239 240H282V284M282 284L244 290" fill="none" stroke="#c5483c" stroke-width="4" stroke-dasharray="8 5"/>${punto(270, 122, 'Berlino', 0, 18, 'middle')}`,
        'Cartina schematica dell\'Europa della Guerra fredda', 430), 'Figura 1 – L\'Europa divisa negli anni Cinquanta e Sessanta (schema non in scala). La linea tratteggiata rossa è la cortina di ferro; la Spagna entra nella NATO nel 1982, l\'Albania lascia il Patto di Varsavia nel 1968.')}
        <h2 id="st-s2">2. Le crisi della Guerra fredda</h2>
        ${tabella(['Anni', 'Crisi', 'Che cosa accade'], [
          ['1948-49', 'Blocco di Berlino', 'L\'URSS blocca gli accessi a Berlino Ovest; gli USA la riforniscono con un ponte aereo. Nel 1949 nascono due Germanie: RFT e DDR'],
          ['1950-53', 'Guerra di Corea', 'La Corea del Nord comunista invade il Sud; intervengono USA (con l\'ONU) e Cina. La penisola resta divisa al 38° parallelo'],
          ['1956', 'Ungheria', 'La rivolta contro il regime comunista è schiacciata dai carri armati sovietici'],
          ['1961', 'Muro di Berlino', 'Costruito il 13 agosto dalla DDR per fermare la fuga verso Ovest'],
          ['1962', 'Crisi dei missili di Cuba', 'L\'URSS installa missili a Cuba; Kennedy ordina il blocco navale; dopo 13 giorni Chruščëv li ritira. Il mondo è vicino alla guerra nucleare'],
          ['1964-1975', 'Guerra del Vietnam', 'Gli USA combattono contro il Vietnam del Nord comunista e i guerriglieri vietcong; si ritirano nel 1973; Saigon cade nel 1975'],
          ['1968', 'Primavera di Praga', 'Il «socialismo dal volto umano» di Dubček è fermato dai carri del Patto di Varsavia'],
        ])}
        <p>Ci sono anche fasi di <b>distensione</b>: dopo la morte di Stalin (1953) Chruščëv denuncia i suoi crimini (XX Congresso, 1956) e parla di «coesistenza pacifica»; negli anni Settanta USA e URSS firmano accordi per limitare le armi nucleari (SALT, 1972). La corsa agli armamenti e la corsa allo spazio (Sputnik 1957, Gagarin 1961, sbarco sulla Luna 1969) continuano.</p>
        <h2 id="st-s3">3. La fine della Guerra fredda</h2>
        <p>Negli anni Ottanta l'economia sovietica è in crisi e la guerra in Afghanistan (1979-89) la dissangua. <b>Michail Gorbačëv</b>, segretario del PCUS dal 1985, avvia riforme di trasparenza (<i>glasnost</i>) e ricostruzione (<i>perestrojka</i>) e rinuncia a intervenire nei paesi dell'Est. Il <b>9 novembre 1989</b> cade il <b>Muro di Berlino</b>; la Germania si riunifica il 3 ottobre 1990; il <b>26 dicembre 1991</b> l'URSS si dissolve.</p>
        ${figura(lineaTempo([
          ['1945', 'Jalta, fine della guerra, nasce l\'ONU'],
          ['1947', 'Dottrina Truman e Piano Marshall', true],
          ['1949', 'NATO; nascono RFT e DDR; Cina comunista; bomba atomica sovietica'],
          ['1950-53', 'Guerra di Corea'],
          ['1955', 'Patto di Varsavia'],
          ['1961', 'Muro di Berlino', true],
          ['1962', 'Crisi dei missili di Cuba', true],
          ['1968', 'Primavera di Praga'],
          ['1985', 'Gorbačëv al potere in URSS'],
          ['9/11/1989', 'Caduta del Muro di Berlino', true],
          ['1991', 'Fine dell\'URSS'],
        ], 'Linea del tempo della Guerra fredda'), 'Figura 2 – Le tappe della Guerra fredda.')}
        <h2 id="st-s4">4. La decolonizzazione</h2>
        <p>Le cause sono diverse: le potenze coloniali escono indebolite dalla guerra; i popoli colonizzati, che hanno combattuto per esse, chiedono l'indipendenza; ONU, USA e URSS sono contrari al colonialismo; nascono movimenti nazionalisti guidati da élite istruite in Europa.</p>
        ${tabella(['Paese', 'Anno', 'Come'], [
          ['<b>India</b> e Pakistan', '1947', 'Indipendenza dal Regno Unito dopo la lotta non violenta di <b>Gandhi</b>; la divisione tra India induista e Pakistan musulmano provoca violenze e milioni di profughi'],
          ['Indonesia', '1949', 'Indipendenza dai Paesi Bassi dopo una guerra'],
          ['Indocina (Vietnam, Laos, Cambogia)', '1954', 'I francesi sono sconfitti a <b>Dien Bien Phu</b>; il Vietnam viene diviso'],
          ['Ghana', '1957', 'Primo stato dell\'Africa subsahariana indipendente (Nkrumah)'],
          ['17 stati africani', '1960', '«<b>Anno dell\'Africa</b>»: indipendenza di gran parte delle colonie francesi, del Congo belga, della Nigeria'],
          ['<b>Algeria</b>', '1962', 'Dopo una guerra durissima (1954-62) contro la Francia'],
        ])}
        <p>Nel 1955, alla <b>conferenza di Bandung</b> (Indonesia), i nuovi stati di Asia e Africa si dichiarano estranei ai due blocchi: nasce il movimento dei <b>paesi non allineati</b> e si diffonde l'espressione «Terzo mondo». L'indipendenza politica però spesso non porta benessere: confini artificiali, guerre civili, dittature e dipendenza economica dalle ex potenze (<b>neocolonialismo</b>). In Sudafrica il regime razzista dell'<b>apartheid</b> (1948-1991) finisce con la liberazione di <b>Nelson Mandela</b> (1990), che nel 1994 diventa il primo presidente nero del paese.</p>
        ${nota('info', 'Nello stesso periodo', 'Nel 1948 nasce lo <b>Stato d\'Israele</b>: il conflitto arabo-israeliano e la questione palestinese diventano uno dei nodi principali della politica internazionale. Nel 1956 la crisi di <b>Suez</b> (nazionalizzazione del canale da parte dell\'egiziano Nasser) segna la fine del ruolo imperiale di Francia e Regno Unito.')}
        <h2 id="st-s5">5. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Perché la Guerra fredda è chiamata «fredda»? Che ruolo ebbero le armi atomiche?</li>
          <li>Racconta la crisi di Cuba del 1962 in 10 righe.</li>
          <li>Che cosa significa «non allineati» e dove nacque questo movimento?</li>
          <li>Confronta la decolonizzazione dell'India e quella dell'Algeria.</li>
        </ol>` },

      // ============================== ITALIA REPUBBLICANA ==============================
      { id: 'repubblica', titolo: 'L\'Italia repubblicana', minuti: 20, giorni: -7, corpo: () => `
        <p class="st-intro">Dal 1946 l'Italia è una <b>repubblica democratica</b>. In pochi decenni il paese cambia più che nei secoli precedenti: la ricostruzione, la <b>Costituzione</b>, il «<b>miracolo economico</b>», le lotte del '68, gli <b>anni di piombo</b> segnati dal terrorismo, la lotta alla mafia. Ripercorriamo le tappe principali fino agli anni Novanta.</p>
        <h2 id="st-s1">1. La nascita della Repubblica</h2>
        <p>Il <b>2 giugno 1946</b> gli italiani votano con un <b>referendum</b> la forma dello Stato e, contemporaneamente, eleggono l'<b>Assemblea costituente</b>. Per la prima volta a un voto nazionale partecipano anche le <b>donne</b>. Vince la Repubblica; il re Umberto II (Vittorio Emanuele III aveva abdicato a maggio) lascia l'Italia. Il voto mostra un paese diviso: il Nord vota in maggioranza per la Repubblica, il Sud per la monarchia.</p>
        ${figura(barre([
          ['Repubblica', 54.3, '54,3% (12,7 milioni)', '#1a5fb4'], ['Monarchia', 45.7, '45,7% (10,7 milioni)', '#8a96a3'],
        ], 90, 'Risultati del referendum del 2 giugno 1946'), 'Figura 1 – Il referendum istituzionale del 2 giugno 1946 (voti validi).')}
        ${figura(barre([
          ['DC', 207, '207 seggi', '#1a5fb4'], ['PSIUP (socialisti)', 115, '115', '#c5483c'], ['PCI', 104, '104', '#a3302a'], ['Altri partiti', 130, '130', '#8a96a3'],
        ], 230, 'Seggi all\'Assemblea costituente'), 'Figura 2 – I 556 seggi dell\'Assemblea costituente: i tre partiti di massa ne hanno quasi i tre quarti.')}
        <p>L'Assemblea scrive la <b>Costituzione</b>, approvata il 22 dicembre 1947 ed entrata in vigore il <b>1° gennaio 1948</b>. È frutto di un compromesso tra le culture politiche della Resistenza: cattolica, socialista-comunista, liberale e azionista. Il primo presidente provvisorio è Enrico De Nicola.</p>
        <h2 id="st-s2">2. Gli anni del centrismo (1948-1958)</h2>
        <p>Nel 1947 De Gasperi esclude comunisti e socialisti dal governo: la Guerra fredda entra nella politica italiana. Alle elezioni del <b>18 aprile 1948</b> la <b>Democrazia cristiana</b> ottiene il 48,5% e la maggioranza assoluta dei seggi alla Camera, contro il Fronte popolare di PCI e PSI. L'Italia sceglie l'Occidente: Piano Marshall, adesione alla <b>NATO</b> (1949), alla CECA (1951) e alla <b>CEE</b> (1957). Il 14 luglio 1948 l'attentato al segretario comunista Togliatti porta il paese vicino all'insurrezione. Nel 1950 la riforma agraria e la Cassa per il Mezzogiorno cercano di ridurre il divario con il Sud.</p>
        <h2 id="st-s3">3. Il miracolo economico (1958-1963)</h2>
        <p>In pochi anni l'Italia diventa un paese industriale: il prodotto interno cresce di circa il 6% all'anno. Le cause: bassi salari, energia a buon mercato (ENI di Enrico Mattei), aiuti americani, apertura del Mercato comune europeo, ruolo delle industrie pubbliche (IRI).</p>
        ${tabella(['Trasformazione', 'Esempi'], [
          ['Consumi di massa', 'Automobili utilitarie (FIAT 600 nel 1955, 500 nel 1957), frigoriferi, lavatrici; autostrade (Autostrada del Sole, completata nel 1964)'],
          ['Televisione', 'Iniziano le trasmissioni regolari della RAI (3 gennaio 1954): la TV diffonde l\'italiano e nuovi modelli di vita'],
          ['Migrazioni interne', 'Milioni di persone si spostano dal Sud e dal Nord-Est verso il triangolo industriale e dalle campagne alle città'],
          ['Problemi', 'Divario Nord-Sud, speculazione edilizia, periferie senza servizi, consumi privati più dei servizi pubblici'],
        ])}
        <p>Negli anni Sessanta nasce il <b>centro-sinistra</b> (DC e PSI insieme al governo, primo governo Moro nel 1963), che realizza la <b>scuola media unica</b> e la nazionalizzazione dell'energia elettrica (ENEL), entrambe nel 1962.</p>
        <h2 id="st-s4">4. Il '68 e le riforme degli anni Settanta</h2>
        <p>Il movimento degli studenti (1968) e le lotte operaie dell'«<b>autunno caldo</b>» (1969) chiedono una società più giusta e meno autoritaria. Ne derivano importanti riforme: <b>Statuto dei lavoratori</b> (1970), istituzione delle <b>Regioni</b> ordinarie (1970), legge sul <b>divorzio</b> (1970, confermata dal referendum del 1974), nuovo diritto di famiglia con la parità tra coniugi (1975), maggiore età a 18 anni (1975), Servizio sanitario nazionale (1978).</p>
        <h2 id="st-s5">5. Gli anni di piombo</h2>
        <p>Tra la fine degli anni Sessanta e l'inizio degli anni Ottanta l'Italia è colpita da due forme di violenza politica. Il terrorismo <b>neofascista</b> mette bombe tra la folla, nella cosiddetta «<b>strategia della tensione</b>», con coperture di apparati deviati dello Stato; il terrorismo <b>di estrema sinistra</b> (soprattutto le <b>Brigate rosse</b>) colpisce giornalisti, magistrati, sindacalisti, politici, poliziotti.</p>
        ${tabella(['Data', 'Evento'], [
          ['12 dicembre 1969', 'Strage di <b>piazza Fontana</b> a Milano (Banca nazionale dell\'agricoltura): 17 morti'],
          ['28 maggio 1974', 'Strage di piazza della Loggia a Brescia durante una manifestazione antifascista'],
          ['16 marzo 1978', 'Le Brigate rosse rapiscono <b>Aldo Moro</b>, presidente della DC, in via Fani a Roma, uccidendo i cinque uomini della scorta'],
          ['9 maggio 1978', 'Moro viene ucciso dopo 55 giorni di prigionia; il corpo è ritrovato in via Caetani'],
          ['2 agosto 1980', 'Strage alla <b>stazione di Bologna</b>: 85 morti, l\'attentato più grave della storia repubblicana'],
        ])}
        <p>Moro era l'artefice, con il segretario del PCI Enrico Berlinguer, della politica di «solidarietà nazionale» (il PCI appoggia dall'esterno i governi DC): il suo assassinio segna una svolta. Lo Stato sconfigge il terrorismo negli anni Ottanta, anche grazie ai «pentiti».</p>
        <h2 id="st-s6">6. La lotta alla mafia e la fine della «prima Repubblica»</h2>
        <p>Negli anni Ottanta Cosa nostra uccide il generale <b>Carlo Alberto dalla Chiesa</b>, prefetto di Palermo (1982). Il pool antimafia di Palermo, con <b>Giovanni Falcone</b> e <b>Paolo Borsellino</b>, porta alla condanna di centinaia di mafiosi nel maxiprocesso (1986-87). Nel 1992 la mafia risponde con le stragi di <b>Capaci</b> (23 maggio, Falcone, la moglie e tre agenti di scorta) e di <b>via D'Amelio</b> (19 luglio, Borsellino e cinque agenti). Nello stesso 1992 l'inchiesta <b>Mani pulite</b> scopre un vasto sistema di corruzione (Tangentopoli): i partiti tradizionali crollano e nel 1994 si apre una nuova fase politica.</p>
        ${figura(lineaTempo([
          ['2/6/1946', 'Referendum: nasce la Repubblica', true],
          ['1/1/1948', 'Entra in vigore la Costituzione', true],
          ['18/4/1948', 'Elezioni: vittoria della DC'],
          ['1958-63', 'Miracolo economico'],
          ['1962-63', 'Centro-sinistra: scuola media unica, ENEL'],
          ['1968-69', 'Movimento studentesco e autunno caldo'],
          ['12/12/1969', 'Strage di piazza Fontana', true],
          ['1970', 'Statuto dei lavoratori, Regioni, divorzio'],
          ['1978', 'Rapimento e uccisione di Aldo Moro', true],
          ['2/8/1980', 'Strage della stazione di Bologna'],
          ['1992', 'Stragi di Capaci e via D\'Amelio; Mani pulite', true],
        ], 'Linea del tempo dell\'Italia repubblicana'), 'Figura 3 – L\'Italia repubblicana dal 1946 al 1992.')}
        <h2 id="st-s7">7. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Commenta i dati del referendum del 1946: che cosa ci dicono sull'Italia di allora?</li>
          <li>Quali furono le cause e le conseguenze sociali del miracolo economico?</li>
          <li>Distingui i due tipi di terrorismo degli anni di piombo, con un esempio ciascuno.</li>
          <li>Perché il 1992 è considerato un anno di svolta?</li>
        </ol>` },

      // ============================== EDUCAZIONE CIVICA ==============================
      { id: 'cittadinanza', titolo: 'Educazione civica: Costituzione e Unione europea', minuti: 18, giorni: -3, corpo: () => `
        <p class="st-intro">Questa dispensa di <b>Educazione civica</b> riprende gli argomenti di storia per studiare le regole della nostra convivenza: la <b>Costituzione italiana</b>, i suoi principi e l'ordinamento dello Stato, e l'<b>Unione europea</b>, con la sua storia, le istituzioni e i diritti dei cittadini europei. Sono temi richiesti anche al colloquio dell'Esame di Stato.</p>
        <h2 id="st-s1">1. La Costituzione: struttura e caratteri</h2>
        ${tabella(['Parte', 'Articoli', 'Contenuto'], [
          ['Principi fondamentali', '1-12', 'Democrazia, diritti inviolabili, uguaglianza, lavoro, autonomie, minoranze, rapporti con la Chiesa, cultura e ambiente, ripudio della guerra, bandiera'],
          ['Parte I – Diritti e doveri dei cittadini', '13-54', 'Rapporti civili, etico-sociali, economici e politici'],
          ['Parte II – Ordinamento della Repubblica', '55-139', 'Parlamento, Presidente della Repubblica, Governo, Magistratura, Regioni ed enti locali, garanzie costituzionali'],
          ['Disposizioni transitorie e finali', 'I-XVIII', 'Tra queste la XII: divieto di riorganizzare il disciolto partito fascista'],
        ])}
        <p>La Costituzione è <b>scritta</b>, <b>lunga</b> (non si limita a organizzare lo Stato ma elenca diritti e obiettivi), <b>votata</b> da un'assemblea eletta dal popolo, <b>compromissoria</b> (frutto dell'accordo tra forze diverse), <b>democratica</b> e soprattutto <b>rigida</b>: per modificarla serve una procedura speciale (art. 138: due deliberazioni per ciascuna Camera a distanza di almeno tre mesi, maggioranza assoluta nella seconda votazione, eventuale referendum), e una legge ordinaria contraria può essere annullata dalla <b>Corte costituzionale</b>. Lo Statuto albertino del 1848, invece, era flessibile: per questo il fascismo poté svuotarlo con leggi ordinarie.</p>
        <h2 id="st-s2">2. Tre articoli da conoscere (fonti)</h2>
        ${fonte('«L\'Italia è una Repubblica democratica, fondata sul lavoro. La sovranità appartiene al popolo, che la esercita nelle forme e nei limiti della Costituzione.»', 'Costituzione della Repubblica italiana, art. 1')}
        <p><b>Commento.</b> Il lavoro è posto a fondamento della Repubblica: la dignità di una persona dipende dal suo contributo alla società, non dalla nascita o dalla ricchezza. La sovranità è del popolo, ma deve rispettare le regole (forme e limiti): non c'è una «volontà popolare» che possa calpestare i diritti.</p>
        ${fonte('«Tutti i cittadini hanno pari dignità sociale e sono eguali davanti alla legge, senza distinzione di sesso, di razza, di lingua, di religione, di opinioni politiche, di condizioni personali e sociali. È compito della Repubblica rimuovere gli ostacoli di ordine economico e sociale, che, limitando di fatto la libertà e l\'eguaglianza dei cittadini, impediscono il pieno sviluppo della persona umana e l\'effettiva partecipazione di tutti i lavoratori all\'organizzazione politica, economica e sociale del Paese.»', 'Costituzione, art. 3')}
        <p><b>Commento.</b> Il primo comma afferma l'<b>uguaglianza formale</b>: la legge è uguale per tutti (scritto dopo le leggi razziali del 1938, il riferimento alla «razza» ha un significato preciso). Il secondo comma afferma l'<b>uguaglianza sostanziale</b>: non basta proclamare l'uguaglianza, lo Stato deve agire (scuola pubblica, sanità, borse di studio) perché le condizioni di partenza non impediscano a qualcuno di realizzarsi.</p>
        ${fonte('«L\'Italia ripudia la guerra come strumento di offesa alla libertà degli altri popoli e come mezzo di risoluzione delle controversie internazionali; consente, in condizioni di parità con gli altri Stati, alle limitazioni di sovranità necessarie ad un ordinamento che assicuri la pace e la giustizia fra le Nazioni; promuove e favorisce le organizzazioni internazionali rivolte a tale scopo.»', 'Costituzione, art. 11')}
        <p><b>Commento.</b> Dopo le guerre fasciste, la Costituzione «ripudia» (verbo fortissimo) la guerra di aggressione. La seconda parte dell'articolo è la base giuridica della partecipazione dell'Italia all'<b>ONU</b> e all'<b>Unione europea</b>: l'Italia accetta di cedere parte della propria sovranità a organizzazioni che garantiscono la pace.</p>
        <h2 id="st-s3">3. L'ordinamento dello Stato</h2>
        ${figura(mappa('La separazione dei poteri', [
          ['Potere legislativo: Parlamento', 'Camera (400 deputati) e Senato (200 senatori elettivi): fanno le leggi e danno la fiducia al Governo.'],
          ['Potere esecutivo: Governo', 'Presidente del Consiglio e ministri: attuano le leggi e guidano l\'amministrazione.'],
          ['Potere giudiziario: Magistratura', 'Giudici autonomi e indipendenti; li governa il Consiglio superiore della magistratura (CSM).'],
          ['Presidente della Repubblica', 'Capo dello Stato, eletto dal Parlamento in seduta comune (con i delegati regionali) per 7 anni; garante della Costituzione.'],
          ['Corte costituzionale', '15 giudici: controlla che le leggi rispettino la Costituzione.'],
          ['Popolo', 'Elegge il Parlamento, vota i referendum, propone leggi (50.000 firme).'],
        ], 'Mappa dell\'ordinamento dello Stato'), 'Figura 1 – Gli organi costituzionali (dal 2022 i parlamentari elettivi sono 600).')}
        <p><b>Come nasce una legge (iter legislativo):</b> iniziativa (Governo, ogni parlamentare, 50.000 elettori, Consigli regionali, CNEL) → esame e approvazione dello <b>stesso testo</b> da parte di entrambe le Camere (bicameralismo perfetto) → <b>promulgazione</b> del Presidente della Repubblica (che può rinviarla una volta alle Camere) → pubblicazione nella <i>Gazzetta Ufficiale</i> → entrata in vigore, di norma dopo 15 giorni (<i>vacatio legis</i>).</p>
        ${nota('info', 'Il referendum abrogativo (art. 75)', 'Lo chiedono <b>500.000 elettori</b> o <b>cinque Consigli regionali</b>; serve a cancellare in tutto o in parte una legge. È valido solo se vota la maggioranza degli aventi diritto (<b>quorum</b>). Non è ammesso per le leggi tributarie e di bilancio, di amnistia e indulto, di ratifica dei trattati internazionali.')}
        <h2 id="st-s4">4. L'Unione europea: la storia</h2>
        ${fonte('«L\'Europa non potrà farsi in una sola volta, né sarà costruita tutta insieme; essa sorgerà da realizzazioni concrete che creino anzitutto una solidarietà di fatto.»', 'Dichiarazione di Robert Schuman, ministro degli Esteri francese, 9 maggio 1950')}
        <p><b>Commento.</b> Schuman propone di mettere in comune la produzione di carbone e acciaio di Francia e Germania, le materie prime della guerra: così un nuovo conflitto tra i due paesi diventerà «materialmente impossibile». È il metodo <b>funzionalista</b>: si parte dall'economia per arrivare all'unione politica. Il 9 maggio è oggi la Festa dell'Europa. Già nel 1941, al confino, Altiero Spinelli, Ernesto Rossi ed Eugenio Colorni avevano scritto il <b>Manifesto di Ventotene</b>, che proponeva una federazione europea.</p>
        ${figura(lineaTempo([
          ['1941', 'Manifesto di Ventotene'],
          ['1951', 'Trattato di Parigi: CECA (Comunità del carbone e dell\'acciaio)'],
          ['1957', 'Trattati di Roma: CEE ed Euratom; sei paesi fondatori', true],
          ['1973', 'Entrano Regno Unito, Irlanda, Danimarca'],
          ['1979', 'Prima elezione diretta del Parlamento europeo'],
          ['1985', 'Accordo di Schengen sulla libera circolazione'],
          ['1992', 'Trattato di Maastricht: nasce l\'Unione europea', true],
          ['2002', 'L\'euro entra in circolazione', true],
          ['2004', 'Allargamento a dieci nuovi paesi, soprattutto dell\'Est'],
          ['2007', 'Trattato di Lisbona (in vigore dal 2009)'],
          ['2020', 'Il Regno Unito esce dall\'UE (Brexit): gli stati membri sono 27'],
        ], 'Linea del tempo dell\'integrazione europea'), 'Figura 2 – Dalla CECA all\'Unione europea.')}
        <p>I sei <b>paesi fondatori</b> sono Belgio, Francia, Germania (Ovest), Italia, Lussemburgo e Paesi Bassi.</p>
        <h2 id="st-s5">5. Le istituzioni europee</h2>
        ${tabella(['Istituzione', 'Sede', 'Composizione', 'Funzione'], [
          ['<b>Parlamento europeo</b>', 'Strasburgo (e Bruxelles)', 'Deputati eletti ogni 5 anni dai cittadini (720 nel 2024)', 'Approva le leggi e il bilancio insieme al Consiglio; elegge il presidente della Commissione'],
          ['<b>Consiglio europeo</b>', 'Bruxelles', 'Capi di Stato o di governo dei 27 e un presidente', 'Fissa gli orientamenti politici generali'],
          ['<b>Consiglio dell\'UE</b>', 'Bruxelles', 'Un ministro per ogni stato, secondo la materia', 'Approva le leggi con il Parlamento'],
          ['<b>Commissione europea</b>', 'Bruxelles', 'Un commissario per stato', 'Propone le leggi, le fa applicare, è il «governo» dell\'UE'],
          ['<b>Corte di giustizia</b>', 'Lussemburgo', 'Un giudice per stato', 'Garantisce l\'applicazione uniforme del diritto europeo'],
          ['<b>Banca centrale europea</b>', 'Francoforte', 'Consiglio direttivo', 'Politica monetaria dei paesi dell\'euro, stabilità dei prezzi'],
        ])}
        <h2 id="st-s6">6. Essere cittadini europei</h2>
        <p>Con il Trattato di Maastricht ogni cittadino di uno stato membro è anche <b>cittadino dell'Unione</b>. Ha il diritto di: circolare e soggiornare liberamente negli altri paesi; votare ed essere eletto alle elezioni europee e comunali nel paese in cui risiede; ricevere protezione dalle ambasciate di qualsiasi altro stato membro fuori dall'UE; presentare petizioni al Parlamento europeo e rivolgersi al Mediatore europeo; promuovere un'iniziativa dei cittadini europei (un milione di firme). La <b>Carta dei diritti fondamentali dell'UE</b> (Nizza, 2000) è vincolante dal 2009. Grazie al programma <b>Erasmus+</b> milioni di studenti hanno studiato o fatto tirocini in un altro paese.</p>
        ${nota('avviso', 'Non confondere', 'Il <b>Consiglio europeo</b> (capi di Stato e di governo, UE) è diverso dal <b>Consiglio d\'Europa</b>, un\'organizzazione internazionale con sede a Strasburgo (46 paesi) che non fa parte dell\'UE e ha creato la Convenzione europea dei diritti dell\'uomo (1950).')}
        <h2 id="st-s7">7. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Spiega la differenza tra uguaglianza formale e sostanziale, con due esempi.</li>
          <li>Perché si dice che la Costituzione italiana è «rigida»? Che cosa cambia rispetto allo Statuto albertino?</li>
          <li>Descrivi l'iter di una legge ordinaria dall'iniziativa alla pubblicazione.</li>
          <li>Quali diritti ti dà la cittadinanza europea? Quale usi o userai di più?</li>
          <li>Prepara per il colloquio un collegamento tra l'art. 11 della Costituzione e la nascita dell'Europa unita.</li>
        </ol>` },
    ],
  };
})();
