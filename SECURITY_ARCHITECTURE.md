# Justice Companion - Security Architecture

## 🔒 **CRITICAL: Legal Data Protection Requirements**

This application handles **sensitive legal information** requiring enterprise-grade security:
- Client confidentiality (attorney-client privilege)
- GDPR compliance for UK citizens
- 7-year data retention requirements
- Protection against data breaches

## 🛡️ **Electron Security Implementation**

### **1. Context Isolation & Process Sandboxing**
```javascript
// main.js - MANDATORY Configuration
const mainWindow = new BrowserWindow({
  webPreferences: {
    contextIsolation: true,      // ✅ ENABLED (default in Electron 12+)
    nodeIntegration: false,      // ✅ DISABLED (default in Electron 5+)
    sandbox: true,               // ✅ ENABLE SANDBOXING
    preload: path.join(__dirname, 'preload.js'),
    webSecurity: true,           // ✅ NEVER DISABLE
    allowRunningInsecureContent: false  // ✅ BLOCK INSECURE CONTENT
  }
});
```

### **2. Secure Data Storage**
```javascript
// Electron SafeStorage for sensitive legal data
const { safeStorage } = require('electron');
const Store = require('electron-store');

// Encrypted store for case data
const store = new Store({
  name: 'legal-cases',
  encryptionKey: 'legal-aid-encryption-key-2024',
  cwd: app.getPath('userData')
});

// SafeStorage for extremely sensitive data
function encryptSensitiveData(data) {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(JSON.stringify(data));
  }
  throw new Error('Encryption not available - cannot store sensitive legal data');
}
```

### **3. IPC Security**
```javascript
// preload.js - Secure API exposure
const { contextBridge, ipcRenderer } = require('electron');

// NEVER expose raw ipcRenderer - use specific APIs only
contextBridge.exposeInMainWorld('legalAPI', {
  // Secure case management
  saveCase: (caseData) => ipcRenderer.invoke('save-case', caseData),
  loadCase: (caseId) => ipcRenderer.invoke('load-case', caseId),
  
  // Ollama AI integration (local only)
  analyzeDocument: (document) => ipcRenderer.invoke('analyze-document', document),
  
  // File operations (restricted paths)
  saveDocument: (path, content) => ipcRenderer.invoke('save-document', path, content)
});

// main.js - IPC handlers with validation
ipcMain.handle('save-case', async (event, caseData) => {
  // Validate sender
  if (!validateSender(event.senderFrame)) {
    throw new Error('Unauthorized IPC request');
  }
  
  // Validate and sanitize data
  const sanitizedData = validator.escape(caseData);
  
  // Encrypt before storage
  const encrypted = encryptSensitiveData(sanitizedData);
  return await saveCaseToDatabase(encrypted);
});
```

### **4. Content Security Policy**
```html
<!-- index.html - MANDATORY CSP -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data:; 
               connect-src 'self' http://localhost:11434;">
```

### **5. Navigation & Window Control**
```javascript
// Restrict navigation to prevent attacks
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    // Only allow local navigation
    if (parsedUrl.protocol !== 'file:' && parsedUrl.origin !== 'https://localhost') {
      event.preventDefault();
    }
  });
  
  // Control new window creation
  contents.setWindowOpenHandler(({ url }) => {
    // Don't allow external windows
    return { action: 'deny' };
  });
});
```

## 🔐 **Legal Data Encryption Strategy**

### **Three-Layer Encryption**
```javascript
// Layer 1: Application-level encryption
const crypto = require('crypto');

class LegalDataEncryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyDerivation = 'pbkdf2';
  }
  
  // Generate unique key for each case
  generateCaseKey(caseId, userPassword) {
    return crypto.pbkdf2Sync(userPassword, caseId, 100000, 32, 'sha512');
  }
  
  // Encrypt case data with AES-256-GCM
  encryptCaseData(data, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
}

// Layer 2: Electron SafeStorage (OS-level)
function storeEncryptedCase(caseData) {
  const encrypted = new LegalDataEncryption().encryptCaseData(caseData);
  const safeEncrypted = safeStorage.encryptString(JSON.stringify(encrypted));
  
  // Layer 3: electron-store with encryption key
  store.set(`case-${caseData.id}`, safeEncrypted);
}
```

### **Database Security**
```javascript
// SQLite3 with encryption and GDPR compliance
const Database = require('better-sqlite3');
const path = require('path');

class SecureLegalDatabase {
  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'legal-cases.db');
    this.db = new Database(dbPath);
    
    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = FULL');
    
    this.initializeTables();
  }
  
  initializeTables() {
    // Cases table with GDPR compliance fields
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        encrypted_data BLOB NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        retention_until DATETIME NOT NULL,  -- 7-year retention
        gdpr_consent BOOLEAN DEFAULT FALSE,
        data_subject_rights TEXT,           -- Record of rights requests
        encryption_version INTEGER DEFAULT 1
      );
      
      CREATE INDEX IF NOT EXISTS idx_retention ON cases(retention_until);
      CREATE INDEX IF NOT EXISTS idx_gdpr ON cases(gdpr_consent);
    `);
  }
}
```

## 🤖 **Secure AI Integration (Ollama)**

### **Local-Only AI Processing**
```javascript
// AI service with data isolation
class SecureLegalAI {
  constructor() {
    this.ollamaUrl = 'http://localhost:11434';  // Local only
    this.maxRetries = 3;
  }
  
