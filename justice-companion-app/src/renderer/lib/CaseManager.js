// Justice Companion - Intelligent Case Management System
// Integrates with Memory MCP for persistent case storage and fact tracking

import CaseDetectionEngine from './CaseDetection.js';

export class IntelligentCaseManager {
  constructor() {
    this.detector = new CaseDetectionEngine();
    this.currentCase = null;
    this.memoryAvailable = typeof window !== 'undefined' && window.mcp__memory__create_entities;
  }

  async analyzeUserQuery(userInput, userId = 'default-user') {
    try {
      // Detect case type and extract information
      const detection = this.detector.detectCaseType(userInput);
      const facts = this.detector.extractKeyFacts(userInput, detection.detectedType);

      console.log('🔍 Case Analysis:', {
        type: detection.detectedType,
        confidence: detection.confidence,
        urgent: detection.isUrgent,
        facts: facts.length
      });

      // Auto-create case if confidence is high enough
      let caseEntity = null;
      if (detection.confidence > 40 || detection.isUrgent) {
        caseEntity = await this.createOrUpdateCase(userInput, detection, facts, userId);
      }

      // Generate response with legal aid recommendations
      const response = await this.generateEnhancedResponse(
        userInput,
        detection,
        facts,
        caseEntity
      );

      return {
        detection,
        facts,
        caseEntity,
        response,
        needsLegalAid: detection.needsLegalAid,
        isUrgent: detection.isUrgent
      };

    } catch (error) {
      console.error('❌ Case analysis failed:', error);
      return {
        detection: { detectedType: 'general', confidence: 0 },
        facts: [],
        caseEntity: null,
        response: this.getBasicResponse(userInput),
        needsLegalAid: true,
        isUrgent: false
      };
    }
  }

