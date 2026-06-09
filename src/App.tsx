import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { GoalsPage } from '@/features/goals/GoalsPage';
import { ProjectsPage } from '@/features/projects/ProjectsPage';
import { TasksPage } from '@/features/tasks/TasksPage';
import { RecurringTasksPage } from '@/features/recurring/RecurringTasksPage';
import { DailyLogsPage } from '@/features/daily-logs/DailyLogsPage';

export function App(): JSX.Element {
  return (
    <MainLayout>
      <Routes>
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/recurring" element={<RecurringTasksPage />} />
        <Route path="/daily-logs" element={<DailyLogsPage />} />
        <Route path="*" element={<Navigate to="/tasks" replace />} />
      </Routes>
    </MainLayout>
  );
}
