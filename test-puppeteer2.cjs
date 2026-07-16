const puppeteer = require('puppeteer');
const path = require('path');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  await page.goto('file://' + path.resolve('test-html2.html'), {waitUntil: 'networkidle2'});
  await new Promise(r => setTimeout(r, 4000));
  const html = await page.evaluate(() => document.getElementById('map').innerHTML.substring(0, 500));
  console.log("HTML:", html);
  await browser.close();
})();
