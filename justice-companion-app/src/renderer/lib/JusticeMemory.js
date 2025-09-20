// Justice Memory System - The War Journal
// Where every action is remembered, every pattern recognized
// This isn't storage—it's strategic intelligence

class JusticeMemory {
  constructor() {
    this.shortTermMemory = [];  // Last 100 actions
    this.longTermMemory = new Map();  // Patterns and insights
    this.breadcrumbs = [];  // Navigation trail
    this.factCache = new Map();  // Verified facts
    this.thinkingLog = [];  // AI reasoning traces
    this.maxShortTerm = 100;
    this.maxBreadcrumbs = 50;
    
    // Initialize from localStorage if available
    this.loadFromStorage();
    
    // Auto-save every 30 seconds
    setInterval(() => this.saveToStorage(), 30000);
  }

  // =====================
  // MEMORY OPERATIONS
  // =====================
  
  remember(action) {
    const memory = {
      id: this.generateId(),
      timestamp: Date.now(),
      type: action.type,
      data: action.data,
      context: this.getCurrentContext(),
      importance: this.calculateImportance(action)
    };
    
    // Add to short-term
    this.shortTermMemory.unshift(memory);
    if (this.shortTermMemory.length > this.maxShortTerm) {
      const evicted = this.shortTermMemory.pop();
      // Important memories get promoted to long-term
      if (evicted.importance > 7) {
        this.promoteToLongTerm(evicted);
      }
    }
    
    // Update breadcrumbs
    this.addBreadcrumb(action.type, action.data?.title || action.data?.label);
    
    // Pattern recognition
    this.detectPatterns(memory);
    
    return memory.id;
  }
  
  recall(query, limit = 10) {
    // Search both short and long-term memory
    const results = [];
    
    // Search short-term
    for (const memory of this.shortTermMemory) {
      if (this.matchesQuery(memory, query)) {
        results.push(memory);
        if (results.length >= limit) break;
      }
    }
    
    // Search long-term if needed
    if (results.length < limit) {
      for (const [key, memories] of this.longTermMemory) {
        if (key.includes(query.toLowerCase())) {
          results.push(...memories.slice(0, limit - results.length));
          if (results.length >= limit) break;
        }
      }
    }
    
    return results;
  }
  
  forget(memoryId) {
    // Remove specific memory
    this.shortTermMemory = this.shortTermMemory.filter(m => m.id !== memoryId);
    
    for (const [key, memories] of this.longTermMemory) {
      const filtered = memories.filter(m => m.id !== memoryId);
      if (filtered.length !== memories.length) {
        this.longTermMemory.set(key, filtered);
      }
    }
  }
  
  // =====================
  // FACT MANAGEMENT
  // =====================
  
  storeFact(fact) {
    const key = `${fact.type}_${fact.label}`.toLowerCase();
    const storedFact = {
      ...fact,
      id: this.generateId(),
      storedAt: Date.now(),
      verifications: 1,
      lastVerified: Date.now(),
      confidence: 1.0
    };
    
    // If fact exists, increase confidence
    if (this.factCache.has(key)) {
      const existing = this.factCache.get(key);
      existing.verifications++;
      existing.lastVerified = Date.now();
      existing.confidence = Math.min(1.0, existing.confidence + 0.1);
      this.factCache.set(key, existing);
    } else {
      this.factCache.set(key, storedFact);
    }
    
    return storedFact;
  }
  
  getFact(type, label) {
    const key = `${type}_${label}`.toLowerCase();
    return this.factCache.get(key);
  }
  
  getAllFacts(type = null) {
    const facts = [];
    for (const [key, fact] of this.factCache) {
      if (!type || fact.type === type) {
        facts.push(fact);
      }
    }
    return facts.sort((a, b) => b.confidence - a.confidence);
  }
  
  // =====================
  // THINKING/REFLECTION
  // =====================
  
  startThinking(topic) {
    const thought = {
      id: this.generateId(),
      topic,
      startTime: Date.now(),
      steps: [],
      insights: [],
      conclusion: null
    };
    
    this.thinkingLog.push(thought);
    return thought.id;
  }
  
