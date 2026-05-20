// =========================================================
// BLOOM EFFECT — controls
// =========================================================
// Strength slider + color picker. The picker seeds from whichever
// material is active when the effect (re-)mounts — main.js remounts
// the effects host on every material switch, so seed-on-mount is
// the right time.
//
// Color picker UX:
//   - Initial state: shows the material's baseline halo color.
//   - On first user pick: u_bloomUserColor flips to 1, the picked
//     color drives the bloom. The material's baseline is no longer
//     used until the user resets.
//   - Reset button: clears the user override; the picker re-seeds
//     from the material's baseline and u_bloomUserColor flips back
//     to 0. Useful for going back to "ceramic warm" or "glass cool"
//     after experimenting.
//
import { defaults } from './defaults.js';
import { hexToVec3 } from '../../util/color.js';

function vec3ToHex(v) {
  const r = Math.round(Math.max(0, Math.min(1, v.x)) * 255);
  const g = Math.round(Math.max(0, Math.min(1, v.y)) * 255);
  const b = Math.round(Math.max(0, Math.min(1, v.z)) * 255);
  return '#' + [r,g,b].map(n => n.toString(16).padStart(2,'0')).join('');
}

export function initControls({ host, uniforms, isEnabled }) {
  const d = defaults;

  // Seed the color picker from the material's baseline halo tint.
  // u_haloBaseColor is set by each material's createUniforms() and
  // we read it once at mount time. The Effects host re-mounts on
  // material change, so this always reflects the active material.
  const baseHex = uniforms.u_haloBaseColor?.value
    ? vec3ToHex(uniforms.u_haloBaseColor.value)
    : '#ffffff';

  // Strength slider goes 0..200 (% of baseline intensity). Default
  // position is 100% (i.e. exactly baseline) so toggling the effect
  // on without touching the slider matches the old halo look.
  const strengthPct = Math.round(d.strength * 100);

  host.innerHTML = `
    <div class="range-row">
      <div class="range-label"><span>Strength</span><span class="range-value" data-bl-str-val>${strengthPct}%</span></div>
      <input type="range" data-bl-str min="0" max="200" step="1" value="${strengthPct}">
    </div>
    <div class="color-row">
      <span class="color-row-label">Color</span>
      <div class="color-row-control">
        <input type="color" data-bl-col value="${baseHex}">
        <span class="color-row-hex" data-bl-col-hex>${baseHex.toUpperCase()}</span>
      </div>
    </div>
  `;

  const strIn  = host.querySelector('[data-bl-str]');
  const strVal = host.querySelector('[data-bl-str-val]');
  const colIn  = host.querySelector('[data-bl-col]');
  const colHex = host.querySelector('[data-bl-col-hex]');

  let strength    = d.strength;
  let userColored = false;  // becomes true the first time the user picks

  function pushStrength() {
    uniforms.u_bloomStrength.value = isEnabled() ? strength : 0.0;
  }

  function pushColor() {
    if (!uniforms.u_bloomColor) return;
    uniforms.u_bloomColor.value.copy(hexToVec3(colIn.value));
    uniforms.u_bloomUserColor.value = userColored ? 1.0 : 0.0;
  }

  function onEnabledChange() {
    strIn.disabled = !isEnabled();
    colIn.disabled = !isEnabled();
    pushStrength();
    // Also push color — when the effect is enabled for the first time,
    // we want u_bloomColor seeded even if the user hasn't picked yet
    // (apply uses u_bloomUserColor to decide which to read).
    pushColor();
  }

  strIn.addEventListener('input', (e) => {
    strength = parseInt(e.target.value, 10) / 100;
    strVal.textContent = e.target.value + '%';
    pushStrength();
  });

  colIn.addEventListener('input', (e) => {
    userColored = true;
    colHex.textContent = e.target.value.toUpperCase();
    pushColor();
  });

  // Seed the uniform with the baseline color at mount, in case the
  // effect is exported while disabled — the exporter needs to know
  // what the picker would show.
  uniforms.u_bloomColor.value.copy(hexToVec3(baseHex));
  uniforms.u_bloomUserColor.value = 0.0;

  onEnabledChange();

  return {
    onEnabledChange,
    snapshot() {
      return {
        strength,
        color:       colIn.value,
        userColored,
      };
    },
  };
}
