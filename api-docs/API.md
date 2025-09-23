# Justice Companion API Documentation

## Overview

The Justice Companion API provides AI-powered legal information and assistance services. This RESTful API enables users to submit legal queries, analyze documents, and generate legal templates while maintaining appropriate boundaries between information and legal advice.

## Base URL

- **Development**: `http://localhost:11434`
- **Production**: `https://api.justice-companion.org`

## Authentication

Currently, no authentication is required for API access. Rate limiting is applied based on session ID and IP address.

## Rate Limiting

The API implements intelligent rate limiting with legal domain prioritization:

- **General requests**: 30 per minute, 300 per hour, 1000 per day
- **Emergency legal situations**: Higher priority and increased limits
- **Burst requests**: Up to 5 requests in 5 seconds for priority domains

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Request limit for the current window
- `X-RateLimit-Remaining`: Number of requests left
- `X-RateLimit-Reset`: Time when the limit resets

## Error Handling

All API endpoints return errors in a consistent format:

```json
{
  "success": false,
  "error": {
    "message": "User-friendly error message",
    "code": "ERROR_CODE",
    "suggestion": "Suggested action to resolve the error",
    "canRetry": true,
    "timestamp": "2023-01-01T00:00:00Z"
  }
}
```

### Common Error Codes

- `RATE_LIMIT_EXCEEDED`: Too many requests (HTTP 429)
- `SERVICE_UNAVAILABLE`: AI service temporarily down (HTTP 503)
- `INVALID_INPUT`: Request validation failed (HTTP 400)
- `CIRCUIT_BREAKER_OPEN`: Service protection active (HTTP 503)

## Legal Domains

The API recognizes the following legal domains for specialized handling:

- `LANDLORD_TENANT`: Housing and tenancy law
- `CONSUMER_RIGHTS`: Consumer protection and rights
- `EMPLOYMENT_RIGHTS`: Employment law and workplace issues
- `FAMILY_LAW`: Family and domestic relations law
- `DEBT_FINANCE`: Debt management and financial law
- `GENERAL`: General legal information

## Safety and Compliance

### Legal Information vs. Advice

The API provides **legal information** only, not legal advice. All responses include:

- Clear disclaimers about the information/advice distinction
- Recommendations to consult qualified legal professionals
- References to relevant UK laws and regulations
- Emergency contact information when appropriate

### Content Safety

- Input validation prevents harmful or inappropriate requests
- Risk assessment categorizes response content
- Emergency situation detection triggers crisis resources
- Circuit breaker protection prevents service abuse

### Data Privacy

- No personal information is stored permanently
- Session data is cleared after inactivity timeout
- All communications are processed locally when possible
- No data is shared with external services without consent

## Examples

### Basic Legal Query

```bash
curl -X POST http://localhost:11434/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "My landlord is trying to evict me without proper notice. What are my rights?",
    "domain": "LANDLORD_TENANT",
    "sessionId": "session_123"
  }'
```

### Document Analysis

```bash
curl -X POST http://localhost:11434/api/ai/analyze-document \
  -H "Content-Type: application/json" \
  -d '{
    "documentText": "This tenancy agreement...",
    "documentType": "tenancy_agreement",
    "analysisType": "key_terms"
  }'
```

### Health Check

```bash
curl http://localhost:11434/api/ai/health
```

## Support

For technical support or questions about the API:

- **Documentation**: View this documentation
- **Issues**: Report issues on GitHub
- **Email**: support@justice-companion.org

## Legal Notice

This API provides general legal information only. It does not constitute legal advice. Users should consult with qualified legal professionals for advice specific to their situations.

---

*Generated on 2025-09-23T16:35:26.995Z*
