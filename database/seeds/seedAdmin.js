import { connectDatabase, disconnectDatabase } from '../../server/src/config/database.js';
import { User } from '../../server/src/models/User.js';
import { hashPassword } from '../../server/src/utils/token.js';

export async function seedAdmin() {
  console.log('[SeedAdmin] Connecting to database...');
  await connectDatabase();

  const adminName = 'Gojo Satoru';
  const adminEmail = 'gojo@email.com';
  const adminPassword = 'infinity';

  console.log(`[SeedAdmin] Provisioning sole administrator account: ${adminName} <${adminEmail}>...`);

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

// Execute directly if run via CLI (node src/seeds/seedAdmin.js)
if (process.argv[1] && process.argv[1].endsWith('seedAdmin.js')) {
  seedAdmin()
    .then(() => {
      console.log('[SeedAdmin] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[SeedAdmin] Failed:', err);
      process.exit(1);
    });
}
