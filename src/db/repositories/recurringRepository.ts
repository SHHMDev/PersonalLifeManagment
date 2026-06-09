import { sqliteService } from '@/db/sqliteService';
import { RecurringTask } from '@/types';

export const recurringRepository = {
  async list(searchTerm: string): Promise<RecurringTask[]> {
    const keyword = `%${searchTerm.trim()}%`;
    return sqliteService.query<RecurringTask>(
      'SELECT id, categoryId, title, description, frequencyType, timeOfDay, lastCompletedAt, nextDueAt, notificationsEnabled FROM recurring_tasks WHERE title LIKE ? OR description LIKE ? ORDER BY id DESC',
      [keyword, keyword]
    );
  },
  async create(payload: Omit<RecurringTask, 'id' | 'lastCompletedAt'>): Promise<void> {
    await sqliteService.run(
      'INSERT INTO recurring_tasks(categoryId, title, description, frequencyType, timeOfDay, lastCompletedAt, nextDueAt, notificationsEnabled) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)',
      [
        payload.categoryId,
        payload.title.trim(),
        payload.description.trim(),
        payload.frequencyType,
        payload.timeOfDay,
        payload.nextDueAt,
        payload.notificationsEnabled
      ]
    );
  },
  async update(item: RecurringTask): Promise<void> {
    await sqliteService.run(
      'UPDATE recurring_tasks SET categoryId = ?, title = ?, description = ?, frequencyType = ?, timeOfDay = ?, lastCompletedAt = ?, nextDueAt = ?, notificationsEnabled = ? WHERE id = ?',
      [
        item.categoryId,
        item.title.trim(),
        item.description.trim(),
        item.frequencyType,
        item.timeOfDay,
        item.lastCompletedAt,
        item.nextDueAt,
        item.notificationsEnabled,
        item.id
      ]
    );
  },
  async remove(id: number): Promise<void> {
    await sqliteService.run('DELETE FROM recurring_tasks WHERE id = ?', [id]);
  }
};
