# Deployment Review Notes

These notes review deployment-related scripts and how they fit the current ADLC
workflow. Canonical deployment behavior belongs to `deployment-agent` and the
release gates in `ADLC_workflow_settings.json`.

## Status

Partially sound. The scripts are useful operational helpers, but deployment is
not just a script list. In the ADLC workflow, deployment is a gated phase after
Code Review Agent returns an approved merged pull request.

## Current Script Inventory

| Area | Script | Purpose |
|---|---|---|
| Artifacts | `./scripts/build-artifacts.sh <tag>` | Build deployable artifacts for a tag. |
| Artifacts | `./scripts/build-version.sh` | Build and tag versioned artifacts. |
| Infrastructure | `./scripts/create-infra.sh` | Create or update cloud infrastructure. |
| Environment | `./scripts/switch-env.sh` | Switch active environment. |
| AWS | `./scripts/deploy-aws-apprunner.sh [tag]` | Deploy to AWS App Runner. |
| GCP | `./scripts/deploy-gcp-cloudrun.sh [tag]` | Deploy to GCP Cloud Run. |
| Status | `./scripts/check-aws-deployment.sh` | Check AWS deployment status. |
| Status | `./scripts/check-gcp-deployment.sh` | Check GCP deployment status. |

## ADLC Consistency

Deployment Agent consumes:

- approved merged pull request;
- YAML release configuration;
- workflow configuration;
- optional pre-deployment script;
- optional post-deployment script;
- prior release state;
- pre-release evidence.

Deployment Agent produces:

- live release or blocked/rolled-back outcome;
- deployment record;
- rollback artifact;
- post-deploy evidence.

Production release approval is mandatory. Infrastructure and deployment changes
require explicit review of target environment, credentials, rollback path, and
approval gates before execution.

## Inconsistencies Found

- The previous note was script-centric and did not identify Deployment Agent as
  the workflow owner.
- It did not distinguish QA/non-production deployments from production release
  approval.
- It did not call out rollback evidence as a required deployment concern.

## Proposed Improvements

- Add or document a release-configuration sample for this repository's actual
  deployment targets.
- Add smoke-test evidence requirements for QA and production releases.
- Decide whether the tag-triggered GitHub Actions `cd.yml` should remain a QA
  placeholder or become an enforced deployment pipeline.
