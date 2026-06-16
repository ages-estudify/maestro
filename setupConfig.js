const fs = require('fs');
const path = require('path');

// Load .env variables from the same directory as this script
require('dotenv').config({ path: path.join(__dirname, '.env') });

const templatePath = path.join(__dirname, '.maestro', 'config.template.yaml');
const outputPath = path.join(__dirname, '.maestro', 'config.yaml');

// 1. Generate workspace config.yaml (without secrets)
if (fs.existsSync(templatePath)) {
  let template = fs.readFileSync(templatePath, 'utf8');
  const replaced = template.replace(/\${(\w+)}/g, (match, key) => {
    if (process.env[key] !== undefined) {
      return process.env[key];
    }
    return match;
  });
  fs.writeFileSync(outputPath, replaced, 'utf8');
  console.log('[Config Setup] Generated .maestro/config.yaml successfully.');
} else {
  console.warn('[Config Setup] Warning: .maestro/config.template.yaml not found.');
}

// 2. Helper to recursively find YAML files in a directory
function getYamlFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.maestro' && !file.startsWith('.')) {
        getYamlFiles(filePath, files);
      }
    } else if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      files.push(filePath);
    }
  }
  return files;
}

// 3. Inject variables into YAML flows that reference them
const yamlFiles = getYamlFiles(__dirname);

for (const filePath of yamlFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Clean up any previously injected block first
  content = content.replace(/\n?# --- MAESTRO ENV START ---[\s\S]*?# --- MAESTRO ENV END ---/g, '');

  const envVars = {};
  let match;
  const regex = /\${(\w+)}/g;
  while ((match = regex.exec(content)) !== null) {
    const varName = match[1];
    if (process.env[varName] !== undefined) {
      envVars[varName] = process.env[varName];
    }
  }

  // If this flow references environment variables, inject them
  if (Object.keys(envVars).length > 0) {
    let envBlock = '\n# --- MAESTRO ENV START ---\nenv:\n';
    for (const [key, value] of Object.entries(envVars)) {
      envBlock += `  ${key}: "${value}"\n`;
    }
    envBlock += '# --- MAESTRO ENV END ---\n';

    // Insert right after the appId line (or at the top if no appId)
    const appIdRegex = /appId:\s*.*?\n/;
    const appIdMatch = content.match(appIdRegex);
    if (appIdMatch) {
      const insertIndex = appIdMatch.index + appIdMatch[0].length;
      content = content.slice(0, insertIndex) + envBlock + content.slice(insertIndex);
    } else {
      content = envBlock + '\n' + content;
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[Config Setup] Injected env variables into ${path.basename(filePath)}`);
  }
}
