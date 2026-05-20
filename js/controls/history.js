// =========================================================
// HISTORY — undo / redo stack with keyboard bindings
// =========================================================
// Snapshot-based undo. Each push() captures the full current state
// (returned by the `capture` callback) onto a stack. ctrl+Z pops one
// state and feeds it to the `apply` callback; ctrl+shift+Z / ctrl+Y
// redoes.
//
// Design choices:
//
//   - Snapshot, not command. Each entry is the entire state. Heavier
//     per-entry but no per-control glue code needed for undoability:
//     a new slider just needs to call history.push() after writing
//     its value, and capture() automatically picks it up via the
//     existing snapshot() functions.
//
//   - Push on every `input` event (paint-app style). A 2-second
//     slider drag produces ~100 entries; cap at MAX_ENTRIES so memory
//     stays bounded. Sequential identical snapshots are collapsed.
//
//   - `restoring` guard. Applying a snapshot mutates DOM inputs which
//     refire their `input` handlers — those handlers call push().
//     We swallow pushes while restoring, otherwise undo would just
//     push the pre-undo state and the user could never escape.
//
//   - History clears on upload. Reuploading is treated as a fresh
//     session (per the design discussion).
//
//   - Keyboard ignores key events from text inputs. The user might
//     be typing in a future text field; we don't want to hijack
//     their browser-native undo there.
//
const MAX_ENTRIES = 200;

export function initHistory({ capture, apply }) {
  // Past states for undo. The CURRENT state is NOT in this stack —
  // it's reconstructable from capture() at any moment. So `undo` =
  // pop one past state, apply it; `redo` = push current onto past,
  // pop one from future, apply it.
  const past   = [];
  const future = [];
  let restoring = false;

  function snapshotsEqual(a, b) {
    // Cheap structural check via JSON. Snapshots are small JSON-safe
    // objects (no Blobs / no Vec3 references) so this is fine and
    // catches the common "input event fired but value didn't change"
    // case.
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function push() {
    if (restoring) return;
    let snap;
    try {
      snap = capture();
    } catch (e) {
      console.warn('history.push capture failed:', e);
      return;
    }
    // Skip duplicates — input handlers sometimes fire twice for one
    // user action (e.g. arrow-key on a focused slider). No point
    // recording a no-op step.
    if (past.length && snapshotsEqual(past[past.length - 1], snap)) return;

    past.push(snap);
    if (past.length > MAX_ENTRIES) past.shift();
    // New action invalidates the redo branch.
    future.length = 0;
  }

  async function undo() {
    if (restoring) return;            // re-entrancy guard
    if (past.length < 2) return;
    const current = capture();
    future.push(current);
    past.pop();
    const target = past[past.length - 1];
    restoring = true;
    try { await apply(target); }
    finally { restoring = false; }
  }

  async function redo() {
    if (restoring) return;            // re-entrancy guard
    if (!future.length) return;
    const target = future.pop();
    past.push(target);
    if (past.length > MAX_ENTRIES) past.shift();
    restoring = true;
    try { await apply(target); }
    finally { restoring = false; }
  }

  function clear() {
    past.length = 0;
    future.length = 0;
    // Seed with the current state so the next undo has a fallback.
    try { past.push(capture()); } catch (e) { /* ignore */ }
  }

  // ---------- keyboard binding ----------
  function isTypingTarget(el) {
    if (!el) return false;
    const tag = el.tagName;
    if (tag === 'INPUT') {
      // ranges, colors, files don't count as "typing" — undo should
      // still work when those are focused.
      const t = (el.type || '').toLowerCase();
      return !['range', 'color', 'file', 'checkbox', 'radio', 'button', 'submit'].includes(t);
    }
    if (tag === 'TEXTAREA') return true;
    if (el.isContentEditable) return true;
    return false;
  }

  window.addEventListener('keydown', (e) => {
    if (isTypingTarget(e.target)) return;
    const meta = e.ctrlKey || e.metaKey;
    if (!meta) return;
    const key = e.key.toLowerCase();
    if (key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if ((key === 'z' && e.shiftKey) || key === 'y') {
      e.preventDefault();
      redo();
    }
  });

  // NOTE: We do NOT seed here. The caller (main.js) is responsible
  // for calling history.clear() once all controls are wired and
  // capture() can be safely invoked. Seeding too early would call
  // capture() before snapshot()-providing controls exist.

  return { push, undo, redo, clear };
}
