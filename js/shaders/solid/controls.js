// =========================================================
// SOLID CONTROLS — sidebar UI for the unified material
// =========================================================
// v8 cleanup — removed two sliders that had little perceptual impact:
//   - Bg refraction (only mattered when Transparency > 0, but at low
//     transparency the offset is invisible anyway). Now Transparency
//     ALONE drives both the bg leak and the refraction offset.
//   - Fresnel power (rim sharpness — most users couldn't tell the
//     difference between 2.0 and 6.0). Hardcoded to defaults.fresnelPower.
//
// Sliders that remain:
//   Base color      — diffuse albedo
//   Reflection      — F0 colour (warm silver = metallic; cool/dark = dielectric)
//   Roughness       — 0 = smooth, high = stippled
//   Transparency    — 0 = opaque, high = glass-like bg leak + refraction
//   Inner glow      — subsurface tint colour
//   Glow strength   — 0 = no inner glow; high = porcelain look
//   Fresnel rim     — 0 = no edge highlight; high = clearcoat-style outline
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
        <div class="range-label"><span>Transparency</span><span class="range-value" data-sc-mix-val>${Math.round(d.material.refractionMix * 100)}%</span></div>
        <input type="range" data-sc-mix min="0" max="100" step="1" value="${Math.round(d.material.refractionMix * 100)}">
      </div>

      <div class="range-row">
        <div class="range-label"><span>Refraction</span><span class="range-value" data-sc-refract-val>${Math.round((d.material.refraction / 0.20) * 100)}%</span></div>
        <input type="range" data-sc-refract min="0" max="100" step="1" value="${Math.round((d.material.refraction / 0.20) * 100)}">
      </div>

      <div class="range-row">
        <div class="range-label"><span>Frost</span><span class="range-value" data-sc-frost-val>${Math.round(d.material.frost * 100)}%</span></div>
        <input type="range" data-sc-frost min="0" max="100" step="1" value="${Math.round(d.material.frost * 100)}">
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

      <div class="toggle-row">
        <label>Cursor blob</label>
        <div class="toggle ${d.material.blobEnabled ? 'on' : ''}" data-sc-blob></div>
      </div>

      <div class="range-row">
        <div class="range-label"><span>Cursor blob size</span><span class="range-value" data-sc-blobr-val>${Math.round(d.material.blobRadius * 100)}%</span></div>
        <input type="range" data-sc-blobr min="5" max="150" step="1" value="${Math.round(d.material.blobRadius * 100)}">
      </div>
  `;

  const base    = host.querySelector('[data-sc-base]');
  const baseHex = host.querySelector('[data-sc-base-hex]');
  const f0      = host.querySelector('[data-sc-f0]');
  const f0Hex   = host.querySelector('[data-sc-f0-hex]');
  const rough   = host.querySelector('[data-sc-rough]');
  const roughV  = host.querySelector('[data-sc-rough-val]');
  const mix     = host.querySelector('[data-sc-mix]');
  const mixV    = host.querySelector('[data-sc-mix-val]');
  const refract = host.querySelector('[data-sc-refract]');
  const refractV= host.querySelector('[data-sc-refract-val]');
  const frost   = host.querySelector('[data-sc-frost]');
  const frostV  = host.querySelector('[data-sc-frost-val]');
  const sss     = host.querySelector('[data-sc-sss]');
  const sssHex  = host.querySelector('[data-sc-sss-hex]');
  const ss      = host.querySelector('[data-sc-ss]');
  const ssV     = host.querySelector('[data-sc-ss-val]');
  const fres    = host.querySelector('[data-sc-fres]');
  const fresV   = host.querySelector('[data-sc-fres-val]');
  const blob    = host.querySelector('[data-sc-blob]');
  const blobR   = host.querySelector('[data-sc-blobr]');
  const blobRV  = host.querySelector('[data-sc-blobr-val]');

  let blobEnabled = !!d.material.blobEnabled;

  // Transparency now drives ONLY the bg leak (u_refractionMix). The
  // distortion (u_refraction) and frosting (u_frost) are independent
  // knobs below, so the unified material can reproduce the old Glass
  // shader's separate Transparency / Refraction / Frost controls.
  function setTransparency(pct) {
    uniforms.u_refractionMix.value = pct / 100;
  }

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

  mix.addEventListener('input', (e) => {
    const pct = parseInt(e.target.value, 10);
    mixV.textContent = pct + '%';
    setTransparency(pct);
  });
  mix.addEventListener('change', () => history?.push());

  // Refraction — slider 0..100% maps to u_refraction 0..0.20.
  refract.addEventListener('input', (e) => {
    const pct = parseInt(e.target.value, 10);
    refractV.textContent = pct + '%';
    uniforms.u_refraction.value = (pct / 100) * 0.20;
  });
  refract.addEventListener('change', () => history?.push());

  // Frost — slider 0..100% maps to u_frost 0..1.
  frost.addEventListener('input', (e) => {
    const pct = parseInt(e.target.value, 10);
    frostV.textContent = pct + '%';
    uniforms.u_frost.value = pct / 100;
  });
  frost.addEventListener('change', () => history?.push());

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

  blob.addEventListener('click', () => {
    blobEnabled = !blobEnabled;
    blob.classList.toggle('on', blobEnabled);
    uniforms.u_blobEnabled.value = blobEnabled ? 1.0 : 0.0;
    history?.push();
  });

  // Cursor blob radius — slider value [5..150] maps directly to
  // u_blobRadius [0.05..1.50] in aspect-corrected UV space. Above ~100
  // the blob can cover the whole viewport (UV space is normalized to a
  // unit square per axis), which is intended headroom for a big soft
  // wash. The
  // metaball shader scales the inner edge proportionally so the soft
  // falloff looks consistent across the range. Slider stays active
  // even when the blob toggle is off — adjusting it pre-sets the size
  // so re-enabling the blob brings back exactly the size the user
  // last dialed in. Push on `change` to keep drag = one undo step.
  blobR.addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10);
    blobRV.textContent = v + '%';
    uniforms.u_blobRadius.value = v / 100;
  });
  blobR.addEventListener('change', () => history?.push());

  return {
    snapshot() {
      const mixPct     = parseInt(mix.value, 10);
      const refractPct = parseInt(refract.value, 10);
      return {
        material: {
          baseColor:        base.value,
          f0Color:          f0.value,
          roughness:        parseInt(rough.value, 10) / 100,
          // Refraction and Transparency are now independent knobs.
          // Store the refraction slider pct so restore is exact.
          refraction:       (refractPct / 100) * 0.20,
          refractionSlider: refractPct,
          refractionMix:    mixPct / 100,
          frost:            parseInt(frost.value, 10) / 100,
          sssColor:         sss.value,
          sssStrength:      parseInt(ss.value, 10) / 100,
          fresnel:          parseInt(fres.value, 10) / 100,
          // fresnelPower is no longer a slider — locked to defaults.
          fresnelPower:     defaults.material.fresnelPower,
          blobEnabled,
          blobRadius:       parseInt(blobR.value, 10) / 100,
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
      if (typeof m.refractionMix === 'number') {
        const pct = Math.round(m.refractionMix * 100);
        mix.value = String(pct);
        mixV.textContent = pct + '%';
        setTransparency(pct);
      }
      if (typeof m.refraction === 'number') {
        // Prefer the stored slider pct (no rounding loss); else derive
        // from the 0..0.20 refraction value. Legacy solid snapshots that
        // coupled refraction to transparency restore at their stored
        // value too, so the look is preserved.
        const pct = typeof m.refractionSlider === 'number'
          ? m.refractionSlider
          : Math.round((m.refraction / 0.20) * 100);
        refract.value = String(pct);
        refractV.textContent = pct + '%';
        uniforms.u_refraction.value = m.refraction;
      }
      if (typeof m.frost === 'number') {
        const pct = Math.round(m.frost * 100);
        frost.value = String(pct);
        frostV.textContent = pct + '%';
        uniforms.u_frost.value = m.frost;
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
      if (typeof m.blobEnabled === 'boolean') {
        blobEnabled = m.blobEnabled;
        blob.classList.toggle('on', blobEnabled);
        uniforms.u_blobEnabled.value = blobEnabled ? 1.0 : 0.0;
      }
      if (typeof m.blobRadius === 'number') {
        const pct = Math.round(m.blobRadius * 100);
        blobR.value = String(pct);
        blobRV.textContent = pct + '%';
        uniforms.u_blobRadius.value = m.blobRadius;
      }
    },
  };
}
