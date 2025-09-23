/**
 * API Documentation Generator for Justice Companion
 * Generates comprehensive OpenAPI/Swagger documentation for all API endpoints
 */

const fs = require('fs').promises;
const path = require('path');

class APIDocumentation {
  constructor() {
    this.openAPISpec = {
      openapi: '3.0.3',
      info: {
        title: 'Justice Companion API',
        version: '1.0.0',
        description: 'Legal information and AI assistance API for Justice Companion application',
        contact: {
          name: 'Justice Companion Support',
          url: 'https://github.com/justice-companion/justice-companion',
          email: 'support@justice-companion.org'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        }
      },
      servers: [
        {
          url: 'http://localhost:11434',
          description: 'Local Ollama Development Server'
        },
        {
          url: 'https://api.justice-companion.org',
          description: 'Production API Server'
        }
      ],
      paths: {},
      components: {
        schemas: {},
        responses: {},
        parameters: {},
        securitySchemes: {}
      },
      tags: [
        {
          name: 'AI Chat',
          description: 'AI-powered legal information and chat services'
        },
        {
          name: 'Health',
          description: 'System health and monitoring endpoints'
        },
        {
          name: 'Document Analysis',
          description: 'Legal document analysis and review services'
        },
        {
          name: 'Template Generation',
          description: 'Legal document template generation services'
        },
        {
          name: 'Rate Limiting',
          description: 'API rate limiting and usage management'
        }
      ]
    };

    this.initializeAPIDocumentation();
  }

  /**
   * Initialize complete API documentation
   */
  initializeAPIDocumentation() {
    this.defineSchemas();
    this.defineResponses();
    this.defineParameters();
    this.definePaths();
  }

