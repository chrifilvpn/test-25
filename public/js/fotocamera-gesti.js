// FOTOCAMERA: riconoscimento dei gesti dai punti delle mani (21 punti per mano, coordinate da 0 a 1, y verso il basso,
// come li dà MediaPipe). Solo conti, niente pagina: lo usa public/js/fotocamera.js e lo provano i test (test/fotocamera.js).
(function (radice) {
  // dito indice alzato: indice dritto e verso l'alto, medio, anulare e mignolo piegati (il pollice non conta)
  function ditoAlzato(m) {
    if (!m || m.length < 21) return false;
    const d = (a, b) => Math.hypot(m[a].x - m[b].x, m[a].y - m[b].y);
    const palmo = d(0, 9) || 0.0001; // polso → base del medio: la misura della mano
    const dritto = m[8].y < m[6].y && m[6].y < m[5].y && m[5].y - m[8].y > palmo * 0.6;
    const piegato = (punta, nocca) => d(punta, 0) < d(nocca, 0) * 1.15;
    return dritto && piegato(12, 10) && piegato(16, 14) && piegato(20, 18);
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
    return Math.max(giu, 0.6 * v('browInnerUp') + 0.6 * giu);
  }
  const triste = (e, soglia = 0.3) => tristezza(e) > soglia;
  // bocca aperta: la mascella giù ("Huh?")
  const boccaAperta = (e, soglia = 0.45) => !!e && (e.jawOpen || 0) > soglia;
  // occhi socchiusi: tutti e due mezzi chiusi (né aperti né chiusi del tutto, come quando chiudi gli occhi o sbatti)
  function occhiSocchiusi(e) {
    if (!e) return false;
    const s = e.eyeBlinkLeft || 0, d = e.eyeBlinkRight || 0;
    return s > 0.3 && d > 0.3 && s < 0.85 && d < 0.85;
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
  function linguaFuori(px, w, h, k, e) {
    if (e && (e.tongueOut || 0) > 0.15) return true;
    if (!px || !k || k.length < 426) return false;
    const larga = Math.abs(k[291].x - k[61].x); // larghezza della bocca
    const viso = k[152].y - k[10].y;
    const da = Math.round(k[14].y * h), a = Math.round(k[152].y * h);
    if (larga <= 0 || viso <= 0 || a <= da) return false;
    const guancia = (rossore(px, w, h, k[205].x, k[205].y, larga * 0.1, viso * 0.03) + rossore(px, w, h, k[425].x, k[425].y, larga * 0.1, viso * 0.03)) / 2;
    let rosse = 0;
    for (let y = da; y <= a; y++) if (rossore(px, w, h, k[14].x, y / h, larga * 0.15, 0) > guancia * 1.12) rosse++;
    return rosse / h > viso * 0.09;
  }

  // occhiolino: un occhio chiuso e l'altro aperto
  function occhiolino(e) {
    if (!e) return false;
    const s = e.eyeBlinkLeft || 0, d = e.eyeBlinkRight || 0;
    return Math.max(s, d) > 0.55 && Math.min(s, d) < 0.3 && Math.abs(s - d) > 0.35;
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

  const api = { ditoAlzato, crea67, movimento, creaRabbia, tristezza, triste, boccaAperta, linguaFuori, occhiSocchiusi, occhiolino };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.FotocameraGesti = api;
})(typeof window !== 'undefined' ? window : globalThis);
