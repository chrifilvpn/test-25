// DRAGHI E SEGRETE: il master. Parla con Gemini (chiave GEMINI_API_KEY, la stessa di fantasIA, ma senza i limiti
// della chat e senza filtri: l'ha chiesto chi gestisce il sito, che è solo per adulti). Il master racconta, interpreta
// i personaggi non giocanti e i compagni del computer, inventa luoghi, missioni e mostri; per le regole chiede al gioco
// (prove, tiri salvezza, combattimenti, danni, oggetti, esperienza) con una risposta in JSON che il gioco applica.
// Se l'IA non c'è (chiave mancante) o non risponde, un master di riserva semplice tiene in piedi la partita.

const URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const MODELLI = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.5-flash-lite'];
const TIMEOUT_MS = 90000;
const SICUREZZA = ['HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH', 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT', 'HARM_CATEGORY_CIVIC_INTEGRITY'].map((category) => ({ category, threshold: 'BLOCK_NONE' }));

const AMBIENTAZIONI = {
  classica: 'fantasy classico: regni, villaggi, foreste antiche, dungeon, draghi, maghi e antiche rovine',
  oscura: 'fantasy oscuro e horror: terre maledette, non morti, culti, follia, scelte morali crudeli, violenza esplicita',
  pirati: 'mari e isole: pirati, porti corrotti, mostri marini, tesori sepolti, tempeste e arcipelaghi misteriosi',
  citta: 'una grande città: intrighi politici, gilde di ladri, nobili corrotti, sette segrete, vicoli e fogne',
  selvaggia: 'terre selvagge e di frontiera: tribù, bestie enormi, rovine dimenticate, sopravvivenza e esplorazione',
};
// la modalità comica: il master deve far ridere
const PAZZA = `
MODALITÀ AVVENTURA PAZZA (la più importante di tutte le istruzioni sul tono; l'ambientazione resta quella scelta, ma diventa una sua parodia demenziale):
- Il tuo unico scopo è FAR RIDERE a crepapelle. Sei un master comico, demenziale, sboccato e geniale: umorismo assurdo, volgare, scatologico, nonsense, parodia, battute pesanti, doppi sensi, nessun limite.
- Prendi sul serio ogni idea scema dei giocatori e falla diventare epica: se uno scoreggia, la puzza può stordire o uccidere il nemico, far appassire un bosco, risvegliare un drago offeso o diventare leggenda tra i bardi; se uno fa i suoi bisogni, prova a pisciare sul nemico, lecca una statua, seduce un troll o insulta la madre del lich, inventa conseguenze esilaranti e spropositate.
- Esagera tutto: effetti a catena, personaggi non giocanti che reagiscono in modo isterico, nemici permalosi o idioti, oggetti magici ridicoli (la Mutanda della Saggezza +2, la Spada che Si Lamenta), soprannomi umilianti, epici fallimenti con 1 naturale e trionfi assurdi con 20 naturale.
- Le regole restano (prove, tiri salvezza, danni, combattimenti), ma premia la creatività: un'idea divertente merita vantaggio, una CD più bassa o un effetto enorme. Usa pure eventi di danno, condizioni (avvelenato, stordito, spaventato, prono…) e oggetti per rendere concrete le assurdità.
- I combattimenti sono facili e divertenti, mai una strage: pochi nemici deboli e ridicoli, niente mostri troppo forti per il livello, niente morti a caso. Il gioco già aiuta il gruppo (vantaggio e +5 ai tiri, metà danni, nessuno va giù con un colpo solo).
- Mostri e luoghi inventali buffi (goblin sindacalisti, scheletri che fanno stretching, una taverna gestita da una mucca). Le "scelte" che proponi devono essere scemenze tentatrici.
`;

function istruzioni({ ambientazione, pazza = false, difficolta, lunghezza, regoleBrevi }) {
  return `Sei il MASTER di una campagna di "Draghi e Segrete", un gioco di ruolo fantasy con le regole della 5ª edizione del gioco di ruolo più famoso (SRD 5.1): caratteristiche, abilità, classi, livelli, incantesimi, condizioni, tiri salvezza, combattimento a turni. Scrivi SEMPRE in italiano.

Ambientazione: ${AMBIENTAZIONI[ambientazione] || AMBIENTAZIONI.classica}.${pazza ? PAZZA : ''}
Il gioco è per adulti: nessuna censura e nessun limite di contenuti. Violenza, sangue, morte, linguaggio crudo, temi maturi e scelte moralmente difficili sono permessi e vanno descritti senza ammorbidirli quando la storia lo richiede. I giocatori possono tentare qualsiasi azione: non rifiutare mai, decidi le conseguenze con coerenza.

COME FARE IL MASTER
- Descrivi i luoghi con tutti i sensi, interpreta i personaggi non giocanti con voce e motivazioni proprie (dialoghi tra virgolette), fai sentire il mondo vivo e reattivo.
- Le scelte dei giocatori contano: ricorda nomi, promesse, nemici e debiti (leggi il DIARIO e la STORIA RECENTE). Non decidere tu cosa pensano o fanno i personaggi dei giocatori.
- I personaggi indicati come "compagno del computer" li interpreti tu: agiscono e parlano secondo il loro carattere.
- Lascia la scena aperta con qualcosa da fare; proponi 2-4 idee di azione brevi in "scelte" (non obbligatorie: i giocatori possono fare qualsiasi altra cosa).
- Difficoltà dei combattimenti: ${difficolta === 'storia' ? 'facile, per godersi la storia' : difficolta === 'mortale' ? 'MORTALE: incontri duri, i nemici sono furbi, i personaggi possono morire davvero' : 'equilibrata: incontri impegnativi ma giusti per il livello del gruppo'}.
- Lunghezza della narrazione: ${lunghezza === 'brevi' ? '1-2 paragrafi brevi' : lunghezza === 'lunghe' ? '3-6 paragrafi ricchi' : '2-4 paragrafi'}.

LE REGOLE LE APPLICA IL GIOCO: tu non tiri mai i dadi e non inventi i risultati.
- Quando un'azione ha un esito incerto chiedi una PROVA (abilità o caratteristica) con una CD (5 facilissima, 10 facile, 15 media, 20 difficile, 25 molto difficile, 30 quasi impossibile). Il gioco tira e ti rimanda il risultato: allora racconti cosa succede.
- Per pericoli (trappole, veleni, magie, cadute) chiedi un TIRO SALVEZZA con CD, l'eventuale danno (dadi, es. "2d6") e il tipo di danno.
- Quando inizia uno scontro usa "combattimento": il gioco crea la mappa tattica e lo gestisce a turni. Usa i mostri del bestiario per id, oppure inventane di nuovi con le loro statistiche. Bilancia sul livello del gruppo.
- Danni, cure, condizioni, oggetti, monete, esperienza, riposi e luoghi nuovi vanno negli "eventi": il gioco li applica alle schede.
${regoleBrevi}

RISPONDI SOLO CON UN OGGETTO JSON (niente testo fuori dal JSON) con queste chiavi (tutte facoltative tranne "narrazione"):
{
  "narrazione": "il racconto del master (puoi andare a capo con \\n\\n tra i paragrafi)",
  "prove": [{"chi": "nome del personaggio (o \\"tutti\\")", "tipo": "chiave abilità o caratteristica", "cd": 15, "vantaggio": false, "svantaggio": false, "motivo": "perché"}],
  "salvezze": [{"chi": "nome o \\"tutti\\"", "car": "des", "cd": 13, "danno": "2d6", "tipoDanno": "perforante", "meta": true, "condizione": null, "motivo": "perché"}],
  "eventi": [
    {"tipo": "danno", "chi": "nome", "danno": "1d6", "tipoDanno": "fuoco", "motivo": "…"},
    {"tipo": "cura", "chi": "nome", "cura": "2d4+2"},
    {"tipo": "condizione", "chi": "nome", "condizione": "avvelenato", "togli": false},
    {"tipo": "oggetto", "chi": "nome", "nome": "Spada lunga +1", "descrizione": "…", "n": 1, "arma": "spadalunga", "bonus": 1, "armatura": null},
    {"tipo": "perdiOggetto", "chi": "nome", "nome": "…", "n": 1},
    {"tipo": "oro", "chi": "nome o gruppo", "quantita": 50},
    {"tipo": "px", "quantita": 300, "motivo": "…"},
    {"tipo": "riposo", "durata": "breve" | "lungo"},
    {"tipo": "luogo", "nome": "…", "luogoTipo": "villaggio|citta|porto|taverna|castello|torre|tempio|rovine|dungeon|grotta|cripta|foresta|montagna|palude|deserto|accampamento|ponte|miniera|fattoria|lago|altro", "descrizione": "…", "vaiQui": true},
    {"tipo": "png", "nome": "…", "descrizione": "chi è, aspetto, cosa vuole", "atteggiamento": "amico|neutrale|ostile"},
    {"tipo": "missione", "titolo": "…", "descrizione": "…", "stato": "nuova|aggiornata|completata|fallita"},
    {"tipo": "ispirazione", "chi": "nome"},
    {"tipo": "morte", "chi": "nome"}
  ],
  "combattimento": {"nemici": [{"id": "goblin", "n": 3}, {"nome": "Bestia d'ombra", "pf": 45, "ca": 14, "gs": 3, "attacchi": [{"nome": "Artigli", "bonus": 5, "danno": "2d6+3", "tipo": "taglio"}], "multi": 2, "resistente": [], "immune": [], "simbolo": "🐾", "colore": "#3a2a4a", "descrizione": "…"}], "scena": "dungeon|grotta|foresta|villaggio|taverna|cripta|palude|montagna|strada|castello", "luce": "giorno|buio|torce", "sorpresa": "gruppo|nemici|null"},
  "scelte": ["idea 1", "idea 2", "idea 3"],
  "diario": "solo se è successo qualcosa di importante: il diario della campagna aggiornato e riassunto (massimo 1500 caratteri)",
  "atmosfera": "calma|tensione|battaglia|mistero|festa|orrore|viaggio"
}
Chiavi delle abilità: acrobazia, animali, arcano, atletica, furtivita, indagare, inganno, intimidire, intrattenere, intuizione, medicina, natura, percezione, persuasione, rapidita, religione, sopravvivenza, storia. Caratteristiche: for, des, cos, int, sag, car.
Se chiedi prove o tiri salvezza, NON raccontare ancora il loro esito: fermati prima e aspetta i risultati. Non mettere "combattimento" insieme a prove o salvezze.`;
}

// le parti fisse delle regole che il master deve conoscere (bestiario e condizioni)
function regoleBrevi(MOSTRI, CONDIZIONI) {
  const best = Object.values(MOSTRI).map((m) => `${m.id} (${m.nome}, GS ${m.gs})`).join(', ');
  return `- Bestiario (id da usare in "combattimento"): ${best}.
- Condizioni: ${Object.keys(CONDIZIONI).join(', ')}.
- Esperienza tipica per livello del gruppo: un incontro medio vale circa 50-100 PX per personaggio al 1° livello, 300-500 al 5°. Una missione completata dà PX e ricompense. Dai l'ispirazione per una bella interpretazione.`;
}

async function chiamaGemini({ chiave, sistema, messaggi, fetch: f, temperatura = 0.95, maxToken = 4096, json = true, log = console, modelli = MODELLI }) {
  const fx = f || (typeof fetch === 'function' ? fetch : null);
  if (!chiave || !fx) return { errore: 'manca la chiave' };
  for (let i = 0; i < modelli.length; i++) {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = setTimeout(() => { if (ctl) ctl.abort(); }, TIMEOUT_MS);
    try {
      const res = await fx(URL_BASE + encodeURIComponent(modelli[i]) + ':generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chiave },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sistema }] },
          contents: messaggi.map((m) => ({ role: m.ruolo === 'master' ? 'model' : 'user', parts: [{ text: m.testo }] })),
          generationConfig: { temperature: temperatura, maxOutputTokens: maxToken, ...(json ? { responseMimeType: 'application/json' } : {}) },
          safetySettings: SICUREZZA,
        }),
        signal: ctl ? ctl.signal : undefined,
      });
      if (res.status === 404) { log.warn(`[draghi] il modello ${modelli[i]} non c'è: provo il prossimo`); continue; }
      // troppe richieste: il limite è per modello, quindi si prova il prossimo (di solito il "lite" ha ancora spazio)
      if (res.status === 429) { log.warn(`[draghi] troppe richieste per ${modelli[i]}: provo il prossimo`); if (i < modelli.length - 1) continue; return { errore: 'Google dice che ci sono troppe richieste: riprovo tra poco', riprova: true }; }
      if (!res.ok) { log.warn(`[draghi] Gemini ha risposto ${res.status}`); if (i < modelli.length - 1) continue; return { errore: `il master non risponde (errore ${res.status})`, riprova: true }; }
      const dati = await res.json();
      const c = dati && Array.isArray(dati.candidates) ? dati.candidates[0] : null;
      const testo = c && c.content && Array.isArray(c.content.parts) ? c.content.parts.filter((p) => typeof p.text === 'string' && !p.thought).map((p) => p.text).join('') : '';
      if (!testo) { if (i < modelli.length - 1) continue; return { errore: dati && dati.promptFeedback && dati.promptFeedback.blockReason ? 'Google ha bloccato la richiesta' : 'il master non ha scritto niente', riprova: true }; }
      return { testo, modello: modelli[i] };
    } catch (e) {
      if (i < modelli.length - 1) continue;
      return { errore: e && e.name === 'AbortError' ? 'il master ci ha messo troppo' : 'il master non è raggiungibile', riprova: true };
    } finally { clearTimeout(timer); }
  }
  return { errore: 'nessun modello disponibile', riprova: true };
}

