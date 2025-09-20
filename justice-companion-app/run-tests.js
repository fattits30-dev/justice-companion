// Test runner that injects into the running Electron app
const { BrowserWindow } = require('electron');
const ComprehensiveUITester = require('./test-comprehensive');

async function runTests() {
  console.log('🔍 Searching for Justice Companion window...');

  // Wait a bit for the app to fully load
  await new Promise(resolve => setTimeout(resolve, 3000));

  const windows = BrowserWindow.getAllWindows();

  if (windows.length > 0) {
    console.log('✅ Window found! Starting comprehensive tests...\n');

    const tester = new ComprehensiveUITester();
    tester.window = windows[0];

    try {
      const report = await tester.runAllTests();
      console.log('\n🎯 Test execution successful!');
      return report;
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      throw error;
    }
  } else {
    console.error('❌ No windows found. Make sure the app is running.');
  }
}

// Check if we're in Electron environment
if (process.versions.electron) {
  // If we're in the main process
  if (process.type === 'browser') {
    runTests();
  }
} else {
  console.log('This script must be run within the Electron app environment');
}

module.exports = runTests;