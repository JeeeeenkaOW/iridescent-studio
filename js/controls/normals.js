// =========================================================
// NORMALS CONTROL — Sobel vs SDF + strength slider
// =========================================================
// Strength slider uses 'input' for live preview value display and
// 'change' (release) for the actual rebuild — texture regeneration
// is expensive (~30ms at 1024px) so we debounce to release.
//
// History semantics: every `input` event pushes a snapshot (per the
// design discussion — paint-app style, one undo step per value).
// The actual rebuild stays on 'change' so we don't thrash texgen,
// but the undo state is granular per drag position.
//
export function initNormals({ state, rebuild, history }) {
  document.querySelectorAll('#seg-normals .seg-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('#seg-normals .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.normals = btn.dataset.nm;
      await rebuild();
      history?.push();
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
    history?.push();
  });

  return {
    snapshot() {
      return {
        normals:  state.normals,
        strength: state.strength,
      };
    },
    async restore(snap, { rebuildNow = true } = {}) {
      if (!snap) return;
      let changed = false;
      // Mode buttons
      if (snap.normals && snap.normals !== state.normals) {
        state.normals = snap.normals;
        document.querySelectorAll('#seg-normals .seg-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.nm === state.normals);
        });
        changed = true;
      }
      // Strength slider
      if (typeof snap.strength === 'number' && snap.strength !== state.strength) {
        state.strength = snap.strength;
        strengthInput.value = String(snap.strength);
        strengthVal.textContent = snap.strength.toFixed(1);
        changed = true;
      }
      // Only rebuild the texture if something we care about actually
      // changed — undo through 100 mid-drag entries shouldn't thrash
      // texgen. (Rebuild is ~30ms at 1024px.)
      if (rebuildNow && changed) await rebuild();
    },
  };
}