// dal testo della risposta all'oggetto (anche se l'IA ha messo il JSON dentro ```json … ``` o ha aggiunto testo)
function leggiRisposta(testo) {
  let t = String(testo || '').trim();
  const blocco = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (blocco) t = blocco[1].trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) {
    try { const o = JSON.parse(t.slice(a, b + 1)); if (o && typeof o === 'object') return normalizza(o); } catch (e) { /* si prova sotto */ }
  }
  // JSON rotto (di solito la risposta si è interrotta a metà): si salva il racconto, senza far vedere (e leggere alla
  // voce narrante) le chiavi del JSON
  if (/^\s*\{\s*"/.test(t)) return normalizza({ narrazione: narrazioneDa(t) || '…' });
  // non è JSON: tutto il testo è narrazione
  return normalizza({ narrazione: String(testo || '').replace(/[{}]/g, '').trim() || '…' });
}
// il valore di "narrazione" da un JSON interrotto: fino alle virgolette di chiusura, o fino a dove arriva (e allora
// si taglia all'ultima frase finita)
function narrazioneDa(t) {
  const m = t.match(/"(?:narrazione|racconto|testo)"\s*:\s*"((?:[^"\\]|\\.)*)("?)/);
  if (!m) return '';
  let v = m[1].replace(/\\$/, '');
  try { v = JSON.parse(`"${v}"`); } catch (e) { v = v.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\(.)/g, '$1'); }
  if (!m[2]) { const fine = Math.max(v.lastIndexOf('. '), v.lastIndexOf('! '), v.lastIndexOf('? '), v.lastIndexOf('\n'), v.lastIndexOf('»')); v = fine > 40 ? v.slice(0, fine + 1) : `${v}…`; }
  return v.trim();
}
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
function normalizza(o) {
  return {
    narrazione: String(o.narrazione || o.racconto || o.testo || '').slice(0, 9000),
    prove: arr(o.prove).slice(0, 8),
    salvezze: arr(o.salvezze || o.tiriSalvezza).slice(0, 8),
    eventi: arr(o.eventi).slice(0, 30),
    combattimento: o.combattimento && typeof o.combattimento === 'object' && arr(o.combattimento.nemici).length ? o.combattimento : null,
    scelte: arr(o.scelte).map((s) => String(s).slice(0, 120)).slice(0, 5),
    diario: o.diario ? String(o.diario).slice(0, 2500) : null,
    atmosfera: typeof o.atmosfera === 'string' ? o.atmosfera.slice(0, 20) : null,
  };
}

