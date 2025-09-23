/**
 * Chat API Client for Renderer Process
 * Provides clean interface to ChatService via IPC
 * Handles all communication with main process ChatServiceBridge
 */

class ChatAPI {
  constructor() {
    this.sessionId = null;
    this.conversationId = null;
    this.isInitialized = false;

    // Check if we're in Electron environment
    this.ipcRenderer = window.electronAPI || null;
  }

  /**
   * Initialize chat session
   */
  async initialize() {
    if (this.isInitialized) return true;

    try {
      if (!this.ipcRenderer) {
        console.warn('Running in web mode - using mock API');
        return this.initializeMockMode();
      }

      // Create new session
      const result = await this.ipcRenderer.invoke('chat:createSession');

      if (result.success) {
        this.sessionId = result.sessionId;
        this.isInitialized = true;
        return true;
      }

      throw new Error(result.error || 'Failed to create session');

    } catch (error) {
      console.error('Failed to initialize ChatAPI:', error);
      return false;
    }
  }

  /**
   * Initialize mock mode for web testing
   */
  initializeMockMode() {
    this.sessionId = 'mock-session-' + Date.now();
    this.isInitialized = true;
    this.mockMode = true;
    console.log('ChatAPI initialized in mock mode');
    return true;
  }

  /**
   * Send message to chat service
   */
  async sendMessage(message, context = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Mock mode for web testing
      if (this.mockMode) {
        return this.mockSendMessage(message, context);
      }

      // Real IPC call
      const result = await this.ipcRenderer.invoke('chat:sendMessage', message, {
        ...context,
        sessionId: this.sessionId,
        conversationId: this.conversationId
      });

      return result;

    } catch (error) {
      console.error('Error sending message:', error);
      return {
        success: false,
        error: 'Failed to send message'
      };
    }
  }

  /**
   * Mock message sending for web mode
   */
  async mockSendMessage(message, context) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Detect category from message
    const category = this.detectCategory(message);

    // Generate mock response
    const mockResponses = {
      housing: {
        content: `I understand you're asking about housing issues. Based on your message: "${message.substring(0, 50)}..."

Here's some general information about tenant rights:

**Your Rights:**
- You have the right to live in a property that's safe and in good repair
- Your landlord must provide you with proper notice before eviction (usually 2 months)
- Your deposit should be protected in a government-approved scheme

**Suggested Actions:**
1. Document all issues with photos and dates
2. Keep copies of all communication with your landlord
3. Check if your deposit was properly protected

**Resources:**
- Shelter: 0808 800 4444
- Citizens Advice: Local branch finder available online

**Disclaimer:** This is general information only. For specific legal advice, please consult a qualified solicitor.`,
        confidence: 0.7
      },
      employment: {
        content: `I see you have an employment-related question. Regarding: "${message.substring(0, 50)}..."

**Key Employment Rights:**
- Protection from unfair dismissal (after 2 years service)
- Right to receive written terms of employment
- Protection from discrimination

**Important Time Limits:**
- Employment tribunal claims: Usually 3 months less 1 day from the incident
- ACAS early conciliation must be attempted first

**Next Steps:**
1. Review your employment contract
2. Document all relevant incidents
3. Contact ACAS for free conciliation

**Resources:**
- ACAS Helpline: 0300 123 1100
- Employment Tribunals: gov.uk/employment-tribunals

**Note:** This is general information. Please seek specific legal advice for your situation.`,
        confidence: 0.7
      },
      default: {
        content: `Thank you for your question. I understand you need legal information about: "${message.substring(0, 50)}..."

While I cannot provide specific legal advice, here's some general guidance:

**Initial Steps:**
1. Document everything related to your situation
2. Gather all relevant paperwork and evidence
3. Note important dates and deadlines
4. Consider what outcome you're seeking

**Getting Help:**
- **Citizens Advice**: Free, impartial advice on various issues
- **Legal Aid**: Check if you qualify for free legal assistance
- **Solicitors**: Many offer free initial consultations

**Time Limits:**
Many legal matters have strict time limits for taking action. If you're unsure about deadlines, seek advice promptly.

**Disclaimer:** This is general legal information only. For advice specific to your situation, please consult a qualified legal professional.

Would you like more specific information about any particular aspect of your situation?`,
        confidence: 0.5
      }
    };

    const response = mockResponses[category] || mockResponses.default;

    return {
      success: true,
      response: {
        ...response,
        suggestions: [
          'Document all relevant information',
          'Check applicable time limits',
          'Seek professional legal advice if needed'
        ],
        resources: [
          { name: 'Citizens Advice', url: 'https://citizensadvice.org.uk', type: 'advisory' },
          { name: 'Legal Aid', url: 'https://gov.uk/legal-aid', type: 'government' }
        ],
        category: category,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: 'mock',
          mode: 'web-testing'
        }
      },
      analysis: {
        category: category,
        urgency: this.detectUrgency(message),
        confidence: 0.6
      }
    };
  }

  /**
   * Detect legal category from message
   */
  detectCategory(message) {
    const lowercaseMessage = message.toLowerCase();

    const categories = {
      housing: ['landlord', 'tenant', 'eviction', 'deposit', 'rent', 'lease', 'property', 'repair'],
      employment: ['employer', 'job', 'work', 'dismissal', 'fired', 'redundancy', 'wages', 'salary'],
      consumer: ['refund', 'faulty', 'product', 'service', 'warranty', 'complaint', 'shop', 'bought'],
      council: ['council', 'parking', 'planning', 'tax', 'fine', 'penalty'],
      insurance: ['insurance', 'claim', 'policy', 'coverage', 'premium'],
      debt: ['debt', 'loan', 'creditor', 'bailiff', 'ccj', 'bankruptcy'],
      benefits: ['benefit', 'universal credit', 'pip', 'esa', 'housing benefit']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowercaseMessage.includes(keyword))) {
        return category;
      }
    }

    return 'general';
  }

  /**
   * Detect urgency from message
   */
  detectUrgency(message) {
    const urgentKeywords = ['urgent', 'emergency', 'immediate', 'today', 'tomorrow', 'court', 'deadline', 'eviction notice', 'final notice'];
    const lowercaseMessage = message.toLowerCase();

    if (urgentKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
      return 'high';
    }

    return 'normal';
  }

  /**
   * Start new conversation
   */
  async startNewConversation() {
    try {
      if (this.mockMode) {
        this.conversationId = 'mock-conversation-' + Date.now();
        return { success: true, conversationId: this.conversationId };
      }

      const result = await this.ipcRenderer.invoke('chat:newConversation');

      if (result.success) {
        this.conversationId = result.conversationId;
      }

      return result;

    } catch (error) {
      console.error('Error starting new conversation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load existing case
   */
  async loadCase(caseId) {
    try {
      if (this.mockMode) {
        return {
          success: false,
          error: 'Case loading not available in web mode'
        };
      }

      return await this.ipcRenderer.invoke('chat:loadCase', caseId);

    } catch (error) {
      console.error('Error loading case:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get conversation history
   */
  async getHistory(limit = 20) {
    try {
      if (this.mockMode) {
        return {
          success: true,
          history: []
        };
      }

      return await this.ipcRenderer.invoke('chat:getHistory', limit);

    } catch (error) {
      console.error('Error getting history:', error);
      return { success: false, history: [] };
    }
  }

  /**
   * Check AI availability
   */
  async checkAIStatus() {
    try {
      if (this.mockMode) {
        return {
          success: true,
          available: false,
          model: 'template-based'
        };
      }

      return await this.ipcRenderer.invoke('chat:checkAI');

    } catch (error) {
      console.error('Error checking AI status:', error);
      return {
        success: false,
        available: false,
        error: error.message
      };
    }
  }

  /**
   * Get legal categories
   */
  async getCategories() {
    try {
      if (this.mockMode) {
        return {
          success: true,
          categories: [
            { value: 'housing', label: 'Housing & Tenancy', icon: '🏠' },
            { value: 'employment', label: 'Employment', icon: '💼' },
            { value: 'consumer', label: 'Consumer Rights', icon: '🛒' },
            { value: 'council', label: 'Council Issues', icon: '🏛️' },
            { value: 'insurance', label: 'Insurance Claims', icon: '📋' },
            { value: 'debt', label: 'Debt & Money', icon: '💰' },
            { value: 'benefits', label: 'Benefits', icon: '📝' },
            { value: 'general', label: 'Other Legal Matter', icon: '⚖️' }
          ]
        };
      }

      return await this.ipcRenderer.invoke('chat:getCategories');

    } catch (error) {
      console.error('Error getting categories:', error);
      return { success: false, categories: [] };
    }
  }

  /**
   * Get suggested questions for category
   */
  async getSuggestedQuestions(category) {
    try {
      if (this.mockMode) {
        const suggestions = {
          housing: [
            "My landlord wants to evict me - what are my rights?",
            "My deposit hasn't been returned - what can I do?",
            "The property needs urgent repairs - who is responsible?"
          ],
          employment: [
            "I've been dismissed unfairly - what are my options?",
            "My employer hasn't paid me - how do I claim?",
            "I'm facing discrimination at work - what should I do?"
          ],
          default: [
            "What are my legal rights in this situation?",
            "What evidence should I gather?",
            "What are the time limits for taking action?"
          ]
        };

        return {
          success: true,
          suggestions: suggestions[category] || suggestions.default
        };
      }

      return await this.ipcRenderer.invoke('chat:getSuggestedQuestions', category);

    } catch (error) {
      console.error('Error getting suggestions:', error);
      return { success: false, suggestions: [] };
    }
  }

  /**
   * Generate document from conversation
   */
  async generateDocument(documentType) {
    try {
      if (this.mockMode) {
        return {
          success: false,
          error: 'Document generation not available in web mode'
        };
      }

      return await this.ipcRenderer.invoke('chat:generateDocument', documentType);

    } catch (error) {
      console.error('Error generating document:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Export conversation
   */
  async exportConversation(format = 'pdf') {
    try {
      if (this.mockMode) {
        return {
          success: false,
          error: 'Export not available in web mode'
        };
      }

      return await this.ipcRenderer.invoke('chat:exportConversation', format);

    } catch (error) {
      console.error('Error exporting conversation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Analyze message urgency
   */
  async analyzeUrgency(message) {
    try {
      if (this.mockMode) {
        return {
          success: true,
          urgency: this.detectUrgency(message),
          category: this.detectCategory(message),
          confidence: 0.6
        };
      }

      return await this.ipcRenderer.invoke('chat:analyzeUrgency', message);

    } catch (error) {
      console.error('Error analyzing urgency:', error);
      return {
        success: false,
        urgency: 'normal'
      };
    }
  }

  /**
   * Clean up session
   */
  async cleanup() {
    try {
      if (this.mockMode) {
        this.sessionId = null;
        this.conversationId = null;
        this.isInitialized = false;
        return { success: true };
      }

      if (this.sessionId) {
        const result = await this.ipcRenderer.invoke('chat:closeSession', this.sessionId);
        this.sessionId = null;
        this.conversationId = null;
        this.isInitialized = false;
        return result;
      }

      return { success: true };

    } catch (error) {
      console.error('Error cleaning up:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
const chatAPI = new ChatAPI();
export default chatAPI;