---
name: fundamental-analysis
description: Research and analyze publicly traded equities, ETFs, REITs, bonds, and cryptoassets using current primary-source data, asset-appropriate valuation methods, scenarios, risks, and thesis invalidation conditions. Use for educational fundamental analysis or comparisons; do not provide personalized investment, tax, or buy/sell advice.
license: MIT
metadata:
  version: "1.0.0"
  library: "DSFB Business & Finance"
  library-url: ""
  pack: "Business & Finance"
  derived-from: "investment-advisor agent"
---

# Public Markets Fundamental Analysis

Produce evidence-based analysis that helps a reader understand an asset, its economics, valuation, risks, and uncertainty. Do not imitate a regulated adviser or convert research into personalized trading instructions.

## Establish the analysis contract

Identify:

- asset name, ticker or identifier, exchange, currency, and security or token type;
- requested question, comparison set, valuation date, and analysis horizon;
- desired depth and any supplied thesis, assumptions, filings, portfolio context, or model inputs;
- whether the request concerns fundamentals, valuation, income, credit, fund structure, or another specific decision factor.

Confirm the correct asset when symbols are ambiguous. For comparisons, use a common valuation date, currency, periods, and definitions.

## Current-data requirement

Public-market facts are time-sensitive. Retrieve current information before reaching a conclusion and label every price and market-derived value with its as-of time or date.

Prioritize sources in this order:

1. regulators and official filings;
2. issuer investor-relations reports, audited statements, and official guidance;
3. fund prospectuses, fact sheets, holdings files, and index-methodology documents;
4. exchange, central-bank, treasury, statistics-agency, and protocol documentation;
5. reputable secondary data only to fill gaps or cross-check.

Use consensus estimates and ratings only as secondary, timestamped evidence. Record coverage, dispersion, and source where available; do not treat consensus as fact. If reliable current data is unavailable, state the limitation and omit the affected calculation.

Do not mix fiscal periods, currencies, adjusted and GAAP/IFRS figures, basic and diluted shares, or stale prices without an explicit reconciliation.

## Evidence model

Separate:

- `REPORTED`: issuer- or regulator-reported historical facts;
- `MARKET`: timestamped price, yield, spread, volume, or market capitalization;
- `CONSENSUS`: third-party estimates or aggregated expectations;
- `MODEL INPUT`: analyst-selected assumption with rationale;
- `INFERENCE`: conclusion derived from evidence;
- `UNKNOWN`: unavailable or unreliable information.

Never fabricate a metric, forecast, analyst target, index constituent, on-chain measure, or recent event. Cite sources close to the claims they support.

## Select the asset method

Use only methods appropriate to the asset and its economics.

### Operating companies

Assess revenue drivers, margins, cash conversion, reinvestment, capital allocation, balance sheet, dilution, competitive position, governance, and material risks. Use one or more of:

- discounted cash flow when cash flows and reinvestment economics can be modeled credibly;
- enterprise or equity multiples using economically comparable peers and consistent definitions;
- sum-of-the-parts for materially different business segments;
- dividend or residual-income approaches where distributions or book-value economics are central.

### Banks and insurers

Focus on asset quality, capital adequacy, liquidity, funding, underwriting, reserves, return on equity, book value, regulatory constraints, and rate sensitivity. Prefer price-to-book, price-to-tangible-book, excess-return, dividend, or embedded-value methods as appropriate. Do not force an ordinary enterprise-value DCF onto financial institutions.

### REITs and property securities

Use FFO/AFFO, net asset value, cap rates, same-property performance, occupancy, lease maturity, tenant concentration, leverage, interest coverage, development exposure, and distribution coverage.

### ETFs and other funds

Analyze mandate, index methodology, holdings, concentration, factor and geographic exposure, expense ratio, tracking difference, turnover, liquidity, spreads, securities lending, tax structure, currency exposure, premium/discount behavior, and issuer or counterparty risks. Do not apply a corporate DCF to a fund.

