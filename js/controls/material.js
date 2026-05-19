// =========================================================
// MATERIAL CONTROL — picks which preset is active
// =========================================================
// Currently only updates u_paletteD (matches original behavior). When we
// expand the schema to drive more uniforms, this is where the assignments
// land — call applyMaterial(material) and it pushes every cluster.
//
import { MATERIALS } from '../presets/index.js';

export function initMaterial({ state, uniforms }) {
  const buttons = document.querySelectorAll('#seg-material .seg-btn');

  function applyMaterial(material) {
    // Phase 1: only palette phase (current behavior, byte-equivalent to original).
    uniforms.u_paletteD.value.set(...material.palette.phase);

    // Future expansions go here. When we promote more values to uniforms
    // (specular power, halo intensity, etc.), add the assignments below
    // and they'll automatically apply on preset change.
    //
    // Example for when specular gets its own uniforms:
    //   uniforms.u_specPower.value     = material.specular.power;
    //   uniforms.u_specIntensity.value = material.specular.intensity;
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.material = btn.dataset.mat;
      applyMaterial(MATERIALS[state.material]);
    });
  });

  return { applyMaterial };
}
