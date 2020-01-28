#include "separate.h"

static TF_Session * session;
static TF_Output * input_op;
static TF_Output * output_op;

void init_separator(std::string rootPath){
  auto graph = TF_NewGraph();
  auto status = TF_NewStatus();
  TF_Buffer* run_options = TF_NewBufferFromString("", 0);
  auto options = TF_NewSessionOptions();
  TF_Buffer* metagraph = TF_NewBuffer();
  const char* tags[] = {"serve"};
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
  TF_DeleteSessionOptions(options);
  input_op = new TF_Output{TF_GraphOperationByName(graph, "Placeholder"), 0};
  output_op = new TF_Output{TF_GraphOperationByName(graph, "strided_slice_13"), 0};
}

void separate(std::vector<float*>  channels, int length){
  float* test = new float[length*2];
  for(int i=0;i<length;i++){
    test[i*2] = channels[0][i];
    test[i*2+1] = channels[1][i];
  }

  std::int64_t* dims = new int64_t[2];
  dims[0] = length;
  dims[1] = 2;
  int num_dims = 2;
  std::size_t len = length*2*sizeof(float);

  TF_Tensor* output_tensor = nullptr;
  auto input_tensor = TF_AllocateTensor(TF_FLOAT, dims, static_cast<int>(num_dims), len);
  auto tensor_data = TF_TensorData(input_tensor);
  std::memcpy(tensor_data, test, len);

  auto status = TF_NewStatus();

  TF_SessionRun(
    session,
    nullptr, // Run options.
    input_op, &input_tensor, 1, // Input tensors, input tensor values, number of inputs.
    output_op, &output_tensor, 1, // Output tensors, output tensor values, number of outputs.
    nullptr, 0, // Target operations, number of targets.
    nullptr, // Run metadata.
    status // Output status.
  );

  auto data = static_cast<float*>(TF_TensorData(output_tensor));

  for(int i=0;i<length;i++){
    channels[0][i] = data[i*2];
    channels[1][i] = data[i*2+1];
  }
}