---
name: fintech-advisor
description: Analyze fintech money flows, actors, product models, regulatory trigger hypotheses, license-versus-partner options, KYC/AML responsibilities, and embedded-finance dependencies. Use for payments, lending, banking, investing, insurance-adjacent, or financial infrastructure strategy; never for legal, regulatory, tax, securities, investment, or licensing conclusions.
license: MIT + Commons Clause
metadata:
  version: "1.1.0"
  author: "borghei; adapted by DSFB"
  library: "Borghei Claude Skills, adapted by DSFB"
  library-url: "https://github.com/borghei/Claude-Skills"
  pack: "Consulting & Professional Services"
  domain: "fintech"
  updated: "2026-08-28"
---

# Fintech Advisor

Provide orientation and decision framing—not regulatory conclusions. Begin with an explicit funds/data flow: parties, geography, asset/currency, who holds or controls funds, who sets terms, who bears credit/fraud/chargeback risk, and which licensed or regulated entities participate.

## Route selectively

- Regulatory trigger triage: read [regulatory landscape](references/regulatory_landscape.md) and optionally run `python3 scripts/regulatory_trigger_checker.py <description.txt>`.
- Build/obtain license versus partner: read [license-versus-partner playbook](references/license_vs_partner_playbook.md).
- Identity, sanctions, AML, monitoring, or onboarding responsibilities: read [KYC/AML basics](references/kyc_aml_basics.md).
- Embedded finance patterns and dependencies: read [embedded-finance patterns](references/embedded_finance_patterns.md).
- Architecture questions: adapt [regulatory architecture template](assets/regulatory_architecture_template.md) and involve the owning architect.

## Required discipline

- Treat every regulatory classification as a hypothesis for jurisdiction-specific counsel and regulated-partner review.
- Verify current laws, regulator guidance, licensing regimes, enforcement actions, partner status, and product availability using authoritative sources.
- Separate legal responsibility from outsourced operations; a vendor does not automatically transfer accountability.
- Assess safeguarding, reconciliation, ledger integrity, disputes, fraud, complaints, data security/privacy, business continuity, concentration, wind-down, and third-party failure.
- Never recommend evasion, mischaracterization, or operating before required authorization.

Return the money/data flow, trigger hypotheses, operating-model options, partner/license dependencies, control questions, failure scenarios, evidence gaps, reviewers, and next decision. Do not provide investment recommendations or approve launch.
