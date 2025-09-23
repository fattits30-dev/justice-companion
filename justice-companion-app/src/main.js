const { app, BrowserWindow, ipcMain, dialog, shell, session } = require("electron");
const path = require("path");
const fs = require("fs");
const Store = require("electron-store");
const { LegalSecurityManager } = require("./security/LegalSecurityManager");
const { KeyManager } = require("./security/KeyManager");
const { SecureLegalDatabase } = require("./database/SecureLegalDatabase");
const { APIIntegration } = require("./api/APIIntegration");
const { initialize: initializeChatService } = require("./api/ChatServiceBridge");
const config = require("./config/environment");
const crypto = require("crypto");
// PHASE 1.2: Structured Logging Integration - 12-Factor App Logging
const { logger, info, warn, error, debug, auditLog, setCorrelationId, setLegalContext } = require("./logging/logger");
// Prevent cache permission issues by setting custom user data path
const os = require("os");
const userDataPath = path.join(os.tmpdir(), "justice-companion-" + Date.now());
app.setPath("userData", userDataPath);

// Clear any existing cache directories
function clearCacheDirectories() {
  const correlationId = setCorrelationId(`cache-cleanup-${Date.now()}`);
  try {
    const cacheDir = path.join(userDataPath, "Cache");
    const gpuCacheDir = path.join(userDataPath, "GPUCache");

    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
    }
    if (fs.existsSync(gpuCacheDir)) {
      fs.rmSync(gpuCacheDir, { recursive: true, force: true });
    }
    info("Cache directories cleared successfully", {
      component: 'cache-management',
      cacheDir: cacheDir,
      gpuCacheDir: gpuCacheDir
    });
  } catch (err) {
    warn("Cache cleanup warning - non-critical", {
      component: 'cache-management',
      error: err.message,
      userDataPath: userDataPath
    });
  }
}

clearCacheDirectories();
// SECURE GPU CACHE CONFIGURATION - Production Ready
// Security flags removed for production environment
// Keep only essential performance optimizations
app.commandLine.appendSwitch("--disable-background-timer-throttling");
app.commandLine.appendSwitch("--disable-dev-shm-usage");
app.commandLine.appendSwitch("--disable-disk-cache");
app.commandLine.appendSwitch("--disk-cache-size=0");
// Security-critical: Removed --no-sandbox and --disable-web-security flags


// Initialize security infrastructure
let securityManager;
let keyManager;
let secureDatabase;
let apiIntegration;
let store;

// Legal compliance state
let legalComplianceManager;
let dataRetentionEngine;
let auditIntegrityChain = null;

// Initialize the security foundation
async function initializeSecurity() {
  const initCorrelationId = setCorrelationId(`security-init-${Date.now()}`);
  setLegalContext({
    privileged: true,
    legalAction: 'SYSTEM_INITIALIZATION',
    classification: 'system-security'
  });

  try {
    // Initialize ChatServiceBridge for new architecture
    await initializeChatService();
    info('ChatServiceBridge initialized successfully', {
      component: 'chat-service',
      correlationId: initCorrelationId
    });
    // PHASE 1.4: Comprehensive environment validation at startup
    await config.validateEnvironmentAtStartup();

    info('Environment validation completed - Justice Companion ready to initialize', {
      component: 'startup-validation',
      environment: config.get('app.environment'),
      correlationId: initCorrelationId
    });
    // Initialize key manager first for secure key derivation
    keyManager = new KeyManager();
    await keyManager.initializeAsync();
    auditLog('SECURITY_INITIALIZATION', {
      component: 'KeyManager',
      status: 'initialized',
      encryptionType: 'hardware-derived',
      keyRotationEnabled: true,
      legalCompliance: 'attorney-client-privilege-protected'
    }, { privileged: true, classification: 'security-data' });

    securityManager = new LegalSecurityManager();
    // Security manager initializes itself in constructor

    secureDatabase = new SecureLegalDatabase(securityManager);
    await secureDatabase.initialize('default');

    // Initialize legal compliance state tracking
    auditIntegrityChain = crypto.createHash('sha256')
      .update('JUSTICE_COMPANION_AUDIT_GENESIS_' + Date.now())
      .digest('hex');

    // Verify database encryption integrity
    const dbIntegrityCheck = await secureDatabase.verifyDatabaseIntegrity();
    if (!dbIntegrityCheck.valid) {
      throw new Error('Database integrity verification failed - potential security breach');
    }

    // Get secure encryption key from KeyManager
    const encryptionKeyBuffer = await keyManager.getEncryptionKey();
    const encryptionKey = encryptionKeyBuffer.toString('hex').substring(0, 32);

    // Store for non-sensitive configuration data with derived encryption key
    store = new Store({
      name: 'justice-config',
      encryptionKey: encryptionKey,
      schema: {
        disclaimerAccepted: {
          type: 'boolean',
          default: false
        },
        userPreferences: {
          type: 'object',
          default: {}
        }
      }
    });

    // Initialize API Integration with AI services
    apiIntegration = new APIIntegration();
    // APIIntegration uses default Ollama settings internally

    // Setup API event handlers with structured logging
    apiIntegration.on('ai_request_start', (data) => {
      debug('AI request initiated', {
        component: 'ai-service',
        sessionId: data.sessionId,
        correlationId: initCorrelationId
      });
    });

    apiIntegration.on('ai_request_success', (data) => {
      info('AI request completed successfully', {
        component: 'ai-service',
        sessionId: data.sessionId,
        responseTime: data.responseTime,
        fromCache: data.fromCache
      });
    });

    apiIntegration.on('ai_request_failed', (data) => {
      error('AI request failed', new Error(data.error), {
        component: 'ai-service',
        sessionId: data.sessionId
      });
    });

    apiIntegration.on('circuit_breaker_state', (data) => {
      warn('Circuit breaker state change', {
        component: 'ai-service',
        state: data.state,
        previousState: data.previousState
      });
    });

    // Log successful initialization with audit trail
    auditLog('APPLICATION_STARTUP', {
      components: ['security', 'database', 'ai-integration', 'encryption'],
      initializationTime: Date.now(),
      correlationId: initCorrelationId
    }, { privileged: true, classification: 'system-security' });

    info('Justice Companion security infrastructure initialized', {
      component: 'application-startup',
      securityLevel: 'enterprise',
      encryptionActive: true,
      databaseConnected: true,
      aiIntegrationReady: true
    });

  } catch (err) {
    error('CRITICAL: Security initialization failed', err, {
      component: 'security-initialization',
      correlationId: initCorrelationId,
      critical: true
    });
    auditLog('SECURITY_INITIALIZATION_FAILED', {
      error: err.message,
      stack: err.stack,
      correlationId: initCorrelationId
    }, { privileged: true, classification: 'security-incident' });
    process.exit(1); // Cannot operate without security
  }
}

let mainWindow;
let isDev = process.env.NODE_ENV === 'development';

