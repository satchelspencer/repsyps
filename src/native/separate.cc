#include "separate.h"

static TF_Session * session;
static TF_Output * input_op;
static TF_Output * output_op;


void init_separator(std::string rootPath){
  TF_Status* status = TF_NewStatus();
  TF_Buffer* run_options = TF_NewBufferFromString("", 0);
  TF_SessionOptions* options = TF_NewSessionOptions();
  const char* tags[] = {"serve"};

  TF_Graph* graph = TF_NewGraph();
  TF_Buffer* metagraph = TF_NewBuffer();
  
  session = TF_LoadSessionFromSavedModel(
    options,
    run_options,
    (rootPath + "lib/spleeter").c_str(),
    tags,
    1,
    graph,
    metagraph,
    status
  );

  TF_DeleteStatus(status);
  TF_DeleteSessionOptions(options);
  TF_DeleteBuffer(run_options);

  input_op = new TF_Output{TF_GraphOperationByName(graph, "Placeholder"), 0};
  output_op = new TF_Output{TF_GraphOperationByName(graph, "strided_slice_13"), 0};
}

void separate(std::vector<float*>  channels, int length){
  std::size_t len = length*2*sizeof(float);
  int64_t* dims = new int64_t[2]{length, 2};
  TF_Tensor* input_tensor = TF_AllocateTensor(TF_FLOAT, dims, 2, len);
  float* data_in = static_cast<float*>(TF_TensorData(input_tensor));
  for(int i=0;i<length;i++){
    data_in[i*2] = channels[0][i];
    data_in[i*2+1] = channels[1][i];
  }
  TF_Tensor* output_tensor = nullptr;
  TF_Status* status = TF_NewStatus();

  TF_SessionRun(
    session,
    nullptr,
    input_op, &input_tensor, 1,
    output_op, &output_tensor, 1,
    nullptr, 0,
    nullptr,
    status
  );

  float* data_out = static_cast<float*>(TF_TensorData(output_tensor));
  for(int i=0;i<length;i++){
    channels[0][i] = data_out[i*2];
    channels[1][i] = data_out[i*2+1];
  }

  TF_DeleteStatus(status);
  TF_DeleteTensor(input_tensor);
  TF_DeleteTensor(output_tensor);
}