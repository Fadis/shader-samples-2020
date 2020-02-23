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

float fresnel( vec3 V, vec3 N ) {
  float c = 1 - clamp( dot( V, N ), 0, 1 );
  float c2 = c * c;
  return c2 * c2 * c;
}

float erf( float v ) {
  return tanh( 1.202760580 * v );
}

float beckmann_D( vec3 N, vec3 H, float roughness ) {
  float a2 = roughness * roughness;
  float NH = max( dot( N, H ), 0 );
  float t = 1 + ( a2 - 1 )* NH;
  float NH2 = NH*NH;
  float t1 = tan( acos( NH ) );
  return ( exp( -t1*t1/a2 ) )/(pi*NH2*NH2*a2);
}

float beckmann_G1( vec3 V, vec3 N, float roughness ) {
  float a2 = roughness * roughness;
  return  ( 2/(1 + sqrt(1 + erf( roughness ) + ( 1 / ( roughness * sqrt( pi ) ) ) * exp( -a2 )) ) );
}

float beckmann_G2( vec3 L, vec3 V, vec3 N, float roughness ) {
  return beckmann_G1( L, N , roughness ) * beckmann_G1( V, N , roughness );
}

float cook_torrance( vec3 L, vec3 V, vec3 N, float roughness, float fres ) {
  vec3 H = normalize(V + L);
  float D = beckmann_D( N, H, roughness );
  float F = fres + ( 1 - fres ) * fresnel( L, N );
  float G = beckmann_G2( L, V, N, roughness );
  float scale = 4 * dot( L, N ) * dot( V, N );
  float specular = D * F * G / scale;
  return specular;
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
  float roughness = 0.3;
  vec3 color = vec3( 1, 1, 1 );
  float specular = cook_torrance( L, V, N, roughness, 0.8 );
  float linear = dot( L, N ) * specular;
  output_color = vec4( gamma(linear*color),1 );
}

