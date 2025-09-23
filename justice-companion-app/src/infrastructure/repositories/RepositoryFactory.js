/**
 * RepositoryFactory - Infrastructure Layer Factory
 *
 * Factory pattern implementation for creating repository instances.
 * Provides configuration-based repository selection and dependency injection.
 *
 * Features:
 * - Multiple backend support (SQLite, InMemory for testing)
 * - Configuration-driven repository selection
 * - Dependency injection for security manager and database
 * - Singleton pattern for performance
 * - Environment-based configuration
 */

const SQLiteCaseRepository = require('./sqlite/SQLiteCaseRepository');
const SQLiteClientRepository = require('./sqlite/SQLiteClientRepository');
const InMemoryCaseRepository = require('./memory/InMemoryCaseRepository');
const InMemoryClientRepository = require('./memory/InMemoryClientRepository');

class RepositoryFactory {
    constructor() {
        this.repositories = new Map();
        this.config = {
            backend: process.env.REPOSITORY_BACKEND || 'sqlite',
            testMode: process.env.NODE_ENV === 'test'
        };
        
        this.database = null;
        this.securityManager = null;
        this.initialized = false;
    }

    /**
     * Initialize factory with dependencies
     * @param {Object} database - Database instance
     * @param {Object} securityManager - Security manager instance
     * @param {Object} options - Configuration options
     */
    initialize(database, securityManager, options = {}) {
        this.database = database;
        this.securityManager = securityManager;
        
        // Override configuration if provided
        if (options.backend) {
            this.config.backend = options.backend;
        }
        
        if (options.testMode !== undefined) {
            this.config.testMode = options.testMode;
        }

        this.initialized = true;
        
        this._auditLog('REPOSITORY_FACTORY_INITIALIZED', {
            backend: this.config.backend,
            testMode: this.config.testMode
        });
    }

    /**
     * Create or get Case Repository instance
     * @returns {ICaseRepository} Case repository implementation
     */
    createCaseRepository() {
        this._ensureInitialized();
        
        const key = 'caseRepository';
        
        if (this.repositories.has(key)) {
            return this.repositories.get(key);
        }

        let repository;
        
        if (this.config.testMode || this.config.backend === 'memory') {
            repository = new InMemoryCaseRepository(this.securityManager);
            this._auditLog('CASE_REPOSITORY_CREATED', {
                implementation: 'InMemoryCase',
                testMode: true
            });
        } else if (this.config.backend === 'sqlite') {
            repository = new SQLiteCaseRepository(this.database, this.securityManager);
            this._auditLog('CASE_REPOSITORY_CREATED', {
                implementation: 'SQLiteCase',
                production: true
            });
        } else {
            throw new Error(`Unsupported repository backend: ${this.config.backend}`);
        }

        // Cache the repository instance
        this.repositories.set(key, repository);
        
        return repository;
    }

    /**
     * Create or get Client Repository instance
     * @returns {IClientRepository} Client repository implementation
     */
    createClientRepository() {
        this._ensureInitialized();
        
        const key = 'clientRepository';
        
        if (this.repositories.has(key)) {
            return this.repositories.get(key);
        }

        let repository;
        
        if (this.config.testMode || this.config.backend === 'memory') {
            repository = new InMemoryClientRepository(this.securityManager);
            this._auditLog('CLIENT_REPOSITORY_CREATED', {
                implementation: 'InMemoryClient',
                testMode: true
            });
        } else if (this.config.backend === 'sqlite') {
            repository = new SQLiteClientRepository(this.database, this.securityManager);
            this._auditLog('CLIENT_REPOSITORY_CREATED', {
                implementation: 'SQLiteClient',
                production: true
            });
        } else {
            throw new Error(`Unsupported repository backend: ${this.config.backend}`);
        }

        // Cache the repository instance
        this.repositories.set(key, repository);
        
        return repository;
    }

