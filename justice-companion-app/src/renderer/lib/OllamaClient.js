// Ollama Integration for Justice Companion
// Where AI meets legal warfare
// Built from pain, powered by truth

import { Ollama } from 'ollama/browser';

class OllamaClient {
  constructor() {
    // Get configuration from environment or use defaults
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:1234'; // LM Studio default port
    this.model = process.env.OLLAMA_MODEL || 'Qwen2.5-7B-Instruct-Q4_K_M.gguf'; // Qwen 2.5 - Superior for RAG and legal reasoning
    this.client = new Ollama({ host: this.baseUrl });
    this.isConnected = false;
    this.conversationContext = [];
  }

  // Test if Ollama is running and accessible
  async checkConnection() {
    try {
      const models = await this.client.list();
      this.isConnected = true;
      console.log('🤖 Ollama connected. Available models:', models.models?.map(m => m.name));
      return models.models.length > 0;
    } catch (error) {
      console.warn('⚠️ Ollama not available:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  // Enhanced legal system prompt with safety guidelines
  buildSystemPrompt(caseType = 'general') {
    return `You are Justice Companion, a locally-running AI legal assistant powered by advanced language models. You run entirely on the user's computer for complete privacy and security. You are designed to provide legal information and guidance to individuals seeking help with legal matters in the UK.

CRITICAL INSTRUCTIONS - LEGAL SAFETY:
- You provide INFORMATION only, never legal advice
- Always distinguish between information and legal advice
- Include disclaimers in responses about consulting qualified professionals
- Never suggest illegal activities or harmful actions
- Encourage users to seek professional legal counsel for complex matters
- Focus on empowering users with knowledge of their rights

ROLE: Provide clear, accurate legal information while being supportive and empathetic. Help users understand their rights and options without crossing into formal legal advice territory.

UK LEGAL SYSTEM EXPERTISE:
- Housing and tenant rights (including deposit protection, eviction procedures)
- Consumer protection (Consumer Rights Act 2015, Section 75 protections)
- Benefits and social security appeals (PIP, ESA, Universal Credit)
- Employment rights (unfair dismissal, discrimination, wage disputes)
- Debt management and financial disputes
- Basic civil procedures and court processes

RESPONSE GUIDELINES:
- Use clear, accessible language avoiding unnecessary legal jargon
- Provide structured information with actionable steps
- Reference relevant UK laws and regulations when appropriate
- Be supportive and understanding while maintaining professionalism
- Offer templates or example approaches when helpful
- Always emphasize: "This is legal information, not formal legal advice"
- Suggest professional resources when matters are complex

SAFETY PROTOCOLS:
- If emergency situation (domestic violence, immediate danger): Provide crisis resources immediately
- If complex legal area (criminal, immigration, medical negligence): Strongly recommend professional consultation
- If requests seem to seek advice on illegal activities: Redirect to ethical legal channels
- If user appears to be seeking specific legal advice: Clarify information vs advice distinction

CURRENT CASE FOCUS: ${caseType}

Remember: You're helping people understand their rights and options, not providing legal representation or formal advice.`;
  }

  // Generate response using Ollama
  async generateResponse(userMessage, caseContext = null) {
    if (!this.isConnected) {
      await this.checkConnection();
      if (!this.isConnected) {
        return this.getFallbackResponse(userMessage);
      }
    }

    try {
      const systemPrompt = this.buildSystemPrompt(caseContext?.type);

      // Build conversation context
      const messages = [
        { role: 'system', content: systemPrompt },
        ...this.conversationContext,
        { role: 'user', content: userMessage }
      ];

      const response = await this.client.chat({
        model: this.model,
        messages: messages,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 1024
        }
      });

      const aiResponse = response.message?.content || 'AI response failed.';

      // Update conversation context (keep last 10 exchanges)
      this.conversationContext.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: aiResponse }
      );

      if (this.conversationContext.length > 20) {
        this.conversationContext = this.conversationContext.slice(-20);
      }

      return aiResponse;

    } catch (error) {
      console.error('🔥 Ollama generation failed:', error);
      return this.getFallbackResponse(userMessage, error);
    }
  }

