// TASTIERA DEL TELEFONO: quando si scrive in un gioco (Catena, Impostore, Nomi cose città, Indovina il numero…) la
// tastiera copre metà schermo. Finché un campo del tavolo è attivo il body ha la classe "tst-aperta" e
// tastiera-telefono.css nasconde le righe che non servono (nomi dei posti in alto e in basso), così sopra il campo
// resta visibile il gioco.
(() => {
  const dito = () => matchMedia('(hover: none) and (pointer: coarse)').matches;
  const campo = (el) => el && el.closest && el.closest('#tavolo') && el.matches('textarea, input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]):not([type=submit])');
  let via = null;
  document.addEventListener('focusin', (e) => {
    if (!dito() || !campo(e.target)) return;
    clearTimeout(via);
    document.body.classList.add('tst-aperta');
    setTimeout(() => { try { e.target.scrollIntoView({ block: 'nearest' }); } catch { /* vecchi browser */ } }, 350);
  });
  // si aspetta un attimo: passando da un campo all'altro (Nomi cose città) la pagina non deve saltare
  document.addEventListener('focusout', () => { clearTimeout(via); via = setTimeout(() => document.body.classList.remove('tst-aperta'), 150); });
})();
