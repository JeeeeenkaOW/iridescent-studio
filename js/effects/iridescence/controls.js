// =========================================================
// IRIDESCENCE EFFECT — controls
// =========================================================
// Renders inside an effect "card" provided by the Effects host —
// the host owns the enable toggle and the title bar; the effect
// only renders its inner controls.
//
import { defaults } from './defaults.js';
import { phaseFromHue } from './uniforms.js';

export function initControls({ host, uniforms, isEnabled, history }) {
  const d = defaults;

  host.innerHTML = `
    <div class="range-row">
      <div class="range-label"><span>Hue</span><span class="range-value" data-iri-hue-val>${d.hue}°</span></div>
      <input type="range" data-iri-hue min="0" max="360" step="1" value="${d.hue}">
    </div>
    <div class="range-row">
      <div class="range-label"><span>Intensity</span><span class="range-value" data-iri-int-val>${Math.round(d.intensity * 100)}%</span></div>
      <input type="range" data-iri-int min="0" max="100" step="1" value="${Math.round(d.intensity * 100)}">
    </div>
  `;

  const hueIn  = host.querySelector('[data-iri-hue]');
  const hueVal = host.querySelector('[data-iri-hue-val]');
  const intIn  = host.querySelector('[data-iri-int]');
  const intVal = host.querySelector('[data-iri-int-val]');

  // Local store of "slider value" intensity, separate from the
  // pushed uniform value — the enable toggle forces the uniform
  // to 0 when off but keeps the slider position.
  let intensity = d.intensity;

  function pushIntensity() {
    uniforms.u_iriIntensity.value = isEnabled() ? intensity : 0.0;
  }

  // Called by the Effects host when the enable toggle flips.
  function onEnabledChange() {
    intIn.disabled = !isEnabled();
    hueIn.disabled = !isEnabled();
    pushIntensity();
  }

  hueIn.addEventListener('input', (e) => {
    const hue = parseInt(e.target.value, 10);
    hueVal.textContent = hue + '°';
    uniforms.u_iriPhase.value.copy(phaseFromHue(hue));
    history?.push();
  });

  intIn.addEventListener('input', (e) => {
    intensity = parseInt(e.target.value, 10) / 100;
    intVal.textContent = e.target.value + '%';
    pushIntensity();
    history?.push();
  });

  // Initial state — disable inputs if effect starts off.
  onEnabledChange();

  return {
    onEnabledChange,
    snapshot() {
      return {
        intensity,
        hue:   parseInt(hueIn.value, 10),
        phase: uniforms.u_iriPhase.value.toArray(),
      };
    },
    restore(snap) {
      if (!snap) return;
      if (typeof snap.intensity === 'number') {
        intensity = snap.intensity;
        intIn.value = String(Math.round(snap.intensity * 100));
        intVal.textContent = Math.round(snap.intensity * 100) + '%';
      }
      if (typeof snap.hue === 'number') {
        hueIn.value = String(snap.hue);
        hueVal.textContent = snap.hue + '°';
        uniforms.u_iriPhase.value.copy(phaseFromHue(snap.hue));
      }
      pushIntensity();
    },
  };
}
