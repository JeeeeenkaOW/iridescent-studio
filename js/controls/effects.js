// =========================================================
// EFFECTS — sidebar host for effect layer controls
// =========================================================
// Renders a card per effect in the global registry. Each card has:
//   - title bar with on/off toggle
//   - body with that effect's own controls (mounted by its initControls)
//
// Effects share the same uniform object as the active material —
// the host's uniforms factory has already merged each effect's
// createUniforms() output into the shared material uniforms.
// When the material changes, the Effects host re-mounts so each
// effect's controls rebind to the new uniform object.
//
// History: `history` is passed through to each effect's initControls
// so they can push() on their own slider/color/toggle events. The
// host pushes on its own enable-toggle clicks.
//
import { listEffects } from '../effects/index.js';

export function initEffects({ host, uniforms, history }) {
  // State per effect — kept across material swaps.
  // (The Effects host itself isn't kept across swaps — main.js
  // re-creates it — but we capture defaults at construction.)
  const effects = listEffects();
  const enabled = {};
  const effectControls = {};

  effects.forEach(eff => {
    enabled[eff.id] = !!eff.defaults.enabled;
  });

  host.innerHTML = `
    <div class="section-title">Effects</div>
    <div class="effects-list">
      ${effects.map(eff => `
        <div class="effect-card" data-effect="${eff.id}">
          <div class="effect-head">
            <span class="effect-name">${eff.name}</span>
            <div class="toggle ${enabled[eff.id] ? 'on' : ''}" data-effect-toggle="${eff.id}"></div>
          </div>
          <div class="effect-body" data-effect-body="${eff.id}"></div>
        </div>
      `).join('')}
    </div>
  `;

  // Mount each effect's controls into its body. Pass history through
  // so the effect's own slider handlers can push() per `input` event.
  effects.forEach(eff => {
    const body = host.querySelector(`[data-effect-body="${eff.id}"]`);
    effectControls[eff.id] = eff.initControls({
      host:      body,
      uniforms,
      isEnabled: () => enabled[eff.id],
      history,
    });
  });

  // Wire toggles.
  host.querySelectorAll('[data-effect-toggle]').forEach(el => {
    const id = el.dataset.effectToggle;
    el.addEventListener('click', () => {
      enabled[id] = !enabled[id];
      el.classList.toggle('on', enabled[id]);
      effectControls[id]?.onEnabledChange?.();
      history?.push();
    });
  });

  return {
    snapshot() {
      const out = {};
      effects.forEach(eff => {
        out[eff.id] = {
          enabled: enabled[eff.id],
          ...effectControls[eff.id]?.snapshot?.(),
        };
      });
      return out;
    },
    restore(snap) {
      // For each effect:
      //   1. Set enabled flag + toggle UI state
      //   2. Call effect.restore(...) if it has one
      //   3. Fire onEnabledChange so the effect can push/pull its
      //      uniform values based on the new enabled state
      if (!snap) return;
      effects.forEach(eff => {
        const effSnap = snap[eff.id];
        if (!effSnap) return;

        const wantEnabled = !!effSnap.enabled;
        if (wantEnabled !== enabled[eff.id]) {
          enabled[eff.id] = wantEnabled;
          const toggleEl = host.querySelector(`[data-effect-toggle="${eff.id}"]`);
          if (toggleEl) toggleEl.classList.toggle('on', wantEnabled);
        }

        // Each effect's controls own their own restore — they know
        // their own DOM elements and what to copy back where.
        effectControls[eff.id]?.restore?.(effSnap);

        // Sync the uniform writeback (a no-op for some effects but
        // necessary for those whose uniform value depends on enabled).
        effectControls[eff.id]?.onEnabledChange?.();
      });
    },
  };
}
