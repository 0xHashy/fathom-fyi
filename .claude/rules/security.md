---
paths:
  - "api/**"
  - "src/**"
---

# Security Rules

## Secrets
- Never log API keys, tokens, or private keys — not even partially
- Never include secrets in error messages returned to users
- Never hardcode secrets — always use environment variables
- If a user pastes a key in chat, refuse to use it and instruct them to put it in .env

## Input Validation
- All query parameters must be sanitized before use
- Asset names: alphanumeric + hyphens only, max 100 chars
- API keys: validate format before database lookup
- Reject unexpected fields — don't pass through arbitrary user input

## API Endpoints (api/*.js)
- Every endpoint must have rate limiting
- Every endpoint must set security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
- CORS must be restricted to fathom.fyi — never use wildcard
- Stripe webhooks must verify signatures before processing
- Never return stack traces or internal error details to clients

## Error Handling
- Catch all errors — never let an endpoint crash
- Return sanitized error messages with appropriate HTTP status codes
- Always return valid JSON, even on errors
- Include agent_guidance in error responses so AI agents know what to do

## Dependencies
- Minimize external dependencies in API routes — prefer native fetch over libraries
- Audit new dependencies before adding — check for known vulnerabilities
- Keep @modelcontextprotocol/sdk and other deps up to date
