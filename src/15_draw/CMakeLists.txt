add_executable( draw draw.cpp )
target_link_libraries( draw vulkan_sample_common ${Vulkan_LIBRARIES}
	${GLFW_LIBRARIES} )
