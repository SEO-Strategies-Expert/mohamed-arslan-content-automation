import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKFLOWS_DIR = path.join(__dirname, '..', 'workflows');

if (!fs.existsSync(WORKFLOWS_DIR)) {
  console.error(`ERROR: Workflows directory not found at ${WORKFLOWS_DIR}`);
  process.exit(1);
}

const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.json'));

if (files.length === 0) {
  console.error('ERROR: No JSON workflow files found in workflows/');
  process.exit(1);
}

let hasError = false;
let totalChecked = 0;

console.log(`Starting comprehensive production validation of ${files.length} workflow files in workflows/...`);

const EXPECTED_PREFIX = 'Mohamed Arslan';
const FORBIDDEN_WORDS = ['wisal', 'Wisal', 'WISAL'];
const FORBIDDEN_DOMAINS = [
  'development.example.com',
  'example.invalid',
  'mock.wisal.local'
];

const SECRET_PATTERNS = [
  /postgres:\/\/[^:]+:[^@]+@/,
  /bot\d+:[A-Za-z0-9_-]{35}/,
  /ghp_[A-Za-z0-9]{36}/,
  /sk_live_[A-Za-z0-9]{24}/,
  /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/
];

const PLACEHOLDER_CHECKSUMS = [
  'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef'
];

const REQUIRED_RESPONSE_KEYS = [
  'success',
  'jobId',
  'status',
  'message',
  'data',
  'warnings',
  'errors',
  'nextAllowedActions'
];

const FALLBACK_SUCCESS_PATTERNS = [
  /resp\.previewUrls\s*\|\|/,
  /resp\.publishedUrls\s*\|\|/,
  /resp\.mediaId\s*\|\|/,
  /resp\.finalUrl\s*\|\|/,
  /http200:\s*apiResp\.httpStatus\s*===\s*200\s*\|\|\s*true/,
  /sitemapUpdated:\s*apiResp\.sitemapUpdated\s*!==\s*undefined\s*\?\s*apiResp\.sitemapUpdated\s*:\s*true/
];

const PUBLISH_FALLBACK_PATTERNS = [
  /content_id\s*\|\|\s*.*job_id/i,
  /contentId\s*\|\|\s*.*jobId/i,
  /\/content\/\$\{[^}]*job_id\}/i,
  /\/content\/\$\{[^}]*jobId\}/i,
  /\/content\/\{\{[^}]*job_id\}\}\/publish/i,
  /\/content\/\{\{[^}]*jobId\}\}\/publish/i
];

const ALL_EIGHT_TEMPLATES = [
  'stats-grid', 'process-steps', 'comparison', 'timeline',
  'checklist', 'cost-breakdown', 'before-after-explanation', 'faq-summary'
];

