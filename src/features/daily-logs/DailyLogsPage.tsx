import { useCallback, useMemo, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { SearchBar } from '@/components/SearchBar';
import { TextField } from '@/components/TextField';
import { dailyLogsRepository } from '@/db/repositories/dailyLogsRepository';
import { useAsyncData, useFloatingAction } from '@/hooks';
import { DailyLog } from '@/types';
import { normalizePersianText, nowIso, stripHtml } from '@/utils';

const modules = {
  toolbar: [['bold', 'italic'], [{ list: 'bullet' }, { list: 'ordered' }], ['clean']]
};

const formats = ['bold', 'italic', 'list', 'bullet'];

export function DailyLogsPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
  const [title, setTitle] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const logsQuery = useAsyncData(() => dailyLogsRepository.list(search), [search]);
  const logs = logsQuery.data ?? [];

  const resetForm = useCallback((): void => {
    setEditingLog(null);
    setTitle('');
    setLogDate(new Date().toISOString().slice(0, 10));
    setContent('');
    setError('');
  }, []);

  useFloatingAction(
    '/daily-logs',
    useCallback(() => {
      resetForm();
      setIsLogModalOpen(true);
    }, [resetForm])
  );

  const saveLog = async (): Promise<void> => {
    const normalizedTitle = normalizePersianText(title);
    if (!normalizedTitle) {
      setError('عنوان الزامی است.');
      return;
    }

    if (editingLog) {
      await dailyLogsRepository.update({
        ...editingLog,
        title: normalizedTitle,
        logDate,
        content
      });
    } else {
      await dailyLogsRepository.create({
        title: normalizedTitle,
        logDate,
        content,
        createdAt: nowIso()
      });
    }

    await logsQuery.reload();
    resetForm();
    setIsLogModalOpen(false);
  };

  const preparedLogs = useMemo(
    () =>
      logs.map((log) => ({
        ...log,
        preview: stripHtml(log.content)
      })),
    [logs]
  );

  return (
    <main className="grid-gap">
      <PageHeader title="گزارش روزانه" subtitle="ثبت، ویرایش و نگهداری گزارش با ویرایشگر سبک" />

      <div className="row-between">
        <SearchBar value={search} onChange={setSearch} placeholder="جستجو در گزارش‌ها..." />
        <Button
          onClick={() => {
            resetForm();
            setIsLogModalOpen(true);
          }}
        >
          افزودن گزارش
        </Button>
      </div>

      <Card title="آرشیو گزارش‌ها" subtitle="جستجو، ویرایش و حذف">
        <div className="list">
          {preparedLogs.map((log) => (
            <div className="list-item" key={log.id}>
              <div className="row-between">
                <strong>{log.title}</strong>
                <span className="badge">{new Date(log.logDate).toLocaleDateString('fa-IR')}</span>
              </div>
              <p className="content-preview">{log.preview || 'بدون محتوا'}</p>
              <div className="toolbar">
                <Button
                  onClick={() => {
                    setEditingLog(log);
                    setTitle(log.title);
                    setLogDate(log.logDate);
                    setContent(log.content);
                    setError('');
                    setIsLogModalOpen(true);
                  }}
                  variant="secondary"
                >
                  ویرایش
                </Button>
                <Button variant="danger" onClick={() => void dailyLogsRepository.remove(log.id).then(logsQuery.reload)}>
                  حذف
                </Button>
              </div>
            </div>
          ))}
          {!logsQuery.loading && preparedLogs.length === 0 ? <EmptyState text="گزارشی ثبت نشده است." /> : null}
        </div>
      </Card>

      <Modal
        open={isLogModalOpen}
        title={editingLog ? 'ویرایش گزارش' : 'گزارش جدید'}
        onClose={() => {
          setIsLogModalOpen(false);
          resetForm();
        }}
        footer={
          <>
            <Button onClick={() => void saveLog()}>{editingLog ? 'ذخیره تغییرات' : 'ثبت گزارش'}</Button>
            <Button
              onClick={() => {
                setIsLogModalOpen(false);
                resetForm();
              }}
              variant="secondary"
            >
              انصراف
            </Button>
          </>
        }
      >
        <TextField label="عنوان" value={title} onChange={(event) => setTitle(event.target.value)} />
        <TextField label="تاریخ" type="date" value={logDate} onChange={(event) => setLogDate(event.target.value)} />
        <div>
          <label className="label">متن گزارش</label>
          <ReactQuill theme="snow" value={content} onChange={setContent} modules={modules} formats={formats} />
        </div>
        {error ? <p style={{ margin: 0, color: 'var(--color-danger)' }}>{error}</p> : null}
      </Modal>
    </main>
  );
}
