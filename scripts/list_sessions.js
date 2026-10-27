const { Client, Users } = require('node-appwrite');
const client = new Client()
  .setEndpoint('https://appwrite.ravva.su/v1')
  .setProject('6adc4f50003202881547')
  .setKey('***REMOVED***');

const users = new Users(client);

async function run() {
  // Let's list existing sessions for user 6addf1daa8ce6b5d4031
  const sessions = await users.listSessions('6addf1daa8ce6b5d4031');
  console.log('Sessions:', sessions.sessions.map(s => ({ id: s.$id, secret: s.secret, expire: s.expire })));
}

run().catch(err => console.error('Error:', err));
