// =========================================================
// EMISSIVE EFFECT — controls
// =========================================================
// Strength + Color + Scale + Speed + Sharpness. Strength is gated by the
// effect's enabled flag (pushed to 0 when off); the rest write their
// uniforms directly.
//
import { defaults } from './defaults.js';
import { hexToVec3 } from '../../util/color.js';

export function initControls({ host, uniforms, isEnabled, history }) {
  const d = defaults;

  host.innerHTML = `
    <div class="range-row">
      <div class="range-label"><span>Strength</span><span class="range-value" data-em-str-val>${Math.round(d.strength * 100)}%</span></div>
      <input type="range" data-em-str min="0" max="200" step="1" value="${Math.round(d.strength * 100)}">
    </div>
    <div class="color-row">
      <span class="color-row-label">Color</span>
      <div class="color-row-control">
        <input type="color" data-em-col value="${d.color}">
        <span class="color-row-hex" data-em-col-hex>${d.color.toUpperCase()}</span>
      </div>
    </div>
    <div class="range-row">
      <div class="range-label"><span>Scale</span><span class="range-value" data-em-scl-val>${d.scale.toFixed(1)}</span></div>
      <input type="range" data-em-scl min="10" max="120" step="1" value="${Math.round(d.scale * 10)}">
    </div>
    <div class="range-row">
      <div class="range-label"><span>Speed</span><span class="range-value" data-em-spd-val>${Math.round(d.speed * 100)}%</span></div>
      <input type="range" data-em-spd min="0" max="200" step="1" value="${Math.round(d.speed * 100)}">
    </div>
    <div class="range-row">
      <div class="range-label"><span>Sharpness</span><span class="range-value" data-em-shp-val>${d.sharpness.toFixed(1)}</span></div>
      <input type="range" data-em-shp min="10" max="60" step="1" value="${Math.round(d.sharpness * 10)}">
    </div>
  `;

  const strIn  = host.querySelector('[data-em-str]');
  const strVal = host.querySelector('[data-em-str-val]');
  const colIn  = host.querySelector('[data-em-col]');
  const colHex = host.querySelector('[data-em-col-hex]');
  const sclIn  = host.querySelector('[data-em-scl]');
  const sclVal = host.querySelector('[data-em-scl-val]');
  const spdIn  = host.querySelector('[data-em-spd]');
  const spdVal = host.querySelector('[data-em-spd-val]');
  const shpIn  = host.querySelector('[data-em-shp]');
  const shpVal = host.querySelector('[data-em-shp-val]');

  let strength = d.strength;

  function pushStrength() {
    uniforms.u_emissive.value = isEnabled() ? strength : 0.0;
  }
  function onEnabledChange() {
    [strIn, colIn, sclIn, spdIn, shpIn].forEach(el => el.disabled = !isEnabled());
    pushStrength();
  }

  strIn.addEventListener('input', (e) => {
    strength = parseInt(e.target.value, 10) / 100;
    strVal.textContent = e.target.value + '%';
    pushStrength();
  });
  strIn.addEventListener('change', () => history?.push());

  colIn.addEventListener('input', (e) => {
    colHex.textContent = e.target.value.toUpperCase();
    uniforms.u_emissiveColor.value.copy(hexToVec3(e.target.value));
  });
  colIn.addEventListener('change', () => history?.push());

  sclIn.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 10;
    sclVal.textContent = v.toFixed(1);
    uniforms.u_emissiveScale.value = v;
  });
  sclIn.addEventListener('change', () => history?.push());

  spdIn.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 100;
    spdVal.textContent = e.target.value + '%';
    uniforms.u_emissiveSpeed.value = v;
  });
  spdIn.addEventListener('change', () => history?.push());

  shpIn.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 10;
    shpVal.textContent = v.toFixed(1);
    uniforms.u_emissiveSharpness.value = v;
  });
  shpIn.addEventListener('change', () => history?.push());

  onEnabledChange();

  return {
    onEnabledChange,
    snapshot() {
      return {
        strength,
        color:     colIn.value,
        scale:     parseInt(sclIn.value, 10) / 10,
        speed:     parseInt(spdIn.value, 10) / 100,
        sharpness: parseInt(shpIn.value, 10) / 10,
      };
    },
    restore(snap) {
      if (!snap) return;
      if (typeof snap.strength === 'number') {
        strength = snap.strength;
        strIn.value = String(Math.round(snap.strength * 100));
        strVal.textContent = Math.round(snap.strength * 100) + '%';
      }
      if (typeof snap.color === 'string') {
        colIn.value = snap.color;
        colHex.textContent = snap.color.toUpperCase();
        uniforms.u_emissiveColor.value.copy(hexToVec3(snap.color));
      }
      if (typeof snap.scale === 'number') {
        sclIn.value = String(Math.round(snap.scale * 10));
        sclVal.textContent = snap.scale.toFixed(1);
        uniforms.u_emissiveScale.value = snap.scale;
      }
      if (typeof snap.speed === 'number') {
        spdIn.value = String(Math.round(snap.speed * 100));
        spdVal.textContent = Math.round(snap.speed * 100) + '%';
        uniforms.u_emissiveSpeed.value = snap.speed;
      }
      if (typeof snap.sharpness === 'number') {
        shpIn.value = String(Math.round(snap.sharpness * 10));
        shpVal.textContent = snap.sharpness.toFixed(1);
        uniforms.u_emissiveSharpness.value = snap.sharpness;
      }
      pushStrength();
    },
  };
}
