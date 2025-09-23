/**
 * CaseManagementService Domain Service
 *
 * Orchestrates case lifecycle operations and business rules.
 * Implements complex case management logic that spans multiple aggregates.
 *
 * Responsibilities:
 * - Case creation with validation
 * - Status transitions with business rules
 * - Case archival and data retention
 * - Cross-case analytics and reporting
 */

const LegalCase = require('../models/LegalCase');
const Client = require('../models/Client');
const CaseStatus = require('../valueObjects/CaseStatus');
const LegalCategory = require('../valueObjects/LegalCategory');
const RiskLevel = require('../valueObjects/RiskLevel');

class CaseManagementService {
    constructor(caseRepository, clientRepository, auditService) {
        this.caseRepository = caseRepository;
        this.clientRepository = clientRepository;
        this.auditService = auditService;
    }

    /**
     * Create a new legal case with full validation
     * @param {Object} caseData - Case creation data
     * @returns {Promise<LegalCase>}
     */
    async createCase(caseData) {
        // Validate client exists and has consent
        const client = await this.clientRepository.findById(caseData.clientId);
        if (!client) {
            throw new Error('Client not found');
        }

        if (!client.hasValidConsent()) {
            throw new Error('Client consent required before case creation');
        }

        if (client.isConsentExpired()) {
            throw new Error('Client consent has expired. Renewal required.');
        }

        // Validate case data
        this._validateCaseData(caseData);

        // Create case instance
        const legalCase = new LegalCase({
            ...caseData,
            status: CaseStatus.INTAKE
        });

        // Apply business rules
        await this._applyCreationBusinessRules(legalCase, client);

        // Save case
        const savedCase = await this.caseRepository.save(legalCase);

        // Update client association
        client.addCase(savedCase.caseId);
        await this.clientRepository.update(client);

        // Audit trail
        await this.auditService.logCaseCreated(savedCase.caseId, client.clientId);

        return savedCase;
    }

    /**
     * Update case status with business rule validation
     * @param {string} caseId - Case identifier
     * @param {string} newStatus - Target status
     * @param {Object} context - Additional context for transition
     * @returns {Promise<LegalCase>}
     */
    async updateCaseStatus(caseId, newStatus, context = {}) {
        const legalCase = await this.caseRepository.findById(caseId);
        if (!legalCase) {
            throw new Error('Case not found');
        }

        // Validate transition with business context
        const validationResult = CaseStatus.validateTransitionWithContext(
            legalCase.status,
            newStatus,
            context
        );

        if (!validationResult.valid) {
            throw new Error(validationResult.reason);
        }

        // Apply status-specific business rules
        await this._applyStatusTransitionRules(legalCase, newStatus, context);

        // Update status
        legalCase.updateStatus(newStatus, context.reason || '');

        // Save changes
        const updatedCase = await this.caseRepository.update(legalCase);

        // Handle post-transition actions
        await this._handlePostTransitionActions(updatedCase, newStatus, context);

        // Audit trail
        await this.auditService.logStatusChange(caseId, legalCase.status, newStatus, context);

        return updatedCase;
    }

    /**
     * Archive eligible cases based on business rules
     * @returns {Promise<Array<string>>} Array of archived case IDs
     */
    async archiveEligibleCases() {
        const eligibleCases = await this.caseRepository.findEligibleForArchival();
        const archivedCaseIds = [];

        for (const legalCase of eligibleCases) {
            if (legalCase.canBeArchived()) {
                try {
                    await this.updateCaseStatus(
                        legalCase.caseId,
                        CaseStatus.ARCHIVED,
                        {
                            reason: 'Automated archival - retention period met',
                            automated: true
                        }
                    );
                    archivedCaseIds.push(legalCase.caseId);
                } catch (error) {
                    // Log error but continue with other cases
                    console.error(`Failed to archive case ${legalCase.caseId}:`, error);
                }
            }
        }

        return archivedCaseIds;
    }

