// =========================================================
// GOLD — warm amber/yellow shifts. Only palette differs from Pearl.
// =========================================================
// Future tuning targets: warmer base color, sharper specular, warmer halo.
//
import { mergeMaterial } from './schema.js';

export default mergeMaterial({
  name: 'Gold',
  palette: {
    phase: [0.05, 0.15, 0.25],
  },
});
