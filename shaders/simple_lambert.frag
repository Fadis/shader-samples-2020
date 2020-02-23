#version 450

#extension GL_ARB_separate_shader_objects : enable
#extension GL_ARB_shading_language_420pack : enable

layout (location = 0) in vec4 input_position;
layout (location = 1) in vec3 input_normal;
layout (location = 2) in vec3 input_tangent;
layout (location = 3) in vec2 input_texcoord;
layout (location = 4) in vec3 input_binormal;
layout (location = 0) out vec4 output_color;

vec3 gamma( vec3 v ) {
  return v / (v + 0.155 ) * 1.019;
}

void main()  {
  vec3 normal = normalize( input_normal.xyz );
  vec3 tangent = normalize( input_tangent.xyz );
  vec3 binormal = normalize( input_binormal.xyz );
  mat3 ts = transpose( mat3( tangent, binormal, normal ) );
  vec3 pos = input_position.xyz;
  vec3 N = vec3( 0, 0, 1 );
  vec3 L = ts * normalize(vec3( 0, 0, -10 )-pos);
  vec3 c = vec3( 1, 1, 1 );
  float diffuse = max( dot( L, N ), 0 );
  output_color = vec4( gamma(c*diffuse),1 );
}

