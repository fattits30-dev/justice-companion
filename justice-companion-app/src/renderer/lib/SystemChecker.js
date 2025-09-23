// System Requirements & Version Checker for Justice Companion
// ULTRA-THINK mode comprehensive validation
// Built from pain, powered by truth
// PHASE 1.2: Structured Logging Integration

class SystemChecker {
  constructor() {
    this.requirements = {
      node: '>=18.0.0',
      electron: '>=30.0.0',
      ollama: '>=0.1.0'
    };

    // Web-compatible system info
    this.isWeb = typeof process === 'undefined' || !process.versions;
    this.systemInfo = this.isWeb ? {
      platform: 'web',
      arch: navigator.platform || 'unknown',
      versions: {
        node: 'web-environment',
        electron: 'web-environment'
      }
    } : {
      platform: process.platform,
      arch: process.arch,
      versions: process.versions
    };
  }

  // Check all system requirements
  async checkAll() {
    // Use structured logging if available, fallback to console for web compatibility
    const logSystemValidation = (message, data) => {
      if (typeof window !== 'undefined' && window.justiceAPI?.log) {
        window.justiceAPI.log('system-checker', message, data);
      } else {
        console.log(`ULTRA-THINK: ${message}`, data);
      }
    };

    logSystemValidation('System validation initiated', {
      platform: this.systemInfo.platform,
      arch: this.systemInfo.arch,
      isWeb: this.isWeb
    });

    const results = {
      timestamp: new Date().toISOString(),
      platform: this.systemInfo.platform,
      arch: this.systemInfo.arch,
      checks: {}
    };

    // Node.js version check
    results.checks.node = this.checkNodeVersion();

    // Electron version check
    results.checks.electron = this.checkElectronVersion();

    // Ollama availability check
    results.checks.ollama = await this.checkOllamaAvailability();

    // GPU capabilities
    results.checks.gpu = await this.checkGPUCapabilities();

    // Memory check
    results.checks.memory = this.checkMemoryRequirements();

    // Dependencies check
    results.checks.dependencies = await this.checkDependencies();

    // Overall status
    results.status = this.calculateOverallStatus(results.checks);

    // Log system analysis completion
    const logAnalysisComplete = (message, data) => {
      if (typeof window !== 'undefined' && window.justiceAPI?.log) {
        window.justiceAPI.log('system-checker', message, data);
      } else {
        console.log(`ULTRA-THINK: ${message}`, data);
      }
    };

    logAnalysisComplete('System analysis complete', {
      status: results.status,
      checksCompleted: Object.keys(results.checks).length,
      platform: results.platform
    });

    return results;
  }

  // Node.js version validation (web-compatible)
  checkNodeVersion() {
    if (this.isWeb) {
      return {
        component: 'Runtime',
        current: 'Browser',
        required: 'Modern Browser',
        status: 'ok',
        message: '✅ Running in modern browser environment'
      };
    }

    const current = process.versions.node;
    const required = this.requirements.node.replace('>=', '');

    return {
      component: 'Node.js',
      current: current,
      required: this.requirements.node,
      status: this.compareVersions(current, required) >= 0 ? 'ok' : 'error',
      message: this.compareVersions(current, required) >= 0
        ? '✅ Node.js version compatible'
        : `❌ Node.js ${required}+ required, found ${current}`
    };
  }

  // Electron version check (web-compatible)
  checkElectronVersion() {
    if (this.isWeb) {
      return {
        component: 'Platform',
        current: 'Web Application',
        required: 'Web-compatible',
        status: 'ok',
        message: '✅ Web platform deployment active'
      };
    }

    const current = process.versions.electron;
    const required = this.requirements.electron.replace('>=', '');

    return {
      component: 'Electron',
      current: current,
      required: this.requirements.electron,
      status: this.compareVersions(current, required) >= 0 ? 'ok' : 'warning',
      message: this.compareVersions(current, required) >= 0
        ? '✅ Electron version compatible'
        : `⚠️ Electron ${required}+ recommended, found ${current}`
    };
  }

