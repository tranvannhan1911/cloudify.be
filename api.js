const axios = require('axios');
const SEMAPHORE_BASE_URL = 'http://192.168.30.62:3002/api';
const PROJECT_ID = 1

async function createTemplate(data, cookie) {
    try {
        const response = await axios.post(
            `${SEMAPHORE_BASE_URL}/project/${PROJECT_ID}/templates`,
            data,
            {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Cookie': `semaphore=${cookie}`
                }
            }
        );
        console.log(response.data)
        return response.data
    } catch (error) {
        console.error('Error during request:', error.message);
        return null;
    }
}

async function runTask(data, cookie) {
    try {
        const response = await axios.post(
            `${SEMAPHORE_BASE_URL}/project/${PROJECT_ID}/tasks`,
            data,
            {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Cookie': `semaphore=${cookie}`
                }
            }
        );
        return response.data
    } catch (error) {
        console.error('Error during request:', error.message);
        return null;
    }
}

async function loginAndGetCookie(username, password) {
    try {
        const response = await axios.post(
            `${SEMAPHORE_BASE_URL}/auth/login`,
            {
                auth: username,
                password: password
            },
            {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        );
        // Extract the cookies from the response headers
        const cookies = response.headers['set-cookie'];
        
        // If there are multiple cookies, join them into a single string
        const cookieString = cookies ? cookies.join('; ') : null;

        return cookieString;

    } catch (error) {
        console.error('Error during login request:', error.message);
        return null;
    }
}
module.exports = {
    loginAndGetCookie,
    createTemplate,
    runTask,
};