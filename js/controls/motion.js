// =========================================================
// MOTION CONTROL — auto-drift + preview-loop toggles
// =========================================================
// auto-drift: when on, cursor target eases into a Lissajous-style path
// after IDLE_DELAY seconds of no mouse movement.
//
// preview-loop: when on, the editor renders in the same "loop time
// domain" the export recorder uses — cursor follows the circular
// looping path, shader noise is periodic, t wraps at loopDuration.
// Lets the user verify their export loop closes before recording.
// Cursor input is ignored while it's on.
//
// Both flags live in state; render loop in main.js reads them.
//
export function initMotion({ state, history }) {
  const toggle = document.getElementById('ctl-auto-drift');
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('on');
    state.autoDrift = toggle.classList.contains('on');
    history?.push();
  });

  const loopToggle = document.getElementById('ctl-preview-loop');
  if (loopToggle) {
    loopToggle.classList.toggle('on', !!state.previewLoop);
    loopToggle.addEventListener('click', () => {
      state.previewLoop = !state.previewLoop;
      loopToggle.classList.toggle('on', state.previewLoop);
      history?.push();
    });
  }

  return {
    snapshot() {
      return {
        autoDrift:   state.autoDrift,
        previewLoop: state.previewLoop,
      };
    },
    restore(snap) {
      if (!snap) return;
      state.autoDrift = !!snap.autoDrift;
      toggle.classList.toggle('on', state.autoDrift);
      if (typeof snap.previewLoop === 'boolean') {
        state.previewLoop = snap.previewLoop;
        if (loopToggle) loopToggle.classList.toggle('on', state.previewLoop);
      }
    },
  };
}
