export type FrequencyType = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export type BaseCategory = {
  id: number;
  title: string;
};

export type Goal = {
  id: number;
  categoryId: number;
  title: string;
  description: string;
  createdAt: string;
};

export type Project = {
  id: number;
  categoryId: number;
  title: string;
  description: string;
};

export type Subject = {
  id: number;
  projectId: number;
  parentSubjectId: number | null;
  title: string;
  description: string;
  isDone: number;
};

export type Task = {
  id: number;
  categoryId: number;
  title: string;
  description: string;
  importance: number;
  urgency: number;
  benefit: number;
  priorityScore: number;
  isDone: number;
  createdAt: string;
  completedAt: string | null;
};

export type RecurringTask = {
  id: number;
  categoryId: number;
  title: string;
  description: string;
  frequencyType: FrequencyType;
  timeOfDay: string;
  lastCompletedAt: string | null;
  nextDueAt: string;
  notificationsEnabled: number;
};

export type DailyLog = {
  id: number;
  title: string;
  logDate: string;
  content: string;
  createdAt: string;
};
