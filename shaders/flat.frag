#version 450

#extension GL_ARB_separate_shader_objects : enable
#extension GL_ARB_shading_language_420pack : enable

layout (location = 0) out vec4 output_color;

void main()  {
  vec3 c = vec3( 0, 0, 0 );
  output_color = vec4( c,1 );
}

