// =========================================================
// GLASS FRAGMENT SHADER — assembled from feature snippets
// =========================================================
// Glass is a refraction-based material. The background behind the
// ornament is sampled with normal-driven UV offset (refraction) and
// optionally blurred (frost), then blended into the ornament by
// transparency. A subtle spec highlight reads as light catching the
// surface.
//
import { noiseHelpers }       from './features/noise.glsl.js';
import { fitUVHelper }        from './features/fit-uv.glsl.js';
import { sampleBlock }        from './features/sample.glsl.js';
import { lightingBlock }      from './features/lighting.glsl.js';
import { refractionBlock }    from './features/refraction.glsl.js';
import { outputBlock }        from './features/output.glsl.js';

const uniformDeclarations = /* glsl */ `
  precision highp float;
  varying vec2 v_uv;
  uniform vec2 u_resolution;
  uniform float u_imgAspect;
  uniform vec2 u_mouse;
  uniform vec2 u_mouseVel;
  uniform float u_time;
  uniform sampler2D u_albedo;
  uniform sampler2D u_normal;
  uniform sampler2D u_bloom;
  uniform sampler2D u_bgTex;

  // Glass material
  uniform float u_transparency;
  uniform float u_refraction;
  uniform float u_frost;
`;

export const fragmentShader = `
  ${uniformDeclarations}

  ${noiseHelpers}

  ${fitUVHelper}

  void main(){
    ${sampleBlock}

    ${lightingBlock}

    ${refractionBlock}

    ${outputBlock}
  }
`;
