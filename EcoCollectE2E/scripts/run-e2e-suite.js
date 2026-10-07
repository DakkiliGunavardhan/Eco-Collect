import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getMocha() {
  try {
    const mod = await import('mocha');
    return mod.default || mod;
  } catch (e) {
    try {
      const relPath = path.resolve(__dirname, '../../web/node_modules/mocha/lib/mocha.js');
      const mod = await import(`file://${relPath}`);
      return mod.default || mod;
    } catch (err) {
      throw new Error(`Could not resolve mocha module: ${err.message}`);
    }
  }
}

async function runSuite() {
  const Mocha = await getMocha();
  const ExcelReporter = (await import('../utils/excelReporter.js')).default;

  const mocha = new Mocha({
    timeout: 120000,
    reporter: ExcelReporter
  });

  const testFile = path.resolve(__dirname, '../tests/mega_web_350.test.js');
  mocha.addFile(testFile);

  mocha.run((failures) => {
    console.log(`\n[E2E Runner] Mocha execution completed with ${failures} failure(s).`);
    process.exitCode = failures ? 1 : 0;
  });
}

runSuite().catch(err => {
  console.error('Error running E2E suite:', err);
  process.exit(1);
});
