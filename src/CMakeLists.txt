subdirs(
	common
	15_draw
)

add_executable( brdf2image brdf2image.cpp )
target_link_libraries( brdf2image
  ${Boost_PROGRAM_OPTIONS_LIBRARIES}
  ${Boost_SYSTEM_LIBRARIES}
  ${OIIO_LIBRARIES}
  Threads::Threads
)
