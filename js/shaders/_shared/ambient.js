// =========================================================
// SHARED AMBIENT DEFAULTS
// =========================================================
// Sky/ground colors used by hemiAmbient(). Materials reference these
// in their defaults.js so the studio reads as one consistent scene
// rather than four unrelated worlds.
//
// Sky:    cool, dim — picks up overhead environment.
// Ground: warm, dimmer — picks up the implied "floor".
//
// These are intentionally near-neutral. The point is to add direction
// to the ambient (different on the top vs bottom of a curved silhouette)
// without tinting the material noticeably.
//
export const AMBIENT_SKY    = '#4A5566';   // dim cool blue-grey
export const AMBIENT_GROUND = '#2A201A';   // dim warm brown
