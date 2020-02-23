#include <iostream>
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <assimp/Importer.hpp>
#include <assimp/scene.h>
#include <assimp/postprocess.h>
#include <common/vertex.h>
#include <common/mesh.h>
namespace common {
    scene::scene( const std::string &filename, float aspect_ratio, bool default_camera ) {
      Assimp::Importer importer;
      const aiScene* scene = importer.ReadFile( filename, aiProcess_CalcTangentSpace | aiProcess_Triangulate | aiProcess_JoinIdenticalVertices | aiProcess_SortByPType );
      if( !scene ) throw unable_to_load_mesh();
      const auto cameras_ = load_cameras( *scene );
      const auto lights_ = load_lights( *scene );
      const std::vector< std::pair< size_t, size_t > > vertex_offsets = load_meshes( *scene );
      if( !scene->mRootNode ) throw unable_to_load_mesh();
      load_node( *scene->mRootNode, glm::mat4( 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ), vertex_offsets, aspect_ratio, cameras_, lights_ );
      if( default_camera ) cameras.clear();
      if( cameras.empty() )
        generate_default_camera();
    }
    boost::container::flat_multimap< std::string, aiCamera* > scene::load_cameras( const aiScene &scene ) {
      boost::container::flat_multimap< std::string, aiCamera* > cameras;
      for( unsigned int i = 0u; i != scene.mNumCameras; ++i ) {
        const auto camera = scene.mCameras[ i ];
        if( camera ) cameras.insert( std::make_pair( std::string( camera->mName.data, camera->mName.length ), camera ) );
      }
      return cameras;
    }
    boost::container::flat_multimap< std::string, aiLight* > scene::load_lights( const aiScene &scene ) {
      boost::container::flat_multimap< std::string, aiLight* > lights;
      for( unsigned int i = 0u; i != scene.mNumLights; ++i ) {
        const auto light = scene.mLights[ i ];
        std::cout << std::string( light->mName.data, light->mName.length ) << std::endl;
        if( light ) lights.insert( std::make_pair( std::string( light->mName.data, light->mName.length ), light ) );
      }
      return lights;
    }
    void scene::load_camera( glm::mat4 world, const aiCamera &camera, float aspect_ratio ) {
      /*const glm::mat4 inv = {
        1, 0, 0, 0,
        0, 0, -1, 0,
        0, 1, 0, 0,
        0, 0, 0, 1
      };*/
      const glm::mat4 inv = {
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      };
      const glm::mat4 projection = glm::perspective( camera.mHorizontalFOV, aspect_ratio, camera.mClipPlaneNear, camera.mClipPlaneFar );
      //const glm::mat4 projection = glm::perspective( float( /*camera.mHorizontalFOV * 180.f / M_PI / ( 16.f/9.f )*/ 30 ), (16.f/9.f), camera.mClipPlaneNear, camera.mClipPlaneFar );
      const glm::mat4 lookat = glm::lookAt(
        glm::vec3( world * glm::vec4{ camera.mPosition.x, camera.mPosition.y, camera.mPosition.z, 1.0 } ),
        glm::vec3( world * glm::vec4{ camera.mLookAt.x, camera.mLookAt.y, camera.mLookAt.z, 1.0 } ),
        glm::vec3( 0, 1, 0 )
        //glm::vec3( world * glm::vec4{ camera.mUp.x, camera.mUp.y, camera.mUp.z, 1.0 } )
      );
      cameras.emplace_back( projection * lookat );
      camera_pos.emplace_back( glm::vec3( /*inv **/ world * glm::vec4{ camera.mPosition.x, camera.mPosition.y, camera.mPosition.z, 1.0 } ) );
    }
    void scene::load_light( glm::mat4 world, const aiLight &light ) {
      const glm::mat4 inv = {
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, -1, 0,
        0, 0, 0, 1
      };
      if( light.mType == aiLightSource_DIRECTIONAL ) {
        directional_lights.emplace_back( inv * world * glm::vec4{ light.mDirection.x, light.mDirection.y, light.mDirection.z, 1.0 }, glm::vec3{ light.mColorDiffuse.r, light.mColorDiffuse.g, light.mColorDiffuse.b } );
      }
      if( light.mType == aiLightSource_POINT ) {
        point_lights.emplace_back( inv * world * glm::vec4{ light.mPosition.x, light.mPosition.y, light.mPosition.z, 1.0 }, glm::vec3{ light.mColorDiffuse.r, light.mColorDiffuse.g, light.mColorDiffuse.b } );
      }
    }
    void scene::generate_default_camera() {
      const glm::mat4 projection = glm::perspective( 30.f, (16.f/9.f), 1.f, 150.f );
      const glm::mat4 lookat = glm::lookAt(
        glm::vec3{ 0.f, 30.f, 0.f },
        glm::vec3{ 1.f, 30.f, 0.f },
        glm::vec3{ 0.f, 40.f, 0.f }
      );
      cameras.emplace_back( projection * lookat );
      camera_pos.emplace_back( glm::vec3{ 0.f, 30.f, 0.f } );
    }
    void scene::load_node( const aiNode &node, const glm::mat4 &coord, const std::vector< std::pair< size_t, size_t > > &vertex_offsets, float aspect_ratio, const boost::container::flat_multimap< std::string, aiCamera* > &cameras_, const boost::container::flat_multimap< std::string, aiLight* > &lights_ ) {
      const glm::mat4 local_transform = {
        float( node.mTransformation.a1 ),
        float( node.mTransformation.b1 ),
        float( node.mTransformation.c1 ),
        float( node.mTransformation.d1 ),
        float( node.mTransformation.a2 ),
        float( node.mTransformation.b2 ),
        float( node.mTransformation.c2 ),
        float( node.mTransformation.d2 ),
        float( node.mTransformation.a3 ),
        float( node.mTransformation.b3 ),
        float( node.mTransformation.c3 ),
        float( node.mTransformation.d3 ),
        float( node.mTransformation.a4 ),
        float( node.mTransformation.b4 ),
        float( node.mTransformation.c4 ),
        float( node.mTransformation.d4 )
      };
      const glm::mat4 world_transform = coord * local_transform;
      for( unsigned int i = 0u;  i != node.mNumMeshes; ++i )
        offsets.emplace_back( vertex_offsets[ node.mMeshes[ i ] ].first, vertex_offsets[ node.mMeshes[ i ] ].second, matrices.size() );
      if( node.mNumMeshes != 0u ) matrices.push_back( world_transform );
      const auto camera = cameras_.equal_range( std::string( node.mName.data, node.mName.length ) );
      std::for_each( camera.first, camera.second, [&]( const auto &v ) { load_camera( world_transform, *v.second, aspect_ratio ); } );
      const auto light = lights_.equal_range( std::string( node.mName.data, node.mName.length ) );
      std::for_each( light.first, light.second, [&]( const auto &v ) { load_light( world_transform, *v.second ); } );
      for( unsigned int i = 0u; i != node.mNumChildren; ++i ) {
        auto child = node.mChildren[ i ];
        if( child ) load_node( *child, world_transform, vertex_offsets, aspect_ratio, cameras_, lights_ );
      }
    }
    std::vector< std::pair< size_t, size_t > > scene::load_meshes( const aiScene &scene ) {
      std::vector< std::pair< size_t, size_t > > offsets;
      for( unsigned int i = 0u; i != scene.mNumMeshes; ++i ) {
        const auto mesh = scene.mMeshes[ i ];
        if( mesh ) offsets.emplace_back( load_mesh( *mesh ) );
      }
      return offsets;
    }
    std::pair< size_t, size_t > scene::load_mesh( const aiMesh &mesh ) {
      const size_t begin = vertices.size();
      for( unsigned int i = 0u; i != mesh.mNumFaces; ++i )
        load_face( mesh, i );
      return std::make_pair( begin, vertices.size() - begin );
    }
    void scene::load_face( const aiMesh &mesh, uint32_t index ) {
      if( mesh.mFaces[ index ].mNumIndices != 3u ) throw unable_to_load_mesh();
      if( !mesh.HasNormals() ) std::cout << "No normals" << std::endl;
      if( !mesh.HasTangentsAndBitangents() ) std::cout << "No tangents" << std::endl;
      for( unsigned int i = 0u; i != 3u; ++i )
        load_vertex( mesh, mesh.mFaces[ index ].mIndices[ i ] );
    }
    void scene::load_vertex( const aiMesh &mesh, uint32_t index ) {
      const glm::vec3 normals = mesh.HasNormals() ? glm::vec3{
        float( mesh.mNormals[ index ].x ),
        float( mesh.mNormals[ index ].y ),
        float( mesh.mNormals[ index ].z )
      } : glm::vec3{ 0.f, 0.f, 0.f };
      const glm::vec3 tangents = mesh.HasTangentsAndBitangents() ? glm::vec3{
        float( mesh.mTangents[ index ].x ),
        float( mesh.mTangents[ index ].y ),
        float( mesh.mTangents[ index ].z )
      } : glm::vec3{ 0.f, 0.f, 0.f };
      const glm::vec2 texcoords = mesh.HasTangentsAndBitangents() ? glm::vec2{
        float( mesh.mTextureCoords[ 0 ][ index ].x ),
        float( mesh.mTextureCoords[ 0 ][ index ].y )
      } : glm::vec2{ 0.f, 0.f };
      vertices.emplace_back( vertex_t{
        { 
          float( mesh.mVertices[ index ].x ),
          float( mesh.mVertices[ index ].y ),
          float( mesh.mVertices[ index ].z )
        }, normals, tangents, texcoords
      } );
    }
}

