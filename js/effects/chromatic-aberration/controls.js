// =========================================================
// CHROMATIC ABERRATION EFFECT — controls
// =========================================================
import { defaults } from './defaults.js';

export function initControls({ host, uniforms, isEnabled, history }) {
  const d = defaults;

  host.innerHTML = `
    <div class="range-row">
      <div class="range-label"><span>Strength</span><span class="range-value" data-ca-str-val>${Math.round(d.strength * 100)}%</span></div>
      <input type="range" data-ca-str min="0" max="100" step="1" value="${Math.round(d.strength * 100)}">
    </div>
  `;

  const strIn  = host.querySelector('[data-ca-str]');
  const strVal = host.querySelector('[data-ca-str-val]');

  let strength = d.strength;

  function push() {
    uniforms.u_caStrength.value = isEnabled() ? strength : 0.0;
  }

  function onEnabledChange() {
    strIn.disabled = !isEnabled();
    push();
  }

  strIn.addEventListener('input', (e) => {
    strength = parseInt(e.target.value, 10) / 100;
    strVal.textContent = e.target.value + '%';
    push();
  });
  strIn.addEventListener('change', () => { history?.push(); });

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
      push();
    },
  };
}