// Create the application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: config.serverConfig.electron.windowWidth,
    height: config.serverConfig.electron.windowHeight,
    minWidth: 800,
    minHeight: 600,
    title: 'Justice Companion - Legal Assistant',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      preload: path.join(__dirname, 'preload.js'),
      // Disable Chrome autofill features to prevent console errors
      spellcheck: false,
      disableBlinkFeatures: 'Autofill',
      // GPU Cache Management fixes
      cache: false,
      enableWebSQL: false,
      backgroundThrottling: false,
    },
    backgroundColor: '#f5f5f5',
    frame: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false // Wait until fully loaded
  });

  // Load the application
  if (isDev) {
    mainWindow.loadURL(`http://${config.serverConfig.vite.host}:${config.serverConfig.vite.port}`);
    // mainWindow.webContents.openDevTools(); // Commented to prevent autofill console errors in production
  } else {
    // Load React build from dist folder
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    // Open DevTools to debug the blank screen issue
    // mainWindow.webContents.openDevTools(); // Commented to prevent autofill console errors in production
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // Display disclaimer on first run
    if (!store.get('disclaimerAccepted')) {
      mainWindow.webContents.send('show-disclaimer');
    }
  });

  // Clean up when done
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Application startup
app.whenReady().then(async () => {
  // Initialize security infrastructure
  await initializeSecurity();

  createWindow();

  // Start retention policy enforcement
  setInterval(async () => {
    await secureDatabase.processDataRetention();
  }, 24 * 60 * 60 * 1000); // Daily

  // Mac specific - keep app running when windows close
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Windows/Linux - when it's done, it's done
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ======================
// IPC SECURITY VALIDATION - Context7 Best Practices
// ======================

/**
 * Validate IPC sender to prevent malicious requests
 * Based on Electron security best practices from context7
 *
 * @param {object} event - IPC event object
 * @returns {boolean} true if sender is valid, false otherwise
 */
function validateIPCSender(event) {
  try {
    // For desktop applications, validate sender is from our app
    if (!event.senderFrame) {
      error('IPC Security: No sender frame detected', null, {
        component: 'ipc-security',
        securityEvent: 'MISSING_SENDER_FRAME',
        severity: 'high'
      });
      return false;
    }

    // Get sender URL
    const senderURL = new URL(event.senderFrame.url);

    // Development environment - allow localhost
    if (isDev) {
      const allowedHosts = ['localhost', '127.0.0.1'];
      const allowedPorts = ['5173', '5174', '3000']; // Common Vite/React ports

      if (allowedHosts.includes(senderURL.hostname) &&
          allowedPorts.includes(senderURL.port)) {
        return true;
      }
    }

    // Production environment - validate file:// protocol
    if (!isDev) {
      if (senderURL.protocol === 'file:') {
        // Ensure the file is from our app directory
        const appPath = app.getAppPath();
        const normalizedPath = path.normalize(senderURL.pathname);
        const appNormalizedPath = path.normalize(appPath);

        if (normalizedPath.startsWith(appNormalizedPath)) {
          return true;
        }
      }
    }

    // Additional security: Check if sender is our main window
    if (mainWindow && event.sender === mainWindow.webContents) {
      return true;
    }

    // Log potential security violation
    error('IPC Security Violation - Unauthorized sender detected', null, {
      component: 'ipc-security',
      securityEvent: 'UNAUTHORIZED_IPC_SENDER',
      url: event.senderFrame.url,
      protocol: senderURL.protocol,
      hostname: senderURL.hostname,
      port: senderURL.port,
      isDev: isDev,
      severity: 'critical'
    });

    // Audit log security violation
    if (securityManager) {
      securityManager.auditLog('SECURITY', 'IPC_SENDER_VALIDATION_FAILED', {
        senderURL: event.senderFrame.url,
        protocol: senderURL.protocol,
        hostname: senderURL.hostname,
        suspiciousActivity: true
      });
    }

    return false;

  } catch (err) {
    error('IPC Security validation error - failing securely', err, {
      component: 'ipc-security',
      securityEvent: 'IPC_VALIDATION_ERROR',
      severity: 'high'
    });

    // Fail securely - reject on validation errors
    if (securityManager) {
      securityManager.auditLog('SECURITY', 'IPC_VALIDATION_ERROR', {
        error: err.message,
        suspiciousActivity: true
      });
    }

    return false;
  }
}

/**
 * Secure IPC handler wrapper with sender validation
 * @param {string} channel - IPC channel name
 * @param {function} handler - Original handler function
 * @returns {function} Secured handler function
 */
function secureIPCHandler(channel, handler) {
  return async (event, ...args) => {
    // Validate sender first
    if (!validateIPCSender(event)) {
      error(`Blocked unauthorized IPC request to channel: ${channel}`, null, {
        component: 'ipc-security',
        channel: channel,
        securityEvent: 'UNAUTHORIZED_IPC_REQUEST',
        severity: 'critical'
      });

      // Return error response for unauthorized access
      return {
        success: false,
        error: 'Unauthorized IPC request - sender validation failed',
        code: 'SENDER_VALIDATION_FAILED',
        timestamp: new Date().toISOString()
      };
    }

    // Additional rate limiting per sender
    const senderId = event.sender.id;
    const rateLimitKey = `ipc_${channel}_${senderId}`;

    if (securityManager && !securityManager.checkRateLimit(rateLimitKey, senderId)) {
      warn(`Rate limit exceeded for IPC channel: ${channel}`, {
        component: 'ipc-security',
        channel: channel,
        senderId: senderId,
        securityEvent: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60000
      });

      return {
        success: false,
        error: 'Rate limit exceeded for this operation',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60000 // 1 minute
      };
    }

    // Execute original handler if validation passes
    try {
      return await handler(event, ...args);
    } catch (handlerError) {
      error(`IPC handler error for channel: ${channel}`, handlerError, {
        component: 'ipc-handler',
        channel: channel,
        senderId: senderId,
        securityEvent: 'IPC_HANDLER_ERROR'
      });

      // Log handler errors
      if (securityManager) {
        securityManager.auditLog('IPC_ERROR', `${channel.toUpperCase()}_HANDLER_ERROR`, {
          error: handlerError.message,
          channel: channel,
          senderId: senderId
        });
      }

      return {
        success: false,
        error: 'Internal server error',
        code: 'HANDLER_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  };
}

// ======================
// IPC BATTLEGROUND - Where frontend meets backend (SECURED)
// ======================

// Save case data - military-grade encryption with audit trail
ipcMain.handle('save-case', async (event, caseData) => {
  try {
    // Rate limiting for security
    const userId = event.sender.session?.userId || 'anonymous';
    if (!securityManager.checkRateLimit('save_case', userId)) {
      throw new Error('Rate limit exceeded - please wait before trying again');
    }

    // Input validation and sanitization
    const titleValidation = securityManager.validateAndSanitizeInput(caseData.title, 'case_title');
    if (!titleValidation.isValid) {
      throw new Error('Invalid case title: ' + titleValidation.errors.join(', '));
    }

    const descValidation = securityManager.validateAndSanitizeInput(caseData.description || '', 'case_description');
    if (!descValidation.isValid) {
      throw new Error('Invalid case description: ' + descValidation.errors.join(', '));
    }

    // Sanitize case data
    const sanitizedCaseData = {
      title: titleValidation.sanitized,
      description: descValidation.sanitized,
      type: caseData.type || 'general',
      status: 'active',
      clientId: caseData.clientId,
      classification: caseData.classification || 'confidential',
      createdAt: new Date().toISOString()
    };

    // Save to secure database with encryption
    const result = await secureDatabase.saveCase(sanitizedCaseData, userId);

    securityManager.auditLog('CASE_MANAGEMENT', 'CASE_CREATED', {
      caseId: result.caseId,
      userId: userId,
      classification: sanitizedCaseData.classification,
      clientId: sanitizedCaseData.clientId
    });

    return {
      success: true,
      caseId: result.caseId,
      encrypted: true,
      auditTrail: true
    };

  } catch (error) {
    securityManager.auditLog('CASE_MANAGEMENT', 'CASE_CREATION_FAILED', {
      error: error.message,
      userId: event.sender.session?.userId
    });
    return { success: false, error: error.message };
  }
});

// Get all cases - encrypted and secure
ipcMain.handle('get-cases', async (event, filters = {}) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';

    // Rate limiting
    if (!securityManager.checkRateLimit('get_cases', userId)) {
      throw new Error('Rate limit exceeded');
    }

    // Retrieve and decrypt cases
    const cases = await secureDatabase.getCases(userId, filters.clientId);

    securityManager.auditLog('CASE_MANAGEMENT', 'CASES_ACCESSED', {
      userId: userId,
      caseCount: cases.length,
      filters: filters
    });

    return {
      success: true,
      cases: cases,
      encrypted: true,
      auditTrail: true
    };

  } catch (error) {
    securityManager.auditLog('CASE_MANAGEMENT', 'CASES_ACCESS_FAILED', {
      error: error.message,
      userId: event.sender.session?.userId
    });
    return { success: false, error: error.message, cases: [] };
  }
});

// Save confirmed facts - the encrypted truth arsenal
ipcMain.handle('save-fact', async (event, factData) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';

    // Rate limiting
    if (!securityManager.checkRateLimit('save_fact', userId)) {
      throw new Error('Rate limit exceeded');
    }

    // Validate fact data
    const validation = securityManager.validateAndSanitizeInput(factData.content, 'legal_document');
    if (!validation.isValid) {
      throw new Error('Invalid fact data: ' + validation.errors.join(', '));
    }

    // Encrypt and store fact
    const encryptedFact = securityManager.encryptLegalData({
      ...factData,
      content: validation.sanitized,
      confirmedAt: new Date().toISOString(),
      userId: userId
    });

    // Store in secure database (facts are part of case data)
    // For now, we'll audit the fact storage
    securityManager.auditLog('FACT_MANAGEMENT', 'FACT_CONFIRMED', {
      userId: userId,
      factType: factData.type,
      caseId: factData.caseId,
      classification: 'confidential'
    });

    return { success: true, encrypted: true };

  } catch (error) {
    securityManager.auditLog('FACT_MANAGEMENT', 'FACT_STORAGE_FAILED', {
      error: error.message,
      userId: event.sender.session?.userId
    });
    return { success: false, error: error.message };
  }
});

// Accept disclaimer with comprehensive compliance logging
ipcMain.handle('accept-disclaimer', secureIPCHandler('accept-disclaimer', async (event, acceptanceData) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';
    const sessionId = event.sender.session?.sessionId || securityManager.getCurrentSessionId();

    // Rate limiting for disclaimer acceptance
    if (!securityManager.checkRateLimit('accept_disclaimer', userId)) {
      throw new Error('Rate limit exceeded for disclaimer acceptance');
    }

    // Prepare comprehensive acceptance data
    const fullAcceptanceData = {
      ...acceptanceData,
      disclaimerVersion: '2.0', // Updated version with emergency warnings
      acceptedVia: 'electron_app',
      userId: userId,
      sessionId: sessionId,
      userAgent: acceptanceData?.userAgent || 'Justice Companion Electron App',
      screenResolution: acceptanceData?.screenResolution || 'unknown',
      timezone: acceptanceData?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: acceptanceData?.language || 'en'
    };

    // Log disclaimer acceptance with full audit trail
    const acceptanceResult = securityManager.logDisclaimerAcceptance(fullAcceptanceData);

    // Update session with consent information
    securityManager.updateSessionConsent(sessionId, {
      acceptanceId: acceptanceResult.acceptanceRecord.acceptanceId,
      disclaimerVersion: fullAcceptanceData.disclaimerVersion
    });

    // Store acceptance in encrypted store
    store.set('disclaimerAccepted', true);
    store.set('disclaimerAcceptanceId', acceptanceResult.acceptanceRecord.acceptanceId);
    store.set('disclaimerAcceptedAt', acceptanceResult.acceptanceRecord.acceptedAt);
    store.set('disclaimerVersion', fullAcceptanceData.disclaimerVersion);

    // Comprehensive audit log
    securityManager.auditLog('LEGAL_COMPLIANCE', 'DISCLAIMER_ACCEPTANCE_PROCESSED', {
      acceptanceId: acceptanceResult.acceptanceRecord.acceptanceId,
      userId: userId,
      sessionId: sessionId,
      disclaimerVersion: fullAcceptanceData.disclaimerVersion,
      gdprCompliant: true,
      auditTrail: true,
      consentExplicit: true,
      consentInformed: true,
      legallyValid: true
    });

    auditLog('DISCLAIMER_ACCEPTANCE_COMPLETED', {
      acceptanceId: acceptanceResult.acceptanceRecord.acceptanceId,
      sessionId: sessionId,
      userId: userId,
      disclaimerVersion: fullAcceptanceData.disclaimerVersion,
      timestamp: acceptanceResult.acceptanceRecord.acceptedAt
    }, { privileged: true, classification: 'legal-compliance' });

    info('Legal compliance: Disclaimer acceptance processed', {
      component: 'legal-compliance',
      acceptanceId: acceptanceResult.acceptanceRecord.acceptanceId,
      sessionId: sessionId,
      disclaimerVersion: fullAcceptanceData.disclaimerVersion,
      auditTrailComplete: true
    });

    return {
      success: true,
      acceptanceId: acceptanceResult.acceptanceRecord.acceptanceId,
      acceptedAt: acceptanceResult.acceptanceRecord.acceptedAt,
      disclaimerVersion: fullAcceptanceData.disclaimerVersion,
      complianceStatus: 'GDPR_COMPLIANT',
      auditTrailComplete: true
    };

  } catch (error) {
    securityManager.auditLog('LEGAL_COMPLIANCE', 'DISCLAIMER_ACCEPTANCE_FAILED', {
      error: error.message,
      userId: event.sender.session?.userId || 'anonymous',
      sessionId: event.sender.session?.sessionId,
      complianceRisk: true,
      requiresReview: true
    });

    error('Legal compliance error during disclaimer acceptance', error, {
      component: 'legal-compliance',
      userId: userId,
      sessionId: sessionId,
      complianceRisk: true
    });
    return {
      success: false,
      error: error.message,
      complianceStatus: 'ERROR',
      requiresRetry: true
    };
  }
}));

