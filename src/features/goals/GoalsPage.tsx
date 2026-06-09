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
import { goalsRepository } from '@/db/repositories/goalsRepository';
import { useAsyncData } from '@/hooks';
import { Goal } from '@/types';
import { isValidPersianText, nowIso } from '@/utils';

type GoalForm = {
  title: string;
  description: string;
  categoryId: number;
};

export function GoalsPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [categoryTitle, setCategoryTitle] = useState('');
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [form, setForm] = useState<GoalForm>({ title: '', description: '', categoryId: 0 });
  const [error, setError] = useState('');

  const categoriesQuery = useAsyncData(() => listCategories('goal_categories'), []);
  const goalsQuery = useAsyncData(() => goalsRepository.list(search), [search]);

  const categoryOptions = useMemo(
    () =>
      (categoriesQuery.data ?? []).map((category) => ({
        label: category.title,
        value: category.id
      })),
    [categoriesQuery.data]
  );

  const selectedCategoryId = form.categoryId || (categoriesQuery.data?.[0]?.id ?? 0);

  const resetForm = (): void => {
    setForm({ title: '', description: '', categoryId: selectedCategoryId });
    setEditingGoal(null);
    setError('');
  };

  const reloadAll = async (): Promise<void> => {
    await categoriesQuery.reload();
    await goalsQuery.reload();
  };

  const addCategory = async (): Promise<void> => {
    if (!isValidPersianText(categoryTitle)) return;
    await createCategory('goal_categories', categoryTitle);
    setCategoryTitle('');
    await reloadAll();
    setForm((prev) => ({ ...prev, categoryId: prev.categoryId || categoriesQuery.data?.[0]?.id || 0 }));
  };

  const saveGoal = async (): Promise<void> => {
    if (!isValidPersianText(form.title)) {
      setError('عنوان الزامی است.');
      return;
    }
    if (!selectedCategoryId) {
      setError('ابتدا یک دسته‌بندی بسازید.');
      return;
    }
    if (editingGoal) {
      await goalsRepository.update({
        ...editingGoal,
        ...form,
        categoryId: selectedCategoryId
      });
    } else {
      await goalsRepository.create({
        title: form.title,
        description: form.description,
        categoryId: selectedCategoryId,
        createdAt: nowIso()
      });
    }
    resetForm();
    await goalsQuery.reload();
  };

  return (
    <main className="grid-gap">
      <PageHeader title="اهداف" subtitle="مدیریت کامل دسته‌ها و اهداف با جستجو" />

      <Card title="دسته‌بندی اهداف" subtitle="دسته‌ها کاملاً پویا هستند">
        <div className="row">
          <input value={categoryTitle} onChange={(event) => setCategoryTitle(event.target.value)} placeholder="نام دسته جدید" />
          <Button onClick={addCategory}>افزودن دسته</Button>
        </div>
        <div className="list" style={{ marginTop: 10 }}>
          {(categoriesQuery.data ?? []).map((category) => (
            <div className="list-item row-between" key={category.id}>
              <span>{category.title}</span>
              <Button variant="danger" onClick={() => void deleteCategory('goal_categories', category.id).then(reloadAll)}>
                حذف
              </Button>
            </div>
          ))}
          {!categoriesQuery.loading && (categoriesQuery.data ?? []).length === 0 ? (
            <EmptyState text="هنوز دسته‌ای ثبت نشده است." />
          ) : null}
        </div>
      </Card>

      <Card title={editingGoal ? 'ویرایش هدف' : 'هدف جدید'} subtitle="اطلاعات هدف را وارد کنید">
        <div className="grid-gap">
          <SelectField
            label="دسته"
            value={selectedCategoryId}
            onChange={(event) => setForm((prev) => ({ ...prev, categoryId: Number(event.target.value) }))}
            options={categoryOptions.length ? categoryOptions : [{ value: 0, label: 'ابتدا دسته بسازید' }]}
          />
          <TextField
            label="عنوان"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          />
          <TextAreaField
            label="توضیحات"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          />
          {error ? <p style={{ margin: 0, color: 'var(--color-danger)' }}>{error}</p> : null}
          <div className="toolbar">
            <Button onClick={() => void saveGoal()}>{editingGoal ? 'ذخیره تغییرات' : 'ایجاد هدف'}</Button>
            <Button variant="secondary" onClick={resetForm}>
              پاک‌سازی فرم
            </Button>
          </div>
        </div>
      </Card>

      <Card title="لیست اهداف" subtitle="جستجو، ویرایش، حذف">
        <SearchBar value={search} onChange={setSearch} placeholder="جستجو در اهداف..." />
        <div className="list" style={{ marginTop: 10 }}>
          {(goalsQuery.data ?? []).map((goal) => (
            <article className="list-item" key={goal.id}>
              <div className="row-between">
                <strong>{goal.title}</strong>
                <span className="badge">#{goal.categoryId}</span>
              </div>
              <p>{goal.description || 'بدون توضیح'}</p>
              <div className="toolbar">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingGoal(goal);
                    setForm({
                      title: goal.title,
                      description: goal.description,
                      categoryId: goal.categoryId
                    });
                  }}
                >
                  ویرایش
                </Button>
                <Button variant="danger" onClick={() => void goalsRepository.remove(goal.id).then(goalsQuery.reload)}>
                  حذف
                </Button>
              </div>
            </article>
          ))}
          {!goalsQuery.loading && (goalsQuery.data ?? []).length === 0 ? <EmptyState text="هدفی یافت نشد." /> : null}
        </div>
      </Card>
    </main>
  );
}