  async analyzeDocument(document, caseId) {
    // Validate connection is local
    if (!this.ollamaUrl.includes('localhost')) {
      throw new Error('AI processing must be local only for legal data');
    }
    
    try {
      // Remove identifying information before AI processing
      const anonymizedDoc = this.anonymizeDocument(document);
      
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: 'llama2',
        prompt: `Analyze this legal document for key issues: ${anonymizedDoc}`,
        stream: false
      }, {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' }
      });
      
      return this.sanitizeAIResponse(response.data);
    } catch (error) {
      logger.error('AI analysis failed:', error);
      throw new Error('AI service unavailable');
    }
  }
  
  anonymizeDocument(document) {
    // Remove PII before AI processing
    return document
      .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[NAME]')  // Names
      .replace(/\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, '[CARD]')  // Card numbers
      .replace(/\b[A-Z]{2}\d{2}\s?\d{4}\b/g, '[POSTCODE]');  // UK postcodes
  }
}
```

## 📊 **GDPR Compliance Framework**

### **Data Subject Rights Implementation**
```javascript
class GDPRCompliance {
  constructor(database) {
    this.db = database;
  }
  
  // Right to Access (Article 15)
  async exportUserData(userId) {
    const cases = this.db.prepare('SELECT * FROM cases WHERE user_id = ?').all(userId);
    return {
      personal_data: cases,
      processing_purposes: 'Legal aid assistance',
      retention_period: '7 years',
      exported_at: new Date().toISOString()
    };
  }
  
  // Right to Erasure (Article 17)
  async deleteUserData(userId, reason) {
    // Check if legal retention period has passed
    const retentionCases = this.db.prepare(`
      SELECT id FROM cases 
      WHERE user_id = ? AND retention_until > CURRENT_TIMESTAMP
    `).all(userId);
    
    if (retentionCases.length > 0) {
      throw new Error('Cannot delete: Legal retention period still active');
    }
    
    // Secure deletion
    this.db.prepare('DELETE FROM cases WHERE user_id = ?').run(userId);
    
    // Log deletion for compliance
    this.logDataDeletion(userId, reason);
  }
  
  // Data Retention Management
  async cleanupExpiredData() {
    const expiredCases = this.db.prepare(`
      SELECT id FROM cases WHERE retention_until < CURRENT_TIMESTAMP
    `).all();
    
    for (const case of expiredCases) {
      await this.secureDelete(case.id);
    }
    
    return expiredCases.length;
  }
}
```

## 🚦 **Security Monitoring & Logging**

### **Winston Security Logger**
```javascript
const winston = require('winston');
const path = require('path');

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(app.getPath('userData'), 'security.log'),
      maxsize: 5242880,  // 5MB
      maxFiles: 5
    })
  ]
});

// Security event logging
function logSecurityEvent(event, details) {
  securityLogger.info('SECURITY_EVENT', {
    event,
    details,
    timestamp: new Date().toISOString(),
    process: 'justice-companion'
  });
}
```

## ✅ **Implementation Checklist**

### **Phase 1: Core Security (CRITICAL)**
- [ ] Enable context isolation and sandboxing
- [ ] Implement secure IPC with sender validation
- [ ] Set up Content Security Policy
- [ ] Configure Electron SafeStorage
- [ ] Implement navigation restrictions

### **Phase 2: Data Protection**
- [ ] Set up three-layer encryption system
- [ ] Implement secure database with GDPR fields
- [ ] Create data retention management
- [ ] Add audit logging

### **Phase 3: AI Integration**
- [ ] Secure Ollama local-only connection
- [ ] Implement document anonymization
- [ ] Add AI response sanitization
- [ ] Test data isolation

### **Phase 4: Compliance**
- [ ] Implement GDPR data subject rights
- [ ] Set up automated data cleanup
- [ ] Create compliance reporting
- [ ] Security testing and penetration testing

## 🔥 **CRITICAL SECURITY WARNINGS**

1. **NEVER** load remote content with Node.js integration
2. **NEVER** disable web security in production
3. **ALWAYS** validate IPC message senders
4. **ALWAYS** encrypt sensitive legal data before storage
5. **LOCAL ONLY** AI processing - never send legal data to external APIs

---

**This architecture ensures Justice Companion can handle sensitive legal data while maintaining attorney-client privilege and GDPR compliance.**