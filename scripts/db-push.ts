/**
 * تهيئة قاعدة البيانات — ينشئ الجداول والفهارس من src/server/db/schema.sql
 * الاستخدام:
 *   npm run db:push            إنشاء ما لا يوجد فقط
 *   npm run db:push -- --reset حذف قاعدة البيانات وإعادة إنشائها من الصفر
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dbFile = process.env.DATABASE_FILE ?? path.join(root, 'data', 'nabbihni.db');
const reset = process.argv.includes('--reset');

mkdirSync(path.dirname(dbFile), { recursive: true });

if (reset) {
  for (const suffix of ['', '-wal', '-shm']) {
    const file = dbFile + suffix;
    if (existsSync(file)) rmSync(file);
  }
  console.log('🗑️  حُذفت قاعدة البيانات السابقة.');
}

const db = new DatabaseSync(dbFile);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec(readFileSync(path.join(root, 'src', 'server', 'db', 'schema.sql'), 'utf8'));

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all() as { name: string }[];

console.log(`✅ قاعدة البيانات جاهزة: ${path.relative(root, dbFile)}`);
console.log(`   ${tables.length} جدولاً: ${tables.map((t) => t.name).join('، ')}`);
db.close();
