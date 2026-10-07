import { Builder, By } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

function createDriver() {
  const options = new chrome.Options();
  options.addArguments(
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--window-size=1280,800'
  );
  return new Builder().forBrowser('chrome').setChromeOptions(options).build();
}

async function testCitizen() {
  const driver = await createDriver();
  try {
    console.log('=== 1. TESTING CITIZEN LOGIN ===');
    await driver.get('http://127.0.0.1:5173/#/citizen/login');
    await driver.sleep(1000);

    const emailInput = await driver.findElement(By.css('input[type="email"]'));
    await emailInput.sendKeys('testcitizen@example.com');

    const passInput = await driver.findElement(By.css('input[type="password"]'));
    await passInput.sendKeys('Password123');

    const submitBtn = await driver.findElement(By.css('button[type="submit"]'));
    await submitBtn.click();

    await driver.sleep(2000);

    const url = await driver.getCurrentUrl();
    console.log('URL after Citizen login:', url);
    const body = await driver.findElement(By.css('body')).getText();
    console.log('Citizen Dashboard loaded:', body.includes('Welcome back, Test Citizen!'));
  } finally {
    await driver.quit();
  }
}

async function testAdmin() {
  const driver = await createDriver();
  try {
    console.log('\n=== 2. TESTING ADMIN LOGIN ===');
    await driver.get('http://127.0.0.1:5173/#/admin/login');
    await driver.sleep(1000);

    const adminEmail = await driver.findElement(By.css('input[type="email"]'));
    await adminEmail.sendKeys('admin@ecocollect.city');

    const adminPass = await driver.findElement(By.css('input[type="password"]'));
    await adminPass.sendKeys('Admin@123');

    const adminSubmit = await driver.findElement(By.css('button[type="submit"]'));
    await adminSubmit.click();

    await driver.sleep(2000);

    const url = await driver.getCurrentUrl();
    console.log('URL after Admin login:', url);
    const body = await driver.findElement(By.css('body')).getText();
    console.log('Admin Dashboard loaded:', body.includes('City Operations Center'));
  } finally {
    await driver.quit();
  }
}

async function testSupervisor() {
  const driver = await createDriver();
  try {
    console.log('\n=== 3. TESTING SUPERVISOR LOGIN ===');
    await driver.get('http://127.0.0.1:5173/#/supervisor/login');
    await driver.sleep(1000);

    const supId = await driver.findElement(By.css('input[type="text"]'));
    await supId.sendKeys('SUP-E2E');

    const supPass = await driver.findElement(By.css('input[type="password"]'));
    await supPass.sendKeys('Supervisor@123');

    const supSubmit = await driver.findElement(By.css('button[type="submit"]'));
    await supSubmit.click();

    await driver.sleep(2000);

    const url = await driver.getCurrentUrl();
    console.log('URL after Supervisor login:', url);
    const body = await driver.findElement(By.css('body')).getText();
    console.log('Supervisor Dashboard loaded:', body.includes('Field Tasks') || body.includes('Supervisor') || body.includes('Dashboard'));
  } finally {
    await driver.quit();
  }
}

async function main() {
  await testCitizen();
  await testAdmin();
  await testSupervisor();
}

main();
