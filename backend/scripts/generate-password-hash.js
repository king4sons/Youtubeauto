#!/usr/bin/env node
// Run: node scripts/generate-password-hash.js
// Then paste the hash into your .env as ADMIN_PASSWORD_HASH

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Enter your password: ', async (password) => {
  if (!password || password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  console.log('\nAdd these lines to your backend/.env:\n');
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  console.log('\nDone. Keep this hash secret — treat it like a password.\n');
  rl.close();
});
