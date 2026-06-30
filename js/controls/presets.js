// =========================================================
// PRESETS — saved whole-tool snapshots
// =========================================================
// A preset is a captureState()-shaped snapshot — the same payload used
// by undo/redo and project save/load. No built-ins: the user builds a
// look and saves it.
//
//   Save current as preset → (1) stores a "my preset" in localStorage
//       so it's one click away in this browser, AND (2) downloads a
//       .wmf.json file the user can keep and load in another session
//       (there's no backend).
//   Load preset → pick a .wmf.json (or project .json) and apply it.
//
// Saved presets render as a chip grid; click to apply, × to delete.
//
import { BUILTIN_PRESETS } from '../presets/builtins.js';

const LS_KEY = 'wmf-presets-v1';

function loadUser() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
  catch { return []; }
}
function saveUser(list) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {}
}
function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function initPresets({ host, saveBtn, loadBtn, captureState, applyState, history, toast }) {
  if (!host) return null;
  let userPresets = loadUser();
  let activeId = null;

  // Hidden file input for Load.
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  // Built-in gallery chips use an inline swatch background; user chips
  // keep the neutral pv-user swatch and a delete affordance.
  function builtinChip(p) {
    // Baked photo thumbnail (rendered from the live shader) over the swatch
    // gradient — the gradient shows only if the image is missing.
    const bg = `background:url('js/presets/thumbs/${p.id}.jpg') center/cover, ${p.swatch}`;
    return `
      <button class="preset${p.id === activeId ? ' active' : ''}" data-preset="${p.id}" title="${p.name}">
        <span class="pv" style="${bg}"></span>
        <span class="pn">${p.name}</span>
      </button>`;
  }
  function userChip(p) {
    return `
      <button class="preset${p.id === activeId ? ' active' : ''}" data-preset="${p.id}" title="${p.name}">
        <span class="pv pv-user"></span>
        <span class="pn">${p.name}</span>
        <span class="preset-del" data-del="${p.id}" title="Delete preset">×</span>
      </button>`;
  }

  function render() {
    const gallery = BUILTIN_PRESETS.map(builtinChip).join('');
    const userBlock = userPresets.length
      ? userPresets.map(userChip).join('')
      : `<div class="preset-empty">No saved presets yet. Build a look, then “Save preset”.</div>`;
    host.innerHTML =
      gallery +
      `<div class="preset-section-label">Your presets</div>` +
      userBlock;
  }

  async function apply(id) {
    const p = BUILTIN_PRESETS.find(x => x.id === id) || userPresets.find(x => x.id === id);
    if (!p) return;
    activeId = id;
    render();
    await applyState(p.snapshot);
    history?.push();
    toast?.('Applied · ' + p.name);
  }

  host.addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del) {
      e.stopPropagation();
      const id = del.dataset.del;
      userPresets = userPresets.filter(p => p.id !== id);
      saveUser(userPresets);
      if (activeId === id) activeId = null;
      render();
      toast?.('Preset deleted');
      return;
    }
    const btn = e.target.closest('[data-preset]');
    if (btn) apply(btn.dataset.preset);
  });

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const name = (prompt('Name this preset:', 'My preset') || '').trim();
      if (!name) return;
      const id = 'user-' + Date.now().toString(36);
      const snapshot = captureState();
      // (1) persist in-app
      userPresets.push({ id, name, snapshot });
      saveUser(userPresets);
      activeId = id;
      render();
      // (2) download a portable file for other sessions
      const safe = name.replace(/[^a-z0-9_-]+/gi, '_').toLowerCase();
      downloadJSON({ _wmfPreset: 1, name, snapshot }, `${safe}.wmf.json`);
      toast?.('Saved preset · ' + name);
    });
  }

  if (loadBtn) {
    loadBtn.addEventListener('click', () => fileInput.click());
  }
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      // Accept a preset wrapper (.wmf.json), an old project config
      // ({type,state,...}), or a raw captureState payload.
      const snapshot = data.snapshot || data.state || data;
      const name = data.name || file.name.replace(/\.(wmf\.)?json$/i, '');
      await applyState(snapshot);
      // Loading also adds it to the in-app list so it persists.
      const id = 'user-' + Date.now().toString(36);
      userPresets.push({ id, name, snapshot });
      saveUser(userPresets);
      activeId = id;
      render();
      history?.push();
      toast?.('Loaded preset · ' + name);
    } catch (err) {
      alert('Could not load preset: ' + (err.message || err));
    }
  });

  render();
  return { clearActive() { activeId = null; render(); } };
}
