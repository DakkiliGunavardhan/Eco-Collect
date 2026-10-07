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

(async () => {
  console.log('=== TESTING FORGOT PASSWORD BACKEND API ===');

  console.log('\n1. Test with registered email (testcitizen@example.com):');
  const res1 = await postJSON('http://127.0.0.1:8000/api/auth/forgot-password', { email: 'testcitizen@example.com' });
  console.log('Status:', res1.status);
  console.log('Response:', JSON.stringify(res1.data || res1.raw, null, 2));

  console.log('\n2. Test with unregistered email (notfound999@example.com):');
  const res2 = await postJSON('http://127.0.0.1:8000/api/auth/forgot-password', { email: 'notfound999@example.com' });
  console.log('Status:', res2.status);
  console.log('Response:', JSON.stringify(res2.data || res2.raw, null, 2));

  console.log('\n3. Test with another email format:');
  const res3 = await postJSON('http://127.0.0.1:8000/api/auth/forgot-password', { email: 'admin@ecocollect.city' });
  console.log('Status:', res3.status);
  console.log('Response:', JSON.stringify(res3.data || res3.raw, null, 2));
})();
