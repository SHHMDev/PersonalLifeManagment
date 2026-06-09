import { sqliteService } from '@/db/sqliteService';
import { DailyLog } from '@/types';

export const dailyLogsRepository = {
  async list(searchTerm: string): Promise<DailyLog[]> {
    const keyword = `%${searchTerm.trim()}%`;
    return sqliteService.query<DailyLog>(
      'SELECT id, title, logDate, content, createdAt FROM daily_logs WHERE title LIKE ? OR content LIKE ? ORDER BY logDate DESC, id DESC',
      [keyword, keyword]
    );
  },
  async create(payload: Omit<DailyLog, 'id'>): Promise<void> {
    await sqliteService.run('INSERT INTO daily_logs(title, logDate, content, createdAt) VALUES (?, ?, ?, ?)', [
      payload.title.trim(),
      payload.logDate,
      payload.content,
      payload.createdAt
    ]);
  },
  async update(payload: DailyLog): Promise<void> {
    await sqliteService.run('UPDATE daily_logs SET title = ?, logDate = ?, content = ? WHERE id = ?', [
      payload.title.trim(),
      payload.logDate,
      payload.content,
      payload.id
    ]);
  },
  async remove(id: number): Promise<void> {
    await sqliteService.run('DELETE FROM daily_logs WHERE id = ?', [id]);
  }
};
