/**
 * DocumentGenerationService Domain Service
 * Generates legal documents and templates for Justice Companion
 */

const { LegalDocument } = require('../models/LegalDocument');

class DocumentGenerationService {
  constructor() {
    this.templates = this.initializeTemplates();
  }

  /**
   * Generate a legal document based on type and data
   */
  async generateDocument(documentType, caseData, clientData) {
    try {
      // Validate inputs
      if (!documentType || !this.templates[documentType]) {
        throw new Error(`Invalid document type: ${documentType}`);
      }

      // Select appropriate template
      const template = this.templates[documentType];

      // Generate document content
      const content = await this.processTemplate(template, {
        case: caseData,
        client: clientData,
        date: new Date().toLocaleDateString('en-GB'),
        timestamp: new Date().toISOString()
      });

      // Create document model
      const document = new LegalDocument({
        id: this.generateDocumentId(),
        caseId: caseData?.id,
        type: documentType,
        title: this.generateTitle(documentType, caseData),
        content: content,
        template: documentType,
        metadata: {
          generatedAt: new Date(),
          generatedFor: clientData?.name || 'Client',
          caseCategory: caseData?.category
        },
        isPrivileged: false,
        status: 'draft',
        version: 1,
        author: 'Justice Companion AI',
        recipients: this.getDefaultRecipients(documentType, caseData)
      });

      // Validate generated document
      const validation = document.validate();
      if (!validation.isValid) {
        throw new Error(`Document validation failed: ${validation.errors.join(', ')}`);
      }

      return {
        success: true,
        document: document.toJSON()
      };

    } catch (error) {
      console.error('Error generating document:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate letter to landlord
   */
  async generateLandlordLetter(caseData, issueType) {
    const templates = {
      repair_request: this.getRepairRequestTemplate(),
      deposit_return: this.getDepositReturnTemplate(),
      harassment_complaint: this.getHarassmentComplaintTemplate(),
      notice_response: this.getEvictionNoticeResponseTemplate()
    };

    const template = templates[issueType] || templates.repair_request;

    return this.generateDocument('letter', {
      ...caseData,
      template: template,
      recipientType: 'landlord',
      issueType: issueType
    }, caseData.clientData);
  }

  /**
   * Generate employment-related letter
   */
  async generateEmploymentLetter(caseData, letterType) {
    const templates = {
      grievance: this.getGrievanceLetterTemplate(),
      appeal: this.getAppealLetterTemplate(),
      tribunal_claim: this.getTribunalClaimTemplate(),
      data_request: this.getDataRequestTemplate()
    };

    const template = templates[letterType] || templates.grievance;

    return this.generateDocument('letter', {
      ...caseData,
      template: template,
      recipientType: 'employer',
      letterType: letterType
    }, caseData.clientData);
  }

  /**
   * Generate complaint letter
   */
  async generateComplaintLetter(caseData, targetType) {
    const complaintData = {
      ...caseData,
      documentType: 'complaint',
      targetType: targetType
    };

    return this.generateDocument('complaint', complaintData, caseData.clientData);
  }

  /**
   * Generate case summary document
   */
  async generateCaseSummary(caseData, includeNotes = true) {
    const summaryContent = this.buildCaseSummary(caseData, includeNotes);

    const document = new LegalDocument({
      id: this.generateDocumentId(),
      caseId: caseData.id,
      type: 'statement',
      title: `Case Summary - ${caseData.title || 'Legal Matter'}`,
      content: summaryContent,
      metadata: {
        generatedAt: new Date(),
        caseStatus: caseData.status,
        noteCount: caseData.notes?.length || 0
      },
      status: 'final'
    });

    return {
      success: true,
      document: document.toJSON()
    };
  }

  /**
   * Process template with data
   */
  async processTemplate(template, data) {
    let content = template;

    // Replace placeholders with actual data
    const replacements = {
      '{{DATE}}': data.date,
      '{{CLIENT_NAME}}': data.client?.name || '[Your Name]',
      '{{CLIENT_ADDRESS}}': data.client?.address || '[Your Address]',
      '{{CLIENT_EMAIL}}': data.client?.email || '[Your Email]',
      '{{CLIENT_PHONE}}': data.client?.phone || '[Your Phone]',
      '{{CASE_TITLE}}': data.case?.title || '[Case Title]',
      '{{CASE_DESCRIPTION}}': data.case?.description || '[Case Description]',
      '{{CASE_CATEGORY}}': data.case?.category || 'general',
      '{{RECIPIENT_NAME}}': data.case?.recipientName || '[Recipient Name]',
      '{{RECIPIENT_ADDRESS}}': data.case?.recipientAddress || '[Recipient Address]',
      '{{ISSUE_DESCRIPTION}}': data.case?.issueDescription || '[Describe the issue]',
      '{{REQUESTED_ACTION}}': data.case?.requestedAction || '[What you want them to do]',
      '{{DEADLINE}}': data.case?.deadline || '[Reasonable deadline]',
      '{{REFERENCE}}': data.case?.reference || data.case?.id || '[Reference Number]'
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(placeholder, 'g'), value);
    }

    // Process conditional sections
    content = this.processConditionalSections(content, data);

    // Add legal disclaimer if needed
    if (data.case?.includeDisclaimer !== false) {
      content += '\n\n' + this.getLegalDisclaimer();
    }

    return content;
  }

  /**
   * Process conditional sections in template
   */
  processConditionalSections(content, data) {
    // Process IF statements in template
    const ifPattern = /{{IF\s+(.+?)}}([\s\S]*?){{ENDIF}}/g;

    content = content.replace(ifPattern, (match, condition, sectionContent) => {
      // Simple condition evaluation (can be expanded)
      if (this.evaluateCondition(condition, data)) {
        return sectionContent;
      }
      return '';
    });

    return content;
  }

  /**
   * Evaluate template condition
   */
  evaluateCondition(condition, data) {
    // Simple condition evaluation - can be expanded
    try {
      // Check for property existence
      if (condition.includes('.')) {
        const parts = condition.split('.');
        let value = data;
        for (const part of parts) {
          value = value?.[part];
        }
        return !!value;
      }

      // Check direct property
      return !!data[condition];
    } catch {
      return false;
    }
  }

  /**
   * Generate document title
   */
  generateTitle(documentType, caseData) {
    const titles = {
      letter: `Letter - ${caseData?.subject || 'Legal Matter'}`,
      complaint: `Formal Complaint - ${caseData?.targetName || 'Organization'}`,
      appeal: `Appeal - ${caseData?.decisionReference || 'Decision'}`,
      notice: `Legal Notice - ${caseData?.noticeType || 'General'}`,
      agreement: `Agreement - ${caseData?.parties || 'Parties'}`,
      claim: `Claim - ${caseData?.claimType || 'Legal Claim'}`,
      response: `Response - ${caseData?.replyTo || 'Correspondence'}`,
      statement: `Statement - ${caseData?.statementType || 'Witness'}`
    };

    return titles[documentType] || `Legal Document - ${documentType}`;
  }

  /**
   * Get default recipients for document type
   */
  getDefaultRecipients(documentType, caseData) {
    const recipients = [];

    switch (documentType) {
      case 'letter':
        if (caseData?.recipientName) {
          recipients.push({
            name: caseData.recipientName,
            address: caseData.recipientAddress,
            type: 'primary'
          });
        }
        break;
      case 'complaint':
        recipients.push({
          name: caseData?.targetName || 'Organization',
          type: 'respondent'
        });
        break;
      case 'appeal':
        recipients.push({
          name: caseData?.tribunalName || 'Tribunal/Court',
          type: 'tribunal'
        });
        break;
    }

    return recipients;
  }

  /**
   * Build case summary content
   */
  buildCaseSummary(caseData, includeNotes) {
    let summary = `CASE SUMMARY
================

Case Reference: ${caseData.id}
Date Created: ${new Date(caseData.createdAt).toLocaleDateString('en-GB')}
Status: ${caseData.status}
Category: ${caseData.category}
Urgency: ${caseData.urgency || 'normal'}

CASE DETAILS
------------
Title: ${caseData.title}
Description:
${caseData.description}

`;

    // Add key issues if present
    if (caseData.keyIssues?.length > 0) {
      summary += `KEY ISSUES
----------
${caseData.keyIssues.map(issue => `• ${issue}`).join('\n')}

`;
    }

    // Add timeline if notes are included
    if (includeNotes && caseData.notes?.length > 0) {
      summary += `CASE TIMELINE
-------------
`;
      caseData.notes.forEach(note => {
        const date = new Date(note.createdAt).toLocaleDateString('en-GB');
        const time = new Date(note.createdAt).toLocaleTimeString('en-GB');
        summary += `${date} ${time} - ${note.type}
${note.content}

`;
      });
    }

    // Add documents if present
    if (caseData.documents?.length > 0) {
      summary += `DOCUMENTS
---------
${caseData.documents.map(doc => `• ${doc.title} (${doc.type})`).join('\n')}

`;
    }

    // Add recommended actions
    if (caseData.recommendedActions?.length > 0) {
      summary += `RECOMMENDED ACTIONS
------------------
${caseData.recommendedActions.map((action, i) => `${i + 1}. ${action}`).join('\n')}

`;
    }

    return summary;
  }

  /**
   * Get repair request template
   */
  getRepairRequestTemplate() {
    return `{{DATE}}

{{RECIPIENT_NAME}}
{{RECIPIENT_ADDRESS}}

Dear {{RECIPIENT_NAME}},

Re: Request for Urgent Repairs - {{CLIENT_ADDRESS}}

I am writing to formally request urgent repairs to the above property which I rent from you.

The following repairs are required:
{{ISSUE_DESCRIPTION}}

These issues are causing significant problems and may constitute a breach of your obligations under Section 11 of the Landlord and Tenant Act 1985, which requires you to keep the structure and exterior of the property in repair, as well as installations for the supply of water, gas, electricity, and sanitation.

I respectfully request that you:
{{REQUESTED_ACTION}}

Please arrange for these repairs to be completed by {{DEADLINE}}, which I believe is a reasonable timeframe given the urgency of the issues.

If the repairs are not completed within this timeframe, I may have to consider taking further action, which could include:
• Contacting the local authority's Environmental Health Department
• Exercising my right to repair and deduct under common law
• Taking legal action for breach of contract

I look forward to your prompt response and action on this matter.

Yours sincerely,

{{CLIENT_NAME}}
{{CLIENT_EMAIL}}
{{CLIENT_PHONE}}`;
  }

  /**
   * Get deposit return template
   */
  getDepositReturnTemplate() {
    return `{{DATE}}

{{RECIPIENT_NAME}}
{{RECIPIENT_ADDRESS}}

Dear {{RECIPIENT_NAME}},

Re: Return of Tenancy Deposit - {{CLIENT_ADDRESS}}

I am writing to request the immediate return of my tenancy deposit for the above property.

Tenancy Details:
• Tenancy start date: {{TENANCY_START}}
• Tenancy end date: {{TENANCY_END}}
• Deposit amount: {{DEPOSIT_AMOUNT}}
• Deposit protection scheme: {{DPS_SCHEME}}

The tenancy ended on {{TENANCY_END}} and the property was returned to you in good condition, subject to fair wear and tear. It has now been more than 10 days since the end of the tenancy, which is the maximum period allowed under the tenancy deposit protection legislation for the return of deposits.

{{IF case.deductions}}
I note that you have proposed deductions of {{DEDUCTION_AMOUNT}} for {{DEDUCTION_REASON}}. I dispute these deductions because {{DISPUTE_REASON}}.
{{ENDIF}}

Under the Housing Act 2004 and the associated tenancy deposit protection regulations, you are required to:
1. Return the deposit within 10 days of agreement on the amount to be returned
2. Provide evidence for any proposed deductions

Please return my full deposit of {{DEPOSIT_AMOUNT}} to my bank account by {{DEADLINE}}.

If the deposit is not returned by this date, I will raise a dispute with the relevant deposit protection scheme and may seek compensation through the courts, where I could be awarded up to 3 times the deposit amount.

I look forward to receiving the deposit without further delay.

Yours sincerely,

{{CLIENT_NAME}}
{{CLIENT_EMAIL}}
{{CLIENT_PHONE}}`;
  }

  /**
   * Get harassment complaint template
   */
  getHarassmentComplaintTemplate() {
    return `{{DATE}}

{{RECIPIENT_NAME}}
{{RECIPIENT_ADDRESS}}

Dear {{RECIPIENT_NAME}},

Re: Formal Complaint - Harassment and Breach of Quiet Enjoyment

I am writing to make a formal complaint about harassment and breach of my right to quiet enjoyment of the property at {{CLIENT_ADDRESS}}.

The following incidents have occurred:
{{ISSUE_DESCRIPTION}}

This behavior constitutes:
• Harassment under the Protection from Eviction Act 1977
• Breach of my right to quiet enjoyment (implied term in all tenancy agreements)
• Potential criminal offense under the Protection from Harassment Act 1997

This situation is causing me significant distress and is unacceptable.

I require you to:
1. Immediately cease all harassment
2. Respect proper notice periods for any property visits (minimum 24 hours written notice)
3. Communicate only in writing unless in case of genuine emergency
4. Acknowledge this complaint in writing

If this behavior continues, I will:
• Report the matter to the police
• Contact the local authority's Tenancy Relations Officer
• Seek an injunction through the courts
• Pursue a claim for damages

I expect written confirmation within 7 days that you have received this complaint and will comply with my requests.

Yours sincerely,

{{CLIENT_NAME}}
{{CLIENT_EMAIL}}
{{CLIENT_PHONE}}`;
  }

  /**
   * Get eviction notice response template
   */
  getEvictionNoticeResponseTemplate() {
    return `{{DATE}}

{{RECIPIENT_NAME}}
{{RECIPIENT_ADDRESS}}

Dear {{RECIPIENT_NAME}},

Re: Response to Notice to Quit - {{CLIENT_ADDRESS}}

I acknowledge receipt of your notice dated {{NOTICE_DATE}} requesting that I vacate the above property.

However, I must inform you that the notice appears to be invalid for the following reasons:
{{ISSUE_DESCRIPTION}}

Under the Housing Act 1988 and subsequent legislation:
• A valid Section 21 notice requires at least 2 months' notice
• The notice must expire on the last day of a rental period
• You must have complied with all legal requirements including deposit protection, provision of prescribed information, EPC, gas safety certificate, and How to Rent guide

{{IF case.rentArrears}}
Regarding the rent arrears mentioned:
• Current arrears: {{ARREARS_AMOUNT}}
• I propose the following repayment plan: {{REPAYMENT_PLAN}}
{{ENDIF}}

I am willing to discuss this matter to reach an amicable resolution. However, if you attempt to evict me without a valid notice and court order, this would constitute an illegal eviction under the Protection from Eviction Act 1977, which is a criminal offense.

Please note that only a court can legally evict a tenant, and I will defend any possession proceedings if the correct procedures have not been followed.

I suggest we arrange a meeting to discuss this matter properly.

Yours sincerely,

{{CLIENT_NAME}}
{{CLIENT_EMAIL}}
{{CLIENT_PHONE}}`;
  }

  /**
   * Get grievance letter template
   */
  getGrievanceLetterTemplate() {
    return `{{DATE}}

{{RECIPIENT_NAME}}
Human Resources Department
{{RECIPIENT_ADDRESS}}

Dear {{RECIPIENT_NAME}},

Re: Formal Grievance

In accordance with the company grievance procedure, I wish to raise a formal grievance concerning:
{{ISSUE_DESCRIPTION}}

Background:
{{CASE_DESCRIPTION}}

This situation constitutes:
{{IF case.discrimination}}
• Discrimination under the Equality Act 2010
{{ENDIF}}
{{IF case.harassment}}
• Harassment/bullying in the workplace
{{ENDIF}}
{{IF case.breach}}
• Breach of my employment contract
{{ENDIF}}
• Breach of the implied term of mutual trust and confidence

Impact:
This situation has affected me in the following ways:
• Professional impact: {{PROFESSIONAL_IMPACT}}
• Personal impact: {{PERSONAL_IMPACT}}

Resolution sought:
I seek the following resolution:
{{REQUESTED_ACTION}}

I have attempted to resolve this informally by {{INFORMAL_ATTEMPTS}} but this has been unsuccessful.

I request a grievance hearing at your earliest convenience. I wish to be accompanied by {{COMPANION_NAME}}.

Please acknowledge receipt of this grievance within 5 working days as per the ACAS Code of Practice.

Yours sincerely,

{{CLIENT_NAME}}
Employee Number: {{EMPLOYEE_NUMBER}}
{{CLIENT_EMAIL}}
{{CLIENT_PHONE}}`;
  }

  /**
   * Get appeal letter template
   */
  getAppealLetterTemplate() {
    return `{{DATE}}

{{RECIPIENT_NAME}}
{{RECIPIENT_ADDRESS}}

Dear {{RECIPIENT_NAME}},

Re: Appeal Against {{DECISION_TYPE}}

I wish to appeal against the decision to {{DECISION_DESCRIPTION}} communicated to me on {{DECISION_DATE}}.

Grounds for appeal:
{{APPEAL_GROUNDS}}

New evidence/information:
{{IF case.newEvidence}}
I wish to present the following new evidence that was not available at the original hearing:
{{NEW_EVIDENCE}}
{{ENDIF}}

Procedural issues:
{{IF case.proceduralIssues}}
I believe the following procedural issues affected the fairness of the original decision:
{{PROCEDURAL_ISSUES}}
{{ENDIF}}

I request that the decision be reconsidered and {{REQUESTED_OUTCOME}}.

I request an appeal hearing in accordance with the company appeals procedure. I wish to be accompanied by {{COMPANION_NAME}}.

Please acknowledge this appeal within 5 working days and arrange the appeal hearing within the timeframe specified in the company policy.

Yours sincerely,

{{CLIENT_NAME}}
{{CLIENT_EMAIL}}
{{CLIENT_PHONE}}`;
  }

  /**
   * Get tribunal claim template
   */
  getTribunalClaimTemplate() {
    return `EMPLOYMENT TRIBUNAL CLAIM
(ET1 Summary for Legal Advisor)

CLAIMANT DETAILS
Name: {{CLIENT_NAME}}
Address: {{CLIENT_ADDRESS}}
Email: {{CLIENT_EMAIL}}
Phone: {{CLIENT_PHONE}}

RESPONDENT DETAILS
Name: {{EMPLOYER_NAME}}
Address: {{EMPLOYER_ADDRESS}}

EMPLOYMENT DETAILS
Job Title: {{JOB_TITLE}}
Start Date: {{START_DATE}}
End Date: {{END_DATE}}
Salary: {{SALARY}}

CLAIM TYPE
{{CLAIM_TYPES}}

SUMMARY OF CLAIM
{{CASE_DESCRIPTION}}

KEY DATES
{{KEY_DATES}}

ACAS EARLY CONCILIATION
Certificate Number: {{ACAS_NUMBER}}
Date of Certificate: {{ACAS_DATE}}

REMEDY SOUGHT
{{REMEDY_SOUGHT}}

WITNESS INFORMATION
{{WITNESSES}}

Note: This summary should be reviewed by a legal professional before submitting the actual ET1 form to the Employment Tribunal.

Time Limit: Claims must generally be submitted within 3 months less one day from the date of the incident or dismissal.`;
  }

  /**
   * Get data request template
   */
  getDataRequestTemplate() {
    return `{{DATE}}

{{RECIPIENT_NAME}}
Data Protection Officer
{{RECIPIENT_ADDRESS}}

Dear Sir/Madam,

Re: Subject Access Request under UK GDPR/Data Protection Act 2018

I am making a subject access request under Article 15 of the UK GDPR and Section 45 of the Data Protection Act 2018.

Please provide me with all personal data you hold about me, including but not limited to:
• Personnel file
• Emails to/from/about me
• Performance reviews and appraisals
• Disciplinary records
• Meeting notes mentioning me
• CCTV footage
• Access logs
• Training records
• Absence/sickness records

Time period: {{TIME_PERIOD}}

Format: Please provide this information in electronic format where possible.

To assist with identification:
• Full name: {{CLIENT_NAME}}
• Employee/Reference Number: {{EMPLOYEE_NUMBER}}
• Department: {{DEPARTMENT}}
• Date of Birth: {{DOB}}

Under data protection law, you must respond to this request within one calendar month. If you require any additional information to process this request, please contact me immediately.

If you do not normally handle these requests, please pass this letter to your Data Protection Officer or relevant person.

Yours faithfully,

{{CLIENT_NAME}}
{{CLIENT_EMAIL}}
{{CLIENT_PHONE}}`;
  }

  /**
   * Get legal disclaimer
   */
  getLegalDisclaimer() {
    return `---
IMPORTANT NOTICE: This document has been generated by Justice Companion AI as a template based on the information provided. It is for informational purposes only and does not constitute legal advice. You should review and modify this document as needed for your specific circumstances. Consider seeking advice from a qualified legal professional before sending any legal correspondence.`;
  }

  /**
   * Initialize document templates
   */
  initializeTemplates() {
    return {
      letter: this.getGenericLetterTemplate(),
      complaint: this.getGenericComplaintTemplate(),
      appeal: this.getAppealLetterTemplate(),
      notice: this.getGenericNoticeTemplate(),
      statement: this.getGenericStatementTemplate()
    };
  }

  /**
   * Get generic letter template
   */
  getGenericLetterTemplate() {
    return `{{DATE}}

{{RECIPIENT_NAME}}
{{RECIPIENT_ADDRESS}}

Dear {{RECIPIENT_NAME}},

Re: {{CASE_TITLE}}

{{CASE_DESCRIPTION}}

{{REQUESTED_ACTION}}

I look forward to your response by {{DEADLINE}}.

Yours sincerely,

{{CLIENT_NAME}}
{{CLIENT_EMAIL}}
{{CLIENT_PHONE}}`;
  }

  /**
   * Get generic complaint template
   */
  getGenericComplaintTemplate() {
    return `{{DATE}}

{{RECIPIENT_NAME}}
Complaints Department
{{RECIPIENT_ADDRESS}}

Dear Sir/Madam,

FORMAL COMPLAINT - {{CASE_TITLE}}

I am writing to make a formal complaint regarding:
{{ISSUE_DESCRIPTION}}

What happened:
{{CASE_DESCRIPTION}}

What I would like you to do:
{{REQUESTED_ACTION}}

I expect a response within {{DEADLINE}} as per your complaints procedure.

Yours faithfully,

{{CLIENT_NAME}}
{{CLIENT_EMAIL}}
{{CLIENT_PHONE}}`;
  }

  /**
   * Get generic notice template
   */
  getGenericNoticeTemplate() {
    return `LEGAL NOTICE

Date: {{DATE}}

To: {{RECIPIENT_NAME}}
{{RECIPIENT_ADDRESS}}

NOTICE OF {{NOTICE_TYPE}}

You are hereby notified that:
{{CASE_DESCRIPTION}}

Action required:
{{REQUESTED_ACTION}}

Deadline: {{DEADLINE}}

Failure to comply with this notice may result in legal action.

{{CLIENT_NAME}}
{{CLIENT_ADDRESS}}`;
  }

  /**
   * Get generic statement template
   */
  getGenericStatementTemplate() {
    return `WITNESS STATEMENT

I, {{CLIENT_NAME}}, of {{CLIENT_ADDRESS}}, state as follows:

1. I make this statement in relation to {{CASE_TITLE}}.

2. The facts in this statement are within my own knowledge unless otherwise stated, and I believe them to be true.

3. {{CASE_DESCRIPTION}}

Statement of Truth:
I believe that the facts stated in this witness statement are true.

Signed: _________________
{{CLIENT_NAME}}
Date: {{DATE}}`;
  }

  /**
   * Helper: Generate document ID
   */
  generateDocumentId() {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = { DocumentGenerationService };