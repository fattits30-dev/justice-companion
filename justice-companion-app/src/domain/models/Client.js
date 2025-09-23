/**
 * Client Domain Entity
 *
 * Manages client information and consent for Justice Companion legal assistance.
 * Implements GDPR compliance and data protection requirements.
 *
 * Domain Rules:
 * - Client consent required before case creation
 * - GDPR data subject rights must be respected
 * - Data retention policies enforced
 * - Client privacy and confidentiality maintained
 */

const { v4: uuidv4 } = require('uuid');

class Client {
    constructor(props) {
        this.clientId = props.clientId || uuidv4();
        this.name = props.name;
        this.contactInfo = props.contactInfo || {};
        this.consentStatus = props.consentStatus || 'PENDING';
        this.consentDate = props.consentDate || null;
        this.dataRetentionDate = props.dataRetentionDate || null;
        this.cases = props.cases || [];
        this.preferences = props.preferences || {};
        this.gdprFlags = props.gdprFlags || {};
        this.createdAt = props.createdAt || new Date();
        this.updatedAt = props.updatedAt || new Date();
        this.lastActiveAt = props.lastActiveAt || new Date();

        // Validate invariants
        this._validateInvariants();
    }

    /**
     * Update client consent status
     * @param {string} consentType - Type of consent (GENERAL, PROCESSING, MARKETING)
     * @param {boolean} granted - Whether consent is granted
     * @param {string} version - Consent version for audit trail
     */
    updateConsent(consentType, granted, version = '1.0') {
        if (!this.gdprFlags.consentHistory) {
            this.gdprFlags.consentHistory = [];
        }

        this.gdprFlags.consentHistory.push({
            type: consentType,
            granted: granted,
            version: version,
            timestamp: new Date(),
            ipAddress: this.gdprFlags.lastKnownIP || null
        });

        // Update main consent status
        if (consentType === 'GENERAL') {
            this.consentStatus = granted ? 'GRANTED' : 'REVOKED';
            this.consentDate = granted ? new Date() : null;
        }

        this.updatedAt = new Date();
        this._calculateDataRetentionDate();
    }

    /**
     * Associate a case with this client
     * @param {string} caseId - Case identifier
     */
    addCase(caseId) {
        if (!this.hasValidConsent()) {
            throw new Error('Client consent required before case creation');
        }

        if (!this.cases.includes(caseId)) {
            this.cases.push(caseId);
            this.updatedAt = new Date();
            this.lastActiveAt = new Date();
        }
    }

    /**
     * Remove case association
     * @param {string} caseId - Case identifier
     */
    removeCase(caseId) {
        const index = this.cases.indexOf(caseId);
        if (index > -1) {
            this.cases.splice(index, 1);
            this.updatedAt = new Date();
        }
    }

    /**
     * Check if client has valid consent for processing
     * @returns {boolean}
     */
    hasValidConsent() {
        return this.consentStatus === 'GRANTED' && this.consentDate !== null;
    }

    /**
     * Check if consent has expired
     * @returns {boolean}
     */
    isConsentExpired() {
        if (!this.consentDate) return true;

        const consentExpiryMonths = 24; // 2 years
        const expiryDate = new Date(this.consentDate);
        expiryDate.setMonth(expiryDate.getMonth() + consentExpiryMonths);

        return new Date() > expiryDate;
    }

    /**
     * Update client contact information
     * @param {Object} newContactInfo - Updated contact details
     */
    updateContactInfo(newContactInfo) {
        // Validate email format if provided
        if (newContactInfo.email && !this._isValidEmail(newContactInfo.email)) {
            throw new Error('Invalid email format');
        }

        this.contactInfo = {
            ...this.contactInfo,
            ...newContactInfo
        };

        this.updatedAt = new Date();
    }

    /**
     * Update client preferences
     * @param {Object} newPreferences - Updated preferences
     */
    updatePreferences(newPreferences) {
        this.preferences = {
            ...this.preferences,
            ...newPreferences
        };

        this.updatedAt = new Date();
    }

    /**
     * Handle GDPR data subject request
     * @param {string} requestType - Type of request (ACCESS, RECTIFICATION, ERASURE, PORTABILITY)
     * @returns {Object} - Request response data
     */
    handleGDPRRequest(requestType) {
        const requestId = uuidv4();
        const timestamp = new Date();

        if (!this.gdprFlags.requests) {
            this.gdprFlags.requests = [];
        }

        this.gdprFlags.requests.push({
            requestId: requestId,
            type: requestType,
            timestamp: timestamp,
            status: 'PENDING'
        });

        this.updatedAt = new Date();

        switch (requestType) {
            case 'ACCESS':
                return this._generateDataPortabilityPackage();
            case 'RECTIFICATION':
                return { requestId, message: 'Rectification request logged' };
            case 'ERASURE':
                return this._processErasureRequest(requestId);
            case 'PORTABILITY':
                return this._generateDataPortabilityPackage();
            default:
                throw new Error(`Unknown GDPR request type: ${requestType}`);
        }
    }

