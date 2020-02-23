#version 450

#extension GL_ARB_separate_shader_objects : enable
#extension GL_ARB_shading_language_420pack : enable

layout (location = 0) in vec4 input_position;
layout (location = 1) in vec3 input_normal;
layout (location = 2) in vec3 input_tangent;
layout (location = 3) in vec2 input_texcoord;
layout (location = 4) in vec3 input_binormal;
layout (location = 0) out vec4 output_color;

layout(push_constant) uniform PushConstants {
  mat4 world_matrix;
  mat4 projection_matrix;
  mat4 rot;
  vec3 eye;
  vec3 lightpos;
} push_constants;

const float pi = 3.141592653589793;

vec3 gamma( vec3 v ) {
  return v / (v + 0.155 ) * 1.019;
}

float atan2(in float y, in float x) {
  return x == 0.0 ? sign(y)* pi / 2 : atan( y, x );
}

void main()  {
  vec3 normal = normalize( input_normal.xyz );
  vec3 tangent = normalize( input_tangent.xyz );
  vec3 binormal = normalize( input_binormal.xyz );
  mat3 ts = transpose( mat3( tangent, binormal, normal ) );
  vec3 pos = input_position.xyz;
  vec3 N = vec3( 0, 0, 1 );
  vec3 V = ts * normalize(push_constants.eye-pos);
  vec3 L = ts * normalize(push_constants.lightpos-pos);
  float roughness = 1.0;
  float roughness2 = roughness * roughness;
  float c1 = 1 - 0.5 * ( roughness2 )/( roughness2 + 0.33 );
  float c2 = 0.45 * ( roughness2 )/( roughness2 + 0.33 );
  vec3 color = vec3( 1, 1, 1 );
  float phi_o = atan2( L.y, L.x );
  float phi_i = atan2( V.y, V.x );
  float theta_o = atan2( length( V.xy ), V.z );
  float theta_i = atan2( length( L.xy ), L.z );
  float diffuse = max( dot( L, N ), 0 ) /pi * ( c1 + c2 * max( 0, cos( phi_o - phi_i ) * sin( max( theta_i, theta_o ) ) * tan( min( theta_i, theta_o ) ) ) ) /** 2 - 1*/;
  output_color = vec4( gamma(diffuse*color),1 );
}

