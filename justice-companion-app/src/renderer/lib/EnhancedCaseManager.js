// Justice Companion - Enhanced Case Management System
// Complete workflow from detection to monitoring with Memory MCP integration

import { IntelligentCaseManager } from './CaseManager.js';

export class EnhancedCaseManager extends IntelligentCaseManager {
  constructor() {
    super();
    this.caseStorage = new Map(); // Local cache for real-time access
    this.caseTimelines = new Map(); // Timeline tracking
    this.caseDocuments = new Map(); // Document management
    this.caseStatistics = new Map(); // Analytics and stats
  }

  // Enhanced case creation with full workflow integration
  async createCompleteCase(userInput, userId = 'default-user') {
    try {
      // Step 1: Run intelligent analysis
      const analysis = await this.analyzeUserQuery(userInput, userId);

      if (!analysis.caseEntity) {
        console.log('⚠️ Case confidence too low for automatic creation');
        return { success: false, reason: 'insufficient_confidence', analysis };
      }

      // Step 2: Enhanced case creation with monitoring setup
      const enhancedCase = await this.setupCaseMonitoring(analysis, userId);

      // Step 3: Initialize case timeline
      await this.initializeCaseTimeline(enhancedCase);

      // Step 4: Setup document management
      await this.setupCaseDocuments(enhancedCase);

      // Step 5: Create case statistics tracking
      await this.initializeCaseStatistics(enhancedCase);

      console.log('✅ Complete case workflow initialized:', enhancedCase.id);

      return {
        success: true,
        case: enhancedCase,
        analysis,
        monitoring: true,
        timeline: true,
        documents: true,
        statistics: true
      };

    } catch (error) {
      console.error('❌ Enhanced case creation failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Setup comprehensive case monitoring
  async setupCaseMonitoring(analysis, userId) {
    const caseEntity = analysis.caseEntity;

    // Enhanced case object with monitoring capabilities
    const enhancedCase = {
      ...caseEntity,
      // Core case information
      userId: userId,
      status: 'active',
      priority: analysis.isUrgent ? 'high' : 'medium',

      // Monitoring fields
      lastActivity: new Date().toISOString(),
      nextDeadline: this.calculateNextDeadline(analysis.detection.detectedType),
      completionEstimate: this.estimateCompletion(analysis.detection.detectedType),

      // Progress tracking
      progressStages: this.defineProgressStages(analysis.detection.detectedType),
      currentStage: 'initial_assessment',
      stageProgress: 0,

      // Enhanced facts with tracking
      facts: analysis.facts.map(fact => ({
        ...fact,
        verified: false,
        importance: this.calculateFactImportance(fact, analysis.detection.detectedType),
        addedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      })),

      // Legal aid tracking
      legalAidContacted: [],
      recommendedActions: this.generateActionPlan(analysis),
      completedActions: [],

      // Document requirements
      requiredDocuments: this.getRequiredDocuments(analysis.detection.detectedType),
      uploadedDocuments: [],

      // Risk assessment
      riskLevel: this.assessRiskLevel(analysis),
      riskFactors: this.identifyRiskFactors(analysis),

      // Monitoring metadata
      createdBy: 'intelligent_system',
      monitoringEnabled: true,
      alertsEnabled: true,
      reminderSchedule: this.createReminderSchedule(analysis.detection.detectedType),

      // Statistics
      totalTimeSpent: 0,
      interactionCount: 1,
      lastInteraction: new Date().toISOString()
    };

    // Store in local cache for quick access
    this.caseStorage.set(enhancedCase.id, enhancedCase);

    // Update memory MCP with enhanced case data
    if (this.memoryAvailable) {
      await this.updateCaseInMemory(enhancedCase);
    }

    return enhancedCase;
  }

  // Initialize case timeline tracking
  async initializeCaseTimeline(caseEntity) {
    const timeline = [
      {
        id: `timeline-${Date.now()}`,
        type: 'case_created',
        title: 'Case Opened',
        description: `${caseEntity.type} case created with ${caseEntity.facts.length} initial facts`,
        timestamp: new Date().toISOString(),
        automated: true,
        importance: 'high',
        icon: '📂'
      },
      {
        id: `timeline-${Date.now() + 1}`,
        type: 'analysis_complete',
        title: 'Initial Analysis Complete',
        description: `Case type detected with ${Math.round(caseEntity.confidence || 0)}% confidence`,
        timestamp: new Date().toISOString(),
        automated: true,
        importance: 'medium',
        icon: '🔍'
      }
    ];

    // Add urgency timeline entry if applicable
    if (caseEntity.priority === 'high') {
      timeline.push({
        id: `timeline-${Date.now() + 2}`,
        type: 'urgency_detected',
        title: 'Urgent Matter Identified',
        description: 'This case requires immediate attention and priority handling',
        timestamp: new Date().toISOString(),
        automated: true,
        importance: 'critical',
        icon: '🚨'
      });
    }

    this.caseTimelines.set(caseEntity.id, timeline);

    // Store timeline in memory MCP
    if (this.memoryAvailable) {
      await this.storeCaseTimeline(caseEntity.id, timeline);
    }

    return timeline;
  }

  // Setup document management for case
  async setupCaseDocuments(caseEntity) {
    const documentStructure = {
      caseId: caseEntity.id,
      folders: {
        evidence: {
          name: 'Evidence & Documentation',
          description: 'Photos, documents, and proof related to your case',
          files: [],
          required: true
        },
        correspondence: {
          name: 'Letters & Communications',
          description: 'All written communication with other parties',
          files: [],
          required: true
        },
        legal_documents: {
          name: 'Legal Documents',
          description: 'Court papers, notices, and official legal documents',
          files: [],
          required: true
        },
        reference: {
          name: 'Reference Materials',
          description: 'Guides, templates, and helpful resources',
          files: [],
          required: false
        }
      },
      requiredDocuments: caseEntity.requiredDocuments,
      uploadedCount: 0,
      totalSize: 0,
      lastUpdate: new Date().toISOString()
    };

    this.caseDocuments.set(caseEntity.id, documentStructure);
    return documentStructure;
  }

  // Initialize case statistics and analytics
  async initializeCaseStatistics(caseEntity) {
    const statistics = {
      caseId: caseEntity.id,

      // Progress metrics
      overallProgress: 5, // Starting progress
      stageProgress: {
        initial_assessment: 100,
        fact_gathering: 20,
        document_collection: 0,
        legal_consultation: 0,
        action_planning: 0,
        resolution: 0
      },

      // Activity metrics
      totalInteractions: 1,
      factsCollected: caseEntity.facts.length,
      documentsUploaded: 0,
      actionsCompleted: 0,
      timeSpent: 0, // in minutes

      // Quality metrics
      caseCompleteness: this.calculateCaseCompleteness(caseEntity),
      factVerificationRate: 0,
      documentCompletionRate: 0,

      // Timeline metrics
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      estimatedCompletion: caseEntity.completionEstimate,
      actualDeadlines: [],
      missedDeadlines: 0,

      // Legal aid metrics
      legalAidRecommendations: caseEntity.legalAidContacted.length,
      legalAidContacted: 0,
      professionalConsultations: 0,

      // Risk and urgency metrics
      riskLevel: caseEntity.riskLevel,
      urgencyChanges: [],
      criticalIssuesIdentified: caseEntity.riskFactors.length,

      // User engagement
      userSatisfaction: null,
      systemRecommendationsFollowed: 0,
      customActionsAdded: 0
    };

    this.caseStatistics.set(caseEntity.id, statistics);

    // Store in memory MCP
    if (this.memoryAvailable) {
      await this.storeCaseStatistics(caseEntity.id, statistics);
    }

    return statistics;
  }

  // Helper methods for case management

  calculateNextDeadline(caseType) {
    const deadlineMap = {
      housing: 14, // days - typical eviction response time
      employment: 30, // days - tribunal deadline
      consumer: 21, // days - complaint response time
      family: 28, // days - court response time
      welfare: 30, // days - appeal deadline
      general: 30
    };

    const days = deadlineMap[caseType] || 30;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);
    return deadline.toISOString();
  }

  estimateCompletion(caseType) {
    const estimateMap = {
      housing: 90, // days
      employment: 120, // days
      consumer: 60, // days
      family: 180, // days
      welfare: 90, // days
      general: 90
    };

    const days = estimateMap[caseType] || 90;
    const completion = new Date();
    completion.setDate(completion.getDate() + days);
    return completion.toISOString();
  }

  defineProgressStages(caseType) {
    const baseStages = [
      { id: 'initial_assessment', name: 'Initial Assessment', progress: 0 },
      { id: 'fact_gathering', name: 'Fact Gathering', progress: 0 },
      { id: 'document_collection', name: 'Document Collection', progress: 0 },
      { id: 'legal_consultation', name: 'Legal Consultation', progress: 0 },
      { id: 'action_planning', name: 'Action Planning', progress: 0 },
      { id: 'resolution', name: 'Resolution', progress: 0 }
    ];

    // Case-specific stages
    const caseSpecificStages = {
      housing: [
        ...baseStages,
        { id: 'tenancy_review', name: 'Tenancy Agreement Review', progress: 0 },
        { id: 'notice_analysis', name: 'Notice Analysis', progress: 0 }
      ],
      employment: [
        ...baseStages,
        { id: 'contract_review', name: 'Employment Contract Review', progress: 0 },
        { id: 'tribunal_preparation', name: 'Tribunal Preparation', progress: 0 }
      ]
    };

    return caseSpecificStages[caseType] || baseStages;
  }

  calculateFactImportance(fact, caseType) {
    // Calculate importance based on fact type and case type
    const importanceMatrix = {
      money: { housing: 'critical', employment: 'high', consumer: 'high' },
      date: { housing: 'critical', employment: 'critical', consumer: 'medium' },
      address: { housing: 'critical', employment: 'low', consumer: 'medium' },
      name: { housing: 'high', employment: 'high', consumer: 'high' }
    };

    return importanceMatrix[fact.type]?.[caseType] || 'medium';
  }

  generateActionPlan(analysis) {
    const baseActions = [
      {
        id: 'gather_documents',
        title: 'Gather Relevant Documents',
        description: 'Collect all paperwork related to your case',
        priority: 'high',
        estimated_time: '30 minutes',
        completed: false
      },
      {
        id: 'contact_legal_aid',
        title: 'Contact Legal Aid Services',
        description: 'Get professional legal advice',
        priority: 'high',
        estimated_time: '45 minutes',
        completed: false
      }
    ];

    // Add case-specific actions
    const caseSpecificActions = {
      housing: [
        {
          id: 'review_tenancy_agreement',
          title: 'Review Tenancy Agreement',
          description: 'Check your tenancy agreement for relevant clauses',
          priority: 'high',
          estimated_time: '20 minutes',
          completed: false
        }
      ],
      employment: [
        {
          id: 'review_employment_contract',
          title: 'Review Employment Contract',
          description: 'Check your employment contract and employee handbook',
          priority: 'high',
          estimated_time: '30 minutes',
          completed: false
        }
      ]
    };

    const actions = [...baseActions];
    if (caseSpecificActions[analysis.detection.detectedType]) {
      actions.push(...caseSpecificActions[analysis.detection.detectedType]);
    }

    return actions;
  }

  getRequiredDocuments(caseType) {
    const documentMap = {
      housing: [
        'Tenancy Agreement',
        'Rent Payment Records',
        'Correspondence with Landlord',
        'Property Condition Photos',
        'Eviction Notice (if applicable)'
      ],
      employment: [
        'Employment Contract',
        'Payslips',
        'Correspondence with Employer',
        'Grievance Documents',
        'Witness Statements'
      ],
      consumer: [
        'Receipts/Proof of Purchase',
        'Warranty Information',
        'Correspondence with Trader',
        'Product Photos',
        'Bank Statements'
      ]
    };

    return documentMap[caseType] || [
      'Relevant Documents',
      'Correspondence',
      'Supporting Evidence'
    ];
  }

  assessRiskLevel(analysis) {
    let riskScore = 0;

    // Urgency increases risk
    if (analysis.isUrgent) riskScore += 3;

    // High confidence in case type
    if (analysis.detection.confidence > 70) riskScore += 1;

    // Number of facts found
    riskScore += Math.min(analysis.facts.length, 3);

    // Case-specific risk factors
    const highRiskCases = ['housing', 'employment'];
    if (highRiskCases.includes(analysis.detection.detectedType)) {
      riskScore += 2;
    }

    if (riskScore >= 7) return 'high';
    if (riskScore >= 4) return 'medium';
    return 'low';
  }

  identifyRiskFactors(analysis) {
    const riskFactors = [];

    if (analysis.isUrgent) {
      riskFactors.push({
        type: 'urgency',
        description: 'Time-sensitive matter requiring immediate attention',
        severity: 'high'
      });
    }

    if (analysis.facts.some(fact => fact.type === 'money')) {
      riskFactors.push({
        type: 'financial',
        description: 'Financial implications identified',
        severity: 'medium'
      });
    }

    if (analysis.detection.detectedType === 'housing') {
      riskFactors.push({
        type: 'housing_security',
        description: 'Housing security at risk',
        severity: 'high'
      });
    }

    return riskFactors;
  }

  createReminderSchedule(caseType) {
    const now = new Date();
    const schedule = [];

    // 3-day follow-up
    const followUp3Days = new Date(now);
    followUp3Days.setDate(now.getDate() + 3);
    schedule.push({
      type: 'follow_up',
      date: followUp3Days.toISOString(),
      message: 'Check on case progress and update any new information'
    });

    // 1-week reminder
    const weekReminder = new Date(now);
    weekReminder.setDate(now.getDate() + 7);
    schedule.push({
      type: 'progress_check',
      date: weekReminder.toISOString(),
      message: 'Review case progress and take next steps'
    });

    return schedule;
  }

  calculateCaseCompleteness(caseEntity) {
    let completeness = 0;
    let totalChecks = 0;

    // Basic information (20%)
    totalChecks += 4;
    if (caseEntity.title) completeness += 1;
    if (caseEntity.type) completeness += 1;
    if (caseEntity.facts.length > 0) completeness += 1;
    if (caseEntity.priority) completeness += 1;

    // Facts quality (30%)
    totalChecks += 3;
    if (caseEntity.facts.length >= 3) completeness += 1;
    if (caseEntity.facts.some(f => f.type === 'money')) completeness += 1;
    if (caseEntity.facts.some(f => f.type === 'date')) completeness += 1;

    // Documents (30%)
    totalChecks += 3;
    // These will be updated as documents are uploaded

    // Action plan (20%)
    totalChecks += 2;
    if (caseEntity.recommendedActions.length > 0) completeness += 1;
    // Progress will be updated as actions are completed

    return Math.round((completeness / totalChecks) * 100);
  }

  // Memory MCP integration methods
  async updateCaseInMemory(caseEntity) {
    try {
      await window.mcp__memory__add_observations({
        observations: [{
          entityName: caseEntity.id,
          contents: [
            `Enhanced case created: ${new Date().toISOString()}`,
            `Monitoring enabled: true`,
            `Progress stages: ${caseEntity.progressStages.length}`,
            `Risk level: ${caseEntity.riskLevel}`,
            `Required documents: ${caseEntity.requiredDocuments.length}`,
            `Recommended actions: ${caseEntity.recommendedActions.length}`
          ]
        }]
      });
    } catch (error) {
      console.warn('⚠️ Failed to update case in memory MCP:', error);
    }
  }

  async storeCaseTimeline(caseId, timeline) {
    try {
      const timelineEntity = {
        name: `${caseId}-timeline`,
        entityType: 'case_timeline',
        observations: timeline.map(entry =>
          `${entry.timestamp}: ${entry.title} - ${entry.description}`
        )
      };

      await window.mcp__memory__create_entities({ entities: [timelineEntity] });
    } catch (error) {
      console.warn('⚠️ Failed to store timeline in memory MCP:', error);
    }
  }

  async storeCaseStatistics(caseId, statistics) {
    try {
      const statsEntity = {
        name: `${caseId}-statistics`,
        entityType: 'case_statistics',
        observations: [
          `Overall progress: ${statistics.overallProgress}%`,
          `Facts collected: ${statistics.factsCollected}`,
          `Case completeness: ${statistics.caseCompleteness}%`,
          `Risk level: ${statistics.riskLevel}`,
          `Created: ${statistics.createdAt}`
        ]
      };

      await window.mcp__memory__create_entities({ entities: [statsEntity] });
    } catch (error) {
      console.warn('⚠️ Failed to store statistics in memory MCP:', error);
    }
  }

  // Public API for case monitoring
  async getAllCases(userId = 'default-user') {
    const cases = [];

    // Get from local cache first
    for (const [caseId, caseData] of this.caseStorage) {
      if (caseData.userId === userId) {
        cases.push(caseData);
      }
    }

    // Also try to get from memory MCP
    try {
      const memoryResult = await window.mcp__memory__search_nodes({
        query: `user ${userId} legal_case`
      });
      // Parse and merge with local cache
    } catch (error) {
      console.warn('⚠️ Failed to fetch cases from memory MCP:', error);
    }

    return cases.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
  }

  async getCaseById(caseId) {
    return this.caseStorage.get(caseId);
  }

  async updateCaseProgress(caseId, progressData) {
    const caseEntity = this.caseStorage.get(caseId);
    if (!caseEntity) return null;

    // Update case data
    Object.assign(caseEntity, progressData, {
      lastActivity: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    });

    // Update statistics
    const stats = this.caseStatistics.get(caseId);
    if (stats) {
      stats.lastActivity = new Date().toISOString();
      stats.totalInteractions += 1;
      stats.overallProgress = this.calculateCaseCompleteness(caseEntity);
    }

    // Add timeline entry
    const timeline = this.caseTimelines.get(caseId);
    if (timeline) {
      timeline.push({
        id: `timeline-${Date.now()}`,
        type: 'progress_update',
        title: 'Case Updated',
        description: 'Case information and progress updated',
        timestamp: new Date().toISOString(),
        automated: false,
        importance: 'medium',
        icon: '📝'
      });
    }

    return caseEntity;
  }
}

export default EnhancedCaseManager;