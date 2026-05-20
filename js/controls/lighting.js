// =========================================================
// LIGHTING — top-level sidebar control
// =========================================================
// Promoted out of the Effects panel because Lighting is conceptually
// different from Iridescence / Bloom / CA. Those are layers added on
// top of the composite; Lighting OVERRIDES the material's preset
// Blinn-Phong params. It deserves its own section.
//
// Internals are the same as the old Effects-card version: there's an
// enable toggle; when on, sliders write to u_diffuse / u_specular /
// u_shininess / u_lightHeight / u_lightColor / u_ambientStrength. When
// off, the material's preset values are restored.
//
// Material switch: this module is re-mounted by main.js whenever the
// active material changes (different materials ship different preset
// lighting values, and the sliders need to seed from those). The
// `enabled` state is preserved across re-mounts.
//
import { hexToVec3 } from '../util/color.js';

// Default fallbacks — used only if the material's uniforms don't
// pre-populate a value (shouldn't happen in practice).
const DEFAULTS = {
  diffuse:   0.45,
  specular:  1.6,
  shininess: 28.0,
  height:    0.16,
  color:     '#FFFFFF',
  ambient:   1.0,
};

// Map [0..100] slider ↔ light-height [0.02..0.8] for finer control
// at low values where the highlight changes most.
const HEIGHT_MIN = 0.02;
const HEIGHT_MAX = 0.8;
const sliderToHeight = (v) => HEIGHT_MIN + (HEIGHT_MAX - HEIGHT_MIN) * (v / 100);
const heightToSlider = (h) => Math.round(((h - HEIGHT_MIN) / (HEIGHT_MAX - HEIGHT_MIN)) * 100);

function vec3ToHex(v) {
  const r = Math.round(Math.max(0, Math.min(1, v.x)) * 255);
  const g = Math.round(Math.max(0, Math.min(1, v.y)) * 255);
  const b = Math.round(Math.max(0, Math.min(1, v.z)) * 255);
  return '#' + [r,g,b].map(n => n.toString(16).padStart(2,'0')).join('');
}

