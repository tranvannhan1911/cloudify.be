const express = require('express');
const cors = require('cors'); 
const { TerraformGenerator, Resource, map, fn } = require('terraform-generator');

const app = express();
app.use(cors()); 
app.use(express.json());

const formatName = (name) => {
  return name.replace(/ /g, '-');
}

app.post('/generate-terraform', (req, res) => {
  const { resources } = req.body;

  const tfg = new TerraformGenerator({
    required_version: '>= 0.12'
  });
  for (const resource of resources) {
    const name = formatName(resource.terraform.name)
    const relates = resource.terraform.relates;
    delete resource.terraform.relates;   
    tfg.resource(resource.resource, name, resource.terraform);
    for (var relate_resource_type in relates) {
      for (const relate_resource of relates[relate_resource_type]) {
        tfg.resource(relate_resource_type, formatName(relate_resource.name), relate_resource);
      }
    }
  }
  res.json(tfg.generate());
});

app.listen(3001, () => console.log('Backend running on port 3001'));

