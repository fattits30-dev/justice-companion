// Justice Companion - Intelligent Case Detection & Classification
// Automatically detect legal case types and create structured cases

export class CaseDetectionEngine {
  constructor() {
    this.legalDomains = {
      housing: {
        keywords: [
          'landlord', 'tenant', 'rent', 'eviction', 'lease', 'deposit', 'repairs',
          'heating', 'damp', 'notice', 'section 21', 'section 8', 'housing benefit',
          'council house', 'housing association', 'right to buy', 'overcrowding'
        ],
        urgencyKeywords: ['eviction', 'notice', 'bailiff', 'court order', 'homeless'],
        type: 'housing'
      },
      employment: {
        keywords: [
          'job', 'work', 'employer', 'fired', 'dismissed', 'redundancy', 'wage',
          'salary', 'overtime', 'holiday pay', 'sick pay', 'discrimination',
          'harassment', 'tribunal', 'unfair dismissal', 'contract', 'hours'
        ],
        urgencyKeywords: ['dismissed', 'fired', 'tribunal', 'deadline'],
        type: 'employment'
      },
      family: {
        keywords: [
          'divorce', 'custody', 'child', 'contact', 'maintenance', 'family court',
          'domestic violence', 'restraining order', 'marriage', 'separation',
          'adoption', 'inheritance', 'will', 'probate'
        ],
        urgencyKeywords: ['domestic violence', 'restraining order', 'emergency'],
        type: 'family'
      },
      consumer: {
        keywords: [
          'scam', 'fraud', 'refund', 'faulty goods', 'warranty', 'consumer rights',
          'shop', 'purchase', 'credit card', 'debt', 'loan', 'bank', 'insurance'
        ],
        urgencyKeywords: ['fraud', 'scam', 'unauthorized'],
        type: 'consumer'
      },
      immigration: {
        keywords: [
          'visa', 'passport', 'asylum', 'refugee', 'deportation', 'home office',
          'immigration', 'citizenship', 'settlement', 'spouse visa', 'work permit'
        ],
        urgencyKeywords: ['deportation', 'detention', 'appeal deadline'],
        type: 'immigration'
      },
      criminal: {
        keywords: [
          'police', 'arrest', 'charge', 'court', 'magistrate', 'solicitor',
          'bail', 'caution', 'fine', 'probation', 'prison', 'criminal record'
        ],
        urgencyKeywords: ['arrest', 'police station', 'court date', 'bail'],
        type: 'criminal'
      },
      welfare: {
        keywords: [
          'benefits', 'universal credit', 'esa', 'pip', 'dla', 'jobseekers',
          'housing benefit', 'council tax', 'sanctions', 'assessment', 'appeal'
        ],
        urgencyKeywords: ['sanctions', 'appeal deadline', 'assessment'],
        type: 'welfare'
      }
    };

    this.legalAidResources = {
      national: [
        {
          name: 'Citizens Advice',
          phone: '0808 223 1133',
          website: 'https://www.citizensadvice.org.uk',
          description: 'Free, confidential advice on legal, debt, consumer, housing and other problems'
        },
        {
          name: 'Shelter (Housing)',
          phone: '0808 800 4444',
          website: 'https://www.shelter.org.uk',
          description: 'Emergency housing advice and support'
        },
        {
          name: 'National Domestic Violence Helpline',
          phone: '0808 2000 247',
          website: 'https://www.nationaldahelpline.org.uk',
          description: '24-hour confidential helpline for domestic violence support'
        },
        {
          name: 'ACAS (Employment)',
          phone: '0300 123 1100',
          website: 'https://www.acas.org.uk',
          description: 'Free employment advice and conciliation services'
        }
      ],
      emergency: [
        {
          name: 'Police (Emergency)',
          phone: '999',
          description: 'Immediate danger or crime in progress'
        },
        {
          name: 'Police (Non-Emergency)',
          phone: '101',
          description: 'Report crimes and get advice'
        },
        {
          name: 'Samaritans',
          phone: '116 123',
          description: 'Free 24-hour emotional support'
        }
      ]
    };
  }

  detectCaseType(userInput) {
    const normalizedInput = userInput.toLowerCase();
    const words = normalizedInput.split(/\s+/);

    const scores = {};
    let isUrgent = false;
    let urgentReasons = [];

    // Score each legal domain
    Object.entries(this.legalDomains).forEach(([domain, config]) => {
      let score = 0;
      let matchedKeywords = [];

      // Check for keyword matches
      config.keywords.forEach(keyword => {
        if (normalizedInput.includes(keyword)) {
          score += 1;
          matchedKeywords.push(keyword);
        }
      });

      // Check for urgency indicators
      config.urgencyKeywords.forEach(urgentKeyword => {
        if (normalizedInput.includes(urgentKeyword)) {
          score += 3; // Higher weight for urgent keywords
          isUrgent = true;
          urgentReasons.push(urgentKeyword);
          matchedKeywords.push(`URGENT: ${urgentKeyword}`);
        }
      });

      if (score > 0) {
        scores[domain] = {
          score,
          // Calculate confidence: 1 match = 60%, 2 matches = 75%, 3+ matches = 85-95%
          confidence: Math.min(Math.max(60 + (score - 1) * 15, 60), 95),
          matchedKeywords,
          type: config.type
        };
      }
    });

    // Find the best match
    const bestMatch = Object.entries(scores).reduce((best, [domain, data]) => {
      return data.score > (best?.score || 0) ? { domain, ...data } : best;
    }, null);

    return {
      detectedType: bestMatch?.domain || 'general',
      confidence: bestMatch?.confidence || 0,
      isUrgent,
      urgentReasons,
      matchedKeywords: bestMatch?.matchedKeywords || [],
      allScores: scores,
      needsLegalAid: bestMatch?.confidence > 30 || isUrgent
    };
  }

