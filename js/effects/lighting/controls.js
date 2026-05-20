// =========================================================
// LIGHTING EFFECT — controls
// =========================================================
// Five controls. When the effect is enabled, sliders override the
// material's preset values; when disabled, the material's presets
// are restored.
//
// Material switch: each new material's createUniforms() pre-fills
// the lighting uniforms with its own preset, so the slider seed
// values come from whichever material is active.
//
import { defaults } from './defaults.js';
import { hexToVec3 } from '../../util/color.js';

// Map [0..100] slider ↔ light-height [0.02..0.8] for finer control
// at low values where the highlight changes most.
const HEIGHT_MIN = 0.02;
const HEIGHT_MAX = 0.8;
const sliderToHeight = (v) => HEIGHT_MIN + (HEIGHT_MAX - HEIGHT_MIN) * (v / 100);
const heightToSlider = (h) => Math.round(((h - HEIGHT_MIN) / (HEIGHT_MAX - HEIGHT_MIN)) * 100);

// vec3 ↔ hex helpers (for the color picker, which speaks hex)
function vec3ToHex(v) {
  const r = Math.round(Math.max(0, Math.min(1, v.x)) * 255);
  const g = Math.round(Math.max(0, Math.min(1, v.y)) * 255);
  const b = Math.round(Math.max(0, Math.min(1, v.z)) * 255);
  return '#' + [r,g,b].map(n => n.toString(16).padStart(2,'0')).join('');
}