    /**
     * Process data retention requirements
     * @returns {Promise<Object>} Retention processing results
     */
    async processDataRetention() {
        const casesForRetention = await this.caseRepository.findRequiringRetentionAction();
        const results = {
            reviewed: 0,
            archived: 0,
            purged: 0,
            errors: []
        };

        for (const legalCase of casesForRetention) {
            try {
                results.reviewed++;

                if (legalCase.requiresDataRetentionAction()) {
                    // Check legal hold status
                    const isUnderLegalHold = await this._checkLegalHold(legalCase);

                    if (!isUnderLegalHold) {
                        // Safe to purge data
                        await this._purgeOrAnonymizeCase(legalCase);
                        results.purged++;
                    } else {
                        // Extend retention due to legal hold
                        await this._extendRetention(legalCase, 'Legal hold active');
                    }
                } else if (legalCase.canBeArchived()) {
                    await this.updateCaseStatus(
                        legalCase.caseId,
                        CaseStatus.ARCHIVED,
                        { reason: 'Data retention policy', automated: true }
                    );
                    results.archived++;
                }
            } catch (error) {
                results.errors.push({
                    caseId: legalCase.caseId,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Get case analytics and statistics
     * @param {Object} filters - Analytics filters
     * @returns {Promise<Object>} Analytics data
     */
    async getCaseAnalytics(filters = {}) {
        const cases = await this.caseRepository.findWithFilters(filters);

        return {
            totalCases: cases.length,
            statusDistribution: this._calculateStatusDistribution(cases),
            categoryDistribution: this._calculateCategoryDistribution(cases),
            riskDistribution: this._calculateRiskDistribution(cases),
            avgResolutionTime: this._calculateAvgResolutionTime(cases),
            successRate: this._calculateSuccessRate(cases),
            trendsOverTime: this._calculateTrends(cases, filters.timeRange),
            topCategories: this._getTopCategories(cases),
            performanceMetrics: this._calculatePerformanceMetrics(cases)
        };
    }

    /**
     * Find related cases for a client
     * @param {string} clientId - Client identifier
     * @param {Object} options - Search options
     * @returns {Promise<Array<LegalCase>>}
     */
    async findRelatedCases(clientId, options = {}) {
        const clientCases = await this.caseRepository.findByClientId(clientId);

        if (options.includeFamily) {
            // Find cases with similar patterns
            const familyCases = await this._findSimilarCases(clientCases);
            return [...clientCases, ...familyCases];
        }

        return clientCases;
    }

    /**
     * Get case recommendations based on category and success patterns
     * @param {string} category - Legal category
     * @param {Object} context - Case context
     * @returns {Promise<Object>} Recommendations
     */
    async getCaseRecommendations(category, context = {}) {
        const similarCases = await this.caseRepository.findSimilarCases(category, context);
        const categoryInfo = LegalCategory.getCategoryInfo(category);

        return {
            category: categoryInfo,
            similarCases: similarCases.slice(0, 5), // Top 5 similar cases
            recommendedActions: this._getRecommendedActions(category, context),
            expectedDuration: this._estimateResolutionTime(category, context),
            successProbability: this._estimateSuccessProbability(category, context),
            requiredDocuments: this._getRequiredDocuments(category),
            commonPitfalls: this._getCommonPitfalls(category),
            resources: this._getRelevantResources(category)
        };
    }

    /**
     * Validate case data against business rules
     * @param {Object} caseData
     * @private
     */
    _validateCaseData(caseData) {
        if (!caseData.clientId) {
            throw new Error('Client ID is required');
        }

        if (!caseData.caseType || !LegalCategory.isValid(caseData.caseType)) {
            throw new Error('Valid case type is required');
        }

        if (!caseData.title || caseData.title.trim().length === 0) {
            throw new Error('Case title is required');
        }

        if (caseData.title.length > 200) {
            throw new Error('Case title must be 200 characters or less');
        }

        if (caseData.description && caseData.description.length > 5000) {
            throw new Error('Case description must be 5000 characters or less');
        }
    }

    /**
     * Apply business rules during case creation
     * @param {LegalCase} legalCase
     * @param {Client} client
     * @private
     */
    async _applyCreationBusinessRules(legalCase, client) {
        // Set priority based on category and risk level
        const categoryInfo = LegalCategory.getCategoryInfo(legalCase.caseType);
        const riskLevel = RiskLevel.assessRiskLevel(
            legalCase.caseType,
            legalCase.description || ''
        );

        if (categoryInfo.riskLevel === 'HIGH' || riskLevel === RiskLevel.HIGH) {
            legalCase.priority = 'HIGH';
        } else if (categoryInfo.riskLevel === 'CRITICAL' || riskLevel === RiskLevel.CRITICAL) {
            legalCase.priority = 'CRITICAL';
        }

        // Add case-specific metadata
        legalCase.metadata.creationRules = {
            appliedAt: new Date(),
            categoryRisk: categoryInfo.riskLevel,
            assessedRisk: riskLevel,
            clientConsentVersion: client.gdprFlags.consentHistory?.[0]?.version || '1.0'
        };

        // Auto-assign subcategory if possible
        const subcategory = LegalCategory.getRecommendedSubcategory(
            legalCase.caseType,
            legalCase.description || ''
        );

        if (subcategory) {
            legalCase.metadata.subcategory = subcategory;
        }
    }

    /**
     * Apply status transition business rules
     * @param {LegalCase} legalCase
     * @param {string} newStatus
     * @param {Object} context
     * @private
     */
    async _applyStatusTransitionRules(legalCase, newStatus, context) {
        switch (newStatus) {
            case CaseStatus.ACTIVE:
                if (!context.assignedTo && legalCase.priority === 'CRITICAL') {
                    throw new Error('Critical cases must be assigned when activated');
                }
                break;

            case CaseStatus.RESOLVED:
                if (!context.resolutionNotes) {
                    throw new Error('Resolution notes required');
                }
                if (!context.resolutionType) {
                    throw new Error('Resolution type required (SUCCESSFUL, PARTIAL, REFERRED)');
                }
                break;

            case CaseStatus.ARCHIVED:
                const completedStatuses = CaseStatus.getCompletedStatuses();
                if (!completedStatuses.includes(legalCase.status)) {
                    throw new Error('Only completed cases can be archived');
                }
                break;
        }
    }

    /**
     * Handle post-transition actions
     * @param {LegalCase} legalCase
     * @param {string} newStatus
     * @param {Object} context
     * @private
     */
    async _handlePostTransitionActions(legalCase, newStatus, context) {
        switch (newStatus) {
            case CaseStatus.RESOLVED:
                // Schedule case for archival review
                await this._scheduleArchivalReview(legalCase);
                break;

            case CaseStatus.ARCHIVED:
                // Update client last activity
                const client = await this.clientRepository.findById(legalCase.clientId);
                if (client) {
                    client.removeCase(legalCase.caseId);
                    await this.clientRepository.update(client);
                }
                break;

            case CaseStatus.CANCELLED:
                // Handle cancellation cleanup
                await this._handleCaseCancellation(legalCase, context);
                break;
        }
    }

    /**
     * Check if case is under legal hold
     * @param {LegalCase} legalCase
     * @returns {Promise<boolean>}
     * @private
     */
    async _checkLegalHold(legalCase) {
        // Implementation would check for:
        // - Ongoing litigation
        // - Regulatory investigations
        // - Subpoenas or court orders
        // - Appeals in progress

        // For now, return false (no legal hold)
        return false;
    }

    /**
     * Purge or anonymize case data
     * @param {LegalCase} legalCase
     * @private
     */
    async _purgeOrAnonymizeCase(legalCase) {
        // Anonymize sensitive data while preserving statistical value
        const anonymizedCase = {
            ...legalCase.toObject(),
            clientId: `ANON-${legalCase.caseId.substring(0, 8)}`,
            title: 'Anonymized Case',
            description: 'Case data anonymized per retention policy',
            metadata: {
                ...legalCase.metadata,
                anonymized: true,
                anonymizedAt: new Date(),
                originalCreatedAt: legalCase.createdAt
            }
        };

        await this.caseRepository.anonymize(legalCase.caseId, anonymizedCase);
    }

    /**
     * Calculate status distribution
     * @param {Array<LegalCase>} cases
     * @returns {Object}
     * @private
     */
    _calculateStatusDistribution(cases) {
        const distribution = {};
        CaseStatus.getAllStatuses().forEach(status => {
            distribution[status] = cases.filter(c => c.status === status).length;
        });
        return distribution;
    }

    /**
     * Calculate category distribution
     * @param {Array<LegalCase>} cases
     * @returns {Object}
     * @private
     */
    _calculateCategoryDistribution(cases) {
        const distribution = {};
        LegalCategory.getAllCategories().forEach(category => {
            distribution[category] = cases.filter(c => c.caseType === category).length;
        });
        return distribution;
    }

    /**
     * Calculate risk distribution
     * @param {Array<LegalCase>} cases
     * @returns {Object}
     * @private
     */
    _calculateRiskDistribution(cases) {
        const distribution = {};
        RiskLevel.getAllLevels().forEach(level => {
            distribution[level] = 0;
        });

        cases.forEach(legalCase => {
            const riskLevel = RiskLevel.assessRiskLevel(
                legalCase.caseType,
                legalCase.description || ''
            );
            distribution[riskLevel]++;
        });

        return distribution;
    }

    /**
     * Calculate average resolution time
     * @param {Array<LegalCase>} cases
     * @returns {number}
     * @private
     */
    _calculateAvgResolutionTime(cases) {
        const resolvedCases = cases.filter(c =>
            CaseStatus.getCompletedStatuses().includes(c.status)
        );

        if (resolvedCases.length === 0) return 0;

        const totalDays = resolvedCases.reduce((sum, legalCase) => {
            return sum + legalCase.getAgeInDays();
        }, 0);

        return Math.round(totalDays / resolvedCases.length);
    }

    /**
     * Calculate success rate
     * @param {Array<LegalCase>} cases
     * @returns {number}
     * @private
     */
    _calculateSuccessRate(cases) {
        const completedCases = cases.filter(c =>
            CaseStatus.getCompletedStatuses().includes(c.status)
        );

        if (completedCases.length === 0) return 0;

        const successfulCases = completedCases.filter(legalCase => {
            const resolution = legalCase.metadata.resolution;
            return resolution && ['SUCCESSFUL', 'PARTIAL'].includes(resolution.type);
        });

        return Math.round((successfulCases.length / completedCases.length) * 100);
    }

    /**
     * Get recommended actions for a category
     * @param {string} category
     * @param {Object} context
     * @returns {Array<string>}
     * @private
     */
    _getRecommendedActions(category, context) {
        const categoryInfo = LegalCategory.getCategoryInfo(category);
        return categoryInfo.commonIssues.map(issue => `Address ${issue.toLowerCase()}`);
    }

    /**
     * Estimate resolution time based on category and context
     * @param {string} category
     * @param {Object} context
     * @returns {number} Estimated days
     * @private
     */
    _estimateResolutionTime(category, context) {
        const metrics = LegalCategory.getCategoryMetrics(category);
        let baseDays = metrics.averageResolutionTime;

        // Adjust based on complexity
        if (context.complexity === 'HIGH') baseDays *= 1.5;
        if (context.hasDeadlines) baseDays *= 0.8; // Faster resolution due to urgency

        return Math.round(baseDays);
    }

    /**
     * Estimate success probability
     * @param {string} category
     * @param {Object} context
     * @returns {number} Success probability (0-1)
     * @private
     */
    _estimateSuccessProbability(category, context) {
        const metrics = LegalCategory.getCategoryMetrics(category);
        let baseRate = metrics.successRate;

        // Adjust based on risk level
        if (context.riskLevel === RiskLevel.HIGH) baseRate *= 0.8;
        if (context.riskLevel === RiskLevel.CRITICAL) baseRate *= 0.6;

        return Math.min(baseRate, 0.95); // Cap at 95%
    }
}

module.exports = CaseManagementService;