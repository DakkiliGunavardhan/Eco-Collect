const { Builder, By } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

async function runTest(roleName, url, user, pass) {
  let options = new chrome.Options();
  options.addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage");
  let driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
  try {
    console.log("=== TESTING " + roleName + " LOGIN ===");
    await driver.get(url);
    await driver.sleep(1000);
    let inputs = await driver.findElements(By.css("input"));
    console.log("Inputs count:", inputs.length);
    if (inputs.length >= 2) {
      await inputs[0].sendKeys(user);
      await inputs[1].sendKeys(pass);
    }
    let btn = await driver.findElement(By.css("button[type=\"submit\"]"));
    console.log("Submitting...");
    await btn.click();
    await driver.sleep(3000);
    console.log("URL after login:", await driver.getCurrentUrl());
    let bodyText = await driver.findElement(By.css("body")).getText();
    console.log("Body snippet:", bodyText.substring(0, 200).replace(/\n/g, " "));
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await driver.quit();
  }
}

(async () => {
  await runTest("CITIZEN", "http://127.0.0.1:5173/#/citizen/login", "testcitizen@example.com", "Password123");
  await runTest("ADMIN", "http://127.0.0.1:5173/#/admin/login", "admin@ecocollect.city", "Admin@123");
  await runTest("SUPERVISOR", "http://127.0.0.1:5173/#/supervisor/login", "SUP-930", "Admin@123");
})();