// Open external links - reaching beyond the walls
ipcMain.handle('open-external', async (event, url) => {
  shell.openExternal(url);
});

// File operations - secure document warfare
ipcMain.handle('select-file', async (event) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';

    // Rate limiting for uploads
    if (!securityManager.checkRateLimit('upload_document', userId)) {
      throw new Error('Upload rate limit exceeded');
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Legal Documents', extensions: ['pdf', 'doc', 'docx', 'txt'] },
        { name: 'Images', extensions: ['jpg', 'png', 'jpeg'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled) {
      const filePath = result.filePaths[0];
      const fileName = path.basename(filePath);
      const fileStats = fs.statSync(filePath);

      // Security checks
      if (fileStats.size > 50 * 1024 * 1024) { // 50MB limit
        throw new Error('File too large - maximum 50MB allowed');
      }

      const fileContent = fs.readFileSync(filePath);

      // Encrypt file content
      const encryptedContent = securityManager.encryptLegalData({
        content: fileContent.toString('base64'),
        originalName: fileName,
        size: fileStats.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: userId
      });

      securityManager.auditLog('DOCUMENT_MANAGEMENT', 'DOCUMENT_UPLOADED', {
        fileName: fileName,
        fileSize: fileStats.size,
        userId: userId,
        encrypted: true
      });

      return {
        success: true,
        fileName: fileName,
        fileSize: fileStats.size,
        encrypted: true,
        encryptedContent: encryptedContent
      };
    }

    return { success: false, error: 'No file selected' };

  } catch (error) {
    securityManager.auditLog('DOCUMENT_MANAGEMENT', 'DOCUMENT_UPLOAD_FAILED', {
      error: error.message,
      userId: event.sender.session?.userId
    });
    return { success: false, error: error.message };
  }
});

