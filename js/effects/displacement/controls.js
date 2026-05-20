// =========================================================
// DISPLACEMENT EFFECT — controls
// =========================================================
// Three sliders. The enable toggle is on the parent effect card
// (handled by /controls/effects.js); when off, this effect's
// u_dispStrength is forced to 0 — a clean no-op.
//
//   Strength — 0..100% (mapped to 0..0.04 UV offset)
//   Scale    — noise frequency (0.5..10.0, default 3.0)
//   Speed    — animation rate (0..3, default 1.0)
//
import { defaults } from './defaults.js';

export function initControls({ host, uniforms, isEnabled, history }) {
  const d = defaults;

  host.innerHTML = `
    <div class="range-row">
      <div class="range-label"><span>Strength</span><span class="range-value" data-disp-str-val>${Math.round(d.strength * 100)}%</span></div>
      <input type="range" data-disp-str min="0" max="100" step="1" value="${Math.round(d.strength * 100)}">
    </div>
    <div class="range-row">
      <div class="range-label"><span>Scale</span><span class="range-value" data-disp-scl-val>${d.scale.toFixed(1)}</span></div>
      <input type="range" data-disp-scl min="5" max="100" step="1" value="${Math.round(d.scale * 10)}">
    </div>
    <div class="range-row">
      <div class="range-label"><span>Speed</span><span class="range-value" data-disp-spd-val>${d.speed.toFixed(2)}</span></div>
      <input type="range" data-disp-spd min="0" max="300" step="1" value="${Math.round(d.speed * 100)}">
    </div>
  `;

  const strIn  = host.querySelector('[data-disp-str]');
  const strVal = host.querySelector('[data-disp-str-val]');
  const sclIn  = host.querySelector('[data-disp-scl]');
  const sclVal = host.querySelector('[data-disp-scl-val]');
  const spdIn  = host.querySelector('[data-disp-spd]');
  const spdVal = host.querySelector('[data-disp-spd-val]');

  // Local strength value; the actual uniform is gated by isEnabled().
  let strength = d.strength;

  function pushStrength() {
    // Slider 0..100% → uniform 0..0.04 in shader UV-offset space.
    uniforms.u_dispStrength.value = isEnabled() ? strength * 0.04 : 0.0;
  }

  function onEnabledChange() {
    strIn.disabled = !isEnabled();
    sclIn.disabled = !isEnabled();
    spdIn.disabled = !isEnabled();
    pushStrength();
  }

  strIn.addEventListener('input', (e) => {
    strength = parseInt(e.target.value, 10) / 100;
    strVal.textContent = e.target.value + '%';
    pushStrength();
  });
  strIn.addEventListener('change', () => history?.push());

  sclIn.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 10;
    sclVal.textContent = v.toFixed(1);
    uniforms.u_dispScale.value = v;
  });
  sclIn.addEventListener('change', () => history?.push());

  spdIn.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 100;
    spdVal.textContent = v.toFixed(2);
    uniforms.u_dispSpeed.value = v;
  });
  spdIn.addEventListener('change', () => history?.push());

  onEnabledChange();

  return {
    onEnabledChange,
    snapshot() {
      return {
        strength,
        scale: parseInt(sclIn.value, 10) / 10,
        speed: parseInt(spdIn.value, 10) / 100,
      };
    },
    restore(snap) {
      if (!snap) return;
      if (typeof snap.strength === 'number') {
        strength = snap.strength;
        strIn.value = String(Math.round(snap.strength * 100));
        strVal.textContent = Math.round(snap.strength * 100) + '%';
      }
      if (typeof snap.scale === 'number') {
        sclIn.value = String(Math.round(snap.scale * 10));
        sclVal.textContent = snap.scale.toFixed(1);
        uniforms.u_dispScale.value = snap.scale;
      }
      if (typeof snap.speed === 'number') {
        spdIn.value = String(Math.round(snap.speed * 100));
        spdVal.textContent = snap.speed.toFixed(2);
        uniforms.u_dispSpeed.value = snap.speed;
      }
      pushStrength();
    },
  };
}
