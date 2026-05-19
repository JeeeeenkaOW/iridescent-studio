// =========================================================
// LIGHTING EFFECT — controls
// =========================================================
// Four sliders that override the material's preset lighting values
// when this effect is enabled.
//
// Note: when disabled, the controls cache the user's current slider
// positions but DO NOT write them to the uniforms — the uniforms
// keep whatever the material set as its preset. When enabled, we
// snapshot the *current* uniform values (the material's preset, or
// the last enabled state), seed the sliders with them, and write
// slider edits back to the uniforms.
//
// On material switch, sliders re-seed from the new material's preset
// values — the new material's createUniforms() runs and resets the
// four uniforms before this effect's controls re-mount.
//
import { defaults } from './defaults.js';

// Map [0..100] slider ↔ light-height [0.02..0.8] for finer control
// at low values where the highlight changes most.
const HEIGHT_MIN = 0.02;
const HEIGHT_MAX = 0.8;
const sliderToHeight = (v) => HEIGHT_MIN + (HEIGHT_MAX - HEIGHT_MIN) * (v / 100);
const heightToSlider = (h) => Math.round(((h - HEIGHT_MIN) / (HEIGHT_MAX - HEIGHT_MIN)) * 100);

export function initControls({ host, uniforms, isEnabled }) {
  // Seed slider positions from current uniform values. These are
  // whatever the active material set as its preset.
  const seed = {
    diffuse:   uniforms.u_diffuse?.value     ?? defaults.diffuse,
    specular:  uniforms.u_specular?.value    ?? defaults.specular,
    shininess: uniforms.u_shininess?.value   ?? defaults.shininess,
    height:    uniforms.u_lightHeight?.value ?? defaults.height,
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
  `;

  const difIn  = host.querySelector('[data-lt-dif]');
  const difVal = host.querySelector('[data-lt-dif-val]');
  const spcIn  = host.querySelector('[data-lt-spc]');
  const spcVal = host.querySelector('[data-lt-spc-val]');
  const shnIn  = host.querySelector('[data-lt-shn]');
  const shnVal = host.querySelector('[data-lt-shn-val]');
  const hgtIn  = host.querySelector('[data-lt-hgt]');
  const hgtVal = host.querySelector('[data-lt-hgt-val]');

  // Materials' preset values — captured the moment this effect mounted.
  // We can restore them when the effect is toggled off.
  const preset = { ...seed };

  function write() {
    if (!isEnabled()) return;
    uniforms.u_diffuse.value     = parseInt(difIn.value, 10) / 100;
    uniforms.u_specular.value    = parseInt(spcIn.value, 10) / 100;
    uniforms.u_shininess.value   = parseInt(shnIn.value, 10);
    uniforms.u_lightHeight.value = sliderToHeight(parseInt(hgtIn.value, 10));
  }

  function restorePreset() {
    if (uniforms.u_diffuse)     uniforms.u_diffuse.value     = preset.diffuse;
    if (uniforms.u_specular)    uniforms.u_specular.value    = preset.specular;
    if (uniforms.u_shininess)   uniforms.u_shininess.value   = preset.shininess;
    if (uniforms.u_lightHeight) uniforms.u_lightHeight.value = preset.height;
  }

  function onEnabledChange() {
    const on = isEnabled();
    [difIn, spcIn, shnIn, hgtIn].forEach(el => el.disabled = !on);
    if (on) write();
    else restorePreset();
  }

  difIn.addEventListener('input', (e) => {
    difVal.textContent = e.target.value + '%';
    write();
  });
  spcIn.addEventListener('input', (e) => {
    spcVal.textContent = (parseInt(e.target.value, 10) / 100).toFixed(2);
    write();
  });
  shnIn.addEventListener('input', (e) => {
    shnVal.textContent = e.target.value;
    write();
  });
  hgtIn.addEventListener('input', (e) => {
    hgtVal.textContent = sliderToHeight(parseInt(e.target.value, 10)).toFixed(2);
    write();
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
      };
    },
  };
}
