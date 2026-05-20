// =========================================================
// PARTICLES VERTEX SHADER
// =========================================================
// Standard fullscreen-quad vertex shader, same as solid/glass.
// All the magic happens in the fragment shader, which evaluates
// "is this fragment covered by any particle?" at each pixel.
//
export const vertexShader = /* glsl */ `
  varying vec2 v_uv;
  void main() {
    v_uv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;
