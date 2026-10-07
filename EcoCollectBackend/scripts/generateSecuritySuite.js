import { runBackendSecuritySuite } from '../../backend/scripts/generateSecuritySuite.js';

runBackendSecuritySuite().catch(err => {
  console.error('Error running EcoCollectBackend security suite:', err);
  process.exit(1);
});
