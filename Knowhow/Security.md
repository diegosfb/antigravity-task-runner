# Security Notes

## Plain-Text Secret Storage in Claude Config Files

Claude can store values such as `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, and `ANTHROPIC_BASE_URL` in plain text inside local configuration files like `settings.json` or `claude_desktop_config.json`.

This is not unusual for developer tooling, but it is still a meaningful security trade-off. Treat these files as sensitive credentials, not harmless local preferences.

## Why This Matters

If these files are exposed, an attacker may gain direct access to your Anthropic account, usage quota, internal proxy endpoints, or organization-level tooling. In practice, the risk is usually not the file format itself. The risk is how easily plain-text credentials can be copied, committed, or exfiltrated.

## Primary Risks

### Accidental Git Commits

The most common failure mode is accidentally committing `.claude/settings.json` or similar files into a repository. Unlike `.env` files, these paths are not always ignored by default, so they can slip into Git history if you are not careful.

### Prompt or Tool Abuse

Agentic tools can often read files available in the local workspace or user config directories. If you run an untrusted prompt, inspect an untrusted repository, or allow broad tool access, a malicious workflow could try to read local config and send the contents elsewhere.

### Credential Theft by Malware

Modern info-stealing malware explicitly targets common local config paths such as `~/.claude/` or platform-specific app data folders. Plain-text JSON config files are easy targets because they can be harvested without any extra decryption step.

### Endpoint Disclosure

Even if a token is not present, configuration files may still reveal private base URLs, internal gateways, organization naming conventions, or other infrastructure details that are useful to an attacker.

## Recommended Safeguards

### 1. Keep Config Files Out of Git

- Add `.claude/` and related local agent config paths to `.gitignore` where appropriate.
- Check `git status` before every commit.
- Review staged changes carefully before pushing.
- If a secret is ever committed, assume it is compromised and rotate it immediately.

### 2. Treat Local Agent Config as Sensitive

- Do not paste these files into chat tools, tickets, or documentation.
- Do not share screenshots that include local config values.
- Limit filesystem access when experimenting with untrusted prompts or repositories.

### 3. Use Least-Privilege Credentials

- Prefer scoped keys over broad account-wide credentials when the platform supports them.
- Use separate keys for personal work, experiments, CI, and production.
- Route high-risk workflows through limited or revocable credentials.

### 4. Protect the Local Machine

- Keep the OS and browser up to date.
- Use full-disk encryption.
- Use a password manager and strong device login protection.
- Run reputable malware detection, especially on machines that access production systems.

### 5. Rotate and Audit Regularly

- Rotate keys on a schedule.
- Revoke old or unused credentials.
- Review shell history, automation scripts, and local config for copied secrets.
- Audit repositories for accidental secret exposure.

## Practical Checklist

- `.claude/` is ignored by Git where needed.
- No API keys are present in committed JSON, Markdown, or shell scripts.
- Untrusted prompts and repos are treated as high risk.
- Separate credentials are used for local development and production.
- Exposed keys are rotated immediately.

## If You Suspect Exposure

1. Revoke or rotate the affected key immediately.
2. Review recent commits, PRs, gists, logs, and screenshots.
3. Check whether the credential was used from unfamiliar environments.
4. Audit related systems that may have shared the same secret or endpoint.
5. Update ignore rules and workflow guidance so the same leak does not happen again.

## Bottom Line

Plain-text local config storage is convenient, but it shifts responsibility to the operator. Assume these files are sensitive, keep them out of source control, and treat any exposure as a real credential incident.
