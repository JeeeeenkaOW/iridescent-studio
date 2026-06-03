// =========================================================
// IRIDESCENCE EFFECT — controls
// =========================================================
// Layout (in the effect's collapsible card body):
//
//   [Pearl rainbow | Custom gradient]   <- mode toggle (segmented)
//   Hue           [ slider ]            <- always visible
//   Intensity     [ slider ]            <- always visible
//
//   --- only when mode == 'custom' ---
//   ┌─────── gradient strip ─────────┐
//   │  (live preview, click to add)   │
//   └─────────────────────────────────┘
//      ▼      ▼          ▼          <- draggable stop pins
//   Selected stop: [ color ] [ hex ] [pos %] [del]
//
// The LUT regenerates whenever mode, stops, or anything that affects
// the underlying palette changes. Hue does NOT trigger regeneration —
// the shader applies hue at sample time. This matters: dragging hue
// is a hot path during exploration and should stay free.
//
// History pushes follow the project pattern of one push per gesture:
// slider drags push on `change` (release), stop drags push on
// pointerup, color picker closes push on `change`, add/remove push
// immediately.
//
import { defaults } from './defaults.js';
import {
  generatePearlLUT,
  generateStopsLUT,
  writeLUT,
  hexToRgb,
  rgbToHex,
  sampleLUTToStops,
} from './lut.js';

