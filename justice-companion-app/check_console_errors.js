const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  const warnings = [];
  
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    
    if (type === 'error') {
      errors.push(text);
    } else if (type === 'warning') {
      warnings.push(text);
    }
  });
  
  page.on('pageerror', err => {
    errors.push(`Page Error: ${err.message}`);
  });
  
  await page.goto('http://localhost:5180');
  
  // Wait for app to load
  await page.waitForTimeout(5000);
  
  console.log('=== CONSOLE ERROR REPORT ===');
  console.log(`Errors found: ${errors.length}`);
  console.log(`Warnings found: ${warnings.length}`);
  
  if (errors.length > 0) {
    console.log('\nERRORS:');
    errors.forEach((error, i) => {
      console.log(`${i + 1}. ${error}`);
    });
  }
  
  if (warnings.length > 0) {
    console.log('\nWARNINGS:');
    warnings.forEach((warning, i) => {
      console.log(`${i + 1}. ${warning}`);
    });
  }
  
  if (errors.length === 0) {
    console.log('\n✅ NO JAVASCRIPT ERRORS DETECTED!');
  }
  
  await browser.close();
})().catch(console.error);
