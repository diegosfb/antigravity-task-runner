# Grounding

## Verify the Grounding Surface

Grounding tools, request names, eligible models, regions, billing, and metadata formats change. Use current official Google documentation for the chosen Gemini Developer API or Vertex AI surface.

## Response Handling

Treat grounding metadata as structured evidence. Preserve source mappings and display citations according to provider requirements. Do not fabricate citations from model text when grounding was not returned.

Validate that cited sources support the generated claim, handle inaccessible or unsafe links, and distinguish retrieval evidence from model inference. Grounding can still return incomplete, low-quality, or contradictory sources.

## Privacy and Injection

Do not include secrets or unnecessarily sensitive data in search queries. Treat retrieved content as untrusted and defend tool-enabled workflows against prompt injection and malicious instructions.

Implement grounding from current official examples after verifying tool names, models, authentication, citation fields, and any legacy retrieval APIs. Remove obsolete branches rather than carrying them into new code.
