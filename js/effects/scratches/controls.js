// =========================================================
// SCRATCHES EFFECT — controls
// =========================================================
import { defaults } from './defaults.js';
import { hexToVec3 } from '../../util/color.js';

export function initControls({ host, uniforms, isEnabled, history }) {
  const d = defaults;

  host.innerHTML = `
    <div class="range-row">
      <div class="range-label"><span>Strength</span><span class="range-value" data-sx-str-val>${Math.round(d.strength * 100)}%</span></div>
      <input type="range" data-sx-str min="0" max="150" step="1" value="${Math.round(d.strength * 100)}">
    </div>
    <div class="range-row">
      <div class="range-label"><span>Density</span><span class="range-value" data-sx-den-val>${d.density}</span></div>
      <input type="range" data-sx-den min="20" max="200" step="1" value="${d.density}">
    </div>
    <div class="range-row">
      <div class="range-label"><span>Angle</span><span class="range-value" data-sx-ang-val>${d.angle}°</span></div>
      <input type="range" data-sx-ang min="0" max="180" step="1" value="${d.angle}">
    </div>
    <div class="range-row">
      <div class="range-label"><span>Coverage</span><span class="range-value" data-sx-cov-val>${Math.round(d.coverage * 100)}%</span></div>
      <input type="range" data-sx-cov min="5" max="100" step="1" value="${Math.round(d.coverage * 100)}">
    </div>
    <div class="color-row">
      <span class="color-row-label">Color</span>
      <div class="color-row-control">
        <input type="color" data-sx-col value="${d.color}">
        <span class="color-row-hex" data-sx-col-hex>${d.color.toUpperCase()}</span>
      </div>
    </div>
  `;

  const strIn = host.querySelector('[data-sx-str]');
  const strVal = host.querySelector('[data-sx-str-val]');
  const denIn = host.querySelector('[data-sx-den]');
  const denVal = host.querySelector('[data-sx-den-val]');
  const angIn = host.querySelector('[data-sx-ang]');
  const angVal = host.querySelector('[data-sx-ang-val]');
  const covIn = host.querySelector('[data-sx-cov]');
  const covVal = host.querySelector('[data-sx-cov-val]');
  const colIn = host.querySelector('[data-sx-col]');
  const colHex = host.querySelector('[data-sx-col-hex]');

  let strength = d.strength;

  function pushStrength() {
    uniforms.u_scratchStrength.value = isEnabled() ? strength : 0.0;
  }
  function onEnabledChange() {
    [strIn, denIn, angIn, covIn, colIn].forEach(el => el.disabled = !isEnabled());
    pushStrength();
  }

  strIn.addEventListener('input', (e) => {
    strength = parseInt(e.target.value, 10) / 100;
    strVal.textContent = e.target.value + '%';
    pushStrength();
  });
  strIn.addEventListener('change', () => history?.push());

  denIn.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10);
    denVal.textContent = String(v);
    uniforms.u_scratchScale.value = v;
  });
  denIn.addEventListener('change', () => history?.push());

  angIn.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10);
    angVal.textContent = v + '°';
    uniforms.u_scratchAngle.value = v * Math.PI / 180;
  });
  angIn.addEventListener('change', () => history?.push());

  covIn.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10);
    covVal.textContent = v + '%';
    uniforms.u_scratchCoverage.value = v / 100;
  });
  covIn.addEventListener('change', () => history?.push());

  colIn.addEventListener('input', (e) => {
    colHex.textContent = e.target.value.toUpperCase();
    uniforms.u_scratchColor.value.copy(hexToVec3(e.target.value));
  });
  colIn.addEventListener('change', () => history?.push());

  onEnabledChange();

  return {
    onEnabledChange,
    snapshot() {
      return {
        strength,
        density:  parseInt(denIn.value, 10),
        angle:    parseInt(angIn.value, 10),
        coverage: parseInt(covIn.value, 10) / 100,
        color:    colIn.value,
      };
    },
    restore(snap) {
      if (!snap) return;
      if (typeof snap.strength === 'number') {
        strength = snap.strength;
        strIn.value = String(Math.round(snap.strength * 100));
        strVal.textContent = Math.round(snap.strength * 100) + '%';
      }
      if (typeof snap.density === 'number') {
        denIn.value = String(snap.density);
        denVal.textContent = String(snap.density);
        uniforms.u_scratchScale.value = snap.density;
      }
      if (typeof snap.angle === 'number') {
        angIn.value = String(snap.angle);
        angVal.textContent = snap.angle + '°';
        uniforms.u_scratchAngle.value = snap.angle * Math.PI / 180;
      }
      if (typeof snap.coverage === 'number') {
        covIn.value = String(Math.round(snap.coverage * 100));
        covVal.textContent = Math.round(snap.coverage * 100) + '%';
        uniforms.u_scratchCoverage.value = snap.coverage;
      }
      if (typeof snap.color === 'string') {
        colIn.value = snap.color;
        colHex.textContent = snap.color.toUpperCase();
        uniforms.u_scratchColor.value.copy(hexToVec3(snap.color));
      }
      pushStrength();
    },
  };
}