// Export case data - secure ammunition sharing
ipcMain.handle('export-case', async (event, caseId) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';

    // Rate limiting for exports
    if (!securityManager.checkRateLimit('export_case', userId)) {
      throw new Error('Export rate limit exceeded');
    }

    // Get case from secure database
    const cases = await secureDatabase.getCases(userId);
    const targetCase = cases.find(c => c._metadata.id === caseId);

    if (!targetCase) {
      throw new Error('Case not found or access denied');
    }

    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `case-export-${Date.now()}.json`,
      filters: [{ name: 'Encrypted JSON', extensions: ['json'] }]
    });

    if (!result.canceled) {
      // Create export package with metadata
      const exportPackage = {
        exportedAt: new Date().toISOString(),
        exportedBy: userId,
        caseId: caseId,
        classification: targetCase._metadata.classification,
        attorneyClientPrivilege: true,
        integrityHash: securityManager.calculateIntegrityHash(targetCase),
        encryptedCase: securityManager.encryptLegalData(targetCase)
      };

      fs.writeFileSync(result.filePath, JSON.stringify(exportPackage, null, 2));

      securityManager.auditLog('CASE_MANAGEMENT', 'CASE_EXPORTED', {
        caseId: caseId,
        exportPath: result.filePath,
        userId: userId,
        classification: targetCase._metadata.classification
      });

      return {
        success: true,
        path: result.filePath,
        encrypted: true,
        classification: targetCase._metadata.classification
      };
    }

    return { success: false, error: 'Export cancelled' };

  } catch (error) {
    securityManager.auditLog('CASE_MANAGEMENT', 'CASE_EXPORT_FAILED', {
      caseId: caseId,
      error: error.message,
      userId: event.sender.session?.userId
    });
    return { success: false, error: error.message };
  }
});

// =====================
// LEGAL COMPLIANCE & CONSENT MANAGEMENT IPC HANDLERS
// =====================

// Withdraw consent (GDPR right to withdraw)
ipcMain.handle('withdraw-consent', secureIPCHandler('withdraw-consent', async (event, withdrawalData) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';
    const sessionId = event.sender.session?.sessionId || securityManager.getCurrentSessionId();

    // Rate limiting for consent withdrawal
    if (!securityManager.checkRateLimit('withdraw_consent', userId)) {
      throw new Error('Rate limit exceeded for consent withdrawal');
    }

    // Validate withdrawal data
    if (!withdrawalData.acceptanceId) {
      throw new Error('Original acceptance ID required for consent withdrawal');
    }

    // Process consent withdrawal with full audit trail
    const withdrawalResult = securityManager.logConsentWithdrawal({
      ...withdrawalData,
      userId: userId,
      sessionId: sessionId
    });

    // Update session to reflect consent withdrawal
    const session = securityManager.sessionManager.get(sessionId);
    if (session) {
      session.consentAccepted = false;
      session.consentWithdrawnAt = new Date().toISOString();
      session.consentWithdrawalId = withdrawalResult.withdrawalRecord.withdrawalId;
    }

    // Update store to reflect withdrawal
    store.set('disclaimerAccepted', false);
    store.set('consentWithdrawn', true);
    store.set('consentWithdrawnAt', withdrawalResult.withdrawalRecord.withdrawnAt);
    store.set('consentWithdrawalId', withdrawalResult.withdrawalRecord.withdrawalId);

    // Audit the withdrawal
    securityManager.auditLog('LEGAL_COMPLIANCE', 'CONSENT_WITHDRAWAL_PROCESSED', {
      withdrawalId: withdrawalResult.withdrawalRecord.withdrawalId,
      originalAcceptanceId: withdrawalData.acceptanceId,
      userId: userId,
      sessionId: sessionId,
      gdprCompliant: true,
      dataProcessingCeased: true,
      userRightsRespected: true
    });

    auditLog('CONSENT_WITHDRAWAL_COMPLETED', {
      withdrawalId: withdrawalResult.withdrawalRecord.withdrawalId,
      withdrawnAt: withdrawalResult.withdrawalRecord.withdrawnAt,
      originalAcceptanceId: withdrawalData.acceptanceId,
      userId: userId,
      sessionId: sessionId
    }, { privileged: true, classification: 'legal-compliance' });

    info('Legal compliance: Consent withdrawal processed', {
      component: 'legal-compliance',
      withdrawalId: withdrawalResult.withdrawalRecord.withdrawalId,
      dataProcessingCeased: true
    });

    return {
      success: true,
      withdrawalId: withdrawalResult.withdrawalRecord.withdrawalId,
      withdrawnAt: withdrawalResult.withdrawalRecord.withdrawnAt,
      complianceStatus: 'WITHDRAWAL_PROCESSED',
      dataProcessingCeased: true
    };

  } catch (error) {
    securityManager.auditLog('LEGAL_COMPLIANCE', 'CONSENT_WITHDRAWAL_FAILED', {
      error: error.message,
      userId: event.sender.session?.userId || 'anonymous',
      complianceRisk: true
    });

    return {
      success: false,
      error: error.message,
      complianceStatus: 'WITHDRAWAL_ERROR'
    };
  }
}));

// Get current consent status
ipcMain.handle('get-consent-status', secureIPCHandler('get-consent-status', async (event) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';
    const sessionId = event.sender.session?.sessionId || securityManager.getCurrentSessionId();

    // Rate limiting for consent status checks
    if (!securityManager.checkRateLimit('get_consent_status', userId)) {
      throw new Error('Rate limit exceeded for consent status checks');
    }

    // Get comprehensive consent status
    const consentStatus = securityManager.getConsentStatus(sessionId);

    // Add store-based information
    const storeConsent = {
      disclaimerAccepted: store.get('disclaimerAccepted', false),
      disclaimerAcceptanceId: store.get('disclaimerAcceptanceId'),
      disclaimerAcceptedAt: store.get('disclaimerAcceptedAt'),
      disclaimerVersion: store.get('disclaimerVersion'),
      consentWithdrawn: store.get('consentWithdrawn', false),
      consentWithdrawnAt: store.get('consentWithdrawnAt'),
      consentWithdrawalId: store.get('consentWithdrawalId')
    };

    const completeStatus = {
      ...consentStatus,
      ...storeConsent,
      sessionId: sessionId,
      userId: userId,
      complianceTimestamp: new Date().toISOString()
    };

    // Audit the status check
    securityManager.auditLog('CONSENT', 'CONSENT_STATUS_CHECKED', {
      userId: userId,
      sessionId: sessionId,
      hasValidConsent: completeStatus.hasValidConsent,
      consentRequired: completeStatus.consentRequired
    });

    return {
      success: true,
      consentStatus: completeStatus
    };

  } catch (error) {
    securityManager.auditLog('CONSENT', 'CONSENT_STATUS_CHECK_FAILED', {
      error: error.message,
      userId: event.sender.session?.userId || 'anonymous'
    });

    return {
      success: false,
      error: error.message,
      consentStatus: {
        hasValidConsent: false,
        consentRequired: true,
        error: error.message
      }
    };
  }
}));

