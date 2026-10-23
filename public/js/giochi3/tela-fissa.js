// TELA FISSA: un campo disegnato (canvas) che resta vivo anche quando il tavolo si ridisegna, per i giochi a turni
// liberi che si giocano col mouse o col dito (Collega i colori, Bolle colorate, Caramelle in fila, Cerchi a tempo).
// Il pannello del gioco ha un posto vuoto (es. <div class="cg-box"></div>): in dopo() la tela si rimette lì dentro.
// La tela misura W×H "unità del gioco": prende la larghezza del suo posto e l'altezza che resta sullo schermo.
//   const T = TelaFissa('cg-tela', { W, H })   →  T.tela, T.metti(selettore, { W, H, sotto }), T.g() (contesto 2D già
//   in scala), T.punto(evento) → [x, y] in unità del gioco
window.TelaFissa = (classe) => {
  const tela = document.createElement('canvas');
  tela.className = classe;
  tela.style.touchAction = 'none';
  let W = 100, H = 100, scala = 1, ultimi = { sotto: 120, max: 1 }, misurata = '';
  const touch = () => window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  return {
    tela,
    get W() { return W; }, get H() { return H; }, get scala() { return scala; },
    // rimette la tela nel suo posto e la ridimensiona; sotto = pixel da lasciare sotto (pulsanti)
    metti(selettore, { W: w, H: h, sotto = 120, max = 1 } = {}) {
      W = w; H = h;
      const box = document.querySelector(selettore);
      if (!box) return false;
      if (tela.parentElement !== box) box.prepend(tela);
      this.misura(sotto, max);
      return true;
    },
    misura(sotto = ultimi.sotto, max = ultimi.max) {
      ultimi = { sotto, max };
      const box = tela.parentElement;
      if (!box) return;
      misurata = `${box.clientWidth}:${window.innerHeight}:${W}:${H}`;
      // lo spazio si conta dall'alto del tavolo (il pannello è centrato in altezza: misurare dal posto della tela
      // farebbe dipendere l'altezza da sé stessa)
      const pan = document.getElementById('panno'), primo = pan && pan.firstElementChild;
      const sopra = Math.max(0, pan && primo && pan.contains(box) ? pan.getBoundingClientRect().top + box.getBoundingClientRect().top - primo.getBoundingClientRect().top : box.getBoundingClientRect().top);
      const alto = Math.max(touch() ? 220 : 280, window.innerHeight - sopra - sotto);
      scala = Math.min(box.clientWidth / W, alto / H, max);
      const dpr = window.devicePixelRatio || 1, w = Math.round(W * scala), h = Math.round(H * scala);
      if (tela.width !== Math.round(w * dpr) || tela.height !== Math.round(h * dpr)) { tela.width = Math.round(w * dpr); tela.height = Math.round(h * dpr); }
      tela.style.width = `${w}px`; tela.style.height = `${h}px`;
    },
    // il contesto 2D con la scala giusta (si disegna in unità del gioco); se il posto è cambiato (pagina appena
    // mostrata, telefono girato) prima si rimisura
    g() {
      const box = tela.parentElement;
      if (box && `${box.clientWidth}:${window.innerHeight}:${W}:${H}` !== misurata) this.misura();
      const g = tela.getContext('2d'), dpr = window.devicePixelRatio || 1;
      g.setTransform(dpr * scala, 0, 0, dpr * scala, 0, 0);
      return g;
    },
    punto(e) { const r = tela.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; },
    visibile() { return tela.isConnected && tela.offsetParent !== null; },
  };
};
