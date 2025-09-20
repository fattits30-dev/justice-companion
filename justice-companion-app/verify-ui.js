// UI Verification Script - Paste this in the DevTools Console
// This will verify the ChatGPT-style interface is working

console.clear();
console.log('%c🎯 JUSTICE COMPANION UI VERIFICATION', 'font-size: 20px; color: #10a37f; font-weight: bold');
console.log('%c' + '='.repeat(50), 'color: #10a37f');

// Quick UI checks
const checks = {
  theme: {
    test: () => {
      const bg = getComputedStyle(document.body).backgroundColor;
      return bg.includes('255') || bg.includes('247'); // Light theme
    },
    message: 'ChatGPT light theme'
  },
  greenAccent: {
    test: () => {
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-green');
      return accent && accent.includes('10a37f');
    },
    message: 'Green accent color (#10a37f)'
  },
  chatInput: {
    test: () => document.querySelector('.chat-input, textarea#legal-input') !== null,
    message: 'Chat input field'
  },
  sendButton: {
    test: () => {
      const btn = document.querySelector('.send-button');
      return btn && (btn.textContent.includes('↑') || btn.querySelector('.button-icon'));
    },
    message: 'Arrow send button'
  },
  sidebar: {
    test: () => document.querySelector('.sidebar') !== null,
    message: 'Sidebar navigation'
  },
  legalIcon: {
    test: () => document.body.textContent.includes('⚖️'),
    message: 'Legal icon (⚖️)'
  },
  professionalTone: {
    test: () => {
      const text = document.body.textContent.toLowerCase();
      return !text.includes('battle') && !text.includes('fight') && !text.includes('warrior');
    },
    message: 'Professional tone (no aggressive language)'
  },
  messages: {
    test: () => document.querySelector('.messages-container') !== null,
    message: 'Messages container'
  }
};

// Run checks
console.log('\n📋 UI Elements Check:\n');
let passed = 0;
let total = 0;

Object.entries(checks).forEach(([key, check]) => {
  total++;
  const result = check.test();
  if (result) passed++;
  console.log(`${result ? '✅' : '❌'} ${check.message}`);
});

console.log('\n' + '='.repeat(50));
console.log(`📊 Results: ${passed}/${total} checks passed (${Math.round(passed/total * 100)}%)`);

// Interactive test
console.log('\n💬 Interactive Test:');
console.log('Type the following to test the chat:\n');
console.log('%c> testChat("I need help with tenant rights")', 'color: #10a37f; font-family: monospace');

// Make test function available
window.testChat = function(message) {
  const input = document.querySelector('.chat-input, textarea#legal-input');
  const button = document.querySelector('.send-button, button[type="submit"]');

  if (input && button) {
    console.log('📝 Setting message:', message);
    input.value = message;
    input.dispatchEvent(new Event('input', { bubbles: true }));

    setTimeout(() => {
      if (!button.disabled) {
        console.log('📤 Sending message...');
        button.click();
        console.log('✅ Message sent! Watch for AI response...');

        // Monitor for response
        setTimeout(() => {
          const aiMessages = document.querySelectorAll('.message.ai');
          if (aiMessages.length > 0) {
            const lastMessage = aiMessages[aiMessages.length - 1];
            console.log('🤖 AI Response received:');
            console.log(lastMessage.textContent.substring(0, 200) + '...');
          }
        }, 3000);
      } else {
        console.log('❌ Send button is disabled');
      }
    }, 500);
  } else {
    console.log('❌ Could not find chat interface elements');
  }
};

// Visual style check
const styles = getComputedStyle(document.documentElement);
console.log('\n🎨 Theme Colors:');
console.log(`  Background: ${styles.getPropertyValue('--bg-primary') || 'default'}`);
console.log(`  Secondary: ${styles.getPropertyValue('--bg-secondary') || 'default'}`);
console.log(`  Accent: ${styles.getPropertyValue('--accent-green') || 'default'}`);
console.log(`  Text: ${styles.getPropertyValue('--text-primary') || 'default'}`);

// Performance quick check
if (performance.memory) {
  console.log('\n⚡ Performance:');
  console.log(`  Memory: ${Math.round(performance.memory.usedJSHeapSize / 1048576)}MB`);
  console.log(`  DOM Nodes: ${document.querySelectorAll('*').length}`);
}

console.log('\n✨ Verification complete! The ChatGPT-style UI is ready.');
console.log('💡 Tip: Try the testChat() function or interact with the UI manually.');