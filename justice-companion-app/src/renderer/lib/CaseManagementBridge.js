// Justice Companion - Case Management Bridge
// Connects EnhancedCaseManager to App state management and Cases view

export class CaseManagementBridge {
  constructor(appSetters) {
    this.setCases = appSetters.setCases;
    this.setCurrentCase = appSetters.setCurrentCase;
    this.setActiveView = appSetters.setActiveView;
    this.enhancedCaseManager = null;
    this.cases = new Map(); // Local cache for cases
  }

  // Initialize with enhanced case manager instance
  setEnhancedCaseManager(enhancedCaseManager) {
    this.enhancedCaseManager = enhancedCaseManager;
    console.log('✅ CaseManagementBridge: Enhanced case manager connected');
  }

  // Bridge method: Create case and update App state
  async createCaseFromChat(userInput, userId = 'default-user') {
    if (!this.enhancedCaseManager) {
      console.error('❌ Enhanced case manager not connected');
      return { success: false, error: 'Case manager not initialized' };
    }

    try {
      console.log('🔄 Bridge: Creating enhanced case from chat input...');

      // Create complete case using enhanced manager
      const caseResult = await this.enhancedCaseManager.createCompleteCase(userInput, userId);

      if (caseResult.success && caseResult.case) {
        // Convert enhanced case to App-compatible format
        const appCase = this.convertToAppCase(caseResult.case, caseResult.analysis);

        // Store in local cache
        this.cases.set(appCase.id, {
          enhanced: caseResult.case,
          app: appCase,
          analysis: caseResult.analysis
        });

        // Update App state
        await this.updateAppCases();
        this.setCurrentCase(appCase);

        console.log('✅ Bridge: Case created and App state updated', {
          caseId: appCase.id,
          type: appCase.type,
          priority: appCase.urgency
        });

        return {
          success: true,
          case: appCase,
          enhanced: caseResult.case,
          analysis: caseResult.analysis
        };
      } else {
        console.log('⚠️ Bridge: Case creation failed or confidence too low');
        return caseResult;
      }

    } catch (error) {
      console.error('❌ Bridge: Case creation failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Convert enhanced case format to App-compatible format
  convertToAppCase(enhancedCase, analysis) {
    return {
      id: enhancedCase.id,
      title: enhancedCase.title,
      type: this.mapCaseTypeToApp(analysis.detection.detectedType),
      description: `${analysis.detection.detectedType} case with ${enhancedCase.facts.length} facts identified`,
      status: 'active',
      urgency: enhancedCase.priority,
      opponent: this.extractOpponent(enhancedCase.facts),
      createdAt: enhancedCase.created,
      facts: enhancedCase.facts.map(fact => ({
        id: fact.id || `fact-${Date.now()}-${Math.random()}`,
        type: fact.type,
        label: fact.label,
        value: fact.value,
        context: fact.context || '',
        verified: fact.verified || false,
        importance: fact.importance || 'medium'
      })),
      documents: [],
      timeline: [],
      // Enhanced fields for monitoring
      enhanced: {
        riskLevel: enhancedCase.riskLevel,
        progressStages: enhancedCase.progressStages,
        currentStage: enhancedCase.currentStage,
        nextDeadline: enhancedCase.nextDeadline,
        completionEstimate: enhancedCase.completionEstimate,
        requiredDocuments: enhancedCase.requiredDocuments,
        recommendedActions: enhancedCase.recommendedActions,
        legalAidContacted: enhancedCase.legalAidContacted,
        monitoringEnabled: true
      }
    };
  }

  // Map enhanced case types to App case types
  mapCaseTypeToApp(detectedType) {
    const typeMap = {
      housing: 'tenancy',
      employment: 'employment',
      consumer: 'consumer',
      family: 'family',
      immigration: 'immigration',
      criminal: 'police',
      welfare: 'benefits',
      general: 'other'
    };

    return typeMap[detectedType] || 'other';
  }

  // Extract opponent from facts
  extractOpponent(facts) {
    const personFact = facts.find(fact =>
      fact.type === 'name' || fact.type === 'person'
    );

    if (personFact) {
      return personFact.value;
    }

    // Try to extract from context
    const landlordFact = facts.find(fact =>
      fact.context && fact.context.toLowerCase().includes('landlord')
    );

    if (landlordFact) {
      return landlordFact.value || 'Landlord';
    }

    return '';
  }

  // Update App cases state from local cache
  async updateAppCases() {
    const appCases = [];

    for (const [caseId, caseData] of this.cases) {
      appCases.push(caseData.app);
    }

    // Sort by creation date (newest first)
    appCases.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Update App state
    this.setCases(appCases);

    console.log(`✅ Bridge: Updated App state with ${appCases.length} cases`);
    return appCases;
  }

  // Get all cases for the Cases view
  async getAllCasesForApp(userId = 'default-user') {
    if (!this.enhancedCaseManager) {
      return [];
    }

    try {
      // Get cases from enhanced manager
      const enhancedCases = await this.enhancedCaseManager.getAllCases(userId);

      // Convert and cache
      for (const enhancedCase of enhancedCases) {
        if (!this.cases.has(enhancedCase.id)) {
          const appCase = this.convertToAppCase(enhancedCase, {
            detection: { detectedType: enhancedCase.type }
          });

          this.cases.set(enhancedCase.id, {
            enhanced: enhancedCase,
            app: appCase,
            analysis: null
          });
        }
      }

      return await this.updateAppCases();

    } catch (error) {
      console.error('❌ Bridge: Failed to get cases:', error);
      return [];
    }
  }

  // Get enhanced case data for monitoring
  getEnhancedCase(caseId) {
    const caseData = this.cases.get(caseId);
    return caseData ? caseData.enhanced : null;
  }

  // Update case progress and sync with App state
  async updateCaseProgress(caseId, progressData) {
    if (!this.enhancedCaseManager) {
      return null;
    }

    try {
      // Update enhanced case
      const updatedEnhanced = await this.enhancedCaseManager.updateCaseProgress(caseId, progressData);

      if (updatedEnhanced && this.cases.has(caseId)) {
        // Update cached data
        const caseData = this.cases.get(caseId);
        caseData.enhanced = updatedEnhanced;
        caseData.app = this.convertToAppCase(updatedEnhanced, caseData.analysis || {
          detection: { detectedType: updatedEnhanced.type }
        });

        // Sync with App state
        await this.updateAppCases();

        console.log('✅ Bridge: Case progress updated and synced');
        return caseData.app;
      }

      return null;

    } catch (error) {
      console.error('❌ Bridge: Failed to update case progress:', error);
      return null;
    }
  }

  // Create new case manually (for "New Case" button)
  async createManualCase(caseData, userId = 'default-user') {
    const caseId = `manual-case-${Date.now()}`;

    const appCase = {
      id: caseId,
      ...caseData,
      createdAt: new Date().toISOString(),
      facts: [],
      documents: [],
      timeline: [],
      enhanced: {
        riskLevel: 'medium',
        progressStages: [],
        currentStage: 'initial_assessment',
        monitoringEnabled: false
      }
    };

    // Cache the manual case
    this.cases.set(caseId, {
      enhanced: null,
      app: appCase,
      analysis: null
    });

    // Update App state
    await this.updateAppCases();
    this.setCurrentCase(appCase);

    console.log('✅ Bridge: Manual case created', caseId);
    return { success: true, case: appCase };
  }

  // Navigate to case monitoring view
  navigateToCaseMonitoring(caseId) {
    const caseData = this.cases.get(caseId);

    if (caseData) {
      this.setCurrentCase(caseData.app);
      this.setActiveView('cases');

      console.log('🔄 Bridge: Navigated to case monitoring', caseId);
      return true;
    }

    console.warn('⚠️ Bridge: Case not found for monitoring', caseId);
    return false;
  }

  // Get case statistics for dashboard
  getCaseStatistics(userId = 'default-user') {
    const userCases = Array.from(this.cases.values())
      .filter(caseData => caseData.app.userId === userId || userId === 'default-user');

    const stats = {
      totalCases: userCases.length,
      activeCases: userCases.filter(c => c.app.status === 'active').length,
      urgentCases: userCases.filter(c => c.app.urgency === 'high' || c.app.urgency === 'critical').length,
      completedCases: userCases.filter(c => c.app.status === 'completed').length,
      caseTypes: {},
      riskLevels: { high: 0, medium: 0, low: 0 },
      averageProgress: 0
    };

    // Count case types
    userCases.forEach(caseData => {
      const type = caseData.app.type;
      stats.caseTypes[type] = (stats.caseTypes[type] || 0) + 1;

      // Count risk levels
      const riskLevel = caseData.enhanced?.riskLevel || 'medium';
      stats.riskLevels[riskLevel] = (stats.riskLevels[riskLevel] || 0) + 1;
    });

    return stats;
  }
}

export default CaseManagementBridge;