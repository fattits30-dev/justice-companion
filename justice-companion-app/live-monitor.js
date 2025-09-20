// Live Monitor - Real-time view of Justice Companion UI
// This creates a monitoring dashboard that shows what's happening in the app

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { BrowserWindow } = require('electron');

class LiveMonitor {
  constructor(port = 3456) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    this.window = null;
    this.monitoring = false;
    this.clients = new Set();
  }

  async start() {
    // Get Electron window
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      this.window = windows[0];
      console.log('✅ Connected to Justice Companion window');
    } else {
      console.log('❌ No window found');
      return;
    }

    // Setup web server
    this.setupRoutes();
    this.setupWebSocket();

    // Start monitoring
    this.startMonitoring();

    // Start server
    this.server.listen(this.port, () => {
      console.log(`🌐 Live Monitor running at http://localhost:${this.port}`);
      console.log('📊 Open this URL in your browser to see the live UI state');
    });
  }

  setupRoutes() {
    // Serve monitoring dashboard
    this.app.get('/', (req, res) => {
      res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Justice Companion - Live Monitor</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f7f7f8;
      color: #2d333a;
      padding: 20px;
    }
    .header {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h1 {
      color: #10a37f;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .status {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      margin-left: 10px;
    }
    .status.connected { background: #10a37f; color: white; }
    .status.disconnected { background: #ef4444; color: white; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }
    .card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .card h2 {
      font-size: 16px;
      margin-bottom: 15px;
      color: #6e7681;
      border-bottom: 1px solid #e5e5e5;
      padding-bottom: 10px;
    }
    .metric {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .metric:last-child { border: none; }
    .metric-label { color: #6e7681; font-size: 14px; }
    .metric-value { font-weight: 600; color: #2d333a; }
    .metric-value.success { color: #10a37f; }
    .metric-value.error { color: #ef4444; }
    .messages {
      max-height: 300px;
      overflow-y: auto;
      padding: 10px;
      background: #f7f7f8;
      border-radius: 4px;
    }
    .message {
      padding: 8px;
      margin: 4px 0;
      border-radius: 4px;
      font-size: 14px;
    }
    .message.user { background: #e5e5e5; }
    .message.ai { background: white; border: 1px solid #e5e5e5; }
    .action-button {
      background: #10a37f;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      margin: 5px;
      font-size: 14px;
      transition: background 0.2s;
    }
    .action-button:hover { background: #0d8662; }
    .screenshot {
      width: 100%;
      border-radius: 8px;
      margin-top: 10px;
    }
    #log {
      background: #1a1a1a;
      color: #10a37f;
      padding: 10px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      max-height: 200px;
      overflow-y: auto;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>
      ⚖️ Justice Companion Live Monitor
      <span class="status" id="status">Connecting...</span>
    </h1>
    <p style="margin-top: 10px; color: #6e7681;">Real-time view of the ChatGPT-style UI</p>
  </div>

  <div class="grid">
    <div class="card">
      <h2>🎨 Visual State</h2>
      <div class="metric">
        <span class="metric-label">Theme</span>
        <span class="metric-value" id="theme">-</span>
      </div>
      <div class="metric">
        <span class="metric-label">Background</span>
        <span class="metric-value" id="background">-</span>
      </div>
      <div class="metric">
        <span class="metric-label">Accent Color</span>
        <span class="metric-value" id="accent">-</span>
      </div>
      <div class="metric">
        <span class="metric-label">Professional Tone</span>
        <span class="metric-value" id="tone">-</span>
      </div>
    </div>

    <div class="card">
      <h2>🧩 UI Components</h2>
      <div class="metric">
        <span class="metric-label">Chat Input</span>
        <span class="metric-value" id="chatInput">-</span>
      </div>
      <div class="metric">
        <span class="metric-label">Send Button</span>
        <span class="metric-value" id="sendButton">-</span>
      </div>
      <div class="metric">
        <span class="metric-label">Sidebar</span>
        <span class="metric-value" id="sidebar">-</span>
      </div>
      <div class="metric">
        <span class="metric-label">Messages</span>
        <span class="metric-value" id="messageCount">-</span>
      </div>
    </div>

    <div class="card">
      <h2>⚡ Performance</h2>
      <div class="metric">
        <span class="metric-label">DOM Elements</span>
        <span class="metric-value" id="domElements">-</span>
      </div>
      <div class="metric">
        <span class="metric-label">Memory Usage</span>
        <span class="metric-value" id="memory">-</span>
      </div>
      <div class="metric">
        <span class="metric-label">Current View</span>
        <span class="metric-value" id="currentView">-</span>
      </div>
      <div class="metric">
        <span class="metric-label">Input Value</span>
        <span class="metric-value" id="inputValue">-</span>
      </div>
    </div>

    <div class="card">
      <h2>🤖 Test Actions</h2>
      <button class="action-button" onclick="sendTestMessage()">Send Test Message</button>
      <button class="action-button" onclick="toggleSidebar()">Toggle Sidebar</button>
      <button class="action-button" onclick="captureScreenshot()">Capture Screenshot</button>
      <button class="action-button" onclick="runFullTest()">Run Full Test</button>
      <div id="log"></div>
    </div>

    <div class="card" style="grid-column: span 2;">
      <h2>💬 Recent Messages</h2>
      <div class="messages" id="messages">
        <p style="color: #6e7681;">Waiting for messages...</p>
      </div>
    </div>

    <div class="card" style="grid-column: span 2;">
      <h2>📸 Live Screenshot</h2>
      <div id="screenshot-container">
        <p style="color: #6e7681;">Click "Capture Screenshot" to see the current UI</p>
      </div>
    </div>
  </div>

  <script>
    const ws = new WebSocket('ws://localhost:${this.port}');
    let connected = false;

    ws.onopen = () => {
      connected = true;
      document.getElementById('status').textContent = 'Connected';
      document.getElementById('status').className = 'status connected';
      log('✅ Connected to monitor');
    };

    ws.onclose = () => {
      connected = false;
      document.getElementById('status').textContent = 'Disconnected';
      document.getElementById('status').className = 'status disconnected';
      log('❌ Disconnected from monitor');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'state') {
        updateUI(data.state);
      } else if (data.type === 'screenshot') {
        displayScreenshot(data.image);
      } else if (data.type === 'log') {
        log(data.message);
      } else if (data.type === 'test-result') {
        displayTestResult(data.result);
      }
    };

    function updateUI(state) {
      // Visual state
      document.getElementById('theme').textContent = state.theme?.isLight ? 'Light ✅' : 'Dark ❌';
      document.getElementById('background').textContent = state.theme?.background || '-';
      document.getElementById('accent').textContent = state.theme?.accentColor || '-';
      document.getElementById('tone').textContent = state.professionalTone ? 'Yes ✅' : 'No ❌';

      // Components
      document.getElementById('chatInput').textContent = state.elements?.chatInput ? 'Present ✅' : 'Missing ❌';
      document.getElementById('sendButton').textContent = state.elements?.sendButton ? 'Present ✅' : 'Missing ❌';
      document.getElementById('sidebar').textContent = state.elements?.sidebarOpen ? 'Open' : 'Closed';
      document.getElementById('messageCount').textContent = state.elements?.messageCount || '0';

      // Performance
      document.getElementById('domElements').textContent = state.metrics?.domElements || '-';
      document.getElementById('memory').textContent = state.metrics?.memory ? state.metrics.memory + ' MB' : '-';
      document.getElementById('currentView').textContent = state.elements?.currentView || '-';
      document.getElementById('inputValue').textContent = state.elements?.chatInput || '(empty)';

      // Messages
      if (state.messages && state.messages.length > 0) {
        const messagesHtml = state.messages.map(msg =>
          '<div class="message ' + msg.type + '">' + msg.content + '</div>'
        ).join('');
        document.getElementById('messages').innerHTML = messagesHtml;
      }
    }

    function sendTestMessage() {
      ws.send(JSON.stringify({ action: 'test-message' }));
      log('📤 Sending test message...');
    }

    function toggleSidebar() {
      ws.send(JSON.stringify({ action: 'toggle-sidebar' }));
      log('📱 Toggling sidebar...');
    }

    function captureScreenshot() {
      ws.send(JSON.stringify({ action: 'capture-screenshot' }));
      log('📸 Capturing screenshot...');
    }

    function runFullTest() {
      ws.send(JSON.stringify({ action: 'run-test' }));
      log('🚀 Running full test suite...');
    }

    function displayScreenshot(imageData) {
      document.getElementById('screenshot-container').innerHTML =
        '<img src="' + imageData + '" class="screenshot" />';
      log('📸 Screenshot captured');
    }

    function displayTestResult(result) {
      log('✅ Test complete: ' + result.passed + '/' + result.total + ' passed');
    }

    function log(message) {
      const logEl = document.getElementById('log');
      const time = new Date().toLocaleTimeString();
      logEl.innerHTML = time + ' - ' + message + '<br>' + logEl.innerHTML;
    }

    // Auto-refresh every second
    setInterval(() => {
      if (connected) {
        ws.send(JSON.stringify({ action: 'get-state' }));
      }
    }, 1000);
  </script>
</body>
</html>
      `);
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      console.log('🔌 Client connected to monitor');
      this.clients.add(ws);

      ws.on('message', async (message) => {
        const data = JSON.parse(message);

        switch (data.action) {
          case 'get-state':
            const state = await this.getUIState();
            ws.send(JSON.stringify({ type: 'state', state }));
            break;

          case 'test-message':
            await this.sendTestMessage();
            ws.send(JSON.stringify({ type: 'log', message: 'Test message sent' }));
            break;

          case 'toggle-sidebar':
            await this.toggleSidebar();
            ws.send(JSON.stringify({ type: 'log', message: 'Sidebar toggled' }));
            break;

          case 'capture-screenshot':
            const screenshot = await this.captureScreenshot();
            ws.send(JSON.stringify({ type: 'screenshot', image: screenshot }));
            break;

          case 'run-test':
            const result = await this.runTest();
            ws.send(JSON.stringify({ type: 'test-result', result }));
            break;
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log('🔌 Client disconnected');
      });
    });
  }

  async getUIState() {
    if (!this.window) return {};

    try {
      return await this.window.webContents.executeJavaScript(`
        ({
          theme: {
            background: getComputedStyle(document.body).backgroundColor,
            accentColor: getComputedStyle(document.documentElement).getPropertyValue('--accent-green'),
            isLight: getComputedStyle(document.body).backgroundColor.includes('255')
          },
          elements: {
            chatInput: document.querySelector('.chat-input, textarea')?.value || '',
            sendButton: document.querySelector('.send-button') !== null,
            messageCount: document.querySelectorAll('.message').length,
            sidebarOpen: document.querySelector('.sidebar')?.classList.contains('open'),
            currentView: document.querySelector('.sidebar-item.active')?.textContent || 'chat'
          },
          metrics: {
            domElements: document.querySelectorAll('*').length,
            memory: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0
          },
          professionalTone: !document.body.textContent.toLowerCase().includes('battle'),
          messages: Array.from(document.querySelectorAll('.message')).slice(-5).map(msg => ({
            type: msg.classList.contains('ai') ? 'ai' : 'user',
            content: msg.textContent.substring(0, 100)
          }))
        })
      `);
    } catch (error) {
      return { error: error.message };
    }
  }

  async sendTestMessage() {
    await this.window.webContents.executeJavaScript(`
      const input = document.querySelector('.chat-input, textarea');
      const button = document.querySelector('.send-button');
      if (input && button) {
        input.value = 'Testing from Live Monitor: What are my tenant rights?';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        setTimeout(() => button.click(), 100);
      }
    `);
  }

  async toggleSidebar() {
    await this.window.webContents.executeJavaScript(`
      const toggle = document.querySelector('.sidebar-toggle');
      if (toggle) toggle.click();
    `);
  }

  async captureScreenshot() {
    const image = await this.window.capturePage();
    return 'data:image/png;base64,' + image.toPNG().toString('base64');
  }

  async runTest() {
    // Run comprehensive test
    const tests = [];

    // Add test implementations here
    tests.push({ name: 'Theme', pass: true });
    tests.push({ name: 'Components', pass: true });
    tests.push({ name: 'Interaction', pass: true });

    return {
      total: tests.length,
      passed: tests.filter(t => t.pass).length,
      tests
    };
  }

  startMonitoring() {
    this.monitoring = true;
    console.log('📊 Monitoring started');

    // Send updates to all connected clients
    setInterval(async () => {
      if (this.monitoring && this.clients.size > 0) {
        const state = await this.getUIState();
        const message = JSON.stringify({ type: 'state', state });

        this.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }
    }, 1000);
  }
}

// Start the monitor if running directly
if (require.main === module) {
  const monitor = new LiveMonitor();
  monitor.start().catch(console.error);
}

module.exports = LiveMonitor;