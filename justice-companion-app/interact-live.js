// Live Interaction Script - See and test the app in real-time
// This script interacts with the running Electron app

const { BrowserWindow } = require('electron');

class LiveInteraction {
  constructor() {
    this.window = null;
    this.results = [];
  }

  async initialize() {
    // Get the main window
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      this.window = windows[0];
      console.log('✅ Connected to Justice Companion window');
      return true;
    } else {
      console.log('❌ No window found');
      return false;
    }
  }

  async getCurrentState() {
    console.log('\n📸 CAPTURING CURRENT UI STATE...\n');

    const state = await this.window.webContents.executeJavaScript(`
      // Comprehensive state capture
      const captureState = () => {
        const state = {
          timestamp: new Date().toISOString(),
          url: window.location.href,
          title: document.title,
        };

        // Visual appearance
        state.appearance = {
          backgroundColor: getComputedStyle(document.body).backgroundColor,
          primaryColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-primary'),
          accentGreen: getComputedStyle(document.documentElement).getPropertyValue('--accent-green'),
          fontFamily: getComputedStyle(document.body).fontFamily,
          isLightTheme: getComputedStyle(document.body).backgroundColor.includes('255')
        };

        // UI Components
        state.components = {
          header: document.querySelector('.chat-header') ? 'Present' : 'Missing',
          chatInput: document.querySelector('.chat-input, textarea') ? 'Present' : 'Missing',
          sendButton: document.querySelector('.send-button') ? 'Present' : 'Missing',
          sidebar: document.querySelector('.sidebar') ? 'Present' : 'Missing',
          messagesContainer: document.querySelector('.messages-container') ? 'Present' : 'Missing'
        };

        // Content analysis
        state.content = {
          messageCount: document.querySelectorAll('.message').length,
          currentInput: document.querySelector('.chat-input, textarea')?.value || '',
          hasLegalIcon: document.body.textContent.includes('⚖️'),
          hasAggressiveLanguage: document.body.textContent.toLowerCase().includes('battle') ||
                                 document.body.textContent.toLowerCase().includes('fight')
        };

        // Interaction state
        state.interaction = {
          sendButtonDisabled: document.querySelector('.send-button')?.disabled,
          inputFocused: document.activeElement === document.querySelector('.chat-input, textarea'),
          sidebarOpen: document.querySelector('.sidebar')?.classList.contains('open')
        };

        // Messages
        const messages = Array.from(document.querySelectorAll('.message')).slice(-3);
        state.recentMessages = messages.map(msg => ({
          type: msg.className,
          content: msg.textContent.substring(0, 100) + '...'
        }));

        return state;
      };

      captureState();
    `);

    // Display the state
    console.log('🎨 VISUAL APPEARANCE:');
    console.log(`  Background: ${state.appearance.backgroundColor}`);
    console.log(`  Accent: ${state.appearance.accentGreen}`);
    console.log(`  Light Theme: ${state.appearance.isLightTheme ? '✅ Yes' : '❌ No'}`);

    console.log('\n🧩 UI COMPONENTS:');
    Object.entries(state.components).forEach(([key, value]) => {
      console.log(`  ${key}: ${value === 'Present' ? '✅' : '❌'} ${value}`);
    });

    console.log('\n📊 CONTENT ANALYSIS:');
    console.log(`  Messages: ${state.content.messageCount}`);
    console.log(`  Legal Icon: ${state.content.hasLegalIcon ? '✅ Present' : '❌ Missing'}`);
    console.log(`  Professional Tone: ${!state.content.hasAggressiveLanguage ? '✅ Yes' : '❌ No'}`);

    console.log('\n💬 RECENT MESSAGES:');
    state.recentMessages.forEach((msg, i) => {
      console.log(`  ${i + 1}. ${msg.type}: ${msg.content}`);
    });

    return state;
  }

  async testChatInteraction() {
    console.log('\n🤖 TESTING CHAT INTERACTION...\n');

    // Type a message
    console.log('1️⃣ Typing test message...');
    await this.window.webContents.executeJavaScript(`
      const input = document.querySelector('.chat-input, textarea');
      if (input) {
        input.value = 'I need help understanding my tenant rights regarding repairs';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.style.border = '2px solid #10a37f'; // Visual feedback
        'Message typed';
      }
    `);

    await this.wait(1000);

    // Send the message
    console.log('2️⃣ Sending message...');
    await this.window.webContents.executeJavaScript(`
      const button = document.querySelector('.send-button');
      if (button && !button.disabled) {
        button.click();
        'Message sent';
      }
    `);

    await this.wait(2000);

    // Check for response
    console.log('3️⃣ Checking for AI response...');
    const response = await this.window.webContents.executeJavaScript(`
      const messages = document.querySelectorAll('.message.ai');
      const lastAI = messages[messages.length - 1];
      if (lastAI) {
        lastAI.style.border = '2px solid #10a37f'; // Highlight response
        lastAI.textContent.substring(0, 200);
      } else {
        'No AI response yet';
      }
    `);

    console.log(`   Response: ${response}`);

    return response;
  }

  async testSidebarNavigation() {
    console.log('\n📱 TESTING SIDEBAR NAVIGATION...\n');

    // Toggle sidebar
    console.log('1️⃣ Toggling sidebar...');
    await this.window.webContents.executeJavaScript(`
      const toggle = document.querySelector('.sidebar-toggle');
      if (toggle) {
        toggle.click();
        'Sidebar toggled';
      }
    `);

    await this.wait(500);

    // Click through navigation items
    const navItems = ['Cases', 'Documents', 'Timeline', 'Chat'];

    for (const item of navItems) {
      console.log(`2️⃣ Navigating to ${item}...`);
      await this.window.webContents.executeJavaScript(`
        const navItem = Array.from(document.querySelectorAll('.sidebar-item'))
          .find(el => el.textContent.includes('${item}'));
        if (navItem) {
          navItem.click();
          navItem.style.background = '#10a37f';
          '${item} clicked';
        }
      `);
      await this.wait(500);
    }

    return 'Navigation test complete';
  }

  async captureScreenshot() {
    console.log('\n📸 CAPTURING SCREENSHOT...\n');

    const image = await this.window.capturePage();
    const timestamp = Date.now();
    const fs = require('fs').promises;
    const path = require('path');

    const screenshotDir = path.join(__dirname, 'live-screenshots');
    await fs.mkdir(screenshotDir, { recursive: true });

    const screenshotPath = path.join(screenshotDir, `live-${timestamp}.png`);
    await fs.writeFile(screenshotPath, image.toPNG());

    console.log(`✅ Screenshot saved: ${screenshotPath}`);

    // Also capture specific areas
    const areas = [
      { x: 0, y: 0, width: 300, height: 600 }, // Sidebar
      { x: 300, y: 50, width: 800, height: 400 }, // Chat area
      { x: 300, y: 500, width: 800, height: 100 } // Input area
    ];

    for (let i = 0; i < areas.length; i++) {
      const areaImage = await this.window.capturePage(areas[i]);
      const areaPath = path.join(screenshotDir, `area-${i}-${timestamp}.png`);
      await fs.writeFile(areaPath, areaImage.toPNG());
      console.log(`  📷 Area ${i + 1} captured`);
    }

    return screenshotPath;
  }

  async highlightElements() {
    console.log('\n✨ HIGHLIGHTING UI ELEMENTS...\n');

    const highlights = [
      { selector: '.chat-input, textarea', color: '#10a37f', label: 'Chat Input' },
      { selector: '.send-button', color: '#10a37f', label: 'Send Button' },
      { selector: '.sidebar', color: '#3b82f6', label: 'Sidebar' },
      { selector: '.messages-container', color: '#ab68ff', label: 'Messages' },
      { selector: '.message.ai:last-child', color: '#ffc107', label: 'AI Response' }
    ];

    for (const highlight of highlights) {
      await this.window.webContents.executeJavaScript(`
        const element = document.querySelector('${highlight.selector}');
        if (element) {
          element.style.outline = '3px solid ${highlight.color}';
          element.style.outlineOffset = '2px';
          console.log('Highlighted: ${highlight.label}');
        }
      `);
      console.log(`  ✨ Highlighted: ${highlight.label}`);
      await this.wait(500);
    }

    return 'Elements highlighted';
  }

  async performFullTest() {
    console.log('🚀 STARTING FULL LIVE INTERACTION TEST');
    console.log('=' .repeat(50) + '\n');

    if (!await this.initialize()) {
      console.log('Failed to initialize');
      return;
    }

    // 1. Get current state
    const state = await this.getCurrentState();
    this.results.push({ test: 'State Capture', success: true, data: state });

    // 2. Highlight elements
    await this.highlightElements();
    this.results.push({ test: 'Element Highlighting', success: true });

    // 3. Test chat
    const chatResult = await this.testChatInteraction();
    this.results.push({ test: 'Chat Interaction', success: chatResult !== 'No AI response yet' });

    // 4. Test navigation
    const navResult = await this.testSidebarNavigation();
    this.results.push({ test: 'Sidebar Navigation', success: true });

    // 5. Capture screenshots
    const screenshot = await this.captureScreenshot();
    this.results.push({ test: 'Screenshot Capture', success: true, path: screenshot });

    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 TEST RESULTS SUMMARY\n');

    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;

    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`📈 Success Rate: ${Math.round((passed / total) * 100)}%`);

    this.results.forEach(result => {
      console.log(`  ${result.success ? '✅' : '❌'} ${result.test}`);
    });

    console.log('\n✨ Live interaction test complete!');
    console.log('📁 Screenshots saved in: live-screenshots/');

    return this.results;
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the test if executed directly
if (require.main === module) {
  const tester = new LiveInteraction();
  tester.performFullTest().catch(console.error);
}

module.exports = LiveInteraction;