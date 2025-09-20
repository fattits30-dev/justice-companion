// Direct screenshot capture from running Electron app
const { BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

async function captureScreenshot() {
  const windows = BrowserWindow.getAllWindows();

  if (windows.length === 0) {
    console.log('❌ No window found');
    return;
  }

  const window = windows[0];
  console.log('📸 Capturing screenshot from Justice Companion...');

  try {
    // Capture the full window
    const image = await window.capturePage();
    const timestamp = Date.now();
    const screenshotPath = path.join(__dirname, 'screenshots', `justice-companion-${timestamp}.png`);

    // Save the screenshot
    fs.writeFileSync(screenshotPath, image.toPNG());

    console.log(`✅ Screenshot saved: ${screenshotPath}`);
    console.log(`📏 Size: ${image.getSize().width}x${image.getSize().height}`);

    // Also save a smaller preview
    const previewPath = path.join(__dirname, 'screenshots', 'latest-preview.png');
    fs.writeFileSync(previewPath, image.toPNG());

    // Get some UI state info
    const uiState = await window.webContents.executeJavaScript(`
      ({
        title: document.title,
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        hasLightTheme: getComputedStyle(document.body).backgroundColor.includes('255'),
        hasChatInput: document.querySelector('.chat-input, textarea') !== null,
        hasSendButton: document.querySelector('.send-button') !== null,
        messageCount: document.querySelectorAll('.message').length,
        currentText: document.querySelector('.chat-input, textarea')?.value || '',
        hasLegalIcon: document.body.textContent.includes('⚖️')
      })
    `);

    console.log('\n📊 UI State:');
    console.log(`  Title: ${uiState.title}`);
    console.log(`  Background: ${uiState.backgroundColor}`);
    console.log(`  Light Theme: ${uiState.hasLightTheme ? '✅' : '❌'}`);
    console.log(`  Chat Input: ${uiState.hasChatInput ? '✅' : '❌'}`);
    console.log(`  Send Button: ${uiState.hasSendButton ? '✅' : '❌'}`);
    console.log(`  Messages: ${uiState.messageCount}`);
    console.log(`  Legal Icon: ${uiState.hasLegalIcon ? '✅' : '❌'}`);

    return screenshotPath;
  } catch (error) {
    console.error('❌ Screenshot failed:', error);
  }
}

// Execute immediately
captureScreenshot();

module.exports = captureScreenshot;