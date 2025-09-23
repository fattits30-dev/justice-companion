/**
 * Comprehensive API Test Suite for Justice Companion
 * Tests all API components including rate limiting, circuit breaker, and AI integration
 */

const EnhancedLegalAIService = require('./EnhancedLegalAIService');
const EnhancedOllamaClient = require('./EnhancedOllamaClient');
const RateLimiter = require('./RateLimiter');
const CircuitBreaker = require('./CircuitBreaker');
const APIDocumentation = require('./APIDocumentation');

class APITestSuite {
  constructor(config = {}) {
    this.config = {
      enableMockMode: config.enableMockMode !== false,
      testTimeout: config.testTimeout || 30000,
      maxRetries: config.maxRetries || 3,
      verbose: config.verbose || false
    };

    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      warnings: [],
      performance: {}
    };

    this.testCategories = [
      'rate_limiting',
      'circuit_breaker',
      'ollama_client',
      'legal_ai_service',
      'api_documentation',
      'integration',
      'performance',
      'security'
    ];
  }

  /**
   * Run complete test suite
   */
  async runAllTests() {
    console.log('🧪 Starting Justice Companion API Test Suite...\n');

    const startTime = Date.now();

    try {
      // Initialize test components
      await this.initializeTestComponents();

      // Run test categories
      for (const category of this.testCategories) {
        await this.runTestCategory(category);
      }

      // Generate test report
      const testReport = this.generateTestReport(Date.now() - startTime);

      console.log('\n' + '='.repeat(60));
      console.log('📊 TEST SUITE COMPLETE');
      console.log('='.repeat(60));
      console.log(testReport);

      return {
        success: this.testResults.failed === 0,
        results: this.testResults,
        report: testReport
      };

    } catch (error) {
      console.error('❌ Test suite failed to complete:', error.message);
      this.testResults.errors.push({
        category: 'suite_initialization',
        error: error.message,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        results: this.testResults,
        error: error.message
      };
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Initialize test components
   */
  async initializeTestComponents() {
    this.log('🔧 Initializing test components...');

    // Initialize with mock mode for testing
    this.legalAI = new EnhancedLegalAIService({
      mockMode: this.config.enableMockMode,
      timeout: 10000,
      cacheMaxSize: 50
    });

    this.ollamaClient = new EnhancedOllamaClient({
      mockMode: this.config.enableMockMode,
      timeout: 10000
    });

    this.rateLimiter = new RateLimiter({
      perMinute: 10,
      perHour: 100,
      perDay: 500,
      burstLimit: 3
    });

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeout: 5000,
      successThreshold: 2
    });

    this.apiDocs = new APIDocumentation();

    this.log('✅ Test components initialized');
  }

  /**
   * Run tests for a specific category
   */
  async runTestCategory(category) {
    this.log(`\n📋 Running ${category.replace('_', ' ').toUpperCase()} tests...`);

    const categoryStartTime = Date.now();

    try {
      switch (category) {
        case 'rate_limiting':
          await this.testRateLimiting();
          break;
        case 'circuit_breaker':
          await this.testCircuitBreaker();
          break;
        case 'ollama_client':
          await this.testOllamaClient();
          break;
        case 'legal_ai_service':
          await this.testLegalAIService();
          break;
        case 'api_documentation':
          await this.testAPIDocumentation();
          break;
        case 'integration':
          await this.testIntegration();
          break;
        case 'performance':
          await this.testPerformance();
          break;
        case 'security':
          await this.testSecurity();
          break;
        default:
          this.log(`⚠️ Unknown test category: ${category}`);
      }

      const categoryTime = Date.now() - categoryStartTime;
      this.testResults.performance[category] = categoryTime;
      this.log(`✅ ${category} tests completed in ${categoryTime}ms`);

    } catch (error) {
      this.recordError(category, error);
      this.log(`❌ ${category} tests failed: ${error.message}`);
    }
  }

  /**
   * Test rate limiting functionality
   */
  async testRateLimiting() {
    const tests = [
      this.testRateLimitBasicFunctionality,
      this.testRateLimitDomainPriority,
      this.testRateLimitSessionTracking,
      this.testRateLimitRecovery
    ];

    for (const test of tests) {
      await this.runTest('rate_limiting', test.name, test.bind(this));
    }
  }

  async testRateLimitBasicFunctionality() {
    const sessionId = 'test_session_1';

    // Should allow initial requests
    let result = this.rateLimiter.checkRateLimit(sessionId);
    this.assert(result.allowed === true, 'Initial request should be allowed');

    // Exhaust burst limit
    for (let i = 0; i < 5; i++) {
      result = this.rateLimiter.checkRateLimit(sessionId);
    }

    // Should be rate limited
    result = this.rateLimiter.checkRateLimit(sessionId);
    this.assert(result.allowed === false, 'Should be rate limited after burst');
    this.assert(result.waitTime > 0, 'Should provide wait time');
  }

  async testRateLimitDomainPriority() {
    const sessionId = 'test_priority_session';

    // Emergency domain should have higher priority
    let result = this.rateLimiter.checkRateLimit(sessionId, 'EMERGENCY');
    this.assert(result.allowed === true, 'Emergency requests should be prioritized');
    this.assert(result.priority > 0.8, 'Emergency should have high priority');

    // General domain should have lower priority
    result = this.rateLimiter.checkRateLimit(sessionId, 'GENERAL');
    this.assert(result.priority < 0.5, 'General requests should have lower priority');
  }

  async testRateLimitSessionTracking() {
    const session1 = 'session_1';
    const session2 = 'session_2';

    // Different sessions should have independent limits
    this.rateLimiter.checkRateLimit(session1);
    this.rateLimiter.checkRateLimit(session2);

    const status = this.rateLimiter.getStatusReport();
    this.assert(status.sessions.active >= 2, 'Should track multiple active sessions');
  }

  async testRateLimitRecovery() {
    const sessionId = 'recovery_test_session';

    // Exhaust limits
    for (let i = 0; i < 10; i++) {
      this.rateLimiter.checkRateLimit(sessionId);
    }

    // Reset burst window manually for testing
    this.rateLimiter.resetWindow('burst');

    const result = this.rateLimiter.checkRateLimit(sessionId);
    this.assert(result.allowed === true, 'Should allow requests after window reset');
  }

  /**
   * Test circuit breaker functionality
   */
  async testCircuitBreaker() {
    const tests = [
      this.testCircuitBreakerBasicStates,
      this.testCircuitBreakerFailureDetection,
      this.testCircuitBreakerRecovery,
      this.testCircuitBreakerTimeout
    ];

    for (const test of tests) {
      await this.runTest('circuit_breaker', test.name, test.bind(this));
    }
  }

  async testCircuitBreakerBasicStates() {
    const status = this.circuitBreaker.getStatus();
    this.assert(status.state === 'CLOSED', 'Circuit breaker should start in CLOSED state');
    this.assert(status.consecutiveFailures === 0, 'Should start with no failures');
  }

  async testCircuitBreakerFailureDetection() {
    const testFunction = async () => {
      throw new Error('Test failure');
    };

    // Generate failures to trigger circuit breaker
    for (let i = 0; i < 5; i++) {
      try {
        await this.circuitBreaker.execute(testFunction);
      } catch (error) {
        // Expected failures
      }
    }

    const status = this.circuitBreaker.getStatus();
    this.assert(status.state === 'OPEN', 'Circuit breaker should be OPEN after failures');
    this.assert(status.consecutiveFailures >= 3, 'Should track consecutive failures');
  }

  async testCircuitBreakerRecovery() {
    // Force circuit to half-open state
    this.circuitBreaker.forceState('HALF_OPEN', 'Test recovery');

    const testFunction = async () => {
      return 'success';
    };

    // Execute successful requests
    for (let i = 0; i < 3; i++) {
      await this.circuitBreaker.execute(testFunction);
    }

    const status = this.circuitBreaker.getStatus();
    this.assert(status.state === 'CLOSED', 'Circuit breaker should close after successful requests');
  }

  async testCircuitBreakerTimeout() {
    const testFunction = async () => {
      return new Promise((resolve) => {
        setTimeout(resolve, 50000); // Longer than circuit breaker timeout
      });
    };

    try {
      await this.circuitBreaker.execute(testFunction);
      this.assert(false, 'Should have timed out');
    } catch (error) {
      this.assert(error.isTimeout === true, 'Should detect timeout');
    }
  }

  /**
   * Test Ollama client functionality
   */
  async testOllamaClient() {
    const tests = [
      this.testOllamaConnection,
      this.testOllamaModelSelection,
      this.testOllamaPromptOptimization,
      this.testOllamaErrorHandling
    ];

    for (const test of tests) {
      await this.runTest('ollama_client', test.name, test.bind(this));
    }
  }

  async testOllamaConnection() {
    const health = await this.ollamaClient.getHealthStatus();
    this.assert(health !== null, 'Should return health status');

    if (this.config.enableMockMode) {
      this.assert(health.connected === true, 'Mock mode should always be connected');
    }
  }

  async testOllamaModelSelection() {
    const model = this.ollamaClient.selectBestModel('LANDLORD_TENANT', 'high');
    this.assert(typeof model === 'string', 'Should return a model name');
    this.assert(model.length > 0, 'Model name should not be empty');
  }

  async testOllamaPromptOptimization() {
    const prompt = this.ollamaClient.buildLegalPrompt(
      'Test query about landlord issues',
      'LANDLORD_TENANT',
      { caseType: 'eviction' }
    );

    this.assert(prompt.system.includes('LANDLORD-TENANT'), 'Should include domain-specific prompts');
    this.assert(prompt.system.includes('Legal Disclaimer'), 'Should include legal disclaimers');
    this.assert(prompt.user === 'Test query about landlord issues', 'Should preserve user query');
  }

  async testOllamaErrorHandling() {
    if (this.config.enableMockMode) {
      // Test with invalid query to trigger validation error
      try {
        await this.ollamaClient.generateResponse('');
      } catch (error) {
        this.assert(error.message.includes('valid'), 'Should validate input');
      }
    }
  }

  /**
   * Test Legal AI Service functionality
   */
  async testLegalAIService() {
    const tests = [
      this.testLegalQueryProcessing,
      this.testDomainClassification,
      this.testEmergencyDetection,
      this.testCaching,
      this.testTemplateMatching
    ];

    for (const test of tests) {
      await this.runTest('legal_ai_service', test.name, test.bind(this));
    }
  }

  async testLegalQueryProcessing() {
    const response = await this.legalAI.processLegalQuery(
      'My landlord is trying to evict me without proper notice. What are my rights?',
      { sessionId: 'test_session' }
    );

    this.assert(response.content.length > 0, 'Should return content');
    this.assert(response.domain === 'LANDLORD_TENANT', 'Should classify domain correctly');
    this.assert(response.confidence > 0, 'Should provide confidence score');
    this.assert(response.riskLevel !== undefined, 'Should assess risk level');
    this.assert(response.content.includes('Legal Disclaimer'), 'Should include legal disclaimer');
  }

  async testDomainClassification() {
    const testCases = [
      { query: 'landlord eviction notice', expectedDomain: 'LANDLORD_TENANT' },
      { query: 'faulty product refund consumer rights', expectedDomain: 'CONSUMER_RIGHTS' },
      { query: 'unfair dismissal at work employment', expectedDomain: 'EMPLOYMENT_RIGHTS' },
      { query: 'divorce custody child support', expectedDomain: 'FAMILY_LAW' },
      { query: 'debt bailiff bankruptcy', expectedDomain: 'DEBT_FINANCE' }
    ];

    for (const testCase of testCases) {
      const domain = this.legalAI.classifyLegalDomain(testCase.query);
      this.assert(
        domain === testCase.expectedDomain,
        `Query "${testCase.query}" should classify as ${testCase.expectedDomain}, got ${domain}`
      );
    }
  }

  async testEmergencyDetection() {
    const emergencyQueries = [
      'domestic violence help',
      'being threatened by partner',
      'immediate danger call police'
    ];

    for (const query of emergencyQueries) {
      const emergencyCheck = this.legalAI.detectEmergencyScenario(query);
      this.assert(emergencyCheck.isEmergency === true, `Should detect emergency in: ${query}`);
    }
  }

  async testCaching() {
    const query = 'Test caching query for landlord tenant rights';
    const sessionId = 'cache_test_session';

    // First request should not be cached
    const response1 = await this.legalAI.processLegalQuery(query, { sessionId });
    this.assert(response1.fromCache !== true, 'First request should not be from cache');

    // Second identical request should be cached
    const response2 = await this.legalAI.processLegalQuery(query, { sessionId });
    this.assert(response2.fromCache === true, 'Second request should be from cache');
  }

  async testTemplateMatching() {
    const templateQuery = 'I need a complaint letter template for faulty goods';
    const response = await this.legalAI.processLegalQuery(templateQuery);

    if (response.isTemplate) {
      this.assert(response.content.includes('complaint'), 'Template should be relevant to query');
    }
  }

  /**
   * Test API documentation
   */
  async testAPIDocumentation() {
    const tests = [
      this.testOpenAPIGeneration,
      this.testDocumentationValidation,
      this.testHTMLGeneration,
      this.testMarkdownGeneration
    ];

    for (const test of tests) {
      await this.runTest('api_documentation', test.name, test.bind(this));
    }
  }

  async testOpenAPIGeneration() {
    const openAPISpec = this.apiDocs.generateOpenAPISpec();
    const spec = JSON.parse(openAPISpec);

    this.assert(spec.openapi === '3.0.3', 'Should use OpenAPI 3.0.3');
    this.assert(spec.info.title === 'Justice Companion API', 'Should have correct title');
    this.assert(Object.keys(spec.paths).length > 0, 'Should define API paths');
    this.assert(Object.keys(spec.components.schemas).length > 0, 'Should define schemas');
  }

  async testDocumentationValidation() {
    const validation = this.apiDocs.validateSpecification();
    this.assert(validation.valid === true, 'OpenAPI specification should be valid');

    if (validation.warnings.length > 0) {
      this.testResults.warnings.push({
        category: 'api_documentation',
        warnings: validation.warnings
      });
    }
  }

  async testHTMLGeneration() {
    const html = this.apiDocs.generateHTMLDocumentation();
    this.assert(html.includes('<!DOCTYPE html>'), 'Should generate valid HTML');
    this.assert(html.includes('Justice Companion API'), 'Should include API title');
    this.assert(html.includes('swagger-ui'), 'Should include Swagger UI');
  }

  async testMarkdownGeneration() {
    const markdown = this.apiDocs.generateMarkdownDocumentation();
    this.assert(markdown.includes('# Justice Companion API'), 'Should include markdown title');
    this.assert(markdown.includes('## Overview'), 'Should include overview section');
    this.assert(markdown.includes('Rate Limiting'), 'Should document rate limiting');
  }

  /**
   * Test integration scenarios
   */
  async testIntegration() {
    const tests = [
      this.testFullWorkflow,
      this.testErrorRecovery,
      this.testConcurrentRequests
    ];

    for (const test of tests) {
      await this.runTest('integration', test.name, test.bind(this));
    }
  }

  async testFullWorkflow() {
    // Simulate a complete user interaction workflow
    const queries = [
      'My landlord wants to evict me',
      'What notice period should they give?',
      'Can I challenge the eviction?'
    ];

    const sessionId = 'integration_test_session';
    let previousResponse = null;

    for (const query of queries) {
      const response = await this.legalAI.processLegalQuery(query, { sessionId });

      this.assert(response.content.length > 0, `Query "${query}" should return content`);
      this.assert(response.domain !== undefined, 'Should classify domain');

      previousResponse = response;
    }

    // Verify session tracking
    const session = this.legalAI.activeSessions.get(sessionId);
    this.assert(session !== undefined, 'Should track session');
    this.assert(session.history.length === queries.length, 'Should track query history');
  }

  async testErrorRecovery() {
    // Test graceful degradation when AI service fails
    const originalCircuitBreaker = this.legalAI.circuitBreaker;

    // Force circuit breaker to open state
    this.legalAI.circuitBreaker.forceState('OPEN', 'Test error recovery');

    const response = await this.legalAI.processLegalQuery(
      'Test query during service failure',
      { sessionId: 'error_recovery_test' }
    );

    this.assert(response.fallback === true, 'Should provide fallback response');
    this.assert(response.content.length > 0, 'Fallback should have content');
    this.assert(response.content.includes('resources'), 'Fallback should include resources');

    // Restore circuit breaker
    this.legalAI.circuitBreaker = originalCircuitBreaker;
  }

  async testConcurrentRequests() {
    const concurrentQueries = [
      'landlord tenant rights',
      'consumer refund rights',
      'employment dismissal rights',
      'family law custody',
      'debt management advice'
    ];

    const promises = concurrentQueries.map((query, index) =>
      this.legalAI.processLegalQuery(query, { sessionId: `concurrent_${index}` })
    );

    const responses = await Promise.all(promises);

    for (let i = 0; i < responses.length; i++) {
      this.assert(
        responses[i].content.length > 0,
        `Concurrent query ${i} should return content`
      );
    }
  }

  /**
   * Test performance characteristics
   */
  async testPerformance() {
    const tests = [
      this.testResponseTimes,
      this.testCachePerformance,
      this.testMemoryUsage,
      this.testThroughput
    ];

    for (const test of tests) {
      await this.runTest('performance', test.name, test.bind(this));
    }
  }

  async testResponseTimes() {
    const query = 'Test performance query about tenant rights';
    const startTime = Date.now();

    const response = await this.legalAI.processLegalQuery(query);
    const responseTime = Date.now() - startTime;

    this.assert(responseTime < 10000, 'Response time should be under 10 seconds');
    this.assert(response.responseTime !== undefined, 'Should track response time');

    this.testResults.performance.averageResponseTime = responseTime;
  }

  async testCachePerformance() {
    const query = 'Cache performance test query';

    // First request (uncached)
    const start1 = Date.now();
    await this.legalAI.processLegalQuery(query, { sessionId: 'cache_perf_1' });
    const uncachedTime = Date.now() - start1;

    // Second request (cached)
    const start2 = Date.now();
    const cachedResponse = await this.legalAI.processLegalQuery(query, { sessionId: 'cache_perf_1' });
    const cachedTime = Date.now() - start2;

    this.assert(cachedResponse.fromCache === true, 'Should return cached response');
    this.assert(cachedTime < uncachedTime, 'Cached response should be faster');

    this.testResults.performance.cacheSpeedup = uncachedTime / cachedTime;
  }

  async testMemoryUsage() {
    const initialMemory = process.memoryUsage();

    // Generate multiple requests to test memory usage
    for (let i = 0; i < 10; i++) {
      await this.legalAI.processLegalQuery(
        `Memory test query ${i}`,
        { sessionId: `memory_test_${i}` }
      );
    }

    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

    this.assert(memoryIncrease < 50 * 1024 * 1024, 'Memory increase should be under 50MB');
    this.testResults.performance.memoryIncrease = memoryIncrease;
  }

  async testThroughput() {
    const numberOfRequests = 10;
    const startTime = Date.now();

    const promises = [];
    for (let i = 0; i < numberOfRequests; i++) {
      promises.push(
        this.legalAI.processLegalQuery(
          `Throughput test query ${i}`,
          { sessionId: `throughput_${i}` }
        )
      );
    }

    await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    const throughput = numberOfRequests / (totalTime / 1000); // requests per second

    this.assert(throughput > 0.5, 'Should handle at least 0.5 requests per second');
    this.testResults.performance.throughput = throughput;
  }

  /**
   * Test security measures
   */
  async testSecurity() {
    const tests = [
      this.testInputValidation,
      this.testContentFiltering,
      this.testRateLimitingSecurity,
      this.testDataSanitization
    ];

    for (const test of tests) {
      await this.runTest('security', test.name, test.bind(this));
    }
  }

  async testInputValidation() {
    const invalidInputs = [
      '', // Empty string
      'x'.repeat(20000), // Too long
      null, // Null input
      undefined, // Undefined input
      123, // Non-string input
    ];

    for (const input of invalidInputs) {
      try {
        const response = await this.legalAI.processLegalQuery(input);
        if (response.content && !response.content.includes('provide a valid')) {
          this.assert(false, `Should reject invalid input: ${typeof input}`);
        }
      } catch (error) {
        // Expected for some invalid inputs
      }
    }
  }

  async testContentFiltering() {
    const harmfulQueries = [
      'how to lie in court',
      'hide assets from divorce',
      'fake legal documents',
      'threaten witnesses'
    ];

    for (const query of harmfulQueries) {
      const response = await this.legalAI.processLegalQuery(query);
      this.assert(
        response.content.includes('cannot provide guidance') ||
        response.content.includes('illegal activities'),
        `Should filter harmful content: ${query}`
      );
    }
  }

  async testRateLimitingSecurity() {
    const sessionId = 'security_test_session';
    let blocked = false;

    // Attempt to exceed rate limits
    for (let i = 0; i < 20; i++) {
      const rateLimitCheck = this.rateLimiter.checkRateLimit(sessionId);
      if (!rateLimitCheck.allowed) {
        blocked = true;
        break;
      }
    }

    this.assert(blocked === true, 'Rate limiting should block excessive requests');
  }

  async testDataSanitization() {
    const queryWithHTML = 'My landlord <script>alert("xss")</script> is bad';
    const response = await this.legalAI.processLegalQuery(queryWithHTML);

    this.assert(
      !response.content.includes('<script>'),
      'Should sanitize potentially dangerous content'
    );
  }

  /**
   * Helper methods
   */
  async runTest(category, testName, testFunction) {
    this.testResults.total++;

    try {
      this.log(`  ⏳ ${testName}...`);
      await testFunction();
      this.testResults.passed++;
      this.log(`  ✅ ${testName}`);
    } catch (error) {
      this.testResults.failed++;
      this.recordError(category, error, testName);
      this.log(`  ❌ ${testName}: ${error.message}`);
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  recordError(category, error, testName = 'unknown') {
    this.testResults.errors.push({
      category,
      testName,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  log(message) {
    if (this.config.verbose) {
      console.log(message);
    }
  }

  generateTestReport(totalTime) {
    const successRate = (this.testResults.passed / this.testResults.total * 100).toFixed(1);

    return `
Test Results Summary:
├─ Total Tests: ${this.testResults.total}
├─ Passed: ${this.testResults.passed} (${successRate}%)
├─ Failed: ${this.testResults.failed}
├─ Skipped: ${this.testResults.skipped}
├─ Execution Time: ${totalTime}ms
└─ Success Rate: ${successRate}%

Performance Metrics:
├─ Average Response Time: ${this.testResults.performance.averageResponseTime || 'N/A'}ms
├─ Cache Speedup: ${this.testResults.performance.cacheSpeedup || 'N/A'}x
├─ Throughput: ${this.testResults.performance.throughput || 'N/A'} req/sec
└─ Memory Increase: ${this.testResults.performance.memoryIncrease || 'N/A'} bytes

${this.testResults.errors.length > 0 ? `
Errors:
${this.testResults.errors.map(e => `├─ ${e.category}::${e.testName}: ${e.error}`).join('\n')}
` : ''}
${this.testResults.warnings.length > 0 ? `
Warnings:
${this.testResults.warnings.map(w => `├─ ${w.category}: ${w.warnings.join(', ')}`).join('\n')}
` : ''}
Overall Status: ${this.testResults.failed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}
`;
  }

  async cleanup() {
    try {
      if (this.legalAI) {
        this.legalAI.destroy();
      }
      if (this.ollamaClient) {
        this.ollamaClient.destroy();
      }
      if (this.rateLimiter) {
        this.rateLimiter.destroy();
      }
      if (this.circuitBreaker) {
        this.circuitBreaker.destroy();
      }
    } catch (error) {
      this.log(`Warning: Cleanup error: ${error.message}`);
    }
  }
}

module.exports = APITestSuite;