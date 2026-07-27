async function run() {
  try {
    const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'kiran@kamla.com', password: 'password123' })
    });
    const loginData = await loginRes.json();
    if (!loginData.success) {
      console.error('Login failed:', loginData);
      return;
    }
    const token = loginData.data.token;
    console.log('Login successful');

    const productsRes = await fetch('http://localhost:4000/api/v1/products', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const productsData = await productsRes.json();
    if (!productsData.success) {
      console.error('Products failed:', productsData);
      return;
    }
    console.log('Products fetched successfully, count:', productsData.data.length);
  } catch (err) {
    console.error('Error:', err.message);
  }
}
run();
