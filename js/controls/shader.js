// =========================================================
// SHADER CONTROL — top-level material picker
// =========================================================
// Renders the segmented picker of available materials. On selection:
//   1. Asks main.js to swap the active ShaderMaterial (onShaderChange)
//   2. Clears #shader-controls and mounts the new material's UI
//   3. Notifies main.js via onMount() so external panels (Effects)
//      can re-bind to the new uniform object
//
// The Effects panel is owned by main.js (not by the material) because
// effects are global — they apply across all materials and need to
// re-bind whenever the active uniform object changes.
//
import { listShaders, getShader, DEFAULT_SHADER } from '../shaders/index.js';

export function initShader({ onShaderChange, onMount }) {
  const picker = document.getElementById('shader-picker');
  const host = document.getElementById('shader-controls');

  const shaders = listShaders();
  picker.className = 'segmented';
  picker.style.gridTemplateColumns = `repeat(${Math.min(shaders.length, 4)}, 1fr)`;
  picker.innerHTML = shaders.map((s) => `
    <button class="seg-btn${s.id === DEFAULT_SHADER ? ' active' : ''}" data-id="${s.id}">${s.name}</button>
  `).join('');

  let activeShaderId = DEFAULT_SHADER;
  let activeControls = null;

  function mount(shaderId) {
    activeShaderId = shaderId;
    const shader = getShader(shaderId);

    // Swap the ShaderMaterial in main.js. The returned uniforms object
    // is the new authoritative target for all UI writes.
    const newUniforms = onShaderChange(shader);

    // Mount the material's own controls.
    host.innerHTML = '';
    activeControls = shader.initControls({ host, uniforms: newUniforms });

    // Let main.js wire up the Effects panel against the new uniforms.
    if (onMount) onMount(newUniforms, shader);
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
