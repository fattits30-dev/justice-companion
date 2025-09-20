const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

class SecureLegalDatabase {
  constructor(securityManager) {
    this.securityManager = securityManager;
    this.db = null;
    this.dbPath = null;
    this.encryptionKey = null;
    this.transactionQueue = [];
    this.isProcessing = false;
  }

  async initialize(userProfile) {
    try {
      await this.setupDatabase(userProfile);
      await this.createTables();
      await this.setupIndices();
      await this.enableSecurityFeatures();
      return { success: true, database: 'initialized' };
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  async setupDatabase(userProfile) {
    const dbDir = path.join(
      process.env.APPDATA || process.env.HOME,
      '.justice-companion',
      'databases'
    );

    await fs.mkdir(dbDir, { recursive: true });

    this.dbPath = path.join(dbDir, `legal_${userProfile}_${Date.now()}.db`);
    this.encryptionKey = crypto.randomBytes(32).toString('hex');

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async createTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        case_number TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        client_id TEXT NOT NULL,
        attorney_id TEXT,
        status TEXT DEFAULT 'active',
        priority INTEGER DEFAULT 3,
        encrypted_details BLOB,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        retention_date TEXT,
        privilege_level TEXT DEFAULT 'standard'
      )`,

      `CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        document_type TEXT NOT NULL,
        title TEXT NOT NULL,
        encrypted_content BLOB,
        file_hash TEXT,
        privilege_protected INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        accessed_at TEXT,
        retention_policy TEXT,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        case_id TEXT,
        encrypted_messages BLOB,
        ai_model TEXT,
        sensitivity_level TEXT DEFAULT 'medium',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        exported INTEGER DEFAULT 0,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL
      )`,

      `CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        encrypted_details BLOB,
        ip_address TEXT,
        gdpr_relevant INTEGER DEFAULT 0
      )`,

      `CREATE TABLE IF NOT EXISTS user_consent (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        consent_type TEXT NOT NULL,
        granted INTEGER DEFAULT 0,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        expiry_date TEXT,
        withdrawal_date TEXT,
        purpose TEXT
      )`
    ];

    for (const table of tables) {
      await this.runQuery(table);
    }
  }

  async setupIndices() {
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_cases_client ON cases(client_id)',
      'CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status)',
      'CREATE INDEX IF NOT EXISTS idx_documents_case ON documents(case_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_consent_user ON user_consent(user_id)'
    ];

    for (const index of indices) {
      await this.runQuery(index);
    }
  }

  async enableSecurityFeatures() {
    const securitySettings = [
      'PRAGMA journal_mode = WAL',
      'PRAGMA synchronous = FULL',
      'PRAGMA foreign_keys = ON',
      'PRAGMA secure_delete = ON',
      'PRAGMA auto_vacuum = FULL'
    ];

    for (const setting of securitySettings) {
      await this.runQuery(setting);
    }
  }

  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  runGet(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  runAll(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async storeCase(caseData) {
    try {
      const caseId = crypto.randomBytes(16).toString('hex');
      const sensitiveData = {
        description: caseData.description,
        notes: caseData.notes,
        strategy: caseData.strategy,
        communications: caseData.communications
      };

      const encryptedDetails = this.securityManager.encryptData(
        sensitiveData,
        this.encryptionKey
      );

      const retentionDate = new Date();
      retentionDate.setFullYear(retentionDate.getFullYear() + 7);

      await this.runQuery(
        `INSERT INTO cases (id, case_number, title, client_id, attorney_id, status, priority, encrypted_details, retention_date, privilege_level)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          caseId,
          caseData.caseNumber,
          caseData.title,
          caseData.clientId,
          caseData.attorneyId,
          caseData.status || 'active',
          caseData.priority || 3,
          JSON.stringify(encryptedDetails),
          retentionDate.toISOString(),
          caseData.privilegeLevel || 'standard'
        ]
      );

      await this.logAction('case_created', caseData.userId, { caseId, caseNumber: caseData.caseNumber });

      return { success: true, caseId };
    } catch (error) {
      console.error('Failed to store case:', error);
      throw error;
    }
  }

  async retrieveCase(caseId, userId) {
    try {
      const caseRow = await this.runGet(
        'SELECT * FROM cases WHERE id = ?',
        [caseId]
      );

      if (!caseRow) {
        return { success: false, error: 'Case not found' };
      }

      const decryptedDetails = this.securityManager.decryptData(
        JSON.parse(caseRow.encrypted_details),
        this.encryptionKey
      );

      await this.logAction('case_accessed', userId, { caseId });

      return {
        success: true,
        case: {
          ...caseRow,
          details: decryptedDetails
        }
      };
    } catch (error) {
      console.error('Failed to retrieve case:', error);
      throw error;
    }
  }

  async storeConversation(conversationData) {
    try {
      const conversationId = crypto.randomBytes(16).toString('hex');

      const encryptedMessages = this.securityManager.encryptData(
        conversationData.messages,
        this.encryptionKey
      );

      await this.runQuery(
        `INSERT INTO conversations (id, case_id, encrypted_messages, ai_model, sensitivity_level)
         VALUES (?, ?, ?, ?, ?)`,
        [
          conversationId,
          conversationData.caseId,
          JSON.stringify(encryptedMessages),
          conversationData.aiModel || 'llama2',
          conversationData.sensitivityLevel || 'medium'
        ]
      );

      return { success: true, conversationId };
    } catch (error) {
      console.error('Failed to store conversation:', error);
      throw error;
    }
  }

  async exportUserData(userId) {
    try {
      const cases = await this.runAll(
        'SELECT * FROM cases WHERE client_id = ?',
        [userId]
      );

      const documents = await this.runAll(
        `SELECT d.* FROM documents d
         JOIN cases c ON d.case_id = c.id
         WHERE c.client_id = ?`,
        [userId]
      );

      const conversations = await this.runAll(
        `SELECT cv.* FROM conversations cv
         JOIN cases c ON cv.case_id = c.id
         WHERE c.client_id = ?`,
        [userId]
      );

      const exportData = {
        timestamp: new Date().toISOString(),
        userId,
        cases: cases.map(c => ({
          ...c,
          encrypted_details: JSON.parse(c.encrypted_details)
        })),
        documents: documents.map(d => ({
          ...d,
          encrypted_content: d.encrypted_content ? JSON.parse(d.encrypted_content) : null
        })),
        conversations: conversations.map(cv => ({
          ...cv,
          encrypted_messages: JSON.parse(cv.encrypted_messages)
        }))
      };

      await this.logAction('data_exported', userId, {
        recordCount: cases.length + documents.length + conversations.length,
        gdprArticle: 20
      });

      return {
        success: true,
        data: exportData,
        format: 'json',
        encrypted: true
      };
    } catch (error) {
      console.error('Failed to export user data:', error);
      throw error;
    }
  }

  async deleteUserData(userId) {
    try {
      const cases = await this.runAll(
        'SELECT id FROM cases WHERE client_id = ?',
        [userId]
      );

      for (const caseRow of cases) {
        await this.runQuery('DELETE FROM documents WHERE case_id = ?', [caseRow.id]);
        await this.runQuery('DELETE FROM conversations WHERE case_id = ?', [caseRow.id]);
      }

      await this.runQuery('DELETE FROM cases WHERE client_id = ?', [userId]);
      await this.runQuery('DELETE FROM user_consent WHERE user_id = ?', [userId]);

      await this.logAction('data_deleted', userId, {
        casesDeleted: cases.length,
        gdprArticle: 17,
        rightToErasure: true
      });

      return {
        success: true,
        deleted: {
          cases: cases.length,
          userId
        }
      };
    } catch (error) {
      console.error('Failed to delete user data:', error);
      throw error;
    }
  }

  async logAction(action, userId, details = {}) {
    try {
      const encryptedDetails = this.securityManager.encryptData(
        details,
        this.encryptionKey
      );

      const gdprActions = ['data_exported', 'data_deleted', 'consent_withdrawn'];
      const isGdprRelevant = gdprActions.includes(action) ? 1 : 0;

      await this.runQuery(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, encrypted_details, ip_address, gdpr_relevant)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          action,
          details.entityType || null,
          details.entityId || null,
          JSON.stringify(encryptedDetails),
          '127.0.0.1',
          isGdprRelevant
        ]
      );
    } catch (error) {
      console.error('Failed to log action:', error);
    }
  }

  async recordConsent(userId, consentType, granted, purpose) {
    try {
      const consentId = crypto.randomBytes(16).toString('hex');
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      await this.runQuery(
        `INSERT INTO user_consent (id, user_id, consent_type, granted, expiry_date, purpose)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          consentId,
          userId,
          consentType,
          granted ? 1 : 0,
          expiryDate.toISOString(),
          purpose
        ]
      );

      return { success: true, consentId };
    } catch (error) {
      console.error('Failed to record consent:', error);
      throw error;
    }
  }

  async getCases(userId, filters = {}) {
    try {
      let query = 'SELECT * FROM cases WHERE 1=1';
      const params = [];

      if (userId && !filters.all) {
        query += ' AND (client_id = ? OR attorney_id = ?)';
        params.push(userId, userId);
      }

      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      if (filters.priority) {
        query += ' AND priority = ?';
        params.push(filters.priority);
      }

      query += ' ORDER BY priority DESC, updated_at DESC';

      const cases = await this.runAll(query, params);

      const decryptedCases = [];
      for (const caseRow of cases) {
        try {
          const details = this.securityManager.decryptData(
            JSON.parse(caseRow.encrypted_details),
            this.encryptionKey
          );
          decryptedCases.push({
            ...caseRow,
            details
          });
        } catch (err) {
          console.error(`Failed to decrypt case ${caseRow.id}:`, err);
          decryptedCases.push({
            ...caseRow,
            details: { error: 'Decryption failed' }
          });
        }
      }

      await this.logAction('cases_retrieved', userId, { count: decryptedCases.length });

      return {
        success: true,
        cases: decryptedCases
      };
    } catch (error) {
      console.error('Failed to retrieve cases:', error);
      return {
        success: false,
        error: error.message,
        cases: []
      };
    }
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = { SecureLegalDatabase };