  // Check if Ollama is available
  async checkOllamaAvailability() {
    try {
      // Try to connect to Ollama API
      const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      const response = await fetch(`${ollamaUrl}/api/tags`, {
        method: 'GET',
        timeout: 5000
      });

      if (response.ok) {
        const data = await response.json();
        return {
          component: 'Ollama',
          current: 'Running',
          models: data.models?.map(m => m.name) || [],
          status: 'ok',
          message: `✅ Ollama running with ${data.models?.length || 0} models`
        };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      return {
        component: 'Ollama',
        current: 'Not Available',
        status: 'error',
        message: '❌ Ollama not running - AI features will use fallback responses',
        installUrl: 'https://ollama.ai/download',
        error: error.message
      };
    }
  }

  // Check GPU capabilities for AI acceleration
  async checkGPUCapabilities() {
    try {
      // Check if we're in a test environment
      if (typeof jest !== 'undefined' || process.env.NODE_ENV === 'test') {
        return {
          component: 'GPU',
          current: 'Test Environment',
          status: 'info',
          message: 'ℹ️ GPU testing skipped in test environment'
        };
      }

      // Check if we can access GPU info through WebGL
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown';
        const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown';

        return {
          component: 'GPU',
          current: renderer,
          vendor: vendor,
          status: 'info',
          message: `ℹ️ GPU: ${vendor} ${renderer}`
        };
      } else {
        return {
          component: 'GPU',
          current: 'Not Available',
          status: 'warning',
          message: '⚠️ No GPU acceleration detected'
        };
      }
    } catch (error) {
      return {
        component: 'GPU',
        current: 'Unknown',
        status: 'warning',
        message: '⚠️ GPU detection failed',
        error: error.message
      };
    }
  }

  // Check memory requirements (web-compatible)
  checkMemoryRequirements() {
    // Web environment memory check
    if (this.isWeb) {
      const memInfo = performance.memory;
      if (memInfo) {
        const totalMB = Math.round(memInfo.totalJSHeapSize / 1024 / 1024);
        const usedMB = Math.round(memInfo.usedJSHeapSize / 1024 / 1024);

        return {
          component: 'Memory',
          current: `${usedMB}MB / ${totalMB}MB`,
          status: totalMB > 50 ? 'ok' : 'warning',
          message: totalMB > 50
            ? `✅ Browser memory: ${usedMB}MB used, ${totalMB}MB available`
            : `⚠️ Low browser memory: ${totalMB}MB available`
        };
      }

      return {
        component: 'Memory',
        current: 'Browser managed',
        status: 'info',
        message: 'ℹ️ Browser manages memory automatically'
      };
    }

    // Electron specific memory check
    const memoryInfo = process.memoryUsage ? process.memoryUsage() : null;

    if (memoryInfo) {
      const totalMB = Math.round(memoryInfo.heapTotal / 1024 / 1024);
      const usedMB = Math.round(memoryInfo.heapUsed / 1024 / 1024);

      return {
        component: 'Memory',
        current: `${usedMB}MB / ${totalMB}MB`,
        status: totalMB > 100 ? 'ok' : 'warning',
        message: totalMB > 100
          ? `✅ Memory: ${usedMB}MB used, ${totalMB}MB available`
          : `⚠️ Low memory: ${totalMB}MB available`
      };
    }

    return {
      component: 'Memory',
      current: 'Unknown',
      status: 'info',
      message: 'ℹ️ Memory info not available'
    };
  }

