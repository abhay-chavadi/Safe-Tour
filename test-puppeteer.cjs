const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:3000/?view=admin', {waitUntil: 'networkidle2'});
  
  await new Promise(r => setTimeout(r, 6000));
  
  const mapHtml = await page.evaluate(() => {
     const errorDiv = Array.from(document.querySelectorAll('div')).find(div => div.innerText && div.innerText.includes('INITIALIZING'));
     if (errorDiv) return "Spinner still visible";
     
     const errorText = Array.from(document.querySelectorAll('div')).find(div => div.innerText && div.innerText.includes('Initialization timed out'));
     if (errorText) return "Timeout!";
     
     return "Seems OK (no spinner or timeout text)";
  });
  console.log("State:", mapHtml);
  
  await browser.close();
})();
