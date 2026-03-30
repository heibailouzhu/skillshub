import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSkill, updateSkill } from '../api/skills';
import { Navbar, Footer } from '../components';
import { Button, Input, Card, CardHeader, CardBody, Loading } from '../components';
import type { UpdateSkillRequest } from '../api/skills';
import type { Skill } from '../api/skills';

export default function SkillEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const setSkill = useState<Skill | null>(null)[1];
  const [formData, setFormData] = useState<UpdateSkillRequest>({
    title: '',
    description: '',
    content: '',
    category: '',
    tags: [],
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchSkill = async () => {
      try {
        if (id) {
          const data = await getSkill(id);
          setSkill(data);
          setFormData({
            title: data.title,
            description: data.description || '',
            content: data.content,
            category: data.category || '',
            tags: data.tags || [],
          });
        }
      } catch (err: any) {
        setError(err.response?.data?.error || '获取技能信息失败');
      } finally {
        setFetching(false);
      }
    };

    fetchSkill();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setError('');
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setError('');
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tagsStr = e.target.value;
    const tags = tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag);
    setFormData({
      ...formData,
      tags,
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title || !formData.content) {
      setError('标题和内容不能为空');
      return;
    }

    setLoading(true);

    try {
      await updateSkill(id!, formData);
      navigate(`/skills/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || '更新技能失败');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <Loading fullScreen text="加载中..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">编辑技能</h1>
          <p className="mt-2 text-gray-600">修改你的技能信息</p>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">编辑信息</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <Input
                  label="标题 *"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="输入技能标题"
                  required
                  fullWidth
                />
              </div>

              <div>
                <Input
                  label="描述"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="简短描述你的技能"
                  fullWidth
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  分类
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleSelectChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">选择分类</option>
                  <option value="编程">编程</option>
                  <option value="设计">设计</option>
                  <option value="数据">数据</option>
                  <option value="AI">AI</option>
                  <option value="运维">运维</option>
                  <option value="其他">其他</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标签（逗号分隔）
                </label>
                <Input
                  name="tags"
                  value={formData.tags?.join(', ') || ''}
                  onChange={handleTagsChange}
                  placeholder="例如: Python, 机器学习, 数据分析"
                  fullWidth
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  内容 *
                </label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder="详细描述你的技能内容..."
                  rows={10}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate(-1)}
                >
                  取消
                </Button>
                <Button type="submit" loading={loading}>
                  保存修改
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
