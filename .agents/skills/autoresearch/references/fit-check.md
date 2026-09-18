# Fit check — is this a good AutoResearch target?

Run this before setting up any files. Say the result out loud to the user,
including when it's a "no" or a "borderline yes." Don't quietly proceed with
a target that fails a must-have — propose a reshaped target instead.

## Must-haves (all three required)

### (a) Scored objectively
A real number comes out of scoring the asset — not a qualitative impression.
"Make it look nicer" is not a score. "Lighthouse performance score,"
"positive-reply rate," "p95 latency in ms," "unit test pass count," "cost per
1,000 requests" are scores.

Watch for metrics that *look* objective but aren't measured consistently
(see nice-to-have (f) below) — that's a reliability problem, not a fit
problem, but it's worth flagging at the same time.

### (b) Fast feedback loop
Results land in minutes to hours, not weeks. A loop that has to wait for:
- Google to re-crawl and re-rank a page (days to weeks)
- A cohort of users to churn or not (weeks to months)
- A single slow manual review step per round

...fails this must-have as stated. It doesn't mean give up — it means either
find a faster proxy metric that's causally close to the real one (e.g.
predicted CTR from a heuristic model instead of waiting for real search
impressions), or accept a much longer `/loop` interval and be honest with the
user that "overnight" doesn't apply — this will run over days or weeks, not
one night.

### (c) Claude can actually change the asset
A file Claude can Edit, or an API Claude can call with write access. Not:
- A YouTube video already published (edit the source project instead)
- A physical mailer already printed
- Someone else's system with no API and no file access

If the real target is downstream of something uneditable, find the editable
upstream artifact (the draft, the template, the config that generates it).

## Nice-to-haves (more = a more powerful loop, none are required)

### (d) High volume of feedback
Lots of traffic, sends, or iterations means each round's score is a solid
signal rather than noise from a tiny sample. A landing page with 10,000
daily visitors gives much more reliable A/B signal per round than one with
20.

### (e) Cheap to fail
A bad variant should cost little: generating three lines of copy is cheap,
running a real paid ad spend test is less cheap, shipping a broken feature
to all users is expensive. Cheaper failure means more rounds are affordable.

### (f) Consistent measuring stick
The same comparison method every round, on fresh, comparable data. Watch for:
- **List fatigue**: re-sending to the same email list round after round
  degrades response rate for reasons that have nothing to do with the copy.
- **Traffic mix drift**: if the visitor mix changes day to day (weekday vs.
  weekend, a marketing campaign spike), a naive round-over-round comparison
  can be comparing apples to oranges. Note this in `score.md`'s notes section
  so Claude accounts for it when interpreting a score.

## Worked examples

| Target | (a) | (b) | (c) | Verdict |
|---|---|---|---|---|
| Page load time (ms) on a static landing page | Yes | Yes (seconds) | Yes (source is a repo file) | Great fit |
| Cold-email positive-reply rate | Yes | Borderline (hours-days per send batch) | Yes (draft is a file) | Fit, but pace rounds with `/loop <hours>`, not `/goal` |
| "Brand feels more premium" | No | — | — | Fails (a). Reshape: pick a proxy like scroll depth, dwell time, or a specific conversion event instead |
| SEO ranking for a keyword | Yes | No (days-to-weeks reindex) | Yes | Fails (b) as stated. Reshape: optimize a faster proxy (Lighthouse SEO score, on-page checklist score) or accept a multi-week `/loop` |
| A published YouTube video's thumbnail | Yes (CTR) | Yes | No, once published (can't A/B-edit a live video the same way) | Fails (c) as stated for the *published* asset; fine if scoped to *drafts before publishing* |
