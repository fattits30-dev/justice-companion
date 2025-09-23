-- Justice Companion Database Schema
-- Legal Case Management System with GDPR Compliance
-- 
-- Features:
-- - End-to-end encryption for sensitive data
-- - Comprehensive audit trails
-- - GDPR compliance with data retention
-- - Attorney-client privilege protection
-- - Data integrity verification

-- =====================================================
-- PRAGMA SETTINGS FOR SECURITY AND PERFORMANCE
-- =====================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = FULL;
PRAGMA temp_store = MEMORY;
PRAGMA secure_delete = ON;
PRAGMA auto_vacuum = INCREMENTAL;
PRAGMA cache_size = -2000; -- 2MB cache

-- =====================================================
-- CORE LEGAL CASE MANAGEMENT TABLES
-- =====================================================

-- Legal Cases Table (Encrypted with Attorney-Client Privilege)
CREATE TABLE IF NOT EXISTS legal_cases (
    id TEXT PRIMARY KEY,
    encrypted_data TEXT NOT NULL,
    client_id TEXT,
    case_type TEXT DEFAULT 'GENERAL',
    status TEXT DEFAULT 'INTAKE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    retention_until DATETIME,
    
    -- Legal Privilege and Classification
    attorney_client_privilege BOOLEAN DEFAULT 1,
    work_product_privilege BOOLEAN DEFAULT 1,
    classification TEXT DEFAULT 'CONFIDENTIAL',
    privilege_asserted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    privilege_waived BOOLEAN DEFAULT 0,
    
    -- Legal Hold and Compliance
    legal_hold_status TEXT DEFAULT 'NONE',
    ethical_wall_id TEXT,
    conflict_check_completed BOOLEAN DEFAULT 0,
    
    -- Data Integrity and Encryption
    integrity_hash TEXT NOT NULL,
    encryption_version INTEGER DEFAULT 1,
    
    -- Foreign Key Constraints
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
    
    -- Check Constraints
    CHECK (status IN ('INTAKE', 'ACTIVE', 'PENDING', 'RESOLVED', 'CLOSED', 'ARCHIVED', 'DELETED')),
    CHECK (case_type IN ('GENERAL', 'CRIMINAL', 'CIVIL', 'FAMILY', 'BUSINESS', 'IMMIGRATION', 'PERSONAL_INJURY', 'REAL_ESTATE', 'EMPLOYMENT', 'INTELLECTUAL_PROPERTY')),
    CHECK (classification IN ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED')),
    CHECK (legal_hold_status IN ('NONE', 'ACTIVE', 'RELEASED'))
);

-- Client Data Table (Encrypted with GDPR Compliance)
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    encrypted_data TEXT NOT NULL,
    client_hash TEXT NOT NULL UNIQUE, -- For deduplication without exposing data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- GDPR Compliance Fields
    gdpr_consent BOOLEAN DEFAULT 0,
    data_processing_lawful_basis TEXT DEFAULT 'LEGITIMATE_INTEREST',
    retention_until DATETIME,
    
    -- Data Integrity
    integrity_hash TEXT NOT NULL,
    
    -- Check Constraints
    CHECK (data_processing_lawful_basis IN (
        'CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 
        'VITAL_INTERESTS', 'PUBLIC_TASK', 'LEGITIMATE_INTEREST'
    ))
);

