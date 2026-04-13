import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createSkillVersion, getSkill, rollbackSkillVersion } from '../api/skills';
import { Badge, Button, Card, CardBody, CardHeader, Footer, Modal, Navbar } from '../components';
import type { Skill } from '../api/skills';
import { useI18n } from '../i18n';

export default function SkillVersionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const [skill, setSkill] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [version, setVersion] = useState('');
  const [changelog, setChangelog] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const text = locale === 'zh-CN'
    ? {
        title: '版本管理',
        subtitle: '为技能内容建立可回滚的历史版本，便于持续迭代与维护。',
        back: '返回详情',
        create: '创建新版本',
        loading: '正在加载版本记录...',
        notFound: '未找到技能。',
        currentVersion: '当前版本：',
        versionCount: '个版本',
        noVersions: '暂无历史版本。',
        current: '当前版本',
        noChangelog: '暂无变更说明。',
        createdAt: '创建时间：',
        rollback: '回滚到此版本',
        versionRequired: '请输入版本号。',
        confirmCreate: '确认创建',
        versionLabel: '版本号',
        versionPlaceholder: '例如：1.1.0',
        changelogLabel: '变更说明',
        changelogPlaceholder: '简要说明本次调整内容...',
      }
    : {
        title: 'Version Management',
        subtitle: 'Create rollback-ready history for your skill content to support safe iteration and maintenance.',
        back: 'Back to Details',
        create: 'Create Version',
        loading: 'Loading version history...',
        notFound: 'Skill not found.',
        currentVersion: 'Current version:',
        versionCount: 'versions',
        noVersions: 'No version history yet.',
        current: 'Current',
        noChangelog: 'No changelog provided.',
        createdAt: 'Created at:',
        rollback: 'Rollback to This Version',
        versionRequired: 'Please enter a version number.',
        confirmCreate: 'Create',
        versionLabel: 'Version',
        versionPlaceholder: 'e.g. 1.1.0',
        changelogLabel: 'Changelog',
        changelogPlaceholder: 'Briefly describe what changed in this version...',
      };

  const fetchSkill = async () => {
    if (!id) return;
    try {
      const data = await getSkill(id);
      setSkill(data);
    } catch (err: any) {
      setError(err.response?.data?.error || t.messages.fetchVersionFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkill();
  }, [id, t.messages.fetchVersionFailed]);

  const handleCreateVersion = async () => {
    if (!id || !skill || !version.trim()) {
      setError(text.versionRequired);
      return;
    }
    setSubmitting(true);
    try {
      await createSkillVersion(id, version.trim(), skill.content, changelog.trim() || undefined);
      setIsModalOpen(false);
      setVersion('');
      setChangelog('');
      await fetchSkill();
    } catch (err: any) {
      setError(err.response?.data?.error || t.messages.createVersionFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRollback = async (targetVersion: string) => {
    if (!id) return;
    try {
      await rollbackSkillVersion(id, targetVersion);
      await fetchSkill();
    } catch (err: any) {
      setError(err.response?.data?.error || t.messages.rollbackFailed);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="container-wide page-shell flex-1">
        <section className="glass-panel-strong rounded-[2rem] p-8 xl:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.24em] theme-text-muted">Versions</div>
              <h1 className="mt-2 text-4xl font-black">{text.title}</h1>
              <p className="mt-3 text-sm leading-7 theme-text-soft">{text.subtitle}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => navigate(`/skills/${id}`)}>{text.back}</Button>
              <Button onClick={() => setIsModalOpen(true)}>{text.create}</Button>
            </div>
          </div>
        </section>

        {error && <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-500">{error}</div>}

        <section className="mt-10">
          {loading ? (
            <div className="glass-panel rounded-[2rem] p-8 theme-text-soft">{text.loading}</div>
          ) : !skill ? (
            <div className="glass-panel rounded-[2rem] p-8 theme-text-soft">{text.notFound}</div>
          ) : (
            <Card className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">{skill.title}</h2>
                    <p className="mt-2 text-sm theme-text-soft">{text.currentVersion}{skill.version}</p>
                  </div>
                  <Badge variant="success">{skill.versions?.length || 0} {text.versionCount}</Badge>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                {(skill.versions || []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--line)] px-5 py-8 text-center theme-text-soft">{text.noVersions}</div>
                ) : (
                  (skill.versions || []).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-[var(--line)] px-5 py-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-semibold">{item.version}</h3>
                            {item.version === skill.version && <Badge variant="primary">{text.current}</Badge>}
                          </div>
                          <p className="mt-2 text-sm theme-text-soft">{item.changelog || text.noChangelog}</p>
                          <div className="mt-3 text-xs theme-text-muted">{text.createdAt}{new Date(item.created_at).toLocaleString(locale)}</div>
                        </div>
                        {item.version !== skill.version && <Button variant="secondary" onClick={() => handleRollback(item.version)}>{text.rollback}</Button>}
                      </div>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>
          )}
        </section>
      </main>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={text.create}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleCreateVersion} loading={submitting}>{text.confirmCreate}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text)]">{text.versionLabel}</label>
            <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder={text.versionPlaceholder} className="block w-full rounded-xl border border-[var(--line)] bg-white/50 px-4 py-3 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text)]">{text.changelogLabel}</label>
            <textarea value={changelog} onChange={(e) => setChangelog(e.target.value)} rows={5} placeholder={text.changelogPlaceholder} className="block w-full rounded-2xl border border-[var(--line)] bg-white/50 px-4 py-3 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25" />
          </div>
        </div>
      </Modal>

      <Footer />
    </div>
  );
}