  generateCaseTitle(userInput, caseType) {
    const input = userInput.trim();
    const maxLength = 60;

    // Create a meaningful title based on case type and content
    const typeLabels = {
      housing: '🏠 Housing',
      employment: '💼 Employment',
      family: '👨‍👩‍👧‍👦 Family',
      consumer: '🛒 Consumer',
      immigration: '🛂 Immigration',
      criminal: '⚖️ Criminal',
      welfare: '🏛️ Welfare',
      general: '📋 Legal'
    };

    const prefix = typeLabels[caseType] || '📋 Legal';
    const summary = input.length > maxLength ?
      input.substring(0, maxLength - 3) + '...' : input;

    return `${prefix}: ${summary}`;
  }

  extractKeyFacts(userInput, caseType) {
    const facts = [];
    const normalizedInput = userInput.toLowerCase();

    // Money amounts
    const moneyPattern = /£[\d,]+(?:\.\d{2})?|\b\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:pounds?|quid|£)\b/gi;
    const moneyMatches = userInput.match(moneyPattern);
    if (moneyMatches) {
      moneyMatches.forEach(amount => {
        facts.push({
          type: 'money',
          label: 'Amount',
          value: amount,
          importance: 'high'
        });
      });
    }

    // Dates
    const datePattern = /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{2,4})\b/gi;
    const dateMatches = userInput.match(datePattern);
    if (dateMatches) {
      dateMatches.forEach(date => {
        facts.push({
          type: 'date',
          label: 'Important Date',
          value: date,
          importance: 'high'
        });
      });
    }

    // Names (people/organizations)
    const namePattern = /\b(?:landlord|employer|company|solicitor|mr\.?|mrs\.?|ms\.?|dr\.?)\s+([a-z]+(?:\s+[a-z]+)*)/gi;
    const nameMatches = [...userInput.matchAll(namePattern)];
    nameMatches.forEach(match => {
      facts.push({
        type: 'person',
        label: 'Person/Organization',
        value: match[0],
        importance: 'medium'
      });
    });

    // Case-specific fact extraction
    if (caseType === 'housing') {
      // Property addresses
      const addressPattern = /\b\d+[a-z]?\s+[a-z\s]+(?:road|street|avenue|lane|drive|close|way|place|row|square|terrace|crescent|court|gardens?)\b/gi;
      const addressMatches = userInput.match(addressPattern);
      if (addressMatches) {
        addressMatches.forEach(address => {
          facts.push({
            type: 'address',
            label: 'Property Address',
            value: address,
            importance: 'high'
          });
        });
      }
    }

    return facts;
  }

  getLegalAidRecommendations(caseType, isUrgent) {
    const recommendations = [...this.legalAidResources.national];

    if (isUrgent) {
      recommendations.unshift(...this.legalAidResources.emergency);
    }

    // Add case-specific resources
    switch (caseType) {
      case 'housing':
        recommendations.unshift({
          name: 'Shelter Housing Advice',
          phone: '0808 800 4444',
          website: 'https://www.shelter.org.uk',
          description: 'Specialist housing advice and legal support'
        });
        break;
      case 'employment':
        recommendations.unshift({
          name: 'ACAS (Advisory, Conciliation and Arbitration Service)',
          phone: '0300 123 1100',
          website: 'https://www.acas.org.uk',
          description: 'Free employment advice and dispute resolution'
        });
        break;
      case 'family':
        recommendations.unshift({
          name: 'Family Rights Group',
          phone: '0808 801 0366',
          website: 'https://www.frg.org.uk',
          description: 'Advice for families involved with social services'
        });
        break;
    }

    return recommendations.slice(0, 5); // Limit to top 5 most relevant
  }

  generateInteractivePrompts(caseType, isUrgent, facts) {
    const basePrompts = [
      {
        id: 'gather_facts',
        title: '📋 Gather More Information',
        description: 'Tell me more details about your situation',
        urgent: false
      },
      {
        id: 'legal_aid',
        title: '🤝 Find Legal Help',
        description: 'Get connected with free legal advice services',
        urgent: isUrgent
      },
      {
        id: 'document_help',
        title: '📄 Document Your Case',
        description: 'Help organizing evidence and paperwork',
        urgent: false
      }
    ];

    // Case-specific prompts
    const caseSpecificPrompts = {
      housing: [
        {
          id: 'tenancy_rights',
          title: '🏠 Know Your Rights',
          description: 'Understanding tenant rights and landlord obligations',
          urgent: false
        },
        {
          id: 'eviction_defense',
          title: '🛡️ Eviction Defense',
          description: 'Steps to challenge an eviction notice',
          urgent: true
        }
      ],
      employment: [
        {
          id: 'employment_rights',
          title: '💼 Employment Rights',
          description: 'Understanding your workplace rights',
          urgent: false
        },
        {
          id: 'tribunal_help',
          title: '⚖️ Employment Tribunal',
          description: 'Information about making a tribunal claim',
          urgent: true
        }
      ],
      family: [
        {
          id: 'child_arrangements',
          title: '👶 Child Arrangements',
          description: 'Information about custody and contact',
          urgent: false
        },
        {
          id: 'domestic_violence',
          title: '🚨 Domestic Violence Support',
          description: 'Emergency help and legal protection',
          urgent: true
        }
      ]
    };

    const prompts = [...basePrompts];
    if (caseSpecificPrompts[caseType]) {
      prompts.push(...caseSpecificPrompts[caseType]);
    }

    // Prioritize urgent prompts
    if (isUrgent) {
      prompts.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));
    }

    return prompts.slice(0, 6); // Limit to 6 prompts
  }
}

export default CaseDetectionEngine;