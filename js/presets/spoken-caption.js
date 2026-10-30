/* Preset: Spoken Caption — talking-head captions that land phrase by phrase, the way short-form
 * edits caption speech: two to four words at a time, cut in on the word, sitting beside the
 * speaker instead of in a subtitle bar.
 *
 * Craft notes
 *  - Each line of the text is one spoken phrase. Phrases share the loop in order: equally, or
 *    by length so long phrases stay up longer (reading time follows speech).
 *  - Captions cut in (no fade), with an optional 2–4 frame accent: a small pop, a focus snap
 *    or a short slide. A gap at the end of each slot leaves a beat of clean picture.
 *  - Placement: on the anchor, scattered around it (seeded, stable), or alternating sides of
 *    it, so captions can hug the person speaking.
 *  - Gradient map: the letters are filled with what lies beneath them (background and lower
 *    layers), mapped by luminance through two colours: dark areas become the light ink, bright
 *    areas the tint. Over footage the type carries the picture's texture, white over shadows
 *    and teal over highlights, so it sits in the shot instead of on top of it.
 *  - To tuck captions behind the speaker, put a cut-out of the person on a layer above, or use
 *    a matte in your editor; the caption layer itself stays clean alpha.
 */
(function (TM) {
  'use strict';
  const { clamp } = TM.math;

  // Demo footage for the preview: 4 s of a Pexels clip (6878215, free to use) packed as a
  // sprite sheet, so every render (preview, export, embed) draws the same frame for a time.
  const SPRITE = { cols: 8, rows: 5, fw: 640, fh: 360, fps: 10, frames: 40, focusX: 0.4 };
  let IMG = null, READY = null;
  function loadBackdrop() {
    if (READY) return READY;
    if (typeof Image === 'undefined') return (READY = Promise.resolve(null));
    const base = (typeof window !== 'undefined' && window.TM_MANIFEST && window.TM_MANIFEST.base) || './';
    IMG = new Image();
    IMG.crossOrigin = 'anonymous';
    READY = new Promise((res) => { IMG.onload = () => res(IMG); IMG.onerror = () => { IMG = null; res(null); }; });
    IMG.src = new URL('assets/caption-backdrop.jpg', new URL(base, location.href)).href;
    return READY;
  }
  loadBackdrop();

  /** Draw the backdrop frame for time t, cover-fitted, then darken it. */
  function drawBackdrop(f, P) {
    if (!IMG || !IMG.complete || !IMG.naturalWidth) return false;
    const S = SPRITE, n = Math.floor(f.t * S.fps) % S.frames;
    const sx = (n % S.cols) * S.fw, sy = Math.floor(n / S.cols) * S.fh;
    const k = Math.max(f.W / S.fw, f.H / S.fh), dw = S.fw * k, dh = S.fh * k;
    const dx = clamp(f.W / 2 - S.focusX * dw, f.W - dw, 0), dy = (f.H - dh) / 2;
    const ctx = f.ctx;
    f.identity();
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(IMG, sx, sy, S.fw, S.fh, dx, dy, dw, dh);
    if (P.backdropDim > 0) { ctx.fillStyle = `rgba(0,0,0,${P.backdropDim})`; ctx.fillRect(0, 0, f.W, f.H); }
    ctx.restore();
    return true;
  }

  /** Two-colour gradient map of `src` over the rect, by luminance. Returns a canvas or null. */
  function mapRect(f, P, src, x0, y0, bw, bh) {
    let img;
    try { img = src.getImageData(x0, y0, bw, bh); } catch (e) { return null; } // tainted canvas
    const a = TM.color.parse(P.mapDark), b = TM.color.parse(P.mapLight), k = P.mapContrast, pivot = P.mapBalance;
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const al = d[i + 3] / 255;
      const lum = al * (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      const t = clamp((lum - pivot) * k + 0.5, 0, 1);
      d[i] = a.r + (b.r - a.r) * t; d[i + 1] = a.g + (b.g - a.g) * t; d[i + 2] = a.b + (b.b - a.b) * t; d[i + 3] = 255;
    }
    const buf = f.buffer('spoken-map', bw, bh);
    buf.ctx.putImageData(img, 0, 0);
    return buf;
  }

  /** The rect around a phrase that the gradient map has to cover. */
  function rectFor(f, x, y, w) {
    const pad = f.size * 0.6;
    const x0 = Math.max(0, Math.floor(x - w / 2 - pad)), y0 = Math.max(0, Math.floor(y - f.size * 1.4));
    const x1 = Math.min(f.W, Math.ceil(x + w / 2 + pad)), y1 = Math.min(f.H, Math.ceil(y + f.size * 1.4));
    return { x0, y0, bw: x1 - x0, bh: y1 - y0 };
  }

  TM.registerPreset({
    id: 'spoken-caption',
    name: 'Spoken Caption',
    category: 'Reveal',
    description: 'Speech captions that cut in phrase by phrase beside the speaker, filled with a gradient map of what lies beneath them. One line per phrase.',
    fit: false,
    prefers: { family: 'Inter Tight', weight: 800 },
    looks: [
      { name: 'Hearing room', bg: { type: 'radial', color: '#3a4a4c', color2: '#07090a' },
        layer: { font: { family: 'Inter Tight', weight: 800 }, type: { size: 0.075, case: 'upper', tracking: 0 },
          fill: { type: 'solid', color: '#f4f6f5' }, params: { backdrop: 'footage', fillMode: 'map', mapDark: '#f4f6f6', mapLight: '#2a7680', mapBalance: 0.22, mapContrast: 2.2, placement: 'scatter', spread: 0.1 }, anchor: { x: 0.68, y: 0.42 } } },
      { name: 'Warm grade', bg: { type: 'radial', color: '#4a3424', color2: '#0a0705' },
        layer: { font: { family: 'Inter Tight', weight: 800 }, type: { size: 0.075, case: 'upper' },
          fill: { type: 'solid', color: '#fff6ea' }, params: { backdrop: 'footage', fillMode: 'map', mapDark: '#fff6ea', mapLight: '#b5602a', mapBalance: 0.22, mapContrast: 2.2, placement: 'scatter', spread: 0.1 }, anchor: { x: 0.68, y: 0.42 } } },
      { name: 'Clean subtitle', bg: { type: 'solid', color: '#0b0b0c' },
        layer: { font: { family: 'Inter Tight', weight: 700 }, type: { size: 0.065, case: 'none' },
          fill: { type: 'solid', color: '#ffffff' }, params: { backdrop: 'none', fillMode: 'solid', placement: 'anchor', entry: 'cut' } } },
    ],
    params: [
      TM.P.select('pace', 'Pacing', [['length', 'By phrase length'], ['equal', 'Equal']], 'length', { group: 'Timing', hint: 'Long phrases stay up longer' }),
      TM.P.range('gap', 'Gap between phrases', 0, 0.4, 0.01, 0.06, { group: 'Timing', hint: 'Share of each slot left empty' }),
      TM.P.select('entry', 'Entry', [['cut', 'Hard cut'], ['pop', 'Pop'], ['focus', 'Focus snap'], ['slide', 'Slide']], 'pop', { group: 'Timing' }),
      TM.P.range('entryDur', 'Entry length (s)', 0.03, 0.4, 0.01, 0.1, { group: 'Timing', showIf: { entry: ['pop', 'focus', 'slide'] } }),
      TM.P.select('placement', 'Placement', [['anchor', 'On the anchor'], ['scatter', 'Scatter near speaker'], ['sides', 'Alternate sides']], 'scatter', { group: 'Layout' }),
      TM.P.range('spread', 'Spread', 0, 0.5, 0.01, 0.16, { group: 'Layout', showIf: { placement: ['scatter', 'sides'] }, hint: 'How far phrases wander from the anchor' }),
      TM.P.select('backdrop', 'Preview backdrop', [['footage', 'Demo footage'], ['none', 'None (what is beneath)']], 'footage', { group: 'Backdrop', hint: 'A short talking-head clip to preview the gradient map on; switch off over your own footage' }),
      TM.P.range('backdropDim', 'Darken backdrop', 0, 0.8, 0.01, 0.25, { group: 'Backdrop', showIf: { backdrop: 'footage' }, hint: 'The gradient map reads best over darker footage' }),
      TM.P.select('fillMode', 'Fill', [['map', 'Gradient map (what is beneath)'], ['solid', 'Layer fill']], 'map', { group: 'Gradient map', hint: 'Shines over darker footage: letters read white with a tint where the picture is bright' }),
      TM.P.color('mapDark', 'Shadows become', '#f4f6f6', { group: 'Gradient map', showIf: { fillMode: 'map' } }),
      TM.P.color('mapLight', 'Highlights become', '#2a7680', { group: 'Gradient map', showIf: { fillMode: 'map' } }),
      TM.P.range('mapBalance', 'Balance', 0.05, 0.95, 0.01, 0.5, { group: 'Gradient map', showIf: { fillMode: 'map' }, hint: 'Brightness where the two colours meet: lower it for dark footage' }),
      TM.P.range('mapContrast', 'Contrast', 0.5, 3, 0.01, 1.4, { group: 'Gradient map', showIf: { fillMode: 'map' }, hint: 'Steeper ramp between the two colours' }),
    ],

    assets(layer) { return layer.params && layer.params.backdrop === 'none' ? null : loadBackdrop(); },

    setup(f) {
      const P = f.params;
      const lines = f.layout.lines.filter((l) => l.text.trim().length);
      const weights = lines.map((l) => (P.pace === 'equal' ? 1 : 2 + TM.text.graphemes(l.text.trim()).length));
      const total = weights.reduce((a, b) => a + b, 0) || 1;
      let acc = 0;
      const slots = lines.map((l, i) => {
        const a = acc / total; acc += weights[i];
        const b = acc / total;
        // Seeded spot for this phrase, in frame fractions around the anchor.
        let dx = 0, dy = 0;
        if (P.placement === 'scatter') { dx = f.srand(i, 11) * P.spread; dy = f.srand(i, 12) * P.spread * 0.6; }
        else if (P.placement === 'sides') { dx = (i % 2 ? 1 : -1) * P.spread * (0.6 + 0.4 * f.rand(i, 13)); dy = f.srand(i, 14) * P.spread * 0.25; }
        return { line: l, a, b, dx, dy };
      });
      return { slots };
    },

    render(f) {
      const P = f.params, slots = f.cache.slots;
      if (!slots.length) return;
      const p = f.p;
      const s = slots.find((k) => p >= k.a && p < k.b) || slots[slots.length - 1];
      const len = s.b - s.a;
      const local = (p - s.a) / len;                 // 0..1 within the slot
      if (local > 1 - P.gap) return;                 // the clean beat at the end of the slot
      const tSec = local * len * f.dur;
      const k = P.entry === 'cut' ? 1 : clamp(tSec / Math.max(0.001, P.entryDur), 0, 1);
      const e = TM.ease('outCubic')(k);
      const x = f.cx + s.dx * f.W, y = f.cy + s.dy * f.H;
      const o = { x, y };
      if (P.entry === 'pop') o.scale = 1.08 - 0.08 * e;
      if (P.entry === 'slide') o.y = y + (1 - e) * f.size * 0.35;

      const draw = () => {
        if (P.entry === 'focus' && k < 1) {
          // Focus snap: a couple of soft offset copies collapse onto the sharp line.
          const r = (1 - e) * f.size * 0.08;
          for (const [ox, oy] of [[-r, 0], [r, 0], [0, -r * 0.6], [0, r * 0.6]]) f.drawLine(s.line, { x: x + ox, y: o.y + oy, alpha: 0.18 * (1 - e) });
          f.drawLine(s.line, { x, y, alpha: 0.35 + 0.65 * e });
        } else {
          f.drawLine(s.line, o);
        }
      };
      const ctx = f.ctx;
      const R = rectFor(f, x, o.y, s.line.width * (o.scale || 1));
      const backdrop = P.backdrop === 'footage' && f.echo === 0 && drawBackdrop(f, P);
      if (backdrop) {
        // The layer carries its own footage: draw the phrase as a mask, fill it with the
        // gradient-mapped footage under it, and lay that over the footage.
        const tb = f.buffer('spoken-text');
        f.drawInto(tb.ctx, draw);
        f.identity();
        if (P.fillMode === 'map' && R.bw > 0 && R.bh > 0) {
          const m = mapRect(f, P, ctx, R.x0, R.y0, R.bw, R.bh);
          if (m) {
            m.ctx.save();
            m.ctx.setTransform(1, 0, 0, 1, 0, 0);
            m.ctx.globalCompositeOperation = 'destination-in';
            m.ctx.drawImage(tb.canvas, -R.x0, -R.y0);
            m.ctx.restore();
            ctx.save(); ctx.globalAlpha = 1; ctx.drawImage(m.canvas, R.x0, R.y0); ctx.restore();
            return;
          }
        }
        ctx.save(); ctx.globalAlpha = 1; ctx.drawImage(tb.canvas, 0, 0); ctx.restore();
        return;
      }
      draw();
      if (P.fillMode === 'map' && f.echo === 0 && R.bw > 0 && R.bh > 0) {
        // Fill the ink just drawn with what lies beneath the layer (background, lower layers).
        const m = mapRect(f, P, f.renderer && f.renderer.ctx, R.x0, R.y0, R.bw, R.bh);
        if (m) { f.identity(); ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = 1; ctx.drawImage(m.canvas, R.x0, R.y0); ctx.restore(); }
      }
    },
  });
})(window.TM);
