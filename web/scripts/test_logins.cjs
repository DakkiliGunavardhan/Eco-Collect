const { Builder, By } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function testCitizen() {
  let options = new chrome.Options();
  options.addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');
  let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  
  try {
    console.log('=== CITIZEN LOGIN TEST ===');
    await driver.get('http://localhost:5173/#/citizen/login');
    await driver.sleep(1000);
    let inputs = await driver.findElements(By.tagName('input'));
    await inputs[0].sendKeys('testcitizen@example.com');
    await inputs[1].sendKeys('Password123');
    let submitBtn = await driver.findElement(By.css('button[type="submit"]'));
    await submitBtn.click();
    await driver.sleep(2500);
    console.log('URL after Citizen login:', await driver.getCurrentUrl());
    
    let cRole = await driver.executeScript("return localStorage.getItem('role');");
    let cToken = await driver.executeScript("return localStorage.getItem('token');");
    console.log('Citizen LocalStorage - role:', cRole, 'token:', cToken ? cToken.substring(0, 15) + '...' : null);
  } finally {
    await driver.quit();
  }
}

async function testAdmin() {
  let options = new chrome.Options();
  options.addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');
  let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  
  try {
    console.log('\n=== ADMIN LOGIN TEST ===');
    await driver.get('http://localhost:5173/#/admin/login');
    await driver.sleep(1000);
    let inputs = await driver.findElements(By.tagName('input'));
    console.log('Admin inputs found:', inputs.length);
    await inputs[0].sendKeys('admin@ecocollect.city');
    await inputs[1].sendKeys('Admin@123');
    let submitBtn = await driver.findElement(By.css('button[type="submit"]'));
    await submitBtn.click();
    await driver.sleep(2500);
    console.log('URL after Admin login:', await driver.getCurrentUrl());
    
    let aRole = await driver.executeScript("return localStorage.getItem('role');");
    let aToken = await driver.executeScript("return localStorage.getItem('token');");
    console.log('Admin LocalStorage - role:', aRole, 'token:', aToken ? aToken.substring(0, 15) + '...' : null);
  } finally {
    await driver.quit();
  }
}

async function testSupervisor() {
  let options = new chrome.Options();
  options.addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');
  let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  
  try {
    console.log('\n=== SUPERVISOR LOGIN TEST ===');
    await driver.get('http://localhost:5173/#/supervisor/login');
    await driver.sleep(1000);
    let inputs = await driver.findElements(By.tagName('input'));
    console.log('Supervisor inputs found:', inputs.length);
    await inputs[0].sendKeys('SUP-930');
    await inputs[1].sendKeys('Admin@123');
    let submitBtn = await driver.findElement(By.css('button[type="submit"]'));
    await submitBtn.click();
    await driver.sleep(2500);
    console.log('URL after Supervisor login:', await driver.getCurrentUrl());

    let sRole = await driver.executeScript("return localStorage.getItem('role');");
    let sToken = await driver.executeScript("return localStorage.getItem('token');");
    console.log('Supervisor LocalStorage - role:', sRole, 'token:', sToken ? sToken.substring(0, 15) + '...' : null);
  } finally {
    await driver.quit();
  }
}

(async () => {
  await testCitizen();
  await testAdmin();
  await testSupervisor();
})();
