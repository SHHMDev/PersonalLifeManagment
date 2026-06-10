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
import { projectsRepository } from '@/db/repositories/projectsRepository';
import { useAsyncData, useFloatingAction } from '@/hooks';
import { Project, Subject } from '@/types';
import { extractSubjectDepth, normalizePersianText } from '@/utils';

type ProjectForm = {
  title: string;
  description: string;
  categoryId: number;
};

type SubjectForm = {
  title: string;
  description: string;
  parentSubjectId: number | null;
};

const emptyProjectForm: ProjectForm = { title: '', description: '', categoryId: 0 };
const emptySubjectForm: SubjectForm = { title: '', description: '', parentSubjectId: null };

export function ProjectsPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [categoryTitle, setCategoryTitle] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProjectForm);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [subjectForm, setSubjectForm] = useState<SubjectForm>(emptySubjectForm);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(0);
  const [projectError, setProjectError] = useState('');
  const [subjectError, setSubjectError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);

  const categoriesQuery = useAsyncData(() => listCategories('project_categories'), []);
  const projectsQuery = useAsyncData(() => projectsRepository.listProjects(search), [search]);
  const subjectsQuery = useAsyncData(() => (selectedProjectId ? projectsRepository.listSubjects(selectedProjectId) : Promise.resolve([])), [selectedProjectId]);

  const categories = categoriesQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const subjects = subjectsQuery.data ?? [];
  const safeCategoryId = categories.some((category) => category.id === projectForm.categoryId) ? projectForm.categoryId : categories[0]?.id ?? 0;

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        label: category.title,
        value: category.id
      })),
    [categories]
  );

  const categoryTitleById = useMemo(() => new Map(categories.map((category) => [category.id, category.title])), [categories]);

  const subjectOptions = useMemo(
    () => [
      { label: 'بدون والد', value: 0 },
      ...subjects.map((subject) => ({ label: subject.title, value: subject.id }))
    ],
    [subjects]
  );

  const filteredProjects = useMemo(
    () => projects.filter((project) => (selectedCategoryFilter ? project.categoryId === selectedCategoryFilter : true)),
    [projects, selectedCategoryFilter]
  );

  const resetProjectForm = useCallback((): void => {
    setEditingProject(null);
    setProjectForm({ ...emptyProjectForm, categoryId: categories[0]?.id ?? 0 });
    setProjectError('');
  }, [categories]);

  const resetSubjectForm = (): void => {
    setSubjectForm(emptySubjectForm);
    setSubjectError('');
  };

  useFloatingAction(
    '/projects',
    useCallback(() => {
      resetProjectForm();
      setIsProjectModalOpen(true);
    }, [resetProjectForm])
  );

  const reloadAll = async (): Promise<void> => {
    await categoriesQuery.reload();
    await projectsQuery.reload();
    if (selectedProjectId) {
      await subjectsQuery.reload();
    }
  };

  const addCategory = async (): Promise<void> => {
    const normalizedTitle = normalizePersianText(categoryTitle);
    if (!normalizedTitle) {
      setCategoryError('نام دسته الزامی است.');
      return;
    }

    await createCategory('project_categories', normalizedTitle);
    setCategoryTitle('');
    setCategoryError('');
    await reloadAll();
  };

  const removeCategory = async (categoryId: number): Promise<void> => {
    await deleteCategory('project_categories', categoryId);
    if (selectedCategoryFilter === categoryId) {
      setSelectedCategoryFilter(0);
    }
    if (projectForm.categoryId === categoryId) {
      setProjectForm((prev) => ({ ...prev, categoryId: 0 }));
    }
    await reloadAll();
  };

  const saveProject = async (): Promise<void> => {
    const normalizedTitle = normalizePersianText(projectForm.title);
    const normalizedDescription = normalizePersianText(projectForm.description);
    const nextCategoryId = safeCategoryId;

    if (!normalizedTitle) {
      setProjectError('عنوان الزامی است.');
      return;
    }
    if (!nextCategoryId) {
      setProjectError('ابتدا یک دسته‌بندی بسازید.');
      return;
    }

    if (editingProject) {
      await projectsRepository.updateProject({
        ...editingProject,
        title: normalizedTitle,
        description: normalizedDescription,
        categoryId: nextCategoryId
      });
    } else {
      await projectsRepository.createProject({
        title: normalizedTitle,
        description: normalizedDescription,
        categoryId: nextCategoryId
      });
    }

    await projectsQuery.reload();
    resetProjectForm();
    setIsProjectModalOpen(false);
  };

  const ensureSubjectDepth = (nextParentSubjectId: number | null, allSubjects: Subject[]): boolean => {
    if (!nextParentSubjectId) return true;
    const map = new Map<number, { parentSubjectId: number | null }>(allSubjects.map((item) => [item.id, { parentSubjectId: item.parentSubjectId }]));
    const parentDepth = extractSubjectDepth(nextParentSubjectId, map);
    return parentDepth < 3;
  };

  const saveSubject = async (): Promise<void> => {
    setSubjectError('');
    const normalizedTitle = normalizePersianText(subjectForm.title);
    const normalizedDescription = normalizePersianText(subjectForm.description);

    if (!selectedProjectId) {
      setSubjectError('ابتدا یک پروژه را انتخاب کنید.');
      return;
    }
    if (!normalizedTitle) {
      setSubjectError('عنوان سرفصل الزامی است.');
      return;
    }

    const normalizedParent = subjectForm.parentSubjectId && subjectForm.parentSubjectId > 0 ? subjectForm.parentSubjectId : null;

    if (!ensureSubjectDepth(normalizedParent, subjects)) {
      setSubjectError('امکان افزودن بیشتر نیست. عمق سرفصل حداکثر سه سطح است.');
      return;
    }

    await projectsRepository.createSubject({
      projectId: selectedProjectId,
      parentSubjectId: normalizedParent,
      title: normalizedTitle,
      description: normalizedDescription
    });

    resetSubjectForm();
    await subjectsQuery.reload();
    setIsSubjectModalOpen(false);
  };

  return (
    <main className="grid-gap">
      <PageHeader title="پروژه‌ها" subtitle="مدیریت پروژه، دسته‌های پویا و سرفصل‌های تو‌در‌تو" />

      <div className="row-between">
        <SearchBar value={search} onChange={setSearch} placeholder="جستجو در پروژه‌ها..." />
        <div className="toolbar">
          <Button
            onClick={() => {
              resetProjectForm();
              setIsProjectModalOpen(true);
            }}
          >
            افزودن پروژه
          </Button>
          <Button onClick={() => setIsCategoryModalOpen(true)} variant="secondary">
            مدیریت دسته‌ها
          </Button>
        </div>
      </div>

      <CategoryChips categories={categories} onSelect={setSelectedCategoryFilter} selectedCategoryId={selectedCategoryFilter} />

      <Card title="لیست پروژه‌ها" subtitle="انتخاب پروژه برای مدیریت سرفصل‌ها">
        <div className="list">
          {filteredProjects.map((project) => (
            <div className="list-item" key={project.id}>
              <div className="row-between">
                <strong>{project.title}</strong>
                <span className="badge">{categoryTitleById.get(project.categoryId) ?? 'بدون دسته'}</span>
              </div>
              <p className="content-preview">{project.description || 'بدون توضیح'}</p>
              <div className="toolbar">
                <Button
                  onClick={() => {
                    setEditingProject(project);
                    setProjectForm({
                      title: project.title,
                      description: project.description,
                      categoryId: project.categoryId
                    });
                    setProjectError('');
                    setIsProjectModalOpen(true);
                  }}
                  variant="secondary"
                >
                  ویرایش
                </Button>
                <Button variant="secondary" onClick={() => setSelectedProjectId(project.id)}>
                  مدیریت سرفصل
                </Button>
                <Button variant="danger" onClick={() => void projectsRepository.removeProject(project.id).then(reloadAll)}>
                  حذف
                </Button>
              </div>
            </div>
          ))}
          {!projectsQuery.loading && filteredProjects.length === 0 ? <EmptyState text="پروژه‌ای موجود نیست." /> : null}
        </div>
      </Card>

      {selectedProjectId ? (
        <Card title="سرفصل‌های پروژه" subtitle="حداکثر عمق سه سطح">
          <div className="row-between" style={{ marginBottom: 12 }}>
            <span className="depth-tag">{projects.find((project) => project.id === selectedProjectId)?.title ?? ''}</span>
            <div className="toolbar">
              <Button
                onClick={() => {
                  resetSubjectForm();
                  setIsSubjectModalOpen(true);
                }}
              >
                افزودن سرفصل
              </Button>
              <Button onClick={() => setSelectedProjectId(null)} variant="secondary">
                بستن
              </Button>
            </div>
          </div>

          <div className="list">
            {subjects.map((subject) => {
              const map = new Map<number, { parentSubjectId: number | null }>(subjects.map((item) => [item.id, { parentSubjectId: item.parentSubjectId }]));
              const depth = extractSubjectDepth(subject.id, map);

              return (
                <div className="list-item" key={subject.id} style={{ marginInlineStart: `${(depth - 1) * 12}px` }}>
                  <div className="row-between">
                    <strong>{subject.title}</strong>
                    <span className="depth-tag">سطح {depth}</span>
                  </div>
                  <p className="content-preview">{subject.description || 'بدون توضیح'}</p>
                  <div className="toolbar">
                    <Button
                      variant="secondary"
                      onClick={() => void projectsRepository.updateSubject({ ...subject, isDone: subject.isDone ? 0 : 1 }).then(subjectsQuery.reload)}
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
            {!subjectsQuery.loading && subjects.length === 0 ? <EmptyState text="سرفصلی ثبت نشده است." /> : null}
          </div>
        </Card>
      ) : null}

      <Modal
        open={isProjectModalOpen}
        title={editingProject ? 'ویرایش پروژه' : 'پروژه جدید'}
        onClose={() => {
          setIsProjectModalOpen(false);
          resetProjectForm();
        }}
        footer={
          <>
            <Button onClick={() => void saveProject()}>{editingProject ? 'ذخیره تغییرات' : 'ایجاد پروژه'}</Button>
            <Button
              onClick={() => {
                setIsProjectModalOpen(false);
                resetProjectForm();
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
          onChange={(event) => setProjectForm((prev) => ({ ...prev, categoryId: Number(event.target.value) }))}
          options={categoryOptions.length ? categoryOptions : [{ value: 0, label: 'ابتدا دسته بسازید' }]}
        />
        <TextField label="عنوان" value={projectForm.title} onChange={(event) => setProjectForm((prev) => ({ ...prev, title: event.target.value }))} />
        <TextAreaField
          label="توضیحات"
          value={projectForm.description}
          onChange={(event) => setProjectForm((prev) => ({ ...prev, description: event.target.value }))}
        />
        {projectError ? <p style={{ margin: 0, color: 'var(--color-danger)' }}>{projectError}</p> : null}
      </Modal>

      <Modal
        open={isCategoryModalOpen}
        title="مدیریت دسته‌های پروژه"
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

      <Modal
        open={isSubjectModalOpen}
        title="سرفصل جدید"
        onClose={() => {
          setIsSubjectModalOpen(false);
          resetSubjectForm();
        }}
        footer={
          <>
            <Button onClick={() => void saveSubject()}>افزودن سرفصل</Button>
            <Button
              onClick={() => {
                setIsSubjectModalOpen(false);
                resetSubjectForm();
              }}
              variant="secondary"
            >
              انصراف
            </Button>
          </>
        }
      >
        <TextField label="عنوان سرفصل" value={subjectForm.title} onChange={(event) => setSubjectForm((prev) => ({ ...prev, title: event.target.value }))} />
        <TextAreaField
          label="توضیحات سرفصل"
          value={subjectForm.description}
          onChange={(event) => setSubjectForm((prev) => ({ ...prev, description: event.target.value }))}
        />
        <SelectField
          label="والد سرفصل"
          value={subjectForm.parentSubjectId ?? 0}
          onChange={(event) => setSubjectForm((prev) => ({ ...prev, parentSubjectId: Number(event.target.value) || null }))}
          options={subjectOptions}
        />
        {subjectError ? <p style={{ margin: 0, color: 'var(--color-danger)' }}>{subjectError}</p> : null}
      </Modal>
    </main>
  );
}
