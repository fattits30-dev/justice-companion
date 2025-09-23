/**
 * RiskLevel Value Object
 *
 * Defines risk assessment levels for legal matters in Justice Companion.
 * Implements risk evaluation criteria and escalation rules.
 *
 * Risk levels determine the urgency and type of disclaimers/warnings shown to users.
 */

class RiskLevel {
    // Risk Level Constants
    static LOW = 'LOW';
    static MEDIUM = 'MEDIUM';
    static HIGH = 'HIGH';
    static CRITICAL = 'CRITICAL';

    /**
     * Get all valid risk levels
     * @returns {Array<string>}
     */
    static getAllLevels() {
        return [this.LOW, this.MEDIUM, this.HIGH, this.CRITICAL];
    }

    /**
     * Check if a risk level is valid
     * @param {string} level
     * @returns {boolean}
     */
    static isValid(level) {
        return this.getAllLevels().includes(level);
    }

    /**
     * Get risk level information
     * @param {string} level
     * @returns {Object}
     */
    static getLevelInfo(level) {
        const levelInfo = {
            [this.LOW]: {
                label: 'Low Risk',
                description: 'Minor legal matter with limited consequences',
                color: 'green',
                icon: 'check-circle',
                priority: 1,
                urgencyScore: 1,
                disclaimerLevel: 'standard',
                recommendedAction: 'self_service',
                maxDelayDays: 90,
                examples: [
                    'General legal information requests',
                    'Form completion assistance',
                    'Procedural questions',
                    'Minor consumer complaints',
                    'Basic landlord-tenant questions'
                ]
            },
            [this.MEDIUM]: {
                label: 'Medium Risk',
                description: 'Moderate legal matter requiring attention',
                color: 'yellow',
                icon: 'alert-triangle',
                priority: 2,
                urgencyScore: 2,
                disclaimerLevel: 'enhanced',
                recommendedAction: 'guided_assistance',
                maxDelayDays: 30,
                examples: [
                    'Employment disputes',
                    'Insurance claim issues',
                    'Contract disagreements',
                    'Benefit application appeals',
                    'Minor debt collection matters'
                ]
            },
            [this.HIGH]: {
                label: 'High Risk',
                description: 'Serious legal matter with significant consequences',
                color: 'orange',
                icon: 'alert-circle',
                priority: 3,
                urgencyScore: 3,
                disclaimerLevel: 'strong',
                recommendedAction: 'attorney_consultation',
                maxDelayDays: 7,
                examples: [
                    'Eviction notices',
                    'Court summons',
                    'Wage garnishment',
                    'Foreclosure proceedings',
                    'Family court matters',
                    'Discrimination claims'
                ]
            },
            [this.CRITICAL]: {
                label: 'Critical Risk',
                description: 'Urgent legal matter requiring immediate attention',
                color: 'red',
                icon: 'alert-octagon',
                priority: 4,
                urgencyScore: 4,
                disclaimerLevel: 'maximum',
                recommendedAction: 'immediate_attorney',
                maxDelayDays: 1,
                examples: [
                    'Criminal charges',
                    'Arrest warrants',
                    'Deportation proceedings',
                    'Emergency custody issues',
                    'Restraining order violations',
                    'Imminent eviction',
                    'Asset seizure notices'
                ]
            }
        };

        return levelInfo[level] || {
            label: 'Unknown Risk',
            description: 'Unable to assess risk level',
            color: 'gray',
            icon: 'help-circle',
            priority: 999,
            urgencyScore: 0,
            disclaimerLevel: 'maximum',
            recommendedAction: 'attorney_consultation',
            maxDelayDays: 7,
            examples: []
        };
    }

