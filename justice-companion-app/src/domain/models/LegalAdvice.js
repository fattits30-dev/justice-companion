/**
 * LegalAdvice Domain Entity
 *
 * Manages legal guidance and information provided by Justice Companion.
 * Implements risk assessment and disclaimer requirements for legal compliance.
 *
 * Domain Rules:
 * - All advice must include appropriate disclaimers
 * - Risk levels must be assessed and communicated
 * - No actual legal advice - only legal information and guidance
 * - Audit trail maintained for all advice given
 */

const { v4: uuidv4 } = require('uuid');
const LegalCategory = require('../valueObjects/LegalCategory');
const RiskLevel = require('../valueObjects/RiskLevel');

class LegalAdvice {
    constructor(props) {
        this.adviceId = props.adviceId || uuidv4();
        this.caseId = props.caseId;
        this.category = props.category;
        this.subcategory = props.subcategory || null;
        this.content = props.content;
        this.riskLevel = props.riskLevel || RiskLevel.MEDIUM;
        this.disclaimers = props.disclaimers || [];
        this.sources = props.sources || [];
        this.timestamp = props.timestamp || new Date();
        this.aiModelUsed = props.aiModelUsed || null;
        this.userQuery = props.userQuery || '';
        this.confidence = props.confidence || 0.8;
        this.reviewStatus = props.reviewStatus || 'UNREVIEWED';
        this.metadata = props.metadata || {};

        // Automatically add required disclaimers
        this._addRequiredDisclaimers();

        // Validate invariants
        this._validateInvariants();
    }

    /**
     * Update risk level and adjust disclaimers accordingly
     * @param {string} newRiskLevel - Risk level from RiskLevel enum
     * @param {string} reason - Reason for risk level change
     */
    updateRiskLevel(newRiskLevel, reason = '') {
        if (!RiskLevel.isValid(newRiskLevel)) {
            throw new Error(`Invalid risk level: ${newRiskLevel}`);
        }

        const previousRiskLevel = this.riskLevel;
        this.riskLevel = newRiskLevel;

        // Add risk-specific disclaimers
        this._addRiskSpecificDisclaimers(newRiskLevel);

        // Log risk assessment change
        this._logRiskAssessmentChange(previousRiskLevel, newRiskLevel, reason);
    }

    /**
     * Add source reference to advice
     * @param {Object} source - Source information (url, title, type, reliability)
     */
    addSource(source) {
        if (!source.title || !source.type) {
            throw new Error('Source must have title and type');
        }

        this.sources.push({
            ...source,
            addedAt: new Date(),
            verified: source.verified || false
        });
    }

