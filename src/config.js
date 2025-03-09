// API configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://schulen-api.vercel.app' // Replace with your actual production API URL
  : 'http://localhost:5000';

const config = {
  API_BASE_URL
};

export default config; 