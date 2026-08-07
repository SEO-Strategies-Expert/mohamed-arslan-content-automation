# Mohamed Arslan — Custom Website API Specification & Adapters

This document details the REST API specification for the **Custom Website** automation interface (`/api/automation/v1/...`).

All n8n workflows interact with the custom website exclusively through these 11 REST API endpoints.

---

## Required Authentication & Headers

- **Base URL Template**: `https://<your-custom-site-domain>/api/automation/v1` (loaded dynamically from PostgreSQL `site_configs`)
- **Authentication**: `Authorization: Bearer <CUSTOM_SITE_API_TOKEN>`
- **Content Type**: `application/json`
- **Publishing Idempotency**: `Idempotency-Key: <jobId>-publish-v1`

---

## Endpoint Specifications

### 1. Media Upload
- **Method & Path**: `POST /api/automation/v1/media`
- **Used In**: `WF-10 Upload Media`
- **Request Body**:
  ```json
  {
    "jobId": "MOHAMED-ARSLAN-TEST-ARTICLE-20260806-0001",
    "assetKey": "featured-main",
    "assetType": "featured_image",
    "sourceUrl": "https://drive.google.com/...",
    "language": "ar"
  }
  ```
- **Response**:
  ```json
  {
    "mediaId": "MEDIA-98124",
    "finalUrl": "https://cdn.domain.com/media/featured-main.webp",
    "width": 1200,
    "height": 630,
    "fileSizeBytes": 45120,
    "mimeType": "image/webp",
    "checksum": "a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef"
  }
  ```

---

### 2. Check Slug Uniqueness
- **Method & Path**: `GET /api/automation/v1/content/check-slug` (or `POST`)
- **Used In**: `WF-02 Validate Content Package`
- **Request Body**:
  ```json
  {
    "jobId": "MOHAMED-ARSLAN-TEST-ARTICLE-20260806-0001",
    "checks": [
      { "language": "ar", "slug": "hair-transplant-cost-turkey" },
      { "language": "en", "slug": "hair-transplant-cost-turkey" }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "allUnique": true,
    "conflicts": []
  }
  ```

---

### 3. Get Content Details
- **Method & Path**: `GET /api/automation/v1/content/{contentId}`
- **Used In**: `WF-14 Publish Content`, `WF-16 Update Existing Page`
- **Response**: Full JSON document representing published page content for revision snapshotting.

---

### 4. Create Content Preview
- **Method & Path**: `POST /api/automation/v1/content/preview`
- **Used In**: `WF-11 Create Content Preview`
- **Request Body**: `{ "jobId": "MOHAMED-ARSLAN-TEST-ARTICLE-20260806-0001" }`
- **Response**:
  ```json
  {
    "previewUrls": {
      "ar": "https://preview.domain.com/ar/hair-transplant-cost-turkey",
      "en": "https://preview.domain.com/en/hair-transplant-cost-turkey"
    }
  }
  ```

---

### 5. Create Draft Content Document
- **Method & Path**: `POST /api/automation/v1/content`
- **Used In**: Draft page initialization
- **Response**: `{ "contentId": "MOHAMED-ARSLAN-TEST-ARTICLE-20260806-0001-CNT" }`

---

### 6. Update Existing Page
- **Method & Path**: `PATCH /api/automation/v1/content/{contentId}`
- **Used In**: `WF-16 Update Existing Page`
- **Request Body**: `{ "jobId": "...", "updateMode": "patch" }`

---

### 7. Publish Content
- **Method & Path**: `POST /api/automation/v1/content/{contentId}/publish`
- **Used In**: `WF-14 Publish Content`
- **Headers**: `Idempotency-Key: <jobId>-publish-v1`
- **Response**:
  ```json
  {
    "contentId": "MOHAMED-ARSLAN-TEST-ARTICLE-20260806-0001-CNT",
    "publishedUrls": {
      "ar": "https://domain.com/ar/hair-transplant-cost-turkey",
      "en": "https://domain.com/en/hair-transplant-cost-turkey"
    }
  }
  ```

---

### 8. Schedule Content
- **Method & Path**: `POST /api/automation/v1/content/{contentId}/schedule`
- **Used In**: `WF-15 Schedule Content`
- **Request Body**: `{ "scheduledAt": "2026-08-07T12:00:00Z" }`

---

### 9. Get Content Revisions
- **Method & Path**: `GET /api/automation/v1/content/{contentId}/revisions`
- **Used In**: Revision lookup & audit log

---

### 10. Rollback Content
- **Method & Path**: `POST /api/automation/v1/content/{contentId}/rollback`
- **Used In**: `WF-18 Rollback`
- **Request Body**: `{ "revisionId": "REV-12345", "snapshot": {} }`

---

### 11. Get Publication & Sitemap Status
- **Method & Path**: `GET /api/automation/v1/content/{contentId}/publication-status`
- **Used In**: `WF-17 Post-Publish Verification`
- **Response**:
  ```json
  {
    "httpStatus": 200,
    "sitemapUpdated": true,
    "indexed": false
  }
  ```