    /**
     * Mark advice as reviewed by human expert
     * @param {string} reviewerId - ID of reviewing expert
     * @param {string} status - Review status (APPROVED, NEEDS_REVISION, REJECTED)
     * @param {string} notes - Review notes
     */
    markAsReviewed(reviewerId, status, notes = '') {
        const validStatuses = ['APPROVED', 'NEEDS_REVISION', 'REJECTED'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid review status: ${status}`);
        }

        this.reviewStatus = status;
        this.metadata.review = {
            reviewerId: reviewerId,
            status: status,
            notes: notes,
            reviewedAt: new Date()
        };

        // Add additional disclaimers for unreviewed content
        if (status !== 'APPROVED') {
            this._addUnreviewedContentDisclaimer();
        }
    }

    /**
     * Check if advice requires urgent attention
     * @returns {boolean}
     */
    requiresUrgentAttention() {
        const highRiskCategories = [RiskLevel.HIGH, RiskLevel.CRITICAL];
        const urgentKeywords = [
            'eviction', 'foreclosure', 'arrest', 'warrant', 'custody',
            'emergency', 'urgent', 'immediate', 'deadline'
        ];

        const hasHighRisk = highRiskCategories.includes(this.riskLevel);
        const hasUrgentKeywords = urgentKeywords.some(keyword =>
            this.content.toLowerCase().includes(keyword) ||
            this.userQuery.toLowerCase().includes(keyword)
        );

        return hasHighRisk || hasUrgentKeywords;
    }

    /**
     * Get formatted advice with all disclaimers
     * @returns {Object} - Formatted advice content
     */
    getFormattedAdvice() {
        const disclaimerText = this.disclaimers
            .map(disclaimer => disclaimer.text)
            .join('\n\n');

        return {
            content: this.content,
            disclaimers: disclaimerText,
            riskLevel: this.riskLevel,
            category: this.category,
            sources: this.sources.filter(source => source.verified),
            generatedAt: this.timestamp,
            requiresUrgentAttention: this.requiresUrgentAttention()
        };
    }

    /**
     * Check if advice is stale and needs updating
     * @returns {boolean}
     */
    isStale() {
        const stalePeriodDays = this._getStalePeriodForCategory();
        const daysSinceCreated = this._getDaysSinceDate(this.timestamp);

        return daysSinceCreated > stalePeriodDays;
    }

    /**
     * Add required disclaimers based on domain rules
     * @private
     */
    _addRequiredDisclaimers() {
        // General legal information disclaimer
        this.disclaimers.push({
            type: 'GENERAL_LEGAL',
            text: 'This is legal information, not legal advice. The information provided is for educational purposes only and should not be construed as legal advice. For specific legal advice, please consult with a qualified attorney.',
            priority: 1,
            addedAt: new Date()
        });

        // AI-generated content disclaimer
        if (this.aiModelUsed) {
            this.disclaimers.push({
                type: 'AI_GENERATED',
                text: 'This guidance was generated using artificial intelligence and should be verified with authoritative legal sources. AI responses may contain errors or outdated information.',
                priority: 2,
                addedAt: new Date()
            });
        }

        // Category-specific disclaimers
        this._addCategorySpecificDisclaimers();
    }

    /**
     * Add category-specific disclaimers
     * @private
     */
    _addCategorySpecificDisclaimers() {
        const categoryDisclaimers = {
            [LegalCategory.HOUSING]: {
                type: 'HOUSING_SPECIFIC',
                text: 'Housing laws vary significantly by location. Tenant rights and landlord obligations differ between jurisdictions. Always verify local housing regulations.',
                priority: 3
            },
            [LegalCategory.EMPLOYMENT]: {
                type: 'EMPLOYMENT_SPECIFIC',
                text: 'Employment laws are complex and vary by state and federal jurisdiction. Consult with an employment attorney for workplace-specific issues.',
                priority: 3
            },
            [LegalCategory.COUNCIL]: {
                type: 'COUNCIL_SPECIFIC',
                text: 'Local council regulations and procedures vary significantly. Contact your local council directly for current policies and procedures.',
                priority: 3
            }
        };

        const categoryDisclaimer = categoryDisclaimers[this.category];
        if (categoryDisclaimer) {
            this.disclaimers.push({
                ...categoryDisclaimer,
                addedAt: new Date()
            });
        }
    }

    /**
     * Add risk-specific disclaimers
     * @private
     */
    _addRiskSpecificDisclaimers(riskLevel) {
        switch (riskLevel) {
            case RiskLevel.HIGH:
                this.disclaimers.push({
                    type: 'HIGH_RISK',
                    text: 'WARNING: This matter may have significant legal consequences. Immediate consultation with a qualified attorney is strongly recommended.',
                    priority: 1,
                    addedAt: new Date()
                });
                break;
            case RiskLevel.CRITICAL:
                this.disclaimers.push({
                    type: 'CRITICAL_RISK',
                    text: 'URGENT: This matter requires immediate legal attention. Contact an attorney or legal aid organization immediately. Delays may result in serious legal consequences.',
                    priority: 1,
                    addedAt: new Date()
                });
                break;
        }
    }

    /**
     * Add disclaimer for unreviewed content
     * @private
     */
    _addUnreviewedContentDisclaimer() {
        this.disclaimers.push({
            type: 'UNREVIEWED',
            text: 'This information has not been reviewed by a legal professional. Use with additional caution and seek verification from authoritative sources.',
            priority: 2,
            addedAt: new Date()
        });
    }

    /**
     * Log risk assessment changes for audit trail
     * @private
     */
    _logRiskAssessmentChange(previousLevel, newLevel, reason) {
        if (!this.metadata.riskAssessmentHistory) {
            this.metadata.riskAssessmentHistory = [];
        }

        this.metadata.riskAssessmentHistory.push({
            from: previousLevel,
            to: newLevel,
            reason: reason,
            timestamp: new Date()
        });
    }

    /**
     * Get stale period for specific category
     * @private
     */
    _getStalePeriodForCategory() {
        const stalePeriods = {
            [LegalCategory.HOUSING]: 90,      // 3 months
            [LegalCategory.EMPLOYMENT]: 180,  // 6 months
            [LegalCategory.CONSUMER]: 120,    // 4 months
            [LegalCategory.COUNCIL]: 60,      // 2 months
            [LegalCategory.INSURANCE]: 365,   // 1 year
            [LegalCategory.DEBT]: 90,         // 3 months
            [LegalCategory.BENEFITS]: 180     // 6 months
        };

        return stalePeriods[this.category] || 180; // Default 6 months
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
     * Validate domain invariants
     * @private
     */
    _validateInvariants() {
        if (!this.content || this.content.trim().length === 0) {
            throw new Error('Legal advice must have content');
        }

        if (!LegalCategory.isValid(this.category)) {
            throw new Error(`Invalid legal category: ${this.category}`);
        }

        if (!RiskLevel.isValid(this.riskLevel)) {
            throw new Error(`Invalid risk level: ${this.riskLevel}`);
        }

        if (this.disclaimers.length === 0) {
            throw new Error('Legal advice must include disclaimers');
        }
    }

    /**
     * Convert to plain object for persistence
     */
    toObject() {
        return {
            adviceId: this.adviceId,
            caseId: this.caseId,
            category: this.category,
            subcategory: this.subcategory,
            content: this.content,
            riskLevel: this.riskLevel,
            disclaimers: this.disclaimers,
            sources: this.sources,
            timestamp: this.timestamp,
            aiModelUsed: this.aiModelUsed,
            userQuery: this.userQuery,
            confidence: this.confidence,
            reviewStatus: this.reviewStatus,
            metadata: this.metadata
        };
    }

    /**
     * Create instance from persisted data
     */
    static fromObject(data) {
        return new LegalAdvice(data);
    }
}

module.exports = LegalAdvice;