// =========================================================
// CERAMIC CONTROLS — sidebar UI specific to the Ceramic material
// =========================================================
// Material parameters only — lighting, iridescence, chromatic
// aberration are in the Effects panel.
//
//   Base color     — diffuse albedo of the porcelain body.
//   Inner glow     — subsurface scattering tint (warm by default).
//   Glow strength  — how strong the inner glow reads (0..100%).
//
import { defaults } from './defaults.js';
import { hexToVec3 } from '../../util/color.js';

export function initCeramicControls({ host, uniforms }) {
  const d = defaults;

  host.innerHTML = `
    <div class="section">
      <div class="section-title">Material</div>

      <div class="color-row">
        <span class="color-row-label">Base color</span>
        <div class="color-row-control">
          <input type="color" id="cc-mat-base" value="${d.material.baseColor}">
          <span class="color-row-hex" id="cc-mat-base-hex">${d.material.baseColor.toUpperCase()}</span>
        </div>
      </div>

      <div class="color-row">
        <span class="color-row-label">Inner glow</span>
        <div class="color-row-control">
          <input type="color" id="cc-mat-sss" value="${d.material.sssColor}">
          <span class="color-row-hex" id="cc-mat-sss-hex">${d.material.sssColor.toUpperCase()}</span>
        </div>
      </div>

      <div class="range-row">
        <div class="range-label"><span>Glow strength</span><span class="range-value" id="cc-mat-ss-val">${Math.round(d.material.sssStrength * 100)}%</span></div>
        <input type="range" id="cc-mat-ss" min="0" max="100" step="1" value="${Math.round(d.material.sssStrength * 100)}">
      </div>
    </div>
  `;

  const base    = host.querySelector('#cc-mat-base');
  const baseHex = host.querySelector('#cc-mat-base-hex');
  const sss     = host.querySelector('#cc-mat-sss');
  const sssHex  = host.querySelector('#cc-mat-sss-hex');
  const ssIn    = host.querySelector('#cc-mat-ss');
  const ssVal   = host.querySelector('#cc-mat-ss-val');

  base.addEventListener('input', (e) => {
    baseHex.textContent = e.target.value.toUpperCase();
    uniforms.u_baseColor.value.copy(hexToVec3(e.target.value));
  });

  sss.addEventListener('input', (e) => {
    sssHex.textContent = e.target.value.toUpperCase();
    uniforms.u_sssColor.value.copy(hexToVec3(e.target.value));
  });

  ssIn.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 100;
    ssVal.textContent = e.target.value + '%';
    uniforms.u_sssStrength.value = v;
  });

  return {
    snapshot() {
      return {
        material: {
          baseColor:    base.value,
          sssColor:     sss.value,
          sssStrength:  parseInt(ssIn.value, 10) / 100,
        },
      };
    },
  };
}