for (const file of files) {
  totalChecked++;
  const filePath = path.join(WORKFLOWS_DIR, file);
  const fileErrors = [];
  let content = '';

  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    fileErrors.push(`Failed to read file: ${err.message}`);
    console.error(`❌ [${file}] ${fileErrors.join(', ')}`);
    hasError = true;
    continue;
  }

  // 1. Check for forbidden words (Wisal)
  for (const word of FORBIDDEN_WORDS) {
    if (content.includes(word)) {
      fileErrors.push(`Contains forbidden word '${word}'`);
    }
  }

  // 2. Check for forbidden domains
  for (const domain of FORBIDDEN_DOMAINS) {
    if (content.includes(domain)) {
      fileErrors.push(`Contains hardcoded domain '${domain}'`);
    }
  }

  // 3. Check for placeholder checksums
  for (const checksum of PLACEHOLDER_CHECKSUMS) {
    if (content.includes(checksum)) {
      fileErrors.push(`Contains static placeholder checksum '${checksum}'`);
    }
  }

  // 4. Check for secret patterns
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(content)) {
      fileErrors.push(`Contains potential secret pattern matching ${pattern}`);
    }
  }

  // 5. Check for fallback success data after HTTP errors
  for (const fallbackPattern of FALLBACK_SUCCESS_PATTERNS) {
    if (fallbackPattern.test(content)) {
      fileErrors.push(`Contains forbidden fallback success pattern matching ${fallbackPattern}`);
    }
  }

  // 6. WF-14 checks: contentId fallbacks & lock key release scoping
  if (file === 'wf-14-publish-content.json') {
    for (const pattern of PUBLISH_FALLBACK_PATTERNS) {
      if (pattern.test(content)) {
        fileErrors.push(`WF-14 contains invalid contentId fallback pattern matching ${pattern}`);
      }
    }
    if (!content.includes('WHERE job_id = $1 AND lock_key = $2')) {
      fileErrors.push('WF-14 lock release queries MUST match lock_key using WHERE job_id = $1 AND lock_key = $2!');
    }
    if (!content.includes('05C Lock Acquired Check')) {
      fileErrors.push('WF-14 lock verification node must be followed immediately by an IF branch node (05C Lock Acquired Check)!');
    }
  }

  // 7. WF-05 checks: no fixed titles/templates in production JS code, must include conditional WF-08
  if (file === 'wf-05-prepare-assets.json') {
    if (content.includes('processedAssets = [') || content.includes('processedAssets: [')) {
      fileErrors.push('WF-05 contains hardcoded processedAssets array!');
    }
    if (!content.includes('n8n-nodes-base.executeWorkflow')) {
      fileErrors.push('WF-05 is missing executeWorkflow nodes for child workflows!');
    }
    if (!content.includes('WF-08 Before-After Selector')) {
      fileErrors.push('WF-05 is missing conditional WF-08 Before-After Selector execution!');
    }
  }

  // 8. WF-07 checks: all 8 templates must have distinct render logic
  if (file === 'wf-07-infographic-renderer.json') {
    for (const tmpl of ALL_EIGHT_TEMPLATES) {
      if (!content.includes(tmpl)) {
        fileErrors.push(`WF-07 is missing rendering logic for required template '${tmpl}'!`);
      }
    }
  }

  // 9. WF-10 checks: binary multipart upload & ON CONFLICT (job_id, asset_key)
  if (file === 'wf-10-upload-media.json') {
    if (!content.includes('binaryPropertyName') && !content.includes('contentType')) {
      fileErrors.push('WF-10 is missing binary payload configuration for HTTP upload!');
    }
    if (!content.includes('ON CONFLICT (job_id, asset_key)')) {
      fileErrors.push('WF-10 must use ON CONFLICT (job_id, asset_key) for database idempotency!');
    }
  }

  // 10. Database Schema checks (00-automation-db-setup.json)
  if (file === '00-automation-db-setup.json') {
    if (content.includes('asset_key VARCHAR(160) UNIQUE')) {
      fileErrors.push('media_assets must not use global UNIQUE on asset_key alone; must use UNIQUE(job_id, asset_key)!');
    }
  }

  // 11. JSON Parse Check
  let workflow = null;
  try {
    workflow = JSON.parse(content);
  } catch (parseErr) {
    fileErrors.push(`Invalid JSON: ${parseErr.message}`);
  }

  if (workflow) {
    // 12. Workflow Name check
    if (!workflow.name || !workflow.name.startsWith(EXPECTED_PREFIX)) {
      fileErrors.push(`Workflow name '${workflow.name}' does not start with '${EXPECTED_PREFIX}'`);
    }

    // 13. Active state check
    if (workflow.active !== false) {
      fileErrors.push(`Workflow active state is ${workflow.active}, expected false`);
    }

    // 14. Node validation
    if (!Array.isArray(workflow.nodes)) {
      fileErrors.push('Workflow missing nodes array');
    } else {
      const nodeNames = new Set();
      for (const node of workflow.nodes) {
        if (!node.name) {
          fileErrors.push('Found node without name');
          continue;
        }

        // Duplicate node name check
        if (nodeNames.has(node.name)) {
          fileErrors.push(`Duplicate node name: '${node.name}'`);
        }
        nodeNames.add(node.name);

        // Binary preservation check on asset response nodes
        if (['wf-06-featured-image-generator.json', 'wf-07-infographic-renderer.json', 'wf-09-optimize-images.json', 'wf-10-upload-media.json'].includes(file)) {
          if (node.name.includes('Return') || node.name.includes('Response')) {
            const jsCode = (node.parameters && node.parameters.jsCode) ? node.parameters.jsCode : '';
            if (jsCode.includes('return {') && !jsCode.includes('binary') && !jsCode.includes('item.binary')) {
              fileErrors.push(`Node '${node.name}' in ${file} strips binary data from output response!`);
            }
          }
        }

        // Code node comments check: No comments containing 'mock' inside production code execution nodes
        if (node.type === 'n8n-nodes-base.code' && node.parameters && node.parameters.jsCode) {
          const jsCode = node.parameters.jsCode;
          const commentMatches = jsCode.match(/(\/\/.*|\/\*[\s\S]*?\*\/)/g) || [];
          for (const comment of commentMatches) {
            if (/\bmock\b/i.test(comment) && !node.name.includes('Dev') && !node.name.includes('Fixture')) {
              fileErrors.push(`Node '${node.name}' contains comment with word 'mock' inside production JS code`);
            }
          }
        }

        // Check node credentials for hardcoded IDs
        if (node.credentials) {
          for (const credType in node.credentials) {
            const cred = node.credentials[credType];
            if (cred && cred.id && !cred.id.includes('CREDENTIAL') && !cred.id.includes('PLACEHOLDER') && /^[a-zA-Z0-9]{16}$/.test(cred.id)) {
              fileErrors.push(`Node '${node.name}' has raw credential ID '${cred.id}'`);
            }
          }
        }
      }

      // 15. Connection target existence check
      if (workflow.connections && typeof workflow.connections === 'object') {
        for (const sourceNode in workflow.connections) {
          if (!nodeNames.has(sourceNode)) {
            fileErrors.push(`Connections source '${sourceNode}' does not exist in nodes`);
          }
          const connTypes = workflow.connections[sourceNode];
          for (const connType in connTypes) {
            const outputs = connTypes[connType];
            if (Array.isArray(outputs)) {
              for (const outputGroup of outputs) {
                if (Array.isArray(outputGroup)) {
                  for (const target of outputGroup) {
                    if (target && target.node && !nodeNames.has(target.node)) {
                      fileErrors.push(`Connection target node '${target.node}' (from '${sourceNode}') does not exist`);
                    }
                  }
                }
              }
            }
          }
        }
      }

      // 16. Response normalization check in response code nodes
      const responseNodes = workflow.nodes.filter(n =>
        n.name.includes('Response') || n.name.includes('Normalize') || n.name.includes('Return')
      );
      if (responseNodes.length > 0) {
        let foundNormalizedPattern = false;
        for (const rNode of responseNodes) {
          const code = (rNode.parameters && rNode.parameters.jsCode) ? rNode.parameters.jsCode : '';
          const hasKeys = REQUIRED_RESPONSE_KEYS.every(key => code.includes(key));
          if (hasKeys) {
            foundNormalizedPattern = true;
            break;
          }
        }
        if (!foundNormalizedPattern) {
          fileErrors.push('No response node contains all required normalized response fields');
        }
      }
    }
  }

  if (fileErrors.length > 0) {
    hasError = true;
    console.error(`❌ [${file}] Validation failed:\n   - ${fileErrors.join('\n   - ')}`);
  } else {
    console.log(`✅ [${file}] Passed production validation`);
  }
}

console.log('--------------------------------------------------');
if (hasError) {
  console.error(`FAILED: Validation failed for one or more files.`);
  process.exit(1);
} else {
  console.log(`SUCCESS: All ${totalChecked} workflow files passed comprehensive production validation cleanly.`);
  process.exit(0);
}
