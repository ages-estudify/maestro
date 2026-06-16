const fs = require('fs');
const path = require('path');

// Helper to recursively find YAML files
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

const yamlFiles = getYamlFiles(__dirname);

for (const filePath of yamlFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('# --- MAESTRO ENV START ---')) {
    content = content.replace(/\n?# --- MAESTRO ENV START ---[\s\S]*?# --- MAESTRO ENV END ---/g, '');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[Config Restore] Cleaned env variables from ${path.basename(filePath)}`);
  }
}
