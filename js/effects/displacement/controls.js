// =========================================================
// DISPLACEMENT EFFECT — controls
// =========================================================
// One slider only: Strength. The previous Scale and Speed sliders
// were dropped — they barely changed the perceived look and added
// clutter. Defaults (scale=3.0, speed=1.0) are used internally.
//
import { defaults } from './defaults.js';

export function initControls({ host, uniforms, isEnabled, history }) {
  const d = defaults;

  host.innerHTML = `
    <div class="range-row">
      <div class="range-label"><span>Strength</span><span class="range-value" data-disp-str-val>${Math.round(d.strength * 100)}%</span></div>
      <input type="range" data-disp-str min="0" max="100" step="1" value="${Math.round(d.strength * 100)}">
    </div>
  `;

  const strIn  = host.querySelector('[data-disp-str]');
  const strVal = host.querySelector('[data-disp-str-val]');

  // Lock scale and speed to defaults — they're now hidden constants
  // rather than user-tunable. Set once at mount.
  uniforms.u_dispScale.value = defaults.scale;
  uniforms.u_dispSpeed.value = defaults.speed;

  let strength = d.strength;

  // Slider 0..100% → uniform 0..0.10 in shader UV-offset space.
  // Bumped from 0.04 to 0.10 because at the previous scale the wobble
  // was too subtle to notice — especially with iridescence on, which
  // visually dominates and masked the small UV ripple. 0.10 gives a
  // clearly visible heat-haze at default 40%, dramatic warp at 100%.
  function pushStrength() {
    uniforms.u_dispStrength.value = isEnabled() ? strength * 0.10 : 0.0;
  }

  function onEnabledChange() {
    strIn.disabled = !isEnabled();
    pushStrength();
  }

  strIn.addEventListener('input', (e) => {
    strength = parseInt(e.target.value, 10) / 100;
    strVal.textContent = e.target.value + '%';
    pushStrength();
  });
  strIn.addEventListener('change', () => history?.push());

  onEnabledChange();

  return {
    onEnabledChange,
    snapshot() {
      return { strength };
    },
    restore(snap) {
      if (!snap) return;
      if (typeof snap.strength === 'number') {
        strength = snap.strength;
        strIn.value = String(Math.round(snap.strength * 100));
        strVal.textContent = Math.round(snap.strength * 100) + '%';
      }
      pushStrength();
    },
  };
}