    /**
     * Assess risk level based on case content and category
     * @param {string} category - Legal category
     * @param {string} content - Case or query content
     * @param {Object} context - Additional context for assessment
     * @returns {string} Risk level
     */
    static assessRiskLevel(category, content, context = {}) {
        const lowerContent = content.toLowerCase();

        // Critical risk keywords - immediate attention required
        const criticalKeywords = [
            'arrest', 'warrant', 'criminal charges', 'deportation', 'removal proceedings',
            'emergency custody', 'restraining order violation', 'contempt of court',
            'asset seizure', 'levy', 'immediate eviction', 'unlawful detainer served',
            'ICE detention', 'police investigation', 'grand jury', 'felony charges'
        ];

        // High risk keywords - serious legal consequences
        const highRiskKeywords = [
            'eviction notice', 'foreclosure', 'garnishment', 'lawsuit filed',
            'court summons', 'legal deadline', 'statute of limitations',
            'notice to quit', 'wage garnishment', 'bank levy',
            'custody hearing', 'restraining order', 'protection order',
            'discrimination complaint', 'termination', 'firing'
        ];

        // Medium risk keywords - require attention but not urgent
        const mediumRiskKeywords = [
            'dispute', 'claim denied', 'appeal', 'hearing scheduled',
            'contract violation', 'breach', 'unpaid wages', 'overtime',
            'insurance claim', 'benefits cut', 'disability denial',
            'harassment', 'workplace issue', 'tenant rights'
        ];

        // Check for critical risk indicators
        if (this._containsKeywords(lowerContent, criticalKeywords)) {
            return this.CRITICAL;
        }

        // Check for high risk indicators
        if (this._containsKeywords(lowerContent, highRiskKeywords)) {
            return this.HIGH;
        }

        // Category-based risk assessment
        const categoryRisk = this._getCategoryBaseRisk(category);

        // Check for medium risk indicators
        if (this._containsKeywords(lowerContent, mediumRiskKeywords)) {
            return this._elevateRiskLevel(categoryRisk);
        }

        // Time-sensitive indicators
        if (this._hasTimeSensitiveLanguage(lowerContent)) {
            return this._elevateRiskLevel(categoryRisk);
        }

        // Context-based risk elevation
        if (context.hasDeadline && context.daysUntilDeadline <= 7) {
            return this._elevateRiskLevel(categoryRisk);
        }

        if (context.priorLegalAction) {
            return this._elevateRiskLevel(categoryRisk);
        }

        return categoryRisk;
    }

    /**
     * Get base risk level for legal category
     * @param {string} category
     * @returns {string}
     */
    static _getCategoryBaseRisk(category) {
        const LegalCategory = require('./LegalCategory');

        const categoryRisks = {
            [LegalCategory.CRIMINAL]: this.CRITICAL,
            [LegalCategory.IMMIGRATION]: this.CRITICAL,
            [LegalCategory.HOUSING]: this.HIGH,
            [LegalCategory.FAMILY]: this.HIGH,
            [LegalCategory.DEBT]: this.HIGH,
            [LegalCategory.EMPLOYMENT]: this.MEDIUM,
            [LegalCategory.BENEFITS]: this.MEDIUM,
            [LegalCategory.INSURANCE]: this.MEDIUM,
            [LegalCategory.HEALTHCARE]: this.MEDIUM,
            [LegalCategory.DISABILITY]: this.MEDIUM,
            [LegalCategory.CONSUMER]: this.LOW,
            [LegalCategory.COUNCIL]: this.LOW
        };

        return categoryRisks[category] || this.MEDIUM;
    }

    /**
     * Check if content contains any of the specified keywords
     * @param {string} content
     * @param {Array<string>} keywords
     * @returns {boolean}
     * @private
     */
    static _containsKeywords(content, keywords) {
        return keywords.some(keyword => content.includes(keyword));
    }

    /**
     * Check for time-sensitive language
     * @param {string} content
     * @returns {boolean}
     * @private
     */
    static _hasTimeSensitiveLanguage(content) {
        const timeKeywords = [
            'deadline', 'due date', 'expires', 'time limit', 'urgently',
            'asap', 'immediately', 'right away', 'tomorrow', 'today',
            'statute of limitations', 'time running out', 'final notice'
        ];

        return this._containsKeywords(content, timeKeywords);
    }

    /**
     * Elevate risk level by one step
     * @param {string} currentLevel
     * @returns {string}
     * @private
     */
    static _elevateRiskLevel(currentLevel) {
        const elevation = {
            [this.LOW]: this.MEDIUM,
            [this.MEDIUM]: this.HIGH,
            [this.HIGH]: this.CRITICAL,
            [this.CRITICAL]: this.CRITICAL // Already at max
        };

        return elevation[currentLevel] || this.MEDIUM;
    }

