// =========================================================
// PARTICLES CONTROLS — sidebar UI
// =========================================================
// Top-level: Base color, Shape selector (segmented), Density, Size,
// Jitter, Softness — these define what each particle looks like.
// Then four MOTION sliders: Drift, Rise, Twinkle, Scatter — these
// are independent and combine to produce any animation.
//
// All four motions can be active at once. e.g. Drift + Twinkle =
// dust motes shimmering in the air. Rise + Twinkle = embers.
// Scatter alone = explosion. Default is mild Drift only.
//
// SHAPES (single-select):
//   0 = circle   — SDF
//   1 = square   — SDF (Chebyshev), crisp pixel look
//   2 = custom   — silhouette of user-uploaded SVG, rasterized into
//                  u_particleSvg and sampled in the fragment shader.
//                  Clicking the "Custom" button opens a file picker;
//                  clicking it again (when an SVG is already loaded)
//                  re-opens the picker so the user can swap shapes.
//   3 = sprites  — user-uploaded sprite sheet (PNG/WebP). The sheet
//                  is uploaded as a NEAREST-filtered texture so pixel
//                  art stays sharp. Sub-controls (visible only when
//                  this shape is active): grid cols × rows, color
//                  mode (silhouette / full color), assignment mode
//                  (random-stable / animated) and FPS for animated.
//                  Same always-open-picker behaviour as Custom.
//
import * as THREE from 'three';
import { defaults } from './defaults.js';
import { hexToVec3 } from '../../util/color.js';

const SHAPES = [
  { id: 0, label: 'Circle'  },
  { id: 1, label: 'Square'  },
  { id: 2, label: 'Custom'  },
  { id: 3, label: 'Sprites' },
];

// Rasterize an SVG document (as text) to a square Canvas, then return
// a Three.js CanvasTexture for use as a sampler. We render the SVG in
// pure white onto a transparent background so the GLSL alpha channel
// IS the silhouette — colors/fills in the source SVG are flattened.
//
// Size is chosen high enough that crisp edges survive any practical
// particle size, but small enough to stay cheap (a single 256² mip).
const PARTICLE_SVG_TEX_SIZE = 256;

