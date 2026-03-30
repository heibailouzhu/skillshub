import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFavorites, removeFavorite } from '../api/favorites';
import { Navbar, Footer } from '../components';
import { Card, CardBody, Button, Badge, Loading } from '../components';
import type { Favorite } from '../api/favorites';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const data = await getFavorites({ page, page_size: pageSize });
        setFavorites(data.favorites);
        setTotal(data.total);
      } catch (err: any) {
        if (err.response?.status === 401) {
          navigate('/login');
        } else {
          setError(err.response?.data?.error || '获取收藏列表失败');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [page, navigate]);

  const handleRemoveFavorite = async (skillId: string) => {
    try {
      await removeFavorite(skillId);
      // 重新获取收藏列表
      const data = await getFavorites({ page, page_size: pageSize });
      setFavorites(data.favorites);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.response?.data?.error || '取消收藏失败');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loading fullScreen text="加载中..." />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">我的收藏</h1>
          <p className="mt-2 text-gray-600">你收藏的 {total} 个技能</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {favorites.length === 0 ? (
          <Card>
            <CardBody>
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">暂无收藏</h3>
                <p className="mt-1 text-sm text-gray-500">去探索一些技能吧！</p>
                <div className="mt-6">
                  <Button onClick={() => navigate('/skills')}>
                    浏览技能
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {favorites.map((favorite) => {
              const skill = favorite.skill;
              if (!skill) return null;

              return (
                <Card key={favorite.id} hover>
                  <CardBody>
                    <div className="mb-3">
                      {skill.category && (
                        <Badge variant="primary" className="mb-2">
                          {skill.category}
                        </Badge>
                      )}
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                        {skill.title}
                      </h3>
                    </div>

                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {skill.description || '暂无描述'}
                    </p>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {skill.tags?.slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="secondary" size="sm">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>{skill.author_username || '未知'}</span>
                      <span>评分 {skill.rating_avg?.toFixed(1) || 'N/A'}</span>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/skills/${skill.id}`)}
                        className="flex-1"
                      >
                        查看详情
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveFavorite(skill.id)}
                      >
                        取消收藏
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex justify-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              上一页
            </Button>
            <span className="px-4 py-2 text-sm text-gray-600">
              第 {page} 页，共 {totalPages} 页
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              下一页
            </Button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
