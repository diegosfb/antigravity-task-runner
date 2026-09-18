# Security Guideline

This is the operational security contract for every agent working in this
repository. It governs credentials, sensitive data, authentication,
authorization, sessions, dependencies, containers, releases, and incidents. It
is not optional reference material.

The precedence order is `constitution.md` → `AGENTS.md` → this guideline. Stop
and report any request that conflicts with a higher-level security rule or
requires changes to a frozen security-sensitive area.

## Absolute prohibitions

Never place a real credential, password, token, private key, certificate
private key, signing key, connection string, or other secret in:

- Source code, tests, fixtures, examples, documentation, or comments.
- Git history, commits, branches, pull requests, issues, or Jira.
- Logs, traces, metrics, screenshots, error messages, or support bundles.
- Container images, build artifacts, releases, package metadata, or SBOMs.
- IaC source, state committed to Git, user-data scripts, or plain configuration.
- The Obsidian vault, implementation plans, agent prompts, or tool output.
- Frontend bundles, mobile applications, desktop binaries, or other
  user-controlled clients.

If a potential real secret is detected, stop before further writes or commits,
warn the user immediately, avoid repeating the value, and follow the incident
procedure below.

## Centralized secret management

Production and shared-environment secrets must use an approved centralized
secret manager such as:

- HashiCorp Vault.
- AWS Secrets Manager or AWS Systems Manager Parameter Store where suitable.
- Azure Key Vault.
- GCP Secret Manager.
- A deployment platform's encrypted secret store.

Applications obtain secrets at runtime through workload identity, managed
identity, short-lived credentials, a secret-injection sidecar/CSI driver, or an
approved SDK. Prefer dynamic or short-lived credentials over static keys.
Grant least privilege, audit access, minimize copies, and never log returned
values.

## Local development

Prefer the operating-system credential store:

- macOS: Keychain Access.
- Windows: Credential Manager.
- Linux: Secret Service, GNOME Keyring, or KWallet.

The application reads credentials from the OS store at runtime. A local `.env`
file is a fallback only when the OS store or a development secret manager is
not practical.

When `.env` is used:

- Ensure `.env` and all real environment variants are ignored by Git.
- Never commit, upload, attach, or copy the file into an image or release.
- Restrict filesystem permissions.
- Generate it independently in each authorized environment.
- Use `.env.example` to document expected names with obvious dummy values only.
- Validate that `.env.example` contains no credential-shaped real data.

Do not pass real secrets literally on a command line, for example
`docker run -e API_KEY=<real-value>`, because shell history, process inspection,
and logs may expose them. Inject them through the platform's secret facility,
an inherited protected environment, or a mounted secret file without printing
the value.

## Secret lifecycle

Each secret requires an owner, purpose, allowed consumers, storage location,
creation date, rotation method, expiration where supported, and revocation
procedure.

Maximum baseline rotation intervals:

| Secret type | Maximum interval |
|---|---:|
| API keys | 90 days |
| Database passwords | 90 days |
| Certificates | 180 days |
| Administrator credentials | 60 days |

Use shorter intervals when required by risk, regulation, provider capability,
or incident response. Prefer automated zero-downtime rotation and short-lived
credentials. Test rotation and emergency revocation procedures. Remove old
versions only after consumers have switched and verification succeeds.

## Passwords and sensitive data

- Hash passwords with a purpose-built, salted password hashing function:
  Argon2id is preferred; bcrypt, scrypt, or PBKDF2 with current approved
  parameters may be used when required by the platform or standard.
- Never use reversible encryption for user passwords.
- Never use fast general-purpose hashes such as MD5, SHA-1, or unsalted SHA-256
  for password storage.
- Encrypt sensitive data that must later be recovered. Use approved modern
  authenticated encryption and managed keys; hashing is not a replacement for
  encryption.
- Encrypt sensitive transport with current TLS and validate certificates.
- Minimize retention and collection of sensitive information.

