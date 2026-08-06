# Mohamed Arslan — Multilingual Content Automation Architecture

This document describes the end-to-end architecture, state transitions, normalized response contracts, and component responsibilities of the **Mohamed Arslan** Multilingual Content Automation System.

---

## 1. System Overview & Target Architecture

The system automates content lifecycle operations for a **Custom Website** using **n8n** as the orchestration engine, **PostgreSQL** as the operational state store, and **Telegram** for human approval.

```
+------------------+     +-----------------------+     +--------------------------+
|  Google Drive    | --> |       n8n Engine      | --> |  PostgreSQL Operational  |
| (Jobs & Content) |     | (Workflows WF-01..19) |     |       Database (5 Tables)|
+------------------+     +-----------------------+     +--------------------------+
                                     |
                                     v
                         +-----------------------+
                         |    Asset Pipeline     |
                         | (WF-05..10 WebP/SVG)  |
                         +-----------------------+
                                     |
                                     v
                         +-----------------------+
                         |  Telegram Approval    |
                         | (WF-12 & WF-13 Router)|
                         +-----------------------+
                                     |
                                     v
                         +-----------------------+
                         |   Custom Site API     |
                         | (Publish/Schedule/    |
                         |  Patch / Rollback)    |
                         +-----------------------+
                                     |
                                     v
                         +-----------------------+
                         | Post-Publish Verify   |
                         |  (WF-17 Suite)        |
                         +-----------------------+
```

### Core Principles
- **No Direct DB Writes to Production**: n8n interacts with the Custom Website solely through authenticated REST API adapters (`/api/automation/v1/...`).
- **No Browser Automation**: All publishing, updating, and asset uploads are executed via programmatic API requests.
- **Idempotency & Isolation**: Every publication attempt carries a unique idempotency key (`<jobId>-publish-v1`). Operations are atomic and safe to retry.
- **Human-in-the-Loop**: Interactive Telegram notifications present live previews and inline control buttons before any article is published or scheduled.

---

## 2. PostgreSQL Operational Database Schema

The system uses an independent operational PostgreSQL database containing five tables created safely via `00-automation-db-setup.json`:

1. `content_jobs`: Tracks job metadata, idempotency keys, execution status, preview URLs, published URLs, and locks.
2. `job_events`: Immutable audit trail logging state transitions, sub-workflow executions, and payload snapshots.
3. `content_revisions`: Revision history taking snapshots of production content before updates or rollbacks.
4. `media_assets`: Metadata repository for featured images, infographics, and before/after consent records.
5. `site_configs`: Site-wide policies, base URLs, supported languages, brand settings, and iframe domain allowlists.

---

## 3. Strict State Machine

The workflow engine enforces explicit state transitions and rejects unauthorized or out-of-order execution attempts:

| Status | Triggering Workflow | Description |
| :--- | :--- | :--- |
| `CREATED` | WF-01 | Job created from valid `manifest.json` in Google Drive. |
| `CONTENT_PREPARING` | WF-01 / WF-02 | Content files being located and fetched. |
| `VALIDATING` | WF-02 | Lock acquired; content package validation executing. |
| `VALIDATION_FAILED` | WF-02 | Content validation failed (missing fields, placeholders, forbidden scripts). |
| `CONTENT_READY` | WF-02 | Content package fully validated across all target languages. |
| `ASSETS_PROCESSING` | WF-05 | Assets (featured images, infographics, before/after) being rendered & optimized. |
| `ASSETS_READY` | WF-05..10 | All required media assets generated, optimized (WebP), and uploaded. |
| `PREVIEW_CREATING` | WF-11 | Generating draft preview pages via Custom Site API adapter. |
| `REVIEW_PENDING` | WF-11 / WF-12 | Telegram approval notification sent to human reviewers. |
| `APPROVED` | WF-13 | Human reviewer approved publication via Telegram callback. |
| `REJECTED` | WF-13 | Human reviewer rejected publication for content editing. |
| `SCHEDULED` | WF-13 / WF-15 | Article scheduled for future publication via Custom Site API. |
| `PUBLISHING` | WF-14 | Content revision snapshot taken; publication API call in progress. |
| `PUBLISHED` | WF-14 | Article successfully published to Custom Website. |
| `VERIFYING` | WF-14 / WF-16 / WF-17 | Running 15-point post-publication verification suite. |
| `COMPLETED` | WF-17 | All post-publish checks passed cleanly. Job complete. |
| `FAILED` | WF-19 | Non-retryable error encountered or retry limit exceeded. |
| `ROLLBACK_PENDING` | WF-17 | Critical verification failure detected; rollback triggered. |
| `ROLLED_BACK` | WF-18 | Production page successfully reverted to pre-publish revision snapshot. |
| `CANCELLED` | WF-04 / WF-13 | Job manually or programmatically cancelled. |

---

## 4. Normalized Response Contract

Every workflow returns a strictly formatted JSON response object:

### Success Response Contract
```json
{
  "success": true,
  "jobId": "MOHAMED-ARSLAN-SITE-TYPE-20260806-0001",
  "status": "CONTENT_READY",
  "message": "Content package validated successfully.",
  "data": {
    "checkedLanguages": ["ar", "en"]
  },
  "warnings": [],
  "errors": [],
  "nextAllowedActions": ["prepare_assets", "cancel"]
}
```

### Error Response Contract
```json
{
  "success": false,
  "jobId": "MOHAMED-ARSLAN-SITE-TYPE-20260806-0001",
  "status": "VALIDATION_FAILED",
  "message": "Content package contains validation errors.",
  "data": null,
  "warnings": [],
  "errors": [
    {
      "code": "MISSING_TITLE",
      "language": "ar",
      "path": "title",
      "message": "title is required."
    }
  ],
  "nextAllowedActions": ["retry", "cancel"]
}
```

---

## 5. Global Error Handling Strategy

WF-19 (`Global Error Handler`) classifies errors into 12 distinct categories:
1. `VALIDATION_ERROR` (Non-retryable)
2. `AUTHENTICATION_ERROR` (Non-retryable)
3. `RATE_LIMIT` (Retryable with backoff)
4. `NETWORK_ERROR` (Retryable with backoff)
5. `DRIVE_ERROR` (Retryable)
6. `ASSET_RENDER_ERROR` (Retryable)
7. `MEDIA_UPLOAD_ERROR` (Retryable)
8. `SITE_API_ERROR` (Retryable)
9. `PUBLISH_ERROR` (Retryable)
10. `VERIFICATION_ERROR` (Triggers Rollback)
11. `DATABASE_ERROR` (Retryable)
12. `UNKNOWN_ERROR` (Classified fallback)

---

## 6. MCP Gateway Isolation

`WF-00 MCP Content Gateway` and `content_job Router` provide Model Context Protocol (MCP) integration for Claude.

> [!IMPORTANT]
> The MCP Gateway and Router **must remain inactive** (`"active": false`) until the complete standalone n8n system has been imported, configured, and verified.