  addThoughtStep(thoughtId, step) {
    const thought = this.thinkingLog.find(t => t.id === thoughtId);
    if (thought) {
      thought.steps.push({
        timestamp: Date.now(),
        content: step,
        type: this.classifyThought(step)
      });
    }
  }
  
  addInsight(thoughtId, insight) {
    const thought = this.thinkingLog.find(t => t.id === thoughtId);
    if (thought) {
      thought.insights.push({
        timestamp: Date.now(),
        content: insight,
        importance: this.rateInsight(insight)
      });
      
      // Important insights become long-term memories
      if (this.rateInsight(insight) > 8) {
        this.promoteToLongTerm({
          type: 'insight',
          data: insight,
          importance: 9,
          timestamp: Date.now()
        });
      }
    }
  }
  
  concludeThinking(thoughtId, conclusion) {
    const thought = this.thinkingLog.find(t => t.id === thoughtId);
    if (thought) {
      thought.conclusion = conclusion;
      thought.endTime = Date.now();
      thought.duration = thought.endTime - thought.startTime;
      
      // Store important conclusions
      this.remember({
        type: 'conclusion',
        data: {
          topic: thought.topic,
          conclusion,
          insights: thought.insights,
          duration: thought.duration
        }
      });
    }
  }
  
  reflect() {
    // Analyze recent activity for patterns and insights
    const recentActions = this.shortTermMemory.slice(0, 20);
    const patterns = {
      commonActions: {},
      timePatterns: {},
      errorPatterns: [],
      successPatterns: []
    };
    
    // Count action types
    recentActions.forEach(memory => {
      patterns.commonActions[memory.type] = (patterns.commonActions[memory.type] || 0) + 1;
      
      // Check for error patterns
      if (memory.type === 'error') {
        patterns.errorPatterns.push(memory);
      }
      
      // Check for success patterns
      if (memory.data?.success || memory.type === 'victory') {
        patterns.successPatterns.push(memory);
      }
    });
    
    // Generate insights
    const insights = [];
    
    if (patterns.errorPatterns.length > 3) {
      insights.push({
        type: 'warning',
        message: 'Multiple errors detected. Consider reviewing error patterns.',
        data: patterns.errorPatterns
      });
    }
    
    if (patterns.successPatterns.length > patterns.errorPatterns.length) {
      insights.push({
        type: 'positive',
        message: 'Success rate is high. Current strategy is working.',
        data: patterns.successPatterns
      });
    }
    
    return {
      patterns,
      insights,
      recommendations: this.generateRecommendations(patterns, insights)
    };
  }
  
  // =====================
  // PATTERN DETECTION
  // =====================
  
  detectPatterns(memory) {
    // Look for repeated sequences
    const recentTypes = this.shortTermMemory.slice(0, 10).map(m => m.type);
    
    // Check for loops (user doing same thing repeatedly)
    if (recentTypes.filter(t => t === memory.type).length > 3) {
      this.addInsight('auto', `Repetitive action detected: ${memory.type}. Consider automation or shortcut.`);
    }
    
    // Check for error-success patterns
    if (memory.type === 'error') {
      const lastSuccess = this.shortTermMemory.find(m => m.type === 'success');
      if (lastSuccess) {
        const timeDiff = memory.timestamp - lastSuccess.timestamp;
        if (timeDiff < 60000) { // Within a minute
          this.addInsight('auto', 'Quick failure after success. Check for state corruption.');
        }
      }
    }
  }
  
  // =====================
  // BREADCRUMBS
  // =====================
  