  // Check npm dependencies
  async checkDependencies() {
    try {
      const packageJson = await window.justiceAPI?.getPackageInfo?.();

      if (packageJson) {
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        const criticalDeps = ['react', 'electron', 'axios', 'sqlite3', 'ollama'];
        const missing = criticalDeps.filter(dep => !deps[dep]);

        return {
          component: 'Dependencies',
          current: `${Object.keys(deps).length} packages`,
          missing: missing,
          status: missing.length === 0 ? 'ok' : 'warning',
          message: missing.length === 0
            ? '✅ All critical dependencies installed'
            : `⚠️ Missing: ${missing.join(', ')}`
        };
      }
    } catch (error) {
      // Fallback dependency check
      const knownDeps = ['react', 'electron', 'sqlite3', 'ollama'];
      return {
        component: 'Dependencies',
        current: 'Cannot verify',
        status: 'info',
        message: 'ℹ️ Dependency check requires package.json access'
      };
    }
  }

  // Calculate overall system status
  calculateOverallStatus(checks) {
    // Ensure checks is an object
    if (!checks || typeof checks !== 'object') {
      return 'error';
    }

    // Prioritize critical vs non-critical checks
    const criticalChecks = ["node", "electron", "memory"];
    const criticalStatuses = Object.entries(checks)
      .filter(([key]) => criticalChecks.includes(key))
      .map(([_, check]) => check?.status || 'unknown');

    const nonCriticalStatuses = Object.entries(checks)
      .filter(([key]) => !criticalChecks.includes(key))
      .map(([_, check]) => check?.status || 'unknown');
    
    // System is healthy if critical components are OK
    if (criticalStatuses.includes("error")) return "error";
    if (criticalStatuses.includes("warning")) return "warning";
    
    // If critical components are OK but non-critical have errors, still warning
    if (nonCriticalStatuses.includes("error")) return "warning";
    
    // If everything critical is OK and no errors, system is healthy
    return "healthy"; // Changed from "ok" to "healthy"
  }

  // Version comparison utility
  compareVersions(version1, version2) {
    const v1parts = String(version1 || '0.0.0').split('.').map(Number);
    const v2parts = String(version2 || '0.0.0').split('.').map(Number);

    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;

      if (v1part > v2part) return 1;
      if (v1part < v2part) return -1;
    }
    return 0;
  }

  // Get system recommendations
  getRecommendations(checkResults) {
    const recommendations = [];

    // Ensure checkResults and checks exist
    if (!checkResults || !checkResults.checks || typeof checkResults.checks !== 'object') {
      return recommendations;
    }

    if (checkResults.checks.ollama?.status === 'error') {
      recommendations.push({
        priority: 'high',
        component: 'Ollama',
        action: 'Install Ollama for AI capabilities',
        url: 'https://ollama.ai/download',
        description: 'Download and install Ollama to enable AI-powered legal assistance'
      });
    }

    if (checkResults.checks.node?.status === 'error') {
      recommendations.push({
        priority: 'critical',
        component: 'Node.js',
        action: 'Update Node.js',
        url: 'https://nodejs.org/',
        description: 'Justice Companion requires Node.js 18+ for optimal performance'
      });
    }

    if (checkResults.checks.memory?.status === 'warning') {
      recommendations.push({
        priority: 'medium',
        component: 'Memory',
        action: 'Close unnecessary applications',
        description: 'Free up memory for better AI performance'
      });
    }

    return recommendations;
  }

  // Format results for display
  formatForDisplay(checkResults) {
    // Ensure checkResults is valid
    if (!checkResults || typeof checkResults !== 'object') {
      return {
        overall: '❌ System Status Unknown',
        details: ['Unable to determine system status'],
        recommendations: []
      };
    }

    const { status, checks } = checkResults;

    let statusIcon = '❌';
    let statusText = 'System Issues Detected';

    if (status === 'healthy' || status === 'ok') {
      statusIcon = '✅';
      statusText = 'System Ready and Healthy';
    } else if (status === 'warning') {
      statusIcon = '⚠️';
      statusText = 'System Functional with Warnings';
    }

    return {
      overall: `${statusIcon} ${statusText}`,
      details: checks && typeof checks === 'object'
        ? Object.values(checks).map(check => check?.message || 'Unknown status')
        : ['System checks unavailable'],
      recommendations: this.getRecommendations(checkResults)
    };
  }
}

export default new SystemChecker();