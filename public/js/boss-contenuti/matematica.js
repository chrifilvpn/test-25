// DISPENSE — Matematica (classe 5ª): analisi, integrali, equazioni differenziali, probabilità e statistica.
// Le formule sono in HTML (apici, pedici e i piccoli componenti mt-* di boss.css); i grafici sono SVG calcolati qui
// con i punti veri delle funzioni.
(() => {
  const { nota, ide, terminale, figura, tabella } = window.BossAiuti;

  // ---------- formule ----------
  const F = (s) => `<span class="mt-f">${s}</span>`;                                   // formula nel testo
  const B = (s) => `<div class="mt-b">${s}</div>`;                                     // formula in evidenza
  const fr = (n, d) => `<span class="mt-fr"><span>${n}</span><span>${d}</span></span>`; // frazione
  const lim = (sotto) => `<span class="mt-lim">lim<small>${sotto}</small></span>`;     // lim con il pedice sotto
  const I = (a, b) => `<span class="mt-int"><i>∫</i><span><sup>${b}</sup><sub>${a}</sub></span></span>`; // integrale definito
  const rad = (x) => `√<span class="mt-rad">${x}</span>`;                              // radice quadrata
  const box = (tipo, titolo, testo) => `<div class="mt-box mt-${tipo}"><b>${titolo}</b>${testo}</div>`; // def, teo, es
  const piu = '<span class="mt-piu">+</span>', meno = '<span class="mt-meno">−</span>';

  // ---------- grafici di funzioni (SVG calcolato) ----------
  let conta = 0;
  const num = (v) => (Math.abs(v) < 1e-9 ? '0' : String(Math.round(v * 100) / 100).replace('-', '−').replace('.', ','));
  function grafico(o) {
    const W = 480, H = o.h || 320, P = 30, { x0, x1, y0, y1 } = o;
    const X = (x) => +(P + (x - x0) / (x1 - x0) * (W - 2 * P)).toFixed(1);
    const Y = (y) => +(H - P - (y - y0) / (y1 - y0) * (H - 2 * P)).toFixed(1);
    const id = `mt-clip${++conta}`, px = o.px || 1, py = o.py || 1;
    const ax = Y(Math.min(Math.max(0, y0), y1)), ay = X(Math.min(Math.max(0, x0), x1));
    let s = `<svg viewBox="0 0 ${W} ${H}" class="mt-graf" role="img" aria-label="${o.titolo || 'grafico'}" font-size="13">`;
    s += `<defs><clipPath id="${id}"><rect x="${P}" y="${P}" width="${W - 2 * P}" height="${H - 2 * P}"/></clipPath></defs>`;
    // griglia e tacche
    let g = '', t = '';
    for (let x = Math.ceil(x0 / px) * px; x <= x1 + 1e-9; x += px) {
      g += `<line x1="${X(x)}" y1="${P}" x2="${X(x)}" y2="${H - P}"/>`;
      if (Math.abs(x) > 1e-9 && (!o.ex || o.ex.includes(Math.round(x * 100) / 100))) t += `<text x="${X(x)}" y="${ax + 15}" text-anchor="middle">${num(x)}</text>`;
    }
    for (let y = Math.ceil(y0 / py) * py; y <= y1 + 1e-9; y += py) {
      g += `<line x1="${P}" y1="${Y(y)}" x2="${W - P}" y2="${Y(y)}"/>`;
      if (Math.abs(y) > 1e-9 && (!o.ey || o.ey.includes(Math.round(y * 100) / 100))) t += `<text x="${ay - 5}" y="${Y(y) + 4}" text-anchor="end">${num(y)}</text>`;
    }
    s += `<g stroke="#e6ebf1" stroke-width="1">${g}</g>`;
    // aree (tra f e g, o tra f e l'asse x) e rettangoli
    for (const a of o.aree || []) {
      const n = 120, su = [], giu = [];
      for (let i = 0; i <= n; i++) { const x = a.a + (a.b - a.a) * i / n; su.push(`${X(x)},${Y(a.f(x))}`); giu.unshift(`${X(x)},${Y(a.g ? a.g(x) : 0)}`); }
      s += `<polygon points="${su.concat(giu).join(' ')}" fill="${a.col || 'rgba(26,95,180,.2)'}" clip-path="url(#${id})"/>`;
    }
    for (const r of o.rett || []) s += `<rect x="${X(r.x)}" y="${Math.min(Y(r.h), Y(0))}" width="${X(r.x + r.w) - X(r.x)}" height="${Math.abs(Y(0) - Y(r.h))}" fill="rgba(224,163,58,.28)" stroke="#c98a1f" stroke-width="1"/>`;
    // assi con le frecce
    s += `<g stroke="#3d4b5c" stroke-width="1.4" fill="#3d4b5c"><line x1="${P - 6}" y1="${ax}" x2="${W - P + 10}" y2="${ax}"/><line x1="${ay}" y1="${H - P + 6}" x2="${ay}" y2="${P - 10}"/>
      <path d="M${W - P + 14} ${ax}l-8 -4v8z" stroke="none"/><path d="M${ay} ${P - 14}l-4 8h8z" stroke="none"/></g>`;
    s += `<g fill="#3d4b5c">${t}<text x="${W - P + 8}" y="${ax - 8}" font-style="italic">x</text><text x="${ay + 8}" y="${P - 6}" font-style="italic">y</text>${ax < H - P - 20 && ay > P + 20 ? `<text x="${ay - 5}" y="${ax + 15}" text-anchor="end">O</text>` : ''}</g>`;
    // asintoti e rette tratteggiate
    for (const a of o.asintoti || []) {
      if (a.x !== undefined) s += `<line x1="${X(a.x)}" y1="${P}" x2="${X(a.x)}" y2="${H - P}" stroke="#8a96a3" stroke-width="1.3" stroke-dasharray="6 4"/>`;
      else if (a.y !== undefined) s += `<line x1="${P}" y1="${Y(a.y)}" x2="${W - P}" y2="${Y(a.y)}" stroke="#8a96a3" stroke-width="1.3" stroke-dasharray="6 4"/>`;
      else s += `<line x1="${X(x0)}" y1="${Y(a.f(x0))}" x2="${X(x1)}" y2="${Y(a.f(x1))}" stroke="#8a96a3" stroke-width="1.3" stroke-dasharray="6 4" clip-path="url(#${id})"/>`;
      if (a.t) s += `<text x="${X(a.tx)}" y="${Y(a.ty)}" fill="#6b7a8c" font-style="italic">${a.t}</text>`;
    }
    // curve: campionate, spezzate dove la funzione non esiste o esce dal riquadro (asintoti verticali)
    for (const c of o.curve || []) {
      const da = c.da ?? x0, a = c.a ?? x1, n = 700, sp = y1 - y0, segs = [];
      let seg = [], fuori = null;
      for (let i = 0; i <= n; i++) {
        const x = da + (a - da) * i / n, y = c.f(x);
        if (!Number.isFinite(y)) { if (seg.length) segs.push(seg); seg = []; fuori = null; continue; }
        const yc = Math.max(y0 - sp, Math.min(y1 + sp, y));
        if (y !== yc) { if (seg.length) { seg.push([x, yc]); segs.push(seg); seg = []; } fuori = [x, yc]; continue; }
        if (!seg.length && fuori) seg.push(fuori);
        fuori = null; seg.push([x, y]);
      }
      if (seg.length) segs.push(seg);
      const d = segs.map((q) => 'M' + q.map(([x, y]) => `${X(x)} ${Y(y)}`).join('L')).join('');
      s += `<path d="${d}" fill="none" stroke="${c.col || '#1a5fb4'}" stroke-width="${c.sw || 2.4}" ${c.tratto ? 'stroke-dasharray="7 5"' : ''} stroke-linejoin="round" clip-path="url(#${id})"/>`;
      if (c.t) s += `<text x="${X(c.tx)}" y="${Y(c.ty)}" fill="${c.col || '#1a5fb4'}" font-style="italic" font-weight="600">${c.t}</text>`;
    }
    // punti notevoli (pieni o vuoti) con l'etichetta
    for (const p of o.punti || []) {
      s += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="4.2" fill="${p.vuoto ? '#fff' : (p.col || '#c5483c')}" stroke="${p.col || '#c5483c'}" stroke-width="1.8"/>`;
      if (p.t) s += `<text x="${X(p.x) + (p.dx ?? 8)}" y="${Y(p.y) + (p.dy ?? -8)}" fill="#1f2d3d" ${p.dx < 0 ? 'text-anchor="end"' : ''}>${p.t}</text>`;
    }
    return s + '</svg>';
  }
  // istogramma (distribuzioni di probabilità)
  function barre(valori, etichette, titolo) {
    const W = 480, H = 280, P = 36, tacche = Math.ceil(Math.max(...valori) * 10 + 0.5), max = tacche / 10, n = valori.length, bw = (W - 2 * P) / n;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${titolo}" font-size="12">`;
    for (let k = 0; k <= tacche; k++) { const v = k / 10, y = H - P - (H - 2 * P) * k / tacche; s +=`<line x1="${P}" y1="${y}" x2="${W - P}" y2="${y}" stroke="#e6ebf1"/><text x="${P - 5}" y="${y + 4}" text-anchor="end" fill="#3d4b5c">${num(v)}</text>`; }
    valori.forEach((v, i) => {
      const h = (H - 2 * P) * v / max, x = P + i * bw;
      s += `<rect x="${(x + bw * 0.15).toFixed(1)}" y="${(H - P - h).toFixed(1)}" width="${(bw * 0.7).toFixed(1)}" height="${h.toFixed(1)}" fill="#1a5fb4" rx="2"/>`;
      s += `<text x="${(x + bw / 2).toFixed(1)}" y="${H - P + 15}" text-anchor="middle" fill="#3d4b5c">${etichette[i]}</text>`;
      if (v >= 0.001) s += `<text x="${(x + bw / 2).toFixed(1)}" y="${(H - P - h - 5).toFixed(1)}" text-anchor="middle" fill="#16365f" font-size="11">${v.toFixed(3).replace('.', ',')}</text>`;
    });
    return s + `<line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" stroke="#3d4b5c" stroke-width="1.4"/><text x="${W - P}" y="${H - 6}" text-anchor="end" fill="#3d4b5c" font-style="italic">k</text></svg>`;
  }
  const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };

  // albero delle probabilità del test diagnostico (Bayes)
  const ALBERO = `<svg viewBox="0 0 480 250" role="img" aria-label="Diagramma ad albero" font-size="13">
    <g stroke="#8a96a3" stroke-width="1.5" fill="none"><path d="M40 125L190 60M40 125L190 190M230 60L380 30M230 60L380 90M230 190L380 160M230 190L380 220"/></g>
    <circle cx="36" cy="125" r="6" fill="#16365f"/>
    <g fill="#1f2d3d"><text x="200" y="64" font-weight="600">M</text><text x="200" y="194" font-weight="600">M̄</text>
      <text x="388" y="34">+ → 0,0099</text><text x="388" y="94">− → 0,0001</text><text x="388" y="164">+ → 0,0495</text><text x="388" y="224">− → 0,9405</text></g>
    <g fill="#1a5fb4" font-style="italic"><text x="92" y="80">0,01</text><text x="92" y="182">0,99</text><text x="285" y="36">0,99</text><text x="285" y="92">0,01</text><text x="285" y="164">0,05</text><text x="285" y="222">0,95</text></g>
  </svg>`;

  window.BossContenuti = window.BossContenuti || {};
  window.BossContenuti.matematica = {
    id: 'matematica', nome: 'Matematica',
    argomenti: [
      // ============================ 1. LIMITI ============================
      { id: 'limiti', titolo: 'Limiti e continuità', minuti: 18, giorni: -41, corpo: () => `
        <p class="st-intro">Il <b>limite</b> descrive come si comporta una funzione quando la variabile si avvicina a un valore (o cresce senza fine), anche se in quel punto la funzione non è definita. È lo strumento su cui si costruiscono continuità, derivate e integrali: in questa lezione vediamo la definizione, come si calcolano i limiti (forme indeterminate e limiti notevoli), le funzioni continue e gli asintoti.</p>
        <h2 id="st-s1">1. La definizione di limite</h2>
        ${box('def', 'Definizione (limite finito per x → x₀)', `<p>Sia ${F('f')} definita in un intorno di ${F('x<sub>0</sub>')}, escluso al più ${F('x<sub>0</sub>')}. Si dice che ${F(`${lim('x→x<sub>0</sub>')} f(x) = l`)} se</p>${B('∀ε &gt; 0 ∃δ &gt; 0 : 0 &lt; |x − x<sub>0</sub>| &lt; δ ⇒ |f(x) − l| &lt; ε')}<p>cioè: possiamo rendere ${F('f(x)')} vicina a ${F('l')} quanto vogliamo, pur di prendere ${F('x')} abbastanza vicino a ${F('x<sub>0</sub>')}.</p>`)}
        <p>In modo analogo si definiscono il <b>limite destro</b> ${F(`${lim('x→x<sub>0</sub><sup>+</sup>')} f(x)`)} (solo con ${F('x &gt; x<sub>0</sub>')}) e il <b>limite sinistro</b> (solo con ${F('x &lt; x<sub>0</sub>')}). Il limite esiste se e solo se esistono il destro e il sinistro e sono uguali. Se ${F('f(x)')} supera qualunque numero ${F('M')} vicino a ${F('x<sub>0</sub>')} scriviamo ${F(`${lim('x→x<sub>0</sub>')} f(x) = +∞`)}; i limiti per ${F('x → ±∞')} si definiscono sostituendo l'intorno di ${F('x<sub>0</sub>')} con le semirette ${F('x &gt; N')} o ${F('x &lt; −N')}.</p>
        ${nota('info', 'Teoremi da ricordare', '<b>Unicità</b>: se il limite esiste, è unico. <b>Permanenza del segno</b>: se il limite è positivo, la funzione è positiva in un intorno del punto. <b>Confronto (dei carabinieri)</b>: se g(x) ≤ f(x) ≤ h(x) e g e h tendono allo stesso limite l, anche f tende a l.')}
        <h2 id="st-s2">2. Calcolo dei limiti e forme indeterminate</h2>
        <p>Per calcolare un limite si sostituisce il valore a cui tende ${F('x')} e si usano le regole dell'algebra dei limiti (con le convenzioni ${F('+∞ + ∞ = +∞')}, ${F('k · ∞ = ∞')} con ${F('k ≠ 0')}, ${F(`${fr('k', '∞')} = 0`)}, ${F(`${fr('k', '0<sup>±</sup>')} = ±∞`)}). Quando il risultato non è determinato si ha una <b>forma indeterminata</b>: non significa che il limite non esiste, ma che bisogna trasformare l'espressione.</p>
        ${tabella(['Forma indeterminata', 'Strategia tipica'], [
          [F('+∞ − ∞'), 'raccogliere il termine di grado massimo; con le radici razionalizzare'],
          [F('0 · ∞'), 'riscrivere come quoziente (0/0 o ∞/∞)'],
          [F(`${fr('∞', '∞')}`), 'raccogliere le potenze di grado massimo di numeratore e denominatore'],
          [F(`${fr('0', '0')}`), 'scomporre e semplificare, limiti notevoli, regola di De l\'Hôpital'],
          [F('1<sup>∞</sup>, 0<sup>0</sup>, ∞<sup>0</sup>'), 'scrivere f(x)<sup>g(x)</sup> = e<sup>g(x)·ln f(x)</sup>']])}
        <p>Per le funzioni razionali con ${F('x → ±∞')} basta confrontare i gradi ${F('n')} del numeratore e ${F('m')} del denominatore: se ${F('n &lt; m')} il limite è 0; se ${F('n = m')} è il rapporto dei coefficienti direttivi; se ${F('n &gt; m')} è ${F('±∞')} (il segno si ricava dai coefficienti direttivi).</p>
        ${box('es', 'Esempio 1 — forma 0/0', `${B(`${lim('x→2')} ${fr('x<sup>2</sup> − 4', 'x − 2')} = ${lim('x→2')} ${fr('(x − 2)(x + 2)', 'x − 2')} = ${lim('x→2')} (x + 2) = 4`)}<p>La semplificazione è lecita perché nel limite ${F('x ≠ 2')}.</p>`)}
        ${box('es', 'Esempio 2 — forma ∞/∞', `${B(`${lim('x→+∞')} ${fr('3x<sup>2</sup> − x + 1', '2x<sup>2</sup> + 5')} = ${lim('x→+∞')} ${fr('x<sup>2</sup>(3 − 1/x + 1/x<sup>2</sup>)', 'x<sup>2</sup>(2 + 5/x<sup>2</sup>)')} = ${fr('3', '2')}`)}`)}
        ${box('es', 'Esempio 3 — forma +∞ − ∞ con le radici', `<p>Moltiplichiamo e dividiamo per la somma (razionalizzazione):</p>${B(`${lim('x→+∞')} (${rad('x<sup>2</sup> + x')} − x) = ${lim('x→+∞')} ${fr('x<sup>2</sup> + x − x<sup>2</sup>', `${rad('x<sup>2</sup> + x')} + x`)} = ${lim('x→+∞')} ${fr('x', `x(${rad('1 + 1/x')} + 1)`)} = ${fr('1', '2')}`)}`)}
        <h2 id="st-s3">3. Limiti notevoli e gerarchia degli infiniti</h2>
        ${tabella(['Limite notevole', 'Valore'], [
          [F(`${lim('x→0')} ${fr('sin x', 'x')}`), '1'],
          [F(`${lim('x→0')} ${fr('1 − cos x', 'x<sup>2</sup>')}`), F(fr('1', '2'))],
          [F(`${lim('x→±∞')} (1 + ${fr('1', 'x')})<sup>x</sup>`), F('e ≈ 2,718')],
          [F(`${lim('x→0')} ${fr('ln(1 + x)', 'x')}`), '1'],
          [F(`${lim('x→0')} ${fr('e<sup>x</sup> − 1', 'x')}`), '1'],
          [F(`${lim('x→0')} ${fr('a<sup>x</sup> − 1', 'x')}`), F('ln a')],
          [F(`${lim('x→0')} ${fr('(1 + x)<sup>k</sup> − 1', 'x')}`), F('k')]])}
        ${box('es', 'Esempi', `<p>${F(`${lim('x→0')} ${fr('sin 3x', 'x')} = ${lim('x→0')} 3 · ${fr('sin 3x', '3x')} = 3 · 1 = 3`)}</p>
          <p>${F(`${lim('x→0')} ${fr('e<sup>2x</sup> − 1', 'sin x')} = ${lim('x→0')} ${fr('e<sup>2x</sup> − 1', '2x')} · ${fr('x', 'sin x')} · 2 = 2`)}</p>
          <p>${F(`${lim('x→+∞')} (1 + ${fr('2', 'x')})<sup>x</sup> = ${lim('x→+∞')} [(1 + ${fr('2', 'x')})<sup>x/2</sup>]<sup>2</sup> = e<sup>2</sup>`)}</p>`)}
        <p>Per ${F('x → +∞')} gli infiniti hanno una <b>gerarchia</b>: ${F('ln x ≪ x<sup>a</sup> ≪ b<sup>x</sup>')} (con ${F('a &gt; 0')}, ${F('b &gt; 1')}). Quindi, per esempio, ${F(`${lim('x→+∞')} ${fr('x<sup>5</sup>', 'e<sup>x</sup>')} = 0`)} e ${F(`${lim('x→+∞')} ${fr('ln x', 'x')} = 0`)}: l'esponenziale «vince» su ogni potenza, la potenza su ogni logaritmo.</p>
        <h2 id="st-s4">4. Funzioni continue e punti di discontinuità</h2>
        ${box('def', 'Definizione (continuità)', `<p>${F('f')} è <b>continua</b> in ${F('x<sub>0</sub>')} se ${F(`${lim('x→x<sub>0</sub>')} f(x) = f(x<sub>0</sub>)`)}. È continua in un intervallo se lo è in ogni suo punto. Polinomi, funzioni razionali, radici, esponenziali, logaritmi e funzioni goniometriche sono continue nel loro dominio; somme, prodotti, quozienti e composizioni di funzioni continue sono continue.</p>`)}
        ${tabella(['Tipo', 'Che cosa succede in x₀', 'Esempio'], [
          ['1ª specie (salto)', 'limite destro e sinistro finiti ma diversi; salto = |l₊ − l₋|', F(`f(x) = ${fr('x', '|x|')}`) + ' in 0: salto 2'],
          ['2ª specie', 'almeno uno dei due limiti è infinito o non esiste', F(`f(x) = ${fr('1', 'x')}`) + ' in 0'],
          ['3ª specie (eliminabile)', 'il limite esiste finito, ma f non è definita in x₀ o vale un\'altra cosa', F(`f(x) = ${fr('sin x', 'x')}`) + ' in 0']])}
        ${figura(grafico({ x0: -10, x1: 10, y0: -0.5, y1: 1.3, px: 2, py: 0.5, h: 260, curve: [{ f: (x) => (x === 0 ? NaN : Math.sin(x) / x), t: 'y = sin x / x', tx: 2.2, ty: 0.85 }], punti: [{ x: 0, y: 1, vuoto: true, t: '(0, 1)', dx: 9, dy: -8 }] }), 'Figura 1 – y = sin x / x non è definita in 0, ma il limite vale 1: discontinuità eliminabile (il «buco» nel grafico). Ponendo f(0) = 1 la funzione diventa continua.')}
        ${box('teo', 'Teoremi sulle funzioni continue in un intervallo chiuso [a; b]', `<ul>
          <li><b>Weierstrass</b>: se ${F('f')} è continua in ${F('[a; b]')}, allora ha in ${F('[a; b]')} un massimo e un minimo assoluti.</li>
          <li><b>Valori intermedi</b>: se ${F('f')} è continua in ${F('[a; b]')}, assume tutti i valori compresi tra il minimo e il massimo.</li>
          <li><b>Esistenza degli zeri (Bolzano)</b>: se ${F('f')} è continua in ${F('[a; b]')} e ${F('f(a) · f(b) &lt; 0')}, esiste almeno un ${F('c ∈ (a; b)')} con ${F('f(c) = 0')}.</li></ul>`)}
        <p>Il teorema degli zeri è alla base del <b>metodo di bisezione</b>, il più semplice algoritmo per risolvere un'equazione al computer: si dimezza l'intervallo e si tiene la metà in cui la funzione cambia segno. Per ${F('x<sup>3</sup> + x − 1 = 0')} si parte da ${F('[0; 1]')}, perché ${F('f(0) = −1 &lt; 0')} e ${F('f(1) = 1 &gt; 0')}.</p>
        ${ide('Bisezione.java', 'java', String.raw`
public class Bisezione {
    static double f(double x) { return x * x * x + x - 1; }

    // f continua in [a; b] e f(a)*f(b) < 0: per il teorema degli zeri c'è una radice
    static double bisezione(double a, double b, double eps) {
        int passi = 0;
        while (b - a > eps) {
            double m = (a + b) / 2;
            if (f(a) * f(m) <= 0) b = m;   // la radice è in [a; m]
            else a = m;                    // la radice è in [m; b]
            passi++;
        }
        System.out.println("Passi: " + passi);
        return (a + b) / 2;
    }

    public static void main(String[] args) {
        System.out.printf("Radice: %.6f%n", bisezione(0, 1, 1e-6));
    }
}`, 'Figura 2 – Metodo di bisezione: con eps = 10⁻⁶ servono 20 passi (2²⁰ > 10⁶) e si ottiene x ≈ 0,682328.')}
        <h2 id="st-s5">5. Gli asintoti</h2>
        ${tabella(['Asintoto', 'Condizione', 'Equazione'], [
          ['Verticale', F(`${lim('x→x<sub>0</sub>')} f(x) = ±∞`) + ' (basta da un lato)', F('x = x<sub>0</sub>')],
          ['Orizzontale', F(`${lim('x→±∞')} f(x) = l`) + ' finito', F('y = l')],
          ['Obliquo', F(`m = ${lim('x→±∞')} ${fr('f(x)', 'x')}`) + ' finito e ≠ 0, ' + F(`q = ${lim('x→±∞')} [f(x) − mx]`) + ' finito', F('y = mx + q')]])}
        ${box('es', 'Esempio — f(x) = (x² + 1) / (x − 1)', `<ol class="mt-passi">
          <li>Dominio: ${F('x ≠ 1')}. Poiché ${F(`${lim('x→1<sup>±</sup>')} f(x) = ±∞`)}, la retta ${F('x = 1')} è <b>asintoto verticale</b>.</li>
          <li>${F(`${lim('x→±∞')} f(x) = ±∞`)}: niente asintoto orizzontale. Cerchiamo quello obliquo.</li>
          <li>${F(`m = ${lim('x→∞')} ${fr('x<sup>2</sup> + 1', 'x<sup>2</sup> − x')} = 1`)}</li>
          <li>${F(`q = ${lim('x→∞')} [${fr('x<sup>2</sup> + 1', 'x − 1')} − x] = ${lim('x→∞')} ${fr('x + 1', 'x − 1')} = 1`)}</li>
          <li><b>Asintoto obliquo</b>: ${F('y = x + 1')} (sia per ${F('x → +∞')} sia per ${F('x → −∞')}).</li></ol>`)}
        ${figura(grafico({ x0: -5, x1: 6, y0: -8, y1: 12, py: 2, curve: [{ f: (x) => (x * x + 1) / (x - 1), t: 'f(x)', tx: 2.6, ty: 9.2 }], asintoti: [{ x: 1, t: 'x = 1', tx: 1.15, ty: -7 }, { f: (x) => x + 1, t: 'y = x + 1', tx: 3.3, ty: 3.2 }] }), 'Figura 3 – Il grafico di f(x) = (x² + 1)/(x − 1) con l\'asintoto verticale x = 1 e l\'asintoto obliquo y = x + 1.')}
        ${nota('avviso', 'Attenzione', 'Una funzione non può avere, dalla stessa parte (per x → +∞ oppure per x → −∞), sia un asintoto orizzontale sia uno obliquo. Un polinomio di grado ≥ 2 non ha asintoti di nessun tipo.')}
        <h2 id="st-s6">6. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Calcola ${F(`${lim('x→3')} ${fr('x<sup>2</sup> − 9', 'x<sup>2</sup> − 3x')}`)}. <small>[2]</small></li>
          <li>Calcola ${F(`${lim('x→−∞')} ${fr('4x<sup>3</sup> + x', '2 − x<sup>3</sup>')}`)}. <small>[−4]</small></li>
          <li>Calcola ${F(`${lim('x→0')} ${fr('1 − cos 2x', 'x<sup>2</sup>')}`)}. <small>[2]</small></li>
          <li>Calcola ${F(`${lim('x→+∞')} (1 − ${fr('3', 'x')})<sup>x</sup>`)}. <small>[e<sup>−3</sup>]</small></li>
          <li>Classifica i punti di discontinuità di ${F(`f(x) = ${fr('x<sup>2</sup> − 1', 'x<sup>2</sup> − x')}`)}. <small>[x = 0 di 2ª specie, x = 1 eliminabile]</small></li>
          <li>Trova tutti gli asintoti di ${F(`f(x) = ${fr('2x<sup>2</sup> − 3', 'x + 2')}`)}. <small>[x = −2; y = 2x − 4]</small></li>
          <li>Dimostra che ${F('x<sup>3</sup> − 4x + 1 = 0')} ha una soluzione in ${F('[0; 1]')} e approssimala con tre passi di bisezione.</li>
        </ol>` },

      // ============================ 2. DERIVATE ============================
      { id: 'derivate', titolo: 'Le derivate', minuti: 20, giorni: -34, corpo: () => `
        <p class="st-intro">La <b>derivata</b> misura la rapidità con cui una funzione cambia: geometricamente è la pendenza della retta tangente al grafico, in fisica è la velocità istantanea, in informatica è alla base degli algoritmi di ottimizzazione (come la discesa del gradiente usata per addestrare le reti neurali). Vediamo la definizione, la tabella delle derivate fondamentali, le regole di calcolo, la retta tangente e i teoremi principali.</p>
        <h2 id="st-s1">1. Rapporto incrementale e derivata</h2>
        <p>Data ${F('y = f(x)')} e un punto ${F('x<sub>0</sub>')}, diamo a ${F('x')} un incremento ${F('h')}. Il <b>rapporto incrementale</b> ${F(`${fr('f(x<sub>0</sub> + h) − f(x<sub>0</sub>)', 'h')}`)} è la pendenza della retta secante che passa per ${F('(x<sub>0</sub>; f(x<sub>0</sub>))')} e ${F('(x<sub>0</sub> + h; f(x<sub>0</sub> + h))')}.</p>
        ${box('def', 'Definizione (derivata in un punto)', `${B(`f′(x<sub>0</sub>) = ${lim('h→0')} ${fr('f(x<sub>0</sub> + h) − f(x<sub>0</sub>)', 'h')}`)}<p>Se il limite esiste ed è finito, ${F('f')} si dice <b>derivabile</b> in ${F('x<sub>0</sub>')}. Altre notazioni: ${F('y′')}, ${F(fr('dy', 'dx'))}, ${F('Df(x)')}.</p>`)}
        ${box('es', 'Esempio — la derivata di x² con la definizione', `${B(`${lim('h→0')} ${fr('(x<sub>0</sub> + h)<sup>2</sup> − x<sub>0</sub><sup>2</sup>', 'h')} = ${lim('h→0')} ${fr('2x<sub>0</sub>h + h<sup>2</sup>', 'h')} = ${lim('h→0')} (2x<sub>0</sub> + h) = 2x<sub>0</sub>`)}<p>Quindi ${F('D(x<sup>2</sup>) = 2x')}: in ${F('x = 3')} la tangente alla parabola ha pendenza 6.</p>`)}
        ${box('teo', 'Teorema (derivabilità e continuità)', `<p>Se ${F('f')} è derivabile in ${F('x<sub>0</sub>')}, allora è continua in ${F('x<sub>0</sub>')}. Il contrario è falso: ${F('f(x) = |x|')} è continua in 0 ma non derivabile (derivata sinistra −1, destra +1).</p>`)}
        ${tabella(['Punto di non derivabilità', 'Derivate sinistra e destra', 'Esempio'], [
          ['Punto angoloso', 'finite e diverse (o una finita e una infinita)', F('y = |x|') + ' in 0'],
          ['Cuspide', 'infinite di segno opposto', F(`y = ${rad('|x|')}`) + ' in 0'],
          ['Flesso a tangente verticale', 'infinite dello stesso segno', F('y = ∛x') + ' in 0']])}
        <h2 id="st-s2">2. Le derivate fondamentali</h2>
        ${tabella(['Funzione f(x)', 'Derivata f′(x)', 'Funzione f(x)', 'Derivata f′(x)'], [
          [F('k') + ' (costante)', '0', F('sin x'), F('cos x')],
          [F('x<sup>n</sup>'), F('n x<sup>n−1</sup>'), F('cos x'), F('−sin x')],
          [F(rad('x')), F(fr('1', `2${rad('x')}`)), F('tan x'), F(`${fr('1', 'cos<sup>2</sup>x')} = 1 + tan<sup>2</sup>x`)],
          [F('e<sup>x</sup>'), F('e<sup>x</sup>'), F('arctan x'), F(fr('1', '1 + x<sup>2</sup>'))],
          [F('a<sup>x</sup>'), F('a<sup>x</sup> ln a'), F('arcsin x'), F(fr('1', rad('1 − x<sup>2</sup>')))],
          [F('ln x'), F(fr('1', 'x')), F('log<sub>a</sub> x'), F(fr('1', 'x ln a'))]])}
        <h2 id="st-s3">3. Le regole di derivazione</h2>
        ${tabella(['Regola', 'Formula'], [
          ['Linearità', F('D[a f(x) + b g(x)] = a f′(x) + b g′(x)')],
          ['Prodotto', F('D[f(x) · g(x)] = f′(x) g(x) + f(x) g′(x)')],
          ['Quoziente', F(`D ${fr('f(x)', 'g(x)')} = ${fr('f′(x) g(x) − f(x) g′(x)', '[g(x)]<sup>2</sup>')}`)],
          ['Funzione composta (catena)', F('D f(g(x)) = f′(g(x)) · g′(x)')]])}
        ${box('es', 'Esempi svolti', `<ol class="mt-passi">
          <li>Prodotto: ${F('D(x<sup>3</sup>e<sup>x</sup>) = 3x<sup>2</sup>e<sup>x</sup> + x<sup>3</sup>e<sup>x</sup> = x<sup>2</sup>e<sup>x</sup>(x + 3)')}</li>
          <li>Quoziente: ${F(`D ${fr('2x + 1', 'x − 3')} = ${fr('2(x − 3) − (2x + 1) · 1', '(x − 3)<sup>2</sup>')} = −${fr('7', '(x − 3)<sup>2</sup>')}`)}</li>
          <li>Composta: ${F('D sin(x<sup>2</sup>) = cos(x<sup>2</sup>) · 2x')}</li>
          <li>Composta: ${F(`D ln(x<sup>2</sup> + 1) = ${fr('2x', 'x<sup>2</sup> + 1')}`)}</li>
          <li>Composta: ${F(`D ${rad('1 − x<sup>2</sup>')} = ${fr('−2x', `2${rad('1 − x<sup>2</sup>')}`)} = −${fr('x', rad('1 − x<sup>2</sup>'))}`)}</li></ol>`)}
        <p>Derivando più volte si ottengono le <b>derivate successive</b>: per ${F('f(x) = x<sup>4</sup> − 2x')} si ha ${F('f′(x) = 4x<sup>3</sup> − 2')}, ${F('f″(x) = 12x<sup>2</sup>')}, ${F('f‴(x) = 24x')}. La derivata seconda indica la concavità del grafico e, in fisica, l'accelerazione.</p>
        <h2 id="st-s4">4. La retta tangente</h2>
        ${box('teo', 'Equazione della retta tangente', `<p>Se ${F('f')} è derivabile in ${F('x<sub>0</sub>')}, la tangente al grafico nel punto ${F('(x<sub>0</sub>; f(x<sub>0</sub>))')} è</p>${B('y − f(x<sub>0</sub>) = f′(x<sub>0</sub>)(x − x<sub>0</sub>)')}<p>La <b>normale</b> (perpendicolare alla tangente) ha pendenza ${F(`−${fr('1', 'f′(x<sub>0</sub>)')}`)} se ${F('f′(x<sub>0</sub>) ≠ 0')}.</p>`)}
        ${box('es', 'Esempio — tangente a f(x) = x³ − 3x in x₀ = 2', `<ol class="mt-passi">
          <li>Ordinata del punto: ${F('f(2) = 8 − 6 = 2')}, quindi il punto è ${F('P(2; 2)')}.</li>
          <li>Derivata: ${F('f′(x) = 3x<sup>2</sup> − 3')}, pendenza ${F('m = f′(2) = 12 − 3 = 9')}.</li>
          <li>Tangente: ${F('y − 2 = 9(x − 2)')}, cioè ${F('y = 9x − 16')}.</li>
          <li>Normale: ${F(`y − 2 = −${fr('1', '9')}(x − 2)`)}, cioè ${F(`y = −${fr('1', '9')}x + ${fr('20', '9')}`)}.</li></ol>`)}
        ${figura(grafico({ x0: -3, x1: 4, y0: -6, y1: 10, py: 2, curve: [{ f: (x) => x ** 3 - 3 * x, t: 'y = x³ − 3x', tx: -2.9, ty: 4.2 }, { f: (x) => 9 * x - 16, col: '#c5483c', sw: 1.8, t: 'y = 9x − 16', tx: 2.75, ty: 6.2 }], punti: [{ x: 2, y: 2, t: 'P(2; 2)', dx: 10, dy: 14 }, { x: -1, y: 2, col: '#3f9b6b' }, { x: 1, y: -2, col: '#3f9b6b' }] }), 'Figura 1 – La cubica y = x³ − 3x e la sua tangente in P(2; 2). In verde i punti in cui f′(x) = 0: lì la tangente è orizzontale.')}
        <h2 id="st-s5">5. I teoremi del calcolo differenziale</h2>
        ${box('teo', 'Teorema di Rolle', `<p>Se ${F('f')} è continua in ${F('[a; b]')}, derivabile in ${F('(a; b)')} e ${F('f(a) = f(b)')}, esiste almeno un ${F('c ∈ (a; b)')} in cui ${F('f′(c) = 0')}.</p>`)}
        ${box('teo', 'Teorema di Lagrange (del valor medio)', `<p>Se ${F('f')} è continua in ${F('[a; b]')} e derivabile in ${F('(a; b)')}, esiste almeno un ${F('c ∈ (a; b)')} tale che</p>${B(`f′(c) = ${fr('f(b) − f(a)', 'b − a')}`)}<p>cioè in qualche punto la tangente è parallela alla corda. <i>Esempio</i>: per ${F('f(x) = x<sup>2</sup>')} in ${F('[1; 3]')}, ${F(`${fr('9 − 1', '3 − 1')} = 4 = 2c`)}, quindi ${F('c = 2')}. Conseguenza: se ${F('f′ &gt; 0')} in un intervallo, ${F('f')} è crescente; se ${F('f′ = 0')}, è costante.</p>`)}
        ${box('teo', 'Teorema di De l\'Hôpital', `<p>Se ${F(`${fr('f(x)', 'g(x)')}`)} dà la forma ${F('0/0')} o ${F('∞/∞')}, ${F('f')} e ${F('g')} sono derivabili vicino al punto con ${F('g′ ≠ 0')} ed esiste ${F(`${lim('')} ${fr('f′(x)', 'g′(x)')}`)}, allora</p>${B(`${lim('x→x<sub>0</sub>')} ${fr('f(x)', 'g(x)')} = ${lim('x→x<sub>0</sub>')} ${fr('f′(x)', 'g′(x)')}`)}`)}
        ${box('es', 'Esempi con De l\'Hôpital', `<p>${F(`${lim('x→0')} ${fr('x − sin x', 'x<sup>3</sup>')} = ${lim('x→0')} ${fr('1 − cos x', '3x<sup>2</sup>')} = ${fr('1', '3')} · ${fr('1', '2')} = ${fr('1', '6')}`)}</p>
          <p>${F(`${lim('x→+∞')} ${fr('x<sup>2</sup>', 'e<sup>x</sup>')} = ${lim('x→+∞')} ${fr('2x', 'e<sup>x</sup>')} = ${lim('x→+∞')} ${fr('2', 'e<sup>x</sup>')} = 0`)} (la regola si può applicare più volte).</p>`)}
        ${nota('info', 'Derivata numerica', 'Al computer la derivata si approssima con le differenze finite: f′(x) ≈ [f(x + h) − f(x − h)] / (2h), con h piccolo (per esempio 10⁻⁵). Con h troppo piccolo gli errori di arrotondamento dei double crescono: è un compromesso.')}
        <h2 id="st-s6">6. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Calcola con la definizione la derivata di ${F('f(x) = 3x<sup>2</sup> − x')} in ${F('x<sub>0</sub> = 1')}. <small>[5]</small></li>
          <li>Deriva: ${F('x<sup>2</sup> ln x')}, ${F(`${fr('e<sup>x</sup>', 'x + 1')}`)}, ${F('cos(3x − 1)')}, ${F('(2x + 1)<sup>5</sup>')}.</li>
          <li>Scrivi la tangente a ${F('y = e<sup>x</sup>')} nel punto di ascissa 0. <small>[y = x + 1]</small></li>
          <li>Trova i punti della curva ${F('y = x<sup>3</sup> − 12x')} in cui la tangente è orizzontale. <small>[(−2; 16), (2; −16)]</small></li>
          <li>Verifica il teorema di Lagrange per ${F('f(x) = x<sup>3</sup>')} in ${F('[0; 3]')} e trova ${F('c')}. <small>[c = √3]</small></li>
          <li>Calcola con De l'Hôpital ${F(`${lim('x→0')} ${fr('e<sup>x</sup> − 1 − x', 'x<sup>2</sup>')}`)}. <small>[1/2]</small></li>
        </ol>` },

      // ============================ 3. STUDIO DI FUNZIONE ============================
      { id: 'studio', titolo: 'Lo studio di funzione', minuti: 24, giorni: -27, corpo: () => `
        <p class="st-intro">Lo <b>studio di funzione</b> mette insieme tutto quello che sappiamo su limiti e derivate per disegnare il grafico <i>qualitativo</i> di una funzione: dove esiste, dove è positiva, come si comporta agli estremi del dominio, dove cresce, dove ha massimi, minimi e flessi. È l'esercizio classico della seconda prova: seguite sempre lo stesso schema.</p>
        <h2 id="st-s1">1. Lo schema in otto passi</h2>
        <ol class="mt-passi">
          <li><b>Dominio</b>: denominatori ≠ 0, radicandi (indice pari) ≥ 0, argomenti dei logaritmi &gt; 0.</li>
          <li><b>Simmetrie</b>: pari se ${F('f(−x) = f(x)')} (simmetrica rispetto all'asse y), dispari se ${F('f(−x) = −f(x)')} (simmetrica rispetto all'origine). Eventuale periodicità.</li>
          <li><b>Intersezioni con gli assi</b>: ${F('x = 0')} (asse y) e ${F('f(x) = 0')} (asse x).</li>
          <li><b>Segno</b>: dove ${F('f(x) &gt; 0')}; si possono «cancellare» le zone del piano dove il grafico non passa.</li>
          <li><b>Limiti agli estremi del dominio e asintoti</b> (verticali, orizzontali, obliqui).</li>
          <li><b>Derivata prima</b>: segno di ${F('f′')} ⇒ intervalli di crescenza e decrescenza, massimi e minimi relativi, punti di non derivabilità.</li>
          <li><b>Derivata seconda</b>: segno di ${F('f″')} ⇒ concavità (verso l'alto se ${F('f″ &gt; 0')}, verso il basso se ${F('f″ &lt; 0')}) e punti di flesso.</li>
          <li><b>Grafico</b>: si riportano asintoti, punti notevoli e tabelle dei segni, poi si traccia la curva.</li></ol>
        ${box('teo', 'Criteri per massimi, minimi e flessi', `<ul>
          <li>Teorema di Fermat: se ${F('x<sub>0</sub>')} è un massimo o minimo relativo interno e ${F('f')} è derivabile, allora ${F('f′(x<sub>0</sub>) = 0')} (punto <b>stazionario</b>).</li>
          <li>Se ${F('f′')} passa da ${piu} a ${meno} in ${F('x<sub>0</sub>')} c'è un <b>massimo relativo</b>; da ${meno} a ${piu} un <b>minimo relativo</b>; se non cambia segno, un <b>flesso a tangente orizzontale</b>.</li>
          <li>Con la derivata seconda: ${F('f′(x<sub>0</sub>) = 0')} e ${F('f″(x<sub>0</sub>) &lt; 0')} ⇒ massimo; ${F('f″(x<sub>0</sub>) &gt; 0')} ⇒ minimo.</li>
          <li>Dove ${F('f″')} cambia segno (e la funzione è continua) c'è un <b>punto di flesso</b>.</li></ul>`)}
        <h2 id="st-s2">2. Esempio svolto: f(x) = x² / (x − 1)</h2>
        <p><b>1. Dominio.</b> ${F('x − 1 ≠ 0')}, quindi ${F('D = ℝ \\ {1} = (−∞; 1) ∪ (1; +∞)')}.</p>
        <p><b>2. Simmetrie.</b> ${F(`f(−x) = ${fr('x<sup>2</sup>', '−x − 1')}`)}, diversa sia da ${F('f(x)')} sia da ${F('−f(x)')}: né pari né dispari.</p>
        <p><b>3. Intersezioni.</b> ${F('f(0) = 0')} e ${F('f(x) = 0 ⇔ x = 0')}: il grafico passa solo per l'origine ${F('O(0; 0)')}.</p>
        <p><b>4. Segno.</b> Il numeratore ${F('x<sup>2</sup>')} è sempre ≥ 0, quindi il segno è quello del denominatore: ${F('f(x) &gt; 0')} per ${F('x &gt; 1')}, ${F('f(x) &lt; 0')} per ${F('x &lt; 1')} (con ${F('x ≠ 0')}).</p>
        <p><b>5. Limiti e asintoti.</b></p>
        ${B(`${lim('x→1<sup>−</sup>')} ${fr('x<sup>2</sup>', 'x − 1')} = ${fr('1', '0<sup>−</sup>')} = −∞ &nbsp;&nbsp;&nbsp; ${lim('x→1<sup>+</sup>')} ${fr('x<sup>2</sup>', 'x − 1')} = ${fr('1', '0<sup>+</sup>')} = +∞`)}
        <p>Quindi ${F('x = 1')} è asintoto verticale. Per ${F('x → ±∞')} la funzione tende a ${F('±∞')} (grado del numeratore maggiore di uno): niente asintoti orizzontali. Asintoto obliquo:</p>
        ${B(`m = ${lim('x→∞')} ${fr('x<sup>2</sup>', 'x<sup>2</sup> − x')} = 1 &nbsp;&nbsp;&nbsp; q = ${lim('x→∞')} [${fr('x<sup>2</sup>', 'x − 1')} − x] = ${lim('x→∞')} ${fr('x', 'x − 1')} = 1 &nbsp;&nbsp;⇒&nbsp;&nbsp; y = x + 1`)}
        ${nota('info', 'Una scorciatoia utile', 'Con la divisione dei polinomi x² = (x − 1)(x + 1) + 1, quindi f(x) = x + 1 + 1/(x − 1). Si vede subito l\'asintoto obliquo y = x + 1 e derivare diventa più facile.')}
        <p><b>6. Derivata prima.</b></p>
        ${B(`f′(x) = ${fr('2x(x − 1) − x<sup>2</sup>', '(x − 1)<sup>2</sup>')} = ${fr('x<sup>2</sup> − 2x', '(x − 1)<sup>2</sup>')} = ${fr('x(x − 2)', '(x − 1)<sup>2</sup>')}`)}
        <p>Il denominatore è sempre positivo nel dominio, quindi il segno di ${F('f′')} è quello di ${F('x(x − 2)')}:</p>
        ${tabella(['x', '(−∞; 0)', '0', '(0; 1)', '1', '(1; 2)', '2', '(2; +∞)'], [
          ['segno di f′', piu, '0', meno, '∄', meno, '0', piu],
          ['f(x)', '↗', '<b>max</b> 0', '↘', '∄', '↘', '<b>min</b> 4', '↗']])}
        <p>Massimo relativo in ${F('M(0; 0)')}, minimo relativo in ${F(`m(2; 4)`)}, perché ${F(`f(2) = ${fr('4', '1')} = 4`)}. Osserva che il «massimo» vale meno del «minimo»: sono estremi <i>relativi</i>, su rami diversi del grafico.</p>
        <p><b>7. Derivata seconda.</b> Da ${F(`f′(x) = 1 − ${fr('1', '(x − 1)<sup>2</sup>')}`)} si ottiene ${F(`f″(x) = ${fr('2', '(x − 1)<sup>3</sup>')}`)}, che non si annulla mai: positiva per ${F('x &gt; 1')} (concavità verso l'alto), negativa per ${F('x &lt; 1')} (verso il basso). Non ci sono flessi: la concavità cambia solo attraverso l'asintoto, dove la funzione non esiste.</p>
        <p><b>8. Grafico.</b></p>
        ${figura(grafico({ x0: -5, x1: 6, y0: -8, y1: 12, py: 2, ey: [-8, -6, -4, -2, 4, 6, 8, 10, 12], curve: [{ f: (x) => (x * x) / (x - 1), t: 'y = x² / (x − 1)', tx: 2.4, ty: 10.4 }], asintoti: [{ x: 1, t: 'x = 1', tx: 1.15, ty: -7 }, { f: (x) => x + 1, t: 'y = x + 1', tx: 4.3, ty: 3.6 }], punti: [{ x: 0, y: 0, t: 'M(0; 0)', dx: -8, dy: -10 }, { x: 2, y: 4, t: 'm(2; 4)', dx: -8, dy: 20 }] }), 'Figura 1 – Il grafico di f(x) = x²/(x − 1): asintoto verticale x = 1, asintoto obliquo y = x + 1, massimo relativo in (0; 0) e minimo relativo in (2; 4).')}
        <h2 id="st-s3">3. Secondo esempio: f(x) = x · e⁻ˣ</h2>
        <ol class="mt-passi">
          <li>Dominio ${F('ℝ')}; né pari né dispari; passa per l'origine; ${F('f(x) &gt; 0 ⇔ x &gt; 0')} (perché ${F('e<sup>−x</sup> &gt; 0')}).</li>
          <li>${F(`${lim('x→+∞')} ${fr('x', 'e<sup>x</sup>')} = 0`)} (gerarchia degli infiniti): ${F('y = 0')} è asintoto orizzontale a destra. ${F(`${lim('x→−∞')} x e<sup>−x</sup> = −∞`)} e ${F(`${lim('x→−∞')} ${fr('f(x)', 'x')} = ${lim('x→−∞')} e<sup>−x</sup> = +∞`)}: nessun asintoto obliquo a sinistra.</li>
          <li>${F('f′(x) = e<sup>−x</sup> − x e<sup>−x</sup> = e<sup>−x</sup>(1 − x)')}: cresce per ${F('x &lt; 1')}, decresce per ${F('x &gt; 1')}. <b>Massimo assoluto</b> in ${F(`(1; ${fr('1', 'e')}) ≈ (1; 0,37)`)}.</li>
          <li>${F('f″(x) = −e<sup>−x</sup>(1 − x) − e<sup>−x</sup> = e<sup>−x</sup>(x − 2)')}: concava verso il basso per ${F('x &lt; 2')}, verso l'alto per ${F('x &gt; 2')}. <b>Flesso</b> in ${F(`(2; ${fr('2', 'e<sup>2</sup>')}) ≈ (2; 0,27)`)}.</li></ol>
        ${figura(grafico({ x0: -1, x1: 7, y0: -1.2, y1: 0.6, py: 0.2, ey: [-1, -0.6, -0.2, 0.2, 0.4], h: 280, curve: [{ f: (x) => x * Math.exp(-x), t: 'y = x·e⁻ˣ', tx: 4.2, ty: 0.25 }], punti: [{ x: 1, y: Math.exp(-1), t: 'max', dx: -6, dy: -10 }, { x: 2, y: 2 * Math.exp(-2), t: 'flesso', dx: 8, dy: -8, col: '#6a4fb3' }] }), 'Figura 2 – f(x) = x·e⁻ˣ: massimo in (1; 1/e), flesso in (2; 2/e²), asintoto orizzontale y = 0 per x → +∞.')}
        <h2 id="st-s4">4. Problemi di massimo e minimo</h2>
        <p>Molti problemi pratici chiedono di <b>ottimizzare</b> una grandezza: si scrive la funzione da massimizzare o minimizzare in una sola variabile, si trova il dominio imposto dal problema e si studia il segno della derivata.</p>
        ${box('es', 'Esempio — la scatola di volume massimo', `<p>Da un cartoncino quadrato di lato 30 cm si tagliano quattro quadratini di lato ${F('x')} agli angoli e si piegano i bordi. Per quale ${F('x')} il volume è massimo?</p>
          <ol class="mt-passi"><li>Volume: ${F('V(x) = x(30 − 2x)<sup>2</sup>')}, con ${F('0 &lt; x &lt; 15')}.</li>
          <li>${F('V′(x) = (30 − 2x)<sup>2</sup> − 4x(30 − 2x) = (30 − 2x)(30 − 6x)')}.</li>
          <li>Nel dominio ${F('V′ = 0')} solo per ${F('x = 5')}; ${F('V′ &gt; 0')} per ${F('x &lt; 5')} e ${F('V′ &lt; 0')} per ${F('5 &lt; x &lt; 15')}: è un massimo.</li>
          <li>${F('V(5) = 5 · 20<sup>2</sup> = 2000 cm<sup>3</sup>')}.</li></ol>`)}
        <h2 id="st-s5">5. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Studia ${F(`f(x) = ${fr('x', 'x<sup>2</sup> + 1')}`)} e disegnane il grafico. <small>[dispari; max (1; 1/2), min (−1; −1/2); asintoto y = 0]</small></li>
          <li>Studia ${F('f(x) = x<sup>3</sup> − 3x<sup>2</sup>')}: massimi, minimi e flessi. <small>[max (0; 0), min (2; −4), flesso (1; −2)]</small></li>
          <li>Studia ${F(`f(x) = ${fr('x<sup>2</sup> − 4', 'x<sup>2</sup> − 1')}`)}. <small>[pari; asintoti x = ±1 e y = 1]</small></li>
          <li>Studia ${F('f(x) = ln(x<sup>2</sup> + 1)')}, trovando i flessi. <small>[flessi in x = ±1]</small></li>
          <li>Tra i rettangoli di perimetro 40 cm trova quello di area massima. <small>[il quadrato di lato 10 cm]</small></li>
        </ol>` },

      // ============================ 4. INTEGRALI INDEFINITI ============================
      { id: 'indefiniti', titolo: 'Integrali indefiniti', minuti: 20, giorni: -21, corpo: () => `
        <p class="st-intro">Integrare significa fare il cammino inverso della derivazione: data una funzione ${F('f(x)')}, cerchiamo le funzioni che hanno ${F('f(x)')} come derivata. In questa lezione vediamo le primitive, gli integrali immediati e i tre metodi principali: <b>sostituzione</b>, <b>integrazione per parti</b> e scomposizione delle <b>funzioni razionali fratte</b>.</p>
        <h2 id="st-s1">1. Primitive e integrale indefinito</h2>
        ${box('def', 'Definizione', `<p>Una funzione ${F('F(x)')} è una <b>primitiva</b> di ${F('f(x)')} in un intervallo se ${F('F′(x) = f(x)')} per ogni ${F('x')} dell'intervallo. L'<b>integrale indefinito</b> è l'insieme di tutte le primitive:</p>${B('∫ f(x) dx = F(x) + c, &nbsp;&nbsp; c ∈ ℝ')}`)}
        <p>Due primitive della stessa funzione in un intervallo differiscono per una <b>costante</b> (conseguenza del teorema di Lagrange: una funzione con derivata nulla è costante). Per esempio ${F('x<sup>2</sup>')}, ${F('x<sup>2</sup> + 5')} e ${F('x<sup>2</sup> − π')} sono tutte primitive di ${F('2x')}. Ogni funzione continua in un intervallo ha una primitiva.</p>
        <p>L'integrale è <b>lineare</b>: ${F('∫ [a f(x) + b g(x)] dx = a ∫ f(x) dx + b ∫ g(x) dx')}. Per controllare un risultato basta <b>derivarlo</b>: si deve ritrovare la funzione integranda.</p>
        <h2 id="st-s2">2. Integrali immediati</h2>
        ${tabella(['Integrale', 'Risultato', 'Forma generalizzata'], [
          [F('∫ x<sup>n</sup> dx') + ' (n ≠ −1)', F(`${fr('x<sup>n+1</sup>', 'n + 1')} + c`), F(`∫ [f(x)]<sup>n</sup> f′(x) dx = ${fr('[f(x)]<sup>n+1</sup>', 'n + 1')} + c`)],
          [F(`∫ ${fr('1', 'x')} dx`), F('ln |x| + c'), F(`∫ ${fr('f′(x)', 'f(x)')} dx = ln |f(x)| + c`)],
          [F('∫ e<sup>x</sup> dx'), F('e<sup>x</sup> + c'), F('∫ e<sup>f(x)</sup> f′(x) dx = e<sup>f(x)</sup> + c')],
          [F('∫ a<sup>x</sup> dx'), F(`${fr('a<sup>x</sup>', 'ln a')} + c`), ''],
          [F('∫ sin x dx'), F('−cos x + c'), F('∫ sin f(x) · f′(x) dx = −cos f(x) + c')],
          [F('∫ cos x dx'), F('sin x + c'), F('∫ cos f(x) · f′(x) dx = sin f(x) + c')],
          [F(`∫ ${fr('1', 'cos<sup>2</sup>x')} dx`), F('tan x + c'), ''],
          [F(`∫ ${fr('1', '1 + x<sup>2</sup>')} dx`), F('arctan x + c'), F(`∫ ${fr('1', 'a<sup>2</sup> + x<sup>2</sup>')} dx = ${fr('1', 'a')} arctan ${fr('x', 'a')} + c`)],
          [F(`∫ ${fr('1', rad('1 − x<sup>2</sup>'))} dx`), F('arcsin x + c'), '']])}
        ${box('es', 'Esempi', `<ol class="mt-passi">
          <li>${F('∫ (3x<sup>2</sup> − 4x + 5) dx = x<sup>3</sup> − 2x<sup>2</sup> + 5x + c')}</li>
          <li>${F(`∫ ${rad('x')} dx = ∫ x<sup>1/2</sup> dx = ${fr('x<sup>3/2</sup>', '3/2')} + c = ${fr('2', '3')} x${rad('x')} + c`)}</li>
          <li>${F(`∫ ${fr('1', 'x<sup>3</sup>')} dx = ∫ x<sup>−3</sup> dx = ${fr('x<sup>−2</sup>', '−2')} + c = −${fr('1', '2x<sup>2</sup>')} + c`)}</li>
          <li>${F(`∫ ${fr('2x', 'x<sup>2</sup> + 1')} dx = ln(x<sup>2</sup> + 1) + c`)} (al numeratore c'è la derivata del denominatore).</li>
          <li>${F(`∫ e<sup>3x</sup> dx = ${fr('1', '3')} ∫ 3e<sup>3x</sup> dx = ${fr('e<sup>3x</sup>', '3')} + c`)}</li></ol>`)}
        <h2 id="st-s3">3. Integrazione per sostituzione</h2>
        ${box('teo', 'Metodo', `<p>Se si pone ${F('t = g(x)')}, allora ${F('dt = g′(x) dx')} e</p>${B('∫ f(g(x)) · g′(x) dx = ∫ f(t) dt')}<p>Si calcola l'integrale in ${F('t')} e alla fine si torna alla variabile ${F('x')}.</p>`)}
        ${box('es', 'Esempio 1 — ∫ x cos(x²) dx', `<ol class="mt-passi"><li>Poniamo ${F('t = x<sup>2</sup>')}: ${F('dt = 2x dx')}, quindi ${F(`x dx = ${fr('dt', '2')}`)}.</li>
          <li>${F(`∫ x cos(x<sup>2</sup>) dx = ${fr('1', '2')} ∫ cos t dt = ${fr('1', '2')} sin t + c`)}</li>
          <li>Torniamo a ${F('x')}: ${F(`${fr('1', '2')} sin(x<sup>2</sup>) + c`)}. Verifica: ${F(`D[${fr('1', '2')} sin(x<sup>2</sup>)] = ${fr('1', '2')} cos(x<sup>2</sup>) · 2x`)} ✓</li></ol>`)}
        ${box('es', 'Esempio 2 — ∫ x √(x + 1) dx', `<ol class="mt-passi"><li>Poniamo ${F('t = x + 1')}: ${F('x = t − 1')}, ${F('dx = dt')}.</li>
          <li>${F('∫ (t − 1)√t dt = ∫ (t<sup>3/2</sup> − t<sup>1/2</sup>) dt = ' + `${fr('2', '5')} t<sup>5/2</sup> − ${fr('2', '3')} t<sup>3/2</sup> + c`)}</li>
          <li>Risultato: ${F(`${fr('2', '5')}(x + 1)<sup>5/2</sup> − ${fr('2', '3')}(x + 1)<sup>3/2</sup> + c`)}</li></ol>`)}
        <h2 id="st-s4">4. Integrazione per parti</h2>
        ${box('teo', 'Formula di integrazione per parti', `${B('∫ f(x) · g′(x) dx = f(x) · g(x) − ∫ f′(x) · g(x) dx')}<p>Si ricava dalla regola di derivazione del prodotto. ${F('f(x)')} è il <b>fattore finito</b> (da derivare), ${F('g′(x) dx')} il <b>fattore differenziale</b> (da integrare). Conviene derivare il fattore che si «semplifica»: in genere polinomi, logaritmi e funzioni inverse (arctan, arcsin).</p>`)}
        ${box('es', 'Esempio 1 — ∫ x eˣ dx', `<p>${F('f(x) = x')} ⇒ ${F('f′(x) = 1')}; ${F('g′(x) = e<sup>x</sup>')} ⇒ ${F('g(x) = e<sup>x</sup>')}.</p>${B('∫ x e<sup>x</sup> dx = x e<sup>x</sup> − ∫ 1 · e<sup>x</sup> dx = x e<sup>x</sup> − e<sup>x</sup> + c = e<sup>x</sup>(x − 1) + c')}`)}
        ${box('es', 'Esempio 2 — ∫ ln x dx', `<p>Si scrive ${F('ln x = ln x · 1')}: ${F('f(x) = ln x')}, ${F('g′(x) = 1')}, ${F('g(x) = x')}.</p>${B(`∫ ln x dx = x ln x − ∫ x · ${fr('1', 'x')} dx = x ln x − x + c`)}`)}
        ${box('es', 'Esempio 3 — ∫ x sin x dx', `${B('∫ x sin x dx = −x cos x − ∫ 1 · (−cos x) dx = −x cos x + sin x + c')}`)}
        ${box('es', 'Esempio 4 — integrale «ciclico» ∫ eˣ sin x dx', `<p>Applicando due volte le parti (con ${F('e<sup>x</sup>')} sempre come fattore differenziale) si ritorna all'integrale di partenza ${F('J')}:</p>${B('J = e<sup>x</sup> sin x − ∫ e<sup>x</sup> cos x dx = e<sup>x</sup> sin x − [e<sup>x</sup> cos x + J]')}<p>Quindi ${F('2J = e<sup>x</sup>(sin x − cos x)')} e ${F(`J = ${fr('e<sup>x</sup>(sin x − cos x)', '2')} + c`)}.</p>`)}
        <h2 id="st-s5">5. Funzioni razionali fratte</h2>
        <p>Per ${F(`∫ ${fr('N(x)', 'D(x)')} dx`)}: se il grado di ${F('N')} è ≥ di quello di ${F('D')} si fa prima la divisione. Con un denominatore di secondo grado si guarda il discriminante: se ${F('Δ &gt; 0')} si scompone in <b>fratti semplici</b>; se ${F('Δ = 0')} si ha un quadrato; se ${F('Δ &lt; 0')} compare l'arcotangente.</p>
        ${box('es', 'Esempio — ∫ (x + 5)/(x² + x − 2) dx', `<ol class="mt-passi">
          <li>${F('x<sup>2</sup> + x − 2 = (x − 1)(x + 2)')}, quindi cerchiamo ${F(`${fr('x + 5', '(x − 1)(x + 2)')} = ${fr('A', 'x − 1')} + ${fr('B', 'x + 2')}`)}.</li>
          <li>${F('x + 5 = A(x + 2) + B(x − 1)')}. Con ${F('x = 1')}: ${F('6 = 3A')}, ${F('A = 2')}. Con ${F('x = −2')}: ${F('3 = −3B')}, ${F('B = −1')}.</li>
          <li>${F(`∫ [${fr('2', 'x − 1')} − ${fr('1', 'x + 2')}] dx = 2 ln |x − 1| − ln |x + 2| + c`)}</li></ol>`)}
        ${nota('avviso', 'Errori frequenti', 'Dimenticare la costante c; scrivere ∫ 1/x dx = ln x senza il valore assoluto; pensare che l\'integrale di un prodotto sia il prodotto degli integrali (falso!); dimenticare di cambiare dx quando si fa una sostituzione.')}
        <h2 id="st-s6">6. Esercizi</h2>
        <ol class="st-esercizi">
          <li>${F(`∫ (x<sup>4</sup> − ${fr('2', 'x')} + 3e<sup>x</sup>) dx`)} <small>[x⁵/5 − 2 ln|x| + 3eˣ + c]</small></li>
          <li>${F('∫ (2x + 1)<sup>4</sup> dx')} <small>[(2x + 1)⁵/10 + c]</small></li>
          <li>${F(`∫ ${fr('cos x', 'sin x')} dx`)} <small>[ln|sin x| + c]</small></li>
          <li>${F('∫ x e<sup>x<sup>2</sup></sup> dx')} <small>[e^(x²)/2 + c]</small></li>
          <li>${F('∫ x<sup>2</sup> e<sup>x</sup> dx')} <small>[eˣ(x² − 2x + 2) + c]</small></li>
          <li>${F('∫ x ln x dx')} <small>[x²/2 · ln x − x²/4 + c]</small></li>
          <li>${F(`∫ ${fr('1', 'x<sup>2</sup> − 4')} dx`)} <small>[1/4 · ln|(x − 2)/(x + 2)| + c]</small></li>
          <li>Trova la primitiva di ${F('f(x) = 6x − 2')} il cui grafico passa per ${F('(1; 4)')}. <small>[F(x) = 3x² − 2x + 3]</small></li>
        </ol>` },

      // ============================ 5. INTEGRALI DEFINITI ============================
      { id: 'definiti', titolo: 'Integrali definiti e calcolo di aree', minuti: 22, giorni: -15, corpo: () => {
        const rett = []; for (let i = 0; i < 8; i++) rett.push({ x: i * 0.5, w: 0.5, h: 1 + 0.25 * (i * 0.5) ** 2 });
        return `
        <p class="st-intro">L'<b>integrale definito</b> nasce da un problema geometrico: calcolare l'area di una figura delimitata da una curva. Il <b>teorema fondamentale del calcolo integrale</b> lo collega alle primitive e ci permette di calcolarlo senza somme infinite. Vediamo la definizione, le proprietà, il calcolo di aree (anche tra due curve), i volumi e l'integrazione numerica.</p>
        <h2 id="st-s1">1. Dall'area alle somme di Riemann</h2>
        <p>Sia ${F('f')} continua e positiva in ${F('[a; b]')}. Vogliamo l'area del <b>trapezoide</b>, la regione compresa tra il grafico, l'asse ${F('x')} e le rette ${F('x = a')} e ${F('x = b')}. Dividiamo ${F('[a; b]')} in ${F('n')} parti di ampiezza ${F(`Δx = ${fr('b − a', 'n')}`)}, scegliamo in ciascuna un punto ${F('ξ<sub>i</sub>')} e sommiamo le aree dei rettangoli:</p>
        ${B(`S<sub>n</sub> = ∑<sub>i=1</sub><sup>n</sup> f(ξ<sub>i</sub>) Δx &nbsp;&nbsp;&nbsp;&nbsp; ${I('a', 'b')} f(x) dx = ${lim('n→+∞')} S<sub>n</sub>`)}
        ${figura(grafico({ x0: -0.5, x1: 4.6, y0: -0.6, y1: 5.4, px: 0.5, ex: [1, 2, 3, 4], h: 290, rett, curve: [{ f: (x) => 1 + 0.25 * x * x, t: 'y = 1 + x²/4', tx: 1.2, ty: 4.4 }] }), 'Figura 1 – Somma di Riemann con 8 rettangoli (altezza presa nell\'estremo sinistro): S₈ = 8,375, mentre l\'area esatta è 28/3 ≈ 9,333. Aumentando n la somma si avvicina all\'area.')}
        ${box('def', 'Definizione (integrale definito)', `<p>Se il limite delle somme ${F('S<sub>n</sub>')} esiste finito e non dipende dalla scelta dei punti ${F('ξ<sub>i</sub>')}, ${F('f')} si dice <b>integrabile</b> in ${F('[a; b]')} e il limite si indica con ${F(`${I('a', 'b')} f(x) dx`)}. Ogni funzione continua in ${F('[a; b]')} è integrabile.</p>`)}
        <h2 id="st-s2">2. Proprietà</h2>
        ${tabella(['Proprietà', 'Formula'], [
          ['Linearità', F(`${I('a', 'b')} [αf + βg] dx = α ${I('a', 'b')} f dx + β ${I('a', 'b')} g dx`)],
          ['Additività rispetto all\'intervallo', F(`${I('a', 'b')} f dx = ${I('a', 'c')} f dx + ${I('c', 'b')} f dx`)],
          ['Estremi uguali o scambiati', F(`${I('a', 'a')} f dx = 0, &nbsp; ${I('b', 'a')} f dx = −${I('a', 'b')} f dx`)],
          ['Confronto', 'se ' + F('f ≤ g') + ' in [a; b], allora ' + F(`${I('a', 'b')} f dx ≤ ${I('a', 'b')} g dx`)]])}
        ${box('teo', 'Teorema della media integrale', `<p>Se ${F('f')} è continua in ${F('[a; b]')}, esiste ${F('c ∈ [a; b]')} tale che ${F(`${I('a', 'b')} f(x) dx = (b − a) · f(c)`)}. Il numero ${F(`${fr('1', 'b − a')} ${I('a', 'b')} f(x) dx`)} è il <b>valor medio</b> di ${F('f')} nell'intervallo.</p>`)}
        <h2 id="st-s3">3. Il teorema fondamentale del calcolo integrale</h2>
        ${box('teo', 'Teorema fondamentale (Torricelli–Barrow)', `<p>Se ${F('f')} è continua in ${F('[a; b]')}, la <b>funzione integrale</b> ${F(`F(x) = ${I('a', 'x')} f(t) dt`)} è derivabile e ${F('F′(x) = f(x)')} per ogni ${F('x ∈ [a; b]')}: è una primitiva di ${F('f')}.</p>
          <p><b>Conseguenza (formula di Newton–Leibniz)</b>: se ${F('G')} è una qualsiasi primitiva di ${F('f')},</p>${B(`${I('a', 'b')} f(x) dx = [G(x)]<sub>a</sub><sup>b</sup> = G(b) − G(a)`)}`)}
        ${box('es', 'Esempi', `<ol class="mt-passi">
          <li>${F(`${I('0', '2')} (3x<sup>2</sup> + 1) dx = [x<sup>3</sup> + x]<sub>0</sub><sup>2</sup> = (8 + 2) − 0 = 10`)}</li>
          <li>${F(`${I('0', 'π')} sin x dx = [−cos x]<sub>0</sub><sup>π</sup> = −cos π + cos 0 = 1 + 1 = 2`)}</li>
          <li>${F(`${I('1', 'e')} ${fr('1', 'x')} dx = [ln x]<sub>1</sub><sup>e</sup> = 1 − 0 = 1`)}</li>
          <li>${F(`${I('0', '1')} x e<sup>x</sup> dx = [e<sup>x</sup>(x − 1)]<sub>0</sub><sup>1</sup> = 0 − (−1) = 1`)} (primitiva trovata per parti).</li>
          <li>${F(`${I('0', '4')} (1 + ${fr('x<sup>2</sup>', '4')}) dx = [x + ${fr('x<sup>3</sup>', '12')}]<sub>0</sub><sup>4</sup> = 4 + ${fr('64', '12')} = ${fr('28', '3')}`)}: è l'area della figura 1.</li></ol>`)}
        <h2 id="st-s4">4. Il calcolo delle aree</h2>
        <p>Se ${F('f ≥ 0')} l'integrale è l'area del trapezoide. Se ${F('f ≤ 0')} l'integrale è <b>negativo</b>: l'area è il suo valore assoluto. Se ${F('f')} cambia segno bisogna <b>spezzare</b> l'intervallo negli zeri della funzione.</p>
        ${box('es', 'Esempio — area tra y = x² − 2x e l\'asse x in [0; 3]', `<ol class="mt-passi">
          <li>Zeri: ${F('x<sup>2</sup> − 2x = 0 ⇔ x = 0 ∨ x = 2')}. La funzione è negativa in ${F('(0; 2)')} e positiva in ${F('(2; 3)')}.</li>
          <li>${F(`${I('0', '2')} (x<sup>2</sup> − 2x) dx = [${fr('x<sup>3</sup>', '3')} − x<sup>2</sup>]<sub>0</sub><sup>2</sup> = ${fr('8', '3')} − 4 = −${fr('4', '3')}`)}</li>
          <li>${F(`${I('2', '3')} (x<sup>2</sup> − 2x) dx = (9 − 9) − (${fr('8', '3')} − 4) = ${fr('4', '3')}`)}</li>
          <li>Area ${F(`= ${fr('4', '3')} + ${fr('4', '3')} = ${fr('8', '3')}`)}. Invece ${F(`${I('0', '3')} (x<sup>2</sup> − 2x) dx = 0`)}: le due parti si compensano!</li></ol>`)}
        ${box('teo', 'Area tra due curve', `<p>Se ${F('f(x) ≥ g(x)')} in ${F('[a; b]')}, l'area della regione compresa tra i due grafici è</p>${B(`A = ${I('a', 'b')} [f(x) − g(x)] dx`)}<p>(funzione «sopra» meno funzione «sotto»; vale anche se le curve stanno sotto l'asse x). Gli estremi sono spesso le ascisse dei punti di intersezione.</p>`)}
        ${box('es', 'Esempio — area tra y = 4 − x² e y = x + 2', `<ol class="mt-passi">
          <li>Intersezioni: ${F('4 − x<sup>2</sup> = x + 2 ⇔ x<sup>2</sup> + x − 2 = 0 ⇔ x = −2 ∨ x = 1')}.</li>
          <li>In ${F('[−2; 1]')} la parabola sta sopra la retta (per esempio in 0: ${F('4 &gt; 2')}).</li>
          <li>${F(`A = ${I('−2', '1')} (4 − x<sup>2</sup> − x − 2) dx = ${I('−2', '1')} (2 − x − x<sup>2</sup>) dx = [2x − ${fr('x<sup>2</sup>', '2')} − ${fr('x<sup>3</sup>', '3')}]<sub>−2</sub><sup>1</sup>`)}</li>
          <li>${F(`= (2 − ${fr('1', '2')} − ${fr('1', '3')}) − (−4 − 2 + ${fr('8', '3')}) = ${fr('7', '6')} + ${fr('10', '3')} = ${fr('27', '6')} = ${fr('9', '2')}`)}</li></ol>`)}
        ${figura(grafico({ x0: -3.5, x1: 3, y0: -3, y1: 5.5, aree: [{ f: (x) => 4 - x * x, g: (x) => x + 2, a: -2, b: 1 }], curve: [{ f: (x) => 4 - x * x, t: 'y = 4 − x²', tx: 1.9, ty: 1.5 }, { f: (x) => x + 2, col: '#c5483c', t: 'y = x + 2', tx: 1.6, ty: 4.9 }], punti: [{ x: -2, y: 0, t: '(−2; 0)', dx: -8, dy: -10 }, { x: 1, y: 3, t: '(1; 3)', dx: 10, dy: 4 }] }), 'Figura 2 – La regione compresa tra la parabola y = 4 − x² e la retta y = x + 2: la sua area è 9/2.')}
        <h2 id="st-s5">5. Volumi e integrali impropri</h2>
        <p>Facendo ruotare di un giro completo attorno all'asse x il trapezoide di ${F('f')} in ${F('[a; b]')} si ottiene un <b>solido di rotazione</b> di volume ${F(`V = π ${I('a', 'b')} [f(x)]<sup>2</sup> dx`)}. Per esempio con ${F(`f(x) = ${rad('x')}`)} in ${F('[0; 4]')}: ${F(`V = π ${I('0', '4')} x dx = π [${fr('x<sup>2</sup>', '2')}]<sub>0</sub><sup>4</sup> = 8π`)}.</p>
        <p>Se un estremo è infinito (o la funzione è illimitata) si parla di <b>integrale improprio</b>, definito come limite: ${F(`${I('1', '+∞')} ${fr('1', 'x<sup>2</sup>')} dx = ${lim('k→+∞')} [−${fr('1', 'x')}]<sub>1</sub><sup>k</sup> = ${lim('k→+∞')} (1 − ${fr('1', 'k')}) = 1`)} (converge), mentre ${F(`${I('1', '+∞')} ${fr('1', 'x')} dx = ${lim('k→+∞')} ln k = +∞`)} (diverge).</p>
        <h2 id="st-s6">6. Integrazione numerica</h2>
        <p>Quando una primitiva non si trova (per esempio per ${F('e<sup>−x<sup>2</sup></sup>')}) l'integrale si approssima al computer. Il <b>metodo dei trapezi</b> sostituisce la curva con una spezzata: con ${F(`h = ${fr('b − a', 'n')}`)} e ${F('x<sub>i</sub> = a + ih')}</p>
        ${B(`${I('a', 'b')} f(x) dx ≈ h [ ${fr('f(a) + f(b)', '2')} + ∑<sub>i=1</sub><sup>n−1</sup> f(x<sub>i</sub>) ]`)}
        ${ide('Trapezi.java', 'java', String.raw`
public class Trapezi {
    static double f(double x) { return 4.0 / (1 + x * x); }   // l'integrale tra 0 e 1 vale π

    static double trapezi(double a, double b, int n) {
        double h = (b - a) / n;
        double s = (f(a) + f(b)) / 2;
        for (int i = 1; i < n; i++) s += f(a + i * h);
        return s * h;
    }

    public static void main(String[] args) {
        for (int n = 4; n <= 1024; n *= 4)
            System.out.printf("n = %4d   I = %.10f%n", n, trapezi(0, 1, n));
        System.out.println("pi       = " + Math.PI);
    }
}`, 'Figura 3 – Il metodo dei trapezi in Java applicato a ∫₀¹ 4/(1 + x²) dx = 4 arctan 1 = π.')}
        ${terminale('Terminale', 'studente@lab4:~/matematica$ javac Trapezi.java && java Trapezi\nn =    4   I = 3,1311764706\nn =   16   I = 3,1409416120\nn =   64   I = 3,1415519635\nn =  256   I = 3,1415901105\nn = 1024   I = 3,1415924946\npi       = 3.141592653589793\nstudente@lab4:~/matematica$ ', 'Figura 4 – Moltiplicando n per 4 l\'errore si riduce di circa 16 volte: l\'errore del metodo dei trapezi è proporzionale a h². (printf usa la virgola perché la JVM è impostata in italiano.)')}
        <h2 id="st-s7">7. Esercizi</h2>
        <ol class="st-esercizi">
          <li>${F(`${I('1', '3')} (2x − 1) dx`)} <small>[6]</small></li>
          <li>${F(`${I('0', 'π/2')} cos x dx`)} <small>[1]</small></li>
          <li>${F(`${I('0', '1')} ${fr('2x', 'x<sup>2</sup> + 1')} dx`)} <small>[ln 2]</small></li>
          <li>Calcola l'area compresa tra ${F('y = x<sup>2</sup>')} e ${F('y = x')}. <small>[1/6]</small></li>
          <li>Calcola l'area della regione limitata da ${F('y = x<sup>3</sup>')}, dall'asse x e dalle rette ${F('x = −1')} e ${F('x = 2')}. <small>[17/4]</small></li>
          <li>Trova il valor medio di ${F('f(x) = x<sup>2</sup>')} in ${F('[0; 3]')} e il punto ${F('c')} del teorema della media. <small>[3; c = √3]</small></li>
          <li>Calcola la derivata di ${F(`F(x) = ${I('0', 'x')} e<sup>−t<sup>2</sup></sup> dt`)}. <small>[F′(x) = e^(−x²)]</small></li>
        </ol>`; } },

      // ============================ 6. EQUAZIONI DIFFERENZIALI ============================
      { id: 'differenziali', titolo: 'Equazioni differenziali del primo ordine', minuti: 20, giorni: -9, corpo: () => `
        <p class="st-intro">Un'<b>equazione differenziale</b> lega una funzione incognita ${F('y(x)')} alle sue derivate. Sono il linguaggio con cui si descrivono i fenomeni che cambiano nel tempo: la carica di un condensatore, il raffreddamento di un oggetto, la crescita di una popolazione, il decadimento radioattivo. In questa lezione risolviamo i due tipi principali del primo ordine: a <b>variabili separabili</b> e <b>lineari</b>.</p>
        <h2 id="st-s1">1. Definizioni</h2>
        ${box('def', 'Definizioni', `<ul>
          <li>Un'equazione differenziale è <b>del primo ordine</b> se contiene al massimo la derivata prima: ${F('F(x, y, y′) = 0')}, spesso nella forma normale ${F('y′ = f(x, y)')}.</li>
          <li>Una <b>soluzione</b> (o integrale) è una funzione derivabile che, sostituita, rende vera l'equazione.</li>
          <li>L'<b>integrale generale</b> è la famiglia di tutte le soluzioni e dipende da una costante arbitraria ${F('c')}; fissando ${F('c')} si ottiene un <b>integrale particolare</b>.</li>
          <li>Il <b>problema di Cauchy</b> chiede la soluzione che soddisfa una condizione iniziale ${F('y(x<sub>0</sub>) = y<sub>0</sub>')}. Se ${F('f')} è sufficientemente regolare, la soluzione esiste ed è unica.</li></ul>`)}
        ${box('es', 'Esempio', `<p>${F('y′ = 2x')} ha integrale generale ${F('y = x<sup>2</sup> + c')} (le primitive di ${F('2x')}). Con la condizione ${F('y(1) = 5')}: ${F('1 + c = 5')}, ${F('c = 4')}, quindi ${F('y = x<sup>2</sup> + 4')}. Per verificare una soluzione basta sostituirla: per esempio ${F('y = e<sup>3x</sup>')} risolve ${F('y′ = 3y')}, perché ${F('y′ = 3e<sup>3x</sup> = 3y')}.</p>`)}
        <h2 id="st-s2">2. Equazioni a variabili separabili</h2>
        ${box('teo', 'Metodo', `<p>Sono le equazioni del tipo ${F('y′ = g(x) · h(y)')}.</p><ol class="mt-passi">
          <li>Si cercano le soluzioni <b>costanti</b>: se ${F('h(k) = 0')}, allora ${F('y = k')} è una soluzione.</li>
          <li>Per ${F('h(y) ≠ 0')} si separano le variabili: ${F(`${fr('dy', 'h(y)')} = g(x) dx`)}.</li>
          <li>Si integrano entrambi i membri: ${F(`∫ ${fr('dy', 'h(y)')} = ∫ g(x) dx + c`)}, e se possibile si ricava ${F('y')}.</li></ol>`)}
        ${box('es', 'Esempio 1 — y′ = x y, con y(0) = 3', `<ol class="mt-passi">
          <li>${F('y = 0')} è soluzione costante. Per ${F('y ≠ 0')}: ${F(`${fr('dy', 'y')} = x dx`)}.</li>
          <li>${F(`ln |y| = ${fr('x<sup>2</sup>', '2')} + c`)} ⇒ ${F('|y| = e<sup>c</sup> e<sup>x<sup>2</sup>/2</sup>')} ⇒ ${F('y = K e<sup>x<sup>2</sup>/2</sup>')} con ${F('K ∈ ℝ')} (K = 0 comprende la soluzione nulla).</li>
          <li>Condizione iniziale: ${F('y(0) = K = 3')}. Soluzione: ${F('y = 3e<sup>x<sup>2</sup>/2</sup>')}.</li></ol>`)}
        ${box('es', 'Esempio 2 — y′ = x / y, con y(0) = 2', `<ol class="mt-passi">
          <li>${F('y dy = x dx')} ⇒ ${F(`${fr('y<sup>2</sup>', '2')} = ${fr('x<sup>2</sup>', '2')} + c`)} ⇒ ${F('y<sup>2</sup> = x<sup>2</sup> + C')}.</li>
          <li>Con ${F('y(0) = 2')}: ${F('C = 4')}. Poiché ${F('y(0) &gt; 0')} scegliamo la radice positiva: ${F(`y = ${rad('x<sup>2</sup> + 4')}`)}.</li></ol>`)}
        ${box('es', 'Esempio 3 — decadimento radioattivo N′ = −kN', `<p>Separando: ${F('N(t) = N<sub>0</sub> e<sup>−kt</sup>')}, dove ${F('N<sub>0</sub>')} è la quantità iniziale. Il <b>tempo di dimezzamento</b> si trova da ${F(`N<sub>0</sub> e<sup>−kT</sup> = ${fr('N<sub>0</sub>', '2')}`)}: ${F(`T = ${fr('ln 2', 'k')}`)}. Con ${F('k = 0,1')} giorni<sup>−1</sup>, ${F('T ≈ 6,93')} giorni. Con il segno + (${F('N′ = kN')}) si ha la <b>crescita esponenziale</b>.</p>`)}
        <h2 id="st-s3">3. Equazioni lineari del primo ordine</h2>
        ${box('teo', 'Formula risolutiva', `<p>Un'equazione lineare ha la forma ${F('y′ + a(x) y = b(x)')}, con ${F('a')} e ${F('b')} continue. Se ${F('A(x)')} è una primitiva di ${F('a(x)')}, l'integrale generale è</p>${B('y = e<sup>−A(x)</sup> [ ∫ b(x) e<sup>A(x)</sup> dx + c ]')}<p>Se ${F('b(x) = 0')} l'equazione è <b>omogenea</b> e la soluzione è semplicemente ${F('y = c e<sup>−A(x)</sup>')}.</p>`)}
        ${box('es', 'Esempio 1 — y′ + 2y = 4, con y(0) = 5', `<ol class="mt-passi">
          <li>${F('a(x) = 2')} ⇒ ${F('A(x) = 2x')}; ${F('b(x) = 4')}.</li>
          <li>${F(`∫ 4 e<sup>2x</sup> dx = 2e<sup>2x</sup>`)} ⇒ ${F('y = e<sup>−2x</sup>(2e<sup>2x</sup> + c) = 2 + c e<sup>−2x</sup>')}.</li>
          <li>${F('y(0) = 2 + c = 5')} ⇒ ${F('c = 3')}: ${F('y = 2 + 3e<sup>−2x</sup>')}.</li>
          <li>Per ${F('x → +∞')} tutte le soluzioni tendono a 2: è la soluzione di <b>regime</b> (figura 1).</li></ol>`)}
        ${figura(grafico({ x0: -0.3, x1: 3, y0: -0.8, y1: 5.6, px: 0.5, ex: [0.5, 1, 1.5, 2, 2.5], h: 290, asintoti: [{ y: 2 }], curve: [
          { f: (x) => 2 + 3 * Math.exp(-2 * x), da: 0, t: 'c = 3', tx: 0.2, ty: 4.3 },
          { f: (x) => 2 + Math.exp(-2 * x), da: 0, col: '#3f9b6b', t: 'c = 1', tx: 0.04, ty: 3.12 },
          { f: () => 2, da: 0, col: '#6a4fb3', sw: 2, t: 'c = 0', tx: 2.3, ty: 2.25 },
          { f: (x) => 2 - 2 * Math.exp(-2 * x), da: 0, col: '#c5483c', t: 'c = −2', tx: 0.5, ty: 0.45 }] }), 'Figura 1 – Alcune soluzioni y = 2 + c·e⁻²ˣ di y′ + 2y = 4: qualunque sia la condizione iniziale, tendono tutte alla retta y = 2.')}
        ${box('es', 'Esempio 2 — y′ − y/x = x, per x > 0', `<ol class="mt-passi">
          <li>${F(`a(x) = −${fr('1', 'x')}`)} ⇒ ${F('A(x) = −ln x')}, quindi ${F(`e<sup>A(x)</sup> = ${fr('1', 'x')}`)} e ${F('e<sup>−A(x)</sup> = x')}.</li>
          <li>${F(`y = x [ ∫ x · ${fr('1', 'x')} dx + c ] = x(x + c) = x<sup>2</sup> + cx`)}.</li>
          <li>Verifica: ${F('y′ = 2x + c')}, ${F(`${fr('y', 'x')} = x + c`)}, e ${F('2x + c − (x + c) = x')} ✓</li></ol>`)}
        <h2 id="st-s4">4. Applicazioni</h2>
        ${box('es', 'Carica di un condensatore (circuito RC)', `<p>Un condensatore scarico viene collegato, tramite una resistenza ${F('R')}, a un generatore di tensione ${F('E')}. La tensione ai capi del condensatore soddisfa ${F('RC v′ + v = E')}, con ${F('v(0) = 0')}. È lineare con ${F(`a = ${fr('1', 'RC')}`)} e la soluzione è</p>${B('v(t) = E (1 − e<sup>−t/RC</sup>)')}<p>Il prodotto ${F('τ = RC')} è la <b>costante di tempo</b>: dopo ${F('τ')} il condensatore è carico al 63% circa (${F('1 − e<sup>−1</sup> ≈ 0,632')}), dopo ${F('5τ')} al 99,3%.</p>`)}
        ${box('es', 'Legge di raffreddamento di Newton', `<p>La temperatura di un corpo in un ambiente a temperatura ${F('T<sub>a</sub>')} segue ${F('T′ = −k(T − T<sub>a</sub>)')}, da cui ${F('T(t) = T<sub>a</sub> + (T<sub>0</sub> − T<sub>a</sub>) e<sup>−kt</sup>')}.</p>
          <p><i>Problema</i>: un caffè a 90 °C è in una stanza a 20 °C; dopo 10 minuti è a 60 °C. Quando arriva a 40 °C?</p><ol class="mt-passi">
          <li>${F('60 = 20 + 70 e<sup>−10k</sup>')} ⇒ ${F(`e<sup>−10k</sup> = ${fr('4', '7')}`)} ⇒ ${F(`k = ${fr('ln(7/4)', '10')} ≈ 0,0560`)} min<sup>−1</sup>.</li>
          <li>${F('40 = 20 + 70 e<sup>−kt</sup>')} ⇒ ${F(`e<sup>−kt</sup> = ${fr('2', '7')}`)} ⇒ ${F(`t = ${fr('ln 3,5', 'k')} ≈ 22,4`)} minuti.</li></ol>`)}
        <h2 id="st-s5">5. Il metodo di Eulero</h2>
        <p>Quando un'equazione non si sa risolvere, la si risolve <b>numericamente</b>. Il metodo di Eulero segue la tangente per un piccolo passo ${F('h')}: partendo da ${F('(x<sub>0</sub>; y<sub>0</sub>)')}</p>
        ${B('x<sub>n+1</sub> = x<sub>n</sub> + h &nbsp;&nbsp;&nbsp; y<sub>n+1</sub> = y<sub>n</sub> + h · f(x<sub>n</sub>, y<sub>n</sub>)')}
        <p>Applichiamolo a ${F('y′ = y')}, ${F('y(0) = 1')} (soluzione esatta ${F('y = e<sup>x</sup>')}) con ${F('h = 0,25')}:</p>
        ${tabella(['n', 'xₙ', 'yₙ (Eulero)', 'eˣ (esatto)'], [['0', '0', '1', '1'], ['1', '0,25', '1,25', '1,2840'], ['2', '0,5', '1,5625', '1,6487'], ['3', '0,75', '1,9531', '2,1170'], ['4', '1', '2,4414', '2,7183']])}
        ${nota('info', 'Precisione', 'L\'errore del metodo di Eulero è proporzionale al passo h: dimezzando h l\'errore si dimezza circa. Nei programmi di simulazione si usano metodi più precisi (Runge–Kutta), basati sulla stessa idea.')}
        <h2 id="st-s6">6. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Verifica che ${F('y = c e<sup>−x</sup> + x − 1')} è l'integrale generale di ${F('y′ + y = x')}.</li>
          <li>Risolvi ${F('y′ = 2xy<sup>2</sup>')}. <small>[y = −1/(x² + c) e y = 0]</small></li>
          <li>Risolvi il problema di Cauchy ${F('y′ = 3y')}, ${F('y(0) = 2')}. <small>[y = 2e³ˣ]</small></li>
          <li>Risolvi ${F('y′ + y = e<sup>x</sup>')}. <small>[y = eˣ/2 + c e⁻ˣ]</small></li>
          <li>Risolvi ${F(`y′ + ${fr('y', 'x')} = 3x`)} per ${F('x &gt; 0')}. <small>[y = x² + c/x]</small></li>
          <li>Un circuito RC ha ${F('R = 10 kΩ')} e ${F('C = 100 μF')}: calcola τ e la tensione dopo 2 s se ${F('E = 12 V')}. <small>[τ = 1 s; v ≈ 10,4 V]</small></li>
        </ol>` },

      // ============================ 7. PROBABILITÀ ============================
      { id: 'probabilita', titolo: 'Calcolo combinatorio e probabilità', minuti: 22, giorni: -5, corpo: () => {
        const pb = []; for (let k = 0; k <= 6; k++) pb.push(binom(10, k) * 0.1 ** k * 0.9 ** (10 - k));
        return `
        <p class="st-intro">Il <b>calcolo combinatorio</b> insegna a contare in modo ordinato (quante password, quanti percorsi, quante squadre); la <b>probabilità</b> misura quanto è possibile un evento incerto. Sono strumenti indispensabili in informatica: sicurezza delle password, hashing, algoritmi randomizzati, affidabilità delle reti, filtri antispam e intelligenza artificiale.</p>
        <h2 id="st-s1">1. Il principio fondamentale del calcolo combinatorio</h2>
        <p>Se una scelta si fa in due fasi, la prima con ${F('n<sub>1</sub>')} possibilità e la seconda con ${F('n<sub>2</sub>')}, le scelte complessive sono ${F('n<sub>1</sub> · n<sub>2</sub>')} (e così via per più fasi). Esempio: con 3 primi e 4 secondi si compongono ${F('3 · 4 = 12')} menù diversi. Un byte è una sequenza di 8 bit, ognuno con 2 valori: ${F('2<sup>8</sup> = 256')} byte diversi.</p>
        <p>Il <b>fattoriale</b> di ${F('n')} è ${F('n! = n · (n − 1) · … · 2 · 1')}, con ${F('0! = 1')}. Cresce molto in fretta: ${F('5! = 120')}, ${F('10! = 3 628 800')}.</p>
        <h2 id="st-s2">2. Disposizioni, permutazioni, combinazioni</h2>
        ${tabella(['Raggruppamento', 'Ordine conta?', 'Ripetizioni?', 'Formula'], [
          ['Disposizioni semplici di n elementi a k a k', 'sì', 'no', F(`D<sub>n,k</sub> = ${fr('n!', '(n − k)!')} = n(n − 1)…(n − k + 1)`)],
          ['Disposizioni con ripetizione', 'sì', 'sì', F('D′<sub>n,k</sub> = n<sup>k</sup>')],
          ['Permutazioni (tutti gli n elementi)', 'sì', 'no', F('P<sub>n</sub> = n!')],
          ['Permutazioni con elementi ripetuti', 'sì', 'k₁, k₂… uguali', F(`${fr('n!', 'k<sub>1</sub>! k<sub>2</sub>! …')}`)],
          ['Combinazioni semplici', 'no', 'no', F(`C<sub>n,k</sub> = (<span class="mt-fr mt-bin"><span>n</span><span>k</span></span>) = ${fr('n!', 'k! (n − k)!')}`)],
          ['Combinazioni con ripetizione', 'no', 'sì', F('C′<sub>n,k</sub> = C<sub>n+k−1,k</sub>')]])}
        ${box('es', 'Esempi', `<ol class="mt-passi">
          <li>PIN di 4 cifre: ${F('D′<sub>10,4</sub> = 10<sup>4</sup> = 10 000')}. Se le cifre devono essere tutte diverse: ${F('D<sub>10,4</sub> = 10 · 9 · 8 · 7 = 5040')}.</li>
          <li>Podio (oro, argento, bronzo) tra 8 atleti: ${F('D<sub>8,3</sub> = 8 · 7 · 6 = 336')}.</li>
          <li>Modi di ordinare 6 libri su uno scaffale: ${F('P<sub>6</sub> = 6! = 720')}.</li>
          <li>Anagrammi (anche senza senso) della parola MAMMA: ${F(`${fr('5!', '3! · 2!')} = 10`)}.</li>
          <li>Comitati di 3 persone scelte tra 10: ${F(`C<sub>10,3</sub> = ${fr('10 · 9 · 8', '3!')} = 120`)}.</li>
          <li>Mani di 5 carte da un mazzo di 40: ${F('C<sub>40,5</sub> = 658 008')}.</li>
          <li>Stringhe di 8 bit con esattamente tre 1: si scelgono le 3 posizioni degli 1, ${F('C<sub>8,3</sub> = 56')}.</li></ol>`)}
        ${nota('info', 'Coefficienti binomiali e triangolo di Tartaglia', 'C(n,k) = C(n,n−k) e C(n,k) = C(n−1,k−1) + C(n−1,k): ogni numero del triangolo di Tartaglia è la somma dei due sopra. Sono i coefficienti del binomio di Newton: (a + b)ⁿ = ∑ C(n,k)·aⁿ⁻ᵏ·bᵏ; per esempio (a + b)³ = a³ + 3a²b + 3ab² + b³.')}
        ${nota('avviso', 'Password e attacchi a forza bruta', 'Con 26 lettere minuscole una password di 8 caratteri ha 26⁸ ≈ 2,1·10¹¹ combinazioni; con 62 simboli (minuscole, maiuscole, cifre) 62⁸ ≈ 2,2·10¹⁴, circa mille volte di più. Allungare la password conta più che complicarla: ogni carattere in più moltiplica per 62.')}
        <h2 id="st-s3">3. Probabilità: definizioni e prime regole</h2>
        <p>Un <b>esperimento aleatorio</b> ha un insieme di esiti possibili, lo <b>spazio campionario</b> ${F('Ω')}; un <b>evento</b> è un sottoinsieme di ${F('Ω')}.</p>
        ${tabella(['Impostazione', 'Definizione'], [
          ['Classica', F(`P(E) = ${fr('casi favorevoli', 'casi possibili')}`) + ' (esiti ugualmente possibili)'],
          ['Frequentista', 'limite della frequenza relativa su molte prove ripetute (legge dei grandi numeri)'],
          ['Soggettiva', 'prezzo che si è disposti a pagare per ricevere 1 se l\'evento si verifica'],
          ['Assiomatica (Kolmogorov)', F('P(E) ≥ 0') + ', ' + F('P(Ω) = 1') + ', additività per eventi incompatibili']])}
        ${box('teo', 'Regole fondamentali', `<ul><li>${F('0 ≤ P(E) ≤ 1')}; evento impossibile: 0; evento certo: 1.</li>
          <li>Evento contrario: ${F('P(Ē) = 1 − P(E)')}.</li>
          <li>Unione (somma logica): ${F('P(A ∪ B) = P(A) + P(B) − P(A ∩ B)')}; se A e B sono <b>incompatibili</b>, ${F('P(A ∪ B) = P(A) + P(B)')}.</li></ul>`)}
        ${box('es', 'Esempi con due dadi', `<p>Gli esiti possibili sono ${F('6 · 6 = 36')}. Somma 7: le coppie (1,6), (2,5), (3,4), (4,3), (5,2), (6,1), quindi ${F(`P = ${fr('6', '36')} = ${fr('1', '6')}`)}. Almeno un 6: conviene il contrario, «nessun 6», che ha ${F('5 · 5 = 25')} casi: ${F(`P = 1 − ${fr('25', '36')} = ${fr('11', '36')}`)}.</p>`)}
        <h2 id="st-s4">4. Probabilità condizionata e teorema di Bayes</h2>
        ${box('def', 'Probabilità condizionata e indipendenza', `${B(`P(A | B) = ${fr('P(A ∩ B)', 'P(B)')} &nbsp;&nbsp;(P(B) &gt; 0)`)}<p>è la probabilità di ${F('A')} sapendo che si è verificato ${F('B')}. Ne segue il <b>teorema del prodotto</b> ${F('P(A ∩ B) = P(B) · P(A | B)')}. Due eventi sono <b>indipendenti</b> se ${F('P(A | B) = P(A)')}, cioè ${F('P(A ∩ B) = P(A) · P(B)')}.</p>`)}
        ${box('es', 'Esempio — estrazioni senza reimmissione', `<p>Un'urna contiene 5 palline rosse e 3 blu. Se ne estraggono due senza rimetterle dentro. Probabilità che siano entrambe rosse: ${F(`${fr('5', '8')} · ${fr('4', '7')} = ${fr('20', '56')} = ${fr('5', '14')}`)}. Con reimmissione le estrazioni sarebbero indipendenti: ${F(`${fr('5', '8')} · ${fr('5', '8')} = ${fr('25', '64')}`)}.</p>`)}
        ${box('teo', 'Probabilità totale e teorema di Bayes', `<p>Se ${F('A<sub>1</sub>, …, A<sub>n</sub>')} sono incompatibili e coprono tutto ${F('Ω')} (una <b>partizione</b>) e ${F('E')} è un evento:</p>${B('P(E) = ∑<sub>i</sub> P(A<sub>i</sub>) · P(E | A<sub>i</sub>)')}${B(`P(A<sub>k</sub> | E) = ${fr('P(A<sub>k</sub>) · P(E | A<sub>k</sub>)', '∑<sub>i</sub> P(A<sub>i</sub>) · P(E | A<sub>i</sub>)')}`)}<p>Bayes permette di «invertire» il condizionamento: dalla probabilità dell'effetto data la causa, a quella della causa dato l'effetto.</p>`)}
        ${box('es', 'Esempio — il test diagnostico', `<p>Una malattia colpisce l'1% della popolazione. Un test è positivo nel 99% dei malati e, per errore, nel 5% dei sani. Una persona risulta positiva: qual è la probabilità che sia malata?</p>
          ${figura(ALBERO, 'Figura 1 – Diagramma ad albero: M = malato, M̄ = sano; + e − sono gli esiti del test. In fondo a ogni ramo, il prodotto delle probabilità.')}
          <ol class="mt-passi"><li>${F('P(+) = 0,01 · 0,99 + 0,99 · 0,05 = 0,0099 + 0,0495 = 0,0594')}</li>
          <li>${F(`P(M | +) = ${fr('0,0099', '0,0594')} = ${fr('1', '6')} ≈ 16,7%`)}</li></ol>
          <p>Sorprendente: anche con un test «affidabile al 99%», solo un positivo su sei è davvero malato, perché la malattia è rara e i falsi positivi sono tanti. Lo stesso ragionamento si usa nei filtri antispam bayesiani.</p>`)}
        ${box('es', 'Esempio — tre server', `<p>Le richieste di un sito sono smistate su tre server: A (50%), B (30%), C (20%), che sbagliano rispettivamente nell'1%, 2% e 3% dei casi. ${F('P(errore) = 0,5 · 0,01 + 0,3 · 0,02 + 0,2 · 0,03 = 0,017')}. Se una richiesta è andata in errore, la probabilità che l'abbia gestita C è ${F(`${fr('0,006', '0,017')} = ${fr('6', '17')} ≈ 35,3%`)}.</p>`)}
        <h2 id="st-s5">5. Variabili aleatorie e distribuzione binomiale</h2>
        <p>Una <b>variabile aleatoria</b> discreta ${F('X')} associa un numero a ogni esito; la sua <b>distribuzione</b> elenca i valori ${F('x<sub>i</sub>')} con le probabilità ${F('p<sub>i</sub>')}. Il <b>valore atteso</b> è ${F('E(X) = ∑ x<sub>i</sub> p<sub>i</sub>')}, la <b>varianza</b> ${F('Var(X) = ∑ (x<sub>i</sub> − E(X))<sup>2</sup> p<sub>i</sub>')} e la <b>deviazione standard</b> ${F(`σ = ${rad('Var(X)')}`)}.</p>
        ${box('teo', 'Distribuzione binomiale (schema di Bernoulli)', `<p>Si ripete ${F('n')} volte, in modo indipendente, una prova che ha successo con probabilità ${F('p')}. Il numero ${F('X')} di successi ha distribuzione binomiale ${F('B(n, p)')}:</p>${B('P(X = k) = (<span class="mt-fr mt-bin"><span>n</span><span>k</span></span>) · p<sup>k</sup> · (1 − p)<sup>n−k</sup>, &nbsp;&nbsp; k = 0, 1, …, n')}<p>con ${F('E(X) = np')} e ${F('Var(X) = np(1 − p)')}.</p>`)}
        ${box('es', 'Esempio — pacchetti persi', `<p>Su una connessione disturbata ogni pacchetto si perde, indipendentemente dagli altri, con probabilità ${F('p = 0,1')}. Si inviano 10 pacchetti.</p><ul>
          <li>Nessuno perso: ${F('P(X = 0) = 0,9<sup>10</sup> ≈ 0,3487')}.</li>
          <li>Esattamente uno perso: ${F('P(X = 1) = 10 · 0,1 · 0,9<sup>9</sup> ≈ 0,3874')}.</li>
          <li>Al massimo uno perso: ${F('0,3487 + 0,3874 ≈ 0,7361')}; quindi almeno due persi: ${F('1 − 0,7361 = 0,2639')}.</li>
          <li>In media se ne perde ${F('E(X) = 10 · 0,1 = 1')}, con ${F(`σ = ${rad('10 · 0,1 · 0,9')} ≈ 0,95`)}.</li></ul>`)}
        ${figura(barre(pb, pb.map((_, k) => k), 'Distribuzione binomiale'), 'Figura 2 – La distribuzione B(10; 0,1) del numero di pacchetti persi (k da 0 a 6; da 7 a 10 le probabilità sono praticamente nulle).')}
        <h2 id="st-s6">6. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Quante targhe del tipo «2 lettere, 3 cifre, 2 lettere» si possono formare con 22 lettere? <small>[22⁴ · 10³ = 234 256 000]</small></li>
          <li>In quanti modi si possono scegliere 2 rappresentanti in una classe di 24 studenti? <small>[276]</small></li>
          <li>Quanti sono gli anagrammi della parola INFORMATICA? <small>[11!/(2!·2!) = 9 979 200]</small></li>
          <li>Si lancia una moneta 5 volte: probabilità di ottenere esattamente 3 teste? <small>[10/32 = 5/16]</small></li>
          <li>Si lancia un dado 5 volte: probabilità di ottenere esattamente due 6? <small>[1250/7776 ≈ 0,161]</small></li>
          <li>Da un mazzo di 40 carte (4 semi) se ne estraggono due: probabilità che siano due assi? <small>[1/130]</small></li>
          <li>Nell'esempio dei tre server, calcola la probabilità che una richiesta in errore sia stata gestita da A. <small>[5/17]</small></li>
        </ol>`; } },

      // ============================ 8. STATISTICA ============================
      { id: 'statistica', titolo: 'Statistica descrittiva e regressione', minuti: 16, giorni: -2, corpo: () => `
        <p class="st-intro">La <b>statistica descrittiva</b> riassume un insieme di dati con pochi numeri significativi (indici di posizione e di variabilità) e ne studia le relazioni. Sono gli strumenti alla base dell'analisi dei dati: dai tempi di risposta di un server ai voti di una classe, fino ai modelli di apprendimento automatico, che partono dalla regressione lineare.</p>
        <h2 id="st-s1">1. Dati e frequenze</h2>
        <p>Un <b>carattere</b> può essere <b>qualitativo</b> (colore, sistema operativo) o <b>quantitativo</b> (età, tempo di risposta), discreto o continuo. Per ogni modalità si contano la <b>frequenza assoluta</b> ${F('f<sub>i</sub>')}, la <b>frequenza relativa</b> ${F(`${fr('f<sub>i</sub>', 'n')}`)} (spesso in percentuale) e la <b>frequenza cumulata</b>.</p>
        ${tabella(['Voto xᵢ', 'Frequenza fᵢ', 'Freq. relativa', 'Freq. cumulata'], [['5', '1', '12,5%', '1'], ['6', '2', '25%', '3'], ['7', '3', '37,5%', '6'], ['8', '1', '12,5%', '7'], ['9', '1', '12,5%', '8']])}
        <p>Sono i voti di una verifica in un piccolo gruppo di 8 studenti: 6, 7, 5, 8, 7, 9, 6, 7.</p>
        <h2 id="st-s2">2. Indici di posizione</h2>
        ${tabella(['Indice', 'Definizione', 'Sui nostri voti'], [
          ['Media aritmetica', F(`x̄ = ${fr('∑ x<sub>i</sub>', 'n')}`) + ' (ponderata: ' + F(`${fr('∑ x<sub>i</sub> f<sub>i</sub>', '∑ f<sub>i</sub>')}`) + ')', F(`${fr('55', '8')} = 6,875`)],
          ['Mediana', 'il valore centrale dei dati ordinati (con n pari: media dei due centrali)', 'dati ordinati 5, 6, 6, 7, 7, 7, 8, 9 → ' + F(`${fr('7 + 7', '2')} = 7`)],
          ['Moda', 'il valore con la frequenza più alta', '7']])}
        ${nota('info', 'Media o mediana?', 'La media risente dei valori estremi, la mediana no. Se in un ufficio 9 persone guadagnano 1500 € e il direttore 15 000 €, la media è 2850 € ma la mediana è 1500 €: descrive meglio lo stipendio «tipico».')}
        <h2 id="st-s3">3. Indici di variabilità</h2>
        <p>Due insiemi di dati possono avere la stessa media ma essere molto diversi. La variabilità si misura con:</p>
        <ul><li><b>campo di variazione</b>: ${F('x<sub>max</sub> − x<sub>min</sub>')} (per i voti: ${F('9 − 5 = 4')});</li>
          <li><b>varianza</b>: ${F(`σ<sup>2</sup> = ${fr('∑ (x<sub>i</sub> − x̄)<sup>2</sup>', 'n')}`)}, la media dei quadrati degli scarti dalla media;</li>
          <li><b>deviazione standard</b> (scarto quadratico medio): ${F(`σ = ${rad('σ<sup>2</sup>')}`)}, che ha la stessa unità di misura dei dati;</li>
          <li><b>coefficiente di variazione</b>: ${F(`${fr('σ', 'x̄')}`)}, utile per confrontare dati con unità o ordini di grandezza diversi.</li></ul>
        ${box('es', 'Varianza dei voti', `<p>Somma dei quadrati degli scarti da ${F('x̄ = 6,875')}: ${F('3,516 + 2 · 0,766 + 3 · 0,016 + 1,266 + 4,516 ≈ 10,875')}. Quindi ${F(`σ<sup>2</sup> = ${fr('10,875', '8')} ≈ 1,36`)} e ${F('σ ≈ 1,17')}. Formula alternativa, comoda al computer: ${F(`σ<sup>2</sup> = ${fr('∑ x<sub>i</sub><sup>2</sup>', 'n')} − x̄<sup>2</sup> = ${fr('389', '8')} − 6,875<sup>2</sup> ≈ 1,36`)}.</p>`)}
        ${nota('avviso', 'n oppure n − 1?', 'Quando i dati sono un campione e si vuole stimare la varianza di tutta la popolazione si divide per n − 1 (varianza campionaria). I fogli di calcolo hanno funzioni distinte per i due casi.')}
        <h2 id="st-s4">4. Regressione lineare e correlazione</h2>
        <p>Con due caratteri ${F('X')} e ${F('Y')} misurati sulle stesse unità si ottengono coppie ${F('(x<sub>i</sub>; y<sub>i</sub>)')}, da rappresentare con un <b>diagramma a dispersione</b>. La <b>retta di regressione</b> ${F('y = mx + q')} è quella che rende minima la somma dei quadrati delle distanze verticali dai punti (<b>metodo dei minimi quadrati</b>):</p>
        ${B(`m = ${fr('∑ (x<sub>i</sub> − x̄)(y<sub>i</sub> − ȳ)', '∑ (x<sub>i</sub> − x̄)<sup>2</sup>')} &nbsp;&nbsp;&nbsp; q = ȳ − m x̄`)}
        <p>Il <b>coefficiente di correlazione lineare</b> di Bravais–Pearson ${F(`r = ${fr('∑ (x<sub>i</sub> − x̄)(y<sub>i</sub> − ȳ)', `${rad('∑ (x<sub>i</sub> − x̄)<sup>2</sup> · ∑ (y<sub>i</sub> − ȳ)<sup>2</sup>')}`)}`)} è compreso tra −1 e 1: vicino a ±1 indica una forte relazione lineare (crescente o decrescente), vicino a 0 nessuna relazione lineare.</p>
        ${box('es', 'Esempio — ore di studio e voto', `${tabella(['Ore di studio x', '1', '2', '3', '4', '5'], [['Voto y', '2', '4', '5', '4', '5']])}<ol class="mt-passi">
          <li>${F('x̄ = 3')}, ${F('ȳ = 4')}.</li>
          <li>Scarti di x: −2, −1, 0, 1, 2; scarti di y: −2, 0, 1, 0, 1.</li>
          <li>${F('∑ (x<sub>i</sub> − x̄)(y<sub>i</sub> − ȳ) = 4 + 0 + 0 + 0 + 2 = 6')}; ${F('∑ (x<sub>i</sub> − x̄)<sup>2</sup> = 10')}; ${F('∑ (y<sub>i</sub> − ȳ)<sup>2</sup> = 6')}.</li>
          <li>${F(`m = ${fr('6', '10')} = 0,6`)}, ${F('q = 4 − 0,6 · 3 = 2,2')}: retta ${F('y = 0,6x + 2,2')}.</li>
          <li>${F(`r = ${fr('6', rad('10 · 6'))} ≈ 0,77`)}: correlazione positiva abbastanza forte.</li></ol>`)}
        ${figura(grafico({ x0: -0.3, x1: 6, y0: -0.4, y1: 6.2, h: 290, curve: [{ f: (x) => 0.6 * x + 2.2, col: '#c5483c', sw: 2, t: 'y = 0,6x + 2,2', tx: 3.4, ty: 5.6 }], punti: [[1, 2], [2, 4], [3, 5], [4, 4], [5, 5]].map(([x, y]) => ({ x, y, col: '#1a5fb4' })).concat([{ x: 3, y: 4, col: '#3f9b6b', t: '(x̄; ȳ)', dx: 8, dy: 16 }]) }), 'Figura 1 – Diagramma a dispersione e retta di regressione: la retta passa sempre per il baricentro (x̄; ȳ) = (3; 4).')}
        ${nota('avviso', 'Correlazione non è causalità', 'Un valore di r alto dice che due grandezze variano insieme, non che una causi l\'altra: entrambe possono dipendere da una terza (per esempio vendite di gelati e scottature crescono entrambe d\'estate).')}
        <h2 id="st-s5">5. Cenni sulla distribuzione normale</h2>
        <p>Molti fenomeni (altezze, errori di misura, tempi di risposta mediati) seguono la <b>distribuzione normale</b> (o gaussiana), con il grafico «a campana» simmetrico attorno alla media μ. In una normale circa il <b>68%</b> dei valori cade entro ${F('μ ± σ')}, il <b>95%</b> entro ${F('μ ± 2σ')} e il <b>99,7%</b> entro ${F('μ ± 3σ')}.</p>
        ${figura(grafico({ x0: -4, x1: 4, y0: -0.05, y1: 0.48, py: 0.1, ey: [0.1, 0.2, 0.3, 0.4], h: 250, aree: [{ f: (x) => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI), a: -1, b: 1 }], curve: [{ f: (x) => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI), t: 'normale standard', tx: 1.3, ty: 0.34 }] }), 'Figura 2 – La normale standard (μ = 0, σ = 1): l\'area colorata tra −1 e 1 vale circa 0,68.')}
        <h2 id="st-s6">6. Esercizi</h2>
        <ol class="st-esercizi">
          <li>Calcola media, mediana e moda di: 12, 15, 11, 15, 18, 14, 13. <small>[14; 14; 15]</small></li>
          <li>Calcola varianza e deviazione standard di 2, 4, 4, 4, 5, 5, 7, 9. <small>[4; 2]</small></li>
          <li>Il tempo di risposta medio di un server è 120 ms con σ = 15 ms (distribuzione normale): in quale intervallo cade circa il 95% delle risposte? <small>[90–150 ms]</small></li>
          <li>Trova la retta di regressione per i punti (1; 1), (2; 3), (3; 5). <small>[y = 2x − 1, r = 1]</small></li>
        </ol>` },
    ],
  };
})();
