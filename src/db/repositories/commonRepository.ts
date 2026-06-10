import { sqliteService } from '@/db/sqliteService';
import { BaseCategory } from '@/types';

const allowedTables = ['goal_categories', 'project_categories', 'task_categories', 'recurring_task_categories'] as const;

function assertAllowedTable(table: string): void {
  if (!allowedTables.includes(table as (typeof allowedTables)[number])) {
    throw new Error('دسته‌بندی نامعتبر است.');
  }
}

export async function listCategories(table: string): Promise<BaseCategory[]> {
  assertAllowedTable(table);
  return sqliteService.query<BaseCategory>(`SELECT id, title FROM ${table} ORDER BY id DESC`);
}

export async function createCategory(table: string, title: string): Promise<number> {
  assertAllowedTable(table);
  return sqliteService.run(`INSERT INTO ${table}(title) VALUES (?)`, [title]);
}

export async function deleteCategory(table: string, id: number): Promise<void> {
  assertAllowedTable(table);
  await sqliteService.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
}