export function initControls({ host, uniforms, isEnabled, history }) {
  const d = defaults;

  host.innerHTML = `
    <div class="segmented cols-2" data-iri-mode>
      <button class="seg-btn ${d.mode === 'pearl'  ? 'active' : ''}" data-mode="pearl">Pearl rainbow</button>
      <button class="seg-btn ${d.mode === 'custom' ? 'active' : ''}" data-mode="custom">Custom gradient</button>
    </div>

    <div class="range-row">
      <div class="range-label"><span>Hue</span><span class="range-value" data-iri-hue-val>${d.hue}°</span></div>
      <input type="range" data-iri-hue min="0" max="360" step="1" value="${d.hue}">
    </div>
    <div class="range-row">
      <div class="range-label"><span>Intensity</span><span class="range-value" data-iri-int-val>${Math.round(d.intensity * 100)}%</span></div>
      <input type="range" data-iri-int min="0" max="200" step="1" value="${Math.round(d.intensity * 100)}">
    </div>

    <div class="iri-gradient" data-iri-gradient hidden>
      <div class="iri-strip" data-iri-strip title="Click to add a stop"></div>
      <div class="iri-pins" data-iri-pins></div>
      <div class="iri-stop-inspector" data-iri-inspector hidden>
        <input type="color" data-iri-stop-color>
        <input type="text" class="iri-hex-input" data-iri-stop-hex placeholder="#RRGGBB" maxlength="7">
        <span class="iri-stop-pos" data-iri-stop-pos>0%</span>
        <button class="iri-stop-del" data-iri-stop-del title="Remove this stop">×</button>
      </div>
      <div class="iri-hint">Click the strip to add a stop. Drag pins to reposition. Min 2 stops.</div>
    </div>
  `;

  // ---- Element grabs ----
  const segBtns = host.querySelectorAll('[data-iri-mode] .seg-btn');
  const hueIn   = host.querySelector('[data-iri-hue]');
  const hueVal  = host.querySelector('[data-iri-hue-val]');
  const intIn   = host.querySelector('[data-iri-int]');
  const intVal  = host.querySelector('[data-iri-int-val]');
  const gradWrap = host.querySelector('[data-iri-gradient]');
  const strip    = host.querySelector('[data-iri-strip]');
  const pinsHost = host.querySelector('[data-iri-pins]');
  const inspector = host.querySelector('[data-iri-inspector]');
  const stopColor = host.querySelector('[data-iri-stop-color]');
  const stopHex   = host.querySelector('[data-iri-stop-hex]');
  const stopPos   = host.querySelector('[data-iri-stop-pos]');
  const stopDel   = host.querySelector('[data-iri-stop-del]');

  // ---- Local state ----
  // Clone defaults so we don't mutate the module export. Stops are
  // sorted by position whenever we render — the underlying array order
  // doesn't have semantic meaning.
  let mode      = d.mode;
  let intensity = d.intensity;
  let stops     = d.stops.map(s => ({ ...s }));
  let selectedStopIdx = -1;
  // Set true the first time the user switches to Custom mode in this
  // session — used to re-seed stops from the current Pearl LUT (rather
  // than defaults.stops) so the visual transition is continuous and
  // reflects the user's current hue.
  let customSeedAttempted = false;

  // ---- LUT regeneration ----
  // Pushed to the shared LUT texture. Called on mode change and on any
  // Custom-mode stops edit. NOT called on hue/intensity change.
  function regenerateLUT() {
    const data = (mode === 'pearl')
      ? generatePearlLUT()
      : generateStopsLUT(stops);
    writeLUT(uniforms.u_iriLUT.value, data);
  }

  // ---- Strip + pins render ----
  function gradientCss() {
    // Build a CSS linear-gradient that mirrors the LUT — Pearl mode
    // shows the cosine palette as a strip, Custom shows the user's
    // stops with the wrap-around segment made explicit (last color
    // appended at 100% for visual closure even though logically it
    // wraps to the first stop).
    if (mode === 'pearl') {
      // Sample 32 points across Pearl for the visual strip — keeps
      // the gradient smooth without dropping into shader-level cost.
      const data = generatePearlLUT(32);
      const parts = [];
      for (let i = 0; i < 32; i++) {
        const pos = (i / 31 * 100).toFixed(1);
        const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
        parts.push(`rgb(${r},${g},${b}) ${pos}%`);
      }
      return `linear-gradient(to right, ${parts.join(', ')})`;
    }
    if (!stops.length) return 'linear-gradient(to right, #000, #000)';
    const sorted = [...stops].sort((a, b) => a.pos - b.pos);
    const parts = sorted.map(s => `${s.color} ${(s.pos * 100).toFixed(1)}%`);
    // Append the first stop at 100% so the visual strip closes the
    // loop. The CSS strip is the cycle "unrolled" once.
    parts.push(`${sorted[0].color} 100%`);
    return `linear-gradient(to right, ${parts.join(', ')})`;
  }

  function renderStrip() {
    strip.style.background = gradientCss();
  }

  function renderPins() {
    pinsHost.innerHTML = '';
    if (mode !== 'custom') return;
    stops.forEach((s, i) => {
      const pin = document.createElement('div');
      pin.className = 'iri-pin' + (i === selectedStopIdx ? ' selected' : '');
      pin.style.left = (s.pos * 100) + '%';
      pin.style.background = s.color;
      pin.dataset.idx = String(i);
      pinsHost.appendChild(pin);
    });
  }

  function renderInspector() {
    if (mode !== 'custom' || selectedStopIdx < 0 || selectedStopIdx >= stops.length) {
      inspector.hidden = true;
      return;
    }
    const s = stops[selectedStopIdx];
    inspector.hidden = false;
    stopColor.value = s.color;
    stopHex.value = s.color.toUpperCase();
    stopPos.textContent = Math.round(s.pos * 100) + '%';
    // Disable delete when only 2 stops remain — single-stop gradients
    // are degenerate (constant color) and we already block dropping
    // below 1 in the data layer, but 2 stops feels like the right
    // floor for a usable gradient.
    stopDel.disabled = stops.length <= 2;
  }

  function renderAll() {
    renderStrip();
    renderPins();
    renderInspector();
  }

  // ---- Mode switching ----
  function setMode(newMode, pushHistory = true) {
    if (newMode === mode) return;
    mode = newMode;
    segBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    gradWrap.hidden = (mode !== 'custom');
    if (mode === 'custom' && !customSeedAttempted) {
      customSeedAttempted = true;
      // Re-seed stops from the current Pearl LUT so what the user sees
      // in Custom matches what they were just looking at in Pearl
      // (including any hue rotation, via u_iriHueShift). Sampling at
      // 6 points gives a Pearl-ish starting gradient that's easy to
      // edit. If the user has already edited stops in this session,
      // customSeedAttempted will be true and we leave them alone.
      stops = sampleLUTToStops(generatePearlLUT(), 6);
    }
    selectedStopIdx = -1;
    regenerateLUT();
    renderAll();
    if (pushHistory) history?.push();
  }

  segBtns.forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  // ---- Intensity wiring ----
  let intensityCache = intensity;
  function pushIntensity() {
    uniforms.u_iriIntensity.value = isEnabled() ? intensityCache : 0.0;
  }
  function onEnabledChange() {
    intIn.disabled = !isEnabled();
    hueIn.disabled = !isEnabled();
    segBtns.forEach(b => { b.disabled = !isEnabled(); });
    pushIntensity();
  }
  intIn.addEventListener('input', (e) => {
    intensityCache = parseInt(e.target.value, 10) / 100;
    intensity = intensityCache;
    intVal.textContent = e.target.value + '%';
    pushIntensity();
  });
  intIn.addEventListener('change', () => history?.push());

  // ---- Hue wiring ----
  // Hue rotates the LUT lookup; the LUT itself is untouched.
  hueIn.addEventListener('input', (e) => {
    const hue = parseInt(e.target.value, 10);
    hueVal.textContent = hue + '°';
    uniforms.u_iriHueShift.value = hue / 360;
  });
  hueIn.addEventListener('change', () => history?.push());

  // ---- Strip click → add stop ----
  strip.addEventListener('click', (e) => {
    if (mode !== 'custom') return;
    const rect = strip.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    // Color at this position = current LUT sample, so the new stop
    // visually slots in seamlessly. Read from the texture data we
    // just wrote.
    const data = uniforms.u_iriLUT.value.image.data;
    const idx  = Math.round(pos * (data.length / 4)) % (data.length / 4);
    const color = rgbToHex(data[idx * 4], data[idx * 4 + 1], data[idx * 4 + 2]);
    stops.push({ pos, color });
    selectedStopIdx = stops.length - 1;
    regenerateLUT();
    renderAll();
    history?.push();
  });

  // ---- Pin interactions: select + drag ----
  let dragIdx = -1;
  let dragMoved = false;
  pinsHost.addEventListener('pointerdown', (e) => {
    const pin = e.target.closest('.iri-pin');
    if (!pin) return;
    e.preventDefault();
    dragIdx = parseInt(pin.dataset.idx, 10);
    dragMoved = false;
    selectedStopIdx = dragIdx;
    renderAll();
    pin.setPointerCapture(e.pointerId);
  });
  pinsHost.addEventListener('pointermove', (e) => {
    if (dragIdx < 0) return;
    const rect = strip.getBoundingClientRect();
    const pos = Math.max(0, Math.min(0.999, (e.clientX - rect.left) / rect.width));
    if (Math.abs(pos - stops[dragIdx].pos) > 0.001) {
      stops[dragIdx].pos = pos;
      dragMoved = true;
      regenerateLUT();
      renderStrip();
      // Update just the dragged pin's position in place — rebuilding
      // the pins DOM mid-drag would destroy the element holding the
      // pointer capture, dropping the drag.
      const pinEl = pinsHost.querySelector(`.iri-pin[data-idx="${dragIdx}"]`);
      if (pinEl) pinEl.style.left = (pos * 100) + '%';
      renderInspector();
    }
  });
  pinsHost.addEventListener('pointerup', (e) => {
    if (dragIdx < 0) return;
    dragIdx = -1;
    // Now safe to rebuild — drag is over. Rebuild so the pin DOM
    // matches state in case any defensive ordering changed.
    renderPins();
    if (dragMoved) history?.push();
  });
  pinsHost.addEventListener('pointercancel', () => { dragIdx = -1; });

  // ---- Inspector edits ----
  stopColor.addEventListener('input', (e) => {
    if (selectedStopIdx < 0) return;
    stops[selectedStopIdx].color = e.target.value;
    stopHex.value = e.target.value.toUpperCase();
    regenerateLUT();
    renderStrip();
    renderPins();
  });
  stopColor.addEventListener('change', () => history?.push());

  stopHex.addEventListener('input', (e) => {
    if (selectedStopIdx < 0) return;
    let v = e.target.value.trim();
    if (!v.startsWith('#')) v = '#' + v;
    if (!/^#[0-9a-f]{6}$/i.test(v)) return; // ignore until valid
    stops[selectedStopIdx].color = v;
    stopColor.value = v;
    regenerateLUT();
    renderStrip();
    renderPins();
  });
  stopHex.addEventListener('change', () => history?.push());

  stopDel.addEventListener('click', () => {
    if (selectedStopIdx < 0 || stops.length <= 2) return;
    stops.splice(selectedStopIdx, 1);
    selectedStopIdx = -1;
    regenerateLUT();
    renderAll();
    history?.push();
  });

  // ---- Init ----
  regenerateLUT();
  renderAll();
  onEnabledChange();

  return {
    onEnabledChange,
    snapshot() {
      return {
        mode,
        intensity,
        hue:   parseInt(hueIn.value, 10),
        // Clone stops to detach from live array.
        stops: stops.map(s => ({ pos: s.pos, color: s.color })),
      };
    },
    restore(snap) {
      if (!snap) return;
      if (typeof snap.intensity === 'number') {
        intensity = snap.intensity;
        intensityCache = snap.intensity;
        intIn.value = String(Math.round(snap.intensity * 100));
        intVal.textContent = Math.round(snap.intensity * 100) + '%';
      }
      if (typeof snap.hue === 'number') {
        hueIn.value = String(snap.hue);
        hueVal.textContent = snap.hue + '°';
        uniforms.u_iriHueShift.value = snap.hue / 360;
      }
      if (Array.isArray(snap.stops) && snap.stops.length > 0) {
        stops = snap.stops.map(s => ({ pos: s.pos, color: s.color }));
        // Restored stops mean the user has touched Custom mode (or
        // it was seeded earlier in this session) — don't re-seed on
        // next mode switch.
        customSeedAttempted = true;
      }
      if (snap.mode === 'pearl' || snap.mode === 'custom') {
        mode = snap.mode;
        segBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
        gradWrap.hidden = (mode !== 'custom');
      }
      selectedStopIdx = -1;
      regenerateLUT();
      renderAll();
      pushIntensity();
    },
  };
}
