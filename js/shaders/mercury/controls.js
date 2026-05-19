// =========================================================
// MERCURY CONTROLS — sidebar UI specific to the Mercury shader
// =========================================================
// Mounts into `#shader-controls`, the host element provided by the
// top-level shader picker. Builds:
//
//   - Material section (Blinn-Phong):
//       · Base color
//       · Diffuse strength
//       · Specular strength
//       · Shininess
//   - Iridescence section:
//       · on/off toggle
//       · Hue slider (0..360°, rotates the cosine palette)
//       · Intensity slider
//
// All changes write to uniforms directly. No state is held here
// beyond what the DOM holds — the source of truth is the uniform
// values.
//
import { defaults } from './defaults.js';
import { phaseFromHue } from './uniforms.js';
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

      <div class="range-row">
        <div class="range-label"><span>Diffuse</span><span class="range-value" id="mc-mat-diffuse-val">${Math.round(d.material.diffuse * 100)}%</span></div>
        <input type="range" id="mc-mat-diffuse" min="0" max="100" step="1" value="${Math.round(d.material.diffuse * 100)}">
      </div>

      <div class="range-row">
        <div class="range-label"><span>Specular</span><span class="range-value" id="mc-mat-specular-val">${d.material.specular.toFixed(2)}</span></div>
        <input type="range" id="mc-mat-specular" min="0" max="300" step="1" value="${Math.round(d.material.specular * 100)}">
      </div>

      <div class="range-row">
        <div class="range-label"><span>Shininess</span><span class="range-value" id="mc-mat-shininess-val">${Math.round(d.material.shininess)}</span></div>
        <input type="range" id="mc-mat-shininess" min="1" max="128" step="1" value="${Math.round(d.material.shininess)}">
      </div>
    </div>

    <div class="div"></div>

    <div class="section">
      <div class="section-title">Iridescence</div>

      <div class="toggle-row">
        <label for="mc-iri-on">Enabled</label>
        <div class="toggle on" id="mc-iri-on"></div>
      </div>

      <div class="range-row">
        <div class="range-label"><span>Hue</span><span class="range-value" id="mc-iri-hue-val">0°</span></div>
        <input type="range" id="mc-iri-hue" min="0" max="360" step="1" value="0">
      </div>

      <div class="range-row">
        <div class="range-label"><span>Intensity</span><span class="range-value" id="mc-iri-intensity-val">${Math.round(d.iridescence.intensity * 100)}%</span></div>
        <input type="range" id="mc-iri-intensity" min="0" max="100" step="1" value="${Math.round(d.iridescence.intensity * 100)}">
      </div>
    </div>
  `;

  // ---------- Material ----------
  const matBase     = host.querySelector('#mc-mat-base');
  const matBaseHex  = host.querySelector('#mc-mat-base-hex');
  const matDiffuse  = host.querySelector('#mc-mat-diffuse');
  const matDiffVal  = host.querySelector('#mc-mat-diffuse-val');
  const matSpec     = host.querySelector('#mc-mat-specular');
  const matSpecVal  = host.querySelector('#mc-mat-specular-val');
  const matShin     = host.querySelector('#mc-mat-shininess');
  const matShinVal  = host.querySelector('#mc-mat-shininess-val');

  matBase.addEventListener('input', (e) => {
    matBaseHex.textContent = e.target.value.toUpperCase();
    uniforms.u_baseColor.value.copy(hexToVec3(e.target.value));
  });

  matDiffuse.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 100;
    matDiffVal.textContent = e.target.value + '%';
    uniforms.u_diffuse.value = v;
  });

  matSpec.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 100;   // 0..3
    matSpecVal.textContent = v.toFixed(2);
    uniforms.u_specular.value = v;
  });

  matShin.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10);
    matShinVal.textContent = String(v);
    uniforms.u_shininess.value = v;
  });

  // ---------- Iridescence ----------
  let iriOn = d.iridescence.enabled;
  let iriIntensitySlider = d.iridescence.intensity;

  const toggle       = host.querySelector('#mc-iri-on');
  const intensityIn  = host.querySelector('#mc-iri-intensity');
  const intensityVal = host.querySelector('#mc-iri-intensity-val');
  const hueIn        = host.querySelector('#mc-iri-hue');
  const hueVal       = host.querySelector('#mc-iri-hue-val');

  function pushIntensity() {
    uniforms.u_iriIntensity.value = iriOn ? iriIntensitySlider : 0.0;
  }

  toggle.addEventListener('click', () => {
    iriOn = !iriOn;
    toggle.classList.toggle('on', iriOn);
    intensityIn.disabled = !iriOn;
    hueIn.disabled = !iriOn;
    pushIntensity();
  });

  intensityIn.addEventListener('input', (e) => {
    iriIntensitySlider = parseInt(e.target.value, 10) / 100;
    intensityVal.textContent = e.target.value + '%';
    pushIntensity();
  });

  hueIn.addEventListener('input', (e) => {
    const hue = parseInt(e.target.value, 10);
    hueVal.textContent = hue + '°';
    uniforms.u_iriPhase.value.copy(phaseFromHue(hue));
  });

  // Return a snapshot getter for export/preset-save use.
  return {
    snapshot() {
      return {
        material: {
          baseColor: matBase.value,
          diffuse:   parseInt(matDiffuse.value, 10) / 100,
          specular:  parseInt(matSpec.value, 10) / 100,
          shininess: parseInt(matShin.value, 10),
        },
        iridescence: {
          enabled:   iriOn,
          intensity: iriIntensitySlider,
          hue:       parseInt(hueIn.value, 10),
          // Also snapshot the computed phase for export convenience.
          phase:     uniforms.u_iriPhase.value.toArray(),
        },
      };
    },
  };
}
