/**
 * Infrastructure Layer Usage Examples
 *
 * Demonstrates how to use the Justice Companion infrastructure layer
 * for repository management, database operations, and GDPR compliance.
 *
 * This file serves as documentation and reference for developers.
 */

const Infrastructure = require('../index');
const LegalCase = require('../../domain/models/LegalCase');
const Client = require('../../domain/models/Client');
const CaseStatus = require('../../domain/valueObjects/CaseStatus');
const LegalCategory = require('../../domain/valueObjects/LegalCategory');

/**
 * Example 1: Basic Repository Setup
 */
async function basicRepositorySetup(database, securityManager) {
    console.log('=== Basic Repository Setup ===');
    
    // Option 1: Using Repository Factory (Recommended)
    const factory = Infrastructure.createRepositoryFactory(
        database, 
        securityManager, 
        { backend: 'sqlite' }
    );
    
    const caseRepository = factory.createCaseRepository();
    const clientRepository = factory.createClientRepository();
    
    console.log('Repositories created via factory');
    
    // Option 2: Direct Repository Creation
    const directCaseRepo = Infrastructure.createCaseRepository('sqlite', database, securityManager);
    const directClientRepo = Infrastructure.createClientRepository('sqlite', database, securityManager);
    
    console.log('Repositories created directly');
    
    return { caseRepository, clientRepository };
}

/**
 * Example 2: Complete Infrastructure Initialization
 */
async function completeInfrastructureSetup(database, securityManager) {
    console.log('=== Complete Infrastructure Setup ===');
    
    // Initialize complete infrastructure stack
    const infrastructure = await Infrastructure.utils.initializeInfrastructure({
        database: database,
        securityManager: securityManager,
        repositoryType: 'sqlite',
        enableMigrations: true
    });
    
    console.log('Infrastructure initialized with components:', {
        hasDatabase: !!infrastructure.database,
        hasSecurityManager: !!infrastructure.securityManager,
        hasMigrator: !!infrastructure.migrator,
        hasFactory: !!infrastructure.factory,
        repositoryCount: Object.keys(infrastructure.repositories).length
    });
    
    // Check health status
    const health = await Infrastructure.utils.getInfrastructureHealth(infrastructure);
    console.log('Infrastructure health:', health.overall);
    
    return infrastructure;
}

/**
 * Example 3: Working with Cases
 */
async function caseManagementExample(caseRepository) {
    console.log('=== Case Management Example ===');
    
    try {
        // Create a new legal case
        const newCase = new LegalCase({
            clientId: 'client-123',
            title: 'Personal Injury Claim',
            description: 'Client injured in traffic accident, seeking compensation',
            caseType: LegalCategory.PERSONAL_INJURY,
            status: CaseStatus.INTAKE,
            priority: 'HIGH'
        });
        
        // Save the case
        const savedCase = await caseRepository.save(newCase);
        console.log('Case saved with ID:', savedCase.caseId);
        
        // Find the case by ID
        const foundCase = await caseRepository.findById(savedCase.caseId);
        console.log('Case found:', foundCase.title);
        
        // Update case status
        foundCase.updateStatus(CaseStatus.ACTIVE, 'Case accepted for representation');
        const updatedCase = await caseRepository.update(foundCase);
        console.log('Case updated to status:', updatedCase.status);
        
        // Find cases by client
        const clientCases = await caseRepository.findByClientId('client-123');
        console.log('Client has', clientCases.length, 'cases');
        
        // Search cases by content
        const searchResults = await caseRepository.searchByContent('traffic accident');
        console.log('Search found', searchResults.length, 'matching cases');
        
        // Get case statistics
        const stats = await caseRepository.getStatistics();
        console.log('Case statistics:', {
            total: stats.total,
            statusBreakdown: stats.byStatus
        });
        
        return savedCase;
    } catch (error) {
        console.error('Case management error:', error.message);
        throw error;
    }
}

/**
 * Example 4: GDPR Compliant Client Management
 */
