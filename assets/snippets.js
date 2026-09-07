/* ==========================================================
   dota-stats-snippets — chart runtime v1
   Generated from dotasnip/assets/snippets.js. Do not edit here.

   Reads a chart spec from the <script type="application/json">
   inside each .figure__plot and renders it as inline SVG.
   No dependencies. Labels are inserted as text nodes only.
   ========================================================== */

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}, parent = null) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== null && value !== undefined) node.setAttribute(key, String(value));
  }
  if (parent) parent.appendChild(node);
  return node;
}

function html(name, className = '', parent = null) {
  const node = document.createElement(name);
  if (className) node.className = className;
  if (parent) parent.appendChild(node);
  return node;
}

/** Nice round tick values covering [lo, hi] with about `count` steps. */
function ticks(lo, hi, count = 6) {
  if (hi === lo) return [lo];
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const out = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + step * 1e-9; t += step) {
    out.push(Math.abs(t) < step * 1e-9 ? 0 : t);
  }
  return out;
}

const fmtInt = (v) => v.toLocaleString('en-US');
const fmtSigned = (v, dp = 1) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(dp);
const fmtTick = (v) => (Number.isInteger(v) ? fmtInt(v) : String(v));

/* ---- Scatter --------------------------------------------
   Points carry an image mark (hero portrait) rather than a
   categorical colour: identity for 40+ entities cannot come
   from hue. A nearest-point overlay gives every mark a
   generous hit target, and the extremes are direct-labelled
   so no value is hover-only.
   -------------------------------------------------------- */
