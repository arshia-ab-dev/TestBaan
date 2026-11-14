const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number' || typeof val === 'bigint') return String(val);
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function exportLocalDb() {
  const dbFile = path.join(__dirname, 'testbaan.db');
  const outFile = path.join(__dirname, 'local-dump.sql');

  if (!fs.existsSync(dbFile)) {
    console.error('❌ فایل testbaan.db در پوشه پروژه یافت نشد!');
    process.exit(1);
  }

  const client = createClient({ url: `file:${dbFile}` });

  // ادغام تغییرات فایل -wal به داخل فایل اصلی قبل از بکاپ
  try {
    await client.execute('PRAGMA wal_checkpoint(TRUNCATE);');
  } catch {}

  console.log('⏳ در حال استخراج ساختار و داده‌های testbaan.db...');

  const { rows: tables } = await client.execute(
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  );

  // ترتیب استاندارد جداول برای رعایت کلیدهای خارجی (ابتدا جداول والد)
  const preferredOrder = [
    'users',
    'books',
    'otps',
    'answer_sheets',
    'user_permissions',
    'user_submissions',
    'user_sheet_progress',
    'user_tags',
  ];

  const orderedTables = [...tables].sort((a, b) => {
    const idxA = preferredOrder.indexOf(a.name);
    const idxB = preferredOrder.indexOf(b.name);
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  const lines = [];
  lines.push('PRAGMA defer_foreign_keys = TRUE;');
  lines.push('');

  // حذف جداول از انتها به ابتدا (ابتدا فرزندان)
  for (const t of [...orderedTables].reverse()) {
    lines.push(`DROP TABLE IF EXISTS "${t.name}";`);
  }
  lines.push('');

  // ساخت جداول و درج داده‌ها
  for (const t of orderedTables) {
    lines.push(`${String(t.sql).trim().replace(/;$/, '')};`);

    const { rows, columns } = await client.execute(`SELECT * FROM "${t.name}"`);
    for (const row of rows) {
      const cols = columns.map((c) => `"${c}"`).join(',');
      const vals = columns.map((c) => escapeSqlValue(row[c])).join(',');
      lines.push(`INSERT INTO "${t.name}" (${cols}) VALUES (${vals});`);
    }
    lines.push('');
  }

  fs.writeFileSync(outFile, lines.join('\n'), 'utf8');
  console.log('✅ بکاپ کامل با موفقیت در فایل local-dump.sql ذخیره شد!');
}

exportLocalDb().catch(console.error);
