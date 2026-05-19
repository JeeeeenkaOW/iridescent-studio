// =========================================================
// VERTEX SHADER
// =========================================================
// Full-screen quad. Just passes UVs through.
//
export const vertexShader = `
  varying vec2 v_uv;
  void main() { v_uv = uv; gl_Position = vec4(position, 1.0); }
`;
