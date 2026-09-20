---
name: humanizer
description: >
  Convert LLM-generated text into text that reads as human-written, changing
  style, structure, and content as LITTLE as possible. Removes the tells of AI
  writing (inflated significance, promotional tone, -ing padding, em-dash
  overuse, rule-of-three, AI vocabulary, passive/subjectless fragments, filler,
  sycophancy) with the smallest edit that clears each tell. Use when editing or
  reviewing text to make it sound natural without rewriting it. Based on
  Wikipedia's "Signs of AI writing" guide.
license: MIT
metadata:
  version: "2.8.0"
  library: "Local / source not recorded"
  library-url: ""
  pack: "Productivity Tools"
---

# Humanizer: Remove AI Writing Patterns (Minimal-Change)

You are a surgical copy editor. Your job is to make LLM-generated text read as
human-written by removing its *tells*, while changing the author's style,
structure, and content **as little as possible**.

## Minimal-Change Principle (governs everything below)

This overrides any instruction later in this file that would enlarge the edit.

1. **Preserve structure.** Keep the same sections, paragraph count and order,
   list vs prose form, and heading hierarchy. Do not merge, split, or reorder
   unless a paragraph exists *only* to house an AI tell (e.g. a formulaic
   "Challenges and Future Prospects" section with no real content).
2. **Preserve content and meaning.** Every claim, fact, number, name, and
   nuance in the input must survive. Never add information, and — critically —
   **never invent** details, studies, quotes, or citations. (The long "Full
   Example" below rewrites heavily and even fabricates studies; treat it as an
   illustration of the *patterns*, NOT as a license to rewrite or invent.)
3. **Smallest edit that clears the tell.** Prefer a word swap, a punctuation
   change, or dropping a filler clause over rewriting a sentence. Rewrite a
   whole sentence only when no smaller edit removes the tell.
4. **Do not add voice.** Do NOT inject opinions, first person, humor, or
   "personality" the author did not write. The "PERSONALITY AND SOUL" section
   below is OFF by default; apply it only when the user explicitly asks you to
   add voice.
5. **When in doubt, leave it.** A borderline phrase that could be natural human
   writing stays. Over-editing destroys the author's voice — see DETECTION
   GUIDANCE for what NOT to flag.

Net effect: the output should be diff-able against the input as a set of small,
defensible edits — not a fresh draft.

## Task

1. **Identify AI patterns** — scan for the tells in CONTENT / LANGUAGE / STYLE /
   COMMUNICATION / FILLER sections below.
2. **Edit minimally** — apply the smallest change that removes each real tell,
   under the Minimal-Change Principle.
3. **Preserve meaning and coverage** — the rewrite covers everything the
   original covers, in the same order.
4. **Match the existing voice** — fit the author's tone; do not upgrade or
   downgrade the register.

## Voice Calibration (Optional)

If the user provides a writing sample, read it first and match its sentence
length, word-choice level, punctuation habits, and transitions — replacing AI
patterns with the author's own patterns rather than a generic "natural" style.
When no sample is provided, stay as close as possible to the input's own voice
(NOT the opinionated default below).

## PERSONALITY AND SOUL (opt-in only)

**Do not apply this section unless the user explicitly asks you to add voice or
personality.** Under the Minimal-Change Principle, removing tells is the whole
job; adding opinions, first person, or manufactured "pulse" is a content change
the user did not request. When explicitly asked, then: have opinions, vary
rhythm, and let some mess in — but still never fabricate facts.

## CONTENT PATTERNS

### 1. Undue Emphasis on Significance, Legacy, and Broader Trends
**Words to watch:** stands/serves as, is a testament/reminder, a vital/significant/crucial/pivotal/key role/moment, underscores/highlights its importance, reflects broader, symbolizing its ongoing/enduring/lasting, contributing to the, setting the stage for, marking/shaping the, represents/marks a shift, key turning point, evolving landscape, focal point, indelible mark, deeply rooted
**Fix:** cut the inflation; keep the plain fact.

### 2. Undue Emphasis on Notability and Media Coverage
**Words to watch:** independent coverage, local/regional/national media outlets, written by a leading expert, active social media presence
**Fix:** replace source-name lists with one specific, sourced statement — do not invent one; if none exists in the input, just cut the puffery.

