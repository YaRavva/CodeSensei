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
    .setKey('***REMOVED***');
  
  const users = new Users(adminClient);
  const jwt = await users.createJWT('6addf1daa8ce6b5d4031');
  console.log('JWT:', jwt);
}

run();