  /**
   * Define reusable schemas
   */
  defineSchemas() {
    this.openAPISpec.components.schemas = {
      // Legal AI Request/Response Schemas
      LegalQueryRequest: {
        type: 'object',
        required: ['query'],
        properties: {
          query: {
            type: 'string',
            description: 'Legal question or request for information',
            minLength: 10,
            maxLength: 5000,
            example: 'My landlord is trying to evict me without proper notice. What are my rights?'
          },
          sessionId: {
            type: 'string',
            description: 'Session identifier for conversation context',
            example: 'session_1234567890'
          },
          domain: {
            type: 'string',
            enum: ['LANDLORD_TENANT', 'CONSUMER_RIGHTS', 'EMPLOYMENT_RIGHTS', 'FAMILY_LAW', 'DEBT_FINANCE', 'GENERAL'],
            description: 'Legal domain for specialized handling',
            example: 'LANDLORD_TENANT'
          },
          options: {
            type: 'object',
            properties: {
              model: {
                type: 'string',
                description: 'Preferred AI model',
                example: 'llama3.1:8b'
              },
              temperature: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description: 'AI response creativity (0=deterministic, 1=creative)',
                example: 0.7
              },
              maxTokens: {
                type: 'integer',
                minimum: 100,
                maximum: 4096,
                description: 'Maximum response length in tokens',
                example: 2048
              },
              context: {
                type: 'object',
                description: 'Additional context for the query'
              }
            }
          }
        }
      },

      LegalAIResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Whether the request was successful'
          },
          response: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'AI-generated legal information response'
              },
              domain: {
                type: 'string',
                description: 'Identified legal domain'
              },
              confidence: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description: 'Confidence score for the response'
              },
              riskLevel: {
                type: 'string',
                enum: ['LOW', 'MEDIUM', 'HIGH'],
                description: 'Risk assessment of the response content'
              },
              sources: {
                type: 'array',
                items: { type: 'string' },
                description: 'Legal sources referenced in the response'
              },
              disclaimer: {
                type: 'boolean',
                description: 'Whether legal disclaimer is included'
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                description: 'Response generation timestamp'
              },
              model: {
                type: 'string',
                description: 'AI model used for generation'
              },
              responseTime: {
                type: 'integer',
                description: 'Response generation time in milliseconds'
              }
            }
          },
          metadata: {
            type: 'object',
            properties: {
              sessionId: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              safeguards: {
                type: 'array',
                items: { type: 'string' },
                description: 'Safety measures applied'
              }
            }
          }
        }
      },

      // Error Response Schema
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          error: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'User-friendly error message'
              },
              code: {
                type: 'string',
                description: 'Error code for programmatic handling'
              },
              suggestion: {
                type: 'string',
                description: 'Suggested action to resolve the error'
              },
              canRetry: {
                type: 'boolean',
                description: 'Whether the request can be retried'
              },
              timestamp: {
                type: 'string',
                format: 'date-time'
              }
            }
          }
        }
      },

      // Health Status Schema
      HealthStatus: {
        type: 'object',
        properties: {
          overall: {
            type: 'string',
            enum: ['healthy', 'degraded', 'unhealthy'],
            description: 'Overall system health status'
          },
          components: {
            type: 'object',
            properties: {
              ai_service: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  connected: { type: 'boolean' },
                  lastCheck: { type: 'string', format: 'date-time' },
                  availableModels: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                }
              },
              circuit_breaker: {
                type: 'object',
                properties: {
                  state: {
                    type: 'string',
                    enum: ['CLOSED', 'OPEN', 'HALF_OPEN']
                  },
                  consecutiveFailures: { type: 'integer' },
                  lastFailureTime: { type: 'string', format: 'date-time' }
                }
              },
              rate_limiter: {
                type: 'object',
                properties: {
                  activeSessions: { type: 'integer' },
                  requestsAllowed: { type: 'integer' },
                  requestsBlocked: { type: 'integer' }
                }
              }
            }
          },
          timestamp: {
            type: 'string',
            format: 'date-time'
          }
        }
      },

      // Document Analysis Schema
      DocumentAnalysisRequest: {
        type: 'object',
        required: ['documentText', 'documentType'],
        properties: {
          documentText: {
            type: 'string',
            description: 'Text content of the document to analyze',
            maxLength: 50000
          },
          documentType: {
            type: 'string',
            enum: ['tenancy_agreement', 'employment_contract', 'consumer_contract', 'legal_notice', 'debt_letter'],
            description: 'Type of legal document'
          },
          analysisType: {
            type: 'string',
            enum: ['key_terms', 'red_flags', 'validity', 'response_options', 'consumer_rights'],
            description: 'Type of analysis to perform'
          }
        }
      },

      DocumentAnalysisResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          analysis: {
            type: 'object',
            properties: {
              documentType: { type: 'string' },
              analysisType: { type: 'string' },
              findings: {
                type: 'object',
                properties: {
                  summary: { type: 'string' },
                  keyPoints: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  risks: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  recommendations: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                }
              },
              confidence: { type: 'number' },
              riskLevel: { type: 'string' }
            }
          }
        }
      },

      // Template Generation Schema
      TemplateGenerationRequest: {
        type: 'object',
        required: ['templateType', 'formData'],
        properties: {
          templateType: {
            type: 'string',
            enum: ['complaint_letter', 'landlord_communication', 'employment_grievance', 'debt_response'],
            description: 'Type of legal template to generate'
          },
          formData: {
            type: 'object',
            description: 'Form data to populate the template',
            properties: {
              recipientName: { type: 'string' },
              senderName: { type: 'string' },
              date: { type: 'string' },
              subject: { type: 'string' },
              details: { type: 'string' }
            }
          }
        }
      },

      TemplateGenerationResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          template: {
            type: 'object',
            properties: {
              templateType: { type: 'string' },
              content: { type: 'string' },
              formData: { type: 'object' },
              generatedAt: { type: 'string', format: 'date-time' },
              disclaimer: { type: 'boolean' }
            }
          }
        }
      },

      // Rate Limiting Schema
      RateLimitInfo: {
        type: 'object',
        properties: {
          allowed: { type: 'boolean' },
          waitTime: { type: 'integer' },
          limits: {
            type: 'object',
            properties: {
              minute: {
                type: 'object',
                properties: {
                  current: { type: 'integer' },
                  limit: { type: 'integer' },
                  remaining: { type: 'integer' },
                  resetTime: { type: 'string', format: 'date-time' }
                }
              },
              hour: {
                type: 'object',
                properties: {
                  current: { type: 'integer' },
                  limit: { type: 'integer' },
                  remaining: { type: 'integer' },
                  resetTime: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        }
      }
    };
  }

  /**
   * Define reusable responses
   */
  defineResponses() {
    this.openAPISpec.components.responses = {
      SuccessfulLegalResponse: {
        description: 'Successful legal information response',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/LegalAIResponse' }
          }
        }
      },

      ErrorResponse: {
        description: 'Error response',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      },

      RateLimitExceeded: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/ErrorResponse' },
                {
                  type: 'object',
                  properties: {
                    rateLimitInfo: { $ref: '#/components/schemas/RateLimitInfo' }
                  }
                }
              ]
            }
          }
        }
      },

      ServiceUnavailable: {
        description: 'AI service temporarily unavailable',
        content: {
          'application/json': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/ErrorResponse' },
                {
                  type: 'object',
                  properties: {
                    circuitBreakerOpen: { type: 'boolean' },
                    nextAttempt: { type: 'string', format: 'date-time' }
                  }
                }
              ]
            }
          }
        }
      }
    };
  }

  /**
   * Define reusable parameters
   */
  defineParameters() {
    this.openAPISpec.components.parameters = {
      SessionId: {
        name: 'sessionId',
        in: 'header',
        description: 'Session identifier for conversation context',
        schema: { type: 'string' },
        example: 'session_1234567890'
      },

      Domain: {
        name: 'domain',
        in: 'query',
        description: 'Legal domain for specialized handling',
        schema: {
          type: 'string',
          enum: ['LANDLORD_TENANT', 'CONSUMER_RIGHTS', 'EMPLOYMENT_RIGHTS', 'FAMILY_LAW', 'DEBT_FINANCE', 'GENERAL']
        }
      }
    };
  }

  /**
   * Define API paths and operations
   */
  definePaths() {
    this.openAPISpec.paths = {
      '/api/ai/chat': {
        post: {
          tags: ['AI Chat'],
          summary: 'Generate AI-powered legal information response',
          description: 'Submit a legal query and receive AI-generated information and guidance',
          operationId: 'generateLegalResponse',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LegalQueryRequest' },
                examples: {
                  landlordTenant: {
                    summary: 'Landlord-Tenant Query',
                    value: {
                      query: 'My landlord is trying to evict me without proper notice. What are my rights as a tenant?',
                      sessionId: 'session_lt_001',
                      domain: 'LANDLORD_TENANT',
                      options: {
                        temperature: 0.7,
                        maxTokens: 2048
                      }
                    }
                  },
                  consumerRights: {
                    summary: 'Consumer Rights Query',
                    value: {
                      query: 'I bought a faulty product online and the company is refusing to give me a refund. What can I do?',
                      sessionId: 'session_cr_001',
                      domain: 'CONSUMER_RIGHTS'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': { $ref: '#/components/responses/SuccessfulLegalResponse' },
            '400': { $ref: '#/components/responses/ErrorResponse' },
            '429': { $ref: '#/components/responses/RateLimitExceeded' },
            '503': { $ref: '#/components/responses/ServiceUnavailable' }
          }
        }
      },

      '/api/ai/health': {
        get: {
          tags: ['Health'],
          summary: 'Get system health status',
          description: 'Check the health status of all system components',
          operationId: 'getHealthStatus',
          responses: {
            '200': {
              description: 'System health information',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      health: { $ref: '#/components/schemas/HealthStatus' }
                    }
                  }
                }
              }
            },
            '500': { $ref: '#/components/responses/ErrorResponse' }
          }
        }
      },

      '/api/ai/test-connection': {
        get: {
          tags: ['Health'],
          summary: 'Test AI service connection',
          description: 'Test connectivity to the AI service (Ollama)',
          operationId: 'testConnection',
          responses: {
            '200': {
              description: 'Connection test result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      connection: {
                        type: 'object',
                        properties: {
                          connected: { type: 'boolean' },
                          responseTime: { type: 'integer' },
                          availableModels: {
                            type: 'array',
                            items: { type: 'string' }
                          }
                        }
                      },
                      timestamp: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            },
            '500': { $ref: '#/components/responses/ErrorResponse' }
          }
        }
      },

      '/api/ai/analyze-document': {
        post: {
          tags: ['Document Analysis'],
          summary: 'Analyze legal document',
          description: 'Submit a legal document for AI-powered analysis',
          operationId: 'analyzeDocument',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DocumentAnalysisRequest' },
                examples: {
                  tenancyAgreement: {
                    summary: 'Tenancy Agreement Analysis',
                    value: {
                      documentText: 'This tenancy agreement is made between...',
                      documentType: 'tenancy_agreement',
                      analysisType: 'key_terms'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Document analysis completed',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/DocumentAnalysisResponse' }
                }
              }
            },
            '400': { $ref: '#/components/responses/ErrorResponse' },
            '503': { $ref: '#/components/responses/ServiceUnavailable' }
          }
        }
      },

      '/api/ai/generate-template': {
        post: {
          tags: ['Template Generation'],
          summary: 'Generate legal document template',
          description: 'Generate a legal document template based on provided data',
          operationId: 'generateTemplate',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TemplateGenerationRequest' },
                examples: {
                  complaintLetter: {
                    summary: 'Consumer Complaint Letter',
                    value: {
                      templateType: 'complaint_letter',
                      formData: {
                        recipientName: 'ABC Company Ltd',
                        senderName: 'John Smith',
                        subject: 'Faulty Product Refund Request',
                        details: 'Product stopped working after 2 weeks'
                      }
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Template generated successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/TemplateGenerationResponse' }
                }
              }
            },
            '400': { $ref: '#/components/responses/ErrorResponse' },
            '503': { $ref: '#/components/responses/ServiceUnavailable' }
          }
        }
      },

      '/api/ai/clear-session': {
        delete: {
          tags: ['AI Chat'],
          summary: 'Clear session context',
          description: 'Clear conversation context for a specific session',
          operationId: 'clearSession',
          parameters: [
            {
              name: 'sessionId',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              description: 'Session ID to clear'
            }
          ],
          responses: {
            '200': {
              description: 'Session cleared successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string' }
                    }
                  }
                }
              }
            },
            '400': { $ref: '#/components/responses/ErrorResponse' }
          }
        }
      },

      '/api/ai/metrics': {
        get: {
          tags: ['Health'],
          summary: 'Get API usage metrics',
          description: 'Retrieve system performance and usage metrics',
          operationId: 'getMetrics',
          responses: {
            '200': {
              description: 'System metrics',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      metrics: {
                        type: 'object',
                        properties: {
                          totalRequests: { type: 'integer' },
                          successfulRequests: { type: 'integer' },
                          failedRequests: { type: 'integer' },
                          averageResponseTime: { type: 'number' },
                          uptime: { type: 'integer' },
                          rateLimiter: { $ref: '#/components/schemas/RateLimitInfo' },
                          circuitBreaker: {
                            type: 'object',
                            properties: {
                              state: { type: 'string' },
                              openings: { type: 'integer' },
                              closings: { type: 'integer' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
  }

  /**
   * Generate OpenAPI specification JSON
   */
  generateOpenAPISpec() {
    return JSON.stringify(this.openAPISpec, null, 2);
  }

  /**
   * Generate HTML documentation
   */
  generateHTMLDocumentation() {
    return `<!DOCTYPE html>
<html>
<head>
  <title>Justice Companion API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@3.25.0/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>

  <script src="https://unpkg.com/swagger-ui-dist@3.25.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@3.25.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        spec: ${this.generateOpenAPISpec()},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;
  }

  /**
   * Generate Markdown documentation
   */
  generateMarkdownDocumentation() {
    return `# Justice Companion API Documentation

## Overview

The Justice Companion API provides AI-powered legal information and assistance services. This RESTful API enables users to submit legal queries, analyze documents, and generate legal templates while maintaining appropriate boundaries between information and legal advice.

## Base URL

- **Development**: \`http://localhost:11434\`
- **Production**: \`https://api.justice-companion.org\`

## Authentication

Currently, no authentication is required for API access. Rate limiting is applied based on session ID and IP address.

## Rate Limiting

The API implements intelligent rate limiting with legal domain prioritization:

- **General requests**: 30 per minute, 300 per hour, 1000 per day
- **Emergency legal situations**: Higher priority and increased limits
- **Burst requests**: Up to 5 requests in 5 seconds for priority domains

Rate limit headers are included in all responses:
- \`X-RateLimit-Limit\`: Request limit for the current window
- \`X-RateLimit-Remaining\`: Number of requests left
- \`X-RateLimit-Reset\`: Time when the limit resets

## Error Handling

All API endpoints return errors in a consistent format:

\`\`\`json
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
\`\`\`

### Common Error Codes

- \`RATE_LIMIT_EXCEEDED\`: Too many requests (HTTP 429)
- \`SERVICE_UNAVAILABLE\`: AI service temporarily down (HTTP 503)
- \`INVALID_INPUT\`: Request validation failed (HTTP 400)
- \`CIRCUIT_BREAKER_OPEN\`: Service protection active (HTTP 503)

## Legal Domains

The API recognizes the following legal domains for specialized handling:

- \`LANDLORD_TENANT\`: Housing and tenancy law
- \`CONSUMER_RIGHTS\`: Consumer protection and rights
- \`EMPLOYMENT_RIGHTS\`: Employment law and workplace issues
- \`FAMILY_LAW\`: Family and domestic relations law
- \`DEBT_FINANCE\`: Debt management and financial law
- \`GENERAL\`: General legal information

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

\`\`\`bash
curl -X POST http://localhost:11434/api/ai/chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "My landlord is trying to evict me without proper notice. What are my rights?",
    "domain": "LANDLORD_TENANT",
    "sessionId": "session_123"
  }'
\`\`\`

### Document Analysis

\`\`\`bash
curl -X POST http://localhost:11434/api/ai/analyze-document \\
  -H "Content-Type: application/json" \\
  -d '{
    "documentText": "This tenancy agreement...",
    "documentType": "tenancy_agreement",
    "analysisType": "key_terms"
  }'
\`\`\`

### Health Check

\`\`\`bash
curl http://localhost:11434/api/ai/health
\`\`\`

## Support

For technical support or questions about the API:

- **Documentation**: View this documentation
- **Issues**: Report issues on GitHub
- **Email**: support@justice-companion.org

## Legal Notice

This API provides general legal information only. It does not constitute legal advice. Users should consult with qualified legal professionals for advice specific to their situations.

---

*Generated on ${new Date().toISOString()}*
`;
  }

  /**
   * Save documentation files
   */
  async saveDocumentation(outputDir) {
    try {
      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });

      // Save OpenAPI specification
      await fs.writeFile(
        path.join(outputDir, 'openapi.json'),
        this.generateOpenAPISpec()
      );

      // Save HTML documentation
      await fs.writeFile(
        path.join(outputDir, 'api-docs.html'),
        this.generateHTMLDocumentation()
      );

      // Save Markdown documentation
      await fs.writeFile(
        path.join(outputDir, 'API.md'),
        this.generateMarkdownDocumentation()
      );

      return {
        success: true,
        files: [
          path.join(outputDir, 'openapi.json'),
          path.join(outputDir, 'api-docs.html'),
          path.join(outputDir, 'API.md')
        ]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate OpenAPI specification
   */
  validateSpecification() {
    const validation = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Basic validation checks
    if (!this.openAPISpec.info.title) {
      validation.errors.push('Missing API title');
      validation.valid = false;
    }

    if (!this.openAPISpec.info.version) {
      validation.errors.push('Missing API version');
      validation.valid = false;
    }

    if (Object.keys(this.openAPISpec.paths).length === 0) {
      validation.errors.push('No API paths defined');
      validation.valid = false;
    }

    // Check for unused schemas
    const usedSchemas = new Set();
    const allSchemas = Object.keys(this.openAPISpec.components.schemas);

    JSON.stringify(this.openAPISpec.paths).replace(
      /\$ref.*?#\/components\/schemas\/([^"]+)/g,
      (match, schemaName) => {
        usedSchemas.add(schemaName);
        return match;
      }
    );

    const unusedSchemas = allSchemas.filter(schema => !usedSchemas.has(schema));
    if (unusedSchemas.length > 0) {
      validation.warnings.push(`Unused schemas: ${unusedSchemas.join(', ')}`);
    }

    return validation;
  }

  /**
   * Generate API changelog
   */
  generateChangelog() {
    return `# Justice Companion API Changelog

## Version 1.0.0 (${new Date().toISOString().split('T')[0]})

### Added
- Initial API implementation
- AI-powered legal information endpoints
- Document analysis services
- Template generation capabilities
- Rate limiting with legal domain prioritization
- Circuit breaker protection
- Comprehensive health monitoring
- Legal safety validation
- Emergency situation detection
- Multi-model AI support

### Security
- Input validation and sanitization
- Content safety filtering
- Legal information vs. advice safeguards
- Emergency contact integration
- Session-based rate limiting

### Documentation
- Complete OpenAPI 3.0 specification
- Interactive Swagger UI documentation
- Comprehensive API guide
- Usage examples and best practices
- Legal compliance guidelines

### Performance
- Intelligent caching system
- Connection pooling
- Response time optimization
- Resource usage monitoring
- Automatic scaling capabilities
`;
  }
}

module.exports = APIDocumentation;