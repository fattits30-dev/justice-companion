# Justice Companion API Integration

## Enhanced Legal AI API Layer with Ollama Integration

This API layer provides robust, secure, and legally-compliant AI integration for the Justice Companion legal aid application. It features comprehensive error handling, circuit breaker patterns, caching, and legal safeguards specifically designed for legal technology applications.

## 🔧 Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   ChatInterface │────│  APIIntegration  │────│  LegalAIService │
│   (Frontend)    │    │  (IPC Bridge)    │    │  (Orchestrator) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                ┌───────▼───────┐
                                                │ OllamaClient  │
                                                │ (AI Engine)   │
                                                └───────────────┘
```

### Core Components

1. **OllamaClient** - Enhanced HTTP client with circuit breaker, retry logic, and legal safeguards
2. **LegalAIService** - High-level service orchestrating AI interactions with caching and templates
3. **APIIntegration** - Electron IPC bridge connecting frontend to backend services
4. **Legal Templates** - Pre-built responses for common legal scenarios

## 🚀 Features

### ✅ Resilience & Reliability
- **Exponential Backoff Retry Logic** - Intelligent retry with increasing delays
- **Circuit Breaker Pattern** - Prevents cascade failures when AI service is down
- **Request/Response Validation** - Comprehensive input and output validation
- **Graceful Degradation** - Fallback to template responses when AI unavailable

### ✅ Legal Compliance & Safety
- **Content Filtering** - Prevents harmful or inappropriate legal suggestions
- **Legal Disclaimers** - Automatic injection of required legal disclaimers
- **Risk Assessment** - Categorizes responses by risk level (LOW/MEDIUM/HIGH)
- **Information vs Advice** - Clear distinction between legal information and advice

### ✅ Performance & Caching
- **Response Caching** - LRU cache for frequently accessed legal information
- **Template Matching** - Fast responses for common legal queries
- **Context Management** - Multi-turn conversation support with memory
- **Telemetry & Monitoring** - Comprehensive metrics for performance monitoring

### ✅ Security & Privacy
- **Local AI Processing** - No external data transmission with Ollama
- **Session Management** - Secure session handling for conversation continuity
- **Rate Limiting** - Protection against abuse and resource exhaustion
- **Audit Logging** - Complete audit trail for legal compliance

## 📋 API Reference

### Chat Interface

```javascript
// Send legal query to AI
const response = await window.justiceAPI.aiChat(
  "My landlord is demanding extra deposit money",
  "session_123",
  {
    temperature: 0.3,
    max_tokens: 2048
  }
);

if (response.success) {
  console.log('AI Response:', response.response.content);
  console.log('Confidence:', response.response.confidence);
  console.log('Risk Level:', response.response.riskLevel);
  console.log('Legal Domain:', response.response.domain);
}
```

### Health Monitoring

```javascript
// Check AI service health
const health = await window.justiceAPI.aiHealth();
console.log('Status:', health.health.overall);
console.log('Ollama Connected:', health.health.components.ollama.connected);
console.log('Cache Hit Rate:', health.health.components.ai_service.cache.hitRate);
```

### Document Analysis

```javascript
// Analyze legal document
const analysis = await window.justiceAPI.aiAnalyzeDocument(
  documentText,
  'tenancy_agreement',
  'key_terms'
);

console.log('Key Terms:', analysis.analysis.findings.keyPoints);
console.log('Risk Assessment:', analysis.analysis.riskLevel);
```

### Template Generation

```javascript
// Generate legal template
const template = await window.justiceAPI.aiGenerateTemplate(
  'complaint_letter',
  {
    recipientName: 'ABC Company',
    issueDescription: 'Faulty product purchased on 01/01/2024',
    desiredOutcome: 'Full refund'
  }
);

console.log('Generated Letter:', template.template.content);
```

## 🔧 Configuration

### Environment Variables

```bash
# Ollama Configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
NODE_ENV=development

# Optional: Custom timeouts and limits
AI_TIMEOUT=30000
AI_MAX_RETRIES=3
CACHE_MAX_SIZE=100
```

### Model Recommendations

| Use Case | Model | Size | Description |
|----------|-------|------|-------------|
| Development | `llama3.2:1b` | 1GB | Fast, basic responses |
| Production | `llama3.2:3b` | 2GB | Balanced speed/quality |
| High-Quality | `llama3.1:8b` | 4.7GB | Excellent legal reasoning |
| Enterprise | `qwen2.5:32b` | 19GB | Complex legal analysis |

### Installation

1. **Install Ollama**
   ```bash
   # Windows: Download from ollama.ai
   # macOS
   brew install ollama

   # Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

2. **Download Model**
   ```bash
   ollama pull llama3.2:3b
   ```

