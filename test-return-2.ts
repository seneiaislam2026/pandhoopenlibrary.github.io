import jwt from 'jsonwebtoken';
const token = jwt.sign({ id: 'admin-1', username: 'Library2026', role: 'admin' }, 'pandhoa-open-library-secret-2026');

async function test() {
  const db = JSON.parse(await import('fs/promises').then(fs => fs.readFile('database.json', 'utf-8')));
  const issue = db.issues.find((i: any) => i.status === 'Issued');
  
  if (!issue) {
    console.log('No active issue found.');
    return;
  }
  
  console.log('Testing return for issue ID:', issue.id);
  const res = await fetch(`http://localhost:3000/api/issues/${issue.id}/return`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` }
  });
  
  console.log('Status:', res.status);
  console.log('Response:', await res.text());
}
test();
