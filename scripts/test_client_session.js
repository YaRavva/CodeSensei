const { Client, Account } = require('node-appwrite');

async function run() {
  const client = new Client()
    .setEndpoint('https://appwrite.ravva.su/v1')
    .setProject('6adc4f50003202881547')
    .setSession('***REMOVED***');

  const account = new Account(client);
  try {
    const user = await account.get();
    console.log('Success!', user.email);
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
