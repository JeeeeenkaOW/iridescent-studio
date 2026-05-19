// =========================================================
// SHADER CONTROL — top-level shader picker
// =========================================================
// Renders the segmented picker of available shaders and mounts the
// selected shader's controls into `#shader-controls`. Each shader's
// `initControls({ host, uniforms })` writes its own UI into that host.
//
// When a shader is picked, the picker:
//   1. Asks main.js to swap the active ShaderMaterial
//   2. Clears #shader-controls
//   3. Calls the new shader's initControls()
//
import { listShaders, getShader, DEFAULT_SHADER } from '../shaders/index.js';

export function initShader({ onShaderChange }) {
  const picker = document.getElementById('shader-picker');
  const host = document.getElementById('shader-controls');

  const shaders = listShaders();
  picker.className = 'segmented';
  picker.style.gridTemplateColumns = `repeat(${Math.min(shaders.length, 4)}, 1fr)`;
  picker.innerHTML = shaders.map((s, i) => `
    <button class="seg-btn${s.id === DEFAULT_SHADER ? ' active' : ''}" data-id="${s.id}">${s.name}</button>
  `).join('');

  let activeShaderId = DEFAULT_SHADER;
  let activeControls = null;

  function mount(shaderId) {
    activeShaderId = shaderId;
    const shader = getShader(shaderId);

    // Tell main.js to swap the ShaderMaterial. main.js returns the new
    // uniforms object so we can hand it to the controls.
    const newUniforms = onShaderChange(shader);

    // Clear and rebuild controls
    host.innerHTML = '';
    activeControls = shader.initControls({ host, uniforms: newUniforms });
  }

  picker.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.id === activeShaderId) return;
      picker.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      mount(btn.dataset.id);
    });
  });

  // Initial mount
  mount(DEFAULT_SHADER);

  return {
    getActiveShader: () => getShader(activeShaderId),
    snapshot: () => activeControls?.snapshot?.() ?? null,
  };
}
