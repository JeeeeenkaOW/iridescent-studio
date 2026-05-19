// =========================================================
// MATERIAL CONTROL — preset picker + tint color/strength
// =========================================================
// applyMaterial(material) pushes preset uniforms (currently just the
// palette phase). The tint controls live alongside but are independent
// of preset selection — they apply on top of whatever preset is active.
//
// Tint at strength 0 is byte-equivalent to no tint at all (see
// composite.glsl.js).
//
import * as THREE from 'three';
import { MATERIALS } from '../presets/index.js';

// Tiny hex parser so we don't pull in another util file.
function hexToVec3(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return new THREE.Vector3(1, 1, 1);
  const n = parseInt(m[1], 16);
  return new THREE.Vector3(
    ((n >> 16) & 255) / 255,
    ((n >>  8) & 255) / 255,
    ( n        & 255) / 255,
  );
}

export function initMaterial({ state, uniforms }) {
  const buttons = document.querySelectorAll('#seg-material .seg-btn');

  function applyMaterial(material) {
    // Phase 1: only palette phase (current behavior, byte-equivalent to original).
    uniforms.u_paletteD.value.set(...material.palette.phase);

    // Future expansions go here. When we promote more values to uniforms
    // (specular power, halo intensity, etc.), add the assignments below
    // and they'll automatically apply on preset change.
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.material = btn.dataset.mat;
      applyMaterial(MATERIALS[state.material]);
    });
  });

  // ---------- Tint ----------
  function applyTint() {
    const v = hexToVec3(state.tintColor);
    uniforms.u_tintColor.value.copy(v);
    uniforms.u_tintStrength.value = state.tintStrength;
  }

  const tintColor = document.getElementById('mat-tint-color');
  const tintHex   = document.getElementById('mat-tint-hex');
  const tintStr   = document.getElementById('mat-tint-strength');
  const tintStrVal = document.getElementById('mat-tint-strength-val');

  tintColor.value = state.tintColor;
  tintHex.textContent = state.tintColor.toUpperCase();
  tintStr.value = String(Math.round(state.tintStrength * 100));
  tintStrVal.textContent = Math.round(state.tintStrength * 100) + '%';

  tintColor.addEventListener('input', (e) => {
    state.tintColor = e.target.value;
    tintHex.textContent = e.target.value.toUpperCase();
    applyTint();
  });
  tintStr.addEventListener('input', (e) => {
    state.tintStrength = parseInt(e.target.value, 10) / 100;
    tintStrVal.textContent = e.target.value + '%';
    applyTint();
  });

  // Initial push so uniforms reflect initial state.
  applyTint();

  return { applyMaterial };
}