  async createOrUpdateCase(userInput, detection, facts, userId) {
    if (!this.memoryAvailable) {
      console.warn('⚠️ Memory MCP not available - using local storage fallback');
      return this.createLocalCase(userInput, detection, facts, userId);
    }

    try {
      const caseTitle = this.detector.generateCaseTitle(userInput, detection.detectedType);
      const caseId = `case-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create case entity in memory MCP
      const caseEntities = [{
        name: caseId,
        entityType: 'legal_case',
        observations: [
          `Case Title: ${caseTitle}`,
          `Case Type: ${detection.detectedType}`,
          `Confidence Score: ${detection.confidence}%`,
          `Created Date: ${new Date().toISOString()}`,
          `User ID: ${userId}`,
          `Urgent: ${detection.isUrgent}`,
          `Initial Query: ${userInput}`,
          `Matched Keywords: ${detection.matchedKeywords.join(', ')}`,
          `Status: active`
        ]
      }];

      await window.mcp__memory__create_entities({ entities: caseEntities });

      // Create user entity if not exists
      const userEntities = [{
        name: userId,
        entityType: 'user',
        observations: [
          `User ID: ${userId}`,
          `Last Active: ${new Date().toISOString()}`,
          `Total Cases: 1` // Will be updated later
        ]
      }];

      try {
        await window.mcp__memory__create_entities({ entities: userEntities });
      } catch (e) {
        // User probably already exists
        await window.mcp__memory__add_observations({
          observations: [{
            entityName: userId,
            contents: [`Updated: ${new Date().toISOString()}`]
          }]
        });
      }

      // Create relationship between user and case
      await window.mcp__memory__create_relations({
        relations: [{
          from: userId,
          to: caseId,
          relationType: 'owns_case'
        }]
      });

      // Store facts as entities
      if (facts.length > 0) {
        const factEntities = facts.map((fact, index) => ({
          name: `${caseId}-fact-${index}`,
          entityType: 'legal_fact',
          observations: [
            `Fact Type: ${fact.type}`,
            `Label: ${fact.label}`,
            `Value: ${fact.value}`,
            `Importance: ${fact.importance}`,
            `Source: user_input`,
            `Case ID: ${caseId}`,
            `Extracted: ${new Date().toISOString()}`
          ]
        }));

        await window.mcp__memory__create_entities({ entities: factEntities });

        // Create relationships between case and facts
        const factRelations = facts.map((fact, index) => ({
          from: caseId,
          to: `${caseId}-fact-${index}`,
          relationType: 'contains_fact'
        }));

        await window.mcp__memory__create_relations({ relations: factRelations });
      }

      console.log('✅ Case created in Memory MCP:', caseId);
      this.currentCase = {
        id: caseId,
        title: caseTitle,
        type: detection.detectedType,
        created: new Date().toISOString(),
        facts: facts
      };

      return this.currentCase;

    } catch (error) {
      console.error('❌ Failed to create case in Memory MCP:', error);
      return this.createLocalCase(userInput, detection, facts, userId);
    }
  }

  createLocalCase(userInput, detection, facts, userId) {
    // Fallback to local storage
    const caseId = `local-case-${Date.now()}`;
    const caseTitle = this.detector.generateCaseTitle(userInput, detection.detectedType);

    const localCase = {
      id: caseId,
      title: caseTitle,
      type: detection.detectedType,
      created: new Date().toISOString(),
      facts: facts,
      userId: userId,
      urgent: detection.isUrgent,
      confidence: detection.confidence
    };

    // Store in localStorage
    try {
      const existingCases = JSON.parse(localStorage.getItem('justice-companion-cases') || '[]');
      existingCases.push(localCase);
      localStorage.setItem('justice-companion-cases', JSON.stringify(existingCases));
      console.log('✅ Case created locally:', caseId);
    } catch (e) {
      console.error('❌ Failed to save case locally:', e);
    }

    this.currentCase = localCase;
    return localCase;
  }

  async generateEnhancedResponse(userInput, detection, facts, caseEntity) {
    const legalAidResources = this.detector.getLegalAidRecommendations(
      detection.detectedType,
      detection.isUrgent
    );

    const interactivePrompts = this.detector.generateInteractivePrompts(
      detection.detectedType,
      detection.isUrgent,
      facts
    );

    // Build comprehensive response
    const response = {
      type: 'legal-assistance',
      summary: this.generateCaseSummary(detection, facts),
      caseInfo: caseEntity ? {
        id: caseEntity.id,
        title: caseEntity.title,
        type: caseEntity.type,
        created: caseEntity.created,
        urgent: detection.isUrgent
      } : null,
      immediateGuidance: this.generateImmediateGuidance(detection, facts),
      legalAidResources: legalAidResources,
      interactivePrompts: interactivePrompts,
      facts: facts,
      disclaimer: this.getLegalDisclaimer(detection.detectedType),
      nextSteps: this.generateNextSteps(detection, facts),
      confidence: detection.confidence,
      urgent: detection.isUrgent
    };

    return response;
  }

  generateCaseSummary(detection, facts) {
    const typeLabels = {
      housing: 'Housing & Tenant Rights',
      employment: 'Employment Law',
      family: 'Family Law',
      consumer: 'Consumer Rights',
      immigration: 'Immigration Law',
      criminal: 'Criminal Law',
      welfare: 'Welfare & Benefits',
      general: 'General Legal Information'
    };

    let summary = typeLabels[detection.detectedType] || 'Legal Information';

    if (detection.isUrgent) {
      summary = `🚨 URGENT: ${summary}`;
    }

    if (facts.length > 0) {
      summary += ` (${facts.length} key facts identified)`;
    }

    return summary;
  }

  generateImmediateGuidance(detection, facts) {
    const guidanceMap = {
      housing: {
        title: 'URGENT - Housing Rights Information',
        content: `If you're facing housing issues, time can be critical. Here's immediate information:

**Your Rights:**
• You cannot be evicted without a court order
• You have the right to defend against eviction in court
• Your landlord must follow proper legal procedures
• You may be entitled to compensation if procedures weren't followed

**Immediate Steps:**
1. Gather all documents (tenancy agreement, notice, correspondence)
2. Check if proper notice period was given
3. Identify possible defenses
4. Respond within required timeframe`
      },
      employment: {
        title: 'Employment Rights & Protection',
        content: `Understanding your employment rights is crucial:

**Your Protections:**
• Right to fair treatment and equal pay
• Protection from unfair dismissal
• Right to written terms of employment
• Protection from discrimination and harassment

**If You've Been Dismissed:**
1. Check if dismissal was fair and followed proper procedure
2. Calculate notice pay and redundancy entitlements
3. Consider ACAS early conciliation if appropriate
4. Note time limits for tribunal claims (usually 3 months)`
      },
      family: {
        title: 'Family Law Guidance',
        content: `Family law matters require careful consideration:

**Key Areas:**
• Child arrangements and contact
• Financial settlements
• Domestic violence protection
• Marriage, divorce, and separation

**Important Notes:**
1. Child welfare is always the court's priority
2. Mediation is often required before court proceedings
3. Emergency protection orders available for domestic violence
4. Legal aid may be available for certain family matters`
      },
      consumer: {
        title: 'Consumer Rights Protection',
        content: `Know your consumer rights:

**Your Rights:**
• Goods must be of satisfactory quality
• Services must be performed with reasonable care
• Right to refund, repair, or replacement
• Protection from unfair contract terms

**If Things Go Wrong:**
1. Contact the trader first to resolve the issue
2. Check your rights under Consumer Rights Act 2015
3. Consider alternative dispute resolution
4. Small claims court for disputes under £10,000`
      },
      general: {
        title: 'General Legal Information',
        content: `Legal matters can be complex - here's where to start:

**General Principles:**
• Seek qualified legal advice for specific situations
• Keep detailed records of all communications
• Be aware of time limits for legal action
• Know your rights and responsibilities

**Getting Help:**
1. Contact Citizens Advice for free guidance
2. Check if you qualify for legal aid
3. Consider fixed-fee legal consultations
4. Use online resources for basic information`
      }
    };

    return guidanceMap[detection.detectedType] || guidanceMap.general;
  }

  generateNextSteps(detection, facts) {
    const baseSteps = [
      'Document everything - keep records of all communications, notices, and evidence',
      'Gather supporting documents relevant to your case',
      'Contact appropriate legal aid services for professional advice',
      'Be aware of any deadlines or time limits that may apply'
    ];

    const caseSpecificSteps = {
      housing: [
        'Check your tenancy agreement for relevant clauses',
        'Take photos of any property conditions mentioned',
        'Keep records of rent payments and correspondence with landlord'
      ],
      employment: [
        'Review your employment contract and employee handbook',
        'Keep records of any grievances or disciplinary actions',
        'Note dates and witnesses for any incidents'
      ],
      family: [
        'Consider mediation before court proceedings',
        'Gather financial documents if money matters are involved',
        'Think about the best interests of any children involved'
      ]
    };

    const steps = [...baseSteps];
    if (caseSpecificSteps[detection.detectedType]) {
      steps.push(...caseSpecificSteps[detection.detectedType]);
    }

    return steps;
  }

  getLegalDisclaimer(caseType) {
    return `⚖️ **LEGAL INFORMATION NOTICE**: This is general legal information, not legal advice. Every situation is unique and requires professional assessment. For specific legal advice about your ${caseType} matter, consult a qualified solicitor or legal advisor. Time limits may apply to legal action, so seek professional help promptly.`;
  }

  getBasicResponse(userInput) {
    return {
      type: 'legal-assistance',
      summary: 'General Legal Information',
      immediateGuidance: {
        title: 'Legal Information & Support',
        content: `Thank you for your question. While I can provide general legal information, every situation is unique and requires proper assessment.

**Immediate Steps:**
1. Contact Citizens Advice (0808 223 1133) for free, confidential advice
2. Consider whether you need urgent legal help
3. Gather any relevant documents
4. Note any important deadlines

**Remember:**
• This service provides information, not legal advice
• For urgent matters, seek immediate professional help
• Legal aid may be available for those who qualify`
      },
      legalAidResources: this.detector.getLegalAidRecommendations('general', false),
      disclaimer: this.getLegalDisclaimer('general'),
      nextSteps: this.generateNextSteps({ detectedType: 'general' }, []),
      confidence: 0,
      urgent: false
    };
  }

  async getCaseHistory(userId = 'default-user') {
    if (this.memoryAvailable) {
      try {
        // Search for user's cases in memory MCP
        const searchResult = await window.mcp__memory__search_nodes({
          query: `user ${userId} cases legal_case`
        });
        return this.parseMemoryCases(searchResult);
      } catch (error) {
        console.error('❌ Failed to retrieve case history from memory:', error);
      }
    }

    // Fallback to local storage
    try {
      const localCases = JSON.parse(localStorage.getItem('justice-companion-cases') || '[]');
      return localCases.filter(c => c.userId === userId);
    } catch (e) {
      console.error('❌ Failed to retrieve local case history:', e);
      return [];
    }
  }

  parseMemoryCases(searchResult) {
    // Parse memory MCP search results into case objects
    // This would need to be implemented based on the actual structure returned by memory MCP
    try {
      // Placeholder implementation
      return [];
    } catch (e) {
      console.error('❌ Failed to parse memory cases:', e);
      return [];
    }
  }
}

export default IntelligentCaseManager;