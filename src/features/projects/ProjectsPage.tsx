import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CategoryChips } from '@/components/CategoryChips';
import { EmptyState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { SearchBar } from '@/components/SearchBar';
import { SelectField } from '@/components/SelectField';
import { RichTextField } from '@/components/RichTextField';
import { TextField } from '@/components/TextField';
import { createCategory, deleteCategory, listCategories } from '@/db/repositories/commonRepository';
import { projectsRepository } from '@/db/repositories/projectsRepository';
import { useAsyncData, useFloatingAction } from '@/hooks';
import { Project, Subject } from '@/types';
import { extractSubjectDepth, hasMeaningfulText } from '@/utils';

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
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
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
  const [isProjectDetailsModalOpen, setIsProjectDetailsModalOpen] = useState(false);
  const [isSubjectDetailsModalOpen, setIsSubjectDetailsModalOpen] = useState(false);

  const categoriesQuery = useAsyncData(() => listCategories('project_categories'), []);
  const projectsQuery = useAsyncData(() => projectsRepository.listProjects(search), [search]);
  const subjectsQuery = useAsyncData(() => (selectedProjectId ? projectsRepository.listSubjects(selectedProjectId) : Promise.resolve([])), [selectedProjectId]);

  const categories = categoriesQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const subjects = subjectsQuery.data ?? [];

  // اصلاح: وقتی دسته‌ها لود می‌شن و دسته فعلی نامعتبره، مقدار پیش‌فرض رو set کن
  useEffect(() => {
    if (categories.length > 0 && projectForm.categoryId === 0) {
      setProjectForm(prev => ({ ...prev, categoryId: categories[0].id }));
    }
  }, [categories, projectForm.categoryId]);

  // اصلاح: فقط برای نمایش استفاده بشه
  const safeCategoryId = projectForm.categoryId !== 0 && categories.some(c => c.id === projectForm.categoryId)
    ? projectForm.categoryId
    : categories[0]?.id ?? 0;

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

  const subjectDepthMap = useMemo(
    () => new Map<number, { parentSubjectId: number | null }>(subjects.map((item) => [item.id, { parentSubjectId: item.parentSubjectId }])),
    [subjects]
  );

  const resetProjectForm = useCallback((): void => {
    setEditingProject(null);
    const defaultCategoryId = categories[0]?.id ?? 0;
    setProjectForm({ ...emptyProjectForm, categoryId: defaultCategoryId });
    setProjectError('');
  }, [categories]);

  const resetSubjectForm = (): void => {
    setEditingSubject(null);
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
    // if (!hasMeaningfulText(categoryTitle)) {
    //   setCategoryError('نام دسته الزامی است.');
    //   return;
    // }

    await createCategory('project_categories', categoryTitle);
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
      const firstCategoryId = categories.filter(c => c.id !== categoryId)[0]?.id ?? 0;
      setProjectForm((prev) => ({ ...prev, categoryId: firstCategoryId }));
    }
    await reloadAll();
  };

  // اصلاح: هندلر تغییر دسته
  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategoryId = Number(event.target.value);
    setProjectForm(prev => ({ ...prev, categoryId: newCategoryId }));
    if (projectError) setProjectError('');
  };

  // اصلاح: هندلر تغییر عنوان
  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = event.target.value;
    setProjectForm(prev => ({ ...prev, title: newTitle }));
    if (projectError && newTitle.trim()) {
      setProjectError('');
    }
  };

  const saveProject = async (): Promise<void> => {
    // if (!hasMeaningfulText(projectForm.title)) {
    //   setProjectError('عنوان الزامی است.');
    //   return;
    // }
    if (!projectForm.categoryId) {
      setProjectError('لطفاً یک دسته‌بندی انتخاب کنید.');
      return;
    }

    try {
      if (editingProject) {
        await projectsRepository.updateProject({
          ...editingProject,
          title: projectForm.title,
          description: projectForm.description,
          categoryId: projectForm.categoryId
        });
      } else {
        await projectsRepository.createProject({
          title: projectForm.title,
          description: projectForm.description,
          categoryId: projectForm.categoryId
        });
      }

      await projectsQuery.reload();
      resetProjectForm();
      setIsProjectModalOpen(false);
    } catch (err) {
      setProjectError('خطا در ذخیره‌سازی: ' + (err as Error).message);
    }
  };

  const ensureSubjectDepth = (nextParentSubjectId: number | null, allSubjects: Subject[]): boolean => {
    if (!nextParentSubjectId) return true;
    const map = new Map<number, { parentSubjectId: number | null }>(allSubjects.map((item) => [item.id, { parentSubjectId: item.parentSubjectId }]));
    const parentDepth = extractSubjectDepth(nextParentSubjectId, map);
    return parentDepth < 3;
  };

  // اصلاح: هندلر تغییر عنوان سرفصل
  const handleSubjectTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = event.target.value;
    setSubjectForm(prev => ({ ...prev, title: newTitle }));
    if (subjectError && newTitle.trim()) {
      setSubjectError('');
    }
  };

  const saveSubject = async (): Promise<void> => {
    setSubjectError('');
    if (!selectedProjectId) {
      setSubjectError('ابتدا یک پروژه را انتخاب کنید.');
      return;
    }
    // if (!hasMeaningfulText(subjectForm.title)) {
    //   setSubjectError('عنوان سرفصل الزامی است.');
    //   return;
    // }

    const normalizedParent = subjectForm.parentSubjectId && subjectForm.parentSubjectId > 0 ? subjectForm.parentSubjectId : null;

    if (editingSubject && normalizedParent === editingSubject.id) {
      setSubjectError('سرفصل نمی‌تواند والد خودش باشد.');
      return;
    }

    if (!ensureSubjectDepth(normalizedParent, subjects)) {
      setSubjectError('امکان افزودن بیشتر نیست. عمق سرفصل حداکثر سه سطح است.');
      return;
    }

    try {
      if (editingSubject) {
        await projectsRepository.updateSubject({
          ...editingSubject,
          parentSubjectId: normalizedParent,
          title: subjectForm.title.trim(),
          description: subjectForm.description
        });
      } else {
        await projectsRepository.createSubject({
          projectId: selectedProjectId,
          parentSubjectId: normalizedParent,
          title: subjectForm.title.trim(),
          description: subjectForm.description
        });
      }

      resetSubjectForm();
      await subjectsQuery.reload();
      setIsSubjectModalOpen(false);
    } catch (err) {
      setSubjectError('خطا در ذخیره‌سازی: ' + (err as Error).message);
    }
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
              <button
                className="board-button"
                onClick={() => {
                  setSelectedProject(project);
                  setIsProjectDetailsModalOpen(true);
                }}
                type="button"
              >
                <div className="row-between">
                  <strong className="title-text">{project.title}</strong>
                  <span className="badge title-badge">{categoryTitleById.get(project.categoryId) ?? 'بدون دسته'}</span>
                </div>
              </button>
              <div className="toolbar">
                <Button
                  onClick={() => {
                    setEditingProject(project);
                    setProjectForm({
                      title: project.title,
                      description: project.description || '',
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
              const depth = extractSubjectDepth(subject.id, subjectDepthMap);

              return (
                <div className="list-item" key={subject.id} style={{ marginInlineStart: `${(depth - 1) * 12}px` }}>
                  <button
                    className="board-button"
                    onClick={() => {
                      setSelectedSubject(subject);
                      setIsSubjectDetailsModalOpen(true);
                    }}
                    type="button"
                  >
                    <div className="row-between">
                      <strong className="title-text">{subject.title}</strong>
                      <span className="depth-tag">سطح {depth}</span>
                    </div>
                  </button>
                  <div className="toolbar">
                    <Button
                      onClick={() => {
                        setEditingSubject(subject);
                        setSubjectForm({
                          title: subject.title,
                          description: subject.description || '',
                          parentSubjectId: subject.parentSubjectId
                        });
                        setSubjectError('');
                        setIsSubjectModalOpen(true);
                      }}
                      variant="secondary"
                    >
                      ویرایش
                    </Button>
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
          value={projectForm.categoryId}  // اصلاح: استفاده از projectForm.categoryId
          onChange={handleCategoryChange}  // اصلاح: استفاده از هندلر اختصاصی
          options={categoryOptions.length ? categoryOptions : [{ value: 0, label: 'ابتدا دسته بسازید' }]}
        />
        <TextField 
          label="عنوان" 
          value={projectForm.title} 
          onChange={handleTitleChange}  // اصلاح: استفاده از هندلر اختصاصی
        />
        <RichTextField 
          label="توضیحات" 
          value={projectForm.description} 
          onChange={(value) => setProjectForm((prev) => ({ ...prev, description: value }))} 
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
        <TextField label="نام دسته جدید" value={categoryTitle} onChange={(event) => { setCategoryTitle(event.target.value); if (categoryError) setCategoryError(''); }} />
        {categoryError ? <p style={{ margin: 0, color: 'var(--color-danger)' }}>{categoryError}</p> : null}
        <div className="list">
          {categories.map((category) => (
            <div className="list-item row-between" key={category.id}>
              <span className="title-text">{category.title}</span>
              <Button variant="danger" onClick={() => void removeCategory(category.id)}>
                حذف
              </Button>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={isSubjectModalOpen}
        title={editingSubject ? 'ویرایش سرفصل' : 'سرفصل جدید'}
        onClose={() => {
          setIsSubjectModalOpen(false);
          resetSubjectForm();
        }}
        footer={
          <>
            <Button onClick={() => void saveSubject()}>{editingSubject ? 'ذخیره تغییرات' : 'افزودن سرفصل'}</Button>
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
        <TextField 
          label="عنوان سرفصل" 
          value={subjectForm.title} 
          onChange={handleSubjectTitleChange}  // اصلاح: استفاده از هندلر اختصاصی
        />
        <RichTextField 
          label="توضیحات سرفصل" 
          value={subjectForm.description} 
          onChange={(value) => setSubjectForm((prev) => ({ ...prev, description: value }))} 
        />
        <SelectField
          label="والد سرفصل"
          value={subjectForm.parentSubjectId ?? 0}
          onChange={(event) => setSubjectForm((prev) => ({ ...prev, parentSubjectId: Number(event.target.value) || null }))}
          options={subjectOptions}
        />
        {subjectError ? <p style={{ margin: 0, color: 'var(--color-danger)' }}>{subjectError}</p> : null}
      </Modal>

      <Modal
        open={isProjectDetailsModalOpen}
        title={selectedProject?.title ?? 'جزئیات پروژه'}
        onClose={() => {
          setIsProjectDetailsModalOpen(false);
          setSelectedProject(null);
        }}
      >
        <div className="detail-card">
          <p className="detail-category">{selectedProject ? categoryTitleById.get(selectedProject.categoryId) ?? 'بدون دسته' : ''}</p>
          <div className="detail-content" dangerouslySetInnerHTML={{ __html: selectedProject?.description || '<p>بدون توضیح</p>' }} />
        </div>
      </Modal>

      <Modal
        open={isSubjectDetailsModalOpen}
        title={selectedSubject?.title ?? 'جزئیات سرفصل'}
        onClose={() => {
          setIsSubjectDetailsModalOpen(false);
          setSelectedSubject(null);
        }}
      >
        <div className="detail-card">
          <p className="detail-category">{selectedSubject ? `سطح ${extractSubjectDepth(selectedSubject.id, subjectDepthMap)}` : ''}</p>
          <div className="detail-content" dangerouslySetInnerHTML={{ __html: selectedSubject?.description || '<p>بدون توضیح</p>' }} />
        </div>
      </Modal>
    </main>
  );
}