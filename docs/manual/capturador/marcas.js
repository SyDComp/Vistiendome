// Dibuja las marcas del manual sobre la página, encima de todo: un recuadro
// (o círculo) por elemento, su número y, si tiene, una nota con flecha.
// Recibe las cajas ya medidas por Playwright, en px de la ventana.
(marcas) => {
  const COLOR = "#ff5a1f";
  const NS = "http://www.w3.org/2000/svg";
  const SEPARACION_BASE = 70; // de la nota al elemento, si la marca no dice otra
  const MARGEN = 16;          // la nota no toca el borde de la ventana
  const HOLGURA = 6;          // el recuadro respira alrededor del elemento

  document.getElementById("marcas-manual")?.remove();
  const capa = document.createElement("div");
  capa.id = "marcas-manual";
  capa.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:'Segoe UI',system-ui,sans-serif";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", innerWidth);
  svg.setAttribute("height", innerHeight);
  svg.style.cssText = "position:absolute;inset:0";
  svg.innerHTML = `<defs><marker id="punta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${COLOR}"/></marker></defs>`;
  capa.appendChild(svg);
  document.body.appendChild(capa);

  const dentro = (v, min, max) => Math.min(Math.max(v, min), max);

  const trazo = (tag, attrs) => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    svg.appendChild(el);
    return el;
  };

  const numero = (n, x, y) => {
    const d = document.createElement("div");
    d.textContent = n;
    const r = 15;
    d.style.cssText = `position:absolute;left:${dentro(x - r, 2, innerWidth - 2 * r - 2)}px;top:${dentro(y - r, 2, innerHeight - 2 * r - 2)}px;width:${2 * r}px;height:${2 * r}px;border-radius:50%;background:${COLOR};color:#fff;font-weight:700;font-size:16px;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)`;
    capa.appendChild(d);
  };

  // El punto del borde de la caja más cercano a (x, y): ahí llega la flecha.
  const bordeHacia = (c, x, y) => ({
    x: dentro(x, c.x, c.x + c.w),
    y: dentro(y, c.y, c.y + c.h),
  });

  const nota = (m, c) => {
    const d = document.createElement("div");
    d.innerHTML = (m.n != null ? `<b style="margin-right:6px">${m.n}</b>` : "") + m.nota;
    d.style.cssText = `position:absolute;max-width:260px;padding:8px 12px;border-radius:8px;background:${COLOR};color:#fff;font-size:15px;line-height:1.35;font-weight:500;box-shadow:0 4px 14px rgba(0,0,0,.25)`;
    capa.appendChild(d);
    const w = d.offsetWidth, h = d.offsetHeight;
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    const SEPARACION = m.distancia ?? SEPARACION_BASE;
    let x, y;
    if (m.lado === "izquierda") { x = c.x - SEPARACION - w; y = cy - h / 2; }
    else if (m.lado === "arriba") { x = cx - w / 2; y = c.y - SEPARACION - h; }
    else if (m.lado === "abajo") { x = cx - w / 2; y = c.y + c.h + SEPARACION; }
    else { x = c.x + c.w + SEPARACION; y = cy - h / 2; }
    x = dentro(x, MARGEN, innerWidth - w - MARGEN);
    y = dentro(y, MARGEN, innerHeight - h - MARGEN);
    d.style.left = `${x}px`;
    d.style.top = `${y}px`;
    // La flecha sale del borde de la nota y llega al borde del elemento.
    const desde = bordeHacia({ x, y, w, h }, cx, cy);
    const hasta = bordeHacia(c, desde.x, desde.y);
    trazo("line", { x1: desde.x, y1: desde.y, x2: hasta.x, y2: hasta.y, stroke: COLOR, "stroke-width": 3, "marker-end": "url(#punta)" });
  };

  for (const m of marcas) {
    // Dentro de la ventana: un recuadro cortado en el borde no se lee.
    const x0 = Math.max(m.caja.x - HOLGURA, 3), y0 = Math.max(m.caja.y - HOLGURA, 3);
    const x1 = Math.min(m.caja.x + m.caja.width + HOLGURA, innerWidth - 3);
    const y1 = Math.min(m.caja.y + m.caja.height + HOLGURA, innerHeight - 3);
    const c = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    if (m.forma === "circulo") {
      // Un círculo justo alrededor del elemento, con el número encima: así
      // íconos vecinos no se cruzan.
      const radio = Math.max(m.caja.width, m.caja.height) / 2 + HOLGURA;
      const cx = m.caja.x + m.caja.width / 2, cy = m.caja.y + m.caja.height / 2;
      trazo("circle", { cx, cy, r: radio, fill: "none", stroke: COLOR, "stroke-width": 3 });
      if (m.nota) nota(m, { x: cx - radio, y: cy - radio, w: 2 * radio, h: 2 * radio });
      else if (m.n != null) numero(m.n, cx, cy - radio - 17);
      continue;
    }
    trazo("rect", { x: c.x, y: c.y, width: c.w, height: c.h, rx: 8, fill: "none", stroke: COLOR, "stroke-width": 3 });
    if (m.nota) nota(m, c);
    else if (m.n != null) {
      const [vertical, horizontal] = m.esquina.split("-");
      numero(m.n, horizontal === "derecha" ? c.x + c.w : c.x, vertical === "abajo" ? c.y + c.h : c.y);
    }
  }
}
