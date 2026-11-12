const { Client, Account } = require('node-appwrite');

// The session secret lives in .env.local (gitignored) as APPWRITE_SESSION.
const SESSION = process.env.APPWRITE_SESSION;
if (!SESSION) {
  console.error('APPWRITE_SESSION is not set: put the session secret in .env.local');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://appwrite.ravva.su/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '6adc4f50003202881547')
  .setSession(SESSION);

const account = new Account(client);
account.get().then(res => console.log('SUCCESS with old session:', res.email)).catch(err => console.error('FAIL:', err));
