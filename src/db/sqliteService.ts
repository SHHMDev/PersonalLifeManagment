import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { migrations } from '@/db/schema';

type Row = Record<string, unknown>;

class SqliteService {
  private sqlite: SQLiteConnection | null = null;
  private db: SQLiteDBConnection | null = null;
  private initialized = false;

  private async getDb(): Promise<SQLiteDBConnection> {
    if (this.db) return this.db;

    if (Capacitor.getPlatform() === 'web') {
      throw new Error('SQLite native layer needs Android runtime.');
    }

    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    const consistency = await this.sqlite.checkConnectionsConsistency();
    const isConn = (await this.sqlite.isConnection('plm_db', false)).result;

    if (consistency.result && isConn) {
      this.db = await this.sqlite.retrieveConnection('plm_db', false);
    } else {
      this.db = await this.sqlite.createConnection('plm_db', false, 'no-encryption', 1, false);
    }

    await this.db.open();

    if (!this.initialized) {
      await this.runMigrations(this.db);
      this.initialized = true;
    }

    return this.db;
  }

  private async runMigrations(db: SQLiteDBConnection): Promise<void> {
    for (const migration of migrations) {
      for (const statement of migration.statements) {
        await db.execute(statement);
      }
    }
  }

  async query<T extends Row>(statement: string, values: unknown[] = []): Promise<T[]> {
    const db = await this.getDb();
    const result = await db.query(statement, values);
    return (result.values as T[] | undefined) ?? [];
  }

  async run(statement: string, values: unknown[] = []): Promise<number> {
    const db = await this.getDb();
    const result = await db.run(statement, values);
    return result.changes?.lastId ?? 0;
  }
}

export const sqliteService = new SqliteService();
