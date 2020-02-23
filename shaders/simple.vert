#version 450

#extension GL_ARB_separate_shader_objects : enable
#extension GL_ARB_shading_language_420pack : enable

layout (location = 0) in vec3 input_position;
layout (location = 1) in vec3 input_normal;
layout (location = 2) in vec3 input_tangent;
layout (location = 3) in vec2 input_texcoord0;

layout(push_constant) uniform PushConstants {
  mat4 world_matrix;
  mat4 projection_matrix;
  mat4 rot;
} push_constants;

layout (location = 0) out vec4 output_position;
layout (location = 1) out vec3 output_normal;
layout (location = 2) out vec3 output_tangent;
layout (location = 3) out vec2 output_tex_coord;
layout (location = 4) out vec3 output_binormal;

out gl_PerVertex
{
    vec4 gl_Position;
};

void main() {
  vec4 local_pos = vec4( input_position.xyz, 1.0 );
  vec4 pos = push_constants.world_matrix * local_pos;
  pos = push_constants.rot * pos;
  output_position = pos;
  vec4 local_normal = vec4( input_normal.xyz, 1.0 );
  vec4 normal = vec4( normalize( ( push_constants.world_matrix * local_normal ).xyz ), 1.0 );
  output_normal = normalize( ( push_constants.rot * normal ).xyz );
  vec4 local_tangent = vec4( input_tangent.xyz, 1.0 );
  vec4 tangent = vec4( normalize( ( push_constants.world_matrix * local_tangent ).xyz ), 1.0 );
  output_tangent = normalize( ( push_constants.rot * tangent ).xyz );
  output_tex_coord = input_texcoord0;
  output_binormal = cross( output_tangent, output_normal );
  gl_Position = push_constants.projection_matrix * pos;
}

