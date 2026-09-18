# Object Storage and Data Lakes

Use for S3 or equivalent object-storage lifecycle and lake-table maintenance. Fetch current regional storage, request, retrieval, monitoring, replication, and egress prices before estimating savings.

## Inventory

- Measure bytes and object counts by bucket, prefix, storage class, age, version state, and owner.
- Include incomplete multipart uploads, delete markers, noncurrent versions, replicas, inventory reports, and logs.
- Identify access frequency and retrieval size from trustworthy telemetry; absence of recent access is not proof that data is disposable.

## Lifecycle decisions

- Model transition, minimum-duration, retrieval, request, restore-delay, and monitoring charges.
- Align lifecycle rules with legal retention, recovery objectives, access latency, and application compatibility.
- Prefer scoped prefixes or tags and staged rollout over bucket-wide policies.
- Validate restore procedures before moving critical data to archival tiers.
- Treat deletion and noncurrent-version expiration as destructive changes requiring explicit authorization.

## Lake-table maintenance

- Measure small-file count, metadata overhead, snapshot growth, and files read per query.
- Compact files when query and request-cost benefits exceed rewrite cost.
- Expire snapshots and remove orphan files only through the table format's supported procedure.
- Coordinate Delta, Iceberg, or Hudi retention with concurrent readers, streaming checkpoints, rollback, and disaster recovery.

## Evidence to return

- Storage and object-count distribution
- Access-age histogram and confidence limitations
- Lifecycle scenario costs, including retrieval and early-deletion sensitivity
- Recovery and compliance constraints
- Reversible pilot scope and rollback plan

