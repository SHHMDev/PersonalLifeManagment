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
import { recurringRepository } from '@/db/repositories/recurringRepository';
import { useAsyncData, useFloatingAction } from '@/hooks';
import { scheduleRecurringReminder } from '@/notifications';
import { FrequencyType, RecurringTask } from '@/types';
import { getNextDueAt, normalizePersianText, nowIso } from '@/utils';

const frequencyOptions: Array<{ value: FrequencyType; label: string }> = [
  { value: 'daily', label: 'روزانه' },
  { value: 'weekly', label: 'هفتگی' },
  { value: 'biweekly', label: 'دو‌هفته‌ای' },
  { value: 'monthly', label: 'ماهانه' }
];

type RecurringForm = {
  title: string;
  description: string;
  categoryId: number;
  frequencyType: FrequencyType;
  timeOfDay: string;
  notificationsEnabled: boolean;
};

const emptyForm: RecurringForm = {
  title: '',
  description: '',
  categoryId: 0,
  frequencyType: 'daily',
  timeOfDay: '08:00',
  notificationsEnabled: true
};

export function RecurringTasksPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [categoryTitle, setCategoryTitle] = useState('');
  const [editingItem, setEditingItem] = useState<RecurringTask | null>(null);
  const [form, setForm] = useState<RecurringForm>(emptyForm);
  const [error, setError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(0);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const categoriesQuery = useAsyncData(() => listCategories('recurring_task_categories'), []);
  const recurringQuery = useAsyncData(() => recurringRepository.list(search), [search]);

  const categories = categoriesQuery.data ?? [];
  const items = recurringQuery.data ?? [];
  const safeCategoryId = categories.some((category) => category.id === form.categoryId) ? form.categoryId : categories[0]?.id ?? 0;

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        label: category.title,
        value: category.id
      })),
    [categories]
  );

  const categoryTitleById = useMemo(() => new Map(categories.map((category) => [category.id, category.title])), [categories]);
  const frequencyLabelByValue = useMemo(() => new Map(frequencyOptions.map((option) => [option.value, option.label])), []);

  const filteredItems = useMemo(
    () => items.filter((item) => (selectedCategoryFilter ? item.categoryId === selectedCategoryFilter : true)),
    [items, selectedCategoryFilter]
  );

  const resetForm = useCallback((): void => {
    setEditingItem(null);
    setForm({ ...emptyForm, categoryId: categories[0]?.id ?? 0 });
    setError('');
  }, [categories]);

  useFloatingAction(
    '/recurring',
    useCallback(() => {
      resetForm();
      setIsItemModalOpen(true);
    }, [resetForm])
  );

  const reloadAll = async (): Promise<void> => {
    await categoriesQuery.reload();
    await recurringQuery.reload();
  };

  const addCategory = async (): Promise<void> => {
    const normalizedTitle = normalizePersianText(categoryTitle);
    if (!normalizedTitle) {
      setCategoryError('نام دسته الزامی است.');
      return;
    }

    await createCategory('recurring_task_categories', normalizedTitle);
    setCategoryTitle('');
    setCategoryError('');
    await reloadAll();
  };

  const removeCategory = async (categoryId: number): Promise<void> => {
    await deleteCategory('recurring_task_categories', categoryId);
    if (selectedCategoryFilter === categoryId) {
      setSelectedCategoryFilter(0);
    }
    if (form.categoryId === categoryId) {
      setForm((prev) => ({ ...prev, categoryId: 0 }));
    }
    await reloadAll();
  };

  const scheduleForItem = async (item: RecurringTask): Promise<void> => {
    if (!item.notificationsEnabled) return;

    const [hour, minute] = item.timeOfDay.split(':').map((value) => Number(value));
    const scheduleDate = new Date(item.nextDueAt);
    scheduleDate.setHours(hour, minute, 0, 0);
    await scheduleRecurringReminder(item.id, `یادآوری: ${item.title}`, 'زمان انجام وظیفه تکرارشونده رسیده است.', scheduleDate);
  };

  const saveItem = async (): Promise<void> => {
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

    const nextDueAt = getNextDueAt(form.frequencyType);

    if (editingItem) {
      const updatedItem: RecurringTask = {
        ...editingItem,
        categoryId: nextCategoryId,
        title: normalizedTitle,
        description: normalizedDescription,
        frequencyType: form.frequencyType,
        timeOfDay: form.timeOfDay,
        nextDueAt,
        notificationsEnabled: form.notificationsEnabled ? 1 : 0
      };
      await recurringRepository.update(updatedItem);
      await scheduleForItem(updatedItem);
    } else {
      await recurringRepository.create({
        categoryId: nextCategoryId,
        title: normalizedTitle,
        description: normalizedDescription,
        frequencyType: form.frequencyType,
        timeOfDay: form.timeOfDay,
        nextDueAt,
        notificationsEnabled: form.notificationsEnabled ? 1 : 0
      });
      const reloaded = await recurringRepository.list(search);
      const createdItem = reloaded.find((item) => item.title === normalizedTitle && item.nextDueAt === nextDueAt) ?? reloaded[0];
      if (createdItem) {
        await scheduleForItem(createdItem);
      }
    }

    await recurringQuery.reload();
    resetForm();
    setIsItemModalOpen(false);
  };

  const markCompletedNow = async (item: RecurringTask): Promise<void> => {
    const updatedItem: RecurringTask = {
      ...item,
      lastCompletedAt: nowIso(),
      nextDueAt: getNextDueAt(item.frequencyType)
    };
    await recurringRepository.update(updatedItem);
    await scheduleForItem(updatedItem);
    await recurringQuery.reload();
  };

  return (
    <main className="grid-gap">
      <PageHeader title="وظایف تکرارشونده" subtitle="زمان‌بندی، دسته پویا و اعلان محلی" />

      <div className="row-between">
        <SearchBar value={search} onChange={setSearch} placeholder="جستجو..." />
        <div className="toolbar">
          <Button
            onClick={() => {
              resetForm();
              setIsItemModalOpen(true);
            }}
          >
            افزودن آیتم
          </Button>
          <Button onClick={() => setIsCategoryModalOpen(true)} variant="secondary">
            مدیریت دسته‌ها
          </Button>
        </div>
      </div>

      <CategoryChips categories={categories} onSelect={setSelectedCategoryFilter} selectedCategoryId={selectedCategoryFilter} />

      <Card title="لیست وظایف تکرارشونده" subtitle="به‌روزرسانی زمان بعدی و مدیریت اعلان">
        <div className="list">
          {filteredItems.map((item) => (
            <div className="list-item" key={item.id}>
              <div className="row-between">
                <strong>{item.title}</strong>
                <span className="badge">{frequencyLabelByValue.get(item.frequencyType) ?? item.frequencyType}</span>
              </div>
              <p className="content-preview">{item.description || 'بدون توضیح'}</p>
              <div className="row-between">
                <span className="depth-tag">{categoryTitleById.get(item.categoryId) ?? 'بدون دسته'}</span>
                <span className="depth-tag">موعد بعدی: {new Date(item.nextDueAt).toLocaleString('fa-IR')}</span>
              </div>
              <div className="toolbar">
                <Button
                  onClick={() => {
                    setEditingItem(item);
                    setForm({
                      title: item.title,
                      description: item.description,
                      categoryId: item.categoryId,
                      frequencyType: item.frequencyType,
                      timeOfDay: item.timeOfDay,
                      notificationsEnabled: Boolean(item.notificationsEnabled)
                    });
                    setError('');
                    setIsItemModalOpen(true);
                  }}
                  variant="secondary"
                >
                  ویرایش
                </Button>
                <Button variant="secondary" onClick={() => void markCompletedNow(item)}>
                  ثبت انجام امروز
                </Button>
                <Button variant="danger" onClick={() => void recurringRepository.remove(item.id).then(recurringQuery.reload)}>
                  حذف
                </Button>
              </div>
            </div>
          ))}
          {!recurringQuery.loading && filteredItems.length === 0 ? <EmptyState text="آیتمی یافت نشد." /> : null}
        </div>
      </Card>

      <Modal
        open={isItemModalOpen}
        title={editingItem ? 'ویرایش وظیفه تکرارشونده' : 'وظیفه تکرارشونده جدید'}
        onClose={() => {
          setIsItemModalOpen(false);
          resetForm();
        }}
        footer={
          <>
            <Button onClick={() => void saveItem()}>{editingItem ? 'ذخیره تغییرات' : 'ایجاد آیتم'}</Button>
            <Button
              onClick={() => {
                setIsItemModalOpen(false);
                resetForm();
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
        <SelectField
          label="نوع تکرار"
          value={form.frequencyType}
          onChange={(event) => setForm((prev) => ({ ...prev, frequencyType: event.target.value as FrequencyType }))}
          options={frequencyOptions}
        />
        <TextField
          label="ساعت"
          type="time"
          value={form.timeOfDay}
          onChange={(event) => setForm((prev) => ({ ...prev, timeOfDay: event.target.value }))}
        />
        <label className="row" style={{ alignItems: 'center' }}>
          <input
            style={{ width: 'auto' }}
            type="checkbox"
            checked={form.notificationsEnabled}
            onChange={(event) => setForm((prev) => ({ ...prev, notificationsEnabled: event.target.checked }))}
          />
          اعلان فعال باشد
        </label>
        {error ? <p style={{ margin: 0, color: 'var(--color-danger)' }}>{error}</p> : null}
      </Modal>

      <Modal
        open={isCategoryModalOpen}
        title="مدیریت دسته‌های تکرارشونده"
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
        </div>
      </Modal>
    </main>
  );
}
