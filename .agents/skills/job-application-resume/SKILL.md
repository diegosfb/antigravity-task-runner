---
name: job-application-resume
description: Tailor a truthful resume or CV and supporting cover-letter evidence to a specific job description. Use for role alignment, application-system readability, evidence-based bullet revision, and qualification-gap analysis; do not invent experience, skills, credentials, achievements, or ATS outcomes.
license: MIT + Commons Clause
metadata:
  version: "1.1.0"
  author: "borghei; adapted by DSFB"
  library: "Borghei Claude Skills, adapted by DSFB"
  library-url: "https://github.com/borghei/Claude-Skills"
  pack: "Productivity Tools"
---

# Job Application Resume

Create the strongest truthful application variant from the candidate's factual master resume and the target role. Improve relevance and readability without gaming application systems or manufacturing qualifications.

## Inputs

Establish the target job description, master resume/CV, desired role and geography, required output format, length or institutional constraints, and whether a cover letter or evidence hooks are requested. Preserve the master resume as the source of truth; write a new variant unless the user explicitly authorizes overwriting it.

Classify every material job requirement as:

- `EVIDENCED` — directly supported by the candidate's supplied history;
- `PLAUSIBLY RELEVANT` — related experience that must be phrased without overstating equivalence;
- `MISSING` — not supported and must not be added;
- `CLARIFY` — potentially supported but requiring candidate confirmation.

## Workflow

1. Identify the role's responsibilities, required and preferred qualifications, domain language, seniority signals, and evidence expectations. Do not treat repeated words as proof of importance when the job description says otherwise.
2. Map requirements to supplied roles, projects, skills, education, certifications, and outcomes. Ask only about material `CLARIFY` items; never convert inference into biography.
3. Optionally run `python3 scripts/job_description_term_matcher.py <resume.txt> <job-description.txt>` for a lexical coverage check. Its percentage measures weighted term overlap only—not candidate fit, recruiter ranking, ATS acceptance, or interview probability.
4. Prioritize and rewrite bullets using [bullet rewrite patterns](references/bullet_rewrite_patterns.md). Preserve employer, title, dates, scope, technology, ownership, and outcome facts. Use numbers only when supplied or confirmed.
5. Adapt summary, skill ordering, and evidence emphasis to the role. Use exact job terminology only where it truthfully describes the candidate's experience.
6. For parsing/readability considerations, read [application-system formatting](references/application-system-formatting.md). Treat vendor behavior as variable and current platform instructions as authoritative.
7. If requested, derive cover-letter evidence from the same fact map; do not invent motivation, personal connection, or company enthusiasm.
8. Produce the requested format using [resume template](assets/tailored_resume_template.md) only when a new structure is useful. Preserve the user's established layout when it already works.

## Output

Return:

- the tailored resume or revision set;
- a concise requirement-to-evidence map;
- material gaps or claims awaiting confirmation;
- optional cover-letter evidence hooks when requested;
- a note describing what changed and what was intentionally not added.

## Quality and safety

- Optimize for a human reader first and machine readability second.
- Do not claim that formatting or keyword changes will pass an ATS or produce an interview.
- Resume length depends on career stage, geography, industry, institution, and requested format; do not impose a universal page limit.
- Avoid keyword stuffing, invisible text, misleading titles, inflated ownership, altered employment dates, or unearned credentials.
- Protect addresses, phone numbers, email addresses, employment details, and other personal data. Do not upload or submit an application without separate explicit authorization.
- Keep alternate versions traceable to the factual master resume.
