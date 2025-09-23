/**
 * IClientRepository Interface
 *
 * Defines the contract for client data persistence operations.
 * Abstracts data access layer from domain logic following Repository pattern.
 *
 * Handles GDPR compliance requirements for client data management.
 */

class IClientRepository {
    /**
     * Save a new client
     * @param {Client} client - Client entity to save
     * @returns {Promise<Client>} Saved client with generated ID
     * @throws {Error} If save operation fails
     */
    async save(client) {
        throw new Error('IClientRepository.save() must be implemented');
    }

    /**
     * Find client by ID
     * @param {string} clientId - Client identifier
     * @returns {Promise<Client|null>} Client entity or null if not found
     */
    async findById(clientId) {
        throw new Error('IClientRepository.findById() must be implemented');
    }

    /**
     * Find client by email address
     * @param {string} email - Client email address
     * @returns {Promise<Client|null>} Client entity or null if not found
     */
    async findByEmail(email) {
        throw new Error('IClientRepository.findByEmail() must be implemented');
    }

    /**
     * Update existing client
     * @param {Client} client - Client entity to update
     * @returns {Promise<Client>} Updated client entity
     * @throws {Error} If client not found or update fails
     */
    async update(client) {
        throw new Error('IClientRepository.update() must be implemented');
    }

    /**
     * Update client consent status
     * @param {string} clientId - Client identifier
     * @param {string} consentType - Type of consent
     * @param {boolean} granted - Whether consent is granted
     * @param {string} version - Consent version
     * @returns {Promise<boolean>} Success status
     */
    async updateConsent(clientId, consentType, granted, version) {
        throw new Error('IClientRepository.updateConsent() must be implemented');
    }

    /**
     * Delete client (soft delete for GDPR compliance)
     * @param {string} clientId - Client identifier
     * @returns {Promise<boolean>} Success status
     */
    async delete(clientId) {
        throw new Error('IClientRepository.delete() must be implemented');
    }

    /**
     * Anonymize client data for GDPR compliance
     * @param {string} clientId - Client to anonymize
     * @returns {Promise<boolean>} Success status
     */
    async anonymize(clientId) {
        throw new Error('IClientRepository.anonymize() must be implemented');
    }

    /**
     * Find all clients
     * @param {Object} options - Query options
     * @param {boolean} [options.includeAnonymized] - Include anonymized clients
     * @returns {Promise<Array<Client>>} All clients
     */
    async findAll(options = {}) {
        throw new Error('IClientRepository.findAll() must be implemented');
    }

    /**
     * Find clients with active consent
     * @returns {Promise<Array<Client>>} Clients with valid consent
     */
    async findWithActiveConsent() {
        throw new Error('IClientRepository.findWithActiveConsent() must be implemented');
    }

    /**
     * Find clients with expired consent
     * @param {number} gracePeriodDays - Grace period in days
     * @returns {Promise<Array<Client>>} Clients with expired consent
     */
    async findWithExpiredConsent(gracePeriodDays = 30) {
        throw new Error('IClientRepository.findWithExpiredConsent() must be implemented');
    }

    /**
     * Find clients with consents expiring soon
     * @param {number} daysAhead - Days ahead to check
     * @returns {Promise<Array<Client>>} Clients with expiring consents
     */
    async findExpiringConsents(daysAhead = 30) {
        throw new Error('IClientRepository.findExpiringConsents() must be implemented');
    }

    /**
     * Find clients by consent status
     * @param {string} consentStatus - Consent status (GRANTED, REVOKED, PENDING)
     * @returns {Promise<Array<Client>>} Clients with specified consent status
     */
    async findByConsentStatus(consentStatus) {
        throw new Error('IClientRepository.findByConsentStatus() must be implemented');
    }

    /**
     * Search clients by name or contact information
     * @param {string} searchTerm - Search term
     * @param {Object} options - Search options
     * @returns {Promise<Array<Client>>} Matching clients
     */
    async search(searchTerm, options = {}) {
        throw new Error('IClientRepository.search() must be implemented');
    }

    /**
     * Find clients requiring data retention action
     * @returns {Promise<Array<Client>>} Clients needing retention review
     */
    async findRequiringRetentionAction() {
        throw new Error('IClientRepository.findRequiringRetentionAction() must be implemented');
    }

    /**
     * Get client statistics
     * @returns {Promise<Object>} Client statistics
     */
    async getStatistics() {
        throw new Error('IClientRepository.getStatistics() must be implemented');
    }

    /**
     * Check if client exists
     * @param {string} clientId - Client identifier
     * @returns {Promise<boolean>} Existence status
     */
    async exists(clientId) {
        throw new Error('IClientRepository.exists() must be implemented');
    }

    /**
     * Check if email is already registered
     * @param {string} email - Email address
     * @param {string} excludeClientId - Client ID to exclude from check
     * @returns {Promise<boolean>} True if email exists
     */
    async emailExists(email, excludeClientId = null) {
        throw new Error('IClientRepository.emailExists() must be implemented');
    }

    /**
     * Update client contact information
     * @param {string} clientId - Client identifier
     * @param {Object} contactInfo - New contact information
     * @returns {Promise<boolean>} Success status
     */
    async updateContactInfo(clientId, contactInfo) {
        throw new Error('IClientRepository.updateContactInfo() must be implemented');
    }

    /**
     * Update client preferences
     * @param {string} clientId - Client identifier
     * @param {Object} preferences - Client preferences
     * @returns {Promise<boolean>} Success status
     */
    async updatePreferences(clientId, preferences) {
        throw new Error('IClientRepository.updatePreferences() must be implemented');
    }

