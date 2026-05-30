const axios = require('axios');

// Example external API service. Configure BASE_URL and API keys in .env.

const client = axios.create({
  baseURL: process.env.EXTERNAL_API_BASE_URL || 'https://api.example.com',
  timeout: 10000,
});

const getExampleResource = async () => {
  const response = await client.get('/resource');
  return response.data;
};

module.exports = {
  getExampleResource,
};