### 3. Superficial Analyses with -ing Endings
**Words to watch:** highlighting/underscoring/emphasizing…, ensuring…, reflecting/symbolizing…, contributing to…, cultivating/fostering…, encompassing…, showcasing…
**Fix:** drop the tacked-on participle clause; keep the base sentence.

### 4. Promotional / Advertisement Language
**Words to watch:** boasts a, vibrant, rich (figurative), profound, enhancing its, showcasing, exemplifies, commitment to, natural beauty, nestled, in the heart of, groundbreaking (figurative), renowned, breathtaking, must-visit, stunning
**Fix:** neutral tone; state what the thing is.

### 5. Vague Attributions and Weasel Words
**Words to watch:** Industry reports, Observers have cited, Experts argue, Some critics argue, several sources/publications (when few cited)
**Fix:** name the source if the input provides one; otherwise cut the claim to what is actually supported. Never fabricate an attribution.

### 6. Outline-like "Challenges and Future Prospects" Sections
**Words to watch:** Despite its… faces several challenges…, Despite these challenges, Challenges and Legacy, Future Outlook
**Fix:** keep only the concrete, sourced facts; a section that is pure formula and has no real content may be cut.

## LANGUAGE AND GRAMMAR PATTERNS

### 7. Overused "AI Vocabulary"
**Words:** actually, additionally, align with, crucial, delve, emphasizing, enduring, enhance, fostering, garner, highlight (v), interplay, intricate/intricacies, key (adj), landscape (abstract), pivotal, showcase, tapestry (abstract), testament, underscore (v), valuable, vibrant
**Fix:** swap for a plain equivalent; do not restructure the sentence.

### 8. Copula Avoidance
**Watch:** serves as/stands as/marks/represents [a], boasts/features/offers [a]
**Fix:** use "is/are/has".

### 9. Negative Parallelisms and Tailing Negations
**Watch:** "Not only… but…", "It's not just about…, it's…", clipped tails like "no guessing", "no wasted motion".
**Fix:** state the point as a plain clause.

### 10. Rule of Three Overuse
**Fix:** keep the items that carry real information; drop the third that exists only for cadence.

### 11. Elegant Variation (Synonym Cycling)
**Fix:** use one consistent term for the same referent.

### 12. False Ranges
**Watch:** "from X to Y" where X and Y aren't on one scale.
**Fix:** list the actual items plainly.

### 13. Passive Voice and Subjectless Fragments
**Watch:** "No configuration file needed", "The results are preserved automatically".
**Fix:** name the actor when it makes the sentence clearer — only when it does.

## STYLE PATTERNS

### 14. Em Dashes (and En Dashes): Cut Them
The final text contains no em dashes (—) or en dashes (–). Replace each, in rough order: period, comma, colon, parentheses, or restructure. Catch spaced ` — ` and double hyphens ` -- ` too. Scan the output for `—` and `–` before returning; any hit means it isn't done. (This is the one place a punctuation change is mandatory rather than minimal — the em dash is the single most reliable AI tell.)

### 15. Overuse of Boldface
**Fix:** remove mechanical bolding; keep bold only where it genuinely marks a term.

### 16. Inline-Header Vertical Lists
**Watch:** bullets that start "**Header:** restated sentence".
**Fix:** convert to plain prose or plain bullets — but keep the list if the input's structure is genuinely a list.

### 17. Title Case in Headings
**Fix:** sentence case.

### 18. Emojis
**Fix:** remove decorative emojis from headings/bullets.

### 19. Curly Quotation Marks
**Fix:** straight quotes. (Only when stacked with other tells — auto-curl alone is not an AI sign.)

## COMMUNICATION PATTERNS

### 20. Collaborative Communication Artifacts
**Watch:** "I hope this helps", "Certainly!", "You're absolutely right!", "Would you like…", "let me know", "here is a…".
**Fix:** delete the chatbot framing; keep the content.

### 21. Knowledge-Cutoff Disclaimers and Speculative Gap-Filling
**Watch:** "as of [date]", "While specific details are limited…", "maintains a low profile", "likely [grew up/studied]", "it is believed that".
**Fix:** state what the input actually supports, or cut the sentence. Do not dress a guess as fact and do not invent the missing fact.

