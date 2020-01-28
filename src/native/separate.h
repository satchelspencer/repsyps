#include <vector>
#include <string>
#include <tensorflow/c/c_api.h>       

void init_separator(std::string rootPath);
void separate(std::vector<float*>  channels, int length);