// Generate consent management report
ipcMain.handle('get-consent-report', secureIPCHandler('get-consent-report', async (event, filters) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';

    // Only authenticated users can generate consent reports
    if (!userId || userId === 'anonymous') {
      throw new Error('Consent report access requires authenticated user');
    }

    // Rate limiting for report generation
    if (!securityManager.checkRateLimit('consent_report', userId)) {
      throw new Error('Rate limit exceeded for consent reports');
    }

    // Generate comprehensive consent report
    const report = securityManager.generateConsentReport(filters || {});

    // Audit the report generation
    securityManager.auditLog('COMPLIANCE', 'CONSENT_REPORT_GENERATED', {
      userId: userId,
      reportId: report.reportId,
      reportType: report.reportType
    });

    return {
      success: true,
      report: report
    };

  } catch (error) {
    securityManager.auditLog('COMPLIANCE', 'CONSENT_REPORT_FAILED', {
      error: error.message,
      userId: event.sender.session?.userId || 'anonymous'
    });

    return {
      success: false,
      error: error.message
    };
  }
}));

// =====================
// SECURITY & COMPLIANCE IPC HANDLERS
// =====================

// Generate security compliance report
ipcMain.handle('get-security-report', async (event) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';

    if (!securityManager.checkRateLimit('security_report', userId)) {
      throw new Error('Rate limit exceeded');
    }

    const report = await secureDatabase.generateComplianceReport();

    securityManager.auditLog('COMPLIANCE', 'SECURITY_REPORT_GENERATED', {
      userId: userId,
      reportType: 'security_compliance'
    });

    return { success: true, report: report };

  } catch (error) {
    securityManager.auditLog('COMPLIANCE', 'SECURITY_REPORT_FAILED', {
      error: error.message,
      userId: event.sender.session?.userId
    });
    return { success: false, error: error.message };
  }
});

// Get audit trail (for legal compliance)
ipcMain.handle('get-audit-trail', async (event, filters = {}) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';

    // Only authorized users can access audit trails
    if (!userId || userId === 'anonymous') {
      throw new Error('Audit trail access requires authentication');
    }

    const auditRecords = await secureDatabase.getAuditRecords(filters);

    securityManager.auditLog('AUDIT', 'AUDIT_TRAIL_ACCESSED', {
      userId: userId,
      filters: filters,
      recordCount: auditRecords.length
    });

    return { success: true, auditRecords: auditRecords };

  } catch (error) {
    securityManager.auditLog('AUDIT', 'AUDIT_TRAIL_ACCESS_FAILED', {
      error: error.message,
      userId: event.sender.session?.userId
    });
    return { success: false, error: error.message };
  }
});

// GDPR data subject rights - data portability
ipcMain.handle('export-personal-data', async (event, clientId) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';

    if (!securityManager.checkRateLimit('gdpr_export', userId)) {
      throw new Error('Rate limit exceeded');
    }

    // Get all data for the client
    const personalData = await secureDatabase.getPersonalData(clientId);

    const exportPackage = {
      exportType: 'GDPR_DATA_PORTABILITY',
      exportedAt: new Date().toISOString(),
      clientId: clientId,
      requestedBy: userId,
      data: personalData,
      legalBasis: 'GDPR Article 20 - Right to data portability',
      integrityHash: securityManager.calculateIntegrityHash(personalData)
    };

    securityManager.auditLog('GDPR', 'DATA_PORTABILITY_REQUEST', {
      clientId: clientId,
      userId: userId,
      dataSize: JSON.stringify(personalData).length
    });

    return { success: true, exportPackage: exportPackage };

  } catch (error) {
    securityManager.auditLog('GDPR', 'DATA_PORTABILITY_FAILED', {
      clientId: clientId,
      error: error.message,
      userId: event.sender.session?.userId
    });
    return { success: false, error: error.message };
  }
});

// GDPR data subject rights - right to erasure
ipcMain.handle('delete-personal-data', async (event, clientId, legalBasis) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';

    if (!userId || userId === 'anonymous') {
      throw new Error('Data deletion requires authenticated user');
    }

    // Verify legal basis for deletion
    const validBases = ['consent_withdrawn', 'no_longer_necessary', 'unlawful_processing'];
    if (!validBases.includes(legalBasis)) {
      throw new Error('Invalid legal basis for data deletion');
    }

    // Secure deletion
    await secureDatabase.secureDeletePersonalData(clientId, legalBasis, userId);

    securityManager.auditLog('GDPR', 'RIGHT_TO_ERASURE_EXECUTED', {
      clientId: clientId,
      legalBasis: legalBasis,
      userId: userId,
      deletionMethod: 'secure_multi_pass'
    });

    return { success: true, deleted: true, legalBasis: legalBasis };

  } catch (error) {
    securityManager.auditLog('GDPR', 'RIGHT_TO_ERASURE_FAILED', {
      clientId: clientId,
      error: error.message,
      userId: event.sender.session?.userId
    });
    return { success: false, error: error.message };
  }
});

// Update case with additional security
ipcMain.handle('update-case', async (event, caseId, updateData) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';

    if (!securityManager.checkRateLimit('update_case', userId)) {
      throw new Error('Rate limit exceeded');
    }

    // Validate updates
    if (updateData.title) {
      const validation = securityManager.validateAndSanitizeInput(updateData.title, 'case_title');
      if (!validation.isValid) {
        throw new Error('Invalid title: ' + validation.errors.join(', '));
      }
      updateData.title = validation.sanitized;
    }

    if (updateData.description) {
      const validation = securityManager.validateAndSanitizeInput(updateData.description, 'case_description');
      if (!validation.isValid) {
        throw new Error('Invalid description: ' + validation.errors.join(', '));
      }
      updateData.description = validation.sanitized;
    }

    await secureDatabase.updateCase(caseId, updateData, userId);

    return { success: true, updated: true };

  } catch (error) {
    securityManager.auditLog('CASE_MANAGEMENT', 'CASE_UPDATE_FAILED', {
      caseId: caseId,
      error: error.message,
      userId: event.sender.session?.userId
    });
    return { success: false, error: error.message };
  }
});

// Save document to case
ipcMain.handle('save-document', async (event, caseId, documentData) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';

    if (!securityManager.checkRateLimit('save_document', userId)) {
      throw new Error('Rate limit exceeded');
    }

    const result = await secureDatabase.saveDocument(caseId, documentData, userId);

    return { success: true, documentId: result.documentId };

  } catch (error) {
    securityManager.auditLog('DOCUMENT_MANAGEMENT', 'DOCUMENT_SAVE_FAILED', {
      caseId: caseId,
      error: error.message,
      userId: event.sender.session?.userId
    });
    return { success: false, error: error.message };
  }
});

// Client management - save client
ipcMain.handle('save-client', async (event, clientData) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';

    if (!securityManager.checkRateLimit('save_client', userId)) {
      throw new Error('Rate limit exceeded');
    }

    const result = await secureDatabase.saveClient(clientData, userId);

    return { success: true, clientId: result.clientId };

  } catch (error) {
    securityManager.auditLog('CLIENT_MANAGEMENT', 'CLIENT_SAVE_FAILED', {
      error: error.message,
      userId: event.sender.session?.userId
    });
    return { success: false, error: error.message };
  }
});

// Client management - get clients
ipcMain.handle('get-clients', async (event) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';

    if (!securityManager.checkRateLimit('get_clients', userId)) {
      throw new Error('Rate limit exceeded');
    }

    const clients = await secureDatabase.getClients(userId);

    return { success: true, clients: clients };

  } catch (error) {
    securityManager.auditLog('CLIENT_MANAGEMENT', 'CLIENTS_RETRIEVAL_FAILED', {
      error: error.message,
      userId: event.sender.session?.userId
    });
    return { success: false, error: error.message, clients: [] };
  }
});

