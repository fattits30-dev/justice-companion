/**
 * LegalCategory Value Object
 *
 * Defines legal practice areas and case types supported by Justice Companion.
 * Implements categorization rules and category-specific business logic.
 *
 * Categories based on common legal aid areas for self-represented individuals.
 */

class LegalCategory {
    // Primary Legal Categories
    static HOUSING = 'HOUSING';
    static EMPLOYMENT = 'EMPLOYMENT';
    static CONSUMER = 'CONSUMER';
    static COUNCIL = 'COUNCIL';
    static INSURANCE = 'INSURANCE';
    static DEBT = 'DEBT';
    static BENEFITS = 'BENEFITS';
    static FAMILY = 'FAMILY';
    static IMMIGRATION = 'IMMIGRATION';
    static CRIMINAL = 'CRIMINAL';
    static DISABILITY = 'DISABILITY';
    static HEALTHCARE = 'HEALTHCARE';

    /**
     * Get all valid legal categories
     * @returns {Array<string>}
     */
    static getAllCategories() {
        return [
            this.HOUSING,
            this.EMPLOYMENT,
            this.CONSUMER,
            this.COUNCIL,
            this.INSURANCE,
            this.DEBT,
            this.BENEFITS,
            this.FAMILY,
            this.IMMIGRATION,
            this.CRIMINAL,
            this.DISABILITY,
            this.HEALTHCARE
        ];
    }

    /**
     * Check if a category is valid
     * @param {string} category
     * @returns {boolean}
     */
    static isValid(category) {
        return this.getAllCategories().includes(category);
    }

