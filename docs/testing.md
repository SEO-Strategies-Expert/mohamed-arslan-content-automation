# Mohamed Arslan — Testing and Verification Guide

This document describes static validation, unit testing, manual test execution, and end-to-end verification procedures for the **Mohamed Arslan** content automation workflows.

---

## 1. Static Validation

Every workflow file in `workflows/` can be verified offline for JSON validity, strict naming, secret isolation, node connection integrity, and normalized response structures using the automated validation script.

### Running Static Validation
Execute the Node.js validation script:
```bash
node scripts/validate-workflows.js
```

### Static Checks Performed
1. Valid JSON parsing across all 22 workflow files.
2. Mandatory workflow naming prefix (`Mohamed Arslan`).
3. Complete absence of legacy `Wisal` naming or domain references.
4. Secret isolation check (no raw API tokens, passwords, or bot keys).
5. Unique node names within each workflow.
6. Connection target validation (ensuring every connection points to an existing node name).
7. Response normalization check (`success`, `jobId`, `status`, `message`, `data`, `warnings`, `errors`, `nextAllowedActions`).
8. Default inactive state (`"active": false`).

---

## 2. Testing via Test Fixtures

Test fixtures are provided under `tests/fixtures/`:
- `sample-manifest.json`: Example multi-language job manifest.
- `sample-content-ar.json`: Complete Arabic content package JSON with SEO metadata and media placements.
- `sample-content-en.json`: Complete English content package JSON with SEO metadata and media placements.
- `sample-site-config.json`: Development test site configuration.

---

## 3. Manual Test Trigger Path

Every workflow contains an explicit **Manual Test Trigger** (`01M Manual Test Trigger`) and **Sample Dev Input** node (`01T Sample Dev Input`).

### How to Test a Workflow in n8n
1. Open the target workflow in the n8n canvas.
2. Click **Test Step** or **Execute Workflow**.
3. Select the `01M Manual Test Trigger` node as the execution entry point.
4. Verify output at the final response node (`20 Build Response` or `06 Return Normalized Response`).
