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
import { listEffects } from '../effects/index.js';

export function initEffects({ host, uniforms }) {
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

  // Mount each effect's controls into its body.
  effects.forEach(eff => {
    const body = host.querySelector(`[data-effect-body="${eff.id}"]`);
    effectControls[eff.id] = eff.initControls({
      host:      body,
      uniforms,
      isEnabled: () => enabled[eff.id],
    });
  });

  // Wire toggles.
  host.querySelectorAll('[data-effect-toggle]').forEach(el => {
    const id = el.dataset.effectToggle;
    el.addEventListener('click', () => {
      enabled[id] = !enabled[id];
      el.classList.toggle('on', enabled[id]);
      effectControls[id]?.onEnabledChange?.();
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
  };
}
