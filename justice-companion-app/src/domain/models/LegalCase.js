/**
 * LegalCase Domain Model
 * Core entity representing a legal case in the Justice Companion system
 */

const { CaseNote } = require('./CaseNote');
const { LegalDocument } = require('./LegalDocument');

class LegalCase {
  constructor(data = {}) {
    this.id = data.id;
    this.clientId = data.clientId;
    this.title = data.title || 'Untitled Case';
    this.description = data.description || '';
    this.category = data.category || 'general';
    this.status = data.status || 'active';
    this.urgency = data.urgency || 'normal';
    this.priority = data.priority || 'medium';

    // Collections
    this.notes = data.notes || [];
    this.documents = data.documents || [];
    this.timeline = data.timeline || [];
    this.parties = data.parties || [];
    this.evidence = data.evidence || [];

    // Legal specifics
    this.jurisdiction = data.jurisdiction || 'England & Wales';
    this.courtReference = data.courtReference;
    this.legalDeadlines = data.legalDeadlines || [];
    this.applicableLaws = data.applicableLaws || [];
    this.potentialClaims = data.potentialClaims || [];

    // Metadata
    this.metadata = data.metadata || {};
    this.tags = data.tags || [];
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.lastAccessedAt = data.lastAccessedAt || new Date();
    this.archivedAt = data.archivedAt;
    this.closedAt = data.closedAt;

    // Security
    this.isConfidential = data.isConfidential || false;
    this.accessControl = data.accessControl || [];
    this.encryptionStatus = data.encryptionStatus || false;
  }

  /**
   * Add a note to the case
   */
  addNote(noteData) {
    const note = new CaseNote({
      ...noteData,
      caseId: this.id,
      createdAt: new Date()
    });

    this.notes.push(note);
    this.updateTimestamp();
    this.addTimelineEntry('note_added', `Note added: ${note.type}`);

    return note;
  }

  /**
   * Add a document to the case
   */
  addDocument(documentData) {
    const document = new LegalDocument({
      ...documentData,
      caseId: this.id,
      createdAt: new Date()
    });

    this.documents.push(document);
    this.updateTimestamp();
    this.addTimelineEntry('document_added', `Document added: ${document.type}`);

    return document;
  }

  /**
   * Add a timeline entry
   */
  addTimelineEntry(eventType, description, metadata = {}) {
    const entry = {
      id: this.generateTimelineId(),
      timestamp: new Date(),
      eventType,
      description,
      metadata,
      author: metadata.author || 'system'
    };

    this.timeline.push(entry);
    return entry;
  }

  /**
   * Add a legal deadline
   */
  addDeadline(deadline) {
    const deadlineEntry = {
      id: this.generateDeadlineId(),
      date: deadline.date,
      description: deadline.description,
      type: deadline.type || 'general',
      priority: deadline.priority || 'normal',
      completed: false,
      createdAt: new Date()
    };

    this.legalDeadlines.push(deadlineEntry);
    this.updateTimestamp();
    this.addTimelineEntry('deadline_added', `Deadline: ${deadline.description}`);

    return deadlineEntry;
  }

  /**
   * Update case status
   */
  updateStatus(newStatus, reason = '') {
    const oldStatus = this.status;
    this.status = newStatus;
    this.updateTimestamp();

    this.addTimelineEntry('status_changed', `Status changed from ${oldStatus} to ${newStatus}`, {
      oldStatus,
      newStatus,
      reason
    });

    // Handle special statuses
    if (newStatus === 'closed') {
      this.closedAt = new Date();
    } else if (newStatus === 'archived') {
      this.archivedAt = new Date();
    }

    return this;
  }

  /**
   * Check if case is active
   */
  isActive() {
    return this.status === 'active' || this.status === 'pending';
  }

  /**
   * Check if case is urgent
   */
  isUrgent() {
    return this.urgency === 'critical' || this.urgency === 'high';
  }

  /**
   * Check if case has upcoming deadlines
   */
  hasUpcomingDeadlines(withinDays = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + withinDays);

