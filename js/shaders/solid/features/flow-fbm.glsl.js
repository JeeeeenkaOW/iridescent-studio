// =========================================================
// FLOW — animated FBM + STATIC iridescence field
// =========================================================
// Two purposes:
//   1. `flow` / `flow2` — time-drifting FBM. Used by Bloom's halo to
//      give it animated rainbow flow.
//   2. `iriT` — STATIC noise field anchored to the surface. Drives the
//      specular iridescence tint. Critical: this MUST NOT contain
//      u_time, otherwise the material's perceived hue cycles over
//      time (which is the bug the user reported in v7).
//
// `iriT` is built from: cursor angle (via NdotL), a time-independent
// fbm of texUV, the cursor blob bump, and a y-bias. The cursor angle
// is the only term that changes — and it changes only when the user
// moves the cursor (or auto-drift moves it). So the hue you see is
// anchored to where the highlight is on the surface, not to wall time.
//
// Specular: scalar Blinn-Phong × Fresnel-coloured (F0) × light tint ×
// user specular gain × metaball boost (when blob > 0).
//
// Note: this material always declares `blob` (set by metaballBlock to
// 0 when disabled), so the `(1 + blob * 3)` term is safe.
//
export const flowBlock = /* glsl */ `
    // Time-drifting flow (used by Bloom's halo animation).
    // loopTime2D returns (u_time * sx, u_time * sy) normally, or a
    // periodic sin/cos circle when u_loopMode=1 so the noise loops
    // perfectly for video export.
    vec2 flowUV = texUV * 2.4 + loopTime2D(0.025, 0.018);
    float flow = fbm(flowUV);
    float flow2 = fbm(flowUV * 2.0 + loopTime2D(-0.04, 0.03));

    // STATIC iridescence field — same shape as flow but with NO time
    // drift. iriT changes only with cursor (via a SMALL NdotL nudge,
    // intentionally minor so the cursor adjusts which side of the
    // palette this pixel sits on without globally cycling the hue)
    // and cursor blob.
    //
    // Why NdotL is weighted so low (0.10): the auto-drift cursor sweeps
    // 360° every few seconds. If NdotL drove iriT strongly, every pixel
    // on the surface would land on the same palette index at the same
    // time, and the whole body would cycle through colours — exactly
    // the bug the user reported. Now spatial noise dominates (0.85+),
    // and the cursor only nudges things locally.
    float staticNoise  = fbm(texUV * 2.4);
    float staticNoise2 = fbm(texUV * 4.8 + vec2(11.3, 17.7));

    float iriT = staticNoise  * 0.55
               + staticNoise2 * 0.30
               + NdotL        * 0.10
               + blob         * 0.40
               + texUV.y      * 0.15;

    // Schlick Fresnel against coloured F0 — F0 hue is inherited at
    // facing angles, ramps toward white at grazing.
    vec3 F = fresnelSchlickColored(NdotV, u_f0);

    // Baseline specular.
    vec3 specular = vec3(spec * u_specular) * F * u_lightColor;
    specular *= (1.0 + blob * 3.0);
`;
