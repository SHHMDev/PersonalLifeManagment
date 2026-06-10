import { sqliteService } from '@/db/sqliteService';
import { Project, Subject } from '@/types';

export const projectsRepository = {
  async listProjects(searchTerm: string): Promise<Project[]> {
    const keyword = `%${searchTerm.trim()}%`;
    return sqliteService.query<Project>(
      'SELECT id, categoryId, title, description FROM projects WHERE title LIKE ? OR description LIKE ? ORDER BY id DESC',
      [keyword, keyword]
    );
  },
  async createProject(payload: Omit<Project, 'id'>): Promise<void> {
    await sqliteService.run('INSERT INTO projects(categoryId, title, description) VALUES (?, ?, ?)', [payload.categoryId, payload.title, payload.description]);
  },
  async updateProject(payload: Project): Promise<void> {
    await sqliteService.run('UPDATE projects SET categoryId = ?, title = ?, description = ? WHERE id = ?', [payload.categoryId, payload.title, payload.description, payload.id]);
  },
  async removeProject(id: number): Promise<void> {
    await sqliteService.run('DELETE FROM projects WHERE id = ?', [id]);
  },
  async listSubjects(projectId: number): Promise<Subject[]> {
    return sqliteService.query<Subject>(
      'SELECT id, projectId, parentSubjectId, title, description, isDone FROM subjects WHERE projectId = ? ORDER BY id DESC',
      [projectId]
    );
  },
  async createSubject(payload: Omit<Subject, 'id' | 'isDone'>): Promise<void> {
    await sqliteService.run('INSERT INTO subjects(projectId, parentSubjectId, title, description, isDone) VALUES (?, ?, ?, ?, 0)', [
      payload.projectId,
      payload.parentSubjectId,
      payload.title,
      payload.description
    ]);
  },
  async updateSubject(payload: Subject): Promise<void> {
    await sqliteService.run('UPDATE subjects SET parentSubjectId = ?, title = ?, description = ?, isDone = ? WHERE id = ?', [
      payload.parentSubjectId,
      payload.title,
      payload.description,
      payload.isDone,
      payload.id
    ]);
  },
  async removeSubject(id: number): Promise<void> {
    await sqliteService.run('DELETE FROM subjects WHERE id = ?', [id]);
  }
};
