// =========================================================
// SAMPLE — read albedo / normal / bloom at the fitted UV
// =========================================================
// Runs first in main(). Establishes screen/image fit, samples the
// three procedurally-generated textures, builds the silhouette mask.
//
export const sampleBlock = /* glsl */ `
    float screenAspect = u_resolution.x / u_resolution.y;
    vec2 vUV = v_uv;

    vec3 fit = fitUV(vUV, screenAspect);
    vec2 texUV = fit.xy;
    float inside = fit.z;

    vec3 mfit = fitUV(u_mouse, screenAspect);
    vec2 mouseTexUV = mfit.xy;

    vec2 sUV = clamp(texUV, vec2(0.001), vec2(0.999));
    vec3 albedo = texture2D(u_albedo, sUV).rgb;
    float mask = max(max(albedo.r, albedo.g), albedo.b);
    vec3 N = normalize(texture2D(u_normal, sUV).rgb * 2.0 - 1.0);
    float bloom = texture2D(u_bloom, sUV).r;
`;
