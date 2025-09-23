/**
 * Justice Companion Domain Layer Exports
 *
 * Central export point for all domain models, value objects, services, and interfaces.
 * Implements Domain-Driven Design architecture for legal assistance system.
 */

// Domain Models (Entities)
const LegalCase = require('./models/LegalCase');
const Client = require('./models/Client');
const LegalAdvice = require('./models/LegalAdvice');

// Value Objects
const CaseStatus = require('./valueObjects/CaseStatus');
const LegalCategory = require('./valueObjects/LegalCategory');
const RiskLevel = require('./valueObjects/RiskLevel');

// Domain Services
const CaseManagementService = require('./services/CaseManagementService');
const LegalComplianceService = require('./services/LegalComplianceService');

// Repository Interfaces
const ICaseRepository = require('./repositories/ICaseRepository');
const IClientRepository = require('./repositories/IClientRepository');

// Existing Domain Components
let LegalUbiquitousLanguage;
try {
    LegalUbiquitousLanguage = require('./LegalUbiquitousLanguage');
} catch (error) {
    // Handle case where LegalUbiquitousLanguage doesn't exist yet
    LegalUbiquitousLanguage = null;
}

module.exports = {
    // Entities
    LegalCase,
    Client,
    LegalAdvice,

    // Value Objects
    CaseStatus,
    LegalCategory,
    RiskLevel,

    // Domain Services
    CaseManagementService,
    LegalComplianceService,

    // Repository Interfaces
    ICaseRepository,
    IClientRepository,

    // Existing Components
    LegalUbiquitousLanguage,

    // Domain Validation Helpers
    DomainValidation: {
        /**
         * Validate case creation data
         * @param {Object} caseData - Case data to validate
         * @returns {Object} Validation result
         */
        validateCaseCreation(caseData) {
            const errors = [];

            if (!caseData.clientId) {
                errors.push('Client ID is required');
            }

            if (!caseData.caseType || !LegalCategory.isValid(caseData.caseType)) {
                errors.push('Valid case type is required');
            }

            if (!caseData.title || caseData.title.trim().length === 0) {
                errors.push('Case title is required');
            }

            if (caseData.title && caseData.title.length > 200) {
                errors.push('Case title must be 200 characters or less');
            }

            return {
                isValid: errors.length === 0,
                errors: errors
            };
        },

        /**
         * Validate client creation data
         * @param {Object} clientData - Client data to validate
         * @returns {Object} Validation result
         */
        validateClientCreation(clientData) {
            const errors = [];

            if (!clientData.name || clientData.name.trim().length === 0) {
                errors.push('Client name is required');
            }

            if (clientData.contactInfo && clientData.contactInfo.email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(clientData.contactInfo.email)) {
                    errors.push('Valid email address is required');
                }
            }

            return {
                isValid: errors.length === 0,
                errors: errors
            };
        },

        /**
         * Validate status transition
         * @param {string} fromStatus - Current status
         * @param {string} toStatus - Target status
         * @param {Object} context - Additional context
         * @returns {Object} Validation result
         */
        validateStatusTransition(fromStatus, toStatus, context = {}) {
            return CaseStatus.validateTransitionWithContext(fromStatus, toStatus, context);
        },

        /**
         * Validate risk assessment
         * @param {string} category - Legal category
         * @param {string} content - Content to assess
         * @returns {Object} Risk assessment result
         */
        validateRiskAssessment(category, content) {
            const riskLevel = RiskLevel.assessRiskLevel(category, content);
            const requiresUrgent = RiskLevel.requiresHumanReview(riskLevel);

            return {
                riskLevel: riskLevel,
                requiresUrgentAttention: requiresUrgent,
                recommendations: RiskLevel.getRecommendedActions(riskLevel),
                disclaimers: RiskLevel.getDisclaimers(riskLevel)
            };
        }
    },

    // Domain Constants
    Constants: {
        DATA_RETENTION_YEARS: 7,
        CONSENT_EXPIRY_MONTHS: 24,
        GDPR_GRACE_PERIOD_DAYS: 30,
        CASE_ARCHIVAL_DAYS: 30,
        CRITICAL_CASE_ESCALATION_HOURS: 4,

        // Legal Compliance Constants
        GDPR_ARTICLES: {
            RIGHT_TO_ACCESS: 'Article 15',
            RIGHT_TO_RECTIFICATION: 'Article 16',
            RIGHT_TO_ERASURE: 'Article 17',
            RIGHT_TO_RESTRICT_PROCESSING: 'Article 18',
            RIGHT_TO_DATA_PORTABILITY: 'Article 20'
        },

        // System Limits
        LIMITS: {
            MAX_CASE_TITLE_LENGTH: 200,
            MAX_CASE_DESCRIPTION_LENGTH: 5000,
            MAX_CLIENT_NAME_LENGTH: 100,
            MAX_SEARCH_RESULTS: 100,
            MAX_EXPORT_RECORDS: 1000
        }
    },

    // Domain Events (for future event sourcing)
    Events: {
        CASE_CREATED: 'CaseCreated',
        CASE_STATUS_CHANGED: 'CaseStatusChanged',
        CASE_ARCHIVED: 'CaseArchived',
        CLIENT_REGISTERED: 'ClientRegistered',
        CONSENT_GRANTED: 'ConsentGranted',
        CONSENT_REVOKED: 'ConsentRevoked',
        GDPR_REQUEST_RECEIVED: 'GDPRRequestReceived',
        LEGAL_ADVICE_GENERATED: 'LegalAdviceGenerated',
        RISK_LEVEL_ESCALATED: 'RiskLevelEscalated'
    },

    // Factory Methods
    Factory: {
        /**
         * Create a new legal case with defaults
         * @param {Object} caseData - Case creation data
         * @returns {LegalCase} New case instance
         */
        createLegalCase(caseData) {
            return new LegalCase({
                ...caseData,
                status: caseData.status || CaseStatus.INTAKE,
                priority: caseData.priority || 'NORMAL',
                createdAt: new Date(),
                updatedAt: new Date()
            });
        },

        /**
         * Create a new client with defaults
         * @param {Object} clientData - Client creation data
         * @returns {Client} New client instance
         */
        createClient(clientData) {
            return new Client({
                ...clientData,
                consentStatus: clientData.consentStatus || 'PENDING',
                createdAt: new Date(),
                updatedAt: new Date(),
                lastActiveAt: new Date()
            });
        },

        /**
         * Create legal advice with required disclaimers
         * @param {Object} adviceData - Advice creation data
         * @returns {LegalAdvice} New advice instance
         */
        createLegalAdvice(adviceData) {
            return new LegalAdvice({
                ...adviceData,
                timestamp: new Date(),
                reviewStatus: 'UNREVIEWED'
            });
        }
    }
};

// Export type definitions for TypeScript support
module.exports.Types = {
    CaseStatus: Object.freeze(CaseStatus.getAllStatuses()),
    LegalCategory: Object.freeze(LegalCategory.getAllCategories()),
    RiskLevel: Object.freeze(RiskLevel.getAllLevels())
};