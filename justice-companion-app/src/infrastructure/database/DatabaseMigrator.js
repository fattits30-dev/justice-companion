/**
 * DatabaseMigrator - Schema Versioning and Migration Manager
 *
 * Manages database schema versioning, migrations, and upgrades for Justice Companion.
 * Provides safe, atomic migration operations with rollback capabilities.
 *
 * Features:
 * - Schema versioning and tracking
 * - Atomic migration transactions
 * - Rollback capabilities
 * - Migration validation and verification
 * - Backup creation before migrations
 * - Comprehensive audit logging
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class DatabaseMigrator {
    constructor(database, securityManager) {
        this.db = database;
        this.securityManager = securityManager;
        this.currentVersion = null;
        this.migrations = new Map();
        this.migrationHistory = [];
        this.schemaPath = path.join(__dirname, 'schema.sql');
        
        this._initializeMigrator();
    }

    /**
     * Initialize migrator and load migration history
     * @private
     */
    async _initializeMigrator() {
        try {
            // Ensure schema_version table exists
            await this._ensureSchemaVersionTable();
            
            // Load current version
            await this._loadCurrentVersion();
            
            // Load migration history
            await this._loadMigrationHistory();
            
            // Register built-in migrations
            this._registerBuiltInMigrations();
            
            this._auditLog('MIGRATOR_INITIALIZED', {
                currentVersion: this.currentVersion,
                migrationsRegistered: this.migrations.size
            });
            
            console.log('✅ DatabaseMigrator: Initialized with version tracking');
        } catch (error) {
            this._auditLog('MIGRATOR_INIT_FAILED', { error: error.message });
            throw new Error(`Failed to initialize DatabaseMigrator: ${error.message}`);
        }
    }

    /**
     * Initialize database with latest schema
     * @returns {Promise<Object>} Initialization result
     */
    async initializeDatabase() {
        try {
            this._auditLog('DATABASE_INITIALIZATION_STARTED', {
                timestamp: new Date().toISOString()
            });

            // Read and execute schema file
            const schemaSQL = await fs.readFile(this.schemaPath, 'utf8');
            
            // Execute schema in transaction
            await this._executeInTransaction(async () => {
                // Split and execute SQL statements
                const statements = this._splitSQLStatements(schemaSQL);
                
                for (const statement of statements) {
                    if (statement.trim()) {
                        await this.db.executeQuery(statement.trim());
                    }
                }
            });

            // Update version tracking
            await this._updateSchemaVersion('1.0.0', 'Initial schema deployment');
            
            // Verify database integrity
            const verification = await this._verifyDatabaseIntegrity();
            
            this._auditLog('DATABASE_INITIALIZED', {
                version: '1.0.0',
                verification: verification,
                success: true
            });

            return {
                success: true,
                version: '1.0.0',
                verification: verification,
                initializedAt: new Date().toISOString()
            };
        } catch (error) {
            this._auditLog('DATABASE_INITIALIZATION_FAILED', {
                error: error.message
            });
            throw new Error(`Failed to initialize database: ${error.message}`);
        }
    }

    /**
     * Apply migration to target version
     * @param {string} targetVersion - Target schema version
     * @returns {Promise<Object>} Migration result
     */
    async migrate(targetVersion) {
        try {
            const migrationId = uuidv4();
            
            this._auditLog('MIGRATION_STARTED', {
                migrationId: migrationId,
                fromVersion: this.currentVersion,
                toVersion: targetVersion
            });

            // Validate target version
            if (!this.migrations.has(targetVersion)) {
                throw new Error(`Migration for version ${targetVersion} not found`);
            }

            // Create backup before migration
            const backup = await this._createBackup(migrationId);
            
            try {
                // Get migration plan
                const migrationPlan = this._getMigrationPlan(this.currentVersion, targetVersion);
                
                // Execute migration in transaction
                await this._executeInTransaction(async () => {
                    for (const migration of migrationPlan) {
                        await this._executeMigration(migration);
                    }
                });

                // Update version
                await this._updateSchemaVersion(targetVersion, `Migrated from ${this.currentVersion}`);
                
                // Verify integrity
                const verification = await this._verifyDatabaseIntegrity();
                
                this._auditLog('MIGRATION_COMPLETED', {
                    migrationId: migrationId,
                    fromVersion: this.currentVersion,
                    toVersion: targetVersion,
                    verification: verification,
                    backupPath: backup.path
                });

                this.currentVersion = targetVersion;

                return {
                    success: true,
                    migrationId: migrationId,
                    fromVersion: this.currentVersion,
                    toVersion: targetVersion,
                    verification: verification,
                    backup: backup
                };
            } catch (migrationError) {
                // Rollback on error
                this._auditLog('MIGRATION_FAILED_ROLLBACK_INITIATED', {
                    migrationId: migrationId,
                    error: migrationError.message,
                    backupPath: backup.path
                });
                
                await this._restoreFromBackup(backup);
                throw migrationError;
            }
        } catch (error) {
            this._auditLog('MIGRATION_FAILED', {
                targetVersion: targetVersion,
                error: error.message
            });
            throw new Error(`Migration failed: ${error.message}`);
        }
    }

    /**
     * Rollback to previous version
     * @param {string} targetVersion - Version to rollback to
     * @returns {Promise<Object>} Rollback result
     */
    async rollback(targetVersion) {
        try {
            const rollbackId = uuidv4();
            
            this._auditLog('ROLLBACK_STARTED', {
                rollbackId: rollbackId,
                fromVersion: this.currentVersion,
                toVersion: targetVersion
            });

            // Find appropriate backup
            const backup = await this._findBackupForVersion(targetVersion);
            if (!backup) {
                throw new Error(`No backup found for version ${targetVersion}`);
            }

            // Create current state backup
            const currentBackup = await this._createBackup(rollbackId);
            
            // Restore from backup
            await this._restoreFromBackup(backup);
            
            // Update version tracking
            await this._updateSchemaVersion(targetVersion, `Rolled back from ${this.currentVersion}`);
            
            this._auditLog('ROLLBACK_COMPLETED', {
                rollbackId: rollbackId,
                fromVersion: this.currentVersion,
                toVersion: targetVersion,
                restoredFromBackup: backup.path,
                currentStateBackup: currentBackup.path
            });

            this.currentVersion = targetVersion;

            return {
                success: true,
                rollbackId: rollbackId,
                fromVersion: this.currentVersion,
                toVersion: targetVersion,
                restoredFrom: backup,
                currentStateBackup: currentBackup
            };
        } catch (error) {
            this._auditLog('ROLLBACK_FAILED', {
                targetVersion: targetVersion,
                error: error.message
            });
            throw new Error(`Rollback failed: ${error.message}`);
        }
    }

    /**
     * Register a new migration
     * @param {string} version - Migration version
     * @param {Object} migration - Migration definition
     */
    registerMigration(version, migration) {
        if (this.migrations.has(version)) {
            throw new Error(`Migration for version ${version} already registered`);
        }

        // Validate migration structure
        this._validateMigration(migration);

        this.migrations.set(version, {
            version: version,
            description: migration.description,
            up: migration.up,
            down: migration.down,
            registeredAt: new Date().toISOString()
        });

        this._auditLog('MIGRATION_REGISTERED', {
            version: version,
            description: migration.description
        });
    }

    /**
     * Get current database version
     * @returns {string} Current version
     */
    getCurrentVersion() {
        return this.currentVersion;
    }

    /**
     * Get available migrations
     * @returns {Array<Object>} Available migrations
     */
    getAvailableMigrations() {
        return Array.from(this.migrations.entries()).map(([version, migration]) => ({
            version: version,
            description: migration.description,
            registeredAt: migration.registeredAt
        }));
    }

    /**
     * Get migration history
     * @returns {Array<Object>} Migration history
     */
    getMigrationHistory() {
        return [...this.migrationHistory];
    }

    /**
     * Verify database integrity
     * @returns {Promise<Object>} Integrity check results
     */
    async verifyDatabaseIntegrity() {
        return await this._verifyDatabaseIntegrity();
    }

    /**
     * Get database schema information
     * @returns {Promise<Object>} Schema information
     */
    async getSchemaInfo() {
        try {
            const tables = await this.db.executeQuery(
                "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
            );
            
            const indexes = await this.db.executeQuery(
                "SELECT name FROM sqlite_master WHERE type='index' ORDER BY name"
            );
            
            const triggers = await this.db.executeQuery(
                "SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name"
            );
            
            const views = await this.db.executeQuery(
                "SELECT name FROM sqlite_master WHERE type='view' ORDER BY name"
            );

            return {
                version: this.currentVersion,
                tables: tables.map(t => t.name),
                indexes: indexes.map(i => i.name),
                triggers: triggers.map(t => t.name),
                views: views.map(v => v.name),
                generatedAt: new Date().toISOString()
            };
        } catch (error) {
            this._auditLog('SCHEMA_INFO_FAILED', {
                error: error.message
            });
            throw new Error(`Failed to get schema info: ${error.message}`);
        }
    }

    // =====================
    // PRIVATE HELPER METHODS
    // =====================

    /**
     * Ensure schema_version table exists
     * @private
     */
    async _ensureSchemaVersionTable() {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS schema_version (
                version TEXT PRIMARY KEY,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                description TEXT,
                migration_script TEXT
            )
        `;
        
        await this.db.executeQuery(createTableSQL);
    }

    /**
     * Load current database version
     * @private
     */
    async _loadCurrentVersion() {
        try {
            const result = await this.db.executeQuery(
                'SELECT version FROM schema_version ORDER BY applied_at DESC LIMIT 1'
            );
            
            this.currentVersion = result.length > 0 ? result[0].version : null;
        } catch (error) {
            this.currentVersion = null;
        }
    }

    /**
     * Load migration history
     * @private
     */
    async _loadMigrationHistory() {
        try {
            const history = await this.db.executeQuery(
                'SELECT * FROM schema_version ORDER BY applied_at ASC'
            );
            
            this.migrationHistory = history;
        } catch (error) {
            this.migrationHistory = [];
        }
    }

    /**
     * Register built-in migrations
     * @private
     */
    _registerBuiltInMigrations() {
        // Example migration for future use
        this.registerMigration('1.1.0', {
            description: 'Add legal document templates table',
            up: async (db) => {
                await db.executeQuery(`
                    CREATE TABLE IF NOT EXISTS legal_document_templates (
                        id TEXT PRIMARY KEY,
                        template_name TEXT NOT NULL,
                        template_content TEXT NOT NULL,
                        category TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);
            },
            down: async (db) => {
                await db.executeQuery('DROP TABLE IF EXISTS legal_document_templates');
            }
        });
    }

    /**
     * Update schema version record
     * @private
     */
    async _updateSchemaVersion(version, description) {
        const query = `
            INSERT OR REPLACE INTO schema_version (
                version, applied_at, description
            ) VALUES (?, ?, ?)
        `;
        
        await this.db.executeQuery(query, [
            version,
            new Date().toISOString(),
            description
        ]);
    }

    /**
     * Verify database integrity
     * @private
     */
    async _verifyDatabaseIntegrity() {
        try {
            const integrityCheck = await this.db.executeQuery('PRAGMA integrity_check');
            const quickCheck = await this.db.executeQuery('PRAGMA quick_check');
            const foreignKeyCheck = await this.db.executeQuery('PRAGMA foreign_key_check');

            const isValid = integrityCheck[0]?.integrity_check === 'ok' &&
                           quickCheck[0]?.quick_check === 'ok' &&
                           foreignKeyCheck.length === 0;

            return {
                valid: isValid,
                integrityCheck: integrityCheck,
                quickCheck: quickCheck,
                foreignKeyCheck: foreignKeyCheck,
                verifiedAt: new Date().toISOString()
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message,
                verifiedAt: new Date().toISOString()
            };
        }
    }

    /**
     * Execute operations in transaction
     * @private
     */
    async _executeInTransaction(operation) {
        await this.db.executeQuery('BEGIN TRANSACTION');
        
        try {
            await operation();
            await this.db.executeQuery('COMMIT');
        } catch (error) {
            await this.db.executeQuery('ROLLBACK');
            throw error;
        }
    }

    /**
     * Split SQL statements
     * @private
     */
    _splitSQLStatements(sql) {
        // Simple SQL statement splitter (can be enhanced for complex cases)
        return sql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    }

    /**
     * Get migration plan between versions
     * @private
     */
    _getMigrationPlan(fromVersion, toVersion) {
        // For now, simple direct migration
        // In a full implementation, this would handle complex migration paths
        const migration = this.migrations.get(toVersion);
        if (!migration) {
            throw new Error(`Migration for version ${toVersion} not found`);
        }
        
        return [migration];
    }

    /**
     * Execute single migration
     * @private
     */
    async _executeMigration(migration) {
        if (typeof migration.up === 'function') {
            await migration.up(this.db);
        } else if (typeof migration.up === 'string') {
            const statements = this._splitSQLStatements(migration.up);
            for (const statement of statements) {
                if (statement.trim()) {
                    await this.db.executeQuery(statement.trim());
                }
            }
        } else {
            throw new Error('Migration must have up function or SQL string');
        }
    }

    /**
     * Create database backup
     * @private
     */
    async _createBackup(migrationId) {
        try {
            const backupPath = path.join(
                process.env.APPDATA || process.env.HOME,
                'justice-companion',
                'backups',
                `backup_${migrationId}_${Date.now()}.db`
            );
            
            // Ensure backup directory exists
            await fs.mkdir(path.dirname(backupPath), { recursive: true });
            
            // Create backup using SQLite VACUUM INTO
            await this.db.executeQuery(`VACUUM INTO '${backupPath}'`);
            
            const backup = {
                id: migrationId,
                path: backupPath,
                createdAt: new Date().toISOString(),
                version: this.currentVersion
            };
            
            this._auditLog('BACKUP_CREATED', {
                backupId: migrationId,
                backupPath: backupPath,
                version: this.currentVersion
            });
            
            return backup;
        } catch (error) {
            this._auditLog('BACKUP_CREATION_FAILED', {
                migrationId: migrationId,
                error: error.message
            });
            throw new Error(`Failed to create backup: ${error.message}`);
        }
    }

    /**
     * Restore from backup
     * @private
     */
    async _restoreFromBackup(backup) {
        try {
            // Close current database connection
            this.db.close();
            
            // Copy backup over current database
            const currentDbPath = this.db.dbPath;
            await fs.copyFile(backup.path, currentDbPath);
            
            // Reconnect to database
            await this.db.initialize();
            
            this._auditLog('DATABASE_RESTORED_FROM_BACKUP', {
                backupId: backup.id,
                backupPath: backup.path,
                restoredVersion: backup.version
            });
        } catch (error) {
            this._auditLog('RESTORE_FROM_BACKUP_FAILED', {
                backupId: backup.id,
                error: error.message
            });
            throw new Error(`Failed to restore from backup: ${error.message}`);
        }
    }

    /**
     * Find backup for specific version
     * @private
     */
    async _findBackupForVersion(version) {
        // In a full implementation, this would maintain a backup registry
        // For now, return null (no backup management)
        return null;
    }

    /**
     * Validate migration structure
     * @private
     */
    _validateMigration(migration) {
        if (!migration.description) {
            throw new Error('Migration must have a description');
        }
        
        if (!migration.up) {
            throw new Error('Migration must have an up method or SQL');
        }
        
        if (migration.up && typeof migration.up !== 'function' && typeof migration.up !== 'string') {
            throw new Error('Migration up must be a function or SQL string');
        }
        
        if (migration.down && typeof migration.down !== 'function' && typeof migration.down !== 'string') {
            throw new Error('Migration down must be a function or SQL string');
        }
    }

    /**
     * Audit logging helper
     * @private
     */
    _auditLog(action, details) {
        if (this.securityManager && this.securityManager.auditLog) {
            this.securityManager.auditLog('DATABASE_MIGRATOR', action, details);
        }
    }
}

module.exports = DatabaseMigrator;