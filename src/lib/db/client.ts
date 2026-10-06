import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { SCHEMA_SQL, SCHEMA_VERSION } from './schema';

export const DB_NAME = 'quit.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Single shared connection, opened lazily and initialized once. Every data
// function goes through getDb(), so the app never touches a half-set-up file.
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(SCHEMA_SQL);
      const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      if ((row?.user_version ?? 0) < SCHEMA_VERSION) {
        // Future migrations go here, keyed on the stored version.
        await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
      }
      return db;
    })();
  }
  return dbPromise;
}

export function newId(): string {
  return Crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

// --- Row mapping ---------------------------------------------------------------
// SQLite hands back 0/1 for booleans and strings for JSON. Each table's
// fetchers declare which columns need converting.

export type RawRow = Record<string, unknown>;

export function fromRow<T>(row: RawRow, bools: readonly string[], jsons: readonly string[] = []): T {
  const out: RawRow = { ...row };
  for (const b of bools) out[b] = row[b] === 1 || row[b] === true;
  for (const j of jsons) {
    const v = row[j];
    if (typeof v === 'string') {
      try {
        out[j] = JSON.parse(v);
      } catch {
        out[j] = null;
      }
    } else if (v === undefined) {
      out[j] = null;
    }
  }
  return out as T;
}

// Turns a partial patch into "col = ?, col = ?" plus the bound values,
// serializing booleans and JSON-ish values. Skips undefined keys.
export function toSet(patch: Record<string, unknown>, jsons: readonly string[] = []): { sql: string; values: SQLite.SQLiteBindValue[] } {
  const cols: string[] = [];
  const values: SQLite.SQLiteBindValue[] = [];
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    cols.push(`${k} = ?`);
    values.push(toBind(v, jsons.includes(k)));
  }
  return { sql: cols.join(', '), values };
}

export function toBind(v: unknown, json = false): SQLite.SQLiteBindValue {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (json || Array.isArray(v) || (typeof v === 'object' && !(v instanceof Uint8Array))) return JSON.stringify(v);
  return v as SQLite.SQLiteBindValue;
}

// Builds "INSERT INTO t (a, b) VALUES (?, ?)" from an object.
export function toInsert(table: string, row: Record<string, unknown>, jsons: readonly string[] = []): { sql: string; values: SQLite.SQLiteBindValue[] } {
  const keys = Object.keys(row).filter((k) => row[k] !== undefined);
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
  const values = keys.map((k) => toBind(row[k], jsons.includes(k)));
  return { sql, values };
}
