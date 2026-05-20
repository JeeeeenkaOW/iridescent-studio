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
import { defaults } from './defaults.js';
import { hexToVec3 } from '../../util/color.js';

const SHAPES = [
  { id: 0, label: 'Circle'  },
  { id: 1, label: 'Square'  },
  { id: 2, label: 'Diamond' },
  { id: 3, label: 'Ring'    },
];

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
        <div class="range-label"><span>Shape</span></div>
        <div class="segmented cols-4">
          ${SHAPES.map(s => `
            <button class="seg-btn ${s.id === d.material.shape ? 'active' : ''}" data-pc-shape="${s.id}">${s.label}</button>
          `).join('')}
        </div>
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

  let shape = d.material.shape;

  shapeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      shape = parseInt(btn.dataset.pcShape, 10);
      shapeBtns.forEach(b => b.classList.toggle('active', b === btn));
      uniforms.u_particleShape.value = shape;
      history?.push();
    });
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
      return {
        material: {
          baseColor:     base.value,
          density:       parseInt(den.value, 10),
          size:          parseInt(siz.value, 10) / 100,
          jitter:        parseInt(jit.value, 10) / 100,
          softness:      parseInt(sof.value, 10) / 100,
          shape,
          motionDrift:   parseInt(mdr.value, 10) / 100,
          motionRise:    parseInt(mri.value, 10) / 100,
          motionTwinkle: parseInt(mtw.value, 10) / 100,
          motionScatter: parseInt(msc.value, 10) / 100,
          hueShift:      parseInt(hue.value, 10) / 100,
        },
      };
    },
    restore(snap) {
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
      if (typeof m.shape === 'number') {
        shape = m.shape;
        shapeBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.pcShape, 10) === shape));
        uniforms.u_particleShape.value = shape;
      }
    },
  };
}
