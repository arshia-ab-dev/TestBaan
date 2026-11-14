const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

async function importDump() {
  // پشتیبانی از نام فایل ورودی (پیش‌فرض: remote-dump.sql)
  const fileName = process.argv[2] || 'remote-dump.sql';
  const dumpFile = path.join(__dirname, fileName);
  const dbFile = path.join(__dirname, 'testbaan.db');

  if (!fs.existsSync(dumpFile)) {
    console.error(`❌ فایل ${fileName} در پوشه پروژه یافت نشد!`);
    process.exit(1);
  }

  if (fs.existsSync(dbFile)) {
    fs.unlinkSync(dbFile);
  }

  const client = createClient({ url: `file:${dbFile}` });

  console.log(`⏳ در حال ایمپورت ${fileName} به دیتابیس محلی...`);
  const sql = fs.readFileSync(dumpFile, 'utf8');
  await client.executeMultiple(sql);
  console.log('✅ تمام اطلاعات با موفقیت روی testbaan.db بارگذاری شد!');
}

importDump().catch(console.error);
