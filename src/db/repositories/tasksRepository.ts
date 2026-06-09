import { sqliteService } from '@/db/sqliteService';
import { Task } from '@/types';

export const tasksRepository = {
  async list(searchTerm: string): Promise<Task[]> {
    const keyword = `%${searchTerm.trim()}%`;
    return sqliteService.query<Task>(
      'SELECT id, categoryId, title, description, importance, urgency, benefit, priorityScore, isDone, createdAt, completedAt FROM tasks WHERE title LIKE ? OR description LIKE ? ORDER BY priorityScore DESC, id DESC',
      [keyword, keyword]
    );
  },
  async create(payload: Omit<Task, 'id' | 'isDone' | 'completedAt'>): Promise<void> {
    await sqliteService.run(
      'INSERT INTO tasks(categoryId, title, description, importance, urgency, benefit, priorityScore, isDone, createdAt, completedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, NULL)',
      [
        payload.categoryId,
        payload.title.trim(),
        payload.description.trim(),
        payload.importance,
        payload.urgency,
        payload.benefit,
        payload.priorityScore,
        payload.createdAt
      ]
    );
  },
  async update(task: Task): Promise<void> {
    await sqliteService.run(
      'UPDATE tasks SET categoryId = ?, title = ?, description = ?, importance = ?, urgency = ?, benefit = ?, priorityScore = ?, isDone = ?, completedAt = ? WHERE id = ?',
      [
        task.categoryId,
        task.title.trim(),
        task.description.trim(),
        task.importance,
        task.urgency,
        task.benefit,
        task.priorityScore,
        task.isDone,
        task.completedAt,
        task.id
      ]
    );
  },
  async remove(id: number): Promise<void> {
    await sqliteService.run('DELETE FROM tasks WHERE id = ?', [id]);
  }
};
