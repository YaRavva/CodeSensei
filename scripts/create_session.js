const { Client, Users } = require('node-appwrite');
const client = new Client()
  .setEndpoint('https://appwrite.ravva.su/v1')
  .setProject('6adc4f50003202881547')
  .setKey('***REMOVED***');

const users = new Users(client);

async function run() {
  const session = await users.createSession({ userId: '6addf1daa8ce6b5d4031' });
  // The secret combines userId and secret separated by underscore or is it secret value?
  // In Appwrite, cookie value is usually userId_secret
  const cookieValue = `${session.userId}_${session.secret}`;
  console.log('COOKIE_VALUE:', cookieValue);
}

run().catch(err => console.error('Error:', err));
