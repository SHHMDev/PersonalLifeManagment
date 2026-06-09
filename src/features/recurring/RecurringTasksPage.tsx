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
import { recurringRepository } from '@/db/repositories/recurringRepository';
import { useAsyncData } from '@/hooks';
import { scheduleRecurringReminder } from '@/notifications';
import { FrequencyType, RecurringTask } from '@/types';
import { getNextDueAt, isValidPersianText, nowIso } from '@/utils';

const frequencyOptions: Array<{ value: FrequencyType; label: string }> = [
  { value: 'daily', label: 'روزانه' },
  { value: 'weekly', label: 'هفتگی' },
  { value: 'biweekly', label: 'دو‌هفته‌ای' },
  { value: 'monthly', label: 'ماهانه' }
];

export function RecurringTasksPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [categoryTitle, setCategoryTitle] = useState('');
  const [editingItem, setEditingItem] = useState<RecurringTask | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(0);
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('daily');
  const [timeOfDay, setTimeOfDay] = useState('08:00');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const categoriesQuery = useAsyncData(() => listCategories('recurring_task_categories'), []);
  const recurringQuery = useAsyncData(() => recurringRepository.list(search), [search]);

  const categoryOptions = useMemo(
    () =>
      (categoriesQuery.data ?? []).map((category) => ({
        label: category.title,
        value: category.id
      })),
    [categoriesQuery.data]
  );

  const addCategory = async (): Promise<void> => {
    if (!isValidPersianText(categoryTitle)) return;
    await createCategory('recurring_task_categories', categoryTitle);
    setCategoryTitle('');
    await categoriesQuery.reload();
  };

  const resetForm = (): void => {
    setEditingItem(null);
    setTitle('');
    setDescription('');
    setCategoryId(categoriesQuery.data?.[0]?.id ?? 0);
    setFrequencyType('daily');
    setTimeOfDay('08:00');
    setNotificationsEnabled(true);
  };

  const saveItem = async (): Promise<void> => {
    if (!isValidPersianText(title) || !categoryId) return;

    const nextDueAt = getNextDueAt(frequencyType);

    if (editingItem) {
      await recurringRepository.update({
        ...editingItem,
        categoryId,
        title,
        description,
        frequencyType,
        timeOfDay,
        nextDueAt,
        notificationsEnabled: notificationsEnabled ? 1 : 0
      });
    } else {
      await recurringRepository.create({
        categoryId,
        title,
        description,
        frequencyType,
        timeOfDay,
        nextDueAt,
        notificationsEnabled: notificationsEnabled ? 1 : 0
      });
    }

    const reloaded = await recurringRepository.list(search);
    const current = reloaded[0];

    if (current && notificationsEnabled) {
      const [hour, minute] = timeOfDay.split(':').map((value) => Number(value));
      const scheduleDate = new Date();
      scheduleDate.setHours(hour, minute, 0, 0);
      if (scheduleDate.getTime() < Date.now()) {
        scheduleDate.setDate(scheduleDate.getDate() + 1);
      }
      await scheduleRecurringReminder(current.id, `یادآوری: ${current.title}`, 'زمان انجام وظیفه تکرارشونده رسیده است.', scheduleDate);
    }

    resetForm();
    await recurringQuery.reload();
  };

  const markCompletedNow = async (item: RecurringTask): Promise<void> => {
    await recurringRepository.update({
      ...item,
      lastCompletedAt: nowIso(),
      nextDueAt: getNextDueAt(item.frequencyType)
    });
    await recurringQuery.reload();
  };

  return (
    <main className="grid-gap">
      <PageHeader title="وظایف تکرارشونده" subtitle="زمان‌بندی، دسته پویا و اعلان محلی" />

      <Card title="دسته‌بندی" subtitle="تعریف توسط کاربر">
        <div className="row">
          <input value={categoryTitle} onChange={(event) => setCategoryTitle(event.target.value)} placeholder="نام دسته جدید" />
          <Button onClick={addCategory}>افزودن دسته</Button>
        </div>
        <div className="list" style={{ marginTop: 10 }}>
          {(categoriesQuery.data ?? []).map((category) => (
            <div className="list-item row-between" key={category.id}>
              <span>{category.title}</span>
              <Button
                variant="danger"
                onClick={() => void deleteCategory('recurring_task_categories', category.id).then(categoriesQuery.reload)}
              >
                حذف
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card title={editingItem ? 'ویرایش وظیفه تکرارشونده' : 'وظیفه تکرارشونده جدید'} subtitle="تنظیم چرخه و ساعت اجرا">
        <div className="grid-gap">
          <SelectField
            label="دسته"
            value={categoryId}
            onChange={(event) => setCategoryId(Number(event.target.value))}
            options={categoryOptions.length ? categoryOptions : [{ value: 0, label: 'ابتدا دسته بسازید' }]}
          />
          <TextField label="عنوان" value={title} onChange={(event) => setTitle(event.target.value)} />
          <TextAreaField label="توضیحات" value={description} onChange={(event) => setDescription(event.target.value)} />
          <SelectField
            label="نوع تکرار"
            value={frequencyType}
            onChange={(event) => setFrequencyType(event.target.value as FrequencyType)}
            options={frequencyOptions}
          />
          <TextField label="ساعت" type="time" value={timeOfDay} onChange={(event) => setTimeOfDay(event.target.value)} />
          <label className="row" style={{ alignItems: 'center' }}>
            <input
              style={{ width: 'auto' }}
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(event) => setNotificationsEnabled(event.target.checked)}
            />
            اعلان فعال باشد
          </label>
          <div className="toolbar">
            <Button onClick={() => void saveItem()}>{editingItem ? 'ذخیره تغییرات' : 'ایجاد آیتم'}</Button>
            <Button variant="secondary" onClick={resetForm}>
              پاک‌سازی
            </Button>
          </div>
        </div>
      </Card>

      <Card title="لیست وظایف تکرارشونده" subtitle="به‌روزرسانی زمان بعدی و مدیریت اعلان">
        <SearchBar value={search} onChange={setSearch} placeholder="جستجو..." />
        <div className="list" style={{ marginTop: 10 }}>
          {(recurringQuery.data ?? []).map((item) => (
            <div className="list-item" key={item.id}>
              <div className="row-between">
                <strong>{item.title}</strong>
                <span className="badge">{item.frequencyType}</span>
              </div>
              <p>{item.description || 'بدون توضیح'}</p>
              <p style={{ margin: '6px 0' }}>موعد بعدی: {new Date(item.nextDueAt).toLocaleString('fa-IR')}</p>
              <div className="toolbar">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingItem(item);
                    setTitle(item.title);
                    setDescription(item.description);
                    setCategoryId(item.categoryId);
                    setFrequencyType(item.frequencyType);
                    setTimeOfDay(item.timeOfDay);
                    setNotificationsEnabled(Boolean(item.notificationsEnabled));
                  }}
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
          {!recurringQuery.loading && (recurringQuery.data ?? []).length === 0 ? <EmptyState text="آیتمی یافت نشد." /> : null}
        </div>
      </Card>
    </main>
  );
}
