/**
 * CaseStatus Value Object
 * Represents the status of a legal case
 */

class CaseStatus {
  static ACTIVE = 'active';
  static PENDING = 'pending';
  static ON_HOLD = 'on_hold';
  static CLOSED = 'closed';
  static ARCHIVED = 'archived';
  static DRAFT = 'draft';
  static REVIEW = 'review';
  static AWAITING_RESPONSE = 'awaiting_response';
  static IN_PROGRESS = 'in_progress';
  static RESOLVED = 'resolved';

  constructor(value) {
    if (!CaseStatus.isValid(value)) {
      throw new Error(`Invalid case status: ${value}`);
    }
    this.value = value;
  }

  /**
   * Get all valid statuses
   */
  static getAllStatuses() {
    return [
      CaseStatus.ACTIVE,
      CaseStatus.PENDING,
      CaseStatus.ON_HOLD,
      CaseStatus.CLOSED,
      CaseStatus.ARCHIVED,
      CaseStatus.DRAFT,
      CaseStatus.REVIEW,
      CaseStatus.AWAITING_RESPONSE,
      CaseStatus.IN_PROGRESS,
      CaseStatus.RESOLVED
    ];
  }

  /**
   * Check if a status is valid
   */
  static isValid(status) {
    return CaseStatus.getAllStatuses().includes(status);
  }

  /**
   * Get status display label
   */
  static getLabel(status) {
    const labels = {
      'active': 'Active',
      'pending': 'Pending',
      'on_hold': 'On Hold',
      'closed': 'Closed',
      'archived': 'Archived',
      'draft': 'Draft',
      'review': 'Under Review',
      'awaiting_response': 'Awaiting Response',
      'in_progress': 'In Progress',
      'resolved': 'Resolved'
    };
    return labels[status] || status;
  }

  /**
   * Get status color for UI
   */
  static getColor(status) {
    const colors = {
      'active': '#28a745',      // Green
      'pending': '#ffc107',      // Yellow
      'on_hold': '#fd7e14',      // Orange
      'closed': '#6c757d',       // Gray
      'archived': '#343a40',     // Dark Gray
      'draft': '#17a2b8',        // Cyan
      'review': '#007bff',       // Blue
      'awaiting_response': '#e83e8c', // Pink
      'in_progress': '#20c997',  // Teal
      'resolved': '#5a6268'      // Medium Gray
    };
    return colors[status] || '#6c757d';
  }

  /**
   * Get status icon
   */
  static getIcon(status) {
    const icons = {
      'active': '🟢',
      'pending': '🟡',
      'on_hold': '⏸️',
      'closed': '🔒',
      'archived': '📦',
      'draft': '📝',
      'review': '🔍',
      'awaiting_response': '⏳',
      'in_progress': '⚙️',
      'resolved': '✅'
    };
    return icons[status] || '📋';
  }

  /**
   * Check if status represents an open case
   */
  static isOpen(status) {
    return [
      CaseStatus.ACTIVE,
      CaseStatus.PENDING,
      CaseStatus.ON_HOLD,
      CaseStatus.DRAFT,
      CaseStatus.REVIEW,
      CaseStatus.AWAITING_RESPONSE,
      CaseStatus.IN_PROGRESS
    ].includes(status);
  }

  /**
   * Check if status represents a closed case
   */
  static isClosed(status) {
    return [
      CaseStatus.CLOSED,
      CaseStatus.ARCHIVED,
      CaseStatus.RESOLVED
    ].includes(status);
  }

  /**
   * Get allowed transitions from a status
   */
  static getAllowedTransitions(fromStatus) {
    const transitions = {
      'draft': ['active', 'pending', 'archived'],
      'active': ['pending', 'on_hold', 'in_progress', 'awaiting_response', 'resolved', 'closed'],
      'pending': ['active', 'on_hold', 'in_progress', 'closed'],
      'on_hold': ['active', 'pending', 'closed'],
      'in_progress': ['active', 'pending', 'awaiting_response', 'review', 'resolved', 'closed'],
      'awaiting_response': ['active', 'in_progress', 'on_hold', 'resolved', 'closed'],
      'review': ['active', 'resolved', 'closed'],
      'resolved': ['closed', 'archived', 'active'],
      'closed': ['archived', 'active'],
      'archived': ['active'] // Can be reopened
    };
    return transitions[fromStatus] || [];
  }

  /**
   * Check if transition is allowed
   */
  static canTransition(fromStatus, toStatus) {
    return CaseStatus.getAllowedTransitions(fromStatus).includes(toStatus);
  }

  /**
   * Get status priority for sorting
   */
  static getPriority(status) {
    const priorities = {
      'active': 1,
      'in_progress': 2,
      'awaiting_response': 3,
      'pending': 4,
      'review': 5,
      'on_hold': 6,
      'draft': 7,
      'resolved': 8,
      'closed': 9,
      'archived': 10
    };
    return priorities[status] || 99;
  }

  /**
   * Value object methods
   */
  toString() {
    return this.value;
  }

  equals(other) {
    if (!other || !(other instanceof CaseStatus)) {
      return false;
    }
    return this.value === other.value;
  }

  getLabel() {
    return CaseStatus.getLabel(this.value);
  }

  getColor() {
    return CaseStatus.getColor(this.value);
  }

  getIcon() {
    return CaseStatus.getIcon(this.value);
  }

  isOpen() {
    return CaseStatus.isOpen(this.value);
  }

  isClosed() {
    return CaseStatus.isClosed(this.value);
  }

  canTransitionTo(toStatus) {
    return CaseStatus.canTransition(this.value, toStatus);
  }
}

module.exports = CaseStatus;
