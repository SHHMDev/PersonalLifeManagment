import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { recurringRepository } from '@/db/repositories/recurringRepository';
import { useAsyncData, useFloatingAction } from '@/hooks';
import { scheduleRecurringReminder } from '@/notifications';
import { FrequencyType, RecurringTask } from '@/types';
import { getNextDueAt, hasMeaningfulText, nowIso } from '@/utils';

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

const emptyForm: RecurringForm = { title: '', description: '', categoryId: 0, frequencyType: 'daily', timeOfDay: '08:00', notificationsEnabled: true };

export function RecurringTasksPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [categoryTitle, setCategoryTitle] = useState('');
  const [editingItem, setEditingItem] = useState<RecurringTask | null>(null);
  const [selectedItem, setSelectedItem] = useState<RecurringTask | null>(null);
  const [form, setForm] = useState<RecurringForm>(emptyForm);
  const [error, setError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(0);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const categoriesQuery = useAsyncData(() => listCategories('recurring_task_categories'), []);
  const recurringQuery = useAsyncData(() => recurringRepository.list(search), [search]);

  const categories = categoriesQuery.data ?? [];
  const items = recurringQuery.data ?? [];

  // اصلاح: وقتی دسته‌ها لود می‌شن و دسته فعلی نامعتبره، مقدار پیش‌فرض رو set کن
  useEffect(() => {
    if (categories.length > 0 && form.categoryId === 0) {
      setForm(prev => ({ ...prev, categoryId: categories[0].id }));
    }
  }, [categories, form.categoryId]);

  // اصلاح: فقط برای نمایش استفاده بشه
  const safeCategoryId = form.categoryId !== 0 && categories.some(c => c.id === form.categoryId)
    ? form.categoryId
    : categories[0]?.id ?? 0;

  const categoryOptions = useMemo(() => categories.map((category) => ({ label: category.title, value: category.id })), [categories]);
  const categoryTitleById = useMemo(() => new Map(categories.map((category) => [category.id, category.title])), [categories]);
  const frequencyLabelByValue = useMemo(() => new Map(frequencyOptions.map((option) => [option.value, option.label])), []);
  const filteredItems = useMemo(() => items.filter((item) => (selectedCategoryFilter ? item.categoryId === selectedCategoryFilter : true)), [items, selectedCategoryFilter]);

  const resetForm = useCallback((): void => {
    setEditingItem(null);
    const defaultCategoryId = categories[0]?.id ?? 0;
    setForm({ ...emptyForm, categoryId: defaultCategoryId });
    setError('');
  }, [categories]);

  useFloatingAction('/recurring', useCallback(() => { resetForm(); setIsItemModalOpen(true); }, [resetForm]));

  const reloadAll = async (): Promise<void> => {
    await categoriesQuery.reload();
    await recurringQuery.reload();
  };

  const addCategory = async (): Promise<void> => {
    // if (!hasMeaningfulText(categoryTitle)) {
    //   setCategoryError('نام دسته الزامی است.');
    //   return;
    // }

    await createCategory('recurring_task_categories', categoryTitle);
    setCategoryTitle('');
    setCategoryError('');
    await reloadAll();
  };

  const removeCategory = async (categoryId: number): Promise<void> => {
    await deleteCategory('recurring_task_categories', categoryId);
    if (selectedCategoryFilter === categoryId) setSelectedCategoryFilter(0);
    if (form.categoryId === categoryId) {
      const firstCategoryId = categories.filter(c => c.id !== categoryId)[0]?.id ?? 0;
      setForm((prev) => ({ ...prev, categoryId: firstCategoryId }));
    }
    await reloadAll();
  };

  // اصلاح: هندلر تغییر دسته
  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategoryId = Number(event.target.value);
    setForm(prev => ({ ...prev, categoryId: newCategoryId }));
    if (error) setError('');
  };

  // اصلاح: هندلر تغییر عنوان
  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = event.target.value;
    setForm(prev => ({ ...prev, title: newTitle }));
    if (error && newTitle.trim()) {
      setError('');
    }
  };

  // اصلاح: هندلر تغییر ساعت
  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, timeOfDay: event.target.value }));
  };

  // اصلاح: هندلر تغییر نوع تکرار
  const handleFrequencyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, frequencyType: event.target.value as FrequencyType }));
  };

  // اصلاح: هندلر تغییر وضعیت اعلان
  const handleNotificationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, notificationsEnabled: event.target.checked }));
  };

  const scheduleForItem = async (item: RecurringTask): Promise<void> => {
    if (!item.notificationsEnabled) return;
    const [hour, minute] = item.timeOfDay.split(':').map((value) => Number(value));
    const scheduleDate = new Date(item.nextDueAt);
    scheduleDate.setHours(hour, minute, 0, 0);
    await scheduleRecurringReminder(item.id, `یادآوری: ${item.title}`, 'زمان انجام وظیفه تکرارشونده رسیده است.', scheduleDate);
  };

  const saveItem = async (): Promise<void> => {
    // اصلاح: استفاده مستقیم از form.categoryId
    // if (!hasMeaningfulText(form.title)) {
    //   setError('عنوان الزامی است.');
    //   return;
    // }
    if (!form.categoryId) {
      setError('لطفاً یک دسته‌بندی انتخاب کنید.');
      return;
    }

    try {
      const nextDueAt = getNextDueAt(form.frequencyType);

      if (editingItem) {
        const updatedItem: RecurringTask = { 
          ...editingItem, 
          categoryId: form.categoryId,  // اصلاح: استفاده از form.categoryId
          title: form.title.trim(),
          description: form.description, 
          frequencyType: form.frequencyType, 
          timeOfDay: form.timeOfDay, 
          nextDueAt, 
          notificationsEnabled: form.notificationsEnabled ? 1 : 0 
        };
        await recurringRepository.update(updatedItem);
        await scheduleForItem(updatedItem);
      } else {
        await recurringRepository.create({ 
          categoryId: form.categoryId,  // اصلاح: استفاده از form.categoryId
          title: form.title,
          description: form.description, 
          frequencyType: form.frequencyType, 
          timeOfDay: form.timeOfDay, 
          nextDueAt, 
          notificationsEnabled: form.notificationsEnabled ? 1 : 0 
        });
        const reloaded = await recurringRepository.list(search);
        const createdItem = reloaded.find((item) => item.title === form.title && item.nextDueAt === nextDueAt) ?? reloaded[0];
        if (createdItem) await scheduleForItem(createdItem);
      }

      await recurringQuery.reload();
      resetForm();
      setIsItemModalOpen(false);
    } catch (err) {
      setError('خطا در ذخیره‌سازی: ' + (err as Error).message);
    }
  };

  const markCompletedNow = async (item: RecurringTask): Promise<void> => {
    const updatedItem: RecurringTask = { ...item, lastCompletedAt: nowIso(), nextDueAt: getNextDueAt(item.frequencyType) };
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
          <Button onClick={() => { resetForm(); setIsItemModalOpen(true); }}>افزودن آیتم</Button>
          <Button onClick={() => setIsCategoryModalOpen(true)} variant="secondary">مدیریت دسته‌ها</Button>
        </div>
      </div>

      <CategoryChips categories={categories} onSelect={setSelectedCategoryFilter} selectedCategoryId={selectedCategoryFilter} />

      <Card title="لیست وظایف تکرارشونده" subtitle="به‌روزرسانی زمان بعدی و مدیریت اعلان">
        <div className="list">
          {filteredItems.map((item) => (
            <div className="list-item" key={item.id}>
              <button className="board-button" onClick={() => { setSelectedItem(item); setIsDetailsModalOpen(true); }} type="button">
                <div className="row-between">
                  <strong className="title-text">{item.title}</strong>
                  <span className="badge title-badge">{frequencyLabelByValue.get(item.frequencyType) ?? item.frequencyType}</span>
                </div>
                <div className="row-between">
                  <span className="depth-tag title-text">{categoryTitleById.get(item.categoryId) ?? 'بدون دسته'}</span>
                  <span className="depth-tag">موعد بعدی: {new Date(item.nextDueAt).toLocaleString('fa-IR')}</span>
                </div>
              </button>
              <div className="toolbar">
                <Button onClick={() => { 
                  setEditingItem(item); 
                  setForm({ 
                    title: item.title, 
                    description: item.description || '', 
                    categoryId: item.categoryId, 
                    frequencyType: item.frequencyType, 
                    timeOfDay: item.timeOfDay, 
                    notificationsEnabled: Boolean(item.notificationsEnabled) 
                  }); 
                  setError(''); 
                  setIsItemModalOpen(true); 
                }} variant="secondary">ویرایش</Button>
                <Button variant="secondary" onClick={() => void markCompletedNow(item)}>ثبت انجام امروز</Button>
                <Button variant="danger" onClick={() => void recurringRepository.remove(item.id).then(recurringQuery.reload)}>حذف</Button>
              </div>
            </div>
          ))}
          {!recurringQuery.loading && filteredItems.length === 0 ? <EmptyState text="آیتمی یافت نشد." /> : null}
        </div>
      </Card>

      <Modal 
        open={isItemModalOpen} 
        title={editingItem ? 'ویرایش وظیفه تکرارشونده' : 'وظیفه تکرارشونده جدید'} 
        onClose={() => { setIsItemModalOpen(false); resetForm(); }} 
        footer={
          <>
            <Button onClick={() => void saveItem()}>{editingItem ? 'ذخیره تغییرات' : 'ایجاد آیتم'}</Button>
            <Button onClick={() => { setIsItemModalOpen(false); resetForm(); }} variant="secondary">انصراف</Button>
          </>
        }
      >
        <SelectField 
          label="دسته" 
          value={form.categoryId}  // اصلاح: استفاده از form.categoryId
          onChange={handleCategoryChange}  // اصلاح: استفاده از هندلر اختصاصی
          options={categoryOptions.length ? categoryOptions : [{ value: 0, label: 'ابتدا دسته بسازید' }]} 
        />
        <TextField 
          label="عنوان" 
          value={form.title} 
          onChange={handleTitleChange}  // اصلاح: استفاده از هندلر اختصاصی
        />
        <RichTextField 
          label="توضیحات" 
          value={form.description} 
          onChange={(value) => setForm((prev) => ({ ...prev, description: value }))} 
        />
        <SelectField 
          label="نوع تکرار" 
          value={form.frequencyType} 
          onChange={handleFrequencyChange}  // اصلاح: استفاده از هندلر اختصاصی
          options={frequencyOptions} 
        />
        <TextField 
          label="ساعت" 
          type="time" 
          value={form.timeOfDay} 
          onChange={handleTimeChange}  // اصلاح: استفاده از هندلر اختصاصی
        />
        <label className="row" style={{ alignItems: 'center' }}>
          <input 
            style={{ width: 'auto' }} 
            type="checkbox" 
            checked={form.notificationsEnabled} 
            onChange={handleNotificationChange}  // اصلاح: استفاده از هندلر اختصاصی
          />
          اعلان فعال باشد
        </label>
        {error ? <p style={{ margin: 0, color: 'var(--color-danger)' }}>{error}</p> : null}
      </Modal>

      <Modal 
        open={isCategoryModalOpen} 
        title="مدیریت دسته‌های تکرارشونده" 
        onClose={() => { setIsCategoryModalOpen(false); setCategoryTitle(''); setCategoryError(''); }} 
        footer={
          <>
            <Button type="button" onClick={() => void addCategory()}>افزودن دسته</Button>
            <Button type="button" onClick={() => { setIsCategoryModalOpen(false); setCategoryTitle(''); setCategoryError(''); }} variant="secondary">بستن</Button>
          </>
        }
      >
        <TextField 
          label="نام دسته جدید" 
          value={categoryTitle} 
          onChange={(event) => { setCategoryTitle(event.target.value); if (categoryError) setCategoryError(''); }} 
        />
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

      <Modal 
        open={isDetailsModalOpen} 
        title={selectedItem?.title ?? 'جزئیات آیتم'} 
        onClose={() => { setIsDetailsModalOpen(false); setSelectedItem(null); }}
      >
        <p className="detail-category">{selectedItem ? categoryTitleById.get(selectedItem.categoryId) ?? 'بدون دسته' : ''}</p>
        <div className="detail-content" dangerouslySetInnerHTML={{ __html: selectedItem?.description || '<p>بدون توضیح</p>' }} />
      </Modal>
    </main>
  );
}