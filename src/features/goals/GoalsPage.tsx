import { useCallback, useMemo, useState,useEffect } from 'react';
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
import { goalsRepository } from '@/db/repositories/goalsRepository';
import { useAsyncData, useFloatingAction } from '@/hooks';
import { Goal } from '@/types';
import { hasMeaningfulText, nowIso } from '@/utils';

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
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [form, setForm] = useState<GoalForm>(emptyForm);
  const [error, setError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(0);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const categoriesQuery = useAsyncData(() => listCategories('goal_categories'), []);
  const goalsQuery = useAsyncData(() => goalsRepository.list(search), [search]);

  const categories = categoriesQuery.data ?? [];
  const goals = goalsQuery.data ?? [];
  const safeCategoryId = form.categoryId !== 0 && categories.some(c => c.id === form.categoryId) 
    ? form.categoryId 
    : categories[0]?.id ?? 0;

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ label: category.title, value: category.id })),
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

    useEffect(() => {
    if (categories.length > 0 && form.categoryId === 0) {
      setForm(prev => ({ ...prev, categoryId: categories[0].id }));
    }
  }, [categories, form.categoryId]);



  const reloadAll = async (): Promise<void> => {
    await categoriesQuery.reload();
    await goalsQuery.reload();
  };

  const addCategory = async (): Promise<void> => {
    if (!hasMeaningfulText(categoryTitle)) {
      setCategoryError('نام دسته الزامی است.');
      return;
    }

    await createCategory('goal_categories', categoryTitle);
    setCategoryTitle('');
    setCategoryError('');
    await reloadAll();
  };

  const removeCategory = async (categoryId: number): Promise<void> => {
    await deleteCategory('goal_categories', categoryId);
    if (selectedCategoryFilter === categoryId) setSelectedCategoryFilter(0);
    if (form.categoryId === categoryId) setForm((prev) => ({ ...prev, categoryId: 0 }));
    if (form.categoryId === categoryId)
        {
              const firstCategoryId = categories.filter(c => c.id !== categoryId)[0]?.id ?? 0;
              setForm(prev => ({ ...prev, categoryId: firstCategoryId }));
       }
    await reloadAll();
  };

  const saveGoal = async (): Promise<void> => {
    if (!hasMeaningfulText(form.title)) {
      setError('عنوان الزامی است.');
      return;
    }
    if (!form.categoryId) {
      setError('ابتدا یک دسته‌بندی بسازید.');
      return;
    }

    if (editingGoal) {
      await goalsRepository.update({ ...editingGoal, title: form.title, description: form.description, categoryId: safeCategoryId });
    } else {
      await goalsRepository.create({ title: form.title, description: form.description, categoryId: safeCategoryId, createdAt: nowIso() });
    }

    await goalsQuery.reload();
    resetForm();
    setIsGoalModalOpen(false);
  };

  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategoryId = Number(event.target.value);
    setForm(prev => ({ ...prev, categoryId: newCategoryId }));
  };

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = event.target.value;
    setForm(prev => ({ ...prev, title: newTitle }));
    if (error && newTitle.trim()) {
      setError('');
    }
  };

  return (
    <main className="grid-gap">
      <PageHeader title="اهداف" subtitle="مدیریت کامل دسته‌ها و اهداف با جستجو" />

      <div className="row-between">
        <SearchBar value={search} onChange={setSearch} placeholder="جستجو در اهداف..." />
        <div className="toolbar">
          <Button onClick={() => { resetForm(); setIsGoalModalOpen(true); }}>افزودن هدف</Button>
          <Button onClick={() => setIsCategoryModalOpen(true)} variant="secondary">مدیریت دسته‌ها</Button>
        </div>
      </div>

      <CategoryChips categories={categories} onSelect={setSelectedCategoryFilter} selectedCategoryId={selectedCategoryFilter} />

      <Card title="لیست اهداف" subtitle="جستجو، ویرایش، حذف">
        <div className="list">
          {filteredGoals.map((goal) => (
            <article className="list-item" key={goal.id}>
              <button className="board-button" onClick={() => { setSelectedGoal(goal); setIsDetailsModalOpen(true); }} type="button">
                <div className="row-between">
                  <strong className="title-text">{goal.title}</strong>
                  <span className="badge title-badge">{categoryTitleById.get(goal.categoryId) ?? 'بدون دسته'}</span>
                </div>
              </button>
              <div className="toolbar">
                <Button
                  onClick={() => {
                    setEditingGoal(goal);
                    setForm({ title: goal.title, description: goal.description, categoryId: goal.categoryId });
                    setError('');
                    setIsGoalModalOpen(true);
                  }}
                  variant="secondary"
                >
                  ویرایش
                </Button>
                <Button variant="danger" onClick={() => void goalsRepository.remove(goal.id).then(goalsQuery.reload)}>حذف</Button>
              </div>
            </article>
          ))}
          {!goalsQuery.loading && filteredGoals.length === 0 ? <EmptyState text="هدفی یافت نشد." /> : null}
        </div>
      </Card>

      <Modal open={isGoalModalOpen} title={editingGoal ? 'ویرایش هدف' : 'هدف جدید'} onClose={() => { setIsGoalModalOpen(false); resetForm(); }} footer={<><Button onClick={() => void saveGoal()}>{editingGoal ? 'ذخیره تغییرات' : 'ایجاد هدف'}</Button><Button onClick={() => { resetForm(); setIsGoalModalOpen(false); }} variant="secondary">انصراف</Button></>}>
        <SelectField label="دسته" value={form.categoryId} onChange={handleCategoryChange} options={categoryOptions.length ? categoryOptions : [{ value: 0, label: 'ابتدا دسته بسازید' }]} />
        <TextField label="عنوان" value={form.title} onChange={handleTitleChange} />
        <RichTextField label="توضیحات" value={form.description} onChange={(value) => setForm((prev) => ({ ...prev, description: value }))} />
        {error ? <p style={{ margin: 0, color: 'var(--color-danger)' }}>{error}</p> : null}
      </Modal>

      <Modal open={isCategoryModalOpen} title="مدیریت دسته‌های هدف" onClose={() => { setIsCategoryModalOpen(false); setCategoryTitle(''); setCategoryError(''); }} footer={<><Button type="button" onClick={() => void addCategory()}>افزودن دسته</Button><Button type="button" onClick={() => { setIsCategoryModalOpen(false); setCategoryTitle(''); setCategoryError(''); }} variant="secondary">بستن</Button></>}>
        <TextField label="نام دسته جدید" value={categoryTitle} onChange={(event) => { setCategoryTitle(event.target.value); if (categoryError) setCategoryError(''); }} />
        {categoryError ? <p style={{ margin: 0, color: 'var(--color-danger)' }}>{categoryError}</p> : null}
        <div className="list">
          {categories.map((category) => (
            <div className="list-item row-between" key={category.id}>
              <span className="title-text">{category.title}</span>
              <Button type="button" variant="danger" onClick={() => void removeCategory(category.id)}>حذف</Button>
            </div>
          ))}
          {!categoriesQuery.loading && categories.length === 0 ? <EmptyState text="هنوز دسته‌ای ثبت نشده است." /> : null}
        </div>
      </Modal>

      <Modal open={isDetailsModalOpen} title={selectedGoal?.title ?? 'جزئیات هدف'} onClose={() => { setIsDetailsModalOpen(false); setSelectedGoal(null); }}>
        <p className="detail-category">{selectedGoal ? categoryTitleById.get(selectedGoal.categoryId) ?? 'بدون دسته' : ''}</p>
        <div className="detail-content" dangerouslySetInnerHTML={{ __html: selectedGoal?.description || '<p>بدون توضیح</p>' }} />
      </Modal>
    </main>
  );
}
