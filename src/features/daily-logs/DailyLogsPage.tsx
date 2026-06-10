import { useCallback, useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { RichTextField } from '@/components/RichTextField';
import { SearchBar } from '@/components/SearchBar';
import { TextField } from '@/components/TextField';
import { dailyLogsRepository } from '@/db/repositories/dailyLogsRepository';
import { useAsyncData, useFloatingAction } from '@/hooks';
import { DailyLog } from '@/types';
import { hasMeaningfulText, normalizePersianText, nowIso } from '@/utils';

export function DailyLogsPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);
  const [title, setTitle] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const logsQuery = useAsyncData(() => dailyLogsRepository.list(search), [search]);
  const logs = logsQuery.data ?? [];

  const resetForm = useCallback((): void => {
    setEditingLog(null);
    setTitle('');
    setLogDate(new Date().toISOString().slice(0, 10));
    setContent('');
    setError('');
  }, []);

  useFloatingAction('/daily-logs', useCallback(() => { resetForm(); setIsLogModalOpen(true); }, [resetForm]));

  const saveLog = async (): Promise<void> => {
    if (!hasMeaningfulText(title)) {
      setError('عنوان الزامی است.');
      return;
    }

    const normalizedTitle = normalizePersianText(title);
    const normalizedContent = normalizePersianText(content);

    if (editingLog) {
      await dailyLogsRepository.update({ ...editingLog, title: normalizedTitle, logDate, content: normalizedContent });
    } else {
      await dailyLogsRepository.create({ title: normalizedTitle, logDate, content: normalizedContent, createdAt: nowIso() });
    }

    await logsQuery.reload();
    resetForm();
    setIsLogModalOpen(false);
  };

  return (
    <main className="grid-gap">
      <PageHeader title="گزارش روزانه" subtitle="ثبت، ویرایش و نگهداری گزارش با ویرایشگر سبک" />

      <div className="row-between">
        <SearchBar value={search} onChange={setSearch} placeholder="جستجو در گزارش‌ها..." />
        <Button onClick={() => { resetForm(); setIsLogModalOpen(true); }}>افزودن گزارش</Button>
      </div>

      <Card title="آرشیو گزارش‌ها" subtitle="جستجو، ویرایش و حذف">
        <div className="list">
          {logs.map((log) => (
            <div className="list-item" key={log.id}>
              <button className="board-button" onClick={() => { setSelectedLog(log); setIsDetailsModalOpen(true); }} type="button">
                <div className="row-between">
                  <strong className="title-text">{log.title}</strong>
                  <span className="badge">{new Date(log.logDate).toLocaleDateString('fa-IR')}</span>
                </div>
              </button>
              <div className="toolbar">
                <Button onClick={() => { setEditingLog(log); setTitle(log.title); setLogDate(log.logDate); setContent(log.content); setError(''); setIsLogModalOpen(true); }} variant="secondary">ویرایش</Button>
                <Button variant="danger" onClick={() => void dailyLogsRepository.remove(log.id).then(logsQuery.reload)}>حذف</Button>
              </div>
            </div>
          ))}
          {!logsQuery.loading && logs.length === 0 ? <EmptyState text="گزارشی ثبت نشده است." /> : null}
        </div>
      </Card>

      <Modal open={isLogModalOpen} title={editingLog ? 'ویرایش گزارش' : 'گزارش جدید'} onClose={() => { setIsLogModalOpen(false); resetForm(); }} footer={<><Button onClick={() => void saveLog()}>{editingLog ? 'ذخیره تغییرات' : 'ثبت گزارش'}</Button><Button onClick={() => { setIsLogModalOpen(false); resetForm(); }} variant="secondary">انصراف</Button></>}>
        <TextField label="عنوان" value={title} onChange={(event) => setTitle(event.target.value)} />
        <TextField label="تاریخ" type="date" value={logDate} onChange={(event) => setLogDate(event.target.value)} />
        <RichTextField label="متن گزارش" value={content} onChange={setContent} />
        {error ? <p style={{ margin: 0, color: 'var(--color-danger)' }}>{error}</p> : null}
      </Modal>

      <Modal open={isDetailsModalOpen} title={selectedLog?.title ?? 'جزئیات گزارش'} onClose={() => { setIsDetailsModalOpen(false); setSelectedLog(null); }}>
        <p className="detail-category">{selectedLog ? new Date(selectedLog.logDate).toLocaleDateString('fa-IR') : ''}</p>
        <div className="detail-content" dangerouslySetInnerHTML={{ __html: selectedLog?.content || '<p>بدون محتوا</p>' }} />
      </Modal>
    </main>
  );
}