async function gdprClientManagementExample(clientRepository) {
    console.log('=== GDPR Client Management Example ===');
    
    try {
        // Create a new client with consent
        const newClient = new Client({
            name: 'John Doe',
            contactInfo: {
                email: 'john.doe@example.com',
                phone: '+1-555-0123',
                address: '123 Main St, City, State 12345'
            },
            consentStatus: 'GRANTED',
            consentDate: new Date()
        });
        
        // Save the client (automatically creates GDPR compliance record)
        const savedClient = await clientRepository.save(newClient);
        console.log('Client saved with ID:', savedClient.clientId);
        
        // Update client consent
        await clientRepository.updateConsent(
            savedClient.clientId, 
            'GENERAL', 
            true, 
            '2.0'
        );
        console.log('Client consent updated');
        
        // Find clients with active consent
        const activeConsentClients = await clientRepository.findWithActiveConsent();
        console.log('Clients with active consent:', activeConsentClients.length);
        
        // Find clients with expiring consent
        const expiringConsents = await clientRepository.findExpiringConsents(30);
        console.log('Clients with expiring consent (30 days):', expiringConsents.length);
        
        // Handle GDPR data export request
        const exportData = await clientRepository.exportClientData(savedClient.clientId, 'JSON');
        console.log('Client data exported:', {
            exportId: exportData.exportId,
            format: exportData.format,
            hasData: !!exportData.data
        });
        
        // Record GDPR request
        const requestId = await clientRepository.recordGDPRRequest(savedClient.clientId, {
            type: 'ACCESS',
            reason: 'Client requested copy of personal data',
            requestedBy: 'client'
        });
        console.log('GDPR request recorded:', requestId);
        
        // Get GDPR request history
        const gdprHistory = await clientRepository.getGDPRRequestHistory(savedClient.clientId);
        console.log('GDPR request history:', gdprHistory.length, 'entries');
        
        return savedClient;
    } catch (error) {
        console.error('GDPR client management error:', error.message);
        throw error;
    }
}

/**
 * Example 5: Database Migrations
 */
async function databaseMigrationExample(database, securityManager) {
    console.log('=== Database Migration Example ===');
    
    try {
        // Create database migrator
        const migrator = Infrastructure.createDatabaseMigrator(database, securityManager);
        
        // Check current database version
        const currentVersion = migrator.getCurrentVersion();
        console.log('Current database version:', currentVersion || 'Not initialized');
        
        // Initialize database if needed
        if (!currentVersion) {
            const initResult = await migrator.initializeDatabase();
            console.log('Database initialized:', {
                version: initResult.version,
                success: initResult.success
            });
        }
        
        // Verify database integrity
        const integrity = await migrator.verifyDatabaseIntegrity();
        console.log('Database integrity check:', integrity.valid ? 'PASSED' : 'FAILED');
        
        // Get schema information
        const schemaInfo = await migrator.getSchemaInfo();
        console.log('Database schema:', {
            version: schemaInfo.version,
            tableCount: schemaInfo.tables.length,
            indexCount: schemaInfo.indexes.length,
            triggerCount: schemaInfo.triggers.length
        });
        
        // Get migration history
        const migrationHistory = migrator.getMigrationHistory();
        console.log('Migration history:', migrationHistory.length, 'entries');
        
        return migrator;
    } catch (error) {
        console.error('Database migration error:', error.message);
        throw error;
    }
}

/**
 * Example 6: Testing with In-Memory Repositories
 */
async function testingExample(securityManager) {
    console.log('=== Testing with In-Memory Repositories ===');
    
    try {
        // Initialize test infrastructure
        const testInfra = await Infrastructure.utils.initializeTestInfrastructure(securityManager);
        
        console.log('Test infrastructure initialized');
        
        // Seed with test data
        const testCases = await testInfra.repositories.caseRepository.seedWithTestData(5, 'test-client');
        const testClients = await testInfra.repositories.clientRepository.seedWithTestData(3);
        
        console.log('Test data seeded:', {
            cases: testCases.length,
            clients: testClients.length
        });
        
        // Perform test operations
        const caseStats = await testInfra.repositories.caseRepository.getStatistics();
        const clientStats = await testInfra.repositories.clientRepository.getStatistics();
        
        console.log('Test repository statistics:', {
            totalCases: caseStats.total,
            totalClients: clientStats.total,
            caseRepoSize: testInfra.repositories.caseRepository.size(),
            clientRepoSize: testInfra.repositories.clientRepository.size()
        });
        
        // Clear test data
        testInfra.repositories.caseRepository.clear();
        testInfra.repositories.clientRepository.clear();
        
        console.log('Test data cleared');
        
        return testInfra;
    } catch (error) {
        console.error('Testing example error:', error.message);
        throw error;
    }
}

/**
 * Example 7: Advanced Repository Operations
 */
