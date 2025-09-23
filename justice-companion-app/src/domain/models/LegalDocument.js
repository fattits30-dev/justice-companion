/**
 * LegalDocument Domain Model
 * Represents legal documents in the Justice Companion system
 */

class LegalDocument {
  constructor(data = {}) {
    this.id = data.id;
    this.caseId = data.caseId;
    this.type = data.type || 'letter';
    this.title = data.title;
    this.content = data.content;
    this.template = data.template;
    this.metadata = data.metadata || {};
    this.isPrivileged = data.isPrivileged || false;
    this.status = data.status || 'draft';
    this.version = data.version || 1;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.author = data.author;
    this.recipients = data.recipients || [];
    this.attachments = data.attachments || [];
  }

  isDraft() {
    return this.status === 'draft';
  }

  isFinal() {
    return this.status === 'final';
  }

  canEdit() {
    return this.status !== 'final' && this.status !== 'sent';
  }

  getPreview(maxLength = 500) {
    if (!this.content) return '';
    return this.content.length > maxLength
      ? this.content.substring(0, maxLength) + '...'
      : this.content;
  }

  toJSON() {
    return {
      id: this.id,
      caseId: this.caseId,
      type: this.type,
      title: this.title,
      content: this.content,
      template: this.template,
      metadata: this.metadata,
      isPrivileged: this.isPrivileged,
      status: this.status,
      version: this.version,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      author: this.author,
      recipients: this.recipients,
      attachments: this.attachments
    };
  }

  validate() {
    const errors = [];

    if (!this.title || this.title.trim() === '') {
      errors.push('Document title is required');
    }

    if (!this.type) {
      errors.push('Document type is required');
    }

    const validTypes = ['letter', 'complaint', 'appeal', 'notice', 'agreement', 'claim', 'response', 'statement'];
    if (!validTypes.includes(this.type)) {
      errors.push(`Invalid document type: ${this.type}`);
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  updateContent(newContent) {
    if (!this.canEdit()) {
      throw new Error('Cannot edit finalized document');
    }

    this.content = newContent;
    this.updatedAt = new Date();
    this.version++;
  }

  finalize() {
    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(`Cannot finalize invalid document: ${validation.errors.join(', ')}`);
    }

    this.status = 'final';
    this.updatedAt = new Date();
  }

  addAttachment(attachment) {
    this.attachments.push({
      name: attachment.name,
      type: attachment.type,
      size: attachment.size,
      path: attachment.path,
      addedAt: new Date()
    });
    this.updatedAt = new Date();
  }

  static getDocumentTypes() {
    return [
      { value: 'letter', label: 'Letter', description: 'General correspondence' },
      { value: 'complaint', label: 'Complaint', description: 'Formal complaint letter' },
      { value: 'appeal', label: 'Appeal', description: 'Appeal against a decision' },
      { value: 'notice', label: 'Notice', description: 'Legal notice or notification' },
      { value: 'agreement', label: 'Agreement', description: 'Settlement or agreement document' },
      { value: 'claim', label: 'Claim', description: 'Legal claim or demand' },
      { value: 'response', label: 'Response', description: 'Response to correspondence' },
      { value: 'statement', label: 'Statement', description: 'Witness or personal statement' }
    ];
  }
}

module.exports = { LegalDocument };