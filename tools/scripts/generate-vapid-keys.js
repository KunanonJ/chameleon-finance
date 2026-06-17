// Run: node scripts/generate-vapid-keys.js
// Outputs VAPID key pair for Web Push notifications

const webPush = require('web-push');
const keys = webPush.generateVAPIDKeys();

console.log('VAPID Keys Generated:\n');
console.log('Public Key:');
console.log(keys.publicKey);
console.log('\nPrivate Key:');
console.log(keys.privateKey);
console.log('\nStore these as Cloudflare secrets:');
console.log('  npx wrangler pages secret put VAPID_PUBLIC_KEY --project-name chameleon-finance');
console.log('  cd worker && npx wrangler secret put VAPID_PUBLIC_KEY');
console.log('  cd worker && npx wrangler secret put VAPID_PRIVATE_KEY');
console.log('  cd worker && npx wrangler secret put VAPID_SUBJECT  (enter: mailto:your-email@example.com)');
