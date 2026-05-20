// =========================================================
// PARTICLES CONTROLS — sidebar UI
// =========================================================
// Mode selector + 4 sliders + 1 color picker. Mode is a segmented
// control because each mode is qualitatively different (dust/smoke/
// stars/fragments) — sliders wouldn't make sense.
//
// Sliders:
//   Density  — particles per width (20..150)
//   Size     — dot radius as fraction of cell (10..90%)
//   Jitter   — per-cell position randomness (0..100%)
//   Drift    — animation amplitude (0..100%)
//   Softness — dot edge softness (0..50%, in cell-units)
//
import { defaults } from './defaults.js';
import { hexToVec3 } from '../../util/color.js';

const MODES = [
  { id: 0, label: 'Dust'      },
  { id: 1, label: 'Smoke'     },
  { id: 2, label: 'Stars'     },
  { id: 3, label: 'Fragments' },
];

export function initParticlesControls({ host, uniforms, history }) {
  const d = defaults;

  host.innerHTML = `
      <div class="range-row">
        <div class="range-label"><span>Mode</span></div>
        <div class="segmented cols-4">
          ${MODES.map(m => `
            <button class="seg-btn ${m.id === d.material.mode ? 'active' : ''}" data-pc-mode="${m.id}">${m.label}</button>
          `).join('')}
        </div>
      </div>

      <div class="color-row">
        <span class="color-row-label">Base color</span>
        <div class="color-row-control">
          <input type="color" data-pc-base value="${d.material.baseColor}">
          <span class="color-row-hex" data-pc-base-hex>${d.material.baseColor.toUpperCase()}</span>
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
        <div class="range-label"><span>Drift</span><span class="range-value" data-pc-dri-val>${Math.round(d.material.drift * 100)}%</span></div>
        <input type="range" data-pc-dri min="0" max="100" step="1" value="${Math.round(d.material.drift * 100)}">
      </div>

      <div class="range-row">
        <div class="range-label"><span>Softness</span><span class="range-value" data-pc-sof-val>${Math.round(d.material.softness * 100)}%</span></div>
        <input type="range" data-pc-sof min="0" max="50" step="1" value="${Math.round(d.material.softness * 100)}">
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
  const dri     = host.querySelector('[data-pc-dri]');
  const driV    = host.querySelector('[data-pc-dri-val]');
  const sof     = host.querySelector('[data-pc-sof]');
  const sofV    = host.querySelector('[data-pc-sof-val]');
  const modeBtns = host.querySelectorAll('[data-pc-mode]');

  let mode = d.material.mode;

  // Mode buttons
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      mode = parseInt(btn.dataset.pcMode, 10);
      modeBtns.forEach(b => b.classList.toggle('active', b === btn));
      uniforms.u_particleMode.value = mode;
      history?.push();
    });
  });

  // Base color
  base.addEventListener('input', (e) => {
    baseHex.textContent = e.target.value.toUpperCase();
    uniforms.u_baseColor.value.copy(hexToVec3(e.target.value));
  });
  base.addEventListener('change', () => history?.push());

  // Sliders
  den.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10);
    denV.textContent = String(v);
    uniforms.u_particleDensity.value = v;
  });
  den.addEventListener('change', () => history?.push());

  siz.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 100;
    sizV.textContent = e.target.value + '%';
    uniforms.u_particleSize.value = v;
  });
  siz.addEventListener('change', () => history?.push());

  jit.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 100;
    jitV.textContent = e.target.value + '%';
    uniforms.u_particleJitter.value = v;
  });
  jit.addEventListener('change', () => history?.push());

  dri.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 100;
    driV.textContent = e.target.value + '%';
    uniforms.u_particleDrift.value = v;
  });
  dri.addEventListener('change', () => history?.push());

  sof.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 100;
    sofV.textContent = e.target.value + '%';
    uniforms.u_particleSoftness.value = v;
  });
  sof.addEventListener('change', () => history?.push());

  return {
    snapshot() {
      return {
        material: {
          baseColor:  base.value,
          density:    parseInt(den.value, 10),
          size:       parseInt(siz.value, 10) / 100,
          jitter:     parseInt(jit.value, 10) / 100,
          drift:      parseInt(dri.value, 10) / 100,
          softness:   parseInt(sof.value, 10) / 100,
          mode,
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
      if (typeof m.density === 'number') {
        den.value = String(m.density);
        denV.textContent = String(m.density);
        uniforms.u_particleDensity.value = m.density;
      }
      if (typeof m.size === 'number') {
        siz.value = String(Math.round(m.size * 100));
        sizV.textContent = Math.round(m.size * 100) + '%';
        uniforms.u_particleSize.value = m.size;
      }
      if (typeof m.jitter === 'number') {
        jit.value = String(Math.round(m.jitter * 100));
        jitV.textContent = Math.round(m.jitter * 100) + '%';
        uniforms.u_particleJitter.value = m.jitter;
      }
      if (typeof m.drift === 'number') {
        dri.value = String(Math.round(m.drift * 100));
        driV.textContent = Math.round(m.drift * 100) + '%';
        uniforms.u_particleDrift.value = m.drift;
      }
      if (typeof m.softness === 'number') {
        sof.value = String(Math.round(m.softness * 100));
        sofV.textContent = Math.round(m.softness * 100) + '%';
        uniforms.u_particleSoftness.value = m.softness;
      }
      if (typeof m.mode === 'number') {
        mode = m.mode;
        modeBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.pcMode, 10) === mode));
        uniforms.u_particleMode.value = mode;
      }
    },
  };
}