    /**
     * Record GDPR request
     * @param {string} clientId - Client identifier
     * @param {Object} gdprRequest - GDPR request details
     * @returns {Promise<string>} Request ID
     */
    async recordGDPRRequest(clientId, gdprRequest) {
        throw new Error('IClientRepository.recordGDPRRequest() must be implemented');
    }

    /**
     * Get GDPR request history for client
     * @param {string} clientId - Client identifier
     * @returns {Promise<Array<Object>>} GDPR request history
     */
    async getGDPRRequestHistory(clientId) {
        throw new Error('IClientRepository.getGDPRRequestHistory() must be implemented');
    }

    /**
     * Update last activity timestamp
     * @param {string} clientId - Client identifier
     * @param {Date} timestamp - Activity timestamp
     * @returns {Promise<boolean>} Success status
     */
    async updateLastActivity(clientId, timestamp = new Date()) {
        throw new Error('IClientRepository.updateLastActivity() must be implemented');
    }

    /**
     * Find inactive clients
     * @param {number} inactiveDays - Days of inactivity
     * @returns {Promise<Array<Client>>} Inactive clients
     */
    async findInactiveClients(inactiveDays = 365) {
        throw new Error('IClientRepository.findInactiveClients() must be implemented');
    }

    /**
     * Bulk update consent status
     * @param {Array<Object>} updates - Array of {clientId, consentType, granted}
     * @returns {Promise<Array<string>>} Successfully updated client IDs
     */
    async bulkUpdateConsent(updates) {
        throw new Error('IClientRepository.bulkUpdateConsent() must be implemented');
    }

    /**
     * Get clients with pagination
     * @param {number} page - Page number (1-based)
     * @param {number} pageSize - Items per page
     * @param {Object} filters - Optional filters
     * @returns {Promise<Object>} Paginated results with total count
     */
    async findPaginated(page, pageSize, filters = {}) {
        throw new Error('IClientRepository.findPaginated() must be implemented');
    }

    /**
     * Export client data for GDPR compliance
     * @param {string} clientId - Client identifier
     * @param {string} format - Export format (JSON, XML, CSV)
     * @returns {Promise<Object>} Export package
     */
    async exportClientData(clientId, format = 'JSON') {
        throw new Error('IClientRepository.exportClientData() must be implemented');
    }

    /**
     * Validate client data integrity
     * @param {string} clientId - Client to validate
     * @returns {Promise<Object>} Validation results
     */
    async validateIntegrity(clientId) {
        throw new Error('IClientRepository.validateIntegrity() must be implemented');
    }

    /**
     * Get consent audit trail
     * @param {string} clientId - Client identifier
     * @returns {Promise<Array<Object>>} Consent history with full audit trail
     */
    async getConsentAuditTrail(clientId) {
        throw new Error('IClientRepository.getConsentAuditTrail() must be implemented');
    }

    /**
     * Find clients by demographic criteria
     * @param {Object} criteria - Search criteria
     * @returns {Promise<Array<Client>>} Matching clients
     */
    async findByDemographics(criteria) {
        throw new Error('IClientRepository.findByDemographics() must be implemented');
    }

    /**
     * Update GDPR flags
     * @param {string} clientId - Client identifier
     * @param {Object} gdprFlags - GDPR flags to update
     * @returns {Promise<boolean>} Success status
     */
    async updateGDPRFlags(clientId, gdprFlags) {
        throw new Error('IClientRepository.updateGDPRFlags() must be implemented');
    }

    /**
     * Archive client data
     * @param {string} clientId - Client to archive
     * @returns {Promise<boolean>} Success status
     */
    async archive(clientId) {
        throw new Error('IClientRepository.archive() must be implemented');
    }

    /**
     * Restore archived client
     * @param {string} clientId - Client to restore
     * @returns {Promise<boolean>} Success status
     */
    async restore(clientId) {
        throw new Error('IClientRepository.restore() must be implemented');
    }

    /**
     * Count clients by criteria
     * @param {Object} criteria - Count criteria
     * @returns {Promise<number>} Client count
     */
    async countByCriteria(criteria) {
        throw new Error('IClientRepository.countByCriteria() must be implemented');
    }

    /**
     * Get client dashboard metrics
     * @param {string} clientId - Client identifier
     * @returns {Promise<Object>} Client metrics and statistics
     */
    async getClientMetrics(clientId) {
        throw new Error('IClientRepository.getClientMetrics() must be implemented');
    }

    /**
     * Find duplicate clients
     * @param {Object} criteria - Duplicate detection criteria
     * @returns {Promise<Array<Array<Client>>>} Groups of potential duplicates
     */
    async findPotentialDuplicates(criteria = {}) {
        throw new Error('IClientRepository.findPotentialDuplicates() must be implemented');
    }

    /**
     * Merge client records
     * @param {string} primaryClientId - Primary client to keep
     * @param {Array<string>} duplicateClientIds - Duplicate clients to merge
     * @returns {Promise<Client>} Merged client record
     */
    async mergeClients(primaryClientId, duplicateClientIds) {
        throw new Error('IClientRepository.mergeClients() must be implemented');
    }

    /**
     * Cleanup orphaned client data
     * @returns {Promise<Object>} Cleanup results
     */
    async cleanupOrphanedData() {
        throw new Error('IClientRepository.cleanupOrphanedData() must be implemented');
    }

    /**
     * Backup client data
     * @param {Array<string>} clientIds - Clients to backup (empty for all)
     * @returns {Promise<Object>} Backup information
     */
    async backupClientData(clientIds = []) {
        throw new Error('IClientRepository.backupClientData() must be implemented');
    }

    /**
     * Get data retention summary
     * @returns {Promise<Object>} Data retention status summary
     */
    async getDataRetentionSummary() {
        throw new Error('IClientRepository.getDataRetentionSummary() must be implemented');
    }
}

module.exports = IClientRepository;