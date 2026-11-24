# Secure delivery for VEKTR

VEKTR has two execution paths. The self-hosted application uses FastAPI and a database. The public demonstration serves a static Next.js export and a Cloudflare Worker backed by a Durable Object. The Secure delivery workflow tests each path before producing the Worker and site bundle.

| Job | Evidence | Authority |
| --- | --- | --- |
| Source | Gitleaks, project Semgrep rules, Trivy dependency and deployment checks | Read repository |
| Verify | FastAPI tests, TypeScript checks, static build, isolated Worker smoke tests and dry-run bundle | Read repository and upload run artifacts |
| Attest | Verify archive checksum and create GitHub build provenance after both previous jobs pass | Main only, short-lived OIDC and attestation permission |

The Worker smoke test checks the public application and synthetic snapshot through localhost. It verifies the public administration boundary and missing-route behavior. The FastAPI tests cover separate local administration. The workflow produces CycloneDX package inventories for the site and Worker and an archive checksum. A PR archive is useful for review. Use a main-branch archive with verified provenance for release.

## Verify a candidate

From a trusted run on main, download `verified-vektr` and confirm the archive digest with `sha256sum -c vektr-worker-and-site.tar.gz.sha256`. Verify GitHub provenance with `gh attestation verify vektr-worker-and-site.tar.gz --repo Sonofmecury/vektr --source-ref refs/heads/main`. Check the run's source SHA against the commit you intend to ship.

Cloudflare deployment credentials are outside the workflow. Maintain deploy access only in the operational environment. Before deploying, check the intended Cloudflare account, preview the exact release commit and keep the existing Worker version ID and archive digest. If smoke verification fails, roll back to the recorded Worker version using Cloudflare's deployment history, rerun the smoke checks and verify the release version. Durable Object schema or storage changes need their own recovery plan.

## Run the core checks locally

Install Node 22 and Python 3.13. Install dependencies in each package with `npm ci` or the Python requirements file. Run `python -m pytest -q` from `backend`, then typecheck and build with `STATIC_EXPORT=1` from `frontend`. Run `node security-smoke.mjs` from `edge` to start a disposable localhost Worker through Wrangler and stop it after the assertions.

Review or fix scanner findings before release. No exception list is pre-populated. The checked-in Semgrep policy is intentionally small, and Trivy findings depend on available advisory data. A release attestation traces the archive to the workflow, and targeted tests establish the behaviors they assert. Container image signing, full dynamic scanning and a live Cloudflare rollback rehearsal are separate follow-ups.
