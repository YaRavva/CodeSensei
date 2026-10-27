const { Client, Users } = require('node-appwrite');
const client = new Client()
  .setEndpoint('https://appwrite.ravva.su/v1')
  .setProject('6adc4f50003202881547')
  .setKey('***REMOVED***');

const users = new Users(client);
users.list().then(res => {
  console.log('Users count:', res.total);
  res.users.forEach(u => console.log(u.$id, u.email, u.name));
}).catch(err => console.error('Error:', err));
