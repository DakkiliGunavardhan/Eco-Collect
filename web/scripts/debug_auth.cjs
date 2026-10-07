const http = require('http');

function postJSON(urlStr, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const body = JSON.stringify(data);
    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: responseBody });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getJSON(urlStr, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = http.request(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: responseBody });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  console.log('--- TESTING API AUTH & DASHBOARD ENDPOINTS ---');
  
  // 1. Citizen Login
  console.log('\n1. Testing Citizen Login (/api/auth/login)...');
  const citRes = await postJSON('http://127.0.0.1:8000/api/auth/login', {
    email: 'testcitizen@example.com',
    password: 'Password123'
  });
  console.log('Citizen Login Status:', citRes.status);
  console.log('Citizen Login Data:', JSON.stringify(citRes.data, null, 2));

  if (citRes.data && citRes.data.token) {
    console.log('\nTesting GET /api/citizen/dashboard...');
    const citDash = await getJSON('http://127.0.0.1:8000/api/citizen/dashboard', citRes.data.token);
    console.log('Citizen Dashboard Status:', citDash.status);
    console.log('Citizen Dashboard Data:', JSON.stringify(citDash.data, null, 2));

    console.log('\nTesting GET /api/notifications for Citizen...');
    const citNotif = await getJSON('http://127.0.0.1:8000/api/notifications', citRes.data.token);
    console.log('Citizen Notifications Status:', citNotif.status);
  }

  // 2. Admin Login
  console.log('\n2. Testing Admin Login (/api/auth/login)...');
  const adminRes = await postJSON('http://127.0.0.1:8000/api/auth/login', {
    email: 'admin@ecocollect.city',
    password: 'Admin@123'
  });
  console.log('Admin Login Status:', adminRes.status);
  console.log('Admin Login Data:', JSON.stringify(adminRes.data, null, 2));

  if (adminRes.data && adminRes.data.token) {
    console.log('\nTesting GET /api/admin/dashboard...');
    const adminDash = await getJSON('http://127.0.0.1:8000/api/admin/dashboard', adminRes.data.token);
    console.log('Admin Dashboard Status:', adminDash.status);
    console.log('Admin Dashboard Data:', JSON.stringify(adminDash.data, null, 2));

    console.log('\nTesting GET /api/notifications for Admin...');
    const adminNotif = await getJSON('http://127.0.0.1:8000/api/notifications', adminRes.data.token);
    console.log('Admin Notifications Status:', adminNotif.status);
  }
})();
