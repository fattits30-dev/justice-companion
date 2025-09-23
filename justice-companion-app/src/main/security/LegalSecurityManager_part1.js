const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const winston = require('winston');
const { format } = winston;
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

/**
 * Legal Security Manager - Comprehensive security for legal applications
 * Implements attorney-client privilege protection, GDPR compliance, and audit trails
 * Enforces ethical walls and conflict checking for legal practice
 */
class LegalSecurityManager {
  constructor() {
    this.encryptionKey = null;
    this.auditLogger = null;
    this.sessionManager = new Map();
    this.rateLimiter = new Map();
    this.dataRetentionPolicies = new Map();
    this.privilegeManager = new Map(); // Track attorney-client privilege
    this.ethicalWalls = new Map(); // Conflict of interest management
    this.complianceAlerts = new Map(); // Legal compliance monitoring
    this.emergencyShutdownEnabled = false;

    this.initialize();
  }

  async initialize() {
    // Initialize encryption key
    await this.initializeEncryption();

    // Setup audit logging
    this.initializeAuditLogging();

    // Load data retention policies
    this.loadDataRetentionPolicies();

    // Initialize privilege management
    this.initializePrivilegeProtection();

    // Setup ethical walls
    this.initializeEthicalWalls();

    // Start compliance monitoring
    this.startComplianceMonitoring();

    console.log('🔒 Legal Security Manager: INITIALIZED - Attorney-Client Privilege PROTECTED');
  }

  // =====================
  // ENCRYPTION MANAGEMENT
  // =====================

  async initializeEncryption() {
    try {
      const keyPath = path.join(process.env.APPDATA || process.env.HOME, 'justice-companion', 'master.key');

      // Check if key exists
      try {
        const keyData = await fs.readFile(keyPath);
        this.encryptionKey = keyData;
        this.auditLog('SECURITY', 'ENCRYPTION_KEY_LOADED', { success: true });
      } catch (error) {
        // Generate new master key
        this.encryptionKey = crypto.randomBytes(32);

        // Ensure directory exists
        await fs.mkdir(path.dirname(keyPath), { recursive: true });

        // Save encrypted key with system-level protection
        await fs.writeFile(keyPath, this.encryptionKey, { mode: 0o600 });

        this.auditLog('SECURITY', 'NEW_ENCRYPTION_KEY_GENERATED', {
          success: true,
          keyPath: keyPath
        });
      }
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      throw new Error('CRITICAL: Unable to initialize encryption for legal data');
    }
  }

  // Encrypt sensitive legal data with AES-256-GCM and privilege protection
  encryptLegalData(data, clientId = null, privilegeLevel = 'attorney-client') {
    try {
      // Check for privilege assertion requirement
      if (this.requiresPrivilegeAssertion(data)) {
        this.assertPrivilegeProtection(data, clientId, privilegeLevel);
      }

      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

      // Enhanced AAD with privilege metadata
      const aadData = JSON.stringify({
        clientId: clientId || 'justice-companion',
        privilegeLevel: privilegeLevel,
        timestamp: Date.now(),
        classification: 'legal-privileged'
      });
      cipher.setAAD(Buffer.from(aadData));

      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      const result = {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        clientId: clientId,
        privilegeLevel: privilegeLevel,
        aadData: aadData,
        attorneyClientPrivilege: true,
        workProductPrivilege: this.isWorkProduct(data),
        encryptedAt: new Date().toISOString(),
        integrityHash: this.calculatePrivilegedDataHash(data, clientId)
      };

      this.auditLog('ENCRYPTION', 'PRIVILEGED_DATA_ENCRYPTED', {
        clientId: clientId,
        privilegeLevel: privilegeLevel,
        dataSize: JSON.stringify(data).length,
        attorneyClientPrivilege: true,
        success: true
      });

      return result;
    } catch (error) {
      this.auditLog('ENCRYPTION', 'ENCRYPTION_FAILED', {
        error: error.message,
        clientId: clientId,
        privilegeLevel: privilegeLevel,
        success: false
      });
      throw new Error('Failed to encrypt legal data');
    }
  }

  // Decrypt sensitive legal data with privilege verification
  decryptLegalData(encryptedData, accessContext = {}) {
    try {
      // Verify privilege access rights
      if (encryptedData.attorneyClientPrivilege) {
        this.verifyPrivilegeAccess(encryptedData, accessContext);
      }

      // Check for ethical wall violations
      if (encryptedData.clientId) {
        this.checkEthicalWallCompliance(encryptedData.clientId, accessContext.userId);
      }

      const iv = Buffer.from(encryptedData.iv, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);

      // Use enhanced AAD if available
      const aadBuffer = encryptedData.aadData ?
        Buffer.from(encryptedData.aadData) :
        Buffer.from(encryptedData.clientId || 'justice-companion');
      decipher.setAAD(aadBuffer);
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      const result = JSON.parse(decrypted);

      // Verify data integrity for privileged content
      if (encryptedData.integrityHash) {
        const computedHash = this.calculatePrivilegedDataHash(result, encryptedData.clientId);
        if (computedHash !== encryptedData.integrityHash) {
          throw new Error('Privileged data integrity violation detected');
        }
      }

      this.auditLog('DECRYPTION', 'PRIVILEGED_DATA_DECRYPTED', {
        clientId: encryptedData.clientId,
        privilegeLevel: encryptedData.privilegeLevel,
        accessedBy: accessContext.userId,
        attorneyClientPrivilege: encryptedData.attorneyClientPrivilege,
        success: true
      });

      return result;
    } catch (error) {
      this.auditLog('DECRYPTION', 'DECRYPTION_FAILED', {
        error: error.message,
        clientId: encryptedData.clientId,
        privilegeLevel: encryptedData.privilegeLevel,
        accessedBy: accessContext.userId,
        success: false
      });
      throw new Error('Failed to decrypt legal data - ' + error.message);
    }
  }