    /**
     * Get risk-appropriate disclaimers
     * @param {string} level
     * @returns {Array<Object>}
     */
    static getDisclaimers(level) {
        const disclaimers = {
            [this.LOW]: [
                {
                    type: 'STANDARD',
                    text: 'This is legal information, not legal advice.',
                    priority: 1
                }
            ],
            [this.MEDIUM]: [
                {
                    type: 'ENHANCED',
                    text: 'This is legal information, not legal advice. Consider consulting with an attorney for your specific situation.',
                    priority: 1
                },
                {
                    type: 'TIME_SENSITIVE',
                    text: 'Some legal matters have strict deadlines. Verify all time limits and requirements.',
                    priority: 2
                }
            ],
            [this.HIGH]: [
                {
                    type: 'STRONG_WARNING',
                    text: 'WARNING: This matter may have serious legal consequences. Consultation with a qualified attorney is strongly recommended.',
                    priority: 1
                },
                {
                    type: 'DEADLINE_WARNING',
                    text: 'Legal deadlines are strict and missing them can result in loss of rights. Verify all dates immediately.',
                    priority: 2
                }
            ],
            [this.CRITICAL]: [
                {
                    type: 'URGENT_WARNING',
                    text: 'URGENT: This matter requires immediate legal attention. Contact an attorney or legal aid organization immediately.',
                    priority: 1
                },
                {
                    type: 'CONSEQUENCES_WARNING',
                    text: 'Delays in addressing this matter may result in serious legal consequences including loss of rights, property, or freedom.',
                    priority: 2
                },
                {
                    type: 'EMERGENCY_RESOURCES',
                    text: 'If this is an emergency, contact local emergency services. For immediate legal help, contact your local legal aid society or bar association.',
                    priority: 3
                }
            ]
        };

        return disclaimers[level] || disclaimers[this.MEDIUM];
    }

    /**
     * Get recommended actions based on risk level
     * @param {string} level
     * @returns {Array<Object>}
     */
    static getRecommendedActions(level) {
        const actions = {
            [this.LOW]: [
                {
                    action: 'review_information',
                    label: 'Review provided information',
                    priority: 'medium'
                },
                {
                    action: 'research_further',
                    label: 'Research additional resources',
                    priority: 'low'
                }
            ],
            [this.MEDIUM]: [
                {
                    action: 'gather_documents',
                    label: 'Gather relevant documents',
                    priority: 'high'
                },
                {
                    action: 'consider_consultation',
                    label: 'Consider attorney consultation',
                    priority: 'medium'
                },
                {
                    action: 'verify_deadlines',
                    label: 'Verify important deadlines',
                    priority: 'high'
                }
            ],
            [this.HIGH]: [
                {
                    action: 'consult_attorney',
                    label: 'Consult with attorney',
                    priority: 'urgent'
                },
                {
                    action: 'preserve_evidence',
                    label: 'Preserve all evidence',
                    priority: 'urgent'
                },
                {
                    action: 'document_everything',
                    label: 'Document all communications',
                    priority: 'high'
                },
                {
                    action: 'check_deadlines',
                    label: 'Check all legal deadlines',
                    priority: 'urgent'
                }
            ],
            [this.CRITICAL]: [
                {
                    action: 'emergency_attorney',
                    label: 'Contact attorney immediately',
                    priority: 'emergency'
                },
                {
                    action: 'legal_aid',
                    label: 'Contact legal aid services',
                    priority: 'emergency'
                },
                {
                    action: 'preserve_rights',
                    label: 'Take immediate steps to preserve rights',
                    priority: 'emergency'
                },
                {
                    action: 'emergency_services',
                    label: 'Contact emergency services if needed',
                    priority: 'emergency'
                }
            ]
        };

        return actions[level] || actions[this.MEDIUM];
    }

    /**
     * Get escalation threshold for automated alerts
     * @param {string} level
     * @returns {number} Hours until escalation
     */
    static getEscalationThreshold(level) {
        const thresholds = {
            [this.LOW]: 168,    // 7 days
            [this.MEDIUM]: 72,  // 3 days
            [this.HIGH]: 24,    // 1 day
            [this.CRITICAL]: 4  // 4 hours
        };

        return thresholds[level] || 72;
    }

    /**
     * Determine if risk level requires human review
     * @param {string} level
     * @returns {boolean}
     */
    static requiresHumanReview(level) {
        return [this.HIGH, this.CRITICAL].includes(level);
    }

    /**
     * Get risk score for prioritization (1-10)
     * @param {string} level
     * @returns {number}
     */
    static getRiskScore(level) {
        const scores = {
            [this.LOW]: 2,
            [this.MEDIUM]: 5,
            [this.HIGH]: 8,
            [this.CRITICAL]: 10
        };

        return scores[level] || 5;
    }

    /**
     * Compare risk levels
     * @param {string} level1
     * @param {string} level2
     * @returns {number} -1 if level1 < level2, 0 if equal, 1 if level1 > level2
     */
    static compare(level1, level2) {
        const score1 = this.getRiskScore(level1);
        const score2 = this.getRiskScore(level2);

        if (score1 < score2) return -1;
        if (score1 > score2) return 1;
        return 0;
    }

    /**
     * Get maximum risk level from array
     * @param {Array<string>} levels
     * @returns {string}
     */
    static getMaxRiskLevel(levels) {
        if (!levels || levels.length === 0) return this.LOW;

        return levels.reduce((max, current) => {
            return this.compare(current, max) > 0 ? current : max;
        }, this.LOW);
    }
}

module.exports = RiskLevel;