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


float G1V( float dotNV, float k ) {
  return 1.0 / ( dotNV * ( 1.0 - k ) + k );
}

float ggx (vec3 N, vec3 V, vec3 L, float roughness, float F0) {
  float alpha = roughness*roughness;
  vec3 H = normalize(V + L);
  float dotNL = max( dot( N , L ), 0 );
  float dotNV = max( dot( N , V ), 0 );
  float dotNH = max( dot( N , H ), 0 );
  float dotLH = max( dot( L , H ), 0 );

  float alphaSqr = alpha * alpha;
  float denom = dotNH * dotNH * (alphaSqr - 1.0) + 1.0;
  float D = alphaSqr / (3.141592653589793 * denom * denom);
  float dotLH5   = pow( 1.0f - dotLH, 5 );
  float F = F0 + ( 1.0 - F0 ) * ( dotLH5 );
  float k = alpha / 2.0;
  float vis = G1V( dotNL, k ) * G1V( dotNV, k );
  float specular = dotNL * D * F * vis;
  return specular;
}

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
  vec3 V = ts * normalize(push_constants.eye-pos);
  vec3 L = ts * normalize(push_constants.lightpos-pos);
  vec3 c = vec3( 1, 1, 1 );
  float diffuse = max( dot( L, N )* ggx( N, V, L, 0.3, 0.8 ), 0 );
  output_color = vec4(gamma(c*diffuse),1 );
  //output_color = vec4( normal * 0.5 + 0.5, 1 );
}

