// Live Bridge - Real-time interaction and monitoring for Justice Companion
const { ipcMain, BrowserWindow } = require('electron');
const fs = require('fs').promises;
const path = require('path');

class LiveBridge {
  constructor(mainWindow) {
    this.window = mainWindow;
    this.isMonitoring = false;
    this.setupHandlers();
  }

  setupHandlers() {
    // Handler to get current UI state
    ipcMain.handle('get-ui-state', async () => {
      try {
        const state = await this.window.webContents.executeJavaScript(`
          ({
            // Visual state
            theme: {
              background: getComputedStyle(document.body).backgroundColor,
              accentColor: getComputedStyle(document.documentElement).getPropertyValue('--accent-green'),
              isLight: getComputedStyle(document.body).backgroundColor.includes('255')
            },

            // UI elements
            elements: {
              chatInput: document.querySelector('.chat-input, textarea')?.value || '',
              messageCount: document.querySelectorAll('.message').length,
              sidebarOpen: document.querySelector('.sidebar')?.classList.contains('open'),
              currentView: document.querySelector('.sidebar-item.active')?.textContent || 'unknown'
            },

            // Content
            lastMessage: (() => {
              const messages = document.querySelectorAll('.message');
              const last = messages[messages.length - 1];
              return last ? {
                type: last.className,
                content: last.textContent.substring(0, 200)
              } : null;
            })(),

            // Metrics
            metrics: {
              domElements: document.querySelectorAll('*').length,
              memory: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0
            }
          })
        `);
        return state;
      } catch (error) {
        return { error: error.message };
      }
    });

    // Handler to simulate user input
    ipcMain.handle('simulate-input', async (event, { selector, value, action }) => {
      try {
        let result;

        switch (action) {
          case 'type':
            result = await this.window.webContents.executeJavaScript(`
              const element = document.querySelector('${selector}');
              if (element) {
                element.value = '${value}';
                element.dispatchEvent(new Event('input', { bubbles: true }));
                'Typed: ${value}';
              } else {
                'Element not found: ${selector}';
              }
            `);
            break;

          case 'click':
            result = await this.window.webContents.executeJavaScript(`
              const element = document.querySelector('${selector}');
              if (element && !element.disabled) {
                element.click();
                'Clicked: ${selector}';
              } else {
                'Cannot click: ${selector}';
              }
            `);
            break;

          case 'focus':
            result = await this.window.webContents.executeJavaScript(`
              const element = document.querySelector('${selector}');
              if (element) {
                element.focus();
                'Focused: ${selector}';
              } else {
                'Cannot focus: ${selector}';
              }
            `);
            break;
        }

        return { success: true, result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Handler to capture screenshot
    ipcMain.handle('capture-screenshot', async () => {
      try {
        const image = await this.window.capturePage();
        const timestamp = Date.now();
        const screenshotPath = path.join(__dirname, '..', '..', 'screenshots', `live-${timestamp}.png`);

        await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
        await fs.writeFile(screenshotPath, image.toPNG());

        // Also return base64 for immediate viewing
        const base64 = image.toPNG().toString('base64');

        return {
          success: true,
          path: screenshotPath,
          timestamp,
          base64: `data:image/png;base64,${base64.substring(0, 100)}...` // Truncated for display
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Handler to run comprehensive UI test
    ipcMain.handle('run-live-test', async () => {
      const results = [];

      // Test 1: Check theme
      const themeTest = await this.window.webContents.executeJavaScript(`
        const bg = getComputedStyle(document.body).backgroundColor;
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-green');
        ({
          test: 'Theme Check',
          lightTheme: bg.includes('255') || bg.includes('247'),
          accentColor: accent,
          pass: (bg.includes('255') || bg.includes('247')) && accent.includes('10a37f')
        })
      `);
      results.push(themeTest);

      // Test 2: Check UI elements
      const elementsTest = await this.window.webContents.executeJavaScript(`
        ({
          test: 'UI Elements',
          chatInput: document.querySelector('.chat-input, textarea') !== null,
          sendButton: document.querySelector('.send-button') !== null,
          sidebar: document.querySelector('.sidebar') !== null,
          messages: document.querySelector('.messages-container') !== null,
          pass: document.querySelector('.chat-input') && document.querySelector('.send-button')
        })
      `);
      results.push(elementsTest);

      // Test 3: Check professional tone
      const toneTest = await this.window.webContents.executeJavaScript(`
        const text = document.body.textContent.toLowerCase();
        ({
          test: 'Professional Tone',
          noAggressive: !text.includes('battle') && !text.includes('fight'),
          hasLegal: text.includes('legal'),
          hasIcon: document.body.textContent.includes('⚖️'),
          pass: !text.includes('battle') && text.includes('legal')
        })
      `);
      results.push(toneTest);

      // Test 4: Send a test message
      const messageTest = await this.window.webContents.executeJavaScript(`
        const input = document.querySelector('.chat-input, textarea');
        const button = document.querySelector('.send-button');
        let result = { test: 'Message Send' };

        if (input && button) {
          input.value = 'Testing automated message from LiveBridge';
          input.dispatchEvent(new Event('input', { bubbles: true }));

          setTimeout(() => {
            if (!button.disabled) {
              button.click();
              result.sent = true;
            }
          }, 100);

          result.pass = true;
        } else {
          result.pass = false;
        }

        result
      `);
      results.push(messageTest);

      return {
        timestamp: new Date().toISOString(),
        results,
        summary: {
          total: results.length,
          passed: results.filter(r => r.pass).length,
          failed: results.filter(r => !r.pass).length
        }
      };
    });

    // Handler for continuous monitoring
    ipcMain.handle('start-monitoring', async () => {
      this.isMonitoring = true;
      const monitoringData = [];

      const monitor = setInterval(async () => {
        if (!this.isMonitoring) {
          clearInterval(monitor);
          return;
        }

        const state = await this.window.webContents.executeJavaScript(`
          ({
            timestamp: new Date().toISOString(),
            messageCount: document.querySelectorAll('.message').length,
            inputValue: document.querySelector('.chat-input, textarea')?.value || '',
            activeView: document.querySelector('.sidebar-item.active')?.textContent || '',
            memory: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0
          })
        `);

        monitoringData.push(state);
        console.log('📊 Monitor:', state);

        // Keep last 100 data points
        if (monitoringData.length > 100) {
          monitoringData.shift();
        }
      }, 1000);

      return { started: true, message: 'Monitoring started' };
    });

    ipcMain.handle('stop-monitoring', () => {
      this.isMonitoring = false;
      return { stopped: true };
    });
  }
}

module.exports = LiveBridge;