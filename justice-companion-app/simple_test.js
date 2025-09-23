// Simple JavaScript test to verify the web app loads
const fs = require('fs');
const http = require('http');

async function testApp() {
  console.log('🧪 Testing Justice Companion web app...');
  
  // Test if server responds
  const options = {
    hostname: 'localhost',
    port: 5174,
    path: '/',
    method: 'GET'
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('✅ Server Response Status:', res.statusCode);
        
        // Check if HTML contains the basic app structure
        const hasTitle = data.includes('Justice Companion');
        const hasViteScript = data.includes('@vite/client');
        const hasMainModule = data.includes('src/renderer/main.jsx');
        
        console.log('📄 Response Analysis:');
        console.log('  - Has Justice Companion title:', hasTitle);
        console.log('  - Has Vite development scripts:', hasViteScript);
        console.log('  - Has main module import:', hasMainModule);
        
        if (res.statusCode === 200 && hasTitle) {
          console.log('🎉 SUCCESS: Web server is responding correctly');
          resolve(true);
        } else {
          console.log('❌ FAILED: App not loading properly');
          resolve(false);
        }
      });
    });
    
    req.on('error', (e) => {
      console.error('❌ Request failed:', e.message);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.error('❌ Request timeout');
      resolve(false);
    });
    
    req.end();
  });
}

testApp().then(success => {
  console.log(success ? '✅ Test passed' : '❌ Test failed');
  process.exit(success ? 0 : 1);
});
