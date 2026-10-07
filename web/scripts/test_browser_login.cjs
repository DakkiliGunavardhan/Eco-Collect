const { Builder, By } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

(async () => {
  let options = new chrome.Options();
  options.addArguments('--headless=new');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');

  let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

  try {
    console.log('=== TESTING CITIZEN LOGIN IN BROWSER ===');
    await driver.get('http://127.0.0.1:5173/#/citizen/login');
    await driver.sleep(1000);

    let inputs = await driver.findElements(By.css('input'));
    if (inputs.length >= 2) {
      await inputs[0].sendKeys('testcitizen@example.com');
      await inputs[1].sendKeys('Password123');
    }

    let submitBtn = await driver.findElement(By.css('button[type="submit"]'));
    console.log('Clicking Citizen Login submit button...');
    await submitBtn.click();
    await driver.sleep(3000);

    console.log('Current URL after Citizen Login:', await driver.getCurrentUrl());
    let citizenLogs = await driver.manage().logs().get('browser');
    console.log('Citizen Console Logs:', citizenLogs.map(l => l.message));

    console.log('\n=== TESTING ADMIN LOGIN IN BROWSER ===');
    await driver.get('http://127.0.0.1:5173/#/admin/login');
    await driver.sleep(1000);

    let adminInputs = await driver.findElements(By.css('input'));
    if (adminInputs.length >= 2) {
      await adminInputs[0].sendKeys('admin@ecocollect.city');
      await adminInputs[1].sendKeys('Admin@123');
    }

    let adminBtn = await driver.findElement(By.css('button[type="submit"]'));
    console.log('Clicking Admin Login submit button...');
    await adminBtn.click();
    await driver.sleep(3000);

    console.log('Current URL after Admin Login:', await driver.getCurrentUrl());
    let adminLogs = await driver.manage().logs().get('browser');
    console.log('Admin Console Logs:', adminLogs.map(l => l.message));

  } catch (err) {
    console.error('Error during browser login test:', err);
  } finally {
    await driver.quit();
  }
})();
