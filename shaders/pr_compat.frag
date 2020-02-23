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

float GGX_D( vec3 N, vec3 H, float roughness ) {
  float a2 = roughness * roughness;
  float NH = max( dot( N, H ), 0 );
  float t = 1 + ( a2 - 1 )* NH;
  float NH2 = NH*NH;
  float t1 = tan( acos( NH ) );
  float t2 = roughness*roughness + t1 * t1;
  return roughness*roughness/(pi*NH2*NH2*t2*t2);
}

float GGX_G1( vec3 V, vec3 N, float roughness ) {
  float VN = max( dot( V, N ), 0 );
  float t = tan( acos( VN ) );
  float l = ( sqrt(roughness * roughness + ( 1 - roughness * roughness ) * t * t )/VN - 1 )/2;
  return 1/(1 + l);
}

float GGX_G2( vec3 L, vec3 V, vec3 N, float roughness ) {
  return GGX_G1( L, N , roughness ) * GGX_G1( V, N , roughness );
}

float walter( vec3 L, vec3 V, vec3 N, float roughness, float fres ) {
  vec3 H = normalize(V + L);
  float D = GGX_D( N, H, roughness );
  float F = fres + ( 1 - fres ) * fresnel( L, N );
  float G = GGX_G2( L, V, N, roughness );
  float scale = 4 * dot( L, N ) * dot( V, N );
  float specular = D * F * G / scale;
  return specular;
}

float atan2(in float y, in float x) {
  return x == 0.0 ? sign(y)* pi / 2 : atan( y, x );
}

float oren_nayar( vec3 L, vec3 V, vec3 N, float roughness ) {
  float roughness2 = roughness * roughness;
  float c1 = 1 - 0.5 * ( roughness2 )/( roughness2 + 0.33 );
  float c2 = 0.45 * ( roughness2 )/( roughness2 + 0.33 );
  vec3 color = vec3( 1, 1, 1 );
  float phi_o = atan2( L.y, L.x );
  float phi_i = atan2( V.y, V.x );
  float theta_o = atan2( length( V.xy ), V.z );
  float theta_i = atan2( length( L.xy ), L.z );
  return max( dot( L, N ), 0 ) /pi * ( c1 + c2 * max( 0, cos( phi_o - phi_i ) * sin( max( theta_i, theta_o ) ) * tan( min( theta_i, theta_o ) ) ) );
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
  float specular_roughness = 0.3;
  float diffuse_roughness = 0.3;
  float metalicness = 0;
  float fresnel_factor = 0.2;
  vec3 diffuse_color = vec3( 0.3, 0.3, 0.3 );
  vec3 specular_color = vec3( 1.0, 1.0, 1.0 );
  float specular = walter( L, V, N, specular_roughness, fresnel_factor );
  float diffuse = oren_nayar( L, V, N, diffuse_roughness );
  vec3 linear = dot( L, N ) * ( specular * specular_color + ( 1 - metalicness ) * diffuse * diffuse_color );
  output_color = vec4( gamma(linear),1 );
}

