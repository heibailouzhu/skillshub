import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSkillPackage } from '../api/skills';
import { Button, Card, CardBody, CardHeader, Footer, Input, Navbar } from '../components';
import { useI18n } from '../i18n';

interface PublishFormState {
  title: string;
  slug: string;
  version: string;
  description: string;
  category: string;
  tags: string;
}

const initialState: PublishFormState = {
  title: '',
  slug: '',
  version: '1.0.0',
  description: '',
  category: '',
  tags: '',
};

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function SkillCreatePage() {
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const [formData, setFormData] = useState<PublishFormState>(initialState);
  const [archive, setArchive] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const categoryOptions = locale === 'zh-CN'
    ? ['编程', '设计', '数据', 'AI', '运维', '其他']
    : ['Programming', 'Design', 'Data', 'AI', 'Operations', 'Other'];

  const pageText = locale === 'zh-CN'
    ? {
        publish: '发布',
        titlePlaceholder: 'Next.js SaaS Starter',
        slugPlaceholder: 'nextjs-saas-starter',
        uploadFile: '上传 ZIP 技能包',
        categoryPlaceholder: '请选择分类',
        descriptionPlaceholder: '例如：这个技能包包含 SKILL.md、scripts/run.py、templates/example.txt，用于快速初始化项目。',
        pageHint: '请上传 ZIP 技能包。压缩包内至少包含 SKILL.md，发布后 Web 下载文件名将统一为 slug-version.zip。',
        zipExample: 'ZIP 示例内容：SKILL.md、scripts/run.py、templates/example.txt。',
        chooseFile: '选择 ZIP 文件',
        missingSkillMd: 'ZIP 包内必须包含 SKILL.md',
        selectedFile: '已选择 ZIP 文件',
      }
    : {
        publish: 'Publish',
        titlePlaceholder: 'Next.js SaaS Starter',
        slugPlaceholder: 'nextjs-saas-starter',
        uploadFile: 'Upload ZIP Package',
        categoryPlaceholder: 'Select category',
        descriptionPlaceholder: 'Example: includes SKILL.md, scripts/run.py, and templates/example.txt for quick project setup.',
        pageHint: 'Upload a ZIP skill package. The archive must include SKILL.md, and web downloads will be standardized to slug-version.zip.',
        zipExample: 'ZIP contents example: SKILL.md, scripts/run.py, templates/example.txt.',
        chooseFile: 'Choose ZIP File',
        missingSkillMd: 'The ZIP package must contain SKILL.md',
        selectedFile: 'Selected ZIP file',
      };

  const archiveSummary = useMemo(() => {
    if (!archive) return t.skillCreate.noFile;
    return `${archive.name} · ${formatFileSize(archive.size)}`;
  }, [archive, t.skillCreate.noFile]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setArchive(null);
      return;
    }

    const isZip = file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip');
    if (!isZip) {
      setError(t.skillCreate.archiveInvalid);
      setArchive(null);
      e.target.value = '';
      return;
    }

    setArchive(file);
    setError('');
  };


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError(t.skillCreate.nameRequired);
      return;
    }
    if (!formData.version.trim()) {
      setError(t.skillCreate.versionRequired);
      return;
    }
    if (!archive) {
      setError(t.skillCreate.archiveRequired);
      return;
    }

    const payload = new FormData();
    payload.append('title', formData.title.trim());
    payload.append('version', formData.version.trim());
    payload.append('archive', archive, archive.name);

    if (formData.slug.trim()) payload.append('slug', formData.slug.trim());
    if (formData.description.trim()) payload.append('description', formData.description.trim());
    if (formData.category.trim()) payload.append('category', formData.category.trim());
    if (formData.tags.trim()) payload.append('tags', formData.tags.trim());

    setLoading(true);
    try {
      const response = await createSkillPackage(payload);
      navigate(`/skills/${response.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || t.skillCreate.uploadFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="container-wide page-shell flex-1">
        <section className="glass-panel-strong rounded-[2rem] p-8 xl:p-10">
          <div className="text-sm uppercase tracking-[0.24em] theme-text-muted">{pageText.publish}</div>
          <h1 className="mt-2 text-4xl font-black">{t.skillCreate.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 theme-text-soft">{pageText.pageHint}</p>
        </section>

        <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1.08fr)_340px] xl:items-start">
          <Card className="xl:min-w-0">
            <CardHeader>
              <h2 className="text-xl font-semibold">{t.skillCreate.sectionTitle}</h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-500">
                    {error}
                  </div>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                  <Input label={t.skillCreate.displayName} name="title" value={formData.title} onChange={handleChange} placeholder={pageText.titlePlaceholder} required fullWidth />
                  <Input label={t.skillCreate.slug} name="slug" value={formData.slug} onChange={handleChange} placeholder={pageText.slugPlaceholder} fullWidth />
                  <Input label={t.skillCreate.version} name="version" value={formData.version} onChange={handleChange} required fullWidth />
                  <div>
                    <label className="mb-2 block text-sm font-medium theme-text">{t.skillCreate.category}</label>
                    <select name="category" value={formData.category} onChange={handleChange} className="input-base w-full">
                      <option value="">{pageText.categoryPlaceholder}</option>
                      {categoryOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium theme-text">描述信息</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={5}
                    className="block min-h-[160px] w-full resize-y rounded-2xl border border-[var(--line)] bg-white/50 px-4 py-4 text-[var(--text)] shadow-sm placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--panel-strong) 88%, white 12%)' }}
                    placeholder={pageText.descriptionPlaceholder}
                  />
                </div>
                <Input label={t.skillCreate.tags} name="tags" value={formData.tags} onChange={handleChange} placeholder={t.skillCreate.tagsPlaceholder} fullWidth />

                <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel)]/60 p-5">
                  <div className="mb-2 text-sm font-medium theme-text">{pageText.uploadFile}</div>
                  <p className="text-sm leading-6 theme-text-soft">{t.skillCreate.archiveHint}</p>
                  <label className="mt-4 inline-flex cursor-pointer items-center rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-95">
                    {pageText.chooseFile}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".zip,application/zip"
                      className="sr-only"
                      onChange={handleFileChange}
                    />
                  </label>
                  <div className="mt-4 text-sm theme-text-soft">{pageText.zipExample}</div>
                  <p className="mt-2 text-sm theme-text-muted">{archiveSummary}</p>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" loading={loading}>{t.skillCreate.submit}</Button>
                </div>
              </form>
            </CardBody>
          </Card>

          <aside className="glass-panel rounded-[2rem] p-6 xl:sticky xl:top-28">
            <div className="text-sm uppercase tracking-[0.22em] theme-text-muted">Publish Flow</div>
            <h3 className="mt-3 text-2xl font-semibold theme-text">ZIP 包发布规范</h3>
            <div className="mt-5 space-y-4 text-sm leading-7 theme-text-soft">
              <p>1. 上传单个 ZIP 文件，压缩包内至少包含 `SKILL.md`。</p>
              <p>2. 基本信息用于展示与检索，ZIP 包用于下载与安装。</p>
              <p>3. 发布后，Web 下载文件名会统一规范为 `slug-version.zip`。</p>
            </div>
            <div className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--panel-strong)] p-4 text-sm theme-text-muted">
              当前上传摘要：{archiveSummary}
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