export function initLighting({ host, uniforms, history, initialEnabled = false, initialSnapshot = null }) {
  // The PRESET is always whatever the freshly-mounted material seeded
  // into the uniforms — this is what we restore to when the override
  // toggle flips off.
  const preset = {
    diffuse:    uniforms.u_diffuse?.value         ?? DEFAULTS.diffuse,
    specular:   uniforms.u_specular?.value        ?? DEFAULTS.specular,
    shininess:  uniforms.u_shininess?.value       ?? DEFAULTS.shininess,
    height:     uniforms.u_lightHeight?.value     ?? DEFAULTS.height,
    color:      uniforms.u_lightColor?.value ? vec3ToHex(uniforms.u_lightColor.value) : DEFAULTS.color,
    ambient:    uniforms.u_ambientStrength?.value ?? DEFAULTS.ambient,
  };

  // The INITIAL slider state defaults to the preset, but if the caller
  // provided an `initialSnapshot` (from the previous mount before a
  // material switch), use those values instead — that way the user's
  // tuning persists across material swaps. The toggle state comes from
  // either the snapshot or the explicit `initialEnabled` flag.
  const seed = initialSnapshot ? {
    diffuse:   initialSnapshot.diffuse   ?? preset.diffuse,
    specular:  initialSnapshot.specular  ?? preset.specular,
    shininess: initialSnapshot.shininess ?? preset.shininess,
    height:    initialSnapshot.height    ?? preset.height,
    color:     initialSnapshot.color     ?? preset.color,
    ambient:   initialSnapshot.ambient   ?? preset.ambient,
  } : preset;

  let enabled = !!initialEnabled;

  host.innerHTML = `
    <div class="toggle-row" data-lt-enable-row>
      <label>Override material lighting</label>
      <div class="toggle ${enabled ? 'on' : ''}" data-lt-enable></div>
    </div>
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
      <input type="range" data-lt-shn min="1" max="256" step="1" value="${Math.round(seed.shininess)}">
    </div>
    <div class="range-row">
      <div class="range-label"><span>Light height</span><span class="range-value" data-lt-hgt-val>${seed.height.toFixed(2)}</span></div>
      <input type="range" data-lt-hgt min="0" max="100" step="1" value="${heightToSlider(seed.height)}">
    </div>
    <div class="range-row">
      <div class="range-label"><span>Ambient strength</span><span class="range-value" data-lt-amb-val>${Math.round(seed.ambient * 100)}%</span></div>
      <input type="range" data-lt-amb min="0" max="300" step="1" value="${Math.round(seed.ambient * 100)}">
    </div>
    <div class="color-row">
      <span class="color-row-label">Light color</span>
      <div class="color-row-control">
        <input type="color" data-lt-col value="${seed.color}">
        <span class="color-row-hex" data-lt-col-hex>${seed.color.toUpperCase()}</span>
      </div>
    </div>
  `;

  const enableTog = host.querySelector('[data-lt-enable]');
  const difIn  = host.querySelector('[data-lt-dif]');
  const difVal = host.querySelector('[data-lt-dif-val]');
  const spcIn  = host.querySelector('[data-lt-spc]');
  const spcVal = host.querySelector('[data-lt-spc-val]');
  const shnIn  = host.querySelector('[data-lt-shn]');
  const shnVal = host.querySelector('[data-lt-shn-val]');
  const hgtIn  = host.querySelector('[data-lt-hgt]');
  const hgtVal = host.querySelector('[data-lt-hgt-val]');
  const ambIn  = host.querySelector('[data-lt-amb]');
  const ambVal = host.querySelector('[data-lt-amb-val]');
  const colIn  = host.querySelector('[data-lt-col]');
  const colHex = host.querySelector('[data-lt-col-hex]');

  // `preset` was captured above from the freshly-mounted material's
  // uniforms; that's the value set we restore to when the override is
  // toggled off. We don't snapshot from `seed` here because seed may
  // contain the user's prior tuning (which we DO NOT want to restore
  // to — that would be circular).

  function write() {
    if (!enabled) return;
    uniforms.u_diffuse.value     = parseInt(difIn.value, 10) / 100;
    uniforms.u_specular.value    = parseInt(spcIn.value, 10) / 100;
    uniforms.u_shininess.value   = parseInt(shnIn.value, 10);
    uniforms.u_lightHeight.value = sliderToHeight(parseInt(hgtIn.value, 10));
    if (uniforms.u_lightColor) {
      uniforms.u_lightColor.value.copy(hexToVec3(colIn.value));
    }
    if (uniforms.u_ambientStrength) {
      uniforms.u_ambientStrength.value = parseInt(ambIn.value, 10) / 100;
    }
  }

  function restorePreset() {
    if (uniforms.u_diffuse)         uniforms.u_diffuse.value         = preset.diffuse;
    if (uniforms.u_specular)        uniforms.u_specular.value        = preset.specular;
    if (uniforms.u_shininess)       uniforms.u_shininess.value       = preset.shininess;
    if (uniforms.u_lightHeight)     uniforms.u_lightHeight.value     = preset.height;
    if (uniforms.u_lightColor)      uniforms.u_lightColor.value.copy(hexToVec3(preset.color));
    if (uniforms.u_ambientStrength) uniforms.u_ambientStrength.value = preset.ambient;
  }

  function applyEnabledState() {
    [difIn, spcIn, shnIn, hgtIn, ambIn, colIn].forEach(el => el.disabled = !enabled);
    if (enabled) write();
    else restorePreset();
  }

  // Wire the enable toggle.
  enableTog.addEventListener('click', () => {
    enabled = !enabled;
    enableTog.classList.toggle('on', enabled);
    applyEnabledState();
    history?.push();
  });

  // Wire sliders.
  difIn.addEventListener('input', (e) => { difVal.textContent = e.target.value + '%'; write(); });
  difIn.addEventListener('change', () => history?.push());

  spcIn.addEventListener('input', (e) => { spcVal.textContent = (parseInt(e.target.value, 10) / 100).toFixed(2); write(); });
  spcIn.addEventListener('change', () => history?.push());

  shnIn.addEventListener('input', (e) => { shnVal.textContent = e.target.value; write(); });
  shnIn.addEventListener('change', () => history?.push());

  hgtIn.addEventListener('input', (e) => { hgtVal.textContent = sliderToHeight(parseInt(e.target.value, 10)).toFixed(2); write(); });
  hgtIn.addEventListener('change', () => history?.push());

  ambIn.addEventListener('input', (e) => { ambVal.textContent = e.target.value + '%'; write(); });
  ambIn.addEventListener('change', () => history?.push());

  colIn.addEventListener('input', (e) => { colHex.textContent = e.target.value.toUpperCase(); write(); });
  colIn.addEventListener('change', () => history?.push());

  // Initial state push — disables inputs if starting off, or writes
  // current slider values into uniforms if starting on.
  applyEnabledState();

  return {
    isEnabled: () => enabled,
    snapshot() {
      return {
        enabled,
        diffuse:   parseInt(difIn.value, 10) / 100,
        specular:  parseInt(spcIn.value, 10) / 100,
        shininess: parseInt(shnIn.value, 10),
        height:    sliderToHeight(parseInt(hgtIn.value, 10)),
        color:     colIn.value,
        ambient:   parseInt(ambIn.value, 10) / 100,
      };
    },
    restore(snap) {
      if (!snap) return;
      if (typeof snap.enabled === 'boolean') {
        enabled = snap.enabled;
        enableTog.classList.toggle('on', enabled);
      }
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
      if (typeof snap.ambient === 'number') {
        ambIn.value = String(Math.round(snap.ambient * 100));
        ambVal.textContent = Math.round(snap.ambient * 100) + '%';
      }
      applyEnabledState();
    },
  };
}
