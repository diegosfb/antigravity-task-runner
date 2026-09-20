---
kind: "problem"
date: 2026-09-19T10:03:02Z
agent: "Codex"
---

# VSCE packaging failed because package metadata used a placeholder repository URL

VSCE could not resolve the README's relative LICENSE link because package.json pointed to example.com instead of the actual GitHub repository. Updating the repository URL to the canonical GitHub remote fixed packaging without base URL overrides. The stale MIT package metadata was also synchronized to SEE LICENSE IN LICENSE.

## Related artifacts

None supplied.
