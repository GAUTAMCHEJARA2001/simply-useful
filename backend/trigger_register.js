const axios = require('axios');

async function trigger() {
  try {
    console.log('--- 🧪 [TRIGGER] REGISTER ATTEMPT 🧪 ---');
    const res = await axios.post('http://localhost:4000/api/v1/auth/register', {
      email: 'test' + Date.now() + '@example.com',
      password: 'password123',
      name: 'Test User'
    });
    console.log('✅ Success:', res.data);
  } catch (err) {
    console.error('❌ Error Status:', err.response?.status);
    console.error('❌ Error Data:', JSON.stringify(err.response?.data, null, 2));
  }
}

trigger();
