# Thinking and Generation Configuration

## Version-Gated Controls

Thinking budgets, levels, defaults, minimums, maximums, and disable behavior vary by model and API version. Check official documentation and installed types for the chosen model rather than assuming a control exists.

Generation parameters such as temperature, top-p, top-k, candidate count, stop sequences, response MIME type, and token limits can also vary or interact. Start from provider defaults and change one parameter for a measured reason.

## Evaluation

Compare representative task quality, latency, token use, refusal behavior, structured-output validity, and variance. Do not infer factuality from deterministic sampling or assume lower temperature always improves reasoning.

Set explicit output and request budgets at the application boundary. Separate user-configurable creativity from safety, authorization, and schema controls.

Implement thinking controls from the installed SDK types and current official examples rather than a pinned template.