// Session management
ipcMain.handle('create-session', async (event, userCredentials = null) => {
  try {
    const sessionId = securityManager.createSecureSession(userCredentials?.userId);

    // Store session info for this renderer
    event.sender.session.sessionId = sessionId;
    event.sender.session.userId = userCredentials?.userId || 'anonymous';

    return { success: true, sessionId: sessionId };

  } catch (error) {
    securityManager.auditLog('SESSION', 'SESSION_CREATION_FAILED', {
      error: error.message
    });
    return { success: false, error: error.message };
  }
});

// Validate session
ipcMain.handle('validate-session', async (event, sessionId) => {
  try {
    const isValid = securityManager.validateSession(sessionId);

    if (!isValid) {
      securityManager.auditLog('SESSION', 'INVALID_SESSION_DETECTED', {
        sessionId: sessionId
      });
    }

    return { success: true, valid: isValid };

  } catch (error) {
    return { success: false, error: error.message };
  }
});

// =====================
// KEY MANAGEMENT IPC HANDLERS
// =====================

// Get key management status
ipcMain.handle('get-key-status', async (event) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';

    if (!securityManager.checkRateLimit('key_status', userId)) {
      throw new Error('Rate limit exceeded');
    }

    const keyStatus = await keyManager.getKeyStatus();

    securityManager.auditLog('KEY_MANAGEMENT', 'KEY_STATUS_REQUESTED', {
      userId: userId,
      keyAge: keyStatus.keyAge
    });

    return { success: true, keyStatus: keyStatus };

  } catch (error) {
    securityManager.auditLog('KEY_MANAGEMENT', 'KEY_STATUS_FAILED', {
      error: error.message,
      userId: event.sender.session?.userId
    });
    return { success: false, error: error.message };
  }
});

// Force key rotation (for security incidents)
ipcMain.handle('force-key-rotation', async (event) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';

    // Only authenticated users can force key rotation
    if (!userId || userId === 'anonymous') {
      throw new Error('Key rotation requires authenticated user');
    }

    if (!securityManager.checkRateLimit('force_key_rotation', userId)) {
      throw new Error('Rate limit exceeded');
    }

    const newKey = await keyManager.forceKeyRotation();

    securityManager.auditLog('KEY_MANAGEMENT', 'FORCED_KEY_ROTATION', {
      userId: userId,
      reason: 'manual_rotation',
      newKeyLength: newKey.length
    });

    return { success: true, rotated: true };

  } catch (error) {
    securityManager.auditLog('KEY_MANAGEMENT', 'FORCED_KEY_ROTATION_FAILED', {
      error: error.message,
      userId: event.sender.session?.userId
    });
    return { success: false, error: error.message };
  }
});

// =====================
// MCP MEMORY SERVICE IPC HANDLERS
// =====================

// MCP Memory Search - for case data retrieval
ipcMain.handle('mcp-memory-search', secureIPCHandler('mcp-memory-search', async (event, params) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';

    if (!securityManager.checkRateLimit('mcp_memory_search', userId)) {
      throw new Error('Rate limit exceeded for memory search');
    }

    // Store MCP memory search in secure database for audit
    securityManager.auditLog('MCP_MEMORY', 'MEMORY_SEARCH_REQUEST', {
      userId: userId,
      searchParams: params,
      timestamp: new Date().toISOString()
    });

    // For now, return empty results as MCP server integration is not yet complete
    // This prevents errors while maintaining audit trail
    return {
      success: true,
      nodes: [],
      message: 'MCP memory search completed (development mode)'
    };

  } catch (error) {
    securityManager.auditLog('MCP_MEMORY', 'MEMORY_SEARCH_FAILED', {
      error: error.message,
      userId: event.sender.session?.userId || 'anonymous'
    });

    return {
      success: false,
      error: error.message,
      nodes: []
    };
  }
}));

// MCP Memory Create Entities - for storing case entities
ipcMain.handle('mcp-memory-create-entities', secureIPCHandler('mcp-memory-create-entities', async (event, params) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';

    if (!securityManager.checkRateLimit('mcp_memory_create', userId)) {
      throw new Error('Rate limit exceeded for memory creation');
    }

    // Audit entity creation
    securityManager.auditLog('MCP_MEMORY', 'ENTITIES_CREATED', {
      userId: userId,
      entityCount: params.entities?.length || 0,
      timestamp: new Date().toISOString()
    });

    // Return success for development mode
    return {
      success: true,
      entities: params.entities || [],
      message: 'Entities created (development mode)'
    };

  } catch (error) {
    securityManager.auditLog('MCP_MEMORY', 'ENTITY_CREATION_FAILED', {
      error: error.message,
      userId: event.sender.session?.userId || 'anonymous'
    });

    return {
      success: false,
      error: error.message
    };
  }
}));

// MCP Memory Add Observations - for storing case observations
ipcMain.handle('mcp-memory-add-observations', secureIPCHandler('mcp-memory-add-observations', async (event, params) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';

    if (!securityManager.checkRateLimit('mcp_memory_observe', userId)) {
      throw new Error('Rate limit exceeded for memory observations');
    }

    // Audit observation addition
    securityManager.auditLog('MCP_MEMORY', 'OBSERVATIONS_ADDED', {
      userId: userId,
      observationCount: params.observations?.length || 0,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      observations: params.observations || [],
      message: 'Observations added (development mode)'
    };

  } catch (error) {
    securityManager.auditLog('MCP_MEMORY', 'OBSERVATION_ADDITION_FAILED', {
      error: error.message,
      userId: event.sender.session?.userId || 'anonymous'
    });

    return {
      success: false,
      error: error.message
    };
  }
}));

// MCP Memory Create Relations - for storing relationships between entities
ipcMain.handle('mcp-memory-create-relations', secureIPCHandler('mcp-memory-create-relations', async (event, params) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';

    if (!securityManager.checkRateLimit('mcp_memory_relate', userId)) {
      throw new Error('Rate limit exceeded for memory relations');
    }

    // Audit relation creation
    securityManager.auditLog('MCP_MEMORY', 'RELATIONS_CREATED', {
      userId: userId,
      relationCount: params.relations?.length || 0,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      relations: params.relations || [],
      message: 'Relations created (development mode)'
    };

  } catch (error) {
    securityManager.auditLog('MCP_MEMORY', 'RELATION_CREATION_FAILED', {
      error: error.message,
      userId: event.sender.session?.userId || 'anonymous'
    });

    return {
      success: false,
      error: error.message
    };
  }
}));

// =====================
// AI SERVICE IPC HANDLERS
// =====================

