// =========================================================
// OIL — high-contrast magenta/teal split. Only palette differs from Pearl.
// =========================================================
// Future tuning targets: stronger CA, faster flow, more saturated halo.
//
import { mergeMaterial } from './schema.js';

export default mergeMaterial({
  name: 'Oil',
  palette: {
    phase: [0.65, 0.85, 0.10],
  },
});
