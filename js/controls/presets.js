// =========================================================
// PRESETS — named whole-tool snapshots in the left rail
// =========================================================
// A preset is a captureState()-shaped snapshot — the exact same
// payload used by undo/redo and project save/load. Clicking a preset
// runs applyState() then pushes one history step.
//
// Built-in presets ship as partial snapshots (family + material). They
// set the material look and leave the rest of the document untouched —
// think of them as good starting points, not full scenes. "Save current
// as preset" captures EVERYTHING (material, lighting, effects, bg,
// normals, motion, freeze) and persists to localStorage, so user
// presets are full scenes.
//
// Swatch CSS classes (.pv-silver etc.) live in styles.css; user presets
// get a neutral swatch.
//
const LS_KEY = 'wmf-presets-v1';

// Solid-family snapshots are shaped { material: { ...fields } } to match
// the Solid controls' snapshot()/restore() contract.
const BUILTINS = [
  {
    id: 'silver', name: 'Silver', swatch: 'pv-silver', shaderId: 'solid',
    material: { material: {
      baseColor: '#C7BDB3', f0Color: '#E8DDC8', roughness: 0,
      refraction: 0, refractionSlider: 0, refractionMix: 0, frost: 0,
      sssColor: '#FFE3CC', sssStrength: 0, fresnel: 0, fresnelPower: 4,
      blobEnabled: true, blobRadius: 0.22,
    } },
  },
  {
    id: 'obsidian', name: 'Obsidian', swatch: 'pv-obsidian', shaderId: 'solid',
    material: { material: {
      baseColor: '#0C0C10', f0Color: '#1A1D22', roughness: 0.25,
      refraction: 0.08, refractionSlider: 40, refractionMix: 0.5, frost: 0.1,
      sssColor: '#1A2230', sssStrength: 0, fresnel: 0.45, fresnelPower: 4,
      blobEnabled: false, blobRadius: 0.22,
    } },
  },
  {
    id: 'pearl', name: 'Pearl', swatch: 'pv-pearl', shaderId: 'solid',
    material: { material: {
      baseColor: '#EDE6F0', f0Color: '#CDD6EA', roughness: 0.15,
      refraction: 0, refractionSlider: 0, refractionMix: 0, frost: 0,
      sssColor: '#F0D9E6', sssStrength: 0.4, fresnel: 0.25, fresnelPower: 4,
      blobEnabled: false, blobRadius: 0.22,
    } },
  },
  {
    // Embers switches to the Particle family at its defaults — a safe
    // starting point. Tune, then "Save current as preset" to capture it.
    id: 'embers', name: 'Embers', swatch: 'pv-embers', shaderId: 'particles',
    material: null,
  },
];

function loadUser() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
  catch { return []; }
}
function saveUser(list) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {}
}

export function initPresets({ host, saveBtn, captureState, applyState, history, toast }) {
  if (!host) return null;
  let userPresets = loadUser();
  let activeId = 'silver';

  function render() {
    const all = [...BUILTINS, ...userPresets];
    host.innerHTML = all.map(p => {
      const swatch = p.swatch
        ? `<span class="pv ${p.swatch}"></span>`
        : `<span class="pv pv-user"></span>`;
      const del = p.user
        ? `<button class="preset-del" data-del="${p.id}" title="Delete preset">×</button>`
        : '';
      return `<button class="preset${p.id === activeId ? ' active' : ''}" data-preset="${p.id}">
                ${swatch}<span class="pn">${p.name}</span>${del}
              </button>`;
    }).join('');
  }

  function find(id) {
    return BUILTINS.find(p => p.id === id) || userPresets.find(p => p.id === id);
  }

  async function apply(id) {
    const p = find(id);
    if (!p) return;
    activeId = id;
    render();
    // Build a snapshot from the current state, then overlay the preset's
    // fields so partial built-ins only touch what they define.
    const base = captureState();
    const snap = p.user ? p.snapshot : { ...base, shaderId: p.shaderId, material: p.material };
    await applyState(snap);
    history?.push();
    toast?.('Applied preset · ' + p.name);
  }

  host.addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del) {
      e.stopPropagation();
      const id = del.dataset.del;
      userPresets = userPresets.filter(p => p.id !== id);
      saveUser(userPresets);
      if (activeId === id) activeId = 'silver';
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
      userPresets.push({ id, name, user: true, snapshot: captureState() });
      saveUser(userPresets);
      activeId = id;
      render();
      toast?.('Saved current as preset · ' + name);
    });
  }

  render();
  return {
    // Let other surfaces clear the active highlight when the user edits
    // away from a preset (optional; not currently wired).
    clearActive() { activeId = null; render(); },
  };
}
