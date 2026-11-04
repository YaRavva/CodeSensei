const https = require('https');
const http = require('http');

const API_KEY = process.env.APPWRITE_API_KEY;
const PROJECT_ID = '6adc4f50003202881547';
const DB_ID = 'codesensei';
const TABLE_ID = 'tasks';

function apiRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '172.18.0.1',
      port: 80,
      path: `/v1${path}`,
      method: 'GET',
      headers: {
        'X-Appwrite-Project': PROJECT_ID,
        'X-Appwrite-Key': API_KEY,
        'Host': 'appwrite.ravva.su',
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
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
    req.end();
  });
}

async function main() {
  // Get all tasks in console module
  const list = await apiRequest(`/databases/${DB_ID}/tables/${TABLE_ID}/rows?queries[]=equal("module_id","8c8f076b-9879-47d8-b503-ce38db78f439")`);
  
  console.log('=== Tasks in Console Module ===');
  for (const row of (list.rows || [])) {
    console.log(`ID: ${row.$id}`);
    console.log(`  Title: ${row.title}`);
    console.log(`  Type: ${row.task_type || 'NOT SET'}`);
    console.log(`  Starter: ${(row.starter_code || '').substring(0, 60)}...`);
    console.log('');
  }

  // Get specific task
  const task = await apiRequest(`/databases/${DB_ID}/tables/${TABLE_ID}/rows/82206b7e-1ad5-42bf-b905-68ef65d47bf4`);
  console.log('=== Task 1 Detail ===');
  console.log('task_type:', task.task_type);
  console.log('title:', task.title);
  console.log('starter_code:', task.starter_code);
  console.log('test_cases:', task.test_cases);
}

main().catch(console.error);
