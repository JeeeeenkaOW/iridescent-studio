// =========================================================
// MERCURY CONTROLS — sidebar UI specific to the Mercury shader
// =========================================================
// Mounts into `#shader-controls`, the host element provided by the
// top-level shader picker. Builds:
//
//   - Iridescence section:
//       · on/off toggle
//       · color picker + color strength slider
//       · intensity slider
//       · phase quick-picks (Pearl/Gold/Oil/Arctic)
//   - Tint section (preserves the original tint behavior)
//
// All changes write to uniforms directly. No state is held here beyond
// what the DOM holds — the source of truth is the uniform values.
//
import { defaults, iridescencePhasePresets } from './defaults.js';
import { hexToVec3 } from '../../util/color.js';

export function initMercuryControls({ host, uniforms }) {
  host.innerHTML = `
    <div class="section">
      <div class="section-title">Iridescence</div>

      <div class="toggle-row">
        <label for="mc-iri-on">Enabled</label>
        <div class="toggle on" id="mc-iri-on"></div>
      </div>

      <div class="color-row">
        <span class="color-row-label">Color</span>
        <div class="color-row-control">
          <input type="color" id="mc-iri-color" value="${defaults.iridescence.color}">
          <span class="color-row-hex" id="mc-iri-color-hex">${defaults.iridescence.color}</span>
        </div>
      </div>

      <div class="range-row">
        <div class="range-label"><span>Color strength</span><span class="range-value" id="mc-iri-color-strength-val">0%</span></div>
        <input type="range" id="mc-iri-color-strength" min="0" max="100" step="1" value="0">
      </div>

      <div class="range-row">
        <div class="range-label"><span>Intensity</span><span class="range-value" id="mc-iri-intensity-val">100%</span></div>
        <input type="range" id="mc-iri-intensity" min="0" max="100" step="1" value="100">
      </div>

      <div class="section-title" style="margin-top:8px">Iridescence preset</div>
      <div class="segmented cols-4" id="mc-iri-phase">
        ${iridescencePhasePresets.map((p, i) => `
          <button class="seg-btn${i === 0 ? ' active' : ''}" data-id="${p.id}">${p.name}</button>
        `).join('')}
      </div>
    </div>

    <div class="div"></div>

    <div class="section">
      <div class="section-title">Tint</div>
      <div class="color-row">
        <span class="color-row-label">Color</span>
        <div class="color-row-control">
          <input type="color" id="mc-tint-color" value="${defaults.tint.color}">
          <span class="color-row-hex" id="mc-tint-hex">${defaults.tint.color}</span>
        </div>
      </div>
      <div class="range-row">
        <div class="range-label"><span>Strength</span><span class="range-value" id="mc-tint-strength-val">0%</span></div>
        <input type="range" id="mc-tint-strength" min="0" max="100" step="1" value="0">
      </div>
    </div>
  `;

  // ---------- Iridescence on/off ----------
  let iriOn = defaults.iridescence.enabled;
  let iriIntensitySlider = defaults.iridescence.intensity;   // last slider position (0..1)

  const toggle = host.querySelector('#mc-iri-on');
  const intensityInput = host.querySelector('#mc-iri-intensity');
  const intensityVal = host.querySelector('#mc-iri-intensity-val');

  function pushIntensity() {
    uniforms.u_iriIntensity.value = iriOn ? iriIntensitySlider : 0.0;
  }

  toggle.addEventListener('click', () => {
    iriOn = !iriOn;
    toggle.classList.toggle('on', iriOn);
    intensityInput.disabled = !iriOn;
    pushIntensity();
  });

  intensityInput.addEventListener('input', (e) => {
    iriIntensitySlider = parseInt(e.target.value, 10) / 100;
    intensityVal.textContent = e.target.value + '%';
    pushIntensity();
  });

  // ---------- Iridescence color tint ----------
  const iriColorInput = host.querySelector('#mc-iri-color');
  const iriColorHex   = host.querySelector('#mc-iri-color-hex');
  const iriColorStr   = host.querySelector('#mc-iri-color-strength');
  const iriColorStrVal = host.querySelector('#mc-iri-color-strength-val');

  iriColorInput.addEventListener('input', (e) => {
    iriColorHex.textContent = e.target.value.toUpperCase();
    uniforms.u_iriColor.value.copy(hexToVec3(e.target.value));
  });
  iriColorStr.addEventListener('input', (e) => {
    iriColorStrVal.textContent = e.target.value + '%';
    uniforms.u_iriColorStrength.value = parseInt(e.target.value, 10) / 100;
  });

  // ---------- Phase quick-picks ----------
  const phaseButtons = host.querySelectorAll('#mc-iri-phase .seg-btn');
  phaseButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      phaseButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const preset = iridescencePhasePresets.find(p => p.id === btn.dataset.id);
      if (preset) uniforms.u_iriPhase.value.set(...preset.phase);
    });
  });

  // ---------- Tint ----------
  const tintColor = host.querySelector('#mc-tint-color');
  const tintHex   = host.querySelector('#mc-tint-hex');
  const tintStr   = host.querySelector('#mc-tint-strength');
  const tintStrVal = host.querySelector('#mc-tint-strength-val');

  tintColor.addEventListener('input', (e) => {
    tintHex.textContent = e.target.value.toUpperCase();
    uniforms.u_tintColor.value.copy(hexToVec3(e.target.value));
  });
  tintStr.addEventListener('input', (e) => {
    tintStrVal.textContent = e.target.value + '%';
    uniforms.u_tintStrength.value = parseInt(e.target.value, 10) / 100;
  });

  // Return a snapshot getter for export/preset-save use.
  return {
    snapshot() {
      return {
        iridescence: {
          enabled:       iriOn,
          intensity:     iriIntensitySlider,
          phase:         uniforms.u_iriPhase.value.toArray(),
          color:         iriColorInput.value,
          colorStrength: parseInt(iriColorStr.value, 10) / 100,
        },
        tint: {
          color:    tintColor.value,
          strength: parseInt(tintStr.value, 10) / 100,
        },
      };
    },
  };
}
