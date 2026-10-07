const { Builder, By } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

(async () => {
  let options = new chrome.Options();
  options.addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--window-size=1280,800");

  let driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();

  try {
    console.log("--- SCENARIO A: Citizen Login -> Citizen Dashboard ---");
    await driver.get("http://127.0.0.1:5173/#/citizen/login");
    await driver.executeScript("localStorage.clear();");
    await driver.get("http://127.0.0.1:5173/#/citizen/login");
    await new Promise(r => setTimeout(r, 1000));

    let inputs = await driver.findElements(By.css("input"));
    if (inputs.length >= 2) {
      await inputs[0].sendKeys("testcitizen@example.com");
      await inputs[1].sendKeys("Password123");
      let submitBtn = await driver.findElement(By.css("button[type=\"submit\"]"));
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 3000));
    }
    console.log("URL after Citizen Login:", await driver.getCurrentUrl());

    console.log("\n--- SCENARIO B: Citizen Logout -> Admin Login -> Admin Dashboard ---");
    let buttons = await driver.findElements(By.css("button"));
    let loggedOut = false;
    for (let btn of buttons) {
      let txt = await btn.getText();
      if (txt.includes("Sign Out") || txt.includes("Logout")) {
        console.log("Clicking Sign Out button...");
        await btn.click();
        loggedOut = true;
        await new Promise(r => setTimeout(r, 1000));
        break;
      }
    }
    if (!loggedOut) {
      await driver.executeScript("localStorage.clear();");
    }
    console.log("URL after Logout:", await driver.getCurrentUrl());

    await driver.get("http://127.0.0.1:5173/#/admin/login");
    await new Promise(r => setTimeout(r, 1000));
    console.log("URL at Admin Login:", await driver.getCurrentUrl());

    let adminInputs = await driver.findElements(By.css("input"));
    console.log("Admin inputs found:", adminInputs.length);
    if (adminInputs.length >= 2) {
      await adminInputs[0].sendKeys("admin@ecocollect.city");
      await adminInputs[1].sendKeys("Admin@123");
      let adminSubmit = await driver.findElement(By.css("button[type=\"submit\"]"));
      await adminSubmit.click();
      await new Promise(r => setTimeout(r, 3000));
    }
    console.log("URL after Admin Login:", await driver.getCurrentUrl());

    console.log("\n--- SCENARIO C: Admin Logout -> Supervisor Login -> Supervisor Dashboard ---");
    let adminButtons = await driver.findElements(By.css("button"));
    let adminLoggedOut = false;
    for (let btn of adminButtons) {
      let txt = await btn.getText();
      if (txt.includes("Sign Out") || txt.includes("Logout")) {
        console.log("Clicking Admin Sign Out button...");
        await btn.click();
        adminLoggedOut = true;
        await new Promise(r => setTimeout(r, 1000));
        break;
      }
    }
    if (!adminLoggedOut) {
      await driver.executeScript("localStorage.clear();");
    }
    console.log("URL after Admin Logout:", await driver.getCurrentUrl());

    await driver.get("http://127.0.0.1:5173/#/supervisor/login");
    await new Promise(r => setTimeout(r, 1000));
    console.log("URL at Supervisor Login:", await driver.getCurrentUrl());

    let supInputs = await driver.findElements(By.css("input"));
    console.log("Supervisor inputs found:", supInputs.length);
    if (supInputs.length >= 2) {
      await supInputs[0].sendKeys("SUP-930");
      await supInputs[1].sendKeys("Admin@123");
      let supSubmit = await driver.findElement(By.css("button[type=\"submit\"]"));
      await supSubmit.click();
      await new Promise(r => setTimeout(r, 3000));
    }
    console.log("URL after Supervisor Login:", await driver.getCurrentUrl());

  } catch (err) {
    console.error("Error during test:", err);
  } finally {
    await driver.quit();
  }
})();

