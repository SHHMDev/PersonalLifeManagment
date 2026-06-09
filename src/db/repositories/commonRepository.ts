import { sqliteService } from '@/db/sqliteService';
import { BaseCategory } from '@/types';

export async function listCategories(table: string): Promise<BaseCategory[]> {
  return sqliteService.query<BaseCategory>(`SELECT id, title FROM ${table} ORDER BY id DESC`);
}

export async function createCategory(table: string, title: string): Promise<number> {
  return sqliteService.run(`INSERT INTO ${table}(title) VALUES (?)`, [title.trim()]);
}

export async function deleteCategory(table: string, id: number): Promise<void> {
  await sqliteService.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
}
