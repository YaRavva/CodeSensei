const https = require('https');

const API_KEY = process.env.APPWRITE_API_KEY;
const PROJECT_ID = '6adc4f50003202881547';
const DB_ID = 'codesensei';
const TABLE_ID = 'tasks';

function apiRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'appwrite.ravva.su',
      port: 443,
      path: `/v1${path}`,
      method,
      headers: {
        'X-Appwrite-Project': PROJECT_ID,
        'X-Appwrite-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ raw: data, status: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  try {
    // Try tablesdb path
    const list = await apiRequest(`/databases/${DB_ID}/tables/${TABLE_ID}/rows?queries[]=equal("module_id","8c8f076b-9879-47d8-b503-ce38db78f439")`);
    
    console.log('=== Tasks in Console Module ===');
    if (list.rows) {
      for (const row of list.rows) {
        console.log(`ID: ${row.$id}`);
        console.log(`  Title: ${row.title}`);
        console.log(`  Type: ${row.task_type || 'NOT SET'}`);
        console.log(`  Starter: ${(row.starter_code || '').substring(0, 80)}...`);
        console.log('');
      }
    } else {
      console.log('No rows found, response:', JSON.stringify(list, null, 2).substring(0, 500));
    }

    // Get specific task
    const task = await apiRequest(`/databases/${DB_ID}/tables/${TABLE_ID}/rows/82206b7e-1ad5-42bf-b905-68ef65d47bf4`);
    console.log('=== Task 1 Detail ===');
    console.log(JSON.stringify(task, null, 2).substring(0, 2000));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
