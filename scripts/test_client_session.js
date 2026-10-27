const { Client, Account } = require('node-appwrite');

async function run() {
  const client = new Client()
    .setEndpoint('https://appwrite.ravva.su/v1')
    .setProject('6adc4f50003202881547')
    .setSession('eyJpZCI6IjZhZGRmMWRhYThjZTZiNWQ0MDMxIiwic2VjcmV0IjoiMzM4NDNjMzU3OTQ2M2VlZDY1YWRkOWViYWIyYzRjOGRjNTllZDc1NzI3ODRjODk5YzhlMzM3ZjkwZTBhMDlhZTkwZTJmN2VlMTNlYTUyODMyY2ZhNzNiZDQ2MTgzMTc4ZWZmYWI2Y2M3YjA3YWM5YmY5YTUzMjMyODViNWI1YzlkZmI2MThiOWJlZWViZDFhZTA0ODNmMzZjZjA3NTE4YjQ2Njc3NzIyNWYyNDVhZjFhMGFmMzlhMmRlYTc3MTAzYWU0MGY3YjA3NjI0ZjdiYjEwMzhkMDMzYjQ0ODFmMDc4MzQyNTUwZmIyYmQwMDhhNDhmYzI1YTI3ZTljMjUzNCJ9');

  const account = new Account(client);
  try {
    const user = await account.get();
    console.log('Success!', user.email);
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
