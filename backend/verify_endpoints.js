const http = require('http');

function get(path, token) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1' + path,
      headers: token ? { Authorization: 'Bearer ' + token } : {}
    };
    http.get(opts, (r) => {
      let d = '';
      r.on('data', (c) => d += c);
      r.on('end', () => {
        try {
          const j = JSON.parse(d);
          console.log(path, '->', r.statusCode, 'items:', Array.isArray(j.data) ? j.data.length : typeof j.data);
        } catch(e) {
          console.log(path, '-> RAW:', d.slice(0, 100));
        }
        resolve();
      });
    }).on('error', (e) => { console.log(path, 'ERROR:', e.message); resolve(); });
  });
}

async function main() {
  // Login first
  const loginRes = await new Promise((resolve) => {
    const body = JSON.stringify({ email: 'admin@alpha.com', password: 'admin123' });
    const req = http.request({
      hostname: 'localhost', port: 4000, path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve(JSON.parse(d)));
    });
    req.write(body);
    req.end();
  });

  const token = loginRes.data && loginRes.data.accessToken;
  if (!token) { console.log('Login failed:', JSON.stringify(loginRes)); return; }
  console.log('Logged in as:', loginRes.data.user && loginRes.data.user.email);

  await get('/masters/categories', token);
  await get('/masters/brands', token);
  await get('/masters/suppliers', token);
  await get('/masters/labours', token);
  await get('/masters/units', token);
  await get('/masters/warehouses', token);
}

main().catch(console.error);