  // Enhanced fallback responses when Ollama isn't available
  getFallbackResponse(userMessage, error = null) {
    const lowerInput = userMessage.toLowerCase();

    // Enhanced landlord responses
    if (lowerInput.includes('landlord') || lowerInput.includes('evict') || lowerInput.includes('deposit')) {
      return `**Housing and Tenancy Support** 🏠

I understand you're experiencing issues with your landlord. Here's important information about your rights:

**IMMEDIATE STEPS:**
1. **Document everything** - Keep records of all communications and issues
2. **Check deposit protection** - Your deposit must be protected in TDS, DPS, or MyDeposits within 30 days
3. **Verify any notices** - Section 21/8 notices must follow specific legal requirements

**YOUR TENANT RIGHTS:**
• **Proper notice periods** - Landlords must follow legal procedures
• **Deposit protection** - Unprotected deposits may lead to compensation
• **Protection from illegal eviction** - You cannot be forced out without proper court process
• **Right to quiet enjoyment** - 24 hours notice required for visits

**HOW I CAN HELP:**
→ Review your eviction notice for validity
→ Draft a formal response letter
→ Calculate potential deposit compensation

${error ? '⚠️ Currently using offline responses' : ''}
*This is legal information, not formal legal advice. Please consult a solicitor for specific legal counsel.*`;
    }

    // Enhanced consumer rights
    if (lowerInput.includes('refund') || lowerInput.includes('faulty') || lowerInput.includes('company')) {
      return `**Consumer Rights Information** 🛍️

I can help you understand your consumer rights and options:

**YOUR LEGAL PROTECTIONS:**
1. **Consumer Rights Act 2015** - 30-day right to reject faulty goods
2. **Section 75 Credit Protection** - Credit card company liability for purchases £100-£30,000
3. **Chargeback Rights** - Protection for debit card purchases

**RECOMMENDED APPROACH:**
📧 **Step 1:** Formal complaint (professional but threatening)
⏰ **Step 2:** 14 days to respond or we escalate
⚖️ **Step 3:** Small claims court (£35-£455 fee - claimable)
💰 **Step 4:** Collect compensation + costs

**SAMPLE OPENER:**
"I am formally requesting a full refund under the Consumer Rights Act 2015..."

${error ? '⚠️ AI offline - using enhanced fallback responses' : ''}
*Ready to draft a letter that'll make them nervous?*`;
    }

    // Benefits appeals
    if (lowerInput.includes('benefits') || lowerInput.includes('pip') || lowerInput.includes('esa') || lowerInput.includes('universal credit')) {
      return `**BENEFITS WARFARE ACTIVATED** 💷⚔️

The DWP counts on you giving up. We're about to prove them wrong:

**APPEAL GROUNDS:**
1. **Mandatory Reconsideration** - Always the first step
2. **Medical Evidence** - Get supporting letters from professionals
3. **Tribunal Statistics** - 70%+ success rate when cases are properly presented

**ACTION PLAN:**
📋 **Evidence gathering** - Medical records, daily living impact
📝 **MR letter** - Detailed, factual, no emotions
⚖️ **Tribunal prep** - They rarely show up, you usually win

**IMMEDIATE ACTIONS:**
• Request copy of assessment report
• List all daily activities affected
• Get professional support letters

${error ? '⚠️ AI offline - tactical support active' : ''}
*They designed this system to exhaust you. Don't let them win.*`;
    }

    // General support response
    return `**Justice Companion - Legal Information Service** ⚖️

${error ? 'ℹ️ Currently using offline responses. Online features will be available soon.' : ''}

I'm here to help you understand your legal situation and options.

**TO BETTER ASSIST YOU, PLEASE SHARE:**
• What type of legal issue are you facing? (housing, consumer, employment, etc.)
• What has happened so far?
• What outcome are you hoping to achieve?

**IMPORTANT TO KNOW:**
• You have rights that are protected by law
• There are often multiple ways to resolve legal issues
• Taking action early can improve outcomes

**I'M HERE TO HELP YOU:**
• Understand your legal rights
• Organize your documentation
• Prepare for important conversations
• Find relevant resources

*The more information you provide, the better I can assist you with relevant legal information.*`;
  }

  // Reset conversation context
  clearContext() {
    this.conversationContext = [];
  }

  // Get current model info
  async getModelInfo() {
    if (!this.isConnected) return null;

    try {
      return await this.client.show({ name: this.model });
    } catch (error) {
      console.error('Failed to get model info:', error);
      return null;
    }
  }

  // Download model if not available
  async ensureModel() {
    try {
      await this.client.pull({ model: this.model });
      return true;
    } catch (error) {
      console.error('Failed to pull model:', error);
      return false;
    }
  }

  // Add streaming support for real-time responses
  async generateResponseStream(userMessage, caseContext = null, onChunk = null) {
    if (!this.isConnected) {
      await this.checkConnection();
      if (!this.isConnected) {
        return this.getFallbackResponse(userMessage);
      }
    }

    try {
      const systemPrompt = this.buildSystemPrompt(caseContext?.type);

      // Build conversation context
      const messages = [
        { role: 'system', content: systemPrompt },
        ...this.conversationContext,
        { role: 'user', content: userMessage }
      ];

      let fullResponse = '';

      const response = await this.client.chat({
        model: this.model,
        messages: messages,
        stream: true,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 1024
        }
      });

      for await (const part of response) {
        const chunk = part.message?.content || '';
        fullResponse += chunk;
        if (onChunk && chunk) {
          onChunk(chunk);
        }
      }

      // Update conversation context (keep last 10 exchanges)
      this.conversationContext.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: fullResponse }
      );

      if (this.conversationContext.length > 20) {
        this.conversationContext = this.conversationContext.slice(-20);
      }

      return fullResponse;

    } catch (error) {
      console.error('🔥 Ollama streaming failed:', error);
      return this.getFallbackResponse(userMessage, error);
    }
  }
}

// Export singleton instance
export default new OllamaClient();