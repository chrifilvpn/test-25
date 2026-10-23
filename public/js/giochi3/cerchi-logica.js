// CERCHI A TEMPO: la mappa (i cerchi da colpire a tempo di musica) nasce da un seme, uguale nel server e nel browser
// (il server lo carica con require, il browser lo trova in window.CerchiLogica). Campo di 800×600.
// Ogni cerchio ha il suo istante (ms dall'inizio della musica): un anello si stringe e quando tocca il cerchio è il
// momento di cliccare. Giudizio: 300 (preciso), 100, 50, mancato, secondo quanto si è lontani dall'istante giusto.
(function (radice, crea) {
  if (typeof module === 'object' && module.exports) module.exports = crea();
  else radice.CerchiLogica = crea();
}(typeof window !== 'undefined' ? window : globalThis, () => {
  const W = 800, H = 600, MARGINE = 70;
  // per livello: battiti al minuto, quanto prima appare il cerchio (ms), raggio, finestre del 300/100/50 (± ms),
  // quanti battiti tra un cerchio e l'altro (a caso tra questi) e quanto salta la posizione
  const LIVELLI = {
    facile: { bpm: 100, appare: 1400, raggio: 58, finestre: [80, 140, 200], passi: [1, 1, 1, 2], salto: 150 },
    medio: { bpm: 120, appare: 1100, raggio: 50, finestre: [60, 115, 165], passi: [0.5, 1, 1, 1, 0.5], salto: 175 },
    difficile: { bpm: 140, appare: 800, raggio: 42, finestre: [45, 90, 135], passi: [0.5, 0.5, 1, 0.5, 0.25, 0.25], salto: 210 },
  };
  const VALORI = [300, 100, 50, 0];
  const INIZIO = 2400; // ms di musica prima del primo cerchio

  function prossimo(r) { r.a = (r.a + 0x6d2b79f5) >>> 0; let t = r.a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }

  function genera(seme, livello = 'medio', secondi = 60) {
    const L = LIVELLI[livello] || LIVELLI.medio, r = { a: seme >>> 0 };
    const battito = 60000 / L.bpm;
    const cerchi = [];
    let t = INIZIO, x = W / 2, y = H / 2, ang = prossimo(r) * Math.PI * 2, gruppo = 0, n = 0, quantiNelGruppo = 4 + Math.floor(prossimo(r) * 5);
    let passoPrima = 1;
    while (t < secondi * 1000 - 1000) {
      cerchi.push({ t: Math.round(t), x: Math.round(x), y: Math.round(y), n: n + 1, g: gruppo });
      n++;
      if (n >= quantiNelGruppo) { n = 0; gruppo++; quantiNelGruppo = 4 + Math.floor(prossimo(r) * 5); }
      // il ritmo: a gruppi di 4 battiti; i quarti (0.25) vengono a coppie, come piccoli "trilli"
      let passo = L.passi[Math.floor(prossimo(r) * L.passi.length)];
      if (passoPrima === 0.25 && passo !== 0.25 && cerchi.length % 2) passo = 0.25;
      passoPrima = passo;
      t += passo * battito;
      // la posizione: si gira un po' e si salta in proporzione al tempo (cerchi vicini nel tempo = vicini sul campo);
      // lontano dal centro si tende a tornare verso il centro, e il cerchio nuovo non copre gli ultimi tre
      const d = Math.max(L.raggio * (passo < 0.5 ? 1.3 : 2.3), L.salto * Math.min(1.4, passo) * (0.75 + prossimo(r) * 0.5));
      let nx = x, ny = y;
      for (let prova = 0; prova < 10; prova++) {
        ang += (prossimo(r) - 0.5) * (prova ? 2.4 : 1.6);
        const verso = Math.atan2(H / 2 - y, W / 2 - x), lontano = Math.hypot(W / 2 - x, H / 2 - y) / 300;
        if (lontano > 0.6) { let dd = verso - ang; while (dd > Math.PI) dd -= 2 * Math.PI; while (dd < -Math.PI) dd += 2 * Math.PI; ang += dd * Math.min(0.8, (lontano - 0.6) * 0.9); }
        nx = Math.max(MARGINE, Math.min(W - MARGINE, x + Math.cos(ang) * d)); ny = Math.max(MARGINE, Math.min(H - MARGINE, y + Math.sin(ang) * d));
        const copre = passo >= 0.5 && cerchi.slice(-3).some((c) => Math.hypot(c.x - nx, c.y - ny) < L.raggio * 2);
        if (!copre) break;
      }
      x = nx; y = ny;
    }
    return { livello, bpm: L.bpm, battito, appare: L.appare, raggio: L.raggio, finestre: L.finestre, cerchi, fine: cerchi.length ? cerchi[cerchi.length - 1].t + 1500 : 3000 };
  }

  // il giudizio di un colpo dato lo scarto in ms (null = mancato): 0 = 300, 1 = 100, 2 = 50, 3 = mancato
  function giudizio(mappa, scarto) {
    if (scarto === null || scarto === undefined || !Number.isFinite(scarto)) return 3;
    const a = Math.abs(scarto), f = mappa.finestre;
    return a <= f[0] ? 0 : a <= f[1] ? 1 : a <= f[2] ? 2 : 3;
  }
  // punti e serie: il punteggio cresce con la serie di colpi presi di fila (come nel gioco vero)
  function segna(stato, mappa, scarto) {
    const g = giudizio(mappa, scarto);
    stato.conteggi[g]++;
    if (g === 3) stato.serie = 0;
    else { stato.punti += Math.round(VALORI[g] * (1 + stato.serie / 25)); stato.serie++; stato.serieMax = Math.max(stato.serieMax, stato.serie); }
    stato.prossimo++;
    return g;
  }
  const nuovoStato = () => ({ punti: 0, serie: 0, serieMax: 0, conteggi: [0, 0, 0, 0], prossimo: 0 });
  // precisione in percentuale, come nel gioco vero: (300·a + 100·b + 50·c) / (300·tutti)
  function precisione(stato) {
    const tot = stato.conteggi.reduce((s, v) => s + v, 0);
    return tot ? (stato.conteggi[0] * 300 + stato.conteggi[1] * 100 + stato.conteggi[2] * 50) / (tot * 3) : 100;
  }

  return { W, H, LIVELLI, VALORI, INIZIO, genera, giudizio, segna, nuovoStato, precisione };
}));
