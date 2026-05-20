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
    // drift. iriT changes with cursor (via NdotL) and cursor blob —
    // that cursor-driven hue shift is the oil-on-water effect we
    // want; it's "lighting determines which side of the palette you
    // see", which is how real iridescence works. The static noise
    // terms vary the palette index across surface position so
    // different areas land on different colours.
    //
    // This is the v8 formula that the user explicitly approved via
    // an exported HTML render. Earlier rebalances (v10/v11) reduced
    // NdotL's weight thinking it was causing whole-body hue cycling;
    // turned out that "cycling" perception was actually the iridescence
    // halo being secretly written by the effect, not the spec tint.
    // With the halo write removed, this NdotL-heavy form reads as
    // intended.
    float staticNoise  = fbm(texUV * 2.4);
    float staticNoise2 = fbm(texUV * 4.8 + vec2(11.3, 17.7));

    float iriT = NdotL * 0.55
               + staticNoise  * 0.35
               + staticNoise2 * 0.20
               + blob * 0.60
               + texUV.y * 0.12;

    // Schlick Fresnel against coloured F0 — F0 hue is inherited at
    // facing angles, ramps toward white at grazing.
    vec3 F = fresnelSchlickColored(NdotV, u_f0);

    // Baseline specular.
    vec3 specular = vec3(spec * u_specular) * F * u_lightColor;
    specular *= (1.0 + blob * 3.0);
`;
