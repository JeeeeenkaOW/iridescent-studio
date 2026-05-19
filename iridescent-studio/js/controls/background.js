// =========================================================
// BACKGROUND CONTROL — Dark void vs Parchment
// =========================================================
// Switches u_lightMode and the clear color. Parchment is a warm
// off-white (#f2ebdc) that pairs with the iridescent halo.
//
import * as THREE from 'three';

export function initBackground({ state, uniforms, renderer }) {
  function applyBg() {
    if (state.bgMode === 'light') {
      const bg = new THREE.Color('#f2ebdc');
      renderer.setClearColor(bg, 1);
      uniforms.u_bgColor.value.set(bg.r, bg.g, bg.b);
      uniforms.u_lightMode.value = 1.0;
    } else {
      renderer.setClearColor(0x000000, 1);
      uniforms.u_bgColor.value.set(0, 0, 0);
      uniforms.u_lightMode.value = 0.0;
    }
  }

  document.querySelectorAll('#seg-bg .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#seg-bg .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.bgMode = btn.dataset.bg;
      applyBg();
    });
  });

  return { applyBg };
}
