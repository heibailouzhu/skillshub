import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getSkills } from '../api/skills';
import { Navbar, Footer } from '../components';
import { Input, Button } from '../components';
import type { Skill } from '../api/skills';

export default function SkillListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);

  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const tags = searchParams.get('tags') || '';
  const sort_by = searchParams.get('sort_by') || 'created_at';
  const sort_order = searchParams.get('sort_order') || 'desc';

  useEffect(() => {
    const fetchSkills = async () => {
      setLoading(true);
      try {
        const response = await getSkills({
          page,
          page_size: 12,
          search: search || undefined,
          category: category || undefined,
          tags: tags || undefined,
          sort_by: sort_by as any,
          sort_order: sort_order as any,
        });
        setSkills(response.skills || []);
        setTotal(response.total || 0);
      } catch (err: any) {
        setError('加载技能列表失败');
      } finally {
        setLoading(false);
      }
    };

    fetchSkills();
  }, [page, search, category, tags, sort_by, sort_order]);

  const updateParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('search', (e.target as HTMLFormElement).search.value);
  };

  if (loading && skills.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <form onSubmit={handleSearch} className="mb-4">
            <Input
              name="search"
              type="text"
              label=""
              defaultValue={search}
              placeholder="搜索技能..."
              onChange={() => {}}
            />
          </form>

          <div className="flex flex-wrap gap-2 mb-4">
            <select
              value={sort_by}
              onChange={(e) => updateParam('sort_by', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="created_at">最新</option>
              <option value="rating_avg">评分最高</option>
              <option value="download_count">下载最多</option>
            </select>

            <select
              value={sort_order}
              onChange={(e) => updateParam('sort_order', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="desc">降序</option>
              <option value="asc">升序</option>
            </select>
          </div>

          {category && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">分类:</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => updateParam('category', '')}
              >
                {category} ×
              </Button>
            </div>
          )}

          {tags && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-gray-600">标签:</span>
              {tags.split(',').map((tag) => (
                <Button
                  key={tag}
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const newTags = tags
                      .split(',')
                      .filter((t) => t !== tag)
                      .join(',');
                    updateParam('tags', newTags);
                  }}
                >
                  #{tag} ×
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Skills Grid */}
        {skills.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">暂无技能</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {skills.map((skill) => (
              <Link
                key={skill.id}
                to={`/skills/${skill.id}`}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 block"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {skill.title}
                </h3>
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {skill.description}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                  <span>{skill.author_username || '匿名'}</span>
                  <span>{skill.category}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>⭐ {skill.rating_avg.toFixed(1)}</span>
                  <span>👍 {skill.rating_count}</span>
                  <span>⬇️ {skill.download_count}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="mt-8 flex justify-center">
            <div className="flex items-center space-x-2">
              {page > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateParam('page', String(page - 1))}
                >
                  上一页
                </Button>
              )}
              <span className="px-4 py-2">
                第 {page} 页，共 {Math.ceil(total / 12)} 页
              </span>
              {page < Math.ceil(total / 12) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateParam('page', String(page + 1))}
                >
                  下一页
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
