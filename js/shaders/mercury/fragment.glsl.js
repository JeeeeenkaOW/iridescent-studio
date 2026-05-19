// =========================================================
// MERCURY FRAGMENT SHADER — assembled from feature snippets
// =========================================================
// Each feature file in /features/ exports a string. This file stitches
// them together.
//
// Mercury is the "iridescent silver" shader: a Blinn-Phong material
// with cosine-palette iridescence applied to the specular highlight,
// and a mercury blob at the cursor.
//
// To tune a feature, open its file. To reorder/swap features, edit this
// list. Adding a new feature = new file + one line here.
//
import { noiseHelpers }              from './features/noise.glsl.js';
import { iridescenceHelper }         from './features/iridescence.glsl.js';
import { fitUVHelper }               from './features/fit-uv.glsl.js';
import { sampleBlock }               from './features/sample.glsl.js';
import { metaballBlock }             from './features/metaball.glsl.js';
import { lightingBlock }             from './features/lighting.glsl.js';
import { flowBlock }                 from './features/flow-fbm.glsl.js';
import { chromaticAberrationBlock }  from './features/chromatic-aberration.glsl.js';
import { compositeBlock }            from './features/composite.glsl.js';
import { outputBlock }               from './features/output.glsl.js';

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

  // Material
  uniform vec3 u_baseColor;
  uniform float u_diffuse;
  uniform float u_specular;
  uniform float u_shininess;

  // Iridescence
  uniform vec3 u_iriPhase;
  uniform float u_iriIntensity;
`;

export const fragmentShader = `
  ${uniformDeclarations}

  ${noiseHelpers}

  ${iridescenceHelper}

  ${fitUVHelper}

  void main(){
    ${sampleBlock}

    ${metaballBlock}

    ${lightingBlock}

    ${flowBlock}

    ${chromaticAberrationBlock}

    ${compositeBlock}

    ${outputBlock}
  }
`;