function renderScatter(plot, spec) {
  const tip = html('div', 'tip', plot);
  const svg = el('svg', { role: 'img' }, plot);
  const title = el('title', {}, svg);
  title.appendChild(document.createTextNode(spec.a11yTitle || spec.xLabel + ' against ' + spec.yLabel));

  const style = getComputedStyle(document.documentElement);
  const token = (name, fallback) => (style.getPropertyValue(name) || fallback).trim();
  const COLORS = {
    grid: token('--viz-grid', '#23233c'),
    axis: token('--viz-axis', '#343455'),
    text: token('--color-text', '#e8e6f0'),
    muted: token('--color-text-muted', '#6e6b80'),
    secondary: token('--color-text-secondary', '#a9a6b8'),
    accent: token('--color-primary', '#c48bc4'),
    surface: token('--viz-surface', '#16162a'),
    divNeg: token('--div-neg', '#de3a45'),
    divPos: token('--div-pos', '#1aa291'),
  };

  const points = spec.points;
  let hitAreas = [];
  let active = -1;

  function draw() {
    while (svg.lastChild && svg.lastChild !== title) svg.removeChild(svg.lastChild);

    const width = Math.max(320, plot.clientWidth);
    const compact = width < 620;
    const height = Math.round(Math.min(700, Math.max(380, width * (compact ? 1.05 : 0.64))));
    const mark = compact ? 22 : 30;
    const TICK_PX = compact ? 12 : 14;
    const TITLE_PX = compact ? 13 : 15;
    const pad = {
      top: 16,
      right: mark / 2 + 12,
      bottom: TICK_PX * 2 + TITLE_PX + 36,
      left: TITLE_PX + (compact ? 40 : 50),
    };
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);

    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;

    // Scales — padded so marks never hang off the plot edge.
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const xSpan = Math.max(...xs) - Math.min(...xs) || 1;
    const ySpan = Math.max(...ys) - Math.min(...ys) || 1;
    const xLo = Math.min(...xs) - xSpan * 0.08;
    const xHi = Math.max(...xs) + xSpan * 0.08;
    const yLo = spec.yZero ? 0 : Math.min(...ys) - ySpan * 0.08;
    const yHi = Math.max(...ys) + ySpan * 0.1;

    const sx = (v) => pad.left + ((v - xLo) / (xHi - xLo)) * innerW;
    const sy = (v) => pad.top + innerH - ((v - yLo) / (yHi - yLo)) * innerH;

    const g = el('g', {}, svg);

    // Gridlines — solid hairlines, one step off the surface. Minor lines sit at
    // a fixed interval and read fainter than the labelled major lines.
    const xTicks = ticks(xLo, xHi, compact ? 4 : 7);
    const yTicks = ticks(yLo, yHi, 5);

    const minorAt = (step, lo, hi) => {
      if (!step) return [];
      const out = [];
      for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) out.push(t);
      return out;
    };

    for (const t of minorAt(spec.yMinor, yLo, yHi)) {
      el('line', { x1: pad.left, y1: sy(t), x2: pad.left + innerW, y2: sy(t), stroke: COLORS.grid, 'stroke-width': 1, opacity: 0.45 }, g);
    }
    for (const t of minorAt(spec.xMinor, xLo, xHi)) {
      el('line', { x1: sx(t), y1: pad.top, x2: sx(t), y2: pad.top + innerH, stroke: COLORS.grid, 'stroke-width': 1, opacity: 0.45 }, g);
    }
    for (const t of yTicks) {
      el('line', { x1: pad.left, y1: sy(t), x2: pad.left + innerW, y2: sy(t), stroke: COLORS.grid, 'stroke-width': 1 }, g);
    }
    for (const t of xTicks) {
      el('line', { x1: sx(t), y1: pad.top, x2: sx(t), y2: pad.top + innerH, stroke: COLORS.grid, 'stroke-width': 1 }, g);
    }

    // Axis rules.
    el('line', { x1: pad.left, y1: pad.top + innerH, x2: pad.left + innerW, y2: pad.top + innerH, stroke: COLORS.axis, 'stroke-width': 1 }, g);
    el('line', { x1: pad.left, y1: pad.top, x2: pad.left, y2: pad.top + innerH, stroke: COLORS.axis, 'stroke-width': 1 }, g);

    // Tick labels.
    for (const t of yTicks) {
      const label = el('text', {
        x: pad.left - 12, y: sy(t) + 5, fill: COLORS.secondary,
        'font-size': TICK_PX, 'text-anchor': 'end', 'font-variant-numeric': 'tabular-nums',
      }, g);
      label.appendChild(document.createTextNode(fmtTick(t)));
    }
    for (const t of xTicks) {
      const label = el('text', {
        x: sx(t), y: pad.top + innerH + TICK_PX + 12, fill: COLORS.secondary,
        'font-size': TICK_PX, 'text-anchor': 'middle', 'font-variant-numeric': 'tabular-nums',
      }, g);
      label.appendChild(document.createTextNode(fmtTick(t)));
    }

    // Axis titles.
    const xTitle = el('text', {
      x: pad.left + innerW / 2, y: pad.top + innerH + TICK_PX + TITLE_PX + 22, fill: COLORS.text,
      'font-size': TITLE_PX, 'text-anchor': 'middle', 'letter-spacing': 0.6,
    }, g);
    xTitle.appendChild(document.createTextNode(spec.xLabel));

    const yTitle = el('text', {
      transform: `translate(${TITLE_PX + 4} ${pad.top + innerH / 2}) rotate(-90)`, fill: COLORS.text,
      'font-size': TITLE_PX, 'text-anchor': 'middle', 'letter-spacing': 0.6,
    }, g);
    yTitle.appendChild(document.createTextNode(spec.yLabel));

    // Axis end notes — which way is good. The words carry the meaning; the
    // diverging pair only reinforces it, so the pair is never the sole channel.
    const endNote = (text, color, attrs) => {
      if (!text) return;
      const node = el('text', {
        fill: color, 'font-size': TICK_PX, 'letter-spacing': 0.8, ...attrs,
      }, g);
      node.appendChild(document.createTextNode(text));
    };

    const noteY = height - 6;
    endNote(spec.xLowNote, COLORS.divNeg, { x: pad.left, y: noteY, 'text-anchor': 'start' });
    endNote(spec.xHighNote, COLORS.divPos, { x: pad.left + innerW, y: noteY, 'text-anchor': 'end' });

    const noteX = TITLE_PX + 4;
    endNote(spec.yLowNote, COLORS.divNeg, {
      transform: `translate(${noteX} ${pad.top + innerH}) rotate(-90)`, 'text-anchor': 'start',
    });
    endNote(spec.yHighNote, COLORS.divPos, {
      transform: `translate(${noteX} ${pad.top}) rotate(-90)`, 'text-anchor': 'end',
    });

    // Reference line — the baseline the x axis is read against.
    if (spec.xRef !== null && spec.xRef !== undefined && spec.xRef > xLo && spec.xRef < xHi) {
      el('line', {
        x1: sx(spec.xRef), y1: pad.top, x2: sx(spec.xRef), y2: pad.top + innerH,
        stroke: COLORS.accent, 'stroke-width': 1.5, opacity: 0.75,
      }, g);
      if (spec.xRefLabel) {
        const refLabel = el('text', {
          x: sx(spec.xRef) + 6, y: pad.top + 12, fill: COLORS.accent,
          'font-size': 10.5, 'letter-spacing': 1,
        }, g);
        refLabel.appendChild(document.createTextNode(spec.xRefLabel));
      }
    }

    // Marks. Smaller samples draw first so the busier heroes sit on top.
    const marks = el('g', {}, svg);
    const order = points.map((_, i) => i).sort((a, b) => points[a].y - points[b].y);
    const nodes = new Array(points.length);
    for (const i of order) {
      const p = points[i];
      const cx = sx(p.x);
      const cy = sy(p.y);
      const holder = el('g', { 'data-i': i }, marks);
      // The portraits carry their own alpha, so no backing plate: a filled rect
      // behind one mark would punch a square hole through its neighbours.
      const img = el('image', {
        x: cx - mark / 2, y: cy - mark / 2, width: mark, height: mark,
        href: p.img, preserveAspectRatio: 'xMidYMid meet', opacity: 0.94,
      }, holder);
      nodes[i] = { holder, img, cx, cy, mark };
    }

    // Nearest-point hover layer — the pointer only has to be closest.
    hitAreas = nodes;
    const overlay = el('rect', {
      x: pad.left, y: pad.top, width: innerW, height: innerH, fill: 'transparent',
    }, svg);
    overlay.style.cursor = 'crosshair';

    function nearest(event) {
      const box = plot.getBoundingClientRect();
      const k = width / box.width;
      const px = (event.clientX - box.left) * k;
      const py = (event.clientY - box.top) * k;
      let bestI = -1;
      let bestD = Infinity;
      for (let i = 0; i < nodes.length; i++) {
        const d = (nodes[i].cx - px) ** 2 + (nodes[i].cy - py) ** 2;
        if (d < bestD) { bestD = d; bestI = i; }
      }
      return Math.sqrt(bestD) <= 70 ? bestI : -1;
    }

    overlay.addEventListener('pointermove', (event) => setActive(nearest(event)));
    overlay.addEventListener('pointerleave', () => setActive(-1));
  }

  function setActive(i) {
    if (i === active) return;
    if (active >= 0 && hitAreas[active]) {
      hitAreas[active].holder.removeAttribute('transform');
      hitAreas[active].img.setAttribute('opacity', 0.94);
    }
    active = i;
    if (i < 0) {
      tip.dataset.show = '0';
      return;
    }
    const node = hitAreas[i];
    const p = points[i];
    // Lift the hovered mark: scale about its own centre and raise it to the front.
    node.holder.setAttribute('transform', `translate(${node.cx} ${node.cy}) scale(1.35) translate(${-node.cx} ${-node.cy})`);
    node.img.setAttribute('opacity', 1);
    node.holder.parentNode.appendChild(node.holder);

    tip.replaceChildren();
    const head = html('div', 'tip__head', tip);
    const img = html('img', '', head);
    img.src = p.img;
    img.alt = '';
    const name = html('span', 'tip__name', head);
    name.appendChild(document.createTextNode(p.label));
    for (const [key, value] of p.rows) {
      const row = html('div', 'tip__row', tip);
      const k = html('span', 'tip__key', row);
      k.appendChild(document.createTextNode(key));
      const v = html('span', 'tip__val', row);
      v.appendChild(document.createTextNode(value));
    }

    const box = plot.getBoundingClientRect();
    const k = box.width / Number(svg.getAttribute('width'));
    tip.dataset.show = '1';
    const tipW = tip.offsetWidth;
    const left = Math.min(Math.max(node.cx * k, tipW / 2 + 4), box.width - tipW / 2 - 4);
    tip.style.left = `${left}px`;
    tip.style.top = `${node.cy * k - node.mark * k * 0.8}px`;
  }

  draw();

  let frame = 0;
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => { active = -1; tip.dataset.show = '0'; draw(); });
  });
  observer.observe(plot);
}