  addBreadcrumb(action, label = '') {
    this.breadcrumbs.unshift({
      action,
      label,
      timestamp: Date.now()
    });
    
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.pop();
    }
  }
  
  getBreadcrumbs(limit = 10) {
    return this.breadcrumbs.slice(0, limit);
  }
  
  // =====================
  // UTILITIES
  // =====================
  
  getCurrentContext() {
    return {
      view: window.currentView || 'unknown',
      case: window.currentCase?.id || null,
      timestamp: Date.now(),
      breadcrumbs: this.getBreadcrumbs(3)
    };
  }
  
  calculateImportance(action) {
    // Rate importance 1-10
    const importantTypes = ['error', 'victory', 'fact_confirmed', 'case_created', 'document_uploaded'];
    const criticalTypes = ['error', 'crash', 'data_loss'];
    
    if (criticalTypes.includes(action.type)) return 10;
    if (importantTypes.includes(action.type)) return 8;
    if (action.data?.money) return 7;  // Money always important
    if (action.data?.deadline) return 7;  // Deadlines critical
    
    return 5;  // Default medium importance
  }
  
  matchesQuery(memory, query) {
    const searchStr = JSON.stringify(memory).toLowerCase();
    return searchStr.includes(query.toLowerCase());
  }
  
  classifyThought(step) {
    if (step.includes('?')) return 'question';
    if (step.includes('!')) return 'realization';
    if (step.includes('because') || step.includes('therefore')) return 'reasoning';
    if (step.includes('must') || step.includes('should')) return 'decision';
    return 'observation';
  }
  
  rateInsight(insight) {
    // Rate insight importance 1-10
    if (insight.includes('critical') || insight.includes('urgent')) return 10;
    if (insight.includes('important') || insight.includes('key')) return 8;
    if (insight.includes('pattern') || insight.includes('trend')) return 7;
    return 5;
  }
  
  promoteToLongTerm(memory) {
    const key = memory.type.toLowerCase();
    if (!this.longTermMemory.has(key)) {
      this.longTermMemory.set(key, []);
    }
    this.longTermMemory.get(key).push(memory);
  }
  
  generateRecommendations(patterns, insights) {
    const recommendations = [];
    
    if (patterns.errorPatterns.length > 0) {
      recommendations.push('Review error logs and consider adding error recovery');
    }
    
    if (patterns.commonActions.chat > 10) {
      recommendations.push('Heavy chat usage detected. Consider saving frequent responses as templates');
    }
    
    return recommendations;
  }
  
  generateId() {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // =====================
  // PERSISTENCE
  // =====================
  
  saveToStorage() {
    try {
      // Save to electron-store for persistence
      if (window.justiceAPI?.saveMemory) {
        window.justiceAPI.saveMemory({
          shortTerm: this.shortTermMemory.slice(0, 50),  // Last 50 only
          facts: Array.from(this.factCache.entries()),
          breadcrumbs: this.breadcrumbs.slice(0, 20),
          insights: this.thinkingLog.filter(t => t.insights.length > 0)
        });
      }
    } catch (e) {
      console.error('Failed to save memory:', e);
    }
  }
  
  loadFromStorage() {
    try {
      if (window.justiceAPI?.loadMemory) {
        const saved = window.justiceAPI.loadMemory();
        if (saved) {
          this.shortTermMemory = saved.shortTerm || [];
          this.factCache = new Map(saved.facts || []);
          this.breadcrumbs = saved.breadcrumbs || [];
          this.thinkingLog = saved.insights || [];
        }
      }
    } catch (e) {
      console.error('Failed to load memory:', e);
    }
  }
  
  getSnapshot() {
    return {
      shortTermCount: this.shortTermMemory.length,
      longTermCount: Array.from(this.longTermMemory.values()).flat().length,
      factCount: this.factCache.size,
      breadcrumbCount: this.breadcrumbs.length,
      thoughtCount: this.thinkingLog.length
    };
  }
  
  clear() {
    this.shortTermMemory = [];
    this.longTermMemory.clear();
    this.breadcrumbs = [];
    this.factCache.clear();
    this.thinkingLog = [];
    this.saveToStorage();
  }
}

// Initialize the global memory system
if (typeof window !== 'undefined') {
  window.justiceMemory = new JusticeMemory();
  console.log('📊 Memory System: Initialized');
  console.log('Tracking user interactions for improved assistance');
}

export default JusticeMemory;

// This isn't just memory—it's evolution
// Every interaction teaches us
// Every error makes us smarter
// Every victory becomes a template
// We don't just remember—we LEARN
