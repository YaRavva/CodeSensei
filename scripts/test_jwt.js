const { Client, Account } = require('node-appwrite');
const client = new Client()
  .setEndpoint('https://appwrite.ravva.su/v1')
  .setProject('6adc4f50003202881547');

// In node-appwrite, client.setSession(secret) takes just the secret or user_secret? Let's try just secret or createJWT
async function run() {
  // Let's create a JWT using Users API
  const { Users } = require('node-appwrite');
  const adminClient = new Client()
    .setEndpoint('https://appwrite.ravva.su/v1')
    .setProject('6adc4f50003202881547')
    .setKey('standard_f843a7b53117be60db11bc40a2aaeff7a670ee37b03d4375e36f607c98013bc7e1b83b9e8fdc4367099502e9a696937deee85bece8ced54c2519f4f42df2853d047ff812ef81c6b829d8ac0e55d1baf2bd161070642e502e0f54e19a51f7036fb9a46f51dd5b92c5eeb1907f881f1b24df16f4806b15f4f055f2c235644d5c49');
  
  const users = new Users(adminClient);
  const jwt = await users.createJWT('6addf1daa8ce6b5d4031');
  console.log('JWT:', jwt);
}

run();
