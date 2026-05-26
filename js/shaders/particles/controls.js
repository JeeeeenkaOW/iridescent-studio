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
//   1 = diamond  — SDF
//   2 = custom   — silhouette of user-uploaded SVG, rasterized into
//                  u_particleSvg and sampled in the fragment shader.
//                  Clicking the "Custom" button opens a file picker;
//                  clicking it again (when an SVG is already loaded)
//                  re-opens the picker so the user can swap shapes.
//
import * as THREE from 'three';
import { defaults } from './defaults.js';
import { hexToVec3 } from '../../util/color.js';

const SHAPES = [
  { id: 0, label: 'Circle'  },
  { id: 1, label: 'Diamond' },
  { id: 2, label: 'Custom'  },
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
        <div class="segmented cols-3">
          ${SHAPES.map(s => `
            <button class="seg-btn ${s.id === d.material.shape ? 'active' : ''}" data-pc-shape="${s.id}">${s.label}</button>
          `).join('')}
        </div>
        <input type="file" data-pc-svg-input accept=".svg,image/svg+xml" style="display:none">
      </div>

      <div class="range-row">
        <div class="range-label"><span>Density</span><span class="range-value" data-pc-den-val>${d.material.density}</span></div>
        <input type="range" data-pc-den min="20" max="150" step="1" value="${d.material.density}">
      </div>

      <div class="range-row">
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

  let shape = d.material.shape;
  // Track the loaded SVG so we can restore session state across
  // history snapshots and preset switches.
  let customSvgText = null;
  let customSvgName = null;

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

  function refreshCustomNameLabel() {
    if (shape === 2 && customSvgName) {
      customName.textContent = customSvgName;
    } else {
      customName.textContent = '';
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

      shape = newShape;
      shapeBtns.forEach(b => b.classList.toggle('active', b === btn));
      uniforms.u_particleShape.value = shape;
      refreshCustomNameLabel();
      history?.push();
    });
  });

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

      if (typeof m.shape === 'number') {
        shape = m.shape;
        shapeBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.pcShape, 10) === shape));
        uniforms.u_particleShape.value = shape;
      }
      refreshCustomNameLabel();
    },
  };
}