// ---------- il master di riserva (senza IA) ----------
// semplice ma giocabile: scene di esplorazione, qualche prova, incontri adatti al livello, luoghi nuovi
const SCENE_RISERVA = [
  { n: 'Il sentiero si inoltra tra alberi contorti. Il vento porta un odore di fumo e qualcosa si muove tra i cespugli.', prova: ['percezione', 13], combatti: ['goblin', 'goblin', 'goblin'], scena: 'foresta' },
  { n: 'Una porta di pietra coperta di rune sbarra il corridoio. Le scritte sembrano un avvertimento.', prova: ['arcano', 14], scena: 'dungeon' },
  { n: 'La taverna è piena di fumo e voci. Un uomo con una cicatrice vi fissa dal fondo della sala, poi si avvicina.', prova: ['intuizione', 12], scena: 'taverna' },
  { n: 'Dalle tombe aperte della cripta sale un gelo innaturale. Ossa scricchiolano nel buio.', combatti: ['scheletro', 'scheletro', 'zombi'], scena: 'cripta' },
  { n: 'Una frana ha bloccato il passo di montagna. Si può scalare la parete o cercare un\'altra strada.', prova: ['atletica', 15], scena: 'montagna' },
  { n: 'Ululati nella notte: un branco circonda l\'accampamento.', combatti: ['lupo', 'lupo', 'lupoCrudele'], scena: 'foresta' },
  { n: 'Nella palude le luci danzano sopra l\'acqua nera. Qualcuno, o qualcosa, vi chiama per nome.', prova: ['sag', 13], scena: 'palude' },
  { n: 'Banditi sbarrano la strada: «Il pedaggio, o la vita».', combatti: ['bandito', 'bandito', 'bandito', 'capoBandito'], scena: 'strada' },
];
const SCENE_PAZZE = [
  { n: 'Un goblin in mutande vi sbarra la strada urlando che è il re di questo sentiero, poi inciampa nella sua stessa barba finta.', combatti: ['goblin', 'goblin'], scena: 'foresta' },
  { n: 'La taverna è gestita da una mucca molto offesa perché nessuno ordina il latte. Il menù del giorno: «stufato di cose trovate per terra».', prova: ['persuasione', 12], scena: 'taverna' },
  { n: 'Uno scheletro fa stretching in mezzo alla cripta e vi chiede se avete un po\' di calcio. Gli altri scheletri ridacchiano.', combatti: ['scheletro', 'scheletro', 'scheletro'], scena: 'cripta' },
  { n: 'Una porta parlante si rifiuta di aprirsi finché qualcuno non le racconta una barzelletta sporca.', prova: ['intrattenere', 13], scena: 'dungeon' },
  { n: 'Un mago sbronzo ha trasformato tutto il villaggio in galline, tranne il sindaco, che è diventato una pentola.', prova: ['arcano', 12], scena: 'villaggio' },
];
function masterRiserva(stato) {
  const r = (stato.pazza ? SCENE_PAZZE : SCENE_RISERVA)[Math.floor(Math.random() * (stato.pazza ? SCENE_PAZZE : SCENE_RISERVA).length)];
  const out = { narrazione: '', prove: [], salvezze: [], eventi: [], combattimento: null, scelte: ['Esplorare con cautela', 'Parlare con chi si incontra', 'Prepararsi a combattere'], diario: null, atmosfera: 'viaggio' };
  if (stato.esiti && stato.esiti.length) {
    const ok = stato.esiti.filter((e) => e.riuscita).length;
    out.narrazione = stato.pazza ? (ok >= stato.esiti.length / 2 ? 'Incredibilmente funziona! Nessuno sa come, nemmeno voi. Un bardo di passaggio sta già scrivendo una canzone imbarazzante su di voi.' : 'Disastro totale: inciampate, vi rotolate nel fango e un piccione vi guarda con disprezzo. Andate avanti, umiliati.') : ok >= stato.esiti.length / 2 ? 'Ce la fate: la strada si apre e trovate qualcosa di interessante.' : 'Non va come speravate, ma andate avanti lo stesso.';
    if (ok) out.eventi.push({ tipo: 'oro', chi: 'gruppo', quantita: 10 + Math.floor(Math.random() * 40) });
    return out;
  }
  if (stato.inizio) { out.narrazione = stato.pazza ? `L'avventura comincia a ${stato.luogo || 'un villaggio di confine'}, dove il sindaco è una capra con il cappello e qualcuno ha rubato tutte le mutande del paese. Chi le ritroverà avrà una ricompensa e, forse, un po' di dignità.` : `L'avventura comincia a ${stato.luogo || 'un piccolo villaggio di confine'}. Voci parlano di sparizioni nei boschi e di una ricompensa per chi indagherà.`; out.eventi.push(stato.pazza ? { tipo: 'missione', titolo: 'Le mutande perdute', descrizione: 'Ritrovare le mutande rubate al paese (e un po\' di dignità).', stato: 'nuova' } : { tipo: 'missione', titolo: 'Le sparizioni', descrizione: 'Scoprire cosa succede nei boschi.', stato: 'nuova' }); return out; }
  out.narrazione = r.n;
  if (r.combatti && Math.random() < 0.6) { const L = stato.livello || 1; const extra = L >= 5 ? ['orco', 'ogre'] : []; out.combattimento = { nemici: [...r.combatti, ...extra].map((id) => ({ id })), scena: r.scena, luce: r.scena === 'cripta' ? 'buio' : 'giorno' }; out.atmosfera = 'battaglia'; }
  else if (r.prova) out.prove.push({ chi: 'tutti', tipo: r.prova[0], cd: r.prova[1], motivo: 'per capire cosa fare' });
  return out;
}

module.exports = { istruzioni, regoleBrevi, chiamaGemini, leggiRisposta, normalizza, masterRiserva, AMBIENTAZIONI, MODELLI };
