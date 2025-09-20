// Ollama Integration for Justice Companion
// Where AI meets legal warfare
// Built from pain, powered by truth

class OllamaClient {
  constructor() {
    this.baseUrl = 'http://localhost:11434';
    this.model = 'llama3.2:3b'; // Lightweight model for legal advice
    this.isConnected = false;
    this.conversationContext = [];
  }

  // Test if Ollama is running and accessible
  async checkConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        this.isConnected = true;
        console.log('🤖 Ollama connected. Available models:', data.models?.map(m => m.name));
        return true;
      }
    } catch (error) {
      console.warn('⚠️ Ollama not available:', error.message);
      this.isConnected = false;
    }
    return false;
  }

  // Legal system prompt for Justice Companion
  buildSystemPrompt(caseType = 'general') {
    return `You are Justice Companion, an AI assistant designed to provide legal information and support to individuals seeking help with legal matters.

ROLE: Provide clear, accurate legal information while being supportive and empathetic. Help users understand their rights and options without providing formal legal advice.

CONTEXT: UK legal system, with expertise in:
- Tenant rights and housing law
- Consumer protection
- Benefits and social security appeals
- Employment rights
- Debt management and financial disputes

RESPONSE GUIDELINES:
- Provide clear, practical steps users can take
- Reference relevant UK laws and regulations when appropriate
- Be supportive and understanding while maintaining professionalism
- Offer templates or example documents when helpful
- Always include: "This is legal information, not formal legal advice"

CURRENT FOCUS: ${caseType}

How can I assist you with your legal matter today?`;
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

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 1024
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.message?.content || 'AI response failed.';

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
      const response = await fetch(`${this.baseUrl}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: this.model })
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to get model info:', error);
    }
    return null;
  }

  // Download model if not available
  async ensureModel() {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: this.model })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to pull model:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new OllamaClient();