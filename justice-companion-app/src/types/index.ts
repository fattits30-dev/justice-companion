// Justice Companion Type Definitions
// Type-safe legal data handling

export interface ILegalCase {
  id: string;
  title: string;
  description: string;
  type: 'housing' | 'employment' | 'family' | 'criminal' | 'civil' | 'immigration' | 'other';
  status: 'active' | 'closed' | 'pending' | 'archived';
  createdAt: string;
  updatedAt?: string;
  clientId?: string;
  facts?: ILegalFact[];
  documents?: IDocument[];
  timeline?: ITimelineEvent[];
}

export interface ILegalFact {
  id: string;
  type: 'date' | 'money' | 'name' | 'location' | 'evidence' | 'statement';
  label: string;
  value: string;
  context?: string;
  verifiedAt?: string;
  source?: string;
}

export interface IMessage {
  id?: string;
  type: 'user' | 'ai' | 'system' | 'error' | 'legal-assistance';
  content: string | ILegalAssistanceResponse;
  timestamp: string;
  metadata?: {
    model?: string;
    processingTime?: number;
    confidence?: number;
    sessionId?: string;
    fallback?: boolean;
  };
  suggestion?: string;
  canRetry?: boolean;
}

export interface ILegalAssistanceResponse {
  summary: string;
  details?: string[];
  confidence: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  domain: 'LANDLORD_TENANT' | 'EMPLOYMENT' | 'FAMILY' | 'CRIMINAL' | 'CIVIL' | 'GENERAL';
  recommendations?: string[];
  nextSteps?: string[];
  resources?: ILegalResource[];
  warnings?: string[];
  disclaimer: boolean;
}

export interface ILegalResource {
  title: string;
  url?: string;
  description?: string;
  type: 'website' | 'document' | 'contact' | 'service';
  priority?: 'high' | 'medium' | 'low';
}

export interface IDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  path: string;
  uploadedAt: string;
  category?: 'evidence' | 'court' | 'correspondence' | 'identification' | 'other';
  isConfidential?: boolean;
}

export interface ITimelineEvent {
  id: string;
  date: string;
  description: string;
  type: 'court' | 'filing' | 'meeting' | 'deadline' | 'other';
  importance: 'low' | 'medium' | 'high' | 'critical';
}

// Security Types
export interface ISecurityContext {
  userId: string;
  sessionId: string;
  role: 'user' | 'legal_aid_worker' | 'attorney' | 'admin';
  permissions: string[];
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface IEncryptedData {
  encryptedData: string;
  iv: string;
  authTag: string;
  metadata?: {
    clientId?: string;
    timestamp?: string;
    algorithm?: string;
  };
}

export interface IAuditLog {
  id: string;
  action: string;
  userId: string;
  timestamp: string;
  resource?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  hash?: string;
  previousHash?: string;
  tamperProof: boolean;
}

// API Types
export interface IAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    suggestion?: string;
    canRetry?: boolean;
  };
  metadata?: {
    requestId: string;
    timestamp: string;
    processingTime?: number;
  };
}

export interface IOllamaConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  stream?: boolean;
}

// Component Props Types
export interface IChatInterfaceProps {
  currentCase?: ILegalCase;
  messages?: IMessage[];
  setMessages?: (messages: IMessage[] | ((prev: IMessage[]) => IMessage[])) => void;
  onFactFound?: (fact: ILegalFact) => void;
  caseManagementBridge?: any; // CaseManagementBridge instance
  onCaseCreated?: (caseData: any) => void;
}

export interface ISidebarProps {
  cases: ILegalCase[];
  selectedCase?: string;
  onSelectCase: (caseId: string) => void;
  onNewCase: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export interface ILegalAssistanceResponseProps {
  response: ILegalAssistanceResponse;
  onQuestionSubmit?: (question: string) => void;
  onResourceClick?: (resource: ILegalResource) => void;
}

// Validation Types
export interface IValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  sanitized?: any;
}

export interface IInputValidation {
  maxLength?: number;
  minLength?: number;
  pattern?: RegExp;
  required?: boolean;
  customValidator?: (value: any) => IValidationResult;
}

// State Management Types
export interface IAppState {
  user?: ISecurityContext;
  cases: ILegalCase[];
  currentCase?: ILegalCase;
  messages: IMessage[];
  isLoading: boolean;
  error?: string;
  disclaimerAccepted: boolean;
}

export interface IAppAction {
  type: string;
  payload?: any;
}

// Electron IPC Types
export interface IElectronAPI {
  aiChat: (message: string, context?: any) => Promise<IAPIResponse<ILegalAssistanceResponse>>;
  aiHealth: () => Promise<{ status: string; model?: string }>;
  saveCase: (caseData: Partial<ILegalCase>) => Promise<IAPIResponse<ILegalCase>>;
  getCases: () => Promise<IAPIResponse<ILegalCase[]>>;
  selectFile: (options?: any) => Promise<string | null>;
  saveDocument: (doc: Partial<IDocument>) => Promise<IAPIResponse<IDocument>>;
  createSession: (userId: string) => Promise<IAPIResponse<ISecurityContext>>;
  validateSession: (sessionId: string) => Promise<IAPIResponse<boolean>>;
  acceptDisclaimer: () => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  getAppInfo: () => Promise<any>;
  validateInput: (input: string, rules?: IInputValidation) => Promise<IValidationResult>;
}

// Extend Window interface for Electron API
declare global {
  interface Window {
    justiceAPI: IElectronAPI;
  }
}

export {};