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

console.log(`Starting validation of ${files.length} workflow files in workflows/...`);

const EXPECTED_PREFIX = 'Mohamed Arslan';
const FORBIDDEN_WORDS = ['wisal', 'Wisal', 'WISAL'];
const SECRET_PATTERNS = [
  /postgres:\/\/[^:]+:[^@]+@/,
  /bot\d+:[A-Za-z0-9_-]{35}/,
  /ghp_[A-Za-z0-9]{36}/,
  /sk_live_[A-Za-z0-9]{24}/,
  /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/
];
const PROD_DOMAINS = [
  /https?:\/\/wisal\.[a-z]+/i,
  /https?:\/\/([a-z0-9-]+\.)?mohamedarslan\.com/i
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

  // 2. Check for secret patterns
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(content)) {
      fileErrors.push(`Contains potential secret pattern matching ${pattern}`);
    }
  }

  // 3. Check for production domains
  for (const domainPattern of PROD_DOMAINS) {
    if (domainPattern.test(content)) {
      fileErrors.push(`Contains hardcoded production domain matching ${domainPattern}`);
    }
  }

  // 4. JSON Parse Check
  let workflow = null;
  try {
    workflow = JSON.parse(content);
  } catch (parseErr) {
    fileErrors.push(`Invalid JSON: ${parseErr.message}`);
  }

  if (workflow) {
    // 5. Workflow Name check
    if (!workflow.name || !workflow.name.startsWith(EXPECTED_PREFIX)) {
      fileErrors.push(`Workflow name '${workflow.name}' does not start with '${EXPECTED_PREFIX}'`);
    }

    // 6. Active state check
    if (workflow.active !== false) {
      fileErrors.push(`Workflow active state is ${workflow.active}, expected false`);
    }

    // 7. Node validation
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

      // 8. Connection target existence check
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

      // 9. Response normalization check in response code nodes
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
    console.log(`✅ [${file}] Passed static validation`);
  }
}

console.log('--------------------------------------------------');
if (hasError) {
  console.error(`FAILED: Validation failed for one or more files.`);
  process.exit(1);
} else {
  console.log(`SUCCESS: All ${totalChecked} workflow files passed static validation cleanly.`);
  process.exit(0);
}