    /**
     * Create repository bundle with all implementations
     * @returns {Object} Object containing all repository instances
     */
    createRepositoryBundle() {
        return {
            caseRepository: this.createCaseRepository(),
            clientRepository: this.createClientRepository()
        };
    }

    /**
     * Get repository by type
     * @param {string} repositoryType - Type of repository (case, client)
     * @returns {Object} Repository instance
     */
    getRepository(repositoryType) {
        switch (repositoryType.toLowerCase()) {
            case 'case':
            case 'cases':
            case 'caserepository':
                return this.createCaseRepository();
                
            case 'client':
            case 'clients':
            case 'clientrepository':
                return this.createClientRepository();
                
            default:
                throw new Error(`Unknown repository type: ${repositoryType}`);
        }
    }

    /**
     * Reset factory state (useful for testing)
     */
    reset() {
        this.repositories.clear();
        this.database = null;
        this.securityManager = null;
        this.initialized = false;
        
        this._auditLog('REPOSITORY_FACTORY_RESET', {
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Configure factory settings
     * @param {Object} newConfig - New configuration
     */
    configure(newConfig) {
        const oldConfig = { ...this.config };
        
        this.config = {
            ...this.config,
            ...newConfig
        };

        // Clear cached repositories if backend changed
        if (oldConfig.backend !== this.config.backend) {
            this.repositories.clear();
            this._auditLog('REPOSITORY_FACTORY_RECONFIGURED', {
                oldBackend: oldConfig.backend,
                newBackend: this.config.backend,
                repositoriesCleared: true
            });
        }
    }

    /**
     * Get current configuration
     * @returns {Object} Current configuration
     */
    getConfiguration() {
        return { ...this.config };
    }

    /**
     * Get factory statistics
     * @returns {Object} Factory statistics
     */
    getStatistics() {
        return {
            initialized: this.initialized,
            backend: this.config.backend,
            testMode: this.config.testMode,
            cachedRepositories: Array.from(this.repositories.keys()),
            repositoryCount: this.repositories.size
        };
    }

    /**
     * Validate factory configuration
     * @returns {Object} Validation result
     */
    validateConfiguration() {
        const errors = [];
        const warnings = [];

        // Check backend support
        const supportedBackends = ['sqlite', 'memory'];
        if (!supportedBackends.includes(this.config.backend)) {
            errors.push(`Unsupported backend: ${this.config.backend}`);
        }

        // Check initialization
        if (!this.initialized) {
            warnings.push('Factory not initialized - call initialize() first');
        }

        // Check dependencies
        if (this.initialized) {
            if (!this.database && this.config.backend === 'sqlite') {
                errors.push('Database instance required for SQLite backend');
            }
            
            if (!this.securityManager) {
                errors.push('Security manager instance required');
            }
        }

        // Environment checks
        if (this.config.testMode && this.config.backend !== 'memory') {
            warnings.push('Consider using memory backend for test mode');
        }

        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings,
            checkedAt: new Date().toISOString()
        };
    }

    /**
     * Create repositories with specific configuration
     * @param {Object} specificConfig - Configuration for this creation
     * @returns {Object} Repository bundle
     */
    createWithConfig(specificConfig) {
        // Temporarily store current config
        const originalConfig = { ...this.config };
        
        try {
            // Apply specific configuration
            this.configure(specificConfig);
            
            // Create repositories with new config
            const repositories = this.createRepositoryBundle();
            
            this._auditLog('REPOSITORIES_CREATED_WITH_CONFIG', {
                config: specificConfig,
                temporary: true
            });
            
            return repositories;
        } finally {
            // Restore original configuration
            this.configure(originalConfig);
        }
    }

    /**
     * Preload repositories (initialize all supported types)
     * @returns {Object} All repository instances
     */
    preloadRepositories() {
        this._ensureInitialized();
        
        const repositories = {
            caseRepository: this.createCaseRepository(),
            clientRepository: this.createClientRepository()
        };

        this._auditLog('REPOSITORIES_PRELOADED', {
            repositoryTypes: Object.keys(repositories),
            backend: this.config.backend
        });

        return repositories;
    }

    /**
     * Test repository connections
     * @returns {Promise<Object>} Test results
     */
    async testConnections() {
        this._ensureInitialized();
        
        const results = {
            caseRepository: { connected: false, error: null },
            clientRepository: { connected: false, error: null }
        };

        // Test case repository
        try {
            const caseRepo = this.createCaseRepository();
            // Attempt a basic operation to test connection
            await caseRepo.getStatistics();
            results.caseRepository.connected = true;
        } catch (error) {
            results.caseRepository.error = error.message;
        }

        // Test client repository
        try {
            const clientRepo = this.createClientRepository();
            // Attempt a basic operation to test connection
            await clientRepo.getStatistics();
            results.clientRepository.connected = true;
        } catch (error) {
            results.clientRepository.error = error.message;
        }

        this._auditLog('REPOSITORY_CONNECTIONS_TESTED', {
            caseRepoConnected: results.caseRepository.connected,
            clientRepoConnected: results.clientRepository.connected,
            hasErrors: !results.caseRepository.connected || !results.clientRepository.connected
        });

        return results;
    }

    /**
     * Clear all repository caches
     */
    clearAllCaches() {
        for (const [key, repository] of this.repositories) {
            if (repository.clearCache && typeof repository.clearCache === 'function') {
                repository.clearCache();
            }
        }

        this._auditLog('ALL_REPOSITORY_CACHES_CLEARED', {
            repositoryCount: this.repositories.size
        });
    }

    /**
     * Get health status of all repositories
     * @returns {Promise<Object>} Health status
     */
    async getHealthStatus() {
        const health = {
            factory: {
                initialized: this.initialized,
                backend: this.config.backend,
                repositoryCount: this.repositories.size
            },
            repositories: {},
            overall: 'healthy'
        };

        // Check each repository
        for (const [key, repository] of this.repositories) {
            try {
                // Basic health check - call a lightweight method
                if (repository.getCacheStats && typeof repository.getCacheStats === 'function') {
                    const cacheStats = repository.getCacheStats();
                    health.repositories[key] = {
                        status: 'healthy',
                        cacheSize: cacheStats.size
                    };
                } else {
                    health.repositories[key] = {
                        status: 'healthy',
                        note: 'Cache stats not available'
                    };
                }
            } catch (error) {
                health.repositories[key] = {
                    status: 'unhealthy',
                    error: error.message
                };
                health.overall = 'degraded';
            }
        }

        // Check if any repositories are unhealthy
        const unhealthyRepos = Object.values(health.repositories)
            .filter(repo => repo.status === 'unhealthy');
        
        if (unhealthyRepos.length > 0) {
            health.overall = 'unhealthy';
        }

        return health;
    }

    // =====================
    // PRIVATE HELPER METHODS
    // =====================

    /**
     * Ensure factory is initialized
     * @private
     */
    _ensureInitialized() {
        if (!this.initialized) {
            throw new Error('RepositoryFactory must be initialized before use. Call initialize() first.');
        }
    }

    /**
     * Audit logging helper
     * @private
     */
    _auditLog(action, details) {
        if (this.securityManager && this.securityManager.auditLog) {
            this.securityManager.auditLog('REPOSITORY_FACTORY', action, details);
        }
    }
}

// Export singleton instance
const repositoryFactory = new RepositoryFactory();

// Static methods for easy access
RepositoryFactory.getInstance = () => repositoryFactory;

RepositoryFactory.create = (database, securityManager, options = {}) => {
    if (!repositoryFactory.initialized) {
        repositoryFactory.initialize(database, securityManager, options);
    }
    return repositoryFactory;
};

RepositoryFactory.createCaseRepository = () => {
    return repositoryFactory.createCaseRepository();
};

RepositoryFactory.createClientRepository = () => {
    return repositoryFactory.createClientRepository();
};

RepositoryFactory.createBundle = () => {
    return repositoryFactory.createRepositoryBundle();
};

module.exports = RepositoryFactory;