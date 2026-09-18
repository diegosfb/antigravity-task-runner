# Testing and integration

Use synthetic, non-sensitive documents with known facts for automated tests.
Avoid tests that depend on production stores or incur unbounded external cost.

## Minimum integration coverage

- Create or identify an isolated test store.
- Upload a small document and observe the long-running operation to completion.
- Confirm the document is listed in the intended store.
- Ask a known-answer question and assert meaningful answer content.
- Assert that grounding metadata cites the expected source.
- Exercise a metadata filter that includes and excludes the document.
- Exercise invalid input, unsupported configuration, throttling, timeout, and
  partial-batch behavior.
- Delete test resources with verified names and explicit test-environment
  scope.

Do not assert generated prose verbatim. Test observable retrieval, citation,
resource, and error-handling invariants.

## Runtime integrations

Keep Gemini credentials and File Search mutations on trusted server-side
runtimes. Browser applications should call a controlled backend. For edge
runtimes, verify that the SDK, streams, file types, and upload mechanisms are
supported; otherwise use the documented REST upload protocol.

Streaming, structured output, batch requests, and framework adapters require
their own compatibility tests because grounding metadata may differ from the
non-streaming SDK path.

The repository currently includes resource roadmaps rather than complete
application examples. Consult [../templates/README.md](../templates/README.md)
and [../PROJECT_STATUS.md](../PROJECT_STATUS.md) before claiming a template is
implemented.