3. **Test Installation**
   ```bash
   ollama run llama3.2:3b "What are UK tenant rights?"
   ```

## 🛡️ Legal Safeguards

### Content Filtering
- Blocks requests for actual legal advice
- Prevents harmful or illegal suggestions
- Filters inappropriate content for legal context

### Risk Assessment
- **LOW**: General legal information
- **MEDIUM**: Specific guidance requiring verification
- **HIGH**: Complex matters requiring professional advice

### Disclaimer Management
- Automatic disclaimer injection
- Domain-specific legal warnings
- Professional referral suggestions

### Template Responses
Pre-built responses for common scenarios:
- Landlord-tenant disputes
- Consumer rights issues
- Employment matters
- Debt and finance problems

## 📊 Monitoring & Telemetry

### Metrics Tracked
- Request/response times
- Success/failure rates
- Cache hit rates
- Circuit breaker states
- AI model performance

### Health Checks
```javascript
// Service health monitoring
const metrics = await window.justiceAPI.aiMetrics();
console.log('Total Requests:', metrics.metrics.totalRequests);
console.log('Success Rate:', metrics.metrics.successRate);
console.log('Average Response Time:', metrics.metrics.averageResponseTime);
```

## 🧪 Testing

### Mock Mode
Enable mock responses for testing without Ollama:

```javascript
const client = new OllamaClient({ mockMode: true });
```

### Test Coverage
- Unit tests for all components
- Integration tests for complete workflows
- Mock responses for different legal domains
- Error handling scenarios

### Running Tests
```bash
npm test
# or
npm run test:api
```

## 🔒 Security Considerations

### Data Privacy
- All AI processing is local (no external API calls)
- Conversation context is encrypted
- Session data is automatically cleaned up
- Audit logs for compliance

### Rate Limiting
- Prevents API abuse
- Configurable limits per user/session
- Gradual backoff for excessive requests

### Input Validation
- Sanitizes all user inputs
- Validates request parameters
- Checks content for harmful patterns

## 🚨 Error Handling

### Graceful Degradation
1. **AI Unavailable** → Template responses
2. **Rate Limited** → User-friendly delay messages
3. **Invalid Input** → Helpful validation errors
4. **Network Issues** → Retry with exponential backoff

### Error Types
```javascript
{
  success: false,
  error: {
    message: "User-friendly error message",
    suggestion: "What the user can do to fix it",
    canRetry: true,
    timestamp: "2024-01-01T00:00:00.000Z"
  }
}
```

## 📚 Legal Resources Integration

### Automatic Resource Suggestions
- Citizens Advice contact information
- Emergency legal helplines
- Relevant government resources
- Professional legal service directories

### Domain-Specific Help
- Housing: Shelter, local councils
- Consumer: Trading Standards, ombudsman services
- Employment: ACAS, tribunal services
- Family: Support organizations, mediation services

## 🔄 Circuit Breaker States

### CLOSED (Normal Operation)
- All requests pass through
- Failures are counted
- Performance metrics tracked

### OPEN (Service Degraded)
- Requests fail fast
- Fallback responses activated
- Recovery timer started

### HALF-OPEN (Testing Recovery)
- Limited requests allowed through
- Success resets to CLOSED
- Failure returns to OPEN

## 💡 Best Practices

### For Developers
1. Always handle errors gracefully
2. Use appropriate timeouts
3. Monitor circuit breaker states
4. Implement proper caching
5. Test with mock mode first

### For Legal Applications
1. Include comprehensive disclaimers
2. Distinguish information from advice
3. Implement audit trails
4. Regular accuracy testing
5. Human oversight for complex cases

### For Production
1. Monitor performance metrics
2. Set appropriate rate limits
3. Use circuit breaker patterns
4. Implement proper logging
5. Regular security audits

## 🤝 Contributing

### Code Standards
- ESLint configuration included
- Jest testing framework
- Comprehensive documentation
- TypeScript types (future)

### Adding New Features
1. Create tests first
2. Implement with error handling
3. Add legal safeguards
4. Update documentation
5. Monitor performance impact

## 📞 Support

### Common Issues
1. **Ollama not responding** - Check if service is running
2. **Model not found** - Ensure model is downloaded
3. **High memory usage** - Consider smaller model
4. **Slow responses** - Check system resources

### Emergency Contacts
- **Development Issues**: Check GitHub issues
- **Legal Compliance**: Consult legal team
- **Security Concerns**: Follow incident response plan

---

## 📄 License & Disclaimer

This API integration is part of Justice Companion, designed to provide legal information (not advice) to users who need access to justice. All AI responses include appropriate disclaimers and encourage users to seek professional legal counsel when appropriate.

**Remember**: This system provides legal information, not legal advice. Users should always verify information and consult qualified legal professionals for specific legal matters.