// Legal Assistant Engine for Justice Companion
// Transforms user input into structured legal assistance
// Provides INFORMATION not ADVICE - compliant with legal practice regulations

class LegalAssistantEngine {
  constructor() {
    this.legalCategories = {
      HOUSING: {
        keywords: ['evicted', 'eviction', 'landlord', 'rent', 'tenancy', 'deposit', 'repairs', 'notice'],
        subcategories: ['eviction', 'rent_issues', 'repairs', 'deposits', 'harassment']
      },
      EMPLOYMENT: {
        keywords: ['fired', 'dismissed', 'overtime', 'wages', 'discrimination', 'harassment', 'redundancy'],
        subcategories: ['unfair_dismissal', 'wage_theft', 'discrimination', 'harassment', 'redundancy']
      },
      CONSUMER: {
        keywords: ['refund', 'scam', 'faulty', 'warranty', 'debt', 'credit', 'goods', 'services'],
        subcategories: ['faulty_goods', 'debt_collection', 'scams', 'warranties', 'credit_issues']
      },
      COUNCIL: {
        keywords: ['council', 'benefits', 'housing_benefit', 'council_tax', 'social_services'],
        subcategories: ['benefits', 'council_tax', 'housing_benefit', 'complaints']
      }
    };

    this.disclaimer = "⚖️ **LEGAL INFORMATION NOTICE**: I provide general legal information, not legal advice. This information should not be used as a substitute for professional legal advice. For specific legal guidance, consult a qualified solicitor.";
  }

  // Analyze user input and categorize legal issue
  categorizeIssue(userInput) {
    const input = userInput.toLowerCase();
    let bestMatch = { category: null, confidence: 0, subcategory: null };

    for (const [category, config] of Object.entries(this.legalCategories)) {
      const matches = config.keywords.filter(keyword => input.includes(keyword));
      const confidence = matches.length / config.keywords.length;
      
      if (confidence > bestMatch.confidence) {
        bestMatch = { category, confidence, subcategory: this.detectSubcategory(input, config) };
      }
    }

    return bestMatch;
  }

  detectSubcategory(input, categoryConfig) {
    // Simple keyword matching for subcategories
    for (const subcategory of categoryConfig.subcategories) {
      if (input.includes(subcategory.replace('_', ' '))) {
        return subcategory;
      }
    }
    return categoryConfig.subcategories[0]; // Default to first subcategory
  }

  // Generate structured response for legal assistance
  async generateLegalAssistance(userInput) {
    const issue = this.categorizeIssue(userInput);
    
    if (!issue.category) {
      return this.generateGeneralIntake(userInput);
    }

    switch (issue.category) {
      case 'HOUSING':
        return this.generateHousingAssistance(userInput, issue.subcategory);
      case 'EMPLOYMENT':
        return this.generateEmploymentAssistance(userInput, issue.subcategory);
      case 'CONSUMER':
        return this.generateConsumerAssistance(userInput, issue.subcategory);
      case 'COUNCIL':
        return this.generateCouncilAssistance(userInput, issue.subcategory);
      default:
        return this.generateGeneralIntake(userInput);
    }
  }

  generateHousingAssistance(userInput, subcategory) {
    const response = {
      disclaimer: this.disclaimer,
      category: 'Housing & Tenant Rights',
      subcategory: subcategory,
      immediateGuidance: null,
      questions: [],
      documents: [],
      timeline: [],
      resources: []
    };

    if (subcategory === 'eviction') {
      response.immediateGuidance = `**URGENT - Eviction Defense Information**

If you've received an eviction notice, time is critical. Here's immediate information:

**Your Rights:**
• You cannot be evicted without a court order
• You have the right to defend against eviction in court
• Your landlord must follow proper legal procedures
• You may be entitled to compensation if procedures weren't followed

**Immediate Steps:**
1. Gather all documents (tenancy agreement, notice, correspondence)
2. Check if proper notice period was given
3. Identify possible defenses
4. Respond within required timeframe`;

      response.questions = [
        "What type of eviction notice did you receive? (Section 8, Section 21, or other)",
        "When did you receive the notice?",
        "How long have you lived at the property?",
        "Do you have a written tenancy agreement?",
        "Are you in rent arrears? If so, how much?",
        "Has your landlord followed proper procedures?"
      ];

      response.documents = [
        "Eviction Defense Response Letter Template",
        "Court Defense Form (N11B)",
        "Evidence Checklist for Eviction Defense",
        "Witness Statement Template",
        "Financial Statement Form"
      ];

      response.timeline = [
        { deadline: "Immediate", task: "Gather all housing documents and correspondence" },
        { deadline: "Within 14 days", task: "Submit defense to court (if proceedings started)" },
        { deadline: "Before hearing", task: "Prepare evidence and witness statements" },
        { deadline: "Court date", task: "Attend court hearing with all evidence" }
      ];

      response.resources = [
        "Shelter Housing Advice",
        "Citizens Advice Bureau",
        "Local Authority Housing Department",
        "Free Legal Aid Housing Solicitors",
        "Tenant Rights Organizations"
      ];
    }

    return response;
  }

