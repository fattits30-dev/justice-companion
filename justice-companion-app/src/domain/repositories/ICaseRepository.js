/**
 * ICaseRepository Interface
 * Defines the contract for case persistence
 * Domain layer repository interface following DDD principles
 */

class ICaseRepository {
  /**
   * Save a new case
   * @param {Object} caseData - The case data to save
   * @returns {Promise<Object>} The saved case with ID
   */
  async save(caseData) {
    throw new Error('Method save() must be implemented');
  }

  /**
   * Find a case by its ID
   * @param {string} caseId - The case ID
   * @returns {Promise<Object|null>} The case or null if not found
   */
  async findById(caseId) {
    throw new Error('Method findById() must be implemented');
  }

  /**
   * Find all cases for a client
   * @param {string} clientId - The client ID
   * @returns {Promise<Array>} Array of cases
   */
  async findByClientId(clientId) {
    throw new Error('Method findByClientId() must be implemented');
  }

  /**
   * Update an existing case
   * @param {string} caseId - The case ID
   * @param {Object} updates - The updates to apply
   * @returns {Promise<Object>} The updated case
   */
  async update(caseId, updates) {
    throw new Error('Method update() must be implemented');
  }

  /**
   * Delete a case
   * @param {string} caseId - The case ID
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(caseId) {
    throw new Error('Method delete() must be implemented');
  }

  /**
   * Find cases by category
   * @param {string} category - The case category
   * @param {string} clientId - Optional client ID filter
   * @returns {Promise<Array>} Array of cases
   */
  async findByCategory(category, clientId = null) {
    throw new Error('Method findByCategory() must be implemented');
  }

  /**
   * Find cases by status
   * @param {string} status - The case status
   * @param {string} clientId - Optional client ID filter
   * @returns {Promise<Array>} Array of cases
   */
  async findByStatus(status, clientId = null) {
    throw new Error('Method findByStatus() must be implemented');
  }

  /**
   * Search cases by text
   * @param {string} searchTerm - The search term
   * @param {string} clientId - Optional client ID filter
   * @returns {Promise<Array>} Array of matching cases
   */
  async search(searchTerm, clientId = null) {
    throw new Error('Method search() must be implemented');
  }

  /**
   * Count cases for a client
   * @param {string} clientId - The client ID
   * @returns {Promise<number>} Number of cases
   */
  async countByClientId(clientId) {
    throw new Error('Method countByClientId() must be implemented');
  }

  /**
   * Find recent cases
   * @param {number} limit - Maximum number of cases to return
   * @param {string} clientId - Optional client ID filter
   * @returns {Promise<Array>} Array of recent cases
   */
  async findRecent(limit = 10, clientId = null) {
    throw new Error('Method findRecent() must be implemented');
  }

  /**
   * Find urgent cases
   * @param {string} clientId - Optional client ID filter
   * @returns {Promise<Array>} Array of urgent cases
   */
  async findUrgent(clientId = null) {
    throw new Error('Method findUrgent() must be implemented');
  }

  /**
   * Add a note to a case
   * @param {string} caseId - The case ID
   * @param {Object} note - The note to add
   * @returns {Promise<Object>} The updated case
   */
  async addNote(caseId, note) {
    throw new Error('Method addNote() must be implemented');
  }

  /**
   * Add a document to a case
   * @param {string} caseId - The case ID
   * @param {Object} document - The document to add
   * @returns {Promise<Object>} The updated case
   */
  async addDocument(caseId, document) {
    throw new Error('Method addDocument() must be implemented');
  }

  /**
   * Get case statistics
   * @param {string} clientId - Optional client ID filter
   * @returns {Promise<Object>} Statistics object
   */
  async getStatistics(clientId = null) {
    throw new Error('Method getStatistics() must be implemented');
  }

  /**
   * Archive old cases
   * @param {Date} beforeDate - Archive cases older than this date
   * @param {string} clientId - Optional client ID filter
   * @returns {Promise<number>} Number of cases archived
   */
  async archiveOldCases(beforeDate, clientId = null) {
    throw new Error('Method archiveOldCases() must be implemented');
  }

  /**
   * Check if case exists
   * @param {string} caseId - The case ID
   * @returns {Promise<boolean>} True if exists
   */
  async exists(caseId) {
    throw new Error('Method exists() must be implemented');
  }

  /**
   * Begin transaction
   * @returns {Promise<void>}
   */
  async beginTransaction() {
    // Optional: Implement if repository supports transactions
  }

  /**
   * Commit transaction
   * @returns {Promise<void>}
   */
  async commitTransaction() {
    // Optional: Implement if repository supports transactions
  }

  /**
   * Rollback transaction
   * @returns {Promise<void>}
   */
  async rollbackTransaction() {
    // Optional: Implement if repository supports transactions
  }
}

module.exports = ICaseRepository;
