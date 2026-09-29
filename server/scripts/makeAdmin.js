// Usage: npm run make-admin -- someone@example.com
// The only way to grant the admin role. It is never settable through the API.
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User.js';

const email = (process.argv[2] || '').trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run make-admin -- <email>');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
const user = await User.findOneAndUpdate({ email }, { role: 'admin', banned: false }, { new: true });
console.log(user ? `${user.username} (${user.email}) is now an admin` : `No user with email ${email}`);
await mongoose.disconnect();
