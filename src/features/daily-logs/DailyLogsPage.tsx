import { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { SearchBar } from '@/components/SearchBar';
import { TextField } from '@/components/TextField';
import { dailyLogsRepository } from '@/db/repositories/dailyLogsRepository';
import { useAsyncData } from '@/hooks';
import { DailyLog } from '@/types';
import { isValidPersianText, nowIso } from '@/utils';

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

  const logsQuery = useAsyncData(() => dailyLogsRepository.list(search), [search]);

  const resetForm = (): void => {
    setEditingLog(null);
    setTitle('');
    setLogDate(new Date().toISOString().slice(0, 10));
    setContent('');
  };

  const saveLog = async (): Promise<void> => {
    if (!isValidPersianText(title)) return;

    if (editingLog) {
      await dailyLogsRepository.update({
        ...editingLog,
        title,
        logDate,
        content
      });
    } else {
      await dailyLogsRepository.create({
        title,
        logDate,
        content,
        createdAt: nowIso()
      });
    }

    resetForm();
    await logsQuery.reload();
  };

  return (
    <main className="grid-gap">
      <PageHeader title="گزارش روزانه" subtitle="ثبت، ویرایش و نگهداری گزارش با ویرایشگر سبک" />

      <Card title={editingLog ? 'ویرایش گزارش' : 'گزارش جدید'} subtitle="ویرایشگر سبک (بدون CKEditor)">
        <div className="grid-gap">
          <TextField label="عنوان" value={title} onChange={(event) => setTitle(event.target.value)} />
          <TextField label="تاریخ" type="date" value={logDate} onChange={(event) => setLogDate(event.target.value)} />
          <div>
            <label className="label">متن گزارش</label>
            <ReactQuill theme="snow" value={content} onChange={setContent} modules={modules} formats={formats} />
          </div>
          <div className="toolbar">
            <Button onClick={() => void saveLog()}>{editingLog ? 'ذخیره تغییرات' : 'ثبت گزارش'}</Button>
            <Button variant="secondary" onClick={resetForm}>
              پاک‌سازی
            </Button>
          </div>
        </div>
      </Card>

      <Card title="آرشیو گزارش‌ها" subtitle="جستجو، ویرایش و حذف">
        <SearchBar value={search} onChange={setSearch} placeholder="جستجو در گزارش‌ها..." />
        <div className="list" style={{ marginTop: 10 }}>
          {(logsQuery.data ?? []).map((log) => (
            <div className="list-item" key={log.id}>
              <div className="row-between">
                <strong>{log.title}</strong>
                <span className="badge">{new Date(log.logDate).toLocaleDateString('fa-IR')}</span>
              </div>
              <div dangerouslySetInnerHTML={{ __html: log.content || '<p>بدون محتوا</p>' }} />
              <div className="toolbar">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingLog(log);
                    setTitle(log.title);
                    setLogDate(log.logDate);
                    setContent(log.content);
                  }}
                >
                  ویرایش
                </Button>
                <Button variant="danger" onClick={() => void dailyLogsRepository.remove(log.id).then(logsQuery.reload)}>
                  حذف
                </Button>
              </div>
            </div>
          ))}
          {!logsQuery.loading && (logsQuery.data ?? []).length === 0 ? <EmptyState text="گزارشی ثبت نشده است." /> : null}
        </div>
      </Card>
    </main>
  );
}
