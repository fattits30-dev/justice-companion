/**
 * Infrastructure Layer - Main Export Module
 *
 * Exports all infrastructure layer components for Justice Companion.
 * Provides a single entry point for accessing repositories, database utilities,
 * and infrastructure services.
 *
 * Components:
 * - Repository implementations (SQLite and InMemory)
 * - Repository Factory for dependency injection
 * - Database schema and migration utilities
 * - Infrastructure services and utilities
 */

// Repository Factory
const RepositoryFactory = require('./repositories/RepositoryFactory');

// SQLite Repository Implementations
const SQLiteCaseRepository = require('./repositories/sqlite/SQLiteCaseRepository');
const SQLiteClientRepository = require('./repositories/sqlite/SQLiteClientRepository');

// In-Memory Repository Implementations (for testing)
const InMemoryCaseRepository = require('./repositories/memory/InMemoryCaseRepository');
const InMemoryClientRepository = require('./repositories/memory/InMemoryClientRepository');

// Database Utilities
const DatabaseMigrator = require('./database/DatabaseMigrator');

// Export all infrastructure components
module.exports = {
    // Repository Factory (primary interface)
    RepositoryFactory,
    
    // Direct repository access (for advanced use cases)
    repositories: {
        sqlite: {
            SQLiteCaseRepository,
            SQLiteClientRepository
        },
        memory: {
            InMemoryCaseRepository,
            InMemoryClientRepository
        }
    },
    
    // Database utilities
    database: {
        DatabaseMigrator
    },
    
    // Convenience factory methods
    createRepositoryFactory: (database, securityManager, options) => {
        return RepositoryFactory.create(database, securityManager, options);
    },
    
    createCaseRepository: (type = 'sqlite', database, securityManager) => {
        switch (type.toLowerCase()) {
            case 'sqlite':
                return new SQLiteCaseRepository(database, securityManager);
            case 'memory':
            case 'inmemory':
                return new InMemoryCaseRepository(securityManager);
            default:
                throw new Error(`Unknown repository type: ${type}`);
        }
    },
    
    createClientRepository: (type = 'sqlite', database, securityManager) => {
        switch (type.toLowerCase()) {
            case 'sqlite':
                return new SQLiteClientRepository(database, securityManager);
            case 'memory':
            case 'inmemory':
                return new InMemoryClientRepository(securityManager);
            default:
                throw new Error(`Unknown repository type: ${type}`);
        }
    },
    
    createDatabaseMigrator: (database, securityManager) => {
        return new DatabaseMigrator(database, securityManager);
    },
    
    // Utility functions
    utils: {
        /**
         * Initialize complete infrastructure stack
         * @param {Object} config - Configuration object
         * @param {Object} config.database - Database instance
         * @param {Object} config.securityManager - Security manager instance
         * @param {string} [config.repositoryType='sqlite'] - Repository type
         * @param {boolean} [config.enableMigrations=true] - Enable database migrations
         * @returns {Object} Initialized infrastructure components
         */
        async initializeInfrastructure(config) {
            const {
                database,
                securityManager,
                repositoryType = 'sqlite',
                enableMigrations = true
            } = config;
            
            if (!database || !securityManager) {
                throw new Error('Database and SecurityManager are required');
            }
            
            const infrastructure = {
                database,
                securityManager,
                repositories: {},
                migrator: null,
                factory: null
            };
            
            // Initialize migrator if requested
            if (enableMigrations) {
                infrastructure.migrator = new DatabaseMigrator(database, securityManager);
            }
            
            // Initialize repository factory
            infrastructure.factory = RepositoryFactory.create(
                database, 
                securityManager, 
                { backend: repositoryType }
            );
            
            // Create repositories
            infrastructure.repositories.caseRepository = infrastructure.factory.createCaseRepository();
            infrastructure.repositories.clientRepository = infrastructure.factory.createClientRepository();
            
            return infrastructure;
        },
        
        /**
         * Initialize infrastructure for testing
         * @param {Object} securityManager - Security manager instance
         * @returns {Object} Test infrastructure components
         */
        async initializeTestInfrastructure(securityManager) {
            return {
                repositories: {
                    caseRepository: new InMemoryCaseRepository(securityManager),
                    clientRepository: new InMemoryClientRepository(securityManager)
                },
                factory: RepositoryFactory.create(null, securityManager, {
                    backend: 'memory',
                    testMode: true
                })
            };
        },
        
        /**
         * Validate infrastructure configuration
         * @param {Object} config - Configuration to validate
         * @returns {Object} Validation results
         */
        validateInfrastructureConfig(config) {
            const errors = [];
            const warnings = [];
            
            // Required components
            if (!config.database) {
                errors.push('Database instance is required');
            }
            
            if (!config.securityManager) {
                errors.push('SecurityManager instance is required');
            }
            
            // Repository type validation
            const validTypes = ['sqlite', 'memory', 'inmemory'];
            if (config.repositoryType && !validTypes.includes(config.repositoryType.toLowerCase())) {
                errors.push(`Invalid repository type: ${config.repositoryType}. Must be one of: ${validTypes.join(', ')}`);
            }
            
            // Environment warnings
            if (process.env.NODE_ENV === 'production' && config.repositoryType === 'memory') {
                warnings.push('Using in-memory repositories in production is not recommended');
            }
            
            return {
                valid: errors.length === 0,
                errors,
                warnings,
                validatedAt: new Date().toISOString()
            };
        },
        
        /**
         * Get infrastructure health status
         * @param {Object} infrastructure - Infrastructure components
         * @returns {Promise<Object>} Health status
         */
        async getInfrastructureHealth(infrastructure) {
            const health = {
                overall: 'healthy',
                components: {},
                checkedAt: new Date().toISOString()
            };
            
            try {
                // Check repository factory
                if (infrastructure.factory) {
                    health.components.factory = await infrastructure.factory.getHealthStatus();
                }
                
                // Check repositories
                if (infrastructure.repositories) {
                    health.components.repositories = {};
                    
                    if (infrastructure.repositories.caseRepository) {
                        try {
                            await infrastructure.repositories.caseRepository.getStatistics();
                            health.components.repositories.caseRepository = 'healthy';
                        } catch (error) {
                            health.components.repositories.caseRepository = 'unhealthy';
                            health.overall = 'degraded';
                        }
                    }
                    
                    if (infrastructure.repositories.clientRepository) {
                        try {
                            await infrastructure.repositories.clientRepository.getStatistics();
                            health.components.repositories.clientRepository = 'healthy';
                        } catch (error) {
                            health.components.repositories.clientRepository = 'unhealthy';
                            health.overall = 'degraded';
                        }
                    }
                }
                
                // Check migrator
                if (infrastructure.migrator) {
                    try {
                        await infrastructure.migrator.verifyDatabaseIntegrity();
                        health.components.migrator = 'healthy';
                    } catch (error) {
                        health.components.migrator = 'unhealthy';
                        health.overall = 'degraded';
                    }
                }
                
                // Determine overall health
                const unhealthyComponents = Object.values(health.components)
                    .filter(status => status === 'unhealthy' || (typeof status === 'object' && status.overall === 'unhealthy'));
                    
                if (unhealthyComponents.length > 0) {
                    health.overall = unhealthyComponents.length > 1 ? 'unhealthy' : 'degraded';
                }
                
            } catch (error) {
                health.overall = 'unhealthy';
                health.error = error.message;
            }
            
            return health;
        }
    }
};

// Additional exports for backward compatibility
module.exports.SQLiteCaseRepository = SQLiteCaseRepository;
module.exports.SQLiteClientRepository = SQLiteClientRepository;
module.exports.InMemoryCaseRepository = InMemoryCaseRepository;
module.exports.InMemoryClientRepository = InMemoryClientRepository;
module.exports.DatabaseMigrator = DatabaseMigrator;

// Export factory instance for singleton access
module.exports.repositoryFactory = RepositoryFactory.getInstance();