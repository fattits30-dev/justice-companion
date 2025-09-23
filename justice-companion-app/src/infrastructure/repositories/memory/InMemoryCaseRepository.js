/**
 * InMemoryCaseRepository - Fast In-Memory Implementation
 *
 * Implements ICaseRepository interface using in-memory storage.
 * Designed for testing and development environments.
 *
 * Features:
 * - Fast in-memory operations
 * - No persistence (clears on restart)
 * - Same interface as SQLite version
 * - Mock data generation support
 * - Comprehensive test coverage
 */

const ICaseRepository = require('../../domain/repositories/ICaseRepository');
const LegalCase = require('../../domain/models/LegalCase');
const CaseStatus = require('../../domain/valueObjects/CaseStatus');
const LegalCategory = require('../../domain/valueObjects/LegalCategory');
const { v4: uuidv4 } = require('uuid');

class InMemoryCaseRepository extends ICaseRepository {
    constructor(securityManager) {
        super();
        this.securityManager = securityManager;
        this.cases = new Map();
        this.auditTrail = new Map();
        this.statistics = {
            operations: 0,
            created: 0,
            updated: 0,
            deleted: 0
        };
        
        this._initializeRepository();
    }

    /**
     * Initialize repository
     * @private
     */
    _initializeRepository() {
        this._auditLog('REPOSITORY_INITIALIZED', {
            implementation: 'InMemoryCaseRepository',
            testMode: true
        });
        
        console.log('✅ InMemoryCaseRepository: Initialized for testing');
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

            // Store case
            this.cases.set(legalCase.caseId, this._cloneCase(legalCase));
            
            // Update statistics
            this.statistics.operations++;
            this.statistics.created++;

            // Add to audit trail
            this._addAuditEntry(legalCase.caseId, 'CREATE', {
                caseType: legalCase.caseType,
                clientId: legalCase.clientId
            });

            this._auditLog('CASE_SAVED', {
                caseId: legalCase.caseId,
                clientId: legalCase.clientId,
                inMemory: true
            });

            return this._cloneCase(legalCase);
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
            const caseData = this.cases.get(caseId);
            
            if (!caseData || caseData.status === 'DELETED') {
                return null;
            }

            this._auditLog('CASE_ACCESSED', {
                caseId: caseId,
                found: true
            });

            return this._cloneCase(caseData);
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
            const clientCases = Array.from(this.cases.values())
                .filter(caseData => 
                    caseData.clientId === clientId && 
                    caseData.status !== 'DELETED'
                )
                .map(caseData => this._cloneCase(caseData))
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            this._auditLog('CASES_RETRIEVED_BY_CLIENT', {
                clientId: clientId,
                count: clientCases.length
            });

            return clientCases;
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
            
            const activeCases = Array.from(this.cases.values())
                .filter(caseData => 
                    caseData.clientId === clientId && 
                    activeStatuses.includes(caseData.status)
                )
                .map(caseData => this._cloneCase(caseData))
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

            this._auditLog('ACTIVE_CASES_RETRIEVED', {
                clientId: clientId,
                count: activeCases.length
            });

            return activeCases;
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

            if (!this.cases.has(legalCase.caseId)) {
                throw new Error(`Case not found: ${legalCase.caseId}`);
            }

            // Update timestamp
            legalCase.updatedAt = new Date();

            // Store updated case
            this.cases.set(legalCase.caseId, this._cloneCase(legalCase));
            
            // Update statistics
            this.statistics.operations++;
            this.statistics.updated++;

            // Add to audit trail
            this._addAuditEntry(legalCase.caseId, 'UPDATE', {
                status: legalCase.status
            });

            this._auditLog('CASE_UPDATED', {
                caseId: legalCase.caseId,
                status: legalCase.status
            });

            return this._cloneCase(legalCase);
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
            const caseData = this.cases.get(caseId);
            if (!caseData) {
                return false;
            }

            // Soft delete
            caseData.status = 'DELETED';
            caseData.updatedAt = new Date();
            
            // Update statistics
            this.statistics.operations++;
            this.statistics.deleted++;

            // Add to audit trail
            this._addAuditEntry(caseId, 'DELETE', {
                softDelete: true
            });

            this._auditLog('CASE_DELETED', {
                caseId: caseId,
                softDelete: true
            });

            return true;
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

            const statusCases = Array.from(this.cases.values())
                .filter(caseData => caseData.status === status)
                .map(caseData => this._cloneCase(caseData))
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

            this._auditLog('CASES_RETRIEVED_BY_STATUS', {
                status: status,
                count: statusCases.length
            });

            return statusCases;
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

            const categoryCases = Array.from(this.cases.values())
                .filter(caseData => 
                    caseData.caseType === category && 
                    caseData.status !== 'DELETED'
                )
                .map(caseData => this._cloneCase(caseData))
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            this._auditLog('CASES_RETRIEVED_BY_CATEGORY', {
                category: category,
                count: categoryCases.length
            });

            return categoryCases;
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
            let filteredCases = Array.from(this.cases.values())
                .filter(caseData => caseData.status !== 'DELETED');

            // Apply filters
            if (filters.status) {
                filteredCases = filteredCases.filter(c => c.status === filters.status);
            }

            if (filters.category) {
                filteredCases = filteredCases.filter(c => c.caseType === filters.category);
            }

            if (filters.clientId) {
                filteredCases = filteredCases.filter(c => c.clientId === filters.clientId);
            }

            if (filters.createdAfter) {
                filteredCases = filteredCases.filter(c => new Date(c.createdAt) >= filters.createdAfter);
            }

            if (filters.createdBefore) {
                filteredCases = filteredCases.filter(c => new Date(c.createdAt) <= filters.createdBefore);
            }

            if (filters.priority) {
                filteredCases = filteredCases.filter(c => c.priority === filters.priority);
            }

            // Sort by updated date
            filteredCases.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

            // Apply limit
            if (filters.limit && typeof filters.limit === 'number') {
                filteredCases = filteredCases.slice(0, filters.limit);
            }

            const results = filteredCases.map(caseData => this._cloneCase(caseData));

            this._auditLog('CASES_RETRIEVED_WITH_FILTERS', {
                filters: this._sanitizeFilters(filters),
                count: results.length
            });

            return results;
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
            const categoryCases = await this.findByCategory(category);
            
            // Simple similarity: same category, exclude reference case
            const similarCases = categoryCases
                .filter(c => c.caseId !== context.excludeCaseId)
                .slice(0, context.limit || 10);

            this._auditLog('SIMILAR_CASES_RETRIEVED', {
                category: category,
                count: similarCases.length
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

            const eligibleCases = Array.from(this.cases.values())
                .filter(caseData => {
                    if (!completedStatuses.includes(caseData.status)) {
                        return false;
                    }
                    
                    return new Date(caseData.updatedAt) <= thirtyDaysAgo;
                })
                .map(caseData => this._cloneCase(caseData))
                .filter(legalCase => legalCase.canBeArchived())
                .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));

            this._auditLog('ARCHIVAL_ELIGIBLE_CASES_RETRIEVED', {
                count: eligibleCases.length
            });

            return eligibleCases;
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
            const currentDate = new Date();
            
            const retentionCases = Array.from(this.cases.values())
                .filter(caseData => caseData.status !== 'DELETED')
                .map(caseData => this._cloneCase(caseData))
                .filter(legalCase => legalCase.requiresDataRetentionAction())
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

            this._auditLog('RETENTION_ACTION_CASES_RETRIEVED', {
                count: retentionCases.length
            });

            return retentionCases;
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
            let casesToAnalyze = Array.from(this.cases.values())
                .filter(caseData => caseData.status !== 'DELETED');

            // Apply filters
            if (filters.clientId) {
                casesToAnalyze = casesToAnalyze.filter(c => c.clientId === filters.clientId);
            }

            if (filters.dateFrom) {
                casesToAnalyze = casesToAnalyze.filter(c => new Date(c.createdAt) >= filters.dateFrom);
            }

            if (filters.dateTo) {
                casesToAnalyze = casesToAnalyze.filter(c => new Date(c.createdAt) <= filters.dateTo);
            }

            // Calculate statistics
            const statistics = {
                total: casesToAnalyze.length,
                byStatus: {},
                byCategory: {},
                repository: {
                    ...this.statistics,
                    totalInMemory: this.cases.size
                },
                generatedAt: new Date().toISOString()
            };

            // Count by status
            casesToAnalyze.forEach(caseData => {
                statistics.byStatus[caseData.status] = 
                    (statistics.byStatus[caseData.status] || 0) + 1;
            });

            // Count by category
            casesToAnalyze.forEach(caseData => {
                if (caseData.caseType) {
                    statistics.byCategory[caseData.caseType] = 
                        (statistics.byCategory[caseData.caseType] || 0) + 1;
                }
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
            const searchTermLower = searchTerm.toLowerCase();
            
            const matchingCases = Array.from(this.cases.values())
                .filter(caseData => caseData.status !== 'DELETED')
                .filter(caseData => {
                    const title = (caseData.title || '').toLowerCase();
                    const description = (caseData.description || '').toLowerCase();
                    
                    return title.includes(searchTermLower) || description.includes(searchTermLower);
                })
                .map(caseData => this._cloneCase(caseData))
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

            // Apply pagination
            const offset = options.offset || 0;
            const limit = options.limit || 50;
            const paginatedResults = matchingCases.slice(offset, offset + limit);

            this._auditLog('CONTENT_SEARCH_PERFORMED', {
                searchTerm: searchTerm.substring(0, 50),
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

    // =====================
    // ADDITIONAL INTERFACE METHODS (Simplified)
    // =====================

    async anonymize(caseId, anonymizedData) {
        const caseData = this.cases.get(caseId);
        if (caseData) {
            // Simple anonymization - replace with anonymized data
            Object.assign(caseData, anonymizedData);
            caseData.updatedAt = new Date();
            this._addAuditEntry(caseId, 'ANONYMIZE', { gdprCompliance: true });
        }
        return !!caseData;
    }

    async batchArchive(caseIds) {
        const archivedIds = [];
        for (const caseId of caseIds) {
            const caseData = this.cases.get(caseId);
            if (caseData && [CaseStatus.RESOLVED, CaseStatus.CLOSED].includes(caseData.status)) {
                caseData.status = CaseStatus.ARCHIVED;
                caseData.updatedAt = new Date();
                archivedIds.push(caseId);
                this._addAuditEntry(caseId, 'ARCHIVE', {});
            }
        }
        return archivedIds;
    }

    async findByDateRange(startDate, endDate, options = {}) {
        return this.findWithFilters({
            createdAfter: startDate,
            createdBefore: endDate,
            ...options
        });
    }

    async countByCriteria(criteria) {
        const filtered = await this.findWithFilters(criteria);
        return filtered.length;
    }

    async findUrgentCases() {
        const urgentCases = Array.from(this.cases.values())
            .filter(caseData => 
                caseData.status !== 'DELETED' &&
                [CaseStatus.ACTIVE, CaseStatus.PENDING].includes(caseData.status) &&
                (caseData.priority === 'HIGH' || caseData.priority === 'URGENT')
            )
            .map(caseData => this._cloneCase(caseData))
            .sort((a, b) => {
                if (a.priority === 'URGENT' && b.priority !== 'URGENT') return -1;
                if (b.priority === 'URGENT' && a.priority !== 'URGENT') return 1;
                return b.getAgeInDays() - a.getAgeInDays();
            });

        return urgentCases;
    }

    async exists(caseId) {
        const caseData = this.cases.get(caseId);
        return !!(caseData && caseData.status !== 'DELETED');
    }

    async findPaginated(page, pageSize, filters = {}) {
        const allCases = await this.findWithFilters(filters);
        const offset = (page - 1) * pageSize;
        
        return {
            cases: allCases.slice(offset, offset + pageSize),
            pagination: {
                page: page,
                pageSize: pageSize,
                total: allCases.length,
                totalPages: Math.ceil(allCases.length / pageSize),
                hasNext: page * pageSize < allCases.length,
                hasPrevious: page > 1
            }
        };
    }

    // Additional methods with simplified implementations...
    async updateMetadata(caseId, metadata) {
        const caseData = this.cases.get(caseId);
        if (caseData) {
            caseData.metadata = { ...caseData.metadata, ...metadata };
            caseData.updatedAt = new Date();
        }
        return !!caseData;
    }

    async addDocument(caseId, document) {
        const caseData = this.cases.get(caseId);
        if (caseData) {
            if (!caseData.documents) caseData.documents = [];
            caseData.documents.push({ ...document, addedAt: new Date() });
            caseData.updatedAt = new Date();
        }
        return !!caseData;
    }

    async removeDocument(caseId, documentId) {
        const caseData = this.cases.get(caseId);
        if (caseData && caseData.documents) {
            const index = caseData.documents.findIndex(d => d.documentId === documentId);
            if (index > -1) {
                caseData.documents.splice(index, 1);
                caseData.updatedAt = new Date();
            }
        }
        return !!caseData;
    }

    async getAuditTrail(caseId) {
        return this.auditTrail.get(caseId) || [];
    }

    async bulkUpdateStatus(updates) {
        const updatedIds = [];
        for (const update of updates) {
            const caseData = this.cases.get(update.caseId);
            if (caseData) {
                caseData.status = update.status;
                caseData.updatedAt = new Date();
                updatedIds.push(update.caseId);
            }
        }
        return updatedIds;
    }

    async getDashboardStats(clientId = null) {
        const stats = await this.getStatistics({ clientId });
        return {
            ...stats,
            urgent: await this.countByCriteria({ priority: 'URGENT' }),
            active: stats.byStatus[CaseStatus.ACTIVE] || 0,
            pending: stats.byStatus[CaseStatus.PENDING] || 0,
            resolved: stats.byStatus[CaseStatus.RESOLVED] || 0
        };
    }

    async findRelatedCases(caseId, limit = 10) {
        const referenceCase = this.cases.get(caseId);
        if (!referenceCase) return [];
        
        return this.findWithFilters({
            clientId: referenceCase.clientId,
            category: referenceCase.caseType,
            limit: limit + 1
        }).then(cases => cases.filter(c => c.caseId !== caseId).slice(0, limit));
    }

    async exportCases(caseIds, format = 'JSON') {
        const cases = [];
        for (const caseId of caseIds) {
            const caseData = this.cases.get(caseId);
            if (caseData && caseData.status !== 'DELETED') {
                cases.push(this._cloneCase(caseData).toObject());
            }
        }
        
        return {
            exportId: uuidv4(),
            format: format,
            exportedAt: new Date().toISOString(),
            caseCount: cases.length,
            cases: cases
        };
    }

    async validateIntegrity(caseId) {
        const caseData = this.cases.get(caseId);
        return {
            valid: !!caseData,
            exists: !!caseData,
            validatedAt: new Date().toISOString()
        };
    }

    async cleanupOrphanedData() {
        // In memory repository doesn't have orphaned data
        return {
            orphanedCasesRemoved: 0,
            cleanupDate: new Date().toISOString()
        };
    }

    // =====================
    // TESTING AND UTILITY METHODS
    // =====================

    /**
     * Clear all data (useful for testing)
     */
    clear() {
        this.cases.clear();
        this.auditTrail.clear();
        this.statistics = {
            operations: 0,
            created: 0,
            updated: 0,
            deleted: 0
        };
        
        this._auditLog('REPOSITORY_CLEARED', {
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get repository size
     */
    size() {
        return this.cases.size;
    }

    /**
     * Generate mock case data for testing
     */
    generateMockCase(clientId, overrides = {}) {
        const mockCase = new LegalCase({
            clientId: clientId,
            title: 'Mock Legal Case',
            description: 'This is a mock case for testing purposes',
            caseType: LegalCategory.GENERAL,
            status: CaseStatus.ACTIVE,
            priority: 'NORMAL',
            ...overrides
        });
        
        return mockCase;
    }

    /**
     * Seed repository with test data
     */
    async seedWithTestData(count = 10, clientId = 'test-client') {
        const seededCases = [];
        
        for (let i = 0; i < count; i++) {
            const mockCase = this.generateMockCase(clientId, {
                title: `Test Case ${i + 1}`,
                description: `Test case description ${i + 1}`,
                caseType: Object.values(LegalCategory)[i % Object.values(LegalCategory).length],
                status: Object.values(CaseStatus)[i % 3] // Rotate through first 3 statuses
            });
            
            const savedCase = await this.save(mockCase);
            seededCases.push(savedCase);
        }
        
        this._auditLog('TEST_DATA_SEEDED', {
            count: count,
            clientId: clientId
        });
        
        return seededCases;
    }

    // =====================
    // PRIVATE HELPER METHODS
    // =====================

    /**
     * Clone case data to prevent mutation
     * @private
     */
    _cloneCase(caseData) {
        if (caseData instanceof LegalCase) {
            return LegalCase.fromObject(caseData.toObject());
        }
        return LegalCase.fromObject(caseData);
    }

    /**
     * Add audit trail entry
     * @private
     */
    _addAuditEntry(caseId, action, details) {
        if (!this.auditTrail.has(caseId)) {
            this.auditTrail.set(caseId, []);
        }
        
        this.auditTrail.get(caseId).push({
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            action: action,
            details: details,
            caseId: caseId
        });
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
     * Audit logging helper
     * @private
     */
    _auditLog(action, details) {
        if (this.securityManager && this.securityManager.auditLog) {
            this.securityManager.auditLog('IN_MEMORY_CASE_REPO', action, details);
        }
    }

    /**
     * Clear cache (compatibility with SQLite version)
     */
    clearCache() {
        // No-op for in-memory implementation
        this._auditLog('CACHE_CLEARED', { note: 'No cache in memory implementation' });
    }

    /**
     * Get cache statistics (compatibility with SQLite version)
     */
    getCacheStats() {
        return {
            size: this.cases.size,
            type: 'in-memory',
            statistics: this.statistics
        };
    }
}

module.exports = InMemoryCaseRepository;