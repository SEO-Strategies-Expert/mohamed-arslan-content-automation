# Mohamed Arslan — n8n Workflow Import and Setup Guide

This document provides step-by-step instructions for importing, configuring, and verifying the **Mohamed Arslan** content automation workflows in n8n.

---

## 1. Prerequisites

Before importing the workflows, ensure you have:
1. An operational **n8n instance** (v1.0.0+).
2. A **PostgreSQL database** accessible from n8n.
3. Access to **Google Drive** for job manifest and content retrieval.
4. A **Telegram Bot Token** and configured Chat ID for approvals.
5. The **Custom Website API** base URL and authentication token.

---

## 2. Import Sequence

Import the 22 JSON workflow files located in `workflows/` in the following exact sequence:

### Phase 1: Database Setup
Import and run:
- `00-automation-db-setup.json`

> **Action**: Execute this workflow manually once to initialize the 5 PostgreSQL tables (`content_jobs`, `job_events`, `content_revisions`, `media_assets`, `site_configs`) and seed the test site configuration.

### Phase 2: Leaf & Specialized Sub-workflows
Import:
- `wf-06-featured-image-generator.json`
- `wf-07-infographic-renderer.json`
- `wf-08-before-after-selector.json`
- `wf-09-optimize-images.json`
- `wf-10-upload-media.json`
- `wf-12-telegram-approval.json`
- `wf-13-telegram-callback-router.json`
- `wf-17-post-publish-verification.json`
- `wf-18-rollback.json`
- `wf-19-global-error-handler.json`

### Phase 3: Core Lifecycle Workflows
Import:
- `wf-01-create-content-job.json`
- `wf-02-validate-content-package.json`
- `wf-03-get-job-status.json`
- `wf-04-cancel-or-retry-job.json`
- `wf-05-prepare-assets.json`
- `wf-11-create-content-preview.json`
- `wf-14-publish-content.json`
- `wf-15-schedule-content.json`
- `wf-16-update-existing-page.json`

### Phase 4: MCP Router & Gateway (Keep Inactive)
Import:
- `content-job-router.json`
- `wf-00-mcp-content-gateway.json`

---

## 3. Required Manual n8n Reselection Steps After Import

When importing workflows across different n8n instances, n8n assigns new internal Workflow IDs to each imported workflow. You **must** manually reselect workflow references in the following nodes:

### 1. `content-job-router.json`
- Node **10 Execute WF-01 Create**: Open node parameters, select `Mohamed Arslan — WF-01 Create Content Job` from the dropdown list.
- Node **20 Execute WF-02 Validate**: Open node parameters, select `Mohamed Arslan — WF-02 Validate Content Package` from the dropdown list.
- Node **50 Execute WF-02 (Retry Validate)**: Open node parameters, select `Mohamed Arslan — WF-02 Validate Content Package` from the dropdown list.

### 2. `wf-00-mcp-content-gateway.json`
- Node **content_job**: Open node parameters, select `Mohamed Arslan — content_job Router` from the dropdown list.

### 3. Credential Binding
After importing, open each node that uses external services and select your instance credentials:
- **Postgres nodes**: Select your PostgreSQL credential.
- **Google Drive nodes**: Select your Google Drive OAuth2 credential.
- **HTTP Request nodes**: Configure base URL variables or credentials for Custom Site API and Telegram.

---

## 4. Verification

To verify the setup:
1. Run `00-automation-db-setup.json` and confirm `success: true`.
2. Execute the Manual Trigger path on `wf-01-create-content-job.json` using sample test input.
3. Check PostgreSQL `content_jobs` table to verify row creation with status `CREATED`.
