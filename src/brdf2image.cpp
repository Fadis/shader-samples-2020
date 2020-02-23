#include <cstdint>
#include <cmath>
#include <array>
#include <iostream>
#include <fstream>
#include <algorithm>
#include <iterator>
#include <charconv>
#include <random>
#include <boost/container/flat_map.hpp>
#include <boost/program_options.hpp>
#include <omp.h>
#include <nlohmann/json.hpp>
#include <OpenImageIO/imageio.h>

#define BRDF_SAMPLING_RES_THETA_H       90
#define BRDF_SAMPLING_RES_THETA_D       90
#define BRDF_SAMPLING_RES_PHI_D         360

#define RED_SCALE (1.0/1500.0)
#define GREEN_SCALE (1.15/1500.0)
#define BLUE_SCALE (1.66/1500.0)


// Read BRDF data
bool read_brdf(const char *filename, double* &brdf)
{
	FILE *f = fopen(filename, "rb");
	if (!f)
		return false;

	int dims[3];
	fread(dims, sizeof(int), 3, f);
	int n = dims[0] * dims[1] * dims[2];
	if (n != BRDF_SAMPLING_RES_THETA_H *
		 BRDF_SAMPLING_RES_THETA_D *
		 BRDF_SAMPLING_RES_PHI_D / 2) 
	{
		fprintf(stderr, "Dimensions don't match\n");
		fclose(f);
		return false;
	}

	brdf = (double*) malloc (sizeof(double)*3*n);
	fread(brdf, sizeof(double), 3*n, f);

	fclose(f);
	return true;
}

// Lookup theta_half index
// This is a non-linear mapping!
// In:  [0 .. pi/2]
// Out: [0 .. 89]
inline int theta_half_index(double theta_half)
{
	if (theta_half <= 0.0)
		return 0;
	double theta_half_deg = ((theta_half / (M_PI/2.0))*BRDF_SAMPLING_RES_THETA_H);
	double temp = theta_half_deg*BRDF_SAMPLING_RES_THETA_H;
	temp = sqrt(temp);
	int ret_val = (int)temp;
	if (ret_val < 0) ret_val = 0;
	if (ret_val >= BRDF_SAMPLING_RES_THETA_H)
		ret_val = BRDF_SAMPLING_RES_THETA_H-1;
	return ret_val;
}




inline int theta_diff_index(double theta_diff)
{
	int tmp = int(theta_diff / (M_PI * 0.5) * BRDF_SAMPLING_RES_THETA_D);
	if (tmp < 0)
		return 0;
	else if (tmp < BRDF_SAMPLING_RES_THETA_D - 1)
		return tmp;
	else
		return BRDF_SAMPLING_RES_THETA_D - 1;
}

inline int phi_diff_index(double phi_diff)
{
	// Because of reciprocity, the BRDF is unchanged under
	// phi_diff -> phi_diff + M_PI
	if (phi_diff < 0.0)
		phi_diff += M_PI;

	// In: phi_diff in [0 .. pi]
	// Out: tmp in [0 .. 179]
	int tmp = int(phi_diff / M_PI * BRDF_SAMPLING_RES_PHI_D / 2);
	if (tmp < 0)	
		return 0;
	else if (tmp < BRDF_SAMPLING_RES_PHI_D / 2 - 1)
		return tmp;
	else
		return BRDF_SAMPLING_RES_PHI_D / 2 - 1;
}

double gamma( double v ) {
  return v / (v + 0.155 ) * 1.019;
}