export function initControls({ host, uniforms, isEnabled, history }) {
  // Seed slider positions from current uniform values. These are
  // whatever the active material set as its preset.
  const seed = {
    diffuse:   uniforms.u_diffuse?.value     ?? defaults.diffuse,
    specular:  uniforms.u_specular?.value    ?? defaults.specular,
    shininess: uniforms.u_shininess?.value   ?? defaults.shininess,
    height:    uniforms.u_lightHeight?.value ?? defaults.height,
    color:     uniforms.u_lightColor?.value ? vec3ToHex(uniforms.u_lightColor.value) : defaults.color,
  };

  host.innerHTML = `
    <div class="range-row">
      <div class="range-label"><span>Diffuse</span><span class="range-value" data-lt-dif-val>${Math.round(seed.diffuse * 100)}%</span></div>
      <input type="range" data-lt-dif min="0" max="100" step="1" value="${Math.round(seed.diffuse * 100)}">
    </div>
    <div class="range-row">
      <div class="range-label"><span>Specular</span><span class="range-value" data-lt-spc-val>${seed.specular.toFixed(2)}</span></div>
      <input type="range" data-lt-spc min="0" max="300" step="1" value="${Math.round(seed.specular * 100)}">
    </div>
    <div class="range-row">
      <div class="range-label"><span>Shininess</span><span class="range-value" data-lt-shn-val>${Math.round(seed.shininess)}</span></div>
      <input type="range" data-lt-shn min="1" max="128" step="1" value="${Math.round(seed.shininess)}">
    </div>
    <div class="range-row">
      <div class="range-label"><span>Light height</span><span class="range-value" data-lt-hgt-val>${seed.height.toFixed(2)}</span></div>
      <input type="range" data-lt-hgt min="0" max="100" step="1" value="${heightToSlider(seed.height)}">
    </div>
    <div class="color-row">
      <span class="color-row-label">Light color</span>
      <div class="color-row-control">
        <input type="color" data-lt-col value="${seed.color}">
        <span class="color-row-hex" data-lt-col-hex>${seed.color.toUpperCase()}</span>
      </div>
    </div>
  `;

  const difIn  = host.querySelector('[data-lt-dif]');
  const difVal = host.querySelector('[data-lt-dif-val]');
  const spcIn  = host.querySelector('[data-lt-spc]');
  const spcVal = host.querySelector('[data-lt-spc-val]');
  const shnIn  = host.querySelector('[data-lt-shn]');
  const shnVal = host.querySelector('[data-lt-shn-val]');
  const hgtIn  = host.querySelector('[data-lt-hgt]');
  const hgtVal = host.querySelector('[data-lt-hgt-val]');
  const colIn  = host.querySelector('[data-lt-col]');
  const colHex = host.querySelector('[data-lt-col-hex]');

  // Snapshot the material's preset values at mount time so we can
  // restore them when the effect is toggled off.
  const preset = { ...seed };

  function write() {
    if (!isEnabled()) return;
    uniforms.u_diffuse.value     = parseInt(difIn.value, 10) / 100;
    uniforms.u_specular.value    = parseInt(spcIn.value, 10) / 100;
    uniforms.u_shininess.value   = parseInt(shnIn.value, 10);
    uniforms.u_lightHeight.value = sliderToHeight(parseInt(hgtIn.value, 10));
    if (uniforms.u_lightColor) {
      uniforms.u_lightColor.value.copy(hexToVec3(colIn.value));
    }
  }

  function restorePreset() {
    if (uniforms.u_diffuse)     uniforms.u_diffuse.value     = preset.diffuse;
    if (uniforms.u_specular)    uniforms.u_specular.value    = preset.specular;
    if (uniforms.u_shininess)   uniforms.u_shininess.value   = preset.shininess;
    if (uniforms.u_lightHeight) uniforms.u_lightHeight.value = preset.height;
    if (uniforms.u_lightColor)  uniforms.u_lightColor.value.copy(hexToVec3(preset.color));
  }

  function onEnabledChange() {
    const on = isEnabled();
    [difIn, spcIn, shnIn, hgtIn, colIn].forEach(el => el.disabled = !on);
    if (on) write();
    else restorePreset();
  }

  difIn.addEventListener('input', (e) => {
    difVal.textContent = e.target.value + '%';
    write();
    history?.push();
  });
  spcIn.addEventListener('input', (e) => {
    spcVal.textContent = (parseInt(e.target.value, 10) / 100).toFixed(2);
    write();
    history?.push();
  });
  shnIn.addEventListener('input', (e) => {
    shnVal.textContent = e.target.value;
    write();
    history?.push();
  });
  hgtIn.addEventListener('input', (e) => {
    hgtVal.textContent = sliderToHeight(parseInt(e.target.value, 10)).toFixed(2);
    write();
    history?.push();
  });
  colIn.addEventListener('input', (e) => {
    colHex.textContent = e.target.value.toUpperCase();
    write();
    history?.push();
  });

  onEnabledChange();

  return {
    onEnabledChange,
    snapshot() {
      return {
        diffuse:   parseInt(difIn.value, 10) / 100,
        specular:  parseInt(spcIn.value, 10) / 100,
        shininess: parseInt(shnIn.value, 10),
        height:    sliderToHeight(parseInt(hgtIn.value, 10)),
        color:     colIn.value,
      };
    },
    restore(snap) {
      if (!snap) return;
      if (typeof snap.diffuse === 'number') {
        difIn.value = String(Math.round(snap.diffuse * 100));
        difVal.textContent = Math.round(snap.diffuse * 100) + '%';
      }
      if (typeof snap.specular === 'number') {
        spcIn.value = String(Math.round(snap.specular * 100));
        spcVal.textContent = snap.specular.toFixed(2);
      }
      if (typeof snap.shininess === 'number') {
        shnIn.value = String(Math.round(snap.shininess));
        shnVal.textContent = String(Math.round(snap.shininess));
      }
      if (typeof snap.height === 'number') {
        hgtIn.value = String(heightToSlider(snap.height));
        hgtVal.textContent = snap.height.toFixed(2);
      }
      if (typeof snap.color === 'string') {
        colIn.value = snap.color;
        colHex.textContent = snap.color.toUpperCase();
      }
      // If enabled, push the restored values into the uniforms.
      // If disabled, the material's preset values remain in effect.
      if (isEnabled()) write();
    },
  };
}
