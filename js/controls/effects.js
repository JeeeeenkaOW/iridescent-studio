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

export function initEffects({ host, uniforms, history, initialSnapshot = null }) {
  // State per effect. The Effects host gets re-created on every
  // material swap (main.js drops the old host's DOM and calls
  // initEffects again with the new material's uniforms). We accept
  // an `initialSnapshot` from main.js so the user's effect tuning
  // and on/off states persist across material switches — otherwise
  // toggling material would silently reset Iridescence, Bloom, CA.
  const effects = listEffects();
  const enabled = {};
  const effectControls = {};

  effects.forEach(eff => {
    // Seed from snapshot if provided, else from each effect's default.
    const snap = initialSnapshot?.[eff.id];
    enabled[eff.id] = snap
      ? !!snap.enabled
      : !!eff.defaults.enabled;
  });

  host.innerHTML = `
    <div class="effects-list">
      ${effects.map(eff => `
        <div class="effect-card ${enabled[eff.id] ? '' : 'off'}" data-effect="${eff.id}">
          <div class="effect-head" data-effect-head="${eff.id}">
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

  // If we got an initial snapshot, restore each effect's slider values
  // and uniform writeback. The toggle states were already set above.
  // We do this AFTER the mount loop so each effect's controls have
  // their DOM in place. onEnabledChange fires so the per-effect
  // uniform gates (e.g. iridescence pushing intensity → 0 if disabled)
  // get applied.
  if (initialSnapshot) {
    effects.forEach(eff => {
      const snap = initialSnapshot[eff.id];
      if (!snap) return;
      effectControls[eff.id]?.restore?.(snap);
      effectControls[eff.id]?.onEnabledChange?.();
    });
  }

  // Wire toggles. The card gets the .off class when disabled so CSS
  // can hide the body (UI cleanup: don't show controls for effects
  // the user isn't using). Clicking the head OUTSIDE the toggle also
  // flips the toggle — bigger hit target, no extra UI.
  function setEnabled(id, value) {
    enabled[id] = value;
    const card = host.querySelector(`[data-effect="${id}"]`);
    const toggle = host.querySelector(`[data-effect-toggle="${id}"]`);
    card?.classList.toggle('off', !value);
    toggle?.classList.toggle('on', value);
    effectControls[id]?.onEnabledChange?.();
  }

  host.querySelectorAll('[data-effect-toggle]').forEach(el => {
    const id = el.dataset.effectToggle;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      setEnabled(id, !enabled[id]);
      history?.push();
    });
  });

  host.querySelectorAll('[data-effect-head]').forEach(el => {
    const id = el.dataset.effectHead;
    el.addEventListener('click', () => {
      setEnabled(id, !enabled[id]);
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
      //   1. Set enabled flag (which also updates card .off + toggle UI)
      //   2. Call effect.restore(...) if it has one
      //   3. Fire onEnabledChange (handled inside setEnabled)
      if (!snap) return;
      effects.forEach(eff => {
        const effSnap = snap[eff.id];
        if (!effSnap) return;
        // Each effect's controls own their own restore — they know
        // their own DOM elements and what to copy back where.
        effectControls[eff.id]?.restore?.(effSnap);
        // Then sync enabled state (also fires onEnabledChange).
        setEnabled(eff.id, !!effSnap.enabled);
      });
    },
  };
}
