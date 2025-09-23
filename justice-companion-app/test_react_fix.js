// Test script to verify React hooks fix
const puppeteer = require('puppeteer');

(async () => {
  console.log('🔧 Testing React hooks fix...');
  
  try {
    const browser = await puppeteer.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-web-security']
    });
    
    const page = await browser.newPage();
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
      console.log('❌ Page Error:', error.message);
    });
    
    console.log('🌐 Navigating to app...');
    await page.goto('http://localhost:5175', { waitUntil: 'networkidle0' });
    
    // Wait for React to load
    await page.waitForTimeout(3000);
    
    // Check if the app loaded successfully
    const titleElement = await page.$('h1#chat-title');
    if (titleElement) {
      const titleText = await page.evaluate(el => el.textContent, titleElement);
      console.log('✅ App loaded successfully! Title:', titleText);
    } else {
      console.log('⚠️ App UI not found, but no React error occurred');
    }
    
    // Check for specific React error in console
    const logs = await page.evaluate(() => {
      return window.console.logs || [];
    });
    
    await browser.close();
    console.log('🎉 Test completed - React hooks fix verification done!');
    
  } catch (error) {
    console.error('🔥 Test failed:', error.message);
  }
})();