    /**
     * Get category information including subcategories
     * @param {string} category
     * @returns {Object}
     */
    static getCategoryInfo(category) {
        const categoryInfo = {
            [this.HOUSING]: {
                label: 'Housing & Tenancy',
                description: 'Landlord-tenant disputes, evictions, housing rights',
                icon: 'home',
                color: 'blue',
                priority: 1,
                riskLevel: 'HIGH',
                subcategories: [
                    'EVICTION_NOTICE',
                    'RENT_DISPUTE',
                    'PROPERTY_MAINTENANCE',
                    'LEASE_AGREEMENT',
                    'DEPOSIT_DISPUTE',
                    'HARASSMENT',
                    'DISCRIMINATION',
                    'HABITABILITY'
                ],
                urgentKeywords: ['eviction', 'notice to quit', 'unlawful detainer', 'foreclosure'],
                commonIssues: [
                    'Eviction proceedings',
                    'Rent increases',
                    'Security deposit disputes',
                    'Habitability issues',
                    'Lease violations'
                ]
            },
            [this.EMPLOYMENT]: {
                label: 'Employment & Workplace',
                description: 'Workplace rights, discrimination, wage disputes',
                icon: 'briefcase',
                color: 'green',
                priority: 2,
                riskLevel: 'MEDIUM',
                subcategories: [
                    'WRONGFUL_TERMINATION',
                    'WAGE_THEFT',
                    'DISCRIMINATION',
                    'HARASSMENT',
                    'WORKERS_COMPENSATION',
                    'UNEMPLOYMENT_BENEFITS',
                    'WORKPLACE_SAFETY',
                    'OVERTIME_DISPUTES'
                ],
                urgentKeywords: ['termination', 'firing', 'wage theft', 'harassment'],
                commonIssues: [
                    'Unpaid wages',
                    'Wrongful termination',
                    'Workplace discrimination',
                    'Harassment claims',
                    'Benefits disputes'
                ]
            },
            [this.CONSUMER]: {
                label: 'Consumer Protection',
                description: 'Consumer rights, fraud, defective products',
                icon: 'shield',
                color: 'orange',
                priority: 3,
                riskLevel: 'MEDIUM',
                subcategories: [
                    'FRAUD',
                    'DEFECTIVE_PRODUCTS',
                    'WARRANTY_ISSUES',
                    'BILLING_DISPUTES',
                    'IDENTITY_THEFT',
                    'SCAMS',
                    'UNFAIR_PRACTICES',
                    'RETURN_POLICY'
                ],
                urgentKeywords: ['fraud', 'scam', 'identity theft', 'unauthorized charges'],
                commonIssues: [
                    'Product defects',
                    'Service disputes',
                    'Billing errors',
                    'Warranty claims',
                    'Return issues'
                ]
            },
            [this.COUNCIL]: {
                label: 'Local Government & Council',
                description: 'Local government services, permits, compliance',
                icon: 'building',
                color: 'purple',
                priority: 4,
                riskLevel: 'LOW',
                subcategories: [
                    'PERMITS',
                    'ZONING',
                    'CODE_VIOLATIONS',
                    'PROPERTY_TAXES',
                    'PUBLIC_SERVICES',
                    'LICENSING',
                    'PLANNING_APPLICATIONS',
                    'COUNCIL_DECISIONS'
                ],
                urgentKeywords: ['violation notice', 'compliance order', 'permit denial'],
                commonIssues: [
                    'Permit applications',
                    'Code violations',
                    'Property assessments',
                    'Service complaints',
                    'Council appeals'
                ]
            },
            [this.INSURANCE]: {
                label: 'Insurance Claims',
                description: 'Insurance disputes, claim denials, coverage issues',
                icon: 'umbrella',
                color: 'teal',
                priority: 5,
                riskLevel: 'MEDIUM',
                subcategories: [
                    'CLAIM_DENIAL',
                    'COVERAGE_DISPUTE',
                    'PREMIUM_ISSUES',
                    'BAD_FAITH',
                    'AUTO_INSURANCE',
                    'HEALTH_INSURANCE',
                    'PROPERTY_INSURANCE',
                    'LIFE_INSURANCE'
                ],
                urgentKeywords: ['claim denied', 'coverage cancelled', 'bad faith'],
                commonIssues: [
                    'Claim denials',
                    'Coverage disputes',
                    'Premium increases',
                    'Policy cancellations',
                    'Bad faith practices'
                ]
            },
            [this.DEBT]: {
                label: 'Debt & Collections',
                description: 'Debt collection, bankruptcy, financial disputes',
                icon: 'credit-card',
                color: 'red',
                priority: 6,
                riskLevel: 'HIGH',
                subcategories: [
                    'DEBT_COLLECTION',
                    'BANKRUPTCY',
                    'GARNISHMENT',
                    'CREDIT_REPORT',
                    'STUDENT_LOANS',
                    'MORTGAGE',
                    'CREDIT_CARD_DEBT',
                    'MEDICAL_DEBT'
                ],
                urgentKeywords: ['garnishment', 'bankruptcy', 'foreclosure', 'collection lawsuit'],
                commonIssues: [
                    'Debt collection harassment',
                    'Credit report errors',
                    'Garnishment notices',
                    'Bankruptcy options',
                    'Loan modifications'
                ]
            },
            [this.BENEFITS]: {
                label: 'Government Benefits',
                description: 'Social services, disability, unemployment benefits',
                icon: 'heart',
                color: 'pink',
                priority: 7,
                riskLevel: 'MEDIUM',
                subcategories: [
                    'DISABILITY_BENEFITS',
                    'UNEMPLOYMENT',
                    'FOOD_ASSISTANCE',
                    'HOUSING_ASSISTANCE',
                    'MEDICARE_MEDICAID',
                    'SOCIAL_SECURITY',
                    'VETERANS_BENEFITS',
                    'APPEALS'
                ],
                urgentKeywords: ['benefits cut', 'appeal deadline', 'hearing notice'],
                commonIssues: [
                    'Benefit denials',
                    'Appeal processes',
                    'Eligibility disputes',
                    'Benefit reductions',
                    'Application assistance'
                ]
            },
            [this.FAMILY]: {
                label: 'Family Law',
                description: 'Divorce, custody, domestic relations',
                icon: 'users',
                color: 'yellow',
                priority: 8,
                riskLevel: 'HIGH',
                subcategories: [
                    'DIVORCE',
                    'CHILD_CUSTODY',
                    'CHILD_SUPPORT',
                    'SPOUSAL_SUPPORT',
                    'DOMESTIC_VIOLENCE',
                    'ADOPTION',
                    'GUARDIANSHIP',
                    'RESTRAINING_ORDERS'
                ],
                urgentKeywords: ['domestic violence', 'restraining order', 'emergency custody'],
                commonIssues: [
                    'Custody disputes',
                    'Support modifications',
                    'Domestic violence',
                    'Divorce proceedings',
                    'Visitation rights'
                ]
            },
            [this.IMMIGRATION]: {
                label: 'Immigration',
                description: 'Immigration status, deportation, citizenship',
                icon: 'globe',
                color: 'indigo',
                priority: 9,
                riskLevel: 'CRITICAL',
                subcategories: [
                    'DEPORTATION',
                    'ASYLUM',
                    'CITIZENSHIP',
                    'VISA_ISSUES',
                    'GREEN_CARD',
                    'FAMILY_REUNIFICATION',
                    'WORK_AUTHORIZATION',
                    'APPEALS'
                ],
                urgentKeywords: ['deportation', 'removal proceedings', 'ICE', 'detention'],
                commonIssues: [
                    'Deportation proceedings',
                    'Status adjustments',
                    'Family petitions',
                    'Asylum claims',
                    'Citizenship applications'
                ]
            },
            [this.CRIMINAL]: {
                label: 'Criminal Defense',
                description: 'Criminal charges, court proceedings, rights',
                icon: 'scale',
                color: 'gray',
                priority: 10,
                riskLevel: 'CRITICAL',
                subcategories: [
                    'MISDEMEANOR',
                    'FELONY',
                    'TRAFFIC_VIOLATIONS',
                    'WARRANTS',
                    'APPEALS',
                    'EXPUNGEMENT',
                    'PROBATION',
                    'SENTENCING'
                ],
                urgentKeywords: ['arrest', 'warrant', 'court date', 'charges'],
                commonIssues: [
                    'Criminal charges',
                    'Court appearances',
                    'Plea negotiations',
                    'Sentencing issues',
                    'Record expungement'
                ]
            },
            [this.DISABILITY]: {
                label: 'Disability Rights',
                description: 'ADA compliance, disability benefits, accommodations',
                icon: 'accessibility',
                color: 'cyan',
                priority: 11,
                riskLevel: 'MEDIUM',
                subcategories: [
                    'ADA_COMPLIANCE',
                    'ACCOMMODATIONS',
                    'DISCRIMINATION',
                    'ACCESSIBILITY',
                    'DISABILITY_BENEFITS',
                    'WORKPLACE_RIGHTS',
                    'EDUCATION_RIGHTS',
                    'HOUSING_RIGHTS'
                ],
                urgentKeywords: ['discrimination', 'accommodation denial', 'accessibility'],
                commonIssues: [
                    'Accommodation requests',
                    'Disability discrimination',
                    'Accessibility barriers',
                    'Benefit appeals',
                    'Rights violations'
                ]
            },
            [this.HEALTHCARE]: {
                label: 'Healthcare Rights',
                description: 'Medical bills, healthcare access, patient rights',
                icon: 'heart-pulse',
                color: 'emerald',
                priority: 12,
                riskLevel: 'MEDIUM',
                subcategories: [
                    'MEDICAL_BILLS',
                    'INSURANCE_COVERAGE',
                    'PATIENT_RIGHTS',
                    'MEDICAL_MALPRACTICE',
                    'HEALTHCARE_ACCESS',
                    'PRESCRIPTION_COVERAGE',
                    'HOSPITAL_BILLING',
                    'MEDICARE_ISSUES'
                ],
                urgentKeywords: ['medical emergency', 'treatment denial', 'billing dispute'],
                commonIssues: [
                    'Medical billing errors',
                    'Insurance denials',
                    'Treatment access',
                    'Patient rights',
                    'Prescription coverage'
                ]
            }
        };

        return categoryInfo[category] || {
            label: 'Other',
            description: 'Other legal matters',
            icon: 'help-circle',
            color: 'gray',
            priority: 999,
            riskLevel: 'MEDIUM',
            subcategories: [],
            urgentKeywords: [],
            commonIssues: []
        };
    }

