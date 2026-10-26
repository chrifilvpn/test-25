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
    let riposo = null;
    return {
      aggiungi(e) {
        if (!e) return false;
        const t = tristezza(e);
        if (riposo == null) riposo = Math.min(t, minimo);
        const si = t > minimo && t - riposo > scarto;
        if (t < riposo) riposo += (t - riposo) * 0.1;
        else if (!si && t < riposo + scarto / 2) riposo += (t - riposo) * 0.02;
        return si;
      },
      get riposo() { return riposo; },
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
    let riposo = null;
    return {
      aggiungi(e) {
        if (!e) return false;
        const m = ((e.eyeBlinkLeft || 0) + (e.eyeBlinkRight || 0)) / 2;
        if (riposo == null) riposo = Math.min(m, 0.3);
        const si = occhiSocchiusi(e, riposo);
        if (m < riposo) riposo += (m - riposo) * 0.1;
        else if (!si && m < riposo + 0.15) riposo += (m - riposo) * 0.02;
        return si;
      },
      get riposo() { return riposo; },
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
  function creaLingua({ scarto = 0.045, minimo = 0.08 } = {}) {
    let riposo = null;
    return {
      aggiungi(px, w, h, k, e) {
        if (e && (e.tongueOut || 0) > 0.15) return true;
        const m = misuraLingua(px, w, h, k);
        if (m == null) return false;
        if (riposo == null) riposo = Math.min(m, minimo); // se si parte con la lingua fuori, il riposo non resta alto
        const fuori = m > minimo && m - riposo > scarto;
        if (m < riposo) riposo += (m - riposo) * 0.2;
        else if (!fuori && m < riposo + scarto / 2) riposo += (m - riposo) * 0.02;
        return fuori;
      },
      get riposo() { return riposo; },
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
    let rs = null, rd = null; // apertura di riposo (occhi aperti) di sinistro e destro
    return {
      aggiungi(e, k) {
        if (!e) return false;
        const s = e.eyeBlinkLeft || 0, d = e.eyeBlinkRight || 0;
        if (occhiolino(e)) return true;
        if (!k || k.length < 387) return false;
        const as = apertura(k, 159, 145, 33, 133), ad = apertura(k, 386, 374, 362, 263);
        if (s < 0.3 && d < 0.3) { // occhi aperti per MediaPipe: si impara (più in fretta verso l'occhio più aperto)
          rs = rs == null ? as : rs + (as - rs) * (as > rs ? 0.1 : 0.02);
          rd = rd == null ? ad : rd + (ad - rd) * (ad > rd ? 0.1 : 0.02);
        }
        if (rs == null || rd == null) return false;
        const chiuso = (a, r) => Math.min(1, Math.max(0, (1 - a / r) / 0.65));
        return uno((s + chiuso(as, rs)) / 2, (d + chiuso(ad, rd)) / 2);
      },
      get riposo() { return rs == null ? null : [rs, rd]; },
    };
  }

  // faccia arrabbiata: sopracciglia aggrottate (e naso arricciato). Ognuno ha la sua faccia "normale" e gli occhiali
  // possono far sembrare le sopracciglia sempre un po' giù: si impara piano piano il valore di riposo di chi guarda e
  // conta solo quanto si aggrotta in più. Restituisce un oggetto con aggiungi(espressioni) → true se arrabbiato.
  function creaRabbia({ scarto = 0.22, minimo = 0.3, lento = 0.03 } = {}) {
    let riposo = null;
    return {
      aggiungi(e) {
        if (!e) return false;
        const v = (k) => e[k] || 0;
        const giu = (v('browDownLeft') + v('browDownRight')) / 2 + 0.5 * (v('noseSneerLeft') + v('noseSneerRight')) / 2;
        const sorriso = (v('mouthSmileLeft') + v('mouthSmileRight')) / 2;
        if (riposo == null) riposo = giu;
        const arrabbiato = giu - riposo > scarto && giu > minimo && sorriso < 0.3;
        if (!arrabbiato && giu < riposo + scarto / 2) riposo += (giu - riposo) * lento; // il riposo segue solo la faccia calma
        return arrabbiato;
      },
      get riposo() { return riposo; },
    };
  }

  const api = { ditoAlzato, crea67, movimento, creaRabbia, tristezza, triste, creaTristezza, boccaAperta, misuraLingua, linguaFuori, creaLingua, occhiSocchiusi, creaSocchiusi, occhiolino, creaOcchiolino };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.FotocameraGesti = api;
})(typeof window !== 'undefined' ? window : globalThis);
