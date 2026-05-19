// =========================================================
// LIGHTING EFFECT — GLSL
// =========================================================
// Lighting is a special effect: it has no apply block, because the
// material's own lighting math already reads its uniforms. This
// effect's role is purely UI — its sliders write to uniforms that
// the material is already wired to read.
//
// All four uniforms (u_diffuse, u_specular, u_shininess, u_lightHeight)
// are declared by the *material* (each material wants different
// preset defaults), so this effect declares no uniforms of its own.
//
export const uniforms = ``;
export const helpers  = ``;
export const apply    = ``;
