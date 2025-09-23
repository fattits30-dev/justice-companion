// LM Studio Integration for Justice Companion
// Optimized for GPU acceleration with OpenAI-compatible API
// Built for justice, powered by local AI

class LMStudioClient {
  constructor() {
    // LM Studio configuration
    this.baseUrl = process.env.LM_STUDIO_URL || 'http://localhost:1234/v1';
    this.model = process.env.LM_MODEL || 'local-model'; // LM Studio uses 'local-model' as default
    this.isConnected = false;
    this.conversationContext = [];
  }

  // Test if LM Studio is running and accessible
  async checkConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/models`);
      if (response.ok) {
        const data = await response.json();
        this.isConnected = true;
        console.log('🚀 LM Studio connected. Available models:', data.data?.map(m => m.id));
        return true;
      }
      this.isConnected = false;
      return false;
    } catch (error) {
      console.warn('⚠️ LM Studio not available:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  // Enhanced legal system prompt with local AI context
  buildSystemPrompt(caseType = 'general') {
    return `You are Justice Companion, a locally-running AI legal assistant powered by LM Studio and running on the user's GPU for maximum privacy and performance. You provide legal information and guidance for UK legal matters.

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

CURRENT CASE FOCUS: ${caseType}

Remember: You're helping people understand their rights and options, not providing legal representation or formal advice.`;
  }

  // Generate response using LM Studio's OpenAI-compatible API
  async generateResponse(userMessage, caseContext = null) {
    if (!this.isConnected) {
      await this.checkConnection();
      if (!this.isConnected) {
        return this.getFallbackResponse(userMessage);
      }
    }

    try {
      const systemPrompt = this.buildSystemPrompt(caseContext?.type);

      // Build conversation messages in OpenAI format
      const messages = [
        { role: 'system', content: systemPrompt },
        ...this.conversationContext,
        { role: 'user', content: userMessage }
      ];

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 1024,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`LM Studio API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || 'AI response failed.';

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
      console.error('🔥 LM Studio generation failed:', error);
      return this.getFallbackResponse(userMessage, error);
    }
  }

  // Generate streaming response using LM Studio
  async generateResponseStream(userMessage, caseContext = null, onChunk = null) {
    if (!this.isConnected) {
      await this.checkConnection();
      if (!this.isConnected) {
        return this.getFallbackResponse(userMessage);
      }
    }

    try {
      const systemPrompt = this.buildSystemPrompt(caseContext?.type);

      const messages = [
        { role: 'system', content: systemPrompt },
        ...this.conversationContext,
        { role: 'user', content: userMessage }
      ];

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 1024,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`LM Studio API error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            if (jsonStr === '[DONE]') continue;

            try {
              const data = JSON.parse(jsonStr);
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                fullResponse += content;
                if (onChunk) onChunk(content);
              }
            } catch (e) {
              // Skip invalid JSON chunks
            }
          }
        }
      }

      // Update conversation context
      this.conversationContext.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: fullResponse }
      );

      if (this.conversationContext.length > 20) {
        this.conversationContext = this.conversationContext.slice(-20);
      }

      return fullResponse;

    } catch (error) {
      console.error('🔥 LM Studio streaming failed:', error);
      return this.getFallbackResponse(userMessage, error);
    }
  }

  // Enhanced fallback responses when LM Studio isn't available
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

${error ? '⚠️ Currently using offline responses - LM Studio not connected' : ''}
*This is legal information, not formal legal advice. Please consult a solicitor for specific legal counsel.*`;
    }

    // General support response
    return `**Justice Companion - Legal Information Service** ⚖️

${error ? 'ℹ️ LM Studio is not connected. Please ensure LM Studio server is running on port 1234.' : ''}

I'm here to help you understand your legal situation and options.

**TO BETTER ASSIST YOU, PLEASE SHARE:**
• What type of legal issue are you facing?
• What has happened so far?
• What outcome are you hoping to achieve?

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
      const response = await fetch(`${this.baseUrl}/models`);
      if (response.ok) {
        const data = await response.json();
        return data.data?.[0] || null;
      }
      return null;
    } catch (error) {
      console.error('Failed to get model info:', error);
      return null;
    }
  }
}

// Export singleton instance
export default new LMStudioClient();