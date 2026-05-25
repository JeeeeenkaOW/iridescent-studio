// =========================================================
// PROJECT CONTROL — save / load full tool configuration
// =========================================================
// Wraps the same captureState() / applyState() pair history uses,
// but instead of in-memory undo it round-trips through a downloaded
// .json file. This lets a user save a material they've dialed in
// (Mercury with their iridescence phase + bloom + custom bg colors,
// say) and drop the json back in later to recreate it on a different
// source vector.
//
// What's saved:
//   shaderId, material, lighting, effects, bg, normals, motion
//   (exactly what captureState returns)
// What's NOT saved:
//   the uploaded SVG/PNG. The user supplies their own art per session.
//   Including the asset would bloat configs and conflate "look I made"
//   with "art I happened to be using when I made it". Easy to add a
//   "Save with asset" toggle later if needed.
//
// On load: we call applyState() — the same path used by undo/redo —
// then push() the resulting state onto history so the load itself is
// undoable. If the user loads the wrong file, ctrl+Z returns them to
// where they were.
//
// Version field: cheap insurance. If we ever change the snapshot
// shape incompatibly we can branch on it. For now we accept any v1
// and silently ignore unknown extra keys.
//
const CONFIG_VERSION = 1;
const FILE_PREFIX = 'wmf_';

function downloadJson(filename, obj) {
  const json = JSON.stringify(obj, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke — some browsers race on the download otherwise.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function timestamp() {
  // Local-time YYYYMMDD-HHMMSS, so saved files sort chronologically
  // and don't collide when the user clicks save twice quickly.
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function initProject({ captureState, applyState, history }) {
  const saveBtn = document.getElementById('btn-save-config');
  const loadBtn = document.getElementById('btn-load-config');
  const fileInput = document.getElementById('config-file-input');

  if (!saveBtn || !loadBtn || !fileInput) {
    console.warn('initProject: required DOM nodes not found');
    return;
  }

  saveBtn.addEventListener('click', () => {
    let snap;
    try {
      snap = captureState();
    } catch (e) {
      console.error('Save failed at capture:', e);
      alert('Failed to capture current configuration.');
      return;
    }
    const payload = {
      type: 'wmf-config',
      version: CONFIG_VERSION,
      savedAt: new Date().toISOString(),
      // Name the shader inline at the top level for human readability
      // when peeking at the json. The same value is inside `state` too.
      shader: snap.shaderId ?? null,
      state: snap,
    };
    downloadJson(`${FILE_PREFIX}config_${snap.shaderId || 'preset'}_${timestamp()}.json`, payload);
  });

  // Load button just delegates to the hidden file input.
  loadBtn.addEventListener('click', () => {
    fileInput.value = '';   // allow re-loading the same file
    fileInput.click();
  });

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    let text, parsed;
    try {
      text = await file.text();
    } catch (err) {
      alert('Could not read the file.');
      return;
    }
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      alert('That file isn\u2019t valid JSON.');
      return;
    }
    // Loose validation — accept anything that has a recognizable
    // `state` payload. Don't fail-hard on version mismatch; we may
    // bump CONFIG_VERSION for additive changes and still want old
    // configs to load.
    const state = parsed?.state ?? parsed;   // fall back to bare snapshot
    if (!state || typeof state !== 'object') {
      alert('That doesn\u2019t look like a Web Material Forge config.');
      return;
    }
    if (parsed?.type && parsed.type !== 'wmf-config') {
      alert('That file isn\u2019t a Web Material Forge config.');
      return;
    }

    try {
      await applyState(state);
    } catch (err) {
      console.error('Apply failed:', err);
      alert('Failed to apply that configuration.');
      return;
    }

    // Make the load itself an undoable step.
    history?.push?.();
  });
}
