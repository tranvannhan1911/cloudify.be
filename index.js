const cp = require('child_process');
const fs = require('fs');

const express = require('express');
const cors = require('cors');
const {TerraformGenerator, Resource, map, fn} = require('terraform-generator');

const app = express();
app.use(cors());
app.use(express.json());

const formatName = (name) => name.replace(/ /g, '-');
app.post('/generate-terraform', (req, res) => {
    const {resources} = req.body;

    const engine = new TerraformGenerator({required_version: '>= 0.12'});
    resources.forEach((item) => {
        const {resource, properties} = item;
        const relates = properties?.relates || {};

        if (!!properties?.relates) {
            delete properties.relates;
        }

        engine.resource(resource, formatName(properties.name), properties);
        Object.entries(relates).forEach(([relate_type, relate_resources]) => {
            relate_resources.forEach(relate_resource => {
                engine.resource(relate_type, formatName(relate_resource.name), relate_resource);
            });
        });
    })
    const output = engine.generate();
    const cmd = cp.spawnSync('terraform', ['fmt', '-no-color', '-'], {input: output.tf});
    if (cmd.error) {
        res.status(500)
            .header({'Content-Type': 'application/json'})
            .send({error: cmd.error});
        return;
    }
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.write(cmd.stdout);
    res.end();
});

app.listen(3000, () => console.log('Backend running on port 3000'));