    /**
     * Get categories by risk level
     * @param {string} riskLevel
     * @returns {Array<string>}
     */
    static getCategoriesByRiskLevel(riskLevel) {
        return this.getAllCategories().filter(category => {
            const info = this.getCategoryInfo(category);
            return info.riskLevel === riskLevel;
        });
    }

    /**
     * Get high-priority categories requiring immediate attention
     * @returns {Array<string>}
     */
    static getHighPriorityCategories() {
        return [this.HOUSING, this.CRIMINAL, this.IMMIGRATION, this.FAMILY, this.DEBT];
    }

    /**
     * Check if category requires urgent attention based on keywords
     * @param {string} category
     * @param {string} text
     * @returns {boolean}
     */
    static requiresUrgentAttention(category, text) {
        const categoryInfo = this.getCategoryInfo(category);
        const lowerText = text.toLowerCase();

        return categoryInfo.urgentKeywords.some(keyword =>
            lowerText.includes(keyword.toLowerCase())
        );
    }

    /**
     * Get recommended subcategory based on text analysis
     * @param {string} category
     * @param {string} text
     * @returns {string|null}
     */
    static getRecommendedSubcategory(category, text) {
        const categoryInfo = this.getCategoryInfo(category);
        const lowerText = text.toLowerCase();

        // Simple keyword matching for subcategory recommendation
        const subcategoryKeywords = {
            EVICTION_NOTICE: ['eviction', 'notice to quit', 'unlawful detainer'],
            RENT_DISPUTE: ['rent', 'rental', 'payment'],
            WAGE_THEFT: ['unpaid', 'wages', 'overtime', 'payroll'],
            DISCRIMINATION: ['discrimination', 'harassment', 'bias'],
            FRAUD: ['fraud', 'scam', 'deception'],
            CLAIM_DENIAL: ['denied', 'rejection', 'claim'],
            DEBT_COLLECTION: ['collection', 'collector', 'debt'],
            DOMESTIC_VIOLENCE: ['violence', 'abuse', 'restraining'],
            DEPORTATION: ['deportation', 'removal', 'ICE']
        };

        for (const [subcategory, keywords] of Object.entries(subcategoryKeywords)) {
            if (categoryInfo.subcategories.includes(subcategory)) {
                if (keywords.some(keyword => lowerText.includes(keyword))) {
                    return subcategory;
                }
            }
        }

        return null;
    }

