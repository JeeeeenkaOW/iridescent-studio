// =========================================================
// NORMALS CONTROL — Sobel vs SDF + strength slider
// =========================================================
// Strength slider uses 'input' for live preview value display and
// 'change' (release) for the actual rebuild — texture regeneration
// is expensive (~30ms at 1024px) so we debounce to release.
//
export function initNormals({ state, rebuild }) {
  document.querySelectorAll('#seg-normals .seg-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('#seg-normals .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.normals = btn.dataset.nm;
      await rebuild();
    });
  });

  const strengthInput = document.getElementById('ctl-strength');
  const strengthVal = document.getElementById('val-strength');

  strengthInput.addEventListener('input', (e) => {
    state.strength = parseFloat(e.target.value);
    strengthVal.textContent = state.strength.toFixed(1);
  });
  strengthInput.addEventListener('change', async () => {
    await rebuild();
  });
}
