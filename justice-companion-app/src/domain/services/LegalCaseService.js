/**
 * LegalCaseService Domain Service
 * Handles business logic for legal case management
 */

const { CaseNote } = require('../models/CaseNote');
const { LegalDocument } = require('../models/LegalDocument');

class LegalCaseService {
  constructor(caseRepository, securityManager) {
    this.caseRepository = caseRepository;
    this.securityManager = securityManager;
  }

  /**
   * Create a new legal case
   */
  async createCase(caseData, clientId) {
    try {
      // Validate access
      if (this.securityManager) {
        const hasAccess = await this.securityManager.validateAccess(clientId, 'create_case');
        if (!hasAccess) {
          throw new Error('Access denied: Cannot create case');
        }
      }

      // Prepare case data
      const newCase = {
        id: this.generateCaseId(),
        clientId: clientId,
        title: caseData.title || 'New Legal Matter',
        category: caseData.category || 'general',
        description: caseData.description || '',
        status: 'active',
        urgency: caseData.urgency || 'normal',
        notes: [],
        documents: [],
        metadata: {
          ...caseData.metadata,
          createdBy: clientId,
          source: caseData.source || 'chat'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to repository
      if (this.caseRepository) {
        await this.caseRepository.save(newCase);
      }

      return {
        success: true,
        case: this.sanitizeCaseForClient(newCase)
      };

    } catch (error) {
      console.error('Error creating case:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add a note to an existing case
   */
  async addNoteToCase(caseId, noteData, author) {
    try {
      // Validate access
      if (this.securityManager) {
        const hasAccess = await this.securityManager.validateAccess(author, 'add_note', caseId);
        if (!hasAccess) {
          throw new Error('Access denied: Cannot add note to case');
        }
      }

      // Create note
      const note = new CaseNote({
        id: this.generateNoteId(),
        caseId: caseId,
        content: noteData.content,
        author: author,
        type: noteData.type || 'note',
        isPrivileged: noteData.isPrivileged || false,
        metadata: noteData.metadata || {},
        createdAt: new Date()
      });

      // Get case and add note
      const existingCase = await this.caseRepository?.findById(caseId);
      if (!existingCase) {
        throw new Error('Case not found');
      }

      if (!existingCase.notes) {
        existingCase.notes = [];
      }
      existingCase.notes.push(note.toJSON());
      existingCase.updatedAt = new Date();

      // Save updated case
      if (this.caseRepository) {
        await this.caseRepository.update(caseId, existingCase);
      }

      return {
        success: true,
        note: note.toJSON()
      };

    } catch (error) {
      console.error('Error adding note to case:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get case by ID
   */
  async getCaseById(caseId, clientId) {
    try {
      // Validate access
      if (this.securityManager) {
        const hasAccess = await this.securityManager.validateAccess(clientId, 'read_case', caseId);
        if (!hasAccess) {
          throw new Error('Access denied: Cannot read case');
        }
      }

      const caseData = await this.caseRepository?.findById(caseId);
      if (!caseData) {
        throw new Error('Case not found');
      }

      // Check ownership
      if (caseData.clientId !== clientId) {
        throw new Error('Access denied: Case belongs to different client');
      }

      return {
        success: true,
        case: this.sanitizeCaseForClient(caseData)
      };

    } catch (error) {
      console.error('Error getting case:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update case status
   */
  async updateCaseStatus(caseId, newStatus, clientId) {
    try {
      // Validate access
      if (this.securityManager) {
        const hasAccess = await this.securityManager.validateAccess(clientId, 'update_case', caseId);
        if (!hasAccess) {
          throw new Error('Access denied: Cannot update case');
        }
      }

      const caseData = await this.caseRepository?.findById(caseId);
      if (!caseData) {
        throw new Error('Case not found');
      }

      // Update status
      caseData.status = newStatus;
      caseData.updatedAt = new Date();

      // Add status change note
      const statusNote = new CaseNote({
        id: this.generateNoteId(),
        caseId: caseId,
        content: `Case status changed to: ${newStatus}`,
        author: 'system',
        type: 'status_change',
        metadata: {
          previousStatus: caseData.status,
          newStatus: newStatus,
          changedBy: clientId
        }
      });

      if (!caseData.notes) caseData.notes = [];
      caseData.notes.push(statusNote.toJSON());

      // Save
      if (this.caseRepository) {
        await this.caseRepository.update(caseId, caseData);
      }

      return {
        success: true,
        case: this.sanitizeCaseForClient(caseData)
      };

    } catch (error) {
      console.error('Error updating case status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all cases for a client
   */
  async getClientCases(clientId, filters = {}) {
    try {
      // Validate access
      if (this.securityManager) {
        const hasAccess = await this.securityManager.validateAccess(clientId, 'list_cases');
        if (!hasAccess) {
          throw new Error('Access denied: Cannot list cases');
        }
      }

      const cases = await this.caseRepository?.findByClientId(clientId) || [];

      // Apply filters
      let filteredCases = cases;
      if (filters.status) {
        filteredCases = filteredCases.filter(c => c.status === filters.status);
      }
      if (filters.category) {
        filteredCases = filteredCases.filter(c => c.category === filters.category);
      }
      if (filters.urgency) {
        filteredCases = filteredCases.filter(c => c.urgency === filters.urgency);
      }

      // Sort by date (most recent first)
      filteredCases.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      return {
        success: true,
        cases: filteredCases.map(c => this.sanitizeCaseForClient(c))
      };

    } catch (error) {
      console.error('Error getting client cases:', error);
      return {
        success: false,
        error: error.message,
        cases: []
      };
    }
  }

  /**
   * Archive a case
   */
  async archiveCase(caseId, clientId, reason) {
    try {
      // Validate access
      if (this.securityManager) {
        const hasAccess = await this.securityManager.validateAccess(clientId, 'archive_case', caseId);
        if (!hasAccess) {
          throw new Error('Access denied: Cannot archive case');
        }
      }

      const caseData = await this.caseRepository?.findById(caseId);
      if (!caseData) {
        throw new Error('Case not found');
      }

      // Archive
      caseData.status = 'archived';
      caseData.archivedAt = new Date();
      caseData.archiveReason = reason;
      caseData.updatedAt = new Date();

      // Add archive note
      const archiveNote = new CaseNote({
        id: this.generateNoteId(),
        caseId: caseId,
        content: `Case archived. Reason: ${reason || 'No reason provided'}`,
        author: 'system',
        type: 'archive',
        metadata: {
          archivedBy: clientId,
          reason: reason
        }
      });

      if (!caseData.notes) caseData.notes = [];
      caseData.notes.push(archiveNote.toJSON());

      // Save
      if (this.caseRepository) {
        await this.caseRepository.update(caseId, caseData);
      }

      return {
        success: true,
        message: 'Case archived successfully'
      };

    } catch (error) {
      console.error('Error archiving case:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search cases by keyword
   */
  async searchCases(clientId, searchTerm) {
    try {
      // Validate access
      if (this.securityManager) {
        const hasAccess = await this.securityManager.validateAccess(clientId, 'search_cases');
        if (!hasAccess) {
          throw new Error('Access denied: Cannot search cases');
        }
      }

      const allCases = await this.caseRepository?.findByClientId(clientId) || [];
      const lowercaseSearch = searchTerm.toLowerCase();

      const matchingCases = allCases.filter(caseData => {
        const searchableText = [
          caseData.title,
          caseData.description,
          caseData.category,
          ...(caseData.notes || []).map(n => n.content)
        ].join(' ').toLowerCase();

        return searchableText.includes(lowercaseSearch);
      });

      return {
        success: true,
        cases: matchingCases.map(c => this.sanitizeCaseForClient(c)),
        count: matchingCases.length
      };

    } catch (error) {
      console.error('Error searching cases:', error);
      return {
        success: false,
        error: error.message,
        cases: []
      };
    }
  }

  /**
   * Get case statistics for a client
   */
  async getCaseStatistics(clientId) {
    try {
      const allCases = await this.caseRepository?.findByClientId(clientId) || [];

      const stats = {
        total: allCases.length,
        byStatus: {},
        byCategory: {},
        byUrgency: {},
        recentActivity: []
      };

      // Calculate statistics
      allCases.forEach(caseData => {
        stats.byStatus[caseData.status] = (stats.byStatus[caseData.status] || 0) + 1;
        stats.byCategory[caseData.category] = (stats.byCategory[caseData.category] || 0) + 1;
        stats.byUrgency[caseData.urgency] = (stats.byUrgency[caseData.urgency] || 0) + 1;
      });

      // Get recent activity (last 5 updated cases)
      const recentCases = [...allCases]
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 5);

      stats.recentActivity = recentCases.map(c => ({
        id: c.id,
        title: c.title,
        category: c.category,
        updatedAt: c.updatedAt
      }));

      return {
        success: true,
        statistics: stats
      };

    } catch (error) {
      console.error('Error getting case statistics:', error);
      return {
        success: false,
        error: error.message,
        statistics: {}
      };
    }
  }

  /**
   * Helper: Generate case ID
   */
  generateCaseId() {
    return `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Helper: Generate note ID
   */
  generateNoteId() {
    return `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Helper: Sanitize case data for client
   */
  sanitizeCaseForClient(caseData) {
    if (!caseData) return null;

    const sanitized = { ...caseData };

    // Remove sensitive internal fields
    delete sanitized.internalNotes;
    delete sanitized.securityMetadata;
    delete sanitized._raw;
    delete sanitized._encryption;

    // Filter privileged notes if needed
    if (sanitized.notes) {
      sanitized.notes = sanitized.notes.filter(note => !note.isPrivileged);
    }

    return sanitized;
  }
}

module.exports = { LegalCaseService };