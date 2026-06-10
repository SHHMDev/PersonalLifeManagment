import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CategoryChips } from '@/components/CategoryChips';
import { EmptyState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { SearchBar } from '@/components/SearchBar';
import { SelectField } from '@/components/SelectField';
import { TextAreaField } from '@/components/TextAreaField';
import { TextField } from '@/components/TextField';
import { createCategory, deleteCategory, listCategories } from '@/db/repositories/commonRepository';
import { goalsRepository } from '@/db/repositories/goalsRepository';
import { useAsyncData, useFloatingAction } from '@/hooks';
import { Goal } from '@/types';
import { normalizePersianText, nowIso } from '@/utils';

type GoalForm = {
  title: string;
  description: string;
  categoryId: number;
};

const emptyForm: GoalForm = { title: '', description: '', categoryId: 0 };

export function GoalsPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [categoryTitle, setCategoryTitle] = useState('');
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [form, setForm] = useState<GoalForm>(emptyForm);
  const [error, setError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(0);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const categoriesQuery = useAsyncData(() => listCategories('goal_categories'), []);
  const goalsQuery = useAsyncData(() => goalsRepository.list(search), [search]);

  const categories = categoriesQuery.data ?? [];
  const goals = goalsQuery.data ?? [];
  const safeCategoryId = categories.some((category) => category.id === form.categoryId) ? form.categoryId : categories[0]?.id ?? 0;

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        label: category.title,
        value: category.id
      })),
    [categories]
  );

  const filteredGoals = useMemo(
    () => goals.filter((goal) => (selectedCategoryFilter ? goal.categoryId === selectedCategoryFilter : true)),
    [goals, selectedCategoryFilter]
  );

  const categoryTitleById = useMemo(() => new Map(categories.map((category) => [category.id, category.title])), [categories]);

  const resetForm = useCallback((): void => {
    setForm({ ...emptyForm, categoryId: categories[0]?.id ?? 0 });
    setEditingGoal(null);
    setError('');
  }, [categories]);

  useFloatingAction(
    '/goals',
    useCallback(() => {
      resetForm();
      setIsGoalModalOpen(true);
    }, [resetForm])
  );

  const reloadAll = async (): Promise<void> => {
    await categoriesQuery.reload();
    await goalsQuery.reload();
  };

  const openCreateModal = (): void => {
    resetForm();
    setIsGoalModalOpen(true);
  };

  const addCategory = async (): Promise<void> => {
    const normalizedTitle = normalizePersianText(categoryTitle);
    if (!normalizedTitle) {
      setCategoryError('نام دسته الزامی است.');
      return;
    }

    await createCategory('goal_categories', normalizedTitle);
    setCategoryTitle('');
    setCategoryError('');
    await reloadAll();
    setForm((prev) => ({ ...prev, categoryId: prev.categoryId || categoriesQuery.data?.[0]?.id || 0 }));
  };

  const removeCategory = async (categoryId: number): Promise<void> => {
    await deleteCategory('goal_categories', categoryId);
    if (selectedCategoryFilter === categoryId) {
      setSelectedCategoryFilter(0);
    }
    if (form.categoryId === categoryId) {
      setForm((prev) => ({ ...prev, categoryId: 0 }));
    }
    await reloadAll();
  };

  const saveGoal = async (): Promise<void> => {
    const normalizedTitle = normalizePersianText(form.title);
    const normalizedDescription = normalizePersianText(form.description);
    const nextCategoryId = safeCategoryId;

    if (!normalizedTitle) {
      setError('عنوان الزامی است.');
      return;
    }
    if (!nextCategoryId) {
      setError('ابتدا یک دسته‌بندی بسازید.');
      return;
    }

    if (editingGoal) {
      await goalsRepository.update({
        ...editingGoal,
        title: normalizedTitle,
        description: normalizedDescription,
        categoryId: nextCategoryId
      });
    } else {
      await goalsRepository.create({
        title: normalizedTitle,
        description: normalizedDescription,
        categoryId: nextCategoryId,
        createdAt: nowIso()
      });
    }

    await goalsQuery.reload();
    resetForm();
    setIsGoalModalOpen(false);
  };

  return (
    <main className="grid-gap">
      <PageHeader title="اهداف" subtitle="مدیریت کامل دسته‌ها و اهداف با جستجو" />

      <div className="row-between">
        <SearchBar value={search} onChange={setSearch} placeholder="جستجو در اهداف..." />
        <div className="toolbar">
          <Button onClick={openCreateModal}>افزودن هدف</Button>
          <Button onClick={() => setIsCategoryModalOpen(true)} variant="secondary">
            مدیریت دسته‌ها
          </Button>
        </div>
      </div>

      <CategoryChips categories={categories} onSelect={setSelectedCategoryFilter} selectedCategoryId={selectedCategoryFilter} />

      <Card title="لیست اهداف" subtitle="جستجو، ویرایش، حذف">
        <div className="list">
          {filteredGoals.map((goal) => (
            <article className="list-item" key={goal.id}>
              <div className="row-between">
                <strong>{goal.title}</strong>
                <span className="badge">{categoryTitleById.get(goal.categoryId) ?? 'بدون دسته'}</span>
              </div>
              <p className="content-preview">{goal.description || 'بدون توضیح'}</p>
              <div className="toolbar">
                <Button
                  onClick={() => {
                    setEditingGoal(goal);
                    setForm({
                      title: goal.title,
                      description: goal.description,
                      categoryId: goal.categoryId
                    });
                    setError('');
                    setIsGoalModalOpen(true);
                  }}
                  variant="secondary"
                >
                  ویرایش
                </Button>
                <Button variant="danger" onClick={() => void goalsRepository.remove(goal.id).then(goalsQuery.reload)}>
                  حذف
                </Button>
              </div>
            </article>
          ))}
          {!goalsQuery.loading && filteredGoals.length === 0 ? <EmptyState text="هدفی یافت نشد." /> : null}
        </div>
      </Card>

      <Modal
        open={isGoalModalOpen}
        title={editingGoal ? 'ویرایش هدف' : 'هدف جدید'}
        onClose={() => {
          setIsGoalModalOpen(false);
          resetForm();
        }}
        footer={
          <>
            <Button onClick={() => void saveGoal()}>{editingGoal ? 'ذخیره تغییرات' : 'ایجاد هدف'}</Button>
            <Button
              onClick={() => {
                resetForm();
                setIsGoalModalOpen(false);
              }}
              variant="secondary"
            >
              انصراف
            </Button>
          </>
        }
      >
        <SelectField
          label="دسته"
          value={safeCategoryId}
          onChange={(event) => setForm((prev) => ({ ...prev, categoryId: Number(event.target.value) }))}
          options={categoryOptions.length ? categoryOptions : [{ value: 0, label: 'ابتدا دسته بسازید' }]}
        />
        <TextField label="عنوان" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
        <TextAreaField
          label="توضیحات"
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
        />
        {error ? <p style={{ margin: 0, color: 'var(--color-danger)' }}>{error}</p> : null}
      </Modal>

      <Modal
        open={isCategoryModalOpen}
        title="مدیریت دسته‌های هدف"
        onClose={() => {
          setIsCategoryModalOpen(false);
          setCategoryTitle('');
          setCategoryError('');
        }}
        footer={
          <>
            <Button onClick={() => void addCategory()}>افزودن دسته</Button>
            <Button
              onClick={() => {
                setIsCategoryModalOpen(false);
                setCategoryTitle('');
                setCategoryError('');
              }}
              variant="secondary"
            >
              بستن
            </Button>
          </>
        }
      >
        <TextField label="نام دسته جدید" value={categoryTitle} onChange={(event) => setCategoryTitle(event.target.value)} />
        {categoryError ? <p style={{ margin: 0, color: 'var(--color-danger)' }}>{categoryError}</p> : null}
        <div className="list">
          {categories.map((category) => (
            <div className="list-item row-between" key={category.id}>
              <span>{category.title}</span>
              <Button variant="danger" onClick={() => void removeCategory(category.id)}>
                حذف
              </Button>
            </div>
          ))}
          {!categoriesQuery.loading && categories.length === 0 ? <EmptyState text="هنوز دسته‌ای ثبت نشده است." /> : null}
        </div>
      </Modal>
    </main>
  );
}
