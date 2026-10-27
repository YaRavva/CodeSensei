const { Client, Users } = require('node-appwrite');
const client = new Client()
  .setEndpoint('https://appwrite.ravva.su/v1')
  .setProject('6adc4f50003202881547')
  .setKey('***REMOVED***');

const users = new Users(client);

async function run() {
  // Create a magic URL token or email verification or session with explicit secret
  // In Appwrite, to get a session cookie for client side that works, we can use createSession with sessionId or let's check what createSession returns
  const session = await users.createSession({ userId: '6addf1daa8ce6b5d4031' });
  console.log('Secret:', session.secret);
}

run();