    /**
     * Get category hierarchy for navigation
     * @returns {Object}
     */
    static getCategoryHierarchy() {
        return {
            'Essential Legal Areas': [
                this.HOUSING,
                this.EMPLOYMENT,
                this.DEBT,
                this.FAMILY
            ],
            'Government & Benefits': [
                this.BENEFITS,
                this.COUNCIL,
                this.IMMIGRATION
            ],
            'Consumer & Financial': [
                this.CONSUMER,
                this.INSURANCE,
                this.HEALTHCARE
            ],
            'Special Circumstances': [
                this.CRIMINAL,
                this.DISABILITY
            ]
        };
    }

    /**
     * Get related categories
     * @param {string} category
     * @returns {Array<string>}
     */
    static getRelatedCategories(category) {
        const relationships = {
            [this.HOUSING]: [this.DEBT, this.CONSUMER, this.BENEFITS],
            [this.EMPLOYMENT]: [this.DEBT, this.BENEFITS, this.DISABILITY],
            [this.DEBT]: [this.HOUSING, this.CONSUMER, this.BENEFITS],
            [this.FAMILY]: [this.CRIMINAL, this.BENEFITS, this.HOUSING],
            [this.IMMIGRATION]: [this.CRIMINAL, this.EMPLOYMENT, this.FAMILY],
            [this.BENEFITS]: [this.DISABILITY, this.HEALTHCARE, this.HOUSING],
            [this.HEALTHCARE]: [this.INSURANCE, this.DISABILITY, this.BENEFITS],
            [this.DISABILITY]: [this.EMPLOYMENT, this.BENEFITS, this.HEALTHCARE]
        };

        return relationships[category] || [];
    }

