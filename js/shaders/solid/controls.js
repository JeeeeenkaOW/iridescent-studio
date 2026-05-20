// =========================================================
// SOLID CONTROLS — sidebar UI for the unified material
// =========================================================
// All material parameters live here. Lighting / Iridescence / Bloom /
// Chromatic aberration are in the Effects panel (unchanged).
//
// Sliders (in order):
//   Base color      — diffuse albedo
//   Reflection      — F0 colour (warm silver = metallic; cool/dark = dielectric)
//   Roughness       — 0 = smooth, high = stippled
//   Bg refraction   — UV offset magnitude for the through-body sample
//   Transparency    — how much of the refracted bg leaks through the body
//                     (0 = opaque silver/ceramic; 1 = full glass-like)
//   Inner glow      — subsurface tint colour
//   Glow strength   — 0 = no inner glow; high = porcelain look
//   Fresnel rim     — 0 = no edge highlight; high = clearcoat-style outline
//   Fresnel power   — rim sharpness
//   Cursor blob     — toggle the Mercury-style cursor mercury blob
//
import { defaults } from './defaults.js';
import { hexToVec3 } from '../../util/color.js';

export function initSolidControls({ host, uniforms, history }) {
  const d = defaults;

  host.innerHTML = `
      <div class="color-row">
        <span class="color-row-label">Base color</span>
        <div class="color-row-control">
          <input type="color" data-sc-base value="${d.material.baseColor}">
          <span class="color-row-hex" data-sc-base-hex>${d.material.baseColor.toUpperCase()}</span>
        </div>
      </div>

      <div class="color-row">
        <span class="color-row-label">Reflection</span>
        <div class="color-row-control">
          <input type="color" data-sc-f0 value="${d.material.f0Color}">
          <span class="color-row-hex" data-sc-f0-hex>${d.material.f0Color.toUpperCase()}</span>
        </div>
      </div>

      <div class="range-row">
        <div class="range-label"><span>Roughness</span><span class="range-value" data-sc-rough-val>${Math.round(d.material.roughness * 100)}%</span></div>
        <input type="range" data-sc-rough min="0" max="100" step="1" value="${Math.round(d.material.roughness * 100)}">
      </div>

      <div class="range-row">
        <div class="range-label"><span>Bg refraction</span><span class="range-value" data-sc-ref-val>${Math.round(d.material.refraction * 500)}%</span></div>
        <input type="range" data-sc-ref min="0" max="100" step="1" value="${Math.round(d.material.refraction * 500)}">
      </div>

      <div class="range-row">
        <div class="range-label"><span>Transparency</span><span class="range-value" data-sc-mix-val>${Math.round(d.material.refractionMix * 100)}%</span></div>
        <input type="range" data-sc-mix min="0" max="100" step="1" value="${Math.round(d.material.refractionMix * 100)}">
      </div>

      <div class="color-row">
        <span class="color-row-label">Inner glow</span>
        <div class="color-row-control">
          <input type="color" data-sc-sss value="${d.material.sssColor}">
          <span class="color-row-hex" data-sc-sss-hex>${d.material.sssColor.toUpperCase()}</span>
        </div>
      </div>

      <div class="range-row">
        <div class="range-label"><span>Glow strength</span><span class="range-value" data-sc-ss-val>${Math.round(d.material.sssStrength * 100)}%</span></div>
        <input type="range" data-sc-ss min="0" max="100" step="1" value="${Math.round(d.material.sssStrength * 100)}">
      </div>

      <div class="range-row">
        <div class="range-label"><span>Fresnel rim</span><span class="range-value" data-sc-fres-val>${Math.round(d.material.fresnel * 100)}%</span></div>
        <input type="range" data-sc-fres min="0" max="100" step="1" value="${Math.round(d.material.fresnel * 100)}">
      </div>

      <div class="range-row">
        <div class="range-label"><span>Fresnel power</span><span class="range-value" data-sc-fp-val>${d.material.fresnelPower.toFixed(1)}</span></div>
        <input type="range" data-sc-fp min="10" max="80" step="1" value="${Math.round(d.material.fresnelPower * 10)}">
      </div>

      <div class="toggle-row">
        <label>Cursor blob</label>
        <div class="toggle ${d.material.blobEnabled ? 'on' : ''}" data-sc-blob></div>
      </div>
  `;

  // Refs
  const base    = host.querySelector('[data-sc-base]');
  const baseHex = host.querySelector('[data-sc-base-hex]');
  const f0      = host.querySelector('[data-sc-f0]');
  const f0Hex   = host.querySelector('[data-sc-f0-hex]');
  const rough   = host.querySelector('[data-sc-rough]');
  const roughV  = host.querySelector('[data-sc-rough-val]');
  const ref     = host.querySelector('[data-sc-ref]');
  const refV    = host.querySelector('[data-sc-ref-val]');
  const mix     = host.querySelector('[data-sc-mix]');
  const mixV    = host.querySelector('[data-sc-mix-val]');
  const sss     = host.querySelector('[data-sc-sss]');
  const sssHex  = host.querySelector('[data-sc-sss-hex]');
  const ss      = host.querySelector('[data-sc-ss]');
  const ssV     = host.querySelector('[data-sc-ss-val]');
  const fres    = host.querySelector('[data-sc-fres]');
  const fresV   = host.querySelector('[data-sc-fres-val]');
  const fp      = host.querySelector('[data-sc-fp]');
  const fpV     = host.querySelector('[data-sc-fp-val]');
  const blob    = host.querySelector('[data-sc-blob]');

  let blobEnabled = !!d.material.blobEnabled;

  // ---- Color wiring ----
  base.addEventListener('input', (e) => {
    baseHex.textContent = e.target.value.toUpperCase();
    uniforms.u_baseColor.value.copy(hexToVec3(e.target.value));
  });
  base.addEventListener('change', () => history?.push());

  f0.addEventListener('input', (e) => {
    f0Hex.textContent = e.target.value.toUpperCase();
    uniforms.u_f0.value.copy(hexToVec3(e.target.value));
  });
  f0.addEventListener('change', () => history?.push());

  sss.addEventListener('input', (e) => {
    sssHex.textContent = e.target.value.toUpperCase();
    uniforms.u_sssColor.value.copy(hexToVec3(e.target.value));
  });
  sss.addEventListener('change', () => history?.push());

  // ---- Slider wiring ----
  rough.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 100;
    roughV.textContent = e.target.value + '%';
    uniforms.u_roughness.value = v;
  });
  rough.addEventListener('change', () => history?.push());

  // Refraction slider 0..100% maps to u_refraction 0..0.20 (same scale
  // as Glass — gives a usable distortion range without hitting wrap).
  ref.addEventListener('input', (e) => {
    const pct = parseInt(e.target.value, 10);
    refV.textContent = pct + '%';
    uniforms.u_refraction.value = (pct / 100) * 0.20;
  });
  ref.addEventListener('change', () => history?.push());

  mix.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 100;
    mixV.textContent = e.target.value + '%';
    uniforms.u_refractionMix.value = v;
  });
  mix.addEventListener('change', () => history?.push());

  ss.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 100;
    ssV.textContent = e.target.value + '%';
    uniforms.u_sssStrength.value = v;
  });
  ss.addEventListener('change', () => history?.push());

  fres.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 100;
    fresV.textContent = e.target.value + '%';
    uniforms.u_fresnel.value = v;
  });
  fres.addEventListener('change', () => history?.push());

  fp.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 10;
    fpV.textContent = v.toFixed(1);
    uniforms.u_fresnelPower.value = v;
  });
  fp.addEventListener('change', () => history?.push());

  blob.addEventListener('click', () => {
    blobEnabled = !blobEnabled;
    blob.classList.toggle('on', blobEnabled);
    uniforms.u_blobEnabled.value = blobEnabled ? 1.0 : 0.0;
    history?.push();
  });

  return {
    snapshot() {
      return {
        material: {
          baseColor:        base.value,
          f0Color:          f0.value,
          roughness:        parseInt(rough.value, 10) / 100,
          // Store the slider pct alongside the scaled refraction so
          // restore is exact (no rounding loss on the float divide).
          refractionSlider: parseInt(ref.value, 10),
          refraction:       (parseInt(ref.value, 10) / 100) * 0.20,
          refractionMix:    parseInt(mix.value, 10) / 100,
          sssColor:         sss.value,
          sssStrength:      parseInt(ss.value, 10) / 100,
          fresnel:          parseInt(fres.value, 10) / 100,
          fresnelPower:     parseInt(fp.value, 10) / 10,
          blobEnabled,
        },
      };
    },
    restore(snap) {
      if (!snap?.material) return;
      const m = snap.material;
      if (typeof m.baseColor === 'string') {
        base.value = m.baseColor;
        baseHex.textContent = m.baseColor.toUpperCase();
        uniforms.u_baseColor.value.copy(hexToVec3(m.baseColor));
      }
      if (typeof m.f0Color === 'string') {
        f0.value = m.f0Color;
        f0Hex.textContent = m.f0Color.toUpperCase();
        uniforms.u_f0.value.copy(hexToVec3(m.f0Color));
      }
      if (typeof m.roughness === 'number') {
        const pct = Math.round(m.roughness * 100);
        rough.value = String(pct);
        roughV.textContent = pct + '%';
        uniforms.u_roughness.value = m.roughness;
      }
      if (typeof m.refraction === 'number') {
        const pct = typeof m.refractionSlider === 'number'
          ? m.refractionSlider
          : Math.round((m.refraction / 0.20) * 100);
        ref.value = String(pct);
        refV.textContent = pct + '%';
        uniforms.u_refraction.value = m.refraction;
      }
      if (typeof m.refractionMix === 'number') {
        const pct = Math.round(m.refractionMix * 100);
        mix.value = String(pct);
        mixV.textContent = pct + '%';
        uniforms.u_refractionMix.value = m.refractionMix;
      }
      if (typeof m.sssColor === 'string') {
        sss.value = m.sssColor;
        sssHex.textContent = m.sssColor.toUpperCase();
        uniforms.u_sssColor.value.copy(hexToVec3(m.sssColor));
      }
      if (typeof m.sssStrength === 'number') {
        const pct = Math.round(m.sssStrength * 100);
        ss.value = String(pct);
        ssV.textContent = pct + '%';
        uniforms.u_sssStrength.value = m.sssStrength;
      }
      if (typeof m.fresnel === 'number') {
        const pct = Math.round(m.fresnel * 100);
        fres.value = String(pct);
        fresV.textContent = pct + '%';
        uniforms.u_fresnel.value = m.fresnel;
      }
      if (typeof m.fresnelPower === 'number') {
        fp.value = String(Math.round(m.fresnelPower * 10));
        fpV.textContent = m.fresnelPower.toFixed(1);
        uniforms.u_fresnelPower.value = m.fresnelPower;
      }
      if (typeof m.blobEnabled === 'boolean') {
        blobEnabled = m.blobEnabled;
        blob.classList.toggle('on', blobEnabled);
        uniforms.u_blobEnabled.value = blobEnabled ? 1.0 : 0.0;
      }
    },
  };
}
