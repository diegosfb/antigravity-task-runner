# Application integration

## Preferred access pattern

Use workload or managed identity to obtain short-lived authorization to the
secret manager. Fetch only required values, avoid printing them, and keep them
in memory for the shortest practical period. Define refresh, cache TTL,
revocation, manager unavailability, startup failure, and graceful shutdown.

## Environment injection

Environment variables are not inherently equivalent to committed secrets, but
they can leak through process inspection, crash reports, child processes,
debugging, and logs. Protected runtime injection may be acceptable when the
platform controls access and the application never prints or forwards values.

Never place real values in committed `.env` files, Dockerfiles, image layers,
build arguments, CI configuration, client bundles, documentation, commands, or
examples. For local development, prefer the operating-system credential store;
use an ignored, permission-restricted `.env` file only as an explicitly accepted
fallback with a dummy `.env.example`.

## Sidecar and agent injection

A sidecar can authenticate, retrieve, render, and refresh secrets into a
memory-backed shared volume. Restrict file permissions and pod/container access,
handle atomic replacement, and ensure application reload behavior is tested.
Rendered files remain sensitive and must not enter logs, backups, or artifacts.

## CSI drivers

CSI-mounted secrets can reduce application SDK integration. Configure a
read-only mount, workload identity, least-privilege provider class, rotation,
and application reload behavior. Do not synchronize into a Kubernetes Secret
unless the operational need and etcd protections are understood.

## SDK access

When accessing a manager directly, reuse authenticated clients, set bounded
timeouts and retries, avoid caching beyond the rotation tolerance, and redact
all errors. Validate authorization server-side and never return secret values to
a browser, mobile client, or other user-controlled runtime.

## Observability and testing

Log resource identifiers, version identifiers, outcome, latency, and caller
identity where safe—never values. Alert on unusual access, broad enumeration,
denials, stale versions, rotation failures, and break-glass activity. Test with
dummy credentials and verify that scanners, logs, traces, and built artifacts
contain no secret material.
