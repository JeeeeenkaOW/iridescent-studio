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

export function initShader({ onShaderChange, onMount, history }) {
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

    // Update the segmented picker UI to reflect the active material —
    // restore() bypasses the click handler so we need to sync here too.
    picker.querySelectorAll('.seg-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.id === shaderId);
    });

    // Swap the ShaderMaterial in main.js. The returned uniforms object
    // is the new authoritative target for all UI writes.
    const newUniforms = onShaderChange(shader);

    // Mount the material's own controls. Pass history through so the
    // material's per-slider/per-color handlers can push() on input.
    host.innerHTML = '';
    activeControls = shader.initControls({ host, uniforms: newUniforms, history });

    // Let main.js wire up the Effects panel against the new uniforms.
    if (onMount) onMount(newUniforms, shader);

    return { uniforms: newUniforms, controls: activeControls };
  }

  picker.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.id === activeShaderId) return;
      mount(btn.dataset.id);
      history?.push();
    });
  });

  // Initial mount
  mount(DEFAULT_SHADER);

  return {
    getActiveShader: () => getShader(activeShaderId),
    getActiveControls: () => activeControls,
    getActiveShaderId: () => activeShaderId,
    snapshot: () => activeControls?.snapshot?.() ?? null,
    // Switch to `targetId` if different, then return the (possibly new)
    // controls so the caller can call .restore() with the snap data.
    restoreShaderId(targetId) {
      if (targetId && targetId !== activeShaderId && getShader(targetId)) {
        mount(targetId);
      }
      return activeControls;
    },
  };
}
