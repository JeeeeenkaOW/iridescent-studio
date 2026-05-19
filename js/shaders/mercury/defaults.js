// =========================================================
// MERCURY DEFAULTS — initial uniform values + iri color sub-presets
// =========================================================
// `defaults` is what gets applied when Mercury is first selected, or
// when the user clicks "Reset". With these values the output is
// byte-identical to the original Pearl shader.
//
// `iridescenceSubPresets` are the old palette phases promoted to
// quick-pick buttons under the iridescence color picker. Pearl is the
// default; the others are still here in case you want them.
//
// `tints` are some quick hex picks for the iridescence color tint —
// purely a UX nicety, the picker takes any hex.
//
export const defaults = {
  name: 'Mercury',

  iridescence: {
    enabled:       true,
    intensity:     1.0,                       // 0..1, 1 = full rainbow
    phase:         [0.00, 0.18, 0.42],        // cosine-palette phase (Pearl)
    color:         '#FFFFFF',                 // hex color tint
    colorStrength: 0.0,                       // 0..1, 0 = no tint
  },

  // Multiplicative tint on the final ornament (separate from iridescence)
  tint: {
    color:    '#FFFFFF',
    strength: 0.0,
  },
};

// Phase quick-picks for the iridescence section — these are the
// pre-split Pearl/Gold/Oil/Arctic palette phases.
export const iridescencePhasePresets = [
  { id: 'pearl',  name: 'Pearl',  phase: [0.00, 0.18, 0.42] },
  { id: 'gold',   name: 'Gold',   phase: [0.05, 0.15, 0.25] },
  { id: 'oil',    name: 'Oil',    phase: [0.65, 0.85, 0.10] },
  { id: 'arctic', name: 'Arctic', phase: [0.50, 0.55, 0.60] },
];