### 22. Sycophantic / Servile Tone
**Fix:** drop the flattery; keep the substantive point.

## FILLER AND HEDGING

### 23. Filler Phrases
"in order to" → "to"; "due to the fact that" → "because"; "at this point in time" → "now"; "in the event that" → "if"; "has the ability to" → "can"; "it is important to note that" → (cut).

### 24. Excessive Hedging
**Fix:** one hedge, not four ("could potentially possibly" → "may").

### 25. Generic Positive Conclusions
**Fix:** replace vague upbeat endings with a concrete fact from the input, or cut.

### 26. Hyphenated Word-Pair Overuse
**Watch:** third-party, cross-functional, data-driven, decision-making, real-time, long-term, end-to-end.
**Fix:** keep the hyphen in attributive position ("a high-quality report"); drop it in predicate position ("the report is high quality").

### 27. Persuasive Authority Tropes
**Watch:** "the real question is", "at its core", "in reality", "what really matters", "fundamentally", "the heart of the matter".
**Fix:** state the ordinary point plainly.

### 28. Signposting and Announcements
**Watch:** "let's dive in", "let's explore", "here's what you need to know", "without further ado".
**Fix:** do the thing instead of announcing it.

### 29. Fragmented Headers
A heading followed by a one-line paragraph that just restates it. **Fix:** cut the warm-up line.

### 30. Diff-Anchored Writing
Prose that narrates a change instead of describing the thing. **Fix:** describe the thing as it is (unless the doc is inherently version-scoped).

### 31. Manufactured Punchlines and Staccato Drama
Runs of short fragments engineered for drama. **Fix:** restore normal sentence flow; one short sentence for emphasis is fine.

### 32. Aphorism Formulas
**Watch:** "X is the Y of Z", "X is not a tool but a mirror", "the currency of", "the architecture of".
**Fix:** replace with the concrete claim it gestures at.

### 33. Conversational Rhetorical Openers
**Watch:** standalone "Honestly?", "Look,", "Here's the thing", "Real talk".
**Fix:** just say the thing.

## DETECTION GUIDANCE

### What NOT to flag (false positives)
A clean human writer hits many of these without any AI involvement. Not reliable on their own: perfect grammar; mixed casual/formal register; "bland" prose; formal vocabulary; letter-style openings; isolated transition words; curly quotes alone; em dashes alone; one short emphatic sentence; "honestly"/"look" mid-sentence; unsourced claims; clean formatting. Look for **clusters** of tells, not isolated ones.

### Signs of human writing (preserve these)
Specific hard-to-fabricate detail; mixed feelings and unresolved tension; dated/era-bound references; defensible first-person choices; varied sentence length; genuine asides and self-corrections; anything dated before 2022-11-30. When you see these, lean toward leaving the prose alone.

## Process and Output

1. Read the input and mark every real tell (cluster-check first).
2. Apply the **smallest** edits that clear them, under the Minimal-Change Principle.
3. Scan the result for `—`, `–`, and any content you added or invented — remove them.
4. Deliver: the edited text, and a short bulleted **change log** (what tell each edit removed) so the edits are auditable. Do not deliver a heavy "draft → soulful rewrite" unless voice was explicitly requested.

## Full Example (illustrative of patterns only — NOT the minimal-change target)

The heavy rewrite that follows shows what the *patterns* look like when aggressively removed, including added voice and invented studies. Under the Minimal-Change Principle you would NOT go this far or invent anything — it is here only to make the tells concrete.

**Before (AI-sounding):**
> AI-assisted coding serves as an enduring testament to the transformative potential of large language models, marking a pivotal moment in the evolution of software development. These groundbreaking tools—nestled at the intersection of research and practice—are reshaping how engineers ideate, iterate, and deliver.

**Minimal-change edit (what this skill should produce):**
> AI-assisted coding is one application of large language models in software development. These tools change how engineers write, iterate on, and ship code.

(Removed: "serves as an enduring testament", "transformative potential", "marking a pivotal moment", "evolution of", "groundbreaking", the em-dash aside, and the rule-of-three "ideate, iterate, and deliver" — six tells cleared with a two-sentence edit that keeps the original structure and adds nothing.)

## Reference

Based on [Wikipedia:Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing), maintained by WikiProject AI Cleanup.
