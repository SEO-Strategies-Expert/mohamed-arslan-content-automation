# Mohamed Arslan — Credentials & Secret Management Guide

This document describes all credentials required by the **Mohamed Arslan** content automation system, placeholder formats used in repository exports, and setup instructions.

---

## 1. Credentials Overview

| Credential Name | n8n Type | Used In Workflows | Description |
| :--- | :--- | :--- | :--- |
| `POSTGRES_CREDENTIAL_ID` | `postgres` | `00`, `WF-01`..`19`, Router | Connection to the operational PostgreSQL database. |
| `GOOGLE_DRIVE_CREDENTIAL_ID` | `googleDriveOAuth2Api` | `WF-01`, `WF-02` | OAuth2 connection to access job folders and manifest/content files in Google Drive. |
| `TELEGRAM_CREDENTIAL_ID` | `telegramApi` / `httpHeaderAuth` | `WF-12`, `WF-13`, `WF-19` | Bot token used to dispatch approval notifications and answer callback queries. |
| `CUSTOM_SITE_API_CREDENTIAL_ID` | `httpHeaderAuth` / `bearerAuth` | `WF-10`, `WF-11`, `WF-14`..`18` | Bearer token authentication for the Custom Website REST API. |

---

## 2. Placeholder Sanitization Rules

In accordance with security requirements, all real credential IDs, webhook IDs, tokens, and instance metadata have been stripped from the repository JSON files:

- **Postgres Credential ID**: `"POSTGRES_CREDENTIAL_ID"`
- **Google Drive Credential ID**: `"GOOGLE_DRIVE_CREDENTIAL_ID"`
- **Telegram Token Placeholder**: `TELEGRAM_BOT_TOKEN_PLACEHOLDER`
- **Telegram Chat ID Placeholder**: `TELEGRAM_CHAT_ID_PLACEHOLDER`
- **Custom Site API Base URL**: `CUSTOM_SITE_API_BASE_URL_PLACEHOLDER`
- **Custom Site API Token**: `CUSTOM_SITE_API_TOKEN`

---

## 3. Configuring Credentials in n8n

### PostgreSQL Connection
1. In n8n, navigate to **Credentials** > **New Credential**.
2. Select **Postgres**.
3. Fill in Host, Database, User, Password, and Port (default 5432).
4. Save as `Postgres Account`.
5. In each imported workflow node using Postgres, select this credential.

### Google Drive OAuth2
1. Create OAuth2 credentials in Google Cloud Console with Google Drive API enabled.
2. Add the n8n OAuth redirect URL to Google Cloud Console.
3. In n8n, navigate to **Credentials** > **New Credential** > **Google Drive OAuth2 API**.
4. Authenticate and save.

### Telegram Bot
1. Obtain a Bot token from Telegram `@BotFather`.
2. Add your Telegram user ID to the environment variable `TELEGRAM_ALLOWED_USER_IDS` on your n8n instance.
3. Configure the HTTP nodes in `WF-12`, `WF-13`, and `WF-19` with your Bot token.

### Custom Website API Token
1. Create a Header Auth credential in n8n:
   - Header Name: `Authorization`
   - Header Value: `Bearer <YOUR_CUSTOM_SITE_API_TOKEN>`
2. Attach to HTTP Request nodes interacting with `https://<your-domain>/api/automation/v1/...`.