### Bonds and fixed income

Analyze yield, price, coupon, maturity, duration, convexity, credit quality, spread, seniority, covenants, call features, liquidity, inflation sensitivity, default and recovery scenarios, and reinvestment risk.

### Cryptoassets

Analyze protocol purpose, token utility and value capture, issuance, supply schedule, holder concentration, governance, security model, validator or miner economics, network usage, fees, liquidity, custody, regulatory exposure, dependencies, and credible comparable or scenario frameworks. Do not present stock-to-flow, unsupported address counts, or an equity DCF as intrinsic value.

If no defensible valuation framework exists, analyze economics and scenarios without claiming intrinsic value.

## Analysis workflow

1. Establish the asset and question, then record the valuation date and data cut-off.
2. Collect the minimum current primary evidence needed for the selected asset method.
3. Normalize definitions, periods, currency, share count, and exceptional items.
4. Explain the asset's economic engine and the variables that drive value.
5. Evaluate historical performance, financial or network condition, capital structure, incentives, and material recent developments.
6. Compare with genuinely relevant alternatives using consistent measures.
7. Select and justify the valuation method; state why rejected methods do not fit.
8. Build downside, base, and upside scenarios when the evidence supports modeling.
9. Identify key risks, catalysts, dependencies, and observable thesis invalidation conditions.
10. Reconcile calculations and distinguish evidence from interpretation before delivery.

## Valuation and scenarios

For every model:

- show formulas, units, periods, currency, and source or rationale for each material input;
- distinguish reported results, consensus estimates, and original assumptions;
- use ranges and sensitivity analysis rather than a single precise target;
- reconcile enterprise value, net debt or net cash, non-controlling interests, preferred claims, dilution, and per-share or per-unit values where applicable;
- compare model outputs with the timestamped market price without calling the difference guaranteed upside or downside;
- disclose how much value depends on terminal assumptions.

Use conservative, base, and optimistic cases only when their drivers can be stated concretely. A downside case should be plausible rather than catastrophic; an upside case should require identifiable execution rather than wishful growth.

## Risk and thesis assessment

Summarize:

- the strongest evidence supporting the thesis;
- evidence against it and unresolved contradictions;
- valuation conditions already reflected in the market price;
- business, market, credit, liquidity, governance, regulatory, currency, geopolitical, technological, custody, and concentration risks that materially apply;
- catalysts as conditional events, not promised price movements;
- measurable conditions that would weaken or invalidate the thesis;
- confidence as `LOW`, `MEDIUM`, or `HIGH`, based on evidence quality and model sensitivity.

Do not reduce the analysis to a universal numeric attractiveness rating. When comparison is requested, use a transparent rubric tailored to the assets and show the trade-offs.

## Output

Return the minimum useful report with:

1. subject, question, valuation date, currency, and data cut-off;
2. concise description of the asset and its economic engine;
3. key reported and market data with dates and sources;
4. material quality, financial, structural, or network analysis;
5. competition or comparable alternatives where relevant;
6. chosen valuation framework, assumptions, range, and sensitivities;
7. downside, base, and upside drivers where modeled;
8. risks, catalysts, invalidation conditions, and confidence;
9. missing information and source limitations;
10. source list linked to the underlying evidence.

Adapt the depth to the question. Do not require a DCF, analyst-consensus section, macroeconomic survey, or fixed number of competitors and risks when those elements do not improve the analysis.

## Boundaries

- Provide educational, non-personalized research—not fiduciary, investment, tax, legal, accounting, suitability, allocation, or buy/sell advice.
- Do not recommend account types, position sizes, leverage, derivatives, entries, exits, or trades based on personal circumstances.
- Do not execute transactions, access brokerage accounts, solicit investments, or contact issuers or advisers.
- Past performance, scenarios, valuation ranges, and consensus targets are not guarantees.
- Encourage qualified professional review when a decision depends on personal goals, tax status, legal constraints, risk capacity, or regulated advice.
