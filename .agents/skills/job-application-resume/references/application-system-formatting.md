# Application-System Formatting Guide

Applicant-tracking and recruiting systems vary by vendor, configuration,
region, and employer workflow. The practices below are conservative readability
guidance, not guarantees of parsing, ranking, acceptance, or recruiter review.
Follow the target employer's current submission instructions when they differ.

Many employers use applicant-tracking or recruiting systems to store,
extract, search, route, and review application materials. Capabilities and
human workflows differ; some systems or configurations may use matching or
ranking features. Optimize for clear human reading and robust text extraction.

---

## Common processing steps

1. **Extracts text** from PDF or DOCX (PDF is fine if exported from a word processor — never an image).
2. **Tags sections** by header words (Experience, Education, Skills, etc.).
3. **Pulls keywords** from each section.
4. May support recruiter search, filters, matching, or ranking.

The employer's process—not this guide—determines how an application is routed
and reviewed.

---

## Formatting Do's

- **Prefer a simple reading order.** Multi-column layouts can extract out of order in some systems.
- **Standard section headers.** Use "Experience", "Education", "Skills", "Projects" — not "Where I've Been" or "What I Bring."
- **Plain fonts.** Arial, Calibri, Helvetica, Times — 10-12pt body, 12-14pt headers.
- **Black text on white background.**
- **Use bullet points (•, -, *)** rather than long paragraphs.
- **Save as DOCX or PDF** (PDF must be text-based, not scanned).
- **Include both spelled-out and acronym** versions of key terms ("Search Engine Optimization (SEO)").
- **Date format:** "Mar 2023 – Present" or "03/2023 – Present" — be consistent.

---

## Formatting Don'ts

- Avoid tables, text boxes, and multi-column structures when reliable extraction matters; test copy-pasted text if using them.
- Do not rely on graphics, icons, or charts to convey required qualifications.
- Keep essential contact information out of headers and footers when possible.
- **No fancy bullet glyphs** (★, ▶, ✓). Stick to •, -, *.
- **No images of text** — never export a resume as an image PDF.
- **No hyperlinks as the only contact info.** Always include the plain text URL.

---

## Keyword Density

- Use important role terminology naturally where it truthfully describes the
  candidate's evidence; do not optimize to a universal density target.
- **Match the JD's exact phrasing** when possible — if it says "Kubernetes", use "Kubernetes", not "K8s alone".
- **Use the term in context**, not as a list dump. "Built a Kubernetes-based deployment pipeline" beats "Skills: Kubernetes."
- **Mirror seniority signals** — "led", "owned", "architected" for senior roles.

---

## Skills Section: Skim-Friendly Lists

Group skills by category, not as one long blob:

```
Languages: Python, TypeScript, Go
Cloud / Infra: AWS, Kubernetes, Terraform, Docker
Data: PostgreSQL, Snowflake, dbt, Airflow
Other: GraphQL, REST APIs, gRPC
```

This format parses cleanly and skims well.

---

## File Naming

Name files predictably so recruiters and ATS dashboards can find them later:

```
FirstLast-Resume-CompanyName.pdf
FirstLast-Resume-RoleTitle.pdf
```

Avoid spaces, version numbers, or dates in the filename.

---

## Common ATS Failure Modes

| Failure | Symptom | Fix |
|---------|---------|-----|
| Mis-parsed dates | Roles appear in wrong order | Use "Mar 2023 – Present" format consistently |
| Lost contact info | Phone or email missing | Move out of headers/footers into body |
| Skills missed | Match score drops despite having skills | Move skills out of sidebar, into a labeled section |
| Garbled formatting | Random characters in extracted text | Re-export from Word/Google Docs as DOCX |
| No section recognition | All bullets lumped together | Use standard section headers verbatim |

---

## Length Guidance

- Choose length for the candidate's career stage, geography, industry, evidence,
  and the employer's instructions. Academic, research, government, and other CV
  formats may be substantially longer.

---

## Final Pre-Submit Checklist

- [ ] Single column, no tables, no graphics
- [ ] Standard section headers
- [ ] Plain text version readable when copy-pasted into a notepad
- [ ] Important job terminology appears only where supported by evidence
- [ ] No weak-phrase blacklist matches
- [ ] Filename in `FirstLast-Resume-CompanyName.pdf` format
- [ ] Both DOCX and PDF generated and tested
