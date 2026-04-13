import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSkill, updateSkill, type Skill, type UpdateSkillRequest } from '../api/skills';
import { Button, Card, CardBody, Footer, Input, Navbar } from '../components';
import { useI18n } from '../i18n';

export default function SkillEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const [skill, setSkill] = useState<Skill | null>(null);
  const [formData, setFormData] = useState<UpdateSkillRequest>({ title: '', description: '', content: '', category: '', tags: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const editText = locale === 'zh-CN'
    ? {
        content: '内容',
        contentPlaceholder: '请输入技能内容...',
      }
    : {
        content: 'Content',
        contentPlaceholder: 'Enter the skill content...',
      };

  useEffect(() => {
    const fetchSkill = async () => {
      if (!id) return;
      try {
        const data = await getSkill(id);
        setSkill(data);
        setFormData({
          title: data.title,
          description: data.description || '',
          content: data.content,
          category: data.category || '',
          tags: data.tags || [],
        });
      } catch (err: any) {
        setError(err.response?.data?.error || t.messages.fetchSkillFailed);
      } finally {
        setLoading(false);
      }
    };

    fetchSkill();
  }, [id, t.messages.fetchSkillFailed]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      await updateSkill(id, formData);
      navigate(`/skills/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || t.messages.updateSkillFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="container-wide page-shell flex-1">
        <section className="glass-panel-strong rounded-[2rem] p-8 xl:p-10">
          <h1 className="text-4xl font-black">{t.common.edit}</h1>
        </section>

        <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_320px] xl:items-start">
          <Card className="xl:min-w-0">
            <CardBody>
              {loading ? (
                <div className="py-8 theme-text-soft">{t.common.loading}</div>
              ) : !skill ? (
                <div className="py-8 theme-text-soft">{t.messages.fetchSkillFailed}</div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-500">{error}</div>}
                  <Input label={t.skillCreate.displayName} name="title" value={String(formData.title || '')} onChange={handleChange} fullWidth />
                  <Input label={t.skillCreate.description} name="description" value={String(formData.description || '')} onChange={handleChange} fullWidth />
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--text)]">{editText.content}</label>
                    <textarea name="content" value={String(formData.content || '')} onChange={handleChange} rows={12} placeholder={editText.contentPlaceholder} className="block w-full rounded-2xl border border-[var(--line)] bg-white/50 px-4 py-4" />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={() => navigate(-1)}>{t.common.cancel}</Button>
                    <Button type="submit" loading={saving}>{t.common.save}</Button>
                  </div>
                </form>
              )}
            </CardBody>
          </Card>

          <aside className="glass-panel rounded-[2rem] p-6 xl:sticky xl:top-28">
            <div className="text-sm uppercase tracking-[0.22em] theme-text-muted">Editor</div>
            <h3 className="mt-3 text-2xl font-semibold theme-text">编辑说明</h3>
            <p className="mt-5 text-sm leading-7 theme-text-soft">在这里更新标题、简介与正文内容。主内容区域保持聚焦，辅助说明放在右侧，减少页面拥挤感。</p>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