int main( int argc, char *argv[] ) {
  boost::program_options::options_description options("オプション");
  options.add_options()
    ("help,h",    "ヘルプを表示")
    ("input,i", boost::program_options::value<std::string>(), "入力ファイル")
    ("output,o", boost::program_options::value<std::string>(), "出力ファイル");
  boost::program_options::variables_map params;
  boost::program_options::store( boost::program_options::parse_command_line( argc, argv, options ), params );
  boost::program_options::notify( params );
  if( params.count("help") || !params.count("input") || !params.count("output") ) {
    std::cout << options << std::endl;
    return !params.count( "help" );
  }
  double* brdf;
  if ( !read_brdf( params[ "input" ].as< std::string >().c_str(), brdf ) ) {
    std::cerr <<  "Unable to read " << params[ "input" ].as< std::string >() << std::endl;
    return 1;
  }
  double max = 0.0;
  std::vector< float > v;
  v.reserve( BRDF_SAMPLING_RES_THETA_D * BRDF_SAMPLING_RES_THETA_H * 3 );
  double sum = 0.0;
  for( unsigned int i = 0; i != BRDF_SAMPLING_RES_THETA_D; ++i ) {
    double theta_diff = double( BRDF_SAMPLING_RES_THETA_D - i - 1 ) / double( BRDF_SAMPLING_RES_THETA_D ) * M_PI / 2.0;
    for( unsigned int j = 0; j != BRDF_SAMPLING_RES_THETA_H; ++j ) {
      double theta_half = double( j ) / double( BRDF_SAMPLING_RES_THETA_H ) * M_PI / 2.0;
      int ind = phi_diff_index(M_PI/2) +
        theta_diff_index(theta_diff) * BRDF_SAMPLING_RES_PHI_D / 2 +
        theta_half_index(theta_half) * BRDF_SAMPLING_RES_PHI_D / 2 *
        BRDF_SAMPLING_RES_THETA_D;
      auto red_val = gamma( std::max( brdf[ind] * RED_SCALE, 0.0 ) );
      auto green_val = gamma( std::max( brdf[ind + BRDF_SAMPLING_RES_THETA_H*BRDF_SAMPLING_RES_THETA_D*BRDF_SAMPLING_RES_PHI_D/2] * GREEN_SCALE, 0.0 ) );
      auto blue_val = gamma( std::max( brdf[ind + BRDF_SAMPLING_RES_THETA_H*BRDF_SAMPLING_RES_THETA_D*BRDF_SAMPLING_RES_PHI_D] * BLUE_SCALE, 0.0 ) );
      max = std::max( std::max( std::max( max, red_val ), green_val ), blue_val );
      sum += red_val + green_val + blue_val;
      v.push_back( red_val );
      v.push_back( green_val );
      v.push_back( blue_val );
    }
  }
  double average = sum / ( BRDF_SAMPLING_RES_THETA_D * BRDF_SAMPLING_RES_THETA_H * 3 );
  std::vector< uint8_t > image;
  image.reserve( BRDF_SAMPLING_RES_THETA_D * BRDF_SAMPLING_RES_THETA_H * 3 );
  for( unsigned int i = 0; i != BRDF_SAMPLING_RES_THETA_D; ++i ) {
    for( unsigned int j = 0; j != BRDF_SAMPLING_RES_THETA_H; ++j ) {
      int index = i * BRDF_SAMPLING_RES_THETA_H * 3 + j * 3;
      std::cout << v[ index ]/(average*2) << " " << v[ index + 1 ]/(average*2) << " " << v[ index + 2 ]/(average*2) << std::endl;
      image.push_back( uint8_t( std::min( std::max( v[ index ]/(average*2), 0.0  ), 1.0 ) * 255.0 ) );
      image.push_back( uint8_t( std::min( std::max( v[ index + 1 ]/(average*2), 0.0  ), 1.0 ) * 255.0 ) );
      image.push_back( uint8_t( std::min( std::max( v[ index + 2 ]/(average*2), 0.0  ), 1.0 ) * 255.0 ) );
    }
  }
  using namespace OIIO_NAMESPACE;
  ImageOutput *out = ImageOutput::create( params[ "output" ].as< std::string >() );
  if ( !out ) {
    std::cerr << "Unable to open output file" << std::endl;
    return -1;
  }
  ImageSpec spec ( BRDF_SAMPLING_RES_THETA_H, BRDF_SAMPLING_RES_THETA_D, 3, TypeDesc::UINT8);
  out->open( params[ "output" ].as< std::string >(), spec );
  out->write_image( TypeDesc::UINT8, image.data() );
  out->close();
  return 0;
}