  generateEmploymentAssistance(userInput, subcategory) {
    // Similar structure for employment issues
    return {
      disclaimer: this.disclaimer,
      category: 'Employment Rights',
      subcategory: subcategory,
      immediateGuidance: "**Employment Rights Information**\n\nEmployment law protects workers from unfair treatment. Here's what you need to know...",
      questions: [
        "How long have you been employed?",
        "Do you have a written contract?",
        "What is the specific issue you're facing?"
      ],
      documents: ["Grievance Letter Template", "Employment Tribunal Claim Form"],
      timeline: [
        { deadline: "Within 3 months", task: "File employment tribunal claim if applicable" }
      ],
      resources: ["ACAS", "Citizens Advice", "Trade Unions", "Employment Law Solicitors"]
    };
  }

  generateConsumerAssistance(userInput, subcategory) {
    // Consumer rights assistance
    return {
      disclaimer: this.disclaimer,
      category: 'Consumer Rights',
      subcategory: subcategory,
      immediateGuidance: "**Consumer Rights Information**\n\nConsumer protection laws give you rights when purchasing goods and services...",
      questions: [
        "What product or service is involved?",
        "When did you purchase it?",
        "What is the specific problem?"
      ],
      documents: ["Complaint Letter Template", "Chargeback Request Form"],
      timeline: [
        { deadline: "Immediate", task: "Contact seller to resolve issue" },
        { deadline: "If no resolution", task: "Escalate to trading standards or ombudsman" }
      ],
      resources: ["Citizens Advice Consumer Service", "Trading Standards", "Financial Ombudsman"]
    };
  }

  generateCouncilAssistance(userInput, subcategory) {
    // Council and benefits assistance
    return {
      disclaimer: this.disclaimer,
      category: 'Council & Benefits',
      subcategory: subcategory,
      immediateGuidance: "**Council Services & Benefits Information**\n\nYou have rights regarding council services and benefit entitlements...",
      questions: [
        "Which council service is involved?",
        "What is the specific issue?",
        "Have you tried to resolve this with the council?"
      ],
      documents: ["Council Complaint Form", "Benefits Appeal Letter"],
      timeline: [
        { deadline: "Immediate", task: "Contact relevant council department" },
        { deadline: "If unresolved", task: "Use formal complaints procedure" }
      ],
      resources: ["Local Citizens Advice", "Council Complaints Department", "Benefits Appeal Service"]
    };
  }

  generateGeneralIntake(userInput) {
    return {
      disclaimer: this.disclaimer,
      category: 'General Legal Information',
      subcategory: 'intake',
      immediateGuidance: `**Legal Information Service**

I can help provide information about:
• Housing and tenant rights
• Employment law
• Consumer rights  
• Council services and benefits

Please describe your situation in more detail, including:
• What type of legal issue you're facing
• When it started
• What action you've already taken`,
      questions: [
        "What area of law does your issue relate to?",
        "Can you provide more specific details about your situation?",
        "What outcome are you hoping to achieve?"
      ],
      documents: [],
      timeline: [],
      resources: ["Citizens Advice Bureau", "Legal Aid Agency", "Local Law Centres"]
    };
  }

  // Generate document templates based on the legal issue
  generateDocumentTemplate(documentType, userResponses) {
    const templates = {
      "Eviction Defense Response Letter Template": `
[Your Name]
[Your Address]
[Date]

[Landlord's Name]
[Landlord's Address]

Re: Response to Eviction Notice - [Property Address]

Dear [Landlord's Name],

I am writing in response to your eviction notice dated [Date] regarding the above property.

[DEFENSE SECTION - to be customized based on user's situation]

I believe this eviction notice is [invalid/improper] for the following reasons:
1. [Reason 1]
2. [Reason 2]

I request that you:
• Withdraw the eviction notice
• [Specific requests based on situation]

I look forward to resolving this matter without court proceedings.

Yours sincerely,
[Your Name]
      `,
      // Add more templates as needed
    };

    return templates[documentType] || "Template not found";
  }
}

export default LegalAssistantEngine;