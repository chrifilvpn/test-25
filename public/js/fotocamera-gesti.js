// FOTOCAMERA: riconoscimento dei gesti dai punti delle mani (21 punti per mano, coordinate da 0 a 1, y verso il basso,
// come li dà MediaPipe). Solo conti, niente pagina: lo usa public/js/fotocamera.js e lo provano i test (test/fotocamera.js).
(function (radice) {
  // dito indice alzato: indice dritto e verso l'alto, medio, anulare e mignolo piegati (il pollice non conta)
  function ditoAlzato(m) {
    if (!m || m.length < 21) return false;
    const d = (a, b) => Math.hypot(m[a].x - m[b].x, m[a].y - m[b].y);
    const palmo = d(0, 9) || 0.0001; // polso → base del medio: la misura della mano
    // dritto: la punta lontana dal polso più della nocca di mezzo e lunga; verso l'alto anche un po' storto (fino a ~50°)
    const su = m[5].y - m[8].y, lato = Math.abs(m[8].x - m[5].x);
    const dritto = d(8, 0) > d(6, 0) * 1.05 && d(8, 5) > palmo * 0.55 && su > palmo * 0.45 && lato < su * 1.2;
    const piegato = (punta, nocca) => d(punta, 0) < d(nocca, 0) * 1.15;
    // le altre dita piegate, e comunque molto più corte dell'indice (così una mano un po' girata va bene lo stesso)
    const corto = (punta) => d(punta, 0) < d(8, 0) * 0.8;
    return dritto && [[12, 10], [16, 14], [20, 18]].every(([p, n]) => piegato(p, n) || corto(p));
  }

  // il "67": due mani che salgono e scendono alternate. Si guarda la differenza di altezza tra mano sinistra e destra:
  // con le mani alternate va su e giù più volte (con le mani insieme resta ferma). Pronto ma per ora spento nella
  // fotocamera: manca il file del suono "six seven".
  function crea67({ finestraMs = 2500, ampiezza = 0.08, inversioni = 3 } = {}) {
    let storia = [];
    return {
      // mani: liste di punti; t in millisecondi. Restituisce true quando il gesto è completo.
      aggiungi(mani, t) {
        storia = storia.filter((s) => t - s.t <= finestraMs);
        if (!mani || mani.length < 2) return false;
        const [sx, dx] = [...mani].sort((a, b) => a[0].x - b[0].x);
        const y = (m) => (m[0].y + m[9].y) / 2; // centro del palmo
        storia.push({ t, d: y(sx) - y(dx) });
        // conta i cambi di direzione abbastanza ampi (isteresi: piccoli tremolii non contano)
        let n = 0, dir = 0, alto = storia[0].d, basso = storia[0].d;
        for (const { d } of storia) {
          if (dir === 0) { // direzione ancora da capire
            alto = Math.max(alto, d); basso = Math.min(basso, d);
            if (alto - d > ampiezza) { dir = -1; basso = d; } else if (d - basso > ampiezza) { dir = 1; alto = d; }
          } else if (dir === 1) {
            if (d > alto) alto = d; else if (alto - d > ampiezza) { n++; dir = -1; basso = d; }
          } else if (d < basso) basso = d; else if (d - basso > ampiezza) { n++; dir = 1; alto = d; }
        }
        if (n >= inversioni) { storia = []; return true; }
        return false;
      },
      azzera() { storia = []; },
    };
  }

  // fermo: quanto cambia l'immagine tra un fotogramma e l'altro (grigi piccoli). Torna la frazione di punti cambiati.
  function movimento(prima, dopo, soglia = 28) {
    if (!prima || !dopo || prima.length !== dopo.length) return 1;
    let n = 0;
    for (let i = 0; i < dopo.length; i++) if (Math.abs(dopo[i] - prima[i]) > soglia) n++;
    return n / dopo.length;
  }

  // faccia triste dalle espressioni del viso di MediaPipe (nome → punteggio da 0 a 1): angoli della bocca in giù,
  // sopracciglia alzate al centro, niente sorriso
  function tristezza(e) {
    if (!e) return 0;
    const v = (k) => e[k] || 0;
    const giu = (v('mouthFrownLeft') + v('mouthFrownRight')) / 2;
    const sorriso = (v('mouthSmileLeft') + v('mouthSmileRight')) / 2;
    if (sorriso > 0.2) return 0;
    // sopracciglia da cucciolo: su al centro e non ai lati (con la sorpresa salgono tutte, e non è tristezza)
    const cucciolo = Math.max(0, v('browInnerUp') - (v('browOuterUpLeft') + v('browOuterUpRight')) / 2);
    return Math.max(giu, 0.6 * cucciolo + 0.6 * giu);
  }
  const triste = (e, soglia = 0.3) => tristezza(e) > soglia;
  // la faccia triste che impara chi guarda: c'è chi ha la bocca un po' all'ingiù anche da calmo
  function creaTristezza({ scarto = 0.18, minimo = 0.25 } = {}) {
    let riposo = null, prova = '', fila = 0;
    return {
      aggiungi(e) {
        if (!e) return false;
        const t = tristezza(e);
        if (riposo == null) riposo = Math.min(t, minimo);
        let si = t > minimo && t - riposo > scarto;
        if (si && ++fila > FILA_MAX) { riposo = t; fila = 0; si = false; } else if (!si) fila = 0;
        prova = `${t.toFixed(2)} (serve ${Math.max(minimo, riposo + scarto).toFixed(2)})`;
        if (t < riposo) riposo += (t - riposo) * 0.1;
        else if (!si && t < riposo + scarto / 2) riposo += (t - riposo) * 0.02;
        return si;
      },
      get riposo() { return riposo; },
      get prova() { return prova; },
    };
  }
  // bocca aperta: la mascella giù ("Huh?")
  // (o, coi punti del viso, labbra lontane: 13-14 rispetto alla larghezza della bocca 61-291)
  function boccaAperta(e, soglia = 0.45, k = null) {
    if (e && (e.jawOpen || 0) > soglia) return true;
    if (!k || k.length < 292) return false;
    const larga = Math.hypot(k[291].x - k[61].x, k[291].y - k[61].y);
    return larga > 0 && Math.hypot(k[13].x - k[14].x, k[13].y - k[14].y) / larga > 0.45 && (!e || (e.jawOpen || 0) > soglia * 0.5);
  }
  // occhi socchiusi: tutti e due mezzi chiusi (né aperti né chiusi del tutto, come quando chiudi gli occhi o sbatti)
  function occhiSocchiusi(e, riposo = 0) {
    if (!e) return false;
    const s = e.eyeBlinkLeft || 0, d = e.eyeBlinkRight || 0, min = Math.max(0.3, riposo + 0.2);
    const giu = ((e.eyeLookDownLeft || 0) + (e.eyeLookDownRight || 0)) / 2; // guardando in basso le palpebre scendono
    return s > min && d > min && s < 0.85 && d < 0.85 && Math.abs(s - d) < 0.3 && giu < 0.5;
  }
  // gli occhi socchiusi che imparano chi guarda: chi ha gli occhi a mandorla (o gli occhiali) li ha sempre "mezzi
  // chiusi" per MediaPipe; si impara quanto, e conta solo stringerli di più
  function creaSocchiusi() {
    let riposo = null, prova = '', fila = 0;
    return {
      aggiungi(e) {
        if (!e) return false;
        const m = ((e.eyeBlinkLeft || 0) + (e.eyeBlinkRight || 0)) / 2;
        if (riposo == null) riposo = Math.min(m, 0.3);
        let si = occhiSocchiusi(e, riposo);
        if (si && ++fila > FILA_MAX) { riposo = m; fila = 0; si = false; } else if (!si) fila = 0;
        prova = `${m.toFixed(2)} (serve ${Math.max(0.3, riposo + 0.2).toFixed(2)}–0.85)`;
        if (m < riposo) riposo += (m - riposo) * 0.1;
        else if (!si && m < riposo + 0.15) riposo += (m - riposo) * 0.02;
        return si;
      },
      get riposo() { return riposo; },
      get prova() { return prova; },
    };
  }

  // lingua fuori: MediaPipe ha "tongueOut" ma quasi sempre vale 0, quindi si guarda il colore. Si scende dal labbro di
  // sotto (punto 14) fino al mento (152) al centro della bocca e si contano le righe più rosse della guancia (punti 205
  // e 425): le labbra da sole sono una striscia sottile, con la lingua fuori la parte rossa è lunga almeno il doppio.
  // Si misura rispetto all'altezza del viso (fronte 10 → mento 152), così non conta quanto sei lontano.
  // px: pixel RGBA dell'immagine larga w e alta h; k: i punti del viso (da 0 a 1).
  function rossore(px, w, h, cx, cy, rx, ry) {
    let somma = 0, n = 0;
    for (let y = Math.max(0, Math.round((cy - ry) * h)); y <= Math.min(h - 1, Math.round((cy + ry) * h)); y++) {
      for (let x = Math.max(0, Math.round((cx - rx) * w)); x <= Math.min(w - 1, Math.round((cx + rx) * w)); x++) {
        const i = (y * w + x) * 4;
        somma += px[i] / (px[i + 1] + 8); n++;
      }
    }
    return n ? somma / n : 0;
  }
  // un gesto che resterebbe acceso più di tanti controlli di fila (~10 secondi) è un falso allarme: si impara come
  // faccia normale e il gatto se ne va (se no resta lì per sempre e non ti vedi più)
  const FILA_MAX = 150;
  // labbra aperte: distanza tra le labbra di dentro (13-14) rispetto alla larghezza della bocca (61-291), in pixel
  // (vw × vh: misure del video, perché i punti vanno da 0 a 1 in tutte e due le direzioni)
  function labbra(k, vw = 640, vh = 480) {
    if (!k || k.length < 292) return 0;
    const larga = Math.hypot((k[291].x - k[61].x) * vw, (k[291].y - k[61].y) * vh);
    return larga > 0 ? Math.hypot((k[13].x - k[14].x) * vw, (k[13].y - k[14].y) * vh) / larga : 0;
  }
  // misuraLingua: quanto è lunga la parte rossa sotto il labbro, rispetto all'altezza del viso (null se non si può dire)
  function misuraLingua(px, w, h, k) {
    if (!px || !k || k.length < 426) return null;
    const larga = Math.abs(k[291].x - k[61].x); // larghezza della bocca
    const viso = k[152].y - k[10].y;
    const da = Math.round(k[14].y * h), a = Math.round(k[152].y * h);
    if (larga <= 0 || viso <= 0 || a <= da) return null;
    const guancia = (rossore(px, w, h, k[205].x, k[205].y, larga * 0.1, viso * 0.03) + rossore(px, w, h, k[425].x, k[425].y, larga * 0.1, viso * 0.03)) / 2;
    let rosse = 0;
    for (let y = da; y <= a; y++) if (rossore(px, w, h, k[14].x, y / h, larga * 0.15, 0) > guancia * 1.12) rosse++;
    return rosse / h / viso;
  }
  function linguaFuori(px, w, h, k, e) {
    if (e && (e.tongueOut || 0) > 0.15) return true;
    const m = misuraLingua(px, w, h, k);
    return m != null && m > 0.09;
  }
  // la lingua che impara chi guarda: rossetto, barba o luce cambiano quanto rosso c'è sotto il labbro anche a bocca
  // chiusa. Si tiene il valore di riposo (scende subito, sale piano e solo con la faccia normale) e scatta quando la
  // parte rossa è lunga almeno "scarto" più del solito. aggiungi(px, w, h, k, e) → true con la lingua fuori.
  // aperte: le labbra sono aperte (con la lingua fuori non possono stare chiuse). Senza, la lingua non conta: così
  // labbra, mento o ombre più rossi delle guance non fanno scattare il gatto da soli.
  // Il riposo parte dalla prima misura (la faccia com'è a bocca chiusa) e se il gatto resterebbe acceso più di
  // FILA_MAX controlli di fila (~10 secondi) è quasi sicuramente un falso allarme: quella diventa la faccia normale.
  function creaLingua({ scarto = 0.045, minimo = 0.08 } = {}) {
    let riposo = null, prova = '', fila = 0;
    return {
      aggiungi(px, w, h, k, e, aperte = true) {
        if (e && (e.tongueOut || 0) > 0.15) return true;
        const m = misuraLingua(px, w, h, k);
        if (m == null) return false;
        if (riposo == null) riposo = m;
        let fuori = aperte && m > minimo && m - riposo > scarto;
        prova = `${m.toFixed(3)} (serve ${Math.max(minimo, riposo + scarto).toFixed(3)}, labbra ${aperte ? 'aperte' : 'chiuse'})`;
        if (fuori && ++fila > FILA_MAX) { riposo = m; fila = 0; fuori = false; } else if (!fuori) fila = 0;
        if (m < riposo) riposo += (m - riposo) * 0.2;
        else if (!fuori && m < riposo + scarto / 2) riposo += (m - riposo) * 0.02;
        else if (!aperte) riposo += (m - riposo) * 0.05; // a bocca chiusa quello che si vede è la faccia normale
        return fuori;
      },
      get riposo() { return riposo; },
      get prova() { return prova; },
    };
  }

  // occhiolino: un occhio chiuso e l'altro aperto
  function occhiolino(e) {
    if (!e) return false;
    const s = e.eyeBlinkLeft || 0, d = e.eyeBlinkRight || 0;
    return Math.max(s, d) > 0.55 && Math.min(s, d) < 0.3 && Math.abs(s - d) > 0.35;
  }
  // l'occhiolino più sicuro: a tante persone MediaPipe dà l'occhio chiuso solo a metà (0,4) o vede socchiuso anche
  // l'altro (la guancia sale). Si guarda anche la forma degli occhi dai punti del viso: altezza / larghezza dell'occhio
  // (sinistro 159-145 su 33-133, destro 386-374 su 362-263), rispetto a quella con gli occhi aperti di chi guarda.
  // Chiusura di ogni occhio = media tra MediaPipe e la forma; occhiolino se uno è chiuso e l'altro no.
  const apertura = (k, su, giu, a, b) => Math.hypot(k[su].x - k[giu].x, k[su].y - k[giu].y) / (Math.hypot(k[a].x - k[b].x, k[a].y - k[b].y) || 0.0001);
  const uno = (a, b) => Math.max(a, b) > 0.55 && Math.min(a, b) < 0.35 && Math.abs(a - b) > 0.3;
  function creaOcchiolino() {
    let rs = null, rd = null, prova = ''; // apertura di riposo (occhi aperti) di sinistro e destro
    // os, od: quanto MediaPipe vede "chiuso" ogni occhio a faccia normale (c'è chi ha un occhio sempre un po' più
    // chiuso): si impara se l'occhiolino resterebbe acceso troppo a lungo, e poi si toglie
    let os = 0, od = 0, fila = 0;
    const calcola = (e, k) => {
      const s = Math.max(0, (e.eyeBlinkLeft || 0) - os), d = Math.max(0, (e.eyeBlinkRight || 0) - od);
      prova = `MediaPipe ${s.toFixed(2)} / ${d.toFixed(2)}`;
      if (uno(s, d) && Math.min(s, d) < 0.3 && Math.abs(s - d) > 0.35) return true; // occhiolino netto per MediaPipe
      if (!k || k.length < 387) return false;
      const as = apertura(k, 159, 145, 33, 133), ad = apertura(k, 386, 374, 362, 263);
      if (s < 0.3 && d < 0.3) { // occhi aperti per MediaPipe: si impara (più in fretta verso l'occhio più aperto)
        rs = rs == null ? as : rs + (as - rs) * (as > rs ? 0.1 : 0.02);
        rd = rd == null ? ad : rd + (ad - rd) * (ad > rd ? 0.1 : 0.02);
      }
      if (rs == null || rd == null) return false;
      const chiuso = (a, r) => Math.min(1, Math.max(0, (1 - a / r) / 0.65));
      const cs = (s + chiuso(as, rs)) / 2, cd = (d + chiuso(ad, rd)) / 2;
      prova += `, insieme ${cs.toFixed(2)} / ${cd.toFixed(2)} (serve uno >0.55 e l'altro <0.35)`;
      return uno(cs, cd);
    };
    return {
      aggiungi(e, k) {
        if (!e) return false;
        let si = calcola(e, k);
        if (si && ++fila > FILA_MAX) { // falso allarme: questa è la faccia normale
          os = e.eyeBlinkLeft || 0; od = e.eyeBlinkRight || 0; fila = 0;
          if (k && k.length >= 387) { rs = apertura(k, 159, 145, 33, 133); rd = apertura(k, 386, 374, 362, 263); }
          si = false;
        } else if (!si) fila = 0;
        return si;
      },
      get riposo() { return rs == null ? null : [rs, rd]; },
      get prova() { return prova; },
    };
  }

  // faccia arrabbiata: sopracciglia aggrottate (e naso arricciato). Ognuno ha la sua faccia "normale" e gli occhiali
  // possono far sembrare le sopracciglia sempre un po' giù: si impara piano piano il valore di riposo di chi guarda e
  // conta solo quanto si aggrotta in più. Restituisce un oggetto con aggiungi(espressioni) → true se arrabbiato.
  //
  // Con gli occhiali la montatura copre le sopracciglia e MediaPipe non le vede scendere: c'è una seconda strada che
  // non ne ha bisogno, gli altri segni della faccia arrabbiata rispetto alla faccia calma di chi guarda: occhi
  // stretti, naso arricciato, labbra serrate, angoli della bocca giù e, dai punti del viso, sopracciglia più vicine
  // agli occhi (55-159, 285-386) e più vicine tra loro (55-285 rispetto agli angoli interni degli occhi 133-362).
  // In più le rughe in mezzo alle sopracciglia (quelle verticali che vengono aggrottando): rughe è il numero di
  // misuraRughe sul pezzo di pelle tra le sopracciglia, e conta quanto è più alto di quello della faccia calma.
  // aggiungi(espressioni, puntiViso?, rughe?) → true se arrabbiato.
  function creaRabbia({ scarto = 0.22, minimo = 0.3, lento = 0.03, scarto2 = 0.25 } = {}) {
    let riposo = null, prova = '', fila = 0;
    let riposo2 = null, occhiSu = null, vicine = null, liscia = null; // seconda strada: punteggio e misure della faccia calma
    const d = (k, a, b) => Math.hypot(k[a].x - k[b].x, k[a].y - k[b].y);
    return {
      aggiungi(e, k, rughe = null) {
        if (!e) return false;
        const v = (n) => e[n] || 0, media = (n) => (v(n + 'Left') + v(n + 'Right')) / 2;
        const giu = media('browDown') + 0.5 * media('noseSneer');
        const sorriso = media('mouthSmile');
        // se all'inizio sei già accigliato il riposo non parte troppo alto (scende poi in fretta sulla faccia calma)
        if (riposo == null) riposo = Math.min(giu, minimo);
        const prima = giu - riposo > scarto && giu > minimo;
        // la seconda strada
        let punti = 0, misure = null;
        if (k && k.length > 386) {
          const alto = d(k, 10, 152) || 0.0001;
          const su = (d(k, 55, 159) + d(k, 285, 386)) / 2 / alto, tra = d(k, 55, 285) / (d(k, 133, 362) || 0.0001);
          if (occhiSu == null) { occhiSu = su; vicine = tra; }
          punti = Math.max(0, 1 - su / occhiSu) * 2 + Math.max(0, 1 - tra / vicine) * 2;
          misure = { su, tra };
        }
        // gli occhi stretti da soli non bastano (anche socchiudendoli o con il sole in faccia si stringono): serve almeno
        // un altro segno, naso, bocca o sopracciglia
        let pieghe = 0;
        if (rughe != null) { if (liscia == null) liscia = rughe; pieghe = Math.min(1, Math.max(0, rughe / (liscia || 0.0001) - 1)); }
        const altri = 0.8 * media('noseSneer') + 0.6 * media('mouthPress') + 0.4 * media('mouthFrown') + punti + 0.6 * pieghe;
        const segni = media('eyeSquint') + altri;
        if (riposo2 == null) riposo2 = Math.min(segni, 0.3);
        const seconda = segni - riposo2 > scarto2 && altri > 0.15;
        let arrabbiato = (prima || seconda) && sorriso < 0.3;
        if (arrabbiato && ++fila > FILA_MAX) { riposo = giu; riposo2 = segni; if (misure) { occhiSu = misure.su; vicine = misure.tra; } fila = 0; arrabbiato = false; } else if (!arrabbiato) fila = 0;
        prova = `sopracciglia ${giu.toFixed(2)} (serve ${Math.max(minimo, riposo + scarto).toFixed(2)}) · altri segni ${segni.toFixed(2)} (serve ${(riposo2 + scarto2).toFixed(2)}, rughe +${Math.round(pieghe * 100)}%)`;
        if (giu < riposo) riposo += (giu - riposo) * 0.1;
        else if (!arrabbiato && giu < riposo + scarto / 2) riposo += (giu - riposo) * lento; // il riposo segue solo la faccia calma
        if (segni < riposo2) riposo2 += (segni - riposo2) * 0.1;
        else if (!arrabbiato && segni < riposo2 + scarto2 / 2) riposo2 += (segni - riposo2) * lento;
        if (rughe != null && !arrabbiato) liscia += (rughe - liscia) * (rughe < liscia ? 0.1 : 0.02); // la fronte calma
        if (misure && !arrabbiato) { // la faccia calma: le misure seguono piano (più in fretta verso sopracciglia alte)
          occhiSu += (misure.su - occhiSu) * (misure.su > occhiSu ? 0.1 : 0.02);
          vicine += (misure.tra - vicine) * (misure.tra > vicine ? 0.1 : 0.02);
        }
        return arrabbiato;
      },
      get riposo() { return riposo; },
      get prova() { return prova; },
    };
  }

  // rughe tra le sopracciglia: quanto cambia la luce da un pixel a quello accanto, in orizzontale (le rughe di quando
  // aggrotti sono righe verticali), rispetto a quanto è chiara la pelle. px: pixel RGBA del pezzo di fronte w × h.
  function misuraRughe(px, w, h) {
    if (!px || w < 3 || h < 2) return null;
    let salti = 0, luce = 0, n = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w - 1; x++) {
        const i = (y * w + x) * 4, a = px[i] + px[i + 1] + px[i + 2], b = px[i + 4] + px[i + 5] + px[i + 6];
        salti += Math.abs(a - b); luce += a; n++;
      }
    }
    return n ? salti / (luce / 3 + 30) : null;
  }

  // testa girata di lato: il naso (punto 1) rispetto ai lati del viso (234 e 454). Dritta ≈ 0,5; girata molto → gli
  // occhi e la bocca si vedono storti e i gesti del viso scatterebbero da soli. Torna quanto è girata (0 = dritta).
  function girata(k) {
    if (!k || k.length < 455) return 0;
    const larga = k[454].x - k[234].x;
    if (Math.abs(larga) < 0.0001) return 1;
    return Math.abs((k[1].x - k[234].x) / larga - 0.5);
  }
  const testaGirata = (k, soglia = 0.2) => girata(k) > soglia;
  // con più facce davanti si segue la più grande (la più vicina), non una a caso. Torna il suo indice (-1 se nessuna).
  function facciaPiuGrande(facce) {
    let i = -1, max = 0;
    (facce || []).forEach((k, j) => {
      if (!k || k.length < 455) return;
      const a = Math.abs(k[454].x - k[234].x) * Math.abs(k[152].y - k[10].y);
      if (a > max) { max = a; i = j; }
    });
    return i;
  }

  const api = { ditoAlzato, crea67, movimento, creaRabbia, tristezza, triste, creaTristezza, boccaAperta, misuraLingua, linguaFuori, creaLingua, occhiSocchiusi, creaSocchiusi, occhiolino, creaOcchiolino, girata, testaGirata, facciaPiuGrande, labbra, misuraRughe };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.FotocameraGesti = api;
})(typeof window !== 'undefined' ? window : globalThis);
