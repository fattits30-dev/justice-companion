/**
 * Justice Companion - Legal Domain Ubiquitous Language Dictionary
 * PHASE 1.3: Domain-Driven Design - Legal Terminology Standardization
 *
 * This defines the shared vocabulary between legal experts, developers, and the system
 * for Justice Companion's "David vs Goliath" legal assistance platform.
 *
 * Built for: Self-represented individuals facing powerful institutions
 */

class LegalUbiquitousLanguage {
  constructor() {
    this.terminology = {
      // ======================
      // CORE LEGAL ENTITIES
      // ======================

      // Case Management Domain
      Case: {
        definition: "A legal matter or dispute requiring resolution",
        businessContext: "Central entity representing a client's legal situation",
        technicalContext: "Aggregate root containing all case-related data",
        examples: ["landlord-tenant dispute", "employment dismissal", "consumer complaint"],
        properties: ["caseNumber", "caseType", "status", "priority", "clientId"],
        invariants: ["Must have unique case number", "Must be associated with a client"],
        lifecycle: ["created", "active", "under_review", "resolved", "closed"]
      },

      Client: {
        definition: "Individual seeking legal assistance through Justice Companion",
        businessContext: "Self-represented person facing legal challenges",
        technicalContext: "Entity with personal data subject to GDPR and attorney-client privilege",
        examples: ["tenant facing eviction", "employee facing dismissal", "consumer with faulty goods"],
        properties: ["clientId", "personalDetails", "contactInfo", "consentStatus"],
        invariants: ["Must have valid consent", "Personal data must be encrypted"],
        dataProtection: "Attorney-client privilege, GDPR Article 6 lawful basis"
      },

      LegalDocument: {
        definition: "Formal written instrument with legal significance",
        businessContext: "Evidence, contracts, notices, or correspondence in a legal matter",
        technicalContext: "Value object with immutable content and metadata",
        examples: ["tenancy agreement", "employment contract", "legal notice"],
        properties: ["documentType", "content", "dateCreated", "source", "privileged"],
        invariants: ["Content cannot be modified", "Must maintain audit trail"],
        retention: "7 years for case documents, indefinite for privileged communications"
      },

      // ======================
      // LEGAL DOMAIN AREAS
      // ======================

      HousingLaw: {
        definition: "Legal rights and obligations of landlords and tenants",
        businessContext: "Protection for renters facing housing issues",
        keyRights: ["Right to quiet enjoyment", "Protection from illegal eviction", "Right to repairs"],
        commonIssues: ["deposit disputes", "rent increases", "disrepair", "harassment"],
        timeframes: ["14 days for deposit protection", "21 days for Section 21 notice"],
        agencies: ["Shelter", "Citizens Advice", "Local Council Housing Department"]
      },

      EmploymentLaw: {
        definition: "Legal relationship between employers and employees",
        businessContext: "Protection for workers facing workplace issues",
        keyRights: ["Right not to be unfairly dismissed", "Right to statutory redundancy pay", "Protection from discrimination"],
        commonIssues: ["unfair dismissal", "discrimination", "wage disputes", "redundancy"],
        timeframes: ["3 months minus 1 day for tribunal claims", "1 month for grievance response"],
        agencies: ["ACAS", "Citizens Advice", "Equality and Human Rights Commission"]
      },

      ConsumerLaw: {
        definition: "Legal protection for individuals purchasing goods and services",
        businessContext: "Rights when dealing with faulty products or poor service",
        keyRights: ["Right to refund", "Right to repair or replacement", "Protection from unfair terms"],
        commonIssues: ["faulty goods", "poor service", "unfair contracts", "doorstep sales"],
        timeframes: ["14 days for online purchases", "6 years for breach of contract claims"],
        agencies: ["Citizens Advice Consumer Service", "Trading Standards", "Financial Ombudsman"]
      },

      DebtAndFinance: {
        definition: "Legal obligations and protections related to money owed",
        businessContext: "Help for individuals struggling with debt",
        keyRights: ["Protection from harassment", "Right to reasonable payment plans", "Protection of essential items"],
        commonIssues: ["priority debts", "bailiff action", "bankruptcy", "debt management"],
        priorityDebts: ["council tax", "income tax", "mortgage", "utility bills"],
        agencies: ["Citizens Advice", "StepChange", "National Debtline"]
      },

      // ======================
      // LEGAL PROCESSES
      // ======================

      LegalAdvice: {
        definition: "Professional guidance on specific legal matters",
        businessContext: "Qualified lawyer's opinion on legal rights and options",
        technicalContext: "Privileged communication requiring qualified legal professional",
        distinction: "Different from legal information - requires professional qualification",
        limitations: "Justice Companion provides information, not advice",
        referral: "Citizens Advice, Law Society, Local Law Centres"
      },

      LegalInformation: {
        definition: "General knowledge about legal rights, procedures, and resources",
        businessContext: "Educational content to help understand legal processes",
        technicalContext: "Non-privileged content that can be provided by AI systems",
        examples: ["explanation of tenant rights", "overview of employment law", "court procedures"],
        limitations: "Cannot replace professional legal advice for specific situations"
      },

      AttorneyClientPrivilege: {
        definition: "Legal protection for confidential communications with lawyers",
        businessContext: "Ensures clients can speak freely with legal representatives",
        technicalContext: "Highest level of data protection in legal systems",
        scope: "Communications for purpose of seeking legal advice",
        protection: "Cannot be disclosed without client consent",
        implementation: "AES-256 encryption with privileged metadata"
      },

      // ======================
      // JUSTICE COMPANION SPECIFIC
      // ======================

      VeteranParalegal: {
        definition: "Justice Companion's AI assistant with legal domain expertise",
        businessContext: "Experienced legal professional providing information and guidance",
        capabilities: ["legal information provision", "resource identification", "process explanation"],
        limitations: ["cannot provide legal advice", "cannot represent clients", "cannot guarantee outcomes"],
        safeguards: ["content filtering", "emergency detection", "professional referral"],
        personality: "Experienced, empathetic, professional, empowering"
      },

      DavidVsGoliath: {
        definition: "Justice Companion's core mission of empowering individuals against powerful institutions",
        businessContext: "Leveling the playing field for self-represented individuals",
        examples: ["tenant vs large landlord", "employee vs corporation", "consumer vs large company"],
        approach: ["accessible legal information", "resource identification", "confidence building"],
        outcome: "Informed, empowered individuals who understand their rights"
      },

      SelfRepresentedLitigant: {
        definition: "Individual representing themselves in legal proceedings without a lawyer",
        businessContext: "Primary user demographic for Justice Companion",
        challenges: ["lack of legal knowledge", "complex procedures", "power imbalance"],
        needs: ["clear information", "practical guidance", "emotional support", "resource access"],
        support: "Justice Companion provides information and resources to bridge knowledge gap"
      },

      // ======================
      // TECHNICAL DOMAIN
      // ======================

      LegalComplianceEngine: {
        definition: "System ensuring all operations meet legal and regulatory requirements",
        businessContext: "Maintains trust and legal validity of Justice Companion",
        components: ["GDPR compliance", "data retention", "audit trails", "consent management"],
        monitoring: "Continuous compliance verification every 5 minutes",
        reporting: "Court-admissible audit trails with digital signatures"
      },

      SecureLegalDatabase: {
        definition: "Encrypted database storing case data with legal protections",
        businessContext: "Maintains confidentiality and integrity of legal information",
        features: ["AES-256-GCM encryption", "attorney-client privilege protection", "tamper-proof audit logs"],
        retention: "7-year retention for case data, 10-year for audit trails",
        compliance: "GDPR Article 25 - Data Protection by Design"
      },

      LegalAuditTrail: {
        definition: "Tamper-proof record of all system activities for legal compliance",
        businessContext: "Provides evidence of proper data handling for legal proceedings",
        components: ["timestamp", "action", "user", "data_classification", "integrity_hash"],
        admissibility: "Court-admissible with digital signature verification",
        retention: "10 years minimum for legal proceedings"
      },

      // ======================
      // BOUNDED CONTEXTS
      // ======================

      CaseManagementContext: {
        definition: "Domain context for organizing and tracking legal cases",
        entities: ["Case", "Client", "LegalDocument", "CaseNote"],
        valueObjects: ["CaseNumber", "CaseStatus", "Priority"],
        aggregates: ["Case (root)", "Client (root)"],
        services: ["CaseCreationService", "DocumentStorageService"],
        repositories: ["CaseRepository", "ClientRepository"]
      },

      LegalInformationContext: {
        definition: "Domain context for providing legal information and resources",
        entities: ["LegalTopic", "ResourceDirectory", "EmergencyContact"],
        valueObjects: ["LegalArea", "ResourceType", "ContactDetails"],
        services: ["InformationRetrievalService", "ResourceRecommendationService"],
        repositories: ["LegalTopicRepository", "ResourceRepository"]
      },

      ComplianceContext: {
        definition: "Domain context for legal and regulatory compliance",
        entities: ["ConsentRecord", "AuditEntry", "RetentionPolicy"],
        valueObjects: ["ConsentStatus", "DataClassification", "RetentionPeriod"],
        services: ["ConsentManagementService", "AuditService", "RetentionService"],
        repositories: ["ConsentRepository", "AuditRepository"]
      },

      // ======================
      // VALUE OBJECTS
      // ======================

      CaseNumber: {
        definition: "Unique identifier for legal cases",
        format: "JC-YYYY-NNNNNN (JC-2024-123456)",
        properties: ["prefix", "year", "sequence"],
        invariants: ["Must be unique", "Cannot be modified", "Must follow format"],
        generation: "Sequential with year prefix"
      },

      LegalDeadline: {
        definition: "Time-sensitive requirement in legal proceedings",
        properties: ["dueDate", "description", "priority", "consequences"],
        examples: ["tribunal claim deadline", "notice period", "appeal deadline"],
        importance: "Missing deadlines can result in loss of legal rights",
        handling: "Automatic reminders and priority flagging"
      },

      ContactMethod: {
        definition: "Preferred way to reach legal resources or clients",
        types: ["phone", "email", "in_person", "online_form", "emergency_hotline"],
        properties: ["type", "value", "availability", "cost", "language_support"],
        accessibility: "Must include options for different accessibility needs"
      },

      // ======================
      // DOMAIN SERVICES
      // ======================

      EmergencyDetectionService: {
        definition: "Service to identify crisis situations requiring immediate intervention",
        triggers: ["domestic violence", "suicide ideation", "immediate physical danger"],
        response: ["emergency contacts", "crisis resources", "professional referral"],
        escalation: "Immediate provision of emergency services contact information"
      },

      LegalResourceMatchingService: {
        definition: "Service to connect users with appropriate legal resources",
        inputs: ["legal area", "location", "income level", "urgency"],
        outputs: ["relevant organizations", "contact details", "eligibility criteria"],
        coverage: "National and local legal aid organizations"
      },

      ConsentValidationService: {
        definition: "Service ensuring all data processing has valid legal basis",
        validation: ["explicit consent", "legal obligation", "legitimate interest"],
        tracking: ["consent given", "consent withdrawn", "data processing ceased"],
        compliance: "GDPR Article 6 lawful basis requirements"
      }
    };

    this.domainEvents = {
      CaseCreated: "New legal case opened in system",
      ClientConsentGiven: "Client provides consent for data processing",
      ClientConsentWithdrawn: "Client withdraws consent (GDPR right)",
      EmergencyDetected: "Crisis situation identified requiring immediate response",
      LegalDeadlineApproaching: "Time-sensitive legal requirement due soon",
      DocumentUploaded: "Legal document added to case",
      AuditTrailCreated: "New audit entry for compliance tracking",
      ResourceRecommended: "Legal resource suggested to client",
      ProfessionalReferralRequired: "Situation requires qualified legal advice"
    };

    this.antiCorruptionLayer = {
      definition: "Protection against external system complexity",
      purpose: "Maintain clean domain model despite external dependencies",
      examples: [
        "OllamaAdapter: Wraps AI service with legal safety protocols",
        "DatabaseAdapter: Provides domain-focused data access",
        "ComplianceAdapter: Handles regulatory requirements"
      ]
    };
  }

  // Domain terminology validation
  validateTerminology(term) {
    return this.terminology[term] ? this.terminology[term] : null;
  }

  // Get all terms in a domain area
  getTermsByDomain(domain) {
    return Object.entries(this.terminology)
      .filter(([key, value]) => value.businessContext?.includes(domain))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  }

  // Get bounded context definitions
  getBoundedContexts() {
    return Object.entries(this.terminology)
      .filter(([key]) => key.endsWith('Context'))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  }

  // Export glossary for documentation
  exportGlossary() {
    return {
      metadata: {
        title: "Justice Companion - Legal Domain Ubiquitous Language",
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        purpose: "Standardized terminology for legal assistance platform"
      },
      terminology: this.terminology,
      domainEvents: this.domainEvents,
      antiCorruptionLayer: this.antiCorruptionLayer
    };
  }
}

module.exports = LegalUbiquitousLanguage;