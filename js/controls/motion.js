// =========================================================
// MOTION CONTROL — auto-drift toggle
// =========================================================
// When on, the cursor target eases into a Lissajous-style path after
// IDLE_DELAY seconds of no mouse movement. Logic lives in main.js's
// render loop; this control just owns the boolean.
//
export function initMotion({ state, history }) {
  const toggle = document.getElementById('ctl-auto-drift');
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('on');
    state.autoDrift = toggle.classList.contains('on');
    history?.push();
  });

  return {
    snapshot() {
      return { autoDrift: state.autoDrift };
    },
    restore(snap) {
      if (!snap) return;
      state.autoDrift = !!snap.autoDrift;
      toggle.classList.toggle('on', state.autoDrift);
    },
  };
}