async function rasterizeSvgToTexture(svgText) {
  // Force a white-only fill regardless of the source SVG's colors —
  // we want a silhouette mask, not a colored sprite. We inject a
  // <style> at the top that overrides fill/stroke on all elements.
  // The CSS specificity is fine because we add !important.
  const silhouetteCSS =
    `<style>*{fill:#fff !important;stroke:#fff !important;` +
    `fill-opacity:1 !important;stroke-opacity:1 !important;}</style>`;

  // Inject the style inside the first <svg ...> opening tag so it
  // applies to the whole document.
  let prepared = svgText.replace(
    /<svg\b[^>]*>/i,
    (match) => match + silhouetteCSS
  );
  // Fallback if no <svg> tag was found (shouldn't happen with valid
  // SVG, but be defensive).
  if (prepared === svgText) prepared = svgText;

  const blob = new Blob([prepared], { type: 'image/svg+xml' });
  const url  = URL.createObjectURL(blob);

  // Load via <img> so we can paint to a canvas. SVG aspect ratio is
  // preserved by scaling-to-fit inside the square canvas.
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error('Failed to load SVG as image'));
    img.src = url;
  });

  const size = PARTICLE_SVG_TEX_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  // Fit the SVG into the square, preserving aspect ratio, centred.
  // Use a tiny inset so the silhouette doesn't touch the edges.
  const inset = size * 0.04;
  const avail = size - inset * 2;
  const iw = img.naturalWidth  || size;
  const ih = img.naturalHeight || size;
  const scale = Math.min(avail / iw, avail / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (size - dw) / 2;
  const dy = (size - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);

  URL.revokeObjectURL(url);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS     = THREE.ClampToEdgeWrapping;
  tex.wrapT     = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

// Load a sprite-sheet file into a CanvasTexture.
//
// RASTER sheets (PNG/WebP/...): NEAREST-filtered — pixel art must stay
// sharp when a sprite cell is magnified to particle size; bilinear
// turns it to mush. Drawn at native resolution (capped at
// SPRITE_SHEET_MAX per side, decimated with smoothing OFF so a capped
// sheet still reads as pixels, not blur).
//
// SVG sheets: rasterized WITH their own colors kept (unlike the
// Custom shape, which forces a white silhouette) and UPSCALED — the
// vector is free resolution, so we scale until the short side reaches
// ~SPRITE_SVG_MIN_SIDE (capped at SPRITE_SVG_MAX_SIDE on the long
// side) to get decent per-cell detail out of thin strips. SVG sheets
// are LINEAR-filtered: a high-res rasterized vector sampled with
// NEAREST at small particle sizes shimmers during motion.
//
// Returns { tex, dataURL, smooth } — smooth records the filter choice
// so snapshot/restore and the HTML exporter reproduce it exactly.
const SPRITE_SHEET_MAX    = 2048;
const SPRITE_SVG_MIN_SIDE = 1024;
const SPRITE_SVG_MAX_SIDE = 4096;

async function loadSpriteSheetTexture(src, isSvgHint) {
  // src: File or dataURL string. isSvgHint forces the SVG path when
  // restoring isn't applicable (restore always gets a PNG dataURL —
  // the smooth flag is restored separately from the snapshot).
  let url, isSvg = !!isSvgHint;
  if (typeof src === 'string') {
    url = src;
    isSvg = isSvg || src.startsWith('data:image/svg');
  } else {
    isSvg = isSvg ||
      src.type === 'image/svg+xml' ||
      /\.svg$/i.test(src.name || '');
    // SVGs load via a blob with an explicit svg mime so the <img>
    // decoder treats them as such regardless of File metadata.
    const blob = isSvg
      ? new Blob([await src.text()], { type: 'image/svg+xml' })
      : src;
    url = URL.createObjectURL(blob);
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error('Failed to load sprite sheet image'));
    img.src = url;
  });
  if (typeof src !== 'string') URL.revokeObjectURL(url);

  // Some SVGs (viewBox-only) report 0 natural size — fall back square.
  const iw = img.naturalWidth  || (isSvg ? 1024 : 1);
  const ih = img.naturalHeight || (isSvg ? 1024 : 1);

  let scale;
  if (isSvg) {
    const up = Math.max(1, SPRITE_SVG_MIN_SIDE / Math.min(iw, ih));
    scale = Math.min(up, SPRITE_SVG_MAX_SIDE / Math.max(iw, ih));
  } else {
    scale = Math.min(1, SPRITE_SHEET_MAX / Math.max(iw, ih));
  }
  const w = Math.max(1, Math.round(iw * scale));
  const h = Math.max(1, Math.round(ih * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  // Smoothing ON for vector upscale (clean AA edges), OFF for raster
  // decimation (keep pixels pixels).
  ctx.imageSmoothingEnabled = isSvg;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  const smooth = isSvg;
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = smooth ? THREE.LinearFilter : THREE.NearestFilter;
  tex.magFilter = smooth ? THREE.LinearFilter : THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;

  const dataURL = canvas.toDataURL('image/png');
  const grid = detectSheetGrid(ctx, w, h);
  return { tex, dataURL, smooth, width: w, height: h, grid };
}

// Auto-detect the sheet's cols x rows from its alpha channel.
//
// Method: for each candidate count c in 2..32 (per axis), check that
// EVERY internal cell boundary (x = i*w/c) falls on a near-empty
// alpha column (within a small window). The finest grid whose
// boundaries are all clear wins. This is robust to gaps INSIDE a
// sprite (a glyph's internal whitespace doesn't align with all c-1
// boundaries unless the grid is real) and to anti-aliased gutters
// (threshold is relative, not exact-zero).
//
// Fallback for gutterless sheets (fully opaque pixel art): if no
// candidate validates on either axis, assume square cells when one
// dimension cleanly divides the other (e.g. a 1024x128 strip = 8x1).
//
// Returns { cols, rows } — a SUGGESTION the UI applies to the grid
// sliders; manual override always stays available.
function detectSheetGrid(ctx, w, h) {
  const data = ctx.getImageData(0, 0, w, h).data;
  const colSum = new Float64Array(w);
  const rowSum = new Float64Array(h);
  for (let y = 0; y < h; y++) {
    const base = y * w * 4;
    for (let x = 0; x < w; x++) {
      const a = data[base + x * 4 + 3];
      colSum[x] += a;
      rowSum[y] += a;
    }
  }

  function finestValid(sums, len) {
    // Mean alpha of non-empty lines — the reference for "near-empty".
    let total = 0, nonEmpty = 0;
    for (let i = 0; i < len; i++) {
      total += sums[i];
      if (sums[i] > 0) nonEmpty++;
    }
    if (nonEmpty === 0) return 1;
    const meanContent = total / nonEmpty;
    const thresh = meanContent * 0.01;

    for (let c = 32; c >= 2; c--) {
      const win = Math.max(1, Math.round((len / c) * 0.02));
      let ok = true;
      for (let i = 1; i < c && ok; i++) {
        const b = Math.round((i * len) / c);
        let m = Infinity;
        for (let k = Math.max(0, b - win); k <= Math.min(len - 1, b + win); k++) {
          m = Math.min(m, sums[k]);
        }
        if (m > thresh) ok = false;
      }
      if (ok) return c;
    }
    return 1;
  }

  let cols = finestValid(colSum, w);
  let rows = finestValid(rowSum, h);

  // Gutterless fallback: square-cell strips.
  if (cols === 1 && rows === 1) {
    if (w > h && w % h === 0) cols = Math.min(32, w / h);
    else if (h > w && h % w === 0) rows = Math.min(32, h / w);
  }
  return { cols, rows };
}

export function initParticlesControls({ host, uniforms, history }) {
  const d = defaults;

  host.innerHTML = `
      <div class="color-row">
        <span class="color-row-label">Base color</span>
        <div class="color-row-control">
          <input type="color" data-pc-base value="${d.material.baseColor}">
          <span class="color-row-hex" data-pc-base-hex>${d.material.baseColor.toUpperCase()}</span>
        </div>
      </div>

      <div class="range-row">
        <div class="range-label"><span>Hue shift</span><span class="range-value" data-pc-hue-val>${Math.round(d.material.hueShift * 100)}%</span></div>
        <input type="range" data-pc-hue min="0" max="100" step="1" value="${Math.round(d.material.hueShift * 100)}">
      </div>

      <div class="range-row">
        <div class="range-label"><span>Shape</span><span class="range-value" data-pc-custom-name></span></div>
        <div class="segmented cols-4">
          ${SHAPES.map(s => `
            <button class="seg-btn ${s.id === d.material.shape ? 'active' : ''}" data-pc-shape="${s.id}">${s.label}</button>
          `).join('')}
        </div>
        <input type="file" data-pc-svg-input accept=".svg,image/svg+xml" style="display:none">
        <input type="file" data-pc-sheet-input accept="image/png,image/webp,image/gif,image/jpeg,.svg,image/svg+xml" style="display:none">
      </div>

      <div data-pc-sprite-opts style="display:none">
        <div class="range-row">
          <div class="range-label"><span>Sheet columns</span><span class="range-value" data-pc-scols-val>${d.material.spriteCols}</span></div>
          <input type="range" data-pc-scols min="1" max="32" step="1" value="${d.material.spriteCols}">
        </div>
        <div class="range-row">
          <div class="range-label"><span>Sheet rows</span><span class="range-value" data-pc-srows-val>${d.material.spriteRows}</span></div>
          <input type="range" data-pc-srows min="1" max="32" step="1" value="${d.material.spriteRows}">
        </div>
        <div class="range-row">
          <div class="range-label"><span>Sprite size</span><span class="range-value" data-pc-sscale-val>${Math.round(d.material.spriteScale * 100)}%</span></div>
          <input type="range" data-pc-sscale min="10" max="400" step="1" value="${Math.round(d.material.spriteScale * 100)}">
        </div>
        <div class="range-row">
          <div class="range-label"><span>Sprite color</span></div>
          <div class="segmented cols-2">
            <button class="seg-btn ${d.material.spriteColorMode < 0.5 ? 'active' : ''}" data-pc-scolor="0">Silhouette</button>
            <button class="seg-btn ${d.material.spriteColorMode > 0.5 ? 'active' : ''}" data-pc-scolor="1">Full color</button>
          </div>
        </div>
        <div class="range-row">
          <div class="range-label"><span>Sprite mode</span></div>
          <div class="segmented cols-3">
            <button class="seg-btn ${d.material.spriteAssign === 0 ? 'active' : ''}" data-pc-sassign="0">Random</button>
            <button class="seg-btn ${d.material.spriteAssign === 1 ? 'active' : ''}" data-pc-sassign="1">Animated</button>
            <button class="seg-btn ${d.material.spriteAssign === 2 ? 'active' : ''}" data-pc-sassign="2">Anim rows</button>
          </div>
        </div>
        <div class="range-row" data-pc-sfps-row style="display:none">
          <div class="range-label"><span>Frame rate</span><span class="range-value" data-pc-sfps-val>${d.material.spriteFPS} fps</span></div>
          <input type="range" data-pc-sfps min="1" max="30" step="1" value="${d.material.spriteFPS}">
        </div>
      </div>

      <div class="range-row">
        <div class="range-label"><span>Density</span><span class="range-value" data-pc-den-val>${d.material.density}</span></div>
        <input type="range" data-pc-den min="20" max="150" step="1" value="${d.material.density}">
      </div>

      <div class="range-row" data-pc-size-row>
        <div class="range-label"><span>Size</span><span class="range-value" data-pc-siz-val>${Math.round(d.material.size * 100)}%</span></div>
        <input type="range" data-pc-siz min="10" max="90" step="1" value="${Math.round(d.material.size * 100)}">
      </div>

      <div class="range-row">
        <div class="range-label"><span>Jitter</span><span class="range-value" data-pc-jit-val>${Math.round(d.material.jitter * 100)}%</span></div>
        <input type="range" data-pc-jit min="0" max="100" step="1" value="${Math.round(d.material.jitter * 100)}">
      </div>

      <div class="range-row">
        <div class="range-label"><span>Softness</span><span class="range-value" data-pc-sof-val>${Math.round(d.material.softness * 100)}%</span></div>
        <input type="range" data-pc-sof min="0" max="50" step="1" value="${Math.round(d.material.softness * 100)}">
      </div>

      <div class="pc-motion-divider">Motion</div>

      <div class="range-row">
        <div class="range-label"><span>Drift</span><span class="range-value" data-pc-mdr-val>${Math.round(d.material.motionDrift * 100)}%</span></div>
        <input type="range" data-pc-mdr min="0" max="100" step="1" value="${Math.round(d.material.motionDrift * 100)}">
      </div>

      <div class="range-row">
        <div class="range-label"><span>Rise</span><span class="range-value" data-pc-mri-val>${Math.round(d.material.motionRise * 100)}%</span></div>
        <input type="range" data-pc-mri min="0" max="100" step="1" value="${Math.round(d.material.motionRise * 100)}">
      </div>

      <div class="range-row">
        <div class="range-label"><span>Twinkle</span><span class="range-value" data-pc-mtw-val>${Math.round(d.material.motionTwinkle * 100)}%</span></div>
        <input type="range" data-pc-mtw min="0" max="100" step="1" value="${Math.round(d.material.motionTwinkle * 100)}">
      </div>

      <div class="range-row">
        <div class="range-label"><span>Scatter</span><span class="range-value" data-pc-msc-val>${Math.round(d.material.motionScatter * 100)}%</span></div>
        <input type="range" data-pc-msc min="0" max="100" step="1" value="${Math.round(d.material.motionScatter * 100)}">
      </div>
  `;

  const base    = host.querySelector('[data-pc-base]');
  const baseHex = host.querySelector('[data-pc-base-hex]');
  const den     = host.querySelector('[data-pc-den]');
  const denV    = host.querySelector('[data-pc-den-val]');
  const siz     = host.querySelector('[data-pc-siz]');
  const sizV    = host.querySelector('[data-pc-siz-val]');
  const jit     = host.querySelector('[data-pc-jit]');
  const jitV    = host.querySelector('[data-pc-jit-val]');
  const sof     = host.querySelector('[data-pc-sof]');
  const sofV    = host.querySelector('[data-pc-sof-val]');
  const mdr     = host.querySelector('[data-pc-mdr]');
  const mdrV    = host.querySelector('[data-pc-mdr-val]');
  const mri     = host.querySelector('[data-pc-mri]');
  const mriV    = host.querySelector('[data-pc-mri-val]');
  const mtw     = host.querySelector('[data-pc-mtw]');
  const mtwV    = host.querySelector('[data-pc-mtw-val]');
  const msc     = host.querySelector('[data-pc-msc]');
  const mscV    = host.querySelector('[data-pc-msc-val]');
  const hue     = host.querySelector('[data-pc-hue]');
  const hueV    = host.querySelector('[data-pc-hue-val]');
  const shapeBtns = host.querySelectorAll('[data-pc-shape]');
  const svgInput   = host.querySelector('[data-pc-svg-input]');
  const customName = host.querySelector('[data-pc-custom-name]');
  const sheetInput  = host.querySelector('[data-pc-sheet-input]');
  const spriteOpts  = host.querySelector('[data-pc-sprite-opts]');
  const scols       = host.querySelector('[data-pc-scols]');
  const scolsV      = host.querySelector('[data-pc-scols-val]');
  const srows       = host.querySelector('[data-pc-srows]');
  const srowsV      = host.querySelector('[data-pc-srows-val]');
  const scolorBtns  = host.querySelectorAll('[data-pc-scolor]');
  const sassignBtns = host.querySelectorAll('[data-pc-sassign]');
  const sfpsRow     = host.querySelector('[data-pc-sfps-row]');
  const sfps        = host.querySelector('[data-pc-sfps]');
  const sfpsV       = host.querySelector('[data-pc-sfps-val]');
  const sscale      = host.querySelector('[data-pc-sscale]');
  const sscaleV     = host.querySelector('[data-pc-sscale-val]');
  const sizeRow     = host.querySelector('[data-pc-size-row]');

  let shape = d.material.shape;
  // Track the loaded SVG so we can restore session state across
  // history snapshots and preset switches.
  let customSvgText = null;
  let customSvgName = null;
  // Sprite-sheet state. dataURL is cached at load time (sheets can be
  // big — re-encoding per snapshot would be wasteful) and is the
  // restore + export source of truth.
  let spriteSheetDataURL = null;
  let spriteSheetName    = null;
  let spriteSheetSmooth  = false; // true = SVG-sourced, LINEAR-filtered
  let spriteSheetW = 1;
  let spriteSheetH = 1;
  let spriteColorMode = d.material.spriteColorMode;
  let spriteAssign    = d.material.spriteAssign;

  // Dispose the previous CanvasTexture before installing a new one,
  // to avoid GPU leaks when the user swaps SVGs repeatedly.
  function setCustomTexture(tex) {
    const prev = uniforms.u_particleSvg.value;
    if (prev && typeof prev.dispose === 'function') {
      prev.dispose();
    }
    uniforms.u_particleSvg.value = tex;
    uniforms.u_hasParticleSvg.value = 1.0;
  }

  // Same dispose-then-install pattern for the sprite sheet.
  function setSpriteTexture(tex) {
    const prev = uniforms.u_spriteSheet.value;
    if (prev && typeof prev.dispose === 'function') {
      prev.dispose();
    }
    uniforms.u_spriteSheet.value = tex;
    uniforms.u_hasSpriteSheet.value = 1.0;
  }

  function refreshCustomNameLabel() {
    if (shape === 2 && customSvgName) {
      customName.textContent = customSvgName;
    } else if (shape === 3 && spriteSheetName) {
      customName.textContent = spriteSheetName;
    } else {
      customName.textContent = '';
    }
  }

  // Sprite sub-controls only make sense when the Sprites shape is
  // active; the FPS row only when assignment is Animated.
  function refreshSpriteOptsVisibility() {
    spriteOpts.style.display = shape === 3 ? '' : 'none';
    // The shared Size slider has no effect on sprites (Sprite size is
    // the single authority there) — hide it to avoid two size knobs.
    sizeRow.style.display = shape === 3 ? 'none' : '';
    sfpsRow.style.display = spriteAssign > 0 ? '' : 'none';
  }

  async function loadSheetFile(file) {
    if (!file) return false;
    const isImage = /^image\//.test(file.type) || /\.svg$/i.test(file.name || '');
    if (!isImage) {
      alert('Please choose an image file (PNG/WebP/SVG) for the sprite sheet.');
      return false;
    }
    try {
      const { tex, dataURL, smooth, width, height, grid } = await loadSpriteSheetTexture(file);
      setSpriteTexture(tex);
      spriteSheetDataURL = dataURL;
      spriteSheetName = file.name;
      spriteSheetSmooth = smooth;
      spriteSheetW = width;
      spriteSheetH = height;
      uniforms.u_spriteSheetSize.value.set(width, height);
      // Apply the auto-detected grid to the sliders + uniform. Only
      // on a user-initiated upload — restore applies the snapshot's
      // explicit values instead. Sliders remain manual overrides.
      if (grid) {
        scols.value = String(grid.cols);
        scolsV.textContent = String(grid.cols);
        srows.value = String(grid.rows);
        srowsV.textContent = String(grid.rows);
        uniforms.u_spriteGrid.value.set(grid.cols, grid.rows);
      }
      return true;
    } catch (err) {
      console.error('Failed to load sprite sheet:', err);
      alert('Could not load that image. Try another file.');
      return false;
    }
  }

  async function loadSvgFile(file) {
    if (!file) return false;
    const lc = file.name.toLowerCase();
    const isSvg = lc.endsWith('.svg') || file.type === 'image/svg+xml';
    if (!isSvg) {
      alert('Please choose an SVG file for the particle shape.');
      return false;
    }
    try {
      const text = await file.text();
      const tex  = await rasterizeSvgToTexture(text);
      setCustomTexture(tex);
      customSvgText = text;
      customSvgName = file.name;
      return true;
    } catch (err) {
      console.error('Failed to load custom particle SVG:', err);
      alert('Could not parse that SVG. Try another file.');
      return false;
    }
  }

  shapeBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const newShape = parseInt(btn.dataset.pcShape, 10);

      // Custom button: always open the file picker on click. If the
      // user cancels, only switch to Custom if a previous SVG exists
      // (so a cancel never leaves the preview in an empty state).
      if (newShape === 2) {
        svgInput.value = ''; // allow re-picking same filename
        svgInput.click();
        // The file input's change handler does the actual switching
        // and history push, so we return here to avoid double-pushes.
        return;
      }

      // Sprites button: same always-open-picker behaviour as Custom.
      if (newShape === 3) {
        sheetInput.value = '';
        sheetInput.click();
        return;
      }

      shape = newShape;
      shapeBtns.forEach(b => b.classList.toggle('active', b === btn));
      uniforms.u_particleShape.value = shape;
      refreshCustomNameLabel();
      refreshSpriteOptsVisibility();
      history?.push();
    });
  });

  sheetInput.addEventListener('change', async () => {
    const file = sheetInput.files && sheetInput.files[0];
    if (!file) return;
    const ok = await loadSheetFile(file);
    if (!ok) return;
    shape = 3;
    shapeBtns.forEach(b =>
      b.classList.toggle('active', parseInt(b.dataset.pcShape, 10) === shape)
    );
    uniforms.u_particleShape.value = shape;
    refreshCustomNameLabel();
    refreshSpriteOptsVisibility();
    history?.push();
  });

  scolorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      spriteColorMode = parseInt(btn.dataset.pcScolor, 10);
      scolorBtns.forEach(b => b.classList.toggle('active', b === btn));
      uniforms.u_spriteColorMode.value = spriteColorMode;
      history?.push();
    });
  });

  sassignBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      spriteAssign = parseInt(btn.dataset.pcSassign, 10);
      sassignBtns.forEach(b => b.classList.toggle('active', b === btn));
      uniforms.u_spriteAssign.value = spriteAssign;
      refreshSpriteOptsVisibility();
      history?.push();
    });
  });

  // Grid sliders write directly into the vec2 uniform components.
  scols.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10);
    scolsV.textContent = String(v);
    uniforms.u_spriteGrid.value.x = v;
  });
  scols.addEventListener('change', () => history?.push());
  srows.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10);
    srowsV.textContent = String(v);
    uniforms.u_spriteGrid.value.y = v;
  });
  srows.addEventListener('change', () => history?.push());
  sfps.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10);
    sfpsV.textContent = v + ' fps';
    uniforms.u_spriteFPS.value = v;
  });
  sfps.addEventListener('change', () => history?.push());
  sscale.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10);
    sscaleV.textContent = v + '%';
    uniforms.u_spriteScale.value = v / 100;
  });
  sscale.addEventListener('change', () => history?.push());

  // Initial visibility (defaults may already be Sprites via restore).
  refreshSpriteOptsVisibility();

  svgInput.addEventListener('change', async () => {
    const file = svgInput.files && svgInput.files[0];
    if (!file) return;
    const ok = await loadSvgFile(file);
    if (!ok) return;
    // Switch to Custom shape now that an SVG is loaded.
    shape = 2;
    shapeBtns.forEach(b =>
      b.classList.toggle('active', parseInt(b.dataset.pcShape, 10) === shape)
    );
    uniforms.u_particleShape.value = shape;
    refreshCustomNameLabel();
    history?.push();
  });

  base.addEventListener('input', (e) => {
    baseHex.textContent = e.target.value.toUpperCase();
    uniforms.u_baseColor.value.copy(hexToVec3(e.target.value));
  });
  base.addEventListener('change', () => history?.push());

  function bindSlider(input, valEl, uniformName, divisor, suffix) {
    input.addEventListener('input', (e) => {
      const raw = parseInt(e.target.value, 10);
      const v = divisor ? raw / divisor : raw;
      valEl.textContent = suffix === '%' ? raw + '%' : (suffix ? v + suffix : String(raw));
      uniforms[uniformName].value = v;
    });
    input.addEventListener('change', () => history?.push());
  }
  bindSlider(den, denV, 'u_particleDensity',  null, '');
  bindSlider(siz, sizV, 'u_particleSize',     100,  '%');
  bindSlider(jit, jitV, 'u_particleJitter',   100,  '%');
  bindSlider(sof, sofV, 'u_particleSoftness', 100,  '%');
  bindSlider(mdr, mdrV, 'u_motionDrift',      100,  '%');
  bindSlider(mri, mriV, 'u_motionRise',       100,  '%');
  bindSlider(mtw, mtwV, 'u_motionTwinkle',    100,  '%');
  bindSlider(msc, mscV, 'u_motionScatter',    100,  '%');
  bindSlider(hue, hueV, 'u_particleHueShift', 100,  '%');

  return {
    snapshot() {
      // The custom-SVG dataURL is captured synchronously from the
      // currently installed CanvasTexture (if any). We keep BOTH the
      // SVG text (for re-rasterization on history restore) and the
      // raster PNG dataURL (for the Shader HTML exporter, which can't
      // run async work in its baking step).
      let customSvgDataURL = null;
      const tex = uniforms.u_particleSvg?.value;
      if (uniforms.u_hasParticleSvg?.value > 0.5 &&
          tex && tex.image instanceof HTMLCanvasElement) {
        try { customSvgDataURL = tex.image.toDataURL('image/png'); }
        catch (e) { customSvgDataURL = null; }
      }
      return {
        material: {
          baseColor:     base.value,
          density:       parseInt(den.value, 10),
          size:          parseInt(siz.value, 10) / 100,
          jitter:        parseInt(jit.value, 10) / 100,
          softness:      parseInt(sof.value, 10) / 100,
          shape,
          // Custom-SVG state — text is enough to re-rasterize on
          // restore; dataURL is used by the Shader HTML exporter.
          customSvgText: customSvgText,
          customSvgName: customSvgName,
          customSvgDataURL,
          // Sprite-sheet state. dataURL was cached at load time, so
          // this stays synchronous. Grid/mode values come from the
          // live inputs to match the slider-snapshot pattern above.
          spriteSheetDataURL: spriteSheetDataURL,
          spriteSheetName:    spriteSheetName,
          spriteSheetSmooth:  spriteSheetSmooth,
          spriteSheetW:       spriteSheetW,
          spriteSheetH:       spriteSheetH,
          spriteCols:      parseInt(scols.value, 10),
          spriteRows:      parseInt(srows.value, 10),
          spriteColorMode: spriteColorMode,
          spriteAssign:    spriteAssign,
          spriteFPS:       parseInt(sfps.value, 10),
          spriteScale:     parseInt(sscale.value, 10) / 100,
          motionDrift:   parseInt(mdr.value, 10) / 100,
          motionRise:    parseInt(mri.value, 10) / 100,
          motionTwinkle: parseInt(mtw.value, 10) / 100,
          motionScatter: parseInt(msc.value, 10) / 100,
          hueShift:      parseInt(hue.value, 10) / 100,
        },
      };
    },
    async restore(snap) {
      if (!snap?.material) return;
      const m = snap.material;
      if (typeof m.baseColor === 'string') {
        base.value = m.baseColor;
        baseHex.textContent = m.baseColor.toUpperCase();
        uniforms.u_baseColor.value.copy(hexToVec3(m.baseColor));
      }
      function restoreSlider(input, valEl, uniformName, val, divisor, suffix) {
        if (typeof val !== 'number') return;
        const raw = divisor ? Math.round(val * divisor) : Math.round(val);
        input.value = String(raw);
        valEl.textContent = suffix === '%' ? raw + '%' : (suffix ? val + suffix : String(raw));
        uniforms[uniformName].value = val;
      }
      restoreSlider(den, denV, 'u_particleDensity',  m.density,       null, '');
      restoreSlider(siz, sizV, 'u_particleSize',     m.size,          100,  '%');
      restoreSlider(jit, jitV, 'u_particleJitter',   m.jitter,        100,  '%');
      restoreSlider(sof, sofV, 'u_particleSoftness', m.softness,      100,  '%');
      restoreSlider(mdr, mdrV, 'u_motionDrift',      m.motionDrift,   100,  '%');
      restoreSlider(mri, mriV, 'u_motionRise',       m.motionRise,    100,  '%');
      restoreSlider(mtw, mtwV, 'u_motionTwinkle',    m.motionTwinkle, 100,  '%');
      restoreSlider(msc, mscV, 'u_motionScatter',    m.motionScatter, 100,  '%');
      restoreSlider(hue, hueV, 'u_particleHueShift', m.hueShift,      100,  '%');

      // Restore custom-SVG state if present. Re-rasterize from the
      // stored SVG text so the texture re-creates exactly. We do this
      // BEFORE setting shape so the no-SVG fallback never flickers.
      if (typeof m.customSvgText === 'string' && m.customSvgText.length > 0) {
        try {
          const tex = await rasterizeSvgToTexture(m.customSvgText);
          setCustomTexture(tex);
          customSvgText = m.customSvgText;
          customSvgName = m.customSvgName || 'custom.svg';
        } catch (err) {
          console.error('Failed to restore custom particle SVG:', err);
        }
      }

      // Restore sprite-sheet state if present — same before-shape
      // ordering so the circle fallback never flickers in.
      if (typeof m.spriteSheetDataURL === 'string' && m.spriteSheetDataURL.length > 0) {
        try {
          const { tex, dataURL, width, height } = await loadSpriteSheetTexture(m.spriteSheetDataURL);
          spriteSheetW = width;
          spriteSheetH = height;
          uniforms.u_spriteSheetSize.value.set(width, height);
          // The cached dataURL is always PNG (already rasterized), so
          // the loader can't infer the filter — re-apply it from the
          // snapshot flag.
          spriteSheetSmooth = !!m.spriteSheetSmooth;
          const f = spriteSheetSmooth ? THREE.LinearFilter : THREE.NearestFilter;
          tex.minFilter = f;
          tex.magFilter = f;
          tex.needsUpdate = true;
          setSpriteTexture(tex);
          spriteSheetDataURL = dataURL;
          spriteSheetName = m.spriteSheetName || 'sprites.png';
        } catch (err) {
          console.error('Failed to restore sprite sheet:', err);
        }
      }
      if (typeof m.spriteCols === 'number') {
        scols.value = String(m.spriteCols);
        scolsV.textContent = String(m.spriteCols);
        uniforms.u_spriteGrid.value.x = m.spriteCols;
      }
      if (typeof m.spriteRows === 'number') {
        srows.value = String(m.spriteRows);
        srowsV.textContent = String(m.spriteRows);
        uniforms.u_spriteGrid.value.y = m.spriteRows;
      }
      if (typeof m.spriteColorMode === 'number') {
        spriteColorMode = m.spriteColorMode;
        scolorBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.pcScolor, 10) === spriteColorMode));
        uniforms.u_spriteColorMode.value = spriteColorMode;
      }
      if (typeof m.spriteAssign === 'number') {
        spriteAssign = m.spriteAssign;
        sassignBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.pcSassign, 10) === spriteAssign));
        uniforms.u_spriteAssign.value = spriteAssign;
      }
      if (typeof m.spriteFPS === 'number') {
        sfps.value = String(m.spriteFPS);
        sfpsV.textContent = m.spriteFPS + ' fps';
        uniforms.u_spriteFPS.value = m.spriteFPS;
      }
      if (typeof m.spriteScale === 'number') {
        const pc = Math.round(m.spriteScale * 100);
        sscale.value = String(pc);
        sscaleV.textContent = pc + '%';
        uniforms.u_spriteScale.value = m.spriteScale;
      }

      if (typeof m.shape === 'number') {
        shape = m.shape;
        shapeBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.pcShape, 10) === shape));
        uniforms.u_particleShape.value = shape;
      }
      refreshCustomNameLabel();
      refreshSpriteOptsVisibility();
    },
  };
}
