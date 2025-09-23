/**
 * Chat Service Bridge for IPC Communication
 * Exposes ChatService to renderer process via IPC
 * Handles all chat-related IPC communications with proper security
 */

const { ipcMain } = require('electron');
const ChatService = require('../../application/services/ChatService');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

class ChatServiceBridge {
  constructor() {
    this.chatService = null;
    this.logger = null;
    this.activeSessions = new Map();
    this.initialize();
  }

  async initialize() {
    try {
      // Initialize logger
      this.logger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.simple()
            )
          })
        ]
      });

      // Initialize ChatService
      this.chatService = new ChatService();
      await this.chatService.initialize();

      // Setup IPC handlers
      this.setupIPCHandlers();

      this.logger.info('ChatServiceBridge initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize ChatServiceBridge:', error);
      throw error;
    }
  }

  setupIPCHandlers() {
    // Chat message processing
    ipcMain.handle('chat:sendMessage', async (event, message, context) => {
      try {
        this.logger.info('Received chat message via IPC');

        // Validate input
        if (!message || typeof message !== 'string') {
          throw new Error('Invalid message format');
        }

        if (message.length > 5000) {
          throw new Error('Message too long (max 5000 characters)');
        }

        // Process message through ChatService
        const result = await this.chatService.processMessage(message, context || {});

        // Return sanitized result
        return {
          success: result.success,
          response: result.response,
          case: result.case,
          analysis: result.analysis,
          error: result.error
        };

      } catch (error) {
        this.logger.error('Error processing chat message:', error);
        return {
          success: false,
          error: error.message || 'Failed to process message'
        };
      }
    });

    // Start new conversation
    ipcMain.handle('chat:newConversation', async (event) => {
      try {
        this.logger.info('Starting new conversation via IPC');
        const result = await this.chatService.startNewConversation();
        return result;
      } catch (error) {
        this.logger.error('Error starting new conversation:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Load existing case
    ipcMain.handle('chat:loadCase', async (event, caseId) => {
      try {
        this.logger.info('Loading case via IPC', { caseId });

        if (!caseId || typeof caseId !== 'string') {
          throw new Error('Invalid case ID');
        }

        const result = await this.chatService.loadCase(caseId);
        return result;
      } catch (error) {
        this.logger.error('Error loading case:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Get conversation history
    ipcMain.handle('chat:getHistory', async (event, limit) => {
      try {
        this.logger.info('Fetching conversation history via IPC');
        const history = await this.chatService.getConversationHistory(limit || 20);
        return {
          success: true,
          history: history
        };
      } catch (error) {
        this.logger.error('Error fetching history:', error);
        return {
          success: false,
          error: error.message,
          history: []
        };
      }
    });

    // Generate document
    ipcMain.handle('chat:generateDocument', async (event, documentType) => {
      try {
        this.logger.info('Generating document via IPC', { documentType });

        if (!documentType || typeof documentType !== 'string') {
          throw new Error('Invalid document type');
        }

        const result = await this.chatService.generateDocument(documentType);
        return result;
      } catch (error) {
        this.logger.error('Error generating document:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Check AI availability
    ipcMain.handle('chat:checkAI', async (event) => {
      try {
        const isAvailable = await this.chatService.ollamaClient?.checkAvailability();
        return {
          success: true,
          available: isAvailable || false,
          model: isAvailable ? 'llama3.1:8b' : 'template-based'
        };
      } catch (error) {
        this.logger.error('Error checking AI availability:', error);
        return {
          success: false,
          available: false,
          error: error.message
        };
      }
    });

    // Get case categories
    ipcMain.handle('chat:getCategories', async (event) => {
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
    });

    // Session management
    ipcMain.handle('chat:createSession', async (event) => {
      try {
        const sessionId = uuidv4();
        const session = {
          id: sessionId,
          createdAt: new Date(),
          active: true
        };

        this.activeSessions.set(sessionId, session);

        return {
          success: true,
          sessionId: sessionId
        };
      } catch (error) {
        this.logger.error('Error creating session:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Close session
    ipcMain.handle('chat:closeSession', async (event, sessionId) => {
      try {
        if (this.activeSessions.has(sessionId)) {
          this.activeSessions.delete(sessionId);
        }

        return {
          success: true
        };
      } catch (error) {
        this.logger.error('Error closing session:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Get suggested questions based on category
    ipcMain.handle('chat:getSuggestedQuestions', async (event, category) => {
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
        consumer: [
          "I bought a faulty product - can I get a refund?",
          "A company won't honor their warranty - what are my rights?",
          "I want to cancel a contract - what are the rules?"
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
    });

    // Export conversation as PDF
    ipcMain.handle('chat:exportConversation', async (event, format) => {
      try {
        this.logger.info('Exporting conversation', { format });

        // Get conversation history
        const history = await this.chatService.getConversationHistory();

        if (!history || history.length === 0) {
          throw new Error('No conversation to export');
        }

        // Format data for export
        const exportData = {
          title: 'Legal Assistance Conversation',
          date: new Date().toISOString(),
          messages: history,
          disclaimer: 'This conversation contains general legal information only, not legal advice.'
        };

        return {
          success: true,
          data: exportData,
          format: format || 'pdf'
        };

      } catch (error) {
        this.logger.error('Error exporting conversation:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Analyze urgency of message
    ipcMain.handle('chat:analyzeUrgency', async (event, message) => {
      try {
        const analysis = await this.chatService.analysisService?.analyzeCaseFromText(message);

        return {
          success: true,
          urgency: analysis?.urgency || 'normal',
          category: analysis?.category,
          confidence: analysis?.confidence
        };

      } catch (error) {
        this.logger.error('Error analyzing urgency:', error);
        return {
          success: false,
          urgency: 'normal'
        };
      }
    });
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    try {
      // Close all active sessions
      this.activeSessions.clear();

      // Clean up ChatService
      if (this.chatService) {
        await this.chatService.cleanup?.();
      }

      this.logger.info('ChatServiceBridge cleaned up');
    } catch (error) {
      this.logger.error('Error during cleanup:', error);
    }
  }
}

// Export singleton instance
let chatServiceBridge = null;

module.exports = {
  initialize: async () => {
    if (!chatServiceBridge) {
      chatServiceBridge = new ChatServiceBridge();
      await chatServiceBridge.initialize();
    }
    return chatServiceBridge;
  },
  getInstance: () => chatServiceBridge
};