import { sqliteService } from '@/db/sqliteService';
import { Goal } from '@/types';

export const goalsRepository = {
  async list(searchTerm: string): Promise<Goal[]> {
    const keyword = `%${searchTerm.trim()}%`;
    return sqliteService.query<Goal>(
      'SELECT id, categoryId, title, description, createdAt FROM goals WHERE title LIKE ? OR description LIKE ? ORDER BY id DESC',
      [keyword, keyword]
    );
  },
  async create(payload: Omit<Goal, 'id'>): Promise<void> {
    await sqliteService.run(
      'INSERT INTO goals(categoryId, title, description, createdAt) VALUES (?, ?, ?, ?)',
      [payload.categoryId, payload.title.trim(), payload.description.trim(), payload.createdAt]
    );
  },
  async update(goal: Goal): Promise<void> {
    await sqliteService.run('UPDATE goals SET categoryId = ?, title = ?, description = ? WHERE id = ?', [
      goal.categoryId,
      goal.title.trim(),
      goal.description.trim(),
      goal.id
    ]);
  },
  async remove(id: number): Promise<void> {
    await sqliteService.run('DELETE FROM goals WHERE id = ?', [id]);
  }
};