    /**
     * Get category statistics and metrics
     * @param {string} category
     * @returns {Object}
     */
    static getCategoryMetrics(category) {
        const info = this.getCategoryInfo(category);

        return {
            complexity: this._getCategoryComplexity(category),
            averageResolutionTime: this._getAverageResolutionTime(category),
            successRate: this._getSuccessRate(category),
            requiresAttorney: this._requiresAttorneyAdvice(category),
            selfRepresentationViability: this._getSelfRepViability(category)
        };
    }

    /**
     * Get category complexity score (1-10)
     * @private
     */
    static _getCategoryComplexity(category) {
        const complexityScores = {
            [this.COUNCIL]: 3,
            [this.CONSUMER]: 4,
            [this.BENEFITS]: 5,
            [this.INSURANCE]: 5,
            [this.HEALTHCARE]: 6,
            [this.EMPLOYMENT]: 6,
            [this.DEBT]: 7,
            [this.HOUSING]: 7,
            [this.DISABILITY]: 8,
            [this.FAMILY]: 8,
            [this.IMMIGRATION]: 9,
            [this.CRIMINAL]: 10
        };

        return complexityScores[category] || 5;
    }

    /**
     * Get average resolution time in days
     * @private
     */
    static _getAverageResolutionTime(category) {
        const resolutionTimes = {
            [this.COUNCIL]: 30,
            [this.CONSUMER]: 45,
            [this.INSURANCE]: 60,
            [this.EMPLOYMENT]: 90,
            [this.HEALTHCARE]: 90,
            [this.BENEFITS]: 120,
            [this.DEBT]: 180,
            [this.HOUSING]: 180,
            [this.DISABILITY]: 365,
            [this.FAMILY]: 365,
            [this.IMMIGRATION]: 730,
            [this.CRIMINAL]: 365
        };

        return resolutionTimes[category] || 120;
    }

    /**
     * Get success rate for self-representation
     * @private
     */
    static _getSuccessRate(category) {
        const successRates = {
            [this.COUNCIL]: 0.85,
            [this.CONSUMER]: 0.75,
            [this.BENEFITS]: 0.70,
            [this.INSURANCE]: 0.65,
            [this.EMPLOYMENT]: 0.60,
            [this.HEALTHCARE]: 0.60,
            [this.DEBT]: 0.55,
            [this.HOUSING]: 0.50,
            [this.DISABILITY]: 0.45,
            [this.FAMILY]: 0.40,
            [this.IMMIGRATION]: 0.30,
            [this.CRIMINAL]: 0.25
        };

        return successRates[category] || 0.50;
    }

    /**
     * Check if category typically requires attorney advice
     * @private
     */
    static _requiresAttorneyAdvice(category) {
        const attorneyRequired = [
            this.CRIMINAL,
            this.IMMIGRATION,
            this.FAMILY
        ];

        return attorneyRequired.includes(category);
    }

    /**
     * Get self-representation viability score
     * @private
     */
    static _getSelfRepViability(category) {
        const viabilityScores = {
            [this.COUNCIL]: 'HIGH',
            [this.CONSUMER]: 'HIGH',
            [this.BENEFITS]: 'MEDIUM',
            [this.INSURANCE]: 'MEDIUM',
            [this.EMPLOYMENT]: 'MEDIUM',
            [this.HEALTHCARE]: 'MEDIUM',
            [this.DEBT]: 'MEDIUM',
            [this.HOUSING]: 'MEDIUM',
            [this.DISABILITY]: 'LOW',
            [this.FAMILY]: 'LOW',
            [this.IMMIGRATION]: 'VERY_LOW',
            [this.CRIMINAL]: 'VERY_LOW'
        };

        return viabilityScores[category] || 'MEDIUM';
    }
}

module.exports = LegalCategory;