    /**
     * Check if client data should be archived or purged
     * @returns {Object} - Data retention status
     */
    getDataRetentionStatus() {
        const now = new Date();
        const daysSinceLastActive = this._getDaysSinceDate(this.lastActiveAt);
        const hasActiveCases = this.cases.length > 0;

        return {
            shouldArchive: daysSinceLastActive > 365 && !hasActiveCases,
            shouldPurge: this.dataRetentionDate && now > this.dataRetentionDate,
            daysSinceLastActive: daysSinceLastActive,
            retentionDate: this.dataRetentionDate
        };
    }

    /**
     * Anonymize client data (soft deletion for GDPR compliance)
     */
    anonymize() {
        this.name = `Anonymous-${this.clientId.substring(0, 8)}`;
        this.contactInfo = {
            anonymized: true,
            anonymizedAt: new Date()
        };
        this.gdprFlags.anonymized = true;
        this.gdprFlags.anonymizedAt = new Date();
        this.updatedAt = new Date();
    }

    /**
     * Validate domain invariants
     * @private
     */
    _validateInvariants() {
        if (!this.name || this.name.trim().length === 0) {
            throw new Error('Client must have a name');
        }

        const validConsentStatuses = ['PENDING', 'GRANTED', 'REVOKED'];
        if (!validConsentStatuses.includes(this.consentStatus)) {
            throw new Error(`Invalid consent status: ${this.consentStatus}`);
        }
    }

    /**
     * Calculate data retention date based on legal requirements
     * @private
     */
    _calculateDataRetentionDate() {
        if (this.consentStatus === 'GRANTED') {
            const retentionYears = 7; // Legal requirement
            const retentionDate = new Date();
            retentionDate.setFullYear(retentionDate.getFullYear() + retentionYears);
            this.dataRetentionDate = retentionDate;
        } else if (this.consentStatus === 'REVOKED') {
            // Set for immediate review but allow grace period
            const gracePeriodDays = 30;
            const gracePeriodDate = new Date();
            gracePeriodDate.setDate(gracePeriodDate.getDate() + gracePeriodDays);
            this.dataRetentionDate = gracePeriodDate;
        }
    }

    /**
     * Validate email format
     * @private
     */
    _isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Generate data portability package for GDPR compliance
     * @private
     */
    _generateDataPortabilityPackage() {
        return {
            clientData: {
                clientId: this.clientId,
                name: this.name,
                contactInfo: this.contactInfo,
                preferences: this.preferences,
                createdAt: this.createdAt,
                lastActiveAt: this.lastActiveAt
            },
            consentHistory: this.gdprFlags.consentHistory || [],
            associatedCases: this.cases,
            generatedAt: new Date(),
            format: 'JSON'
        };
    }

    /**
     * Process data erasure request
     * @private
     */
    _processErasureRequest(requestId) {
        // Check if erasure is legally permissible
        const hasActiveCases = this.cases.length > 0;
        const isSubjectToLegalHold = this._checkLegalHold();

        if (hasActiveCases || isSubjectToLegalHold) {
            return {
                requestId,
                status: 'DENIED',
                reason: 'Active cases or legal hold prevents erasure',
                canReprocess: true,
                reprocessAfter: this._calculateEarliestErasureDate()
            };
        }

        return {
            requestId,
            status: 'APPROVED',
            scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        };
    }

    /**
     * Check if client data is subject to legal hold
     * @private
     */
    _checkLegalHold() {
        // Implementation would check for ongoing legal proceedings
        return false;
    }

    /**
     * Calculate earliest date for data erasure
     * @private
     */
    _calculateEarliestErasureDate() {
        const dataRetentionYears = 7;
        const earliestDate = new Date();
        earliestDate.setFullYear(earliestDate.getFullYear() + dataRetentionYears);
        return earliestDate;
    }

    /**
     * Calculate days since a given date
     * @private
     */
    _getDaysSinceDate(date) {
        const now = new Date();
        const diffTime = Math.abs(now - date);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Convert to plain object for persistence
     */
    toObject() {
        return {
            clientId: this.clientId,
            name: this.name,
            contactInfo: this.contactInfo,
            consentStatus: this.consentStatus,
            consentDate: this.consentDate,
            dataRetentionDate: this.dataRetentionDate,
            cases: this.cases,
            preferences: this.preferences,
            gdprFlags: this.gdprFlags,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            lastActiveAt: this.lastActiveAt
        };
    }

    /**
     * Create instance from persisted data
     */
    static fromObject(data) {
        return new Client(data);
    }
}

module.exports = Client;