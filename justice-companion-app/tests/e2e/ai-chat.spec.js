import { test, expect } from '@playwright/test';

test.describe('Justice Companion AI Chat', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Wait for the application to load
    await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 });
  });

  test('should display welcome message', async ({ page }) => {
    await expect(page.locator('text=Welcome to Justice Companion')).toBeVisible();
    await expect(page.locator('text=I\'m here to help you understand')).toBeVisible();
  });

  test('should allow typing in chat input', async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');

    await expect(chatInput).toBeVisible();
    await expect(chatInput).toBeFocused();

    await chatInput.fill('I need help with landlord issues');
    await expect(chatInput).toHaveValue('I need help with landlord issues');
  });

  test('should validate input before submission', async ({ page }) => {
    const sendButton = page.locator('[data-testid="send-button"]');
    const chatInput = page.locator('[data-testid="chat-input"]');

    // Test empty input validation
    await sendButton.click();
    await expect(page.locator('text=Please describe your legal situation')).toBeVisible();

    // Test short input validation
    await chatInput.fill('help');
    await sendButton.click();
    await expect(page.locator('text=Please provide more details')).toBeVisible();
  });

  test('should submit message and receive AI response', async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    // Type a valid legal question
    const testMessage = 'My landlord hasn\'t protected my deposit and it\'s been 6 months. What are my rights?';
    await chatInput.fill(testMessage);

    // Submit the message
    await sendButton.click();

    // Check that user message appears
    await expect(page.locator(`text=${testMessage}`)).toBeVisible();

    // Check that processing indicator appears
    await expect(page.locator('text=Processing')).toBeVisible();

    // Wait for AI response (may take up to 2 minutes for real Ollama)
    await page.waitForSelector('[data-testid="ai-message"]', { timeout: 120000 });

    // Verify AI response contains relevant legal information
    const aiResponse = page.locator('[data-testid="ai-message"]').last();
    await expect(aiResponse).toBeVisible();
    await expect(aiResponse).toContainText('deposit'); // Should mention deposit

    // Check that input is cleared and ready for next message
    await expect(chatInput).toHaveValue('');
    await expect(chatInput).toBeFocused();
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');

    // Test Enter to submit
    await chatInput.fill('Test message for keyboard submission');
    await chatInput.press('Enter');

    await expect(page.locator('text=Test message for keyboard submission')).toBeVisible();

    // Test Shift+Enter for new line
    await chatInput.fill('First line');
    await chatInput.press('Shift+Enter');
    await chatInput.type('Second line');

    await expect(chatInput).toHaveValue('First line\nSecond line');
  });

  test('should extract and highlight facts from user input', async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    // Message with extractable facts
    const messageWithFacts = 'My landlord is demanding £500 deposit for the flat at 123 Main Street since 15/09/2024';
    await chatInput.fill(messageWithFacts);
    await sendButton.click();

    // Should show fact extraction notification
    await expect(page.locator('text=Found')).toBeVisible();
    await expect(page.locator('text=fact(s) to verify')).toBeVisible();
  });

  test('should maintain conversation context', async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    // First message
    await chatInput.fill('I have a problem with my landlord');
    await sendButton.click();

    await page.waitForSelector('[data-testid="ai-message"]', { timeout: 60000 });

    // Second message (should reference previous context)
    await chatInput.fill('Can you tell me more about my deposit rights?');
    await sendButton.click();

    // Wait for second response
    await page.waitForSelector('[data-testid="ai-message"]:nth-child(4)', { timeout: 60000 });

    // Should have multiple messages in conversation
    const allMessages = page.locator('[data-testid="chat-message"]');
    await expect(allMessages).toHaveCount.greaterThan(3); // Welcome + 2 user + 2 AI messages
  });

  test('should handle AI service errors gracefully', async ({ page }) => {
    // Mock network failure or timeout
    await page.route('**/api/**', route => route.abort());

    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    await chatInput.fill('This should trigger an error response');
    await sendButton.click();

    // Should show error message instead of crashing
    await expect(page.locator('text=encountered an issue')).toBeVisible();

    // Should still allow typing new messages
    await expect(chatInput).toBeEnabled();
  });

  test('should display response metadata', async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    await chatInput.fill('What are tenant rights in the UK?');
    await sendButton.click();

    await page.waitForSelector('[data-testid="ai-message"]', { timeout: 120000 });

    // Check for metadata indicators (confidence, response time, etc.)
    await expect(page.locator('[data-testid="response-metadata"]')).toBeVisible();
  });

  test('should be accessible with screen readers', async ({ page }) => {
    // Check ARIA labels and roles
    await expect(page.locator('[aria-label="Describe your legal situation"]')).toBeVisible();
    await expect(page.locator('[role="button"]')).toBeVisible();

    // Check live regions for announcements
    await expect(page.locator('[aria-live]')).toBeVisible();
  });
});