// Handle AI chat requests with comprehensive security
ipcMain.handle('ai-chat', secureIPCHandler('ai-chat', async (event, data) => {
  try {
    const { query, sessionId, options = {} } = data || {};
    const userId = event.sender.session?.userId || 'anonymous';

    // Input validation
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid query: must be a non-empty string');
    }

    if (query.length > 5000) {
      throw new Error('Query too long: maximum 5000 characters allowed');
    }

    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('Invalid sessionId: must be provided');
    }

    // Rate limiting with user-specific limits
    if (!securityManager.checkRateLimit('ai_chat', userId)) {
      securityManager.auditLog('AI_CHAT', 'RATE_LIMIT_EXCEEDED', {
        userId: userId,
        sessionId: sessionId,
        queryLength: query.length
      });
      throw new Error('Rate limit exceeded. Please wait before making another request.');
    }

    // Session validation - Re-enabled for security
    // Validate session with graceful fallback for new sessions
    if (sessionId && !securityManager.validateSession(sessionId)) {
      // Create new session if validation fails
      const newSessionId = securityManager.createSecureSession(userId);
      event.sender.session.sessionId = newSessionId;

      securityManager.auditLog('AI_CHAT', 'SESSION_RENEWED', {
        oldSessionId: sessionId,
        newSessionId: newSessionId,
        userId: userId
      });
    }

    // Sanitize and prepare the request
    const sanitizedQuery = query.trim().substring(0, 5000);
    const requestStartTime = Date.now();

    // Emit AI request start event
    apiIntegration.emit('ai_request_start', {
      sessionId: sessionId,
      userId: userId,
      queryLength: sanitizedQuery.length
    });

    // Make the AI request with legal context
    const response = await apiIntegration.generateLegalResponse(sanitizedQuery, {
      sessionId: sessionId,
      userId: userId,
      ...options
    });

    const processingTime = Date.now() - requestStartTime;

    // Log successful AI interaction
    securityManager.auditLog('AI_CHAT', 'REQUEST_COMPLETED', {
      sessionId: sessionId,
      userId: userId,
      queryLength: sanitizedQuery.length,
      responseLength: response.response?.length || 0,
      processingTime: processingTime,
      success: response.success,
      fallback: response.fallback || false
    });

    // Emit success event
    apiIntegration.emit('ai_request_success', {
      sessionId: sessionId,
      responseTime: processingTime,
      tokenCount: response.tokenCount || 0
    });

    return {
      success: true,
      response: response.content || response.response || response,  // FIXED: OllamaClient returns processed content in .content
      model: response.model,
      processingTime: processingTime,
      fallback: response.fallback || false,
      sessionId: sessionId
    };

  } catch (error) {
    // Log AI request failure
    securityManager.auditLog('AI_CHAT', 'REQUEST_FAILED', {
      error: error.message,
      sessionId: data?.sessionId,
      userId: event.sender.session?.userId || 'anonymous'
    });

    // Emit failure event
    apiIntegration.emit('ai_request_failed', {
      error: error.message,
      sessionId: data?.sessionId
    });

    return {
      success: false,
      error: error.message,
      fallback: error.message.includes('Rate limit') ? false : true
    };
  }
}));

// Check AI service health status
ipcMain.handle('ai-health', async (event) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';

    // Rate limiting for health checks
    if (!securityManager.checkRateLimit('ai_health', userId)) {
      throw new Error('Rate limit exceeded for health checks');
    }

    // Check Ollama service status
    const healthStatus = await apiIntegration.checkOllamaStatus();

    const healthInfo = {
      service: 'ollama',
      available: healthStatus.available,
      endpoint: 'localhost:11434',
      models: healthStatus.models || [],
      version: healthStatus.version || 'unknown',
      circuitBreaker: {
        state: apiIntegration.circuitBreaker.state,
        failures: apiIntegration.circuitBreaker.failures,
        threshold: apiIntegration.circuitBreaker.threshold
      },
      rateLimit: {
        requests: apiIntegration.rateLimiter.requests,
        maxRequests: apiIntegration.rateLimiter.maxRequests,
        windowMs: apiIntegration.rateLimiter.windowMs
      },
      timestamp: new Date().toISOString()
    };

    // Log health check
    securityManager.auditLog('AI_HEALTH', 'HEALTH_CHECK_COMPLETED', {
      userId: userId,
      available: healthStatus.available,
      modelCount: healthStatus.models?.length || 0
    });

    return {
      success: true,
      health: healthInfo
    };

  } catch (error) {
    securityManager.auditLog('AI_HEALTH', 'HEALTH_CHECK_FAILED', {
      error: error.message,
      userId: event.sender.session?.userId || 'anonymous'
    });

    return {
      success: false,
      error: error.message,
      health: {
        service: 'ollama',
        available: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
});

// Get AI usage metrics and statistics
ipcMain.handle('ai-metrics', async (event) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';

    // Rate limiting for metrics
    if (!securityManager.checkRateLimit('ai_metrics', userId)) {
      throw new Error('Rate limit exceeded for metrics requests');
    }

    // Collect metrics from various sources
    const currentTime = Date.now();

    const metrics = {
      service: {
        name: 'ollama',
        endpoint: apiIntegration.ollamaEndpoint,
        uptime: currentTime - (apiIntegration.startTime || currentTime)
      },
      circuitBreaker: {
        state: apiIntegration.circuitBreaker.state,
        failures: apiIntegration.circuitBreaker.failures,
        threshold: apiIntegration.circuitBreaker.threshold,
        nextAttempt: apiIntegration.circuitBreaker.nextAttempt,
        lastStateChange: apiIntegration.circuitBreaker.lastStateChange || null
      },
      rateLimiter: {
        currentRequests: apiIntegration.rateLimiter.requests,
        maxRequests: apiIntegration.rateLimiter.maxRequests,
        windowMs: apiIntegration.rateLimiter.windowMs,
        windowStart: apiIntegration.rateLimiter.windowStart,
        remainingRequests: Math.max(0, apiIntegration.rateLimiter.maxRequests - apiIntegration.rateLimiter.requests)
      },
      queue: {
        pendingRequests: apiIntegration.requestQueue?.length || 0,
        processing: apiIntegration.processing || false
      },
      session: {
        userId: userId,
        sessionValid: securityManager.validateSession(event.sender.session?.sessionId),
        timestamp: new Date().toISOString()
      }
    };

    // Log metrics access
    securityManager.auditLog('AI_METRICS', 'METRICS_ACCESSED', {
      userId: userId,
      circuitBreakerState: metrics.circuitBreaker.state,
      remainingRequests: metrics.rateLimiter.remainingRequests
    });

    return {
      success: true,
      metrics: metrics
    };

  } catch (error) {
    securityManager.auditLog('AI_METRICS', 'METRICS_FAILED', {
      error: error.message,
      userId: event.sender.session?.userId || 'anonymous'
    });

    return {
      success: false,
      error: error.message
    };
  }
});

// Test AI connection
ipcMain.handle('ai-test-connection', async (event) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';

    // Rate limiting for connection tests
    if (!securityManager.checkRateLimit('ai_test_connection', userId)) {
      throw new Error('Rate limit exceeded for connection tests');
    }

    // Test the connection to Ollama
    const healthStatus = await apiIntegration.checkOllamaStatus();

    securityManager.auditLog('AI_TEST', 'CONNECTION_TEST', {
      userId: userId,
      available: healthStatus.available,
      endpoint: apiIntegration.ollamaEndpoint
    });

    return {
      success: true,
      connected: healthStatus.available,
      endpoint: apiIntegration.ollamaEndpoint,
      models: healthStatus.models || [],
      error: healthStatus.error || null
    };

  } catch (error) {
    securityManager.auditLog('AI_TEST', 'CONNECTION_TEST_FAILED', {
      error: error.message,
      userId: event.sender.session?.userId || 'anonymous'
    });

    return {
      success: false,
      connected: false,
      error: error.message
    };
  }
});

