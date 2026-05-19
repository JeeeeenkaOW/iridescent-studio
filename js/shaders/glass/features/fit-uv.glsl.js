// =========================================================
// FIT-UV — letterbox/pillarbox the image inside the viewport
// =========================================================
// Identical to Mercury's. Kept per-shader so each shader folder
// is fully self-contained and can be tuned independently.
//
export const fitUVHelper = /* glsl */ `
  vec3 fitUV(vec2 vUV, float screenAspect){
    vec2 tex;
    if(screenAspect > u_imgAspect){
      float w = u_imgAspect / screenAspect;
      tex.x = (vUV.x - 0.5) / w + 0.5;
      tex.y = vUV.y;
    } else {
      float h = screenAspect / u_imgAspect;
      tex.x = vUV.x;
      tex.y = (vUV.y - 0.5) / h + 0.5;
    }
    float inside = step(0.0, tex.x) * step(tex.x, 1.0) *
                   step(0.0, tex.y) * step(tex.y, 1.0);
    return vec3(tex, inside);
  }
`;
