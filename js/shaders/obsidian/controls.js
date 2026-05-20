// =========================================================
// OBSIDIAN CONTROLS — sidebar UI specific to the Obsidian material
// =========================================================
// Material controls only — lighting, iridescence, chromatic aberration
// live in the Effects panel.
//
// Sliders:
//   Base color    — body colour
//   Refraction    — bg distortion at silhouette edges
//   Fresnel       — rim highlight intensity
//   Fresnel power — rim sharpness (lower = wider, higher = thinner)
//   Roughness     — surface micro-perturbation (0 = smooth clearcoat,
//                   high = stippled volcanic glass)
//
import { defaults } from './defaults.js';
import { hexToVec3 } from '../../util/color.js';

export function initObsidianControls({ host, uniforms, history }) {
  const d = defaults;

  host.innerHTML = `
    <div class="section">
      <div class="section-title">Material</div>

      <div class="color-row">
        <span class="color-row-label">Base color</span>
        <div class="color-row-control">
          <input type="color" id="ob-mat-base" value="${d.material.baseColor}">
          <span class="color-row-hex" id="ob-mat-base-hex">${d.material.baseColor.toUpperCase()}</span>
        </div>
      </div>

      <div class="range-row">
        <div class="range-label"><span>Refraction</span><span class="range-value" id="ob-mat-ref-val">${Math.round(d.material.refraction * 500)}%</span></div>
        <input type="range" id="ob-mat-ref" min="0" max="100" step="1" value="${Math.round(d.material.refraction * 500)}">
      </div>

      <div class="range-row">
        <div class="range-label"><span>Fresnel</span><span class="range-value" id="ob-mat-fres-val">${Math.round(d.material.fresnel * 100)}%</span></div>
        <input type="range" id="ob-mat-fres" min="0" max="100" step="1" value="${Math.round(d.material.fresnel * 100)}">
      </div>

      <div class="range-row">
        <div class="range-label"><span>Fresnel power</span><span class="range-value" id="ob-mat-fp-val">${d.material.fresnelPower.toFixed(1)}</span></div>
        <input type="range" id="ob-mat-fp" min="10" max="80" step="1" value="${Math.round(d.material.fresnelPower * 10)}">
      </div>

      <div class="range-row">
        <div class="range-label"><span>Roughness</span><span class="range-value" id="ob-mat-rough-val">${Math.round(d.material.roughness * 100)}%</span></div>
        <input type="range" id="ob-mat-rough" min="0" max="100" step="1" value="${Math.round(d.material.roughness * 100)}">
      </div>
    </div>
  `;

  const base     = host.querySelector('#ob-mat-base');
  const baseHex  = host.querySelector('#ob-mat-base-hex');
  const ref      = host.querySelector('#ob-mat-ref');
  const refV     = host.querySelector('#ob-mat-ref-val');
  const fres     = host.querySelector('#ob-mat-fres');
  const fresV    = host.querySelector('#ob-mat-fres-val');
  const fp       = host.querySelector('#ob-mat-fp');
  const fpV      = host.querySelector('#ob-mat-fp-val');
  const rough    = host.querySelector('#ob-mat-rough');
  const roughV   = host.querySelector('#ob-mat-rough-val');

  base.addEventListener('input', (e) => {
    baseHex.textContent = e.target.value.toUpperCase();
    uniforms.u_baseColor.value.copy(hexToVec3(e.target.value));
    history?.push();
  });

  // Slider 0..100% maps to refraction 0..0.20 (same scale as Glass).
  ref.addEventListener('input', (e) => {
    const pct = parseInt(e.target.value, 10);
    refV.textContent = pct + '%';
    uniforms.u_refraction.value = (pct / 100) * 0.20;
    history?.push();
  });

  fres.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 100;
    fresV.textContent = e.target.value + '%';
    uniforms.u_fresnel.value = v;
    history?.push();
  });

  fp.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 10;
    fpV.textContent = v.toFixed(1);
    uniforms.u_fresnelPower.value = v;
    history?.push();
  });

  rough.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 100;
    roughV.textContent = e.target.value + '%';
    uniforms.u_roughness.value = v;
    history?.push();
  });

  return {
    snapshot() {
      return {
        material: {
          baseColor:        base.value,
          refractionSlider: parseInt(ref.value, 10),
          refraction:       (parseInt(ref.value, 10) / 100) * 0.20,
          fresnel:          parseInt(fres.value, 10) / 100,
          fresnelPower:     parseInt(fp.value, 10) / 10,
          roughness:        parseInt(rough.value, 10) / 100,
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
      if (typeof m.refraction === 'number') {
        const pct = typeof m.refractionSlider === 'number'
          ? m.refractionSlider
          : Math.round((m.refraction / 0.20) * 100);
        ref.value = String(pct);
        refV.textContent = pct + '%';
        uniforms.u_refraction.value = m.refraction;
      }
      if (typeof m.fresnel === 'number') {
        const pct = Math.round(m.fresnel * 100);
        fres.value = String(pct);
        fresV.textContent = pct + '%';
        uniforms.u_fresnel.value = m.fresnel;
      }
      if (typeof m.fresnelPower === 'number') {
        fp.value = String(Math.round(m.fresnelPower * 10));
        fpV.textContent = m.fresnelPower.toFixed(1);
        uniforms.u_fresnelPower.value = m.fresnelPower;
      }
      if (typeof m.roughness === 'number') {
        const pct = Math.round(m.roughness * 100);
        rough.value = String(pct);
        roughV.textContent = pct + '%';
        uniforms.u_roughness.value = m.roughness;
      }
    },
  };
}
