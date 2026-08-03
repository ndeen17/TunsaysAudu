// Local dev convenience: spins up a real (file-backed, not in-memory-only)
// MongoDB instance via mongodb-memory-server so `npm run dev` works without
// installing MongoDB or Docker. Not used in production — set MONGODB_URI to
// a real MongoDB Atlas (or other) connection string for that.
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongod = await MongoMemoryServer.create({
  instance: { port: 27117, dbName: 'wedding-qr', storageEngine: 'wiredTiger' },
});

console.log(`Dev MongoDB running at ${mongod.getUri()}`);
console.log('Set MONGODB_URI to that value (see server/.env.example). Ctrl+C to stop.');

process.on('SIGINT', async () => {
  await mongod.stop();
  process.exit(0);
});
