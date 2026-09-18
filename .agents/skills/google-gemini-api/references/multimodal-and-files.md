# Multimodal Inputs and Files

## Select the Transfer Method

Choose inline data, uploaded files, or supported external references from current official limits, file size, reuse, latency, privacy, and runtime memory. Do not hard-code media limits from old documentation.

Validate MIME type, extension, magic bytes, size, page or duration bounds, and decompression risk before sending content. Treat URLs and uploaded files as untrusted.

## File Lifecycle

For uploaded files, handle processing states, failure, timeout, cancellation, expiration, access control, and deletion. Poll with bounded backoff and refresh resource state rather than assuming a local object mutates.

Do not make private files public merely to provide a URL. Avoid logging signed URLs, file contents, extracted text, or model payloads containing sensitive data.

## Accuracy and Safety

Test representative formats, corrupt inputs, scanned documents, long media, orientation, language, and low-quality content. Model extraction is not a substitute for deterministic parsing where exact values matter.

Implement multimodal handling from current official examples after verifying supported formats, size limits, models, and SDK fields.
