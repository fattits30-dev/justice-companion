/**
 * CaseNote Domain Model
 * Represents a note or message in a legal case
 */

class CaseNote {
  constructor(data = {}) {
    this.id = data.id;
    this.caseId = data.caseId;
    this.content = data.content;
    this.author = data.author;
    this.type = data.type || 'note';
    this.isPrivileged = data.isPrivileged || false;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  isClientMessage() {
    return this.type === 'client_message';
  }

  isAIResponse() {
    return this.type === 'ai_response';
  }

  toJSON() {
    return {
      id: this.id,
      caseId: this.caseId,
      content: this.content,
      author: this.author,
      type: this.type,
      isPrivileged: this.isPrivileged,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = { CaseNote };