import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getFavorites } from '../api/favorites';
import { getRatings } from '../api/ratings';
import { getCurrentUser } from '../api/auth';
import { Navbar, Footer, Card, Badge, Button } from '../components';
import type { Favorite } from '../api/favorites';
import type { Rating } from '../api/ratings';
import type { UserPublic } from '../api/auth';

export default function UserProfilePage() {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'favorites' | 'ratings'>('favorites');

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('请先登录');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [userRes, favoritesRes, ratingsRes] = await Promise.all([
          getCurrentUser(),
          getFavorites({ page: 1, page_size: 50 }),
          getRatings({ page: 1, page_size: 50 }),
        ]);

        setUser(userRes);
        setFavorites(favoritesRes.favorites || []);
        setRatings(ratingsRes.ratings || []);
      } catch (err: any) {
        setError('加载用户数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error || '用户信息加载失败'}</div>
          <Link to="/login">
            <Button variant="primary">去登录</Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalFavorites = favorites.length;
  const totalRatings = ratings.length;
  const avgRating =
    totalRatings > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* User Profile Card */}
        <Card className="mb-6">
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-4xl">
              👤
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {user.username}
              </h1>
              <p className="text-gray-600 mb-4">{user.email}</p>
              {user.bio && (
                <p className="text-gray-700 bg-gray-100 p-3 rounded-md">
                  {user.bio}
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {totalFavorites}
              </div>
              <div className="text-sm text-gray-600">收藏</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {totalRatings}
              </div>
              <div className="text-sm text-gray-600">评分</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {avgRating.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">平均评分</div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          <Button
            variant={activeTab === 'favorites' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('favorites')}
          >
            我的收藏 ({totalFavorites})
          </Button>
          <Button
            variant={activeTab === 'ratings' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('ratings')}
          >
            我的评分 ({totalRatings})
          </Button>
        </div>

        {/* Favorites Tab */}
        {activeTab === 'favorites' && (
          <div className="space-y-4">
            {favorites.length === 0 ? (
              <Card className="text-center py-12">
                <p className="text-gray-600 mb-4">还没有收藏任何技能</p>
                <Link to="/skills">
                  <Button variant="primary">去浏览技能</Button>
                </Link>
              </Card>
            ) : (
              favorites.map((fav) => (
                <Link key={fav.id} to={`/skills/${fav.skill?.id}`}>
                  <Card hover>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {fav.skill?.title}
                        </h3>
                        <p className="text-gray-600 mb-2">
                          {fav.skill?.description}
                        </p>
                        <div className="flex items-center space-x-2">
                          <Badge variant="default">
                            {fav.skill?.category}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            ⭐ {fav.skill?.rating_avg.toFixed(1)} ({fav.skill?.rating_count})
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          {new Date(fav.created_at).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))
            )}
          </div>
        )}

        {/* Ratings Tab */}
        {activeTab === 'ratings' && (
          <div className="space-y-4">
            {ratings.length === 0 ? (
              <Card className="text-center py-12">
                <p className="text-gray-600 mb-4">还没有评分任何技能</p>
                <Link to="/skills">
                  <Button variant="primary">去浏览技能</Button>
                </Link>
              </Card>
            ) : (
              ratings.map((rating) => (
                <Link key={rating.id} to={`/skills/${rating.skill?.id}`}>
                  <Card hover>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {rating.skill?.title}
                        </h3>
                        <p className="text-gray-600 mb-2">
                          {rating.skill?.description}
                        </p>
                        <div className="flex items-center space-x-2">
                          <Badge variant="primary">
                            ⭐ {rating.rating} 星
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {new Date(rating.created_at).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
