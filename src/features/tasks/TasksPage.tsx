import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { SearchBar } from '@/components/SearchBar';
import { SelectField } from '@/components/SelectField';
import { TextAreaField } from '@/components/TextAreaField';
import { TextField } from '@/components/TextField';
import { createCategory, deleteCategory, listCategories } from '@/db/repositories/commonRepository';
import { tasksRepository } from '@/db/repositories/tasksRepository';
import { useAsyncData } from '@/hooks';
import { Task } from '@/types';
import { calculatePriorityScore, clampScore, isValidPersianText, nowIso } from '@/utils';

export function TasksPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [categoryTitle, setCategoryTitle] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(0);
  const [importance, setImportance] = useState(3);
  const [urgency, setUrgency] = useState(3);
  const [benefit, setBenefit] = useState(3);

  const categoriesQuery = useAsyncData(() => listCategories('task_categories'), []);
  const tasksQuery = useAsyncData(() => tasksRepository.list(search), [search]);

  const categoryOptions = useMemo(
    () =>
      (categoriesQuery.data ?? []).map((category) => ({
        label: category.title,
        value: category.id
      })),
    [categoriesQuery.data]
  );

  const score = calculatePriorityScore(importance, urgency, benefit);

  const addCategory = async (): Promise<void> => {
    if (!isValidPersianText(categoryTitle)) return;
    await createCategory('task_categories', categoryTitle);
    setCategoryTitle('');
    await categoriesQuery.reload();
  };

  const resetTaskForm = (): void => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setCategoryId(categoriesQuery.data?.[0]?.id ?? 0);
    setImportance(3);
    setUrgency(3);
    setBenefit(3);
  };

  const saveTask = async (): Promise<void> => {
    if (!isValidPersianText(title) || !categoryId) return;
    const computed = calculatePriorityScore(importance, urgency, benefit);

    if (editingTask) {
      await tasksRepository.update({
        ...editingTask,
        title,
        description,
        categoryId,
        importance,
        urgency,
        benefit,
        priorityScore: computed
      });
    } else {
      await tasksRepository.create({
        title,
        description,
        categoryId,
        importance,
        urgency,
        benefit,
        priorityScore: computed,
        createdAt: nowIso()
      });
    }

    resetTaskForm();
    await tasksQuery.reload();
  };

  const markDone = async (task: Task): Promise<void> => {
    await tasksRepository.update({
      ...task,
      isDone: task.isDone ? 0 : 1,
      completedAt: task.isDone ? null : nowIso()
    });
    await tasksQuery.reload();
  };

  const pendingTasks = (tasksQuery.data ?? []).filter((task) => !task.isDone);
  const completedTasks = (tasksQuery.data ?? []).filter((task) => task.isDone);

  return (
    <main className="grid-gap">
      <PageHeader title="وظایف" subtitle="مدیریت وظایف با امتیاز اولویت" />

      <Card title="دسته‌بندی وظایف" subtitle="ایجاد پویا">
        <div className="row">
          <input value={categoryTitle} onChange={(event) => setCategoryTitle(event.target.value)} placeholder="نام دسته جدید" />
          <Button onClick={addCategory}>افزودن دسته</Button>
        </div>
        <div className="list" style={{ marginTop: 10 }}>
          {(categoriesQuery.data ?? []).map((category) => (
            <div className="list-item row-between" key={category.id}>
              <span>{category.title}</span>
              <Button variant="danger" onClick={() => void deleteCategory('task_categories', category.id).then(categoriesQuery.reload)}>
                حذف
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card title={editingTask ? 'ویرایش وظیفه' : 'وظیفه جدید'} subtitle="اولویت = اهمیت + فوریت + منفعت">
        <div className="grid-gap">
          <SelectField
            label="دسته"
            value={categoryId}
            onChange={(event) => setCategoryId(Number(event.target.value))}
            options={categoryOptions.length ? categoryOptions : [{ value: 0, label: 'ابتدا دسته بسازید' }]}
          />
          <TextField label="عنوان" value={title} onChange={(event) => setTitle(event.target.value)} />
          <TextAreaField label="توضیحات" value={description} onChange={(event) => setDescription(event.target.value)} />

          <TextField
            label="اهمیت (۱ تا ۵)"
            type="number"
            min={1}
            max={5}
            value={importance}
            onChange={(event) => setImportance(clampScore(Number(event.target.value)))}
          />
          <TextField
            label="فوریت (۱ تا ۵)"
            type="number"
            min={1}
            max={5}
            value={urgency}
            onChange={(event) => setUrgency(clampScore(Number(event.target.value)))}
          />
          <TextField
            label="منفعت (۱ تا ۵)"
            type="number"
            min={1}
            max={5}
            value={benefit}
            onChange={(event) => setBenefit(clampScore(Number(event.target.value)))}
          />

          <p style={{ margin: 0 }}>امتیاز اولویت: <strong>{score}</strong></p>

          <div className="toolbar">
            <Button onClick={() => void saveTask()}>{editingTask ? 'ذخیره تغییرات' : 'ایجاد وظیفه'}</Button>
            <Button variant="secondary" onClick={resetTaskForm}>
              پاک‌سازی
            </Button>
          </div>
        </div>
      </Card>

      <Card title="وظایف درحال انجام" subtitle="مرتب‌شده بر اساس اولویت">
        <SearchBar value={search} onChange={setSearch} placeholder="جستجو در وظایف..." />
        <div className="list" style={{ marginTop: 10 }}>
          {pendingTasks.map((task) => (
            <div className="list-item" key={task.id}>
              <div className="row-between">
                <strong>{task.title}</strong>
                <span className="badge">{task.priorityScore}</span>
              </div>
              <p>{task.description || 'بدون توضیح'}</p>
              <div className="toolbar">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingTask(task);
                    setTitle(task.title);
                    setDescription(task.description);
                    setCategoryId(task.categoryId);
                    setImportance(task.importance);
                    setUrgency(task.urgency);
                    setBenefit(task.benefit);
                  }}
                >
                  ویرایش
                </Button>
                <Button variant="secondary" onClick={() => void markDone(task)}>
                  انجام شد
                </Button>
                <Button variant="danger" onClick={() => void tasksRepository.remove(task.id).then(tasksQuery.reload)}>
                  حذف
                </Button>
              </div>
            </div>
          ))}
          {!tasksQuery.loading && pendingTasks.length === 0 ? <EmptyState text="وظیفه فعالی وجود ندارد." /> : null}
        </div>
      </Card>

      <Card title="وظایف انجام‌شده" subtitle="آرشیو تکمیل‌شده‌ها">
        <div className="list">
          {completedTasks.map((task) => (
            <div className="list-item row-between" key={task.id}>
              <span>{task.title}</span>
              <div className="toolbar">
                <Button variant="secondary" onClick={() => void markDone(task)}>
                  بازگردانی
                </Button>
                <Button variant="danger" onClick={() => void tasksRepository.remove(task.id).then(tasksQuery.reload)}>
                  حذف
                </Button>
              </div>
            </div>
          ))}
          {!tasksQuery.loading && completedTasks.length === 0 ? <EmptyState text="موردی ثبت نشده است." /> : null}
        </div>
      </Card>
    </main>
  );
}