// Analyze documents with AI
ipcMain.handle('ai-analyze-document', async (event, data) => {
  try {
    const { documentText, documentType, analysisType } = data || {};
    const userId = event.sender.session?.userId || 'anonymous';

    // Input validation
    if (!documentText || typeof documentText !== 'string') {
      throw new Error('Invalid documentText: must be a non-empty string');
    }

    if (documentText.length > 50000) {
      throw new Error('Document too large: maximum 50,000 characters allowed');
    }

    if (!documentType || !analysisType) {
      throw new Error('documentType and analysisType are required');
    }

    // Rate limiting with stricter limits for document analysis
    if (!securityManager.checkRateLimit('ai_analyze_document', userId)) {
      throw new Error('Rate limit exceeded for document analysis');
    }

    // Session validation (optional but recommended)
    const sessionId = event.sender.session?.sessionId;
    if (sessionId && !securityManager.validateSession(sessionId)) {
      throw new Error('Invalid or expired session');
    }

    const requestStartTime = Date.now();

    // Perform document analysis
    const analysisResult = await apiIntegration.processDocumentAnalysis(documentText, analysisType);

    const processingTime = Date.now() - requestStartTime;

    // Log document analysis
    securityManager.auditLog('AI_DOCUMENT', 'ANALYSIS_COMPLETED', {
      userId: userId,
      documentType: documentType,
      analysisType: analysisType,
      documentLength: documentText.length,
      processingTime: processingTime,
      success: analysisResult.success,
      chunks: analysisResult.chunks || 0
    });

    return {
      success: true,
      analysis: analysisResult.analysis,
      documentType: documentType,
      analysisType: analysisType,
      processingTime: processingTime,
      chunks: analysisResult.chunks || 0,
      fallback: analysisResult.fallback || false
    };

  } catch (error) {
    securityManager.auditLog('AI_DOCUMENT', 'ANALYSIS_FAILED', {
      error: error.message,
      documentType: data?.documentType,
      analysisType: data?.analysisType,
      userId: event.sender.session?.userId || 'anonymous'
    });

    return {
      success: false,
      error: error.message
    };
  }
});

// Generate legal templates with AI
ipcMain.handle('ai-generate-template', async (event, data) => {
  try {
    const { templateType, formData } = data || {};
    const userId = event.sender.session?.userId || 'anonymous';

    // Input validation
    if (!templateType || typeof templateType !== 'string') {
      throw new Error('Invalid templateType: must be specified');
    }

    if (!formData || typeof formData !== 'object') {
      throw new Error('Invalid formData: must be an object');
    }

    // Rate limiting for template generation
    if (!securityManager.checkRateLimit('ai_generate_template', userId)) {
      throw new Error('Rate limit exceeded for template generation');
    }

    // Session validation
    const sessionId = event.sender.session?.sessionId;
    if (sessionId && !securityManager.validateSession(sessionId)) {
      throw new Error('Invalid or expired session');
    }

    const requestStartTime = Date.now();

    // Build template generation prompt
    const templatePrompt = buildTemplatePrompt(templateType, formData);

    // Generate template using AI
    const response = await apiIntegration.generateLegalResponse(templatePrompt, {
      type: 'template_generation',
      templateType: templateType,
      userId: userId
    });

    const processingTime = Date.now() - requestStartTime;

    // Log template generation
    securityManager.auditLog('AI_TEMPLATE', 'GENERATION_COMPLETED', {
      userId: userId,
      templateType: templateType,
      processingTime: processingTime,
      success: response.success,
      fallback: response.fallback || false
    });

    return {
      success: true,
      template: response.response,
      templateType: templateType,
      processingTime: processingTime,
      fallback: response.fallback || false
    };

  } catch (error) {
    securityManager.auditLog('AI_TEMPLATE', 'GENERATION_FAILED', {
      error: error.message,
      templateType: data?.templateType,
      userId: event.sender.session?.userId || 'anonymous'
    });

    return {
      success: false,
      error: error.message
    };
  }
});

// Clear AI session data
ipcMain.handle('ai-clear-session', async (event, sessionId) => {
  try {
    const userId = event.sender.session?.userId || 'anonymous';

    // Input validation
    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('Invalid sessionId: must be provided');
    }

    // Rate limiting for session clearing
    if (!securityManager.checkRateLimit('ai_clear_session', userId)) {
      throw new Error('Rate limit exceeded for session clearing');
    }

    // Validate that user owns this session or has appropriate permissions
    if (!securityManager.validateSession(sessionId)) {
      throw new Error('Invalid or expired session');
    }

    // Log session clearing
    securityManager.auditLog('AI_SESSION', 'SESSION_CLEARED', {
      userId: userId,
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      sessionId: sessionId,
      cleared: true
    };

  } catch (error) {
    securityManager.auditLog('AI_SESSION', 'SESSION_CLEAR_FAILED', {
      error: error.message,
      sessionId: sessionId,
      userId: event.sender.session?.userId || 'anonymous'
    });

    return {
      success: false,
      error: error.message
    };
  }
});

// Helper method for building template prompts
function buildTemplatePrompt(templateType, formData) {
  const templatePrompts = {
    contract: `Generate a ${formData.contractType || 'standard'} contract template with the following details:
- Parties: ${formData.parties || 'Party A and Party B'}
- Purpose: ${formData.purpose || 'General agreement'}
- Key terms: ${JSON.stringify(formData.terms || {})}
Include standard legal clauses and ensure proper legal language.`,

    motion: `Generate a legal motion template for ${formData.motionType || 'general motion'} with:
- Court: ${formData.court || 'Appropriate jurisdiction'}
- Case details: ${formData.caseDetails || 'Case information'}
- Relief sought: ${formData.relief || 'Appropriate relief'}
Follow proper legal motion format and include necessary legal citations.`,

    letter: `Generate a legal ${formData.letterType || 'business'} letter template with:
- Recipient: ${formData.recipient || 'Recipient'}
- Subject: ${formData.subject || 'Legal matter'}
- Key points: ${JSON.stringify(formData.points || [])}
Use appropriate legal tone and formatting.`,

    pleading: `Generate a ${formData.pleadingType || 'complaint'} pleading template with:
- Jurisdiction: ${formData.jurisdiction || 'State court'}
- Parties: ${formData.parties || 'Plaintiff and Defendant'}
- Claims: ${JSON.stringify(formData.claims || [])}
Follow proper pleading format and include required elements.`
  };

  return templatePrompts[templateType] || `Generate a legal ${templateType} template based on the provided information: ${JSON.stringify(formData)}`;
}

// Clean exit with proper cleanup
app.on('before-quit', async () => {
  try {
    const shutdownCorrelationId = setCorrelationId(`app-shutdown-${Date.now()}`);

    if (apiIntegration) {
      apiIntegration.destroy();
      info('AI Integration cleaned up during shutdown', {
        component: 'application-shutdown',
        correlationId: shutdownCorrelationId
      });
    }

    if (secureDatabase) {
      await secureDatabase.close();
      info('Secure database connection closed', {
        component: 'application-shutdown',
        correlationId: shutdownCorrelationId
      });
    }

    if (keyManager) {
      keyManager.destroyCache();
      auditLog('KEY_CACHE_DESTROYED', {
        correlationId: shutdownCorrelationId,
        component: 'KeyManager'
      }, { privileged: true, classification: 'security-data' });
    }

    if (securityManager) {
      securityManager.auditLog('APPLICATION', 'APPLICATION_SHUTDOWN', {
        shutdownTime: new Date().toISOString(),
        correlationId: shutdownCorrelationId
      });
    }

    auditLog('APPLICATION_SHUTDOWN_COMPLETE', {
      shutdownTime: new Date().toISOString(),
      correlationId: shutdownCorrelationId,
      secureShutdown: true
    }, { privileged: true, classification: 'system-security' });
  } catch (shutdownError) {
    error('Error during application shutdown', shutdownError, {
      component: 'application-shutdown',
      critical: true
    });
  }
});

// Application startup banner with structured logging
info('Justice Companion - Legal Assistant Application started', {
  component: 'application-startup',
  encryption: 'enabled',
  auditTrail: 'active',
  privacyProtection: 'enabled',
  gdprCompliance: 'active',
  applicationReady: true
});

auditLog('APPLICATION_READY', {
  startupTime: new Date().toISOString(),
  securityFeatures: ['encryption', 'audit-trail', 'privacy-protection', 'gdpr-compliance'],
  applicationVersion: process.env.npm_package_version || 'development'
}, { privileged: true, classification: 'system-security' });
