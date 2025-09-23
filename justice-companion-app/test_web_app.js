// Simple test to verify Justice Companion loads in browser
const puppeteer = require('puppeteer');

async function testWebApp() {
  console.log('🧪 Testing Justice Companion web app...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Listen for console messages
    page.on('console', msg => console.log('📄 Console:', msg.text()));
    page.on('pageerror', error => console.error('❌ Page Error:', error.message));
    
    console.log('🌐 Navigating to http://localhost:5174...');
    await page.goto('http://localhost:5174', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait for the app to initialize
    console.log('⏳ Waiting for app initialization...');
    await page.waitForTimeout(3000);
    
    // Check if we're still on loading screen
    const loadingText = await page.$eval('body', el => el.textContent.includes('Initializing legal assistance system'));
    
    if (loadingText) {
      console.error('❌ FAILED: App is stuck on loading screen');
      return false;
    }
    
    // Check if Justice Companion main interface is visible
    const hasMainInterface = await page.$('.app-container') !== null;
    const hasChat = await page.$('.chat-interface') !== null || await page.$('[class*="chat"]') !== null;
    
    console.log('✅ Results:');
    console.log('  - Main interface loaded:', hasMainInterface);
    console.log('  - Chat interface present:', hasChat);
    console.log('  - Not stuck on loading:', !loadingText);
    
    if (hasMainInterface && !loadingText) {
      console.log('🎉 SUCCESS: Justice Companion web app loads correctly!');
      return true;
    } else {
      console.log('❌ FAILED: App did not load properly');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Run test
testWebApp().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
