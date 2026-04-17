const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api/messages';

async function testMessage() {
    try {
        console.log('Testing POST to:', API_URL);
        const res = await axios.post(API_URL, {
            name: 'Test Bot',
            email: 'test@example.com',
            subject: 'Debug Message',
            message: 'This is a test message from the debugger.'
        });

        console.log('✅ POST Success:', res.data);
    } catch (error) {
        console.error('❌ POST Failed:', error.response ? error.response.data : error.message);
    }
}

testMessage();
