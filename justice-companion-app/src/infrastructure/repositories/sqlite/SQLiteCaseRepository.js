/**
 * SQLiteCaseRepository - Concrete Implementation
 *
 * Implements ICaseRepository interface using SQLite database with encryption.
 * Provides secure data persistence for legal cases with full audit trails.
 *
 * Features:
 * - End-to-end encryption for sensitive data
 * - Comprehensive audit logging
 * - GDPR compliance with data retention
 * - Transaction support for data integrity
 * - Performance optimization with caching
 */

const ICaseRepository = require('../../../domain/repositories/ICaseRepository');
const { LegalCase } = require('../../../domain/models/LegalCase');
const CaseStatus = require('../../../domain/valueObjects/CaseStatus');
const LegalCategory = require('../../../domain/valueObjects/LegalCategory');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class SQLiteCaseRepository extends ICaseRepository {
    constructor(database, securityManager) {
        super();
        this.db = database;
        this.securityManager = securityManager;
        this.cache = new Map();
        this.auditPrefix = 'CASE_REPO';

        // Transaction support
        this.activeTransaction = null;
        this.transactionStack = [];

        // Performance optimization
        this.cacheStats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
        this.maxCacheSize = 1000;

        // Initialize repository
        this._initializeRepository();
    }

    /**
     * Initialize repository with database verification
     * @private
     */
    async _initializeRepository() {
        try {
            // Verify database tables exist
            await this._verifyDatabaseSchema();
            
            // Initialize audit logging
            this._auditLog('REPOSITORY_INITIALIZED', {
                implementation: 'SQLiteCaseRepository',
                encryptionEnabled: true,
                auditingEnabled: true
            });
            
            console.log('✅ SQLiteCaseRepository: Initialized with encryption and audit trails');
        } catch (error) {
            this._auditLog('REPOSITORY_INIT_FAILED', { error: error.message });
            throw new Error(`Failed to initialize SQLiteCaseRepository: ${error.message}`);
        }
    }

    /**
     * Save a new legal case
     * @param {LegalCase} legalCase - Case entity to save
     * @returns {Promise<LegalCase>} Saved case with generated ID
     */
    async save(legalCase) {
        try {
            // Validate input
            if (!(legalCase instanceof LegalCase)) {
                throw new Error('Input must be a LegalCase instance');
            }

            // Generate ID if not present
            if (!legalCase.caseId) {
                legalCase.caseId = uuidv4();
            }

            // Encrypt case data
            const encryptedData = this.securityManager.encryptLegalData(
                legalCase.toObject(),
                legalCase.clientId,
                'attorney-client'
            );

            // Calculate integrity hash
            const integrityHash = this._calculateIntegrityHash(encryptedData);

            // Prepare database record
            const query = `
                INSERT INTO legal_cases (
                    id, encrypted_data, client_id, case_type, status,
                    retention_until, attorney_client_privilege, classification,
                    integrity_hash, encryption_version, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                legalCase.caseId,
                JSON.stringify(encryptedData),
                legalCase.clientId,
                legalCase.caseType || 'GENERAL',
                legalCase.status,
                this._calculateRetentionDate(),
                1, // attorney-client privilege
                'CONFIDENTIAL',
                integrityHash,
                1, // encryption version
                legalCase.createdAt.toISOString(),
                legalCase.updatedAt.toISOString()
            ];

            // Execute insert
            await this.db.executeQuery(query, params);

            // Update cache
            this.cache.set(legalCase.caseId, legalCase);

            // Audit the operation
            this._auditLog('CASE_SAVED', {
                caseId: legalCase.caseId,
                clientId: legalCase.clientId,
                caseType: legalCase.caseType,
                encrypted: true
            });

            return legalCase;
        } catch (error) {
            this._auditLog('CASE_SAVE_FAILED', {
                error: error.message,
                caseId: legalCase?.caseId
            });
            throw new Error(`Failed to save case: ${error.message}`);
        }
    }

    /**
     * Find case by ID
     * @param {string} caseId - Case identifier
     * @returns {Promise<LegalCase|null>} Case entity or null if not found
     */
    async findById(caseId) {
        try {
            // Check cache first
            if (this.cache.has(caseId)) {
                return this.cache.get(caseId);
            }

            const query = 'SELECT * FROM legal_cases WHERE id = ? AND status != ?';
            const rows = await this.db.executeQuery(query, [caseId, 'DELETED']);

            if (rows.length === 0) {
                return null;
            }

            const row = rows[0];
            const legalCase = await this._decryptAndHydrateCase(row);

            // Cache the result
            if (legalCase) {
                this.cache.set(caseId, legalCase);
            }

            this._auditLog('CASE_ACCESSED', {
                caseId: caseId,
                found: !!legalCase
            });

            return legalCase;
        } catch (error) {
            this._auditLog('CASE_FIND_FAILED', {
                caseId: caseId,
                error: error.message
            });
            throw new Error(`Failed to find case: ${error.message}`);
        }
    }

    /**
     * Find all cases for a specific client
     * @param {string} clientId - Client identifier
     * @returns {Promise<Array<LegalCase>>} Array of client's cases
     */
    async findByClientId(clientId) {
        try {
            const query = `
                SELECT * FROM legal_cases 
                WHERE client_id = ? AND status != ?
                ORDER BY created_at DESC
            `;
            const rows = await this.db.executeQuery(query, [clientId, 'DELETED']);

            const cases = [];
            for (const row of rows) {
                try {
                    const legalCase = await this._decryptAndHydrateCase(row);
                    if (legalCase) {
                        cases.push(legalCase);
                    }
                } catch (decryptError) {
                    this._auditLog('CASE_DECRYPTION_FAILED', {
                        caseId: row.id,
                        clientId: clientId,
                        error: decryptError.message
                    });
                }
            }

            this._auditLog('CASES_RETRIEVED_BY_CLIENT', {
                clientId: clientId,
                count: cases.length
            });

            return cases;
        } catch (error) {
            this._auditLog('CASES_BY_CLIENT_FAILED', {
                clientId: clientId,
                error: error.message
            });
            throw new Error(`Failed to find cases by client: ${error.message}`);
        }
    }

    /**
     * Find active cases for a specific client
     * @param {string} clientId - Client identifier
     * @returns {Promise<Array<LegalCase>>} Array of active cases
     */
    async findActiveByClientId(clientId) {
        try {
            const activeStatuses = [CaseStatus.INTAKE, CaseStatus.ACTIVE, CaseStatus.PENDING];
            const placeholders = activeStatuses.map(() => '?').join(',');
            
            const query = `
                SELECT * FROM legal_cases 
                WHERE client_id = ? AND status IN (${placeholders})
                ORDER BY updated_at DESC
            `;
            
            const params = [clientId, ...activeStatuses];
            const rows = await this.db.executeQuery(query, params);

            const cases = [];
            for (const row of rows) {
                try {
                    const legalCase = await this._decryptAndHydrateCase(row);
                    if (legalCase) {
                        cases.push(legalCase);
                    }
                } catch (decryptError) {
                    this._auditLog('CASE_DECRYPTION_FAILED', {
                        caseId: row.id,
                        clientId: clientId,
                        error: decryptError.message
                    });
                }
            }

            this._auditLog('ACTIVE_CASES_RETRIEVED', {
                clientId: clientId,
                count: cases.length
            });

            return cases;
        } catch (error) {
            this._auditLog('ACTIVE_CASES_FAILED', {
                clientId: clientId,
                error: error.message
            });
            throw new Error(`Failed to find active cases: ${error.message}`);
        }
    }

    /**
     * Update existing case
     * @param {LegalCase} legalCase - Case entity to update
     * @returns {Promise<LegalCase>} Updated case entity
     */
    async update(legalCase) {
        try {
            if (!(legalCase instanceof LegalCase)) {
                throw new Error('Input must be a LegalCase instance');
            }

            // Check if case exists
            const exists = await this.exists(legalCase.caseId);
            if (!exists) {
                throw new Error(`Case not found: ${legalCase.caseId}`);
            }

            // Update timestamp
            legalCase.updatedAt = new Date();

            // Encrypt updated data
            const encryptedData = this.securityManager.encryptLegalData(
                legalCase.toObject(),
                legalCase.clientId,
                'attorney-client'
            );

            const integrityHash = this._calculateIntegrityHash(encryptedData);

            const query = `
                UPDATE legal_cases 
                SET encrypted_data = ?, status = ?, updated_at = ?, integrity_hash = ?
                WHERE id = ?
            `;

            const params = [
                JSON.stringify(encryptedData),
                legalCase.status,
                legalCase.updatedAt.toISOString(),
                integrityHash,
                legalCase.caseId
            ];

            await this.db.executeQuery(query, params);

            // Update cache
            this.cache.set(legalCase.caseId, legalCase);

            this._auditLog('CASE_UPDATED', {
                caseId: legalCase.caseId,
                status: legalCase.status
            });

            return legalCase;
        } catch (error) {
            this._auditLog('CASE_UPDATE_FAILED', {
                caseId: legalCase?.caseId,
                error: error.message
            });
            throw new Error(`Failed to update case: ${error.message}`);
        }
    }

    /**
     * Delete case by ID (soft delete)
     * @param {string} caseId - Case identifier
     * @returns {Promise<boolean>} Success status
     */
    async delete(caseId) {
        try {
            const query = `
                UPDATE legal_cases 
                SET status = 'DELETED', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            const result = await this.db.executeQuery(query, [caseId]);

            // Remove from cache
            this.cache.delete(caseId);

            this._auditLog('CASE_DELETED', {
                caseId: caseId,
                softDelete: true
            });

            return result.changes > 0;
        } catch (error) {
            this._auditLog('CASE_DELETE_FAILED', {
                caseId: caseId,
                error: error.message
            });
            throw new Error(`Failed to delete case: ${error.message}`);
        }
    }

    /**
     * Find cases by status
     * @param {string} status - Case status from CaseStatus enum
     * @returns {Promise<Array<LegalCase>>} Cases with specified status
     */
    async findByStatus(status) {
        try {
            if (!CaseStatus.isValid(status)) {
                throw new Error(`Invalid case status: ${status}`);
            }

            const query = `
                SELECT * FROM legal_cases 
                WHERE status = ?
                ORDER BY updated_at DESC
            `;
            const rows = await this.db.executeQuery(query, [status]);

            const cases = [];
            for (const row of rows) {
                try {
                    const legalCase = await this._decryptAndHydrateCase(row);
                    if (legalCase) {
                        cases.push(legalCase);
                    }
                } catch (decryptError) {
                    this._auditLog('CASE_DECRYPTION_FAILED', {
                        caseId: row.id,
                        error: decryptError.message
                    });
                }
            }

            this._auditLog('CASES_RETRIEVED_BY_STATUS', {
                status: status,
                count: cases.length
            });

            return cases;
        } catch (error) {
            this._auditLog('CASES_BY_STATUS_FAILED', {
                status: status,
                error: error.message
            });
            throw new Error(`Failed to find cases by status: ${error.message}`);
        }
    }

    /**
     * Find cases by category
     * @param {string} category - Legal category from LegalCategory enum
     * @returns {Promise<Array<LegalCase>>} Cases in specified category
     */
    async findByCategory(category) {
        try {
            if (!LegalCategory.isValid(category)) {
                throw new Error(`Invalid legal category: ${category}`);
            }

            const query = `
                SELECT * FROM legal_cases 
                WHERE case_type = ? AND status != 'DELETED'
                ORDER BY created_at DESC
            `;
            const rows = await this.db.executeQuery(query, [category]);

            const cases = [];
            for (const row of rows) {
                try {
                    const legalCase = await this._decryptAndHydrateCase(row);
                    if (legalCase) {
                        cases.push(legalCase);
                    }
                } catch (decryptError) {
                    this._auditLog('CASE_DECRYPTION_FAILED', {
                        caseId: row.id,
                        error: decryptError.message
                    });
                }
            }

            this._auditLog('CASES_RETRIEVED_BY_CATEGORY', {
                category: category,
                count: cases.length
            });

            return cases;
        } catch (error) {
            this._auditLog('CASES_BY_CATEGORY_FAILED', {
                category: category,
                error: error.message
            });
            throw new Error(`Failed to find cases by category: ${error.message}`);
        }
    }

    /**
     * Find cases with multiple filters
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array<LegalCase>>} Filtered cases
     */
    async findWithFilters(filters) {
        try {
            let query = 'SELECT * FROM legal_cases WHERE status != "DELETED"';
            const params = [];

            // Build dynamic query based on filters
            if (filters.status) {
                query += ' AND status = ?';
                params.push(filters.status);
            }

            if (filters.category) {
                query += ' AND case_type = ?';
                params.push(filters.category);
            }

            if (filters.clientId) {
                query += ' AND client_id = ?';
                params.push(filters.clientId);
            }

            if (filters.createdAfter) {
                query += ' AND created_at >= ?';
                params.push(filters.createdAfter.toISOString());
            }

            if (filters.createdBefore) {
                query += ' AND created_at <= ?';
                params.push(filters.createdBefore.toISOString());
            }

            query += ' ORDER BY updated_at DESC';

            // Add limit if specified
            if (filters.limit && typeof filters.limit === 'number') {
                query += ' LIMIT ?';
                params.push(filters.limit);
            }

            const rows = await this.db.executeQuery(query, params);

            const cases = [];
            for (const row of rows) {
                try {
                    const legalCase = await this._decryptAndHydrateCase(row);
                    if (legalCase) {
                        cases.push(legalCase);
                    }
                } catch (decryptError) {
                    this._auditLog('CASE_DECRYPTION_FAILED', {
                        caseId: row.id,
                        error: decryptError.message
                    });
                }
            }

            this._auditLog('CASES_RETRIEVED_WITH_FILTERS', {
                filters: this._sanitizeFilters(filters),
                count: cases.length
            });

            return cases;
        } catch (error) {
            this._auditLog('CASES_WITH_FILTERS_FAILED', {
                filters: this._sanitizeFilters(filters),
                error: error.message
            });
            throw new Error(`Failed to find cases with filters: ${error.message}`);
        }
    }

    /**
     * Find similar cases based on category and content
     * @param {string} category - Legal category
     * @param {Object} context - Similarity context
     * @returns {Promise<Array<LegalCase>>} Similar cases
     */
    async findSimilarCases(category, context) {
        try {
            // First find cases in the same category
            const categoryCases = await this.findByCategory(category);

            // For now, return cases in same category
            // In a full implementation, this would use ML/NLP for content similarity
            const similarCases = categoryCases
                .filter(c => c.caseId !== context.excludeCaseId)
                .slice(0, context.limit || 10);

            this._auditLog('SIMILAR_CASES_RETRIEVED', {
                category: category,
                count: similarCases.length,
                contextProvided: !!context
            });

            return similarCases;
        } catch (error) {
            this._auditLog('SIMILAR_CASES_FAILED', {
                category: category,
                error: error.message
            });
            throw new Error(`Failed to find similar cases: ${error.message}`);
        }
    }

    /**
     * Find cases eligible for archival
     * @returns {Promise<Array<LegalCase>>} Cases that can be archived
     */
    async findEligibleForArchival() {
        try {
            const completedStatuses = [CaseStatus.RESOLVED, CaseStatus.CLOSED];
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const placeholders = completedStatuses.map(() => '?').join(',');
            const query = `
                SELECT * FROM legal_cases 
                WHERE status IN (${placeholders})
                AND updated_at <= ?
                ORDER BY updated_at ASC
            `;

            const params = [...completedStatuses, thirtyDaysAgo.toISOString()];
            const rows = await this.db.executeQuery(query, params);

            const cases = [];
            for (const row of rows) {
                try {
                    const legalCase = await this._decryptAndHydrateCase(row);
                    if (legalCase && legalCase.canBeArchived()) {
                        cases.push(legalCase);
                    }
                } catch (decryptError) {
                    this._auditLog('CASE_DECRYPTION_FAILED', {
                        caseId: row.id,
                        error: decryptError.message
                    });
                }
            }

            this._auditLog('ARCHIVAL_ELIGIBLE_CASES_RETRIEVED', {
                count: cases.length
            });

            return cases;
        } catch (error) {
            this._auditLog('ARCHIVAL_ELIGIBLE_FAILED', {
                error: error.message
            });
            throw new Error(`Failed to find cases eligible for archival: ${error.message}`);
        }
    }

    /**
     * Find cases requiring data retention action
     * @returns {Promise<Array<LegalCase>>} Cases needing retention review
     */
    async findRequiringRetentionAction() {
        try {
            const query = `
                SELECT * FROM legal_cases 
                WHERE retention_until <= datetime('now')
                AND status != 'DELETED'
                ORDER BY retention_until ASC
            `;

            const rows = await this.db.executeQuery(query);

            const cases = [];
            for (const row of rows) {
                try {
                    const legalCase = await this._decryptAndHydrateCase(row);
                    if (legalCase && legalCase.requiresDataRetentionAction()) {
                        cases.push(legalCase);
                    }
                } catch (decryptError) {
                    this._auditLog('CASE_DECRYPTION_FAILED', {
                        caseId: row.id,
                        error: decryptError.message
                    });
                }
            }

            this._auditLog('RETENTION_ACTION_CASES_RETRIEVED', {
                count: cases.length
            });

            return cases;
        } catch (error) {
            this._auditLog('RETENTION_ACTION_FAILED', {
                error: error.message
            });
            throw new Error(`Failed to find cases requiring retention action: ${error.message}`);
        }
    }

    /**
     * Get case statistics
     * @param {Object} filters - Optional filters for statistics
     * @returns {Promise<Object>} Statistical data
     */
    async getStatistics(filters = {}) {
        try {
            let baseQuery = 'SELECT COUNT(*) as count, status FROM legal_cases WHERE status != "DELETED"';
            const params = [];

            if (filters.clientId) {
                baseQuery += ' AND client_id = ?';
                params.push(filters.clientId);
            }

            if (filters.dateFrom) {
                baseQuery += ' AND created_at >= ?';
                params.push(filters.dateFrom.toISOString());
            }

            if (filters.dateTo) {
                baseQuery += ' AND created_at <= ?';
                params.push(filters.dateTo.toISOString());
            }

            baseQuery += ' GROUP BY status';

            const statusCounts = await this.db.executeQuery(baseQuery, params);

            // Get total count
            const totalQuery = baseQuery.replace('COUNT(*) as count, status', 'COUNT(*) as total').replace(' GROUP BY status', '');
            const totalResult = await this.db.executeQuery(totalQuery, params);

            const statistics = {
                total: totalResult[0]?.total || 0,
                byStatus: {},
                byCategory: {},
                generatedAt: new Date().toISOString()
            };

            // Process status counts
            statusCounts.forEach(row => {
                statistics.byStatus[row.status] = row.count;
            });

            // Get category statistics
            const categoryQuery = baseQuery.replace('status', 'case_type').replace('GROUP BY status', 'GROUP BY case_type');
            const categoryCounts = await this.db.executeQuery(categoryQuery, params);
            
            categoryCounts.forEach(row => {
                statistics.byCategory[row.case_type] = row.count;
            });

            this._auditLog('STATISTICS_GENERATED', {
                total: statistics.total,
                hasFilters: Object.keys(filters).length > 0
            });

            return statistics;
        } catch (error) {
            this._auditLog('STATISTICS_FAILED', {
                error: error.message
            });
            throw new Error(`Failed to get case statistics: ${error.message}`);
        }
    }

    /**
     * Search cases by text content
     * @param {string} searchTerm - Search term
     * @param {Object} options - Search options
     * @returns {Promise<Array<LegalCase>>} Matching cases
     */
    async searchByContent(searchTerm, options = {}) {
        try {
            // For SQLite implementation, we need to decrypt data to search
            // In production, consider using SQLite FTS or external search index
            const allCases = await this.findWithFilters({
                limit: options.limit || 1000
            });

            const searchTermLower = searchTerm.toLowerCase();
            const matchingCases = allCases.filter(legalCase => {
                const title = (legalCase.title || '').toLowerCase();
                const description = (legalCase.description || '').toLowerCase();
                
                return title.includes(searchTermLower) || description.includes(searchTermLower);
            });

            // Apply limit and offset
            const offset = options.offset || 0;
            const limit = options.limit || 50;
            const paginatedResults = matchingCases.slice(offset, offset + limit);

            this._auditLog('CONTENT_SEARCH_PERFORMED', {
                searchTerm: searchTerm.substring(0, 50), // Truncate for privacy
                resultsCount: paginatedResults.length,
                totalMatches: matchingCases.length
            });

            return paginatedResults;
        } catch (error) {
            this._auditLog('CONTENT_SEARCH_FAILED', {
                searchTerm: searchTerm.substring(0, 50),
                error: error.message
            });
            throw new Error(`Failed to search cases by content: ${error.message}`);
        }
    }

    /**
     * Check if case exists
     * @param {string} caseId - Case identifier
     * @returns {Promise<boolean>} Existence status
     */
    async exists(caseId) {
        try {
            const query = 'SELECT COUNT(*) as count FROM legal_cases WHERE id = ? AND status != "DELETED"';
            const result = await this.db.executeQuery(query, [caseId]);
            return result[0].count > 0;
        } catch (error) {
            this._auditLog('CASE_EXISTS_CHECK_FAILED', {
                caseId: caseId,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Get cases with pagination
     * @param {number} page - Page number (1-based)
     * @param {number} pageSize - Items per page
     * @param {Object} filters - Optional filters
     * @returns {Promise<Object>} Paginated results with total count
     */
    async findPaginated(page, pageSize, filters = {}) {
        try {
            const offset = (page - 1) * pageSize;
            
            // Get total count first
            const totalQuery = 'SELECT COUNT(*) as total FROM legal_cases WHERE status != "DELETED"';
            const totalResult = await this.db.executeQuery(totalQuery);
            const total = totalResult[0].total;

            // Get paginated results
            const cases = await this.findWithFilters({
                ...filters,
                limit: pageSize,
                offset: offset
            });

            const result = {
                cases: cases,
                pagination: {
                    page: page,
                    pageSize: pageSize,
                    total: total,
                    totalPages: Math.ceil(total / pageSize),
                    hasNext: page * pageSize < total,
                    hasPrevious: page > 1
                }
            };

            this._auditLog('PAGINATED_CASES_RETRIEVED', {
                page: page,
                pageSize: pageSize,
                total: total,
                returned: cases.length
            });

            return result;
        } catch (error) {
            this._auditLog('PAGINATED_CASES_FAILED', {
                page: page,
                pageSize: pageSize,
                error: error.message
            });
            throw new Error(`Failed to get paginated cases: ${error.message}`);
        }
    }

    // =====================
    // ADDITIONAL INTERFACE METHODS
    // =====================

    async anonymize(caseId, anonymizedData) {
        try {
            const encryptedData = this.securityManager.encryptLegalData(
                anonymizedData,
                'anonymized',
                'attorney-client'
            );

            const query = `
                UPDATE legal_cases 
                SET encrypted_data = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            await this.db.executeQuery(query, [JSON.stringify(encryptedData), caseId]);

            this.cache.delete(caseId);

            this._auditLog('CASE_ANONYMIZED', {
                caseId: caseId,
                gdprCompliance: true
            });

            return true;
        } catch (error) {
            this._auditLog('CASE_ANONYMIZATION_FAILED', {
                caseId: caseId,
                error: error.message
            });
            throw new Error(`Failed to anonymize case: ${error.message}`);
        }
    }

    async batchArchive(caseIds) {
        try {
            const archivedIds = [];
            
            for (const caseId of caseIds) {
                try {
                    const query = `
                        UPDATE legal_cases 
                        SET status = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ? AND status IN (?, ?)
                    `;
                    
                    const result = await this.db.executeQuery(query, [
                        CaseStatus.ARCHIVED,
                        caseId,
                        CaseStatus.RESOLVED,
                        CaseStatus.CLOSED
                    ]);

                    if (result.changes > 0) {
                        archivedIds.push(caseId);
                        this.cache.delete(caseId);
                    }
                } catch (caseError) {
                    this._auditLog('CASE_ARCHIVE_FAILED', {
                        caseId: caseId,
                        error: caseError.message
                    });
                }
            }

            this._auditLog('BATCH_ARCHIVE_COMPLETED', {
                requested: caseIds.length,
                archived: archivedIds.length
            });

            return archivedIds;
        } catch (error) {
            this._auditLog('BATCH_ARCHIVE_FAILED', {
                error: error.message
            });
            throw new Error(`Failed to batch archive cases: ${error.message}`);
        }
    }

    async findByDateRange(startDate, endDate, options = {}) {
        try {
            const filters = {
                createdAfter: startDate,
                createdBefore: endDate,
                ...options
            };

            return await this.findWithFilters(filters);
        } catch (error) {
            this._auditLog('DATE_RANGE_SEARCH_FAILED', {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                error: error.message
            });
            throw new Error(`Failed to find cases by date range: ${error.message}`);
        }
    }

    async countByCriteria(criteria) {
        try {
            let query = 'SELECT COUNT(*) as count FROM legal_cases WHERE status != "DELETED"';
            const params = [];

            if (criteria.status) {
                query += ' AND status = ?';
                params.push(criteria.status);
            }

            if (criteria.clientId) {
                query += ' AND client_id = ?';
                params.push(criteria.clientId);
            }

            if (criteria.category) {
                query += ' AND case_type = ?';
                params.push(criteria.category);
            }

            const result = await this.db.executeQuery(query, params);
            return result[0].count;
        } catch (error) {
            this._auditLog('COUNT_BY_CRITERIA_FAILED', {
                criteria: this._sanitizeFilters(criteria),
                error: error.message
            });
            throw new Error(`Failed to count cases by criteria: ${error.message}`);
        }
    }

    async findUrgentCases() {
        try {
            const urgentStatuses = [CaseStatus.ACTIVE, CaseStatus.PENDING];
            const cases = [];

            for (const status of urgentStatuses) {
                const statusCases = await this.findByStatus(status);
                cases.push(...statusCases);
            }

            // Sort by priority and age
            const urgentCases = cases
                .filter(c => c.priority === 'HIGH' || c.priority === 'URGENT')
                .sort((a, b) => {
                    if (a.priority === 'URGENT' && b.priority !== 'URGENT') return -1;
                    if (b.priority === 'URGENT' && a.priority !== 'URGENT') return 1;
                    return b.getAgeInDays() - a.getAgeInDays();
                });

            this._auditLog('URGENT_CASES_RETRIEVED', {
                count: urgentCases.length
            });

            return urgentCases;
        } catch (error) {
            this._auditLog('URGENT_CASES_FAILED', {
                error: error.message
            });
            throw new Error(`Failed to find urgent cases: ${error.message}`);
        }
    }

    async updateMetadata(caseId, metadata) {
        try {
            const existingCase = await this.findById(caseId);
            if (!existingCase) {
                throw new Error(`Case not found: ${caseId}`);
            }

            // Merge metadata
            existingCase.metadata = {
                ...existingCase.metadata,
                ...metadata,
                lastModifiedAt: new Date()
            };

            await this.update(existingCase);

            this._auditLog('CASE_METADATA_UPDATED', {
                caseId: caseId,
                metadataKeys: Object.keys(metadata)
            });

            return true;
        } catch (error) {
            this._auditLog('METADATA_UPDATE_FAILED', {
                caseId: caseId,
                error: error.message
            });
            throw new Error(`Failed to update case metadata: ${error.message}`);
        }
    }

    async addDocument(caseId, document) {
        try {
            const existingCase = await this.findById(caseId);
            if (!existingCase) {
                throw new Error(`Case not found: ${caseId}`);
            }

            existingCase.addDocument(document);
            await this.update(existingCase);

            this._auditLog('DOCUMENT_ADDED_TO_CASE', {
                caseId: caseId,
                documentId: document.documentId
            });

            return true;
        } catch (error) {
            this._auditLog('DOCUMENT_ADD_FAILED', {
                caseId: caseId,
                error: error.message
            });
            throw new Error(`Failed to add document to case: ${error.message}`);
        }
    }

    async removeDocument(caseId, documentId) {
        try {
            const existingCase = await this.findById(caseId);
            if (!existingCase) {
                throw new Error(`Case not found: ${caseId}`);
            }

            const documentIndex = existingCase.documents.findIndex(d => d.documentId === documentId);
            if (documentIndex > -1) {
                existingCase.documents.splice(documentIndex, 1);
                await this.update(existingCase);
            }

            this._auditLog('DOCUMENT_REMOVED_FROM_CASE', {
                caseId: caseId,
                documentId: documentId
            });

            return true;
        } catch (error) {
            this._auditLog('DOCUMENT_REMOVE_FAILED', {
                caseId: caseId,
                documentId: documentId,
                error: error.message
            });
            throw new Error(`Failed to remove document from case: ${error.message}`);
        }
    }

    async getAuditTrail(caseId) {
        try {
            const query = `
                SELECT * FROM audit_trail 
                WHERE record_id = ? AND table_name = 'legal_cases'
                ORDER BY timestamp DESC
            `;
            
            const auditRecords = await this.db.executeQuery(query, [caseId]);

            this._auditLog('AUDIT_TRAIL_RETRIEVED', {
                caseId: caseId,
                recordCount: auditRecords.length
            });

            return auditRecords;
        } catch (error) {
            this._auditLog('AUDIT_TRAIL_FAILED', {
                caseId: caseId,
                error: error.message
            });
            throw new Error(`Failed to get audit trail: ${error.message}`);
        }
    }

    async bulkUpdateStatus(updates) {
        try {
            const updatedIds = [];

            for (const update of updates) {
                try {
                    const { caseId, status, reason } = update;
                    const existingCase = await this.findById(caseId);
                    
                    if (existingCase) {
                        existingCase.updateStatus(status, reason);
                        await this.update(existingCase);
                        updatedIds.push(caseId);
                    }
                } catch (updateError) {
                    this._auditLog('BULK_STATUS_UPDATE_ITEM_FAILED', {
                        caseId: update.caseId,
                        error: updateError.message
                    });
                }
            }

            this._auditLog('BULK_STATUS_UPDATE_COMPLETED', {
                requested: updates.length,
                updated: updatedIds.length
            });

            return updatedIds;
        } catch (error) {
            this._auditLog('BULK_STATUS_UPDATE_FAILED', {
                error: error.message
            });
            throw new Error(`Failed to bulk update case statuses: ${error.message}`);
        }
    }

    async getDashboardStats(clientId = null) {
        try {
            const filters = clientId ? { clientId } : {};
            const stats = await this.getStatistics(filters);

            // Add dashboard-specific metrics
            const dashboardStats = {
                ...stats,
                urgent: await this.countByCriteria({ priority: 'URGENT' }),
                active: stats.byStatus[CaseStatus.ACTIVE] || 0,
                pending: stats.byStatus[CaseStatus.PENDING] || 0,
                resolved: stats.byStatus[CaseStatus.RESOLVED] || 0,
                recentActivity: await this._getRecentActivityCount()
            };

            this._auditLog('DASHBOARD_STATS_GENERATED', {
                clientId: clientId,
                totalCases: dashboardStats.total
            });

            return dashboardStats;
        } catch (error) {
            this._auditLog('DASHBOARD_STATS_FAILED', {
                clientId: clientId,
                error: error.message
            });
            throw new Error(`Failed to get dashboard stats: ${error.message}`);
        }
    }

    async findRelatedCases(caseId, limit = 10) {
        try {
            const referenceCase = await this.findById(caseId);
            if (!referenceCase) {
                return [];
            }

            // Find cases with same client and category
            const relatedCases = await this.findWithFilters({
                clientId: referenceCase.clientId,
                category: referenceCase.caseType,
                limit: limit + 1 // +1 to account for excluding the reference case
            });

            // Exclude the reference case itself
            const filteredCases = relatedCases.filter(c => c.caseId !== caseId);

            this._auditLog('RELATED_CASES_RETRIEVED', {
                referenceCaseId: caseId,
                relatedCount: filteredCases.length
            });

            return filteredCases.slice(0, limit);
        } catch (error) {
            this._auditLog('RELATED_CASES_FAILED', {
                caseId: caseId,
                error: error.message
            });
            throw new Error(`Failed to find related cases: ${error.message}`);
        }
    }

    async exportCases(caseIds, format = 'JSON') {
        try {
            const cases = [];
            
            for (const caseId of caseIds) {
                const legalCase = await this.findById(caseId);
                if (legalCase) {
                    cases.push(legalCase.toObject());
                }
            }

            const exportPackage = {
                exportId: uuidv4(),
                format: format,
                exportedAt: new Date().toISOString(),
                caseCount: cases.length,
                cases: cases
            };

            this._auditLog('CASES_EXPORTED', {
                exportId: exportPackage.exportId,
                format: format,
                caseCount: cases.length
            });

            return exportPackage;
        } catch (error) {
            this._auditLog('CASES_EXPORT_FAILED', {
                caseIds: caseIds.slice(0, 10), // Log first 10 IDs only
                format: format,
                error: error.message
            });
            throw new Error(`Failed to export cases: ${error.message}`);
        }
    }

    async validateIntegrity(caseId) {
        try {
            const query = 'SELECT encrypted_data, integrity_hash FROM legal_cases WHERE id = ?';
            const rows = await this.db.executeQuery(query, [caseId]);

            if (rows.length === 0) {
                return { valid: false, error: 'Case not found' };
            }

            const row = rows[0];
            const encryptedData = JSON.parse(row.encrypted_data);
            const expectedHash = this._calculateIntegrityHash(encryptedData);
            const isValid = expectedHash === row.integrity_hash;

            this._auditLog('INTEGRITY_VALIDATION_PERFORMED', {
                caseId: caseId,
                isValid: isValid
            });

            return {
                valid: isValid,
                expectedHash: expectedHash,
                storedHash: row.integrity_hash,
                validatedAt: new Date().toISOString()
            };
        } catch (error) {
            this._auditLog('INTEGRITY_VALIDATION_FAILED', {
                caseId: caseId,
                error: error.message
            });
            throw new Error(`Failed to validate case integrity: ${error.message}`);
        }
    }

    async cleanupOrphanedData() {
        try {
            // Find cases with non-existent clients
            const orphanedQuery = `
                SELECT lc.id FROM legal_cases lc
                LEFT JOIN clients c ON lc.client_id = c.id
                WHERE c.id IS NULL AND lc.status != 'DELETED'
            `;
            
            const orphanedCases = await this.db.executeQuery(orphanedQuery);
            
            let cleanupCount = 0;
            for (const orphaned of orphanedCases) {
                await this.delete(orphaned.id);
                cleanupCount++;
            }

            this._auditLog('ORPHANED_DATA_CLEANUP_COMPLETED', {
                cleanedCases: cleanupCount
            });

            return {
                orphanedCasesRemoved: cleanupCount,
                cleanupDate: new Date().toISOString()
            };
        } catch (error) {
            this._auditLog('ORPHANED_DATA_CLEANUP_FAILED', {
                error: error.message
            });
            throw new Error(`Failed to cleanup orphaned data: ${error.message}`);
        }
    }

    // =====================
    // PRIVATE HELPER METHODS
    // =====================

    /**
     * Decrypt and hydrate case from database row
     * @private
     */
    async _decryptAndHydrateCase(row) {
        try {
            // Verify integrity first
            const encryptedData = JSON.parse(row.encrypted_data);
            const expectedHash = this._calculateIntegrityHash(encryptedData);
            
            if (expectedHash !== row.integrity_hash) {
                this._auditLog('INTEGRITY_VIOLATION_DETECTED', {
                    caseId: row.id,
                    expectedHash: expectedHash,
                    storedHash: row.integrity_hash
                });
                return null;
            }

            // Decrypt the data
            const decryptedData = this.securityManager.decryptLegalData(encryptedData);

            // Create LegalCase instance
            return LegalCase.fromObject(decryptedData);
        } catch (error) {
            this._auditLog('CASE_DECRYPTION_FAILED', {
                caseId: row.id,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Calculate integrity hash for encrypted data
     * @private
     */
    _calculateIntegrityHash(encryptedData) {
        return crypto.createHash('sha256')
            .update(JSON.stringify(encryptedData))
            .digest('hex');
    }

    /**
     * Calculate data retention date
     * @private
     */
    _calculateRetentionDate() {
        const retentionYears = 7; // Legal requirement
        const retentionDate = new Date();
        retentionDate.setFullYear(retentionDate.getFullYear() + retentionYears);
        return retentionDate.toISOString();
    }

    /**
     * Verify database schema exists
     * @private
     */
    async _verifyDatabaseSchema() {
        const requiredTables = ['legal_cases', 'clients', 'audit_trail'];
        
        for (const table of requiredTables) {
            const query = `SELECT name FROM sqlite_master WHERE type='table' AND name=?`;
            const result = await this.db.executeQuery(query, [table]);
            
            if (result.length === 0) {
                throw new Error(`Required table '${table}' not found in database`);
            }
        }
    }

    /**
     * Sanitize filters for logging
     * @private
     */
    _sanitizeFilters(filters) {
        const sanitized = { ...filters };
        // Remove sensitive data for logging
        if (sanitized.searchTerm) {
            sanitized.searchTerm = sanitized.searchTerm.substring(0, 20) + '...';
        }
        return sanitized;
    }

    /**
     * Get recent activity count for dashboard
     * @private
     */
    async _getRecentActivityCount() {
        try {
            const oneDayAgo = new Date();
            oneDayAgo.setDate(oneDayAgo.getDate() - 1);
            
            const query = `
                SELECT COUNT(*) as count FROM legal_cases 
                WHERE updated_at >= ? AND status != 'DELETED'
            `;
            
            const result = await this.db.executeQuery(query, [oneDayAgo.toISOString()]);
            return result[0].count;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Audit logging helper
     * @private
     */
    _auditLog(action, details) {
        if (this.securityManager && this.securityManager.auditLog) {
            this.securityManager.auditLog(this.auditPrefix, action, details);
        }
    }

    /**
     * Clear cache (for testing or manual cache management)
     */
    clearCache() {
        this.cache.clear();
        this._auditLog('CACHE_CLEARED', { timestamp: new Date().toISOString() });
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            hitRate: this.cacheStats.hits + this.cacheStats.misses > 0 ?
                (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(2) + '%' : '0%',
            hits: this.cacheStats.hits,
            misses: this.cacheStats.misses,
            evictions: this.cacheStats.evictions,
            keys: Array.from(this.cache.keys())
        };
    }

    // =====================
    // TRANSACTION SUPPORT IMPLEMENTATION
    // =====================

    /**
     * Begin database transaction
     * @returns {Promise<void>}
     */
    async beginTransaction() {
        try {
            if (this.activeTransaction) {
                // Support nested transactions
                this.transactionStack.push(this.activeTransaction);
            }

            const transactionId = uuidv4();
            this.activeTransaction = {
                id: transactionId,
                startTime: Date.now(),
                operations: [],
                savepoints: []
            };

            await this.db.executeQuery('BEGIN TRANSACTION');

            this._auditLog('TRANSACTION_STARTED', {
                transactionId: transactionId,
                nested: this.transactionStack.length > 0
            });

            console.log('✅ SQLiteCaseRepository: Transaction started', transactionId);
        } catch (error) {
            this._auditLog('TRANSACTION_START_FAILED', { error: error.message });
            throw new Error(`Failed to begin transaction: ${error.message}`);
        }
    }

    /**
     * Commit active transaction
     * @returns {Promise<void>}
     */
    async commitTransaction() {
        try {
            if (!this.activeTransaction) {
                throw new Error('No active transaction to commit');
            }

            const transactionId = this.activeTransaction.id;
            const operationCount = this.activeTransaction.operations.length;
            const duration = Date.now() - this.activeTransaction.startTime;

            await this.db.executeQuery('COMMIT');

            this._auditLog('TRANSACTION_COMMITTED', {
                transactionId: transactionId,
                operationCount: operationCount,
                duration: duration
            });

            // Restore previous transaction if nested
            if (this.transactionStack.length > 0) {
                this.activeTransaction = this.transactionStack.pop();
            } else {
                this.activeTransaction = null;
            }

            console.log('✅ SQLiteCaseRepository: Transaction committed', transactionId);
        } catch (error) {
            this._auditLog('TRANSACTION_COMMIT_FAILED', { error: error.message });
            await this.rollbackTransaction(); // Auto-rollback on commit failure
            throw new Error(`Failed to commit transaction: ${error.message}`);
        }
    }

    /**
     * Rollback active transaction
     * @returns {Promise<void>}
     */
    async rollbackTransaction() {
        try {
            if (!this.activeTransaction) {
                console.warn('⚠️ SQLiteCaseRepository: No active transaction to rollback');
                return;
            }

            const transactionId = this.activeTransaction.id;
            const operationCount = this.activeTransaction.operations.length;
            const duration = Date.now() - this.activeTransaction.startTime;

            await this.db.executeQuery('ROLLBACK');

            this._auditLog('TRANSACTION_ROLLED_BACK', {
                transactionId: transactionId,
                operationCount: operationCount,
                duration: duration
            });

            // Clear cache entries that might have been affected
            this.cache.clear();

            // Restore previous transaction if nested
            if (this.transactionStack.length > 0) {
                this.activeTransaction = this.transactionStack.pop();
            } else {
                this.activeTransaction = null;
            }

            console.log('⚠️ SQLiteCaseRepository: Transaction rolled back', transactionId);
        } catch (error) {
            this._auditLog('TRANSACTION_ROLLBACK_FAILED', { error: error.message });
            // Force clear transaction state even if rollback fails
            this.activeTransaction = null;
            this.transactionStack = [];
            throw new Error(`Failed to rollback transaction: ${error.message}`);
        }
    }

    /**
     * Create savepoint within transaction
     * @param {string} savepointName - Name of the savepoint
     * @returns {Promise<void>}
     */
    async createSavepoint(savepointName) {
        try {
            if (!this.activeTransaction) {
                throw new Error('No active transaction for savepoint');
            }

            await this.db.executeQuery(`SAVEPOINT ${savepointName}`);

            this.activeTransaction.savepoints.push({
                name: savepointName,
                createdAt: Date.now()
            });

            this._auditLog('SAVEPOINT_CREATED', {
                transactionId: this.activeTransaction.id,
                savepointName: savepointName
            });
        } catch (error) {
            this._auditLog('SAVEPOINT_CREATE_FAILED', {
                savepointName: savepointName,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Rollback to savepoint
     * @param {string} savepointName - Name of the savepoint
     * @returns {Promise<void>}
     */
    async rollbackToSavepoint(savepointName) {
        try {
            if (!this.activeTransaction) {
                throw new Error('No active transaction for savepoint rollback');
            }

            await this.db.executeQuery(`ROLLBACK TO SAVEPOINT ${savepointName}`);

            // Remove savepoints created after this one
            const savepointIndex = this.activeTransaction.savepoints.findIndex(sp => sp.name === savepointName);
            if (savepointIndex !== -1) {
                this.activeTransaction.savepoints = this.activeTransaction.savepoints.slice(0, savepointIndex + 1);
            }

            this._auditLog('SAVEPOINT_ROLLBACK', {
                transactionId: this.activeTransaction.id,
                savepointName: savepointName
            });
        } catch (error) {
            this._auditLog('SAVEPOINT_ROLLBACK_FAILED', {
                savepointName: savepointName,
                error: error.message
            });
            throw error;
        }
    }

    // =====================
    // MISSING REPOSITORY METHODS IMPLEMENTATION
    // =====================

    /**
     * Add a case note
     * @param {string} caseId - Case identifier
     * @param {CaseNote} note - Note to add
     * @returns {Promise<boolean>} Success status
     */
    async addCaseNote(caseId, note) {
        try {
            const existingCase = await this.findById(caseId);
            if (!existingCase) {
                throw new Error(`Case not found: ${caseId}`);
            }

            // Add note to case
            if (!existingCase.notes) {
                existingCase.notes = [];
            }
            existingCase.notes.push(note);

            // Update the case
            await this.update(existingCase);

            this._auditLog('CASE_NOTE_ADDED', {
                caseId: caseId,
                noteId: note.id,
                noteType: note.type
            });

            return true;
        } catch (error) {
            this._auditLog('CASE_NOTE_ADD_FAILED', {
                caseId: caseId,
                error: error.message
            });
            throw new Error(`Failed to add case note: ${error.message}`);
        }
    }

    /**
     * Add a note to a case (interface method alias)
     * @param {string} caseId - Case identifier
     * @param {Object} note - Note to add
     * @returns {Promise<Object>} The updated case
     */
    async addNote(caseId, note) {
        await this.addCaseNote(caseId, note);
        return await this.findById(caseId);
    }

    /**
     * Search cases by text content
     * @param {string} searchTerm - Search term
     * @param {string} clientId - Optional client ID filter
     * @returns {Promise<Array<LegalCase>>} Matching cases
     */
    async search(searchTerm, clientId = null) {
        try {
            // Use the existing searchByContent method
            const options = {
                limit: 100,
                offset: 0
            };

            if (clientId) {
                // Filter by client after search for now
                const allResults = await this.searchByContent(searchTerm, options);
                return allResults.filter(legalCase => legalCase.clientId === clientId);
            }

            return await this.searchByContent(searchTerm, options);
        } catch (error) {
            this._auditLog('CASE_SEARCH_FAILED', {
                searchTerm: searchTerm.substring(0, 50),
                clientId: clientId,
                error: error.message
            });
            throw new Error(`Failed to search cases: ${error.message}`);
        }
    }

    /**
     * Count cases for a client
     * @param {string} clientId - Client identifier
     * @returns {Promise<number>} Number of cases
     */
    async countByClientId(clientId) {
        try {
            const query = `
                SELECT COUNT(*) as count FROM legal_cases
                WHERE client_id = ? AND status != 'DELETED'
            `;
            const result = await this.db.executeQuery(query, [clientId]);
            return result[0].count;
        } catch (error) {
            this._auditLog('CLIENT_CASE_COUNT_FAILED', {
                clientId: clientId,
                error: error.message
            });
            throw new Error(`Failed to count cases for client: ${error.message}`);
        }
    }

    /**
     * Find recent cases
     * @param {number} limit - Maximum number of cases
     * @param {string} clientId - Optional client ID filter
     * @returns {Promise<Array<LegalCase>>} Recent cases
     */
    async findRecent(limit = 10, clientId = null) {
        try {
            let query = `
                SELECT * FROM legal_cases
                WHERE status != 'DELETED'
            `;
            const params = [];

            if (clientId) {
                query += ' AND client_id = ?';
                params.push(clientId);
            }

            query += ' ORDER BY updated_at DESC LIMIT ?';
            params.push(limit);

            const rows = await this.db.executeQuery(query, params);

            const cases = [];
            for (const row of rows) {
                try {
                    const legalCase = await this._decryptAndHydrateCase(row);
                    if (legalCase) {
                        cases.push(legalCase);
                    }
                } catch (decryptError) {
                    this._auditLog('CASE_DECRYPTION_FAILED', {
                        caseId: row.id,
                        error: decryptError.message
                    });
                }
            }

            this._auditLog('RECENT_CASES_RETRIEVED', {
                limit: limit,
                clientId: clientId,
                count: cases.length
            });

            return cases;
        } catch (error) {
            this._auditLog('RECENT_CASES_FAILED', {
                limit: limit,
                clientId: clientId,
                error: error.message
            });
            throw new Error(`Failed to find recent cases: ${error.message}`);
        }
    }

    /**
     * Find urgent cases (alias for existing method)
     * @param {string} clientId - Optional client ID filter
     * @returns {Promise<Array<LegalCase>>} Urgent cases
     */
    async findUrgent(clientId = null) {
        try {
            const urgentCases = await this.findUrgentCases();

            if (clientId) {
                return urgentCases.filter(c => c.clientId === clientId);
            }

            return urgentCases;
        } catch (error) {
            this._auditLog('URGENT_CASES_BY_CLIENT_FAILED', {
                clientId: clientId,
                error: error.message
            });
            throw new Error(`Failed to find urgent cases: ${error.message}`);
        }
    }

    /**
     * Archive old cases
     * @param {Date} beforeDate - Archive cases older than this date
     * @param {string} clientId - Optional client ID filter
     * @returns {Promise<number>} Number of cases archived
     */
    async archiveOldCases(beforeDate, clientId = null) {
        try {
            let query = `
                SELECT id FROM legal_cases
                WHERE updated_at < ? AND status IN ('RESOLVED', 'CLOSED')
            `;
            const params = [beforeDate.toISOString()];

            if (clientId) {
                query += ' AND client_id = ?';
                params.push(clientId);
            }

            const casesToArchive = await this.db.executeQuery(query, params);
            const caseIds = casesToArchive.map(row => row.id);

            if (caseIds.length === 0) {
                return 0;
            }

            const archivedIds = await this.batchArchive(caseIds);

            this._auditLog('OLD_CASES_ARCHIVED', {
                beforeDate: beforeDate.toISOString(),
                clientId: clientId,
                candidateCount: caseIds.length,
                archivedCount: archivedIds.length
            });

            return archivedIds.length;
        } catch (error) {
            this._auditLog('OLD_CASES_ARCHIVE_FAILED', {
                beforeDate: beforeDate.toISOString(),
                clientId: clientId,
                error: error.message
            });
            throw new Error(`Failed to archive old cases: ${error.message}`);
        }
    }

    // =====================
    // ENHANCED CACHE MANAGEMENT
    // =====================

    /**
     * Enhanced cache get with statistics
     */
    _getCachedCase(caseId) {
        if (this.cache.has(caseId)) {
            this.cacheStats.hits++;
            return this.cache.get(caseId);
        }
        this.cacheStats.misses++;
        return null;
    }

    /**
     * Enhanced cache set with LRU eviction
     */
    _setCachedCase(caseId, legalCase) {
        // Implement LRU eviction
        if (this.cache.size >= this.maxCacheSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
            this.cacheStats.evictions++;
        }

        this.cache.set(caseId, legalCase);
    }

    /**
     * Update cache management in findById method
     */
    async findById(caseId) {
        try {
            // Check cache first with statistics
            const cached = this._getCachedCase(caseId);
            if (cached) {
                return cached;
            }

            const query = 'SELECT * FROM legal_cases WHERE id = ? AND status != ?';
            const rows = await this.db.executeQuery(query, [caseId, 'DELETED']);

            if (rows.length === 0) {
                return null;
            }

            const row = rows[0];
            const legalCase = await this._decryptAndHydrateCase(row);

            // Cache the result with enhanced management
            if (legalCase) {
                this._setCachedCase(caseId, legalCase);
            }

            this._auditLog('CASE_ACCESSED', {
                caseId: caseId,
                found: !!legalCase
            });

            return legalCase;
        } catch (error) {
            this._auditLog('CASE_FIND_FAILED', {
                caseId: caseId,
                error: error.message
            });
            throw new Error(`Failed to find case: ${error.message}`);
        }
    }

    // =====================
    // PERFORMANCE MONITORING
    // =====================

    /**
     * Get repository performance metrics
     */
    getPerformanceMetrics() {
        return {
            cache: this.getCacheStats(),
            activeTransaction: !!this.activeTransaction,
            transactionStackDepth: this.transactionStack.length,
            memoryUsage: {
                cacheSize: this.cache.size,
                maxCacheSize: this.maxCacheSize
            }
        };
    }

    /**
     * Optimize repository performance
     */
    optimizePerformance(settings = {}) {
        if (settings.maxCacheSize) {
            this.maxCacheSize = settings.maxCacheSize;
        }

        if (settings.clearCache) {
            this.clearCache();
        }

        this._auditLog('PERFORMANCE_OPTIMIZED', {
            maxCacheSize: this.maxCacheSize,
            cacheCleared: !!settings.clearCache
        });
    }
}

module.exports = SQLiteCaseRepository;