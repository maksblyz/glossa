import { db } from './index';

async function listFiles() {
  const files = await db.file.findMany({
    orderBy: { createdAt: 'desc' },
  });
  if (!files.length) {
    console.log('No files found in the database.');
    return;
  }
  console.log('Files in database:');
  for (const file of files) {
    console.log(`ID: ${file.id}\n  Name: ${file.name}\n  userId: ${file.userId}\n  Created: ${file.createdAt}\n`);
  }
}

listFiles().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); }); 