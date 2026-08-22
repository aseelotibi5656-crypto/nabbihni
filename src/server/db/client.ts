import 'server-only';
import { DatabaseSync, type StatementSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

/**
 * طبقة الوصول لقاعدة البيانات
 * ---------------------------------------------------------------------------
 * تستخدم `node:sqlite` المدمج في Node 22+ ‏(بدون أي تبعيات أصلية أو ملفات
 * ثنائية تُحمّل من الإنترنت)، وتُغلَّف خلف واجهة `Db` بسيطة.
 *
 * لماذا واجهة مجرّدة؟ لأن كل استعلامات التطبيق تمر عبر `db.all/get/run`
 * فقط، لذا يمكن استبدال المحرّك بـ PostgreSQL (pg / postgres.js) أو
 * Turso أو D1 بتبديل هذا الملف وحده دون لمس أي مستودع (repository).
 */

export type SqlParam = string | number | bigint | null | Uint8Array;
export type Row = Record<string, unknown>;

const DB_FILE = process.env.DATABASE_FILE ?? path.join(process.cwd(), 'data', 'nabbihni.db');

declare global {
  // eslint-disable-next-line no-var
  var __nabbihni_db__: DatabaseSync | undefined;
}

function createConnection(): DatabaseSync {
  mkdirSync(path.dirname(DB_FILE), { recursive: true });

  const conn = new DatabaseSync(DB_FILE);
  // WAL يحسّن التزامن بين القراءة والكتابة بشكل ملحوظ
  conn.exec('PRAGMA journal_mode = WAL;');
  conn.exec('PRAGMA foreign_keys = ON;');
  conn.exec('PRAGMA busy_timeout = 5000;');
  conn.exec('PRAGMA synchronous = NORMAL;');
  return conn;
}

function connection(): DatabaseSync {
  if (!globalThis.__nabbihni_db__) {
    globalThis.__nabbihni_db__ = createConnection();
    ensureSchema(globalThis.__nabbihni_db__);
  }
  return globalThis.__nabbihni_db__;
}

let schemaReady = false;
function ensureSchema(conn: DatabaseSync) {
  if (schemaReady) return;
  const hasUsers = conn
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    .get();
  if (!hasUsers) {
    const sqlPath = path.join(process.cwd(), 'src', 'server', 'db', 'schema.sql');
    conn.exec(readFileSync(sqlPath, 'utf8'));
  }
  schemaReady = true;
}

function prepare(sql: string): StatementSync {
  return connection().prepare(sql);
}

export const db = {
  /** إرجاع كل الصفوف */
  all<T = Row>(sql: string, params: SqlParam[] = []): T[] {
    return prepare(sql).all(...params) as T[];
  },
  /** إرجاع أول صف أو undefined */
  get<T = Row>(sql: string, params: SqlParam[] = []): T | undefined {
    return prepare(sql).get(...params) as T | undefined;
  },
  /** تنفيذ عملية كتابة */
  run(sql: string, params: SqlParam[] = []) {
    return prepare(sql).run(...params);
  },
  /** تنفيذ SQL خام (DDL) */
  exec(sql: string) {
    connection().exec(sql);
  },
  /** معاملة ذرّية — تُرجِع نتيجة الدالة أو ترجع بالحالة عند الخطأ */
  transaction<T>(fn: () => T): T {
    const conn = connection();
    conn.exec('BEGIN');
    try {
      const result = fn();
      conn.exec('COMMIT');
      return result;
    } catch (error) {
      conn.exec('ROLLBACK');
      throw error;
    }
  },
  /** تهيئة المخطط يدوياً (تُستخدم من سكربتات الإعداد) */
  migrate(schemaSql: string) {
    connection().exec(schemaSql);
    schemaReady = true;
  },
  raw(): DatabaseSync {
    return connection();
  },
};

/** تحويل 0/1 إلى boolean */
export const bool = (v: unknown): boolean => v === 1 || v === true || v === '1';
/** تحويل boolean إلى 0/1 لتخزينه */
export const int = (v: boolean | undefined | null): number => (v ? 1 : 0);
/** تحويل قيمة قد تكون undefined إلى null صالحة للتخزين */
export const nul = <T extends SqlParam>(v: T | undefined | null): T | null =>
  v === undefined || v === null || v === '' ? null : v;
