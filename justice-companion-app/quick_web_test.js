// Quick test to verify Justice Companion web fixes
// Run this in browser console at localhost:5173

const testWebApp = async () => {
  console.log('🧪 Testing Justice Companion Web App...');

  // Test 1: Check if WebAPIBridge loaded
  console.log('Test 1: WebAPIBridge availability');
  if (window.justiceAPI) {
    console.log('✅ window.justiceAPI is available');
    console.log('API methods:', Object.keys(window.justiceAPI));
  } else {
    console.log('❌ window.justiceAPI not found');
    return;
  }

  // Test 2: Check Web utilities
  console.log('\nTest 2: Web utilities');
  if (window.justiceCompanionWeb) {
    console.log('✅ Web utilities available');
    console.log('Utilities:', Object.keys(window.justiceCompanionWeb));
  } else {
    console.log('❌ Web utilities not found');
  }

  // Test 3: Test case storage
  console.log('\nTest 3: Case storage');
  try {
    const casesResult = await window.justiceAPI.getCases();
    console.log('✅ getCases works:', casesResult);
  } catch (error) {
    console.log('❌ getCases failed:', error);
  }

  // Test 4: Test AI health
  console.log('\nTest 4: AI service');
  try {
    const aiHealth = await window.justiceAPI.aiHealth();
    console.log('✅ AI health check:', aiHealth);
  } catch (error) {
    console.log('❌ AI health check failed:', error);
  }

  // Test 5: Test AI chat with fallback
  console.log('\nTest 5: AI chat');
  try {
    const response = await window.justiceAPI.aiChat('Hello, I need help with landlord issues');
    console.log('✅ AI chat response received (', response.length, 'characters)');
    console.log('Response preview:', response.substring(0, 100) + '...');
  } catch (error) {
    console.log('❌ AI chat failed:', error);
  }

  console.log('\n🎯 Test complete! Check above for any ❌ errors.');
};

// Auto-run test after page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(testWebApp, 2000);
  });
} else {
  setTimeout(testWebApp, 2000);
}

// Also expose for manual testing
window.testJusticeCompanion = testWebApp;

console.log('🧪 Justice Companion web test loaded. Will auto-run in 2 seconds, or call window.testJusticeCompanion() manually.');