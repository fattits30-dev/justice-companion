/**
 * Example Configuration for Justice Companion API Integration
 *
 * This file shows how to configure the legal AI API layer for different environments.
 * Copy this file to config.js and customize for your specific setup.
 */

module.exports = {
  // Development configuration
  development: {
    ollama: {
      baseURL: process.env.OLLAMA_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama3.2',
      timeout: 30000,
      maxRetries: 3,
      failureThreshold: 5,
      recoveryTimeout: 60000,
      mockMode: false
    },

    cache: {
      maxSize: 100,
      maxAge: 300000, // 5 minutes
      enabled: true
    },

    security: {
      rateLimiting: {
        enabled: true,
        requests: 10,
        window: 60000 // 1 minute
      },
      contentFiltering: {
        enabled: true,
        strictMode: false
      }
    },

    logging: {
      level: 'debug',
      auditTrail: true,
      performance: true
    }
  },

  // Production configuration
  production: {
    ollama: {
      baseURL: process.env.OLLAMA_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama3.2',
      timeout: 45000,
      maxRetries: 5,
      failureThreshold: 3,
      recoveryTimeout: 120000,
      mockMode: false
    },

    cache: {
      maxSize: 500,
      maxAge: 600000, // 10 minutes
      enabled: true
    },

    security: {
      rateLimiting: {
        enabled: true,
        requests: 5,
        window: 60000 // 1 minute - stricter in production
      },
      contentFiltering: {
        enabled: true,
        strictMode: true
      }
    },

    logging: {
      level: 'info',
      auditTrail: true,
      performance: true
    }
  },

  // Test configuration
  test: {
    ollama: {
      baseURL: 'http://localhost:11434',
      model: 'test-model',
      timeout: 5000,
      maxRetries: 1,
      failureThreshold: 2,
      recoveryTimeout: 10000,
      mockMode: true // Always use mock mode in tests
    },

    cache: {
      maxSize: 10,
      maxAge: 60000, // 1 minute
      enabled: true
    },

    security: {
      rateLimiting: {
        enabled: false, // Disabled for tests
        requests: 100,
        window: 60000
      },
      contentFiltering: {
        enabled: true,
        strictMode: false
      }
    },

    logging: {
      level: 'error',
      auditTrail: false,
      performance: false
    }
  }
};

/**
 * Environment-specific model recommendations:
 *
 * For legal use cases, consider these Ollama models:
 *
 * LIGHTWEIGHT (Good for basic legal Q&A):
 * - llama3.2:1b (1GB) - Fast, basic responses
 * - phi3.5:3.8b (2.3GB) - Microsoft's efficient model
 *
 * BALANCED (Recommended for most legal work):
 * - llama3.2:3b (2GB) - Good balance of speed and quality
 * - llama3.1:8b (4.7GB) - High quality responses
 *
 * HIGH-QUALITY (For complex legal analysis):
 * - llama3.1:70b (40GB) - Requires powerful hardware
 * - qwen2.5:32b (19GB) - Excellent reasoning capabilities
 *
 * SPECIALIZED (If available):
 * - saul-7b-instruct - Legal domain specific
 * - legal-bert variants - Document analysis
 */

/**
 * Installation Commands:
 *
 * 1. Install Ollama:
 *    Windows: Download from ollama.ai
 *    macOS: brew install ollama
 *    Linux: curl -fsSL https://ollama.ai/install.sh | sh
 *
 * 2. Pull recommended model:
 *    ollama pull llama3.2:3b
 *
 * 3. Test installation:
 *    ollama run llama3.2:3b "What are tenant rights in the UK?"
 *
 * 4. For production, consider GPU acceleration:
 *    Ensure CUDA/ROCm drivers are installed for faster inference
 */

/**
 * Environment Variables:
 *
 * Set these in your .env file or system environment:
 *
 * OLLAMA_URL=http://localhost:11434
 * OLLAMA_MODEL=llama3.2:3b
 * NODE_ENV=development
 *
 * For Docker deployments:
 * OLLAMA_URL=http://ollama-service:11434
 */

/**
 * Performance Tuning Tips:
 *
 * 1. Model Selection:
 *    - Start with smaller models for development
 *    - Use quantized models (Q4_K_M, Q5_K_M) for production
 *    - Monitor memory usage and response times
 *
 * 2. Caching Strategy:
 *    - Enable response caching for common legal queries
 *    - Use template responses for standard legal information
 *    - Monitor cache hit rates and adjust size accordingly
 *
 * 3. Rate Limiting:
 *    - Adjust based on hardware capabilities
 *    - Consider user tiers (premium users get higher limits)
 *    - Monitor API usage patterns
 *
 * 4. Circuit Breaker:
 *    - Tune failure threshold based on model reliability
 *    - Adjust recovery timeout based on restart times
 *    - Implement graceful fallbacks to template responses
 */

/**
 * Legal Compliance Notes:
 *
 * 1. Data Privacy:
 *    - Ollama runs locally, no data sent to external services
 *    - Ensure audit logging for legal compliance
 *    - Implement data retention policies
 *
 * 2. Professional Standards:
 *    - Always include legal disclaimers
 *    - Maintain clear distinction between information and advice
 *    - Implement content filtering for harmful suggestions
 *
 * 3. Quality Assurance:
 *    - Regular testing of legal response accuracy
 *    - Human review of AI-generated content when required
 *    - Fallback to human legal professionals for complex cases
 *
 * 4. Attorney-Client Privilege:
 *    - Ensure all communications are properly encrypted
 *    - Implement secure session management
 *    - Maintain detailed audit trails for legal proceedings
 */