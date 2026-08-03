import dotenv from 'dotenv';
import { connectDb } from './config/db.js';
import { createApp } from './app.js';

dotenv.config();

const app = createApp();
const port = process.env.PORT || 4000;

connectDb()
  .then(() => {
    app.listen(port, () => console.log(`Server listening on :${port}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
