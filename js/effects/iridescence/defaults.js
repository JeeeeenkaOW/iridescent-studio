// =========================================================
// IRIDESCENCE EFFECT — defaults
// =========================================================
// Cosine-palette rainbow that tints the specular highlight of any
// material. Off by default — enable it in the Effects panel.
//
// At enabled=true, intensity=1.0, hue=0 with the Pearl basis, this
// matches the original Mercury iridescence output exactly.
//
export const defaults = {
  enabled:   false,
  intensity: 1.0,         // 0..1, blends rainbow toward neutral white
  hue:       0,           // 0..360°, rotates the cosine palette
};

// Pearl-phase basis. Hue slider adds (hue/360°) to all three channels,
// rotating the cosine palette around the colour wheel while preserving
// Pearl's channel offsets. At hue=0 we get the original Pearl phase.
export const PEARL_BASIS = [0.00, 0.18, 0.42];
