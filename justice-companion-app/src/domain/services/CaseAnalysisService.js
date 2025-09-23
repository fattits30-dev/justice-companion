/**
 * CaseAnalysisService Domain Service
 * Analyzes legal cases and messages to extract insights and recommendations
 */

class CaseAnalysisService {
  constructor() {
    this.legalPatterns = this.initializeLegalPatterns();
    this.urgencyIndicators = this.initializeUrgencyIndicators();
    this.categoryKeywords = this.initializeCategoryKeywords();
  }

  /**
   * Analyze text to extract case information
   */
  async analyzeCaseFromText(text) {
    try {
      const analysis = {
        category: this.detectCategory(text),
        urgency: this.detectUrgency(text),
        keyIssues: this.extractKeyIssues(text),
        entities: this.extractLegalEntities(text),
        timeframes: this.extractTimeframes(text),
        suggestedActions: [],
        potentialClaims: [],
        relevantLaws: [],
        confidence: 0
      };

      // Determine suggested actions based on analysis
      analysis.suggestedActions = this.generateSuggestedActions(analysis);

      // Identify potential legal claims
      analysis.potentialClaims = this.identifyPotentialClaims(text, analysis.category);

      // Find relevant laws/regulations
      analysis.relevantLaws = this.findRelevantLaws(analysis.category, analysis.keyIssues);

      // Calculate overall confidence score
      analysis.confidence = this.calculateConfidence(analysis);

      return analysis;

    } catch (error) {
      console.error('Error analyzing case:', error);
      return {
        category: 'general',
        urgency: 'normal',
        keyIssues: [],
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Detect legal category from text
   */
  detectCategory(text) {
    const lowercaseText = text.toLowerCase();
    let bestMatch = 'general';
    let highestScore = 0;

    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      const score = keywords.reduce((acc, keyword) => {
        return acc + (lowercaseText.includes(keyword) ? 1 : 0);
      }, 0);

      if (score > highestScore) {
        highestScore = score;
        bestMatch = category;
      }
    }

    return bestMatch;
  }

  /**
   * Detect urgency level from text
   */
  detectUrgency(text) {
    const lowercaseText = text.toLowerCase();

    // Critical urgency indicators
    const criticalIndicators = [
      'court hearing tomorrow',
      'eviction today',
      'deadline today',
      'emergency',
      'immediate action required',
      'final notice',
      '24 hours',
      'bailiff coming'
    ];

    // High urgency indicators
    const highIndicators = [
      'urgent',
      'court date',
      'deadline',
      'eviction notice',
      'final warning',
      'last chance',
      'dismissal',
      'termination',
      '48 hours',
      'this week'
    ];

    // Check for critical urgency
    if (criticalIndicators.some(indicator => lowercaseText.includes(indicator))) {
      return 'critical';
    }

    // Check for high urgency
    if (highIndicators.some(indicator => lowercaseText.includes(indicator))) {
      return 'high';
    }

    // Check for time-sensitive language
    const timePatterns = /\b(\d+\s*(days?|hours?|weeks?))\b/gi;
    const matches = text.match(timePatterns);
    if (matches) {
      const firstMatch = matches[0].toLowerCase();
      if (firstMatch.includes('hour') ||
          (firstMatch.includes('day') && parseInt(firstMatch) <= 7)) {
        return 'high';
      }
    }

    return 'normal';
  }

  /**
   * Extract key legal issues from text
   */
  extractKeyIssues(text) {
    const issues = [];
    const lowercaseText = text.toLowerCase();

    const issuePatterns = {
      'unfair dismissal': ['fired without', 'dismissed unfairly', 'wrongful termination', 'sacked for no reason'],
      'unpaid wages': ['not paid', 'owe me money', 'wages unpaid', 'salary not received'],
      'discrimination': ['discriminated', 'harassment', 'bullying', 'treated differently', 'racist', 'sexist'],
      'eviction': ['evicted', 'kicked out', 'notice to quit', 'leave property', 'possession order'],
      'deposit dispute': ['deposit not returned', 'keeping my deposit', 'deposit withheld'],
      'repair issues': ['repairs needed', 'property damage', 'landlord won\'t fix', 'maintenance'],
      'breach of contract': ['contract broken', 'agreement violated', 'didn\'t honor', 'breach'],
      'consumer rights': ['faulty product', 'refund refused', 'defective', 'not as described'],
      'debt problems': ['debt collectors', 'bailiffs', 'ccj', 'bankruptcy', 'can\'t pay'],
      'benefit issues': ['benefits stopped', 'universal credit', 'pip', 'esa', 'sanctioned']
    };

    for (const [issue, patterns] of Object.entries(issuePatterns)) {
      if (patterns.some(pattern => lowercaseText.includes(pattern))) {
        issues.push(issue);
      }
    }

    return issues;
  }

  /**
   * Extract legal entities mentioned in text
   */
  extractLegalEntities(text) {
    const entities = {
      organizations: [],
      people: [],
      locations: [],
      dates: [],
      amounts: []
    };

    // Extract monetary amounts
    const amountPattern = /£[\d,]+(?:\.\d{2})?|\$[\d,]+(?:\.\d{2})?|\b\d+\s*(?:pounds?|dollars?|euros?)\b/gi;
    const amounts = text.match(amountPattern) || [];
    entities.amounts = amounts;

    // Extract dates
    const datePattern = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s+\d{4})?\b/gi;
    const dates = text.match(datePattern) || [];
    entities.dates = dates;

    // Extract common organization types
    const orgPattern = /\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\s+(?:Ltd|Limited|LLP|PLC|Corporation|Corp|Inc|Council|Court|Tribunal)\b/g;
    const orgs = text.match(orgPattern) || [];
    entities.organizations = orgs;

    // Extract potential person names (simplified)
    const namePattern = /\b(?:Mr|Mrs|Ms|Dr|Judge)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g;
    const names = text.match(namePattern) || [];
    entities.people = names;

    return entities;
  }

  /**
   * Extract timeframes and deadlines
   */
  extractTimeframes(text) {
    const timeframes = [];
    const lowercaseText = text.toLowerCase();

    // Deadline patterns
    const deadlinePatterns = [
      /deadline.{0,20}(\d+\s*(?:days?|weeks?|months?))/gi,
      /within\s+(\d+\s*(?:days?|weeks?|months?))/gi,
      /(\d+\s*(?:days?|weeks?|months?))\s+to\s+(?:respond|reply|appeal)/gi,
      /by\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      /before\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi
    ];

    deadlinePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          timeframes.push({
            type: 'deadline',
            text: match,
            urgency: this.assessTimeframeUrgency(match)
          });
        });
      }
    });

    // Notice period patterns
    const noticePeriods = text.match(/(\d+)\s*(?:days?|weeks?|months?)\s*notice/gi) || [];
    noticePeriods.forEach(notice => {
      timeframes.push({
        type: 'notice_period',
        text: notice,
        urgency: this.assessTimeframeUrgency(notice)
      });
    });

    return timeframes;
  }

  /**
   * Generate suggested actions based on analysis
   */
  generateSuggestedActions(analysis) {
    const actions = [];

    // Universal actions
    actions.push('Document all communications and keep records');
    actions.push('Gather all relevant evidence and paperwork');

    // Category-specific actions
    const categoryActions = {
      housing: [
        'Take photos of property condition',
        'Check if deposit was protected',
        'Review tenancy agreement terms',
        'Contact Shelter for housing advice'
      ],
      employment: [
        'Request written reasons for dismissal',
        'Check employment contract terms',
        'File ACAS early conciliation',
        'Calculate owed wages/notice pay'
      ],
      consumer: [
        'Keep proof of purchase',
        'Document product faults with photos',
        'Send formal complaint to company',
        'Contact Trading Standards'
      ],
      debt: [
        'List all debts and creditors',
        'Check if debts are statute-barred',
        'Seek debt advice from StepChange',
        'Do not ignore court papers'
      ],
      benefits: [
        'Request mandatory reconsideration',
        'Gather medical evidence if relevant',
        'Contact Citizens Advice',
        'Check benefit calculator for entitlements'
      ]
    };

    if (categoryActions[analysis.category]) {
      actions.push(...categoryActions[analysis.category]);
    }

    // Urgency-based actions
    if (analysis.urgency === 'critical' || analysis.urgency === 'high') {
      actions.unshift('URGENT: Seek immediate legal advice');
      actions.unshift('Check time limits for legal action');
    }

    return actions;
  }

  /**
   * Identify potential legal claims
   */
  identifyPotentialClaims(text, category) {
    const claims = [];
    const lowercaseText = text.toLowerCase();

    const claimPatterns = {
      housing: {
        'Illegal eviction': ['locked out', 'changed locks', 'forced out', 'thrown out'],
        'Deposit protection claim': ['deposit not protected', 'no deposit scheme'],
        'Harassment': ['landlord harassing', 'unwanted visits', 'threatening'],
        'Disrepair claim': ['repairs not done', 'property damaged', 'unsafe conditions']
      },
      employment: {
        'Unfair dismissal': ['fired unfairly', 'dismissed without reason', 'sacked'],
        'Discrimination claim': ['treated differently', 'harassment', 'bullying'],
        'Unpaid wages': ['not paid', 'owe wages', 'missing pay'],
        'Breach of contract': ['contract violated', 'terms broken']
      },
      consumer: {
        'Breach of consumer rights': ['not as described', 'faulty', 'defective'],
        'Misrepresentation': ['lied about', 'false advertising', 'misleading'],
        'Breach of warranty': ['warranty not honored', 'guarantee broken']
      }
    };

    const categoryPatterns = claimPatterns[category] || {};
    for (const [claim, patterns] of Object.entries(categoryPatterns)) {
      if (patterns.some(pattern => lowercaseText.includes(pattern))) {
        claims.push(claim);
      }
    }

    return claims;
  }

  /**
   * Find relevant laws and regulations
   */
  findRelevantLaws(category, keyIssues) {
    const laws = [];

    const relevantLaws = {
      housing: [
        'Housing Act 1988',
        'Protection from Eviction Act 1977',
        'Landlord and Tenant Act 1985',
        'Homes (Fitness for Human Habitation) Act 2018'
      ],
      employment: [
        'Employment Rights Act 1996',
        'Equality Act 2010',
        'Working Time Regulations 1998',
        'National Minimum Wage Act 1998'
      ],
      consumer: [
        'Consumer Rights Act 2015',
        'Consumer Protection Act 1987',
        'Sale of Goods Act 1979',
        'Consumer Credit Act 1974'
      ],
      benefits: [
        'Social Security Act 1998',
        'Welfare Reform Act 2012',
        'Universal Credit Regulations 2013'
      ],
      debt: [
        'Consumer Credit Act 1974',
        'Limitation Act 1980',
        'Insolvency Act 1986'
      ]
    };

    if (relevantLaws[category]) {
      laws.push(...relevantLaws[category]);
    }

    // Add issue-specific laws
    if (keyIssues.includes('discrimination')) {
      laws.push('Equality Act 2010');
    }
    if (keyIssues.includes('data protection')) {
      laws.push('Data Protection Act 2018', 'GDPR');
    }

    return [...new Set(laws)]; // Remove duplicates
  }

  /**
   * Calculate confidence score for analysis
   */
  calculateConfidence(analysis) {
    let score = 0.5; // Base score

    // Increase confidence based on clear indicators
    if (analysis.category !== 'general') score += 0.1;
    if (analysis.keyIssues.length > 0) score += 0.1;
    if (analysis.entities.organizations.length > 0) score += 0.05;
    if (analysis.entities.dates.length > 0) score += 0.05;
    if (analysis.timeframes.length > 0) score += 0.05;
    if (analysis.potentialClaims.length > 0) score += 0.1;
    if (analysis.relevantLaws.length > 0) score += 0.05;

    // Cap at 0.9 (never 100% certain without human review)
    return Math.min(score, 0.9);
  }

  /**
   * Assess urgency of a timeframe
   */
  assessTimeframeUrgency(timeframeText) {
    const text = timeframeText.toLowerCase();

    // Extract number and unit
    const match = text.match(/(\d+)\s*(hours?|days?|weeks?|months?)/);
    if (!match) return 'normal';

    const number = parseInt(match[1]);
    const unit = match[2];

    // Assess based on time remaining
    if (unit.includes('hour')) return 'critical';
    if (unit.includes('day') && number <= 2) return 'critical';
    if (unit.includes('day') && number <= 7) return 'high';
    if (unit.includes('week') && number <= 2) return 'high';

    return 'normal';
  }

  /**
   * Initialize legal pattern database
   */
  initializeLegalPatterns() {
    return {
      urgentPhrases: [
        'court tomorrow', 'hearing today', 'deadline today',
        'eviction notice', 'final warning', 'last chance'
      ],
      legalTerms: [
        'claimant', 'defendant', 'tribunal', 'hearing',
        'judgment', 'order', 'notice', 'claim', 'appeal'
      ]
    };
  }

  /**
   * Initialize urgency indicators
   */
  initializeUrgencyIndicators() {
    return {
      critical: ['emergency', 'immediate', 'today', 'tomorrow', '24 hours'],
      high: ['urgent', 'deadline', 'court date', 'eviction', 'dismissal'],
      normal: []
    };
  }

  /**
   * Initialize category keywords
   */
  initializeCategoryKeywords() {
    return {
      housing: ['landlord', 'tenant', 'eviction', 'rent', 'deposit', 'property', 'lease', 'tenancy', 'accommodation', 'repairs'],
      employment: ['employer', 'employee', 'job', 'work', 'dismissal', 'fired', 'wages', 'salary', 'redundancy', 'workplace'],
      consumer: ['product', 'service', 'refund', 'faulty', 'warranty', 'guarantee', 'purchase', 'bought', 'seller', 'shop'],
      council: ['council', 'local authority', 'parking', 'planning', 'tax', 'fine', 'penalty', 'permit'],
      insurance: ['insurance', 'policy', 'claim', 'premium', 'coverage', 'insurer', 'accident'],
      debt: ['debt', 'owe', 'creditor', 'bailiff', 'ccj', 'bankruptcy', 'loan', 'arrears'],
      benefits: ['benefit', 'universal credit', 'pip', 'esa', 'jsa', 'housing benefit', 'dwp', 'sanction']
    };
  }
}

module.exports = { CaseAnalysisService };