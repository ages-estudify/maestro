const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Helper to recursively find YAML files
function getYamlFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
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

function run() {
  console.log('[Test Runner] Setting up configuration...');
  try {
    execSync('node setupConfig.js', { stdio: 'inherit' });
  } catch (err) {
    console.error('[Test Runner] Failed to setup config. Exiting.');
    process.exit(1);
  }

  let exitCode = 0;
  try {
    const flowsDir = path.join(__dirname, 'flows');
    const allFiles = getYamlFiles(flowsDir);
    
    // Convert to relative paths from project root and sort alphabetically
    const relativePaths = allFiles.map(f => path.relative(__dirname, f)).sort();

    let orderedTests = [];
    if (process.argv.includes('--demo')) {
      const demoSequence = [
        'flows/2_autenticacao/RegisterFirstTime.yaml',
        'flows/3_onboarding/Onboarding.yaml',
        'flows/8_perfil_assinatura_planos/PerfilAssinaturaPlanos.yaml',
        'flows/4_treinamento_diario/TreinamentoDiario.yaml',
        'flows/6_cronograma_semanal/CronogramaSemanal.yaml',
        'flows/7_progresso_estatisticas/ProgressoEstatisticas.yaml',
        'flows/5_simulados/Simulados.yaml'
      ];
      orderedTests = demoSequence.filter(p => fs.existsSync(path.join(__dirname, p)));
    } else {
      // Separate simulados and other flows
      const simulados = [];
      const others = [];

      for (const p of relativePaths) {
        if (p.toLowerCase().includes('simulado')) {
          simulados.push(p);
        } else {
          others.push(p);
        }
      }

      // Combine them, ensuring simulados are executed last
      orderedTests = [...others, ...simulados];
    }

    console.log('[Test Runner] Scheduled tests in order:');
    orderedTests.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));

    for (const testFile of orderedTests) {
      let attempts = 0;
      const maxAttempts = 2;
      let success = false;

      while (attempts < maxAttempts && !success) {
        attempts++;
        console.log(`\n============================================================`);
        console.log(`[Test Runner] Running: maestro test ${testFile} (Attempt ${attempts}/${maxAttempts})`);
        console.log(`============================================================\n`);
        
        try {
          execSync(`maestro test "${testFile}"`, { stdio: 'inherit' });
          success = true;
        } catch (err) {
          console.error(`\n[Test Runner] Attempt ${attempts} failed for: ${testFile}`);
          if (attempts >= maxAttempts) {
            console.error(`[Test Runner] Test failed after ${maxAttempts} attempts.`);
            exitCode = 1;
          } else {
            console.log(`[Test Runner] Retrying test...`);
          }
        }
      }

      if (!success) {
        break; // Stop running further tests on failure after retries
      }
    }
  } catch (err) {
    console.error('[Test Runner] Error during test execution:', err);
    exitCode = 1;
  } finally {
    console.log('\n[Test Runner] Restoring configuration...');
    try {
      execSync('node restoreConfig.js', { stdio: 'inherit' });
    } catch (err) {
      console.error('[Test Runner] Failed to restore config:', err);
    }
  }

  process.exit(exitCode);
}

run();
