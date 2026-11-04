const { Client, TablesDB, Query } = require('node-appwrite');

// Use internal endpoint with Host header like the app does
const client = new Client()
  .setEndpoint('http://172.18.0.1:80/v1')
  .setProject('6adc4f50003202881547')
  .setKey(process.env.APPWRITE_API_KEY);

// Add Host header for nginx virtual host routing
client.addHeader('Host', 'appwrite.ravva.su');
client.addHeader('X-Forwarded-Proto', 'https');

const tablesDB = new TablesDB(client);
const DATABASE_ID = 'codesensei';

async function main() {
  try {
    const result = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: 'modules',
      queries: [Query.limit(100)],
    });
    
    console.log('Total modules:', result.rows.length);
    result.rows.forEach((m, i) => {
      console.log((i + 1) + '. ' + m.title + ' (id:' + m.$id + ')');
    });
    
    const target = result.rows.find(m => 
      m.title.toLowerCase().includes('консоль') || 
      m.title.toLowerCase().includes('ввод') ||
      m.title.toLowerCase().includes('вывод')
    );
    
    if (target) {
      console.log('\n=== FOUND MODULE ===');
      console.log('ID:', target.$id);
      console.log('Title:', target.title);
    } else {
      console.log('\nConsole I/O module NOT FOUND');
    }
  } catch (e) {
    console.error('ERROR:', e.message);
    if (e.response) console.error('Response:', JSON.stringify(e.response));
    process.exit(1);
  }
}

main();
