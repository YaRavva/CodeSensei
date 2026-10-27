const { Client, Users } = require('node-appwrite');
const client = new Client()
  .setEndpoint('https://appwrite.ravva.su/v1')
  .setProject('6adc4f50003202881547')
  .setKey('***REMOVED***');

const users = new Users(client);

async function run() {
  const session = await users.createSession({ userId: '6addf1daa8ce6b5d4031' });
  console.log('COOKIE_NAME:', `a_session_6adc4f50003202881547`);
  console.log('COOKIE_VALUE:', session.secret);
}

run();
