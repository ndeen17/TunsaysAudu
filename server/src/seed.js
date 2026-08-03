import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectDb } from './config/db.js';
import User from './models/User.js';

dotenv.config();

async function seedUser(username, password, role) {
  if (!username || !password) return;
  const passwordHash = await bcrypt.hash(password, 10);
  await User.findOneAndUpdate(
    { username: username.toLowerCase() },
    { username: username.toLowerCase(), passwordHash, role },
    { upsert: true }
  );
  console.log(`Seeded ${role} user "${username}"`);
}

async function main() {
  await connectDb();
  await seedUser(process.env.SEED_ORGANIZER_USERNAME, process.env.SEED_ORGANIZER_PASSWORD, 'organizer');
  await seedUser(process.env.SEED_SECURITY_USERNAME, process.env.SEED_SECURITY_PASSWORD, 'security');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
