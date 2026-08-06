# Mohamed Arslan — Multilingual Content Automation System

A production-grade **n8n** multilingual content automation system designed for a **Custom Website**.

---

## 📌 Architecture Highlights

- **Target Engine**: n8n workflows orchestrating content jobs from Google Drive to a Custom Website REST API.
- **Operational Database**: PostgreSQL schema (`content_jobs`, `job_events`, `content_revisions`, `media_assets`, `site_configs`).
- **Asset Processing**: Programmatic image text overlay rendering, WebP optimization, SVG infographic generation, and before/after consent selection.
- **Human-in-the-Loop**: Interactive Telegram notifications with inline approval buttons (`approve`, `publish_now`, `schedule`, `reject`, `retry_assets`, `cancel`).
- **Verification & Safety**: 15-check post-publication verification suite with automatic rollback to revision snapshots on failure.
- **MCP Gateway**: Sub-workflow router backing Model Context Protocol (MCP) tool calls for Claude (kept inactive until final commissioning).

---

## 📁 Repository Structure

```
.
├── workflows/                           # 22 importable n8n workflow JSON files
│   ├── 00-automation-db-setup.json       # Database schema creation & verification
│   ├── wf-01-create-content-job.json     # Job initialization & manifest validation
│   ├── wf-02-validate-content-package.json # Multi-language content package validation
│   ├── wf-03-get-job-status.json         # Job status & event log inspection
│   ├── wf-04-cancel-or-retry-job.json    # Job cancellation and state retry
│   ├── wf-05-prepare-assets.json         # Asset processing orchestration
│   ├── wf-06-featured-image-generator.json # Featured image rendering
│   ├── wf-07-infographic-renderer.json   # SVG infographic layout rendering
│   ├── wf-08-before-after-selector.json  # Approved before/after media selection
│   ├── wf-09-optimize-images.json        # WebP compression & checksum generation
│   ├── wf-10-upload-media.json           # Media registration via Custom Site API
│   ├── wf-11-create-content-preview.json # Draft preview URL generation
│   ├── wf-12-telegram-approval.json      # Telegram approval notification dispatch
│   ├── wf-13-telegram-callback-router.json # Telegram callback button handler
│   ├── wf-14-publish-content.json        # Atomic content publication with idempotency
│   ├── wf-15-schedule-content.json       # Content publication scheduling
│   ├── wf-16-update-existing-page.json   # Content patching & revision snapshotting
│   ├── wf-17-post-publish-verification.json # 15-check post-publish verification
│   ├── wf-18-rollback.json               # Reversion to previous revision snapshot
│   ├── wf-19-global-error-handler.json   # Error classification & Telegram alerts
│   ├── content-job-router.json           # Action router for external tool calls
│   └── wf-00-mcp-content-gateway.json    # MCP Tool Gateway (Inactive by default)
├── docs/                                # Technical documentation
│   ├── architecture.md                   # System architecture & state machine
│   ├── import-and-setup.md               # Step-by-step n8n import guide
│   ├── credentials.md                    # Credentials & secret management guide
│   ├── custom-site-api.md                # Custom Website REST API specification
│   └── testing.md                        # Verification & test execution guide
├── tests/
│   └── fixtures/                        # Local test fixtures
│       ├── sample-manifest.json
│       ├── sample-content-ar.json
│       ├── sample-content-en.json
│       └── sample-site-config.json
├── scripts/
│   └── validate-workflows.js             # Static validation script for workflow JSON files
└── README.md
```

---

## ⚡ Quickstart & Setup

### 1. Run Static Validation
Verify all workflow JSON files before importing:
```bash
node scripts/validate-workflows.js
```

### 2. Database Initialization
Import `workflows/00-automation-db-setup.json` into n8n, configure your PostgreSQL credential, and run the workflow once. It will safely build the required tables and indexes:
- `content_jobs`
- `job_events`
- `content_revisions`
- `media_assets`
- `site_configs`

---

## 🔒 Security & Secrets Isolation

All exported workflows are sanitized:
- No real credential IDs (placeholders like `POSTGRES_CREDENTIAL_ID` are used).
- No API tokens, passwords, database URIs, or bot tokens are committed.
- No legacy `Wisal` branding or internal development URLs exist.

---

## ⚠️ Important Post-Import Steps

After importing the workflows into n8n:
1. Re-link workflow references in `content-job-router.json` (nodes 10, 20, 50) and `wf-00-mcp-content-gateway.json` (node `content_job`) by selecting imported sub-workflows from the n8n dropdown.
2. Bind your PostgreSQL, Google Drive, Telegram, and Custom Site API credentials in n8n.
3. Keep `wf-00-mcp-content-gateway.json` and `content-job-router.json` inactive until standalone testing completes.
