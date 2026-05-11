# Deployment & Infrastructure Scripts

These scripts handle multi-environment infrastructure and cloud deployments.
Most extension development tasks do **not** require these commands.

## Artifact Builds

- `./scripts/build-artifacts.sh <tag>` — Build deployable container artifacts for the given tag.
- `./scripts/build-version.sh` — Build and tag versioned artifacts.

## Infrastructure

- `./scripts/create-infra.sh` — Create or update cloud infrastructure (idempotent).
- `./scripts/switch-env.sh` — Switch the active environment (dev / qa / uat / prod).

## Cloud Deployments

- `./scripts/deploy-aws-apprunner.sh [tag]` — Deploy to AWS App Runner.
- `./scripts/deploy-gcp-cloudrun.sh [tag]` — Deploy to GCP Cloud Run.

## Deployment Status

- `./scripts/check-aws-deployment.sh` — Check AWS App Runner deployment status.
- `./scripts/check-gcp-deployment.sh` — Check GCP Cloud Run deployment status.

## Notes

- Required cloud credentials and environment configuration must be in place before running any deploy script.
- Validate script arguments locally before pushing infra changes.
