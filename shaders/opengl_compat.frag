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

float blinn_phong( vec3 L, vec3 V, vec3 N, float shininess ) {
  vec3 H = normalize( L + V );
  return pow( dot( N, H ), shininess );
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
  float shininess = 15.0;
  vec3 diffuse_color = vec3( 0.3, 0.3, 0.3 );
  vec3 specular_color = vec3( 1.0, 1.0, 1.0 );
  float specular = blinn_phong( L, V, N, shininess );
  float diffuse = max( dot( L, N ), 0 );
  vec3 linear = dot( L, N ) * ( specular * specular_color + diffuse * diffuse_color );
  output_color = vec4( gamma(linear),1 );
}

