// =========================================================
// GLASS CONTROLS — sidebar UI specific to the Glass shader
// =========================================================
// Three sliders:
//
//   Transparency — opacity of the ornament (0 = solid white, 1 = full)
//   Refraction   — strength of the normal-driven background distortion
//   Frost        — blur radius applied to the refracted background
//
import { defaults } from './defaults.js';

export function initGlassControls({ host, uniforms }) {
  const d = defaults;

  host.innerHTML = `
    <div class="section">
      <div class="section-title">Glass</div>

      <div class="range-row">
        <div class="range-label"><span>Transparency</span><span class="range-value" id="gc-trans-val">${Math.round(d.material.transparency * 100)}%</span></div>
        <input type="range" id="gc-trans" min="0" max="100" step="1" value="${Math.round(d.material.transparency * 100)}">
      </div>

      <div class="range-row">
        <div class="range-label"><span>Refraction</span><span class="range-value" id="gc-refract-val">${Math.round(d.material.refraction * 500)}%</span></div>
        <input type="range" id="gc-refract" min="0" max="100" step="1" value="${Math.round(d.material.refraction * 500)}">
      </div>

      <div class="range-row">
        <div class="range-label"><span>Frost</span><span class="range-value" id="gc-frost-val">${Math.round(d.material.frost * 100)}%</span></div>
        <input type="range" id="gc-frost" min="0" max="100" step="1" value="${Math.round(d.material.frost * 100)}">
      </div>
    </div>
  `;

  const transIn  = host.querySelector('#gc-trans');
  const transVal = host.querySelector('#gc-trans-val');
  const refIn    = host.querySelector('#gc-refract');
  const refVal   = host.querySelector('#gc-refract-val');
  const frostIn  = host.querySelector('#gc-frost');
  const frostVal = host.querySelector('#gc-frost-val');

  transIn.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 100;
    transVal.textContent = e.target.value + '%';
    uniforms.u_transparency.value = v;
  });

  // Slider is 0..100% but max refraction (full distortion) is 0.20 in
  // shader space. Scale by 0.20 / 100.
  refIn.addEventListener('input', (e) => {
    const pct = parseInt(e.target.value, 10);
    refVal.textContent = pct + '%';
    uniforms.u_refraction.value = (pct / 100) * 0.20;
  });

  frostIn.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 100;
    frostVal.textContent = e.target.value + '%';
    uniforms.u_frost.value = v;
  });

  return {
    snapshot() {
      return {
        material: {
          transparency: parseInt(transIn.value, 10) / 100,
          refraction:   (parseInt(refIn.value, 10) / 100) * 0.20,
          frost:        parseInt(frostIn.value, 10) / 100,
        },
      };
    },
  };
}
