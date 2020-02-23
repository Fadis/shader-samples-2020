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

float GGX_G( vec3 L, vec3 V, vec3 N, float roughness ) {
  float VN = max( dot( V, N ), 0 );
  float vt = tan( acos( VN ) );
  float vl = ( sqrt(roughness * roughness + ( 1 - roughness * roughness ) * vt * vt )/VN - 1 )/2;
  float LN = max( dot( L, N ), 0 );
  float lt = tan( acos( LN ) );
  float ll = ( sqrt(roughness * roughness + ( 1 - roughness * roughness ) * lt * lt )/LN - 1 )/2;
  return 1/(1 + vl + ll);
}

float walter( vec3 L, vec3 V, vec3 N, float roughness, float fres ) {
  vec3 H = normalize(V + L);
  float D = GGX_D( N, H, roughness );
  float F = fres + ( 1 - fres ) * fresnel( L, N );
  float G = GGX_G( L, V, N, roughness );
  float scale = 4 * dot( L, N ) * dot( V, N );
  float specular = D * F * G / scale;
  return specular;
}

float burley( vec3 L, vec3 V, vec3 N, float roughness ) {
  float ebias = 0.5 * roughness;
  float efactor = roughness + 100.0 / 151.0 * ( 1 - roughness );
  float fl = fresnel( L, N );
  float fv = fresnel( V, N );
  vec3 H = ( L + V )/ length( L + V );
  float LH = dot( L, H );
  float fd90l = ebias + 2 * LH * LH * roughness;
  float VH = dot( V, H );
  float fd90v = ebias + 2 * VH * VH * roughness;
  return efactor * mix( 1.0, fd90l, fl ) * mix( 1.0, fd90v, fv );
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
  float diffuse_roughness = 0.3;
  float specular_roughness = 0.3;
  float metalicness = 0;
  float fresnel_factor = 0.2;
  vec3 diffuse_color = vec3( 0.3, 0.3, 0.3 );
  vec3 specular_color = vec3( 1.0, 1.0, 1.0 );
  float specular = walter( L, V, N, specular_roughness, fresnel_factor );
  float diffuse = burley( L, V, N, diffuse_roughness );
  vec3 linear = dot( L, N ) * ( specular * specular_color + ( 1 - metalicness ) * diffuse * diffuse_color );
  output_color = vec4( gamma(linear),1 );
}

