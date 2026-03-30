import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSkill, createSkillVersion, rollbackSkillVersion } from '../api/skills';
import { Navbar, Footer, Button, Modal, Loading, Card } from '../components';
import type { Skill } from '../api/skills';
import type { SkillVersion } from '../api/skills';

export default function SkillVersionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [skill, setSkill] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<SkillVersion | null>(null);
  const [newVersion, setNewVersion] = useState({
    version: '',
    content: '',
    changelog: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchSkill = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const skillRes = await getSkill(id);
        setSkill(skillRes);
      } catch (err: any) {
        setError(err.response?.data?.error || '加载技能失败');
      } finally {
        setLoading(false);
      }
    };

    fetchSkill();
  }, [id]);

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skill || !id) return;

    setSubmitting(true);
    try {
      await createSkillVersion(id, newVersion.version, newVersion.content, newVersion.changelog);

      const skillRes = await getSkill(id);
      setSkill(skillRes);

      setShowCreateModal(false);
      setNewVersion({ version: '', content: '', changelog: '' });
      alert('版本创建成功');
    } catch (err: any) {
      alert(err.response?.data?.error || '创建版本失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRollback = async () => {
    if (!selectedVersion || !id) return;

    setSubmitting(true);
    try {
      await rollbackSkillVersion(id, selectedVersion.version);

      const skillRes = await getSkill(id);
      setSkill(skillRes);

      setShowRollbackModal(false);
      setSelectedVersion(null);
      alert('回滚成功');
    } catch (err: any) {
      alert(err.response?.data?.error || '回滚失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openRollbackModal = (version: SkillVersion) => {
    setSelectedVersion(version);
    setShowRollbackModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading />
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-600">{error || '技能不存在'}</div>
      </div>
    );
  }

  const sortedVersions = skill.versions?.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ) || [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-6">
          <button
            onClick={() => navigate(`/skills/${id}`)}
            className="text-indigo-600 hover:text-indigo-800 mb-4 inline-block"
          >
            ← 返回技能详情
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{skill.title} - 版本管理</h1>
          <p className="text-gray-600">当前版本: {skill.version}</p>
        </div>

        <div className="mb-6">
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
          >
            创建新版本
          </Button>
        </div>

        {sortedVersions.length === 0 ? (
          <Card>
            <p className="text-gray-600 text-center py-8">暂无版本记录</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedVersions.map((version) => (
              <Card key={version.id} className="hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      版本 {version.version}
                      {version.version === skill.version && (
                        <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                          当前
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 mb-3">
                      发布时间: {new Date(version.created_at).toLocaleString('zh-CN')}
                    </p>
                    {version.changelog && (
                      <div className="bg-gray-50 p-4 rounded-lg mb-3">
                        <h4 className="font-medium text-gray-900 mb-2">更新日志:</h4>
                        <p className="text-gray-700 whitespace-pre-wrap">{version.changelog}</p>
                      </div>
                    )}
                    <details className="mb-3">
                      <summary className="cursor-pointer text-indigo-600 hover:text-indigo-800 font-medium">
                        查看版本内容
                      </summary>
                      <pre className="mt-2 bg-gray-100 p-4 rounded-md overflow-x-auto whitespace-pre-wrap text-sm">
                        {version.content}
                      </pre>
                    </details>
                  </div>
                  {version.version !== skill.version && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openRollbackModal(version)}
                      className="ml-4"
                    >
                      回滚到此版本
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 创建版本 Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="创建新版本"
      >
        <form onSubmit={handleCreateVersion} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              版本号
            </label>
            <input
              type="text"
              required
              placeholder="例如: 1.0.1, 2.0.0"
              value={newVersion.version}
              onChange={(e) => setNewVersion({ ...newVersion, version: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              版本内容
            </label>
            <textarea
              required
              rows={10}
              placeholder="输入版本内容..."
              value={newVersion.content}
              onChange={(e) => setNewVersion({ ...newVersion, content: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              更新日志（可选）
            </label>
            <textarea
              rows={3}
              placeholder="描述本次更新的内容..."
              value={newVersion.changelog}
              onChange={(e) => setNewVersion({ ...newVersion, changelog: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              取消
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? '创建中...' : '创建版本'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 回滚确认 Modal */}
      <Modal
        isOpen={showRollbackModal}
        onClose={() => setShowRollbackModal(false)}
        title="确认回滚"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            确定要将技能回滚到版本 <strong>{selectedVersion?.version}</strong> 吗？
          </p>
          <p className="text-sm text-gray-500">
            此操作将更新技能的当前版本和内容，但不会删除历史版本记录。
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setShowRollbackModal(false)}
            >
              取消
            </Button>
            <Button
              variant="danger"
              onClick={handleRollback}
              disabled={submitting}
            >
              {submitting ? '回滚中...' : '确认回滚'}
            </Button>
          </div>
        </div>
      </Modal>

      <Footer />
    </div>
  );
}
