// =========================================================
// OBSIDIAN CONTROLS — sidebar UI specific to the Obsidian material
// =========================================================
// Material controls only — lighting, iridescence, chromatic aberration
// live in the Effects panel.
//
// Sliders:
//   Base color      — body colour
//   Accent color    — inner-glow tint (user controllable, defaults red)
//   Accent strength — how strong the inner glow reads (0..100%)
//   Refraction      — bg distortion at silhouette edges
//   Fresnel         — rim highlight intensity
//   Fresnel power   — rim sharpness (lower = wider, higher = thinner)
//
import { defaults } from './defaults.js';
import { hexToVec3 } from '../../util/color.js';

export function initObsidianControls({ host, uniforms }) {
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

      <div class="color-row">
        <span class="color-row-label">Accent color</span>
        <div class="color-row-control">
          <input type="color" id="ob-mat-accent" value="${d.material.accentColor}">
          <span class="color-row-hex" id="ob-mat-accent-hex">${d.material.accentColor.toUpperCase()}</span>
        </div>
      </div>

      <div class="range-row">
        <div class="range-label"><span>Accent strength</span><span class="range-value" id="ob-mat-acc-val">${Math.round(d.material.accentStrength * 100)}%</span></div>
        <input type="range" id="ob-mat-acc" min="0" max="100" step="1" value="${Math.round(d.material.accentStrength * 100)}">
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
    </div>
  `;

  const base    = host.querySelector('#ob-mat-base');
  const baseHex = host.querySelector('#ob-mat-base-hex');
  const acc     = host.querySelector('#ob-mat-accent');
  const accHex  = host.querySelector('#ob-mat-accent-hex');
  const accStr  = host.querySelector('#ob-mat-acc');
  const accStrV = host.querySelector('#ob-mat-acc-val');
  const ref     = host.querySelector('#ob-mat-ref');
  const refV    = host.querySelector('#ob-mat-ref-val');
  const fres    = host.querySelector('#ob-mat-fres');
  const fresV   = host.querySelector('#ob-mat-fres-val');
  const fp      = host.querySelector('#ob-mat-fp');
  const fpV     = host.querySelector('#ob-mat-fp-val');

  base.addEventListener('input', (e) => {
    baseHex.textContent = e.target.value.toUpperCase();
    uniforms.u_baseColor.value.copy(hexToVec3(e.target.value));
  });

  acc.addEventListener('input', (e) => {
    accHex.textContent = e.target.value.toUpperCase();
    uniforms.u_accentColor.value.copy(hexToVec3(e.target.value));
  });

  accStr.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 100;
    accStrV.textContent = e.target.value + '%';
    uniforms.u_accentStrength.value = v;
  });

  // Slider 0..100% maps to refraction 0..0.20 (same scale as Glass).
  ref.addEventListener('input', (e) => {
    const pct = parseInt(e.target.value, 10);
    refV.textContent = pct + '%';
    uniforms.u_refraction.value = (pct / 100) * 0.20;
  });

  fres.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 100;
    fresV.textContent = e.target.value + '%';
    uniforms.u_fresnel.value = v;
  });

  fp.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 10;
    fpV.textContent = v.toFixed(1);
    uniforms.u_fresnelPower.value = v;
  });

  return {
    snapshot() {
      return {
        material: {
          baseColor:      base.value,
          accentColor:    acc.value,
          accentStrength: parseInt(accStr.value, 10) / 100,
          refraction:     (parseInt(ref.value, 10) / 100) * 0.20,
          fresnel:        parseInt(fres.value, 10) / 100,
          fresnelPower:   parseInt(fp.value, 10) / 10,
        },
      };
    },
  };
}
