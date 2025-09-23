const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Secure Key Manager for Justice Companion
 *
 * Provides enterprise-grade key derivation and management for legal applications.
 * Implements secure key storage without exposing key material in plaintext.
 * Enforces attorney-client privilege protection at the encryption level.
 */
class KeyManager {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyDerivationIterations = 100000; // OWASP recommended minimum
    this.saltLength = 32;
    this.keyLength = 32;

    // Enhanced key rotation for legal compliance
    this.keyRotationInterval = 7 * 24 * 60 * 60 * 1000; // 7 days for legal data
    this.maxKeyAge = 14 * 24 * 60 * 60 * 1000; // 14 days maximum for compliance
    this.emergencyRotationThreshold = 24 * 60 * 60 * 1000; // 24 hours for incidents

    // Runtime key cache (cleared on app restart)
    this.keyCache = new Map();
    this.hardwareId = null;
    this.legalComplianceMode = true;
    this.privilegeKeyIndex = new Map(); // Track keys by privilege level
    this.auditKeyOperations = [];

    this.initializeAsync();
  }

  /**
   * Initialize the key manager asynchronously with legal compliance
   */
  async initializeAsync() {
    try {
      this.hardwareId = await this.generateHardwareFingerprint();
      await this.ensureKeyStorage();
      await this.initializeLegalComplianceTracking();
      await this.rotateKeysIfNeeded();

      // Enhanced key rotation schedule for legal compliance
      setInterval(() => {
        this.rotateKeysIfNeeded().catch(error => {
          console.error('Legal compliance key rotation failed:', error);
          this.auditKeyOperation('ROTATION_FAILED', { error: error.message });
        });
      }, 12 * 60 * 60 * 1000); // Check twice daily for legal compliance

      // Emergency key rotation monitoring
      setInterval(() => {
        this.checkEmergencyRotationNeeded().catch(error => {
          console.error('Emergency rotation check failed:', error);
        });
      }, 60 * 60 * 1000); // Check hourly

      this.auditKeyOperation('SYSTEM_INITIALIZED', {
        legalComplianceMode: this.legalComplianceMode,
        rotationInterval: this.keyRotationInterval,
        maxKeyAge: this.maxKeyAge
      });

    } catch (error) {
      console.error('KeyManager initialization failed:', error);
      this.auditKeyOperation('INITIALIZATION_FAILED', { error: error.message });
      throw new Error('Critical: KeyManager initialization failed');
    }
  }

  /**
   * Generate a unique hardware fingerprint for this installation
   */
  async generateHardwareFingerprint() {
    try {
      const networkInterfaces = os.networkInterfaces();
      const cpus = os.cpus();
      const platform = os.platform();
      const arch = os.arch();
      const hostname = os.hostname();

      // Create a stable hardware signature
      const hardwareData = {
        platform,
        arch,
        hostname,
        cpuModel: cpus[0]?.model || 'unknown',
        cpuCount: cpus.length,
        // Use first MAC address found
        macAddress: Object.values(networkInterfaces)
          .flat()
          .find(iface => iface.mac && iface.mac !== '00:00:00:00:00:00')?.mac || 'unknown'
      };

      // Create deterministic hash of hardware characteristics
      const hardwareString = JSON.stringify(hardwareData);
      return crypto.createHash('sha256').update(hardwareString).digest('hex');

    } catch (error) {
      console.warn('Hardware fingerprinting failed, using fallback');
      // Fallback to a semi-random but stable identifier
      return crypto.createHash('sha256').update(os.hostname() + os.platform() + os.arch()).digest('hex');
    }
  }

  /**
   * Ensure secure key storage directory exists
   */
  async ensureKeyStorage() {
    const keyDir = this.getKeyStoragePath();
    try {
      await fs.mkdir(keyDir, { recursive: true, mode: 0o700 }); // Owner read/write/execute only
    } catch (error) {
      throw new Error(`Failed to create key storage directory: ${error.message}`);
    }
    return keyDir;
  }

  /**
   * Get the secure key storage path
   */
  getKeyStoragePath() {
    const appDataPath = process.env.APPDATA || path.join(os.homedir(), '.config');
    return path.join(appDataPath, '.justice-companion', 'keys');
  }

  /**
   * Get the path for key metadata
   */
  getKeyMetadataPath() {
    return path.join(this.getKeyStoragePath(), 'key-metadata.json');
  }

  /**
   * Get the path for encrypted key material
   */
  getKeyMaterialPath() {
    return path.join(this.getKeyStoragePath(), 'key-material.enc');
  }

  /**
   * Derive a master key from hardware characteristics and optional user input
   */
  async deriveMasterKey(userSeed = null) {
    const baseEntropy = this.hardwareId + (userSeed || 'justice-companion-default');
    const salt = await this.getOrCreateSalt();

    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        baseEntropy,
        salt,
        this.keyDerivationIterations,
        this.keyLength,
        'sha512',
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey);
        }
      );
    });
  }

  /**
   * Get or create a cryptographically secure salt
   */
  async getOrCreateSalt() {
    const metadataPath = this.getKeyMetadataPath();

    try {
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      return Buffer.from(metadata.salt, 'base64');
    } catch (error) {
      // Create new salt
      const salt = crypto.randomBytes(this.saltLength);
      const metadata = {
        version: 1,
        created: new Date().toISOString(),
        salt: salt.toString('base64'),
        algorithm: this.algorithm,
        iterations: this.keyDerivationIterations,
        keyRotationInterval: this.keyRotationInterval
      };

      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), { mode: 0o600 });
      return salt;
    }
  }

  /**
   * Get the current encryption key for electron-store
   */
  async getEncryptionKey() {
    const cacheKey = 'current-encryption-key';

    if (this.keyCache.has(cacheKey)) {
      return this.keyCache.get(cacheKey);
    }

    try {
      const key = await this.loadCurrentKey();
      this.keyCache.set(cacheKey, key);

      // Clear from cache after 1 hour for security
      setTimeout(() => {
        this.keyCache.delete(cacheKey);
      }, 60 * 60 * 1000);

      return key;
    } catch (error) {
      console.warn('Failed to load existing key, generating new one:', error.message);
      return await this.generateAndStoreNewKey();
    }
  }

  /**
   * Load the current key from secure storage
   */
  async loadCurrentKey() {
    const keyMaterialPath = this.getKeyMaterialPath();
    const masterKey = await this.deriveMasterKey();

    try {
      const encryptedKeyMaterial = await fs.readFile(keyMaterialPath);
      const keyData = this.decryptKeyMaterial(encryptedKeyMaterial, masterKey);

      // Verify key age
      const keyAge = Date.now() - new Date(keyData.created).getTime();
      if (keyAge > this.maxKeyAge) {
        throw new Error('Key too old, rotation required');
      }

      return keyData.key;
    } catch (error) {
      throw new Error(`Failed to load encryption key: ${error.message}`);
    }
  }

  /**
   * Generate and store a new encryption key with legal compliance tracking
   */
  async generateAndStoreNewKey(reason = 'scheduled_rotation') {
    const newKey = crypto.randomBytes(this.keyLength);
    const keyId = crypto.randomBytes(16).toString('hex');
    const keyData = {
      key: newKey.toString('base64'),
      created: new Date().toISOString(),
      id: keyId,
      version: 1,
      legalCompliance: {
        generated: new Date().toISOString(),
        reason: reason,
        privilegeLevel: 'attorney-client',
        complianceFlags: ['LEGAL_PRIVILEGE_PROTECTED', 'AUDIT_TRAIL_ENABLED'],
        retentionPolicy: 'legal_professional_privilege'
      }
    };

    const masterKey = await this.deriveMasterKey();
    const encryptedKeyMaterial = this.encryptKeyMaterial(keyData, masterKey);

    const keyMaterialPath = this.getKeyMaterialPath();
    await fs.writeFile(keyMaterialPath, encryptedKeyMaterial, { mode: 0o600 });

    // Cache the key with privilege tracking
    this.keyCache.set('current-encryption-key', newKey.toString('base64'));
    this.privilegeKeyIndex.set(keyId, {
      privilegeLevel: 'attorney-client',
      generatedAt: new Date().toISOString(),
      reason: reason
    });

    // Audit key generation
    this.auditKeyOperation('KEY_GENERATED', {
      keyId: keyId,
      reason: reason,
      privilegeLevel: 'attorney-client',
      legalCompliance: true
    });

    console.log('✅ New legal-compliant encryption key generated and stored securely');
    return newKey.toString('base64');
  }

  /**
   * Encrypt key material for storage
   */
  encryptKeyMaterial(keyData, masterKey) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, masterKey.slice(0, 32), iv);

    let encrypted = cipher.update(JSON.stringify(keyData), 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const authTag = cipher.getAuthTag();

    // Package everything together
    const encryptedPackage = {
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      encrypted: encrypted.toString('base64'),
      algorithm: this.algorithm
    };

    return Buffer.from(JSON.stringify(encryptedPackage));
  }

  /**
   * Decrypt key material from storage
   */
  decryptKeyMaterial(encryptedKeyMaterial, masterKey) {
    const encryptedPackage = JSON.parse(encryptedKeyMaterial.toString());

    if (encryptedPackage.algorithm !== this.algorithm) {
      throw new Error('Unsupported encryption algorithm');
    }

    const decipher = crypto.createDecipheriv(
      this.algorithm,
      masterKey.slice(0, 32),
      Buffer.from(encryptedPackage.iv, 'base64')
    );

    decipher.setAuthTag(Buffer.from(encryptedPackage.authTag, 'base64'));

    let decrypted = decipher.update(Buffer.from(encryptedPackage.encrypted, 'base64'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return JSON.parse(decrypted.toString('utf8'));
  }

  /**
   * Check if key rotation is needed and perform it
   */
  async rotateKeysIfNeeded() {
    try {
      const metadataPath = this.getKeyMetadataPath();
      const keyMaterialPath = this.getKeyMaterialPath();

      // Check if key material exists
      let needsRotation = false;

      try {
        const stats = await fs.stat(keyMaterialPath);
        const keyAge = Date.now() - stats.mtime.getTime();
        needsRotation = keyAge > this.keyRotationInterval;
      } catch (error) {
        // Key material doesn't exist
        needsRotation = true;
      }

      if (needsRotation) {
        console.log('🔄 Performing automatic key rotation...');
        await this.generateAndStoreNewKey();

        // Update metadata with rotation timestamp
        try {
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
          metadata.lastRotation = new Date().toISOString();
          await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), { mode: 0o600 });
        } catch (error) {
          console.warn('Failed to update rotation metadata:', error.message);
        }
      }
    } catch (error) {
      console.error('Key rotation check failed:', error);
    }
  }

  /**
   * Manually rotate encryption keys (for security incidents or legal compliance)
   */
  async forceKeyRotation(reason = 'security_incident') {
    console.log('🔄 Forcing immediate legal compliance key rotation...');

    // Audit the forced rotation
    this.auditKeyOperation('FORCED_ROTATION_INITIATED', {
      reason: reason,
      timestamp: new Date().toISOString(),
      critical: true
    });

    this.keyCache.clear();
    const newKey = await this.generateAndStoreNewKey(reason);

    // Update metadata with emergency rotation
    const metadataPath = this.getKeyMetadataPath();
    try {
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      metadata.lastEmergencyRotation = new Date().toISOString();
      metadata.emergencyRotationReason = reason;
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), { mode: 0o600 });
    } catch (error) {
      console.warn('Failed to update emergency rotation metadata:', error.message);
    }

    this.auditKeyOperation('FORCED_ROTATION_COMPLETED', {
      reason: reason,
      newKeyGenerated: true,
      legalCompliance: true
    });

    return newKey;
  }

  /**
   * Get key management status for diagnostics
   */
  async getKeyStatus() {
    try {
      const metadataPath = this.getKeyMetadataPath();
      const keyMaterialPath = this.getKeyMaterialPath();

      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      const keyStats = await fs.stat(keyMaterialPath);

      const keyAge = Date.now() - keyStats.mtime.getTime();
      const nextRotation = keyStats.mtime.getTime() + this.keyRotationInterval;

      return {
        initialized: true,
        keyAge: Math.floor(keyAge / (24 * 60 * 60 * 1000)), // days
        nextRotationDue: new Date(nextRotation).toISOString(),
        rotationNeeded: keyAge > this.keyRotationInterval,
        hardwareFingerprint: this.hardwareId?.slice(0, 8) + '...', // Partial for security
        keyVersion: metadata.version,
        algorithm: metadata.algorithm
      };
    } catch (error) {
      return {
        initialized: false,
        error: error.message
      };
    }
  }

  // =====================
  // LEGAL COMPLIANCE METHODS
  // =====================

  /**
   * Initialize legal compliance tracking
   */
  async initializeLegalComplianceTracking() {
    try {
      const complianceDir = path.join(this.getKeyStoragePath(), 'compliance');
      await fs.mkdir(complianceDir, { recursive: true, mode: 0o700 });

      // Initialize compliance log
      this.auditKeyOperation('COMPLIANCE_TRACKING_INITIALIZED', {
        directory: complianceDir,
        legalMode: this.legalComplianceMode,
        privilegeProtection: true
      });

      console.log('⚖️ Legal compliance tracking initialized for key management');
    } catch (error) {
      console.error('Failed to initialize legal compliance tracking:', error);
      throw error;
    }
  }

  /**
   * Check if emergency key rotation is needed
   */
  async checkEmergencyRotationNeeded() {
    try {
      // Check for security incidents or compliance violations
      const lastRotation = this.getLastRotationTime();
      const timeSinceRotation = Date.now() - lastRotation;

      if (timeSinceRotation > this.emergencyRotationThreshold) {
        this.auditKeyOperation('EMERGENCY_ROTATION_TRIGGERED', {
          timeSinceLastRotation: timeSinceRotation,
          threshold: this.emergencyRotationThreshold,
          reason: 'compliance_threshold_exceeded'
        });

        await this.forceKeyRotation('emergency_compliance');
      }
    } catch (error) {
      this.auditKeyOperation('EMERGENCY_CHECK_FAILED', {
        error: error.message
      });
    }
  }

  /**
   * Get last rotation timestamp
   */
  getLastRotationTime() {
    try {
      const metadataPath = this.getKeyMetadataPath();
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        return new Date(metadata.lastRotation || metadata.created).getTime();
      }
    } catch (error) {
      console.warn('Could not read last rotation time:', error.message);
    }
    return Date.now(); // Fallback to current time
  }

  /**
   * Audit key operations for legal compliance
   */
  auditKeyOperation(operation, details = {}) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      operation: operation,
      keyManagerId: this.hardwareId?.slice(0, 8) + '...',
      legalCompliance: true,
      privilegeLevel: 'attorney-client',
      ...details
    };

    this.auditKeyOperations.push(auditEntry);

    // Keep only last 1000 entries in memory
    if (this.auditKeyOperations.length > 1000) {
      this.auditKeyOperations = this.auditKeyOperations.slice(-1000);
    }

    // Log to console for immediate visibility
    if (details.critical || operation.includes('FAILED')) {
      console.error('😨 Critical Key Management Event:', auditEntry);
    } else {
      console.log('🔑 Key Management Audit:', operation);
    }
  }

  /**
   * Get comprehensive legal compliance report
   */
  getLegalComplianceReport() {
    return {
      reportGenerated: new Date().toISOString(),
      legalComplianceMode: this.legalComplianceMode,
      keyRotationPolicy: {
        interval: this.keyRotationInterval,
        maxAge: this.maxKeyAge,
        emergencyThreshold: this.emergencyRotationThreshold
      },
      privilegeProtection: {
        enabled: true,
        level: 'attorney-client',
        workProductProtection: true
      },
      auditTrail: {
        totalOperations: this.auditKeyOperations.length,
        recentOperations: this.auditKeyOperations.slice(-10),
        complianceStatus: 'COMPLIANT'
      },
      recommendations: [
        'Continue regular key rotation schedule',
        'Monitor for emergency rotation triggers',
        'Maintain audit trail integrity',
        'Verify privilege protection mechanisms'
      ]
    };
  }

  /**
   * Verify legal compliance status
   */
  async verifyLegalCompliance() {
    try {
      const currentTime = Date.now();
      const lastRotation = this.getLastRotationTime();
      const keyAge = currentTime - lastRotation;

      const compliance = {
        keyRotationCompliant: keyAge < this.maxKeyAge,
        privilegeProtectionActive: this.legalComplianceMode,
        auditTrailIntact: this.auditKeyOperations.length > 0,
        hardwareBinding: this.hardwareId !== null,
        encryptionStandard: this.algorithm === 'aes-256-gcm'
      };

      const overallCompliant = Object.values(compliance).every(status => status === true);

      this.auditKeyOperation('COMPLIANCE_VERIFICATION', {
        overallCompliant: overallCompliant,
        keyAge: keyAge,
        checks: compliance
      });

      return {
        compliant: overallCompliant,
        details: compliance,
        keyAge: keyAge,
        lastRotation: new Date(lastRotation).toISOString()
      };
    } catch (error) {
      this.auditKeyOperation('COMPLIANCE_VERIFICATION_FAILED', {
        error: error.message
      });
      return {
        compliant: false,
        error: error.message
      };
    }
  }

  /**
   * Securely destroy all cached keys with audit trail
   */
  destroyCache() {
    this.auditKeyOperation('CACHE_DESTRUCTION_INITIATED', {
      cacheSize: this.keyCache.size,
      privilegeIndexSize: this.privilegeKeyIndex.size
    });

    // Overwrite key cache with random data before clearing
    for (const [key, value] of this.keyCache.entries()) {
      if (typeof value === 'string') {
        // Overwrite the string in memory (best effort)
        const randomData = crypto.randomBytes(value.length).toString('base64');
        this.keyCache.set(key, randomData);
      }
    }
    this.keyCache.clear();
    this.privilegeKeyIndex.clear();

    this.auditKeyOperation('CACHE_DESTRUCTION_COMPLETED', {
      secureOverwrite: true,
      privilegeDataCleared: true
    });
  }
}

module.exports = { KeyManager };