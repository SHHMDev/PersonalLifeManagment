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
import { projectsRepository } from '@/db/repositories/projectsRepository';
import { useAsyncData } from '@/hooks';
import { Project, Subject } from '@/types';
import { extractSubjectDepth, isValidPersianText } from '@/utils';

export function ProjectsPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [categoryTitle, setCategoryTitle] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const [subjectTitle, setSubjectTitle] = useState('');
  const [subjectDescription, setSubjectDescription] = useState('');
  const [parentSubjectId, setParentSubjectId] = useState<number | null>(null);
  const [subjectError, setSubjectError] = useState('');

  const categoriesQuery = useAsyncData(() => listCategories('project_categories'), []);
  const projectsQuery = useAsyncData(() => projectsRepository.listProjects(search), [search]);
  const subjectsQuery = useAsyncData(() => (selectedProjectId ? projectsRepository.listSubjects(selectedProjectId) : Promise.resolve([])), [selectedProjectId]);

  const categoryOptions = useMemo(
    () =>
      (categoriesQuery.data ?? []).map((category) => ({
        label: category.title,
        value: category.id
      })),
    [categoriesQuery.data]
  );

  const subjectOptions = useMemo(
    () => [
      { label: 'بدون والد', value: 0 },
      ...((subjectsQuery.data ?? []).map((subject) => ({ label: subject.title, value: subject.id })) as Array<{
        label: string;
        value: number;
      }>)
    ],
    [subjectsQuery.data]
  );

  const addCategory = async (): Promise<void> => {
    if (!isValidPersianText(categoryTitle)) return;
    await createCategory('project_categories', categoryTitle);
    setCategoryTitle('');
    await categoriesQuery.reload();
  };

  const resetProjectForm = (): void => {
    setEditingProject(null);
    setTitle('');
    setDescription('');
    setCategoryId(categoriesQuery.data?.[0]?.id ?? 0);
  };

  const saveProject = async (): Promise<void> => {
    if (!isValidPersianText(title) || !categoryId) return;

    if (editingProject) {
      await projectsRepository.updateProject({
        ...editingProject,
        title,
        description,
        categoryId
      });
    } else {
      await projectsRepository.createProject({ title, description, categoryId });
    }

    resetProjectForm();
    await projectsQuery.reload();
  };

  const ensureSubjectDepth = (nextParentSubjectId: number | null, allSubjects: Subject[]): boolean => {
    if (!nextParentSubjectId) return true;
    const map = new Map<number, { parentSubjectId: number | null }>(
      allSubjects.map((item) => [item.id, { parentSubjectId: item.parentSubjectId }])
    );
    const parentDepth = extractSubjectDepth(nextParentSubjectId, map);
    return parentDepth < 3;
  };

  const saveSubject = async (): Promise<void> => {
    setSubjectError('');
    if (!selectedProjectId || !isValidPersianText(subjectTitle)) return;

    const normalizedParent = parentSubjectId && parentSubjectId > 0 ? parentSubjectId : null;
    const subjects = subjectsQuery.data ?? [];

    if (!ensureSubjectDepth(normalizedParent, subjects)) {
      setSubjectError('امکان افزودن بیشتر نیست. عمق سرفصل حداکثر سه سطح است.');
      return;
    }

    await projectsRepository.createSubject({
      projectId: selectedProjectId,
      parentSubjectId: normalizedParent,
      title: subjectTitle,
      description: subjectDescription
    });

    setSubjectTitle('');
    setSubjectDescription('');
    setParentSubjectId(null);
    await subjectsQuery.reload();
  };

  return (
    <main className="grid-gap">
      <PageHeader title="پروژه‌ها" subtitle="مدیریت پروژه، دسته‌های پویا و سرفصل‌های تو‌در‌تو" />

      <Card title="دسته‌بندی پروژه" subtitle="تعریف توسط کاربر">
        <div className="row">
          <input value={categoryTitle} onChange={(event) => setCategoryTitle(event.target.value)} placeholder="نام دسته جدید" />
          <Button onClick={addCategory}>افزودن دسته</Button>
        </div>
        <div className="list" style={{ marginTop: 10 }}>
          {(categoriesQuery.data ?? []).map((category) => (
            <div className="list-item row-between" key={category.id}>
              <span>{category.title}</span>
              <Button variant="danger" onClick={() => void deleteCategory('project_categories', category.id).then(categoriesQuery.reload)}>
                حذف
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card title={editingProject ? 'ویرایش پروژه' : 'پروژه جدید'} subtitle="CRUD پروژه">
        <div className="grid-gap">
          <SelectField
            label="دسته"
            value={categoryId}
            onChange={(event) => setCategoryId(Number(event.target.value))}
            options={categoryOptions.length ? categoryOptions : [{ value: 0, label: 'ابتدا دسته بسازید' }]}
          />
          <TextField label="عنوان" value={title} onChange={(event) => setTitle(event.target.value)} />
          <TextAreaField label="توضیحات" value={description} onChange={(event) => setDescription(event.target.value)} />
          <div className="toolbar">
            <Button onClick={() => void saveProject()}>{editingProject ? 'ذخیره تغییرات' : 'ایجاد پروژه'}</Button>
            <Button variant="secondary" onClick={resetProjectForm}>
              پاک‌سازی
            </Button>
          </div>
        </div>
      </Card>

      <Card title="لیست پروژه‌ها" subtitle="انتخاب پروژه برای مدیریت سرفصل‌ها">
        <SearchBar value={search} onChange={setSearch} placeholder="جستجو در پروژه‌ها..." />
        <div className="list" style={{ marginTop: 10 }}>
          {(projectsQuery.data ?? []).map((project) => (
            <div className="list-item" key={project.id}>
              <div className="row-between">
                <strong>{project.title}</strong>
                <span className="badge">#{project.categoryId}</span>
              </div>
              <p>{project.description || 'بدون توضیح'}</p>
              <div className="toolbar">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingProject(project);
                    setTitle(project.title);
                    setDescription(project.description);
                    setCategoryId(project.categoryId);
                  }}
                >
                  ویرایش
                </Button>
                <Button variant="secondary" onClick={() => setSelectedProjectId(project.id)}>
                  مدیریت سرفصل
                </Button>
                <Button variant="danger" onClick={() => void projectsRepository.removeProject(project.id).then(projectsQuery.reload)}>
                  حذف
                </Button>
              </div>
            </div>
          ))}
          {!projectsQuery.loading && (projectsQuery.data ?? []).length === 0 ? <EmptyState text="پروژه‌ای موجود نیست." /> : null}
        </div>
      </Card>

      {selectedProjectId ? (
        <Card title="سرفصل‌های پروژه" subtitle="حداکثر عمق سه سطح">
          <div className="grid-gap">
            <TextField label="عنوان سرفصل" value={subjectTitle} onChange={(event) => setSubjectTitle(event.target.value)} />
            <TextAreaField
              label="توضیحات سرفصل"
              value={subjectDescription}
              onChange={(event) => setSubjectDescription(event.target.value)}
            />
            <SelectField
              label="والد سرفصل"
              value={parentSubjectId ?? 0}
              onChange={(event) => setParentSubjectId(Number(event.target.value) || null)}
              options={subjectOptions}
            />
            {subjectError ? <p style={{ margin: 0, color: 'var(--color-danger)' }}>{subjectError}</p> : null}
            <Button onClick={() => void saveSubject()}>افزودن سرفصل</Button>
          </div>

          <div className="list" style={{ marginTop: 12 }}>
            {(subjectsQuery.data ?? []).map((subject) => {
              const map = new Map<number, { parentSubjectId: number | null }>(
                (subjectsQuery.data ?? []).map((item) => [item.id, { parentSubjectId: item.parentSubjectId }])
              );
              const depth = extractSubjectDepth(subject.id, map);

              return (
                <div className="list-item" key={subject.id}>
                  <div className="row-between">
                    <strong>{subject.title}</strong>
                    <span className="depth-tag">سطح {depth}</span>
                  </div>
                  <p>{subject.description || 'بدون توضیح'}</p>
                  <div className="toolbar">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        void projectsRepository
                          .updateSubject({ ...subject, isDone: subject.isDone ? 0 : 1 })
                          .then(subjectsQuery.reload)
                      }
                    >
                      {subject.isDone ? 'علامت ناتمام' : 'علامت انجام'}
                    </Button>
                    <Button variant="danger" onClick={() => void projectsRepository.removeSubject(subject.id).then(subjectsQuery.reload)}>
                      حذف
                    </Button>
                  </div>
                </div>
              );
            })}
            {!subjectsQuery.loading && (subjectsQuery.data ?? []).length === 0 ? <EmptyState text="سرفصلی ثبت نشده است." /> : null}
          </div>
        </Card>
      ) : null}
    </main>
  );
}
