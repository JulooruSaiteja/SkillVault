/**
 * Backward compatibility proxy.
 * Canonical seed script is located at database/seeds/seedCatalog.js.
 */
import { seedCatalog } from '../../../database/seeds/seedCatalog.js';
import { disconnectDatabase } from '../config/database.js';
export { seedCatalog };

if (process.argv[1] && process.argv[1].endsWith('seedCatalog.js')) {
  seedCatalog()
    .then(() => disconnectDatabase())
    .catch((err) => {
      console.error('[Seed] Error seeding catalog:', err);
      process.exit(1);
    });
}

export default seedCatalog;
