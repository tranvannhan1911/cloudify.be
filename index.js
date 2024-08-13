const cp = require('child_process');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const api = require('./api');
const cookieParser = require('cookie-parser');

const express = require('express');
const cors = require('cors');
const {TerraformGenerator, Resource, map, fn} = require('terraform-generator');

const app = express();
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
app.use(cookieParser());
app.use(express.json());

// constaints
const ROOT_REPO_PATH = '/usr/src/app/cloudify-terraform/';
const VARIABLE_PATH = '/usr/src/app/variables.tf';

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

app.post('/apply-terraform', async (req, res) => {
    const { template_id, inventory_path, terraform } = req.body;
    const semaphore_cookie = req.cookies['semaphore'];
    console.log("semaphore_cookie", semaphore_cookie)

    // Reset to the last commit and remove untracked files
    exec(`git -C ${ROOT_REPO_PATH} reset --hard origin/main && git -C ${ROOT_REPO_PATH} clean -fd`, (err, stdout, stderr) => {
        if (err) {
            console.error('Error resetting and cleaning the repository:', stderr);
            return res.status(500).json({ message: 'Failed to reset and clean the repository' });
        }
        
        // Create a timestamped directory name
        const dirPath = path.join(ROOT_REPO_PATH, inventory_path);

        // Create the directory
        fs.mkdir(dirPath, { recursive: true }, (err) => {
            if (err) {
                console.error('Error creating directory:', err);
                return res.status(500).json({ message: 'Failed to create directory' });
            }

            // Copy the variables.tf file to the new directory
            const destFilePath = path.join(dirPath, 'variables.tf');
            fs.copyFile(VARIABLE_PATH, destFilePath, (err) => {
                if (err) {
                    console.error('Error copying variables.tf:', err);
                    return res.status(500).json({ message: 'Failed to copy variables.tf' });
                }

                // Define the file path inside the newly created directory
                const mainTfFilePath = path.join(dirPath, 'main.tf');

                // Write the terraform content to the main.tf file
                fs.writeFile(mainTfFilePath, terraform, (err) => {
                    if (err) {
                        console.error('Error writing to file:', err);
                        return res.status(500).json({ message: 'Failed to write to main.tf' });
                    }

                    // Add the files to the staging area
                    exec(`git -C ${ROOT_REPO_PATH} add ${dirPath}`, (err, stdout, stderr) => {
                        if (err) {
                            console.error('Error adding files to git:', stderr);
                            return res.status(500).json({ message: 'Failed to add files to git' });
                        }

                        // Commit the change
                        exec(`git -C ${ROOT_REPO_PATH} commit -m "Add main.tf and variables.tf in ${inventory_path} directory"`, (err, stdout, stderr) => {
                            if (err) {
                                console.error('Error committing changes:', stderr);
                                return res.status(500).json({ message: 'Do not have any changes' });
                            }

                            // Push the commit to the repository
                            exec(`git -C ${ROOT_REPO_PATH} push`, async (err, stdout, stderr) => {
                                if (err) {
                                    console.error('Error pushing changes to repo:', stderr);
                                    return res.status(500).json({ message: 'Failed to push changes to repository' });
                                }

                                const response = await api.runTask({
                                    "template_id": template_id,
                                    "params": {
                                        "auto_approve": true
                                    }
                                }, semaphore_cookie)
                                console.log(response)
                                return res.status(200).json({ ...response, message: 'Terraform configuration applied, variables.tf copied, and pushed to repository', path: inventory_path });
                            });
                        });
                    });
                });
            });
        });
    });
});


app.post('/create-template', async (req, res) => {
    const { name, path } = req.body;
    const cookie = req.cookies['semaphore'];

    const data = {
        "project_id": 1, // hieunn23
        "inventory_id": 7, // demo
        "repository_id": 4, // cloudify-terraform
        "environment_id": 2, // demo
        "view_id": 1,
        "vault_id": 1,
        "name": name,
        "playbook": path,
        "arguments": "[]",
        "description": "Cloudify Terraform",
        "allow_override_args_in_task": false,
        "limit": "",
        "suppress_success_alerts": true,
        "app": "terraform",
        "survey_vars": []
    }
    const response = await api.createTemplate(data, cookie);
    return res.status(200).json(response);
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const cookie = await api.loginAndGetCookie(username, password)
    const semaphore = cookie.split(";")[0].split("=")[1]
    res.cookie('semaphore', semaphore, {
        path: '/',       // Đảm bảo cookie có thể được gửi từ client
        maxAge: 24 * 60 * 60 * 1000 // Cookie tồn tại trong 24 giờ
    });
    return res.status(200).json({
        cookie: cookie
    });
});

app.listen(3000, () => console.log('Backend running on port 3000'));

