const { Builder, By } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

(async () => {
  let options = new chrome.Options();
  options.addArguments('--headless=new');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');

  let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

  try {
    console.log('--- TESTING ADMIN LOGIN ONLY ---');
    await driver.get('http://127.0.0.1:5173/#/admin/login');
    await new Promise(r => setTimeout(r, 1000));

    const adminInputs = await driver.findElements(By.css('input'));
    console.log('Admin inputs found:', adminInputs.length);
    if (adminInputs.length >= 2) {
      await adminInputs[0].sendKeys('admin@ecocollect.city');
      await adminInputs[1].sendKeys('Admin@123');
    }

    const adminSubmitBtn = await driver.findElement(By.css('button[type="submit"]'));
    console.log('Clicking Admin login button...');
    await adminSubmitBtn.click();
    await new Promise(r => setTimeout(r, 4000));

    console.log('Current URL after Admin Login:', await driver.getCurrentUrl());
    let adminPageText = await driver.findElement(By.css('body')).getText();
    console.log('Admin Page body snippet:\n', adminPageText.slice(0, 400));

    const adminLogs = await driver.manage().logs().get('browser');
    console.log('Admin Browser Console logs:', adminLogs.map(l => l.message));

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await driver.quit();
  }
})();
