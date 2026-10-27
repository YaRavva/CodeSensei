const { Client, Account } = require('node-appwrite');
const client = new Client()
  .setEndpoint('https://appwrite.ravva.su/v1')
  .setProject('6adc4f50003202881547');

// Set session header or cookie format
// Appwrite SDK client uses setSession(jwt) or setSession(secret)? Wait, client.setSession(secret) sets X-Appwrite-Session header!
client.setSession('6addf22bdd37a437afae_c10528bb5faa7a5b1ea45ad2496e62e23a4b33e1a851e942999921c4b45ab6f3');

const account = new Account(client);
account.get().then(res => console.log('SUCCESS with old session:', res.email)).catch(err => console.error('FAIL:', err));
