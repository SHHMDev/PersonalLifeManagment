import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CategoryChips } from '@/components/CategoryChips';
import { EmptyState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { RichTextField } from '@/components/RichTextField';
import { SearchBar } from '@/components/SearchBar';
import { SelectField } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { createCategory, deleteCategory, listCategories } from '@/db/repositories/commonRepository';
import { tasksRepository } from '@/db/repositories/tasksRepository';
import { useAsyncData, useFloatingAction } from '@/hooks';
import { Task } from '@/types';
import { calculatePriorityScore, clampScore, hasMeaningfulText, nowIso } from '@/utils';

type TaskForm = {
  title: string;
  description: string;
  categoryId: number;
  importance: number;
  urgency: number;
  benefit: number;
};

const emptyForm: TaskForm = { title: '', description: '', categoryId: 0, importance: 3, urgency: 3, benefit: 3 };

export function TasksPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [categoryTitle, setCategoryTitle] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [error, setError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(0);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const categoriesQuery = useAsyncData(() => listCategories('task_categories'), []);
  const tasksQuery = useAsyncData(() => tasksRepository.list(search), [search]);

  const categories = categoriesQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const safeCategoryId = categories.some((category) => category.id === form.categoryId) ? form.categoryId : categories[0]?.id ?? 0;

  const categoryOptions = useMemo(() => categories.map((category) => ({ label: category.title, value: category.id })), [categories]);
  const categoryTitleById = useMemo(() => new Map(categories.map((category) => [category.id, category.title])), [categories]);

  const filteredTasks = useMemo(() => tasks.filter((task) => (selectedCategoryFilter ? task.categoryId === selectedCategoryFilter : true)), [selectedCategoryFilter, tasks]);
  const pendingTasks = filteredTasks.filter((task) => !task.isDone);
  const completedTasks = filteredTasks.filter((task) => task.isDone);
  const score = calculatePriorityScore(form.importance, form.urgency, form.benefit);

  const resetTaskForm = useCallback((): void => {
    setEditingTask(null);
    setForm({ ...emptyForm, categoryId: categories[0]?.id ?? 0 });
    setError('');
  }, [categories]);

  useFloatingAction('/tasks', useCallback(() => { resetTaskForm(); setIsTaskModalOpen(true); }, [resetTaskForm]));

  const reloadAll = async (): Promise<void> => {
    await categoriesQuery.reload();
    await tasksQuery.reload();
  };

  const addCategory = async (): Promise<void> => {
    if (!hasMeaningfulText(categoryTitle)) {
      setCategoryError('نام دسته الزامی است.');
      return;
    }

    await createCategory('task_categories', categoryTitle);
    setCategoryTitle('');
    setCategoryError('');
    await reloadAll();
  };

  const removeCategory = async (categoryId: number): Promise<void> => {
    await deleteCategory('task_categories', categoryId);
    if (selectedCategoryFilter === categoryId) setSelectedCategoryFilter(0);
    if (form.categoryId === categoryId) setForm((prev) => ({ ...prev, categoryId: 0 }));
    await reloadAll();
  };

  const saveTask = async (): Promise<void> => {
    if (!hasMeaningfulText(form.title)) {
      setError('عنوان الزامی است.');
      return;
    }
    if (!safeCategoryId) {
      setError('ابتدا یک دسته‌بندی بسازید.');
      return;
    }

    const computed = calculatePriorityScore(form.importance, form.urgency, form.benefit);

    if (editingTask) {
      await tasksRepository.update({ ...editingTask, title: form.title, description: form.description, categoryId: safeCategoryId, importance: form.importance, urgency: form.urgency, benefit: form.benefit, priorityScore: computed });
    } else {
      await tasksRepository.create({ title: form.title, description: form.description, categoryId: safeCategoryId, importance: form.importance, urgency: form.urgency, benefit: form.benefit, priorityScore: computed, createdAt: nowIso() });
    }

    await tasksQuery.reload();
    resetTaskForm();
    setIsTaskModalOpen(false);
  };

  const markDone = async (task: Task): Promise<void> => {
    await tasksRepository.update({ ...task, isDone: task.isDone ? 0 : 1, completedAt: task.isDone ? null : nowIso() });
    await tasksQuery.reload();
  };

  return (
    <main className="grid-gap">
      <PageHeader title="وظایف" subtitle="مدیریت وظایف با امتیاز اولویت" />

      <div className="row-between">
        <SearchBar value={search} onChange={setSearch} placeholder="جستجو در وظایف..." />
        <div className="toolbar">
          <Button onClick={() => { resetTaskForm(); setIsTaskModalOpen(true); }}>افزودن وظیفه</Button>
          <Button onClick={() => setIsCategoryModalOpen(true)} variant="secondary">مدیریت دسته‌ها</Button>
        </div>
      </div>

      <CategoryChips categories={categories} onSelect={setSelectedCategoryFilter} selectedCategoryId={selectedCategoryFilter} />

      <Card title="وظایف درحال انجام" subtitle="مرتب‌شده بر اساس اولویت">
        <div className="list">
          {pendingTasks.map((task) => (
            <div className="list-item" key={task.id}>
              <button className="board-button" onClick={() => { setSelectedTask(task); setIsDetailsModalOpen(true); }} type="button">
                <div className="row-between">
                  <strong className="title-text">{task.title}</strong>
                  <span className="badge">{task.priorityScore}</span>
                </div>
                <div className="row-between"><span className="depth-tag title-text">{categoryTitleById.get(task.categoryId) ?? 'بدون دسته'}</span></div>
              </button>
              <div className="toolbar">
                <Button onClick={() => { setEditingTask(task); setForm({ title: task.title, description: task.description, categoryId: task.categoryId, importance: task.importance, urgency: task.urgency, benefit: task.benefit }); setError(''); setIsTaskModalOpen(true); }} variant="secondary">ویرایش</Button>
                <Button variant="secondary" onClick={() => void markDone(task)}>انجام شد</Button>
                <Button variant="danger" onClick={() => void tasksRepository.remove(task.id).then(tasksQuery.reload)}>حذف</Button>
              </div>
            </div>
          ))}
          {!tasksQuery.loading && pendingTasks.length === 0 ? <EmptyState text="وظیفه فعالی وجود ندارد." /> : null}
        </div>
      </Card>

      <Card title="وظایف انجام‌شده" subtitle="آرشیو تکمیل‌شده‌ها">
        <div className="list">
          {completedTasks.map((task) => (
            <div className="list-item" key={task.id}>
              <button className="board-button" onClick={() => { setSelectedTask(task); setIsDetailsModalOpen(true); }} type="button">
                <div className="row-between">
                  <span className="title-text">{task.title}</span>
                  <span className="badge title-badge">{categoryTitleById.get(task.categoryId) ?? 'بدون دسته'}</span>
                </div>
              </button>
              <div className="toolbar">
                <Button variant="secondary" onClick={() => void markDone(task)}>بازگردانی</Button>
                <Button variant="danger" onClick={() => void tasksRepository.remove(task.id).then(tasksQuery.reload)}>حذف</Button>
              </div>
            </div>
          ))}
          {!tasksQuery.loading && completedTasks.length === 0 ? <EmptyState text="موردی ثبت نشده است." /> : null}
        </div>
      </Card>

      <Modal open={isTaskModalOpen} title={editingTask ? 'ویرایش وظیفه' : 'وظیفه جدید'} onClose={() => { setIsTaskModalOpen(false); resetTaskForm(); }} footer={<><Button onClick={() => void saveTask()}>{editingTask ? 'ذخیره تغییرات' : 'ایجاد وظیفه'}</Button><Button onClick={() => { resetTaskForm(); setIsTaskModalOpen(false); }} variant="secondary">انصراف</Button></>}>
        <SelectField label="دسته" value={safeCategoryId} onChange={(event) => setForm((prev) => ({ ...prev, categoryId: Number(event.target.value) }))} options={categoryOptions.length ? categoryOptions : [{ value: 0, label: 'ابتدا دسته بسازید' }]} />
        <TextField label="عنوان" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
        <RichTextField label="توضیحات" value={form.description} onChange={(value) => setForm((prev) => ({ ...prev, description: value }))} />
        <TextField label="اهمیت (۱ تا ۵)" type="number" min={1} max={5} value={form.importance} onChange={(event) => setForm((prev) => ({ ...prev, importance: clampScore(Number(event.target.value)) }))} />
        <TextField label="فوریت (۱ تا ۵)" type="number" min={1} max={5} value={form.urgency} onChange={(event) => setForm((prev) => ({ ...prev, urgency: clampScore(Number(event.target.value)) }))} />
        <TextField label="منفعت (۱ تا ۵)" type="number" min={1} max={5} value={form.benefit} onChange={(event) => setForm((prev) => ({ ...prev, benefit: clampScore(Number(event.target.value)) }))} />
        <p style={{ margin: 0 }}>امتیاز اولویت: <strong>{score}</strong></p>
        {error ? <p style={{ margin: 0, color: 'var(--color-danger)' }}>{error}</p> : null}
      </Modal>

      <Modal open={isCategoryModalOpen} title="مدیریت دسته‌های وظیفه" onClose={() => { setIsCategoryModalOpen(false); setCategoryTitle(''); setCategoryError(''); }} footer={<><Button type="button" onClick={() => void addCategory()}>افزودن دسته</Button><Button type="button" onClick={() => { setIsCategoryModalOpen(false); setCategoryTitle(''); setCategoryError(''); }} variant="secondary">بستن</Button></>}>
        <TextField label="نام دسته جدید" value={categoryTitle} onChange={(event) => { setCategoryTitle(event.target.value); if (categoryError) setCategoryError(''); }} />
        {categoryError ? <p style={{ margin: 0, color: 'var(--color-danger)' }}>{categoryError}</p> : null}
        <div className="list">
          {categories.map((category) => (
            <div className="list-item row-between" key={category.id}>
              <span className="title-text">{category.title}</span>
              <Button type="button" variant="danger" onClick={() => void removeCategory(category.id)}>حذف</Button>
            </div>
          ))}
        </div>
      </Modal>

      <Modal open={isDetailsModalOpen} title={selectedTask?.title ?? 'جزئیات وظیفه'} onClose={() => { setIsDetailsModalOpen(false); setSelectedTask(null); }}>
        <p className="detail-category">{selectedTask ? categoryTitleById.get(selectedTask.categoryId) ?? 'بدون دسته' : ''}</p>
        <div className="detail-content" dangerouslySetInnerHTML={{ __html: selectedTask?.description || '<p>بدون توضیح</p>' }} />
      </Modal>
    </main>
  );
}
