/**
 * Backward compatibility proxy.
 * Canonical seed script is located at database/seeds/seedAdmin.js.
 */
import { seedAdmin } from '../../../database/seeds/seedAdmin.js';
export { seedAdmin };

if (process.argv[1] && process.argv[1].endsWith('seedAdmin.js')) {
  seedAdmin()
    .then(() => {
      console.log('[SeedAdmin] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[SeedAdmin] Failed:', err.message);
      process.exit(1);
    });
}

export default seedAdmin;