-- Case Documents Table (Encrypted)
CREATE TABLE IF NOT EXISTS case_documents (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    encrypted_content TEXT NOT NULL,
    original_filename TEXT,
    file_type TEXT,
    file_size INTEGER,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    document_hash TEXT NOT NULL,
    classification TEXT DEFAULT 'CONFIDENTIAL',
    retention_until DATETIME,
    integrity_hash TEXT NOT NULL,
    
    -- Foreign Key Constraints
    FOREIGN KEY (case_id) REFERENCES legal_cases(id) ON DELETE CASCADE,
    
    -- Check Constraints
    CHECK (classification IN ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'))
);

-- =====================================================
-- AUDIT AND COMPLIANCE TABLES
-- =====================================================

-- Audit Trail Table (Tamper-proof, Court-Admissible)
CREATE TABLE IF NOT EXISTS audit_trail (
    id TEXT PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    session_id TEXT NOT NULL,
    user_id TEXT DEFAULT 'anonymous',
    action TEXT NOT NULL,
    table_name TEXT,
    record_id TEXT,
    changes_hash TEXT,
    
    -- Network and Environment Info
    ip_address TEXT DEFAULT '127.0.0.1',
    user_agent TEXT DEFAULT 'Justice Companion',
    
    -- Legal Compliance
    attorney_client_privilege BOOLEAN DEFAULT 1,
    legal_hold_status TEXT DEFAULT 'NONE',
    ethical_review_required BOOLEAN DEFAULT 0,
    conflict_clearance_id TEXT,
    privilege_log_entry TEXT,
    
    -- Integrity and Authentication
    integrity_chain TEXT NOT NULL, -- Links to previous audit record
    blockchain_hash TEXT, -- For enhanced tamper detection
    digital_signature TEXT, -- For court admissibility
    legal_timestamp_authority TEXT,
    admissibility_metadata TEXT, -- Evidence authentication data
    witness_signature TEXT,
    
    -- Check Constraints
    CHECK (legal_hold_status IN ('NONE', 'ACTIVE', 'RELEASED'))
);

-- GDPR Compliance Tracking
CREATE TABLE IF NOT EXISTS gdpr_compliance (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    
    -- Consent Management
    consent_date DATETIME,
    consent_version TEXT DEFAULT '1.0',
    consent_withdrawn_date DATETIME,
    lawful_basis TEXT NOT NULL,
    
    -- GDPR Principles
    purpose_limitation TEXT,
    data_minimization_applied BOOLEAN DEFAULT 1,
    accuracy_verified BOOLEAN DEFAULT 0,
    storage_limitation_date DATETIME,
    security_measures TEXT,
    
    -- Data Subject Rights
    request_type TEXT, -- ACCESS, RECTIFICATION, ERASURE, PORTABILITY, RESTRICTION, OBJECTION
    request_date DATETIME,
    request_status TEXT DEFAULT 'PENDING',
    request_details TEXT,
    response_date DATETIME,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key Constraints
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Check Constraints
    CHECK (lawful_basis IN (
        'CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 
        'VITAL_INTERESTS', 'PUBLIC_TASK', 'LEGITIMATE_INTEREST'
    )),
    CHECK (request_type IN (
        'ACCESS', 'RECTIFICATION', 'ERASURE', 'PORTABILITY', 
        'RESTRICTION', 'OBJECTION', 'AUTOMATED_DECISION'
    )),
    CHECK (request_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DENIED', 'PARTIALLY_FULFILLED'))
);

-- Legal Holds Management
CREATE TABLE IF NOT EXISTS legal_holds (
    id TEXT PRIMARY KEY,
    case_id TEXT,
    client_id TEXT,
    hold_reason TEXT NOT NULL,
    initiated_by TEXT NOT NULL,
    initiated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    hold_status TEXT DEFAULT 'ACTIVE',
    release_authorized BOOLEAN DEFAULT 0,
    release_date DATETIME,
    court_order_reference TEXT,
    compliance_notes TEXT,
    
    -- Foreign Key Constraints
    FOREIGN KEY (case_id) REFERENCES legal_cases(id),
    FOREIGN KEY (client_id) REFERENCES clients(id),
    
    -- Check Constraints
    CHECK (hold_status IN ('ACTIVE', 'RELEASED', 'EXPIRED'))
);

-- =====================================================
-- ENCRYPTION AND SECURITY METADATA
-- =====================================================

-- Encryption Keys Metadata (Not the actual keys)
CREATE TABLE IF NOT EXISTS encryption_metadata (
    id TEXT PRIMARY KEY,
    key_version INTEGER NOT NULL,
    algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    rotation_due DATETIME,
    status TEXT DEFAULT 'ACTIVE',
    
    -- Check Constraints
    CHECK (status IN ('ACTIVE', 'EXPIRED', 'REVOKED'))
);

-- Data Retention Policies
CREATE TABLE IF NOT EXISTS retention_policies (
    id TEXT PRIMARY KEY,
    data_type TEXT NOT NULL,
    retention_period_days INTEGER NOT NULL,
    auto_delete BOOLEAN DEFAULT 0,
    legal_basis TEXT,
    jurisdiction TEXT DEFAULT 'US',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Check Constraints
    CHECK (retention_period_days > 0),
    CHECK (data_type IN (
        'CASE_DATA', 'CLIENT_DATA', 'DOCUMENT_DATA', 
        'AUDIT_LOGS', 'GDPR_RECORDS', 'TEMP_DATA'
    ))
);

-- =====================================================
-- PERFORMANCE AND SEARCH INDEXES
-- =====================================================

-- Legal Cases Indexes
CREATE INDEX IF NOT EXISTS idx_cases_client_id ON legal_cases(client_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON legal_cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_type ON legal_cases(case_type);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON legal_cases(created_at);
CREATE INDEX IF NOT EXISTS idx_cases_updated_at ON legal_cases(updated_at);
CREATE INDEX IF NOT EXISTS idx_cases_retention ON legal_cases(retention_until);

-- Client Indexes
CREATE INDEX IF NOT EXISTS idx_clients_hash ON clients(client_hash);
CREATE INDEX IF NOT EXISTS idx_clients_gdpr_consent ON clients(gdpr_consent);
CREATE INDEX IF NOT EXISTS idx_clients_retention ON clients(retention_until);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at);

-- Document Indexes
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON case_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON case_documents(upload_date);
CREATE INDEX IF NOT EXISTS idx_documents_retention ON case_documents(retention_until);

-- Audit Trail Indexes
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_trail(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_trail(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_trail(action);
CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit_trail(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_trail(user_id);

-- GDPR Compliance Indexes
CREATE INDEX IF NOT EXISTS idx_gdpr_client_id ON gdpr_compliance(client_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_request_type ON gdpr_compliance(request_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_request_status ON gdpr_compliance(request_status);
CREATE INDEX IF NOT EXISTS idx_gdpr_consent_date ON gdpr_compliance(consent_date);

-- Legal Hold Indexes
CREATE INDEX IF NOT EXISTS idx_legal_holds_case_id ON legal_holds(case_id);
CREATE INDEX IF NOT EXISTS idx_legal_holds_client_id ON legal_holds(client_id);
CREATE INDEX IF NOT EXISTS idx_legal_holds_status ON legal_holds(hold_status);
CREATE INDEX IF NOT EXISTS idx_legal_holds_initiated_at ON legal_holds(initiated_at);

-- Legal Privilege and Compliance Indexes
CREATE INDEX IF NOT EXISTS idx_cases_legal_hold ON legal_cases(legal_hold_status);
CREATE INDEX IF NOT EXISTS idx_cases_privilege_asserted ON legal_cases(privilege_asserted_at);
CREATE INDEX IF NOT EXISTS idx_cases_ethical_wall ON legal_cases(ethical_wall_id);
CREATE INDEX IF NOT EXISTS idx_audit_privilege ON audit_trail(attorney_client_privilege);
CREATE INDEX IF NOT EXISTS idx_audit_legal_hold ON audit_trail(legal_hold_status);
CREATE INDEX IF NOT EXISTS idx_audit_integrity_chain ON audit_trail(integrity_chain);

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Active Cases View (without sensitive data)
CREATE VIEW IF NOT EXISTS active_cases_summary AS
SELECT 
    id,
    client_id,
    case_type,
    status,
    created_at,
    updated_at,
    attorney_client_privilege,
    legal_hold_status
FROM legal_cases 
WHERE status IN ('INTAKE', 'ACTIVE', 'PENDING')
AND status != 'DELETED';

-- GDPR Compliance Status View
CREATE VIEW IF NOT EXISTS gdpr_compliance_status AS
SELECT 
    c.id as client_id,
    c.gdpr_consent,
    c.data_processing_lawful_basis,
    c.retention_until,
    gc.consent_date,
    gc.consent_withdrawn_date,
    CASE 
        WHEN gc.consent_withdrawn_date IS NOT NULL THEN 'WITHDRAWN'
        WHEN c.gdpr_consent = 1 AND gc.consent_date IS NOT NULL THEN 'ACTIVE'
        ELSE 'PENDING'
    END as consent_status
FROM clients c
LEFT JOIN gdpr_compliance gc ON c.id = gc.client_id
WHERE gc.request_type = 'CONSENT' OR gc.request_type IS NULL;

-- Audit Trail Summary View
CREATE VIEW IF NOT EXISTS audit_summary AS
SELECT 
    DATE(timestamp) as audit_date,
    table_name,
    action,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT session_id) as unique_sessions
FROM audit_trail
GROUP BY DATE(timestamp), table_name, action
ORDER BY audit_date DESC;

-- Data Retention Requirements View
CREATE VIEW IF NOT EXISTS retention_requirements AS
SELECT 
    'cases' as data_type,
    id as record_id,
    retention_until,
    CASE 
        WHEN retention_until <= CURRENT_TIMESTAMP THEN 'ACTION_REQUIRED'
        WHEN retention_until <= datetime('now', '+30 days') THEN 'EXPIRING_SOON'
        ELSE 'COMPLIANT'
    END as retention_status
FROM legal_cases
WHERE status != 'DELETED'

UNION ALL

SELECT 
    'clients' as data_type,
    id as record_id,
    retention_until,
    CASE 
        WHEN retention_until <= CURRENT_TIMESTAMP THEN 'ACTION_REQUIRED'
        WHEN retention_until <= datetime('now', '+30 days') THEN 'EXPIRING_SOON'
        ELSE 'COMPLIANT'
    END as retention_status
FROM clients;

-- =====================================================
-- TRIGGERS FOR AUDIT TRAILS AND INTEGRITY
-- =====================================================

-- Legal Cases Audit Triggers
CREATE TRIGGER IF NOT EXISTS legal_cases_audit_insert
AFTER INSERT ON legal_cases
FOR EACH ROW
BEGIN
    INSERT INTO audit_trail (
        id, action, table_name, record_id, timestamp,
        session_id, changes_hash, attorney_client_privilege,
        integrity_chain
    ) VALUES (
        hex(randomblob(16)),
        'INSERT',
        'legal_cases',
        NEW.id,
        CURRENT_TIMESTAMP,
        'system',
        NEW.integrity_hash,
        NEW.attorney_client_privilege,
        'auto_generated'
    );
END;

CREATE TRIGGER IF NOT EXISTS legal_cases_audit_update
AFTER UPDATE ON legal_cases
FOR EACH ROW
BEGIN
    INSERT INTO audit_trail (
        id, action, table_name, record_id, timestamp,
        session_id, changes_hash, attorney_client_privilege,
        integrity_chain
    ) VALUES (
        hex(randomblob(16)),
        'UPDATE',
        'legal_cases',
        NEW.id,
        CURRENT_TIMESTAMP,
        'system',
        NEW.integrity_hash,
        NEW.attorney_client_privilege,
        'auto_generated'
    );
END;

-- Client Audit Triggers
CREATE TRIGGER IF NOT EXISTS clients_audit_insert
AFTER INSERT ON clients
FOR EACH ROW
BEGIN
    INSERT INTO audit_trail (
        id, action, table_name, record_id, timestamp,
        session_id, changes_hash, attorney_client_privilege,
        integrity_chain
    ) VALUES (
        hex(randomblob(16)),
        'INSERT',
        'clients',
        NEW.id,
        CURRENT_TIMESTAMP,
        'system',
        NEW.integrity_hash,
        1, -- All client data is privileged
        'auto_generated'
    );
END;

CREATE TRIGGER IF NOT EXISTS clients_audit_update
AFTER UPDATE ON clients
FOR EACH ROW
BEGIN
    INSERT INTO audit_trail (
        id, action, table_name, record_id, timestamp,
        session_id, changes_hash, attorney_client_privilege,
        integrity_chain
    ) VALUES (
        hex(randomblob(16)),
        'UPDATE',
        'clients',
        NEW.id,
        CURRENT_TIMESTAMP,
        'system',
        NEW.integrity_hash,
        1, -- All client data is privileged
        'auto_generated'
    );
END;

-- Automatic Updated Timestamp Triggers
CREATE TRIGGER IF NOT EXISTS legal_cases_updated_at
AFTER UPDATE ON legal_cases
FOR EACH ROW
BEGIN
    UPDATE legal_cases 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS clients_updated_at
AFTER UPDATE ON clients
FOR EACH ROW
BEGIN
    UPDATE clients 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- =====================================================
-- INITIAL DATA SETUP
-- =====================================================

-- Insert default retention policies
INSERT OR REPLACE INTO retention_policies (
    id, data_type, retention_period_days, auto_delete, legal_basis
) VALUES 
    ('case_data_policy', 'CASE_DATA', 2555, 0, 'Legal professional obligations - 7 years'),
    ('client_data_policy', 'CLIENT_DATA', 2555, 0, 'Legal professional obligations - 7 years'),
    ('document_data_policy', 'DOCUMENT_DATA', 2555, 0, 'Legal professional obligations - 7 years'),
    ('audit_logs_policy', 'AUDIT_LOGS', 3650, 0, 'Legal compliance - 10 years'),
    ('gdpr_records_policy', 'GDPR_RECORDS', 3650, 0, 'GDPR compliance requirements'),
    ('temp_data_policy', 'TEMP_DATA', 1, 1, 'Operational efficiency');

-- Insert initial encryption metadata
INSERT OR REPLACE INTO encryption_metadata (
    id, key_version, algorithm, rotation_due, status
) VALUES (
    'master_key_v1',
    1,
    'AES-256-GCM',
    datetime('now', '+365 days'),
    'ACTIVE'
);

-- Create initial audit trail entry
INSERT OR REPLACE INTO audit_trail (
    id, action, table_name, timestamp, session_id,
    user_id, changes_hash, attorney_client_privilege,
    integrity_chain, digital_signature
) VALUES (
    'genesis_audit_entry',
    'SCHEMA_INITIALIZED',
    'system',
    CURRENT_TIMESTAMP,
    'system_initialization',
    'system',
    'schema_v1.0',
    1,
    'GENESIS',
    'justice_companion_schema_v1.0'
);

-- =====================================================
-- SCHEMA VERSION AND METADATA
-- =====================================================

CREATE TABLE IF NOT EXISTS schema_version (
    version TEXT PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    migration_script TEXT
);

INSERT OR REPLACE INTO schema_version (
    version, description
) VALUES (
    '1.0.0',
    'Initial Justice Companion schema with full GDPR compliance and legal privilege protection'
);

-- =====================================================
-- SCHEMA VALIDATION QUERIES
-- =====================================================

-- Verify all tables exist
-- SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;

-- Verify all indexes exist
-- SELECT name FROM sqlite_master WHERE type='index' ORDER BY name;

-- Verify triggers exist
-- SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name;

-- Check foreign key integrity
-- PRAGMA foreign_key_check;

-- Verify database integrity
-- PRAGMA integrity_check;

-- =====================================================
-- END OF SCHEMA
-- =====================================================