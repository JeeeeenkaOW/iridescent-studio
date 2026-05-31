// =========================================================
// FREEZE / POSE CONTROL
// =========================================================
// Lets the user lock the current light/iridescence position AND the
// time-driven motion (flow noise, particles, grain drift) to a single
// snapshot. While frozen:
//   - u_mouse is pinned to state.freezePos (no hover, no auto-drift)
//   - u_mouseVel is zero (no smear from frame-to-frame deltas)
//   - u_time is pinned to state.freezeTime (everything stops)
//   - clicking on the viewport repositions the freeze point in real
//     time so the user can hunt for the best angle, then PNG-export
//     the exact pose
//
// While unfrozen, the render loop's existing logic runs untouched —
// auto-drift after idle, hover-tracking on move, preview-loop, etc.
//
// On enable, we capture the CURRENT mouseSmooth + u_time as the
// starting frozen values via the `getCurrent` callback. This means
// "freeze right now" preserves what you were already seeing rather
// than snapping to (0.5, 0.5, t=0).
//
// Click-to-place is freeze-only: when freeze is off, the regular
// hover/drift path owns the cursor and a click would conflict with
// it. The toggle is the gate.
//
export function initFreeze({ state, viewport, getCurrent, history }) {
  const toggle  = document.getElementById('ctl-freeze');
  const hint    = document.getElementById('ctl-freeze-hint');
  if (!toggle) return null;

  function paint() {
    toggle.classList.toggle('on', !!state.freeze);
    if (hint) hint.style.opacity = state.freeze ? '1' : '0.45';
  }

  toggle.addEventListener('click', () => {
    const turningOn = !state.freeze;
    if (turningOn) {
      // Snapshot current visual state so enabling preserves the pose.
      const cur = getCurrent();
      state.freezePos.x = cur.x;
      state.freezePos.y = cur.y;
      state.freezeTime  = cur.time;
    }
    state.freeze = turningOn;
    paint();
    history?.push();
  });

  // Click-to-place. Only acts while frozen — when unfrozen, the
  // pointermove handler in main.js already owns the cursor and a
  // click would be either redundant (hover already places it) or
  // visually fight a half-second later when hover overrides.
  //
  // `pointerdown` rather than `click` so the placement happens on
  // press (snappier) and we don't accidentally swallow drag gestures
  // some future feature might add. We also fire on `pointermove`
  // while the button is held, so the user can drag-position too.
  let dragging = false;
  function placeFromEvent(e) {
    if (!state.freeze) return;
    const rect = viewport.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top)  / rect.height;
    state.freezePos.x = Math.max(0, Math.min(1, x));
    state.freezePos.y = Math.max(0, Math.min(1, y));
  }
  viewport.addEventListener('pointerdown', (e) => {
    if (!state.freeze) return;
    dragging = true;
    placeFromEvent(e);
    // History push happens on pointerup so drag-positioning collapses
    // into one undo step (same philosophy as slider drags pushing on
    // `change` rather than `input`).
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    placeFromEvent(e);
  });
  window.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    history?.push();
  });

  paint();

  return {
    snapshot() {
      return {
        freeze:     !!state.freeze,
        freezePos:  { x: state.freezePos.x, y: state.freezePos.y },
        freezeTime: state.freezeTime,
      };
    },
    restore(snap) {
      if (!snap) return;
      state.freeze = !!snap.freeze;
      if (snap.freezePos) {
        state.freezePos.x = snap.freezePos.x;
        state.freezePos.y = snap.freezePos.y;
      }
      if (typeof snap.freezeTime === 'number') {
        state.freezeTime = snap.freezeTime;
      }
      paint();
    },
  };
}
