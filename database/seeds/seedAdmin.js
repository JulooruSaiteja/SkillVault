import config from '../../server/src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../../server/src/config/database.js';
import { User } from '../../server/src/models/User.js';
import { hashPassword } from '../../server/src/utils/token.js';

/**
 * Seed or update the initial SkillVault administrator account.
 * Reads credentials securely from environment variables (ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD).
 * Never hardcodes admin passwords in source code.
 */
export async function seedAdmin() {
  const adminName = config.adminName || 'SkillVault Administrator';
  const adminEmail = config.adminEmail;
  const adminPassword = config.adminPassword;

  if (!adminEmail || !adminPassword) {
    console.error('\n========================================');
    console.error('  SKILLVAULT: Missing Admin Credentials');
    console.error('========================================\n');
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be defined in your server/.env file.\n');
    console.error('Please configure the following in your server/.env:');
    console.error('  ADMIN_NAME="Your Admin Name"');
    console.error('  ADMIN_EMAIL="admin@yourdomain.com"');
    console.error('  ADMIN_PASSWORD="YourStrongPassword123"\n');
    throw new Error('[SeedAdmin] Missing ADMIN_EMAIL or ADMIN_PASSWORD environment variable.');
  }

  if (adminPassword.length < 6) {
    throw new Error('[SeedAdmin] ADMIN_PASSWORD must be at least 6 characters long.');
  }

  console.log('[SeedAdmin] Connecting to database...');
  await connectDatabase();

  console.log(`[SeedAdmin] Provisioning administrator account: ${adminName} <${adminEmail}>...`);

  // Ensure all other existing users have role: 'learner'
  await User.updateMany(
    { email: { $ne: adminEmail } },
    { $set: { role: 'learner' } }
  );

  // Hash the admin password securely with bcrypt
  const hashedPassword = await hashPassword(adminPassword);

  // Find existing or create new admin user
  let admin = await User.findOne({ email: adminEmail });

  if (admin) {
    admin.name = adminName;
    admin.password = hashedPassword;
    admin.role = 'admin';
    admin.isActive = true;
    await admin.save();
    console.log('[SeedAdmin] Existing account updated to administrator.');
  } else {
    admin = await User.create({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });
    console.log('[SeedAdmin] New administrator account created successfully.');
  }

  console.log(`[SeedAdmin] Verified: ${admin.name} (${admin.email}) is active with role '${admin.role}'.`);

  await disconnectDatabase();
}

// Execute directly if run via CLI (node database/seeds/seedAdmin.js)
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
