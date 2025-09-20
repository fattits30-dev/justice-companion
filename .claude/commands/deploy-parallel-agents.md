# Deploy Parallel Legal Tech Subagents

Deploy multiple specialized Claude Code subagents in parallel for Justice Companion development to maximize efficiency and specialization.

## Usage

```bash
@deploy-parallel-agents [development-phase] [priority-level]
```

### Parameters
- `development-phase`: The current development focus (frontend, backend, integration, debugging, review)
- `priority-level`: Urgency level (critical, high, medium, low)

## Deployment Strategies

### Full Stack Development
```bash
# Deploy all 4 core agents for comprehensive development
@legal-frontend-developer & @legal-backend-developer & @legal-api-developer & @legal-code-reviewer
```

### Frontend-Focused Sprint
```bash
# Deploy frontend specialist with reviewer for UI/UX intensive work
@legal-frontend-developer & @legal-code-reviewer
```

### Backend & Integration Sprint
```bash
# Deploy backend and API specialists for server-side development
@legal-backend-developer & @legal-api-developer & @legal-debugger
```

### Code Quality & Security Review
```bash
# Deploy reviewer and debugger for security audits and bug fixes
@legal-code-reviewer & @legal-debugger
```

### Crisis Response (Production Issues)
```bash
# Deploy debugger with backend support for urgent production fixes
@legal-debugger & @legal-backend-developer
```

## Parallel Task Distribution

### By File Type
- **Frontend Agent**: `.jsx`, `.css`, `components/`, `renderer/`
- **Backend Agent**: `main.js`, `preload.js`, `lib/`, `api/`
- **API Agent**: External integrations, `OllamaClient.js`, service connections
- **Reviewer**: Security audits, code quality, compliance checks
- **Debugger**: Error investigation, performance issues, troubleshooting

### By Feature Area
- **Case Management**: Frontend + Backend + Reviewer
- **Chat Interface**: Frontend + API + Debugger
- **Document Handling**: Backend + API + Reviewer
- **Security Features**: Backend + Reviewer + Debugger
- **AI Integration**: API + Frontend + Debugger

## Coordination Patterns

### Sequential Handoffs
1. **API Developer** creates endpoints
2. **Backend Developer** integrates with main process
3. **Frontend Developer** builds UI components
4. **Code Reviewer** audits implementation
5. **Debugger** resolves any issues

### Parallel Development
- **Frontend & Backend** work simultaneously on different aspects
- **API Developer** handles external integrations independently
- **Code Reviewer** audits code as it's developed
- **Debugger** monitors for issues across all streams

### Conflict Resolution
- Use file-level coordination to avoid merge conflicts
- Implement branch-based development for major features
- Regular sync points between agents for integration
- Code Reviewer mediates architectural decisions

## Best Practices

### Communication Protocol
- Use commit messages for agent coordination
- Implement shared documentation for API contracts
- Regular status updates through issue tracking
- Cross-agent code reviews for critical functionality

### Quality Assurance
- Each agent specializes in their domain expertise
- Code Reviewer validates all security-sensitive code
- Debugger maintains system stability throughout development
- Regular integration testing between agent contributions

### Legal Compliance
- All agents follow legal data protection standards
- Code Reviewer enforces compliance requirements
- Audit trails maintained for all development activities
- Client confidentiality preserved across all agent interactions