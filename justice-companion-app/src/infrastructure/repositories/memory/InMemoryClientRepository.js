/**
 * InMemoryClientRepository - Fast In-Memory Implementation
 *
 * Implements IClientRepository interface using in-memory storage.
 * Designed for testing and development environments with GDPR compliance.
 *
 * Features:
 * - Fast in-memory operations
 * - No persistence (clears on restart)
 * - Same interface as SQLite version
 * - GDPR compliance testing support
 * - Mock data generation
 */

const IClientRepository = require('../../domain/repositories/IClientRepository');
const Client = require('../../domain/models/Client');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class InMemoryClientRepository extends IClientRepository {
    constructor(securityManager) {
        super();
        this.securityManager = securityManager;
        this.clients = new Map();
        this.gdprRecords = new Map();
        this.auditTrail = new Map();
        this.statistics = {
            operations: 0,
            created: 0,
            updated: 0,
            deleted: 0,
            anonymized: 0
        };
        
        this._initializeRepository();
    }

    /**
     * Initialize repository
     * @private
     */
    _initializeRepository() {
        this._auditLog('REPOSITORY_INITIALIZED', {
            implementation: 'InMemoryClientRepository',
            testMode: true,
            gdprCompliant: true
        });
        
        console.log('✅ InMemoryClientRepository: Initialized for testing with GDPR compliance');
    }

    /**
     * Save a new client
     * @param {Client} client - Client entity to save
     * @returns {Promise<Client>} Saved client with generated ID
     */
    async save(client) {
        try {
            // Validate input
            if (!(client instanceof Client)) {
                throw new Error('Input must be a Client instance');
            }

            // Generate ID if not present
            if (!client.clientId) {
                client.clientId = uuidv4();
            }

            // Check for duplicate email
            if (client.contactInfo.email) {
                const emailExists = await this.emailExists(client.contactInfo.email);
                if (emailExists) {
                    throw new Error('Client with this email already exists');
                }
            }

            // Store client
            this.clients.set(client.clientId, this._cloneClient(client));
            
            // Create GDPR compliance record
            await this._createGDPRRecord(client);
            
            // Update statistics
            this.statistics.operations++;
            this.statistics.created++;

            // Add to audit trail
            this._addAuditEntry(client.clientId, 'CREATE', {
                consentStatus: client.consentStatus,
                gdprCompliant: true
            });

            this._auditLog('CLIENT_SAVED', {
                clientId: client.clientId,
                consentStatus: client.consentStatus,
                inMemory: true
            });

            return this._cloneClient(client);
        } catch (error) {
            this._auditLog('CLIENT_SAVE_FAILED', {
                error: error.message,
                clientId: client?.clientId
            });
            throw new Error(`Failed to save client: ${error.message}`);
        }
    }

    /**
     * Find client by ID
     * @param {string} clientId - Client identifier
     * @returns {Promise<Client|null>} Client entity or null if not found
     */
    async findById(clientId) {
        try {
            const clientData = this.clients.get(clientId);
            
            if (!clientData) {
                return null;
            }

            this._auditLog('CLIENT_ACCESSED', {
                clientId: clientId,
                found: true
            });

            return this._cloneClient(clientData);
        } catch (error) {
            this._auditLog('CLIENT_FIND_FAILED', {
                clientId: clientId,
                error: error.message
            });
            throw new Error(`Failed to find client: ${error.message}`);
        }
    }

    /**
     * Find client by email address
     * @param {string} email - Client email address
     * @returns {Promise<Client|null>} Client entity or null if not found
     */
    async findByEmail(email) {
        try {
            const emailLower = email.toLowerCase();
            
            for (const clientData of this.clients.values()) {
                const clientEmail = clientData.contactInfo.email;
                if (clientEmail && clientEmail.toLowerCase() === emailLower) {
                    this._auditLog('CLIENT_FOUND_BY_EMAIL', {
                        emailProvided: true,
                        found: true
                    });
                    return this._cloneClient(clientData);
                }
            }

            this._auditLog('CLIENT_FOUND_BY_EMAIL', {
                emailProvided: true,
                found: false
            });

            return null;
        } catch (error) {
            this._auditLog('CLIENT_FIND_BY_EMAIL_FAILED', {
                error: error.message
            });
            throw new Error(`Failed to find client by email: ${error.message}`);
        }
    }

    /**
     * Update existing client
     * @param {Client} client - Client entity to update
     * @returns {Promise<Client>} Updated client entity
     */
    async update(client) {
        try {
            if (!(client instanceof Client)) {
                throw new Error('Input must be a Client instance');
            }

            if (!this.clients.has(client.clientId)) {
                throw new Error(`Client not found: ${client.clientId}`);
            }

            // Update timestamp
            client.updatedAt = new Date();

            // Store updated client
            this.clients.set(client.clientId, this._cloneClient(client));
            
            // Update statistics
            this.statistics.operations++;
            this.statistics.updated++;

            // Add to audit trail
            this._addAuditEntry(client.clientId, 'UPDATE', {
                consentStatus: client.consentStatus
            });

            this._auditLog('CLIENT_UPDATED', {
                clientId: client.clientId,
                consentStatus: client.consentStatus
            });

            return this._cloneClient(client);
        } catch (error) {
            this._auditLog('CLIENT_UPDATE_FAILED', {
                clientId: client?.clientId,
                error: error.message
            });
            throw new Error(`Failed to update client: ${error.message}`);
        }
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
        try {
            const client = await this.findById(clientId);
            if (!client) {
                throw new Error(`Client not found: ${clientId}`);
            }

            // Update consent through domain logic
            client.updateConsent(consentType, granted, version);

            // Save updated client
            await this.update(client);

            // Log GDPR consent action
            await this._logGDPRConsentAction(clientId, consentType, granted, version);

            this._auditLog('CONSENT_UPDATED', {
                clientId: clientId,
                consentType: consentType,
                granted: granted,
                version: version,
                gdprCompliant: true
            });

            return true;
        } catch (error) {
            this._auditLog('CONSENT_UPDATE_FAILED', {
                clientId: clientId,
                consentType: consentType,
                error: error.message
            });
            throw new Error(`Failed to update consent: ${error.message}`);
        }
    }

    /**
     * Delete client (soft delete for GDPR compliance)
     * @param {string} clientId - Client identifier
     * @returns {Promise<boolean>} Success status
     */
    async delete(clientId) {
        try {
            const client = await this.findById(clientId);
            if (!client) {
                return false;
            }

            // Check if deletion is legally permissible
            const canDelete = this._canDeleteClient(client);
            if (!canDelete.permitted) {
                throw new Error(`Deletion not permitted: ${canDelete.reason}`);
            }

            // Anonymize instead of hard delete for GDPR compliance
            client.anonymize();
            await this.update(client);
            
            // Update statistics
            this.statistics.operations++;
            this.statistics.deleted++;
            this.statistics.anonymized++;

            this._auditLog('CLIENT_DELETED', {
                clientId: clientId,
                method: 'anonymization',
                gdprCompliant: true
            });

            return true;
        } catch (error) {
            this._auditLog('CLIENT_DELETE_FAILED', {
                clientId: clientId,
                error: error.message
            });
            throw new Error(`Failed to delete client: ${error.message}`);
        }
    }

    /**
     * Anonymize client data for GDPR compliance
     * @param {string} clientId - Client to anonymize
     * @returns {Promise<boolean>} Success status
     */
    async anonymize(clientId) {
        try {
            const client = await this.findById(clientId);
            if (!client) {
                throw new Error(`Client not found: ${clientId}`);
            }

            // Anonymize through domain logic
            client.anonymize();
            await this.update(client);

            // Record GDPR action
            await this._recordGDPRAction(clientId, 'ANONYMIZATION', {
                reason: 'GDPR_COMPLIANCE',
                processedAt: new Date().toISOString()
            });
            
            // Update statistics
            this.statistics.anonymized++;

            this._auditLog('CLIENT_ANONYMIZED', {
                clientId: clientId,
                gdprCompliant: true
            });

            return true;
        } catch (error) {
            this._auditLog('CLIENT_ANONYMIZATION_FAILED', {
                clientId: clientId,
                error: error.message
            });
            throw new Error(`Failed to anonymize client: ${error.message}`);
        }
    }

    /**
     * Find all clients
     * @param {Object} options - Query options
     * @returns {Promise<Array<Client>>} All clients
     */
    async findAll(options = {}) {
        try {
            let allClients = Array.from(this.clients.values())
                .map(clientData => this._cloneClient(clientData))
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            // Filter anonymized clients if requested
            if (!options.includeAnonymized) {
                allClients = allClients.filter(client => !client.gdprFlags.anonymized);
            }

            this._auditLog('ALL_CLIENTS_RETRIEVED', {
                count: allClients.length,
                includeAnonymized: options.includeAnonymized
            });

            return allClients;
        } catch (error) {
            this._auditLog('ALL_CLIENTS_FAILED', {
                error: error.message
            });
            throw new Error(`Failed to find all clients: ${error.message}`);
        }
    }

    /**
     * Find clients with active consent
     * @returns {Promise<Array<Client>>} Clients with valid consent
     */
    async findWithActiveConsent() {
        try {
            const activeConsentClients = Array.from(this.clients.values())
                .map(clientData => this._cloneClient(clientData))
                .filter(client => client.hasValidConsent() && !client.isConsentExpired())
                .sort((a, b) => new Date(b.consentDate) - new Date(a.consentDate));

            this._auditLog('ACTIVE_CONSENT_CLIENTS_RETRIEVED', {
                count: activeConsentClients.length
            });

            return activeConsentClients;
        } catch (error) {
            this._auditLog('ACTIVE_CONSENT_CLIENTS_FAILED', {
                error: error.message
            });
            throw new Error(`Failed to find clients with active consent: ${error.message}`);
        }
    }

    /**
     * Find clients with expired consent
     * @param {number} gracePeriodDays - Grace period in days
     * @returns {Promise<Array<Client>>} Clients with expired consent
     */
    async findWithExpiredConsent(gracePeriodDays = 30) {
        try {
            const allClients = await this.findAll();
            
            const expiredClients = allClients.filter(client => {
                if (!client.consentDate) return true;
                
                const isExpired = client.isConsentExpired();
                if (!isExpired) return false;
                
                // Check grace period
                const gracePeriodEnd = new Date(client.consentDate);
                gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);
                
                return new Date() > gracePeriodEnd;
            });

            this._auditLog('EXPIRED_CONSENT_CLIENTS_RETRIEVED', {
                count: expiredClients.length,
                gracePeriodDays: gracePeriodDays
            });

            return expiredClients;
        } catch (error) {
            this._auditLog('EXPIRED_CONSENT_CLIENTS_FAILED', {
                error: error.message
            });
            throw new Error(`Failed to find clients with expired consent: ${error.message}`);
        }
    }

    /**
     * Find clients with consents expiring soon
     * @param {number} daysAhead - Days ahead to check
     * @returns {Promise<Array<Client>>} Clients with expiring consents
     */
    async findExpiringConsents(daysAhead = 30) {
        try {
            const activeClients = await this.findWithActiveConsent();
            const checkDate = new Date();
            checkDate.setDate(checkDate.getDate() + daysAhead);

            const expiringClients = activeClients.filter(client => {
                if (!client.consentDate) return false;
                
                const consentExpiryMonths = 24; // 2 years
                const expiryDate = new Date(client.consentDate);
                expiryDate.setMonth(expiryDate.getMonth() + consentExpiryMonths);
                
                return expiryDate <= checkDate && expiryDate > new Date();
            });

            this._auditLog('EXPIRING_CONSENT_CLIENTS_RETRIEVED', {
                count: expiringClients.length,
                daysAhead: daysAhead
            });

            return expiringClients;
        } catch (error) {
            this._auditLog('EXPIRING_CONSENT_CLIENTS_FAILED', {
                error: error.message
            });
            throw new Error(`Failed to find clients with expiring consents: ${error.message}`);
        }
    }

    /**
     * Find clients by consent status
     * @param {string} consentStatus - Consent status (GRANTED, REVOKED, PENDING)
     * @returns {Promise<Array<Client>>} Clients with specified consent status
     */
    async findByConsentStatus(consentStatus) {
        try {
            const allClients = await this.findAll();
            
            const filteredClients = allClients.filter(client => 
                client.consentStatus === consentStatus
            );

            this._auditLog('CLIENTS_BY_CONSENT_STATUS_RETRIEVED', {
                consentStatus: consentStatus,
                count: filteredClients.length
            });

            return filteredClients;
        } catch (error) {
            this._auditLog('CLIENTS_BY_CONSENT_STATUS_FAILED', {
                consentStatus: consentStatus,
                error: error.message
            });
            throw new Error(`Failed to find clients by consent status: ${error.message}`);
        }
    }

    /**
     * Search clients by name or contact information
     * @param {string} searchTerm - Search term
     * @param {Object} options - Search options
     * @returns {Promise<Array<Client>>} Matching clients
     */
    async search(searchTerm, options = {}) {
        try {
            const allClients = await this.findAll(options);
            
            const searchTermLower = searchTerm.toLowerCase();
            const matchingClients = allClients.filter(client => {
                const name = (client.name || '').toLowerCase();
                const email = (client.contactInfo.email || '').toLowerCase();
                const phone = (client.contactInfo.phone || '').toLowerCase();
                
                return name.includes(searchTermLower) || 
                       email.includes(searchTermLower) || 
                       phone.includes(searchTermLower);
            });

            // Apply limit
            const limit = options.limit || 50;
            const limitedResults = matchingClients.slice(0, limit);

            this._auditLog('CLIENT_SEARCH_PERFORMED', {
                searchTerm: searchTerm.substring(0, 20),
                resultsCount: limitedResults.length,
                totalMatches: matchingClients.length
            });

            return limitedResults;
        } catch (error) {
            this._auditLog('CLIENT_SEARCH_FAILED', {
                searchTerm: searchTerm.substring(0, 20),
                error: error.message
            });
            throw new Error(`Failed to search clients: ${error.message}`);
        }
    }

    /**
     * Find clients requiring data retention action
     * @returns {Promise<Array<Client>>} Clients needing retention review
     */
    async findRequiringRetentionAction() {
        try {
            const allClients = await this.findAll({ includeAnonymized: true });
            
            const retentionClients = allClients.filter(client => {
                const retentionStatus = client.getDataRetentionStatus();
                return retentionStatus.shouldPurge || retentionStatus.shouldArchive;
            });

            this._auditLog('RETENTION_ACTION_CLIENTS_RETRIEVED', {
                count: retentionClients.length
            });

            return retentionClients;
        } catch (error) {
            this._auditLog('RETENTION_ACTION_CLIENTS_FAILED', {
                error: error.message
            });
            throw new Error(`Failed to find clients requiring retention action: ${error.message}`);
        }
    }

    /**
     * Get client statistics
     * @returns {Promise<Object>} Client statistics
     */
    async getStatistics() {
        try {
            const allClients = await this.findAll({ includeAnonymized: true });
            
            const statistics = {
                total: allClients.length,
                active: 0,
                anonymized: 0,
                withValidConsent: 0,
                withExpiredConsent: 0,
                byConsentStatus: {
                    GRANTED: 0,
                    REVOKED: 0,
                    PENDING: 0
                },
                repository: {
                    ...this.statistics,
                    totalInMemory: this.clients.size
                },
                generatedAt: new Date().toISOString()
            };

            // Calculate statistics
            allClients.forEach(client => {
                if (client.gdprFlags.anonymized) {
                    statistics.anonymized++;
                } else {
                    statistics.active++;
                }

                if (client.hasValidConsent()) {
                    statistics.withValidConsent++;
                }

                if (client.isConsentExpired()) {
                    statistics.withExpiredConsent++;
                }

                statistics.byConsentStatus[client.consentStatus] = 
                    (statistics.byConsentStatus[client.consentStatus] || 0) + 1;
            });

            this._auditLog('CLIENT_STATISTICS_GENERATED', {
                total: statistics.total,
                active: statistics.active
            });

            return statistics;
        } catch (error) {
            this._auditLog('CLIENT_STATISTICS_FAILED', {
                error: error.message
            });
            throw new Error(`Failed to get client statistics: ${error.message}`);
        }
    }

    /**
     * Check if client exists
     * @param {string} clientId - Client identifier
     * @returns {Promise<boolean>} Existence status
     */
    async exists(clientId) {
        return this.clients.has(clientId);
    }

    /**
     * Check if email is already registered
     * @param {string} email - Email address
     * @param {string} excludeClientId - Client ID to exclude from check
     * @returns {Promise<boolean>} True if email exists
     */
    async emailExists(email, excludeClientId = null) {
        try {
            const emailLower = email.toLowerCase();
            
            for (const [clientId, clientData] of this.clients) {
                if (excludeClientId && clientId === excludeClientId) {
                    continue;
                }
                
                const clientEmail = clientData.contactInfo.email;
                if (clientEmail && clientEmail.toLowerCase() === emailLower) {
                    return true;
                }
            }

            return false;
        } catch (error) {
            this._auditLog('EMAIL_EXISTS_CHECK_FAILED', {
                error: error.message
            });
            return false;
        }
    }

    // =====================
    // ADDITIONAL INTERFACE METHODS (Simplified)
    // =====================

    async updateContactInfo(clientId, contactInfo) {
        try {
            const client = await this.findById(clientId);
            if (!client) {
                throw new Error(`Client not found: ${clientId}`);
            }

            client.updateContactInfo(contactInfo);
            await this.update(client);

            this._auditLog('CLIENT_CONTACT_INFO_UPDATED', {
                clientId: clientId
            });

            return true;
        } catch (error) {
            this._auditLog('CONTACT_INFO_UPDATE_FAILED', {
                clientId: clientId,
                error: error.message
            });
            throw new Error(`Failed to update contact info: ${error.message}`);
        }
    }

    async updatePreferences(clientId, preferences) {
        try {
            const client = await this.findById(clientId);
            if (!client) {
                throw new Error(`Client not found: ${clientId}`);
            }

            client.updatePreferences(preferences);
            await this.update(client);

            this._auditLog('CLIENT_PREFERENCES_UPDATED', {
                clientId: clientId
            });

            return true;
        } catch (error) {
            this._auditLog('PREFERENCES_UPDATE_FAILED', {
                clientId: clientId,
                error: error.message
            });
            throw new Error(`Failed to update preferences: ${error.message}`);
        }
    }

    async recordGDPRRequest(clientId, gdprRequest) {
        try {
            const requestId = uuidv4();
            
            const gdprRecord = {
                id: requestId,
                clientId: clientId,
                requestType: gdprRequest.type,
                requestDate: new Date().toISOString(),
                requestStatus: 'PENDING',
                requestDetails: gdprRequest,
                createdAt: new Date().toISOString()
            };

            if (!this.gdprRecords.has(clientId)) {
                this.gdprRecords.set(clientId, []);
            }
            this.gdprRecords.get(clientId).push(gdprRecord);

            this._auditLog('GDPR_REQUEST_RECORDED', {
                requestId: requestId,
                clientId: clientId,
                requestType: gdprRequest.type
            });

            return requestId;
        } catch (error) {
            this._auditLog('GDPR_REQUEST_RECORD_FAILED', {
                clientId: clientId,
                error: error.message
            });
            throw new Error(`Failed to record GDPR request: ${error.message}`);
        }
    }

    async getGDPRRequestHistory(clientId) {
        try {
            const requests = this.gdprRecords.get(clientId) || [];

            this._auditLog('GDPR_REQUEST_HISTORY_RETRIEVED', {
                clientId: clientId,
                requestCount: requests.length
            });

            return [...requests].sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
        } catch (error) {
            this._auditLog('GDPR_REQUEST_HISTORY_FAILED', {
                clientId: clientId,
                error: error.message
            });
            throw new Error(`Failed to get GDPR request history: ${error.message}`);
        }
    }

    // Additional simplified implementations...
    async updateLastActivity(clientId, timestamp = new Date()) {
        const client = await this.findById(clientId);
        if (client) {
            client.lastActiveAt = timestamp;
            await this.update(client);
        }
        return !!client;
    }

    async findInactiveClients(inactiveDays = 365) {
        const allClients = await this.findAll();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);
        
        return allClients.filter(client => 
            client.lastActiveAt < cutoffDate
        );
    }

    async bulkUpdateConsent(updates) {
        const updatedIds = [];
        for (const update of updates) {
            try {
                const success = await this.updateConsent(
                    update.clientId, 
                    update.consentType, 
                    update.granted
                );
                if (success) {
                    updatedIds.push(update.clientId);
                }
            } catch (error) {
                this._auditLog('BULK_CONSENT_UPDATE_ITEM_FAILED', {
                    clientId: update.clientId,
                    error: error.message
                });
            }
        }
        return updatedIds;
    }

    async findPaginated(page, pageSize, filters = {}) {
        const allClients = await this.findAll(filters);
        const offset = (page - 1) * pageSize;
        
        return {
            clients: allClients.slice(offset, offset + pageSize),
            pagination: {
                page: page,
                pageSize: pageSize,
                total: allClients.length,
                totalPages: Math.ceil(allClients.length / pageSize),
                hasNext: page * pageSize < allClients.length,
                hasPrevious: page > 1
            }
        };
    }

    async exportClientData(clientId, format = 'JSON') {
        const client = await this.findById(clientId);
        if (!client) {
            throw new Error(`Client not found: ${clientId}`);
        }

        const exportData = client.handleGDPRRequest('PORTABILITY');
        return {
            exportId: uuidv4(),
            format: format,
            data: exportData,
            exportedAt: new Date().toISOString()
        };
    }

    async validateIntegrity(clientId) {
        const clientData = this.clients.get(clientId);
        return {
            valid: !!clientData,
            exists: !!clientData,
            validatedAt: new Date().toISOString()
        };
    }

    // Placeholder implementations for remaining interface methods
    async getConsentAuditTrail(clientId) {
        return this.auditTrail.get(clientId) || [];
    }

    async findByDemographics(criteria) {
        // Simple implementation - can be enhanced
        const allClients = await this.findAll();
        return allClients.filter(client => {
            // Basic demographic filtering logic
            return true; // Simplified for testing
        });
    }

    async updateGDPRFlags(clientId, gdprFlags) {
        const client = await this.findById(clientId);
        if (client) {
            client.gdprFlags = { ...client.gdprFlags, ...gdprFlags };
            await this.update(client);
        }
        return !!client;
    }

    async archive(clientId) {
        const client = await this.findById(clientId);
        if (client) {
            client.gdprFlags.archived = true;
            client.gdprFlags.archivedAt = new Date();
            await this.update(client);
        }
        return !!client;
    }

    async restore(clientId) {
        const client = await this.findById(clientId);
        if (client && client.gdprFlags.archived) {
            client.gdprFlags.archived = false;
            delete client.gdprFlags.archivedAt;
            await this.update(client);
        }
        return !!client;
    }

    async countByCriteria(criteria) {
        const allClients = await this.findAll();
        return allClients.filter(client => {
            // Apply criteria filtering
            if (criteria.consentStatus && client.consentStatus !== criteria.consentStatus) {
                return false;
            }
            return true;
        }).length;
    }

    async getClientMetrics(clientId) {
        const client = await this.findById(clientId);
        if (!client) return null;
        
        return {
            clientId: clientId,
            consentStatus: client.consentStatus,
            hasValidConsent: client.hasValidConsent(),
            isConsentExpired: client.isConsentExpired(),
            caseCount: client.cases.length,
            lastActiveAt: client.lastActiveAt,
            dataRetentionStatus: client.getDataRetentionStatus()
        };
    }

    async findPotentialDuplicates(criteria = {}) {
        // Simple duplicate detection by name and email
        const allClients = await this.findAll();
        const duplicateGroups = [];
        const processed = new Set();
        
        for (const client of allClients) {
            if (processed.has(client.clientId)) continue;
            
            const duplicates = allClients.filter(other => 
                other.clientId !== client.clientId &&
                !processed.has(other.clientId) &&
                (
                    other.name.toLowerCase() === client.name.toLowerCase() ||
                    (other.contactInfo.email && client.contactInfo.email &&
                     other.contactInfo.email.toLowerCase() === client.contactInfo.email.toLowerCase())
                )
            );
            
            if (duplicates.length > 0) {
                duplicateGroups.push([client, ...duplicates]);
                duplicates.forEach(dup => processed.add(dup.clientId));
            }
            
            processed.add(client.clientId);
        }
        
        return duplicateGroups;
    }

    async mergeClients(primaryClientId, duplicateClientIds) {
        const primaryClient = await this.findById(primaryClientId);
        if (!primaryClient) {
            throw new Error(`Primary client not found: ${primaryClientId}`);
        }
        
        // Simple merge - combine cases from duplicates
        for (const duplicateId of duplicateClientIds) {
            const duplicate = await this.findById(duplicateId);
            if (duplicate) {
                primaryClient.cases.push(...duplicate.cases);
                await this.delete(duplicateId); // Soft delete/anonymize
            }
        }
        
        await this.update(primaryClient);
        return primaryClient;
    }

    async cleanupOrphanedData() {
        // In memory repository doesn't have orphaned data
        return {
            orphanedClientsRemoved: 0,
            cleanupDate: new Date().toISOString()
        };
    }

    async backupClientData(clientIds = []) {
        const clients = clientIds.length > 0 ? 
            clientIds.map(id => this.clients.get(id)).filter(Boolean) :
            Array.from(this.clients.values());
            
        return {
            backupId: uuidv4(),
            clientCount: clients.length,
            backupDate: new Date().toISOString(),
            format: 'JSON'
        };
    }

    async getDataRetentionSummary() {
        const allClients = await this.findAll({ includeAnonymized: true });
        const retentionClients = await this.findRequiringRetentionAction();
        
        return {
            totalClients: allClients.length,
            requireRetentionAction: retentionClients.length,
            anonymizedClients: allClients.filter(c => c.gdprFlags.anonymized).length,
            activeConsents: (await this.findWithActiveConsent()).length,
            expiredConsents: (await this.findWithExpiredConsent()).length,
            generatedAt: new Date().toISOString()
        };
    }

    // =====================
    // TESTING AND UTILITY METHODS
    // =====================

    /**
     * Clear all data (useful for testing)
     */
    clear() {
        this.clients.clear();
        this.gdprRecords.clear();
        this.auditTrail.clear();
        this.statistics = {
            operations: 0,
            created: 0,
            updated: 0,
            deleted: 0,
            anonymized: 0
        };
        
        this._auditLog('REPOSITORY_CLEARED', {
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get repository size
     */
    size() {
        return this.clients.size;
    }

    /**
     * Generate mock client data for testing
     */
    generateMockClient(overrides = {}) {
        const mockClient = new Client({
            name: 'Mock Client',
            contactInfo: {
                email: `mock${Date.now()}@example.com`,
                phone: '+1-555-0123'
            },
            consentStatus: 'GRANTED',
            consentDate: new Date(),
            ...overrides
        });
        
        return mockClient;
    }

    /**
     * Seed repository with test data
     */
    async seedWithTestData(count = 10) {
        const seededClients = [];
        
        for (let i = 0; i < count; i++) {
            const mockClient = this.generateMockClient({
                name: `Test Client ${i + 1}`,
                contactInfo: {
                    email: `test${i + 1}@example.com`,
                    phone: `+1-555-${String(i + 1).padStart(4, '0')}`
                },
                consentStatus: ['GRANTED', 'PENDING', 'REVOKED'][i % 3]
            });
            
            const savedClient = await this.save(mockClient);
            seededClients.push(savedClient);
        }
        
        this._auditLog('TEST_DATA_SEEDED', {
            count: count
        });
        
        return seededClients;
    }

    // =====================
    // PRIVATE HELPER METHODS
    // =====================

    /**
     * Clone client data to prevent mutation
     * @private
     */
    _cloneClient(clientData) {
        if (clientData instanceof Client) {
            return Client.fromObject(clientData.toObject());
        }
        return Client.fromObject(clientData);
    }

    /**
     * Create GDPR compliance record
     * @private
     */
    async _createGDPRRecord(client) {
        const gdprRecord = {
            id: uuidv4(),
            clientId: client.clientId,
            consentDate: client.consentDate ? client.consentDate.toISOString() : null,
            lawfulBasis: client.consentStatus === 'GRANTED' ? 'consent' : 'legitimate_interest',
            purposeLimitation: 'Legal case management and representation',
            dataMinimizationApplied: true,
            securityMeasures: 'In-memory encryption simulation, audit logging',
            createdAt: new Date().toISOString()
        };

        if (!this.gdprRecords.has(client.clientId)) {
            this.gdprRecords.set(client.clientId, []);
        }
        this.gdprRecords.get(client.clientId).push(gdprRecord);
    }

    /**
     * Log GDPR consent action
     * @private
     */
    async _logGDPRConsentAction(clientId, consentType, granted, version) {
        this._addAuditEntry(clientId, 'CONSENT_UPDATED', {
            consentType: consentType,
            granted: granted,
            version: version,
            gdprCompliant: true
        });
    }

    /**
     * Record GDPR action
     * @private
     */
    async _recordGDPRAction(clientId, actionType, details) {
        const gdprRecord = {
            id: uuidv4(),
            clientId: clientId,
            requestType: actionType,
            requestDate: new Date().toISOString(),
            requestStatus: 'COMPLETED',
            requestDetails: details,
            createdAt: new Date().toISOString()
        };

        if (!this.gdprRecords.has(clientId)) {
            this.gdprRecords.set(clientId, []);
        }
        this.gdprRecords.get(clientId).push(gdprRecord);
    }

    /**
     * Check if client can be deleted
     * @private
     */
    _canDeleteClient(client) {
        // Check for active cases
        if (client.cases && client.cases.length > 0) {
            return {
                permitted: false,
                reason: 'Client has active cases'
            };
        }

        return {
            permitted: true,
            reason: 'No restrictions found'
        };
    }

    /**
     * Add audit trail entry
     * @private
     */
    _addAuditEntry(clientId, action, details) {
        if (!this.auditTrail.has(clientId)) {
            this.auditTrail.set(clientId, []);
        }
        
        this.auditTrail.get(clientId).push({
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            action: action,
            details: details,
            clientId: clientId
        });
    }

    /**
     * Audit logging helper
     * @private
     */
    _auditLog(action, details) {
        if (this.securityManager && this.securityManager.auditLog) {
            this.securityManager.auditLog('IN_MEMORY_CLIENT_REPO', action, details);
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
            size: this.clients.size,
            type: 'in-memory',
            statistics: this.statistics
        };
    }
}

module.exports = InMemoryClientRepository;