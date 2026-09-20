---
name: investor-outreach
description: Draft cold emails, warm intro blurbs, follow-ups, update emails, and investor communications for fundraising. Use when the user wants outreach to angels, VCs, strategic investors, or accelerators and needs concise, personalized, investor-facing messaging.
origin: ECC
version: "1.0.0"
---

# Investor Outreach

Write investor communication that is short, personalized, and easy to act on.

## When to Activate

- writing a cold email to an investor
- drafting a warm intro request
- sending follow-ups after a meeting or no response
- writing investor updates during a process
- tailoring outreach based on fund thesis or partner fit

## Core Rules

1. Personalize every outbound message.
2. Keep the ask low-friction.
3. Use proof, not adjectives.
4. Stay concise.
5. Never send generic copy that could go to any investor.

## Cold Email Structure

1. subject line: short and specific
2. opener: why this investor specifically
3. pitch: what the company does, why now, what proof matters
4. ask: one concrete next step
5. sign-off: name, role, one credibility anchor if needed

## VC Research Intake

Before drafting any outbound message, check whether the user knows the investor's thesis.

**If the user has NOT provided thesis or portfolio context**, prompt for:

1. **Fund name** (and partner name if targeting a specific GP)
2. **Known portfolio companies** — even one or two is enough to anchor personalization
3. **Source of the lead** — warm intro, cold, conference, mutual connection

Do not draft the message until at least the fund name and one personalization anchor (portfolio company, thesis quote, or mutual connection) are available. If the user genuinely has nothing, produce a clearly labeled template with `[PERSONALIZE: ...]` placeholders and note that sending it as-is violates Core Rule 5.

Once intake is complete, use the fund name and portfolio to infer:
- stage and check-size fit
- sector or model focus
- any public thesis signals (partner posts, fund announcement, portfolio pattern)

## Personalization Sources

Reference one or more of:
- relevant portfolio companies
- a public thesis, talk, post, or article
- a mutual connection
- a clear market or product fit with the investor's focus

## Follow-Up Cadence

Default:
- day 0: initial outbound
- day 4-5: short follow-up with one new data point
- day 10-12: final follow-up with a clean close

Do not keep nudging after that unless the user wants a longer sequence.

## Warm Intro Requests

Make life easy for the connector:
- explain why the intro is a fit
- include a forwardable blurb
- keep the forwardable blurb under 100 words

## Post-Meeting Updates

Include:
- the specific thing discussed
- the answer or update promised
- one new proof point if available
- the next step

## Quality Gate

Before delivering:
- message is personalized
- the ask is explicit
- there is no fluff or begging language
- the proof point is concrete
- word count stays tight
