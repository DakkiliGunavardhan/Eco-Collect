const { Builder, By } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function testFlow(portalName, loginUrl, email, password, expectedDashboard) {
  console.log(`\n==========================================`);
  console.log(`TESTING ${portalName.toUpperCase()} LOGIN FLOW (${loginUrl})`);
  console.log(`==========================================`);

  let options = new chrome.Options();
  options.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage');
  options.setLoggingPrefs({ browser: 'ALL' });

  let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

  try {
    console.log(`1. Navigating to ${loginUrl}...`);
    await driver.get(loginUrl);
    await driver.sleep(1000);

    console.log(`2. Clearing localStorage...`);
    await driver.executeScript('localStorage.clear();');
    await driver.get(loginUrl);
    await driver.sleep(1000);

    console.log(`3. Finding form inputs...`);
    let inputs = await driver.findElements(By.css('input'));
    console.log(`   Found ${inputs.length} inputs.`);
    if (inputs.length < 2) {
      console.error(`   ERROR: Less than 2 inputs found!`);
      return;
    }

    console.log(`4. Entering credentials: ${email} / ***`);
    await inputs[0].clear();
    await inputs[0].sendKeys(email);
    await inputs[1].clear();
    await inputs[1].sendKeys(password);

    let submitBtn = await driver.findElement(By.css('button[type="submit"]'));
    console.log(`5. Clicking submit button...`);
    await submitBtn.click();

    console.log(`6. Waiting 3 seconds for response & navigation...`);
    await driver.sleep(3000);

    let currentUrl = await driver.getCurrentUrl();
    console.log(`7. Current URL after submit: ${currentUrl}`);

    let storedToken = await driver.executeScript("return localStorage.getItem('token');");
    let storedRole = await driver.executeScript("return localStorage.getItem('role');");
    let storedUser = await driver.executeScript("return localStorage.getItem('user');");

    console.log(`8. LocalStorage after submit:`);
    console.log(`   token: ${storedToken ? storedToken.substring(0, 20) + '...' : 'NULL'}`);
    console.log(`   role: ${storedRole}`);
    console.log(`   user: ${storedUser ? storedUser.substring(0, 50) + '...' : 'NULL'}`);

    let logs = await driver.manage().logs().get('browser');
    console.log(`9. Browser console logs (${logs.length}):`);
    logs.forEach(l => console.log(`   [${l.level.name}] ${l.message}`));

    if (currentUrl.includes(expectedDashboard)) {
      console.log(`✅ SUCCESS: Navigated to ${expectedDashboard}`);
    } else {
      console.log(`❌ FAILURE: Did NOT navigate to ${expectedDashboard}. Stuck at ${currentUrl}`);
    }
  } catch (err) {
    console.error(`ERROR during ${portalName} test:`, err);
  } finally {
    await driver.quit();
  }
}

(async () => {
  await testFlow('Citizen', 'http://localhost:5173/#/citizen/login', 'testcitizen@example.com', 'Password123', '/citizen/dashboard');
  await testFlow('Admin', 'http://localhost:5173/#/admin/login', 'admin@ecocollect.city', 'Admin@123', '/admin/dashboard');
  await testFlow('Supervisor', 'http://localhost:5173/#/supervisor/login', 'SUP-930', 'Admin@123', '/supervisor/dashboard');
})();
