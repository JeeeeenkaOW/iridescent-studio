// =========================================================
// MERCURY CONTROLS — sidebar UI specific to the Mercury material
// =========================================================
// Materials are pure now: the only material control Mercury exposes
// is the base colour. Lighting, iridescence, and chromatic aberration
// have moved to the Effects panel.
//
import { defaults } from './defaults.js';
import { hexToVec3 } from '../../util/color.js';

export function initMercuryControls({ host, uniforms }) {
  const d = defaults;

  host.innerHTML = `
    <div class="section">
      <div class="section-title">Material</div>

      <div class="color-row">
        <span class="color-row-label">Base color</span>
        <div class="color-row-control">
          <input type="color" id="mc-mat-base" value="${d.material.baseColor}">
          <span class="color-row-hex" id="mc-mat-base-hex">${d.material.baseColor}</span>
        </div>
      </div>
    </div>
  `;

  const matBase    = host.querySelector('#mc-mat-base');
  const matBaseHex = host.querySelector('#mc-mat-base-hex');

  matBase.addEventListener('input', (e) => {
    matBaseHex.textContent = e.target.value.toUpperCase();
    uniforms.u_baseColor.value.copy(hexToVec3(e.target.value));
  });

  return {
    snapshot() {
      return {
        material: {
          baseColor: matBase.value,
        },
      };
    },
  };
}
