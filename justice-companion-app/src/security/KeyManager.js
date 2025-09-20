const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Secure Key Manager for Justice Companion
 *
 * Provides enterprise-grade key derivation and management for legal applications.
 * Implements secure key storage without exposing key material in plaintext.
 */
class KeyManager {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyDerivationIterations = 100000; // OWASP recommended minimum
    this.saltLength = 32;
    this.keyLength = 32;

    // Key rotation settings
    this.keyRotationInterval = 30 * 24 * 60 * 60 * 1000; // 30 days
    this.maxKeyAge = 60 * 24 * 60 * 60 * 1000; // 60 days for backward compatibility

    // Runtime key cache (cleared on app restart)
    this.keyCache = new Map();
    this.hardwareId = null;

    this.initializeAsync();
  }

  /**
   * Initialize the key manager asynchronously
   */
  async initializeAsync() {
    try {
      this.hardwareId = await this.generateHardwareFingerprint();
      await this.ensureKeyStorage();
      await this.rotateKeysIfNeeded();

      // Schedule automatic key rotation
      setInterval(() => {
        this.rotateKeysIfNeeded().catch(error => {
          console.error('Key rotation failed:', error);
        });
      }, 24 * 60 * 60 * 1000); // Check daily

    } catch (error) {
      console.error('KeyManager initialization failed:', error);
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
   * Generate and store a new encryption key
   */
  async generateAndStoreNewKey() {
    const newKey = crypto.randomBytes(this.keyLength);
    const keyData = {
      key: newKey.toString('base64'),
      created: new Date().toISOString(),
      id: crypto.randomBytes(16).toString('hex'),
      version: 1
    };

    const masterKey = await this.deriveMasterKey();
    const encryptedKeyMaterial = this.encryptKeyMaterial(keyData, masterKey);

    const keyMaterialPath = this.getKeyMaterialPath();
    await fs.writeFile(keyMaterialPath, encryptedKeyMaterial, { mode: 0o600 });

    // Cache the key
    this.keyCache.set('current-encryption-key', newKey.toString('base64'));

    console.log('✅ New encryption key generated and stored securely');
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
   * Manually rotate encryption keys (for security incidents)
   */
  async forceKeyRotation() {
    console.log('🔄 Forcing immediate key rotation...');
    this.keyCache.clear();
    return await this.generateAndStoreNewKey();
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

  /**
   * Securely destroy all cached keys
   */
  destroyCache() {
    // Overwrite key cache with random data before clearing
    for (const [key, value] of this.keyCache.entries()) {
      if (typeof value === 'string') {
        // Overwrite the string in memory (best effort)
        const randomData = crypto.randomBytes(value.length).toString('base64');
        this.keyCache.set(key, randomData);
      }
    }
    this.keyCache.clear();
  }
}

module.exports = { KeyManager };