Cryptographic changes require security review. Do not invent algorithms or
protocols.

## Authentication and authorization

- Validate authorization server-side on every protected operation.
- Prefer RBAC or ABAC with explicit, least-privilege policies.
- Deny by default; do not rely on hidden frontend controls.
- Separate authentication from authorization and verify both.
- Protect privileged operations with stronger controls, audit logging, and
  just-in-time access where possible.
- Use workload identity or service-specific identities for service-to-service
  access; do not share administrator credentials.

## Session security

- Use `Secure`, `HttpOnly`, and appropriate `SameSite` cookie attributes.
- Define idle and absolute session expiration.
- Rotate session identifiers after authentication and privilege changes.
- Revoke sessions on logout, credential reset, or security events.
- Implement CSRF protection for cookie-authenticated state-changing requests.
- Do not place sensitive tokens in URLs or browser storage when secure cookies
  are appropriate.
- Validate token issuer, audience, signature, expiration, and intended use on
  the server.

## Frontend and backend boundaries

Values that may be public when they contain no hidden secret include:

- Public API base URLs.
- Non-sensitive feature flags.
- Public analytics identifiers.
- Stripe publishable keys.

Never expose:

- Database credentials.
- OpenAI or other provider secret API keys.
- AWS, Azure, or GCP credentials.
- JWT signing or encryption keys.
- OAuth client secrets.
- Internal service tokens, webhook secrets, or administrative endpoints.

Treat every browser, mobile, or desktop client as user-controlled. Build-time
environment variables included in a client bundle are public.

## Pre-commit and release checks

Before committing or producing a release:

1. Inspect the staged or release diff for secrets and credential files.
2. Run the configured secret scanner and relevant security checks.
3. Verify `.env` files, private keys, local credential stores, Terraform state,
   and secret-manager exports are excluded.
4. Inspect built frontend assets and container/image layers for embedded
   secrets.
5. Confirm release configuration references secret stores rather than values.

A scan result must be investigated, not blindly ignored. Redact evidence in
reports.

## Dependency security and SBOM

- Use trusted package registries and verified publishers.
- Pin or lock dependencies according to ecosystem conventions.
- Enable automated dependency and vulnerability scanning.
- Produce and retain a Software Bill of Materials for releases.
- Review critical and high vulnerabilities before merge or release.
- Remove unused dependencies and monitor end-of-life packages.

Recommended tools include Dependabot, Snyk, Trivy, OWASP Dependency-Check, and
ecosystem-native audit tools. Tool choice does not replace human triage.

## Container security

- Use minimal, maintained, pinned base images.
- Run as a non-root user with a read-only filesystem where practical.
- Drop unnecessary Linux capabilities and apply resource limits.
- Do not bake secrets into images or build arguments.
- Scan dependencies, image contents, and runtime configuration.
- Generate an SBOM and sign release images; verify signatures before deploy.
- Restrict registries and use immutable image digests for promotion.
- Apply runtime monitoring and network restrictions.

## Incident procedure

If a secret may have been exposed:

1. Stop propagation and avoid copying or displaying the value.
2. Revoke or disable the credential immediately.
3. Rotate affected and derived credentials.
4. Identify every consumer and update it through the approved secret store.
5. Review access, audit, CI, application, and distribution logs.
6. Open an incident report with severity, timeline, scope, containment, and
   ownership.
7. Remove the secret from current files and artifacts. Treat Git-history
   rewriting as a separate destructive operation requiring explicit approval.
8. Conduct root-cause analysis and add regression controls.

Deleting a secret from the latest commit does not make it safe; assume it was
copied and rotate it.

## Completion

Security work is complete only when secrets remain external to artifacts,
access is least-privilege and auditable, sensitive data has appropriate hashing
or encryption, session and authorization controls are server-enforced, scans
are reviewed, and incident/rotation paths are documented and testable.