async function advancedRepositoryExample(caseRepository, clientRepository) {
    console.log('=== Advanced Repository Operations ===');
    
    try {
        // Batch operations
        const caseIds = ['case-1', 'case-2', 'case-3'];
        const archivedIds = await caseRepository.batchArchive(caseIds);
        console.log('Batch archived cases:', archivedIds.length);
        
        // Bulk status updates
        const statusUpdates = [
            { caseId: 'case-4', status: CaseStatus.ACTIVE, reason: 'Client signed retainer' },
            { caseId: 'case-5', status: CaseStatus.PENDING, reason: 'Awaiting documents' }
        ];
        const updatedIds = await caseRepository.bulkUpdateStatus(statusUpdates);
        console.log('Bulk updated cases:', updatedIds.length);
        
        // Find related cases
        const relatedCases = await caseRepository.findRelatedCases('case-1', 5);
        console.log('Related cases found:', relatedCases.length);
        
        // Find urgent cases
        const urgentCases = await caseRepository.findUrgentCases();
        console.log('Urgent cases:', urgentCases.length);
        
        // Pagination
        const paginatedResult = await caseRepository.findPaginated(1, 10);
        console.log('Paginated cases:', {
            page: paginatedResult.pagination.page,
            totalPages: paginatedResult.pagination.totalPages,
            returned: paginatedResult.cases.length
        });
        
        // Export operations
        const exportPackage = await caseRepository.exportCases(['case-1', 'case-2'], 'JSON');
        console.log('Export package:', {
            exportId: exportPackage.exportId,
            caseCount: exportPackage.caseCount
        });
        
        // Data retention operations
        const retentionCases = await caseRepository.findRequiringRetentionAction();
        console.log('Cases requiring retention action:', retentionCases.length);
        
        // Integrity validation
        const integrityResult = await caseRepository.validateIntegrity('case-1');
        console.log('Case integrity validation:', integrityResult.valid);
        
        // Cleanup operations
        const cleanupResult = await caseRepository.cleanupOrphanedData();
        console.log('Cleanup result:', cleanupResult);
        
    } catch (error) {
        console.error('Advanced repository error:', error.message);
        throw error;
    }
}

/**
 * Example 8: Error Handling and Recovery
 */
async function errorHandlingExample(caseRepository) {
    console.log('=== Error Handling Example ===');
    
    try {
        // Attempt invalid operation
        try {
            await caseRepository.findById('non-existent-case');
            console.log('Non-existent case lookup handled gracefully');
        } catch (error) {
            console.log('Expected error caught:', error.message);
        }
        
        // Attempt to save invalid case
        try {
            await caseRepository.save({ invalid: 'data' });
        } catch (error) {
            console.log('Invalid case save error:', error.message);
        }
        
        // Recovery operations
        const stats = await caseRepository.getStatistics();
        console.log('Repository still functional after errors, total cases:', stats.total);
        
    } catch (error) {
        console.error('Error handling example failed:', error.message);
    }
}

/**
 * Main Example Runner
 * 
 * Demonstrates complete infrastructure usage workflow
 */
async function runAllExamples(database, securityManager) {
    console.log('\n🏗️  Justice Companion Infrastructure Layer Examples\n');
    
    try {
        // Validate configuration
        const validation = Infrastructure.utils.validateInfrastructureConfig({
            database,
            securityManager,
            repositoryType: 'sqlite'
        });
        
        if (!validation.valid) {
            console.error('Configuration validation failed:', validation.errors);
            return;
        }
        
        console.log('✅ Configuration validated\n');
        
        // Run examples
        const { caseRepository, clientRepository } = await basicRepositorySetup(database, securityManager);
        const infrastructure = await completeInfrastructureSetup(database, securityManager);
        const migrator = await databaseMigrationExample(database, securityManager);
        
        const savedCase = await caseManagementExample(caseRepository);
        const savedClient = await gdprClientManagementExample(clientRepository);
        
        await testingExample(securityManager);
        await advancedRepositoryExample(caseRepository, clientRepository);
        await errorHandlingExample(caseRepository);
        
        // Final health check
        const finalHealth = await Infrastructure.utils.getInfrastructureHealth(infrastructure);
        console.log('\n🏥 Final infrastructure health:', finalHealth.overall);
        
        console.log('\n✅ All examples completed successfully!');
        
        return {
            infrastructure,
            savedCase,
            savedClient,
            migrator
        };
        
    } catch (error) {
        console.error('\n❌ Example execution failed:', error.message);
        throw error;
    }
}

// Export examples for use in other files
module.exports = {
    basicRepositorySetup,
    completeInfrastructureSetup,
    caseManagementExample,
    gdprClientManagementExample,
    databaseMigrationExample,
    testingExample,
    advancedRepositoryExample,
    errorHandlingExample,
    runAllExamples
};

// If run directly, execute examples
if (require.main === module) {
    console.log('Infrastructure examples module loaded.');
    console.log('To run examples, import this module and call runAllExamples(database, securityManager)');
}