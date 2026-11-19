/* Engine: the drawing pad, and small pictures of saved drawings.
   You don't need to edit this file. */

const Pad = (() => {
  const canvas = document.getElementById("pad");
  const ctx = canvas.getContext("2d");
  let strokes = [], current = null, enabled = true;
  const listeners = { stroke: [], move: [] };

  function size() {
    const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    const w = Math.round(r.width * dpr);
    if (w && canvas.width !== w) { canvas.width = w; canvas.height = w; }
    return { scale: canvas.width / (r.width || 1), css: r.width || 1 };
  }

  function pen() { return getComputedStyle(document.body).getPropertyValue("--pen").trim() || "#222"; }

  function redraw() {
    const { scale } = size();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = pen(); ctx.fillStyle = pen(); ctx.lineWidth = 4.5 * scale;
    for (const s of current ? strokes.concat([current]) : strokes) line(ctx, s, (p) => [p[0] * scale, p[1] * scale]);
  }

  function line(c, s, at) {
    if (!s.length) return;
    c.beginPath();
    const [x0, y0] = at(s[0]);
    c.moveTo(x0, y0);
    if (s.length === 1) c.lineTo(x0 + 0.01, y0);
    for (let i = 1; i < s.length; i++) { const [x, y] = at(s[i]); c.lineTo(x, y); }
    c.stroke();
  }

  function point(e) {
    const r = canvas.getBoundingClientRect();
    return [Math.round((e.clientX - r.left) * 10) / 10, Math.round((e.clientY - r.top) * 10) / 10];
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (!enabled || e.button > 0) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    current = [point(e)];
    redraw();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!current) return;
    const p = point(e), last = current[current.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.5) return;
    current.push(p);
    redraw();
    listeners.move.forEach((f) => f());
  });
  const finish = () => {
    if (!current) return;
    // Keep the shape, drop the extra points: it makes drawings smaller to save.
    strokes.push(Doodle.simplify(current, 1.2));
    current = null;
    redraw();
    listeners.stroke.forEach((f) => f());
  };
  canvas.addEventListener("pointerup", finish);
  canvas.addEventListener("pointercancel", finish);
  window.addEventListener("resize", redraw);

  // A small picture of a drawing, fitted into a size × size square.
  function thumb(strokesToDraw, px = 72, color) {
    const c = document.createElement("canvas"), dpr = window.devicePixelRatio || 1;
    c.width = c.height = Math.round(px * dpr);
    c.style.width = c.style.height = px + "px";
    const g = c.getContext("2d");
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const s of strokesToDraw) for (const [x, y] of s) {
      minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y);
    }
    if (!isFinite(minx)) return c;
    const room = c.width * 0.84, sc = room / Math.max(maxx - minx, maxy - miny, 1e-9);
    const ox = (c.width - (maxx - minx) * sc) / 2, oy = (c.height - (maxy - miny) * sc) / 2;
    g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = Math.max(1.5, px / 40) * dpr;
    g.strokeStyle = color || pen();
    for (const s of strokesToDraw) line(g, s, ([x, y]) => [ox + (x - minx) * sc, oy + (y - miny) * sc]);
    return c;
  }

  // What the computer "sees": the 24 × 24 picture of where the ink is.
  function seen(ink, px = 120) {
    const n = Math.round(Math.sqrt(ink.length));
    const c = document.createElement("canvas");
    c.width = c.height = n;
    c.style.width = c.style.height = px + "px";
    const g = c.getContext("2d"), img = g.createImageData(n, n);
    for (let i = 0; i < ink.length; i++) {
      const v = 255 - Math.round(Math.min(1, ink[i]) * 235);
      img.data.set([v, v, v, 255], i * 4);
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  return {
    get strokes() { return strokes; },
    // The drawing so far, including a line that's still being drawn.
    drawing() { return current && current.length > 1 ? strokes.concat([current]) : strokes.slice(); },
    points() { return strokes.reduce((a, s) => a + s.length, 0) + (current ? current.length : 0); },
    clear() { strokes = []; current = null; redraw(); listeners.stroke.forEach((f) => f()); },
    undo() { strokes.pop(); redraw(); listeners.stroke.forEach((f) => f()); },
    enable(on) { enabled = on; canvas.classList.toggle("off", !on); if (!on) { current = null; redraw(); } },
    on(what, f) { listeners[what].push(f); },
    redraw, thumb, seen,
  };
})();