    return this.legalDeadlines.some(deadline => {
      const deadlineDate = new Date(deadline.date);
      return !deadline.completed && deadlineDate <= futureDate && deadlineDate >= new Date();
    });
  }

  /**
   * Get case age in days
   */
  getAgeInDays() {
    const now = new Date();
    const created = new Date(this.createdAt);
    const diffTime = Math.abs(now - created);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate case complexity score
   */
  calculateComplexity() {
    let score = 0;

    // Base complexity by category
    const categoryScores = {
      'housing': 3,
      'employment': 4,
      'consumer': 2,
      'council': 3,
      'insurance': 3,
      'debt': 4,
      'benefits': 3,
      'general': 2
    };
    score += categoryScores[this.category] || 2;

    // Add complexity for documents and evidence
    score += Math.min(this.documents.length * 0.5, 3);
    score += Math.min(this.evidence.length * 0.3, 2);

    // Add complexity for multiple parties
    score += Math.min(this.parties.length * 0.5, 2);

    // Add complexity for legal deadlines
    score += Math.min(this.legalDeadlines.length * 0.5, 2);

    // Urgency factor
    if (this.urgency === 'critical') score += 2;
    if (this.urgency === 'high') score += 1;

    return Math.min(Math.round(score), 10); // Cap at 10
  }

  /**
   * Validate case data
   */
  validate() {
    const errors = [];

    if (!this.clientId) {
      errors.push('Client ID is required');
    }

    if (!this.title || this.title.trim() === '') {
      errors.push('Case title is required');
    }

    const validStatuses = ['active', 'pending', 'on_hold', 'closed', 'archived'];
    if (!validStatuses.includes(this.status)) {
      errors.push(`Invalid status: ${this.status}`);
    }

    const validCategories = ['housing', 'employment', 'consumer', 'council', 'insurance', 'debt', 'benefits', 'general'];
    if (!validCategories.includes(this.category)) {
      errors.push(`Invalid category: ${this.category}`);
    }

    const validUrgencies = ['low', 'normal', 'high', 'critical'];
    if (!validUrgencies.includes(this.urgency)) {
      errors.push(`Invalid urgency: ${this.urgency}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get case summary
   */
  getSummary() {
    return {
      id: this.id,
      title: this.title,
      category: this.category,
      status: this.status,
      urgency: this.urgency,
      noteCount: this.notes.length,
      documentCount: this.documents.length,
      hasDeadlines: this.legalDeadlines.length > 0,
      complexity: this.calculateComplexity(),
      ageInDays: this.getAgeInDays(),
      lastUpdated: this.updatedAt
    };
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.id,
      clientId: this.clientId,
      title: this.title,
      description: this.description,
      category: this.category,
      status: this.status,
      urgency: this.urgency,
      priority: this.priority,
      notes: this.notes.map(n => n instanceof CaseNote ? n.toJSON() : n),
      documents: this.documents.map(d => d instanceof LegalDocument ? d.toJSON() : d),
      timeline: this.timeline,
      parties: this.parties,
      evidence: this.evidence,
      jurisdiction: this.jurisdiction,
      courtReference: this.courtReference,
      legalDeadlines: this.legalDeadlines,
      applicableLaws: this.applicableLaws,
      potentialClaims: this.potentialClaims,
      metadata: this.metadata,
      tags: this.tags,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastAccessedAt: this.lastAccessedAt,
      archivedAt: this.archivedAt,
      closedAt: this.closedAt,
      isConfidential: this.isConfidential,
      accessControl: this.accessControl,
      encryptionStatus: this.encryptionStatus
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(json) {
    return new LegalCase(json);
  }

  /**
   * Clone case
   */
  clone() {
    return new LegalCase(this.toJSON());
  }

  /**
   * Helper: Update timestamp
   */
  updateTimestamp() {
    this.updatedAt = new Date();
    this.lastAccessedAt = new Date();
  }

  /**
   * Helper: Generate timeline ID
   */
  generateTimelineId() {
    return `timeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Helper: Generate deadline ID
   */
  generateDeadlineId() {
    return `deadline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = { LegalCase };