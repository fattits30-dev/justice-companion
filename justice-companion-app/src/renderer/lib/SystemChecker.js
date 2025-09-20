// System Requirements & Version Checker for Justice Companion
// ULTRA-THINK mode comprehensive validation
// Built from pain, powered by truth

class SystemChecker {
  constructor() {
    this.requirements = {
      node: '>=18.0.0',
      electron: '>=30.0.0',
      ollama: '>=0.1.0'
    };

    this.systemInfo = {
      platform: process.platform,
      arch: process.arch,
      versions: process.versions
    };
  }

  // Check all system requirements
  async checkAll() {
    console.log('🔍 ULTRA-THINK: System validation initiated...');

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

    console.log('🎯 ULTRA-THINK: System analysis complete', results);
    return results;
  }

  // Node.js version validation
  checkNodeVersion() {
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

  // Electron version check
  checkElectronVersion() {
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
      const response = await fetch('http://localhost:11434/api/tags', {
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

  // Check memory requirements
  checkMemoryRequirements() {
    // Approximate memory check (Electron specific)
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
    const statuses = Object.values(checks).map(check => check.status);

    if (statuses.includes('error')) return 'error';
    if (statuses.includes('warning')) return 'warning';
    return 'ok';
  }

  // Version comparison utility
  compareVersions(version1, version2) {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);

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
    const { status, checks } = checkResults;

    let statusIcon = '❌';
    let statusText = 'System Issues Detected';

    if (status === 'ok') {
      statusIcon = '✅';
      statusText = 'System Ready for Battle';
    } else if (status === 'warning') {
      statusIcon = '⚠️';
      statusText = 'System Functional with Warnings';
    }

    return {
      overall: `${statusIcon} ${statusText}`,
      details: Object.values(checks).map(check => check.message),
      recommendations: this.getRecommendations(checkResults)
    };
  }
}

export default new SystemChecker();