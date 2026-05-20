// =========================================================
// MERCURY CONTROLS — sidebar UI specific to the Mercury material
// =========================================================
// Material parameters only — lighting, iridescence, chromatic
// aberration are in the Effects panel.
//
//   Base color       — the diffuse albedo of the silver.
//   Reflection color — F0 reflectance at normal incidence. For metals
//                      this is the colour the reflections inherit;
//                      Fresnel ramps it toward white at grazing angles.
//                      Slightly warm by default → warm-silver feel.
//
import { defaults } from './defaults.js';
import { hexToVec3 } from '../../util/color.js';

export function initMercuryControls({ host, uniforms, history }) {
  const d = defaults;

  host.innerHTML = `
    <div class="section">
      <div class="section-title">Material</div>

      <div class="color-row">
        <span class="color-row-label">Base color</span>
        <div class="color-row-control">
          <input type="color" id="mc-mat-base" value="${d.material.baseColor}">
          <span class="color-row-hex" id="mc-mat-base-hex">${d.material.baseColor.toUpperCase()}</span>
        </div>
      </div>

      <div class="color-row">
        <span class="color-row-label">Reflection color</span>
        <div class="color-row-control">
          <input type="color" id="mc-mat-f0" value="${d.material.f0Color}">
          <span class="color-row-hex" id="mc-mat-f0-hex">${d.material.f0Color.toUpperCase()}</span>
        </div>
      </div>
    </div>
  `;

  const matBase    = host.querySelector('#mc-mat-base');
  const matBaseHex = host.querySelector('#mc-mat-base-hex');
  const matF0      = host.querySelector('#mc-mat-f0');
  const matF0Hex   = host.querySelector('#mc-mat-f0-hex');

  matBase.addEventListener('input', (e) => {
    matBaseHex.textContent = e.target.value.toUpperCase();
    uniforms.u_baseColor.value.copy(hexToVec3(e.target.value));
    history?.push();
  });

  matF0.addEventListener('input', (e) => {
    matF0Hex.textContent = e.target.value.toUpperCase();
    uniforms.u_f0.value.copy(hexToVec3(e.target.value));
    history?.push();
  });

  return {
    snapshot() {
      return {
        material: {
          baseColor: matBase.value,
          f0Color:   matF0.value,
        },
      };
    },
    restore(snap) {
      if (!snap?.material) return;
      const m = snap.material;
      if (typeof m.baseColor === 'string') {
        matBase.value = m.baseColor;
        matBaseHex.textContent = m.baseColor.toUpperCase();
        uniforms.u_baseColor.value.copy(hexToVec3(m.baseColor));
      }
      if (typeof m.f0Color === 'string') {
        matF0.value = m.f0Color;
        matF0Hex.textContent = m.f0Color.toUpperCase();
        uniforms.u_f0.value.copy(hexToVec3(m.f0Color));
      }
    },
  };
}
