---
name: medical-bill-price-review
description: Analyze medical bills, Explanation of Benefits (EOBs), claim screenshots, and procedure charges to verify claim math, identify insurance adjustments and patient responsibility, benchmark CPT/HCPCS pricing against hospital transparency data, cash prices, Medicare and local alternatives, and recommend whether a bill is reasonable or worth disputing. Use when a user asks whether a medical charge is correct, expensive, fair, negotiable, or appealable, especially when bills/EOBs are attached.
---

# Medical Bill Price Review

Use this workflow to review a medical claim or bill.

## 1. Establish the claim facts

Extract only what the user's bill/EOB supports:
- provider/facility and location
- date of service
- CPT/HCPCS/revenue code and description
- billed charge
- contractual/network discount or adjustment
- insurer payment
- allowed amount
- deductible, copay, coinsurance
- patient responsibility
- network status
- reason/remark codes

If both a provider bill and EOB exist, reconcile them line by line. Do not treat an insurer discount as an insurer payment.

## 2. Validate the arithmetic and adjudication

Check that:
- billed charge - contractual adjustment - insurer payment = patient responsibility, subject to any other adjustments
- deductible/copay/coinsurance add to the stated patient responsibility
- the provider bill does not exceed the EOB patient responsibility for an in-network claim

State whether the claim appears internally consistent. Distinguish a correct adjudication from a reasonable market price.

## 3. Identify the exact service

Resolve the CPT/HCPCS code to the procedure description and care setting. If modifiers are present, account for professional (`26`) vs technical (`TC`) components or other relevant modifiers. If the code is missing, say that price benchmarking is provisional until the code is known.

## 4. Benchmark price using current external data

Use current web research unless the user explicitly asks not to. Prefer sources in this order:
1. The facility's own CMS-required hospital price-transparency file or estimator.
2. A reputable site that directly parses the facility's machine-readable price file.
3. The user's insurer estimator or published negotiated-rate information, when available.
4. Local cash/self-pay prices for the same CPT code and same component/setting.
5. Medicare/CMS allowed amounts as a low public-payer benchmark, clearly labeled as non-comparable to commercial rates.
6. Broader state/region price ranges only when local exact-code data is unavailable.

For each comparison, preserve setting and component. Do not compare a global hospital fee with a professional-only fee without labeling the mismatch.

See `references/pricing-sources.md` for source hierarchy and cautions.

## 5. Classify the result

Use this practical classification:
- **Normal / reasonable:** close to the facility's own cash rate and local commercial benchmarks, even if much higher than Medicare.
- **High but plausible:** materially above local cash/independent imaging prices but consistent with hospital commercial pricing.
- **Potentially challengeable:** above the facility's current published cash price or same-plan negotiated rate; duplicates, wrong code, wrong network status, wrong modifier, or patient responsibility above EOB.
- **Likely billing error:** arithmetic inconsistency, balance billing on an in-network covered service, duplicate line, impossible code/quantity, or bill exceeds adjudicated responsibility without a documented reason.

Do not call a price fraudulent or illegal without strong evidence.

## 6. Recommend the next action

Give a concise recommendation ranked by expected value:
- pay as billed
- ask for a self-pay/cash-rate match or courtesy adjustment
- request coding/itemization
- ask insurer to reprocess
- file a provider billing dispute
- file an insurer grievance/appeal

When useful, provide a short phone/script template with the exact amounts and code.

## 7. Output format

Use this structure:

### Verdict
One sentence: correct/incorrect adjudication and fair/high/challengeable price.

### Claim math
Small table with billed, discount, allowed, insurer paid, patient responsibility.

### Price benchmark
Small table with exact-code benchmarks, source, setting, and amount/range.

### What I would do
1-3 concrete actions, starting with the highest-value action.

### Confidence / caveats
Mention missing code, modifier, plan variant, professional fee, or stale transparency data if relevant.

Ground attached-file facts with file citations and web-derived claims with web citations.
