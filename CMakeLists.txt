set(APPLICATION_DOC_DIR "${CMAKE_INSTALL_DOCDIR}")
set(ANTORA_OUTPUT_DIR "${CMAKE_CURRENT_SOURCE_DIR}/public")
find_program (NPM_EXECUTABLE NAMES npm)

if ( NPM_EXECUTABLE )
    add_custom_target(doc
        COMMAND "${NPM_EXECUTABLE}" ci
        COMMAND "${NPM_EXECUTABLE}" run build
        WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}"
        COMMENT "Building the CSMI internship site"
    )
    install(DIRECTORY "${ANTORA_OUTPUT_DIR}/" DESTINATION ${APPLICATION_DOC_DIR} OPTIONAL)
else()
    message(STATUS "npm is not installed; the documentation target is disabled")
endif()
