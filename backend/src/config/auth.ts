import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/meterflow';
const client = new MongoClient(uri);

export const auth = betterAuth({
  database: mongodbAdapter(client.db()),
  emailAndPassword: {
    enabled: true,
  },
  secret: process.env.BETTER_AUTH_SECRET || 'super_secret_key_for_better_auth_dev',
  baseURL: process.env.BASE_URL || 'http://localhost:4000',
  trustedOrigins: [process.env.FRONTEND_URL || 'http://localhost:3000'],
});
