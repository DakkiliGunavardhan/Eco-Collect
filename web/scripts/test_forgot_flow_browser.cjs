const { Builder, By } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

(async () => {
  console.log('==================================================');
  console.log('TESTING FORGOT PASSWORD FRONTEND FLOW (SELENIUM)');
  console.log('==================================================');

  let options = new chrome.Options();
  options.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage');
  options.setLoggingPrefs({ browser: 'ALL' });

  let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

  try {
    // 1. Invalid Email Format Test
    console.log('\n--- SCENARIO 1: Invalid Email Format ---');
    await driver.get('http://localhost:5173/#/citizen/forgot-password');
    await driver.sleep(1000);

    let input = await driver.findElement(By.css('input[type="email"]'));
    await input.clear();
    await input.sendKeys('invalidemail');

    let sendBtn = await driver.findElement(By.css('button[type="submit"]'));
    await sendBtn.click();
    await driver.sleep(500);

    let bodyText1 = await driver.findElement(By.tagName('body')).getText();
    if (bodyText1.includes('Please enter a valid email address.')) {
      console.log('✅ Passed: Invalid email format validation displayed correctly.');
    } else {
      console.log('❌ Failed: Validation message missing for invalid format.');
    }

    // 2. Unregistered Email Test
    console.log('\n--- SCENARIO 2: Unregistered Email Address ---');
    await driver.get('http://localhost:5173/#/citizen/forgot-password');
    await driver.sleep(1000);

    input = await driver.findElement(By.css('input[type="email"]'));
    await input.clear();
    await input.sendKeys('notfound99999@example.com');

    sendBtn = await driver.findElement(By.css('button[type="submit"]'));
    await sendBtn.click();
    await driver.sleep(1500);

    let bodyText2 = await driver.findElement(By.tagName('body')).getText();
    if (bodyText2.includes('not registered') || bodyText2.includes('not found') || bodyText2.includes('Email address not registered')) {
      console.log('✅ Passed: Unregistered email error displayed correctly.');
    } else {
      console.log('❌ Failed: Error message missing for unregistered email.');
    }

    // 3. Registered Email Test -> Successful OTP dispatch & UI transition
    console.log('\n--- SCENARIO 3: Registered Email Address ---');
    await driver.get('http://localhost:5173/#/citizen/forgot-password');
    await driver.sleep(1000);

    input = await driver.findElement(By.css('input[type="email"]'));
    await input.clear();
    await input.sendKeys('testcitizen@example.com');

    sendBtn = await driver.findElement(By.css('button[type="submit"]'));
    await sendBtn.click();
    await driver.sleep(2000);

    let currentUrl3 = await driver.getCurrentUrl();
    let bodyText3 = await driver.findElement(By.tagName('body')).getText();

    if (bodyText3.includes('Verify OTP') || bodyText3.includes('Verification code')) {
      console.log('✅ Passed: UI successfully transitioned to OTP verification screen.');
    } else {
      console.log('❌ Failed: UI did not transition to OTP verification screen.');
    }

    // 4. Verify OTP Code and Navigate to Reset Password
    console.log('\n--- SCENARIO 4: Verify OTP Code & Transition to Reset Password ---');
    let otpInput = await driver.findElement(By.css('input'));
    await otpInput.clear();
    await otpInput.sendKeys('123456');

    let verifyBtn = await driver.findElement(By.css('button[type="submit"]'));
    await verifyBtn.click();
    await driver.sleep(2000);

    let resetUrl = await driver.getCurrentUrl();
    if (resetUrl.includes('reset-password')) {
      console.log('✅ Passed: Successfully verified OTP and navigated to Reset Password page.');
    } else {
      console.log('❌ Failed: Navigation to reset password failed. URL:', resetUrl);
    }

  } catch (err) {
    console.error('Error during test execution:', err);
  } finally {
    await driver.quit();
  }
})();