/* ---- Sortable tables ------------------------------------
   Every table-view column sorts on click. Values come from
   the cell's own text, with numbers detected rather than
   declared, so a table needs no extra markup to sort.
   -------------------------------------------------------- */
function sortValue(row, index) {
  const cell = row.children[index];
  return cell ? cell.textContent.trim() : '';
}

function asNumber(text) {
  // Strip thousands separators, percent signs and the typographic minus.
  const cleaned = text.replace(/[,%\s]/g, '').replace(/−/g, '-');
  if (!/^[+-]?\d*\.?\d+$/.test(cleaned)) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function initSortableTable(table) {
  const body = table.tBodies[0];
  if (!body) return;
  const headers = [...table.querySelectorAll('thead th')];

  headers.forEach((th, index) => {
    th.tabIndex = 0;
    th.setAttribute('aria-sort', 'none');

    const sort = () => {
      const current = th.getAttribute('aria-sort');
      const dir = current === 'ascending' ? 'descending' : 'ascending';
      for (const other of headers) other.setAttribute('aria-sort', 'none');
      th.setAttribute('aria-sort', dir);

      const sign = dir === 'ascending' ? 1 : -1;
      const rows = [...body.rows];
      rows.sort((a, b) => {
        const av = sortValue(a, index);
        const bv = sortValue(b, index);
        const an = asNumber(av);
        const bn = asNumber(bv);
        if (an !== null && bn !== null) return sign * (an - bn);
        return sign * av.localeCompare(bv, 'en');
      });
      for (const row of rows) body.appendChild(row);
    };

    th.addEventListener('click', sort);
    th.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        sort();
      }
    });
  });
}

const RENDERERS = { scatter: renderScatter };

function boot() {
  for (const plot of document.querySelectorAll('.figure__plot[data-chart]')) {
    const script = plot.querySelector('script[type="application/json"]');
    if (!script) continue;
    const spec = JSON.parse(script.textContent);
    const render = RENDERERS[plot.dataset.chart];
    if (render) render(plot, spec);
  }
  for (const table of document.querySelectorAll('table.data')) {
    initSortableTable(table);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
