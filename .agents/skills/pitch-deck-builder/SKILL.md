---
name: pitch-deck-builder
description: Create or restructure investor, fundraising, sales, product, and partnership pitch decks through focused discovery, evidence-led narrative planning, outline approval, presentation generation, and visual validation. Use when the user wants a new pitch deck or a weak existing deck rebuilt; use a review-only capability when they want critique without reconstruction.
metadata:
  version: "1.0.1"
  library: "DSFB Professional Services"
  library-url: ""
  pack: "Consulting & Professional Services"
---

# Pitch Deck Builder

Build a persuasive presentation whose story, evidence, and visual hierarchy fit its audience and requested decision. This skill owns discovery and narrative; it delegates file-format mechanics to whatever presentation-generation capability is available in the runtime.

## Workflow

1. Inspect the user’s brief, existing deck, brand assets, metrics, and constraints. Ask only for missing information that would change the narrative: audience, desired decision, problem, solution, proof, business model, differentiation, team credibility, ask, must-use assets, and format.
2. Read [deck strategy](references/pitch-deck-best-practices.md) and choose a sequence appropriate to investor, sales, or partnership use. Do not force every template slide.
3. Read [narrative frameworks](references/narrative-frameworks.md). Draft a slide-by-slide outline with an assertive title, one core message, supporting evidence, visual approach, speaker-note intent, and unresolved data needs.
4. Obtain user approval of the narrative outline before rendering, unless the user explicitly asks for a single-pass draft. Resolve unsupported claims or label them as assumptions/placeholders.
5. Read [data visualization](references/data-visualization-guide.md) when the deck contains quantitative evidence. Select charts based on the comparison being made, not decoration.
6. Use the available presentation-generation skill or tool and follow its instructions completely. Do not install packages, select a renderer, or change the environment without authorization. If no presentation capability is available, deliver the approved content plan and explain what remains.
7. Render and inspect every slide. Fix clipping, overflow, illegible text, weak contrast, inconsistent spacing, misleading charts, missing sources, and narrative discontinuities before delivery.

For large decks, divide work only at natural narrative boundaries and preserve one shared design system. Do not impose a slide-count or token threshold when the work fits safely in one pass.

## Quality bar

- One meaningful claim per slide; titles communicate the takeaway rather than a category label.
- Evidence supports claims. Never invent traction, customers, market size, quotes, financials, credentials, or competitive facts.
- The opening establishes relevance quickly, the middle earns belief, and the ending makes one clear ask.
- Slides are visual support, not documents: prioritize hierarchy, whitespace, readable type, and speaker notes over paragraphs.
- Charts use honest scales, visible units, direct labels, accessible color, and source citations where applicable.
- Existing brand assets are reused when provided; otherwise use a restrained, consistent visual system.

## Boundaries

- Do not contact investors, customers, partners, or other stakeholders without separate authorization.
- Treat securities, valuation, legal, and investment claims as professional-advisor territory.
- Do not expose confidential fundraising, customer, employee, or financial information in examples or external tools.
- Reviewing an existing deck without rebuilding it belongs to `pitch-deck-reviewer`; do not rewrite merely because critique was requested. When the user approves implementation after a review, use the review report as builder input.

The canonical source is `dsfb-professional-services/skills/pitch-deck-builder`. Discovery metadata is in [agents/openai.yaml](agents/openai.yaml).
